const http = require('http');

/**
 * 通用 HTTP 请求封装函数
 * @param {string} path 请求路径 (例如 /api/bills)
 * @param {string} method 请求方法 (GET, POST, PUT, DELETE)
 * @param {object} data 请求体数据 (仅 POST/PUT 需要)
 * @param {string} token JWT 令牌
 * @returns {Promise<object>} 返回包含 status 和 body 的响应对象
 */
function request(path, method, data, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * 主测试流程
 */
async function runTests() {
    console.log('🚀 开始 API 接口自动化测试...\n');

    let token = null;
    let createdBillId = null;
    const testUser = { username: 'testuser_' + Date.now(), password: 'password123' };

    // ==========================================
    // 0. 测试注册与登录 (Auth)
    // ==========================================
    console.log('--- 0. 测试注册与登录 (Auth) ---');
    try {
        const regRes = await request('/api/auth/register', 'POST', testUser);
        console.log(`[POST /register] 状态码: ${regRes.status}`);

        const loginRes = await request('/api/auth/login', 'POST', testUser);
        console.log(`[POST /login] 状态码: ${loginRes.status}`);
        if (loginRes.status === 200) {
            token = loginRes.body.token;
            console.log('✅ 登录成功，获取到 Token');
        } else {
            console.error('❌ 登录失败:', loginRes.body);
            return;
        }
    } catch (err) { console.error(err); return; }

    // ==========================================
    // 1. 测试创建账单 (POST /api/bills)
    // ==========================================
    console.log('\n--- 1. 测试创建账单 (Create) ---');
    const billData = {
        type: 'expense',
        amount: 128.5,
        category_id: 4, // 假设 ID 4 是餐饮
        date: '2023-12-18',
        remark: '团队聚餐测试'
    };

    try {
        const createRes = await request('/api/bills', 'POST', billData, token);
        console.log(`[POST] 状态码: ${createRes.status}`);
        if (createRes.status === 201) {
            console.log('✅ 创建成功，返回数据:', createRes.body);
            createdBillId = createRes.body.id;
        } else {
            console.error('❌ 创建失败:', createRes.body);
            return;
        }
    } catch (err) { console.error('❌ 请求异常:', err); }

    // ==========================================
    // 2. 测试获取账单列表 (GET /api/bills)
    // ==========================================
    console.log('\n--- 2. 测试获取账单列表 (Read & Pagination) ---');
    try {
        const getRes = await request('/api/bills?page=1&limit=5', 'GET', null, token);
        console.log(`[GET] 状态码: ${getRes.status}`);
        if (getRes.status === 200) {
            console.log(`✅ 获取成功，当前页数据条数: ${getRes.body.data.length}`);
            console.log(`   分页信息: 总条数 ${getRes.body.pagination.total}, 总页数 ${getRes.body.pagination.totalPages}`);
        } else {
            console.error('❌ 获取列表失败:', getRes.body);
        }
    } catch (err) { console.error(err); }

    // ==========================================
    // 3. 测试筛选功能 (GET /api/bills?type=expense)
    // ==========================================
    console.log('\n--- 3. 测试筛选功能 (Filter) ---');
    try {
        const filterRes = await request('/api/bills?type=expense&limit=2', 'GET', null, token);
        console.log(`[GET] 筛选 'expense' 状态码: ${filterRes.status}`);
        const isAllExpense = filterRes.body.data.every(item => item.type === 'expense');
        if (isAllExpense) {
            console.log('✅ 筛选验证通过: 返回的所有数据均为 expense 类型');
        } else {
            console.error('❌ 筛选验证失败: 返回数据包含其他类型');
        }
    } catch (err) { console.error(err); }

    // ==========================================
    // 4. 测试更新账单 (PUT /api/bills/:id)
    // ==========================================
    console.log('\n--- 4. 测试更新账单 (Update) ---');
    if (createdBillId) {
        const updateData = {
            ...billData,
            amount: 999.9,
            remark: '团队聚餐 (已修改)'
        };
        try {
            const updateRes = await request(`/api/bills/${createdBillId}`, 'PUT', updateData, token);
            console.log(`[PUT] 状态码: ${updateRes.status}`);
            if (updateRes.status === 200) {
                console.log('✅ 更新成功:', updateRes.body);
            } else {
                console.error('❌ 更新失败:', updateRes.body);
            }
        } catch (err) { console.error(err); }
    }

    // ==========================================
    // 5. 测试删除账单 (DELETE /api/bills/:id)
    // ==========================================
    console.log('\n--- 5. 测试删除账单 (Delete) ---');
    if (createdBillId) {
        try {
            const deleteRes = await request(`/api/bills/${createdBillId}`, 'DELETE', null, token);
            console.log(`[DELETE] 状态码: ${deleteRes.status}`);
            if (deleteRes.status === 200) {
                console.log('✅ 删除成功:', deleteRes.body);
            } else {
                console.error('❌ 删除失败:', deleteRes.body);
            }

            const checkRes = await request(`/api/bills?page=1&limit=10`, 'GET', null, token);
            const found = checkRes.body.data.find(b => b.id === createdBillId);
            if (!found) {
                console.log('✅ 二次验证通过: 列表中已找不到该 ID');
            } else {
                console.error('❌ 二次验证失败: 数据仍然存在');
            }
        } catch (err) { console.error(err); }
    }

    // ==========================================
    // 6. 测试统计接口 (Stats)
    // ==========================================
    console.log('\n--- 6. 测试统计接口 (Stats) ---');
    try {
        const monthlyRes = await request('/api/stats/monthly', 'GET', null, token);
        console.log(`[GET /stats/monthly] 状态码: ${monthlyRes.status}`);
        if (monthlyRes.status === 200) console.log('✅ 月度统计获取成功:', monthlyRes.body);

        const trendRes = await request('/api/stats/trend', 'GET', null, token);
        console.log(`[GET /stats/trend] 状态码: ${trendRes.status}`);
        if (trendRes.status === 200) console.log('✅ 趋势数据获取成功:', trendRes.body);

        const ratioRes = await request('/api/stats/category-ratio', 'GET', null, token);
        console.log(`[GET /stats/category-ratio] 状态码: ${ratioRes.status}`);
        if (ratioRes.status === 200) console.log('✅ 分类占比获取成功:', ratioRes.body);
    } catch (err) { console.error(err); }

    console.log('\n🎉 测试结束');
}

runTests();
