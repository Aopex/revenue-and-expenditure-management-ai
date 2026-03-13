/**
 * init.js
 * 本脚本用于初始化数据库：读取 `schema.sql` 并执行其中的建表语句以确保数据库结构存在。
 *
 * 说明：
 * - 数据库文件位于项目根目录的 `expense_manager.db`（相对路径）。
 * - `schema.sql` 存放在当前目录，包含所有表与初始数据的 SQL 语句。
 * - 脚本会一次性执行 schema 中的语句，执行完成后关闭连接。
 */

const sqlite3 = require('sqlite3').verbose(); // 引入 sqlite3 并开启 verbose 模式以便调试输出
const fs = require('fs'); // 用于读取 schema.sql 文件
const path = require('path'); // 路径工具，确保跨平台路径正确

// 数据库文件路径（相对于当前文件）
const dbPath = path.resolve(__dirname, '../../expense_manager.db');
// schema 文件路径（与当前文件同目录）
const schemaPath = path.resolve(__dirname, 'schema.sql');

// 打开或创建 SQLite 数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        // 打开数据库失败，打印错误并退出进程（初始化脚本通常在开发/部署时运行）
        console.error('打开数据库失败:', err.message);
        process.exit(1);
    }
    console.log('已连接到 SQLite 数据库。');
});

// 同步读取 schema.sql 内容（文件较小，使用同步读取更直观）
const schema = fs.readFileSync(schemaPath, 'utf8');

// 使用 serialize 保证 SQL 语句按顺序执行
db.serialize(() => {
    // 将 schema 内容一次性执行（支持多语句）
    // 如果需要更细粒度的错误处理，可拆分语句后逐条执行
    db.exec(schema, (err) => {
        if (err) {
            // 执行 schema 失败时打印详细错误信息
            console.error('执行 schema 失败:', err.message);
        } else {
            // 成功初始化数据库结构与初始数据
            console.log('数据库初始化成功。');
        }
        // 无论成功或失败，都关闭数据库连接释放资源
        db.close();
    });
});
