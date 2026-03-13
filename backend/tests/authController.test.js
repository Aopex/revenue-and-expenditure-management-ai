const authController = require('../src/controllers/authController');
const db = require('../src/db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 模拟依赖项 (Mock Dependencies)
// 使用工厂函数来模拟 db 模块，防止副作用 (例如在测试时连接真实的数据库)
jest.mock('../src/db/db', () => ({
    get: jest.fn(),
    run: jest.fn(),
    all: jest.fn()
}));
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('身份验证控制器 (Auth Controller)', () => {
    let req, res;

    // 在每个测试用例运行前重置 Mock 和请求对象
    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(), // 支持链式调用，如 .status(400).json(...)
            json: jest.fn()
        };
        jest.clearAllMocks(); // 清除之前的莫客(Mock)调用记录
    });

    describe('注册 (register)', () => {
        test('如果用户名或密码缺失，应返回 400', () => {
            req.body = { username: 'test' }; // 缺少密码
            authController.register(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: '用户名和密码为必填项' });
        });

        test('如果用户名已存在，应返回 409', () => {
            req.body = { username: 'user', password: 'pass' };
            // 模拟 db.get 返回一行数据 (表示用户已存在)
            db.get.mockImplementation((sql, params, callback) => {
                callback(null, { id: 1 });
            });

            authController.register(req, res);
            expect(db.get).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(409);
        });

        test('应成功注册用户', () => {
            req.body = { username: 'newuser', password: 'pass' };
            db.get.mockImplementation((sql, params, callback) => {
                callback(null, null); // 用户未找到，可以注册
            });
            bcrypt.hashSync.mockReturnValue('hashed_pass'); // 模拟密码哈希
            db.run.mockImplementation(function (sql, params, callback) {
                // 模拟 'this.lastID' 上下文，表示新插入的记录 ID
                const context = { lastID: 123 };
                callback.call(context, null);
            });

            authController.register(req, res);
            expect(bcrypt.hashSync).toHaveBeenCalledWith('pass', 10);
            expect(db.run).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ message: '注册成功', userId: 123 });
        });
    });

    describe('登录 (login)', () => {
        test('如果缺少凭据，应返回 400', () => {
            req.body = { username: 'user' };
            authController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('如果用户不存在，应返回 401', () => {
            req.body = { username: 'user', password: 'pass' };
            db.get.mockImplementation((sql, params, callback) => {
                callback(null, null); // 用户未找到
            });
            authController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: '用户名或密码错误' });
        });

        test('如果密码不匹配，应返回 401', () => {
            req.body = { username: 'user', password: 'pass' };
            db.get.mockImplementation((sql, params, callback) => {
                callback(null, { id: 1, password_hash: 'hash' });
            });
            bcrypt.compareSync.mockReturnValue(false); // 密码验证失败

            authController.login(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('登录成功应返回 Token', () => {
            req.body = { username: 'user', password: 'pass' };
            db.get.mockImplementation((sql, params, callback) => {
                callback(null, { id: 1, username: 'user', password_hash: 'hash' });
            });
            bcrypt.compareSync.mockReturnValue(true); // 密码验证成功
            jwt.sign.mockReturnValue('token123'); // 模拟生成 Token

            authController.login(req, res);
            expect(res.json).toHaveBeenCalledWith({ message: '登录成功', token: 'token123' });
        });
    });
});
