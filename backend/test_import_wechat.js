const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
// Use fixed test username as requested
const TEST_USER = {
    username: 'test_user_wechat',
    password: 'password123'
};

/**
 * 运行账单导入测试流程
 */
async function runImportTest() {
    try {
        console.log('--- 开始账单导入功能测试 (WeChat) ---');

        // 1. 用户注册与登录
        let token;
        try {
            await axios.post(`${API_URL}/auth/register`, TEST_USER);
            console.log('✅ 用户注册成功');
        } catch (e) {
            // 如果用户已存在，则忽略错误
            if (e.response && e.response.status === 400) {
                console.log('ℹ️ 用户已存在，尝试直接登录');
            } else {
                console.log('⚠️ 注册时发生警告:', e.message);
            }
        }

        const loginRes = await axios.post(`${API_URL}/auth/login`, TEST_USER);
        token = loginRes.data.token;
        console.log('✅ 登录成功，已获取 Token');

        // 2. 上传并导入微信账单文件
        const filePath = path.join(__dirname, 'example/微信支付账单流水文件(20251213-20251220)_20251220161627.xlsx');
        if (!fs.existsSync(filePath)) {
            console.error('❌ 示例文件不存在:', filePath);
            return;
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        console.log('🚀 正在上传文件并解析...');
        const uploadRes = await axios.post(`${API_URL}/bills/import`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📊 导入结果:', uploadRes.data);

        // 3. 再次上传同一文件（测试去重逻辑）
        console.log('🚀 再次上传同一文件（验证自动去重）...');
        // 重新读取流，因为之前的流可能已关闭
        const form2 = new FormData();
        form2.append('file', fs.createReadStream(filePath));

        const uploadRes2 = await axios.post(`${API_URL}/bills/import`, form2, {
            headers: {
                ...form2.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('📊 二次导入结果 (应全为重复):', uploadRes2.data);

        console.log('\n✨ 测试完成');

    } catch (error) {
        if (error.response) {
            console.error('❌ 请求失败 (状态码):', error.response.status);
            console.error('❌ 错误信息:', error.response.data);
        } else {
            console.error('❌ 请求异常:', error.message);
        }
    }
}

runImportTest();
