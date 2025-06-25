/**
 * GitHub Gist 同步提供者
 * 
 * 配置要求：
 * - token: GitHub Personal Access Token
 * - gistId: (可选) 现有Gist ID，如果不提供会创建新的
 */
class GitHubSyncProvider {
    constructor(config) {
        this.name = 'GitHub Gist';
        this.token = config.token;
        this.gistId = config.gistId || null;
        this.apiBase = 'https://api.github.com';
        
        if (!this.token) {
            throw new Error('GitHub token 未配置');
        }
    }

    async upload(prompts) {
        const gistData = {
            description: '提示词收藏夹数据备份',
            public: false,
            files: {
                'prompts-backup.json': {
                    content: JSON.stringify({
                        prompts,
                        timestamp: new Date().toISOString(),
                        version: '1.0'
                    }, null, 2)
                }
            }
        };

        try {
            let response;
            if (this.gistId) {
                // 更新现有Gist
                response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(gistData)
                });
            } else {
                // 创建新Gist
                response = await fetch(`${this.apiBase}/gists`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(gistData)
                });
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`GitHub API错误: ${error.message || response.statusText}`);
            }

            const result = await response.json();
            
            // 保存Gist ID以便后续更新
            if (!this.gistId) {
                this.gistId = result.id;
                const config = JSON.parse(localStorage.getItem('githubSyncConfig') || '{}');
                config.gistId = this.gistId;
                localStorage.setItem('githubSyncConfig', JSON.stringify(config));
            }

            return {
                success: true,
                gistId: result.id,
                url: result.html_url,
                updatedAt: result.updated_at
            };
        } catch (error) {
            console.error('GitHub同步上传失败:', error);
            throw new Error(`上传失败: ${error.message}`);
        }
    }

    async download() {
        if (!this.gistId) {
            return { prompts: [] };
        }

        try {
            const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return { prompts: [] };
                }
                const error = await response.json();
                throw new Error(`GitHub API错误: ${error.message || response.statusText}`);
            }

            const gist = await response.json();
            const file = gist.files['prompts-backup.json'];
            
            if (!file) {
                return { prompts: [] };
            }

            const data = JSON.parse(file.content);
            return {
                prompts: data.prompts || [],
                timestamp: data.timestamp,
                version: data.version
            };
        } catch (error) {
            console.error('GitHub同步下载失败:', error);
            throw new Error(`下载失败: ${error.message}`);
        }
    }

    // 测试连接
    async testConnection() {
        try {
            const response = await fetch(`${this.apiBase}/user`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const user = await response.json();
                return {
                    success: true,
                    user: user.login
                };
            } else {
                return {
                    success: false,
                    error: 'Token无效或权限不足'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default GitHubSyncProvider;
