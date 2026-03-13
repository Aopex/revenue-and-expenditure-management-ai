const express = require('express');
const router = express.Router();
const statController = require('../controllers/statController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * 统计分析路由
 * 所有接口均受 JWT 保护，必须在 Header 中携带有效 Token
 */
router.use(authMiddleware);

// 获取当月收支概览 (总收入、总支出、结余)
router.get('/monthly', statController.getMonthlyStats);

// 获取收支趋势数据 (最近 6 个月)
router.get('/trend', statController.getTrendStats);

// 获取支出分类占比数据 (用于饼图)
router.get('/category-ratio', statController.getCategoryRatioStats);

module.exports = router;
