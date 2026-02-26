# Deploy Communicator (fix 404 on register/login)

The frontend on Vercel gets **404** for `/api/*` because the **backend is not on Vercel**. Deploy the backend and point the frontend to it.

## 1. Deploy the backend (Railway or Render)

### Option A: Railway

1. Go to [railway.app](https://railway.app), sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select `Communicator`.
3. Set **Root Directory** to `backend/Communicator.Api`.
4. Railway will detect .NET. Add **Variables**:
   - `Jwt__Key` = any secret string (e.g. 32+ chars)
   - `AllowedOrigins` = `https://communicator-eight.vercel.app` (your Vercel URL, no trailing slash)
5. Deploy. Copy the public URL (e.g. `https://communicator-production-xxxx.up.railway.app`).

### Option B: Render

1. Go to [render.com](https://render.com), sign in with GitHub.
2. **New** → **Web Service** → connect `Communicator`.
3. **Root Directory**: `backend/Communicator.Api`
4. **Build Command**: `dotnet publish -c Release -o out`
5. **Start Command**: `dotnet out/Communicator.Api.dll`
6. **Environment**:
   - `Jwt__Key` = (your secret key)
   - `AllowedOrigins` = `https://communicator-eight.vercel.app`
7. Deploy and copy the service URL.

## 2. Point the frontend to your backend

1. In **Vercel** → your project → **Settings** → **Environment Variables**.
2. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://YOUR-BACKEND-URL/api`  
     (e.g. `https://communicator-production-xxxx.up.railway.app/api`)
3. **Redeploy** the frontend (Deployments → ⋮ → Redeploy).

After redeploy, register and login will use your backend and the 404 will be fixed.
