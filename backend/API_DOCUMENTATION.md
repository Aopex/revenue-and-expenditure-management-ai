# 收支管理系统后端 API 文档

本文档详细描述了收支管理系统后端提供的 RESTful API 接口。

## 1. 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token
  - header: `Authorization: Bearer <your_token>`
  - 登录成功后会返回 Token，后续所有受保护接口均需携带此 Header。

## 2. 通用状态码

| 状态码 | 含义                  | 说明                       |
| :----- | :-------------------- | :------------------------- |
| 200    | OK                    | 请求成功                   |
| 201    | Created               | 资源创建成功               |
| 400    | Bad Request           | 请求参数错误或缺失         |
| 401    | Unauthorized          | Token 无效、过期或未登录   |
| 403    | Forbidden             | 无权访问该资源             |
| 404    | Not Found             | 请求的资源不存在           |
| 409    | Conflict              | 资源冲突（如用户名已存在） |
| 500    | Internal Server Error | 服务器内部错误             |

---

## 3. 接口详情

### 3.1 用户认证 (Authentication)

#### 注册用户

- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth**: 无需认证
- **Body**:
  ```json
  {
    "username": "testuser",
    "password": "securepassword123"
  }
  ```
- **Response**:
  ```json
  {
    "message": "注册成功",
    "userId": 1
  }
  ```

#### 用户登录

- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth**: 无需认证
- **Body**:
  ```json
  {
    "username": "testuser",
    "password": "securepassword123"
  }
  ```
- **Response**:
  ```json
  {
    "message": "登录成功",
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

#### 修改个人资料

- **URL**: `/auth/update-profile`
- **Method**: `PUT`
- **Auth**: 需要
- **Body** (可选，至少提供一项):
  ```json
  {
    "username": "newusername",
    "password": "newpassword123"
  }
  ```
- **Response**:
  ```json
  {
    "message": "个人资料更新成功"
  }
  ```

---

### 3.2 账单管理 (Bills)

#### 获取账单列表

- **URL**: `/bills`
- **Method**: `GET`
- **Auth**: 需要
- **Query Parameters**:
  - `page`: 页码 (默认 1)
  - `limit`: 每页条数 (默认 10)
  - `month`: 月份筛选 (格式 `YYYY-MM`)
  - `type`: 类型筛选 (`income` 或 `expense`)
  - `category_id`: 分类 ID 筛选
- **Response**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "user_id": 1,
        "category_id": 2,
        "type": "expense",
        "amount": 50.0,
        "date": "2023-10-25",
        "remark": "午餐",
        "created_at": "2023-10-25 12:00:00",
        "category_name": "餐饮",
        "category_icon": "food"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
  ```

#### 创建新账单

- **URL**: `/bills`
- **Method**: `POST`
- **Auth**: 需要
- **Body**:
  ```json
  {
    "amount": 100.5,
    "type": "expense",         // "income" 或 "expense"
    "category_id": 1,
    "date": "2023-10-26",
    "remark": "超市购物"      // 可选
  }
  ```
- **Response**:
  ```json
  {
    "id": 5,
    "amount": 100.5,
    "type": "expense",
    "category_id": 1,
    "date": "2023-10-26",
    "remark": "超市购物",
    "user_id": 1
  }
  ```

#### 更新账单

- **URL**: `/bills/:id`
- **Method**: `PUT`
- **Auth**: 需要
- **Body**:
  ```json
  {
    "amount": 120.0,
    "type": "expense",
    "category_id": 2,
    "date": "2023-10-26",
    "remark": "修改后的备注"
  }
  ```
- **Response**:
  ```json
  {
    "message": "账单更新成功",
    "changes": 1
  }
  ```

#### 删除账单

- **URL**: `/bills/:id`
- **Method**: `DELETE`
- **Auth**: 需要
- **Response**:
  ```json
  {
    "message": "账单删除成功"
  }
  ```

#### 导入账单文件

- **URL**: `/bills/import`
- **Method**: `POST`
- **Auth**: 需要
- **Headers**:
  - `Content-Type`: `multipart/form-data`
- **Body**:
  - `file`: (Binary File) 微信或支付宝导出的 XLSX/CSV 账单文件
- **Response**:
  ```json
  {
    "message": "导入完成",
    "imported": 15,
    "duplicate": 2
  }
  ```

---

### 3.3 分类管理 (Categories)

#### 获取所有分类

- **URL**: `/categories`
- **Method**: `GET`
- **Auth**: 需要 (建议开放，但目前未强制要求，视具体中间件配置而定，代码中似乎未强制)
- **Response**:
  ```json
  [
    {
      "id": 1,
      "name": "餐饮",
      "type": "expense",
      "icon": "food"
    },
    {
      "id": 10,
      "name": "工资",
      "type": "income",
      "icon": "salary"
    }
  ]
  ```

---

### 3.4 统计分析 (Stats)

#### 获取月度收支概览

- **URL**: `/stats/monthly`
- **Method**: `GET`
- **Auth**: 需要
- **Response**:
  ```json
  {
    "month": "2023-10",
    "total_income": 5000,
    "total_expense": 3000,
    "balance": 2000
  }
  ```

#### 获取收支趋势

- **URL**: `/stats/trend`
- **Method**: `GET`
- **Auth**: 需要
- **Query Parameters**:
  - `granularity`: (可选) 时间粒度，可选值为 `week` (本周一至周日的日统计), `month` (最近6个月, 默认), `year` (最近5年)。
- **Response**:
  ```json
  [
    {
      "period": "2023-10",
      "income": 4500,
      "expense": 2000
    },
    // ...
  ]
  ```

#### 获取支出分类占比

- **URL**: `/stats/category-ratio`
- **Method**: `GET`
- **Auth**: 需要
- **Query Parameters**:
  - `month`: (可选) 指定月份 `YYYY-MM`，默认为当月
- **Response**:
  ```json
  [
    {
      "category_name": "餐饮",
      "value": 1500
    },
    // ...
  ]
  ```
