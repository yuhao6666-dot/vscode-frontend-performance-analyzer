const Anthropic = require('@anthropic-ai/sdk');
// 要测试的模型名称列表
const modelNames = [
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'claude-3-5-sonnet-20241022',
    'claude-3.5-sonnet',
    'claude-sonnet-3.5',
    'anthropic.claude-v2',
    'us.anthropic.claude-sonnet-3-5-v2:0',
];

async function testModel(modelName) {
    console.log(`\n尝试模型: ${modelName}`);

    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
        baseURL: process.env.ANTHROPIC_BEDROCK_BASE_URL,
    });

    try {
        const message = await client.messages.create({
            model: modelName,
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: '请简单回复"测试成功"',
                },
            ],
        });

        console.log(`✅ 成功！模型 ${modelName} 可用`);
        console.log('响应:', message.content[0].text);
        return modelName;
    } catch (error) {
        console.log(`❌ 失败: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('开始测试可用的模型名称...');
    console.log('API Key:', process.env.ANTHROPIC_AUTH_TOKEN?.substring(0, 20) + '...');
    console.log('Base URL:', process.env.ANTHROPIC_BEDROCK_BASE_URL);

    for (const modelName of modelNames) {
        const success = await testModel(modelName);
        if (success) {
            console.log(`\n\n🎉 找到可用的模型: ${success}`);
            console.log(`请设置环境变量: export ANTHROPIC_MODEL="${success}"`);
            break;
        }
    }
}

main().catch(console.error);
