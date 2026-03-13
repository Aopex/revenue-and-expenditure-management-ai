# 收支管理系统（Revenue & Expenditure Management）

一个面向个人与小型团队的全栈收支管理平台，集账单录入、统计分析、账单导入、周期任务与可视化面板于一体。项目提供一键启动脚本，可在几分钟内搭建本地开发环境。

## 技术栈
- **前端**：Vue 3 · Vite · Element Plus · Vue Router · ECharts · Day.js
- **后端**：Node.js · Express · SQLite · JWT · bcryptjs
- **工具**：concurrently、nodemon、npm 镜像自动切换脚本

## 目录结构
```
revenue-and-expenditure-management/
├─ backend/          # Node.js + Express 服务端
├─ front/            # Vue3 + Vite 单页应用
├─ start.bat         # Windows 一键启动脚本（保留现有依赖）
├─ dev.bat           # Windows 一键部署脚本（强制重新安装依赖）
├─ dev.sh            # (可选) Unix 启动脚本，如未使用可忽略
└─ README.md         # 本文件
```

## 核心功能
- 用户认证：注册 / 登录 / Token 校验，支持自动重定向与退出登录。
- 账单管理：增删改查、分页、按月份/类型/分类筛选，并提供编辑弹窗。
- 统计分析：
  - 本月收入、支出与结余概览卡片；
  - 周/月/年收支趋势（折线 + 柱状组合图）；
  - 分类占比环形图，支持自定义渐变色与月份切换。
- 账单导入：拖拽支付宝/微信 CSV，自动分类、去重并显示导入结果。
- 周期任务：配置工资、会员等固定周期，启动时自动生成到期账单。
- 前端体验：Element 消息提示、路由守卫、响应式布局、一键退出登录按钮。

## 快速体验（Windows）
1. **首次或依赖异常时**：双击 `dev.bat`，脚本会删除三个 `node_modules` 文件夹并重新安装、初始化数据库，然后同时启动前后端。
2. **日常开发**：双击 `start.bat`，脚本会检查缺失依赖后直接并发启动。
3. 后端地址默认为 `http://localhost:3000`，前端地址默认为 `http://localhost:5173`。
4. 如果 `dev.bat` 中的 `concurrently` 报错，脚本会保留命令行窗口并提示查看日志。

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
1. 语音输入记账、AI 分类推荐。
2. WebHook / 邮件提醒周期扣费。
3. 单元测试与 e2e 场景覆盖。
