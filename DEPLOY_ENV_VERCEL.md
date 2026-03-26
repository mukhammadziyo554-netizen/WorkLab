Frontend (Vercel) environment

- `NEXT_PUBLIC_API_URL` (required): public HTTPS URL of your backend API, e.g. `https://api.myapp.com`.
  - Set this in your Vercel project Environment Variables (Production and Preview as needed).

Optional / helpful envs for Next middleware or server-side code:
- `BACKEND_INTERNAL_URL`: internal backend address used by server-side code (e.g., Docker network). Default: not set.

Backend environment (your backend host)

- `CORS_ORIGIN` or `CORS_ALLOWED_ORIGINS` (required): set to your Vercel app URL, e.g. `https://my-frontend.vercel.app` or comma-separated list.
- `WORKLAB_WEBAPP_URL` (optional fallback): frontend URL if not using `CORS_*` envs.
- `JWT_SECRET` (recommended): secure secret if you enable JWT signing.
- `DATABASE_URL`: connection string for your DB.

Notes

- On Vercel, use the exact production domain (including https) in `NEXT_PUBLIC_API_URL`.
- If you use httpOnly cookies for sessions, the backend must set `Set-Cookie` with `SameSite=Lax`/`Strict` and `Secure` for production.
- After deploying the backend, verify `GET ${NEXT_PUBLIC_API_URL}/health` returns `{ "ok": true }`.
