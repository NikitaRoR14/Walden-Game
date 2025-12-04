/**
 * Authentication Module
 * Handles user registration, login, and JWT tokens
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database/walden.db');
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database with promisify wrapper
const db = new sqlite3.Database(DB_PATH);

// Helper to promisify database operations
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

/**
 * Initialize authentication tables
 */
async function initAuthTables() {
    try {
        // Users table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                nickname TEXT UNIQUE NOT NULL,
                avatar TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);

        // Create indices
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_email ON users(email)`);
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_nickname ON users(nickname)`);

        console.log('✓ Authentication tables initialized');
    } catch (error) {
        console.error('Error initializing auth tables:', error);
    }
}

/**
 * Register a new user
 */
async function registerUser(email, password, nickname, avatar) {
    try {
        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const result = await dbRun(
            `INSERT INTO users (email, password_hash, nickname, avatar) VALUES (?, ?, ?, ?)`,
            [email.toLowerCase(), passwordHash, nickname, avatar]
        );

        return {
            id: result.lastID,
            email: email.toLowerCase(),
            nickname,
            avatar
        };
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed: users.email')) {
            throw new Error('Email already registered');
        }
        if (error.message.includes('UNIQUE constraint failed: users.nickname')) {
            throw new Error('Nickname already taken');
        }
        throw error;
    }
}

/**
 * Login user
 */
async function loginUser(email, password) {
    // Get user
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);

    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
        throw new Error('Invalid email or password');
    }

    // Update last login
    await dbRun('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Generate JWT token
    const token = jwt.sign(
        { 
            id: user.id, 
            email: user.email,
            nickname: user.nickname,
            avatar: user.avatar
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            avatar: user.avatar
        }
    };
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
    return await dbGet(
        `SELECT id, email, nickname, avatar, created_at, last_login FROM users WHERE id = ?`,
        [userId]
    );
}

/**
 * Check if email exists
 */
async function emailExists(email) {
    const result = await dbGet('SELECT COUNT(*) as count FROM users WHERE email = ?', [email.toLowerCase()]);
    return result.count > 0;
}

/**
 * Check if nickname exists
 */
async function nicknameExists(nickname) {
    const result = await dbGet('SELECT COUNT(*) as count FROM users WHERE nickname = ?', [nickname]);
    return result.count > 0;
}

/**
 * Middleware to verify JWT token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const user = verifyToken(token);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// Initialize tables on module load
initAuthTables();

module.exports = {
    registerUser,
    loginUser,
    verifyToken,
    getUserById,
    emailExists,
    nicknameExists,
    authenticateToken,
    db,
    dbRun,
    dbGet,
    dbAll
};

