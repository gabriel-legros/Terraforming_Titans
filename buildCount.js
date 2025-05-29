function multiplyByTen(count) {
  return count * 10;
}

function divideByTen(count) {
  return Math.max(1, Math.floor(count / 10));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    multiplyByTen,
    divideByTen,
  };
}
