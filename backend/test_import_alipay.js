const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
// Use fixed test username as requested
const TEST_USER = {
    username: 'test_user_alipay',
    password: 'password123'
};

async function runAlipayImportTest() {
    try {
        console.log('--- 开始支付宝账单导入测试 ---');

        // 1. 注册/登录
        let token;
        try {
            await axios.post(`${API_URL}/auth/register`, TEST_USER);
            console.log('✅ 用户注册成功');
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log('ℹ️ 用户已存在，尝试直接登录');
            } else {
                console.log('⚠️ 注册时发生警告:', e.message);
            }
        }

        const loginRes = await axios.post(`${API_URL}/auth/login`, TEST_USER);
        token = loginRes.data.token;
        console.log('✅ 登录成功');

        // 2. 上传支付宝 CSV
        const filePath = path.join(__dirname, 'example/支付宝交易明细(20251120-20251220).csv');
        if (!fs.existsSync(filePath)) {
            console.error('❌ 示例文件不存在:', filePath);
            return;
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        console.log('🚀 正在上传支付宝账单...');
        const uploadRes = await axios.post(`${API_URL}/bills/import`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📊 导入结果:', uploadRes.data);

        // Deduplication Verification
        console.log('🚀 再次上传同一文件（验证自动去重）...');
        const form2 = new FormData();
        form2.append('file', fs.createReadStream(filePath));

        const uploadRes2 = await axios.post(`${API_URL}/bills/import`, form2, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('📊 二次导入结果 (应全为重复):', uploadRes2.data);

    } catch (error) {
        if (error.response) {
            console.error('❌ 请求失败:', error.response.data);
        } else {
            console.error('❌ 请求异常:', error.message);
        }
    }
}

runAlipayImportTest();
