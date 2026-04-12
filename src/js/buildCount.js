const MAX_BUILD_COUNT = 1e32;

function multiplyByTen(count) {
  return Math.min(MAX_BUILD_COUNT, Number(count || 0) * 10);
}

function divideByTen(count) {
  return Math.max(1, Math.floor(Number(count || 0) / 10));
}

function getRoundedBuildCount(currentCount, buildCount) {
  const normalizedBuildCount = normalizeBuildingCount(buildCount);
  const step = normalizedBuildCount > 0n ? normalizedBuildCount : 1n;
  const current = normalizeBuildingCount(currentCount);
  const remainder = current % step;
  const roundedBuildCount = remainder === 0n ? step : step - remainder;
  return roundedBuildCount <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(roundedBuildCount)
    : roundedBuildCount.toString();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    multiplyByTen,
    divideByTen,
    getRoundedBuildCount,
    MAX_BUILD_COUNT,
  };
}
