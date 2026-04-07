function getEcumenopolisLandFraction(terraforming) {
  const eco = colonies?.t7_colony;
  const baseLand = resolveWorldBaseLand(terraforming);
  if (!eco || !baseLand) return 0;
  const activeCount = Number.isFinite(eco?.activeNumber)
    ? eco.activeNumber
    : (typeof buildingCountToNumber === 'function'
      ? buildingCountToNumber(eco?.active)
      : Math.max(0, Math.floor(Number(eco?.active) || 0)));
  return (activeCount * eco.requiresLand) / baseLand;
}

function getBiodomeLandFraction(terraforming) {
  const baseLand = resolveWorldBaseLand(terraforming);
  if (!baseLand) return 0;
  try {
    const biodome = buildings.biodome;
    const activeCount = Number.isFinite(biodome?.activeNumber)
      ? biodome.activeNumber
      : (typeof buildingCountToNumber === 'function'
        ? buildingCountToNumber(biodome?.active)
        : Math.max(0, Math.floor(Number(biodome?.active) || 0)));
    const fraction = (activeCount * biodome.requiresLand) / baseLand;
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
