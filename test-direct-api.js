const Anthropic = require('@anthropic-ai/sdk');

async function testDirectAPI() {
    console.log('测试标准 Anthropic API...\n');

    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
        // 不设置 baseURL，使用默认的 Anthropic API
    });

    try {
        const message = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: '请简单回复"测试成功"',
                },
            ],
        });

        console.log('✅ 标准 Anthropic API 调用成功！');
        console.log('响应:', message.content[0].text);
    } catch (error) {
        console.log('❌ 标准 Anthropic API 失败:', error.message);
    }
}

async function testBedrockWithDifferentEndpoint() {
    console.log('\n\n测试 Bedrock API（不同的端点格式）...\n');

    // 尝试不带 /bedrock 后缀
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
        baseURL: 'https://adllm.top',
    });

    try {
        const message = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: '请简单回复"测试成功"',
                },
            ],
        });

        console.log('✅ Bedrock API (adllm.top) 调用成功！');
        console.log('响应:', message.content[0].text);
        return true;
    } catch (error) {
        console.log('❌ Bedrock API (adllm.top) 失败:', error.message);
        return false;
    }
}

async function main() {
    console.log('API Key:', process.env.ANTHROPIC_AUTH_TOKEN?.substring(0, 20) + '...\n');

    // 先测试标准 API
    await testDirectAPI();

    // 再测试不同的 Bedrock 端点
    await testBedrockWithDifferentEndpoint();
}

main().catch(console.error);
