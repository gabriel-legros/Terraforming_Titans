function getEcumenopolisLandFraction(terraforming) {
  const eco = typeof colonies !== 'undefined' ? colonies?.t7_colony : globalThis.colonies?.t7_colony;
  if (!eco || !terraforming?.initialLand) return 0;
  return (eco.active * eco.requiresLand) / terraforming.initialLand;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getEcumenopolisLandFraction };
}

if (typeof window !== 'undefined') {
  window.getEcumenopolisLandFraction = getEcumenopolisLandFraction;
}
