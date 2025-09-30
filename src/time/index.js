function sleep(ms) {
  // Clamp to valid range to avoid Node.js warnings
  // setTimeout accepts 1 to 2147483647 (2^31-1) ms
  const clampedMs = Math.max(0, Math.min(ms, 2147483647));
  return new Promise((resolve) => setTimeout(resolve, clampedMs));
}

function startTimer() {
  const startTime = Date.now();
  return {
    end() {
      return Date.now() - startTime;
    }
  };
}

module.exports = {
  sleep,
  startTimer
};
