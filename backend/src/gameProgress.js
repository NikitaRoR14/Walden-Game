/**
 * Game Progress Module
 * Handles saving and retrieving user game progress
 */

const { dbRun, dbGet, dbAll } = require('./auth');

/**
 * Initialize game progress tables
 */
async function initProgressTables() {
    try {
        // User game progress table
        await dbRun(`
        CREATE TABLE IF NOT EXISTS user_progress (
            user_id INTEGER PRIMARY KEY,
            total_fish_caught INTEGER DEFAULT 0,
            total_legacies INTEGER DEFAULT 0,
            story_completed BOOLEAN DEFAULT 0,
            play_time_seconds INTEGER DEFAULT 0,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        `);

        // Fish caught by users
        await dbRun(`
            CREATE TABLE IF NOT EXISTS user_fish (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                fish_id TEXT NOT NULL,
                fish_name TEXT NOT NULL,
                times_caught INTEGER DEFAULT 1,
                first_caught DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_caught DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, fish_id)
            )
        `);

        // Legacies unlocked by users
        await dbRun(`
            CREATE TABLE IF NOT EXISTS user_legacies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                legacy_name TEXT NOT NULL,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, legacy_name)
            )
        `);

        // Create indices
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_user_fish ON user_fish(user_id)`);
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_user_legacies ON user_legacies(user_id)`);

        console.log('✓ Game progress tables initialized');
    } catch (error) {
        console.error('Error initializing progress tables:', error);
    }
}

/**
 * Record a caught fish for a user
 */
async function recordFishCaught(userId, fishId, fishName) {
    try {
        // Try to insert new fish
        await dbRun(
            `INSERT INTO user_fish (user_id, fish_id, fish_name) VALUES (?, ?, ?)`,
            [userId, fishId, fishName]
        );
    } catch (error) {
        // If already exists, increment count
        if (error.message.includes('UNIQUE constraint')) {
            await dbRun(
                `UPDATE user_fish 
                SET times_caught = times_caught + 1, 
                    last_caught = CURRENT_TIMESTAMP 
                WHERE user_id = ? AND fish_id = ?`,
                [userId, fishId]
            );
        } else {
            throw error;
        }
    }

    // Update total count
    await updateTotalFishCaught(userId);
}

/**
 * Record a legacy unlocked by a user
 */
async function recordLegacyUnlocked(userId, legacyName) {
    try {
        await dbRun(
            `INSERT INTO user_legacies (user_id, legacy_name) VALUES (?, ?)`,
            [userId, legacyName]
        );

        // Update total count
        await updateTotalLegacies(userId);
    } catch (error) {
        // If already exists, ignore
        if (!error.message.includes('UNIQUE constraint')) {
            throw error;
        }
    }
}

/**
 * Mark story as completed
 */
async function markStoryCompleted(userId) {
    await dbRun(
        `INSERT INTO user_progress (user_id, story_completed, last_updated) 
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET 
            story_completed = 1,
            last_updated = CURRENT_TIMESTAMP`,
        [userId]
    );
}

/**
 * Get user's fish collection
 */
async function getUserFish(userId) {
    return await dbAll(
        `SELECT fish_id, fish_name, times_caught, first_caught, last_caught 
        FROM user_fish 
        WHERE user_id = ? 
        ORDER BY first_caught DESC`,
        [userId]
    );
}

/**
 * Get user's legacies
 */
async function getUserLegacies(userId) {
    return await dbAll(
        `SELECT legacy_name, unlocked_at 
        FROM user_legacies 
        WHERE user_id = ? 
        ORDER BY unlocked_at DESC`,
        [userId]
    );
}

/**
 * Get user's complete progress
 */
async function getUserProgress(userId) {
    let progress = await dbGet(
        `SELECT * FROM user_progress WHERE user_id = ?`,
        [userId]
    );

    // If no progress entry exists, create one
    if (!progress) {
        await dbRun(
            `INSERT INTO user_progress (user_id) VALUES (?)`,
            [userId]
        );
        progress = {
            user_id: userId,
            total_fish_caught: 0,
            total_legacies: 0,
            story_completed: 0
        };
    }

    const fish = await getUserFish(userId);
    const legacies = await getUserLegacies(userId);

    return {
        ...progress,
        fish_collection: fish,
        legacies_unlocked: legacies,
        unique_fish_count: fish.length,
        total_legacies_count: legacies.length
    };
}

/**
 * Update total fish caught count
 */
async function updateTotalFishCaught(userId) {
    await dbRun(
        `UPDATE user_progress 
        SET total_fish_caught = (
            SELECT SUM(times_caught) FROM user_fish WHERE user_id = ?
        ),
        last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
        [userId, userId]
    );
}

/**
 * Update total legacies count
 */
async function updateTotalLegacies(userId) {
    await dbRun(
        `UPDATE user_progress 
        SET total_legacies = (
            SELECT COUNT(*) FROM user_legacies WHERE user_id = ?
        ),
        last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
        [userId, userId]
    );
}

/**
 * Update play time
 */
async function updatePlayTime(userId, secondsToAdd) {
    await dbRun(
        `UPDATE user_progress 
        SET play_time_seconds = play_time_seconds + ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
        [secondsToAdd, userId]
    );
}

/**
 * Get leaderboard with user info
 */
async function getLeaderboardWithUsers() {
    return await dbAll(`
        SELECT 
            users.nickname,
            users.avatar,
            user_progress.total_fish_caught,
            user_progress.total_legacies,
            user_progress.story_completed,
            user_progress.play_time_seconds
        FROM user_progress
        JOIN users ON user_progress.user_id = users.id
        ORDER BY user_progress.total_legacies DESC, user_progress.total_fish_caught DESC
        LIMIT 10
    `);
}

// Initialize tables on module load
initProgressTables();

module.exports = {
    recordFishCaught,
    recordLegacyUnlocked,
    markStoryCompleted,
    getUserFish,
    getUserLegacies,
    getUserProgress,
    updatePlayTime,
    getLeaderboardWithUsers
};

