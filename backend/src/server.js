/**
 * Walden Game Backend Server
 * Handles leaderboard submissions and retrieval
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const { submitScore, getTopScores, getPlayerRank, getStats } = require('./database');
const { 
    registerUser, 
    loginUser, 
    getUserById, 
    emailExists, 
    nicknameExists,
    authenticateToken 
} = require('./auth');
const {
    recordFishCaught,
    recordLegacyUnlocked,
    markStoryCompleted,
    getUserProgress,
    updatePlayTime,
    getLeaderboardWithUsers
} = require('./gameProgress');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080'
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

/**
 * Submit a score to the leaderboard
 * POST /api/leaderboard
 */
app.post('/api/leaderboard', async (req, res) => {
    try {
        const { playerName, legacies, choices, completionTime } = req.body;

        // Validation
        if (!playerName || typeof playerName !== 'string') {
            return res.status(400).json({ error: 'Invalid player name' });
        }

        if (!Array.isArray(legacies)) {
            return res.status(400).json({ error: 'Invalid legacies data' });
        }

        if (!choices || typeof choices !== 'object') {
            return res.status(400).json({ error: 'Invalid choices data' });
        }

        if (typeof completionTime !== 'number' || completionTime < 0) {
            return res.status(400).json({ error: 'Invalid completion time' });
        }

        // Count transcendent choices
        const transcendentChoices = Object.values(choices).filter(
            choice => choice === 'transcend' || choice === 'wild' || 
                     choice === 'deliberate' || choice === 'wisdom' || 
                     choice === 'freedom' || choice === 'reflective' || 
                     choice === 'success'
        ).length;

        // Submit score
        const result = submitScore({
            playerName: playerName.trim().substring(0, 50), // Limit name length
            legaciesCount: legacies.length,
            legaciesUnlocked: legacies,
            totalChoices: Object.keys(choices).length,
            transcendentChoices,
            completionTime: Math.round(completionTime)
        });

        res.status(201).json({
            success: true,
            id: result.id,
            message: 'Score submitted successfully'
        });

    } catch (error) {
        console.error('Error submitting score:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

/**
 * Get top scores from leaderboard
 * GET /api/leaderboard?limit=10
 */
app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100
        const scores = getTopScores(limit);

        res.json({
            success: true,
            scores,
            count: scores.length
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

/**
 * Get player's rank
 * GET /api/leaderboard/rank/:playerName
 */
app.get('/api/leaderboard/rank/:playerName', async (req, res) => {
    try {
        const playerName = req.params.playerName;
        const rank = getPlayerRank(playerName);

        if (rank === null) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json({
            success: true,
            playerName,
            rank
        });

    } catch (error) {
        console.error('Error fetching rank:', error);
        res.status(500).json({ error: 'Failed to fetch rank' });
    }
});

/**
 * Get leaderboard statistics
 * GET /api/leaderboard/stats
 */
app.get('/api/leaderboard/stats', async (req, res) => {
    try {
        const stats = getStats();

        res.json({
            success: true,
            stats: {
                totalPlayers: stats.totalPlayers || 0,
                averageLegacies: parseFloat((stats.avgLegacies || 0).toFixed(2)),
                maxLegacies: stats.maxLegacies || 0,
                averageCompletionTime: Math.round(stats.avgCompletionTime || 0)
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * Register a new user
 * POST /api/auth/register
 */
app.post('/api/auth/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('nickname').isLength({ min: 3, max: 20 }).trim(),
    body('avatar').isIn(['thoreau', 'emerson', 'woodchopper', 'merchant', 'student', 'nature', 'book', 'cabin'])
], async (req, res) => {
    try {
        // Validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, nickname, avatar } = req.body;

        // Check if email or nickname already exists
        if (await emailExists(email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        if (await nicknameExists(nickname)) {
            return res.status(400).json({ error: 'Nickname already taken' });
        }

        // Register user
        const user = await registerUser(email, password, nickname, avatar);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: error.message || 'Failed to register user' });
    }
});

/**
 * Login user
 * POST /api/auth/login
 */
app.post('/api/auth/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        // Validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Login
        const result = await loginUser(email, password);

        res.json({
            success: true,
            token: result.token,
            user: result.user
        });

    } catch (error) {
        console.error('Error logging in:', error);
        res.status(401).json({ error: error.message || 'Invalid credentials' });
    }
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
    try {
        const user = getUserById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                avatar: user.avatar,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

/**
 * Check if email is available
 * GET /api/auth/check-email/:email
 */
app.get('/api/auth/check-email/:email', async (req, res) => {
    try {
        const exists = await emailExists(req.params.email);
        res.json({ available: !exists });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check email' });
    }
});

/**
 * Check if nickname is available
 * GET /api/auth/check-nickname/:nickname
 */
app.get('/api/auth/check-nickname/:nickname', async (req, res) => {
    try {
        const exists = await nicknameExists(req.params.nickname);
        res.json({ available: !exists });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check nickname' });
    }
});

/**
 * Record a caught fish
 * POST /api/progress/fish
 */
app.post('/api/progress/fish', authenticateToken, async (req, res) => {
    try {
        const { fishId, fishName } = req.body;

        if (!fishId || !fishName) {
            return res.status(400).json({ error: 'Fish ID and name required' });
        }

        await recordFishCaught(req.user.id, fishId, fishName);

        res.json({
            success: true,
            message: 'Fish recorded'
        });

    } catch (error) {
        console.error('Error recording fish:', error);
        res.status(500).json({ error: 'Failed to record fish' });
    }
});

/**
 * Record a legacy unlocked
 * POST /api/progress/legacy
 */
app.post('/api/progress/legacy', authenticateToken, async (req, res) => {
    try {
        const { legacyName } = req.body;

        if (!legacyName) {
            return res.status(400).json({ error: 'Legacy name required' });
        }

        await recordLegacyUnlocked(req.user.id, legacyName);

        res.json({
            success: true,
            message: 'Legacy recorded'
        });

    } catch (error) {
        console.error('Error recording legacy:', error);
        res.status(500).json({ error: 'Failed to record legacy' });
    }
});

/**
 * Mark story as completed
 * POST /api/progress/complete-story
 */
app.post('/api/progress/complete-story', authenticateToken, async (req, res) => {
    try {
        await markStoryCompleted(req.user.id);

        res.json({
            success: true,
            message: 'Story completion recorded'
        });

    } catch (error) {
        console.error('Error marking story complete:', error);
        res.status(500).json({ error: 'Failed to mark story complete' });
    }
});

/**
 * Get user's game progress
 * GET /api/progress
 */
app.get('/api/progress', authenticateToken, async (req, res) => {
    try {
        const progress = await getUserProgress(req.user.id);

        res.json({
            success: true,
            progress
        });

    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

/**
 * Update play time
 * POST /api/progress/play-time
 */
app.post('/api/progress/play-time', authenticateToken, async (req, res) => {
    try {
        const { seconds } = req.body;

        if (!seconds || seconds < 0) {
            return res.status(400).json({ error: 'Valid seconds required' });
        }

        await updatePlayTime(req.user.id, seconds);

        res.json({
            success: true,
            message: 'Play time updated'
        });

    } catch (error) {
        console.error('Error updating play time:', error);
        res.status(500).json({ error: 'Failed to update play time' });
    }
});

/**
 * Get leaderboard with user progress
 * GET /api/progress/leaderboard
 */
app.get('/api/progress/leaderboard', async (req, res) => {
    try {
        const leaderboard = await getLeaderboardWithUsers();

        res.json({
            success: true,
            leaderboard
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

/**
 * 404 handler
 */
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

/**
 * Start server
 */
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   Walden Game Backend Server          ║
║   Running on http://localhost:${PORT}   ║
╚═══════════════════════════════════════╝
    `);
});

