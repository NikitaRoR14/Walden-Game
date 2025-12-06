# Quick Deployment Guide

## 🚀 Fastest Way: Railway (5 minutes)

### Step 1: Prepare
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output - you'll need it!
```

### Step 2: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign up
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select **"NikitaRoR14/Walden-Game"**
4. Railway will create a service automatically

### Step 3: Configure
1. Click on the service
2. Go to **Settings** → **Root Directory**: Set to `.` (repo root, NOT `backend`)
   - This allows Railway to access both backend and frontend files
3. Go to **Variables** tab, add:
   ```
   JWT_SECRET=<paste-generated-secret>
   NODE_ENV=production
   CORS_ORIGIN=*
   DATABASE_PATH=./database/walden.db
   ```
4. Railway sets `PORT` automatically

### Step 4: Deploy
- Railway auto-deploys on every git push
- Or click **"Deploy"** button
- Wait 2-3 minutes

### Step 5: Test
1. Get your URL from Railway dashboard (e.g., `your-app.railway.app`)
2. Visit the URL - game should load!
3. Test signup/login
4. Test game features

## ✅ That's it!

Your game is now live at: `https://your-app.railway.app`

## 🔧 Troubleshooting

**Game doesn't load?**
- Check Root Directory is set to `backend`
- Check logs in Railway dashboard
- Verify environment variables are set

**Database errors?**
- Railway persists files automatically
- Check `DATABASE_PATH` is correct

**API not working?**
- The frontend auto-detects the API URL
- No changes needed if backend serves frontend

## 📝 Next Steps

1. Set up custom domain (optional)
2. Enable database backups
3. Monitor usage in Railway dashboard
4. Set up alerts for errors

