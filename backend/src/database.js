/**
 * Database Module
 * Handles SQLite database operations for leaderboards
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database/walden.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
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
 * Initialize database schema
 */
async function initDatabase() {
    try {
        // Create leaderboard table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                legacies_count INTEGER NOT NULL,
                legacies_unlocked TEXT NOT NULL,
                total_choices INTEGER NOT NULL,
                transcendent_choices INTEGER NOT NULL,
                completion_time INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create index for faster queries
        await dbRun(`
            CREATE INDEX IF NOT EXISTS idx_legacies_count 
            ON leaderboard(legacies_count DESC, completion_time ASC)
        `);

        console.log('✓ Database initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

/**
 * Submit a score to the leaderboard
 */
async function submitScore(data) {
    const result = await dbRun(
        `INSERT INTO leaderboard 
        (player_name, legacies_count, legacies_unlocked, total_choices, transcendent_choices, completion_time)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            data.playerName,
            data.legaciesCount,
            JSON.stringify(data.legaciesUnlocked),
            data.totalChoices,
            data.transcendentChoices,
            data.completionTime
        ]
    );

    return { id: result.lastID };
}

/**
 * Get top scores from leaderboard
 */
async function getTopScores(limit = 10) {
    const scores = await dbAll(
        `SELECT 
            id,
            player_name as playerName,
            legacies_count as legaciesCount,
            legacies_unlocked as legaciesUnlocked,
            total_choices as totalChoices,
            transcendent_choices as transcendentChoices,
            completion_time as completionTime,
            created_at as createdAt
        FROM leaderboard
        ORDER BY legacies_count DESC, completion_time ASC
        LIMIT ?`,
        [limit]
    );
    
    // Parse JSON strings back to arrays
    return scores.map(score => ({
        ...score,
        legaciesUnlocked: JSON.parse(score.legaciesUnlocked)
    }));
}

/**
 * Get player's rank
 */
async function getPlayerRank(playerName) {
    const result = await dbGet(
        `SELECT COUNT(*) + 1 as rank
        FROM leaderboard
        WHERE legacies_count > (
            SELECT MAX(legacies_count) 
            FROM leaderboard 
            WHERE player_name = ?
        )`,
        [playerName]
    );

    return result ? result.rank : null;
}

/**
 * Get leaderboard statistics
 */
async function getStats() {
    return await dbGet(
        `SELECT 
            COUNT(*) as totalPlayers,
            AVG(legacies_count) as avgLegacies,
            MAX(legacies_count) as maxLegacies,
            AVG(completion_time) as avgCompletionTime
        FROM leaderboard`
    );
}

// Initialize database on module load
initDatabase();

module.exports = {
    submitScore,
    getTopScores,
    getPlayerRank,
    getStats,
    db
};

