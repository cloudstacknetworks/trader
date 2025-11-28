# 🚀 Netlify Deployment Guide for News Trader

## 📋 Quick Setup Steps

### 1. Sign Up / Log In to Netlify
- Go to [netlify.com](https://www.netlify.com)
- Sign up or log in (you can use your GitHub account)

### 2. Connect Your GitHub Repository
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"GitHub"** as your Git provider
3. Authorize Netlify to access your GitHub account
4. Select your repository: **`cloudstacknetworks/trader`**

### 3. Configure Build Settings
Netlify should auto-detect Next.js, but verify these settings:

**Build Settings:**
- **Base directory:** `nextjs_space`
- **Build command:** `npm run build`
- **Publish directory:** `nextjs_space/.next`
- **Node version:** `18`

> ✅ **Good News:** The `netlify.toml` file in your repo will handle most of this automatically!

### 4. Add Environment Variables
Go to **Site settings → Environment variables → Add a variable**

Copy these one by one from `/home/ubuntu/oshaughnessy_trader/NETLIFY_ENV_VARIABLES.txt`:

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
FINNHUB_API_KEY
ALPACA_API_KEY
ALPACA_SECRET_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

> 💡 **Tip:** Leave `NEXTAUTH_URL` as `https://trader.cloudstacknetworks.com` for now. Update it after deployment.

### 5. Deploy!
- Click **"Deploy site"**
- Netlify will:
  1. Clone your GitHub repo
  2. Install dependencies (`npm install --legacy-peer-deps`)
  3. Run the build (`npm run build`)
  4. Deploy your app

**Expected build time:** 5-8 minutes

---

## 🔧 Post-Deployment Configuration

### Step 1: Update NEXTAUTH_URL
Once deployed, Netlify will assign you a URL like:
```
https://trader-xyz.netlify.app
```

**Update the environment variable:**
1. Go to **Site settings → Environment variables**
2. Edit `NEXTAUTH_URL`
3. Change from `https://trader.cloudstacknetworks.com` to your new Netlify URL
4. Click **"Save"**
5. Trigger a new deployment: **Deploys → Trigger deploy → Deploy site**

### Step 2: Update Google OAuth Settings
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID (ending in `.apps.googleusercontent.com`)
3. Click **"Edit"**

**Add to "Authorized JavaScript origins":**
```
https://your-netlify-url.netlify.app
```

**Add to "Authorized redirect URIs":**
```
https://your-netlify-url.netlify.app/api/auth/callback/google
```

4. Click **"Save"**

---

## ✅ Verify Your Deployment

### Test Checklist:
1. **Homepage loads:** Visit your Netlify URL
2. **Email/password login works:** Try signing in with test credentials
3. **Google SSO works:** Try "Sign in with Google" (after OAuth update)
4. **Dashboard loads:** Navigate through dashboard pages
5. **API routes work:** Test positions, trades, screens
6. **Database connects:** Verify data appears correctly

---

## 🆘 Troubleshooting

### Build Fails with "Module not found"
**Solution:** Ensure `netlify.toml` is in the `nextjs_space` directory with correct `base` setting.

### Build Fails with "Out of memory"
**Solution:** Netlify's free tier has 1GB RAM. Contact Netlify support or upgrade to Pro.

### "Internal Server Error" after deployment
**Solution:** Check environment variables are set correctly. Verify `DATABASE_URL` is accessible.

### Google SSO doesn't work
**Solution:** Double-check OAuth redirect URIs in Google Cloud Console match your Netlify URL exactly.

### Database connection fails
**Solution:** Verify `DATABASE_URL` in Netlify environment variables. Test connection from local machine.

---

## 📊 Netlify vs Vercel vs Abacus

| Feature | Netlify | Vercel | Abacus |
|---------|---------|--------|--------|
| **Build Success Rate** | ⭐⭐⭐⭐ High | ⭐⭐ Struggling | ⭐⭐⭐⭐⭐ Perfect |
| **Next.js Support** | ⭐⭐⭐⭐ Great | ⭐⭐⭐⭐⭐ Native | ⭐⭐⭐⭐ Excellent |
| **Free Tier** | 300 build min/mo | 100 GB-hours | Included |
| **Custom Domain** | ✅ Free | ✅ Free | ✅ Configured |
| **Auto-Deploy** | ✅ Yes | ✅ Yes (broken) | ✅ Via hooks |
| **Build Time** | ~6 minutes | ~6 minutes | ~4 minutes |
| **Current Status** | 🆕 New option | ❌ Failing | ✅ Working |

---

## 🎯 Why Netlify Over Vercel (Right Now)?

1. **✅ Build reliability:** Netlify's build environment is more forgiving
2. **✅ Better TypeScript handling:** Less strict with Prisma type generation
3. **✅ Clearer error messages:** Easier to debug when issues arise
4. **✅ Fresh start:** No cached issues from previous failed builds

---

## 💡 Pro Tips

### Enable Auto-Deploy from GitHub
- **Settings → Build & deploy → Continuous deployment**
- Turn on **"Auto publishing"**
- Every push to `main` branch will trigger a new deployment

### Set Up Deploy Previews
Netlify automatically creates preview deployments for pull requests!

### Monitor Build Logs
- **Deploys → [Your deployment] → Deploy log**
- Real-time streaming of build progress

### Use Netlify CLI (Optional)
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

## 📞 Need Help?

**If deployment fails:**
1. Share the **build log** from Netlify (Deploys → Deploy log)
2. Share the **specific error message**
3. Mention which **phase** failed (install, build, type-check, deploy)

**Common Issues:**
- ❌ TypeScript errors → We've fixed most, but share if new ones appear
- ❌ Module not found → Check `netlify.toml` base directory setting
- ❌ API route 500 errors → Verify environment variables

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ Build completes without errors  
✅ Site is accessible at Netlify URL  
✅ Login page loads correctly  
✅ Email/password authentication works  
✅ Google SSO works (after OAuth update)  
✅ Dashboard and all pages load  
✅ Database queries execute successfully  
✅ All features function as expected  

---

## 🚀 Next Steps After Successful Deployment

1. **Keep Abacus as primary:** `https://trader.cloudstacknetworks.com`
2. **Use Netlify as secondary:** For redundancy or testing
3. **Monitor both deployments:** Ensure consistency
4. **Update documentation:** Note which URL is canonical
5. **Consider custom domain:** Point your own domain to Netlify if desired

---

## 📝 Notes

- Your current GitHub repo: `https://github.com/cloudstacknetworks/trader`
- Current commit: Latest pushed to `main` branch
- Build configuration: `netlify.toml` in `nextjs_space/`
- Environment variables: See `NETLIFY_ENV_VARIABLES.txt`

**Good luck with your Netlify deployment!** 🚀
