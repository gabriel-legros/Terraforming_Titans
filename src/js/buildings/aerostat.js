const BaseColony = globalThis.Colony ?? class {
  constructor() {}
};

const AEROSTAT_STANDARD_PRESSURE_PA =
  globalThis.AEROSTAT_STANDARD_PRESSURE_PA ?? 101325;
const AEROSTAT_STANDARD_TEMPERATURE_K =
  globalThis.AEROSTAT_STANDARD_TEMPERATURE_K ?? 273.15 + 21;
const AEROSTAT_INTERNAL_AIR_MOL_WEIGHT =
  globalThis.AEROSTAT_INTERNAL_AIR_MOL_WEIGHT ?? 29;
const AEROSTAT_MINIMUM_OPERATIONAL_LIFT =
  globalThis.AEROSTAT_MINIMUM_OPERATIONAL_LIFT ?? 0.2;
const AEROSTAT_MINIMUM_OPERATIONAL_PRESSURE_KPA =
  globalThis.AEROSTAT_MINIMUM_OPERATIONAL_PRESSURE_KPA ?? 50;
const AEROSTAT_MAX_LAND_SHARE = 0.25;
const AEROSTAT_COLLISION_AVOIDANCE_RESEARCH_PER_CAP = 100;
function getAerostatText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

const AEROSTAT_BUOYANCY_NOTES =
  getAerostatText(
    'ui.buildings.aerostat.buoyancyNotes',
    'Aerostats are immune to the pressure penalty and have reduced temperature maintenance penalty. Their own maintenance always uses at least the dry-adiabatic 1 atm temperature floor. Aerostats require additional components, electronics and lift, and form small communities that allow the use of factories. Colony researches that normally unlock new colony types will also improve aerostat comfort and enable electronics/androids consumption. Aerostats need at least 50 kPa of ambient pressure to stay buoyant. When lift fails, active aerostats can land as Research Outposts if sufficient land remains.'
  );
const AEROSTAT_LAND_LIMIT_TOOLTIP =
  getAerostatText(
    'ui.buildings.aerostat.landLimitTooltip',
    'At most 25% of the planet\'s starting land can host aerostat colonies to minimize collision risk.'
  );
const AEROSTAT_TEMPERATURE_TOOLTIP_INTRO =
  getAerostatText(
    'ui.buildings.aerostat.temperatureTooltipIntro',
    'Aerostats reduce temperature maintenance penalties for staffed factories (excluding ore mines) using their total housing capacity. Eligible worker requirement is summed from active buildings using active buildings x worker need x effective worker multiplier. Some buildings also have an Aerostat Support value; active aerostats cover up to active aerostats x support structures for that building, and any uncovered share keeps that portion of the penalty. This mitigation cannot reduce buildings below the dry-adiabatic 1 atm maintenance floor.'
  );
const AEROSTAT_TOTAL_CAPACITY = 10;
const AEROSTAT_ANDROID_SPACE_TOOLTIP =
  getAerostatText(
    'ui.buildings.aerostat.androidSpaceTooltip',
    'Reserve part of each aerostat for android housing instead of colonists. The slider value is android capacity per aerostat out of 10 total housing slots.'
  );

globalThis.AEROSTAT_STANDARD_PRESSURE_PA ??= AEROSTAT_STANDARD_PRESSURE_PA;
globalThis.AEROSTAT_STANDARD_TEMPERATURE_K ??= AEROSTAT_STANDARD_TEMPERATURE_K;
globalThis.AEROSTAT_INTERNAL_AIR_MOL_WEIGHT ??= AEROSTAT_INTERNAL_AIR_MOL_WEIGHT;
globalThis.AEROSTAT_MINIMUM_OPERATIONAL_LIFT ??=
  AEROSTAT_MINIMUM_OPERATIONAL_LIFT;
globalThis.AEROSTAT_MINIMUM_OPERATIONAL_PRESSURE_KPA ??=
  AEROSTAT_MINIMUM_OPERATIONAL_PRESSURE_KPA;

let getTotalSurfacePressureKPaHelper = null;
if (typeof module !== 'undefined' && module.exports) {
  ({ getTotalSurfacePressureKPa: getTotalSurfacePressureKPaHelper } = require('../terraforming/atmospheric-utils.js'));
} else {
  getTotalSurfacePressureKPaHelper = globalThis.getTotalSurfacePressureKPa;
}

class Aerostat extends BaseColony {
  constructor(config, colonyName) {
    super(config, colonyName);
    this._liftDisableAccumulator = 0;
    this._liftBelowThreshold = false;
    this._pressureBelowThreshold = false;
    this.buoyancyNotes = AEROSTAT_BUOYANCY_NOTES;
    this.landAsResearchOutpost = true;
    this.androidCapacityShare = 0;
    this.aerostats_collision_avoidance = false;
  }

  hasCollisionAvoidance() {
    return !!this.aerostats_collision_avoidance;
  }

  getAndroidCapacityShare() {
    return Math.max(
      0,
      Math.min(AEROSTAT_TOTAL_CAPACITY, Math.round(this.androidCapacityShare || 0))
    );
  }

  getColonistCapacityShare() {
    return AEROSTAT_TOTAL_CAPACITY - this.getAndroidCapacityShare();
  }

  setAndroidCapacityShare(value) {
    const nextValue = Math.max(
      0,
      Math.min(AEROSTAT_TOTAL_CAPACITY, Math.round(Number(value) || 0))
    );

    if (this.androidCapacityShare === nextValue) {
      return;
    }

    this.androidCapacityShare = nextValue;
    this.updateResourceStorage();
  }

  getStorageAmount(category, resource) {
    if (category === 'colony') {
      if (resource === 'colonists') {
        return this.getColonistCapacityShare() * this.getEffectiveStorageMultiplier();
      }
      if (resource === 'androids') {
        return this.getAndroidCapacityShare() * this.getEffectiveStorageMultiplier();
      }
    }

    return super.getStorageAmount(category, resource);
  }

  _getInitialLand() {
    return resolveWorldBaseLand(terraforming);
  }

  _getBuildLimit() {
    const initialLand = this._getInitialLand();
    if (initialLand <= 0) {
      return 0;
    }

    return Math.floor(initialLand * AEROSTAT_MAX_LAND_SHARE);
  }

  getBuildLimit() {
    const baseLimit = this._getBuildLimit();
    if (baseLimit <= 0) {
      return 0;
    }

    const researchLimit = this.getResearchSelfFundingBuildLimit();
    if (!this.hasCollisionAvoidance()) {
      return Math.min(baseLimit, researchLimit);
    }
    return researchLimit;
  }

  _getRemainingBuildCapacity() {
    const limit = this.getBuildLimit();
    if (limit <= 0) {
      return 0;
    }

    return Math.max(0, limit - this.count);
  }

  getCollisionAvoidanceResearchSurchargeForCount(count) {
    const normalizedCount = Math.max(0, Math.floor(count));
    if (!this.hasCollisionAvoidance() || normalizedCount <= 0) {
      return 0;
    }

    const baseLimit = this._getBuildLimit();
    if (baseLimit <= 0) {
      return 0;
    }

    const overCount = Math.max(0, normalizedCount - baseLimit);
    if (overCount <= 0) {
      return 0;
    }

    return (
      overCount *
      (overCount - 1) *
      AEROSTAT_COLLISION_AVOIDANCE_RESEARCH_PER_CAP
    ) / (2 * baseLimit);
  }

  getCollisionAvoidanceResearchSurcharge(buildCount = 1) {
    const normalizedBuildCount = Math.max(0, Math.floor(buildCount));
    if (!this.hasCollisionAvoidance() || normalizedBuildCount <= 0) {
      return 0;
    }

    const startCount = Math.max(0, Math.floor(this.count || 0));
    const baseLimit = this._getBuildLimit();
    if (baseLimit <= 0) {
      return 0;
    }

    const zeroSurchargeBuilds = Math.max(0, baseLimit + 1 - startCount);
    const chargedBuilds = Math.max(0, normalizedBuildCount - zeroSurchargeBuilds);
    if (chargedBuilds <= 0) {
      return 0;
    }

    const firstChargedTerm = Math.max(1, startCount - baseLimit);
    return (
      chargedBuilds *
      (2 * firstChargedTerm + chargedBuilds - 1) *
      AEROSTAT_COLLISION_AVOIDANCE_RESEARCH_PER_CAP
    ) / (2 * baseLimit);
  }

  getCollisionAvoidanceNextUnitResearchSurchargeForCount(count) {
    const normalizedCount = Math.max(0, Math.floor(count));
    if (!this.hasCollisionAvoidance() || normalizedCount <= 0) {
      return 0;
    }

    const baseLimit = this._getBuildLimit();
    if (baseLimit <= 0) {
      return 0;
    }

    const overCount = Math.max(0, normalizedCount - baseLimit);
    if (overCount <= 0) {
      return 0;
    }

    return (
      overCount * AEROSTAT_COLLISION_AVOIDANCE_RESEARCH_PER_CAP
    ) / baseLimit;
  }

  getResearchOutputPerAerostat() {
    const baseResearchOutput = this.production?.colony?.research || 0;
    if (baseResearchOutput <= 0) {
      return 0;
    }

    return (
      baseResearchOutput *
      this.getEffectiveProductionMultiplier() *
      this.getEffectiveResourceProductionMultiplier('colony', 'research')
    );
  }

  getResearchMaintenancePerAerostatForCount(count) {
    const normalizedCount = Math.max(0, Math.floor(count));
    if (normalizedCount <= 0) {
      return 0;
    }

    const researchMultiplier = this.getEffectiveCostMultiplier(
      'colony',
      'research'
    );
    const baseResearchCost = (this.cost?.colony?.research || 0) * researchMultiplier;
    const nextUnitSurcharge =
      this.getCollisionAvoidanceNextUnitResearchSurchargeForCount(
        normalizedCount
      );
    const effectiveResearchCost =
      normalizedCount > 0 ? baseResearchCost + nextUnitSurcharge : 0;

    if (effectiveResearchCost <= 0) {
      return 0;
    }

    const multiplier = this.getEffectiveMaintenanceCostMultiplier(
      'colony',
      'research'
    );
    return (
      effectiveResearchCost *
      maintenanceFraction *
      this.maintenanceFactor *
      multiplier
    );
  }

  getResearchSelfFundingBuildLimit() {
    const baseLimit = this._getBuildLimit();
    if (baseLimit <= 0) {
      return 0;
    }

    const outputPerAerostat = this.getResearchOutputPerAerostat();
    const baseMaintenancePerAerostat =
      this.getResearchMaintenancePerAerostatForCount(1);
    if (outputPerAerostat < baseMaintenancePerAerostat) {
      return 0;
    }

    if (!this.hasCollisionAvoidance()) {
      return baseLimit;
    }

    const maintenanceMultiplier =
      maintenanceFraction *
      this.maintenanceFactor *
      this.getEffectiveMaintenanceCostMultiplier('colony', 'research');
    if (maintenanceMultiplier <= 0) {
      return Infinity;
    }

    const researchMultiplier = this.getEffectiveCostMultiplier(
      'colony',
      'research'
    );
    const baseResearchCost = (this.cost?.colony?.research || 0) * researchMultiplier;
    const maintenanceBudget =
      outputPerAerostat / maintenanceMultiplier - baseResearchCost;
    if (maintenanceBudget < 0) {
      return 0;
    }

    const maxOverCap = Math.floor(
      (maintenanceBudget * baseLimit) /
      AEROSTAT_COLLISION_AVOIDANCE_RESEARCH_PER_CAP
    );
    return Math.max(baseLimit, baseLimit + maxOverCap);
  }

  getBaseEffectiveCost(buildCount = 1) {
    const effectiveCost = super.getBaseEffectiveCost(buildCount);
    const surcharge = this.getCollisionAvoidanceResearchSurcharge(buildCount);

    if (surcharge <= 0) {
      return effectiveCost;
    }

    const researchMultiplier = this.getEffectiveCostMultiplier(
      'colony',
      'research'
    );
    if (!effectiveCost.colony) {
      effectiveCost.colony = {};
    }
    effectiveCost.colony.research =
      (effectiveCost.colony.research || 0) + surcharge * researchMultiplier;

    return effectiveCost;
  }

  calculateMaintenanceCost() {
    const maintenanceCost = super.calculateMaintenanceCost();
    const activeCount = Math.max(0, Math.floor(this.active || 0));
    const effectiveResearchCost =
      this.getResearchMaintenancePerAerostatForCount(activeCount);

    if (effectiveResearchCost <= 0) {
      delete maintenanceCost.research;
      return maintenanceCost;
    }
    maintenanceCost.research = effectiveResearchCost;

    return maintenanceCost;
  }

  canAfford(buildCount = 1, reservePercent = 0, additionalReserves = null) {
    const requested = Math.max(0, Math.floor(buildCount));
    if (requested <= 0) {
      return false;
    }

    if (this.isLiftBelowThreshold(undefined, this.getCurrentSurfacePressure())) {
      return false;
    }

    const remaining = this._getRemainingBuildCapacity();
    if (requested > remaining) {
      return false;
    }

    return super.canAfford(buildCount, reservePercent, additionalReserves);
  }

  applyMaintenance(accumulatedChanges, accumulatedMaintenance, deltaTime) {
    super.applyMaintenance(accumulatedChanges, accumulatedMaintenance, deltaTime);

    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    const researchMaintenanceCost = this.maintenanceCost.research || 0;
    const activeCount = Math.max(0, Math.floor(this.active || 0));
    if (researchMaintenanceCost <= 0 || activeCount <= 0) {
      return;
    }

    const currentResearchUpkeep = this.currentMaintenance.research || 0;
    const fullResearchUpkeep =
      researchMaintenanceCost * activeCount * (deltaTime / 1000);
    const additionalResearchUpkeep =
      fullResearchUpkeep - currentResearchUpkeep;

    if (additionalResearchUpkeep <= 0) {
      return;
    }

    this.currentMaintenance.research = fullResearchUpkeep;
    accumulatedChanges.colony.research =
      (accumulatedChanges.colony.research || 0) - additionalResearchUpkeep;
    resources.colony.research.modifyRate(
      -(additionalResearchUpkeep * (1000 / deltaTime)),
      this.displayName,
      'building'
    );
    accumulatedMaintenance.research =
      (accumulatedMaintenance.research || 0) + additionalResearchUpkeep;
  }

  build(buildCount = 1, activate = true) {
    const remaining = this._getRemainingBuildCapacity();
    if (remaining <= 0) {
      return false;
    }

    const lift = this.getCurrentLift();
    const pressure = this.getCurrentSurfacePressure();
    if (this.isLiftBelowThreshold(lift, pressure)) {
      return false;
    }

    const allowed = Math.min(Math.max(0, Math.floor(buildCount)), remaining);
    if (allowed <= 0 || typeof BaseColony.prototype.build !== 'function') {
      return false;
    }

    return super.build(allowed, activate);
  }

  maxBuildable(reservePercent = 0, additionalReserves = null) {
    const buildLimit = this.getBuildLimit();
    if (buildLimit <= 0) {
      return 0;
    }

    if (this.isLiftBelowThreshold(undefined, this.getCurrentSurfacePressure())) {
      return 0;
    }

    if (!this.hasCollisionAvoidance()) {
      const remaining = this._getRemainingBuildCapacity();
      if (remaining <= 0) {
        return 0;
      }

      let baseMax = remaining;
      if (typeof BaseColony.prototype.maxBuildable === 'function') {
        baseMax = super.maxBuildable(reservePercent, additionalReserves);
      }

      if (!Number.isFinite(baseMax)) {
        return remaining;
      }

      return Math.max(0, Math.min(baseMax, remaining));
    }

    let high = super.maxBuildable(reservePercent, additionalReserves);
    if (!Number.isFinite(high) || high <= 0) {
      return 0;
    }

    let low = 0;
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (mid <= low || mid >= high) {
        if (this.canAfford(high, reservePercent, additionalReserves)) {
          low = high;
        } else {
          high = low;
        }
        break;
      }

      if (this.canAfford(mid, reservePercent, additionalReserves)) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return Math.max(0, low);
  }

  getBuoyancySummary() {
    let summary = this.buoyancyNotes;
    const lift = this.getCurrentLift();
    const pressure = this.getCurrentSurfacePressure();
    const { pressureBelow, liftBelow } = this._evaluateBuoyancy(
      lift,
      pressure
    );

    let warning = '';
    if (pressureBelow) {
      const minPressure = this.getMinimumOperationalPressure();
      warning = Number.isFinite(pressure)
        ? `▲ Current atmospheric pressure is ${formatNumber(pressure, false, 1)} kPa, below the ${formatNumber(
            minPressure,
            false,
            0
          )} kPa minimum needed for aerostat buoyancy. ▲`
        : `▲ Atmospheric pressure is below the ${formatNumber(minPressure, false, 0)} kPa minimum needed for aerostat buoyancy. ▲`;
    } else if (liftBelow) {
      warning =
        '▲ Current lift is below the minimum operational requirement, preventing aerostat activation and construction. ▲';
    }

    if (warning) {
      summary += `\n${warning}`;
    }

    return summary;
  }

  getMinimumOperationalLift() {
    return AEROSTAT_MINIMUM_OPERATIONAL_LIFT;
  }

  getMinimumOperationalPressure() {
    return AEROSTAT_MINIMUM_OPERATIONAL_PRESSURE_KPA;
  }

  saveState() {
    const base = super.saveState?.() ?? {};
    return {
      ...base,
      landAsResearchOutpost: this.landAsResearchOutpost,
      androidCapacityShare: this.getAndroidCapacityShare()
    };
  }

  loadState(state = {}) {
    super.loadState?.(state);
    if (
      state &&
      typeof state === 'object' &&
      Object.prototype.hasOwnProperty.call(state, 'landAsResearchOutpost')
    ) {
      this.landAsResearchOutpost = !!state.landAsResearchOutpost;
    } else {
      this.landAsResearchOutpost = true;
    }

    if (
      state &&
      typeof state === 'object' &&
      Object.prototype.hasOwnProperty.call(state, 'androidCapacityShare')
    ) {
      this.androidCapacityShare = Math.max(
        0,
        Math.min(AEROSTAT_TOTAL_CAPACITY, Math.round(state.androidCapacityShare || 0))
      );
    } else {
      this.androidCapacityShare = 0;
    }

    this.updateResourceStorage();
  }

  getAtmosphericComposition() {
    return (
      globalThis.terraforming?.resources?.atmospheric ??
      globalThis.resources?.atmospheric ??
      null
    );
  }

  getCurrentLift() {
    const atmosphere = this.getAtmosphericComposition();
    if (!atmosphere) {
      return null;
    }

    const molecularWeight = globalThis.calculateMolecularWeight?.(
      getAerostatLiftComposition(atmosphere)
    );
    if (!Number.isFinite(molecularWeight) || molecularWeight <= 0) {
      return null;
    }

    const lift = globalThis.calculateSpecificLift?.(
      AEROSTAT_STANDARD_PRESSURE_PA,
      AEROSTAT_STANDARD_TEMPERATURE_K,
      molecularWeight,
      AEROSTAT_INTERNAL_AIR_MOL_WEIGHT
    );

    if (!Number.isFinite(lift)) {
      return null;
    }

    return lift;
  }

  getCurrentSurfacePressure() {
    const pressure = getTotalSurfacePressureKPa (terraforming);
    if (!Number.isFinite(pressure) || pressure < 0) {
      return null;
    }

    return pressure;
  }

  _evaluateBuoyancy(liftValue, pressureValue) {
    const lift = Number.isFinite(liftValue) ? liftValue : null;
    const pressure = Number.isFinite(pressureValue) ? pressureValue : null;

    const minPressure = this.getMinimumOperationalPressure();
    const pressureBelow = pressure !== null && pressure < minPressure;
    this._pressureBelowThreshold = pressureBelow;

    const minLift = this.getMinimumOperationalLift();
    const liftBelow = lift !== null && lift < minLift;

    const insufficient = pressureBelow || liftBelow;
    this._liftBelowThreshold = insufficient;

    return { lift, pressure, pressureBelow, liftBelow, insufficient };
  }

  isLiftBelowThreshold(liftValue, pressureValue) {
    const lift =
      liftValue === undefined ? this.getCurrentLift() : liftValue;
    const pressure =
      pressureValue === undefined
        ? this.getCurrentSurfacePressure()
        : pressureValue;

    const { insufficient } = this._evaluateBuoyancy(lift, pressure);
    return insufficient;
  }

  initUI(autoBuildContainer, cache) {
    super.initUI?.(autoBuildContainer, cache);
    this._ensureResearchOutpostToggle(autoBuildContainer, cache);
  }

  updateUI(cache) {
    super.updateUI?.(cache);
    this._syncResearchOutpostToggle(cache);
  }

  getConsumptionRatioForResource(category, resource) {
    const ratio = super.getConsumptionRatioForResource(category, resource);
    if (
      category === 'colony' &&
      (resource === 'food' ||
        resource === 'electronics' ||
        resource === 'androids' ||
        resource === 'components')
    ) {
      return ratio * (this.getColonistCapacityShare() / AEROSTAT_TOTAL_CAPACITY);
    }

    return ratio;
  }

  getEffectiveResourceProductionMultiplier(category, resource) {
    let multiplier = super.getEffectiveResourceProductionMultiplier(
      category,
      resource
    );
    if (category === 'colony' && resource === 'research') {
      multiplier *= this.getColonistCapacityShare() / AEROSTAT_TOTAL_CAPACITY;
    }
    return multiplier;
  }

  filterActivationChange(change) {
    if (!Number.isFinite(change)) {
      return 0;
    }

    const sanitized = Math.trunc(change);
    if (sanitized > 0 && this.isLiftBelowThreshold()) {
      return 0;
    }
    if (sanitized > 0) {
      const maxActive = this.getResearchSelfFundingBuildLimit();
      if (Number.isFinite(maxActive)) {
        const currentActive = Math.max(0, Math.floor(this.active || 0));
        const allowedIncrease = Math.max(0, Math.floor(maxActive) - currentActive);
        return Math.min(sanitized, allowedIncrease);
      }
    }
    return sanitized;
  }

  update(deltaTime = 0) {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    const lift = this.getCurrentLift();
    const pressure = this.getCurrentSurfacePressure();
    const belowThreshold = this.isLiftBelowThreshold(lift, pressure);

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

    const disabledCount = change < 0 ? -change : 0;
    if (disabledCount > 0 && this.landAsResearchOutpost) {
      const colonyCollection =
        typeof colonies !== 'undefined' ? colonies : null;
      const researchOutpost = colonyCollection?.t1_colony ?? null;
      if (researchOutpost) {
        const landRoomRaw =
          typeof researchOutpost.landAffordCount === 'function'
            ? researchOutpost.landAffordCount()
            : Infinity;
        const landRoom = Number.isFinite(landRoomRaw)
          ? Math.max(0, landRoomRaw)
          : landRoomRaw;
        const convertible = Math.min(disabledCount, landRoom);
        if (convertible > 0) {
          const newCount = Math.max(0, this.count - convertible);
          this.count = newCount;
          if (this.active > this.count) {
            this.active = this.count;
          }

          if (
            researchOutpost.requiresLand &&
            typeof researchOutpost.adjustLand === 'function'
          ) {
            researchOutpost.adjustLand(convertible);
          }
          researchOutpost.count += convertible;
          researchOutpost.active += convertible;

          if (typeof researchOutpost.updateResourceStorage === 'function') {
            if (typeof resources !== 'undefined') {
              researchOutpost.updateResourceStorage(resources);
            } else {
              researchOutpost.updateResourceStorage();
            }
          }
        }
      }
    }

    if (typeof this.updateResourceStorage === 'function') {
      if (typeof resources !== 'undefined') {
        this.updateResourceStorage(resources);
      } else {
        this.updateResourceStorage();
      }
    }
  }

  _ensureResearchOutpostToggle(autoBuildContainer, cache = {}) {
    if (!autoBuildContainer) {
      return;
    }

    let container = cache.researchOutpostContainer;
    let checkbox = cache.researchOutpostCheckbox;

    if (!container || !container.isConnected || !checkbox) {
      container = document.createElement('label');
      container.classList.add('aerostat-research-outpost-toggle');

      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.classList.add('aerostat-research-outpost-checkbox');
      checkbox.addEventListener('change', () => {
        this.landAsResearchOutpost = checkbox.checked;
      });

      const text = document.createElement('span');
      text.textContent = getAerostatText(
        'ui.buildings.aerostat.landAsResearchOutpost',
        'Land as Research Outpost'
      );

      container.appendChild(checkbox);
      container.appendChild(text);

      cache.researchOutpostContainer = container;
      cache.researchOutpostCheckbox = checkbox;
    }

    const reference = cache.reverseControl;
    const needsAttach = container.parentElement !== autoBuildContainer;
    if (needsAttach) {
      if (reference && reference.parentElement === autoBuildContainer) {
        autoBuildContainer.insertBefore(container, reference);
      } else {
        autoBuildContainer.appendChild(container);
      }
    }

    this._syncResearchOutpostToggle(cache);
  }

  _syncResearchOutpostToggle(cache = {}) {
    const checkbox = cache.researchOutpostCheckbox;
    if (checkbox) {
      checkbox.checked = this.landAsResearchOutpost;
    }
  }
}

const FACTORY_MITIGATION_EXCLUDED_BUILDINGS = ['oreMine'];

function isBuildingEligibleForFactoryMitigation(id) {
  return FACTORY_MITIGATION_EXCLUDED_BUILDINGS.indexOf(id) === -1;
}

function getAerostatMaintenanceMitigation(context = {}) {
  const result = {
    workerShare: 0,
    aerostatCount: 0,
    aerostatCapacity: 0,
    totalWorkerRequirement: 0,
    buildingCoverage: { list: [], byId: {} }
  };

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
    return result;
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

  const aerostat = colonyCollection?.aerostat_colony ?? null;
  const activeAerostatsRaw =
    Number.isFinite(aerostat?.active)
      ? aerostat.active
      : Number.isFinite(aerostat?.count)
        ? aerostat.count
        : 0;
  const activeAerostats = Math.max(0, activeAerostatsRaw);
  result.aerostatCount = activeAerostats;

  let totalWorkerRequirement = 0;

  for (const id in buildingCollection) {
    if (!Object.prototype.hasOwnProperty.call(buildingCollection, id)) continue;

    const building = buildingCollection[id];
    if (!building) continue;

    if (isBuildingEligibleForFactoryMitigation(id)) {
      const perBuildingNeedValue =
        building.getTotalWorkerNeed?.() ?? building.requiresWorker ?? 0;
      const perBuildingNeed = Number.isFinite(perBuildingNeedValue)
        ? perBuildingNeedValue
        : 0;

      if (perBuildingNeed > 0) {
        const activeCountRaw = Number.isFinite(building.active)
          ? building.active
          : Number.isFinite(building.count)
            ? building.count
            : 0;
        const activeCount = Math.max(0, activeCountRaw);
        if (activeCount > 0) {
          const workerMultiplierValue = building.getEffectiveWorkerMultiplier?.();
          const workerMultiplier = Number.isFinite(workerMultiplierValue)
            ? workerMultiplierValue
            : 1;
          totalWorkerRequirement +=
            activeCount * perBuildingNeed * workerMultiplier;
        }
      }
    }

    const reductionValue = building.aerostatReduction ?? 0;
    const reduction = Number.isFinite(reductionValue) ? reductionValue : 0;
    if (reduction <= 0) {
      continue;
    }

    const activeCountRaw = Number.isFinite(building.active)
      ? building.active
      : Number.isFinite(building.count)
        ? building.count
        : 0;
    const activeCount = Math.max(0, activeCountRaw);
    const maxSupported = Math.max(0, activeAerostats * reduction);
    const supported = Math.min(activeCount, maxSupported);
    const coverage = activeCount > 0 ? Math.min(1, supported / activeCount) : 0;
    const remainingFraction = activeCount > 0 ? 1 - coverage : 1;

    const entry = {
      id,
      name: building.displayName || building.name || id,
      activeCount,
      perAerostat: reduction,
      maxSupported,
      supported,
      coverage,
      remainingFraction: Math.max(0, Math.min(1, remainingFraction))
    };

    result.buildingCoverage.list.push(entry);
    result.buildingCoverage.byId[id] = entry;
  }

  result.buildingCoverage.list.sort((a, b) => a.name.localeCompare(b.name));
  result.totalWorkerRequirement = totalWorkerRequirement;

  if (totalWorkerRequirement <= 0) {
    result.workerShare = 1;
    return result;
  }

  if (!aerostat || activeAerostats <= 0) {
    result.workerShare = 0;
    return result;
  }

  const aerostatCapacity = activeAerostats * AEROSTAT_TOTAL_CAPACITY;
  result.aerostatCapacity = aerostatCapacity;
  if (aerostatCapacity <= 0) {
    result.workerShare = 0;
    return result;
  }

  result.workerShare = Math.min(1, aerostatCapacity / totalWorkerRequirement);
  return result;
}

function getFactoryTemperatureMaintenancePenaltyReduction(context = {}) {
  const mitigation = getAerostatMaintenanceMitigation(context);
  return mitigation.workerShare;
}

Aerostat.getAerostatMaintenanceMitigation = getAerostatMaintenanceMitigation;
Aerostat.getFactoryTemperatureMaintenancePenaltyReduction =
  getFactoryTemperatureMaintenancePenaltyReduction;

Aerostat.isBuildingEligibleForFactoryMitigation =
  isBuildingEligibleForFactoryMitigation;

function getAerostatLiftContext() {
  const atmosphere =
    globalThis.terraforming?.resources?.atmospheric ??
    globalThis.resources?.atmospheric ??
    null;

  if (!atmosphere) {
    return { lift: null, molecularWeight: null };
  }

  const externalMolWeight = globalThis.calculateMolecularWeight?.(
    getAerostatLiftComposition(atmosphere)
  );
  if (!Number.isFinite(externalMolWeight) || externalMolWeight <= 0) {
    return { lift: null, molecularWeight: null };
  }

  const lift = globalThis.calculateSpecificLift?.(
    AEROSTAT_STANDARD_PRESSURE_PA,
    AEROSTAT_STANDARD_TEMPERATURE_K,
    externalMolWeight,
    AEROSTAT_INTERNAL_AIR_MOL_WEIGHT
  );

  if (!Number.isFinite(lift)) {
    return { lift: null, molecularWeight: externalMolWeight };
  }

  return { lift, molecularWeight: externalMolWeight };
}

function getAerostatLiftComposition(atmosphere) {
  if (!atmosphere || typeof atmosphere !== 'object') {
    return atmosphere;
  }

  const composition = {};
  for (const key in atmosphere) {
    if (key === 'calciteAerosol') {
      continue;
    }
    composition[key] = atmosphere[key];
  }
  return composition;
}

function formatAerostatResearchCost(value) {
  if (!Number.isFinite(value) || value === 0) {
    return '0';
  }

  if (Math.abs(value) >= 1) {
    return formatNumber(value, false, 2, true);
  }

  if (Math.abs(value) >= 0.01) {
    return formatNumber(value, false, 4, true);
  }

  return formatNumber(value, false, 3, true);
}

function formatAerostatLimit(value) {
  if (value === Infinity) {
    return '∞';
  }
  if (!Number.isFinite(value)) {
    return getAerostatText('ui.buildings.aerostat.notAvailable', 'N/A');
  }
  return formatNumber(value, false, 2);
}

function attachAerostatBuoyancySection(container, structure) {
  if (!(structure instanceof Aerostat)) {
    return;
  }

  const summaryText =
    structure.getBuoyancySummary?.() ??
    getAerostatText('ui.buildings.aerostat.buoyancyTelemetryPending', 'Buoyancy telemetry pending.');
  const existing = structure.buoyancyUI ?? {};
  const needsRebuild =
    !existing.container ||
    !existing.container.isConnected ||
    !existing.liftValue ||
    !existing.mitigationValue ||
    !existing.limitValue ||
    !existing.limitInfo ||
    !existing.capacityValue ||
    !existing.capacityDecreaseButton ||
    !existing.capacityIncreaseButton;

  if (needsRebuild) {
    const card = document.createElement('div');
    card.classList.add('project-card', 'colony-buoyancy-card');
    card.style.flexBasis = '100%';

    const header = document.createElement('div');
    header.classList.add('card-header');

    const arrow = document.createElement('span');
    arrow.classList.add('collapse-arrow');
    arrow.textContent = '\u25BC';

    const title = document.createElement('span');
    title.classList.add('card-title');
    title.textContent = getAerostatText(
      'ui.buildings.aerostat.detailsTitle',
      'Aerostats Details'
    );

    header.appendChild(arrow);
    header.appendChild(title);

    const body = document.createElement('div');
    body.classList.add('card-body');

    const text = document.createElement('div');
    text.classList.add('colony-buoyancy-text');
    text.innerHTML = (summaryText ?? '').replace(/\n/g, '<br>');
    body.appendChild(text);

    const liftRow = document.createElement('div');
    liftRow.classList.add('colony-buoyancy-lift-row');

    const liftLabel = document.createElement('span');
    liftLabel.classList.add('colony-buoyancy-lift-label');
    liftLabel.textContent = getAerostatText(
      'ui.buildings.aerostat.currentLift',
      'Current Lift:'
    );
    liftRow.appendChild(liftLabel);

    const liftValue = document.createElement('span');
    liftValue.classList.add('colony-buoyancy-lift-value');
    liftValue.textContent = getAerostatText('ui.buildings.aerostat.notAvailable', 'N/A');
    liftRow.appendChild(liftValue);

    const liftInfo = document.createElement('span');
    liftInfo.classList.add('info-tooltip-icon');
    liftInfo.innerHTML = '&#9432;';
    const liftTooltip = attachDynamicInfoTooltip(
      liftInfo,
      getAerostatText(
        'ui.buildings.aerostat.liftTooltipIntro',
        'Specific lift at 1 atm and 21°C using current atmospheric composition, excluding calcite aerosol, compared to breathable air. When "Land as Research Outpost" is enabled, disabled aerostats will attempt to convert into Research Outposts if land is available.'
      )
    );
    liftRow.appendChild(liftInfo);

    body.appendChild(liftRow);

    const mitigationRow = document.createElement('div');
    mitigationRow.classList.add(
      'colony-buoyancy-lift-row',
      'colony-buoyancy-mitigation-row'
    );

    const mitigationLabel = document.createElement('span');
    mitigationLabel.classList.add(
      'colony-buoyancy-lift-label',
      'colony-buoyancy-mitigation-label'
    );
    mitigationLabel.textContent = getAerostatText(
      'ui.buildings.aerostat.temperatureMaintenanceMitigation',
      'Temperature Maintenance Mitigation:'
    );
    mitigationRow.appendChild(mitigationLabel);

    const mitigationValue = document.createElement('span');
    mitigationValue.classList.add(
      'colony-buoyancy-lift-value',
      'colony-buoyancy-mitigation-value'
    );
    mitigationValue.textContent = getAerostatText('ui.buildings.aerostat.notAvailable', 'N/A');
    mitigationRow.appendChild(mitigationValue);

    const mitigationInfo = document.createElement('span');
    mitigationInfo.classList.add('info-tooltip-icon');
    mitigationInfo.innerHTML = '&#9432;';
    const mitigationTooltip = attachDynamicInfoTooltip(
      mitigationInfo,
      AEROSTAT_TEMPERATURE_TOOLTIP_INTRO
    );
    mitigationRow.appendChild(mitigationInfo);

    body.appendChild(mitigationRow);

    const limitRow = document.createElement('div');
    limitRow.classList.add(
      'colony-buoyancy-lift-row',
      'colony-buoyancy-limit-row'
    );

    const limitLabel = document.createElement('span');
    limitLabel.classList.add(
      'colony-buoyancy-lift-label',
      'colony-buoyancy-limit-label'
    );
    limitLabel.textContent = getAerostatText(
      'ui.buildings.aerostat.maximumAerostats',
      'Maximum Aerostats:'
    );
    limitRow.appendChild(limitLabel);

    const limitValue = document.createElement('span');
    limitValue.classList.add(
      'colony-buoyancy-lift-value',
      'colony-buoyancy-limit-value'
    );
    limitValue.textContent = getAerostatText('ui.buildings.aerostat.notAvailable', 'N/A');
    limitRow.appendChild(limitValue);

    const limitInfo = document.createElement('span');
    limitInfo.classList.add('info-tooltip-icon');
    limitInfo.innerHTML = '&#9432;';
    const limitTooltip = attachDynamicInfoTooltip(
      limitInfo,
      AEROSTAT_LAND_LIMIT_TOOLTIP
    );
    limitRow.appendChild(limitInfo);

    body.appendChild(limitRow);

    const capacityRow = document.createElement('div');
    capacityRow.classList.add(
      'colony-buoyancy-lift-row',
      'colony-buoyancy-capacity-row'
    );

    const capacityLabel = document.createElement('span');
    capacityLabel.classList.add(
      'colony-buoyancy-lift-label',
      'colony-buoyancy-capacity-label'
    );
    capacityLabel.textContent = getAerostatText(
      'ui.buildings.aerostat.androidSpace',
      'Aerostat Android Space:'
    );
    capacityRow.appendChild(capacityLabel);

    const capacityValue = document.createElement('span');
    capacityValue.classList.add(
      'colony-buoyancy-lift-value',
      'colony-buoyancy-capacity-value'
    );
    capacityValue.textContent = '0/10';
    capacityRow.appendChild(capacityValue);

    const capacityInfo = document.createElement('span');
    capacityInfo.classList.add('info-tooltip-icon');
    capacityInfo.innerHTML = '&#9432;';
    const capacityTooltip = attachDynamicInfoTooltip(
      capacityInfo,
      AEROSTAT_ANDROID_SPACE_TOOLTIP
    );
    capacityRow.appendChild(capacityInfo);

    const capacityControls = document.createElement('div');
    capacityControls.classList.add('colony-buoyancy-capacity-controls');

    const capacityDecreaseButton = document.createElement('button');
    capacityDecreaseButton.type = 'button';
    capacityDecreaseButton.classList.add('colony-buoyancy-capacity-button');
    capacityDecreaseButton.textContent = '-';
    capacityDecreaseButton.addEventListener('click', () => {
      structure.setAndroidCapacityShare(structure.getAndroidCapacityShare() - 1);
      updateAerostatBuoyancySection(structure);
    });
    capacityControls.appendChild(capacityDecreaseButton);

    const capacityIncreaseButton = document.createElement('button');
    capacityIncreaseButton.type = 'button';
    capacityIncreaseButton.classList.add('colony-buoyancy-capacity-button');
    capacityIncreaseButton.textContent = '+';
    capacityIncreaseButton.addEventListener('click', () => {
      structure.setAndroidCapacityShare(structure.getAndroidCapacityShare() + 1);
      updateAerostatBuoyancySection(structure);
    });
    capacityControls.appendChild(capacityIncreaseButton);

    capacityRow.appendChild(capacityControls);
    body.appendChild(capacityRow);

    const uiState = {
      container: card,
      header,
      arrow,
      body,
      text,
      liftValue,
      liftInfo,
      liftTooltip,
      mitigationValue,
      mitigationInfo,
      mitigationTooltip,
      limitValue,
      limitInfo,
      limitTooltip,
      capacityValue,
      capacityInfo,
      capacityTooltip,
      capacityDecreaseButton,
      capacityIncreaseButton,
      expanded: true
    };

    header.addEventListener('click', () => {
      uiState.expanded = !uiState.expanded;
      updateAerostatBuoyancySection(structure);
    });

    card.appendChild(header);
    card.appendChild(body);
    structure.buoyancyUI = uiState;
  } else {
    existing.text.textContent = summaryText;
    structure.buoyancyUI = existing;
  }

  container.appendChild(structure.buoyancyUI.container);
  updateAerostatBuoyancySection(structure);
}

function updateAerostatBuoyancySection(structure) {
  const ui = structure?.buoyancyUI;
  if (!ui) {
    return;
  }

  const summaryText =
    structure.getBuoyancySummary?.() ??
    getAerostatText('ui.buildings.aerostat.buoyancyTelemetryPending', 'Buoyancy telemetry pending.');
  ui.text.innerHTML = (summaryText ?? '').replace(/\n/g, '<br>');

  const expanded = ui.expanded !== false;
  ui.container.classList.toggle('collapsed', !expanded);
  ui.arrow.textContent = expanded ? '\u25BC' : '\u25B6';
  if (ui.body) {
    ui.body.style.display = expanded ? '' : 'none';
  }

  const { lift, molecularWeight } = getAerostatLiftContext();
  const pressure = structure.getCurrentSurfacePressure?.() ?? null;
  const minPressure =
    structure.getMinimumOperationalPressure?.() ??
    AEROSTAT_MINIMUM_OPERATIONAL_PRESSURE_KPA;
  const liftAvailable =
    Number.isFinite(pressure) && pressure < minPressure ? null : lift;

  const baseBuildLimitRaw = structure._getBuildLimit?.() ?? null;
  const baseBuildLimit = Number.isFinite(baseBuildLimitRaw)
    ? Math.max(0, Math.floor(baseBuildLimitRaw))
    : null;
  const buildLimitRaw = structure.getBuildLimit?.() ?? baseBuildLimitRaw;
  const buildLimit = buildLimitRaw === Infinity
    ? Infinity
    : Number.isFinite(buildLimitRaw)
      ? Math.max(0, Math.floor(buildLimitRaw))
      : null;

  const currentAerostats = Number.isFinite(structure?.count)
    ? Math.max(0, Math.floor(structure.count))
    : null;
  const remainingCapacity =
    Number.isFinite(buildLimit) && currentAerostats !== null
      ? Math.max(0, buildLimit - currentAerostats)
      : null;
  const researchLimitRaw = structure.getResearchSelfFundingBuildLimit?.() ?? null;
  const researchLimit = researchLimitRaw === Infinity
    ? Infinity
    : Number.isFinite(researchLimitRaw)
      ? Math.max(0, Math.floor(researchLimitRaw))
      : null;
  const nextCount =
    currentAerostats === null ? null : currentAerostats + 1;
  const researchOutputPerAerostat =
    structure.getResearchOutputPerAerostat?.() ?? null;
  const nextResearchMaintenance =
    nextCount === null
      ? null
      : structure.getResearchMaintenancePerAerostatForCount?.(nextCount) ?? null;

  const mitigationDetails = Aerostat.getAerostatMaintenanceMitigation?.() ?? null;
  const mitigationShareRaw = mitigationDetails?.workerShare ?? null;
  const mitigationShare = Number.isFinite(mitigationShareRaw)
    ? Math.max(0, Math.min(1, mitigationShareRaw))
    : null;
  const aerostatCount = Number.isFinite(mitigationDetails?.aerostatCount)
    ? Math.max(0, mitigationDetails.aerostatCount)
    : 0;
  const aerostatCapacity = Number.isFinite(mitigationDetails?.aerostatCapacity)
    ? Math.max(0, mitigationDetails.aerostatCapacity)
    : 0;
  const totalWorkerRequirement = Number.isFinite(
    mitigationDetails?.totalWorkerRequirement
  )
    ? Math.max(0, mitigationDetails.totalWorkerRequirement)
    : 0;
  const buildingCoverageList = Array.isArray(
    mitigationDetails?.buildingCoverage?.list
  )
    ? mitigationDetails.buildingCoverage.list
    : [];
  const androidCapacityShare = structure.getAndroidCapacityShare();
  const colonistCapacityShare = structure.getColonistCapacityShare();

  if (ui.liftValue) {
    ui.liftValue.textContent =
      liftAvailable === null
        ? getAerostatText('ui.buildings.aerostat.notAvailable', 'N/A')
        : `${liftAvailable >= 0 ? '+' : ''}${formatNumber(
            liftAvailable,
            false,
            3
          )} kg/m³`;
  }

  if (ui.liftInfo) {
    let title =
      getAerostatText(
        'ui.buildings.aerostat.liftTooltipBase',
        'Specific lift at 1 atm and 21°C using current atmospheric composition, excluding calcite aerosol, compared to breathable air.'
      );
    if (Number.isFinite(molecularWeight) && molecularWeight > 0) {
      title += `\n${getAerostatText(
        'ui.buildings.aerostat.liftTooltipMolecularWeight',
        'External mean molecular weight: {value} g/mol.',
        { value: formatNumber(molecularWeight, false, 2) }
      )}`;
    }
    if (liftAvailable !== null) {
      title += `\n${getAerostatText(
        'ui.buildings.aerostat.liftTooltipCurrentLift',
        'Current lift: {value} kg/m^3.',
        {
          value: `${liftAvailable >= 0 ? '+' : ''}${formatNumber(
            liftAvailable,
            false,
            3
          )}`
        }
      )}`;
    }
    title += `\n${getAerostatText(
      'ui.buildings.aerostat.liftTooltipShutdownThreshold',
      'Aerostat shutdown threshold: {value} kg/m^3.',
      { value: formatNumber(AEROSTAT_MINIMUM_OPERATIONAL_LIFT, false, 3) }
    )}`;
    title += `\n${getAerostatText(
      'ui.buildings.aerostat.liftTooltipMinimumPressure',
      'Aerostats require at least {value} kPa of surface pressure to remain buoyant.',
      { value: formatNumber(minPressure, false, 0) }
    )}`;
    setTooltipText(ui.liftTooltip, title, ui, 'liftTooltipText');
  }

  if (ui.mitigationValue) {
    ui.mitigationValue.textContent =
      mitigationShare === null
        ? getAerostatText('ui.buildings.aerostat.notAvailable', 'N/A')
        : getAerostatText(
            'ui.buildings.aerostat.mitigationValue',
            '{percent}% ({workers} workers/{capacity} aerostat capacity)',
            {
              percent: formatNumber(mitigationShare * 100, false, 1),
              workers: formatNumber(totalWorkerRequirement, false, 2),
              capacity: formatNumber(aerostatCapacity, false, 2)
            }
          );
  }

  if (ui.mitigationInfo) {
    let mitigationTitle = AEROSTAT_TEMPERATURE_TOOLTIP_INTRO;
    if (!mitigationDetails) {
      mitigationTitle += `\n${getAerostatText(
        'ui.buildings.aerostat.mitigationDataUnavailable',
        'Mitigation data unavailable.'
      )}`;
    } else {
      mitigationTitle += `\n${getAerostatText(
        'ui.buildings.aerostat.activeAerostats',
        'Active aerostats: {value}.',
        { value: formatNumber(aerostatCount, false, 2) }
      )}`;

      if (mitigationShare === null) {
        mitigationTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.factoryMitigationUnavailable',
          'Factory mitigation data unavailable.'
        )}`;
      } else {
        mitigationTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.factoryMitigationApplied',
          'Factory mitigation applied: {value}% of the penalty is negated.',
          { value: formatNumber(mitigationShare * 100, false, 2) }
        )}`;
        mitigationTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.aerostatColonistCapacity',
          'Aerostat housing capacity: {value}.',
          { value: formatNumber(aerostatCapacity, false, 2) }
        )}`;
        mitigationTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.eligibleWorkerRequirement',
          'Eligible staffed worker requirement: {value}.',
          { value: formatNumber(totalWorkerRequirement, false, 2) }
        )}`;
        mitigationTitle +=
          mitigationShare < 1
            ? `\n${getAerostatText(
                'ui.buildings.aerostat.mitigationLimited',
                'Mitigation is limited by available aerostat housing capacity compared to staffed worker requirements.'
              )}`
            : `\n${getAerostatText(
                'ui.buildings.aerostat.mitigationMaxed',
                'All staffed buildings currently reduce the surface temperature penalty as far as possible, subject to the 1 atm maintenance floor.'
              )}`;
        mitigationTitle +=
          `\n${getAerostatText(
            'ui.buildings.aerostat.perBuildingSupport',
            'Per-building support is applied afterward: remaining penalty share is multiplied by the uncovered fraction for that building.'
          )}`;
      }

      if (buildingCoverageList.length > 0) {
        mitigationTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.supportedBuildingsHeader',
          'Aerostat-supported buildings:'
        )}`;
        buildingCoverageList.forEach(entry => {
          mitigationTitle += `\n• ${getAerostatText(
            'ui.buildings.aerostat.supportedBuildingEntry',
            '{name}: {supported} of {active} active covered (can support {capacity}; {perAerostat} per aerostat).',
            {
              name: entry.name,
              supported: formatNumber(entry.supported, false, 2),
              active: formatNumber(entry.activeCount, false, 2),
              capacity: formatNumber(entry.maxSupported, false, 2),
              perAerostat: formatNumber(entry.perAerostat, false, 2)
            }
          )}`;
        });
      } else {
        mitigationTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.noSupportedBuildings',
          'No buildings currently list an Aerostat Support value.'
        )}`;
      }
    }
    setTooltipText(ui.mitigationTooltip, mitigationTitle, ui, 'mitigationTooltipText');
  }

  if (ui.limitValue) {
    ui.limitValue.textContent =
      buildLimit === null
        ? getAerostatText('ui.buildings.aerostat.notAvailable', 'N/A')
        : structure.hasCollisionAvoidance?.() && baseBuildLimit !== null
          ? getAerostatText(
              'ui.buildings.aerostat.maximumAerostatsWithBase',
              '{value} ({base} base)',
              {
                value: formatAerostatLimit(buildLimit),
                base: formatAerostatLimit(baseBuildLimit)
              }
            )
          : formatAerostatLimit(buildLimit);
  }

  if (ui.limitInfo) {
    let limitTitle = AEROSTAT_LAND_LIMIT_TOOLTIP;
    if (baseBuildLimit !== null) {
      limitTitle += `\n${getAerostatText(
        'ui.buildings.aerostat.baseMaximumAerostats',
        'Base land cap: {value}.',
        { value: formatAerostatLimit(baseBuildLimit) }
      )}`;
    }
    if (remainingCapacity !== null) {
      limitTitle += `\n${getAerostatText(
        'ui.buildings.aerostat.remainingCapacity',
        'Remaining aerostat capacity: {value}.',
        { value: formatAerostatLimit(remainingCapacity) }
      )}`;
    }
    if (structure.hasCollisionAvoidance?.()) {
      const overCap = Math.max(0, (structure.count || 0) - (baseBuildLimit || 0));
      const nextSurcharge =
        structure.getCollisionAvoidanceResearchSurcharge?.(1) || 0;
      limitTitle +=
        `\n${getAerostatText(
          'ui.buildings.aerostat.collisionAvoidanceIntro',
          'Collision avoidance allows building above this base cap for extra research cost and maintenance.'
        )}`;
      limitTitle +=
        `\n${getAerostatText(
          'ui.buildings.aerostat.collisionAvoidanceMaintenance',
          'This extra research maintenance ignores maintenance multipliers.'
        )}`;
      if (overCap > 0) {
        limitTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.aboveBaseCap',
          'Aerostats above base cap: {value}.',
          { value: formatNumber(overCap, false, 2) }
        )}`;
      }
      limitTitle += `\n${getAerostatText(
        'ui.buildings.aerostat.currentSurcharge',
        'Current surcharge per new aerostat: {value} research.',
        { value: formatAerostatResearchCost(nextSurcharge) }
      )}`;
      if (researchLimit !== null) {
        limitTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.researchMaximumAerostats',
          'Research self-funding cap: {value}.',
          { value: formatAerostatLimit(researchLimit) }
        )}`;
      }
      if (Number.isFinite(researchOutputPerAerostat)) {
        limitTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.researchOutputPerAerostat',
          'Per-aerostat research output at 100% productivity: {value}.',
          { value: formatAerostatResearchCost(researchOutputPerAerostat) }
        )}`;
      }
      if (Number.isFinite(nextResearchMaintenance)) {
        limitTitle += `\n${getAerostatText(
          'ui.buildings.aerostat.nextResearchMaintenancePerAerostat',
          'Per-aerostat research maintenance for the next aerostat: {value}.',
          { value: formatAerostatResearchCost(nextResearchMaintenance) }
        )}`;
      }
    }
    setTooltipText(ui.limitTooltip, limitTitle, ui, 'limitTooltipText');
  }

  if (ui.capacityValue) {
    ui.capacityValue.textContent = `${androidCapacityShare}/${AEROSTAT_TOTAL_CAPACITY}`;
  }

  if (ui.capacityDecreaseButton) {
    ui.capacityDecreaseButton.disabled = androidCapacityShare <= 0;
  }

  if (ui.capacityIncreaseButton) {
    ui.capacityIncreaseButton.disabled =
      androidCapacityShare >= AEROSTAT_TOTAL_CAPACITY;
  }

  if (ui.capacityInfo) {
    let capacityTitle = AEROSTAT_ANDROID_SPACE_TOOLTIP;
    capacityTitle += `\n${getAerostatText(
      'ui.buildings.aerostat.capacityBreakdown',
      'Each active aerostat currently provides {colonists} colonist housing and {androids} android housing before storage multipliers.',
      {
        colonists: formatNumber(colonistCapacityShare, false, 0),
        androids: formatNumber(androidCapacityShare, false, 0)
      }
    )}`;
    setTooltipText(ui.capacityTooltip, capacityTitle, ui, 'capacityTooltipText');
  }
}

Aerostat.getAerostatLiftContext = getAerostatLiftContext;
Aerostat.attachBuoyancySection = attachAerostatBuoyancySection;
Aerostat.updateBuoyancySection = updateAerostatBuoyancySection;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Aerostat,
    getAerostatMaintenanceMitigation,
    getFactoryTemperatureMaintenancePenaltyReduction,
    isBuildingEligibleForFactoryMitigation,
    getAerostatLiftContext,
    attachAerostatBuoyancySection,
    updateAerostatBuoyancySection
  };
} else {
  globalThis.Aerostat = Aerostat;
  globalThis.getAerostatMaintenanceMitigation =
    getAerostatMaintenanceMitigation;
  globalThis.getFactoryTemperatureMaintenancePenaltyReduction =
    getFactoryTemperatureMaintenancePenaltyReduction;
  globalThis.isBuildingEligibleForFactoryMitigation =
    isBuildingEligibleForFactoryMitigation;
  globalThis.getAerostatLiftContext = getAerostatLiftContext;
  globalThis.attachAerostatBuoyancySection = attachAerostatBuoyancySection;
  globalThis.updateAerostatBuoyancySection = updateAerostatBuoyancySection;
}
