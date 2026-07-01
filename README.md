# Stock Ledger

Material inventory tracker for Hebbarz Bionaturale, with admin/team login and 346 items pre-loaded from your stock sheets.

## Deploy to Vercel

**1. Push this folder to GitHub**
```bash
cd stock-ledger-app
git init
git add .
git commit -m "Stock Ledger app"
```
Create a new repo on GitHub, then push to it (GitHub will show you the exact commands after you create the repo).

**2. Import into Vercel**
- Go to vercel.com → **Add New → Project**
- Select your GitHub repo → Deploy
- The first deploy will fail because there's no database connected yet — that's expected, continue to step 3.

**3. Add a database (Vercel KV)**
- In your Vercel project, go to the **Storage** tab
- Click **Create Database → KV** (powered by Upstash Redis; free tier is enough for this)
- Once created, click **Connect** and select this project — Vercel automatically adds the required environment variables

**4. Redeploy**
- Go to **Deployments** tab → click the three dots on the latest deployment → **Redeploy**
- Your app will now build successfully

**5. Open your app**
- Vercel gives you a URL like `stock-ledger-yourname.vercel.app` — share this with your team
- First person to open it will trigger the initial data load (346 items pre-loaded from your stock sheets)

## Local development (optional)
```bash
npm install
vercel env pull .env.local   # pulls your KV credentials from Vercel
npm run dev
```

## Notes
- Default admin password is `admin123` — change it from the key icon after logging in as Admin
- Team members can add stock; only Admin can edit/delete or change the password
- All data is stored in your Vercel KV database and shared across everyone using the app
