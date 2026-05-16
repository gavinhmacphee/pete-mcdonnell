const { setSessionCookie } = require('../lib/auth');

module.exports = async (req, res) => {
  setSessionCookie(res, '');
  res.status(200).json({ success: true });
};
