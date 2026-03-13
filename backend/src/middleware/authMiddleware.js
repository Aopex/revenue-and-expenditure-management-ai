const jwt = require('jsonwebtoken');

/**
 * JWT 密钥，优先从环境变量获取，否则使用默认值（仅限开发环境）
 */
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_for_dev';

/**
 * JWT 身份验证中间件
 * 
 * 该中间件会检查请求头中的 Authorization 字段，验证 JWT 令牌的有效性。
 * 如果验证通过，会将解析出的 userId 和 username 存入 req 对象，供后续控制器使用。
 */
const authMiddleware = (req, res, next) => {
    // 从请求头获取 Authorization 字段 (格式通常为: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // 如果没有提供令牌，返回 401 未授权错误
    if (!token) {
        return res.status(401).json({ message: '未提供认证令牌，请先登录' });
    }

    // 验证令牌
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // 令牌无效或已过期，返回 403 禁止访问错误
            return res.status(403).json({ message: '令牌无效或已过期，请重新登录' });
        }

        // 将用户信息挂载到请求对象上，方便后续逻辑获取当前登录用户
        req.userId = decoded.userId;
        req.username = decoded.username;

        // 继续执行下一个中间件或路由处理函数
        next();
    });
};

module.exports = authMiddleware;
