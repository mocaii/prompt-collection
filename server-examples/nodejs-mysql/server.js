const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 配置（生产环境请使用环境变量）
const config = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'prompts_db',
        charset: 'utf8mb4'
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: '30d'
    },
    port: process.env.PORT || 3000
};

// 创建数据库连接池
const pool = mysql.createPool(config.db);

// 初始化数据库表
async function initDatabase() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS user_prompts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                prompts_data JSON NOT NULL,
                version INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_updated_at (updated_at)
            )
        `);

        console.log('数据库表初始化完成');
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
}

// JWT认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '需要认证token' });
    }

    jwt.verify(token, config.jwt.secret, (err, user) => {
        if (err) return res.status(403).json({ error: 'token无效' });
        req.user = user;
        next();
    });
};

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 用户认证（简化版）
app.post('/api/auth/login', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: '用户ID不能为空' });
        }

        // 检查用户是否存在，不存在则创建
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE user_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            await pool.execute(
                'INSERT INTO users (user_id) VALUES (?)',
                [userId]
            );
        }

        // 生成JWT token
        const token = jwt.sign({ userId }, config.jwt.secret, { 
            expiresIn: config.jwt.expiresIn 
        });
        
        res.json({ token, userId });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

// 同步提示词数据
app.post('/api/sync', authenticateToken, async (req, res) => {
    try {
        const { prompts } = req.body;
        const userId = req.user.userId;

        if (!Array.isArray(prompts)) {
            return res.status(400).json({ error: '提示词数据格式错误' });
        }

        // 获取当前版本号
        const [versionRows] = await pool.execute(
            'SELECT version FROM user_prompts WHERE user_id = ? ORDER BY version DESC LIMIT 1',
            [userId]
        );

        const newVersion = versionRows.length > 0 ? versionRows[0].version + 1 : 1;

        // 插入新版本的数据
        await pool.execute(
            'INSERT INTO user_prompts (user_id, prompts_data, version) VALUES (?, ?, ?)',
            [userId, JSON.stringify(prompts), newVersion]
        );

        res.json({ 
            success: true, 
            version: newVersion,
            message: `成功同步 ${prompts.length} 个提示词`
        });

    } catch (error) {
        console.error('同步错误:', error);
        res.status(500).json({ error: '同步失败' });
    }
});

// 获取提示词数据
app.get('/api/prompts/:userId', authenticateToken, (req, res) => {
    // 验证用户权限
    if (req.user.userId !== req.params.userId) {
        return res.status(403).json({ error: '无权访问此用户数据' });
    }

    pool.execute(
        'SELECT prompts_data, version, updated_at FROM user_prompts WHERE user_id = ? ORDER BY version DESC LIMIT 1',
        [req.params.userId]
    ).then(([rows]) => {
        if (rows.length === 0) {
            return res.json({ 
                prompts: [], 
                version: 0, 
                updated_at: null 
            });
        }

        const data = rows[0];
        res.json({
            prompts: JSON.parse(data.prompts_data),
            version: data.version,
            updated_at: data.updated_at
        });
    }).catch(error => {
        console.error('获取数据错误:', error);
        res.status(500).json({ error: '获取数据失败' });
    });
});

// 获取同步历史
app.get('/api/sync/history', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    pool.execute(
        'SELECT version, updated_at FROM user_prompts WHERE user_id = ? ORDER BY version DESC LIMIT 10',
        [userId]
    ).then(([rows]) => {
        res.json(rows);
    }).catch(error => {
        console.error('获取历史错误:', error);
        res.status(500).json({ error: '获取历史失败' });
    });
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
async function startServer() {
    await initDatabase();
    
    app.listen(config.port, () => {
        console.log(`服务器运行在端口 ${config.port}`);
        console.log(`健康检查: http://localhost:${config.port}/api/health`);
    });
}

startServer().catch(console.error);
