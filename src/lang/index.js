function isNil(val){
  return val === undefined || val === null;
}

function toBoolean(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;

  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return false;
}

module.exports = {
  isNil,
  toBoolean
};
