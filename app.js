// 数据管理
class PromptManager {
    constructor() {
        this.prompts = JSON.parse(localStorage.getItem('prompts')) || [];
    }

    // 获取所有提示词
    getAllPrompts() {
        return this.prompts;
    }

    // 添加新提示词
    addPrompt(title, content, category) {
        const now = new Date();
        const newPrompt = {
            id: Date.now().toString(),
            title,
            content,
            category,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            history: [
                {
                    content,
                    timestamp: now.toISOString(),
                    version: 1
                }
            ]
        };
        
        this.prompts.push(newPrompt);
        this._saveToLocalStorage();
        return newPrompt;
    }

    // 更新提示词
    updatePrompt(id, title, content, category) {
        const promptIndex = this.prompts.findIndex(p => p.id === id);
        if (promptIndex === -1) return null;
        
        const prompt = this.prompts[promptIndex];
        const now = new Date().toISOString();
        
        // 只有内容变化时才添加历史记录
        if (prompt.content !== content) {
            prompt.history.push({
                content,
                timestamp: now,
                version: prompt.history.length + 1
            });
        }
        
        prompt.title = title;
        prompt.content = content;
        prompt.category = category;
        prompt.updatedAt = now;
        
        this._saveToLocalStorage();
        return prompt;
    }

    // 删除提示词
    deletePrompt(id) {
        const initialLength = this.prompts.length;
        this.prompts = this.prompts.filter(p => p.id !== id);
        
        if (this.prompts.length !== initialLength) {
            this._saveToLocalStorage();
            return true;
        }
        return false;
    }

    // 获取单个提示词
    getPromptById(id) {
        return this.prompts.find(p => p.id === id);
    }

    // 批量更新提示词（用于同步）
    updateAllPrompts(prompts) {
        this.prompts = prompts;
        this._saveToLocalStorage();
    }

    // 保存到localStorage
    _saveToLocalStorage() {
        localStorage.setItem('prompts', JSON.stringify(this.prompts));
    }
}

// 同步管理器
class SyncManager {
    constructor() {
        this.providers = new Map();
        this.activeProvider = null;
        this.syncStatus = 'idle'; // idle, syncing, error
        this.lastSync = localStorage.getItem('lastSync');
    }

    // 注册同步提供者
    registerProvider(name, provider) {
        this.providers.set(name, provider);
        console.log(`同步提供者 "${name}" 已注册`);
    }

    // 设置活动的同步提供者
    setActiveProvider(name) {
        if (this.providers.has(name)) {
            this.activeProvider = this.providers.get(name);
            localStorage.setItem('activeSyncProvider', name);
            return true;
        }
        return false;
    }

    // 获取可用的同步提供者列表
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }

    // 同步到云端
    async syncUp(prompts) {
        if (!this.activeProvider) {
            throw new Error('未配置同步提供者');
        }

        this.syncStatus = 'syncing';
        try {
            const result = await this.activeProvider.upload(prompts);
            this.lastSync = new Date().toISOString();
            localStorage.setItem('lastSync', this.lastSync);
            this.syncStatus = 'idle';
            return result;
        } catch (error) {
            this.syncStatus = 'error';
            throw error;
        }
    }

    // 从云端同步
    async syncDown() {
        if (!this.activeProvider) {
            throw new Error('未配置同步提供者');
        }

        this.syncStatus = 'syncing';
        try {
            const result = await this.activeProvider.download();
            this.syncStatus = 'idle';
            return result;
        } catch (error) {
            this.syncStatus = 'error';
            throw error;
        }
    }

    // 获取同步状态
    getSyncStatus() {
        return {
            status: this.syncStatus,
            lastSync: this.lastSync,
            activeProvider: this.activeProvider ? this.activeProvider.name : null
        };
    }
}

// UI管理
class UIManager {
    constructor() {
        this.promptManager = new PromptManager();
        this.syncManager = new SyncManager();
        this.currentEditingId = null;
        this.searchQuery = '';
        this.selectedCategory = '';
        this.sortBy = 'updated-desc';
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        this.initTheme();
        this.initSync();
        this.bindEvents();
        this.renderPrompts();
        this.updateCategoryFilter();
        this.updateSyncUI();
    }

    // 初始化同步功能
    async initSync() {
        // 尝试加载已保存的同步提供者
        const savedProvider = localStorage.getItem('activeSyncProvider');
        if (savedProvider) {
            try {
                await this.loadSyncProvider(savedProvider);
            } catch (error) {
                console.log('加载同步提供者失败:', error.message);
            }
        }
    }

    // 动态加载同步提供者
    async loadSyncProvider(providerName) {
        try {
            const module = await import(`./plugins/${providerName}-sync.js`);
            const ProviderClass = module.default;
            
            // 获取配置
            const config = JSON.parse(localStorage.getItem(`${providerName}SyncConfig`) || '{}');
            
            if (Object.keys(config).length === 0) {
                throw new Error(`${providerName} 同步未配置`);
            }

            const provider = new ProviderClass(config);
            this.syncManager.registerProvider(providerName, provider);
            this.syncManager.setActiveProvider(providerName);
            
            console.log(`${providerName} 同步提供者加载成功`);
            return true;
        } catch (error) {
            console.log(`加载 ${providerName} 同步提供者失败:`, error.message);
            return false;
        }
    }

    // 更新同步相关UI
    updateSyncUI() {
        const syncStatus = this.syncManager.getSyncStatus();
        const syncButton = document.getElementById('sync-btn');
        const syncStatus元素 = document.getElementById('sync-status');

        if (syncButton) {
            syncButton.style.display = syncStatus.activeProvider ? 'inline-block' : 'none';
            
            if (syncStatus.status === 'syncing') {
                syncButton.textContent = '同步中...';
                syncButton.disabled = true;
            } else {
                syncButton.textContent = '云同步';
                syncButton.disabled = false;
            }
        }

        if (syncStatus元素) {
            if (syncStatus.lastSync) {
                const lastSyncDate = new Date(syncStatus.lastSync);
                syncStatus元素.textContent = `上次同步: ${this.formatDate(lastSyncDate)}`;
                syncStatus元素.style.display = 'block';
            } else {
                syncStatus元素.style.display = 'none';
            }
        }
    }

    // 初始化主题
    initTheme() {
        // 从localStorage获取保存的主题，如果没有则使用系统偏好
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        this.applyTheme(this.currentTheme);
        
        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(this.currentTheme);
            }
        });
    }

    // 应用主题
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
        this.currentTheme = theme;
    }

    // 更新主题图标
    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    // 切换主题
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        this.showToast(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`);
    }

    // 绑定事件
    bindEvents() {
        // 添加提示词按钮
        document.getElementById('add-prompt-btn').addEventListener('click', () => {
            this.openPromptModal();
        });

        // 主题切换按钮
        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 同步按钮
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.performSync();
            });
        }

        // 同步设置按钮
        const syncSettingsBtn = document.getElementById('sync-settings-btn');
        if (syncSettingsBtn) {
            syncSettingsBtn.addEventListener('click', () => {
                this.openSyncSettings();
            });
        }

        // 搜索输入框
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim();
            this.updateClearButton();
            this.renderPrompts();
        });

        // 清除搜索按钮
        document.getElementById('clear-search-btn').addEventListener('click', () => {
            this.clearSearch();
        });

        // 分类筛选
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.renderPrompts();
        });

        // 排序筛选
        document.getElementById('sort-filter').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.renderPrompts();
        });

        // 模态框关闭按钮
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // 提示词表单提交
        document.getElementById('prompt-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePrompt();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K 打开搜索
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('search-input').focus();
            }
            
            // Ctrl/Cmd + Shift + T 切换主题
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
            
            // Ctrl/Cmd + N 添加新提示词
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openPromptModal();
            }

            // Ctrl/Cmd + S 同步
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.performSync();
            }
        });
    }

    // 执行同步
    async performSync() {
        if (this.syncManager.syncStatus === 'syncing') {
            return;
        }

        try {
            this.updateSyncUI();
            
            // 先上传本地数据
            await this.syncManager.syncUp(this.promptManager.getAllPrompts());
            
            // 然后下载云端数据（如果有更新）
            const cloudData = await this.syncManager.syncDown();
            
            if (cloudData && cloudData.prompts) {
                // 简单的合并策略：云端数据优先
                this.promptManager.updateAllPrompts(cloudData.prompts);
                this.renderPrompts();
                this.updateCategoryFilter();
            }

            this.showToast('同步成功');
        } catch (error) {
            console.error('同步失败:', error);
            this.showToast('同步失败: ' + error.message, 'error');
        } finally {
            this.updateSyncUI();
        }
    }

    // 打开同步设置
    openSyncSettings() {
        // 这里可以打开一个设置模态框
        // 或者跳转到设置页面
        const providers = ['github', 'custom-api'];
        const message = `可用的同步方式:\n${providers.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n请查看文档了解如何配置同步功能。`;
        alert(message);
    }

    // 渲染提示词列表
    renderPrompts() {
        const container = document.getElementById('prompts-list');
        let prompts = this.promptManager.getAllPrompts();

        // 应用搜索和筛选
        const filteredPrompts = this.filterAndSortPrompts(prompts);

        // 显示搜索结果信息
        this.showSearchResultsInfo(filteredPrompts.length, prompts.length);

        if (filteredPrompts.length === 0) {
            if (prompts.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #666; margin-top: 50px;">暂无提示词，点击上方按钮添加第一个提示词吧！</p>';
            } else {
                container.innerHTML = '<p style="text-align: center; color: #666; margin-top: 50px;">没有找到匹配的提示词，请尝试其他搜索条件。</p>';
            }
            return;
        }

        container.innerHTML = filteredPrompts.map(prompt => this.createPromptCard(prompt)).join('');
    }

    // 筛选和排序提示词
    filterAndSortPrompts(prompts) {
        let filtered = [...prompts];

        // 应用搜索筛选
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(prompt => 
                prompt.title.toLowerCase().includes(query) ||
                prompt.content.toLowerCase().includes(query) ||
                (prompt.category && prompt.category.toLowerCase().includes(query))
            );
        }

        // 应用分类筛选
        if (this.selectedCategory) {
            filtered = filtered.filter(prompt => prompt.category === this.selectedCategory);
        }

        // 应用排序
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'updated-desc':
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                case 'updated-asc':
                    return new Date(a.updatedAt) - new Date(b.updatedAt);
                case 'created-desc':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'created-asc':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });

        return filtered;
    }

    // 显示搜索结果信息
    showSearchResultsInfo(filteredCount, totalCount) {
        // 移除现有的搜索结果信息
        const existingInfo = document.querySelector('.search-results-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        // 如果有搜索条件或筛选条件，显示结果信息
        if (this.searchQuery || this.selectedCategory) {
            const info = document.createElement('div');
            info.className = 'search-results-info';
            
            let message = `找到 ${filteredCount} 个提示词`;
            if (filteredCount !== totalCount) {
                message += ` (共 ${totalCount} 个)`;
            }
            
            if (this.searchQuery) {
                message += `，搜索关键词："${this.searchQuery}"`;
            }
            
            if (this.selectedCategory) {
                message += `，分类："${this.selectedCategory}"`;
            }
            
            info.textContent = message;
            
            const container = document.getElementById('prompts-list');
            container.parentNode.insertBefore(info, container);
        }
    }

    // 更新分类筛选器
    updateCategoryFilter() {
        const categoryFilter = document.getElementById('category-filter');
        const prompts = this.promptManager.getAllPrompts();
        
        // 获取所有唯一的分类
        const categories = [...new Set(prompts
            .map(prompt => prompt.category)
            .filter(category => category && category.trim())
        )].sort();

        // 清空现有选项（保留"所有分类"）
        categoryFilter.innerHTML = '<option value="">所有分类</option>';
        
        // 添加分类选项
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    // 清除搜索
    clearSearch() {
        document.getElementById('search-input').value = '';
        this.searchQuery = '';
        this.updateClearButton();
        this.renderPrompts();
    }

    // 更新清除按钮显示状态
    updateClearButton() {
        const clearBtn = document.getElementById('clear-search-btn');
        clearBtn.style.display = this.searchQuery ? 'flex' : 'none';
    }

    // 创建提示词卡片
    createPromptCard(prompt) {
        const categoryTag = prompt.category ? 
            `<span class="prompt-category">${this.escapeHtml(prompt.category)}</span>` : '';
        
        // 高亮搜索关键词
        let highlightedTitle = this.highlightSearchTerm(prompt.title);
        let highlightedContent = this.highlightSearchTerm(prompt.content);
        
        return `
            <div class="prompt-card">
                <div class="prompt-title">${highlightedTitle}</div>
                ${categoryTag}
                <div class="prompt-content">${highlightedContent}</div>
                <div class="prompt-actions">
                    <button class="copy-btn" onclick="uiManager.copyPrompt('${prompt.id}')">复制</button>
                    <button class="history-btn" onclick="uiManager.showHistory('${prompt.id}')">历史</button>
                    <button class="edit-btn" onclick="uiManager.editPrompt('${prompt.id}')">编辑</button>
                    <button class="delete-btn" onclick="uiManager.deletePrompt('${prompt.id}')">删除</button>
                </div>
            </div>
        `;
    }

    // 高亮搜索关键词
    highlightSearchTerm(text) {
        if (!this.searchQuery) {
            return this.escapeHtml(text);
        }

        const escapedText = this.escapeHtml(text);
        const escapedQuery = this.escapeHtml(this.searchQuery);
        const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        
        return escapedText.replace(regex, '<span class="highlight">$1</span>');
    }

    // 打开提示词模态框
    openPromptModal(promptId = null) {
        const modal = document.getElementById('prompt-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('prompt-form');
        
        this.currentEditingId = promptId;
        
        if (promptId) {
            // 编辑模式
            const prompt = this.promptManager.getPromptById(promptId);
            if (prompt) {
                title.textContent = '编辑提示词';
                document.getElementById('prompt-title').value = prompt.title;
                document.getElementById('prompt-content').value = prompt.content;
                document.getElementById('prompt-category').value = prompt.category || '';
            }
        } else {
            // 添加模式
            title.textContent = '添加新提示词';
            form.reset();
        }
        
        modal.style.display = 'block';
        document.getElementById('prompt-title').focus();
    }

    // 保存提示词
    savePrompt() {
        const title = document.getElementById('prompt-title').value.trim();
        const content = document.getElementById('prompt-content').value.trim();
        const category = document.getElementById('prompt-category').value.trim();

        if (!title || !content) {
            this.showToast('请填写标题和内容', 'error');
            return;
        }

        try {
            if (this.currentEditingId) {
                // 更新现有提示词
                this.promptManager.updatePrompt(this.currentEditingId, title, content, category);
                this.showToast('提示词更新成功');
            } else {
                // 添加新提示词
                this.promptManager.addPrompt(title, content, category);
                this.showToast('提示词添加成功');
            }

            this.closeModal(document.getElementById('prompt-modal'));
            this.renderPrompts();
            this.updateCategoryFilter(); // 更新分类筛选器
        } catch (error) {
            this.showToast('保存失败，请重试', 'error');
        }
    }

    // 复制提示词
    copyPrompt(id) {
        const prompt = this.promptManager.getPromptById(id);
        if (prompt) {
            navigator.clipboard.writeText(prompt.content).then(() => {
                this.showToast('内容已复制到剪贴板');
            }).catch(() => {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = prompt.content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showToast('内容已复制到剪贴板');
            });
        }
    }

    // 编辑提示词
    editPrompt(id) {
        this.openPromptModal(id);
    }

    // 删除提示词
    deletePrompt(id) {
        if (confirm('确定要删除这个提示词吗？此操作不可恢复。')) {
            if (this.promptManager.deletePrompt(id)) {
                this.showToast('提示词删除成功');
                this.renderPrompts();
                this.updateCategoryFilter(); // 更新分类筛选器
            } else {
                this.showToast('删除失败，请重试', 'error');
            }
        }
    }

    // 显示历史版本
    showHistory(id) {
        const prompt = this.promptManager.getPromptById(id);
        if (!prompt || !prompt.history) {
            this.showToast('没有找到历史记录', 'error');
            return;
        }

        const modal = document.getElementById('history-modal');
        const historyList = document.getElementById('history-list');
        
        // 按版本号倒序排列
        const sortedHistory = [...prompt.history].sort((a, b) => b.version - a.version);
        
        historyList.innerHTML = sortedHistory.map((item, index) => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-version">版本 ${item.version}</span>
                    <span class="history-timestamp">${this.formatDate(item.timestamp)}</span>
                </div>
                <div class="history-content">${this.escapeHtml(item.content)}</div>
                <div class="history-actions">
                    <button onclick="uiManager.copyHistoryContentByIndex('${id}', ${index})">复制此版本</button>
                </div>
            </div>
        `).join('');
        
        modal.style.display = 'block';
    }

    // 通过索引复制历史版本内容
    copyHistoryContentByIndex(promptId, historyIndex) {
        const prompt = this.promptManager.getPromptById(promptId);
        if (!prompt || !prompt.history) {
            this.showToast('没有找到历史记录', 'error');
            return;
        }

        // 按版本号倒序排列后获取对应的历史记录
        const sortedHistory = [...prompt.history].sort((a, b) => b.version - a.version);
        const historyItem = sortedHistory[historyIndex];
        
        if (!historyItem) {
            this.showToast('没有找到对应的历史版本', 'error');
            return;
        }

        navigator.clipboard.writeText(historyItem.content).then(() => {
            this.showToast('历史版本内容已复制到剪贴板');
        }).catch(() => {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = historyItem.content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('历史版本内容已复制到剪贴板');
        });
    }

    // 关闭模态框
    closeModal(modal) {
        modal.style.display = 'none';
        this.currentEditingId = null;
    }

    // 显示提示信息
    showToast(message, type = 'success') {
        // 移除现有的toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // 显示toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // 3秒后隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // HTML反转义
    unescapeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }
}

// 初始化应用
let uiManager;
document.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager();
});
