const BaseColony =
  typeof Colony !== 'undefined'
    ? Colony
    : class {
        constructor() {}
      };

class Aerostat extends BaseColony {
  constructor(config, colonyName) {
    super(config, colonyName);
    this.buoyancyNotes = 'Aerostats are immune to the pressure and temperature penalties.  Aerostats will form small communities, allowing the use of factories.';
  }

  _getInitialLand() {
    if (typeof terraforming === 'undefined') {
      return 0;
    }

    const { initialLand } = terraforming;
    return typeof initialLand === 'number' && isFinite(initialLand) && initialLand > 0
      ? initialLand
      : 0;
  }

  _getBuildLimit() {
    const initialLand = this._getInitialLand();
    if (initialLand <= 0) {
      return 0;
    }

    return Math.floor(initialLand * 0.2);
  }

  _getRemainingBuildCapacity() {
    const limit = this._getBuildLimit();
    if (limit <= 0) {
      return 0;
    }

    return Math.max(0, limit - this.count);
  }

  build(buildCount = 1, activate = true) {
    const remaining = this._getRemainingBuildCapacity();
    if (remaining <= 0) {
      return false;
    }

    const allowed = Math.min(buildCount, remaining);
    if (allowed <= 0 || typeof BaseColony.prototype.build !== 'function') {
      return false;
    }

    return super.build(allowed, activate);
  }

  maxBuildable(reservePercent = 0) {
    const remaining = this._getRemainingBuildCapacity();
    if (remaining <= 0) {
      return 0;
    }

    let baseMax = remaining;
    if (typeof BaseColony.prototype.maxBuildable === 'function') {
      baseMax = super.maxBuildable(reservePercent);
    }

    if (!Number.isFinite(baseMax)) {
      return remaining;
    }

    return Math.max(0, Math.min(baseMax, remaining));
  }

  getBuoyancySummary() {
    return this.buoyancyNotes;
  }
}

function getFactoryTemperatureMaintenancePenaltyReduction(context = {}) {
  const hasProvidedBuildings = Object.prototype.hasOwnProperty.call(
    context,
    'buildings'
  );
  const buildingCollection = hasProvidedBuildings
    ? context.buildings
    : typeof buildings !== 'undefined'
      ? buildings
      : undefined;

  if (!buildingCollection) {
    return 0;
  }

  let totalWorkerRequirement = 0;

  for (const id in buildingCollection) {
    if (!Object.prototype.hasOwnProperty.call(buildingCollection, id)) continue;

    const building = buildingCollection[id];
    if (!building) continue;

    const perBuildingNeed =
      typeof building.getTotalWorkerNeed === 'function'
        ? building.getTotalWorkerNeed()
        : building.requiresWorker || 0;

    if (perBuildingNeed <= 0) continue;

    const activeCount =
      typeof building.active === 'number'
        ? building.active
        : typeof building.count === 'number'
          ? building.count
          : 0;

    if (activeCount <= 0) continue;

    const workerMultiplier =
      typeof building.getEffectiveWorkerMultiplier === 'function'
        ? building.getEffectiveWorkerMultiplier()
        : 1;

    totalWorkerRequirement +=
      activeCount * perBuildingNeed * workerMultiplier;
  }

  if (totalWorkerRequirement <= 0) {
    return 0;
  }

  const hasProvidedColonies = Object.prototype.hasOwnProperty.call(
    context,
    'colonies'
  );
  const colonyCollection = hasProvidedColonies
    ? context.colonies
    : typeof colonies !== 'undefined'
      ? colonies
      : undefined;

  if (!colonyCollection) {
    return 0;
  }

  const aerostat = colonyCollection.aerostat_colony;
  if (!aerostat) {
    return 0;
  }

  const baseCapacity = aerostat?.storage?.colony?.colonists || 0;
  if (baseCapacity <= 0) {
    return 0;
  }

  const storageMultiplier =
    typeof aerostat.getEffectiveStorageMultiplier === 'function'
      ? aerostat.getEffectiveStorageMultiplier()
      : 1;

  const activeAerostats =
    typeof aerostat.active === 'number'
      ? aerostat.active
      : typeof aerostat.count === 'number'
        ? aerostat.count
        : 0;

  if (activeAerostats <= 0) {
    return 0;
  }

  const aerostatCapacity = activeAerostats * baseCapacity * storageMultiplier;

  if (aerostatCapacity <= 0) {
    return 0;
  }

  return Math.min(1, aerostatCapacity / totalWorkerRequirement);
}

Aerostat.getFactoryTemperatureMaintenancePenaltyReduction =
  getFactoryTemperatureMaintenancePenaltyReduction;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Aerostat,
    getFactoryTemperatureMaintenancePenaltyReduction
  };
} else {
  globalThis.Aerostat = Aerostat;
  globalThis.getFactoryTemperatureMaintenancePenaltyReduction =
    getFactoryTemperatureMaintenancePenaltyReduction;
}
