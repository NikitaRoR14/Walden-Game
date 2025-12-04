# Authentication System Guide

## Overview

Complete authentication system with beautiful Walden-themed UI, secure backend with JWT tokens, and password hashing.

## Features

✅ **Secure Authentication**
- Password hashing with bcrypt
- JWT token-based sessions
- Email validation
- Nickname uniqueness check

✅ **Beautiful UI**
- Walden-themed design
- Animated background
- Real-time validation
- Avatar selection (8 options)
- Responsive design

✅ **User Management**
- Register new users
- Login/logout
- Persistent sessions (7 days)
- Profile data storage

## Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

This installs: `bcrypt`, `jsonwebtoken`, `express-validator`

### 2. Configure Environment

Create `backend/.env`:

```
PORT=3000
DATABASE_PATH=./database/walden.db
CORS_ORIGIN=http://localhost:8080
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
```

⚠️ **Important**: Change `JWT_SECRET` to a random secure string in production!

### 3. Start Backend Server

```bash
cd backend
npm run dev
```

### 4. Start Game Server

```bash
./start.sh
```

## Usage

### Access Authentication Page

Go to: **http://localhost:8080/auth.html**

### User Flow

1. **New User**: Click "Create an account"
   - Enter email
   - Choose nickname (3-20 characters)
   - Create password (min 6 characters)
   - Select avatar
   - Click "Begin Your Journey"

2. **Existing User**: 
   - Enter email & password
   - Click "Enter the Woods"

3. **After Login**:
   - Redirected to `index.html` (main game)
   - User data stored in localStorage
   - JWT token valid for 7 days

### Logout

Call `logout()` function from anywhere in the game:

```javascript
logout(); // Clears session and redirects to auth page
```

## API Endpoints

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "mypassword",
  "nickname": "Thoreau",
  "avatar": "thoreau"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "Thoreau",
    "avatar": "thoreau"
  }
}
```

### POST /api/auth/login
Login user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "Thoreau",
    "avatar": "thoreau"
  }
}
```

### GET /api/auth/me
Get current user profile (requires auth token).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "Thoreau",
    "avatar": "thoreau",
    "createdAt": "2025-12-04T15:00:00.000Z",
    "lastLogin": "2025-12-04T16:00:00.000Z"
  }
}
```

### GET /api/auth/check-email/:email
Check if email is available.

**Response:**
```json
{
  "available": true
}
```

### GET /api/auth/check-nickname/:nickname
Check if nickname is available.

**Response:**
```json
{
  "available": false
}
```

## Frontend Integration

### Check Authentication Status

```javascript
if (!isAuthenticated()) {
    window.location.href = 'auth.html';
}
```

### Get Current User

```javascript
const user = getCurrentUser();
console.log(user.nickname); // "Thoreau"
console.log(user.avatar);   // "thoreau"
```

### Verify Token

```javascript
const isValid = await verifyAuth();
if (!isValid) {
    logout();
}
```

### Protected Game Access

Add to top of `game.js`:

```javascript
// Check authentication on game load
if (!isAuthenticated()) {
    window.location.href = 'auth.html';
} else {
    const user = getCurrentUser();
    console.log(`Welcome back, ${user.nickname}!`);
    // Initialize game...
}
```

### Display User Info in Game

```javascript
const user = getCurrentUser();

// Show nickname in UI
document.getElementById('player-name').textContent = user.nickname;

// Show avatar
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
document.getElementById('player-avatar').textContent = avatarEmojis[user.avatar];
```

### Logout Button

```html
<button onclick="logout()">Logout</button>
```

## Avatar Options

| Avatar | Emoji | Description |
|--------|-------|-------------|
| thoreau | 🧔 | Henry David Thoreau |
| emerson | 🎩 | Ralph Waldo Emerson |
| woodchopper | 🪓 | Alex Therien |
| merchant | 💼 | Concord Merchant |
| student | 📚 | Young Student |
| nature | 🌿 | Nature Lover |
| book | 📖 | Scholar |
| cabin | 🏠 | Cabin Dweller |

## Security Features

✅ **Password Security**
- Hashed with bcrypt (10 rounds)
- Never stored in plain text
- Never returned in API responses

✅ **Token Security**
- JWT tokens with expiration
- Signed with secret key
- Stored in localStorage (client-side)

✅ **Validation**
- Email format check
- Password length requirement
- Nickname length & uniqueness
- SQL injection prevention (parameterized queries)

✅ **CORS Protection**
- Restricted to game origin
- Configured in backend

## Database Schema

### users table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| email | TEXT | Unique email |
| password_hash | TEXT | Bcrypt password hash |
| nickname | TEXT | Unique nickname |
| avatar | TEXT | Avatar choice |
| created_at | DATETIME | Registration timestamp |
| last_login | DATETIME | Last login timestamp |

## Testing

### Manual Testing

1. **Register**: Go to auth.html, create account
2. **Login**: Login with created account
3. **Session**: Refresh page, should stay logged in
4. **Logout**: Call `logout()`, should redirect to auth
5. **Validation**: Try duplicate email/nickname

### API Testing with curl

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "nickname": "TestUser",
    "avatar": "thoreau"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get profile (replace TOKEN with actual token from login)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## Troubleshooting

### "JWT_SECRET not set" Warning

Set `JWT_SECRET` in `backend/.env`:
```
JWT_SECRET=your-random-secret-key-here
```

### Token Expired

Tokens expire after 7 days. User will need to login again.

### Can't Login After Registration

Make sure both backend and frontend servers are running on correct ports.

### CORS Errors

Check `CORS_ORIGIN` in `backend/.env` matches your frontend URL.

## Production Deployment

1. **Use HTTPS** for all communication
2. **Strong JWT_SECRET** (random, 64+ characters)
3. **Environment variables** (never commit .env)
4. **Rate limiting** on auth endpoints
5. **Consider adding email verification**
6. **Consider adding password reset**
7. **Use PostgreSQL** instead of SQLite

## Next Steps

- [ ] Integrate auth with leaderboard (user-based scores)
- [ ] Add user profile page
- [ ] Add user settings
- [ ] Show user stats
- [ ] Add friends/social features
- [ ] Add password reset via email
- [ ] Add OAuth (Google, GitHub)

## License

MIT

