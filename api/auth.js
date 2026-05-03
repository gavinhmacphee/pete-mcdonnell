// GitHub OAuth — start.
// Redirects the Sveltia/Decap admin popup to GitHub's authorize endpoint.
// Required env vars (set in Vercel project settings):
//   OAUTH_GITHUB_CLIENT_ID
//   OAUTH_GITHUB_CLIENT_SECRET (only used by callback)
// Optional:
//   OAUTH_SCOPES (default: "repo,user")

module.exports = (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('OAUTH_GITHUB_CLIENT_ID is not configured');
    return;
  }
  const scope = process.env.OAUTH_SCOPES || 'repo,user';
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/callback`;
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const url = `https://github.com/login/oauth/authorize`
    + `?client_id=${encodeURIComponent(clientId)}`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
    + `&scope=${encodeURIComponent(scope)}`
    + `&state=${encodeURIComponent(state)}`;

  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
};
