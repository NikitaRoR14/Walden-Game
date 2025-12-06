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
        this.time = 0;
        
        // Light rays
        this.lightRays = [];
        this.initLightRays();
        
        // Fog layers
        this.fogLayers = [];
        this.initFogLayers();
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initLightRays();
        this.initFogLayers();
    }
    
    initLightRays() {
        this.lightRays = [];
        for (let i = 0; i < 5; i++) {
            this.lightRays.push({
                x: Math.random() * this.canvas.width,
                y: -100,
                width: 80 + Math.random() * 120,
                height: this.canvas.height + 200,
                opacity: 0.03 + Math.random() * 0.05,
                angle: -5 + Math.random() * 10,
                speed: 0.1 + Math.random() * 0.2
            });
        }
    }
    
    initFogLayers() {
        this.fogLayers = [];
        for (let i = 0; i < 3; i++) {
            this.fogLayers.push({
                x: 0,
                y: this.canvas.height * (0.3 + i * 0.2),
                width: this.canvas.width * 2,
                height: 200,
                opacity: 0.05 + i * 0.03,
                speed: 0.2 + i * 0.1,
                offset: Math.random() * 1000
            });
        }
    }
    
    createParticle(type = 'leaf') {
        const types = ['leaf', 'dust', 'sparkle', 'mist'];
        const selectedType = type === 'random' ? types[Math.floor(Math.random() * types.length)] : type;
        
        const particle = {
            type: selectedType,
            x: Math.random() * this.canvas.width,
            y: -50,
            size: selectedType === 'leaf' ? (15 + Math.random() * 25) : 
                  selectedType === 'mist' ? (40 + Math.random() * 80) :
                  (2 + Math.random() * 4),
            speedY: selectedType === 'leaf' ? (0.5 + Math.random() * 1.5) : 
                    selectedType === 'mist' ? (0.1 + Math.random() * 0.3) :
                    (0.2 + Math.random() * 0.8),
            speedX: (Math.random() - 0.5) * (selectedType === 'mist' ? 0.8 : 0.5),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            opacity: selectedType === 'mist' ? (0.05 + Math.random() * 0.1) : (0.3 + Math.random() * 0.4),
            swayAmplitude: 20 + Math.random() * 40,
            swaySpeed: 0.01 + Math.random() * 0.02,
            swayOffset: Math.random() * Math.PI * 2,
            color: this.getParticleColor(selectedType),
            pulseSpeed: 0.002 + Math.random() * 0.003
        };
        
        return particle;
    }
    
    getParticleColor(type) {
        const colors = {
            leaf: ['rgba(139, 115, 85, ', 'rgba(160, 130, 95, ', 'rgba(180, 150, 110, ', 'rgba(120, 100, 70, '],
            dust: ['rgba(255, 255, 255, ', 'rgba(245, 230, 200, ', 'rgba(220, 210, 190, '],
            sparkle: ['rgba(255, 255, 220, ', 'rgba(240, 240, 180, ', 'rgba(255, 245, 200, '],
            mist: ['rgba(200, 220, 210, ', 'rgba(180, 200, 190, ', 'rgba(160, 180, 170, ']
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
        const pulse = 0.5 + Math.sin(this.time * particle.pulseSpeed + particle.swayOffset) * 0.5;
        this.ctx.globalAlpha = particle.opacity * pulse;
        
        // Glow effect
        const gradient = this.ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 3
        );
        gradient.addColorStop(0, particle.color + (particle.opacity * pulse) + ')');
        gradient.addColorStop(0.5, particle.color + (particle.opacity * pulse * 0.3) + ')');
        gradient.addColorStop(1, particle.color + '0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Core
        this.ctx.fillStyle = particle.color + (particle.opacity * 0.9) + ')';
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawMist(particle) {
        this.ctx.save();
        const pulse = 0.7 + Math.sin(this.time * particle.pulseSpeed + particle.swayOffset) * 0.3;
        this.ctx.globalAlpha = particle.opacity * pulse;
        
        const gradient = this.ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
        );
        gradient.addColorStop(0, particle.color + (particle.opacity * pulse) + ')');
        gradient.addColorStop(0.6, particle.color + (particle.opacity * pulse * 0.5) + ')');
        gradient.addColorStop(1, particle.color + '0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
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
        this.time = 0;
        
        // Create initial particles
        for (let i = 0; i < 40; i++) {
            const particle = this.createParticle('random');
            particle.y = Math.random() * this.canvas.height;
            this.particles.push(particle);
        }
        
        // Periodically add new particles
        this.particleInterval = setInterval(() => {
            if (this.particles.length < 70 && this.isActive) {
                this.particles.push(this.createParticle('random'));
            }
        }, 400);
        
        this.animate();
    }
    
    stop() {
        this.isActive = false;
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
        }
    }
    
    drawLightRays() {
        this.lightRays.forEach(ray => {
            this.ctx.save();
            this.ctx.translate(ray.x, ray.y);
            this.ctx.rotate((ray.angle * Math.PI) / 180);
            
            const gradient = this.ctx.createLinearGradient(0, 0, 0, ray.height);
            gradient.addColorStop(0, `rgba(255, 255, 220, 0)`);
            gradient.addColorStop(0.3, `rgba(255, 255, 220, ${ray.opacity})`);
            gradient.addColorStop(0.7, `rgba(240, 235, 200, ${ray.opacity * 0.7})`);
            gradient.addColorStop(1, `rgba(255, 255, 220, 0)`);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(-ray.width / 2, 0, ray.width, ray.height);
            
            this.ctx.restore();
            
            // Animate rays
            ray.x += ray.speed;
            if (ray.x > this.canvas.width + 200) {
                ray.x = -200;
            }
        });
    }
    
    drawFogLayers() {
        this.fogLayers.forEach(fog => {
            this.ctx.save();
            
            const gradient = this.ctx.createLinearGradient(0, fog.y, 0, fog.y + fog.height);
            gradient.addColorStop(0, `rgba(200, 220, 210, 0)`);
            gradient.addColorStop(0.5, `rgba(180, 200, 190, ${fog.opacity})`);
            gradient.addColorStop(1, `rgba(200, 220, 210, 0)`);
            
            this.ctx.fillStyle = gradient;
            
            // Draw wavy fog
            this.ctx.beginPath();
            this.ctx.moveTo(fog.x - fog.width, fog.y);
            
            for (let x = 0; x < fog.width * 2; x += 20) {
                const waveY = fog.y + Math.sin((x + fog.offset) * 0.01) * 30;
                this.ctx.lineTo(fog.x - fog.width + x, waveY);
            }
            
            this.ctx.lineTo(fog.x + fog.width, fog.y + fog.height);
            this.ctx.lineTo(fog.x - fog.width, fog.y + fog.height);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
            
            // Animate fog
            fog.offset += fog.speed;
        });
    }
    
    animate() {
        if (!this.isActive) return;
        
        this.time++;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw atmospheric effects
        this.drawLightRays();
        this.drawFogLayers();
        
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
                } else if (particle.type === 'mist') {
                    this.drawMist(particle);
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

