function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
