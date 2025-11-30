# Netlify Environment Variables Setup

⚠️ **SECURITY NOTICE**: This file contains instructions only. Never commit actual secret values to Git.

## Required Environment Variables

Configure these in **Netlify Dashboard → Site Configuration → Environment Variables**:

### Database
```
DATABASE_URL=<your-postgresql-connection-string>
```

### Authentication
```
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-site.netlify.app
```

### API Keys
```
FINNHUB_API_KEY=<your-finnhub-api-key>
ALPACA_API_KEY=<your-alpaca-api-key>
ALPACA_SECRET_KEY=<your-alpaca-secret-key>
```

### OAuth (Optional)
```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

---

## Setup Instructions

### Step 1: Add Variables to Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site configuration** → **Environment variables**
3. Click **"Add a variable"** for each variable above
4. Paste your actual values (NOT the placeholders)

### Step 2: Update NEXTAUTH_URL

After your first deploy, update `NEXTAUTH_URL` with your actual Netlify URL:
```
NEXTAUTH_URL=https://your-actual-site.netlify.app
```

### Step 3: Configure Google OAuth (if using)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add **Authorized JavaScript origins**:
   - `https://your-netlify-url.netlify.app`
4. Add **Authorized redirect URIs**:
   - `https://your-netlify-url.netlify.app/api/auth/callback/google`

### Step 4: Trigger Deployment

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**

---

## Security Best Practices

✅ **DO:**
- Configure secrets in Netlify dashboard only
- Use different secrets for dev/staging/production
- Rotate API keys regularly
- Use `.env.local` for local development (gitignored)

❌ **DON'T:**
- Commit `.env` files with real values to Git
- Share API keys in documentation
- Use production secrets in development
- Hardcode credentials in source code

---

## Troubleshooting

### Build fails with "secrets detected"
- Verify no `.env` files are tracked by Git
- Check for hardcoded credentials in source files
- Review commit history for exposed secrets

### "NO_SECRET" error at runtime
- Verify all 8 environment variables are set in Netlify
- Trigger a new deployment after adding variables
- Check Netlify function logs for detailed errors

### Google OAuth not working
- Verify `NEXTAUTH_URL` matches your Netlify URL exactly
- Check Google Console redirect URIs are configured
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

---

## Where to Get API Keys

### Finnhub
1. Sign up at https://finnhub.io/
2. Get free API key from dashboard

### Alpaca
1. Sign up at https://alpaca.markets/
2. Go to **Paper Trading** section
3. Generate API keys (starts with "PK" for paper trading)

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials

---

## Reference Files (Local Only)

These files should exist ONLY on your local machine:
- `.env.local` - Local development secrets
- `.env.netlify` - Netlify secrets reference (DO NOT COMMIT)
- `NETLIFY_ENV_VARIABLES.txt` - Documentation copy (DO NOT COMMIT)

These files are in `.gitignore` to prevent accidental commits.
