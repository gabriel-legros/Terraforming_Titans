const ANTIMATTER_PER_TERRAFORMED_WORLD = 10;
const STORAGE_DURATION_SECONDS = 10 * 3600;

function getAntimatterResource(resources) {
  return resources?.special?.antimatter || null;
}

function getTerraformedWorldCount() {
  return spaceManager?.getTerraformedPlanetCount?.() ?? 0;
}

function produceAntimatter(deltaTime, resources, accumulatedChanges) {
  const antimatter = getAntimatterResource(resources);
  if (!antimatter || (!antimatter.unlocked && !antimatter.enabled)) {
    return;
  }

  const terraformedWorlds = getTerraformedWorldCount();
  if (terraformedWorlds <= 0) {
    return;
  }

  const rate = terraformedWorlds * ANTIMATTER_PER_TERRAFORMED_WORLD;
  const seconds = deltaTime / 1000;
  const change = rate * seconds;

  const storage = accumulatedChanges?.special;
  if (storage && Object.prototype.hasOwnProperty.call(storage, 'antimatter')) {
    storage.antimatter += change;
  } else {
    antimatter.value += change;
  }

  antimatter.modifyRate?.(rate, 'Terraformed Worlds', 'global');
}

function updateAntimatterStorageCap(resources) {
  const antimatter = getAntimatterResource(resources);
  if (!antimatter || (!antimatter.unlocked && !antimatter.enabled)) {
    return;
  }

  const terraformedWorlds = getTerraformedWorldCount();
  const productionRate = terraformedWorlds * ANTIMATTER_PER_TERRAFORMED_WORLD;
  const baseCap = Math.max(0, productionRate * STORAGE_DURATION_SECONDS);

  antimatter.hasCap = true;
  antimatter.baseCap = baseCap;
  antimatter.cap = baseCap;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ANTIMATTER_PER_TERRAFORMED_WORLD,
    STORAGE_DURATION_SECONDS,
    produceAntimatter,
    updateAntimatterStorageCap,
  };
}

if (typeof window !== 'undefined') {
  window.produceAntimatter = produceAntimatter;
  window.updateAntimatterStorageCap = updateAntimatterStorageCap;
}
