# Game Progress Tracking Guide

## Overview

The Walden Game now features comprehensive player progress tracking with backend synchronization. All fish catches, legacy unlocks, and story completion are automatically saved to your account.

## Features

### 🎣 Fish Collection Tracking
- **Automatic Sync**: Every fish you catch in Free Play mode is saved to your account
- **Catch Counter**: Tracks how many times you've caught each fish species
- **Timestamps**: Records when you first and last caught each fish
- **Collection Progress**: See which fish you've discovered

### 🌟 Legacy Tracking
- **Story Progress**: All legacies unlocked during Story Mode are saved
- **Unique Tracking**: Each legacy is saved only once
- **Timestamps**: Records when each legacy was unlocked

### 📊 Progress Statistics
- **Total Fish Caught**: Cumulative count of all fish catches
- **Unique Species**: Number of different fish species collected
- **Total Legacies**: Count of philosophical legacies unlocked
- **Story Completion**: Whether you've finished the story mode

### 🏆 Leaderboard Integration
- **Top Players**: Ranked by legacies unlocked and fish caught
- **User Profiles**: See avatars and nicknames
- **Live Updates**: Leaderboard updates as players progress

## How It Works

### Automatic Synchronization

When you're logged in, the game automatically syncs your progress:

```javascript
// Catch a fish → Automatically synced to backend
// Unlock a legacy → Automatically synced to backend
// Complete story → Automatically synced to backend
```

### User Info Display

Your profile appears in the top-right corner of the game:
- **Avatar Icon**: Your chosen avatar emoji
- **Nickname**: Your display name
- **Logout**: Click to sign out

### API Endpoints

#### Save Fish Catch
```
POST /api/progress/fish
Body: { fishId: "perch", fishName: "Yellow Perch" }
Headers: { Authorization: "Bearer <token>" }
```

#### Save Legacy Unlock
```
POST /api/progress/legacy
Body: { legacyName: "Civil Disobedience" }
Headers: { Authorization: "Bearer <token>" }
```

#### Mark Story Complete
```
POST /api/progress/complete-story
Headers: { Authorization: "Bearer <token>" }
```

#### Get User Progress
```
GET /api/progress
Headers: { Authorization: "Bearer <token>" }
```

#### Get Leaderboard
```
GET /api/progress/leaderboard
```

## Database Schema

### User Progress Table
```sql
CREATE TABLE user_progress (
    user_id INTEGER PRIMARY KEY,
    total_fish_caught INTEGER DEFAULT 0,
    total_legacies INTEGER DEFAULT 0,
    story_completed BOOLEAN DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### User Fish Table
```sql
CREATE TABLE user_fish (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    fish_id TEXT NOT NULL,
    fish_name TEXT NOT NULL,
    times_caught INTEGER DEFAULT 1,
    first_caught DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_caught DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, fish_id)
)
```

### User Legacies Table
```sql
CREATE TABLE user_legacies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    legacy_name TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, legacy_name)
)
```

## Enhanced Animations

### Authentication Page
- **Title**: Slides in from left with fade
- **Subtitle**: Slides in from right with fade
- **Form Fields**: Staggered fade-in effect
- **Avatars**: Float animation when selected, pulse effect
- **Buttons**: Shimmer effect on hover
- **Quote**: Delayed fade-in at bottom

### Main Menu
- **Menu Container**: Fade-in-up animation on load
- **Title**: Fade-in-down effect
- **Menu Buttons**: Staggered slide-in from left
- **Hover Effects**: Scale + shimmer on buttons

### Visual Enhancements
- All animations use CSS `ease-out` timing for smooth feel
- Delays create elegant cascading effects
- Subtle movements enhance without distracting
- Consistent 0.3-0.8s duration for professional feel

## Privacy & Data

- **Secure Storage**: All data stored in SQLite database
- **User-Specific**: Each player's progress is private
- **JWT Protected**: All endpoints require authentication
- **Local Database**: No external services, your data stays on your server

## Testing

To test the progress tracking:

1. **Create Account**: Sign up at `http://localhost:8080/auth.html`
2. **Play Free Mode**: Catch different fish species
3. **Check Progress**: Use browser DevTools to see console logs:
   ```
   ✓ Fish synced: Yellow Perch
   ```
4. **Play Story Mode**: Make choices and unlock legacies
5. **Verify Data**: Check console for:
   ```
   ✓ Legacy synced: Civil Disobedience
   ✓ Story completion synced
   ```
6. **View Leaderboard**: Call `getProgressLeaderboard()` in console

## Troubleshooting

### Progress Not Saving
- Ensure backend server is running: `npm run dev` in `backend/` folder
- Check browser console for errors
- Verify you're logged in (user info should appear in top-right)
- Check auth token in localStorage: `localStorage.getItem('walden_auth_token')`

### Animations Not Working
- Clear browser cache
- Hard refresh: `Cmd/Ctrl + Shift + R`
- Check CSS is loaded in DevTools
- Verify no console errors blocking JavaScript

## Future Enhancements

Potential additions:
- [ ] Fish rarity statistics
- [ ] Time-played tracking
- [ ] Achievement system
- [ ] Friend leaderboards
- [ ] Progress export/import
- [ ] Daily challenges
- [ ] Seasonal events

## Files Modified

- `backend/src/gameProgress.js` - New module for progress tracking
- `backend/src/server.js` - Added progress API endpoints
- `game-backend-sync.js` - Frontend sync integration
- `api-client.js` - Progress API functions
- `game.js` - Event hooks for sync
- `index.html` - Script includes
- `style.css` - Menu animations
- `auth.css` - Auth page animations

---

*Your journey at Walden Pond is now preserved for eternity.* 🌲

