# Deploy Communicator (Vercel only)

The app can run **entirely on Vercel**: the frontend and a Node.js API (in `api/`) are both deployed with the same project.

## Deploy to Vercel

1. Push the repo to GitHub and connect it to Vercel.
2. Deploy. No extra services (e.g. Railway) are required.

Register and login use the serverless API at `/api/auth/register` and `/api/auth/login`.

## Optional: Environment variables (Vercel)

In **Vercel** → your project → **Settings** → **Environment Variables** you can set:

- **`JWT_SECRET`** – Secret used to sign JWTs (defaults to a dev value if unset).
- **`ALLOWED_ORIGINS`** – Allowed CORS origin (defaults to request origin).

## Alternative: Use the .NET backend elsewhere

To run the C# backend on Railway/Render and the frontend on Vercel, see the repo’s backend `Dockerfile` and set **`VITE_API_URL`** in Vercel to your backend URL + `/api`, then redeploy.
