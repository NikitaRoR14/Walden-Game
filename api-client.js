/**
 * API Client for Walden Game Backend
 * Handles communication with the leaderboard server
 */

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Submit score to leaderboard
 */
async function submitScore(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error submitting score:', error);
        throw error;
    }
}

/**
 * Get top scores from leaderboard
 */
async function getLeaderboard(limit = 10) {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

/**
 * Get player's rank
 */
async function getPlayerRank(playerName) {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/rank/${encodeURIComponent(playerName)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching rank:', error);
        throw error;
    }
}

/**
 * Get leaderboard statistics
 */
async function getLeaderboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/stats`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
    }
}

/**
 * Check backend health
 */
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

