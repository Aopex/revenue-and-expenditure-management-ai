// db.js
// 本文件用于创建并导出 SQLite 数据库连接实例。
// - 使用 sqlite3 打开位于项目根目录的 `expense_manager.db` 文件
// - 在连接成功后启用外键约束（PRAGMA foreign_keys = ON）
// - 将数据库实例导出供应用其他模块使用
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径（相对于当前文件），位于项目根目录
const dbPath = path.resolve(__dirname, '../../expense_manager.db');

// 创建（或打开）SQLite 数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        // 打开数据库失败时打印错误信息
        console.error('打开数据库失败:', err.message);
    } else {
        // 成功连接数据库
        console.log('已连接到 SQLite 数据库。');
        // 开启 SQLite 的外键约束支持，确保外键关系生效
        db.run('PRAGMA foreign_keys = ON');
    }
});

// 导出数据库实例供其他模块使用
module.exports = db;
