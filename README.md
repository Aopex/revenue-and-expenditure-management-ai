# AI 增强版收支管理系统（AI-Ledger）

一个集成了 **LLM 智能分类** 的全栈个人财务管理平台。在提供账单录入、可视化统计、账单自动导入及周期任务等核心功能的基础上，引入大模型预测引擎，实现金融流水的精准自动化归档。项目提供一键启动脚本，可快速搭建包含 AI 微服务在内的完整环境。

- **前端**：Vue 3 · Vite · Element Plus · Vue Router · ECharts · Day.js
- **后端 (业务)**：Node.js · Express · SQLite · JWT · bcryptjs
- **后端 (AI服务)**：Python 3.10+ · FastAPI · Pydantic · OpenAI SDK (兼容 SiliconFlow)
- **工具**：concurrently、nodemon、Python venv 自动环境初始化脚本

## 目录结构
```
├─ backend/          # Node.js + Express 业务逻辑服务端
├─ front/            # Vue3 + Vite 前端单页应用
├─ llm_service/      # FastAPI + Qwen 大模型推理微服务
├─ start.bat         # Windows 一键全栈启动脚本（含 Python 自动配环境）
└─ README.md         # 本文件
```

## 核心功能
- 用户认证：注册 / 登录 / Token 校验，支持自动重定向与退出登录。
- 账单管理：增删改查、分页、按月份/类型/分类筛选，并提供编辑弹窗。
- 统计分析：
  - 本月收入、支出与结余概览卡片；
  - 周/月/年收支趋势（折线 + 柱状组合图）；
  - 分类占比环形图，支持自定义渐变色与月份切换。
- **AI 智能分类**：集成 Qwen 大模型推理引擎，支持导入账单时“一键智能预测”，相比传统关键词匹配，分类准确度大幅提升。
- **账单导入**：支持支付宝/微信 CSV/XLSX，具备自动降级策略（AI 不可用时自动切换至本地正则算法）。
- 周期任务：配置工资、会员等固定周期，启动时自动生成到期账单。
- 前端体验：Element 消息提示、路由守卫、响应式布局、一键退出登录按钮。

## 快速体验（Windows）
1. **环境准备**：确保本地已安装 Node.js 与 Python 3.10+。
2. **一键启动**：双击 `start.bat`。脚本会自动完成以下动作：
   - 检查并安装 Node 前后端依赖。
   - **自动创建 Python 虚拟环境**并安装 AI 模型所需的全部 pip 包。
   - 并发启动后端业务 (Port 3000)、前端界面 (Port 5173) 及 AI 分类服务 (Port 8000)。
3. **AI 配置**：如需开启智能分类，请在 `llm_service/main.py` 中配置您的 `SILICONFLOW_API_KEY`。
4. **访问系统**：前端地址默认为 `http://localhost:5173`。如果在 `Concurrent` 启动过程中有服务报错，请检查控制台日志。

## 手动启动
```bash
# 后端
cd backend
npm install
npm run dev       # nodemon，默认监听 3000 端口

# 前端
cd front
npm install
npm run dev       # Vite，默认 5173 端口
```

## 前端亮点
- **Login / Register**：Element Plus 消息框反馈（不再使用浏览器 alert），支持记住我、密码切换显示。
- **Account 面板**：
  - 顶栏展示当前用户名 + 退出登录按钮。
  - 侧边导航切换账单列表、录入、统计、导入、周期管理。
  - 所有表单配备校验规则，操作结果使用 `ElMessage` 反馈。
- **安全性**：Vue Router 守卫会拦截未登录用户访问 `/account`，登录后自动跳转至仪表盘。
- **可视化**：ECharts 渲染趋势图、分类占比图，提供颜色选择器即时刷新。

## 后端 API 快览
所有接口以 `/api` 为前缀，除 `/auth/register` 与 `/auth/login` 外均需要 `Authorization: Bearer <token>`。

| 模块 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| Auth | POST | `/auth/register` | 用户注册 |
| Auth | POST | `/auth/login` | 登录并获取 JWT |
| Auth | PUT | `/auth/update-profile` | 修改用户名或密码 |
| Bills | GET | `/bills` | 分页 + 筛选账单 |
| Bills | POST | `/bills` | 新增账单 |
| Bills | PUT | `/bills/:id` | 更新账单 |
| Bills | DELETE | `/bills/:id` | 删除账单 |
| Categories | GET | `/categories` | 查询分类字典 |
| Stats | GET | `/stat/monthly` | 本月收入/支出/结余 |
| Stats | GET | `/stat/trend?granularity=week|month|year` | 收支趋势 |
| Stats | GET | `/stat/category-ratio?month=YYYY-MM` | 分类占比 |
| Import | POST | `/bills/import` | 上传 CSV 并导入账单 |
| Recurring | CRUD | `/recurring-bills` | 周期任务管理 |
| Recurring | POST | `/recurring-bills/process` | 启动时自动补账 |

## 数据库与迁移
- SQLite 数据文件：`backend/expense_manager.db`
- 初始建表：`backend/src/db/schema.sql`
- 初始化脚本：`backend/src/db/init.js`
- 迁移示例：`backend/src/db/migrate_add_source.js`, `migrate_recurring_bills.js`

主要表：
- `users`：账号信息（用户名、哈希密码）。
- `categories`：收入/支出分类字典。
- `bills`：账单主表，含类型、分类、金额、日期、备注、来源。
- `recurring_bills`：周期任务配置，记录周期、下一次执行时间等。

## 常用脚本
| 位置 | 命令 | 说明 |
| --- | --- | --- |
| backend | `npm run dev` | nodemon 热重载 |
| backend | `npm test` | 运行 `test_api_billRoutes.js`（示例） |
| front | `npm run dev` | 本地开发，自动打开浏览器 |
| front | `npm run build` | 生产构建 |

## 规划中的增强
1. 语音输入记账模块开发。
2. WebHook / 邮件提醒周期扣费。
3. 单元测试与 e2e 场景覆盖。
