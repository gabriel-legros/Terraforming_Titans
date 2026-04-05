function getEcumenopolisLandFraction(terraforming) {
  const eco = colonies?.t7_colony;
  const baseLand = resolveWorldBaseLand(terraforming);
  if (!eco || !baseLand) return 0;
  return (eco.active * eco.requiresLand) / baseLand;
}

function getBiodomeLandFraction(terraforming) {
  const baseLand = resolveWorldBaseLand(terraforming);
  if (!baseLand) return 0;
  try {
    const biodome = buildings.biodome;
    const fraction = (biodome.active * biodome.requiresLand) / baseLand;
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
