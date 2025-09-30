const crypto = require('crypto');

function generateId(prefix = '') {
  const ts = Date.now().toString(16);
  // Use crypto.randomBytes without fallback - if it fails, let it throw
  const rand = crypto.randomBytes(6).toString('hex');

  return `${prefix}${ts}-${rand}`;
}

module.exports = {
  generateId
};
