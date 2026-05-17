const ANTIMATTER_PER_TERRAFORMED_WORLD = 50;
const STORAGE_DURATION_SECONDS = 50 * 3600;
const ANTIMATTER_SPACE_ENERGY_RATIO = 2_000_000_000_000_000;
const ANTIMATTER_SPACE_SYNC_FLAG = 'spaceAntimatterSynchronization';

function getAntimatterResource(resources) {
  return resources?.special?.antimatter || null;
}

function isAntimatterSpaceEnergySyncActive() {
  return researchManager?.isBooleanFlagSet?.(ANTIMATTER_SPACE_SYNC_FLAG) === true;
}

function antimatterToSpaceEnergy(amount) {
  return Math.max(0, amount || 0) * ANTIMATTER_SPACE_ENERGY_RATIO;
}

function spaceEnergyToAntimatter(amount) {
  return Math.max(0, amount || 0) / ANTIMATTER_SPACE_ENERGY_RATIO;
}

function getAntimatterEquivalentValue(resources) {
  if (!isAntimatterSpaceEnergySyncActive()) {
    return getAntimatterResource(resources)?.value || 0;
  }
  const antimatter = getAntimatterResource(resources);
  const legacyStock = antimatter && !antimatter.syncedToSpaceEnergy
    ? Math.max(0, antimatter.value || 0)
    : 0;
  return spaceEnergyToAntimatter(resources?.space?.energy?.value || 0) + legacyStock;
}

function getAntimatterEquivalentCap(resources) {
  if (!isAntimatterSpaceEnergySyncActive()) {
    return getAntimatterResource(resources)?.cap || 0;
  }
  return spaceEnergyToAntimatter(resources?.space?.energy?.cap || 0);
}

function routeAntimatterProductionTarget(category, resource, amount) {
  if (
    category === 'special' &&
    resource === 'antimatter' &&
    isAntimatterSpaceEnergySyncActive()
  ) {
    return {
      category: 'space',
      resource: 'energy',
      amount: antimatterToSpaceEnergy(amount)
    };
  }
  return { category, resource, amount };
}

function spendAntimatterEquivalent(amount, resources) {
  const antimatterAmount = Math.max(0, amount || 0);
  if (antimatterAmount <= 0) {
    return true;
  }
  if (isAntimatterSpaceEnergySyncActive()) {
    synchronizeAntimatterWithSpaceEnergy(resources);
    const spaceEnergyCost = antimatterToSpaceEnergy(antimatterAmount);
    const energy = resources.space.energy;
    if (energy.value < spaceEnergyCost) {
      return false;
    }
    energy.value = Math.max(0, energy.value - spaceEnergyCost);
    return true;
  }
  const antimatter = getAntimatterResource(resources);
  if (!antimatter || antimatter.value < antimatterAmount) {
    return false;
  }
  antimatter.value = Math.max(0, antimatter.value - antimatterAmount);
  return true;
}

function synchronizeAntimatterWithSpaceEnergy(resources) {
  const antimatter = getAntimatterResource(resources);
  const energy = resources?.space?.energy;
  if (!antimatter || !energy || !isAntimatterSpaceEnergySyncActive()) {
    return;
  }
  if (!antimatter.syncedToSpaceEnergy) {
    const convertedEnergy = antimatterToSpaceEnergy(antimatter.value || 0);
    if (convertedEnergy > 0) {
      energy.value += convertedEnergy;
    }
    antimatter.syncedToSpaceEnergy = true;
  }
  antimatter.value = getAntimatterEquivalentValue(resources);
  antimatter.hasCap = true;
  antimatter.baseCap = 0;
  antimatter.cap = getAntimatterEquivalentCap(resources);
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
  const target = routeAntimatterProductionTarget('special', 'antimatter', change);
  const displayRate = target.amount / seconds;

  const storage = accumulatedChanges?.[target.category];
  if (storage && Object.prototype.hasOwnProperty.call(storage, target.resource)) {
    storage[target.resource] += target.amount;
  } else {
    resources[target.category][target.resource].value += target.amount;
  }

  resources[target.category][target.resource].modifyRate?.(displayRate, 'Terraformed Worlds', 'global');
}

function updateAntimatterStorageCap(resources) {
  const antimatter = getAntimatterResource(resources);
  if (!antimatter || (!antimatter.unlocked && !antimatter.enabled)) {
    return;
  }

  const terraformedWorlds = getTerraformedWorldCount();
  const productionRate = terraformedWorlds * ANTIMATTER_PER_TERRAFORMED_WORLD;
  const baseCap = Math.max(0, productionRate * STORAGE_DURATION_SECONDS);
  const energy = resources?.space?.energy;

  if (isAntimatterSpaceEnergySyncActive()) {
    const spaceEnergyCap = antimatterToSpaceEnergy(baseCap);
    if (energy) {
      const previous = energy._antimatterStorageBonus || 0;
      energy.baseCap = Math.max(0, energy.baseCap - previous + spaceEnergyCap);
      energy._antimatterStorageBonus = spaceEnergyCap;
    }
    antimatter.hasCap = true;
    antimatter.baseCap = 0;
    antimatter.cap = getAntimatterEquivalentCap(resources);
    return;
  }

  if (energy && energy._antimatterStorageBonus) {
    energy.baseCap = Math.max(0, energy.baseCap - energy._antimatterStorageBonus);
    energy._antimatterStorageBonus = 0;
  }

  antimatter.hasCap = true;
  antimatter.baseCap = baseCap;
  antimatter.cap = baseCap;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ANTIMATTER_PER_TERRAFORMED_WORLD,
    STORAGE_DURATION_SECONDS,
    ANTIMATTER_SPACE_ENERGY_RATIO,
    ANTIMATTER_SPACE_SYNC_FLAG,
    antimatterToSpaceEnergy,
    spaceEnergyToAntimatter,
    getAntimatterEquivalentValue,
    getAntimatterEquivalentCap,
    isAntimatterSpaceEnergySyncActive,
    routeAntimatterProductionTarget,
    spendAntimatterEquivalent,
    synchronizeAntimatterWithSpaceEnergy,
    produceAntimatter,
    updateAntimatterStorageCap,
  };
}

if (typeof window !== 'undefined') {
  window.ANTIMATTER_SPACE_ENERGY_RATIO = ANTIMATTER_SPACE_ENERGY_RATIO;
  window.ANTIMATTER_SPACE_SYNC_FLAG = ANTIMATTER_SPACE_SYNC_FLAG;
  window.antimatterToSpaceEnergy = antimatterToSpaceEnergy;
  window.spaceEnergyToAntimatter = spaceEnergyToAntimatter;
  window.getAntimatterEquivalentValue = getAntimatterEquivalentValue;
  window.getAntimatterEquivalentCap = getAntimatterEquivalentCap;
  window.isAntimatterSpaceEnergySyncActive = isAntimatterSpaceEnergySyncActive;
  window.routeAntimatterProductionTarget = routeAntimatterProductionTarget;
  window.spendAntimatterEquivalent = spendAntimatterEquivalent;
  window.synchronizeAntimatterWithSpaceEnergy = synchronizeAntimatterWithSpaceEnergy;
  window.produceAntimatter = produceAntimatter;
  window.updateAntimatterStorageCap = updateAntimatterStorageCap;
}
