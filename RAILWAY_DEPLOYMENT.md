# 🚂 Railway Deployment Guide - Full Stack

Deploy both frontend and backend to Railway in one platform.

---

## Prerequisites

- GitHub account with your code pushed
- Railway account (https://railway.app)
- MongoDB Atlas connection string

---

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your repositories

---

## Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `lovable-logistics-53`
4. Railway will detect your project structure

---

## Step 3: Configure Backend Service

Railway should auto-detect the backend. If not:

1. Click "New Service" → "GitHub Repo"
2. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

### Add Environment Variables:

Click on backend service → Variables tab:

```
PORT=4001
NODE_ENV=production
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
TLS_INSECURE=true
ALLOW_DIRECT_ADMIN_SIGNUP=false
```

**Important:** Add `CORS_ORIGIN` after frontend is deployed (Step 4)

---

## Step 4: Configure Frontend Service

1. Click "New Service" → "GitHub Repo"
2. Select same repository
3. Configure:
   - **Root Directory**: `.` (root)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: Leave empty (static site)

### Add Environment Variables:

Click on frontend service → Variables tab:

```
VITE_API_URL=<your-backend-railway-url>
```

**Get backend URL:**
- Go to backend service
- Click "Settings" → "Networking"
- Copy the public URL (e.g., `https://logistics-backend-production.up.railway.app`)

---

## Step 5: Update Backend CORS

1. Go back to backend service
2. Click "Variables" tab
3. Add new variable:
   ```
   CORS_ORIGIN=<your-frontend-railway-url>
   ```
4. Backend will auto-redeploy

---

## Step 6: Configure MongoDB Atlas

1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add: `0.0.0.0/0` (Allow from anywhere)
4. Click "Confirm"

---

## Step 7: Deploy

Railway automatically deploys when you push to GitHub!

**Manual Deploy:**
1. Click on each service
2. Click "Deploy" button
3. Wait for deployment to complete

---

## Step 8: Get Your URLs

**Backend URL:**
- Go to backend service → Settings → Networking
- Copy the public domain

**Frontend URL:**
- Go to frontend service → Settings → Networking
- Copy the public domain

---

## Step 9: Test Your Application

1. Visit your frontend URL
2. Try logging in with: `admin@gmail.com` / `admin123`
3. Test the complete booking flow

---

## 🎉 Success!

Your full-stack application is now live on Railway!

- **Frontend**: `https://your-frontend.up.railway.app`
- **Backend**: `https://your-backend.up.railway.app`

---

## 💰 Railway Pricing

**Free Tier:**
- $5 credit per month
- ~500 hours of usage
- No credit card required
- No sleep (unlike Render)

**Paid Tier:**
- $5/month base
- Pay for what you use
- ~$10-20/month for small apps

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to backend"

**Solution:**
1. Check `VITE_API_URL` in frontend variables
2. Check backend is running (visit backend URL)
3. Check `CORS_ORIGIN` in backend matches frontend URL

### Issue: "MongoDB connection failed"

**Solution:**
1. Check `MONGODB_URI` is correct
2. Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
3. Check MongoDB user has correct permissions

### Issue: "Build failed"

**Solution:**
1. Check build logs in Railway dashboard
2. Make sure `package.json` has correct scripts
3. Try deploying from a clean commit

---

## 🚀 Automatic Deployments

Railway automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Railway will automatically:
1. Pull latest code
2. Build both services
3. Deploy updates
4. Zero downtime deployment

---

## 📊 Monitoring

**View Logs:**
1. Click on service
2. Click "Logs" tab
3. See real-time logs

**View Metrics:**
1. Click on service
2. Click "Metrics" tab
3. See CPU, memory, network usage

---

## 🔒 Security Best Practices

1. ✅ Never commit `.env` files
2. ✅ Use strong JWT secret
3. ✅ Keep MongoDB credentials secure
4. ✅ Use environment variables for all secrets
5. ✅ Enable MongoDB Atlas IP whitelist

---

## 🎯 Next Steps

1. **Custom Domain**: Add your own domain in Railway settings
2. **SSL Certificate**: Automatic with Railway
3. **Monitoring**: Set up error tracking
4. **Backups**: Configure MongoDB Atlas backups
5. **Scaling**: Upgrade Railway plan if needed

---

**Need help? Check Railway docs: https://docs.railway.app**
