# Sprite System Design for Walden Game

## Overview
A flexible sprite system to replace procedural drawing with image-based rendering for better visuals and easier content creation.

## Image Format Requirements

### Recommended Formats
- **PNG** (Preferred) - Supports transparency, lossless
- **WebP** - Modern format, smaller files, transparency
- Avoid JPEG (no transparency support)

### Image Specifications
- **Resolution**: 2x for retina displays (e.g., 128x128 for 64x64 display)
- **Transparency**: Alpha channel required for characters/objects
- **Color Mode**: RGB/RGBA
- **Bit Depth**: 24-bit (RGB) or 32-bit (RGBA)

## Directory Structure

```
assets/
├── sprites/
│   ├── characters/
│   │   ├── thoreau/
│   │   │   ├── idle.png          (single frame or spritesheet)
│   │   │   ├── fishing.png
│   │   │   └── walking.png
│   │   ├── emerson/
│   │   │   └── idle.png
│   │   └── ...
│   ├── environment/
│   │   ├── cabin.png
│   │   ├── trees/
│   │   │   ├── pine_1.png
│   │   │   ├── pine_2.png
│   │   │   └── oak.png
│   │   ├── water/
│   │   │   └── pond_tile.png
│   │   └── ground/
│   │       └── grass_tile.png
│   ├── ui/
│   │   ├── buttons/
│   │   ├── icons/
│   │   └── frames/
│   └── effects/
│       ├── splash.png
│       ├── ripple.png
│       └── sparkle.png
```

## Sprite Types

### 1. Static Sprites
Single image, no animation
- Trees, cabin, rocks
- UI elements

### 2. Animated Sprites (Spritesheets)
Multiple frames in one image, arranged horizontally or in a grid
- Character animations
- Water ripples
- Effects

**Spritesheet Format:**
```
[Frame1][Frame2][Frame3][Frame4]
```
- Frames arranged left-to-right
- Each frame same size
- Metadata specifies frame count and size

### 3. Tileable Sprites
Repeating patterns for large areas
- Ground textures
- Water surfaces
- Backgrounds

## Implementation Architecture

### Core Classes

#### SpriteManager
```javascript
class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.loadQueue = [];
        this.loaded = 0;
        this.total = 0;
    }
    
    load(id, path, options = {}) { }
    get(id) { }
    isLoaded() { }
    getLoadProgress() { }
}
```

#### Sprite
```javascript
class Sprite {
    constructor(image, options = {}) {
        this.image = image;
        this.width = options.width || image.width;
        this.height = options.height || image.height;
        this.frames = options.frames || 1;
        this.frameWidth = this.width / this.frames;
        this.currentFrame = 0;
        this.animationSpeed = options.animationSpeed || 0.1;
        this.loop = options.loop !== false;
    }
    
    draw(ctx, x, y, scale = 1) { }
    update(deltaTime) { }
    setFrame(frame) { }
}
```

#### AnimatedSprite extends Sprite
```javascript
class AnimatedSprite extends Sprite {
    constructor(image, options) {
        super(image, options);
        this.playing = false;
        this.frameTime = 0;
    }
    
    play() { }
    stop() { }
    reset() { }
}
```

## Usage Examples

### Loading Sprites
```javascript
// Initialize sprite manager
const spriteManager = new SpriteManager();

// Load sprites
spriteManager.load('thoreau_idle', 'assets/sprites/characters/thoreau/idle.png');
spriteManager.load('thoreau_fishing', 'assets/sprites/characters/thoreau/fishing.png', {
    frames: 4,
    animationSpeed: 0.15,
    loop: true
});
spriteManager.load('cabin', 'assets/sprites/environment/cabin.png');

// Wait for loading
await spriteManager.loadAll();
```

### Drawing Sprites
```javascript
// Get sprite
const thoreauSprite = spriteManager.get('thoreau_idle');

// Draw at position
thoreauSprite.draw(ctx, x, y, scale);

// Animated sprite
const fishingSprite = spriteManager.get('thoreau_fishing');
fishingSprite.play();

// In game loop
function update(deltaTime) {
    fishingSprite.update(deltaTime);
}

function render() {
    fishingSprite.draw(ctx, x, y);
}
```

## Integration with Current Game

### Phase 1: Parallel System
- Keep existing procedural drawing
- Add sprite system alongside
- Use flag to switch between modes

### Phase 2: Character Sprites
- Replace Thoreau procedural drawing
- Replace Emerson procedural drawing
- Add other characters

### Phase 3: Environment
- Replace cabin drawing
- Add tree sprites
- Add water/ground tiles

### Phase 4: Effects & UI
- Fishing effects
- UI elements
- Particle effects

## Performance Considerations

### Optimization Techniques
1. **Sprite Atlases**: Combine multiple sprites into one image
2. **Caching**: Pre-render complex sprites to off-screen canvas
3. **Culling**: Don't draw sprites outside viewport
4. **Object Pooling**: Reuse sprite instances

### Memory Management
- Unload unused sprites
- Use appropriate image sizes
- Compress images (WebP, optimized PNG)

## Tools for Creating Sprites

### Recommended Software
- **Aseprite** - Pixel art and animation
- **GIMP** - Free, powerful image editor
- **Photoshop** - Professional tool
- **Piskel** - Free online pixel art tool

### AI Generation
- **DALL-E / Midjourney** - Generate base images
- **Stable Diffusion** - Local generation
- Post-process to pixel art style

## Migration Strategy

1. Create sprite system classes
2. Load test sprites
3. Add toggle in settings: "Use Sprites" vs "Procedural"
4. Gradually replace procedural drawing
5. Remove old code when sprites complete

## File Naming Convention

```
{object}_{state}_{variant}.png

Examples:
- thoreau_idle_01.png
- thoreau_fishing_01.png
- tree_pine_large.png
- water_ripple_anim.png
- ui_button_normal.png
```

## Next Steps

1. Implement core sprite classes
2. Create sprite loader with progress tracking
3. Integrate with existing game loop
4. Create/source first test sprites
5. Replace one character as proof of concept

