/**
 * API Client for Walden Game Backend
 * Handles communication with the leaderboard server and authentication
 */

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Get authentication token from localStorage
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Get authenticated headers
 */
function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

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

/**
 * Get current user data
 */
function getCurrentUser() {
    const userDataString = localStorage.getItem('userData');
    return userDataString ? JSON.parse(userDataString) : null;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getAuthToken();
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'auth.html';
}

/**
 * Verify current token
 */
async function verifyAuth() {
    const token = getAuthToken();
    if (!token) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: getAuthHeaders()
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Record a caught fish
 */
async function recordFish(fishId, fishName) {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/fish`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fishId, fishName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error recording fish:', error);
        return null;
    }
}

/**
 * Record a legacy unlocked
 */
async function recordLegacy(legacyName) {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/legacy`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ legacyName })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error recording legacy:', error);
        return null;
    }
}

/**
 * Mark story as completed
 */
async function completeStory() {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/complete-story`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error completing story:', error);
        return null;
    }
}

// Social: search users by nickname
async function searchUsersByNickname(nickname) {
    const response = await fetch(`${API_BASE_URL}/friends/search?nickname=${encodeURIComponent(nickname)}`, {
        headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Search failed');
    }
    return data;
}

// Social: subscribe to user
async function subscribeToUser(nickname) {
    const response = await fetch(`${API_BASE_URL}/friends/subscribe`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nickname })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
    }
    return data;
}

// Social: get friends and subscriptions
async function fetchFriendsAndSubscriptions() {
    const response = await fetch(`${API_BASE_URL}/friends`, {
        headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to load friends');
    }
    return data;
}

// Social: get public profile by nickname
async function fetchProfileByNickname(nickname) {
    const response = await fetch(`${API_BASE_URL}/profile/${encodeURIComponent(nickname)}`, {
        headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to load profile');
    }
    return data;
}

/**
 * Get user's game progress
 */
async function getUserProgress() {
    try {
        const response = await fetch(`${API_BASE_URL}/progress`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching progress:', error);
        return null;
    }
}

/**
 * Update play time
 */
async function updatePlayTime(seconds) {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/play-time`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ seconds: Math.floor(seconds) })
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`HTTP error! status: ${response.status} body: ${text}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating play time:', error);
        return null;
    }
}

/**
 * Get progress leaderboard
 */
async function getProgressLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/leaderboard`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching progress leaderboard:', error);
        return null;
    }
}
