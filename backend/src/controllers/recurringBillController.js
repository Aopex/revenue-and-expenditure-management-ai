// recurringBillController.js
// 周期性账单（定期账单）相关控制器：
// - 获取当前用户所有周期账单规则
// - 创建/删除周期账单规则
// - 根据规则生成实际账单，并自动推进下一次执行日期

const db = require('../db/db');   // 数据库连接
const dayjs = require('dayjs');   // 日期处理库，用于周期计算等

/**
 * 获取所有周期性账单规则
 * 
 * 行为：
 * - 只查询当前登录用户的规则（根据 req.userId 过滤）
 * - 关联分类表，返回分类名称，方便前端直接展示
 */
exports.getAllRecurringBills = (req, res) => {
    const userId = req.userId;
    const sql = `
        SELECT r.*, c.name as category_name 
        FROM recurring_bills r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
    `;
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取周期性账单失败：' + err.message });
        res.json(rows);
    });
};

/**
 * 创建新的周期性账单规则
 * 
 * 请求体字段：
 * - amount: 金额（必填）
 * - type: 类型（income / expense，必填）
 * - category_id: 分类 ID（可选）
 * - period: 周期（daily / weekly / monthly / yearly，必填）
 * - next_date: 下次执行日期（YYYY-MM-DD，必填）
 * - remark: 备注（可选）
 */
exports.createRecurringBill = (req, res) => {
    const userId = req.userId;
    const { amount, type, category_id, period, next_date, remark } = req.body;

    // 基础必填参数校验
    if (!amount || !type || !period || !next_date) {
        return res.status(400).json({ error: '参数缺失：金额、类型、周期和开始日期为必填项' });
    }

    const sql = `
        INSERT INTO recurring_bills (user_id, category_id, type, amount, period, next_date, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [userId, category_id, type, amount, period, next_date, remark], function (err) {
        if (err) return res.status(500).json({ error: '创建周期性账单失败：' + err.message });
        res.status(201).json({ id: this.lastID, ...req.body });
    });
};

/**
 * 删除周期性账单规则
 * 
 * 限制：
 * - 只能删除当前登录用户自己的规则（WHERE id = ? AND user_id = ?）
 */
exports.deleteRecurringBill = (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    db.run(`DELETE FROM recurring_bills WHERE id = ? AND user_id = ?`, [id, userId], function (err) {
        if (err) return res.status(500).json({ error: '删除失败：' + err.message });
        if (this.changes === 0) return res.status(404).json({ error: '规则不存在或无权操作' });
        res.json({ message: '周期性账单规则已删除' });
    });
};

/**
 * 核心逻辑：处理并生成到期的账单
 * 
 * 设计目标：
 * - 将所有“已经到期的周期账单规则”转为真实账单记录
 * - 每处理一次规则就向前推进下一个执行日期，直到 next_date 大于今天
 * 
 * 处理流程：
 * 1. 查询当前用户所有 next_date <= 今天的规则
 * 2. 对每个规则：
 *    - 在事务内向 bills 表插入一条账单
 *    - 根据规则的 period 计算新的 next_date
 *    - 更新 recurring_bills 表中的 next_date 和 last_executed_at
 * 3. 不断循环步骤 1 和 2，直到不存在到期规则为止（防止长时间未执行时的“补账单”遗漏）
 */
exports.processRecurringBills = async (req, res) => {
    const userId = req.userId;
    const today = dayjs().format('YYYY-MM-DD');

    // 获取所有满足条件（到期）的规则
    const fetchRules = () => {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM recurring_bills WHERE user_id = ? AND next_date <= ?`, [userId, today], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    };

    // 根据某一条规则生成账单，并推进其 next_date
    const generateBill = (rule) => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // 启动事务，确保“插入账单 + 更新规则”要么全部成功，要么全部失败
                db.run("BEGIN TRANSACTION");

                // 1. 插入到 bills 表
                const insertSql = `INSERT INTO bills (user_id, category_id, type, amount, date, remark, source) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                db.run(insertSql, [rule.user_id, rule.category_id, rule.type, rule.amount, rule.next_date, rule.remark, 'recurring'], function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }

                    // 2. 根据 period 计算下一个执行日期
                    let nextDate = dayjs(rule.next_date);
                    if (rule.period === 'daily') nextDate = nextDate.add(1, 'day');
                    else if (rule.period === 'weekly') nextDate = nextDate.add(1, 'week');
                    else if (rule.period === 'monthly') nextDate = nextDate.add(1, 'month');
                    else if (rule.period === 'yearly') nextDate = nextDate.add(1, 'year');

                    // 3. 更新规则表中的 next_date 和 last_executed_at
                    const updateSql = `UPDATE recurring_bills SET next_date = ?, last_executed_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    db.run(updateSql, [nextDate.format('YYYY-MM-DD'), rule.id], function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return reject(err);
                        }
                        db.run("COMMIT");
                        resolve(true);
                    });
                });
            });
        });
    };

    try {
        let rows = await fetchRules();
        let totalGenerated = 0;

        // 持续处理直到没有到期的规则（防止漏补很久以前的账单）
        while (rows.length > 0) {
            for (const rule of rows) {
                await generateBill(rule);
                totalGenerated++;
            }
            rows = await fetchRules();
        }

        res.json({ message: '处理完成', generated: totalGenerated });
    } catch (err) {
        res.status(500).json({ error: '执行周期账单失败：' + err.message });
    }
};
