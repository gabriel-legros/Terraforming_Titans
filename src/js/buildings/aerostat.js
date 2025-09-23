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
const AEROSTAT_MAX_LAND_SHARE = 0.2;
const AEROSTAT_BUOYANCY_NOTES =
  'Aerostats are immune to the pressure and temperature penalties, but require additional components, electronics and lift.  Aerostats will form small communities, allowing the use of factories.';
const AEROSTAT_LAND_LIMIT_TOOLTIP =
  'At most 20% of the planet\'s starting land can host aerostat colonies to minimize collision risk.';

globalThis.AEROSTAT_STANDARD_PRESSURE_PA ??= AEROSTAT_STANDARD_PRESSURE_PA;
globalThis.AEROSTAT_STANDARD_TEMPERATURE_K ??= AEROSTAT_STANDARD_TEMPERATURE_K;
globalThis.AEROSTAT_INTERNAL_AIR_MOL_WEIGHT ??= AEROSTAT_INTERNAL_AIR_MOL_WEIGHT;
globalThis.AEROSTAT_MINIMUM_OPERATIONAL_LIFT ??=
  AEROSTAT_MINIMUM_OPERATIONAL_LIFT;

class Aerostat extends BaseColony {
  constructor(config, colonyName) {
    super(config, colonyName);
    this._liftDisableAccumulator = 0;
    this._liftBelowThreshold = false;
    this.buoyancyNotes = AEROSTAT_BUOYANCY_NOTES;
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
    return AEROSTAT_MINIMUM_OPERATIONAL_LIFT;
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
    structure.getBuoyancySummary?.() ?? 'Buoyancy telemetry pending.';
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
    title.textContent = 'Aerostats Details';

    header.appendChild(arrow);
    header.appendChild(title);

    const body = document.createElement('div');
    body.classList.add('card-body');

    const text = document.createElement('div');
    text.classList.add('colony-buoyancy-text');
    text.textContent = summaryText;
    body.appendChild(text);

    const liftRow = document.createElement('div');
    liftRow.classList.add('colony-buoyancy-lift-row');

    const liftLabel = document.createElement('span');
    liftLabel.classList.add('colony-buoyancy-lift-label');
    liftLabel.textContent = 'Current Lift:';
    liftRow.appendChild(liftLabel);

    const liftValue = document.createElement('span');
    liftValue.classList.add('colony-buoyancy-lift-value');
    liftValue.textContent = 'N/A';
    liftRow.appendChild(liftValue);

    const liftInfo = document.createElement('span');
    liftInfo.classList.add('info-tooltip-icon');
    liftInfo.innerHTML = '&#9432;';
    liftInfo.title =
      'Specific lift at 1 atm and 21°C using current atmospheric composition compared to breathable air.';
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
    mitigationLabel.textContent = 'Temperature Maintenance Mitigation:';
    mitigationRow.appendChild(mitigationLabel);

    const mitigationValue = document.createElement('span');
    mitigationValue.classList.add(
      'colony-buoyancy-lift-value',
      'colony-buoyancy-mitigation-value'
    );
    mitigationValue.textContent = 'N/A';
    mitigationRow.appendChild(mitigationValue);

    const mitigationInfo = document.createElement('span');
    mitigationInfo.classList.add('info-tooltip-icon');
    mitigationInfo.innerHTML = '&#9432;';
    mitigationInfo.title =
      'Aerostat colonist capacity reduces the temperature maintenance penalty for staffed buildings.  Only applies to buildings with a worker requirement.  Excludes ore mines.  The reduction is equal to the total workers demand from factories divided by total colonist capacity from aerostats.';
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
    limitLabel.textContent = 'Maximum Aerostats:';
    limitRow.appendChild(limitLabel);

    const limitValue = document.createElement('span');
    limitValue.classList.add(
      'colony-buoyancy-lift-value',
      'colony-buoyancy-limit-value'
    );
    limitValue.textContent = 'N/A';
    limitRow.appendChild(limitValue);

    const limitInfo = document.createElement('span');
    limitInfo.classList.add('info-tooltip-icon');
    limitInfo.innerHTML = '&#9432;';
    limitInfo.title = AEROSTAT_LAND_LIMIT_TOOLTIP;
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
      mitigationValue,
      mitigationInfo,
      limitValue,
      limitInfo,
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
    structure.getBuoyancySummary?.() ?? 'Buoyancy telemetry pending.';
  ui.text.textContent = summaryText;

  const expanded = ui.expanded !== false;
  ui.container.classList.toggle('collapsed', !expanded);
  ui.arrow.textContent = expanded ? '\u25BC' : '\u25B6';
  if (ui.body) {
    ui.body.style.display = expanded ? '' : 'none';
  }

  const { lift, molecularWeight } = getAerostatLiftContext();

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

  const mitigationShareRaw =
    Aerostat.getFactoryTemperatureMaintenancePenaltyReduction?.() ?? null;
  const mitigationShare = Number.isFinite(mitigationShareRaw)
    ? Math.max(0, Math.min(1, mitigationShareRaw))
    : null;

  if (ui.liftValue) {
    ui.liftValue.textContent =
      lift === null
        ? 'N/A'
        : `${lift >= 0 ? '+' : ''}${formatNumber(lift, false, 3)} kg/m³`;
  }

  if (ui.liftInfo) {
    let title =
      'Specific lift at 1 atm and 21°C using current atmospheric composition compared to breathable air.';
    if (Number.isFinite(molecularWeight) && molecularWeight > 0) {
      title += `\nExternal mean molecular weight: ${formatNumber(
        molecularWeight,
        false,
        2
      )} g/mol.`;
    }
    if (lift !== null) {
      title += `\nCurrent lift: ${lift >= 0 ? '+' : ''}${formatNumber(
        lift,
        false,
        3
      )} kg/m³.`;
    }
    title += `\nAerostat shutdown threshold: ${formatNumber(
      AEROSTAT_MINIMUM_OPERATIONAL_LIFT,
      false,
      3
    )} kg/m³.`;
    ui.liftInfo.title = title;
  }

  if (ui.mitigationValue) {
    ui.mitigationValue.textContent =
      mitigationShare === null
        ? 'N/A'
        : `${formatNumber(mitigationShare * 100, false, 1)}%`;
  }

  if (ui.mitigationInfo) {
    let mitigationTitle =
      'Aerostat colonist capacity reduces the temperature maintenance penalty for staffed buildings.  Only applies to buildings with a worker requirement.  Excludes ore mines.  The reduction is equal to the total workers demand from factories divided by total colonist capacity from aerostats.';
    if (mitigationShare === null) {
      mitigationTitle += '\nMitigation data unavailable.';
    } else {
      mitigationTitle += `\nMitigation applied: ${formatNumber(
        mitigationShare * 100,
        false,
        2
      )}% of the penalty is negated.`;
      mitigationTitle +=
        mitigationShare < 1
          ? '\nMitigation is limited by available aerostat colonist capacity compared to staffed worker requirements.'
          : '\nAll staffed buildings currently avoid the temperature maintenance penalty.';
    }
    ui.mitigationInfo.title = mitigationTitle;
  }

  if (ui.limitValue) {
    ui.limitValue.textContent =
      buildLimit === null ? 'N/A' : formatNumber(buildLimit, false, 2);
  }

  if (ui.limitInfo) {
    let limitTitle = AEROSTAT_LAND_LIMIT_TOOLTIP;
    if (remainingCapacity !== null) {
      limitTitle += `\nRemaining aerostat capacity: ${formatNumber(
        remainingCapacity,
        false,
        2
      )}.`;
    }
    ui.limitInfo.title = limitTitle;
  }
}

Aerostat.getAerostatLiftContext = getAerostatLiftContext;
Aerostat.attachBuoyancySection = attachAerostatBuoyancySection;
Aerostat.updateBuoyancySection = updateAerostatBuoyancySection;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Aerostat,
    getFactoryTemperatureMaintenancePenaltyReduction,
    isBuildingEligibleForFactoryMitigation,
    getAerostatLiftContext,
    attachAerostatBuoyancySection,
    updateAerostatBuoyancySection
  };
} else {
  globalThis.Aerostat = Aerostat;
  globalThis.getFactoryTemperatureMaintenancePenaltyReduction =
    getFactoryTemperatureMaintenancePenaltyReduction;
  globalThis.isBuildingEligibleForFactoryMitigation =
    isBuildingEligibleForFactoryMitigation;
  globalThis.getAerostatLiftContext = getAerostatLiftContext;
  globalThis.attachAerostatBuoyancySection = attachAerostatBuoyancySection;
  globalThis.updateAerostatBuoyancySection = updateAerostatBuoyancySection;
}
