/**
 * Menu Particle System
 * Creates floating leaves and light particles for the main menu
 */

class MenuParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.isActive = false;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticle(type = 'leaf') {
        const types = ['leaf', 'dust', 'sparkle'];
        const selectedType = type === 'random' ? types[Math.floor(Math.random() * types.length)] : type;
        
        const particle = {
            type: selectedType,
            x: Math.random() * this.canvas.width,
            y: -50,
            size: selectedType === 'leaf' ? (15 + Math.random() * 20) : (2 + Math.random() * 4),
            speedY: selectedType === 'leaf' ? (0.5 + Math.random() * 1.5) : (0.2 + Math.random() * 0.8),
            speedX: (Math.random() - 0.5) * 0.5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            opacity: 0.3 + Math.random() * 0.4,
            swayAmplitude: 20 + Math.random() * 30,
            swaySpeed: 0.01 + Math.random() * 0.02,
            swayOffset: Math.random() * Math.PI * 2,
            color: this.getParticleColor(selectedType)
        };
        
        return particle;
    }
    
    getParticleColor(type) {
        const colors = {
            leaf: ['rgba(139, 115, 85, ', 'rgba(160, 130, 95, ', 'rgba(180, 150, 110, '],
            dust: ['rgba(255, 255, 255, ', 'rgba(245, 230, 200, '],
            sparkle: ['rgba(255, 255, 220, ', 'rgba(240, 240, 180, ']
        };
        
        return colors[type][Math.floor(Math.random() * colors[type].length)];
    }
    
    drawLeaf(particle) {
        this.ctx.save();
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.rotation);
        
        // Draw leaf shape
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.fillStyle = particle.color + particle.opacity + ')';
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, -particle.size / 2);
        this.ctx.quadraticCurveTo(particle.size / 3, -particle.size / 4, particle.size / 2, 0);
        this.ctx.quadraticCurveTo(particle.size / 3, particle.size / 4, 0, particle.size / 2);
        this.ctx.quadraticCurveTo(-particle.size / 3, particle.size / 4, -particle.size / 2, 0);
        this.ctx.quadraticCurveTo(-particle.size / 3, -particle.size / 4, 0, -particle.size / 2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Leaf vein
        this.ctx.strokeStyle = particle.color + (particle.opacity * 0.5) + ')';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -particle.size / 2);
        this.ctx.lineTo(0, particle.size / 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawDust(particle) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.fillStyle = particle.color + particle.opacity + ')';
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    drawSparkle(particle) {
        this.ctx.save();
        this.ctx.globalAlpha = particle.opacity * (0.5 + Math.sin(Date.now() * 0.005 + particle.swayOffset) * 0.5);
        this.ctx.fillStyle = particle.color + (particle.opacity * 0.8) + ')';
        
        // Draw star shape
        this.ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            const x = particle.x + Math.cos(angle) * particle.size;
            const y = particle.y + Math.sin(angle) * particle.size;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    updateParticle(particle, deltaTime) {
        // Sway motion
        const sway = Math.sin(Date.now() * particle.swaySpeed + particle.swayOffset) * particle.swayAmplitude;
        
        particle.x += particle.speedX + sway * 0.01;
        particle.y += particle.speedY;
        particle.rotation += particle.rotationSpeed;
        
        // Remove if off screen
        if (particle.y > this.canvas.height + 50 || particle.x < -50 || particle.x > this.canvas.width + 50) {
            return false;
        }
        
        return true;
    }
    
    start() {
        this.isActive = true;
        
        // Create initial particles
        for (let i = 0; i < 30; i++) {
            const particle = this.createParticle('random');
            particle.y = Math.random() * this.canvas.height;
            this.particles.push(particle);
        }
        
        // Periodically add new particles
        this.particleInterval = setInterval(() => {
            if (this.particles.length < 50 && this.isActive) {
                this.particles.push(this.createParticle('random'));
            }
        }, 500);
        
        this.animate();
    }
    
    stop() {
        this.isActive = false;
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }
    }
    
    animate() {
        if (!this.isActive) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw particles
        this.particles = this.particles.filter(particle => {
            const isAlive = this.updateParticle(particle);
            
            if (isAlive) {
                if (particle.type === 'leaf') {
                    this.drawLeaf(particle);
                } else if (particle.type === 'dust') {
                    this.drawDust(particle);
                } else if (particle.type === 'sparkle') {
                    this.drawSparkle(particle);
                }
            }
            
            return isAlive;
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize particle system when menu is shown
let menuParticleSystem = null;

function initMenuParticles() {
    if (!menuParticleSystem) {
        menuParticleSystem = new MenuParticleSystem('menu-particles');
    }
    menuParticleSystem.start();
}

function stopMenuParticles() {
    if (menuParticleSystem) {
        menuParticleSystem.stop();
    }
}

// Auto-start when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenuParticles);
} else {
    initMenuParticles();
}

