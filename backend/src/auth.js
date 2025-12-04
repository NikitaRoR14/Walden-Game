/**
 * Authentication Module
 * Handles user registration, login, and JWT tokens
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
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

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

/**
 * Initialize authentication tables
 */
function initAuthTables() {
    // Users table
    db.exec(`
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
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_nickname ON users(nickname);
    `);

    console.log('✓ Authentication tables initialized');
}

/**
 * Register a new user
 */
async function registerUser(email, password, nickname, avatar) {
    try {
        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const stmt = db.prepare(`
            INSERT INTO users (email, password_hash, nickname, avatar)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(email.toLowerCase(), passwordHash, nickname, avatar);

        return {
            id: result.lastInsertRowid,
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
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email.toLowerCase());

    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
        throw new Error('Invalid email or password');
    }

    // Update last login
    const updateStmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
    updateStmt.run(user.id);

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
function getUserById(userId) {
    const stmt = db.prepare(`
        SELECT id, email, nickname, avatar, created_at, last_login
        FROM users
        WHERE id = ?
    `);
    return stmt.get(userId);
}

/**
 * Check if email exists
 */
function emailExists(email) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
    const result = stmt.get(email.toLowerCase());
    return result.count > 0;
}

/**
 * Check if nickname exists
 */
function nicknameExists(nickname) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE nickname = ?');
    const result = stmt.get(nickname);
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
    db
};

