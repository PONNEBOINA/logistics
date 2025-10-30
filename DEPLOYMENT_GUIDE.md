# 🚀 Deployment Guide - Logistics Management System

Complete guide to deploy your application to production.

---

## 📋 Prerequisites

- [x] GitHub repository with your code
- [x] MongoDB Atlas account (already have)
- [ ] Render account (for backend) - https://render.com
- [ ] Vercel account (for frontend) - https://vercel.com

---

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  Frontend (Vercel)                               │
│  https://your-app.vercel.app                     │
│                                                  │
└────────────────┬─────────────────────────────────┘
                 │
                 │ API Calls
                 ▼
┌─────────────────────────────────────────────────┐
│                                                  │
│  Backend (Render)                                │
│  https://your-api.onrender.com                   │
│                                                  │
└────────────────┬─────────────────────────────────┘
                 │
                 │ Database Connection
                 ▼
┌─────────────────────────────────────────────────┐
│                                                  │
│  MongoDB Atlas                                   │
│  (Already configured)                            │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Part 1: Deploy Backend to Render

### Step 1: Push Code to GitHub

Make sure your code is pushed to GitHub:

```bash
cd c:\projects\application\lovable-logistics-53
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `PONNEBOINA/logistics`
3. Configure the service:

**Basic Settings:**
- **Name**: `logistics-backend`
- **Region**: Choose closest to you (e.g., Singapore)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Node`
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && node index.js`

**Advanced Settings:**
- **Plan**: Free
- **Auto-Deploy**: Yes

### Step 4: Add Environment Variables

Click **"Environment"** tab and add these variables:

```
PORT = 4001
NODE_ENV = production
MONGODB_URI = your_mongodb_atlas_connection_string
JWT_SECRET = your-super-secret-jwt-key-change-in-production-12345
CORS_ORIGIN = https://your-frontend-url.vercel.app
TLS_INSECURE = true
ALLOW_DIRECT_ADMIN_SIGNUP = false
```

**Important:** 
- Replace `MONGODB_URI` with your actual MongoDB Atlas connection string
- Replace `CORS_ORIGIN` with your Vercel URL (you'll get this in Part 2)
- Keep `JWT_SECRET` secure

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Once deployed, you'll get a URL like: `https://logistics-backend.onrender.com`

### Step 6: Test Backend

Visit: `https://your-backend-url.onrender.com/api/auth/me`

You should see: `{"error": "No token provided"}` (This is correct!)

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Update Frontend Environment Variable

Create a `.env.production` file in the root:

```bash
VITE_API_URL=https://your-backend-url.onrender.com
```

Replace `your-backend-url` with your actual Render URL from Part 1.

### Step 2: Update vite.config.ts

Make sure your vite.config.ts has the correct server settings:

```typescript
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Step 3: Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

### Step 4: Import Project

1. Click **"Add New..."** → **"Project"**
2. Import `PONNEBOINA/logistics` repository
3. Configure project:

**Project Settings:**
- **Framework Preset**: Vite
- **Root Directory**: `./` (leave as is)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

**Environment Variables:**
Add this variable:
```
VITE_API_URL = https://your-backend-url.onrender.com
```

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait for deployment (2-3 minutes)
3. You'll get a URL like: `https://logistics-xyz.vercel.app`

### Step 6: Update Backend CORS

Go back to Render → Your backend service → Environment:

Update `CORS_ORIGIN` to:
```
CORS_ORIGIN = https://your-frontend-url.vercel.app
```

Click **"Save Changes"** - Backend will redeploy automatically.

---

## Part 3: Final Configuration

### Step 1: Test the Application

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try to sign up as admin
3. Test the complete flow

### Step 2: Create Super Admin

If you need to create a Super Admin on production:

1. Go to Render dashboard
2. Click your backend service
3. Go to **"Shell"** tab
4. Run:
```bash
cd server
node setSuperAdmin.js
```

### Step 3: Custom Domain (Optional)

**For Vercel (Frontend):**
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

**For Render (Backend):**
1. Go to Service Settings → Custom Domains
2. Add your API subdomain (e.g., api.yourdomain.com)
3. Follow DNS configuration instructions

---

## 🔧 Alternative Deployment Options

### Option 1: Railway (Backend Alternative)

**Pros:**
- Easier setup
- Better free tier
- Automatic HTTPS

**Steps:**
1. Go to https://railway.app
2. Sign up with GitHub
3. New Project → Deploy from GitHub
4. Select your repository
5. Add environment variables
6. Deploy!

### Option 2: Netlify (Frontend Alternative)

**Pros:**
- Similar to Vercel
- Good free tier

**Steps:**
1. Go to https://netlify.com
2. Sign up with GitHub
3. New site from Git
4. Select repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Add environment variable: `VITE_API_URL`
7. Deploy!

### Option 3: Full Stack on Render

Deploy both frontend and backend on Render:

**Backend:** Web Service (as described above)
**Frontend:** Static Site
- Build command: `npm run build`
- Publish directory: `dist`

---

## 📊 Cost Breakdown

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| **MongoDB Atlas** | Free | $0 | 512MB storage |
| **Render (Backend)** | Free | $0 | Sleeps after 15min inactivity |
| **Vercel (Frontend)** | Free | $0 | 100GB bandwidth/month |
| **Total** | | **$0/month** | Good for testing/demo |

**Note:** Free tier backend sleeps after inactivity. First request takes 30-60 seconds to wake up.

---

## 🚨 Important Notes

### 1. Environment Variables Security

**Never commit these to GitHub:**
- ❌ MongoDB URI
- ❌ JWT Secret
- ❌ Any API keys

**Always use:**
- ✅ Environment variables in deployment platform
- ✅ `.env.example` for reference

### 2. CORS Configuration

Make sure `CORS_ORIGIN` in backend matches your frontend URL exactly:
```
https://your-app.vercel.app
```

No trailing slash!

### 3. MongoDB Atlas IP Whitelist

1. Go to MongoDB Atlas
2. Network Access
3. Add IP: `0.0.0.0/0` (Allow from anywhere)
   - Or add Render's IP addresses

### 4. Backend Sleep (Free Tier)

Render free tier sleeps after 15 minutes of inactivity.

**Solutions:**
- Upgrade to paid plan ($7/month)
- Use a cron job to ping your backend every 10 minutes
- Accept the 30-60 second wake-up time

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas configured
- [ ] Environment variables documented
- [ ] `.env` files in `.gitignore`

### Backend Deployment
- [ ] Render account created
- [ ] Web service created
- [ ] Environment variables added
- [ ] Backend deployed successfully
- [ ] Backend URL obtained
- [ ] API endpoint tested

### Frontend Deployment
- [ ] Vercel account created
- [ ] Project imported
- [ ] Environment variable added (VITE_API_URL)
- [ ] Frontend deployed successfully
- [ ] Frontend URL obtained

### Post-Deployment
- [ ] Backend CORS updated with frontend URL
- [ ] Full application tested
- [ ] Super Admin created
- [ ] Test user flows work
- [ ] MongoDB connection verified

---

## 🐛 Troubleshooting

### Issue: "Network Error" in Frontend

**Solution:**
1. Check `VITE_API_URL` is correct
2. Check backend CORS includes frontend URL
3. Check backend is running (visit backend URL)

### Issue: "Cannot connect to MongoDB"

**Solution:**
1. Check `MONGODB_URI` is correct
2. Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
3. Check MongoDB Atlas user has correct permissions

### Issue: Backend takes 30+ seconds to respond

**Solution:**
- This is normal for Render free tier (cold start)
- Consider upgrading to paid plan
- Or use Railway which has better free tier

### Issue: "CORS Error"

**Solution:**
1. Backend `CORS_ORIGIN` must match frontend URL exactly
2. No trailing slash in URL
3. Include `https://` protocol
4. Redeploy backend after changing CORS

---

## 📚 Additional Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html

---

## 🎉 Success!

Once deployed, your application will be live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-api.onrender.com`

Share these URLs with users to access your logistics management system!

---

## 💡 Next Steps

1. **Custom Domain**: Add your own domain
2. **SSL Certificate**: Automatic with Vercel/Render
3. **Monitoring**: Set up error tracking (Sentry)
4. **Analytics**: Add Google Analytics
5. **CI/CD**: Already set up with GitHub auto-deploy

---

**Need help? Check the troubleshooting section or create an issue on GitHub!**
