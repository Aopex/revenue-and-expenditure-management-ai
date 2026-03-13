-- schema.sql
-- 本文件定义数据库的表结构与初始数据，用于数据库初始化脚本（init.js）执行。
-- 包含用户表、分类表、账单表以及定期账单表和初始分类数据。

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    amount REAL NOT NULL,
    date DATETIME NOT NULL,
    remark TEXT,
    source TEXT DEFAULT 'system',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 初始分类数据（含支出与收入分类）
INSERT OR IGNORE INTO categories (name, type) VALUES 
-- 支出 (Expense)
('餐饮美食', 'expense'),
('服饰装扮', 'expense'),
('日用百货', 'expense'),
('家居家装', 'expense'),
('数码电器', 'expense'),
('交通出行', 'expense'),
('住房物业', 'expense'),
('休闲娱乐', 'expense'),
('医疗教育', 'expense'),
('生活服务', 'expense'),
('商业保险', 'expense'),
('金融信贷', 'expense'),
('充值缴费', 'expense'),
('红包转账', 'expense'),
('公益捐赠', 'expense'),
('其他支出', 'expense'),

-- 收入 (Income)
('工资薪水', 'income'),
('投资理财', 'income'),
('红包转账', 'income'),
('退款售后', 'income'),
('其他收入', 'income');

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
