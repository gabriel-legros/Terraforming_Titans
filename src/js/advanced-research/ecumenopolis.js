function getEcumenopolisLandFraction(terraforming) {
  const eco = typeof colonies !== 'undefined' ? colonies?.t7_colony : globalThis.colonies?.t7_colony;
  if (!eco || !terraforming?.initialLand) return 0;
  return (eco.active * eco.requiresLand) / terraforming.initialLand;
}

function getBiodomeLandFraction(terraforming) {
  if (!terraforming?.initialLand) return 0;
  try {
    const biodome = buildings.biodome;
    const fraction = (biodome.active * biodome.requiresLand) / terraforming.initialLand;
    return Math.max(0, Math.min(1, fraction));
  } catch (error) {
    return 0;
  }
}

function getLifeLandMultiplier(terraforming) {
  const ecumenopolisMultiplier = Math.max(0, 1 - getEcumenopolisLandFraction(terraforming));
  const biodomeFloorMultiplier = Math.max(0, getBiodomeLandFraction(terraforming));
  return Math.max(ecumenopolisMultiplier, biodomeFloorMultiplier);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getEcumenopolisLandFraction, getBiodomeLandFraction, getLifeLandMultiplier };
}

if (typeof window !== 'undefined') {
  window.getEcumenopolisLandFraction = getEcumenopolisLandFraction;
  window.getBiodomeLandFraction = getBiodomeLandFraction;
  window.getLifeLandMultiplier = getLifeLandMultiplier;
}
