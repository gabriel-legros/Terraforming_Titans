const MAX_BUILD_COUNT = 1e32;

function multiplyByTen(count) {
  return Math.min(MAX_BUILD_COUNT, count * 10);
}

function divideByTen(count) {
  return Math.max(1, Math.floor(count / 10));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    multiplyByTen,
    divideByTen,
    MAX_BUILD_COUNT,
  };
}
