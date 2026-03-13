// statController.js
// 收支统计相关控制器：
// - 月度整体统计：本月总收入、总支出与结余
// - 收支趋势：按周 / 月 / 年维度返回收入支出趋势数据
// - 分类占比：统计各分类在指定月份的支出占比

const db = require('../db/db'); // 引入数据库连接

/**
 * 获取当月统计 (总收入、总支出、结余)
 * 
 * 逻辑说明：
 * 1. 自动识别当前月份 (格式：YYYY-MM)
 * 2. 使用 SQL 聚合函数 SUM 分别计算收入和支出总额
 * 3. 返回该月的收入、支出以及结余（收入 - 支出）
 */
exports.getMonthlyStats = (req, res) => {
    const userId = req.userId;
    const currentMonth = new Date().toISOString().slice(0, 7); // 当前月份字符串：YYYY-MM

    const sql = `
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
        FROM bills 
        WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `;

    db.get(sql, [userId, currentMonth], (err, row) => {
        if (err) return res.status(500).json({ error: '获取月度统计失败：' + err.message });

        const income = row.total_income || 0;
        const expense = row.total_expense || 0;
        res.json({
            month: currentMonth,
            total_income: income,
            total_expense: expense,
            balance: income - expense
        });
    });
};

/**
 * 获取收支趋势 (支持周、月、年)
 * 
 * 入口参数（query）：
 * - granularity: 'week' | 'month' | 'year'，默认为 'month'
 * 
 * 行为说明：
 * - week：统计本周 7 天（周一到周日）的每日收入支出
 * - month：按照最近 6 个月统计每月收入与支出
 * - year：按照最近 5 年统计每年收入与支出
 */
exports.getTrendStats = (req, res) => {
    const userId = req.userId;
    const { granularity = 'month' } = req.query;

    let timeFormat;
    let limit;

    switch (granularity) {
        case 'week':
            // 本周 (周一至周日) 的每日统计
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 表示周日，1 表示周一 ...
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(now);
            monday.setDate(now.getDate() + diffToMonday);
            monday.setHours(0, 0, 0, 0);
            const mondayStr = monday.toISOString().split('T')[0]; // 本周一日期字符串

            // 聚合本周内每日的收入和支出，并计算星期索引（0~6）
            const sqlWeek = `
                SELECT 
                    strftime('%Y-%m-%d', date) as date_str,
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
                    CAST((strftime('%w', date) + 6) % 7 AS INTEGER) as weekday_index
                FROM bills 
                WHERE user_id = ? AND date >= ?
                GROUP BY date_str
                ORDER BY date_str ASC
            `;

            // 直接在该分支内返回（避免继续往下执行通用 SQL）
            return db.all(sqlWeek, [userId, mondayStr], (err, rows) => {
                if (err) return res.status(500).json({ error: '获取周统计失败：' + err.message });

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                const sundayStr = sunday.toISOString().split('T')[0];

                // 构造固定 7 天的结果数组，若某天没有记录则补 0
                const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                const result = weekDays.map((name, index) => {
                    const found = rows.find(r => r.weekday_index === index);
                    return {
                        period: name,
                        income: found ? found.income : 0,
                        expense: found ? found.expense : 0
                    };
                });
                res.json({
                    weekRange: `${mondayStr} ~ ${sundayStr}`,
                    data: result
                });
            });

        case 'year':
            timeFormat = '%Y';
            limit = 5; // 最近 5 年
            break;
        case 'month':
        default:
            timeFormat = '%Y-%m';
            limit = 6; // 最近 6 个月
            break;
    }

    const sql = `
        SELECT 
            strftime('${timeFormat}', date) as period,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM bills 
        WHERE user_id = ?
        GROUP BY period
        ORDER BY period DESC
        LIMIT ?
    `;

    db.all(sql, [userId, limit], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取趋势数据失败：' + err.message });
        res.json(rows.reverse()); // 按时间正序返回
    });
};

/**
 * 获取支出分类占比
 * 
 * 1. 统计指定月份（默认为当月）内各项支出的总额
 * 2. 关联分类表以获取分类名称
 */
exports.getCategoryRatioStats = (req, res) => {
    const userId = req.userId;
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const sql = `
        SELECT 
            c.name as category_name,
            SUM(b.amount) as value
        FROM bills b
        JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ? AND b.type = 'expense' AND strftime('%Y-%m', b.date) = ?
        GROUP BY c.name
    `;

    db.all(sql, [userId, targetMonth], (err, rows) => {
        if (err) return res.status(500).json({ error: '获取分类占比失败：' + err.message });
        res.json(rows);
    });
};
