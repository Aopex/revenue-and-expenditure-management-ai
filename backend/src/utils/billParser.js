const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

/**
 * 解析微信账单文件（Excel格式）
 * @param {string} filePath - 微信账单文件路径
 * @returns {Array} 解析后的账单数据数组
 */
function parseWeChatBill(filePath) {
    // 读取Excel文件
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const bills = [];
    let headerFound = false;

    // 定义预期列及其索引
    const colMap = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!headerFound) {
            // "交易时间"是微信账单中的关键列
            const timeColIndex = row.indexOf('交易时间');
            if (timeColIndex !== -1) {
                headerFound = true;

                // 映射列索引
                row.forEach((col, index) => {
                    if (col === '交易时间') colMap.time = index;
                    if (col === '交易类型') colMap.type_desc = index;
                    if (col === '交易对方') colMap.counterparty = index;
                    if (col === '商品') colMap.product = index;
                    if (col === '收/支') colMap.direction = index;
                    if (col === '金额(元)') colMap.amount = index;
                    if (col === '备注') colMap.remark = index;
                });
            }
            continue;
        }

        // 处理数据行
        if (row.length === 0) continue; // 跳过空行

        const amountStr = row[colMap.amount];
        if (!amountStr) continue; // 跳过无效行（如汇总或页脚）

        // 解析金额：将"¥11.50"转换为11.50
        const amount = parseFloat(amountStr.replace('¥', '').trim());
        if (isNaN(amount)) continue;

        // 解析类型：将"支出"转换为"expense"，"收入"转换为"income"
        const direction = row[colMap.direction];
        if (direction !== '支出' && direction !== '收入') continue; // 跳过验证/中性交易
        const type = direction === '支出' ? 'expense' : 'income';

        // 解析日期
        let date = row[colMap.time];

        // 处理备注回退逻辑
        let remark = row[colMap.remark];
        if (!remark || remark === '/') {
            const typeDesc = row[colMap.type_desc] || '';
            const counterparty = row[colMap.counterparty] || '';
            remark = `${typeDesc} ${counterparty}`.trim();
        }

        const bill = {
            date: date,
            type: type,
            amount: amount,
            counterparty: row[colMap.counterparty],
            product: row[colMap.product],
            remark: remark,
            type_desc: row[colMap.type_desc], // 提取用于分类
            source: 'wechat'
        };

        bills.push(bill);
    }

    return bills;
}

/**
 * 解析支付宝账单文件（CSV格式）
 * @param {string} filePath - 支付宝账单文件路径
 * @returns {Array} 解析后的账单数据数组
 */
function parseAlipayCSV(filePath) {
    // 读取文件并使用GBK编码解码（支付宝通常使用GBK编码）
    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, 'gbk');
    const lines = content.split(/\r?\n/);

    const bills = [];
    let headerFound = false;
    const colMap = {};

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map(c => c.trim());

        if (!headerFound) {
            // 查找包含"交易时间"和"金额"的标题行
            if (line.includes('交易时间') && line.includes('金额')) {
                headerFound = true;
                cols.forEach((col, index) => {
                    col = col.trim();
                    if (col === '交易时间') colMap.time = index;
                    if (col === '交易分类') colMap.category = index; // 映射分类列
                    if (col === '收/支') colMap.direction = index;
                    if (col === '金额') colMap.amount = index;
                    if (col === '交易对方') colMap.counterparty = index;
                    if (col === '商品说明') colMap.product = index;
                    if (col === '备注') colMap.remark = index;
                });
            }
            continue;
        }
        // 数据处理
        if (colMap.time === undefined || colMap.amount === undefined) {
            // console.log('[Parser] 缺少列映射');
            continue;
        }

        const timeVal = cols[colMap.time];
        if (!timeVal) {
            continue;
        }

        const direction = cols[colMap.direction];
        if (direction !== '支出' && direction !== '收入') {
            continue;
        }

        const amountStr = cols[colMap.amount];
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
            continue;
        }
        const counterparty = cols[colMap.counterparty] || '';
        const product = cols[colMap.product] || '';
        const originalCategory = cols[colMap.category] || ''; // 提取分类

        const generatedRemark = `${counterparty} ${product}`.trim();

        const bill = {
            date: timeVal,
            type: direction === '支出' ? 'expense' : 'income',
            amount: amount,
            counterparty: counterparty,
            product: product,
            remark: generatedRemark,
            original_category: originalCategory, // 提取用于分类
            source: 'alipay'
        };

        bills.push(bill);
    }
    return bills;
}

/**
 * 根据文件扩展名解析账单文件
 * @param {string} filePath - 账单文件路径
 * @returns {Array} 解析后的账单数据数组
 * @throws {Error} 当文件格式不支持时抛出错误
 */
function parseBillFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
        // Excel格式文件，使用微信账单解析器
        return parseWeChatBill(filePath);
    } else if (ext === '.csv') {
        // CSV格式文件，使用支付宝账单解析器
        return parseAlipayCSV(filePath);
    } else {
        throw new Error('不支持的文件格式: ' + ext);
    }
}

module.exports = { parseBillFile };
