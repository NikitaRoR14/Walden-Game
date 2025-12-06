// Polyfill for roundRect (not supported in all browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
    };
}

// Game State
const gameState = {
    mode: 'menu', // 'menu', 'story', 'freeplay'
    phase: 0,
    fishCaught: 0,
    legacies: [],
    choices: {},
    isFishing: false,
    canFish: true,
    escapeMenuOpen: false,
    isHoldingBar: false, // For fishing minigame bar control
    settings: {
        musicVolume: 0.5,
        sfxVolume: 0.5,
        showTutorial: true
    },
    atmosphere: {
        brightness: 1.0,
        fog: 0.0,
        soundEnabled: true
    },
    fishingMinigame: {
        active: false,
        progress: 0,
        fishPosition: 50, // 0-100, position on track
        barPosition: 50, // 0-100, position of green bar
        barSize: 25, // percentage of track height (smaller for challenge)
        barVelocity: 0, // for smooth movement
        fishVelocity: 0, // fish movement speed
        fishTarget: 50, // where fish wants to go
        fishBehavior: 'steady', // steady, erratic, jumpy, slow
        behaviorTimer: 0,
        difficulty: 1,
        currentFish: null,
        combo: 0,
        comboTimer: 0,
        perfectCatchWindow: 0
    },
    collection: {
        caught: new Set(),
        totalSpecies: 8
    },
    social: {
        friends: [],
        subscriptions: []
    }
};

// Cached layout for procedural scene placement
let sceneLayout = null;
let shoreCache = null;

// Fish species based on Thoreau's life and works
const fishSpecies = [
    {
        id: 'perch',
        name: 'Yellow Perch',
        description: 'Common in Walden Pond, Thoreau wrote about their golden scales shimmering in the depths.',
        rarity: 'common',
        emoji: '🐟'
    },
    {
        id: 'pickerel',
        name: 'Chain Pickerel',
        description: 'The fierce predator of Walden. Thoreau admired their wild nature and hunting prowess.',
        rarity: 'common',
        emoji: '🐠'
    },
    {
        id: 'pout',
        name: 'Horned Pout',
        description: 'The humble catfish that Thoreau caught at midnight, "grunting" as they surfaced.',
        rarity: 'uncommon',
        emoji: '🐡'
    },
    {
        id: 'bream',
        name: 'Bream',
        description: 'A philosophical fish - Thoreau pondered their purpose while fishing by moonlight.',
        rarity: 'uncommon',
        emoji: '🐟'
    },
    {
        id: 'trout',
        name: 'Brook Trout',
        description: 'The poet\'s fish. Thoreau saw them as symbols of wilderness and purity.',
        rarity: 'rare',
        emoji: '🐠'
    },
    {
        id: 'shiner',
        name: 'Golden Shiner',
        description: 'Small but brilliant. Thoreau used them as bait, but admired their metallic beauty.',
        rarity: 'common',
        emoji: '🐟'
    },
    {
        id: 'eel',
        name: 'American Eel',
        description: 'Mysterious travelers. Thoreau marveled at their migrations across the Atlantic.',
        rarity: 'rare',
        emoji: '🐍'
    },
    {
        id: 'salmon',
        name: 'Atlantic Salmon',
        description: 'Once abundant, now rare. Thoreau lamented their decline due to dams and industry.',
        rarity: 'legendary',
        emoji: '🐟'
    }
];

// Game Phases
const phases = [
    {
        name: "The Mentor",
        speaker: "Ralph Waldo Emerson",
        portrait: "assets/images/portraits/emerson.png",
        text: '"Henry! The town is talking. They say you are wasting your life here doing nothing but watching the water. Come back to the city. We have a lecture to attend."',
        choices: [
            {
                label: '[A] Conform: "Perhaps you are right, Waldo. I am missing out on the news of the world."',
                key: 'conform',
                result: 'negative',
                effect: () => {
                    gameState.atmosphere.fog = 0.4;
                    gameState.atmosphere.brightness = 0.7;
                }
            },
            {
                label: '[B] Transcend: "I have three chairs in my house: one for solitude, two for friendship, three for society. But here? I have the sun. Why would I trade a morning with the birds for a lecture room?"',
                key: 'transcend',
                result: 'positive',
                effect: () => {
                    gameState.atmosphere.brightness = 1.3;
                },
                legacy: 'Nature'
            }
        ]
    },
    {
        name: "The State",
        speaker: "Sam Staples - The Tax Collector",
        portrait: "assets/images/portraits/Sam Staples.png",
        text: '"Mr. Thoreau. You haven\'t paid your poll tax in years. The money supports the war in Mexico. If you don\'t pay now, I have to take you to jail."',
        choices: [
            {
                label: '[A] Conform: "Here is the money, Sam. I don\'t want any trouble with the law."',
                key: 'conform',
                result: 'negative',
                effect: () => {
                    gameState.atmosphere.soundEnabled = false;
                    gameState.atmosphere.brightness = 0.6;
                }
            },
            {
                label: '[B] Transcend: "I cannot fund a state that supports slavery and unjust wars. Under a government which imprisons any unjustly, the true place for a just man is also a prison."',
                key: 'transcend',
                result: 'positive',
                effect: () => {
                    gameState.atmosphere.brightness = Math.min(gameState.atmosphere.brightness + 0.2, 1.5);
                },
                legacy: 'Civil Disobedience'
            }
        ]
    },
    {
        name: "The Railroad",
        speaker: "Internal Thought",
        portrait: "assets/images/portraits/internal_thought.png",
        text: 'The Fitchburg Railroad... It cuts through the woods. It represents commerce, speed, and "progress."',
        choices: [
            {
                label: '[A] Cynical: "It is ruining the silence. Technology is the enemy."',
                key: 'cynical',
                result: 'negative',
                effect: () => {
                    gameState.atmosphere.fog = Math.min(gameState.atmosphere.fog + 0.3, 0.6);
                }
            },
            {
                label: '[B] Reflective: "We do not ride on the railroad; it rides upon us. I will keep my life simple, so I do not need the speed of the train to get nowhere."',
                key: 'reflective',
                result: 'positive',
                effect: () => {
                    gameState.atmosphere.brightness = Math.min(gameState.atmosphere.brightness + 0.1, 1.5);
                },
                legacy: 'Simplicity'
            }
        ]
    },
    {
        name: "The Visitor",
        speaker: "Alex Therien - The Woodchopper",
        portrait: "assets/images/portraits/alextherien.png",
        text: '"Mr. Thoreau! I\'ve been cutting wood all day. Tell me, what use is all your reading and writing? A man needs work, wages, and a roof over his family. What does philosophy put on the table?"',
        choices: [
            {
                label: '[A] Academic: "You are right, Alex. Perhaps I should return to practical matters and stop this foolish experiment."',
                key: 'practical',
                result: 'negative',
                effect: () => {
                    gameState.atmosphere.brightness = Math.max(gameState.atmosphere.brightness - 0.2, 0.5);
                }
            },
            {
                label: '[B] Transcendent: "The mass of men lead lives of quiet desperation. What is called resignation is confirmed desperation. I came here to live deliberately, not to live what is not life."',
                key: 'deliberate',
                result: 'positive',
                effect: () => {
                    gameState.atmosphere.brightness = Math.min(gameState.atmosphere.brightness + 0.15, 1.5);
                },
                legacy: 'Deliberate Living'
            }
        ]
    },
    {
        name: "The Books",
        speaker: "Internal Thought",
        portrait: "assets/images/portraits/internal_thought.png",
        text: 'My neighbors think I am lazy because I read Homer and study the classics instead of working from dawn to dusk. But what is the harvest of reading compared to the harvest of corn?',
        choices: [
            {
                label: '[A] Defensive: "Maybe they are right. I should spend more time on profitable labor."',
                key: 'conform',
                result: 'negative',
                effect: () => {
                    gameState.atmosphere.fog = Math.min(gameState.atmosphere.fog + 0.2, 0.6);
                }
            },
            {
                label: '[B] Principled: "Books are the treasured wealth of the world. The works of genius belong to no single age, but to all time. I will not trade eternal wisdom for temporary comfort."',
                key: 'wisdom',
                result: 'positive',
                effect: () => {
                    gameState.atmosphere.brightness = Math.min(gameState.atmosphere.brightness + 0.2, 1.5);
                },
                legacy: 'Self-Education'
            }
        ]
    },
    {
        name: "The Cost",
        speaker: "A Merchant from Concord",
        portrait: "assets/images/portraits/merchant.png",
        text: '"Thoreau, I heard your cabin cost only $28 to build. But a proper house costs $800! How can you live with so little? Don\'t you want fine furniture, a barn, livestock? You\'ll never accumulate wealth this way."',
        choices: [
            {
                label: '[A] Aspirational: "You have a point. I should work harder to afford what others have."',
                key: 'materialism',
                result: 'negative',
                effect: () => {
                    gameState.atmosphere.brightness = Math.max(gameState.atmosphere.brightness - 0.3, 0.5);
                    gameState.atmosphere.fog = Math.min(gameState.atmosphere.fog + 0.2, 0.6);
                }
            },
            {
                label: '[B] Free: "The cost of a thing is the amount of life which is required to be exchanged for it. My wealth is in the mornings I own, not the things I possess. I am richer than you."',
                key: 'freedom',
                result: 'positive',
                effect: () => {
                    gameState.atmosphere.brightness = Math.min(gameState.atmosphere.brightness + 0.25, 1.5);
                },
                legacy: 'Anti-Consumerism'
            }
        ]
    },
    {
        name: "The Wild",
        speaker: "Internal Thought",
        portrait: "assets/images/portraits/internal_thought.png",
        text: 'I have walked four miles today through the woods, observing. Society says I am wasting time. But in wildness is the preservation of the world. Should I abandon these walks for society\'s approval?',
        choices: [
            {
                label: '[A] Conform: "Perhaps I should limit my wandering and be more productive with my time."',
                key: 'restrain',
                result: 'negative',
                effect: () => {
                    gameState.atmosphere.soundEnabled = false;
                    gameState.atmosphere.fog = Math.min(gameState.atmosphere.fog + 0.3, 0.6);
                }
            },
            {
                label: '[B] Wild: "I wish to speak a word for Nature, for absolute freedom and wildness. Give me a wildness whose glance no civilization can endure. I am refreshed by my walks."',
                key: 'wild',
                result: 'positive',
                effect: () => {
                    gameState.atmosphere.brightness = Math.min(gameState.atmosphere.brightness + 0.2, 1.5);
                    gameState.atmosphere.soundEnabled = true;
                },
                legacy: 'Wilderness Preservation'
            }
        ]
    },
    {
        name: "The Question",
        speaker: "A Young Student",
        portrait: "assets/images/portraits/student.png",
        text: '"Mr. Thoreau, why did you leave the woods after two years? Did you fail? My father says you gave up and moved back home. Was your experiment a mistake?"',
        choices: [
            {
                label: '[A] Defeated: "Your father is right. I learned nothing and should not have come here at all."',
                key: 'failure',
                result: 'negative',
                effect: () => {
                    gameState.atmosphere.brightness = 0.4;
                    gameState.atmosphere.fog = 0.6;
                }
            },
            {
                label: '[B] Complete: "I left the woods for as good a reason as I went there. I had several more lives to live, and I did not wish to spend any more time on that one. I learned that if one advances confidently in the direction of his dreams, he will meet with a success unexpected in common hours."',
                key: 'success',
                result: 'positive',
                effect: () => {
                    gameState.atmosphere.brightness = 1.5;
                    gameState.atmosphere.fog = 0;
                    gameState.atmosphere.soundEnabled = true;
                },
                legacy: 'Individual Path'
            }
        ]
    }
];

// Legacy connections
const legacyConnections = {
    'Nature': {
        location: 'California (Yosemite)',
        text: 'Your love of the wild inspired John Muir. Because of you, the National Parks were born.'
    },
    'Civil Disobedience': {
        location: 'South Africa/India',
        text: 'Your refusal to pay the tax was read by a lawyer named Gandhi. He carried your words while fighting for India\'s freedom.'
    },
    'Simplicity': {
        location: 'The Future (Modern City)',
        text: 'In a world of smartphones and noise, people still read Walden to find peace. Your experiment worked.'
    },
    'Deliberate Living': {
        location: 'Worldwide',
        text: 'Your words "live deliberately" became a mantra for millions seeking meaning over material success. You taught people to question the default path.'
    },
    'Self-Education': {
        location: 'Universities & Libraries',
        text: 'Your belief in self-directed learning inspired alternative education movements. Countless autodidacts followed your example, proving wisdom needs no institution.'
    },
    'Anti-Consumerism': {
        location: 'Modern Minimalism Movement',
        text: 'Your economic philosophy inspired minimalists, tiny house dwellers, and those who escaped the rat race. "The cost of a thing is the life exchanged for it" echoes in every life simplified.'
    },
    'Wilderness Preservation': {
        location: 'Conservation Movements',
        text: 'Your essay "Walking" and cry that "in wildness is the preservation of the world" became foundational to wilderness preservation. Aldo Leopold, Rachel Carson, and Edward Abbey carried your torch.'
    },
    'Individual Path': {
        location: 'Hearts Everywhere',
        text: 'Your final lesson-that you had other lives to live-freed countless people to change course. You proved it\'s never too late to advance confidently toward one\'s dreams.'
    }
};

// Canvas and rendering
let canvas, ctx;
let particles = [];
let fishingLine = null;
let bobber = null;

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 ('ontouchstart' in window) || 
                 (navigator.maxTouchPoints > 0);

// Clickable areas
const thoreauClickArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
};

const emersonClickArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
};

const cabinClickArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
};

const catCanClickArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
};

// Animation frame
let lastTime = 0;
let gameLoopRunning = false;

// Sound Manager
const soundManager = {
    sounds: {},
    music: null,
    catMusic: null,
    initialized: false,
    
    init() {
        if (this.initialized) return;
        
        // Define all sound effects with fallback to silent
        this.sounds = {
            // UI Sounds
            buttonClick: this.createSound('assets/sounds/button_click.mp3', 0.3),
            buttonHover: this.createSound('assets/sounds/button_hover.mp3', 0.2),
            menuOpen: this.createSound('assets/sounds/menu_open.mp3', 0.3),
            menuClose: this.createSound('assets/sounds/menu_close.mp3', 0.3),
            
            // Fishing Sounds
            castLine: this.createSound('assets/sounds/cast_line.mp3', 0.4),
            waterSplash: this.createSound('assets/sounds/water_splash.mp3', 0.5),
            reeling: this.createSound('assets/sounds/reeling.mp3', 0.3),
            fishCaught: this.createSound('assets/sounds/fish_caught.mp3', 0.6),
            
            // Dialog Sounds
            dialogOpen: this.createSound('assets/sounds/dialog_open.mp3', 0.3),
            textType: this.createSound('assets/sounds/text_type.mp3', 0.15),
            
            // Ambient Sounds
            birds: this.createSound('assets/sounds/birds.mp3', 0.2, true),
            waterAmbient: this.createSound('assets/sounds/water_ambient.mp3', 0.15, true),
            wind: this.createSound('assets/sounds/wind.mp3', 0.1, true)
        };
        
        // Background music
        this.music = this.createSound('assets/sounds/background_music.mp3', 0.3, true);
        // Biography special track (cats easter egg)
        this.catMusic = this.createSound('assets/sounds/cat_theme.mp3', 0.35, true);
        
        this.initialized = true;
    },
    
    createSound(src, defaultVolume = 0.5, loop = false) {
        const audio = new Audio();
        audio.src = src;
        audio.loop = loop;
        audio.volume = defaultVolume;
        audio.defaultVolume = defaultVolume;
        
        // Handle missing audio files gracefully
        audio.addEventListener('error', () => {
            console.log(`Audio file not found: ${src} (This is normal if you haven't added sound files yet)`);
        });
        
        return audio;
    },
    
    play(soundName) {
        if (!this.sounds[soundName]) return;
        
        const sound = this.sounds[soundName];
        sound.volume = sound.defaultVolume * gameState.settings.sfxVolume;
        
        // Reset and play
        sound.currentTime = 0;
        sound.play().catch(() => {
            // Silently fail if audio can't play (user hasn't interacted yet)
        });
    },
    
    playMusic() {
        if (!this.music) return;
        
        this.music.volume = this.music.defaultVolume * gameState.settings.musicVolume;
        this.music.play().catch(() => {
            // Auto-play might be blocked, will play after user interaction
        });
    },

    playCatMusic() {
        if (!this.catMusic) return;
        this.stopMusic();
        this.catMusic.volume = this.catMusic.defaultVolume * gameState.settings.musicVolume;
        this.catMusic.play().catch(() => {});
    },
    
    stopCatMusic() {
        if (this.catMusic) {
            this.catMusic.pause();
            this.catMusic.currentTime = 0;
        }
        this.playMusic();
    },
    
    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
    },
    
    updateMusicVolume() {
        if (this.music) {
            this.music.volume = this.music.defaultVolume * gameState.settings.musicVolume;
        }
        if (this.catMusic) {
            this.catMusic.volume = this.catMusic.defaultVolume * gameState.settings.musicVolume;
        }
    },
    
    updateSFXVolume() {
        // Update ambient sounds
        ['birds', 'waterAmbient', 'wind'].forEach(soundName => {
            if (this.sounds[soundName]) {
                this.sounds[soundName].volume = this.sounds[soundName].defaultVolume * gameState.settings.sfxVolume;
            }
        });
    },
    
    playAmbient() {
        if (gameState.atmosphere.soundEnabled) {
            this.play('birds');
            this.play('waterAmbient');
            this.play('wind');
        }
    },
    
    stopAmbient() {
        ['birds', 'waterAmbient', 'wind'].forEach(soundName => {
            if (this.sounds[soundName]) {
                this.sounds[soundName].pause();
            }
        });
    },
    
    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
        this.stopMusic();
    }
};

// Check authentication before allowing game access
function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        // No token - redirect to auth page
        window.location.href = 'auth.html';
        return false;
    }
    
    // Verify token is valid (check if it's expired or malformed)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        
        if (Date.now() >= expirationTime) {
            // Token expired - clear and redirect
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'auth.html';
            return false;
        }
        
        return true;
    } catch (error) {
        // Invalid token format - clear and redirect
        console.error('Invalid token:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'auth.html';
        return false;
    }
}

// Initialize game
function init() {
    // Check authentication first
    if (!checkAuthentication()) {
        return; // Stop initialization if not authenticated
    }
    
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size to full window
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize sound system
    soundManager.init();
    
    // Menu buttons with sound effects
    const addButtonSound = (id, callback) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('mouseenter', () => soundManager.play('buttonHover'));
            btn.addEventListener('click', () => {
                soundManager.play('buttonClick');
                callback();
            });
        }
    };
    
    addButtonSound('story-mode-btn', startStoryMode);
    addButtonSound('freeplay-mode-btn', startFreePlayMode);
    addButtonSound('view-collection-btn', viewCollection);
    addButtonSound('view-profile-btn', () => window.location.href = 'profile.html');
    addButtonSound('friends-menu-btn', () => window.location.href = 'friends.html');
    addButtonSound('login-btn', () => window.location.href = 'auth.html');
    addButtonSound('signup-btn', () => window.location.href = 'auth.html');
    addButtonSound('back-to-menu-btn', backToMenu);
    addButtonSound('restart-btn', restartGame);
    addButtonSound('resume-btn', resumeGame);
    addButtonSound('settings-btn', openSettings);
    addButtonSound('fullscreen-btn', toggleFullscreen);
    addButtonSound('main-menu-btn', returnToMainMenu);
    addButtonSound('close-settings-btn', closeSettings);
    
    // Settings controls
    const musicSlider = document.getElementById('music-volume');
    const sfxSlider = document.getElementById('sfx-volume');
    const tutorialToggle = document.getElementById('tutorial-toggle');
    
    if (musicSlider) {
        musicSlider.addEventListener('input', (e) => {
            gameState.settings.musicVolume = e.target.value / 100;
            soundManager.updateMusicVolume();
        });
    }
    
    if (sfxSlider) {
        sfxSlider.addEventListener('input', (e) => {
            gameState.settings.sfxVolume = e.target.value / 100;
            soundManager.updateSFXVolume();
            // Play a test sound
            soundManager.play('waterSplash');
        });
    }
    
    if (tutorialToggle) {
        tutorialToggle.addEventListener('change', (e) => {
            gameState.settings.showTutorial = e.target.checked;
        });
    }

    // Friends/social UI
    setupFriendsUI();
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyRelease);
    
    // Canvas click/touch handlers
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    canvas.addEventListener('mousemove', handleCanvasHover);
    canvas.style.cursor = 'default';
    
    // Add mobile-specific class to body if on mobile
    if (isMobile) {
        document.body.classList.add('mobile');
        
        // Prevent pull-to-refresh on mobile
        document.body.addEventListener('touchmove', function(e) {
            if (e.target === canvas) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Biography popup close buttons
    const closeBioBtn = document.getElementById('close-bio-btn');
    if (closeBioBtn) {
        closeBioBtn.addEventListener('click', closeBiography);
    }
    
    const closeEmersonBioBtn = document.getElementById('close-emerson-bio-btn');
    if (closeEmersonBioBtn) {
        closeEmersonBioBtn.addEventListener('click', closeEmersonBiography);
    }
    
    const closeCabinInfoBtn = document.getElementById('close-cabin-info-btn');
    if (closeCabinInfoBtn) {
        closeCabinInfoBtn.addEventListener('click', closeCabinInfo);
    }

    const catConfirmClose = document.getElementById('close-cat-confirm');
    if (catConfirmClose) {
        catConfirmClose.addEventListener('click', closeCatConfirm);
    }

    const catConfirmOpenPage = document.getElementById('cat-confirm-open-page');
    if (catConfirmOpenPage) {
        catConfirmOpenPage.addEventListener('click', () => {
            closeCatConfirm();
            soundManager.playCatMusic();
            openCatPage();
        });
    }
    
    // Display user profile button if logged in
    if (typeof displayUserInfo === 'function') {
        displayUserInfo();
    }
    
    // Initialize particles
    createParticles();
    
    // Show main menu
    showMainMenu();
}

function handleCanvasClick(e) {
    if (gameState.mode !== 'story' && gameState.mode !== 'freeplay') return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coordinates to canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // Check cat can first (sits near Thoreau)
    if (canvasX >= catCanClickArea.x &&
        canvasX <= catCanClickArea.x + catCanClickArea.width &&
        canvasY >= catCanClickArea.y &&
        canvasY <= catCanClickArea.y + catCanClickArea.height) {
        openCatConfirm();
        return;
    }

    // Check if click is on Thoreau
    if (canvasX >= thoreauClickArea.x && 
        canvasX <= thoreauClickArea.x + thoreauClickArea.width &&
        canvasY >= thoreauClickArea.y && 
        canvasY <= thoreauClickArea.y + thoreauClickArea.height) {
        openBiography();
        return;
    }
    
    // Check if click is on Emerson
    if (canvasX >= emersonClickArea.x && 
        canvasX <= emersonClickArea.x + emersonClickArea.width &&
        canvasY >= emersonClickArea.y && 
        canvasY <= emersonClickArea.y + emersonClickArea.height) {
        openEmersonBiography();
        return;
    }
    
    // Check if click is on Cabin
    if (canvasX >= cabinClickArea.x && 
        canvasX <= cabinClickArea.x + cabinClickArea.width &&
        canvasY >= cabinClickArea.y && 
        canvasY <= cabinClickArea.y + cabinClickArea.height) {
        openCabinInfo();
        return;
    }
}

function handleCanvasHover(e) {
    if (gameState.mode !== 'story' && gameState.mode !== 'freeplay') return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // Check if hovering over any clickable element
    const overThoreau = canvasX >= thoreauClickArea.x && 
        canvasX <= thoreauClickArea.x + thoreauClickArea.width &&
        canvasY >= thoreauClickArea.y && 
        canvasY <= thoreauClickArea.y + thoreauClickArea.height;
        
    const overEmerson = canvasX >= emersonClickArea.x && 
        canvasX <= emersonClickArea.x + emersonClickArea.width &&
        canvasY >= emersonClickArea.y && 
        canvasY <= emersonClickArea.y + emersonClickArea.height;
        
    const overCabin = canvasX >= cabinClickArea.x && 
        canvasX <= cabinClickArea.x + cabinClickArea.width &&
        canvasY >= cabinClickArea.y && 
        canvasY <= cabinClickArea.y + cabinClickArea.height;

    const overCatCan = canvasX >= catCanClickArea.x &&
        canvasX <= catCanClickArea.x + catCanClickArea.width &&
        canvasY >= catCanClickArea.y &&
        canvasY <= catCanClickArea.y + catCanClickArea.height;
    
    if (overThoreau || overEmerson || overCabin || overCatCan) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
}

function openBiography() {
    soundManager.play('dialogOpen');
   // soundManager.playCatMusic();
    document.getElementById('biography-popup').classList.remove('hidden');
}

function closeBiography() {
    soundManager.play('menuClose');
  //  soundManager.stopCatMusic();
    document.getElementById('biography-popup').classList.add('hidden');
}

function openEmersonBiography() {
    soundManager.play('dialogOpen');
    document.getElementById('emerson-biography-popup').classList.remove('hidden');
}

function closeEmersonBiography() {
    soundManager.play('menuClose');
    document.getElementById('emerson-biography-popup').classList.add('hidden');
}

function openCabinInfo() {
    soundManager.play('dialogOpen');
    document.getElementById('cabin-info-popup').classList.remove('hidden');
}

function closeCabinInfo() {
    soundManager.play('menuClose');
    document.getElementById('cabin-info-popup').classList.add('hidden');
}

function openCatConfirm() {
    const modal = document.getElementById('cat-confirm-popup');
    if (modal) {
        modal.classList.remove('hidden');
        soundManager.play('menuOpen');
    }
}

function closeCatConfirm() {
    const modal = document.getElementById('cat-confirm-popup');
    if (modal) {
        modal.classList.add('hidden');
        soundManager.play('menuClose');
    }
}

function openCatPage() {
    window.location.href = 'thoreau-cats.html';
}

function showMainMenu() {
    // Reset escape menu state
    gameState.escapeMenuOpen = false;
    isHoldingBar = false;
    
    // Hide any open menus
    const escapeMenu = document.getElementById('escape-menu');
    const settingsMenu = document.getElementById('settings-menu');
    if (escapeMenu) escapeMenu.classList.add('hidden');
    if (settingsMenu) settingsMenu.classList.add('hidden');
    
    // Hide all screens
    const screens = ['game-screen', 'ending-screen', 'collection-screen', 'main-menu'];
    screens.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) {
            element.classList.remove('active');
            if (screenId === 'main-menu') {
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        }
    });
    
    // Show main menu
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        mainMenu.classList.add('active');
    }
    
    // Show/hide profile button based on auth
    const viewProfileBtn = document.getElementById('view-profile-btn');
    const isAuth = typeof isAuthenticated === 'function' && isAuthenticated();
    if (viewProfileBtn) {
        viewProfileBtn.style.display = isAuth ? 'flex' : 'none';
    }
    
    // Start menu particles
    if (typeof initMenuParticles === 'function') {
        initMenuParticles();
    }
    
    // Display user info if logged in
    if (typeof displayUserInfo === 'function') {
        displayUserInfo();
    }
    
    // Restore menu-only chrome (friends toggle, logout pill)
    setInGameChromeVisibility(true);
    
    gameState.mode = 'menu';
}

function hideMainMenu() {
    // Stop menu particles when leaving
    if (typeof stopMenuParticles === 'function') {
        stopMenuParticles();
    }
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        mainMenu.classList.remove('active');
        mainMenu.style.display = 'none';
    }
}

function startStoryMode() {
    // Ensure other overlays are hidden
    hideCollectionScreen();
    
    hideMainMenu();
    gameState.mode = 'story';
    resetGameState();
    document.getElementById('main-menu').classList.remove('active');
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
        gameScreen.classList.add('active');
        gameScreen.style.display = 'flex'; // override any inline display:none
    }
    
    // Ensure canvas is properly sized
    resizeCanvas();
    
    // Show status bar for story mode
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        statusBar.style.display = 'flex';
    }
    setInGameChromeVisibility(false);
    
    // Start music and ambient sounds
    soundManager.playMusic();
    soundManager.playAmbient();
    
    // Only start game loop if not already running
    if (!gameLoopRunning) {
        gameLoopRunning = true;
        gameLoop();
    }
}

function startFreePlayMode() {
    // Ensure other overlays are hidden
    hideCollectionScreen();
    
    hideMainMenu();
    gameState.mode = 'freeplay';
    resetGameState();
    document.getElementById('main-menu').classList.remove('active');
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
        gameScreen.classList.add('active');
        gameScreen.style.display = 'flex'; // override any inline display:none
    }
    
    // Ensure canvas is properly sized
    resizeCanvas();
    
    // Hide legacies counter in free play
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        statusBar.style.display = 'none';
    }
    setInGameChromeVisibility(false);
    
    // Start music and ambient sounds
    soundManager.playMusic();
    soundManager.playAmbient();
    
    // Only start game loop if not already running
    if (!gameLoopRunning) {
        gameLoopRunning = true;
        gameLoop();
    }
}

function viewCollection() {
    showCollectionScreen();
}

function backToMenu() {
    showMainMenu();
}

// Show/hide UI chrome that should not appear during gameplay (friends toggle, logout/user pill)
function setInGameChromeVisibility(showMenuChrome) {
    const friendsToggle = document.getElementById('friends-toggle');
    if (friendsToggle) {
        friendsToggle.style.display = showMenuChrome ? 'inline-flex' : 'none';
    }
    const userInfo = document.getElementById('user-info-display');
    if (userInfo) {
        userInfo.style.display = showMenuChrome ? 'flex' : 'none';
    }
}

function resetGameState() {
    gameState.phase = 0;
    gameState.fishCaught = 0;
    gameState.legacies = [];
    gameState.choices = {};
    gameState.isFishing = false;
    gameState.canFish = true;
    gameState.escapeMenuOpen = false;
    gameState.atmosphere = {
        brightness: 1.0,
        fog: 0.0,
        soundEnabled: true
    };
    gameState.fishingMinigame = {
        active: false,
        progress: 0,
        tension: 0,
        fishDirection: '↑',
        playerDirection: null,
        directionChangeTimer: 0,
        reelCooldown: 0,
        difficulty: 1,
        currentFish: null,
        lineBroken: false
    };
    
    // Reset global variables
    isHoldingBar = false;
    particles = [];
    fishingLine = null;
    bobber = null;
    
    // Hide any open menus
    const escapeMenu = document.getElementById('escape-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const fishingMinigame = document.getElementById('fishing-minigame');
    const fishingPrompt = document.getElementById('fishing-prompt');
    
    if (escapeMenu) escapeMenu.classList.add('hidden');
    if (settingsMenu) settingsMenu.classList.add('hidden');
    if (fishingMinigame) fishingMinigame.classList.add('hidden');
    if (fishingPrompt) fishingPrompt.classList.remove('hidden');
    
    createParticles();
}

function restartGame() {
    document.getElementById('ending-screen').classList.remove('active');
    showMainMenu();
}

function handleKeyPress(e) {
    // Escape menu
    if (e.code === 'Escape') {
        e.preventDefault();
        toggleEscapeMenu();
        return;
    }
    
    // Don't process other keys if escape menu is open
    if (gameState.escapeMenuOpen) {
        return;
    }
    
    if ((e.code === 'KeyF' || e.key === 'f' || e.key === 'F') && gameState.canFish && !gameState.isFishing) {
        e.preventDefault();
        startFishing();
    }
    
    // Bar fishing minigame controls (Space to raise bar)
    if (gameState.fishingMinigame.active) {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            gameState.isHoldingBar = true;
            return; // Stop event from propagating
        }
    }
    
    // Prevent space from doing anything else in the game
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        return; // Block all other space bar actions
    }
}

function handleKeyRelease(e) {
    // Release bar control
    if (gameState.fishingMinigame.active) {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            gameState.isHoldingBar = false;
        }
    }
}

function handleCanvasTouchStart(e) {
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Scale coordinates to canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // Check clickable areas (same as mouse click)
    if (gameState.mode === 'story' || gameState.mode === 'freeplay') {
        if (canvasX >= thoreauClickArea.x && 
            canvasX <= thoreauClickArea.x + thoreauClickArea.width &&
            canvasY >= thoreauClickArea.y && 
            canvasY <= thoreauClickArea.y + thoreauClickArea.height) {
            openBiography();
            return;
        }
        
        if (canvasX >= emersonClickArea.x && 
            canvasX <= emersonClickArea.x + emersonClickArea.width &&
            canvasY >= emersonClickArea.y && 
            canvasY <= emersonClickArea.y + emersonClickArea.height) {
            openEmersonBiography();
            return;
        }
        
        if (canvasX >= cabinClickArea.x && 
            canvasX <= cabinClickArea.x + cabinClickArea.width &&
            canvasY >= cabinClickArea.y && 
            canvasY <= cabinClickArea.y + cabinClickArea.height) {
            openCabinInfo();
            return;
        }
        
        // If not clicking any character, treat as fishing cast or minigame control
        if (gameState.canFish && !gameState.isFishing) {
            startFishing();
        }
    }
}

function toggleEscapeMenu() {
    const escapeMenu = document.getElementById('escape-menu');
    
    if (gameState.mode === 'menu' || gameState.mode === 'collection') {
        // Don't show escape menu on main menu or collection screen
        return;
    }
    
    gameState.escapeMenuOpen = !gameState.escapeMenuOpen;
    
    if (gameState.escapeMenuOpen) {
        soundManager.play('menuOpen');
        escapeMenu.classList.remove('hidden');
    } else {
        soundManager.play('menuClose');
        escapeMenu.classList.add('hidden');
    }
}

function resumeGame() {
    gameState.escapeMenuOpen = false;
    soundManager.play('menuClose');
    document.getElementById('escape-menu').classList.add('hidden');
}

function returnToMainMenu() {
    gameState.escapeMenuOpen = false;
    document.getElementById('escape-menu').classList.add('hidden');
    soundManager.stopAmbient();
    showMainMenu();
}

function openSettings() {
    soundManager.play('menuOpen');
    document.getElementById('escape-menu').classList.add('hidden');
    document.getElementById('settings-menu').classList.remove('hidden');
}

function closeSettings() {
    soundManager.play('menuClose');
    document.getElementById('settings-menu').classList.add('hidden');
    document.getElementById('escape-menu').classList.remove('hidden');
}

// Fullscreen toggle
function toggleFullscreen() {
    soundManager.play('buttonClick');
    
    if (!document.fullscreenElement) {
        // Enter fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Friends / social UI
function setupFriendsUI() {
    const toggleBtn = document.getElementById('friends-toggle');
    const panel = document.getElementById('friends-panel');
    const closeBtn = document.getElementById('friends-close');
    const searchInput = document.getElementById('friend-search-input');
    const searchBtn = document.getElementById('friend-search-btn');
    const statusEl = document.getElementById('friend-search-status');

    if (!toggleBtn || !panel) return;

    const setStatus = (text, tone = 'muted') => {
        if (!statusEl) return;
        statusEl.textContent = text || '';
        statusEl.style.color = tone === 'error' ? '#f7b2a5' : '#c9d5d1';
    };

    const openPanel = () => {
        soundManager.play('menuOpen');
        panel.classList.remove('hidden');
        fetchAndRenderSocial();
    };

    const closePanel = () => {
        soundManager.play('menuClose');
        panel.classList.add('hidden');
    };

    toggleBtn.addEventListener('click', () => {
        if (panel.classList.contains('hidden')) {
            openPanel();
        } else {
            closePanel();
        }
    });

    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    const renderList = (targetId, items, emptyText) => {
        const container = document.getElementById(targetId);
        if (!container) return;
        if (!items || !items.length) {
            container.innerHTML = `<div class="friend-stats">${emptyText}</div>`;
            return;
        }

        container.innerHTML = items.map(user => {
            const avatar = getAvatarGlyph(user.avatar, user.nickname);
            const stats = `${user.totalFishCaught || 0} fish • ${user.totalLegacies || 0} legacies`;
            const badge = user.isFriend ? '<span class="friend-pill">Friend</span>' : '';
            return `
                <div class="friend-card">
                    <div class="friend-meta">
                        <div class="friend-avatar">${avatar}</div>
                        <div>
                            <div class="friend-name">${user.nickname}</div>
                            <div class="friend-stats">${stats}</div>
                        </div>
                    </div>
                    ${badge}
                </div>`;
        }).join('');
    };

    const renderSearchResults = (results) => {
        const container = document.getElementById('friend-search-results');
        if (!container) return;
        if (!results || !results.length) {
            container.innerHTML = '<div class="friend-stats">No players found. Try a different nickname.</div>';
            return;
        }
        container.innerHTML = '';
        results.forEach(user => {
            const card = document.createElement('div');
            card.className = 'friend-card';
            const avatar = getAvatarGlyph(user.avatar, user.nickname);
            const stats = `${user.totalFishCaught || 0} fish • ${user.totalLegacies || 0} legacies`;
            const mutual = !!user.subscribesToMe && !!user.isSubscribed;

            const actionState = mutual ? 'Friends' : (user.isSubscribed ? 'Subscribed' : 'Subscribe');
            const disabled = actionState !== 'Subscribe';

            card.innerHTML = `
                <div class="friend-meta">
                    <div class="friend-avatar">${avatar}</div>
                    <div>
                        <div class="friend-name">${user.nickname}</div>
                        <div class="friend-stats">${stats}</div>
                        ${mutual ? '<span class="friend-pill">Friend</span>' : (user.subscribesToMe ? '<span class="friend-pill">Follows you</span>' : '')}
                    </div>
                </div>
            `;

            const btn = document.createElement('button');
            btn.className = 'friend-action';
            btn.textContent = actionState;
            btn.disabled = disabled;

            btn.addEventListener('click', async () => {
                try {
                    btn.disabled = true;
                    btn.textContent = '...';
                    const resp = await subscribeToUser(user.nickname);
                    if (!resp.success && resp.error) {
                        setStatus(resp.error, 'error');
                    } else {
                        setStatus('Subscribed');
                        await fetchAndRenderSocial();
                        await performSearch();
                    }
                } catch (err) {
                    console.error('Subscribe failed', err);
                    setStatus('Could not subscribe', 'error');
                }
            });

            card.appendChild(btn);
            container.appendChild(card);
        });
    };

    const performSearch = async () => {
        const term = (searchInput?.value || '').trim();
        if (term.length < 2) {
            setStatus('Type at least 2 characters to search');
            return;
        }
        setStatus('Searching...');
        try {
            const result = await searchUsersByNickname(term);
            if (result.error) {
                setStatus(result.error, 'error');
                return;
            }
            renderSearchResults(result.results || []);
            setStatus('');
        } catch (err) {
            console.error('Search failed', err);
            setStatus('Search failed', 'error');
        }
    };

    const fetchAndRenderSocial = async () => {
        try {
            const res = await fetchFriendsAndSubscriptions();
            if (!res || res.error) {
                setStatus(res?.error || 'Unable to load friends', 'error');
                return;
            }
            gameState.social.friends = res.friends || [];
            gameState.social.subscriptions = res.subscriptions || [];

            document.getElementById('friends-count').textContent = gameState.social.friends.length;
            document.getElementById('subscriptions-count').textContent = gameState.social.subscriptions.length;

            // Mark mutual flag for friends list
            const friends = gameState.social.friends.map(f => ({ ...f, isFriend: true }));
            renderList('friends-list', friends, 'No friends yet. Mutual subscriptions will appear here.');

            const subs = gameState.social.subscriptions.map(s => ({ ...s, isFriend: !!s.isFriend }));
            renderList('subscriptions-list', subs, 'You have not subscribed to anyone yet.');
        } catch (err) {
            console.error('Error loading social data', err);
            setStatus('Unable to load social data', 'error');
        }
    };

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Initial load to populate counters
    fetchAndRenderSocial();
}

function getAvatarGlyph(avatar, nickname) {
    if (avatarEmojis && avatarEmojis[avatar]) return avatarEmojis[avatar];
    return (nickname || '?').charAt(0).toUpperCase();
}

// Update fullscreen button text
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
document.addEventListener('msfullscreenchange', updateFullscreenButton);

function updateFullscreenButton() {
    const fullscreenText = document.getElementById('fullscreen-text');
    if (fullscreenText) {
        if (document.fullscreenElement) {
            fullscreenText.textContent = 'Exit Fullscreen';
        } else {
            fullscreenText.textContent = 'Enter Fullscreen';
        }
    }
    
    // Resize canvas when entering/exiting fullscreen
    resizeCanvas();
}

// Canvas resize handler with proper aspect ratio
function resizeCanvas() {
    if (!canvas) return;
    
    // Use a 16:10 aspect ratio (like 1600x1000) for nice widescreen gameplay
    const targetAspect = 16 / 10;
    const windowAspect = window.innerWidth / window.innerHeight;
    
    if (windowAspect > targetAspect) {
        // Window is wider - use height
        canvas.height = window.innerHeight;
        canvas.width = canvas.height * targetAspect;
    } else {
        // Window is taller - use width
        canvas.width = window.innerWidth;
        canvas.height = canvas.width / targetAspect;
    }

    // Regenerate procedural scene layout for the new size
    sceneLayout = null;
    shoreCache = null;
    generateSceneLayout();

    // Update click areas for interactive elements
    updateClickAreas();
}

function updateClickAreas() {
    // Update Thoreau click area
    thoreauClickArea.x = canvas.width * 0.15;
    thoreauClickArea.y = canvas.height * 0.35;
    thoreauClickArea.width = canvas.width * 0.12;
    thoreauClickArea.height = canvas.height * 0.4;
    
    // Update Emerson click area
    emersonClickArea.x = canvas.width * 0.7;
    emersonClickArea.y = canvas.height * 0.35;
    emersonClickArea.width = canvas.width * 0.12;
    emersonClickArea.height = canvas.height * 0.4;
    
    // Update cabin click area
    cabinClickArea.x = canvas.width * 0.05;
    cabinClickArea.y = canvas.height * 0.25;
    cabinClickArea.width = canvas.width * 0.15;
    cabinClickArea.height = canvas.height * 0.25;
}

// Enhanced fishing minigame with new mechanics
const fishingDirections = ['↑', '↓', '←', '→'];
const directionKeys = {
    'w': '↑', 'W': '↑', 'KeyW': '↑', 'ArrowUp': '↑',
    's': '↓', 'S': '↓', 'KeyS': '↓', 'ArrowDown': '↓',
    'a': '←', 'A': '←', 'KeyA': '←', 'ArrowLeft': '←',
    'd': '→', 'D': '→', 'KeyD': '→', 'ArrowRight': '→'
};

// Track player input
let playerDirection = null;
let canReel = false;

// Old fishing control (deprecated but kept for compatibility)
document.addEventListener('mousedown', (e) => {
    if (gameState.fishingMinigame.active) {
        gameState.isHoldingBar = true;
    }
});

document.addEventListener('mouseup', (e) => {
    gameState.isHoldingBar = false;
});

document.addEventListener('touchstart', (e) => {
    if (gameState.fishingMinigame.active && !e.target.closest('.close-bio-btn')) {
        gameState.isHoldingBar = true;
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    gameState.isHoldingBar = false;
}, { passive: true });

function startFishing() {
    if (!gameState.canFish) return;
    
    gameState.isFishing = true;
    document.getElementById('fishing-prompt').classList.add('hidden');
    
    // Play casting sound
    soundManager.play('castLine');
    
    // Create fishing line animation
    fishingLine = {
        startX: canvas.width * 0.7,
        startY: canvas.height * 0.6,
        endX: canvas.width * 0.5,
        endY: canvas.height * 0.8,
        progress: 0,
        castTime: 0
    };
    
    // Wait for line to be cast, then start minigame
    setTimeout(() => {
        soundManager.play('waterSplash');
        startFishingMinigame();
    }, 1500);
}

function startFishingMinigame() {
    // Select a random fish
    if (gameState.mode === 'freeplay') {
        const rarityRoll = Math.random();
        let availableFish;
        
        if (rarityRoll < 0.5) {
            availableFish = fishSpecies.filter(f => f.rarity === 'common');
        } else if (rarityRoll < 0.8) {
            availableFish = fishSpecies.filter(f => f.rarity === 'uncommon');
        } else if (rarityRoll < 0.95) {
            availableFish = fishSpecies.filter(f => f.rarity === 'rare');
        } else {
            availableFish = fishSpecies.filter(f => f.rarity === 'legendary');
        }
        
        gameState.fishingMinigame.currentFish = availableFish[Math.floor(Math.random() * availableFish.length)];
    }
    
    // Initialize fishing minigame with bar mechanics
    const minigame = gameState.fishingMinigame;
    minigame.active = true;
    minigame.progress = 0;
    minigame.fishPosition = 50;
    minigame.barPosition = 50;
    minigame.barVelocity = 0;
    minigame.fishVelocity = 0;
    minigame.fishTarget = 50;
    minigame.fishBehavior = chooseFishBehavior();
    minigame.behaviorTimer = 120 + Math.floor(Math.random() * 180); // 2-5 seconds
    minigame.combo = 0;
    minigame.comboTimer = 0;
    minigame.perfectCatchWindow = 0;
    
    // Set default difficulty and bar size
    minigame.difficulty = 1;
    minigame.barSize = 25; // Smaller bar for more challenge
    
    // Adjust difficulty based on fish rarity (if in free play mode)
    if (minigame.currentFish) {
        switch(minigame.currentFish.rarity) {
            case 'legendary':
                minigame.difficulty = 2.5;
                minigame.barSize = 18; // Very small for legendary
                break;
            case 'rare':
                minigame.difficulty = 2;
                minigame.barSize = 22;
                break;
            case 'uncommon':
                minigame.difficulty = 1.5;
                minigame.barSize = 25;
                break;
            default:
                minigame.difficulty = 1;
                minigame.barSize = 28; // Slightly bigger for common
        }
    }
    
    gameState.isHoldingBar = false;
    
    document.getElementById('fishing-minigame').classList.remove('hidden');
    
    // Update fish name display
    const fishNameDisplay = document.getElementById('fish-name-display');
    if (fishNameDisplay && minigame.currentFish) {
        fishNameDisplay.textContent = `Catching ${minigame.currentFish.name}...`;
    }
    
    soundManager.play('fishBite');
    updateBehaviorHint();
}

// Choose fish behavior pattern
function chooseFishBehavior() {
    const behaviors = ['steady', 'erratic', 'jumpy', 'slow'];
    return behaviors[Math.floor(Math.random() * behaviors.length)];
}

// Update the behavior hint text
function updateBehaviorHint() {
    const hint = document.getElementById('behavior-hint');
    if (!hint) return;
    
    const behavior = gameState.fishingMinigame.fishBehavior;
    const hints = {
        steady: 'Moves smoothly and predictably',
        erratic: 'Darts around unpredictably!',
        jumpy: 'Makes sudden movements!',
        slow: 'Moves leisurely and calmly'
    };
    
    hint.textContent = hints[behavior] || 'Watch its movements...';
}

// Lightweight deterministic random generator for layout composition
function createPRNG(seed) {
    return function() {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    };
}

// Generate a grounded layout for trees, reeds, lily pads, and shoreline details
function generateSceneLayout() {
    if (!canvas) return;
    const rng = createPRNG(Math.floor(canvas.width * 7 + canvas.height * 13));
    const scale = canvas.height / 600;
    const waterline = canvas.height * 0.65;

    // Lily pads cluster into quiet coves, leaving the dock side clear
    const lilyPads = [];
    const lilyClusters = [
        { center: canvas.width * 0.2, count: 3, spread: 55 * scale },
        { center: canvas.width * 0.46, count: 2, spread: 45 * scale },
        { center: canvas.width * 0.72, count: 3, spread: 60 * scale }
    ];
    lilyClusters.forEach(cluster => {
        for (let i = 0; i < cluster.count; i++) {
            const jitterX = (rng() - 0.5) * cluster.spread;
            const jitterY = (rng() - 0.5) * 18 * scale;
            const size = (16 + rng() * 10) * scale;
            lilyPads.push({
                x: cluster.center + jitterX,
                y: waterline + 60 * scale + jitterY,
                size
            });
        }
    });

    // Reeds group near shallows and bay edges
    const reeds = [];
    const reedAnchors = [0.16, 0.3, 0.56, 0.74, 0.9];
    reedAnchors.forEach(anchor => {
        const baseX = canvas.width * anchor + (rng() - 0.5) * 30 * scale;
        const clusterHeights = [36 + rng() * 12, 42 + rng() * 12, 34 + rng() * 12];
        reeds.push({ x: baseX, heights: clusterHeights });
    });

    // Tree bands frame the cabin and dock, mixing pines and oaks for maturity
    const trees = [];
    const treeBands = [
        { start: 0.08, end: 0.3, count: 4, primary: 'pine' },
        { start: 0.34, end: 0.52, count: 3, primary: 'oak' },
        { start: 0.6, end: 0.9, count: 4, primary: 'pine' }
    ];
    treeBands.forEach(band => {
        for (let i = 0; i < band.count; i++) {
            const t = band.start + rng() * (band.end - band.start);
            const mixed = rng();
            let type = band.primary;
            if (band.primary === 'pine' && mixed > 0.55) type = 'oak';
            if (band.primary === 'oak' && mixed > 0.65) type = 'pine';
            const scaleMod = type === 'pine' ? 1.05 : 1;
            trees.push({
                x: canvas.width * t,
                scale: (0.72 + rng() * 0.3) * scaleMod,
                type
            });
        }
    });
    trees.sort((a, b) => a.x - b.x);

    // Shoreline detail: pebbles and tufts in the walking path leading to the dock
    const shoreDetails = { pebbles: [], tufts: [] };
    const shoreStart = canvas.width * 0.55;
    const shoreWidth = canvas.width * 0.42;
    for (let i = 0; i < 55; i++) {
        shoreDetails.pebbles.push({
            x: shoreStart + rng() * shoreWidth,
            y: waterline - 12 * scale + rng() * canvas.height * 0.06,
            size: (1 + rng() * 2) * scale,
            color: rng() > 0.5 ? '#2a3a1a' : '#3a4a2a'
        });
    }
    for (let i = 0; i < 16; i++) {
        shoreDetails.tufts.push({
            x: shoreStart + rng() * shoreWidth,
            y: waterline - 8 * scale + rng() * canvas.height * 0.05,
            width: (10 + rng() * 12) * scale,
            height: (12 + rng() * 10) * scale
        });
    }

    sceneLayout = { lilyPads, reeds, trees, shoreDetails };
    // Reset auxiliary shoreline caches (grass/flowers) now that sizing changed
    shoreCache = null;
}

function ensureSceneLayout() {
    if (!sceneLayout) generateSceneLayout();
}

function updateFishingMinigame() {
    if (!gameState.fishingMinigame.active || gameState.escapeMenuOpen) return;
    
    const minigame = gameState.fishingMinigame;
    
    // Update fish AI behavior
    updateFishAI(minigame);
    
    // Update bar position based on player input
    updateBarPosition(minigame);
    
    // Check if fish is in the bar
    const fishInBar = isFishInBar(minigame);
    
    // Debug logging (temporary - remove after testing)
    if (Math.random() < 0.02) { // Log occasionally to avoid spam
        console.log('Fish:', minigame.fishPosition.toFixed(1), 
                    'Bar:', minigame.barPosition.toFixed(1), '-', (minigame.barPosition + minigame.barSize).toFixed(1),
                    'InBar:', fishInBar,
                    'Progress:', minigame.progress.toFixed(1));
    }
    
    // Update progress
    if (fishInBar) {
        // Fish is caught in bar - progress increases
        const progressGain = 0.8 + (minigame.combo * 0.15); // Increased gain for faster catching
        minigame.progress = Math.min(100, minigame.progress + progressGain);
        
        // Build combo
        minigame.comboTimer++;
        if (minigame.comboTimer > 30) { // 0.5 second in bar
            minigame.combo++;
            minigame.comboTimer = 0;
            if (minigame.combo % 3 === 0) {
                soundManager.play('success');
            }
        }
        
        // Always show combo display when fish is in bar
        showComboIndicator(Math.max(1, minigame.combo));
        
        // Check for perfect catch (fish centered in bar)
        const fishCenter = minigame.fishPosition;
        const barCenter = minigame.barPosition + (minigame.barSize / 2);
        const distance = Math.abs(fishCenter - barCenter);
        
        if (distance < 8) { // Very centered (increased tolerance)
            minigame.perfectCatchWindow++;
            if (minigame.perfectCatchWindow === 30) { // Half second of perfect
                showQualityIndicator('Perfect!');
                minigame.progress = Math.min(100, minigame.progress + 5); // Bonus
                soundManager.play('success');
            }
        } else {
            minigame.perfectCatchWindow = 0;
        }
    } else {
        // Fish escaped bar - progress decreases slowly, combo resets
        minigame.progress = Math.max(0, minigame.progress - 0.15);
        if (minigame.combo > 0) {
            minigame.combo = 0;
            minigame.comboTimer = 0;
            showComboIndicator(0); // Hide combo display
        }
        minigame.perfectCatchWindow = 0;
    }
    
    // Update UI
    updateFishingUI();
    
    // Win condition
    if (minigame.progress >= 100) {
        // Calculate quality based on combo
        const quality = minigame.combo > 10 ? 'perfect' : (minigame.combo > 5 ? 'great' : 'good');
        endFishingMinigame(true, quality);
    }
}

// Update fish AI movement
function updateFishAI(minigame) {
    // Update behavior timer
    minigame.behaviorTimer--;
    if (minigame.behaviorTimer <= 0) {
        minigame.fishBehavior = chooseFishBehavior();
        minigame.behaviorTimer = 120 + Math.floor(Math.random() * 180);
        updateBehaviorHint();
    }
    
    // Fish movement based on behavior
    const behavior = minigame.fishBehavior;
    const diff = minigame.difficulty;
    
    switch(behavior) {
        case 'steady':
            // Pick new target occasionally
            if (Math.random() < 0.02 * diff) {
                minigame.fishTarget = 20 + Math.random() * 60; // Stay in middle area mostly
            }
            // Move toward target smoothly
            const steadyDiff = minigame.fishTarget - minigame.fishPosition;
            minigame.fishVelocity += steadyDiff * 0.02 * diff;
            break;
            
        case 'erratic':
            // Sudden direction changes
            if (Math.random() < 0.04 * diff) {
                minigame.fishVelocity = (Math.random() - 0.5) * 10 * diff;
            }
            break;
            
        case 'jumpy':
            // Sudden jumps to new positions
            if (Math.random() < 0.03 * diff) {
                minigame.fishTarget = 10 + Math.random() * 80;
                const jumpDiff = minigame.fishTarget - minigame.fishPosition;
                minigame.fishVelocity = jumpDiff * 0.2 * diff;
            }
            break;
            
        case 'slow':
            // Very gradual movement
            if (Math.random() < 0.015 * diff) {
                minigame.fishTarget = 25 + Math.random() * 50;
            }
            const slowDiff = minigame.fishTarget - minigame.fishPosition;
            minigame.fishVelocity += slowDiff * 0.008 * diff;
            break;
    }
    
    // Apply velocity damping
    minigame.fishVelocity *= 0.90;
    
    // Clamp velocity
    minigame.fishVelocity = Math.max(-4, Math.min(4, minigame.fishVelocity));
    
    // Update fish position
    minigame.fishPosition += minigame.fishVelocity;
    minigame.fishPosition = Math.max(0, Math.min(100, minigame.fishPosition));
}

// Update bar position based on player input
function updateBarPosition(minigame) {
    const maxPosition = 100 - minigame.barSize;
    
    if (gameState.isHoldingBar) {
        // Bar rises when holding space - very slow and controlled
        minigame.barVelocity -= 0.8;
    } else {
        // Bar falls due to gravity - very slow and controlled
        minigame.barVelocity += 0.7;
    }
    
    // Apply damping for smoother movement - very high for maximum smoothness
    minigame.barVelocity *= 0.96;
    
    // Update position BEFORE clamping
    minigame.barPosition += minigame.barVelocity;
    
    // Clamp position to valid range and reset velocity if hitting bounds
    if (minigame.barPosition <= 0) {
        minigame.barPosition = 0;
        minigame.barVelocity = Math.max(0, minigame.barVelocity); // Only allow upward velocity
    } else if (minigame.barPosition >= maxPosition) {
        minigame.barPosition = maxPosition;
        minigame.barVelocity = Math.min(0, minigame.barVelocity); // Only allow downward velocity
    }
    
    // Final safety clamp
    minigame.barPosition = Math.max(0, Math.min(maxPosition, minigame.barPosition));
}

// Check if fish is within the green bar
function isFishInBar(minigame) {
    const fishPos = minigame.fishPosition;
    const barTop = minigame.barPosition;
    const barBottom = minigame.barPosition + minigame.barSize;
    
    return fishPos >= barTop && fishPos <= barBottom;
}

// Show quality indicator (Perfect, Great, etc.)
function showQualityIndicator(text) {
    const indicator = document.getElementById('quality-indicator');
    if (!indicator) return;
    
    const qualityText = indicator.querySelector('.quality-text');
    if (qualityText) {
        qualityText.textContent = text;
    }
    
    indicator.classList.remove('show');
    void indicator.offsetWidth; // Force reflow
    indicator.classList.add('show');
    
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 600);
}

// Show combo indicator
function showComboIndicator(combo) {
    const comboDisplay = document.getElementById('combo-display');
    if (!comboDisplay) return;
    
    if (combo >= 1) {
        comboDisplay.classList.add('active');
        
        // Pulse effect on combo increase
        const comboCount = document.getElementById('combo-count');
        if (comboCount) {
            comboCount.style.animation = 'none';
            setTimeout(() => {
                comboCount.style.animation = 'comboCountPulse 0.5s ease-out';
            }, 10);
        }
    } else {
        comboDisplay.classList.remove('active');
    }
}

function updateFishingUI() {
    const minigame = gameState.fishingMinigame;
    
    // Ensure positions are valid before updating UI
    const maxBarPosition = 100 - minigame.barSize;
    minigame.barPosition = Math.max(0, Math.min(maxBarPosition, minigame.barPosition));
    minigame.fishPosition = Math.max(0, Math.min(100, minigame.fishPosition));
    
    // Update fish position on track
    const fishIcon = document.getElementById('fish-icon');
    if (fishIcon) {
        fishIcon.style.top = `${minigame.fishPosition}%`;
    }
    
    // Update bar position on track
    const bar = document.getElementById('fishing-bar');
    if (bar) {
        bar.style.top = `${minigame.barPosition}%`;
        bar.style.height = `${minigame.barSize}%`;
        
        // Visual feedback when fish is in bar
        const fishInBar = isFishInBar(minigame);
        if (fishInBar) {
            bar.style.borderColor = '#5fdc7f';
            bar.style.boxShadow = '0 0 30px rgba(95, 220, 127, 1)';
        } else {
            bar.style.borderColor = '#ff6b6b';
            bar.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.7)';
        }
    }
    
    // Update progress bar
    const progressBar = document.getElementById('catch-progress-fill');
    const progressPercent = document.getElementById('progress-percentage');
    if (progressBar) {
        progressBar.style.width = `${minigame.progress}%`;
    }
    if (progressPercent) {
        progressPercent.textContent = `${Math.floor(minigame.progress)}%`;
    }
    
    // Update combo display
    const comboCount = document.getElementById('combo-count');
    const comboBarFill = document.getElementById('combo-bar-fill');
    if (comboCount) {
        comboCount.textContent = minigame.combo;
    }
    if (comboBarFill) {
        const comboProgress = Math.min(100, (minigame.comboTimer / 30) * 100);
        comboBarFill.style.width = `${comboProgress}%`;
    }
    
    // Update debug info
    const debugFish = document.getElementById('debug-fish');
    const debugBarStart = document.getElementById('debug-bar-start');
    const debugBarEnd = document.getElementById('debug-bar-end');
    const debugVelocity = document.getElementById('debug-velocity');
    const debugInBar = document.getElementById('debug-in-bar');
    const debugHolding = document.getElementById('debug-holding');
    
    if (debugFish) debugFish.textContent = minigame.fishPosition.toFixed(1);
    if (debugBarStart) debugBarStart.textContent = minigame.barPosition.toFixed(1);
    if (debugBarEnd) debugBarEnd.textContent = (minigame.barPosition + minigame.barSize).toFixed(1);
    if (debugVelocity) debugVelocity.textContent = minigame.barVelocity.toFixed(2);
    if (debugInBar) {
        const fishInBar = isFishInBar(minigame);
        debugInBar.textContent = fishInBar ? 'YES ✓' : 'NO ✗';
        debugInBar.style.color = fishInBar ? '#5fdc7f' : '#ff6b6b';
    }
    if (debugHolding) {
        debugHolding.textContent = gameState.isHoldingBar ? 'YES' : 'NO';
        debugHolding.style.color = gameState.isHoldingBar ? '#5fdc7f' : '#ff6b6b';
    }
}

function endFishingMinigame(success, quality = 'good') {
    gameState.fishingMinigame.active = false;
    document.getElementById('fishing-minigame').classList.add('hidden');
    
    // Hide combo display
    const comboDisplay = document.getElementById('combo-display');
    if (comboDisplay) {
        comboDisplay.classList.remove('active');
    }
    
    // Reset fishing minigame state completely
    gameState.fishingMinigame.progress = 0;
    gameState.fishingMinigame.fishPosition = 50;
    gameState.fishingMinigame.barPosition = 50;
    gameState.fishingMinigame.barVelocity = 0;
    gameState.fishingMinigame.fishVelocity = 0;
    gameState.fishingMinigame.combo = 0;
    gameState.fishingMinigame.comboTimer = 0;
    gameState.fishingMinigame.perfectCatchWindow = 0;
    gameState.isHoldingBar = false;
    
    if (success) {
        soundManager.play('fishCaught');
        
        // Show quality message
        if (quality === 'perfect') {
            showQualityIndicator('Perfect Catch!');
        } else if (quality === 'great') {
            showQualityIndicator('Great Catch!');
        }
        
        setTimeout(() => {
            catchFish();
        }, 500);
    } else {
        // Failed catch
        soundManager.play('waterSplash');
        
        // Reset for another try
        gameState.isFishing = false;
        fishingLine = null;
        bobber = null;
        
        setTimeout(() => {
            enableFishing();
        }, 500);
    }
}

function catchFish() {
    gameState.fishCaught++;
    gameState.isFishing = false;
    fishingLine = null;
    
    document.getElementById('fish-count').textContent = gameState.fishCaught;
    
    if (gameState.mode === 'freeplay') {
        // Free play mode - show fish caught notification
        const fish = gameState.fishingMinigame.currentFish;
        const isNew = !gameState.collection.caught.has(fish.id);
        
        if (isNew) {
            gameState.collection.caught.add(fish.id);
        }
        
        // Sync fish catch to backend
        if (typeof window.onFishCaught === 'function') {
            window.onFishCaught(fish.id, fish.name);
        }
        
        showFishCaughtNotification(fish, isNew);
        
        // Reset for next fish
        setTimeout(() => {
            enableFishing();
        }, 3000);
    } else {
        // Story mode - show phase dialog after catching fish
        const fish = gameState.fishingMinigame.currentFish;
        
        // Sync fish catch to backend (story mode)
        if (fish && typeof window.onFishCaught === 'function') {
            window.onFishCaught(fish.id, fish.name);
        }
        
        if (gameState.phase < phases.length) {
            setTimeout(() => {
                showDialog(gameState.phase);
            }, 1000);
        } else {
            // Game complete
            setTimeout(() => {
                showEnding();
            }, 1000);
        }
    }
}

function showFishCaughtNotification(fish, isNew) {
    const notification = document.getElementById('fish-caught-notification');
    const fishName = document.getElementById('caught-fish-name');
    const fishDesc = document.getElementById('caught-fish-desc');
    const newBadge = document.getElementById('new-fish-badge');
    
    fishName.textContent = `${fish.emoji} ${fish.name}`;
    fishDesc.textContent = fish.description;
    newBadge.style.display = isNew ? 'block' : 'none';
    
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 2800);
}

// Typewriter effect for dialog
let typewriterInterval = null;

function showDialog(phaseIndex) {
    gameState.canFish = false;
    const phase = phases[phaseIndex];
    
    const dialogBox = document.getElementById('dialog-box');
    const speaker = document.getElementById('dialog-speaker');
    const text = document.getElementById('dialog-text');
    const choices = document.getElementById('dialog-choices');
    const portrait = document.getElementById('dialog-portrait');
    
    // Clear any existing typewriter
    if (typewriterInterval) {
        clearInterval(typewriterInterval);
    }
    
    // Play dialog open sound
    soundManager.play('dialogOpen');
    
    speaker.textContent = phase.speaker;
    text.textContent = '';
    
    // Show portrait if available
    if (phase.portrait) {
        portrait.src = phase.portrait;
        portrait.classList.remove('hidden');
    } else {
        portrait.classList.add('hidden');
    }
    
    // Clear previous choices and hide them initially
    choices.innerHTML = '';
    choices.style.display = 'none';
    
    dialogBox.classList.remove('hidden');
    
    // Typewriter effect
    let charIndex = 0;
    const fullText = phase.text;
    const typeSpeed = 30; // milliseconds per character
    
    typewriterInterval = setInterval(() => {
        if (charIndex < fullText.length) {
            text.textContent += fullText[charIndex];
            
            // Play typing sound occasionally (not every character)
            if (charIndex % 3 === 0) {
                soundManager.play('textType');
            }
            
            charIndex++;
        } else {
            clearInterval(typewriterInterval);
            typewriterInterval = null;
            
            // Show choices after text is complete
            choices.style.display = 'flex';
            
            phase.choices.forEach((choice, index) => {
                const button = document.createElement('button');
                button.className = 'choice-button';
                button.textContent = choice.label;
                button.style.opacity = '0';
                button.style.animation = `fadeIn 0.3s ease-out ${index * 0.1}s forwards`;
                button.addEventListener('mouseenter', () => soundManager.play('buttonHover'));
                button.addEventListener('click', () => {
                    soundManager.play('buttonClick');
                    handleChoice(phaseIndex, index);
                });
                choices.appendChild(button);
            });
        }
    }, typeSpeed);
}

function handleChoice(phaseIndex, choiceIndex) {
    const phase = phases[phaseIndex];
    const choice = phase.choices[choiceIndex];
    
    // Clear typewriter if still running
    if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
    }
    
    // Store choice
    gameState.choices[phase.name] = choice.key;
    
    // Apply effects
    if (choice.effect) {
        choice.effect();
    }
    
    // Hide dialog
    document.getElementById('dialog-box').classList.add('hidden');
    
    // Show legacy if earned
    if (choice.legacy) {
        gameState.legacies.push(choice.legacy);
        
        // Sync legacy to backend
        if (typeof window.onLegacyUnlocked === 'function') {
            window.onLegacyUnlocked(choice.legacy);
        }
        
        setTimeout(() => {
            showLegacy(choice.legacy);
        }, 500);
    } else {
        // Move to next phase
        gameState.phase++;
        setTimeout(() => {
            enableFishing();
        }, 1000);
    }
}

function showLegacy(legacyName) {
    const notification = document.getElementById('legacy-notification');
    const text = document.getElementById('legacy-text');
    const icon = document.getElementById('legacy-icon');
    const description = document.getElementById('legacy-description');
    
    // Set legacy icon based on type
    const icons = {
        'Nature': '🌲',
        'Civil Disobedience': '⚖️',
        'Simplicity': '🏠',
        'Deliberate Living': '🎯',
        'Self-Education': '📚',
        'Anti-Consumerism': '🕊️',
        'Wilderness Preservation': '🦌',
        'Individual Path': '🛤️'
    };
    
    const descriptions = {
        'Nature': 'Your connection with nature will inspire future generations',
        'Civil Disobedience': 'Your resistance will echo through history',
        'Simplicity': 'Your simple life will teach others what truly matters',
        'Deliberate Living': 'Your intentional life will guide seekers of meaning',
        'Self-Education': 'Your self-directed learning will inspire autodidacts',
        'Anti-Consumerism': 'Your rejection of materialism will free future souls',
        'Wilderness Preservation': 'Your love of wildness will save ecosystems',
        'Individual Path': 'Your courage to change will liberate others'
    };
    
    icon.textContent = icons[legacyName] || '✨';
    text.textContent = legacyName;
    description.textContent = descriptions[legacyName] || 'Your wisdom will endure';
    
    notification.classList.remove('hidden');
    
    document.getElementById('legacy-count').textContent = gameState.legacies.length;
    
    setTimeout(() => {
        notification.classList.add('hidden');
        gameState.phase++;
        
        if (gameState.phase < phases.length) {
            setTimeout(() => {
                enableFishing();
            }, 500);
        } else {
            setTimeout(() => {
                showEnding();
            }, 500);
        }
    }, 3500);
}

function enableFishing() {
    gameState.canFish = true;
    document.getElementById('fishing-prompt').classList.remove('hidden');
}

async function showCollectionScreen() {
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
        window.location.href = 'auth.html';
        return;
    }

    // Stop menu particles when leaving main menu
    if (typeof stopMenuParticles === 'function') {
        stopMenuParticles();
    }
    // Hide main menu
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        mainMenu.classList.remove('active');
        mainMenu.style.display = 'none';
    }
    
    // Hide game screen
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) gameScreen.classList.remove('active');
    
    // Show collection screen
    const collectionScreen = document.getElementById('collection-screen');
    if (collectionScreen) {
        collectionScreen.classList.add('active');
        collectionScreen.style.display = 'flex';
    }
    
    const grid = document.getElementById('collection-grid');
    const counter = document.getElementById('collection-counter');
    if (!grid || !counter) return;
    
    grid.innerHTML = '<div class="friend-stats">Loading your collection...</div>';
    
    try {
        const res = await getUserProgress();
        if (!res || !res.success || !res.progress) {
            throw new Error(res?.error || 'Could not load progress');
        }

        const progress = res.progress;
        const caughtSet = new Set((progress.fish_collection || []).map(f => f.fish_id));
        gameState.collection.caught = caughtSet;

        grid.innerHTML = '';
        fishSpecies.forEach(fish => {
            const record = (progress.fish_collection || []).find(f => f.fish_id === fish.id);
            const isCaught = !!record;
            const card = document.createElement('div');
            card.className = `fish-card ${isCaught ? 'caught' : 'locked'} rarity-${fish.rarity}`;

            const desc = isCaught
                ? `${fish.description}<br><span style="color:#c9b896">Caught ${record.times_caught}× • First: ${new Date(record.first_caught).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>`
                : 'Catch this fish to unlock!';

            card.innerHTML = `
                <div class="fish-emoji">${isCaught ? fish.emoji : '❓'}</div>
                <div class="fish-name">${isCaught ? fish.name : '???'}</div>
                <div class="fish-rarity">${fish.rarity.toUpperCase()}</div>
                <div class="fish-desc">${desc}</div>
            `;
            grid.appendChild(card);
        });

        counter.textContent = `${progress.unique_fish_count || caughtSet.size} / ${fishSpecies.length} species collected`;
    } catch (err) {
        console.error('Failed to load collection from backend:', err);
        grid.innerHTML = '<div class="friend-stats">Unable to load your collection. Please ensure you are logged in and try again.</div>';
        counter.textContent = `0 / ${fishSpecies.length} species collected`;
    }
}

function hideCollectionScreen() {
    const collectionScreen = document.getElementById('collection-screen');
    if (collectionScreen) {
        collectionScreen.classList.remove('active');
        collectionScreen.style.display = 'none';
    }
}

function showEnding() {
    // Sync story completion to backend
    if (typeof window.onStoryCompleted === 'function') {
        window.onStoryCompleted();
    }
    
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('ending-screen').classList.add('active');
    
    const summary = document.getElementById('ending-summary');
    const legacyMap = document.getElementById('legacy-map');
    
    summary.innerHTML = `
        <p style="font-size: 1.3em; margin-bottom: 20px;">You caught <strong>${gameState.fishCaught}</strong> fish.</p>
        <p style="font-size: 1.3em; margin-bottom: 20px;">But more importantly, you caught <strong>${gameState.legacies.length}</strong> ${gameState.legacies.length === 1 ? 'idea' : 'ideas'}.</p>
        ${gameState.legacies.length === 8 ? '<p style="font-size: 1.1em; margin-bottom: 20px; color: #d4af37; font-weight: bold;">You embraced all of Thoreau\'s teachings. Perfect transcendence!</p>' : ''}
    `;
    
    legacyMap.innerHTML = '';
    
    if (gameState.legacies.length > 0) {
        gameState.legacies.forEach((legacy, index) => {
            const connection = legacyConnections[legacy];
            const item = document.createElement('div');
            item.className = 'legacy-item';
            item.style.animationDelay = `${index * 0.3}s`;
            item.innerHTML = `
                <h3>${legacy} → ${connection.location}</h3>
                <p>${connection.text}</p>
            `;
            legacyMap.appendChild(item);
        });
    } else {
        legacyMap.innerHTML = '<p style="text-align: center; color: #6b8e9f; font-style: italic;">You completed your experiment, but your words did not echo through time. Perhaps another path awaited you at the pond.</p>';
    }
}

// Rendering
function createParticles() {
    // Water sparkles
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: canvas.height * 0.65 + Math.random() * (canvas.height * 0.35),
            size: Math.random() * 2 + 1,
            speedY: Math.random() * 0.2 - 0.1,
            alpha: Math.random() * 0.5 + 0.2,
            type: 'sparkle'
        });
    }
    
    // Birds
    for (let i = 0; i < 3; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.3,
            speedX: Math.random() * 0.5 + 0.3,
            type: 'bird'
        });
    }
}

function gameLoop(timestamp = 0) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render scene
    renderScene();
    
    // Update fishing minigame (only if not paused)
    if (gameState.fishingMinigame.active && !gameState.escapeMenuOpen) {
        updateFishingMinigame();
    }
    
    requestAnimationFrame(gameLoop);
}

function renderScene() {
    ensureSceneLayout();
    const brightness = gameState.atmosphere.brightness;
    const fog = gameState.atmosphere.fog;
    const time = Date.now() / 10000;
    const scale = canvas.height / 600;
    
    // Enhanced sky with atmospheric scattering
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.65);
    skyGradient.addColorStop(0, adjustBrightness('#4a6f95', brightness));
    skyGradient.addColorStop(0.15, adjustBrightness('#5a7fa5', brightness));
    skyGradient.addColorStop(0.35, adjustBrightness('#7a9fb5', brightness));
    skyGradient.addColorStop(0.6, adjustBrightness('#9fbfd8', brightness));
    skyGradient.addColorStop(0.85, adjustBrightness('#c5dfe8', brightness));
    skyGradient.addColorStop(1, adjustBrightness('#d5e8f0', brightness));
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.65);
    
    // Sun with enhanced rays and glow
    const sunX = canvas.width * 0.78;
    const sunY = canvas.height * 0.18;
    const sunSize = 40 * Math.min(brightness, 1.2) * scale;
    
    // Subtle sun glow (no rotating rays for calm atmosphere)
    
    // Sun outer glow
    if (brightness > 0.8) {
        const outerGlow = ctx.createRadialGradient(sunX, sunY, sunSize * 0.3, sunX, sunY, sunSize * 4);
        outerGlow.addColorStop(0, `rgba(255, 230, 120, ${0.25 * brightness})`);
        outerGlow.addColorStop(0.4, `rgba(255, 220, 100, ${0.15 * brightness})`);
        outerGlow.addColorStop(1, 'rgba(255, 220, 100, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunSize * 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Sun inner glow
    const innerGlow = ctx.createRadialGradient(sunX, sunY, sunSize * 0.5, sunX, sunY, sunSize * 1.8);
    innerGlow.addColorStop(0, adjustBrightness('#fff9e0', brightness));
    innerGlow.addColorStop(0.6, adjustBrightness('#ffd95a', brightness));
    innerGlow.addColorStop(1, 'rgba(255, 217, 90, 0)');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunSize * 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Sun body with corona
    ctx.fillStyle = adjustBrightness('#fffae0', brightness);
    ctx.globalAlpha = Math.min(brightness * 0.95, 1);
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Distant mountains/hills
    drawDistantHills();
    
    // Distant trees (background)
    drawDistantTrees();
    
    // Walden's Cabin
    drawCabin();
    
    // Trees (mid-ground)
    drawTrees();
    
    // Pond-like water with layered gradients and rim light
    const waterTop = canvas.height * 0.65;
    const waterGrad = ctx.createLinearGradient(0, waterTop, 0, canvas.height);
    waterGrad.addColorStop(0, adjustBrightness('#2d4f63', brightness));
    waterGrad.addColorStop(0.45, adjustBrightness('#1f3c4f', brightness));
    waterGrad.addColorStop(1, adjustBrightness('#142432', brightness));
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterTop, canvas.width, canvas.height - waterTop);
    
    // Soft rim at shoreline
    const rimGrad = ctx.createLinearGradient(0, waterTop - 8, 0, waterTop + 16);
    rimGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    rimGrad.addColorStop(0.4, 'rgba(255,255,255,0.16)');
    rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, waterTop - 8, canvas.width, 24);
    
    // Specular highlight on water
    const sunReflectX = canvas.width * 0.72;
    const sunReflectY = waterTop + 30;
    const specGrad = ctx.createRadialGradient(
        sunReflectX,
        sunReflectY,
        0,
        sunReflectX,
        sunReflectY,
        canvas.width * 0.35
    );
    specGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    specGrad.addColorStop(0.3, 'rgba(255,255,255,0.04)');
    specGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = specGrad;
    ctx.fillRect(0, waterTop, canvas.width, canvas.height - waterTop);
    
    // Water surface shimmer effect
    drawWaterShimmer();
    
    // Water ripples and waves
    drawWaterWaves(time);
    
    // Lily pads and water plants
    drawWaterPlants();
    
    // Water sparkles - subtle and calm
    particles.forEach(particle => {
        if (particle.type === 'sparkle' && gameState.atmosphere.soundEnabled) {
            const gentleTwinkle = Math.sin(Date.now() / 3000 + particle.x) * 0.15 + 0.85; // Much slower and subtler
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha * gentleTwinkle * 0.6})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Very slow movement
            particle.y += particle.speedY * 0.3;
            if (particle.y < canvas.height * 0.65 || particle.y > canvas.height) {
                particle.y = canvas.height * 0.65 + Math.random() * (canvas.height * 0.35);
            }
        }
    });
    
    // Birds - slow, peaceful movement
    particles.forEach(particle => {
        if (particle.type === 'bird' && gameState.atmosphere.soundEnabled) {
            drawBird(particle.x, particle.y);
            particle.x += particle.speedX * 0.4; // Much slower
            if (particle.x > canvas.width + 50) {
                particle.x = -50;
                particle.y = Math.random() * canvas.height * 0.3;
            }
        }
    });
    
    // Shore (more detailed)
    drawShore();
    
    // Dock
    drawDock();
    
    // Emerson figure (on shore)
    drawEmerson();
    
    // Thoreau figure (on dock)
    drawThoreau();
    
    // Fishing line
    if (fishingLine) {
        fishingLine.progress = Math.min(fishingLine.progress + 0.015, 1);
        const currentX = fishingLine.startX + (fishingLine.endX - fishingLine.startX) * fishingLine.progress;
        const currentY = fishingLine.startY + (fishingLine.endY - fishingLine.startY) * fishingLine.progress;
        
        // Draw fishing line
        ctx.strokeStyle = 'rgba(139, 115, 85, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fishingLine.startX, fishingLine.startY);
        
        // Add curve to line for more natural look
        const midX = (fishingLine.startX + currentX) / 2;
        const midY = (fishingLine.startY + currentY) / 2 + 20;
        ctx.quadraticCurveTo(midX, midY, currentX, currentY);
        ctx.stroke();
        
        // Bobber with animation
        if (gameState.fishingMinigame.active) {
            const bobTime = Date.now() / 200;
            const bobOffset = Math.sin(bobTime) * 3;
            
            // Bobber shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(currentX, currentY + 8, 6, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Bobber body
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(currentX, currentY + bobOffset, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Bobber highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(currentX - 2, currentY + bobOffset - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Ripples
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                ctx.arc(currentX, currentY + 3, 10 + i * 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else {
            // Bobber before minigame
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Fog overlay
    if (fog > 0) {
        ctx.fillStyle = `rgba(128, 128, 128, ${fog * 0.4})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawClouds() {
    const brightness = gameState.atmosphere.brightness;
    const time = Date.now() / 50000;
    const scale = canvas.height / 600;
    
    // Multiple cloud layers with very slow movement for calm atmosphere
    const slowTime = time * 0.3; // Much slower cloud movement
    const cloudLayers = [
        { x: (slowTime * 18) % (canvas.width + 500) - 250, y: 60 * scale, scale: 1.4, alpha: 0.25 },
        { x: (slowTime * 25 + 250) % (canvas.width + 500) - 250, y: 100 * scale, scale: 1.1, alpha: 0.35 },
        { x: (slowTime * 15 + 500) % (canvas.width + 500) - 250, y: 140 * scale, scale: 1.0, alpha: 0.3 },
        { x: (slowTime * 12 + 750) % (canvas.width + 500) - 250, y: 45 * scale, scale: 0.9, alpha: 0.22 },
        { x: (slowTime * 20 + 950) % (canvas.width + 500) - 250, y: 115 * scale, scale: 1.3, alpha: 0.28 }
    ];
    
    cloudLayers.forEach(cloud => {
        // Cloud shadow/depth layer
        ctx.globalAlpha = cloud.alpha * brightness * 0.6;
        ctx.fillStyle = adjustBrightness('#d0dce8', brightness);
        ctx.beginPath();
        ctx.arc(cloud.x + 5 * scale, cloud.y + 8 * scale, 35 * cloud.scale * scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 35 * cloud.scale * scale, cloud.y + 10 * scale, 45 * cloud.scale * scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 75 * cloud.scale * scale, cloud.y + 8 * scale, 38 * cloud.scale * scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 55 * cloud.scale * scale, cloud.y - 12 * scale, 32 * cloud.scale * scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 100 * cloud.scale * scale, cloud.y + 5 * scale, 30 * cloud.scale * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Main cloud body with gradients
        ctx.globalAlpha = cloud.alpha * brightness;
        const cloudParts = [
            { x: cloud.x, y: cloud.y, r: 40 * cloud.scale * scale },
            { x: cloud.x + 35 * cloud.scale * scale, y: cloud.y, r: 50 * cloud.scale * scale },
            { x: cloud.x + 75 * cloud.scale * scale, y: cloud.y, r: 42 * cloud.scale * scale },
            { x: cloud.x + 55 * cloud.scale * scale, y: cloud.y - 18 * scale, r: 35 * cloud.scale * scale },
            { x: cloud.x + 105 * cloud.scale * scale, y: cloud.y, r: 32 * cloud.scale * scale }
        ];
        
        cloudParts.forEach((part, i) => {
            const grad = ctx.createRadialGradient(part.x - part.r * 0.2, part.y - part.r * 0.2, part.r * 0.3, part.x, part.y, part.r);
            grad.addColorStop(0, adjustBrightness('#ffffff', brightness * 1.1));
            grad.addColorStop(0.6, adjustBrightness('#f5f8fc', brightness));
            grad.addColorStop(1, adjustBrightness('#e8ecf5', brightness * 0.95));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.r, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Cloud highlights for volume
        ctx.globalAlpha = cloud.alpha * brightness * 0.5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(cloud.x + 40 * cloud.scale * scale, cloud.y - 10 * scale, 25 * cloud.scale * scale, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.globalAlpha = 1;
}

function drawDistantHills() {
    const brightness = gameState.atmosphere.brightness;
    const scale = canvas.height / 600;
    
    // Smoother layered hills with subtle gradients
    const hillLayers = [
        { y: 0.50, colorTop: '#6b8798', colorBottom: '#577182', height: 60 * scale, alpha: 0.28 },
        { y: 0.53, colorTop: '#5c7a89', colorBottom: '#496676', height: 55 * scale, alpha: 0.34 },
        { y: 0.56, colorTop: '#4f6b78', colorBottom: '#3f5966', height: 48 * scale, alpha: 0.42 },
        { y: 0.59, colorTop: '#435b66', colorBottom: '#344952', height: 42 * scale, alpha: 0.50 }
    ];
    
    hillLayers.forEach((layer, index) => {
        ctx.globalAlpha = layer.alpha * brightness;
        const grad = ctx.createLinearGradient(0, canvas.height * layer.y - layer.height, 0, canvas.height * 0.65);
        grad.addColorStop(0, adjustBrightness(layer.colorTop, brightness));
        grad.addColorStop(1, adjustBrightness(layer.colorBottom, brightness));
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * layer.y + layer.height * 0.2);
        for (let x = 0; x <= canvas.width; x += 30) {
            const noise = Math.sin((x + index * 120) * 0.005) * (layer.height * 0.5) +
                          Math.cos((x + index * 70) * 0.01) * (layer.height * 0.35);
            ctx.lineTo(x, canvas.height * layer.y + noise);
        }
        ctx.lineTo(canvas.width, canvas.height * 0.65);
        ctx.lineTo(0, canvas.height * 0.65);
        ctx.closePath();
        ctx.fill();
    });
    
    ctx.globalAlpha = 1;
}

function drawDistantTrees() {
    const brightness = gameState.atmosphere.brightness;
    
    // Softer distant forest (no harsh triangles)
    const layerColors = [
        { color: '#335245', alpha: 0.45, scale: 0.95, offsetY: 0.56 },
        { color: '#2e4a3f', alpha: 0.55, scale: 1.05, offsetY: 0.57 }
    ];
    
    layerColors.forEach((layer, li) => {
        ctx.globalAlpha = layer.alpha * brightness;
        const count = 26;
        for (let i = 0; i < count; i++) {
            const x = (i * canvas.width / (count - 1)) - 25 + (li * 8);
            const baseY = canvas.height * layer.offsetY;
            const h = (70 + Math.sin(i * 0.7) * 10 + (i % 3) * 8) * layer.scale;
            const w = (26 + (i % 4) * 4) * layer.scale;
            
            // Soft cone with gradient
            const grad = ctx.createLinearGradient(x, baseY, x, baseY + h);
            grad.addColorStop(0, adjustBrightness(layer.color, brightness * 1.05));
            grad.addColorStop(1, adjustBrightness(layer.color, brightness * 0.8));
            ctx.fillStyle = grad;
            
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.quadraticCurveTo(x - w * 0.55, baseY + h * 0.45, x - w * 0.4, baseY + h);
            ctx.lineTo(x + w * 0.4, baseY + h);
            ctx.quadraticCurveTo(x + w * 0.55, baseY + h * 0.45, x, baseY);
            ctx.closePath();
            ctx.fill();
            
            // Soft base shadow
            ctx.fillStyle = `rgba(0,0,0,${0.08 * layer.alpha})`;
            ctx.beginPath();
            ctx.ellipse(x, baseY + h, w * 0.45, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    ctx.globalAlpha = 1;
}

function drawCabin() {
    const brightness = gameState.atmosphere.brightness;
    const time = Date.now() / 1000;
    const scale = canvas.height / 600;
    const cabinX = canvas.width * 0.15;
    const cabinY = canvas.height * 0.48;
    const cabinWidth = 90 * scale;
    const cabinHeight = 55 * scale;
    
    // Update clickable area
    cabinClickArea.x = cabinX - 8 * scale;
    cabinClickArea.y = cabinY - 15 * scale;
    cabinClickArea.width = cabinWidth + 16 * scale;
    cabinClickArea.height = cabinHeight + 20 * scale;
    
    // Cabin shadow with gradient
    const shadowGrad = ctx.createRadialGradient(cabinX + cabinWidth/2, cabinY + cabinHeight, 10, cabinX + cabinWidth/2, cabinY + cabinHeight, cabinWidth);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(cabinX - 5 * scale, cabinY + cabinHeight - 2 * scale, cabinWidth + 10 * scale, 10 * scale);
    
    // Cabin walls (log cabin) with texture gradient
    const wallGrad = ctx.createLinearGradient(cabinX, cabinY, cabinX + cabinWidth, cabinY);
    wallGrad.addColorStop(0, adjustBrightness('#5a4a35', brightness));
    wallGrad.addColorStop(0.3, adjustBrightness('#6d5a44', brightness));
    wallGrad.addColorStop(0.7, adjustBrightness('#7d6a54', brightness));
    wallGrad.addColorStop(1, adjustBrightness('#5a4a35', brightness));
    ctx.fillStyle = wallGrad;
    ctx.fillRect(cabinX, cabinY, cabinWidth, cabinHeight);
    
    // Simple log lines (horizontal)
    ctx.strokeStyle = adjustBrightness('#4a3a25', brightness);
    ctx.lineWidth = 2 * scale;
    for (let i = 0; i <= 6; i++) {
        const y = cabinY + i * (cabinHeight / 6);
        ctx.beginPath();
        ctx.moveTo(cabinX, y);
        ctx.lineTo(cabinX + cabinWidth, y);
        ctx.stroke();
    }
    
    // Roof with gradient
    const roofGrad = ctx.createLinearGradient(cabinX, cabinY - 30 * scale, cabinX, cabinY);
    roofGrad.addColorStop(0, adjustBrightness('#3a2a1a', brightness));
    roofGrad.addColorStop(0.5, adjustBrightness('#4a3a2a', brightness));
    roofGrad.addColorStop(1, adjustBrightness('#3a2a1a', brightness));
    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.moveTo(cabinX - 12 * scale, cabinY);
    ctx.lineTo(cabinX + cabinWidth / 2, cabinY - 30 * scale);
    ctx.lineTo(cabinX + cabinWidth + 12 * scale, cabinY);
    ctx.closePath();
    ctx.fill();
    
    // Simple roof shingles
    ctx.strokeStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.lineWidth = 1.5 * scale;
    for (let row = 0; row < 3; row++) {
        const rowY = cabinY - row * 10 * scale;
        ctx.beginPath();
        ctx.moveTo(cabinX - 10 * scale, rowY);
        ctx.lineTo(cabinX + cabinWidth / 2, cabinY - 30 * scale + row * 10 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cabinX + cabinWidth + 10 * scale, rowY);
        ctx.lineTo(cabinX + cabinWidth / 2, cabinY - 30 * scale + row * 10 * scale);
        ctx.stroke();
    }
    
    // Door with wood grain
    const doorGrad = ctx.createLinearGradient(cabinX + 12 * scale, cabinY + 16 * scale, cabinX + 30 * scale, cabinY + 16 * scale);
    doorGrad.addColorStop(0, adjustBrightness('#2a1a0a', brightness));
    doorGrad.addColorStop(0.5, adjustBrightness('#3a2a1a', brightness));
    doorGrad.addColorStop(1, adjustBrightness('#2a1a0a', brightness));
    ctx.fillStyle = doorGrad;
    ctx.beginPath();
    ctx.roundRect(cabinX + 12 * scale, cabinY + 16 * scale, 20 * scale, 38 * scale, 2 * scale);
    ctx.fill();
    
    // Door frame
    ctx.strokeStyle = adjustBrightness('#4a3a2a', brightness);
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(cabinX + 12 * scale, cabinY + 16 * scale, 20 * scale, 38 * scale);
    
    // Door planks
    ctx.strokeStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.lineWidth = 1 * scale;
    for (let i = 0; i < 5; i++) {
        const plankY = cabinY + 20 * scale + i * 8 * scale;
        ctx.beginPath();
        ctx.moveTo(cabinX + 13 * scale, plankY);
        ctx.lineTo(cabinX + 31 * scale, plankY);
        ctx.stroke();
    }
    
    // Door handle with shine
    ctx.fillStyle = adjustBrightness('#8B7355', brightness);
    ctx.beginPath();
    ctx.arc(cabinX + 27 * scale, cabinY + 35 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(cabinX + 26.5 * scale, cabinY + 34.5 * scale, 1 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Window with depth
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.fillRect(cabinX + 48 * scale, cabinY + 21 * scale, 24 * scale, 18 * scale);
    
    // Window glass with reflection
    const windowGrad = ctx.createLinearGradient(cabinX + 50 * scale, cabinY + 23 * scale, cabinX + 70 * scale, cabinY + 37 * scale);
    windowGrad.addColorStop(0, adjustBrightness('#7a9aaa', brightness * 1.3));
    windowGrad.addColorStop(0.5, adjustBrightness('#5a7a8a', brightness * 1.2));
    windowGrad.addColorStop(1, adjustBrightness('#4a6a7a', brightness * 1.1));
    ctx.fillStyle = windowGrad;
    ctx.fillRect(cabinX + 50 * scale, cabinY + 23 * scale, 20 * scale, 14 * scale);
    
    // Window panes
    ctx.strokeStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(cabinX + 60 * scale, cabinY + 23 * scale);
    ctx.lineTo(cabinX + 60 * scale, cabinY + 37 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cabinX + 50 * scale, cabinY + 30 * scale);
    ctx.lineTo(cabinX + 70 * scale, cabinY + 30 * scale);
    ctx.stroke();
    
    // Window reflection/shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(cabinX + 52 * scale, cabinY + 24 * scale, 7 * scale, 5 * scale);
    
    // Warm light from inside (if enabled)
    if (gameState.atmosphere.soundEnabled) {
        ctx.fillStyle = `rgba(255, 200, 100, ${0.3 * brightness})`;
        ctx.fillRect(cabinX + 50 * scale, cabinY + 23 * scale, 20 * scale, 14 * scale);
    }
    
    // Chimney with bricks
    const chimneyGrad = ctx.createLinearGradient(cabinX + cabinWidth - 18 * scale, cabinY - 18 * scale, cabinX + cabinWidth - 6 * scale, cabinY - 18 * scale);
    chimneyGrad.addColorStop(0, adjustBrightness('#4a3a25', brightness));
    chimneyGrad.addColorStop(0.5, adjustBrightness('#5a4a35', brightness));
    chimneyGrad.addColorStop(1, adjustBrightness('#4a3a25', brightness));
    ctx.fillStyle = chimneyGrad;
    ctx.fillRect(cabinX + cabinWidth - 18 * scale, cabinY - 18 * scale, 14 * scale, 23 * scale);
    
    // Chimney bricks
    ctx.strokeStyle = adjustBrightness('#3a2a15', brightness);
    ctx.lineWidth = 1 * scale;
    for (let i = 0; i < 5; i++) {
        const brickY = cabinY - 16 * scale + i * 5 * scale;
        ctx.beginPath();
        ctx.moveTo(cabinX + cabinWidth - 18 * scale, brickY);
        ctx.lineTo(cabinX + cabinWidth - 4 * scale, brickY);
        ctx.stroke();
    }
    
    // Chimney top/cap
    ctx.fillStyle = adjustBrightness('#3a2a15', brightness);
    ctx.fillRect(cabinX + cabinWidth - 20 * scale, cabinY - 19 * scale, 18 * scale, 3 * scale);
    
    // Animated smoke
    if (gameState.atmosphere.soundEnabled) {
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 4; i++) {
            const smokeY = cabinY - 22 * scale - i * 10 * scale + Math.sin(time + i) * 3 * scale;
            const smokeX = cabinX + cabinWidth - 11 * scale + Math.sin(time * 2 + i) * 4 * scale;
            const smokeSize = (5 + i * 2) * scale;
            
            const smokeGrad = ctx.createRadialGradient(smokeX, smokeY, 0, smokeX, smokeY, smokeSize);
            smokeGrad.addColorStop(0, adjustBrightness('#999999', brightness));
            smokeGrad.addColorStop(1, 'rgba(153, 153, 153, 0)');
            ctx.fillStyle = smokeGrad;
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    // Highlight if hoverable
    if (gameState.mode === 'story' || gameState.mode === 'freeplay') {
        ctx.globalAlpha = 0.35 + Math.sin(time * 2) * 0.12;
        ctx.strokeStyle = '#f6e8c5';
        ctx.lineWidth = 4;
        ctx.setLineDash([9, 7]);
        ctx.strokeRect(cabinClickArea.x, cabinClickArea.y, cabinClickArea.width, cabinClickArea.height);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
}

function drawWaterShimmer() {
    const brightness = gameState.atmosphere.brightness;
    const time = Date.now() / 3000;
    
    // Light reflection on water surface
    ctx.globalAlpha = 0.15 * brightness;
    const shimmerGradient = ctx.createLinearGradient(0, canvas.height * 0.65, 0, canvas.height * 0.72);
    shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shimmerGradient;
    
    for (let i = 0; i < 5; i++) {
        const offsetX = Math.sin(time + i) * 50;
        const offsetY = Math.cos(time + i * 0.5) * 10;
        ctx.fillRect(i * 250 + offsetX, canvas.height * 0.65 + offsetY, 150, 40);
    }
    
    ctx.globalAlpha = 1;
}

function drawWaterWaves(time) {
    const brightness = gameState.atmosphere.brightness;
    
    ctx.strokeStyle = adjustBrightness('#5a8a9a', brightness);
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    
    // Animated water waves
    for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        const yOffset = canvas.height * 0.65 + wave * 30;
        
        for (let x = 0; x <= canvas.width; x += 5) {
            const y = yOffset + Math.sin((x * 0.01) + time + wave) * 3;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
}

function drawWaterPlants() {
    const brightness = gameState.atmosphere.brightness;
    const lilyPads = (sceneLayout && sceneLayout.lilyPads && sceneLayout.lilyPads.length)
        ? sceneLayout.lilyPads
        : [
            { x: canvas.width * 0.18, y: canvas.height * 0.75, size: 22 },
            { x: canvas.width * 0.32, y: canvas.height * 0.78, size: 18 },
            { x: canvas.width * 0.48, y: canvas.height * 0.74, size: 20 },
            { x: canvas.width * 0.66, y: canvas.height * 0.77, size: 17 },
            { x: canvas.width * 0.82, y: canvas.height * 0.76, size: 19 }
        ];

    lilyPads.forEach(pad => {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(pad.x + 2, pad.y + 3, pad.size, pad.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pad
        ctx.fillStyle = adjustBrightness('#4a6a3a', brightness);
        ctx.beginPath();
        ctx.ellipse(pad.x, pad.y, pad.size, pad.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Notch
        ctx.fillStyle = adjustBrightness('#3a5a2a', brightness);
        ctx.beginPath();
        ctx.moveTo(pad.x + pad.size * 0.6, pad.y - pad.size * 0.25);
        ctx.lineTo(pad.x + pad.size * 0.9, pad.y);
        ctx.lineTo(pad.x + pad.size * 0.6, pad.y + pad.size * 0.25);
        ctx.closePath();
        ctx.fill();
    });
    
    // Very subtle reeds, static
    const reeds = (sceneLayout && sceneLayout.reeds && sceneLayout.reeds.length)
        ? sceneLayout.reeds
        : [
            { x: canvas.width * 0.22, heights: [36, 44, 40] },
            { x: canvas.width * 0.45, heights: [38, 46, 42] },
            { x: canvas.width * 0.68, heights: [34, 42, 38] },
            { x: canvas.width * 0.86, heights: [32, 40, 36] }
        ];
    ctx.globalAlpha = 0.45;
    reeds.forEach(reed => {
        reed.heights.forEach((height, i) => {
            const x = reed.x + i * 6;
            const baseY = canvas.height * 0.72;
            
            ctx.strokeStyle = adjustBrightness('#4a5a3a', brightness);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.quadraticCurveTo(x, baseY - height / 2, x, baseY - height);
            ctx.stroke();
            
            // Reed top
            ctx.fillStyle = adjustBrightness('#5a6a4a', brightness);
            ctx.beginPath();
            ctx.ellipse(x, baseY - height - 3, 2, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    ctx.globalAlpha = 1;
}

function drawTrees() {
    const brightness = gameState.atmosphere.brightness;
    const trees = (sceneLayout && sceneLayout.trees && sceneLayout.trees.length)
        ? sceneLayout.trees
        : [
            { x: canvas.width * 0.16, scale: 0.8, type: 'pine' },
            { x: canvas.width * 0.35, scale: 0.7, type: 'oak' },
            { x: canvas.width * 0.58, scale: 0.85, type: 'pine' },
            { x: canvas.width * 0.82, scale: 0.75, type: 'oak' }
        ];

    const baseY = canvas.height * 0.58;
    
    trees.forEach(tree => {
        if (tree.type === 'pine') {
            drawPineTreeStatic(tree.x, baseY, tree.scale, brightness);
        } else {
            drawOakTreeStatic(tree.x, baseY, tree.scale, brightness);
        }
        
        // Ground shadow under each tree
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.beginPath();
        ctx.ellipse(tree.x, baseY + 62 * tree.scale, 26 * tree.scale, 9 * tree.scale, 0, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPineTreeStatic(x, y, scale, brightness) {
    // trunk
    const w = 10 * scale;
    const h = 65 * scale;
    const trunkGrad = ctx.createLinearGradient(x - w, y, x + w, y + h);
    trunkGrad.addColorStop(0, adjustBrightness('#2f2216', brightness));
    trunkGrad.addColorStop(1, adjustBrightness('#4a3626', brightness));
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(x - w, y, w * 2, h);
    
    // foliage layers
    const layers = [
        { yOff: -10, w: 55, h: 32, c: '#2f5c32' },
        { yOff: -28, w: 48, h: 28, c: '#3c6d3c' },
        { yOff: -44, w: 40, h: 25, c: '#4b7d4b' },
        { yOff: -58, w: 32, h: 22, c: '#5b8d5b' }
    ];
    layers.forEach(l => {
        const lw = l.w * scale;
        const lh = l.h * scale;
        const ly = y + l.yOff * scale;
        const grad = ctx.createLinearGradient(x, ly - lh, x, ly + lh * 0.6);
        grad.addColorStop(0, adjustBrightness(l.c, brightness * 1.05));
        grad.addColorStop(1, adjustBrightness(l.c, brightness * 0.85));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, ly - lh);
        ctx.lineTo(x - lw, ly + lh * 0.6);
        ctx.lineTo(x + lw, ly + lh * 0.6);
        ctx.closePath();
        ctx.fill();
    });
}

function drawOakTreeStatic(x, y, scale, brightness) {
    // trunk
    const w = 12 * scale;
    const h = 55 * scale;
    const trunkGrad = ctx.createLinearGradient(x - w, y, x + w, y + h);
    trunkGrad.addColorStop(0, adjustBrightness('#3a2a1a', brightness));
    trunkGrad.addColorStop(1, adjustBrightness('#543c28', brightness));
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(x - w, y, w * 2, h);
    
    // crown
    const blobs = [
        { xOff: -18, yOff: -22, r: 32, c: '#3a6a3a' },
        { xOff: 18, yOff: -18, r: 30, c: '#4a7a4a' },
        { xOff: 0, yOff: -35, r: 34, c: '#5a8a5a' }
    ];
    blobs.forEach(b => {
        const r = b.r * scale;
        const gx = x + b.xOff * scale;
        const gy = y + b.yOff * scale;
        const grad = ctx.createRadialGradient(gx - r * 0.2, gy - r * 0.2, r * 0.3, gx, gy, r);
        grad.addColorStop(0, adjustBrightness(b.c, brightness * 1.15));
        grad.addColorStop(1, adjustBrightness(b.c, brightness * 0.85));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx, gy, r, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawShore() {
    const brightness = gameState.atmosphere.brightness;
    const scale = canvas.height / 600;
    
    // Ground layers with texture
    const groundLayers = [
        { yStart: 0.63, yEnd: 0.66, color: '#5a6a4a', noise: 0.05 },
        { yStart: 0.66, yEnd: 0.675, color: '#4a5a3a', noise: 0.06 },
        { yStart: 0.675, yEnd: 0.69, color: '#3a4a2a', noise: 0.07 }
    ];
    
    groundLayers.forEach((layer, index) => {
        // Main ground layer with gradient
        const groundGrad = ctx.createLinearGradient(0, canvas.height * layer.yStart, 0, canvas.height * layer.yEnd);
        groundGrad.addColorStop(0, adjustBrightness(layer.color, brightness * 1.1));
        groundGrad.addColorStop(0.5, adjustBrightness(layer.color, brightness));
        groundGrad.addColorStop(1, adjustBrightness(layer.color, brightness * 0.9));
        ctx.fillStyle = groundGrad;
        
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.55, canvas.height * layer.yStart);
        
        for (let x = canvas.width * 0.55; x <= canvas.width; x += 15) {
            const noise = Math.sin(x * layer.noise + index) * 3 * scale +
                         Math.cos(x * layer.noise * 1.5 + index * 0.5) * 2 * scale;
            ctx.lineTo(x, canvas.height * layer.yStart + noise);
        }
        
        ctx.lineTo(canvas.width, canvas.height * layer.yEnd);
        ctx.lineTo(canvas.width * 0.55, canvas.height * layer.yEnd);
        ctx.closePath();
        ctx.fill();
        
        // Ground texture overlay
        const specks = sceneLayout?.shoreDetails?.pebbles || [];
        if (specks.length) {
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = adjustBrightness(index % 2 ? '#2a3a1a' : '#3a4a2a', brightness);
            specks.forEach(s => {
                ctx.fillRect(s.x, s.y, s.size, s.size);
            });
            ctx.globalAlpha = 1;
        }
    });

    // Grass tufts for softness near the shoreline
    const tufts = sceneLayout?.shoreDetails?.tufts || [];
    if (tufts.length) {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = adjustBrightness('#42533a', brightness);
        ctx.lineWidth = 2 * scale;
        tufts.forEach(tuft => {
            ctx.beginPath();
            ctx.moveTo(tuft.x, tuft.y);
            ctx.quadraticCurveTo(tuft.x - tuft.width * 0.25, tuft.y - tuft.height * 0.4, tuft.x, tuft.y - tuft.height);
            ctx.quadraticCurveTo(tuft.x + tuft.width * 0.25, tuft.y - tuft.height * 0.4, tuft.x + tuft.width * 0.2, tuft.y);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }
    
    // Continuous shoreline band for cohesive scene
    const waterLine = canvas.height * 0.65;
    const shoreLineY = canvas.height * 0.635;
    const bandTop = waterLine - 10;
    const bandBottom = waterLine + 12;
    // Base darker band
    ctx.fillStyle = adjustBrightness('#354230', brightness);
    ctx.beginPath();
    ctx.moveTo(0, shoreLineY);
    for (let x = 0; x <= canvas.width; x += 60) {
        const y = shoreLineY + Math.sin(x * 0.01) * 4 * scale;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, bandBottom);
    ctx.lineTo(0, bandBottom);
    ctx.closePath();
    ctx.fill();
    // Soft highlight along the rim
    const shoreHighlight = ctx.createLinearGradient(0, bandTop, 0, bandTop + 18);
    shoreHighlight.addColorStop(0, 'rgba(255,255,255,0.10)');
    shoreHighlight.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    shoreHighlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shoreHighlight;
    ctx.fillRect(0, bandTop, canvas.width, 18);
    // Gentle shoreline shadow into water
    const shoreShadow = ctx.createLinearGradient(0, waterLine, 0, waterLine + 24);
    shoreShadow.addColorStop(0, 'rgba(0,0,0,0.15)');
    shoreShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shoreShadow;
    ctx.fillRect(0, waterLine, canvas.width, 24);
    
    // Detailed grass with variety
    const grassTypes = [
        { count: 50, heightRange: [10, 20], color: '#5a7a4a', thickness: 1.5 },
        { count: 35, heightRange: [15, 25], color: '#4a6a3a', thickness: 2 },
        { count: 25, heightRange: [8, 15], color: '#6a8a5a', thickness: 1 }
    ];
    
    if (!shoreCache) shoreCache = { grass: [], flowers: [], rocks: [], specks: [] };
    if (!shoreCache.grass.length) {
        grassTypes.forEach(grassType => {
            for (let i = 0; i < grassType.count; i++) {
                const x = canvas.width * 0.58 + Math.random() * canvas.width * 0.38;
                const y = canvas.height * 0.635 + Math.random() * canvas.height * 0.035;
                const height = (grassType.heightRange[0] + Math.random() * (grassType.heightRange[1] - grassType.heightRange[0])) * scale;
                const staticBend = (Math.random() - 0.5) * 2 * scale; // Static bend
                shoreCache.grass.push({ x, y, height, staticBend, color: grassType.color, thickness: grassType.thickness });
            }
        });
    }
    shoreCache.grass.forEach(g => {
        ctx.strokeStyle = adjustBrightness(g.color, brightness);
        ctx.lineWidth = g.thickness * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.quadraticCurveTo(
            g.x + g.staticBend,
            g.y - g.height * 0.5,
            g.x + g.staticBend * 1.5,
            g.y - g.height
        );
        ctx.stroke();
    });
    
    // Simple flowers - completely static, no animation
    if (!shoreCache.flowers.length) {
        const flowers = [
            { x: canvas.width * 0.62, y: canvas.height * 0.645 },
            { x: canvas.width * 0.72, y: canvas.height * 0.648 },
            { x: canvas.width * 0.82, y: canvas.height * 0.644 },
            { x: canvas.width * 0.91, y: canvas.height * 0.650 }
        ];
        flowers.forEach(f => shoreCache.flowers.push(f));
    }
    shoreCache.flowers.forEach(flower => {
        ctx.fillStyle = adjustBrightness('#e8a84a', brightness);
        ctx.beginPath();
        ctx.arc(flower.x, flower.y - 8 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Fallen leaves removed to avoid floating yellow pebbles
    ctx.globalAlpha = 1;
}

function drawDock() {
    const brightness = gameState.atmosphere.brightness;
    const baseX = canvas.width * 0.68;
    const baseY = canvas.height * 0.59;
    
    // Dock planks
    const plankColor = adjustBrightness('#6d5a44', brightness);
    const darkPlankColor = adjustBrightness('#5a4a35', brightness);
    
    // Support posts in water
    ctx.fillStyle = adjustBrightness('#4a3a2a', brightness);
    ctx.fillRect(baseX + 5, baseY + 10, 8, 50);
    ctx.fillRect(baseX + 80, baseY + 10, 8, 50);
    
    // Main dock surface
    ctx.fillStyle = plankColor;
    ctx.fillRect(baseX, baseY, 100, 45);
    
    // Plank lines
    ctx.strokeStyle = darkPlankColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const y = baseY + i * 8;
        ctx.beginPath();
        ctx.moveTo(baseX, y);
        ctx.lineTo(baseX + 100, y);
        ctx.stroke();
    }
    
    // Vertical supports
    ctx.strokeStyle = darkPlankColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(baseX + 10, baseY);
    ctx.lineTo(baseX + 10, baseY + 45);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(baseX + 90, baseY);
    ctx.lineTo(baseX + 90, baseY + 45);
    ctx.stroke();
}

function drawEmerson() {
    const brightness = gameState.atmosphere.brightness;
    const x = canvas.width * 0.25;
    const y = canvas.height * 0.565;
    const time = Date.now() / 1000;
    const scale = canvas.height / 600;
    
    // Update clickable area
    emersonClickArea.x = x - 22 * scale;
    emersonClickArea.y = y - 35 * scale;
    emersonClickArea.width = 44 * scale;
    emersonClickArea.height = 75 * scale;
    
    // Soft shadow with gradient
    const shadowGrad = ctx.createRadialGradient(x, y + 38 * scale, 0, x, y + 38 * scale, 18 * scale);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + 38 * scale, 16 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Subtle idle animation
    const idle = Math.sin(time * 0.6) * 0.5 * scale;
    
    // Legs with rounded edges
    ctx.fillStyle = adjustBrightness('#1a0a0a', brightness);
    ctx.beginPath();
    ctx.roundRect(x - 6 * scale, y + 19 * scale, 5 * scale, 20 * scale, 2 * scale);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 1 * scale, y + 19 * scale, 5 * scale, 20 * scale, 2 * scale);
    ctx.fill();
    
    // Body (formal coat) with gradient
    const coatGrad = ctx.createLinearGradient(x - 12 * scale, y, x + 12 * scale, y);
    coatGrad.addColorStop(0, adjustBrightness('#1a0a0a', brightness));
    coatGrad.addColorStop(0.5, adjustBrightness('#2a1a0a', brightness));
    coatGrad.addColorStop(1, adjustBrightness('#1a0a0a', brightness));
    ctx.fillStyle = coatGrad;
    ctx.beginPath();
    ctx.roundRect(x - 11 * scale, y + idle, 22 * scale, 24 * scale, 3 * scale);
    ctx.fill();
    
    // Coat tails with smooth curves
    ctx.fillStyle = adjustBrightness('#1a0a0a', brightness);
    ctx.beginPath();
    ctx.moveTo(x - 11 * scale, y + 20 * scale);
    ctx.quadraticCurveTo(x - 14 * scale, y + 24 * scale, x - 13 * scale, y + 28 * scale);
    ctx.lineTo(x - 8 * scale, y + 23 * scale);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 11 * scale, y + 20 * scale);
    ctx.quadraticCurveTo(x + 14 * scale, y + 24 * scale, x + 13 * scale, y + 28 * scale);
    ctx.lineTo(x + 8 * scale, y + 23 * scale);
    ctx.closePath();
    ctx.fill();
    
    // White shirt with detail
    ctx.fillStyle = adjustBrightness('#f5f0e8', brightness);
    ctx.beginPath();
    ctx.roundRect(x - 6 * scale, y + 3 * scale + idle, 12 * scale, 10 * scale, 2 * scale);
    ctx.fill();
    
    // Vest
    ctx.fillStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.beginPath();
    ctx.moveTo(x - 4 * scale, y + 3 * scale + idle);
    ctx.lineTo(x - 6 * scale, y + 13 * scale + idle);
    ctx.lineTo(x + 6 * scale, y + 13 * scale + idle);
    ctx.lineTo(x + 4 * scale, y + 3 * scale + idle);
    ctx.closePath();
    ctx.fill();
    
    // Vest buttons
    ctx.fillStyle = adjustBrightness('#8B7355', brightness);
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y + 5 * scale + i * 3 * scale + idle, 1 * scale, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Bow tie
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.beginPath();
    ctx.moveTo(x - 4 * scale, y + 2 * scale + idle);
    ctx.lineTo(x - 2 * scale, y + 1 * scale + idle);
    ctx.lineTo(x, y + 2 * scale + idle);
    ctx.lineTo(x + 2 * scale, y + 1 * scale + idle);
    ctx.lineTo(x + 4 * scale, y + 2 * scale + idle);
    ctx.lineTo(x + 2 * scale, y + 3 * scale + idle);
    ctx.lineTo(x, y + 2 * scale + idle);
    ctx.lineTo(x - 2 * scale, y + 3 * scale + idle);
    ctx.closePath();
    ctx.fill();
    
    // Arms with shading
    const armGrad = ctx.createLinearGradient(x - 13 * scale, y, x - 9 * scale, y);
    armGrad.addColorStop(0, adjustBrightness('#1a0a0a', brightness));
    armGrad.addColorStop(1, adjustBrightness('#2a1a0a', brightness));
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.roundRect(x - 13 * scale, y + 5 * scale + idle, 5 * scale, 16 * scale, 2 * scale);
    ctx.fill();
    
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.beginPath();
    ctx.roundRect(x + 8 * scale, y + 5 * scale + idle, 5 * scale, 16 * scale, 2 * scale);
    ctx.fill();
    
    // Hands
    ctx.fillStyle = adjustBrightness('#d4a574', brightness);
    ctx.beginPath();
    ctx.arc(x - 10 * scale, y + 21 * scale + idle, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10 * scale, y + 21 * scale + idle, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Neck
    ctx.fillStyle = adjustBrightness('#d4a574', brightness);
    ctx.beginPath();
    ctx.roundRect(x - 3.5 * scale, y - 2 * scale, 7 * scale, 5 * scale, 2 * scale);
    ctx.fill();
    
    // Head with shading
    const headGrad = ctx.createRadialGradient(x - 2 * scale, y - 8 * scale, 2, x, y - 6 * scale, 11 * scale);
    headGrad.addColorStop(0, adjustBrightness('#e8c594', brightness));
    headGrad.addColorStop(0.7, adjustBrightness('#d4a574', brightness));
    headGrad.addColorStop(1, adjustBrightness('#c49560', brightness));
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(x, y - 6 * scale, 11 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair (fuller, dignified) with texture
    ctx.fillStyle = adjustBrightness('#6a5a4a', brightness);
    ctx.beginPath();
    ctx.ellipse(x, y - 13 * scale, 11 * scale, 6 * scale, 0, 0, Math.PI);
    ctx.fill();
    
    // Hair detail
    ctx.fillStyle = adjustBrightness('#5a4a3a', brightness);
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(x + i * 4 * scale, y - 12 * scale, 2 * scale, 4 * scale, 0, 0, Math.PI);
        ctx.fill();
    }
    
    // Eyes with detail
    ctx.fillStyle = adjustBrightness('#ffffff', brightness);
    ctx.beginPath();
    ctx.ellipse(x - 4 * scale, y - 8 * scale, 2 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 4 * scale, y - 8 * scale, 2 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.beginPath();
    ctx.arc(x - 4 * scale, y - 7.5 * scale, 1.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4 * scale, y - 7.5 * scale, 1.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(x - 3.5 * scale, y - 8 * scale, 0.7 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4.5 * scale, y - 8 * scale, 0.7 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose
    ctx.fillStyle = adjustBrightness('#c49560', brightness);
    ctx.beginPath();
    ctx.moveTo(x, y - 7 * scale);
    ctx.lineTo(x - 1 * scale, y - 4 * scale);
    ctx.lineTo(x + 1 * scale, y - 4 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Mouth
    ctx.strokeStyle = adjustBrightness('#8a6a4a', brightness);
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.arc(x, y - 2 * scale, 3 * scale, 0, Math.PI, false);
    ctx.stroke();
    
    // Top hat with detail and shading
    const hatGrad = ctx.createLinearGradient(x - 10 * scale, y - 32 * scale, x + 10 * scale, y - 20 * scale);
    hatGrad.addColorStop(0, adjustBrightness('#0a0000', brightness));
    hatGrad.addColorStop(0.5, adjustBrightness('#1a0a0a', brightness));
    hatGrad.addColorStop(1, adjustBrightness('#0a0000', brightness));
    
    // Hat brim
    ctx.fillStyle = adjustBrightness('#1a0a0a', brightness);
    ctx.beginPath();
    ctx.ellipse(x, y - 16 * scale, 15 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Hat crown (tall and elegant)
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.moveTo(x - 10 * scale, y - 16 * scale);
    ctx.lineTo(x - 9 * scale, y - 32 * scale);
    ctx.lineTo(x + 9 * scale, y - 32 * scale);
    ctx.lineTo(x + 10 * scale, y - 16 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Hat top
    ctx.fillStyle = adjustBrightness('#0a0000', brightness);
    ctx.beginPath();
    ctx.ellipse(x, y - 32 * scale, 9 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Hat shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x - 6 * scale, y - 30 * scale, 8 * scale, 8 * scale);
    
    // Hat band
    ctx.fillStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.fillRect(x - 10 * scale, y - 18 * scale, 20 * scale, 3 * scale);
    
    // Cane with detail
    const caneGrad = ctx.createLinearGradient(x + 11 * scale, y + 6 * scale, x + 11 * scale, y + 22 * scale);
    caneGrad.addColorStop(0, adjustBrightness('#6a5a4a', brightness));
    caneGrad.addColorStop(1, adjustBrightness('#4a3a2a', brightness));
    ctx.strokeStyle = caneGrad;
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 11 * scale, y + 7 * scale + idle);
    ctx.lineTo(x + 11 * scale, y + 22 * scale);
    ctx.stroke();
    
    // Cane handle (curved)
    ctx.strokeStyle = adjustBrightness('#8B7355', brightness);
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(x + 11 * scale, y + 5 * scale + idle, 3 * scale, Math.PI, 0, true);
    ctx.stroke();
    
    // Cane tip
    ctx.fillStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.beginPath();
    ctx.arc(x + 11 * scale, y + 22 * scale, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight if hoverable
    if (gameState.mode === 'story' || gameState.mode === 'freeplay') {
        const time = Date.now() / 1000;
        ctx.globalAlpha = 0.28 + Math.sin(time * 2) * 0.08;
        ctx.strokeStyle = '#f6e8c5';
        ctx.lineWidth = 3.2;
        ctx.setLineDash([7, 6]);
        ctx.strokeRect(emersonClickArea.x, emersonClickArea.y, emersonClickArea.width, emersonClickArea.height);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
}

// Original procedural Thoreau drawing
function drawThoreau() {
    const brightness = gameState.atmosphere.brightness;
    const x = canvas.width * 0.72;
    const y = canvas.height * 0.52;
    const time = Date.now() / 1000;
    const scale = canvas.height / 600; // Scale based on canvas size
    
    // Update clickable area
    thoreauClickArea.x = x - 25 * scale;
    thoreauClickArea.y = y - 40 * scale;
    thoreauClickArea.width = 50 * scale;
    thoreauClickArea.height = 90 * scale;
    
    // Position the cat near Thoreau's feet (uses catCanClickArea for click/hover)
    const catWidth = 26 * scale;
    const catHeight = 20 * scale;
    const catX = x + 32 * scale;
    const catY = y + 22 * scale;
    catCanClickArea.x = catX - 6 * scale;
    catCanClickArea.y = catY - 6 * scale;
    catCanClickArea.width = catWidth + 12 * scale;
    catCanClickArea.height = catHeight + 12 * scale;
    
    // Soft shadow with gradient
    const shadowGrad = ctx.createRadialGradient(x, y + 45 * scale, 0, x, y + 45 * scale, 20 * scale);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + 45 * scale, 18 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Subtle breathing animation
    const breathe = Math.sin(time * 0.8) * 0.6 * scale;
    
    // Legs with rounded edges and shading
    const sway = Math.sin(time * 0.5) * 0.8 * scale;
    
    // Leg shadows/depth
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.beginPath();
    ctx.roundRect(x - 7 * scale + sway, y + 21 * scale, 6 * scale, 23 * scale, 2 * scale);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 1 * scale - sway, y + 21 * scale, 6 * scale, 23 * scale, 2 * scale);
    ctx.fill();
    
    // Legs main
    ctx.fillStyle = adjustBrightness('#4a3a2a', brightness);
    ctx.beginPath();
    ctx.roundRect(x - 6 * scale + sway, y + 20 * scale, 5 * scale, 22 * scale, 2 * scale);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 2 * scale - sway, y + 20 * scale, 5 * scale, 22 * scale, 2 * scale);
    ctx.fill();
    
    // Body (coat) with gradient and texture
    const coatGrad = ctx.createLinearGradient(x - 15 * scale, y, x + 15 * scale, y);
    coatGrad.addColorStop(0, adjustBrightness('#4a3428', brightness));
    coatGrad.addColorStop(0.5, adjustBrightness('#5C4033', brightness));
    coatGrad.addColorStop(1, adjustBrightness('#4a3428', brightness));
    ctx.fillStyle = coatGrad;
    ctx.beginPath();
    ctx.roundRect(x - 13 * scale, y + breathe, 26 * scale, 28 * scale, 3 * scale);
    ctx.fill();
    
    // Coat collar
    ctx.fillStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.beginPath();
    ctx.arc(x - 8 * scale, y + 2 + breathe, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8 * scale, y + 2 + breathe, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Coat buttons with shine
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y + 6 * scale + i * 8 * scale + breathe, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Button shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x - 0.5 * scale, y + 5.5 * scale + i * 8 * scale + breathe, 0.8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    }
    
    // Arms with proper shading
    // Right arm (holding rod)
    ctx.save();
    ctx.translate(x + 11 * scale, y + 10 * scale + breathe);
    ctx.rotate(Math.PI / 6 + Math.sin(time) * 0.05);
    
    const armGrad = ctx.createLinearGradient(-4 * scale, 0, 4 * scale, 0);
    armGrad.addColorStop(0, adjustBrightness('#4a3428', brightness));
    armGrad.addColorStop(0.5, adjustBrightness('#5C4033', brightness));
    armGrad.addColorStop(1, adjustBrightness('#3a2418', brightness));
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.roundRect(-3.5 * scale, 0, 7 * scale, 22 * scale, 3 * scale);
    ctx.fill();
    ctx.restore();
    
    // Left arm
    ctx.fillStyle = adjustBrightness('#4a3428', brightness);
    ctx.beginPath();
    ctx.roundRect(x - 16 * scale, y + 6 * scale + breathe, 7 * scale, 18 * scale, 3 * scale);
    ctx.fill();
    
    // Hands
    ctx.fillStyle = adjustBrightness('#d4a574', brightness);
    ctx.beginPath();
    ctx.arc(x - 13 * scale, y + 24 * scale + breathe, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Neck
    ctx.fillStyle = adjustBrightness('#d4a574', brightness);
    ctx.beginPath();
    ctx.roundRect(x - 4.5 * scale, y - 2 * scale, 9 * scale, 5 * scale, 2 * scale);
    ctx.fill();
    
    // Head - smooth circle with shading
    const headGrad = ctx.createRadialGradient(x - 3 * scale, y - 10 * scale, 2, x, y - 8 * scale, 13 * scale);
    headGrad.addColorStop(0, adjustBrightness('#e8c594', brightness));
    headGrad.addColorStop(0.7, adjustBrightness('#d4a574', brightness));
    headGrad.addColorStop(1, adjustBrightness('#c49560', brightness));
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(x, y - 8 * scale, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Beard - textured and layered
    ctx.fillStyle = adjustBrightness('#5a4a3a', brightness);
    ctx.beginPath();
    ctx.arc(x, y - 2 * scale, 9 * scale, 0, Math.PI, false);
    ctx.fill();
    
    // Beard detail/texture
    ctx.fillStyle = adjustBrightness('#4a3a2a', brightness);
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(x + i * 3 * scale, y, 2 * scale, 3 * scale, 0, 0, Math.PI);
        ctx.fill();
    }
    
    // Eyes with detail
    ctx.fillStyle = adjustBrightness('#ffffff', brightness);
    ctx.beginPath();
    ctx.ellipse(x - 5 * scale, y - 10 * scale, 2.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 5 * scale, y - 10 * scale, 2.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.beginPath();
    ctx.arc(x - 5 * scale, y - 9 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5 * scale, y - 9 * scale, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(x - 4.5 * scale, y - 9.5 * scale, 0.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5.5 * scale, y - 9.5 * scale, 0.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose
    ctx.fillStyle = adjustBrightness('#c49560', brightness);
    ctx.beginPath();
    ctx.moveTo(x, y - 8 * scale);
    ctx.lineTo(x - 1 * scale, y - 5 * scale);
    ctx.lineTo(x + 1 * scale, y - 5 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Hat with detail and shading
    const hatGrad = ctx.createLinearGradient(x - 15 * scale, y - 32 * scale, x + 15 * scale, y - 20 * scale);
    hatGrad.addColorStop(0, adjustBrightness('#1a1410', brightness));
    hatGrad.addColorStop(0.5, adjustBrightness('#2C2416', brightness));
    hatGrad.addColorStop(1, adjustBrightness('#1a1410', brightness));
    
    // Hat brim
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.ellipse(x, y - 20 * scale, 19 * scale, 4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Hat crown
    ctx.fillStyle = adjustBrightness('#2C2416', brightness);
    ctx.beginPath();
    ctx.moveTo(x - 12 * scale, y - 20 * scale);
    ctx.lineTo(x - 10 * scale, y - 35 * scale);
    ctx.lineTo(x + 10 * scale, y - 35 * scale);
    ctx.lineTo(x + 12 * scale, y - 20 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Hat band
    ctx.fillStyle = adjustBrightness('#4a3a2a', brightness);
    ctx.fillRect(x - 12 * scale, y - 23 * scale, 24 * scale, 4 * scale);
    
    // Hat shine/highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x - 8 * scale, y - 33 * scale, 10 * scale, 6 * scale);
    
    // Fishing rod with better detail
    const rodTip = Math.sin(time * 2) * 2 * scale;
    
    // Rod shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 9 * scale, y + 21 * scale);
    ctx.lineTo(x + 42 * scale, y - 24 * scale + rodTip);
    ctx.stroke();
    
    // Rod gradient
    const rodGrad = ctx.createLinearGradient(x + 8 * scale, y + 20 * scale, x + 40 * scale, y - 25 * scale);
    rodGrad.addColorStop(0, adjustBrightness('#9B8365', brightness));
    rodGrad.addColorStop(0.5, adjustBrightness('#8B7355', brightness));
    rodGrad.addColorStop(1, adjustBrightness('#6d5a44', brightness));
    ctx.strokeStyle = rodGrad;
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 8 * scale, y + 20 * scale);
    ctx.lineTo(x + 40 * scale, y - 25 * scale + rodTip);
    ctx.stroke();
    
    // Rod segments/wrapping
    ctx.strokeStyle = adjustBrightness('#5a4530', brightness);
    ctx.lineWidth = 1.5 * scale;
    for (let i = 0; i < 4; i++) {
        const t = i / 4;
        const segX = x + 8 * scale + (32 * scale * t);
        const segY = y + 20 * scale - (45 * scale * t) + rodTip * t;
        ctx.beginPath();
        ctx.moveTo(segX - 2 * scale, segY);
        ctx.lineTo(segX + 2 * scale, segY);
        ctx.stroke();
    }
    
    // Rod tip with shine
    ctx.fillStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.beginPath();
    ctx.arc(x + 40 * scale, y - 25 * scale + rodTip, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 39 * scale, y - 26 * scale + rodTip, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Cat sitting near Thoreau (higher fidelity)
    const catBodyGrad = ctx.createLinearGradient(catX, catY, catX, catY + catHeight);
    catBodyGrad.addColorStop(0, adjustBrightness('#aeb9b0', brightness));
    catBodyGrad.addColorStop(1, adjustBrightness('#6d7b70', brightness));
    
    // Tail with soft curve
    ctx.fillStyle = adjustBrightness('#7f8d82', brightness);
    ctx.beginPath();
    ctx.moveTo(catX + catWidth * 0.78, catY + catHeight * 0.62);
    ctx.quadraticCurveTo(catX + catWidth * 1.25, catY + catHeight * 0.3, catX + catWidth * 0.95, catY + catHeight * 0.08);
    ctx.quadraticCurveTo(catX + catWidth * 0.82, catY + catHeight * 0.28, catX + catWidth * 0.70, catY + catHeight * 0.65);
    ctx.closePath();
    ctx.fill();
    
    // Body
    ctx.fillStyle = catBodyGrad;
    ctx.beginPath();
    ctx.ellipse(catX + catWidth * 0.46, catY + catHeight * 0.60, catWidth * 0.48, catHeight * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Subtle stripes
    ctx.strokeStyle = adjustBrightness('rgba(70, 90, 80, 0.35)', brightness);
    ctx.lineWidth = 1.2 * scale;
    for (let i = 0; i < 3; i++) {
        const stripeY = catY + catHeight * (0.55 + i * 0.12);
        ctx.beginPath();
        ctx.moveTo(catX + catWidth * 0.18, stripeY);
        ctx.quadraticCurveTo(catX + catWidth * 0.46, stripeY - catHeight * 0.08, catX + catWidth * 0.70, stripeY);
        ctx.stroke();
    }
    
    // Head
    ctx.fillStyle = catBodyGrad;
    ctx.beginPath();
    ctx.ellipse(catX + catWidth * 0.26, catY + catHeight * 0.34, catWidth * 0.30, catHeight * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ears
    ctx.fillStyle = adjustBrightness('#8f9b91', brightness);
    ctx.beginPath();
    ctx.moveTo(catX + catWidth * 0.05, catY + catHeight * 0.24);
    ctx.lineTo(catX + catWidth * 0.17, catY + catHeight * 0.02);
    ctx.lineTo(catX + catWidth * 0.26, catY + catHeight * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(catX + catWidth * 0.32, catY + catHeight * 0.24);
    ctx.lineTo(catX + catWidth * 0.44, catY + catHeight * 0.02);
    ctx.lineTo(catX + catWidth * 0.53, catY + catHeight * 0.24);
    ctx.closePath();
    ctx.fill();
    
    // Ear inner
    ctx.fillStyle = adjustBrightness('#d7c3b5', brightness);
    ctx.beginPath();
    ctx.moveTo(catX + catWidth * 0.11, catY + catHeight * 0.23);
    ctx.lineTo(catX + catWidth * 0.17, catY + catHeight * 0.09);
    ctx.lineTo(catX + catWidth * 0.22, catY + catHeight * 0.23);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(catX + catWidth * 0.37, catY + catHeight * 0.23);
    ctx.lineTo(catX + catWidth * 0.43, catY + catHeight * 0.09);
    ctx.lineTo(catX + catWidth * 0.48, catY + catHeight * 0.23);
    ctx.closePath();
    ctx.fill();
    
    // Face highlights
    ctx.fillStyle = adjustBrightness('#e4ece4', brightness);
    ctx.beginPath();
    ctx.ellipse(catX + catWidth * 0.20, catY + catHeight * 0.36, catWidth * 0.07, catHeight * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(catX + catWidth * 0.33, catY + catHeight * 0.36, catWidth * 0.07, catHeight * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#1f1f1f';
    ctx.beginPath();
    ctx.arc(catX + catWidth * 0.20, catY + catHeight * 0.34, catWidth * 0.036, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(catX + catWidth * 0.33, catY + catHeight * 0.34, catWidth * 0.036, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(catX + catWidth * 0.22, catY + catHeight * 0.32, catWidth * 0.012, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(catX + catWidth * 0.35, catY + catHeight * 0.32, catWidth * 0.012, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose and mouth
    ctx.fillStyle = adjustBrightness('#cba089', brightness);
    ctx.beginPath();
    ctx.arc(catX + catWidth * 0.26, catY + catHeight * 0.40, catWidth * 0.032, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.lineWidth = 1.3 * scale;
    ctx.beginPath();
    ctx.moveTo(catX + catWidth * 0.26, catY + catHeight * 0.42);
    ctx.quadraticCurveTo(catX + catWidth * 0.24, catY + catHeight * 0.45, catX + catWidth * 0.21, catY + catHeight * 0.47);
    ctx.moveTo(catX + catWidth * 0.26, catY + catHeight * 0.42);
    ctx.quadraticCurveTo(catX + catWidth * 0.28, catY + catHeight * 0.45, catX + catWidth * 0.31, catY + catHeight * 0.47);
    ctx.stroke();
    
    // Whiskers
    ctx.beginPath();
    ctx.moveTo(catX + catWidth * 0.17, catY + catHeight * 0.40);
    ctx.lineTo(catX + catWidth * 0.08, catY + catHeight * 0.37);
    ctx.moveTo(catX + catWidth * 0.17, catY + catHeight * 0.42);
    ctx.lineTo(catX + catWidth * 0.07, catY + catHeight * 0.43);
    ctx.moveTo(catX + catWidth * 0.35, catY + catHeight * 0.40);
    ctx.lineTo(catX + catWidth * 0.44, catY + catHeight * 0.37);
    ctx.moveTo(catX + catWidth * 0.35, catY + catHeight * 0.42);
    ctx.lineTo(catX + catWidth * 0.45, catY + catHeight * 0.43);
    ctx.stroke();
    
    // Chest fluff
    ctx.fillStyle = adjustBrightness('#e6ede6', brightness);
    ctx.beginPath();
    ctx.ellipse(catX + catWidth * 0.30, catY + catHeight * 0.50, catWidth * 0.12, catHeight * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight if hoverable
    if (gameState.mode === 'story' || gameState.mode === 'freeplay') {
        const time = Date.now() / 1000;
        ctx.globalAlpha = 0.32 + Math.sin(time * 2) * 0.1;
        ctx.strokeStyle = '#f6e8c5';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([7, 6]);
        ctx.strokeRect(thoreauClickArea.x, thoreauClickArea.y, thoreauClickArea.width, thoreauClickArea.height);
        ctx.strokeRect(catCanClickArea.x, catCanClickArea.y, catCanClickArea.width, catCanClickArea.height);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
}

function drawBird(x, y) {
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2;
    
    // Simple bird silhouette
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.quadraticCurveTo(x - 4, y - 5, x, y);
    ctx.quadraticCurveTo(x + 4, y - 5, x + 8, y);
    ctx.stroke();
}

function adjustBrightness(color, factor) {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    
    // Adjust brightness
    r = Math.min(255, Math.floor(r * factor));
    g = Math.min(255, Math.floor(g * factor));
    b = Math.min(255, Math.floor(b * factor));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Start the game when page loads
window.addEventListener('load', init);
