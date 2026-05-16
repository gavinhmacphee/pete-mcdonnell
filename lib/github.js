async function ghRequest(method, path, body) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) throw new Error('GITHUB_TOKEN or GITHUB_REPO not configured');
  const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pete-mcdonnell-admin'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  if (!r.ok) {
    const err = new Error(`GitHub ${method} ${path} → ${r.status}: ${text}`);
    err.status = r.status;
    throw err;
  }
  return text ? JSON.parse(text) : {};
}

function branch() {
  return process.env.GITHUB_BRANCH || 'main';
}

async function getFile(path) {
  try {
    const data = await ghRequest('GET', `/contents/${encodeURI(path)}?ref=${branch()}`);
    return {
      content: Buffer.from(data.content, 'base64').toString('utf8'),
      sha: data.sha
    };
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

async function listDir(path) {
  try {
    return await ghRequest('GET', `/contents/${encodeURI(path)}?ref=${branch()}`);
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

async function writeFile(path, content, sha, message) {
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: branch()
  };
  if (sha) body.sha = sha;
  return ghRequest('PUT', `/contents/${encodeURI(path)}`, body);
}

async function deleteFile(path, sha, message) {
  return ghRequest('DELETE', `/contents/${encodeURI(path)}`, {
    message,
    sha,
    branch: branch()
  });
}

module.exports = { getFile, listDir, writeFile, deleteFile };
