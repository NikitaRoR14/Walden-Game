/**
 * Walden Game Backend Server
 * Handles leaderboard submissions and retrieval
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { submitScore, getTopScores, getPlayerRank, getStats } = require('./database');
const { 
    registerUser, 
    loginUser, 
    getUserById, 
    emailExists, 
    nicknameExists,
    authenticateToken,
    dbRun,
    dbGet
} = require('./auth');
const {
    recordFishCaught,
    recordLegacyUnlocked,
    markStoryCompleted,
    getUserProgress,
    updatePlayTime,
    getLeaderboardWithUsers
} = require('./gameProgress');
const {
    subscribe: subscribeToUser,
    unsubscribe: unsubscribeFromUser,
    searchUsers,
    getSubscriptions,
    getFriends,
    getUserByNickname
} = require('./friends');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow requests from frontend
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Request logging (before static to catch all requests)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Root health check endpoint (for monitoring)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
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
                avatar: user.avatar,
                created_at: user.created_at,
                createdAt: user.created_at
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
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        
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
                created_at: user.created_at,
                createdAt: user.created_at,
                last_login: user.last_login,
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
        const email = decodeURIComponent(req.params.email);
        console.log(`Checking email availability: ${email}`);
        const exists = await emailExists(email);
        res.json({ available: !exists });
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ error: 'Failed to check email' });
    }
});

/**
 * Check if nickname is available
 * GET /api/auth/check-nickname/:nickname
 */
app.get('/api/auth/check-nickname/:nickname', async (req, res) => {
    try {
        const nickname = decodeURIComponent(req.params.nickname);
        console.log(`Checking nickname availability: ${nickname}`);
        const exists = await nicknameExists(nickname);
        res.json({ available: !exists });
    } catch (error) {
        console.error('Error checking nickname:', error);
        res.status(500).json({ error: 'Failed to check nickname' });
    }
});

/**
 * Friend & subscription endpoints
 */

// Search users by nickname
app.get('/api/friends/search', authenticateToken, async (req, res) => {
    try {
        const { nickname } = req.query;
        if (!nickname || nickname.trim().length < 2) {
            return res.status(400).json({ error: 'Please provide at least 2 characters' });
        }

        const results = await searchUsers(nickname.trim(), req.user.id);
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Subscribe to a user by nickname
app.post('/api/friends/subscribe', authenticateToken, async (req, res) => {
    try {
        const { nickname } = req.body;
        if (!nickname) {
            return res.status(400).json({ error: 'Nickname is required' });
        }

        const target = await subscribeToUser(req.user.id, nickname.trim());
        const mutual = await dbGet(
            `SELECT 1 FROM user_subscriptions WHERE user_id = ? AND target_user_id = ?`,
            [target.id, req.user.id]
        ).catch(() => null);

        res.json({
            success: true,
            subscribedTo: target.nickname,
            targetId: target.id,
            mutual: !!mutual
        });
    } catch (error) {
        console.error('Error subscribing to user:', error);
        res.status(400).json({ error: error.message || 'Failed to subscribe' });
    }
});

// Unsubscribe (optional cleanup)
app.delete('/api/friends/subscribe', authenticateToken, async (req, res) => {
    try {
        const { targetId } = req.body;
        if (!targetId) {
            return res.status(400).json({ error: 'targetId is required' });
        }
        await unsubscribeFromUser(req.user.id, targetId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error unsubscribing:', error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

// Get subscriptions and friends
app.get('/api/friends', authenticateToken, async (req, res) => {
    try {
        const [friends, subscriptions] = await Promise.all([
            getFriends(req.user.id),
            getSubscriptions(req.user.id)
        ]);
        res.json({ success: true, friends, subscriptions });
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ error: 'Failed to load friends' });
    }
});

// Get a user's public profile (basic + progress) by nickname
app.get('/api/profile/:nickname', authenticateToken, async (req, res) => {
    try {
        const target = await getUserByNickname(req.params.nickname);
        if (!target) {
            return res.status(404).json({ error: 'User not found' });
        }
        const progress = await getUserProgress(target.id);
        res.json({
            success: true,
            user: {
                id: target.id,
                nickname: target.nickname,
                avatar: target.avatar,
                createdAt: target.created_at,
                lastLogin: target.last_login
            },
            progress
        });
    } catch (error) {
        console.error('Error fetching profile by nickname:', error);
        res.status(500).json({ error: 'Failed to load profile' });
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
        res.status(500).json({ error: 'Failed to fetch progress', details: error.message });
    }
});

/**
 * Update play time
 * POST /api/progress/play-time
 */
app.post('/api/progress/play-time', authenticateToken, async (req, res) => {
    try {
        const { seconds } = req.body;
        const secs = Number(seconds);

        if (!Number.isFinite(secs) || secs <= 0) {
            return res.status(400).json({ error: 'Valid seconds required' });
        }

        try {
            await updatePlayTime(req.user.id, Math.floor(secs));
        } catch (err) {
            // Fallback: if column missing, migrate then retry
            if (err.message && err.message.includes('play_time_minutes')) {
                try {
                    await dbRun(`ALTER TABLE user_progress ADD COLUMN play_time_minutes INTEGER DEFAULT 0`);
                    await updatePlayTime(req.user.id, Math.floor(secs));
                } catch (e2) {
                    console.error('Migration failed in /progress/play-time:', e2);
                    throw e2;
                }
            } else {
                throw err;
            }
        }

        res.json({
            success: true,
            message: 'Play time updated'
        });

    } catch (error) {
        console.error('Error updating play time:', error);
        res.status(500).json({ error: 'Failed to update play time', details: error.message });
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
 * Serve static files from parent directory (the game files)
 * This must be AFTER all API routes to prevent API requests from being served as static files
 * Skip /api paths to ensure API routes are handled first
 */
// Calculate static file directory
// We may be deployed from a monorepo where the server runs in /backend,
// so probe several candidate roots until we find index.html and api-client.js.
const candidateRoots = [
    path.join(__dirname, '../..'),          // repo root when running from backend/src
    path.join(process.cwd(), '..'),         // if process cwd is /backend
    path.join(process.cwd(), '.'),          // if process cwd is already repo root
    path.join(__dirname, '../public')       // optional backend/public copy
].filter((dir, idx, arr) => arr.indexOf(dir) === idx); // unique

const pickStaticDir = () => {
    for (const dir of candidateRoots) {
        const hasIndex = fs.existsSync(path.join(dir, 'index.html'));
        const hasApiClient = fs.existsSync(path.join(dir, 'api-client.js'));
        if (hasIndex && hasApiClient) {
            return dir;
        }
    }
    // Fallback to first candidate
    return candidateRoots[0];
};

const finalStaticDir = pickStaticDir();

// Helper to resolve a specific file across candidate roots
const resolveFromCandidates = (fileName) => {
    for (const dir of candidateRoots) {
        const full = path.join(dir, fileName);
        if (fs.existsSync(full)) return full;
    }
    return null;
};

console.log('Static files directory:', finalStaticDir);
console.log('__dirname:', __dirname);
console.log('Process cwd:', process.cwd());
console.log('index.html exists:', fs.existsSync(path.join(finalStaticDir, 'index.html')));
console.log('api-client.js exists:', fs.existsSync(path.join(finalStaticDir, 'api-client.js')));
console.log('game.js exists:', fs.existsSync(path.join(finalStaticDir, 'game.js')));

const staticMiddleware = express.static(finalStaticDir, {
    index: 'index.html', // Serve index.html for /
    extensions: ['html', 'js', 'css', 'png', 'jpg', 'gif', 'svg', 'ico', 'mp3'],
    dotfiles: 'ignore',
    etag: true,
    lastModified: true,
    maxAge: 0 // Disable caching for development
});

// Add a test endpoint to check file existence
app.get('/test-static', (req, res) => {
    const testFiles = ['index.html', 'api-client.js', 'game.js', 'auth.html', 'friends.html'];
    const results = {};
    testFiles.forEach(file => {
        const filePath = resolveFromCandidates(file) || path.join(finalStaticDir, file);
        results[file] = {
            exists: fs.existsSync(filePath),
            path: filePath
        };
    });
    res.json({
        staticDir: finalStaticDir,
        __dirname: __dirname,
        cwd: process.cwd(),
        files: results
    });
});

app.use((req, res, next) => {
    // Skip static file serving for API routes
    if (req.path.startsWith('/api')) {
        return next();
    }
    
    // Log static file requests for debugging
    if (req.path.endsWith('.js') || req.path.endsWith('.html') || req.path.endsWith('.css')) {
        const filePath = path.join(finalStaticDir, req.path);
        console.log(`Static file request: ${req.path} -> ${filePath} (exists: ${fs.existsSync(filePath)})`);
    }
    
    // Use express.static for non-API paths
    staticMiddleware(req, res, (err) => {
        if (err) {
            console.error('Static middleware error:', err);
        }
        // If static middleware didn't serve the file, try direct file serving as fallback
        if (!res.headersSent) {
            const candidate = resolveFromCandidates(req.path.startsWith('/') ? req.path.substring(1) : req.path);
            if (candidate && fs.existsSync(candidate)) {
                console.log(`Fallback: Serving ${req.path} directly from ${candidate}`);
                res.sendFile(candidate);
            } else {
                const filePath = path.join(finalStaticDir, req.path);
                if (fs.existsSync(filePath)) {
                    console.log(`Fallback: Serving ${req.path} directly from ${filePath}`);
                    res.sendFile(filePath);
                } else {
                    next(); // Let 404 handler deal with it
                }
            }
        }
    });
});

// Direct fallback for api-client.js if routing missed it
app.get('/api-client.js', (req, res, next) => {
    const filePath = resolveFromCandidates('api-client.js');
    if (filePath && fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    }
    return next();
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
// Listen on all interfaces (0.0.0.0) for hosting platforms
app.listen(PORT, '0.0.0.0', () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const host = isProduction ? 'your-domain.com' : `localhost:${PORT}`;
    console.log(`
╔═══════════════════════════════════════════════╗
║   Walden Game - Full Stack Server            ║
║                                               ║
║   🎮 Game: http://${host.padEnd(35)}║
║   📡 API:  http://${host}/api${' '.repeat(Math.max(0, 35 - host.length - 8))}║
║                                               ║
║   Frontend + Backend running together! ✨     ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(25)}║
╚═══════════════════════════════════════════════╝
    `);
});
