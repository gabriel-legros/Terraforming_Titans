const MAX_BUILD_COUNT = 1e32;

function multiplyByTen(count) {
  return Math.min(MAX_BUILD_COUNT, Number(count || 0) * 10);
}

function divideByTen(count) {
  return Math.max(1, Math.floor(Number(count || 0) / 10));
}

function getRoundedBuildCount(currentCount, buildCount) {
  const normalizedBuildCount = Math.max(1, Math.floor(Number(buildCount || 0)));
  const current = typeof normalizeBuildingCount === 'function'
    ? normalizeBuildingCount(currentCount)
    : BigInt(Math.max(0, Math.floor(Number(currentCount) || 0)));
  const remainder = current % BigInt(normalizedBuildCount);
  return remainder === 0n ? normalizedBuildCount : normalizedBuildCount - Number(remainder);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    multiplyByTen,
    divideByTen,
    getRoundedBuildCount,
    MAX_BUILD_COUNT,
  };
}
