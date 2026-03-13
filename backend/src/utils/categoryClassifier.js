const categoryClassifier = {
    /**
     * 从数据库加载所有分类并返回快速查找映射
     * 返回: {
     *   income: { 'name': id, ... },
     *   expense: { 'name': id, ... }
     * }
     */
    loadCategories: async (db) => {
        return new Promise((resolve, reject) => {
            // 查询所有分类数据
            db.all("SELECT id, name, type FROM categories", (err, rows) => {
                if (err) reject(err);
                else {
                    // 构建收入支出分类映射
                    const map = { income: {}, expense: {} };
                    rows.forEach(row => {
                        if (map[row.type]) {
                            map[row.type][row.name] = row.id;
                        }
                    });
                    resolve(map);
                }
            });
        });
    },

    /**
     * 对单个账单进行分类
     * @param {Object} bill - 解析后的账单对象
     * @param {Object} categoryMap - loadCategories返回的分类映射
     * @returns {Integer|null} 分类ID，未匹配到时返回null
     */
    classifyBill: (bill, categoryMap) => {
        // 解构账单数据
        const { source, type, original_category, type_desc, counterparty, product } = bill;
        const typeMap = categoryMap[type] || {};

        // 1. 支付宝分类（显式映射）
        if (source === 'alipay' && original_category) {
            // 支付宝标准分类到我们数据库分类的映射
            const mapping = {
                // 支出分类
                '餐饮美食': '餐饮美食',
                '服饰装扮': '服饰装扮',
                '日用百货': '日用百货',
                '家居家装': '家居家装',
                '数码电器': '数码电器',
                '运动户外': '休闲娱乐',
                '美容美发': '生活服务',
                '母婴亲子': '日用百货',
                '宠物': '生活服务',
                '交通出行': '交通出行',
                '爱车养车': '交通出行',
                '住房物业': '住房物业',
                '酒店旅游': '休闲娱乐',
                '文化休闲': '休闲娱乐',
                '教育培训': '医疗教育',
                '医疗健康': '医疗教育',
                '生活服务': '生活服务',
                '公共服务': '生活服务',
                '商业服务': '生活服务',
                '公益捐赠': '公益捐赠',
                '互助保障': '商业保险',
                '投资理财': '金融信贷', // 支出端
                '保险': '商业保险',
                '信用借还': '金融信贷',
                '充值缴费': '充值缴费',
                '转账红包': '红包转账',
                '亲友代付': '红包转账',
                '账户存取': '金融信贷',
                '其他': '其他支出',

                // 收入分类
                '收入': '其他收入',
                '退款': '退款售后'
            };

            const targetName = mapping[original_category];
            if (targetName && typeMap[targetName]) {
                return typeMap[targetName];
            }

            // 回退：如果存在精确名称匹配（如收入中的'投资理财'），则使用它
            if (typeMap[original_category]) {
                return typeMap[original_category];
            }
        }

        // 2. 微信分类（关键词匹配）
        if (source === 'wechat') {
            // 合并交易描述、交易对方和商品信息用于关键词匹配
            const combinedText = `${type_desc || ''} ${counterparty || ''} ${product || ''}`;

            // "红包转账"规则
            if (combinedText.includes('微信红包') || combinedText.includes('转账')) {
                return typeMap['红包转账'] || null;
            }

            // "餐饮美食"规则
            if (/餐饮|美食|饿了么|美团|麦当劳|肯德基|星巴克|蜜雪冰城|瑞幸|喜茶|茶百道/.test(combinedText)) {
                return typeMap['餐饮美食'] || null;
            }

            // "交通出行"规则
            if (/出行|打车|滴滴|铁路|火车|地铁|高德|T3|曹操|哈啰/.test(combinedText)) {
                return typeMap['交通出行'] || null;
            }

            // "日用百货"规则
            if (/超市|便利店|7-11|全家|罗森|百货|得物|淘宝|京东|天猫/.test(combinedText)) {
                return typeMap['日用百货'] || null;
            }

            // "充值缴费"规则
            if (/充值|缴费|电费|水费|燃气/.test(combinedText)) {
                return typeMap['充值缴费'] || null;
            }
        }

        // 3. 回退处理（其他）
        // 如果没有找到匹配，尝试返回'其他支出'或'其他收入'
        if (type === 'expense') {
            return typeMap['其他支出'] || typeMap['其他'] || null;
        } else if (type === 'income') {
            return typeMap['其他收入'] || typeMap['其他'] || null;
        }

        return null;
    }
};

module.exports = categoryClassifier;
