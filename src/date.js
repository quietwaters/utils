// ---- Date and time utilities ---------------------------------------------
export function formatTime(input, { includeTime = true, timezone = 'UTC' } = {}) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  if (timezone === 'UTC') {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    if (!includeTime) return `${y}-${m}-${d}`;
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }

  // Use Intl.DateTimeFormat for other timezones
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const datePart = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;

  if (!includeTime) return datePart;

  const timePart = `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}`;
  return `${datePart} ${timePart}`;
}