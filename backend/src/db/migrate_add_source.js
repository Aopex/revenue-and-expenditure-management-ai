// migrate_add_source.js
// 本迁移脚本用于检查 `bills` 表是否存在 `source` 列，若不存在则添加该列并设置默认值为 'system'。
// 该列用于标记账单的来源（例如手动录入、导入、同步等），便于后续统计与溯源。
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径（相对）
const dbPath = path.resolve(__dirname, '../../expense_manager.db');

// 打开数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        // 打开失败则打印错误并退出
        console.error('打开数据库失败:', err.message);
        process.exit(1);
    }
    console.log('已连接到 SQLite 数据库。');
});

// 使用 serialize 保证操作按顺序执行
db.serialize(() => {
    // 通过 PRAGMA table_info 查询表结构，判断是否已有 source 列
    db.all("PRAGMA table_info(bills)", (err, rows) => {
        if (err) {
            console.error('查询表结构失败:', err.message);
            db.close();
            return;
        }

        // 检查列名列表中是否包含 'source'
        const hasSource = rows.some(row => row.name === 'source');
        if (!hasSource) {
            // 如果没有则通过 ALTER TABLE 添加列，并设置默认值为 'system'
            db.run("ALTER TABLE bills ADD COLUMN source TEXT DEFAULT 'system'", (err) => {
                if (err) {
                    console.error('添加列失败:', err.message);
                } else {
                    console.log('已成功添加列 "source"。');
                }
                db.close();
            });
        } else {
            // 已存在则直接关闭连接
            console.log('列 "source" 已存在，无需操作。');
            db.close();
        }
    });
});
