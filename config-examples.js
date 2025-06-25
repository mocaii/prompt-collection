/**
 * 同步配置示例
 * 
 * 将此文件复制为 config.js 并根据需要修改配置
 */

// GitHub Gist 同步配置示例
const githubSyncConfig = {
    token: 'ghp_your_github_personal_access_token_here',
    gistId: null // 留空会自动创建新的Gist
};

// 自定义API同步配置示例
const customAPISyncConfig = {
    endpoint: 'https://your-server.com', // 你的服务器地址
    apiKey: 'your-api-key-here', // 可选
    userId: 'your-user-id'
};

// 使用方法：
// 1. 将配置保存到localStorage
// localStorage.setItem('githubSyncConfig', JSON.stringify(githubSyncConfig));
// localStorage.setItem('customSyncConfig', JSON.stringify(customAPISyncConfig));

// 2. 或者通过控制台设置
// 打开浏览器控制台，执行以下代码：

/*
// 设置GitHub同步
localStorage.setItem('githubSyncConfig', JSON.stringify({
    token: 'your_github_token_here'
}));

// 设置自定义API同步
localStorage.setItem('custom-apiSyncConfig', JSON.stringify({
    endpoint: 'https://your-server.com',
    userId: 'your-user-id'
}));

// 刷新页面以加载配置
location.reload();
*/

// 配置完成后，同步按钮会自动显示在界面上
