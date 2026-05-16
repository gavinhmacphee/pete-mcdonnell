const { verifySession, getSessionCookie } = require('../lib/auth');

module.exports = async (req, res) => {
  const ok = verifySession(getSessionCookie(req), process.env.SESSION_SECRET);
  res.status(200).json({ authenticated: ok });
};
