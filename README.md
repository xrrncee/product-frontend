# Common Goods Inventory

## API configuration

For local development, copy `.env.example` to `.env.local` and set `VITE_API_URL` to the local API origin.

The production build uses `https://rada-laurence.onrender.com` from `.env.production`. If the backend origin changes, update that value or override `VITE_API_URL` in Vercel's Environment Variables, then redeploy. The backend must also allow `https://product-frontend-rada15.vercel.app` in its `API_ALLOW_ORIGIN` setting.
