const { dbRun, dbGet, dbAll } = require('./auth');

async function initFriendTables() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            target_user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, target_user_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (target_user_id) REFERENCES users(id)
        )
    `);

    await dbRun(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_user_subscriptions_target ON user_subscriptions(target_user_id)`);
}

async function getUserByNickname(nickname) {
    return await dbGet('SELECT id, email, nickname, avatar, created_at, last_login FROM users WHERE LOWER(nickname) = LOWER(?)', [nickname]);
}

async function subscribe(userId, targetNickname) {
    const target = await getUserByNickname(targetNickname);
    if (!target) {
        throw new Error('User not found');
    }
    if (target.id === userId) {
        throw new Error('You cannot subscribe to yourself');
    }

    await dbRun(
        `INSERT OR IGNORE INTO user_subscriptions (user_id, target_user_id) VALUES (?, ?)`
        , [userId, target.id]
    );

    return target;
}

async function unsubscribe(userId, targetId) {
    await dbRun('DELETE FROM user_subscriptions WHERE user_id = ? AND target_user_id = ?', [userId, targetId]);
}

async function searchUsers(query, currentUserId) {
    const like = `%${query.toLowerCase()}%`;
    return await dbAll(
        `SELECT u.id, u.nickname, u.avatar, u.created_at,
                up.total_fish_caught AS totalFishCaught,
                up.total_legacies AS totalLegacies,
                up.story_completed AS storyCompleted,
                EXISTS(
                    SELECT 1 FROM user_subscriptions s WHERE s.user_id = ? AND s.target_user_id = u.id
                ) AS isSubscribed,
                EXISTS(
                    SELECT 1 FROM user_subscriptions s2 WHERE s2.user_id = u.id AND s2.target_user_id = ?
                ) AS subscribesToMe
         FROM users u
         LEFT JOIN user_progress up ON up.user_id = u.id
         WHERE LOWER(u.nickname) LIKE ? AND u.id != ?
         ORDER BY u.nickname ASC
         LIMIT 10`,
        [currentUserId, currentUserId, like, currentUserId]
    );
}

async function getSubscriptions(userId) {
    return await dbAll(
        `SELECT u.id, u.nickname, u.avatar, u.created_at,
                up.total_fish_caught AS totalFishCaught,
                up.total_legacies AS totalLegacies,
                up.story_completed AS storyCompleted,
                EXISTS(
                    SELECT 1 FROM user_subscriptions s2 WHERE s2.user_id = u.id AND s2.target_user_id = ?
                ) AS isFriend
         FROM user_subscriptions s
         JOIN users u ON u.id = s.target_user_id
         LEFT JOIN user_progress up ON up.user_id = u.id
         WHERE s.user_id = ?
         ORDER BY u.nickname ASC`,
        [userId, userId]
    );
}

async function getFriends(userId) {
    return await dbAll(
        `SELECT u.id, u.nickname, u.avatar, u.created_at,
                up.total_fish_caught AS totalFishCaught,
                up.total_legacies AS totalLegacies,
                up.story_completed AS storyCompleted
         FROM user_subscriptions s
         JOIN user_subscriptions s2 ON s.target_user_id = s2.user_id AND s2.target_user_id = s.user_id
         JOIN users u ON u.id = s.target_user_id
         LEFT JOIN user_progress up ON up.user_id = u.id
         WHERE s.user_id = ?
         GROUP BY u.id
         ORDER BY u.nickname ASC`,
        [userId]
    );
}

// Initialize on load
initFriendTables();

module.exports = {
    subscribe,
    unsubscribe,
    searchUsers,
    getSubscriptions,
    getFriends,
    getUserByNickname
};
