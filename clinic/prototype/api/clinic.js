const { clinic, send, preflight } = require('../lib/api-core');

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') return preflight(res);
  if (req.method !== 'GET') return send(res, { status: 405, body: { code: 'method_not_allowed' } });
  return send(res, clinic(req));
};
