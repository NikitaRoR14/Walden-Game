/**
 * Sprite System for Walden Game
 * Handles loading, caching, and rendering of sprite images
 */

/**
 * Base Sprite Class
 * Represents a single sprite or spritesheet
 */
class Sprite {
    constructor(image, options = {}) {
        this.image = image;
        this.width = options.width || image.width;
        this.height = options.height || image.height;
        
        // Animation properties
        this.frames = options.frames || 1;
        this.frameWidth = this.width / this.frames;
        this.frameHeight = this.height;
        this.currentFrame = 0;
        
        // Transform properties
        this.scale = options.scale || 1;
        this.flipX = options.flipX || false;
        this.flipY = options.flipY || false;
        this.rotation = options.rotation || 0;
        this.alpha = options.alpha !== undefined ? options.alpha : 1;
        
        // Anchor point (0-1, where 0.5 is center)
        this.anchorX = options.anchorX !== undefined ? options.anchorX : 0.5;
        this.anchorY = options.anchorY !== undefined ? options.anchorY : 0.5;
    }
    
    /**
     * Draw the sprite at the given position
     */
    draw(ctx, x, y, scale = 1) {
        if (!this.image || this.alpha <= 0) return;
        
        ctx.save();
        
        // Apply alpha
        ctx.globalAlpha = this.alpha;
        
        // Move to position
        ctx.translate(x, y);
        
        // Apply rotation
        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }
        
        // Apply scale and flip
        const finalScale = this.scale * scale;
        ctx.scale(
            finalScale * (this.flipX ? -1 : 1),
            finalScale * (this.flipY ? -1 : 1)
        );
        
        // Calculate source rectangle (for spritesheets)
        const sx = this.currentFrame * this.frameWidth;
        const sy = 0;
        const sw = this.frameWidth;
        const sh = this.frameHeight;
        
        // Calculate destination rectangle (with anchor)
        const dx = -this.frameWidth * this.anchorX;
        const dy = -this.frameHeight * this.anchorY;
        const dw = this.frameWidth;
        const dh = this.frameHeight;
        
        // Draw the sprite
        ctx.drawImage(
            this.image,
            sx, sy, sw, sh,  // Source
            dx, dy, dw, dh   // Destination
        );
        
        ctx.restore();
    }
    
    /**
     * Set the current frame
     */
    setFrame(frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.frames - 1));
    }
    
    /**
     * Get a clone of this sprite
     */
    clone() {
        return new Sprite(this.image, {
            width: this.width,
            height: this.height,
            frames: this.frames,
            scale: this.scale,
            flipX: this.flipX,
            flipY: this.flipY,
            rotation: this.rotation,
            alpha: this.alpha,
            anchorX: this.anchorX,
            anchorY: this.anchorY
        });
    }
}

/**
 * Animated Sprite Class
 * Extends Sprite with animation capabilities
 */
class AnimatedSprite extends Sprite {
    constructor(image, options = {}) {
        super(image, options);
        
        this.animationSpeed = options.animationSpeed || 0.1; // Frames per update
        this.loop = options.loop !== false;
        this.playing = false;
        this.frameTime = 0;
        this.onComplete = options.onComplete || null;
    }
    
    /**
     * Update animation
     */
    update(deltaTime = 1) {
        if (!this.playing || this.frames <= 1) return;
        
        this.frameTime += this.animationSpeed * deltaTime;
        
        if (this.frameTime >= 1) {
            this.frameTime = 0;
            this.currentFrame++;
            
            if (this.currentFrame >= this.frames) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frames - 1;
                    this.playing = false;
                    if (this.onComplete) {
                        this.onComplete();
                    }
                }
            }
        }
    }
    
    /**
     * Start playing the animation
     */
    play() {
        this.playing = true;
    }
    
    /**
     * Stop the animation
     */
    stop() {
        this.playing = false;
    }
    
    /**
     * Reset animation to first frame
     */
    reset() {
        this.currentFrame = 0;
        this.frameTime = 0;
        this.playing = false;
    }
    
    /**
     * Clone animated sprite
     */
    clone() {
        return new AnimatedSprite(this.image, {
            width: this.width,
            height: this.height,
            frames: this.frames,
            animationSpeed: this.animationSpeed,
            loop: this.loop,
            scale: this.scale,
            flipX: this.flipX,
            flipY: this.flipY,
            rotation: this.rotation,
            alpha: this.alpha,
            anchorX: this.anchorX,
            anchorY: this.anchorY
        });
    }
}

/**
 * Sprite Manager
 * Handles loading and caching of sprites
 */
class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.images = new Map();
        this.loadQueue = [];
        this.loaded = 0;
        this.total = 0;
        this.onProgress = null;
    }
    
    /**
     * Load a sprite
     */
    load(id, path, options = {}) {
        this.loadQueue.push({ id, path, options });
        this.total++;
        return this;
    }
    
    /**
     * Load all queued sprites
     */
    async loadAll() {
        const promises = this.loadQueue.map(item => this._loadSprite(item));
        await Promise.all(promises);
        this.loadQueue = [];
        return this;
    }
    
    /**
     * Internal sprite loading
     */
    async _loadSprite({ id, path, options }) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.images.set(id, img);
                
                // Create sprite instance
                const SpriteClass = options.animated ? AnimatedSprite : Sprite;
                const sprite = new SpriteClass(img, options);
                this.sprites.set(id, sprite);
                
                this.loaded++;
                if (this.onProgress) {
                    this.onProgress(this.loaded, this.total);
                }
                
                resolve(sprite);
            };
            
            img.onerror = () => {
                console.error(`Failed to load sprite: ${path}`);
                this.loaded++;
                reject(new Error(`Failed to load: ${path}`));
            };
            
            img.src = path;
        });
    }
    
    /**
     * Get a sprite by ID
     */
    get(id) {
        return this.sprites.get(id);
    }
    
    /**
     * Get a clone of a sprite (for instances)
     */
    getInstance(id) {
        const sprite = this.sprites.get(id);
        return sprite ? sprite.clone() : null;
    }
    
    /**
     * Check if all sprites are loaded
     */
    isLoaded() {
        return this.loaded === this.total;
    }
    
    /**
     * Get loading progress (0-1)
     */
    getLoadProgress() {
        return this.total > 0 ? this.loaded / this.total : 1;
    }
    
    /**
     * Unload a sprite
     */
    unload(id) {
        this.sprites.delete(id);
        this.images.delete(id);
    }
    
    /**
     * Unload all sprites
     */
    unloadAll() {
        this.sprites.clear();
        this.images.clear();
        this.loaded = 0;
        this.total = 0;
    }
}

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Sprite, AnimatedSprite, SpriteManager };
}

