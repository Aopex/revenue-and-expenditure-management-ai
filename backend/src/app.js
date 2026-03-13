const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// --- 中间件配置 ---

// 启用跨域资源共享 (CORS)，允许前端应用跨域访问
app.use(cors());

// 解析 JSON 格式的请求体
app.use(express.json());

// --- 路由挂载 ---

// 测试接口：确认后端服务是否正常运行
app.get('/', (req, res) => {
    res.json({
        message: '收支管理系统后端服务已启动',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

// 导入各模块路由
const authRoutes = require('./routes/authRoutes');
const billRoutes = require('./routes/billRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const statRoutes = require('./routes/statRoutes');
const recurringBillRoutes = require('./routes/recurringBillRoutes');

// 挂载路由到指定路径
app.get('/api', (req, res) => {
    res.json({
        message: '收支管理系统 API 服务已就绪',
        status: 'online',
        endpoints: {
            auth: '/api/auth',
            bills: '/api/bills',
            categories: '/api/categories',
            stat: '/api/stat',
            recurring: '/api/recurring-bills'
        }
    });
});

app.use('/api/auth', authRoutes);       // 用户认证相关 (注册、登录、资料修改)
app.use('/api/bills', billRoutes);      // 账单管理相关 (增删改查)
app.use('/api/categories', categoryRoutes); // 分类管理相关 (获取分类列表)
app.use('/api/stat', statRoutes);            // 统计分析相关 (月度、趋势、占比)
app.use('/api/recurring-bills', recurringBillRoutes); // 周期账单相关

// --- 启动服务器 ---

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log(`API 基础路径: http://localhost:${port}/api`);
});
