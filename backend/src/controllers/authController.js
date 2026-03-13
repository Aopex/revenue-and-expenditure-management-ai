// authController.js
// 认证与用户账户相关控制器：
// - 用户注册：写入用户表并保存加密后的密码
// - 用户登录：校验密码并签发 JWT
// - 修改个人资料：支持更新用户名和密码（需要已登录）

const db = require('../db/db');          // 引入数据库连接
const bcrypt = require('bcryptjs');      // 用于密码哈希与校验
const jwt = require('jsonwebtoken');     // 用于生成和验证 JWT

// JWT 密钥（生产环境建议放在环境变量中）：
// - process.env.JWT_SECRET 优先
// - 未设置时使用开发环境默认值
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_for_dev';

/**
 * 用户注册
 * 
 * 处理流程：
 * 1. 检查用户名和密码是否提供，缺失时返回 400
 * 2. 检查用户名是否已存在（唯一约束）
 * 3. 对密码进行哈希加密（bcrypt，10 轮盐值）
 * 4. 将新用户写入数据库，并返回新建用户的 id
 */
exports.register = (req, res) => {
    const { username, password } = req.body;
    // 基本参数校验：用户名/密码均为必填
    if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    // 限制密码长度，避免过短或过长的弱口令
    if (password.length < 8 || password.length > 16) {
        return res.status(400).json({ message: '密码长度需为 8-16 位' });
    }

    // 检查用户名是否重复：若存在同名记录则返回 409 冲突
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ message: '数据库查询错误' });
        if (row) return res.status(409).json({ message: '该用户名已被占用' });

        // 使用 bcrypt 对密码进行加密存储，避免明文保存
        const hash = bcrypt.hashSync(password, 10);
        db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function (err2) {
            if (err2) return res.status(500).json({ message: '用户创建失败' });
            return res.json({ message: '注册成功', userId: this.lastID });
        });
    });
};

/**
 * 用户登录
 * 
 * 处理流程：
 * 1. 根据用户名查询用户记录
 * 2. 验证请求密码与数据库中哈希密码是否匹配
 * 3. 若验证通过，生成 JWT 令牌并返回给前端
 */
exports.login = (req, res) => {
    const { username, password } = req.body;
    // 基本参数校验
    if (!username || !password) {
        return res.status(400).json({ message: '用户名和密码为必填项' });
    }

    db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username], (err, row) => {
        if (err) return res.status(500).json({ message: '数据库查询错误' });
        if (!row) return res.status(401).json({ message: '用户名或密码错误' });

        // 使用 bcrypt 验证密码是否匹配
        const match = bcrypt.compareSync(password, row.password_hash);
        if (!match) return res.status(401).json({ message: '用户名或密码错误' });

        // 生成 JWT Token (有效期 7 天)，载荷包含用户 id 和用户名
        const token = jwt.sign({ userId: row.id, username: row.username }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ message: '登录成功', token });
    });
};

/**
 * 修改个人资料 (用户名或密码)
 * 
 * 适用场景：用户已登录，通过 Token 鉴权后修改自己的资料。
 * 处理流程：
 * 1. 验证是否提供了修改项（username 或 password 必须至少有一个）
 * 2. 根据传入字段动态构建 UPDATE 语句与参数列表
 * 3. 执行更新，并在用户名重复时返回 409 提示前端
 */
exports.updateProfile = (req, res) => {
    const { username, password } = req.body;
    const userId = req.userId; // 从 authMiddleware 中获取的当前登录用户 ID

    if (!username && !password) {
        return res.status(400).json({ message: '请提供要修改的用户名或密码' });
    }

    let sql = 'UPDATE users SET ';
    const params = [];
    const updates = [];

    // 如果提供了新用户名，则加入更新字段
    if (username) {
        updates.push('username = ?');
        params.push(username);
    }

    // 如果提供了新密码，则进行哈希加密后加入更新字段
    if (password) {
        const hash = bcrypt.hashSync(password, 10);
        updates.push('password_hash = ?');
        params.push(hash);
    }

    // 拼接完整 SQL，并追加 WHERE 条件限定为当前用户
    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(userId);

    db.run(sql, params, function (err) {
        if (err) {
            // 处理用户名重复的情况（UNIQUE 约束冲突）
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ message: '用户名已存在' });
            }
            return res.status(500).json({ message: '更新失败：' + err.message });
        }
        res.json({ message: '个人资料更新成功' });
    });
};
