import os
from typing import Literal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from openai import AsyncOpenAI, OpenAIError

# 创建 FastAPI 实例
app = FastAPI(
    title="财务大模型分类微服务",
    description="基于 Qwen 大模型的独立账本分类系统",
    version="1.0.0"
)

# 动态读取系统环境变量中的 API Key，如果在 Python 进程启动时没有设置则默认获取到 None。
# 为了代码健壮性，我们可以提供一个空字符串作为占位。
API_KEY = os.getenv("SILICONFLOW_API_KEY", "")
# API_KEY = "sk-"  # 硬编码测试用

# 初始化异步 OpenAI 客户端。它会复用 HTTP 连接并进行异步并发控制。
# 将 API Key 透传，并将 Base URL 配置为硅基流动兼容地址
client = AsyncOpenAI(
    api_key=API_KEY if API_KEY else "dummy_key_to_prevent_init_error", 
    base_url="https://api.siliconflow.cn/v1"
)

# --------------------
# 交易分类约束体系设计
# --------------------

# 根据需求确立的精确分类列表
EXPENSE_CATEGORIES = [
    "餐饮美食", "服饰装扮", "日用百货", "家居家装", "数码电器", 
    "交通出行", "住房物业", "休闲娱乐", "医疗教育", "生活服务", 
    "商业保险", "金融信贷", "充值缴费", "红包转账", "公益捐赠", 
    "其他支出"
]

INCOME_CATEGORIES = [
    "工资薪水", "投资理财", "红包转账", "退款售后", "其他收入"
]

# --------------------
# Pydantic 强类型数据模型
# --------------------

class TransactionRequest(BaseModel):
    """
    前端发起调用的请求参数模型
    强类型和 Literal 可以天然避免传入错误的交易类型字符串
    """
    merchant_name: str = Field(..., description="商户名或交易说明")
    amount: float = Field(..., ge=0, description="交易金额（要求绝对值大于等于0）")
    transaction_type: Literal["支出", "收入"] = Field(..., description="交易类型，严格限制为'支出'或'收入'")

class CategoryResponse(BaseModel):
    """
    API 响应包的数据模型
    """
    category: str = Field(..., description="处理清洗过后的可用分类结果")

# --------------------
# API 路由逻辑
# --------------------

@app.post("/api/categorize", response_model=CategoryResponse)
async def categorize_transaction(request: TransactionRequest):
    """
    异步 POST 接口。接收一笔交易信息，交由硅基流动平台的大模型进行推理并输出固定类目。
    包含数据清洗及有效性兜底处理。
    """
    
    # 1. 根据当前传入的类型，提取对应合法分类及默认兜底项（由于前面有 Literal 的校验，此处不会存在其它分支）
    if request.transaction_type == "支出":
        valid_categories = EXPENSE_CATEGORIES
        fallback_category = "其他支出"
    else:  # "收入"
        valid_categories = INCOME_CATEGORIES
        fallback_category = "其他收入"
        
    # 2. 动态拼接强干预的 System Prompt
    # 中文语义下用、号能有效防止模型产生误解
    categories_str = '、'.join([f'"{c}"' for c in valid_categories])
    system_prompt = (
        f"你是一个专业的个人财务分类助手。你的任务是将一条【{request.transaction_type}】类型的交易记录分类。\n"
        f"请注意：你只能并且必须从以下列表中选择一项输出：[{categories_str}]。\n"
        "【最后硬性指令】：绝对不能输出任何解释、标点符号或额外说明，只允许输出类别名称的纯文本！"
    )
    
    # 3. 构造给模型的业务流水输入（商户名/金额等重要推理依据）
    user_prompt = f"商户名/交易说明: {request.merchant_name}\n交易金额: {request.amount}"

    try:
        # 4. 透传调用远端大模型实现意图分类
        response = await client.chat.completions.create(
            model="Qwen/Qwen2.5-7B-Instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,  # 设定为 0 可以降服 LLM，使其不要发挥创意导致乱答
            max_tokens=10     # 类别名只有几个字，进一步阻止模型“长篇大论”
        )
        
        # 5. 取出并初滤响应文本（去掉隐藏的换行或多出的空格片段）
        raw_result = response.choices[0].message.content.strip()
        
        # 为了进一步防止幻觉及“智能标点”产生（比如答“「餐饮美食」.”），这里可以补充基础符号清洗
        result = raw_result.replace('"', '').replace("'", "").replace(".", "").replace("。", "").replace("「", "").replace("」", "").replace("【", "").replace("】", "")
        
        # 6. 后处理清洗与兜底操作
        # 如果经过严苛干预后的输出内容依旧不在这层类型的类别白名单中，强制切换至默认兜底。
        if result not in valid_categories:
            print(f"[Warning] AI 返回的\"{result}\"为不合法类别或被截断，已启用兜底机制设为\"{fallback_category}\"")
            result = fallback_category
            
        return CategoryResponse(category=result)
        
    except OpenAIError as e:
        # 当 openai 请求硅基流动出现异常时（如限流/Key错误），通过 FastAPI 抛出规范的 500
        raise HTTPException(status_code=500, detail=f"底层大模型调用失败: {str(e)}")
    except Exception as e:
        # 其他未捕获的代码逻辑异常的通用处理
        raise HTTPException(status_code=500, detail="微服务内部发生意外处理错误。")
