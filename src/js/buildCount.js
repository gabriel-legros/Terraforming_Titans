const MAX_BUILD_COUNT = 1e32;

function multiplyByTen(count) {
  return Math.min(MAX_BUILD_COUNT, count * 10);
}

function divideByTen(count) {
  return Math.max(1, Math.floor(count / 10));
}

function getRoundedBuildCount(currentCount, buildCount) {
  const remainder = currentCount % buildCount;
  return remainder === 0 ? buildCount : buildCount - remainder;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    multiplyByTen,
    divideByTen,
    getRoundedBuildCount,
    MAX_BUILD_COUNT,
  };
}
