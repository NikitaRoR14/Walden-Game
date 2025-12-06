/**
 * Game-Backend Synchronization
 * Automatically syncs fish catches and legacy unlocks to backend
 * 
 * Usage: Include this AFTER api-client.js and BEFORE game.js in index.html
 */

// Play time tracking
let playTimeStart = null;
let playTimeInterval = null;

// Wait for api-client.js to load before checking authentication
(function checkAuthAndInit() {
    // Check if isAuthenticated is available (api-client.js loaded)
    if (typeof isAuthenticated === 'function' && typeof getCurrentUser === 'function') {
        if (!isAuthenticated()) {
            console.log('User not authenticated, skipping backend sync');
        } else {
            console.log('✓ User authenticated, backend sync enabled');
            
            // Get current user
            const currentUser = getCurrentUser();
            if (currentUser) {
                console.log(`Playing as: ${currentUser.nickname}`);
            }
            
            // Start play time tracking
            startPlayTimeTracking();
        }
    } else {
        // api-client.js not loaded yet, try again in a moment
        setTimeout(checkAuthAndInit, 100);
    }
})();

/**
 * Start tracking play time
 */
function startPlayTimeTracking() {
    playTimeStart = Date.now();
    
    // Update play time every 10 seconds (more frequent, more reliable)
    playTimeInterval = setInterval(async () => {
        await flushPlayTime();
    }, 10000);
    
    // Sync on tab hide/unload
    const syncAndReset = () => flushPlayTime();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') syncAndReset();
    });
    window.addEventListener('beforeunload', syncAndReset);
}

async function flushPlayTime() {
    if (!playTimeStart) return;
    const currentTime = Date.now();
    const secondsPlayed = Math.floor((currentTime - playTimeStart) / 1000);
    if (secondsPlayed <= 0) return;
    try {
        const res = await updatePlayTime(secondsPlayed);
        if (res && res.success) {
            console.log(`✓ Play time synced: +${secondsPlayed}s`);
        } else {
            console.warn('⚠ Play time sync failed response', res);
        }
    } catch (e) {
        console.warn('⚠ Play time sync error', e);
    }
    playTimeStart = Date.now();
}

/**
 * Sync fish catch to backend
 */
async function syncFishCatch(fishId, fishName) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;

    try {
        const res = await recordFish(fishId, fishName);
        if (!res || !res.success) {
            console.warn('⚠ Fish sync failed', res);
        } else {
            console.log(`✓ Fish synced: ${fishName}`);
        }
    } catch (error) {
        console.error('Failed to sync fish:', error);
    }
}

/**
 * Sync legacy unlock to backend
 */
async function syncLegacyUnlock(legacyName) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;

    try {
        const res = await recordLegacy(legacyName);
        if (!res || !res.success) {
            console.warn('⚠ Legacy sync failed', res);
        } else {
            console.log(`✓ Legacy synced: ${legacyName}`);
        }
    } catch (error) {
        console.error('Failed to sync legacy:', error);
    }
}

/**
 * Sync story completion to backend
 */
async function syncStoryComplete() {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;

    try {
        await completeStory();
        console.log('✓ Story completion synced');
    } catch (error) {
        console.error('Failed to sync story completion:', error);
    }
}

/**
 * Load user progress from backend
 */
async function loadUserProgress() {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return null;

    try {
        const data = await getUserProgress();
        if (data && data.success) {
            console.log('✓ User progress loaded:', data.progress);
            return data.progress;
        }
        return null;
    } catch (error) {
        console.error('Failed to load progress:', error);
        return null;
    }
}

/**
 * Display user info in game UI
 */
function displayUserInfo() {
    // Check if functions are available
    if (typeof isAuthenticated !== 'function' || typeof getCurrentUser !== 'function') {
        console.warn('api-client.js not loaded, cannot display user info');
        return;
    }
    
    if (!isAuthenticated()) return;

    const user = getCurrentUser();
    
    // Avatar emojis mapping
    const avatarEmojis = {
        'thoreau': '🧔',
        'emerson': '🎩',
        'woodchopper': '🪓',
        'merchant': '💼',
        'student': '📚',
        'nature': '🌿',
        'book': '📖',
        'cabin': '🏠'
    };

    // Create user info display if it doesn't exist
    let userInfo = document.getElementById('user-info-display');
    if (!userInfo) {
        userInfo = document.createElement('div');
        userInfo.id = 'user-info-display';
        userInfo.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(44, 62, 50, 0.95);
            backdrop-filter: blur(10px);
            padding: 15px 20px;
            border-radius: 12px;
            border: 2px solid rgba(200, 180, 150, 0.5);
            color: #e8dcc4;
            font-family: Georgia, serif;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            cursor: pointer;
            transition: all 0.3s ease;
            animation: slideInFromRight 0.6s ease-out;
        `;
        
        userInfo.innerHTML = `
            <span style="font-size: 2em;">${avatarEmojis[user.avatar] || '👤'}</span>
            <div>
                <div style="font-weight: bold; font-size: 1.1em; cursor: pointer;" onclick="window.location.href='profile.html'" title="View Profile">${user.nickname}</div>
                <div style="font-size: 0.8em; color: #c9b896; cursor: pointer;" onclick="if(confirm('Logout?')){localStorage.removeItem('authToken');localStorage.removeItem('userData');localStorage.removeItem('walden_auth_token');localStorage.removeItem('walden_user');location.href='auth.html';}">Logout</div>
            </div>
        `;

        userInfo.addEventListener('mouseenter', () => {
            userInfo.style.transform = 'translateY(-3px) scale(1.05)';
            userInfo.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.5)';
            userInfo.style.borderColor = 'rgba(220, 200, 170, 0.7)';
        });

        userInfo.addEventListener('mouseleave', () => {
            userInfo.style.transform = 'translateY(0) scale(1)';
            userInfo.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
            userInfo.style.borderColor = 'rgba(200, 180, 150, 0.5)';
        });

        document.body.appendChild(userInfo);
    }
    
    // Make sure it's visible
    userInfo.style.display = 'flex';
}

// Display user info when page loads
window.addEventListener('load', displayUserInfo);

// Global hook functions that game.js can call
window.onFishCaught = syncFishCatch;
window.onLegacyUnlocked = syncLegacyUnlock;
window.onStoryCompleted = syncStoryComplete;
window.loadProgress = loadUserProgress;

console.log('✓ Game-backend sync initialized');

