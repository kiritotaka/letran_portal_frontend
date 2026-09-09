# Backend auth integration

Default API URL: https://letran-portal-backend.onrender.com/api/v1.
Set VITE_API_URL at build time to override it. Direct URLs are now respected.
Add the deployed frontend origin to backend CORS_ORIGINS (no trailing slash/path).
For Express proxy mode set VITE_API_URL=/api/v1 and BACKEND_API_URL to the backend URL.

Login and first-login password change use the real backend envelopes. The auth
store saves access_token, refresh_token, expiry and user atomically in sessionStorage.
On reload, cached profile permissions are not trusted: the protected route waits for
refresh to complete. Tokens are removed on logout or refresh failure.
Closing the tab normally ends the stored session; browser session restore may retain
sessionStorage. Storage-disabled browsers fall back to memory.

Refresh runs before expiry, on demand, or once after a protected API returns 401.
Concurrent requests in a tab share one refresh. Login/password 401 and permission 403
never trigger refresh. In-flight refresh cannot restore a logged-out/newer session.
Do not duplicate a signed-in tab: some browsers copy sessionStorage when duplicating
tabs, so both copies could rotate the same refresh token. Log in separately in a new tab.
Refresh tokens remain accessible to page JavaScript; HttpOnly cookies need backend changes.

First-login passwords are no longer stored in route history. The user re-enters the
current password. Password change auto-login saves the complete real token response.
Partial/unknown password-update outcomes are shown explicitly. Demo credential and
password-fill buttons have been removed from auth screens.

There is no /auth/me request: explicit profile refresh uses /auth/refresh until the
backend provides /auth/me. Logout clears browser state only, not all Supabase sessions.
The remaining business screens still require their respective backend endpoints;
this change does not implement users/permissions/documents/HR APIs or mock fallbacks.

## Verification

- npm ci
- npm run lint
- npm run test
- npm run build

On this Windows sandbox, the native esbuild config bundler cannot read an ancestor
directory. The browser build was verified with:
node node_modules/vite/bin/vite.js build --configLoader runner
Tests use the runner config loader for the same reason. The Express server bundle
step was blocked by that local native-tool restriction.

Manual deployed check: login, reload a protected page, confirm a refresh succeeds,
change first-login password, log out, and verify Back/reload does not restore auth.
No real passwords are included in tests; HTTP adapters mock auth responses.
Deploy frontend again to apply the new VITE_API_URL. No Supabase secret belongs in VITE_*.
