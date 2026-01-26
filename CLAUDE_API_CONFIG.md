# Claude API 配置指南

## 当前遇到的问题

你正在使用 adllm.top 的 Bedrock 代理服务，但是遇到了 "Invalid model name" 错误。这是因为该服务使用自定义的模型名称格式。

## 解决方案

### 1. 查找正确的模型名称

请按以下步骤操作：

#### 方法 A：登录 adllm.top 平台
1. 访问 https://adllm.top
2. 登录你的账号
3. 查找以下信息：
   - 可用的模型列表
   - API 文档
   - 模型名称格式

#### 方法 B：联系客服
如果网站上找不到信息，请联系 adllm.top 的客服：
- 询问可用的 Claude 模型名称列表
- 询问正确的 API 调用格式
- 要求提供 API 文档

#### 方法 C：检查注册邮件
查看你注册 adllm.top 时收到的邮件，可能包含：
- API 使用文档
- 模型名称列表
- 配置示例

### 2. 配置正确的模型名称

一旦获得正确的模型名称，在 [.vscode/launch.json](.vscode/launch.json) 中更新配置：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-mqVMYuE47RtO9KSVAtkxHQ",
    "ANTHROPIC_BEDROCK_BASE_URL": "https://adllm.top",
    "ANTHROPIC_MODEL": "这里填写正确的模型名称"
  }
}
```

### 3. 常见的模型名称格式

不同服务可能使用以下格式之一：

**AWS Bedrock 标准格式：**
```
anthropic.claude-3-5-sonnet-20241022-v2:0
anthropic.claude-3-sonnet-20240229-v1:0
us.anthropic.claude-sonnet-4-5-20250929-v1:0
```

**简化格式：**
```
claude-3.5-sonnet
claude-3-sonnet
claude-sonnet
```

**自定义格式（需向服务商确认）：**
```
可能是任何自定义的名称
```

## 测试配置

配置完成后：

1. 重新编译项目：
```bash
npm run compile
```

2. 在 VSCode 中按 `F5` 启动调试

3. 打开 [test-performance.js](test-performance.js)

4. 运行命令：`Performance: Deep Analysis with Claude`

5. 查看 Debug Console 中的输出，你会看到：
```
Claude API 配置:
- Base URL: https://adllm.top
- Model: 你配置的模型名称
- API Key: sk-mqVMYuE47R...
```

## 备选方案：使用官方 Anthropic API

如果你有官方的 Anthropic API Key，可以直接使用官方 API：

1. 访问 https://console.anthropic.com/ 获取 API Key

2. 在 [.vscode/launch.json](.vscode/launch.json) 中配置：
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "你的官方API-Key",
    "ANTHROPIC_MODEL": "claude-3-5-sonnet-20241022"
    // 不设置 ANTHROPIC_BEDROCK_BASE_URL，使用默认官方 API
  }
}
```

## 调试信息

每次调用 Claude API 时，会在 Debug Console 中输出配置信息，帮助你诊断问题：

```
Claude API 配置:
- Base URL: https://adllm.top
- Model: claude-3-5-sonnet-20241022
- API Key: sk-mqVMYuE47R...
Claude API 调用失败: 400 {...}
```

如果看到 "Invalid model name" 错误，说明模型名称配置不正确，请参考上述步骤获取正确的名称。

## 需要帮助？

如果仍然无法解决问题：

1. 将 Debug Console 中的完整错误信息截图
2. 提供 adllm.top 文档中关于模型名称的说明
3. 在项目中创建 Issue 寻求帮助

---

**提示**：由于 adllm.top 是第三方代理服务，我们无法直接获取其模型列表。必须通过服务商提供的文档或客服支持来获取正确的配置信息。
