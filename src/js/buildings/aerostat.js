const BaseColony =
  typeof Colony !== 'undefined'
    ? Colony
    : class {
        constructor() {}
      };

class Aerostat extends BaseColony {
  constructor(config, colonyName) {
    super(config, colonyName);
    this._liftDisableAccumulator = 0;
    this._liftBelowThreshold = false;
    this.buoyancyNotes = 'Aerostats are immune to the pressure and temperature penalties, but require additional components, electronics and lift.  Aerostats will form small communities, allowing the use of factories.';
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

  getBuildLimit() {
    return this._getBuildLimit();
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

    const lift = this.getCurrentLift();
    if (this.isLiftBelowThreshold(lift)) {
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

    if (this.isLiftBelowThreshold()) {
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
    let summary = this.buoyancyNotes;
    const lift = this.getCurrentLift();
    if (this.isLiftBelowThreshold(lift)) {
      summary +=
        ' Current lift is below the minimum operational requirement, preventing aerostat activation and construction.';
    }
    return summary;
  }

  getMinimumOperationalLift() {
    if (typeof AEROSTAT_MINIMUM_OPERATIONAL_LIFT === 'number') {
      return AEROSTAT_MINIMUM_OPERATIONAL_LIFT;
    }
    return 0.2;
  }

  getAtmosphericComposition() {
    if (
      typeof terraforming !== 'undefined' &&
      terraforming &&
      terraforming.resources &&
      terraforming.resources.atmospheric
    ) {
      return terraforming.resources.atmospheric;
    }
    if (
      typeof resources !== 'undefined' &&
      resources &&
      resources.atmospheric
    ) {
      return resources.atmospheric;
    }
    return null;
  }

  getCurrentLift() {
    if (
      typeof calculateMolecularWeight !== 'function' ||
      typeof calculateSpecificLift !== 'function'
    ) {
      return null;
    }

    const atmosphere = this.getAtmosphericComposition();
    if (!atmosphere) {
      return null;
    }

    const molecularWeight = calculateMolecularWeight(atmosphere);
    if (!Number.isFinite(molecularWeight) || molecularWeight <= 0) {
      return null;
    }

    const pressure =
      typeof AEROSTAT_STANDARD_PRESSURE_PA === 'number'
        ? AEROSTAT_STANDARD_PRESSURE_PA
        : 101325;
    const temperature =
      typeof AEROSTAT_STANDARD_TEMPERATURE_K === 'number'
        ? AEROSTAT_STANDARD_TEMPERATURE_K
        : 273.15 + 21;
    const internalMolWeight =
      typeof AEROSTAT_INTERNAL_AIR_MOL_WEIGHT === 'number'
        ? AEROSTAT_INTERNAL_AIR_MOL_WEIGHT
        : 29;

    const lift = calculateSpecificLift(
      pressure,
      temperature,
      molecularWeight,
      internalMolWeight
    );

    if (!Number.isFinite(lift)) {
      return null;
    }

    return lift;
  }

  isLiftBelowThreshold(liftValue) {
    const lift = liftValue ?? this.getCurrentLift();
    if (lift === null) {
      this._liftBelowThreshold = false;
      return false;
    }
    const below = lift < this.getMinimumOperationalLift();
    this._liftBelowThreshold = below;
    return below;
  }

  filterActivationChange(change) {
    if (!Number.isFinite(change)) {
      return 0;
    }

    const sanitized = Math.trunc(change);
    if (sanitized > 0 && this.isLiftBelowThreshold()) {
      return 0;
    }
    return sanitized;
  }

  update(deltaTime = 0) {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    const lift = this.getCurrentLift();
    const belowThreshold = this.isLiftBelowThreshold(lift);

    if (!belowThreshold) {
      this._liftDisableAccumulator = 0;
      return;
    }

    const totalBuilt = typeof this.count === 'number' ? this.count : 0;
    if (totalBuilt <= 0) {
      this._liftDisableAccumulator = 0;
      return;
    }

    const currentlyActive = typeof this.active === 'number' ? this.active : 0;
    if (currentlyActive <= 0) {
      this._liftDisableAccumulator = 0;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return;
    }

    const disablePerSecond = totalBuilt * 0.01;
    if (disablePerSecond <= 0) {
      return;
    }

    this._liftDisableAccumulator += disablePerSecond * seconds;

    if (this._liftDisableAccumulator < 1) {
      return;
    }

    let toDisable = Math.floor(this._liftDisableAccumulator);
    if (toDisable < 1) {
      toDisable = 1;
    }

    this._liftDisableAccumulator = Math.max(
      0,
      this._liftDisableAccumulator - toDisable
    );

    const newActive = Math.max(0, currentlyActive - toDisable);
    if (newActive === currentlyActive) {
      return;
    }

    const change = newActive - currentlyActive;
    this.active = newActive;

    if (this.requiresLand && typeof this.adjustLand === 'function') {
      this.adjustLand(change);
    }

    if (typeof this.updateResourceStorage === 'function') {
      if (typeof resources !== 'undefined') {
        this.updateResourceStorage(resources);
      } else {
        this.updateResourceStorage();
      }
    }
  }
}

const FACTORY_MITIGATION_EXCLUDED_BUILDINGS = ['oreMine'];

function isBuildingEligibleForFactoryMitigation(id) {
  return FACTORY_MITIGATION_EXCLUDED_BUILDINGS.indexOf(id) === -1;
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

    if (!isBuildingEligibleForFactoryMitigation(id)) continue;

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
    return 1;
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

Aerostat.isBuildingEligibleForFactoryMitigation =
  isBuildingEligibleForFactoryMitigation;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Aerostat,
    getFactoryTemperatureMaintenancePenaltyReduction,
    isBuildingEligibleForFactoryMitigation
  };
} else {
  globalThis.Aerostat = Aerostat;
  globalThis.getFactoryTemperatureMaintenancePenaltyReduction =
    getFactoryTemperatureMaintenancePenaltyReduction;
  globalThis.isBuildingEligibleForFactoryMitigation =
    isBuildingEligibleForFactoryMitigation;
}
