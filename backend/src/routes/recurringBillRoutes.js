const express = require('express');
const router = express.Router();
const recurringBillController = require('../controllers/recurringBillController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// 获取所有周期规则
router.get('/', recurringBillController.getAllRecurringBills);

// 创建新规则
router.post('/', recurringBillController.createRecurringBill);

// 删除规则
router.delete('/:id', recurringBillController.deleteRecurringBill);

// 执行/补全到期的账单
router.post('/process', recurringBillController.processRecurringBills);

module.exports = router;
