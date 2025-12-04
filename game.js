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
        barPosition: 0.5,
        fishPosition: 0.5,
        fishVelocity: 0,
        barSize: 0.3,
        difficulty: 1,
        currentFish: null
    },
    collection: {
        caught: new Set(),
        totalSpecies: 8
    }
};

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
        text: 'Your final lesson—that you had other lives to live—freed countless people to change course. You proved it\'s never too late to advance confidently toward one\'s dreams.'
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

// Animation frame
let lastTime = 0;
let gameLoopRunning = false;

// Sound Manager
const soundManager = {
    sounds: {},
    music: null,
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

// Initialize game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 1000;
    canvas.height = 600;
    
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
    addButtonSound('login-btn', () => window.location.href = 'auth.html');
    addButtonSound('signup-btn', () => window.location.href = 'auth.html');
    addButtonSound('back-to-menu-btn', backToMenu);
    addButtonSound('restart-btn', restartGame);
    addButtonSound('resume-btn', resumeGame);
    addButtonSound('settings-btn', openSettings);
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
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyPress);
    
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
    
    if (overThoreau || overEmerson || overCabin) {
        canvas.style.cursor = 'pointer';
    } else {
        canvas.style.cursor = 'default';
    }
}

function openBiography() {
    soundManager.play('dialogOpen');
    document.getElementById('biography-popup').classList.remove('hidden');
}

function closeBiography() {
    soundManager.play('menuClose');
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
    
    gameState.mode = 'menu';
}

function startStoryMode() {
    gameState.mode = 'story';
    resetGameState();
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    // Show status bar for story mode
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        statusBar.style.display = 'flex';
    }
    
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
    gameState.mode = 'freeplay';
    resetGameState();
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    // Hide legacies counter in free play
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        statusBar.style.display = 'none';
    }
    
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
        barPosition: 0.5,
        fishPosition: 0.5,
        fishVelocity: 0,
        barSize: 0.3,
        difficulty: 1,
        currentFish: null
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
    
    if (e.code === 'Space' && gameState.canFish && !gameState.isFishing) {
        e.preventDefault();
        startFishing();
    }
    
    // Fishing minigame controls
    if (gameState.fishingMinigame.active) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
            e.preventDefault();
            gameState.fishingMinigame.barPosition = Math.max(0, gameState.fishingMinigame.barPosition - 0.15);
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

// Add mouse/touch control for fishing minigame
let isHoldingBar = false;

document.addEventListener('mousedown', (e) => {
    if (gameState.fishingMinigame.active) {
        isHoldingBar = true;
    }
});

document.addEventListener('mouseup', (e) => {
    isHoldingBar = false;
});

document.addEventListener('touchstart', (e) => {
    if (gameState.fishingMinigame.active && !e.target.closest('.close-bio-btn')) {
        isHoldingBar = true;
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    isHoldingBar = false;
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
    
    gameState.fishingMinigame.active = true;
    gameState.fishingMinigame.progress = 0;
    gameState.fishingMinigame.barPosition = 0.5;
    gameState.fishingMinigame.fishPosition = Math.random() * 0.6 + 0.2;
    gameState.fishingMinigame.fishVelocity = (Math.random() - 0.5) * 0.015; // Reduced from 0.02
    gameState.fishingMinigame.barSize = 0.3; // Increased from 0.25
    gameState.fishingMinigame.startTime = Date.now();
    
    document.getElementById('fishing-minigame').classList.remove('hidden');
}

function updateFishingMinigame() {
    if (!gameState.fishingMinigame.active || gameState.escapeMenuOpen) return;
    
    const minigame = gameState.fishingMinigame;
    
    // Fish AI - smoother, less erratic movement
    minigame.fishVelocity += (Math.random() - 0.5) * 0.005; // Reduced from 0.008
    minigame.fishVelocity *= 0.97; // Increased damping from 0.95
    minigame.fishPosition += minigame.fishVelocity;
    
    // Keep fish in bounds
    if (minigame.fishPosition < 0.1) {
        minigame.fishPosition = 0.1;
        minigame.fishVelocity *= -0.5;
    }
    if (minigame.fishPosition > 0.9) {
        minigame.fishPosition = 0.9;
        minigame.fishVelocity *= -0.5;
    }
    
    // Bar physics - smoother control
    if (isHoldingBar) {
        minigame.barPosition = Math.max(0, minigame.barPosition - 0.02); // Reduced from 0.03
    } else {
        minigame.barPosition = Math.min(1, minigame.barPosition + 0.018); // Reduced from 0.025
    }
    
    // Check if fish is in bar
    const barTop = minigame.barPosition;
    const barBottom = minigame.barPosition + minigame.barSize;
    
    if (minigame.fishPosition >= barTop && minigame.fishPosition <= barBottom) {
        minigame.progress += 0.012; // Reduced from 0.02 to make it take longer
    } else {
        minigame.progress -= 0.006; // Reduced from 0.008 for slightly more challenge
    }
    
    minigame.progress = Math.max(0, Math.min(1, minigame.progress));
    
    // Update UI
    const progressBar = document.getElementById('catch-progress-fill');
    const fishIcon = document.getElementById('fish-icon');
    const barElement = document.getElementById('fishing-bar');
    
    if (progressBar) progressBar.style.height = `${minigame.progress * 100}%`;
    if (fishIcon) {
        fishIcon.style.top = `${minigame.fishPosition * 100}%`;
        // Update fish emoji in free play mode
        if (gameState.mode === 'freeplay' && minigame.currentFish) {
            fishIcon.textContent = minigame.currentFish.emoji;
        }
    }
    if (barElement) barElement.style.top = `${minigame.barPosition * 100}%`;
    
    // Win condition
    if (minigame.progress >= 1) {
        endFishingMinigame(true);
    }
    
    // Lose condition
    if (minigame.progress <= 0 && Date.now() - minigame.startTime > 2000) {
        // Give player a bit of time before they can fail
        // Actually, let's make it forgiving - they can't fail
    }
}

function endFishingMinigame(success) {
    gameState.fishingMinigame.active = false;
    document.getElementById('fishing-minigame').classList.add('hidden');
    
    if (success) {
        soundManager.play('fishCaught');
        setTimeout(() => {
            catchFish();
        }, 500);
    } else {
        // Reset for another try
        gameState.isFishing = false;
        fishingLine = null;
        enableFishing();
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

function showCollectionScreen() {
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('collection-screen').classList.add('active');
    
    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';
    
    fishSpecies.forEach(fish => {
        const isCaught = gameState.collection.caught.has(fish.id);
        const card = document.createElement('div');
        card.className = `fish-card ${isCaught ? 'caught' : 'locked'} rarity-${fish.rarity}`;
        
        card.innerHTML = `
            <div class="fish-emoji">${isCaught ? fish.emoji : '❓'}</div>
            <div class="fish-name">${isCaught ? fish.name : '???'}</div>
            <div class="fish-rarity">${fish.rarity.toUpperCase()}</div>
            ${isCaught ? `<div class="fish-desc">${fish.description}</div>` : '<div class="fish-desc">Catch this fish to unlock!</div>'}
        `;
        
        grid.appendChild(card);
    });
    
    const counter = document.getElementById('collection-counter');
    counter.textContent = `${gameState.collection.caught.size} / ${fishSpecies.length} species collected`;
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
    const brightness = gameState.atmosphere.brightness;
    const fog = gameState.atmosphere.fog;
    const time = Date.now() / 10000;
    
    // Sky gradient - more natural colors with depth
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    skyGradient.addColorStop(0, adjustBrightness('#5a7fa5', brightness));
    skyGradient.addColorStop(0.3, adjustBrightness('#7a9fb5', brightness));
    skyGradient.addColorStop(0.7, adjustBrightness('#9fbfd8', brightness));
    skyGradient.addColorStop(1, adjustBrightness('#c5dfe8', brightness));
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);
    
    // Add subtle clouds
    drawClouds();
    
    // Sun with glow
    const sunX = canvas.width * 0.8;
    const sunY = canvas.height * 0.15;
    const sunSize = 35 * Math.min(brightness, 1.2);
    
    // Sun glow
    if (brightness > 0.9) {
        const glowGradient = ctx.createRadialGradient(sunX, sunY, sunSize * 0.5, sunX, sunY, sunSize * 3);
        glowGradient.addColorStop(0, `rgba(255, 220, 100, ${0.3 * brightness})`);
        glowGradient.addColorStop(1, 'rgba(255, 220, 100, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(sunX - sunSize * 3, sunY - sunSize * 3, sunSize * 6, sunSize * 6);
    }
    
    // Sun body
    ctx.fillStyle = adjustBrightness('#ffd95a', brightness);
    ctx.globalAlpha = Math.min(brightness * 0.9, 1);
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
    
    // Pond-like water with radial gradient for depth
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.82;
    const waterGradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, canvas.width * 0.8);
    waterGradient.addColorStop(0, adjustBrightness('#2a4a5a', brightness));
    waterGradient.addColorStop(0.4, adjustBrightness('#3a5a6a', brightness));
    waterGradient.addColorStop(0.7, adjustBrightness('#2a4a5a', brightness));
    waterGradient.addColorStop(1, adjustBrightness('#1a3a4a', brightness));
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, canvas.height * 0.65, canvas.width, canvas.height * 0.35);
    
    // Pond edge/shore reflections
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = adjustBrightness('#4a5a4a', brightness);
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.5, canvas.height * 0.66, canvas.width * 0.45, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Water surface shimmer effect
    drawWaterShimmer();
    
    // Water ripples and waves
    drawWaterWaves(time);
    
    // Lily pads and water plants
    drawWaterPlants();
    
    // Water sparkles
    particles.forEach(particle => {
        if (particle.type === 'sparkle' && gameState.atmosphere.soundEnabled) {
            const twinkle = Math.sin(Date.now() / 500 + particle.x) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha * twinkle})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            particle.y += particle.speedY;
            if (particle.y < canvas.height * 0.65 || particle.y > canvas.height) {
                particle.y = canvas.height * 0.65 + Math.random() * (canvas.height * 0.35);
            }
        }
    });
    
    // Birds
    particles.forEach(particle => {
        if (particle.type === 'bird' && gameState.atmosphere.soundEnabled) {
            drawBird(particle.x, particle.y);
            particle.x += particle.speedX;
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
    
    ctx.globalAlpha = 0.3 * brightness;
    
    // Multiple cloud layers for depth
    const clouds = [
        { x: (time * 20) % (canvas.width + 400) - 200, y: 80, scale: 1.2 },
        { x: (time * 15 + 300) % (canvas.width + 400) - 200, y: 120, scale: 1.0 },
        { x: (time * 10 + 600) % (canvas.width + 400) - 200, y: 50, scale: 0.8 }
    ];
    
    clouds.forEach(cloud => {
        ctx.fillStyle = adjustBrightness('#ffffff', brightness);
        
        // Draw fluffy cloud shape
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 40 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 30 * cloud.scale, cloud.y, 50 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 70 * cloud.scale, cloud.y, 40 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 50 * cloud.scale, cloud.y - 20 * cloud.scale, 35 * cloud.scale, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.globalAlpha = 1;
}

function drawDistantHills() {
    const brightness = gameState.atmosphere.brightness;
    
    ctx.globalAlpha = 0.4;
    
    // Multiple layers of hills for depth
    const hillLayers = [
        { y: 0.50, color: '#4a6a5a', height: 40 },
        { y: 0.53, color: '#3a5a4a', height: 35 },
        { y: 0.56, color: '#2a4a3a', height: 30 }
    ];
    
    hillLayers.forEach((layer, index) => {
        ctx.fillStyle = adjustBrightness(layer.color, brightness * (0.4 + index * 0.1));
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * layer.y + layer.height);
        
        for (let x = 0; x <= canvas.width; x += 40) {
            const noise = Math.sin((x + index * 100) * 0.008) * layer.height + 
                         Math.cos((x + index * 50) * 0.015) * (layer.height * 0.6);
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
    
    ctx.globalAlpha = 0.65;
    
    // Dense distant forest
    ctx.fillStyle = adjustBrightness('#2a4a3a', brightness * 0.65);
    
    for (let i = 0; i < 30; i++) {
        const x = (i * canvas.width / 29) - 20;
        const y = canvas.height * 0.54;
        const height = 60 + (Math.sin(i * 0.5) * 15) + (i % 4) * 20;
        const width = 8 + (i % 3) * 4;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - width, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
}

function drawCabin() {
    const brightness = gameState.atmosphere.brightness;
    const cabinX = canvas.width * 0.15;
    const cabinY = canvas.height * 0.48;
    const cabinWidth = 80;
    const cabinHeight = 50;
    
    // Update clickable area
    cabinClickArea.x = cabinX - 5;
    cabinClickArea.y = cabinY - 10;
    cabinClickArea.width = cabinWidth + 10;
    cabinClickArea.height = cabinHeight + 15;
    
    // Cabin shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(cabinX + 3, cabinY + cabinHeight - 2, cabinWidth, 8);
    
    // Cabin walls (log cabin)
    ctx.fillStyle = adjustBrightness('#6d5a44', brightness);
    ctx.fillRect(cabinX, cabinY, cabinWidth, cabinHeight);
    
    // Log lines (horizontal)
    ctx.strokeStyle = adjustBrightness('#5a4a35', brightness);
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const y = cabinY + i * (cabinHeight / 6);
        ctx.beginPath();
        ctx.moveTo(cabinX, y);
        ctx.lineTo(cabinX + cabinWidth, y);
        ctx.stroke();
    }
    
    // Roof
    ctx.fillStyle = adjustBrightness('#4a3a2a', brightness);
    ctx.beginPath();
    ctx.moveTo(cabinX - 10, cabinY);
    ctx.lineTo(cabinX + cabinWidth / 2, cabinY - 25);
    ctx.lineTo(cabinX + cabinWidth + 10, cabinY);
    ctx.closePath();
    ctx.fill();
    
    // Roof shingles
    ctx.strokeStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cabinX - 8 + i * 22, cabinY - i * 6);
        ctx.lineTo(cabinX + cabinWidth / 2, cabinY - 25 + i * 6);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cabinX + cabinWidth + 8 - i * 22, cabinY - i * 6);
        ctx.lineTo(cabinX + cabinWidth / 2, cabinY - 25 + i * 6);
        ctx.stroke();
    }
    
    // Door
    ctx.fillStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.fillRect(cabinX + 10, cabinY + 15, 18, 35);
    
    // Door handle
    ctx.fillStyle = adjustBrightness('#8B7355', brightness);
    ctx.beginPath();
    ctx.arc(cabinX + 24, cabinY + 32, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Window
    ctx.fillStyle = adjustBrightness('#5a7a8a', brightness * 1.2);
    ctx.fillRect(cabinX + 45, cabinY + 20, 20, 15);
    
    // Window panes
    ctx.strokeStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cabinX + 55, cabinY + 20);
    ctx.lineTo(cabinX + 55, cabinY + 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cabinX + 45, cabinY + 27.5);
    ctx.lineTo(cabinX + 65, cabinY + 27.5);
    ctx.stroke();
    
    // Window reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(cabinX + 47, cabinY + 22, 6, 4);
    
    // Chimney
    ctx.fillStyle = adjustBrightness('#5a4a35', brightness);
    ctx.fillRect(cabinX + cabinWidth - 15, cabinY - 15, 12, 20);
    
    // Chimney top
    ctx.fillRect(cabinX + cabinWidth - 17, cabinY - 16, 16, 3);
    
    // Smoke
    if (gameState.atmosphere.soundEnabled) {
        const time = Date.now() / 1000;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = adjustBrightness('#888888', brightness);
        for (let i = 0; i < 3; i++) {
            const smokeY = cabinY - 18 - i * 8 + Math.sin(time + i) * 2;
            const smokeX = cabinX + cabinWidth - 9 + Math.sin(time * 2 + i) * 3;
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, 4 + i, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    // Highlight if hoverable
    if (gameState.mode === 'story' || gameState.mode === 'freeplay') {
        const time = Date.now() / 1000;
        ctx.globalAlpha = 0.1 + Math.sin(time * 2) * 0.05;
        ctx.strokeStyle = '#e8dcc4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
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
    
    // Lily pads
    const lilyPads = [
        { x: 150, y: canvas.height * 0.75, size: 25, rotation: 0.3 },
        { x: 280, y: canvas.height * 0.72, size: 20, rotation: -0.5 },
        { x: 200, y: canvas.height * 0.82, size: 22, rotation: 0.8 },
        { x: 400, y: canvas.height * 0.78, size: 18, rotation: -0.2 }
    ];
    
    lilyPads.forEach(pad => {
        ctx.save();
        ctx.translate(pad.x, pad.y);
        ctx.rotate(pad.rotation);
        
        // Lily pad shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(2, 2, pad.size, pad.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Lily pad
        ctx.fillStyle = adjustBrightness('#4a6a3a', brightness);
        ctx.beginPath();
        ctx.ellipse(0, 0, pad.size, pad.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Lily pad notch
        ctx.fillStyle = adjustBrightness('#3a5a2a', brightness);
        ctx.beginPath();
        ctx.moveTo(pad.size * 0.7, -pad.size * 0.3);
        ctx.lineTo(pad.size, 0);
        ctx.lineTo(pad.size * 0.7, pad.size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Lily pad vein
        ctx.strokeStyle = adjustBrightness('#3a5a2a', brightness);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(pad.size * 0.8, 0);
        ctx.stroke();
        
        ctx.restore();
    });
    
    // Reeds in the background
    ctx.globalAlpha = 0.6;
    const reeds = [
        { x: 80, heights: [40, 50, 45] },
        { x: 120, heights: [45, 55, 48] },
        { x: 900, heights: [42, 52, 46] },
        { x: 950, heights: [38, 48, 44] }
    ];
    
    reeds.forEach(reed => {
        reed.heights.forEach((height, i) => {
            const x = reed.x + i * 5;
            const baseY = canvas.height * 0.72;
            const sway = Math.sin(Date.now() / 800 + x) * 3;
            
            ctx.strokeStyle = adjustBrightness('#4a5a3a', brightness);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.quadraticCurveTo(x + sway, baseY - height / 2, x + sway * 2, baseY - height);
            ctx.stroke();
            
            // Reed top
            ctx.fillStyle = adjustBrightness('#5a6a4a', brightness);
            ctx.beginPath();
            ctx.ellipse(x + sway * 2, baseY - height - 3, 2, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    });
    
    ctx.globalAlpha = 1;
}

function drawTrees() {
    const brightness = gameState.atmosphere.brightness;
    
    // More detailed tree shapes
    const treePositions = [
        { x: 150, scale: 1.2, offset: 0 },
        { x: 320, scale: 1.0, offset: 10 },
        { x: 550, scale: 1.3, offset: -5 },
        { x: 750, scale: 0.9, offset: 5 },
        { x: 900, scale: 1.1, offset: 0 }
    ];
    
    treePositions.forEach(tree => {
        const x = tree.x;
        const y = canvas.height * 0.56 + tree.offset;
        const scale = tree.scale;
        
        // Trunk
        ctx.fillStyle = adjustBrightness('#4a3a2a', brightness);
        ctx.fillRect(x - 6 * scale, y, 12 * scale, 80 * scale);
        
        // Tree crown - layered for depth
        const layers = [
            { y: y + 10 * scale, size: 45 * scale, color: '#2d5a2d' },
            { y: y - 10 * scale, size: 40 * scale, color: '#3a6a3a' },
            { y: y - 25 * scale, size: 35 * scale, color: '#4a7a4a' }
        ];
        
        layers.forEach(layer => {
            ctx.fillStyle = adjustBrightness(layer.color, brightness);
            ctx.beginPath();
            ctx.moveTo(x, layer.y - layer.size);
            ctx.lineTo(x - layer.size, layer.y + layer.size * 0.5);
            ctx.lineTo(x + layer.size, layer.y + layer.size * 0.5);
            ctx.closePath();
            ctx.fill();
        });
    });
}

function drawShore() {
    const brightness = gameState.atmosphere.brightness;
    
    // Grass and earth with more natural edge
    ctx.fillStyle = adjustBrightness('#4a5a3a', brightness);
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.55, canvas.height * 0.65);
    
    // Create irregular shoreline
    for (let x = canvas.width * 0.55; x <= canvas.width; x += 20) {
        const noise = Math.sin(x * 0.05) * 2;
        ctx.lineTo(x, canvas.height * 0.63 + noise);
    }
    
    ctx.lineTo(canvas.width, canvas.height * 0.67);
    
    for (let x = canvas.width; x >= canvas.width * 0.55; x -= 20) {
        const noise = Math.cos(x * 0.05) * 2;
        ctx.lineTo(x, canvas.height * 0.67 + noise);
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Darker earth layer
    ctx.fillStyle = adjustBrightness('#3a4a2a', brightness);
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.55, canvas.height * 0.67);
    for (let x = canvas.width * 0.55; x <= canvas.width; x += 20) {
        const noise = Math.cos(x * 0.05) * 2;
        ctx.lineTo(x, canvas.height * 0.67 + noise);
    }
    ctx.lineTo(canvas.width, canvas.height * 0.68);
    ctx.lineTo(canvas.width * 0.55, canvas.height * 0.68);
    ctx.closePath();
    ctx.fill();
    
    // Add grass details with more variety
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 30; i++) {
        const x = canvas.width * 0.6 + Math.random() * canvas.width * 0.35;
        const y = canvas.height * 0.64 + Math.random() * 15;
        const height = 8 + Math.random() * 8;
        const sway = Math.sin(Date.now() / 1000 + i) * 2;
        
        ctx.strokeStyle = adjustBrightness(
            i % 3 === 0 ? '#5a6a4a' : '#4a5a3a', 
            brightness
        );
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + sway + (Math.random() - 0.5) * 3, y - height);
        ctx.stroke();
    }
    
    // Add some small rocks
    ctx.fillStyle = adjustBrightness('#5a5a5a', brightness);
    for (let i = 0; i < 8; i++) {
        const x = canvas.width * 0.58 + Math.random() * canvas.width * 0.3;
        const y = canvas.height * 0.65 + Math.random() * 8;
        const size = 2 + Math.random() * 3;
        
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    
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
    
    // Update clickable area
    emersonClickArea.x = x - 18;
    emersonClickArea.y = y - 30;
    emersonClickArea.width = 36;
    emersonClickArea.height = 65;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 36, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.fillRect(x - 5, y + 18, 4, 18);
    ctx.fillRect(x + 1, y + 18, 4, 18);
    
    // Body (formal coat)
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.fillRect(x - 9, y, 18, 22);
    
    // Coat tails
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 18);
    ctx.lineTo(x - 12, y + 26);
    ctx.lineTo(x - 6, y + 22);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 18);
    ctx.lineTo(x + 12, y + 26);
    ctx.lineTo(x + 6, y + 22);
    ctx.closePath();
    ctx.fill();
    
    // White shirt
    ctx.fillStyle = adjustBrightness('#f5f0e8', brightness);
    ctx.fillRect(x - 5, y + 2, 10, 8);
    
    // Arms
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.fillRect(x - 11, y + 4, 4, 14);
    ctx.fillRect(x + 7, y + 4, 4, 14);
    
    // Neck
    ctx.fillStyle = adjustBrightness('#d4a574', brightness);
    ctx.fillRect(x - 3, y - 2, 6, 4);
    
    // Head
    ctx.fillStyle = adjustBrightness('#d4a574', brightness);
    ctx.beginPath();
    ctx.arc(x, y - 6, 9, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair (fuller, dignified)
    ctx.fillStyle = adjustBrightness('#5a4a3a', brightness);
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 9, 5, 0, 0, Math.PI);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.fillRect(x - 3, y - 8, 2, 2);
    ctx.fillRect(x + 1, y - 8, 2, 2);
    
    // Top hat
    ctx.fillStyle = adjustBrightness('#1a0a0a', brightness);
    // Hat brim
    ctx.fillRect(x - 12, y - 16, 24, 3);
    // Hat crown (tall)
    ctx.fillRect(x - 8, y - 28, 16, 15);
    
    // Cane
    ctx.strokeStyle = adjustBrightness('#4a3a2a', brightness);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 6);
    ctx.lineTo(x + 11, y + 20);
    ctx.stroke();
    
    // Cane handle
    ctx.beginPath();
    ctx.arc(x + 11, y + 4, 2.5, Math.PI, 0);
    ctx.stroke();
    
    // Highlight if hoverable
    if (gameState.mode === 'story' || gameState.mode === 'freeplay') {
        ctx.globalAlpha = 0.1 + Math.sin(time * 2) * 0.05;
        ctx.strokeStyle = '#e8dcc4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(emersonClickArea.x, emersonClickArea.y, emersonClickArea.width, emersonClickArea.height);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
}

function drawThoreau() {
    const brightness = gameState.atmosphere.brightness;
    const x = canvas.width * 0.72;
    const y = canvas.height * 0.52;
    const time = Date.now() / 1000;
    
    // Update clickable area
    thoreauClickArea.x = x - 20;
    thoreauClickArea.y = y - 35;
    thoreauClickArea.width = 45;
    thoreauClickArea.height = 80;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 43, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Subtle breathing animation
    const breathe = Math.sin(time * 0.8) * 0.5;
    
    // Legs with slight sway
    const sway = Math.sin(time * 0.5) * 0.5;
    ctx.fillStyle = adjustBrightness('#3a2a1a', brightness);
    ctx.fillRect(x - 6 + sway, y + 20, 5, 21);
    ctx.fillRect(x + 1 - sway, y + 20, 5, 21);
    
    // Body (coat)
    ctx.fillStyle = adjustBrightness('#5C4033', brightness);
    ctx.fillRect(x - 11, y + breathe, 22, 26);
    
    // Coat buttons
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y + 5 + i * 7 + breathe, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Arms
    ctx.fillStyle = adjustBrightness('#5C4033', brightness);
    // Right arm (holding rod) with slight motion
    ctx.save();
    ctx.translate(x + 10, y + 8 + breathe);
    ctx.rotate(Math.PI / 6 + Math.sin(time) * 0.05);
    ctx.fillRect(-3, 0, 6, 19);
    ctx.restore();
    
    // Left arm
    ctx.fillRect(x - 14, y + 5 + breathe, 6, 16);
    
    // Neck
    ctx.fillStyle = adjustBrightness('#d4a574', brightness);
    ctx.fillRect(x - 4, y - 2, 8, 4);
    
    // Head - clean circle
    ctx.fillStyle = adjustBrightness('#d4a574', brightness);
    ctx.beginPath();
    ctx.arc(x, y - 8, 11, 0, Math.PI * 2);
    ctx.fill();
    
    // Simple beard - just a half circle at bottom
    ctx.fillStyle = adjustBrightness('#4a3a2a', brightness);
    ctx.beginPath();
    ctx.arc(x, y - 3, 7, 0, Math.PI);
    ctx.fill();
    
    // Two simple eyes
    ctx.fillStyle = adjustBrightness('#2a1a0a', brightness);
    ctx.fillRect(x - 4, y - 10, 2, 2);
    ctx.fillRect(x + 2, y - 10, 2, 2);
    
    // Hat
    ctx.fillStyle = adjustBrightness('#2C2416', brightness);
    // Hat brim
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 17, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hat crown
    ctx.fillRect(x - 11, y - 32, 22, 15);
    // Hat band
    ctx.fillStyle = adjustBrightness('#4a3a2a', brightness);
    ctx.fillRect(x - 11, y - 22, 22, 3);
    
    // Fishing rod (more detailed)
    const rodTip = Math.sin(time * 2) * 1;
    ctx.strokeStyle = adjustBrightness('#8B7355', brightness);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 20);
    ctx.lineTo(x + 40, y - 25 + rodTip);
    ctx.stroke();
    
    // Rod segments
    ctx.strokeStyle = adjustBrightness('#6d5a44', brightness);
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const segY = y + 20 - (i * 15);
        ctx.beginPath();
        ctx.moveTo(x + 8 + (i * 10.5), segY);
        ctx.lineTo(x + 11 + (i * 10.5), segY);
        ctx.stroke();
    }
    
    // Rod tip
    ctx.fillStyle = adjustBrightness('#6d5a44', brightness);
    ctx.beginPath();
    ctx.arc(x + 40, y - 25 + rodTip, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight if hoverable
    if (gameState.mode === 'story' || gameState.mode === 'freeplay') {
        ctx.globalAlpha = 0.1 + Math.sin(time * 2) * 0.05;
        ctx.strokeStyle = '#e8dcc4';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(thoreauClickArea.x, thoreauClickArea.y, thoreauClickArea.width, thoreauClickArea.height);
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

