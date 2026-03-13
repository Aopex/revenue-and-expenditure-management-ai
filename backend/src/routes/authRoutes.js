const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// [公开] 用户注册
router.post('/register', authController.register);

// [公开] 用户登录
router.post('/login', authController.login);

// [受保护] 修改个人资料 (需要 Token)
router.put('/update-profile', authMiddleware, authController.updateProfile);

module.exports = router;
