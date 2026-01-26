const Anthropic = require('@anthropic-ai/sdk');

// 更多可能的模型名称
const modelNames = [
    'claude-3-sonnet',
    'claude-sonnet',
    'claude-3-opus',
    'claude-opus',
    'claude-3-haiku',
    'claude-haiku',
    'sonnet',
    'opus',
    'haiku',
    'claude',
    'claude-2',
    'claude-instant',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-opus-20240229-v1:0',
];

async function testModel(modelName) {
    console.log(`\n尝试模型: ${modelName}`);

    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
        baseURL: 'https://adllm.top',  // 使用不带 /bedrock 的端点
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
        const errorMsg = error.message.length > 150 ? error.message.substring(0, 150) + '...' : error.message;
        console.log(`❌ 失败: ${errorMsg}`);
        return null;
    }
}

async function main() {
    console.log('开始测试可用的模型名称...');
    console.log('API Key:', process.env.ANTHROPIC_AUTH_TOKEN?.substring(0, 20) + '...');
    console.log('Base URL: https://adllm.top\n');

    for (const modelName of modelNames) {
        const success = await testModel(modelName);
        if (success) {
            console.log(`\n\n🎉 找到可用的模型: ${success}`);
            console.log(`\n请在 launch.json 中设置:`);
            console.log(`"ANTHROPIC_MODEL": "${success}"`);
            console.log(`"ANTHROPIC_BEDROCK_BASE_URL": "https://adllm.top"`);
            break;
        }

        // 短暂延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

main().catch(console.error);
