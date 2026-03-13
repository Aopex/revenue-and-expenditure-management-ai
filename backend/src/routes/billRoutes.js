const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const authMiddleware = require('../middleware/authMiddleware');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * 配置文件上传中间件
 * 设置文件上传目录和文件命名规则
 */
// 配置文件上传目录
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    // 如果上传目录不存在则创建
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件存储设置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 设置文件保存路径
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳+随机数+原文件扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 创建multer上传实例
const upload = multer({ storage: storage });

/**
 * 账单管理路由
 * 所有接口均受 JWT 保护，必须在 Header 中携带有效 Token
 */
router.use(authMiddleware);

/**
 * 导入账单文件
 * 支持微信Excel文件(.xlsx/.xls)和支付宝CSV文件(.csv)
 * 文件字段名: 'file'
 */
router.post('/import', upload.single('file'), billController.importBills);

/**
 * 获取账单列表
 * 支持分页、月份筛选、类型筛选、分类筛选
 * 查询参数:
 * - page: 页码
 * - limit: 每页数量
 * - month: 月份筛选 (格式: YYYY-MM)
 * - type: 账单类型 (expense/income)
 * - category_id: 分类ID
 */
router.get('/', billController.getAllBills);

/**
 * 添加新账单
 * 创建新的账单记录
 */
router.post('/', billController.createBill);

/**
 * 更新指定ID的账单
 * 路径参数:
 * - id: 账单ID
 */
router.put('/:id', billController.updateBill);

/**
 * 删除指定ID的账单
 * 路径参数:
 * - id: 账单ID
 */
router.delete('/:id', billController.deleteBill);

module.exports = router;
