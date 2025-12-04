# Walden Game Backend

Backend server for the Walden Game leaderboards system.

## Features

- 🏆 Leaderboard system with score tracking
- 📊 Player statistics and rankings
- 🔒 SQLite database (no external dependencies)
- 🚀 RESTful API
- ⚡ Fast and lightweight

## Tech Stack

- **Node.js** + **Express** - Server framework
- **SQLite** (better-sqlite3) - Database
- **CORS** - Cross-origin support

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configuration

Create a `.env` file (copy from `env.example`):

```bash
cp env.example .env
```

Edit `.env` if needed:
```
PORT=3000
DATABASE_PATH=./database/leaderboard.db
CORS_ORIGIN=http://localhost:8080
```

### 3. Run the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### POST /api/leaderboard
Submit a score to the leaderboard.

**Request Body:**
```json
{
  "playerName": "Thoreau",
  "legacies": ["Nature", "Civil Disobedience", "Simplicity"],
  "choices": {
    "0": "transcend",
    "1": "transcend",
    "2": "reflective"
  },
  "completionTime": 45000
}
```

**Response:**
```json
{
  "success": true,
  "id": 1,
  "message": "Score submitted successfully"
}
```

### GET /api/leaderboard?limit=10
Get top scores from the leaderboard.

**Response:**
```json
{
  "success": true,
  "scores": [
    {
      "id": 1,
      "playerName": "Thoreau",
      "legaciesCount": 8,
      "legaciesUnlocked": ["Nature", "Civil Disobedience", ...],
      "totalChoices": 9,
      "transcendentChoices": 8,
      "completionTime": 45000,
      "createdAt": "2025-12-04T14:30:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /api/leaderboard/rank/:playerName
Get a specific player's rank.

**Response:**
```json
{
  "success": true,
  "playerName": "Thoreau",
  "rank": 1
}
```

### GET /api/leaderboard/stats
Get leaderboard statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalPlayers": 42,
    "averageLegacies": 5.2,
    "maxLegacies": 8,
    "averageCompletionTime": 38500
  }
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T14:30:00.000Z"
}
```

## Database Schema

### leaderboard table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| player_name | TEXT | Player's name |
| legacies_count | INTEGER | Number of legacies unlocked |
| legacies_unlocked | TEXT | JSON array of legacy names |
| total_choices | INTEGER | Total choices made |
| transcendent_choices | INTEGER | Number of transcendent choices |
| completion_time | INTEGER | Time taken (milliseconds) |
| created_at | DATETIME | Timestamp |

## Testing

Test the API with curl:

```bash
# Health check
curl http://localhost:3000/api/health

# Get leaderboard
curl http://localhost:3000/api/leaderboard

# Submit score
curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "Test Player",
    "legacies": ["Nature", "Simplicity"],
    "choices": {"0": "transcend", "1": "reflective"},
    "completionTime": 30000
  }'
```

## Development

### File Structure

```
backend/
├── src/
│   ├── server.js       # Express server
│   └── database.js     # Database operations
├── database/           # SQLite database files
├── package.json
├── .gitignore
└── README.md
```

### Adding New Endpoints

1. Add route in `server.js`
2. Add database function in `database.js`
3. Test with curl or Postman

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager (PM2, systemd)
3. Consider using PostgreSQL for larger scale
4. Add authentication if needed
5. Use HTTPS

## License

MIT

