const { createSession, setSessionCookie, readBody } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) {
    return res.status(500).json({ error: 'Admin not configured' });
  }
  const { password } = await readBody(req);
  if (typeof password !== 'string' || password !== expected) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  setSessionCookie(res, createSession(secret));
  res.status(200).json({ success: true });
};
