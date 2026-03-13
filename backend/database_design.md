# 数据库表结构设计说明

本项目使用 **SQLite** 数据库，主要包含用户管理、收支分类、账单记录以及定期账单四个核心表。

## 1. 用户表 (`users`)

用于存储用户的基本信息和登录凭证。

| 字段名            | 类型     | 约束                       | 说明               |
| :---------------- | :------- | :------------------------- | :----------------- |
| `id`            | INTEGER  | PRIMARY KEY, AUTOINCREMENT | 用户唯一标识       |
| `username`      | TEXT     | NOT NULL, UNIQUE           | 用户名（用于登录） |
| `password_hash` | TEXT     | NOT NULL                   | 加密后的密码       |
| `created_at`    | DATETIME | DEFAULT CURRENT_TIMESTAMP  | 账号创建时间       |

---

## 2. 收支分类表 (`categories`)

预设或用户自定义的收支类别（如：餐饮、工资、交通）。

| 字段名         | 类型     | 约束                                 | 说明                                          |
| :------------- | :------- | :----------------------------------- | :-------------------------------------------- |
| `id`         | INTEGER  | PRIMARY KEY, AUTOINCREMENT           | 分类唯一标识                                  |
| `name`       | TEXT     | NOT NULL                             | 分类名称（如：餐饮、兼职）                    |
| `type`       | TEXT     | CHECK(type IN ('income', 'expense')) | 类型：`income` (收入) 或 `expense` (支出) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP            | 创建时间                                      |

---

## 3. 账单主表 (`bills`)

核心业务数据表，记录每一笔收支明细。

| 字段名          | 类型     | 约束                                 | 说明                                               |
| :-------------- | :------- | :----------------------------------- | :------------------------------------------------- |
| `id`          | INTEGER  | PRIMARY KEY, AUTOINCREMENT           | 账单唯一标识                                       |
| `user_id`     | INTEGER  | NOT NULL, FOREIGN KEY                | 所属用户 ID                                        |
| `category_id` | INTEGER  | FOREIGN KEY                          | 所属分类 ID                                        |
| `type`        | TEXT     | CHECK(type IN ('income', 'expense')) | 类型：`income` (收入) 或 `expense` (支出)      |
| `amount`      | REAL     | NOT NULL                             | 金额                                               |
| `date`        | DATETIME | NOT NULL                             | 发生日期                                           |
| `remark`      | TEXT     | -                                    | 备注说明                                           |
| `created_at`  | DATETIME | DEFAULT CURRENT_TIMESTAMP            | 记录录入时间                                       |
| `source`      | TEXT     | DEFAULT 'system'                     | 账单来源（如：`system`, `alipay`, `wechat`） |

---

## 4. 定期账单表 (`recurring_bills`)

用于记录自动生成的周期性账单（如房租、订阅服务）。

| 字段名               | 类型     | 约束                                 | 说明                                           |
| :------------------- | :------- | :----------------------------------- | :--------------------------------------------- |
| `id`               | INTEGER  | PRIMARY KEY, AUTOINCREMENT           | 唯一标识                                       |
| `user_id`          | INTEGER  | NOT NULL, FOREIGN KEY                | 所属用户 ID                                    |
| `category_id`      | INTEGER  | FOREIGN KEY                          | 所属分类 ID                                    |
| `type`             | TEXT     | CHECK(type IN ('income', 'expense')) | 类型：`income` (收入) 或 `expense` (支出)  |
| `amount`           | REAL     | NOT NULL                             | 金额                                           |
| `period`           | TEXT     | NOT NULL                             | 周期（如：`daily`, `weekly`, `monthly`） |
| `next_date`        | DATE     | NOT NULL                             | 下次生成日期                                   |
| `remark`           | TEXT     | -                                    | 备注说明                                       |
| `last_executed_at` | DATETIME | -                                    | 上次自动执行时间                               |
| `created_at`       | DATETIME | DEFAULT CURRENT_TIMESTAMP            | 创建时间                                       |

---

## 5. 关系说明

- **用户关联**：`bills.user_id` 和 `recurring_bills.user_id` 均关联 `users.id`，实现数据隔离。
- **分类关联**：`bills.category_id` 和 `recurring_bills.category_id` 关联 `categories.id`。
- **级联删除**：通常建议在删除用户时级联删除其名下的账单和分类。

---

## 6. 预设分类说明

系统初始化时会自动创建以下常用分类：

- **支出类**：餐饮美食、服饰装扮、日用百货、交通出行、住房物业、休闲娱乐、医疗教育、生活服务、公益捐赠、商业保险、金融信贷、充值缴费、红包转账、其他支出等。
- **收入类**：工资薪水、投资理财、红包转账、退款售后、其他收入等。

---

## 设计亮点

1. **类型约束**：通过 `CHECK` 约束确保数据流向明确（收入/支出）。
2. **多来源透明**：`source` 字段区分手动与自动导入，方便后续统计对账。
3. **自动化支持**：通过 `recurring_bills` 支持固定开销的自动管理。
4. **结构简洁**：表结构设计聚焦核心财务信息，易于维护与扩展。
