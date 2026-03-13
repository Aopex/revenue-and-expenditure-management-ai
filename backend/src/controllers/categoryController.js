// categoryController.js
// 分类相关控制器：
// - 当前实现：只读地获取系统中所有预设收支分类
// - 返回结果按类型与名称排序，便于前端直接展示下拉选择等

const db = require('../db/db'); // 数据库连接

/**
 * 获取所有预设分类
 * 
 * 行为：
 * - 从 categories 表中读取所有记录
 * - 按 type（收入/支出）和 name（名称）排序
 * - 发生错误时返回 500，成功时返回分类列表数组
 */
exports.getAllCategories = (req, res) => {
    const sql = 'SELECT * FROM categories ORDER BY type, name';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: '获取分类失败：' + err.message });
        }
        res.json(rows);
    });
};
