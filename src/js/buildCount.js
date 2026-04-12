const MAX_BUILD_COUNT = 1e32;
const MAX_BUILD_COUNT_BIGINT = 100000000000000000000000000000000n;

function normalizeBuildStepCount(count) {
  const normalized = normalizeBuildingCount(count);
  return normalized > 0n ? normalized : 1n;
}

function multiplyByTen(count) {
  const next = normalizeBuildStepCount(count) * 10n;
  const capped = next > MAX_BUILD_COUNT_BIGINT ? MAX_BUILD_COUNT_BIGINT : next;
  return capped <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(capped) : capped.toString();
}

function divideByTen(count) {
  const current = normalizeBuildStepCount(count);
  const next = current / 10n;
  const normalized = next > 0n ? next : 1n;
  return normalized <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(normalized) : normalized.toString();
}

function getRoundedBuildCount(currentCount, buildCount) {
  const normalizedBuildCount = normalizeBuildStepCount(buildCount);
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
