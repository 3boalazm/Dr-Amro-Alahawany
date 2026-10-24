const { calendar, send, preflight, readBody } = require('../lib/api-core');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return preflight(res);
  if (req.method !== 'POST') return send(res, { status: 405, body: { code: 'method_not_allowed' } });
  try {
    return send(res, calendar(await readBody(req)));
  } catch {
    return send(res, { status: 400, body: { code: 'bad_json' } });
  }
};
