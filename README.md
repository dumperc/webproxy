# Proximity

## Cloudflare Pages setup

1. Create a free Cloudflare account.
2. Create a GitHub repository and upload these files, keeping `functions/proxy.js` in the `functions` folder.
3. In Cloudflare: **Workers & Pages → Create application → Pages → Connect to Git**.
4. Select the repository and deploy it.
5. Open the generated `*.pages.dev` address.
6. Enter a public `https://` URL.

No server/VPS is required.

This is a basic HTTP(S) fetch proxy. It does not bypass CAPTCHAs, DRM, authentication, school/work/parental filters, or other access controls. Modern sites using WebSockets, WebRTC, service workers, or complex cross-origin APIs may not work.
