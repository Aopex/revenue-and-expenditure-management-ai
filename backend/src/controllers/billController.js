// billController.js
// 账单相关控制器，负责单笔和批量账单的增删改查及导入：
// - getAllBills：分页查询账单，支持按月份、类型、分类筛选
// - createBill：创建单条账单，并智能兜底分类
// - updateBill / deleteBill：更新和删除当前用户的账单
// - importBills：从支付宝/微信账单文件中批量导入数据，包含去重与自动分类逻辑

const db = require('../db/db'); // 数据库连接

/**
 * 获取所有账单（支持分页和筛选）
 * 
 * 1. 从查询参数中获取分页和筛选条件
 * 2. 强制限定 user_id 为当前登录用户，实现数据隔离
 * 3. 动态构建 SQL 语句进行多条件查询
 * 4. 返回数据列表及分页元信息
 */
exports.getAllBills = (req, res) => {
    const { page = 1, limit = 10, month, type, category_id } = req.query;
    const offset = (page - 1) * limit; // 计算偏移量
    const userId = req.userId; // 从 authMiddleware 获取

    // 基础查询语句，关联分类表以获取分类名称
    let sql = `SELECT b.*, c.name as category_name 
               FROM bills b 
               LEFT JOIN categories c ON b.category_id = c.id
               WHERE b.user_id = ?`;
    const params = [userId];

    // 条件筛选：按月份 (YYYY-MM)
    if (month) {
        sql += ` AND strftime('%Y-%m', b.date) = ?`;
        params.push(month);
    }
    // 条件筛选：按类型 (income/expense)
    if (type) {
        sql += ` AND b.type = ?`;
        params.push(type);
    }
    // 条件筛选：按分类 ID
    if (category_id) {
        sql += ` AND b.category_id = ?`;
        params.push(category_id);
    }

    // 默认排序：日期降序，同一天按创建时间降序
    sql += ` ORDER BY b.date DESC, b.created_at DESC`;

    // 分页限制
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    // 查询满足条件的总条数，用于前端计算总页数
    let countSql = `SELECT COUNT(*) as total FROM bills WHERE user_id = ?`;
    const countParams = [userId];
    if (month) {
        countSql += ` AND strftime('%Y-%m', date) = ?`;
        countParams.push(month);
    }
    if (type) {
        countSql += ` AND type = ?`;
        countParams.push(type);
    }
    if (category_id) {
        countSql += ` AND category_id = ?`;
        countParams.push(category_id);
    }

    db.get(countSql, countParams, (err, row) => {
        if (err) return res.status(500).json({ error: '获取账单总数失败：' + err.message });
        const total = row.total;

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: '获取账单列表失败：' + err.message });
            res.json({
                data: rows,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            });
        });
    });
};

/**
 * 创建新账单
 * 
 * 处理流程：
 * 1. 验证必填字段 amount/type/date 是否存在
 * 2. 若传入 category_id，则校验其是否存在且类型与账单类型一致
 * 3. 若未传或校验失败，则自动分配“其他收入”或“其他支出”分类
 * 4. 将最终决定的 category_id 写入 bills 表
 */
exports.createBill = (req, res) => {
    const { amount, type, category_id, date, remark } = req.body;
    const userId = req.userId;

    if (!amount || !type || !date) {
        return res.status(400).json({ error: '参数缺失：金额(amount)、类型(type)和日期(date)为必填项' });
    }

    // 统一定义插入逻辑的函数，接收最终的 category_id
    const performInsert = (finalCategoryId) => {
        const sql = `INSERT INTO bills (user_id, category_id, type, amount, date, remark) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [userId, finalCategoryId, type, amount, date, remark];

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: '创建账单失败：' + err.message });
            res.status(201).json({
                id: this.lastID,
                ...req.body,
                category_id: finalCategoryId,
                user_id: userId
            });
        });
    };

    // 获取默认分类的函数：当无有效分类时使用
    const assignDefaultCategory = () => {
        const defaultName = type === 'income' ? '其他收入' : '其他支出';
        db.get('SELECT id FROM categories WHERE name = ? AND type = ?', [defaultName, type], (err, row) => {
            if (err || !row) {
                // 如果数据库里连默认分类都没有，只能传 null
                return performInsert(null);
            }
            performInsert(row.id);
        });
    };

    // 逻辑开始：如果有传入 category_id，则先校验
    if (category_id) {
        db.get('SELECT id, type FROM categories WHERE id = ?', [category_id], (err, row) => {
            if (err) return res.status(500).json({ error: '分类校验失败' });

            if (row && row.type === type) {
                // 分类存在且类型匹配，直接使用
                performInsert(category_id);
            } else {
                // 分类不存在或类型不匹配，分配默认分类
                assignDefaultCategory();
            }
        });
    } else {
        // 未传入分类，直接分配默认分类
        assignDefaultCategory();
    }
};

/**
 * 更新账单
 * 
 * 行为：
 * - 根据 url 参数中的 id 和当前登录用户 userId 搜索目标账单
 * - 若存在则更新 amount/type/category_id/date/remark 等字段
 * - 若记录不存在（或不属于当前用户）则返回 404
 */
exports.updateBill = (req, res) => {
    const { id } = req.params;
    const { amount, type, category_id, date, remark } = req.body;
    const userId = req.userId;

    const sql = `UPDATE bills SET amount = ?, type = ?, category_id = ?, date = ?, remark = ? WHERE id = ? AND user_id = ?`;
    const params = [amount, type, category_id, date, remark, id, userId];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: '更新账单失败：' + err.message });
        if (this.changes === 0) return res.status(404).json({ error: '未找到指定账单或无权操作' });
        res.json({ message: '账单更新成功', changes: this.changes });
    });
};

/**
 * 删除账单
 * 
 * 限制：
 * - 只能删除当前用户自己的账单（WHERE id = ? AND user_id = ?）
 * - 若记录不存在或无权限则返回 404
 */
exports.deleteBill = (req, res) => {
    const { id } = req.params;
    const userId = req.userId;

    const sql = `DELETE FROM bills WHERE id = ? AND user_id = ?`;

    db.run(sql, [id, userId], function (err) {
        if (err) return res.status(500).json({ error: '删除账单失败：' + err.message });
        if (this.changes === 0) return res.status(404).json({ error: '未找到指定账单或无权操作' });
        res.json({ message: '账单删除成功' });
    });
};

// 账单导入与自动分类相关工具：
// - parseBillFile：解析支付宝/微信账单文件为统一格式
// - categoryClassifier：根据关键字、对方名称等自动推断分类
// - fs：用于处理上传文件（删除临时文件等）
const { parseBillFile } = require('../utils/billParser');
const categoryClassifier = require('../utils/categoryClassifier');
const fs = require('fs');
const axios = require('axios');

/**
 * 导入账单（支持微信/支付宝 CSV/XLSX 文件）
 * 
 * 流程：
 * 1. 检查是否有文件上传
 * 2. 从数据库加载所有分类，构建名称到 ID 的映射表（供智能分类使用）
 * 3. 使用 parseBillFile 解析上传的账单文件，生成标准 Bill 对象列表
 * 4. 在事务中遍历账单列表：
 *    - 调用 categoryClassifier 自动匹配分类 ID
 *    - 通过 “INSERT ... WHERE NOT EXISTS (...)” 实现去重插入
 * 5. 统计成功插入和重复跳过的数量，提交事务并返回结果
 * 6. 无论成功或失败，都删除临时上传文件
 */
exports.importBills = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '请上传文件' });
    }
    const filePath = req.file.path;
    const userId = req.userId;
    const useAI = req.body.use_ai === 'true'; // 从前端接受是否使用 AI 分类

    try {
        // 1. 预加载所有分类，构建 "名称 -> ID" 的映射表，用于后续的快速查找和匹配
        const categoryMap = await categoryClassifier.loadCategories(db);

        // 2. 解析文件，将不同格式（微信/支付宝）转换为统一的 Bill 对象列表
        const bills = parseBillFile(filePath);
        let importedCount = 0; // 成功导入数
        let duplicateCount = 0; // 重复跳过数
        let processed = 0; // 已处理计数

        // 如果文件解析结果为空，直接返回
        if (bills.length === 0) {
            fs.unlinkSync(filePath); // 删除临时文件
            return res.json({ message: '导入完成', imported: 0, duplicate: 0 });
        }

        // 3. 如果开启了 AI 分类，则在入库前先调用 FastAPI 微服务进行分类
        if (useAI) {
            const chunkSize = 5; // 为了避免触碰大模型接口的并发限流，分桶请求
            for (let i = 0; i < bills.length; i += chunkSize) {
                const chunk = bills.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (bill) => {
                    // 提取更详细的商品/对方信息给 AI
                    const merchantName = [bill.counterparty, bill.type_desc, bill.product].filter(Boolean).join(' - ') || '未知商户';
                    try {
                        const response = await axios.post('http://127.0.0.1:8000/api/categorize', {
                            merchant_name: merchantName,
                            amount: Math.abs(parseFloat(bill.amount) || 0),
                            transaction_type: bill.type === 'expense' ? '支出' : '收入'
                        }, { timeout: 15000 }); // 给大模型15秒超时时间
                        
                        const aiCategoryName = response.data.category;
                        if (bill.type === 'expense') {
                            bill.ai_category_id = categoryMap.expense[aiCategoryName] || categoryMap.expense['其他支出'];
                        } else {
                            bill.ai_category_id = categoryMap.income[aiCategoryName] || categoryMap.income['其他收入'];
                        }
                    } catch (apiErr) {
                        console.warn(`[AI 降级] AI分类调用失败(${merchantName})，退化为本地规则预测。原因: ${apiErr.message}`);
                        bill.ai_category_id = categoryClassifier.classifyBill(bill, categoryMap);
                    }
                }));
            }
        }

        // 4. 使用数据库事务处理批量插入，确保原子性
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // 预编译 SQL 语句，包含去重逻辑：
            // 只有当数据库中不存在完全相同的记录（用户、金额、日期、类型、来源均匹配）时才插入
            const stmt = db.prepare(`
                INSERT INTO bills (user_id, category_id, type, amount, date, remark, source)
                SELECT ?, ?, ?, ?, ?, ?, ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM bills 
                    WHERE user_id = ? AND amount = ? AND date = ? AND type = ? AND source = ?
                )
            `);

            bills.forEach((bill) => {
                // 5. 确定最终分类 ID（优先使用已计算好的 AI 分类结果，否则走本地推断）
                const category_id = bill.ai_category_id || categoryClassifier.classifyBill(bill, categoryMap);

                stmt.run(
                    userId, category_id, bill.type, bill.amount, bill.date, bill.remark, bill.source, // 插入值
                    userId, bill.amount, bill.date, bill.type, bill.source, // 去重查询条件
                    function (err) {
                        processed++;
                        if (err) {
                            console.error("Import Row Error:", err);
                        } else if (this.changes > 0) {
                            // changes > 0 表示插入成功
                            importedCount++;
                        } else {
                            // changes === 0 表示 WHERE NOT EXISTS 条件未满足，即记录已存在
                            duplicateCount++;
                        }

                        // 所有记录处理完毕后，提交事务并响应
                        if (processed === bills.length) {
                            stmt.finalize(() => {
                                db.run("COMMIT", () => {
                                    fs.unlinkSync(filePath); // 清理临时文件
                                    res.json({
                                        message: '导入完成',
                                        imported: importedCount,
                                        duplicate: duplicateCount
                                    });
                                });
                            });
                        }
                    }
                );
            });
        });
    } catch (e) {
        // 发生异常，清理文件并报错
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(500).json({ error: '解析失败: ' + e.message });
    }
};
