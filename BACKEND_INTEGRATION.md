# Backend Integration Guide

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Start the Backend Server

```bash
# Development mode (auto-reload)
npm run dev

# Or production mode
npm start
```

Server runs on `http://localhost:3000`

### 3. Keep Frontend Server Running

In a **separate terminal**, keep the game server running:

```bash
cd "/Users/nikitaporoshin/Walden Game"
./start.sh
```

Game runs on `http://localhost:8080`

## Integration with Game

### Add to index.html

Add this script tag BEFORE `game.js`:

```html
<script src="api-client.js"></script>
<script src="game.js"></script>
```

### In game.js - Submit Score When Game Ends

Find the ending screen code and add:

```javascript
// After showing ending screen, submit score
async function submitGameScore() {
    // Get player name (you can add an input field for this)
    const playerName = prompt("Enter your name for the leaderboard:", "Anonymous");
    
    if (!playerName) return;

    const scoreData = {
        playerName: playerName,
        legacies: legacies, // Your array of unlocked legacies
        choices: choices,   // Your choices object
        completionTime: gameTime // Time taken to complete
    };

    try {
        const result = await submitScore(scoreData);
        console.log('Score submitted:', result);
        alert(`Score submitted! You're on the leaderboard!`);
    } catch (error) {
        console.error('Failed to submit score:', error);
        alert('Failed to submit score. Backend server may be offline.');
    }
}
```

### Display Leaderboard

Add a "View Leaderboard" button in your menu:

```javascript
async function showLeaderboard() {
    try {
        const data = await getLeaderboard(10); // Top 10
        const scores = data.scores;
        
        // Display scores in your UI
        let leaderboardHTML = '<h2>🏆 Leaderboard</h2><ol>';
        scores.forEach(score => {
            leaderboardHTML += `
                <li>
                    <strong>${score.playerName}</strong> - 
                    ${score.legaciesCount} legacies 
                    (${formatTime(score.completionTime)})
                </li>
            `;
        });
        leaderboardHTML += '</ol>';
        
        // Show in a popup or screen
        document.getElementById('leaderboard-display').innerHTML = leaderboardHTML;
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
}
```

## API Usage Examples

### Submit a Score

```javascript
const scoreData = {
    playerName: "Thoreau",
    legacies: ["Nature", "Civil Disobedience", "Simplicity"],
    choices: {
        "0": "transcend",
        "1": "transcend", 
        "2": "reflective"
    },
    completionTime: 45000 // milliseconds
};

submitScore(scoreData)
    .then(result => console.log('Submitted:', result))
    .catch(error => console.error('Error:', error));
```

### Get Leaderboard

```javascript
getLeaderboard(10)
    .then(data => {
        console.log('Top 10 players:', data.scores);
    })
    .catch(error => console.error('Error:', error));
```

### Get Player Rank

```javascript
getPlayerRank("Thoreau")
    .then(data => {
        if (data) {
            console.log(`Rank: ${data.rank}`);
        }
    })
    .catch(error => console.error('Error:', error));
```

### Get Statistics

```javascript
getLeaderboardStats()
    .then(data => {
        console.log('Stats:', data.stats);
        // { totalPlayers: 42, averageLegacies: 5.2, ... }
    })
    .catch(error => console.error('Error:', error));
```

## UI Integration Ideas

### 1. Name Input Screen

Add before ending screen:

```html
<div id="name-input-screen" class="screen hidden">
    <h2>Enter Your Name</h2>
    <input type="text" id="player-name" placeholder="Your name" maxlength="50">
    <button onclick="submitFinalScore()">Submit to Leaderboard</button>
    <button onclick="skipLeaderboard()">Skip</button>
</div>
```

### 2. Leaderboard Screen

Add to your HTML:

```html
<div id="leaderboard-screen" class="screen hidden">
    <h1>🏆 Leaderboard</h1>
    <div id="leaderboard-stats"></div>
    <div id="leaderboard-list"></div>
    <button onclick="closeLeaderboard()">Close</button>
</div>
```

### 3. Main Menu Addition

Add "Leaderboard" button to main menu:

```html
<button id="leaderboard-btn" class="menu-button">
    <span class="button-title">🏆 Leaderboard</span>
    <span class="button-desc">See top players and your rank</span>
</button>
```

## Testing

### Test Backend

```bash
# Check if server is running
curl http://localhost:3000/api/health

# Submit a test score
curl -X POST http://localhost:3000/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "Test",
    "legacies": ["Nature"],
    "choices": {"0": "transcend"},
    "completionTime": 30000
  }'

# Get leaderboard
curl http://localhost:3000/api/leaderboard
```

### Test Frontend Integration

Open browser console on http://localhost:8080 and try:

```javascript
// Check if backend is reachable
checkHealth().then(ok => console.log('Backend online:', ok));

// Submit test score
submitScore({
    playerName: "Test",
    legacies: ["Nature"],
    choices: {"0": "transcend"},
    completionTime: 30000
}).then(console.log);

// Get leaderboard
getLeaderboard(5).then(console.log);
```

## Troubleshooting

### Backend not starting?

```bash
# Check if Node.js is installed
node --version

# Install dependencies
cd backend
npm install
```

### CORS errors?

Make sure:
1. Backend is running on port 3000
2. Frontend is running on port 8080
3. `.env` has correct CORS_ORIGIN

### Database errors?

The database is created automatically. If issues persist:

```bash
# Delete and recreate database
rm backend/database/leaderboard.db
# Restart backend server
```

## Next Steps

1. ✅ Backend is ready to use
2. Add leaderboard UI to your game
3. Integrate score submission after game ends
4. Add player name input
5. Style the leaderboard screen
6. Test with multiple players

## Future Enhancements

- Add authentication (optional)
- Add player profiles
- Add daily/weekly leaderboards
- Add achievements system
- Deploy to a cloud server (Railway, Heroku, DigitalOcean)

