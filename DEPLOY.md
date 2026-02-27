# Deploy Communicator (Vercel only)

The app can run **entirely on Vercel**: the frontend and a Node.js API (in `api/`) are both deployed with the same project.

## Deploy to Vercel

1. Push the repo to GitHub and connect it to Vercel.
2. Deploy. No extra services (e.g. Railway) are required.

Register and login use the serverless API at `/api/auth/register` and `/api/auth/login`.

## Persist accounts forever (so you can re-login and see the correct DM list)

By default, the API keeps users and messages **in memory** only. Data is lost on cold starts. To **save all registered accounts permanently** (re-login anytime, list shows all registered users):

### Option A: Vercel KV (recommended)

1. In the **Vercel Dashboard** go to your project → **Storage** → **Create Database** → choose **KV**.
2. Create a new KV store (e.g. name it `communicator`).
3. Vercel adds **`KV_REST_API_URL`** and **`KV_REST_API_TOKEN`** to your project automatically.
4. **Redeploy** the project.

With KV set, the API loads saved users and messages on **every request**, so the Direct Message list always shows all registered accounts and you can log in with any of them anytime.

### Option B: Vercel Blob

1. In the **Vercel Dashboard** go to your project → **Storage** → **Create Database** → choose **Blob**.
2. Create a new Blob store (e.g. `communicator-data`). Set access to **Private**.
3. Vercel adds **`BLOB_READ_WRITE_TOKEN`** automatically.
4. **Redeploy** the project.

If you use both KV and Blob, the API uses **KV** for persistence.

## Optional: Environment variables (Vercel)

In **Vercel** → your project → **Settings** → **Environment Variables**:

- **`JWT_SECRET`** – Secret for JWTs (defaults to a dev value if unset).
- **`ALLOWED_ORIGINS`** – Allowed CORS origin (defaults to request origin).
- **`KV_REST_API_URL`** / **`KV_REST_API_TOKEN`** – Set when you add a KV store (persist accounts).
- **`BLOB_READ_WRITE_TOKEN`** – Set when you add a Blob store (alternative persist).

## Alternative: Use the .NET backend (WebSocket chat)

The C# backend in `backend/Communicator.Api` supports **real-time chat over WebSockets** (SignalR). When the frontend talks to this backend, it uses the socket for sending and receiving messages instead of polling.

1. Run the .NET backend (e.g. locally or on Railway/Render). See the backend `Dockerfile` and `appsettings.json`.
2. Point the frontend at the backend:
   - Set **`VITE_API_URL`** to your backend URL + `/api` (e.g. `https://your-app.railway.app/api`).
   - The app will derive the WebSocket URL from it (e.g. `wss://your-app.railway.app/hub`) or you can set **`VITE_WS_URL`** explicitly (e.g. `wss://your-app.railway.app/hub`).
3. Redeploy or run the frontend. When logged in, the app connects to the hub; messages are sent and received over the socket. If the socket is unavailable, it falls back to HTTP API + polling.
