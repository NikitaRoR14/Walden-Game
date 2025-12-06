/**
 * Authentication Page Logic
 * Handles login, signup, validation, and navigation
 */

// Auto-detect API URL based on environment
const API_BASE_URL = (() => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        // Production: use same domain (backend serves frontend)
        return `${window.location.protocol}//${window.location.host}/api`;
    }
    return process.env.API_BASE_URL || 'http://localhost:3000/api';
})();

// State
let selectedAvatar = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    setupEventListeners();
    drawBackground();
    checkExistingAuth();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form-element');
    loginForm.addEventListener('submit', handleLogin);

    // Signup form
    const signupForm = document.getElementById('signup-form-element');
    signupForm.addEventListener('submit', handleSignup);

    // Avatar selection
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => selectAvatar(option));
    });

    // Real-time validation
    const signupEmail = document.getElementById('signup-email');
    const signupNickname = document.getElementById('signup-nickname');
    const signupPassword = document.getElementById('signup-password');

    signupEmail.addEventListener('blur', () => validateEmail(signupEmail.value));
    signupNickname.addEventListener('blur', () => validateNickname(signupNickname.value));
    signupPassword.addEventListener('input', () => validatePassword(signupPassword.value));
}

/**
 * Switch to signup form
 */
function switchToSignup() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('signup-form').classList.add('active');
}

/**
 * Switch to login form
 */
function switchToLogin() {
    document.getElementById('signup-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
}

/**
 * Handle login submission
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));

        showSuccess('Welcome back! Redirecting to Walden...');

        // Redirect to game after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Handle signup submission
 */
async function handleSignup(e) {
    e.preventDefault();

    const email = document.getElementById('signup-email').value.trim();
    const nickname = document.getElementById('signup-nickname').value.trim();
    const password = document.getElementById('signup-password').value;
    const avatar = selectedAvatar;

    // Validation
    if (!email || !nickname || !password || !avatar) {
        showError('Please fill in all fields and select an avatar');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    if (nickname.length < 3 || nickname.length > 20) {
        showError('Nickname must be 3-20 characters');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, nickname, password, avatar })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        showSuccess('Account created! Please log in.');

        // Switch to login form after 2 seconds
        setTimeout(() => {
            switchToLogin();
            // Pre-fill email
            document.getElementById('login-email').value = email;
        }, 2000);

    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Select avatar
 */
function selectAvatar(option) {
    // Remove previous selection
    document.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // Select new avatar
    option.classList.add('selected');
    selectedAvatar = option.dataset.avatar;
    document.getElementById('selected-avatar').value = selectedAvatar;

    // Clear validation message
    document.getElementById('avatar-validation').classList.remove('show');
}

/**
 * Validate email
 */
async function validateEmail(email) {
    const validationMsg = document.getElementById('email-validation');
    
    if (!email) {
        validationMsg.textContent = '';
        validationMsg.classList.remove('show');
        return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        validationMsg.textContent = '❌ Invalid email format';
        validationMsg.classList.add('show');
        validationMsg.classList.remove('success');
        return false;
    }

    // Check if email is available
    try {
        const response = await fetch(`${API_BASE_URL}/auth/check-email/${encodeURIComponent(email)}`);
        const data = await response.json();

        if (data.available) {
            validationMsg.textContent = '✓ Email available';
            validationMsg.classList.add('show', 'success');
            return true;
        } else {
            validationMsg.textContent = '❌ Email already registered';
            validationMsg.classList.add('show');
            validationMsg.classList.remove('success');
            return false;
        }
    } catch (error) {
        console.error('Error checking email:', error);
        return true; // Allow to proceed if check fails
    }
}

/**
 * Validate nickname
 */
async function validateNickname(nickname) {
    const validationMsg = document.getElementById('nickname-validation');
    
    if (!nickname) {
        validationMsg.textContent = '';
        validationMsg.classList.remove('show');
        return;
    }

    // Length check
    if (nickname.length < 3) {
        validationMsg.textContent = '❌ Too short (min 3 characters)';
        validationMsg.classList.add('show');
        validationMsg.classList.remove('success');
        return false;
    }

    if (nickname.length > 20) {
        validationMsg.textContent = '❌ Too long (max 20 characters)';
        validationMsg.classList.add('show');
        validationMsg.classList.remove('success');
        return false;
    }

    // Check if nickname is available
    try {
        const response = await fetch(`${API_BASE_URL}/auth/check-nickname/${encodeURIComponent(nickname)}`);
        const data = await response.json();

        if (data.available) {
            validationMsg.textContent = '✓ Nickname available';
            validationMsg.classList.add('show', 'success');
            return true;
        } else {
            validationMsg.textContent = '❌ Nickname already taken';
            validationMsg.classList.add('show');
            validationMsg.classList.remove('success');
            return false;
        }
    } catch (error) {
        console.error('Error checking nickname:', error);
        return true; // Allow to proceed if check fails
    }
}

/**
 * Validate password
 */
function validatePassword(password) {
    const validationMsg = document.getElementById('password-validation');
    
    if (!password) {
        validationMsg.textContent = '';
        validationMsg.classList.remove('show');
        return;
    }

    if (password.length < 6) {
        validationMsg.textContent = '❌ At least 6 characters required';
        validationMsg.classList.add('show');
        validationMsg.classList.remove('success');
        return false;
    }

    validationMsg.textContent = '✓ Strong password';
    validationMsg.classList.add('show', 'success');
    return true;
}

/**
 * Show loading overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

/**
 * Show error message
 */
function showError(message) {
    const errorMsg = document.getElementById('error-message');
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');

    setTimeout(() => {
        errorMsg.classList.add('hidden');
    }, 4000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successMsg = document.getElementById('success-message');
    successMsg.textContent = message;
    successMsg.classList.remove('hidden');

    setTimeout(() => {
        successMsg.classList.add('hidden');
    }, 4000);
}

/**
 * Check if user is already authenticated
 */
function checkExistingAuth() {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Verify token is still valid
        fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                // Token valid, redirect to game
                window.location.href = 'index.html';
            } else {
                // Token invalid, clear storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
            }
        })
        .catch(() => {
            // Network error, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
        });
    }
}

/**
 * Draw animated background on canvas
 */
function drawBackground() {
    const canvas = document.getElementById('auth-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Resize canvas on window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Simple animated nature background
    const particles = [];
    const particleCount = 50;

    // Create particles (falling leaves)
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 2,
            speedY: Math.random() * 1 + 0.5,
            speedX: Math.random() * 0.5 - 0.25,
            opacity: Math.random() * 0.5 + 0.3
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            // Draw particle (leaf)
            ctx.fillStyle = `rgba(139, 115, 85, ${particle.opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();

            // Update position
            particle.y += particle.speedY;
            particle.x += particle.speedX;

            // Reset if out of bounds
            if (particle.y > canvas.height) {
                particle.y = -10;
                particle.x = Math.random() * canvas.width;
            }

            if (particle.x > canvas.width || particle.x < 0) {
                particle.x = Math.random() * canvas.width;
            }
        });

        requestAnimationFrame(animate);
    }

    animate();
}

