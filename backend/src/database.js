/**
 * Database Module
 * Handles SQLite database operations for leaderboards
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database/leaderboard.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
function initDatabase() {
    // Create leaderboard table
    db.exec(`
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
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_legacies_count 
        ON leaderboard(legacies_count DESC, completion_time ASC)
    `);

    console.log('✓ Database initialized');
}

/**
 * Submit a score to the leaderboard
 */
function submitScore(data) {
    const stmt = db.prepare(`
        INSERT INTO leaderboard 
        (player_name, legacies_count, legacies_unlocked, total_choices, transcendent_choices, completion_time)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        data.playerName,
        data.legaciesCount,
        JSON.stringify(data.legaciesUnlocked),
        data.totalChoices,
        data.transcendentChoices,
        data.completionTime
    );

    return { id: result.lastInsertRowid };
}

/**
 * Get top scores from leaderboard
 */
function getTopScores(limit = 10) {
    const stmt = db.prepare(`
        SELECT 
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
        LIMIT ?
    `);

    const scores = stmt.all(limit);
    
    // Parse JSON strings back to arrays
    return scores.map(score => ({
        ...score,
        legaciesUnlocked: JSON.parse(score.legaciesUnlocked)
    }));
}

/**
 * Get player's rank
 */
function getPlayerRank(playerName) {
    const stmt = db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM leaderboard
        WHERE legacies_count > (
            SELECT MAX(legacies_count) 
            FROM leaderboard 
            WHERE player_name = ?
        )
    `);

    const result = stmt.get(playerName);
    return result ? result.rank : null;
}

/**
 * Get leaderboard statistics
 */
function getStats() {
    const stmt = db.prepare(`
        SELECT 
            COUNT(*) as totalPlayers,
            AVG(legacies_count) as avgLegacies,
            MAX(legacies_count) as maxLegacies,
            AVG(completion_time) as avgCompletionTime
        FROM leaderboard
    `);

    return stmt.get();
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

