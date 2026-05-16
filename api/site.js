const { requireAuth, readBody } = require('../lib/auth');
const { getFile, writeFile } = require('../lib/github');

const PATH = 'content/site.json';

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'GET') {
      const file = await getFile(PATH);
      if (!file) return res.status(200).json({ data: null, sha: null });
      return res.status(200).json({ data: JSON.parse(file.content), sha: file.sha });
    }
    if (req.method === 'POST') {
      const payload = await readBody(req);
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      const existing = await getFile(PATH);
      const content = JSON.stringify(payload, null, 2) + '\n';
      await writeFile(PATH, content, existing ? existing.sha : undefined, 'Update site content');
      return res.status(200).json({ success: true });
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};
