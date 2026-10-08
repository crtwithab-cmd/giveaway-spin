# Fixed shared giveaway for Cloudflare Pages

Problem: the old file used `localStorage`. That storage is per-browser/device, so entries were never shared with your community.

This version stores entries in Cloudflare KV through a Pages Function.

## Deploy
1. Create a KV namespace in Cloudflare: **Workers & Pages > KV > Create namespace** named `giveaway-state`.
2. In your Pages project: **Settings > Functions > KV namespace bindings** add binding:
   - Variable name: `GIVEAWAY_KV`
   - KV namespace: `giveaway-state`
3. Upload this folder to Cloudflare Pages. It must contain:
   - `index.html`
   - `functions/api/state.js`
4. Open the site, enter owner PIN `AB2026`, then change the PIN from owner mode.

If you use Wrangler, the binding must be attached to the Pages project as `GIVEAWAY_KV`.
