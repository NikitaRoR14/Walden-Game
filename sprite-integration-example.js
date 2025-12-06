/**
 * Example: How to integrate the Sprite System into Walden Game
 * 
 * This file shows how to use the sprite system alongside existing procedural drawing
 */

// ============================================================================
// STEP 1: Initialize Sprite Manager (in game.js init function)
// ============================================================================

let spriteManager;
let useSprites = false; // Toggle between sprites and procedural drawing

async function initSpriteSystem() {
    spriteManager = new SpriteManager();
    
    // Set up progress callback
    spriteManager.onProgress = (loaded, total) => {
        console.log(`Loading sprites: ${loaded}/${total}`);
        // Optional: Show loading bar
    };
    
    // Load character sprites
    spriteManager.load('thoreau_idle', 'assets/sprites/characters/thoreau_idle.png', {
        scale: 1,
        anchorX: 0.5,
        anchorY: 1 // Bottom-center anchor for characters
    });
    
    spriteManager.load('thoreau_fishing', 'assets/sprites/characters/thoreau_fishing.png', {
        frames: 4,
        animated: true,
        animationSpeed: 0.15,
        loop: true,
        scale: 1,
        anchorX: 0.5,
        anchorY: 1
    });
    
    spriteManager.load('emerson_idle', 'assets/sprites/characters/emerson_idle.png', {
        scale: 1,
        anchorX: 0.5,
        anchorY: 1
    });
    
    // Load environment sprites
    spriteManager.load('cabin', 'assets/sprites/environment/cabin.png', {
        scale: 1,
        anchorX: 0.5,
        anchorY: 1
    });
    
    spriteManager.load('tree_pine', 'assets/sprites/environment/tree_pine.png', {
        scale: 1,
        anchorX: 0.5,
        anchorY: 1
    });
    
    // Load effects
    spriteManager.load('water_splash', 'assets/sprites/effects/splash.png', {
        frames: 6,
        animated: true,
        animationSpeed: 0.2,
        loop: false,
        scale: 1,
        anchorX: 0.5,
        anchorY: 0.5
    });
    
    // Load all sprites
    await spriteManager.loadAll();
    console.log('✓ All sprites loaded!');
    
    useSprites = true; // Enable sprite rendering
}

// ============================================================================
// STEP 2: Update Game Loop to handle animated sprites
// ============================================================================

function gameLoop() {
    // ... existing game loop code ...
    
    // Update animated sprites
    if (useSprites && spriteManager) {
        // Update any active animations
        const fishingSprite = spriteManager.get('thoreau_fishing');
        if (fishingSprite && gameState.isFishing) {
            fishingSprite.update(1); // Pass delta time if available
        }
        
        const splashSprite = spriteManager.get('water_splash');
        if (splashSprite) {
            splashSprite.update(1);
        }
    }
    
    // ... rest of game loop ...
}

// ============================================================================
// STEP 3: Replace procedural drawing with sprite drawing
// ============================================================================

function drawThoreau(x, y) {
    if (useSprites && spriteManager) {
        // Use sprite system
        const sprite = gameState.isFishing ? 
            spriteManager.get('thoreau_fishing') : 
            spriteManager.get('thoreau_idle');
        
        if (sprite) {
            // Start animation if fishing
            if (gameState.isFishing && sprite instanceof AnimatedSprite) {
                sprite.play();
            }
            
            sprite.draw(ctx, x, y, 1);
            return; // Skip procedural drawing
        }
    }
    
    // Fallback to procedural drawing if sprites not loaded
    drawThoreauProcedural(x, y);
}

function drawEmerson(x, y) {
    if (useSprites && spriteManager) {
        const sprite = spriteManager.get('emerson_idle');
        if (sprite) {
            sprite.draw(ctx, x, y, 1);
            return;
        }
    }
    
    // Fallback to procedural drawing
    drawEmersonProcedural(x, y);
}

function drawCabin(x, y) {
    if (useSprites && spriteManager) {
        const sprite = spriteManager.get('cabin');
        if (sprite) {
            sprite.draw(ctx, x, y, 1);
            return;
        }
    }
    
    // Fallback to procedural drawing
    drawCabinProcedural(x, y);
}

// ============================================================================
// STEP 4: Add sprite effects (like water splash)
// ============================================================================

function createWaterSplash(x, y) {
    if (useSprites && spriteManager) {
        // Get a new instance of the splash sprite
        const splash = spriteManager.getInstance('water_splash');
        if (splash) {
            splash.reset();
            splash.play();
            
            // Store splash with position
            activeSplashes.push({ sprite: splash, x, y });
            
            // Remove when animation completes
            splash.onComplete = () => {
                const index = activeSplashes.findIndex(s => s.sprite === splash);
                if (index !== -1) {
                    activeSplashes.splice(index, 1);
                }
            };
        }
    }
}

// Draw all active splashes
function drawSplashes() {
    activeSplashes.forEach(({ sprite, x, y }) => {
        sprite.draw(ctx, x, y, 1);
    });
}

// ============================================================================
// STEP 5: Add settings toggle for sprites
// ============================================================================

function addSpriteToggle() {
    const settingsContent = document.querySelector('.settings-content');
    
    const toggleHTML = `
        <div class="setting-item">
            <label for="sprite-toggle">
                <input type="checkbox" id="sprite-toggle" ${useSprites ? 'checked' : ''}>
                Use Sprite Graphics
            </label>
        </div>
    `;
    
    settingsContent.insertAdjacentHTML('beforeend', toggleHTML);
    
    document.getElementById('sprite-toggle').addEventListener('change', (e) => {
        useSprites = e.target.checked;
        console.log(`Sprites ${useSprites ? 'enabled' : 'disabled'}`);
    });
}

// ============================================================================
// STEP 6: Integration in index.html
// ============================================================================

/*
Add to index.html BEFORE game.js:

<script src="sprite-system.js"></script>
<script src="sprite-integration-example.js"></script>
<script src="game.js"></script>

Then in game.js init():

async function init() {
    // ... existing init code ...
    
    // Initialize sprite system
    try {
        await initSpriteSystem();
        console.log('✓ Sprite system ready');
    } catch (error) {
        console.error('Failed to load sprites:', error);
        useSprites = false; // Fall back to procedural
    }
    
    // ... rest of init ...
}
*/

// ============================================================================
// USAGE SUMMARY
// ============================================================================

/*
1. Create sprite images in PNG format with transparency
2. Place them in assets/sprites/ following the directory structure
3. Load sprites using spriteManager.load()
4. Replace drawing functions to check useSprites flag
5. For animations, call sprite.update() in game loop
6. Use sprite.draw(ctx, x, y, scale) to render

SPRITE IMAGE REQUIREMENTS:
- Format: PNG with alpha transparency
- Size: 2x resolution for retina (e.g., 128x128 for 64x64 display)
- Spritesheets: Frames arranged horizontally
- Naming: descriptive_state.png (e.g., thoreau_fishing.png)

EXAMPLE SPRITESHEET:
For a 4-frame fishing animation:
- Total image size: 512x128 (4 frames of 128x128)
- Frames arranged: [Frame1][Frame2][Frame3][Frame4]
- Load with: frames: 4, animated: true
*/

