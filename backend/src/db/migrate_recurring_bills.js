// migrate_recurring_bills.js
// 本迁移脚本用于创建定期账单表 `recurring_bills`，用于保存用户的周期性账单（例如每月订阅、工资等）。
// 字段说明（主要字段）：
// - user_id: 所属用户
// - category_id: 所属分类（可为空）
// - type: 收入或支出
// - amount: 金额
// - period: 周期（daily/weekly/monthly/yearly）
// - next_date: 下次执行日期，用于调度执行
// - last_executed_at: 上次执行时间

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../expense_manager.db');
const db = new sqlite3.Database(dbPath);

console.log('正在运行迁移：创建 recurring_bills 表...');

const sql = `
CREATE TABLE IF NOT EXISTS recurring_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    amount REAL NOT NULL,
    period TEXT CHECK(period IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
    next_date DATE NOT NULL,
    remark TEXT,
    last_executed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
`;

// 执行创建表语句
db.run(sql, (err) => {
    if (err) {
        console.error('迁移失败:', err.message);
    } else {
        console.log('迁移成功：recurring_bills 表已创建。');
    }
    db.close();
});
