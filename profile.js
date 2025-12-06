/**
 * Profile Page Logic
 * Displays user stats, fish collection, and legacies
 */

// Avatar emoji mapping
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

// Legacy icons
const legacyIcons = {
    'Nature': '🌲',
    'Civil Disobedience': '⚖️',
    'Simplicity': '🏠',
    'Deliberate Living': '🎯',
    'Self-Education': '📚',
    'Anti-Consumerism': '🕊️',
    'Wilderness Preservation': '🦌',
    'Individual Path': '🛤️'
};

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        window.location.href = 'auth.html';
        return false;
    }
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        
        if (Date.now() >= expirationTime) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'auth.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'auth.html';
        return false;
    }
}

// Initialize page
window.addEventListener('load', async () => {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = 'auth.html';
        return;
    }

    // Create falling leaves animation
    createLeavesAnimation();

    // Load user data
    await loadProfile();
});

/**
 * Create animated falling leaves
 */
function createLeavesAnimation() {
    const container = document.getElementById('leaves-bg');
    const leafEmojis = ['🍂', '🍃', '🌿'];
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            leaf.textContent = leafEmojis[Math.floor(Math.random() * leafEmojis.length)];
            leaf.style.left = Math.random() * 100 + '%';
            leaf.style.animationDuration = (10 + Math.random() * 10) + 's';
            leaf.style.animationDelay = Math.random() * 5 + 's';
            leaf.style.fontSize = (15 + Math.random() * 15) + 'px';
            container.appendChild(leaf);
        }, i * 200);
    }
}

/**
 * Format seconds to hours and minutes
 */
function formatPlayTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// Refresh user data from the backend when cached profile info is missing
async function refreshUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data && data.user) {
            localStorage.setItem('userData', JSON.stringify(data.user));
            return data.user;
        }
    } catch (error) {
        console.error('Error refreshing user profile:', error);
    }

    return null;
}

/**
 * Load user profile data
 */
async function loadProfile() {
    try {
        // Get current user info
        let user = getCurrentUser();
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }

        // Backfill missing profile metadata from the backend
        if (!user.createdAt && !user.created_at) {
            const refreshedUser = await refreshUserProfile();
            if (refreshedUser) {
                user = refreshedUser;
            }
        }

        // Display user info
        document.getElementById('userName').textContent = user.nickname;
        document.getElementById('userAvatar').textContent = avatarEmojis[user.avatar] || '👤';
        
        // Format member since date (support both createdAt / created_at from backend)
        const createdAt = user.createdAt || user.created_at;
        if (createdAt) {
            const memberDate = new Date(createdAt);
            document.getElementById('memberSince').textContent = 
                `Member since ${memberDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        } else {
            document.getElementById('memberSince').textContent = '';
        }

        // Fetch progress data
        const progressData = await getUserProgress();
        
        if (progressData && progressData.success) {
            const progress = progressData.progress;
            
            // Update stats
            document.getElementById('playTime').textContent = formatPlayTime(progress.play_time_seconds || 0);
            document.getElementById('totalFish').textContent = progress.total_fish_caught || 0;
            document.getElementById('uniqueSpecies').textContent = progress.unique_fish_count || 0;
            document.getElementById('totalLegacies').textContent = progress.total_legacies_count || 0;
            
            // Update story status
            const storyCard = document.getElementById('storyStatus');
            const storyText = document.getElementById('storyText');
            
            if (progress.story_completed) {
                storyCard.classList.add('completed');
                storyText.textContent = '🎉 Story Completed! You have lived deliberately at Walden Pond.';
            } else {
                storyText.textContent = 'Continue your journey at the pond to unlock the complete story...';
            }
            
            // Load fish collection
            displayFishCollection(progress.fish_collection || []);
            
            // Load legacies
            displayLegacies(progress.legacies_unlocked || []);
        }
        
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Failed to load profile data. Please try again.');
    }
}

/**
 * Display fish collection
 */
function displayFishCollection(fishCollection) {
    const container = document.getElementById('fishCollection');
    
    if (fishCollection.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎣</div>
                <div class="empty-state-text">No fish caught yet. Head to the pond to start fishing!</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    fishCollection.forEach((fish, index) => {
        const fishCard = document.createElement('div');
        fishCard.className = 'fish-item';
        fishCard.style.animationDelay = `${index * 0.05}s`;
        
        fishCard.innerHTML = `
            <div class="fish-emoji">${getFishEmoji(fish.fish_id)}</div>
            <div class="fish-name">${fish.fish_name}</div>
            <div class="fish-count">Caught ${fish.times_caught}× </div>
            <div class="fish-date">First: ${formatDate(fish.first_caught)}</div>
        `;
        
        container.appendChild(fishCard);
    });
}

/**
 * Get fish emoji by ID (simplified, you can expand this)
 */
function getFishEmoji(fishId) {
    const fishEmojis = {
        'perch': '🐟',
        'pickerel': '🐠',
        'pout': '🐡',
        'bream': '🐟',
        'trout': '🎣',
        'salmon': '🐟',
        'pike': '🐠',
        'shiner': '✨',
        'sunfish': '🌞'
    };
    
    return fishEmojis[fishId] || '🐟';
}

/**
 * Display legacies
 */
function displayLegacies(legacies) {
    const container = document.getElementById('legaciesGrid');
    
    if (legacies.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✨</div>
                <div class="empty-state-text">No legacies unlocked yet. Make meaningful choices in Story Mode to unlock philosophical insights!</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    legacies.forEach((legacy, index) => {
        const legacyCard = document.createElement('div');
        legacyCard.className = 'legacy-item';
        legacyCard.style.animationDelay = `${index * 0.1}s`;
        
        const icon = legacyIcons[legacy.legacy_name] || '✨';
        const description = getLegacyDescription(legacy.legacy_name);
        
        legacyCard.innerHTML = `
            <div class="legacy-header">
                <div class="legacy-icon">${icon}</div>
                <div class="legacy-title">${legacy.legacy_name}</div>
            </div>
            <div class="legacy-date">Unlocked ${formatDate(legacy.unlocked_at)}</div>
            <div class="legacy-description">${description}</div>
        `;
        
        container.appendChild(legacyCard);
    });
}

/**
 * Get legacy description
 */
function getLegacyDescription(legacyName) {
    const descriptions = {
        'Nature': 'Your deep connection with the natural world will inspire future generations to preserve and cherish the wilderness.',
        'Civil Disobedience': 'Your resistance to unjust authority will echo through history, empowering individuals to stand for their principles.',
        'Simplicity': 'Your simple, deliberate way of living will teach others what truly matters, beyond material possessions.',
        'Deliberate Living': 'Your intentional approach to life will guide seekers of meaning to live with purpose and awareness.',
        'Self-Education': 'Your self-directed pursuit of knowledge will inspire autodidacts to follow their curiosity.',
        'Anti-Consumerism': 'Your rejection of materialism will free future souls from the chains of endless consumption.',
        'Wilderness Preservation': 'Your love of wildness will help save ecosystems and protect biodiversity for generations.',
        'Individual Path': 'Your courage to change direction will liberate others to follow their own unique journey.'
    };
    
    return descriptions[legacyName] || 'Your wisdom will endure through time.';
}

/**
 * Logout function
 */
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('walden_auth_token');
        localStorage.removeItem('walden_user');
        window.location.href = 'auth.html';
    }
}
