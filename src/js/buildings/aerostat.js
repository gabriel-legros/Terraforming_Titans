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
const AEROSTAT_BUOYANCY_NOTES_FALLBACK =
  'Aerostats are immune to the pressure and temperature penalties, but require additional components, electronics and lift.  Aerostats will form small communities, allowing the use of factories.  Colony researches that normally unlock new colony types will also improve aerostats.  Aerostats need at least 50 kPa of ambient pressure to stay buoyant.  When lift fails, active aerostats can land as Research Outposts if the option is enabled and sufficient land remains.';
const AEROSTAT_LAND_LIMIT_TOOLTIP_FALLBACK =
  'At most 25% of the planet\'s starting land can host aerostat colonies to minimize collision risk.';
const AEROSTAT_TEMPERATURE_TOOLTIP_INTRO_FALLBACK =
  'Aerostats reduce temperature maintenance penalties for staffed factories (excluding ore mines) using their colonist capacity.  Some buildings have an aerostat support value; each active aerostat covers that many structures before penalties apply.';

function localizeAerostatText(key, vars, fallback) {
  if (typeof t !== 'function') {
    return fallback || key;
  }
  const resolved = t(key, vars);
  if (resolved === key) {
    return fallback || key;
  }
  return resolved;
}

function getAerostatBuoyancyNotes() {
  return localizeAerostatText(
    'buildingsTab.modules.aerostat.buoyancyNotes',
    null,
    AEROSTAT_BUOYANCY_NOTES_FALLBACK
  );
}

function getAerostatLandLimitTooltip() {
  return localizeAerostatText(
    'buildingsTab.modules.aerostat.landLimitTooltip',
    null,
    AEROSTAT_LAND_LIMIT_TOOLTIP_FALLBACK
  );
}

function getAerostatTemperatureTooltipIntro() {
  return localizeAerostatText(
    'buildingsTab.modules.aerostat.temperatureTooltipIntro',
    null,
    AEROSTAT_TEMPERATURE_TOOLTIP_INTRO_FALLBACK
  );
}

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
    this.buoyancyNotes = getAerostatBuoyancyNotes();
    this.landAsResearchOutpost = true;
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

    return Math.floor(initialLand * AEROSTAT_MAX_LAND_SHARE);
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
    const pressure = this.getCurrentSurfacePressure();
    if (this.isLiftBelowThreshold(lift, pressure)) {
      return false;
    }

    const allowed = Math.min(buildCount, remaining);
    if (allowed <= 0 || typeof BaseColony.prototype.build !== 'function') {
      return false;
    }

    return super.build(allowed, activate);
  }

  maxBuildable(reservePercent = 0, additionalReserves = null) {
    const remaining = this._getRemainingBuildCapacity();
    if (remaining <= 0) {
      return 0;
    }

    if (this.isLiftBelowThreshold(undefined, this.getCurrentSurfacePressure())) {
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

  getBuoyancySummary() {
    this.buoyancyNotes = getAerostatBuoyancyNotes();
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
        ? localizeAerostatText(
          'buildingsTab.modules.aerostat.summary.pressureBelowCurrent',
          {
            currentPressure: formatNumber(pressure, false, 1),
            minPressure: formatNumber(minPressure, false, 0)
          },
          `▲ Current atmospheric pressure is ${formatNumber(pressure, false, 1)} kPa, below the ${formatNumber(minPressure, false, 0)} kPa minimum needed for aerostat buoyancy. ▲`
        )
        : localizeAerostatText(
          'buildingsTab.modules.aerostat.summary.pressureBelow',
          { minPressure: formatNumber(minPressure, false, 0) },
          `▲ Atmospheric pressure is below the ${formatNumber(minPressure, false, 0)} kPa minimum needed for aerostat buoyancy. ▲`
        );
    } else if (liftBelow) {
      warning = localizeAerostatText(
        'buildingsTab.modules.aerostat.summary.liftBelow',
        null,
        '▲ Current lift is below the minimum operational requirement, preventing aerostat activation and construction. ▲'
      );
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
      landAsResearchOutpost: this.landAsResearchOutpost
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

    const molecularWeight = globalThis.calculateMolecularWeight?.(atmosphere);
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
      text.textContent = localizeAerostatText(
        'buildingsTab.modules.aerostat.landAsResearchOutpost',
        null,
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
    const container = cache.researchOutpostContainer;
    const text = container ? container.querySelector('span') : null;
    if (text) {
      text.textContent = localizeAerostatText(
        'buildingsTab.modules.aerostat.landAsResearchOutpost',
        null,
        'Land as Research Outpost'
      );
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
  const baseCapacity = aerostat?.storage?.colony?.colonists ?? 0;
  const storageMultiplierValue = aerostat?.getEffectiveStorageMultiplier?.();
  const storageMultiplier = Number.isFinite(storageMultiplierValue)
    ? storageMultiplierValue
    : 1;
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

  if (totalWorkerRequirement <= 0) {
    result.workerShare = 1;
    return result;
  }

  if (!aerostat || baseCapacity <= 0 || activeAerostats <= 0) {
    result.workerShare = 0;
    return result;
  }

  const aerostatCapacity = activeAerostats * baseCapacity * storageMultiplier;
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

  const externalMolWeight = globalThis.calculateMolecularWeight?.(atmosphere);
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

function attachAerostatBuoyancySection(container, structure) {
  if (!(structure instanceof Aerostat)) {
    return;
  }

  const summaryText =
    structure.getBuoyancySummary?.() ?? localizeAerostatText(
      'buildingsTab.modules.aerostat.summary.pending',
      null,
      'Buoyancy telemetry pending.'
    );
  const existing = structure.buoyancyUI ?? {};
  const needsRebuild =
    !existing.container ||
    !existing.container.isConnected ||
    !existing.liftValue ||
    !existing.mitigationValue ||
    !existing.limitValue ||
    !existing.limitInfo;

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
    title.textContent = localizeAerostatText(
      'buildingsTab.modules.aerostat.title',
      null,
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
    liftLabel.textContent = localizeAerostatText(
      'buildingsTab.modules.aerostat.currentLift',
      null,
      'Current Lift:'
    );
    liftRow.appendChild(liftLabel);

    const liftValue = document.createElement('span');
    liftValue.classList.add('colony-buoyancy-lift-value');
    liftValue.textContent = localizeAerostatText('buildingsTab.modules.aerostat.notAvailable', null, 'N/A');
    liftRow.appendChild(liftValue);

    const liftInfo = document.createElement('span');
    liftInfo.classList.add('info-tooltip-icon');
    liftInfo.innerHTML = '&#9432;';
    const liftTooltip = attachDynamicInfoTooltip(
      liftInfo,
      ''
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
    mitigationLabel.textContent = localizeAerostatText(
      'buildingsTab.modules.aerostat.temperatureMitigation',
      null,
      'Temperature Maintenance Mitigation:'
    );
    mitigationRow.appendChild(mitigationLabel);

    const mitigationValue = document.createElement('span');
    mitigationValue.classList.add(
      'colony-buoyancy-lift-value',
      'colony-buoyancy-mitigation-value'
    );
    mitigationValue.textContent = localizeAerostatText('buildingsTab.modules.aerostat.notAvailable', null, 'N/A');
    mitigationRow.appendChild(mitigationValue);

    const mitigationInfo = document.createElement('span');
    mitigationInfo.classList.add('info-tooltip-icon');
    mitigationInfo.innerHTML = '&#9432;';
    const mitigationTooltip = attachDynamicInfoTooltip(
      mitigationInfo,
      ''
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
    limitLabel.textContent = localizeAerostatText(
      'buildingsTab.modules.aerostat.maximumAerostats',
      null,
      'Maximum Aerostats:'
    );
    limitRow.appendChild(limitLabel);

    const limitValue = document.createElement('span');
    limitValue.classList.add(
      'colony-buoyancy-lift-value',
      'colony-buoyancy-limit-value'
    );
    limitValue.textContent = localizeAerostatText('buildingsTab.modules.aerostat.notAvailable', null, 'N/A');
    limitRow.appendChild(limitValue);

    const limitInfo = document.createElement('span');
    limitInfo.classList.add('info-tooltip-icon');
    limitInfo.innerHTML = '&#9432;';
    const limitTooltip = attachDynamicInfoTooltip(
      limitInfo,
      ''
    );
    limitRow.appendChild(limitInfo);

    body.appendChild(limitRow);

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
    structure.getBuoyancySummary?.() ?? localizeAerostatText(
      'buildingsTab.modules.aerostat.summary.pending',
      null,
      'Buoyancy telemetry pending.'
    );
  ui.text.innerHTML = (summaryText ?? '').replace(/\n/g, '<br>');

  const title = ui.header ? ui.header.querySelector('.card-title') : null;
  if (title) {
    title.textContent = localizeAerostatText(
      'buildingsTab.modules.aerostat.title',
      null,
      'Aerostats Details'
    );
  }
  const labels = ui.container ? ui.container.querySelectorAll('.colony-buoyancy-lift-label') : [];
  if (labels && labels.length >= 3) {
    labels[0].textContent = localizeAerostatText(
      'buildingsTab.modules.aerostat.currentLift',
      null,
      'Current Lift:'
    );
    labels[1].textContent = localizeAerostatText(
      'buildingsTab.modules.aerostat.temperatureMitigation',
      null,
      'Temperature Maintenance Mitigation:'
    );
    labels[2].textContent = localizeAerostatText(
      'buildingsTab.modules.aerostat.maximumAerostats',
      null,
      'Maximum Aerostats:'
    );
  }

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

  const buildLimitRaw =
    structure.getBuildLimit?.() ?? structure._getBuildLimit?.() ?? null;
  const buildLimit = Number.isFinite(buildLimitRaw)
    ? Math.max(0, Math.floor(buildLimitRaw))
    : null;

  const currentAerostats = Number.isFinite(structure?.count)
    ? Math.max(0, Math.floor(structure.count))
    : null;
  const remainingCapacity =
    buildLimit !== null && currentAerostats !== null
      ? Math.max(0, buildLimit - currentAerostats)
      : null;

  const mitigationDetails = Aerostat.getAerostatMaintenanceMitigation?.() ?? null;
  const mitigationShareRaw = mitigationDetails?.workerShare ?? null;
  const mitigationShare = Number.isFinite(mitigationShareRaw)
    ? Math.max(0, Math.min(1, mitigationShareRaw))
    : null;
  const aerostatCount = Number.isFinite(mitigationDetails?.aerostatCount)
    ? Math.max(0, mitigationDetails.aerostatCount)
    : 0;
  const buildingCoverageList = Array.isArray(
    mitigationDetails?.buildingCoverage?.list
  )
    ? mitigationDetails.buildingCoverage.list
    : [];

  if (ui.liftValue) {
    ui.liftValue.textContent =
      liftAvailable === null
        ? localizeAerostatText('buildingsTab.modules.aerostat.notAvailable', null, 'N/A')
        : `${liftAvailable >= 0 ? '+' : ''}${formatNumber(
            liftAvailable,
            false,
            3
          )} kg/m³`;
  }

  if (ui.liftInfo) {
    let title =
      localizeAerostatText(
        'buildingsTab.modules.aerostat.tooltip.liftIntro',
        null,
        'Specific lift at 1 atm and 21°C using current atmospheric composition compared to breathable air.'
      );
    if (Number.isFinite(molecularWeight) && molecularWeight > 0) {
      title += '\n' + localizeAerostatText(
        'buildingsTab.modules.aerostat.tooltip.externalMolWeight',
        { value: formatNumber(molecularWeight, false, 2) },
        `External mean molecular weight: ${formatNumber(molecularWeight, false, 2)} g/mol.`
      );
    }
    if (liftAvailable !== null) {
      title += '\n' + localizeAerostatText(
        'buildingsTab.modules.aerostat.tooltip.currentLift',
        {
          value: `${liftAvailable >= 0 ? '+' : ''}${formatNumber(liftAvailable, false, 3)}`
        },
        `Current lift: ${liftAvailable >= 0 ? '+' : ''}${formatNumber(liftAvailable, false, 3)} kg/m³.`
      );
    }
    title += '\n' + localizeAerostatText(
      'buildingsTab.modules.aerostat.tooltip.shutdownThreshold',
      { value: formatNumber(AEROSTAT_MINIMUM_OPERATIONAL_LIFT, false, 3) },
      `Aerostat shutdown threshold: ${formatNumber(AEROSTAT_MINIMUM_OPERATIONAL_LIFT, false, 3)} kg/m³.`
    );
    title += '\n' + localizeAerostatText(
      'buildingsTab.modules.aerostat.tooltip.minPressure',
      { value: formatNumber(minPressure, false, 0) },
      `Aerostats require at least ${formatNumber(minPressure, false, 0)} kPa of surface pressure to remain buoyant.`
    );
    setTooltipText(ui.liftTooltip, title, ui, 'liftTooltipText');
  }

  if (ui.mitigationValue) {
    ui.mitigationValue.textContent =
      mitigationShare === null
        ? localizeAerostatText('buildingsTab.modules.aerostat.notAvailable', null, 'N/A')
        : `${formatNumber(mitigationShare * 100, false, 1)}%`;
  }

  if (ui.mitigationInfo) {
    let mitigationTitle = getAerostatTemperatureTooltipIntro();
    if (!mitigationDetails) {
      mitigationTitle += '\n' + localizeAerostatText(
        'buildingsTab.modules.aerostat.tooltip.mitigationDataUnavailable',
        null,
        'Mitigation data unavailable.'
      );
    } else {
      mitigationTitle += '\n' + localizeAerostatText(
        'buildingsTab.modules.aerostat.tooltip.activeAerostats',
        { value: formatNumber(aerostatCount, false, 2) },
        `Active aerostats: ${formatNumber(aerostatCount, false, 2)}.`
      );

      if (mitigationShare === null) {
        mitigationTitle += '\n' + localizeAerostatText(
          'buildingsTab.modules.aerostat.tooltip.factoryMitigationDataUnavailable',
          null,
          'Factory mitigation data unavailable.'
        );
      } else {
        mitigationTitle += '\n' + localizeAerostatText(
          'buildingsTab.modules.aerostat.tooltip.factoryMitigationApplied',
          { value: formatNumber(mitigationShare * 100, false, 2) },
          `Factory mitigation applied: ${formatNumber(mitigationShare * 100, false, 2)}% of the penalty is negated.`
        );
        mitigationTitle +=
          mitigationShare < 1
            ? '\n' + localizeAerostatText(
              'buildingsTab.modules.aerostat.tooltip.mitigationLimited',
              null,
              'Mitigation is limited by available aerostat colonist capacity compared to staffed worker requirements.'
            )
            : '\n' + localizeAerostatText(
              'buildingsTab.modules.aerostat.tooltip.mitigationFull',
              null,
              'All staffed buildings currently avoid the temperature maintenance penalty.'
            );
      }

      if (buildingCoverageList.length > 0) {
        mitigationTitle += '\n' + localizeAerostatText(
          'buildingsTab.modules.aerostat.tooltip.supportedBuildings',
          null,
          'Aerostat-supported buildings:'
        );
        buildingCoverageList.forEach(entry => {
          const activeText = formatNumber(entry.activeCount, false, 2);
          const supportedText = formatNumber(entry.supported, false, 2);
          const capacityText = formatNumber(entry.maxSupported, false, 2);
          const perAerostatText = formatNumber(entry.perAerostat, false, 2);
          mitigationTitle += '\n' + localizeAerostatText(
            'buildingsTab.modules.aerostat.tooltip.supportedBuildingEntry',
            {
              name: entry.name,
              supported: supportedText,
              active: activeText,
              capacity: capacityText,
              perAerostat: perAerostatText
            },
            `• ${entry.name}: ${supportedText} of ${activeText} active covered (can support ${capacityText}; ${perAerostatText} per aerostat).`
          );
        });
      } else {
        mitigationTitle += '\n' + localizeAerostatText(
          'buildingsTab.modules.aerostat.tooltip.noSupportedBuildings',
          null,
          'No buildings currently list an Aerostat Support value.'
        );
      }
    }
    setTooltipText(ui.mitigationTooltip, mitigationTitle, ui, 'mitigationTooltipText');
  }

  if (ui.limitValue) {
    ui.limitValue.textContent =
      buildLimit === null
        ? localizeAerostatText('buildingsTab.modules.aerostat.notAvailable', null, 'N/A')
        : formatNumber(buildLimit, false, 2);
  }

  if (ui.limitInfo) {
    let limitTitle = getAerostatLandLimitTooltip();
    if (remainingCapacity !== null) {
      limitTitle += '\n' + localizeAerostatText(
        'buildingsTab.modules.aerostat.tooltip.remainingCapacity',
        { value: formatNumber(remainingCapacity, false, 2) },
        `Remaining aerostat capacity: ${formatNumber(remainingCapacity, false, 2)}.`
      );
    }
    setTooltipText(ui.limitTooltip, limitTitle, ui, 'limitTooltipText');
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
