# Deployment Guide for Walden Game

This guide will help you deploy the Walden Game to various hosting platforms.

## Prerequisites

- Node.js 16+ installed
- Git repository access
- A hosting account (see options below)

## Environment Variables

Create a `.env` file in the `backend/` directory with:

```env
PORT=3000
DATABASE_PATH=./database/walden.db
CORS_ORIGIN=https://your-domain.com
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-use-a-long-random-string
JWT_EXPIRES_IN=7d
NODE_ENV=production
```

**Important:** Generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Hosting Platform Options

### Option 1: Railway (Recommended - Easy Setup)

1. **Sign up** at [railway.app](https://railway.app) (free tier available)
2. **Create New Project** → "Deploy from GitHub repo"
3. **Select your repository**: `NikitaRoR14/Walden-Game`
4. **Configure Service:**
   - Railway will auto-detect Node.js
   - **Root Directory:** Set to `backend` (important!)
   - **Build Command:** `npm install` (auto-detected)
   - **Start Command:** `npm start` (auto-detected)
5. **Add Environment Variables:**
   - Click on your service → Variables tab
   - Add these variables:
     ```
     JWT_SECRET=<generate-strong-secret>
     NODE_ENV=production
     CORS_ORIGIN=<your-railway-url> (or use * for testing)
     DATABASE_PATH=./database/walden.db
     PORT=<auto-set-by-railway>
     ```
   - **Generate JWT_SECRET:**
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
6. **Deploy** - Railway automatically deploys on every push to main branch

**Railway automatically:**
- Detects Node.js
- Runs `npm install` in the `backend` directory
- Exposes your app on a public URL (e.g., `your-app.railway.app`)
- Handles HTTPS automatically
- Provides persistent storage for SQLite database

### Option 2: Render

1. **Sign up** at [render.com](https://render.com)
2. **Create New Web Service**
3. **Connect GitHub repository**
4. **Configure:**
   - Name: `walden-game-backend`
   - Environment: `Node`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Add Environment Variables** (same as above)
6. **Deploy**

### Option 3: Heroku

1. **Install Heroku CLI** and login
2. **Create app:**
   ```bash
   cd backend
   heroku create your-app-name
   ```
3. **Set environment variables:**
   ```bash
   heroku config:set JWT_SECRET=your-secret-key
   heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com
   heroku config:set NODE_ENV=production
   ```
4. **Deploy:**
   ```bash
   git subtree push --prefix backend heroku main
   ```

### Option 4: DigitalOcean App Platform

1. **Sign up** at [digitalocean.com](https://www.digitalocean.com)
2. **Create App** → "GitHub" → Select repository
3. **Configure:**
   - Type: Web Service
   - Source Directory: `backend`
   - Build Command: `npm install`
   - Run Command: `npm start`
4. **Add Environment Variables**
5. **Deploy**

## Post-Deployment Steps

### 1. Frontend API URL (Already Configured!)

✅ **Good news:** The `api-client.js` has been updated to automatically detect the API URL:
- **Local development:** Uses `http://localhost:3000/api`
- **Production:** Automatically uses the same domain as your frontend

Since your backend serves the frontend from the same server, no changes needed! The API will work automatically.

### 2. Database Persistence

**Important:** SQLite files are ephemeral on most platforms. For production:

**Option A: Use Railway/Render persistent storage**
- Railway: Files persist automatically
- Render: Use persistent disk

**Option B: Migrate to PostgreSQL (Recommended for production)**
- More reliable
- Better for scaling
- See migration guide below

### 3. CORS Configuration

Update `CORS_ORIGIN` in your `.env` to match your frontend domain:
```env
CORS_ORIGIN=https://your-frontend-domain.com
```

Or allow all origins (less secure):
```javascript
app.use(cors({ origin: '*' }));
```

## Quick Start Commands

### Local Testing
```bash
cd backend
npm install
npm start
```

### Production Build
```bash
cd backend
npm install --production
npm start
```

## Troubleshooting

### Port Issues
Most platforms set `PORT` automatically. Your code already handles this:
```javascript
const PORT = process.env.PORT || 3000;
```

### Database Not Found
Ensure the `database/` directory exists and is writable:
```bash
mkdir -p backend/database
```

### Static Files Not Serving
The server serves static files from the parent directory. Ensure your file structure is:
```
/
├── backend/
│   └── src/
│       └── server.js
├── index.html
├── game.js
└── ...
```

## Monitoring

### Health Check Endpoint
✅ Already configured! Test it:
```bash
curl https://your-url.com/health
curl https://your-url.com/api/health
```

### Logs
Most platforms provide logs in their dashboard:
- Railway: View logs in dashboard
- Render: Logs tab
- Heroku: `heroku logs --tail`

## Security Checklist

- [ ] Strong JWT_SECRET (32+ random characters)
- [ ] CORS_ORIGIN set to your domain only
- [ ] NODE_ENV=production
- [ ] HTTPS enabled (automatic on most platforms)
- [ ] Database backups configured
- [ ] Rate limiting (consider adding)

## Next Steps

1. Deploy backend to chosen platform
2. Update frontend API URL
3. Test authentication and game features
4. Monitor logs for errors
5. Set up database backups

## Support

If you encounter issues:
1. Check platform logs
2. Verify environment variables
3. Test API endpoints with curl/Postman
4. Ensure database directory is writable

