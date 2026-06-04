const fs = require('fs');

// 自动从 GitHub Secrets 中读取安全凭证，无需在代码里硬编码
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

// ➡️ 【配置项 1】：请把下面替换为你飞书多维表格的真实链接信息
const APP_TOKEN = 'ISZHbCkltaEblqsNk9QcPsalnGb';  // 多维表格 URL 中 app/ 后面的一串字符
const TABLE_ID = 'tbl0w6aUs4cCjyJJ';    // 多维表格 URL 中 table/ 后面的一串字符

async function getFeishuData() {
    try {
        console.log('正在获取飞书访问令牌...');
        // 1. 获取飞书自建应用的 Tenant Access Token
        const tokenUrl = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ "app_id": APP_ID, "app_secret": APP_SECRET })
        });
        const tokenData = await tokenRes.json();
        const tenantToken = tokenData.tenant_access_token;

        if (!tenantToken) {
            throw new Error("未能获取到 tenant_access_token，请检查 GitHub Secrets 中的 App ID 和 Secret 是否正确。");
        }

        console.log('正在请求多维表格数据...');
        // 2. 调用多维表格「列出记录」API
        const recordsUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?page_size=100`;
        const recordsRes = await fetch(recordsUrl, {
            headers: { 'Authorization': `Bearer ${tenantToken}` }
        });
        const recordsData = await recordsRes.json();
        
        if (recordsData.code !== 0) {
            throw new Error(`飞书 API 报错: ${recordsData.msg}`);
        }

        // 3. 解析并清洗数据
        // ➡️ 【配置项 2】：请把下方的 '分类名称', '标准超耗率', '实际超耗率' 替换为你多维表格中列的真实文本名称
        const formattedData = recordsData.data.items.map(item => {
            const fields = item.fields;
            return {
                category: fields['分类名称'] || '未知',
                standard: parseFloat(fields['标准超耗率'] || 0),
                actual: parseFloat(fields['实际超耗率'] || 0)
            };
        });

        // 4. 将清洗后的数据保存为仓库本地的 data.json
        fs.writeFileSync('./data.json', JSON.stringify({ data: formattedData }, null, 2));
        console.log(`数据同步成功！已成功写入 ${formattedData.length} 条分类数据至 data.json。`);

    } catch (error) {
        console.error('❌ 同步任务失败:', error.message);
        process.exit(1); // 失败时终止退出，通知 GitHub Actions 报错
    }
}

getFeishuData();