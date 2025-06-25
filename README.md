# 提示词收藏夹

一个简洁实用的提示词（Prompts）管理工具，帮助您收集、编辑和组织常用的AI提示词。

## 🚀 快速开始

直接打开 `index.html` 文件即可使用，无需任何配置。所有数据存储在本地浏览器中。

## 功能特点

### 📝 核心功能
- **提示词管理**：添加、编辑、删除提示词
- **历史版本**：自动保存编辑历史，支持版本回溯
- **一键复制**：快速复制提示词内容到剪贴板
- **全文搜索**：支持在标题、内容和分类中搜索关键词
- **智能筛选**：按分类筛选，多种排序方式
- **黑暗模式**：支持浅色/深色主题切换

### ☁️ 云同步功能（可选）

通过插件系统支持多种云同步方案：

#### 方案1：GitHub Gist同步
- ✅ 免费且稳定
- ✅ 支持版本控制
- ✅ 数据完全透明

#### 方案2：自建服务器同步
- ✅ 完全控制数据
- ✅ 支持MySQL数据库
- ✅ 提供完整的API服务

## 📁 项目结构

```
prompt-collection/
├── 📄 index.html              # 主页面
├── 📄 app.js                  # 核心应用逻辑
├── 📄 styles.css              # 样式文件
├── 📁 plugins/                # 同步插件
│   ├── github-sync.js         # GitHub Gist同步
│   └── custom-api-sync.js     # 自定义API同步
├── 📁 server-examples/        # 服务端示例
│   └── nodejs-mysql/          # Node.js + MySQL方案
├── 📁 docker/                 # Docker部署配置
└── 📄 config-examples.js      # 配置示例
```

## ⚙️ 配置云同步

### GitHub Gist同步配置

1. **创建GitHub Personal Access Token**
   - 访问 GitHub Settings > Developer settings > Personal access tokens
   - 创建新token，勾选 `gist` 权限

2. **配置同步**
   ```javascript
   // 在浏览器控制台执行
   localStorage.setItem('githubSyncConfig', JSON.stringify({
       token: 'your_github_token_here'
   }));
   location.reload(); // 刷新页面
   ```

### 自建服务器同步配置

1. **部署服务器**
   ```bash
   cd server-examples/nodejs-mysql
   npm install
   npm start
   ```

2. **配置数据库**
   - 创建MySQL数据库
   - 修改 `server.js` 中的数据库配置

3. **配置客户端**
   ```javascript
   localStorage.setItem('custom-apiSyncConfig', JSON.stringify({
       endpoint: 'https://your-server.com',
       userId: 'your-user-id'
   }));
   location.reload();
   ```

## 🐳 Docker一键部署

```bash
cd docker
docker-compose up -d
```

这将启动：
- MySQL数据库
- Node.js API服务
- Nginx反向代理

## 🎯 使用方法

### 基础使用
1. 打开 `index.html` 开始使用
2. 点击"添加新提示词"创建提示词
3. 使用搜索框快速查找内容
4. 点击主题切换按钮切换深色模式

### 云同步使用
1. 按照上述方法配置同步
2. 配置完成后会显示云同步按钮
3. 点击同步按钮进行数据同步
4. 支持多设备间数据同步

## ⌨️ 键盘快捷键

- `Ctrl/Cmd + K`：聚焦搜索框
- `Ctrl/Cmd + N`：添加新提示词
- `Ctrl/Cmd + S`：云同步（需配置）
- `Ctrl/Cmd + Shift + T`：切换主题模式

## 🔧 开发者指南

### 创建自定义同步插件

```javascript
class CustomSyncProvider {
    constructor(config) {
        this.name = 'My Custom Sync';
        // 初始化配置
    }

    async upload(prompts) {
        // 上传逻辑
        return { success: true };
    }

    async download() {
        // 下载逻辑
        return { prompts: [] };
    }
}

export default CustomSyncProvider;
```

### 注册插件

```javascript
// 在app.js中
const provider = new CustomSyncProvider(config);
syncManager.registerProvider('custom', provider);
syncManager.setActiveProvider('custom');
```

## 🛡️ 数据安全

- **本地优先**：核心功能完全本地化，无需网络
- **可选同步**：云同步功能完全可选
- **用户控制**：所有同步配置由用户控制
- **开源透明**：代码完全开源，可审计

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📞 支持

如有问题，请：
1. 查看 [配置示例](config-examples.js)
2. 提交 [Issue](https://github.com/your-repo/issues)
3. 查看 [Wiki](https://github.com/your-repo/wiki)
