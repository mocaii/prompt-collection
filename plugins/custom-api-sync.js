/**
 * 自定义API同步提供者
 * 
 * 配置要求：
 * - endpoint: API服务器地址
 * - apiKey: API密钥（可选）
 * - userId: 用户ID
 */
class CustomAPISyncProvider {
    constructor(config) {
        this.name = 'Custom API';
        this.endpoint = config.endpoint;
        this.apiKey = config.apiKey;
        this.userId = config.userId;
        
        if (!this.endpoint) {
            throw new Error('API endpoint 未配置');
        }
        
        if (!this.userId) {
            throw new Error('用户ID 未配置');
        }
    }

    async upload(prompts) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await fetch(`${this.endpoint}/api/sync`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    userId: this.userId,
                    prompts,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API错误 (${response.status}): ${error}`);
            }

            const result = await response.json();
            return {
                success: true,
                version: result.version,
                message: result.message
            };
        } catch (error) {
            console.error('自定义API同步上传失败:', error);
            throw new Error(`上传失败: ${error.message}`);
        }
    }

    async download() {
        try {
            const headers = {};
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await fetch(`${this.endpoint}/api/prompts/${this.userId}`, {
                headers
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return { prompts: [] };
                }
                const error = await response.text();
                throw new Error(`API错误 (${response.status}): ${error}`);
            }

            const data = await response.json();
            return {
                prompts: data.prompts || [],
                timestamp: data.updated_at,
                version: data.version
            };
        } catch (error) {
            console.error('自定义API同步下载失败:', error);
            throw new Error(`下载失败: ${error.message}`);
        }
    }

    // 测试连接
    async testConnection() {
        try {
            const headers = {};
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const response = await fetch(`${this.endpoint}/api/health`, {
                headers
            });

            if (response.ok) {
                return {
                    success: true,
                    message: '连接成功'
                };
            } else {
                return {
                    success: false,
                    error: `服务器响应错误: ${response.status}`
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `连接失败: ${error.message}`
            };
        }
    }
}

export default CustomAPISyncProvider;
