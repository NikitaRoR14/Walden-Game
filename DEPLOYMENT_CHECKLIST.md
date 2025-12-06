# Deployment Checklist

## Pre-Deployment

- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Test locally: `cd backend && npm install && npm start`
- [ ] Verify game loads at `http://localhost:3000`
- [ ] Test authentication (signup/login)
- [ ] Test game features (fishing, progress tracking)
- [ ] Commit all changes to git

## Platform Setup

### Railway (Recommended)
- [ ] Sign up at railway.app
- [ ] Create new project from GitHub repo
- [ ] Set Root Directory: `backend`
- [ ] Add environment variables:
  - [ ] `JWT_SECRET` (generate strong key)
  - [ ] `NODE_ENV=production`
  - [ ] `CORS_ORIGIN` (your Railway URL)
  - [ ] `DATABASE_PATH=./database/walden.db`
- [ ] Deploy and verify URL works

### Render
- [ ] Sign up at render.com
- [ ] Create Web Service from GitHub
- [ ] Set Root Directory: `backend`
- [ ] Add same environment variables
- [ ] Deploy

## Post-Deployment

- [ ] Visit your deployed URL
- [ ] Test homepage loads
- [ ] Test signup/login
- [ ] Test game features
- [ ] Check `/health` endpoint: `https://your-url.com/health`
- [ ] Verify database persists (create account, check it exists after restart)
- [ ] Test API endpoints work

## Verification

Test these endpoints:
```bash
# Health check
curl https://your-url.com/health

# API health
curl https://your-url.com/api/health

# Test signup (should work)
curl -X POST https://your-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","nickname":"testuser"}'
```

## Common Issues

**Issue:** Game doesn't load
- Check logs for errors
- Verify static files are being served
- Check root directory is set to `backend`

**Issue:** Database errors
- Ensure `database/` directory exists
- Check write permissions
- Verify `DATABASE_PATH` is correct

**Issue:** CORS errors
- Update `CORS_ORIGIN` to your domain
- Or set to `*` for testing (less secure)

**Issue:** Port errors
- Platform should set `PORT` automatically
- Don't hardcode port in code

## Quick Deploy Commands

### Railway
1. Connect GitHub repo
2. Set root: `backend`
3. Add env vars
4. Deploy (automatic)

### Render
1. New Web Service
2. Connect GitHub
3. Root: `backend`
4. Add env vars
5. Deploy

### Heroku
```bash
cd backend
heroku create your-app-name
heroku config:set JWT_SECRET=your-secret
git subtree push --prefix backend heroku main
```

