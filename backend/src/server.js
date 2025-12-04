/**
 * Walden Game Backend Server
 * Handles leaderboard submissions and retrieval
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { submitScore, getTopScores, getPlayerRank, getStats } = require('./database');

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

