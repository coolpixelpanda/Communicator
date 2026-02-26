# Deploy Communicator (Vercel only)

The app can run **entirely on Vercel**: the frontend and a Node.js API (in `api/`) are both deployed with the same project.

## Deploy to Vercel

1. Push the repo to GitHub and connect it to Vercel.
2. Deploy. No extra services (e.g. Railway) are required.

Register and login use the serverless API at `/api/auth/register` and `/api/auth/login`.

## Persist accounts and messages forever (Vercel Blob)

By default, the API keeps users and messages **in memory** only. After a cold start or a new serverless instance, data is lost. To save all registered accounts and messages permanently:

1. In the **Vercel Dashboard** go to your project → **Storage** → **Create Database** → choose **Blob**.
2. Create a new Blob store (e.g. name it `communicator-data`). Set access to **Private**.
3. Vercel will add the **`BLOB_READ_WRITE_TOKEN`** environment variable to your project automatically.
4. Redeploy the project.

Once `BLOB_READ_WRITE_TOKEN` is set, the API will:

- Load users and messages from Blob when the function runs (and the in-memory store is empty).
- Save users after each registration.
- Save messages after each sent message and when messages are marked as read.

Accounts and messages are then persisted across deploys and cold starts.

## Optional: Environment variables (Vercel)

In **Vercel** → your project → **Settings** → **Environment Variables** you can set:

- **`JWT_SECRET`** – Secret used to sign JWTs (defaults to a dev value if unset).
- **`ALLOWED_ORIGINS`** – Allowed CORS origin (defaults to request origin).
- **`BLOB_READ_WRITE_TOKEN`** – Set automatically when you add a Blob store (see above). Required for persisting accounts and messages.

## Alternative: Use the .NET backend elsewhere

To run the C# backend on Railway/Render and the frontend on Vercel, see the repo’s backend `Dockerfile` and set **`VITE_API_URL`** in Vercel to your backend URL + `/api`, then redeploy.
