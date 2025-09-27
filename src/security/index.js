const {isNil} = require('../lang');

function maskString(str) {
  if (isNil(str)) {
    return '';
  }

  str = str.toString();

  if (str === '') {
    return str;
  }

  const maskPercentage = 0.7;
  const maxShownLength = 10;

  const len = str.length;

  // For very short strings, ensure at least some characters are shown
  let shownLength = Math.max(1, Math.floor(len * (1 - maskPercentage)));

  // Apply maximum shown length limit
  if (shownLength > maxShownLength) {
    shownLength = maxShownLength;
  }

  // For single character, mask completely
  if (len === 1) {
    return '*';
  }

  // Ensure we don't show more characters than the string length
  if (shownLength >= len) {
    shownLength = Math.max(1, len - 1);
  }

  let leftLength;
  let rightLength;
  if (shownLength % 2 === 0) {
    leftLength = shownLength / 2;
    rightLength = leftLength;
  } else {
    // When odd number of shown chars, show more on the right
    leftLength = Math.floor(shownLength / 2);
    rightLength = shownLength - leftLength;
  }

  // Handle edge case where rightLength would be 0
  if (rightLength === 0 && len > 1) {
    rightLength = 1;
    leftLength = Math.max(0, shownLength - rightLength);
  }

  const maskedLength = len - shownLength;
  return `${str.slice(0, leftLength)}${'*'.repeat(maskedLength)}${str.slice(-rightLength)}`;
}

module.exports = {
  maskString
};
