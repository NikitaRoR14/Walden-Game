/**
 * Game-Backend Synchronization
 * Automatically syncs fish catches and legacy unlocks to backend
 * 
 * Usage: Include this AFTER api-client.js and BEFORE game.js in index.html
 */

// Play time tracking
let playTimeStart = null;
let playTimeInterval = null;

// Check if user is authenticated
if (!isAuthenticated()) {
    console.log('User not authenticated, skipping backend sync');
} else {
    console.log('✓ User authenticated, backend sync enabled');
    
    // Get current user
    const currentUser = getCurrentUser();
    console.log(`Playing as: ${currentUser.nickname}`);
    
    // Start play time tracking
    startPlayTimeTracking();
}

/**
 * Start tracking play time
 */
function startPlayTimeTracking() {
    playTimeStart = Date.now();
    
    // Update play time every 30 seconds
    playTimeInterval = setInterval(async () => {
        const currentTime = Date.now();
        const secondsPlayed = Math.floor((currentTime - playTimeStart) / 1000);
        
        if (secondsPlayed >= 30) {
            await updatePlayTime(secondsPlayed);
            playTimeStart = Date.now();
            console.log(`✓ Play time synced: ${secondsPlayed}s`);
        }
    }, 30000);
    
    // Also sync on page unload
    window.addEventListener('beforeunload', async () => {
        const currentTime = Date.now();
        const secondsPlayed = Math.floor((currentTime - playTimeStart) / 1000);
        
        if (secondsPlayed > 0) {
            // Use sendBeacon for reliable sending during page unload
            const data = JSON.stringify({ seconds: secondsPlayed });
            const token = getAuthToken();
            
            navigator.sendBeacon(
                'http://localhost:3000/api/progress/play-time',
                new Blob([data], { type: 'application/json' })
            );
        }
    });
}

/**
 * Sync fish catch to backend
 */
async function syncFishCatch(fishId, fishName) {
    if (!isAuthenticated()) return;

    try {
        await recordFish(fishId, fishName);
        console.log(`✓ Fish synced: ${fishName}`);
    } catch (error) {
        console.error('Failed to sync fish:', error);
    }
}

/**
 * Sync legacy unlock to backend
 */
async function syncLegacyUnlock(legacyName) {
    if (!isAuthenticated()) return;

    try {
        await recordLegacy(legacyName);
        console.log(`✓ Legacy synced: ${legacyName}`);
    } catch (error) {
        console.error('Failed to sync legacy:', error);
    }
}

/**
 * Sync story completion to backend
 */
async function syncStoryComplete() {
    if (!isAuthenticated()) return;

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
    if (!isAuthenticated()) return null;

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
            background: rgba(44, 62, 50, 0.9);
            padding: 12px 20px;
            border-radius: 10px;
            border: 2px solid rgba(139, 115, 85, 0.4);
            color: #e8dcc4;
            font-family: Georgia, serif;
            z-index: 100;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        userInfo.innerHTML = `
            <span style="font-size: 1.5em;">${avatarEmojis[user.avatar] || '👤'}</span>
            <div>
                <div style="font-weight: bold; font-size: 1.1em; cursor: pointer;" onclick="window.location.href='profile.html'" title="View Profile">${user.nickname}</div>
                <div style="font-size: 0.8em; color: #c9b896; cursor: pointer;" onclick="logout()">Logout</div>
            </div>
        `;

        userInfo.addEventListener('mouseenter', () => {
            userInfo.style.transform = 'translateY(-2px)';
            userInfo.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        });

        userInfo.addEventListener('mouseleave', () => {
            userInfo.style.transform = 'translateY(0)';
            userInfo.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        });

        document.body.appendChild(userInfo);
    }
}

// Display user info when page loads
window.addEventListener('load', displayUserInfo);

// Global hook functions that game.js can call
window.onFishCaught = syncFishCatch;
window.onLegacyUnlocked = syncLegacyUnlock;
window.onStoryCompleted = syncStoryComplete;
window.loadProgress = loadUserProgress;

console.log('✓ Game-backend sync initialized');

