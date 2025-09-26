import crypto from 'node:crypto';

function generateId(prefix = '') {
  const ts = Date.now().toString(16);
  let rand = '';
  try {
    rand = crypto.randomBytes(6).toString('hex');
  } catch (_) { // eslint-disable-line no-unused-vars
    rand = Math.random().toString(16).slice(2, 14);
  }

  return `${prefix}${ts}-${rand}`;
}

export {
  generateId
};
