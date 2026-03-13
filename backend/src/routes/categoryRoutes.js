const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

/**
 * 分类管理路由
 */

// 获取所有预设分类列表
router.get('/', categoryController.getAllCategories);

module.exports = router;
