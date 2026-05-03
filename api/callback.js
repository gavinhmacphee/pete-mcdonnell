// GitHub OAuth — callback.
// Exchanges the code for an access token, then posts it back to the Sveltia/Decap
// admin popup using the standard Decap CMS message contract.

module.exports = async (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).send('OAuth env vars are not configured');
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(req.headers.cookie || '');
  const expectedState = cookies.oauth_state;

  if (!code) {
    return sendResult(res, 'error', 'Missing authorization code');
  }
  if (!state || !expectedState || state !== expectedState) {
    return sendResult(res, 'error', 'State mismatch');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });
    const data = await tokenRes.json();
    if (data.error || !data.access_token) {
      return sendResult(res, 'error', data.error_description || data.error || 'No access token');
    }
    return sendResult(res, 'success', { token: data.access_token, provider: 'github' });
  } catch (err) {
    return sendResult(res, 'error', String(err && err.message || err));
  }
};

function parseCookies(header) {
  return header.split(';').reduce((acc, pair) => {
    const [k, ...rest] = pair.trim().split('=');
    if (k) acc[k] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function sendResult(res, status, content) {
  // Decap/Sveltia CMS contract: window.opener.postMessage('authorization:github:<status>:<json>')
  const payload = typeof content === 'string'
    ? JSON.stringify({ message: content })
    : JSON.stringify(content);
  const message = `authorization:github:${status}:${payload}`;
  const html = `<!doctype html><html><body><script>
(function(){
  function send(){
    if (!window.opener) { document.body.innerText = ${JSON.stringify('OAuth ' + status + ': ' + payload + ' (no opener)')}; return; }
    window.opener.postMessage(${JSON.stringify(message)}, '*');
  }
  window.addEventListener('message', function(e){
    if (e.data === 'authorizing:github') send();
  }, false);
  send();
  setTimeout(function(){ window.close(); }, 1000);
})();
</script></body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0');
  res.statusCode = 200;
  res.end(html);
}
