function shouldUnlockAtmosphericWaterCollector() {
  if (typeof terraforming === 'undefined' || typeof resources === 'undefined') return false;
  const ice = resources.surface?.ice?.value || 0;
  const liquid = resources.surface?.liquidWater?.value || 0;
  if (ice >= 1e6 || liquid >= 1e6) return false;
  const pressureKPa = typeof terraforming.calculateTotalPressure === 'function' ? terraforming.calculateTotalPressure() : 0;
  const pressurePa = pressureKPa * 1000;
  const boiling = typeof boilingPointWater === 'function' ? boilingPointWater(pressurePa) : Infinity;
  const temp = terraforming.temperature?.zones?.tropical?.value || 0;
  return temp > boiling;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { shouldUnlockAtmosphericWaterCollector };
} else {
  globalThis.shouldUnlockAtmosphericWaterCollector = shouldUnlockAtmosphericWaterCollector;
}
