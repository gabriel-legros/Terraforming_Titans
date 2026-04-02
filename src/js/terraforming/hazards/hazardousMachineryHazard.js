let calculateAverageCoverageHelper;

try {
  ({ calculateAverageCoverage: calculateAverageCoverageHelper } = require('../terraforming-utils.js'));
} catch (error) {
  try {
    calculateAverageCoverageHelper = calculateAverageCoverage;
  } catch (innerError) {
    calculateAverageCoverageHelper = null;
  }
}

function getHazardousMachineryText(path, fallback, vars) {
  try {
    return t(`ui.terraforming.hazardsUi.hazardousMachinery.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function isPlainObject(value) {
  return value !== null && value.constructor === Object;
}

function withHazardSeverity(entry, defaultSeverity = 0) {
  if (!isPlainObject(entry)) {
    return { value: entry, severity: defaultSeverity };
  }

  const result = { ...entry };
  if (!Object.prototype.hasOwnProperty.call(result, 'severity')) {
    result.severity = defaultSeverity;
  }
  return result;
}

function clampRatio(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function normalizeHazardousMachineryParameters(parameters = {}) {
  const source = isPlainObject(parameters) ? parameters : {};
  const penalties = isPlainObject(source.penalties) ? source.penalties : {};
  return {
    initialCoverage: clampRatio(source.initialCoverage ?? 1),
    maxCoverageBase: clampRatio(source.maxCoverageBase ?? 1),
    waterCoveragePenalty: Math.max(0, source.waterCoveragePenalty ?? 0.5),
    baseGrowth: Math.max(0, source.baseGrowth ?? 0),
    invasivenessDecay: withHazardSeverity(source.invasivenessDecay ?? { value: 30, severity: 0 }),
    oxygenDecayCoefficient: Math.max(0, source.oxygenDecayCoefficient ?? 1e-24),
    temperatureDecayThresholdC: Number.isFinite(source.temperatureDecayThresholdC) ? source.temperatureDecayThresholdC : 500,
    temperatureDecayCoefficient: Math.max(0, source.temperatureDecayCoefficient ?? 0),
    crusaderRemovalPerSecond: Math.max(0, source.crusaderRemovalPerSecond ?? 0.5),
    electronicsToAndroidCost: Math.max(1, source.electronicsToAndroidCost ?? 1000),
    penalties: {
      availableAndroidDecayRate: Math.max(0, penalties.availableAndroidDecayRate ?? 0.05),
      nanoColonyGrowthMultiplier: Math.max(0, penalties.nanoColonyGrowthMultiplier ?? 0),
      researchMultiplier: Math.max(0, penalties.researchMultiplier ?? 0.1),
      buildCostMultiplier: Math.max(1, penalties.buildCostMultiplier ?? 1),
      electronicsMaintenanceMultiplier: Math.max(1, penalties.electronicsMaintenanceMultiplier ?? 100),
      shipWorkersPerAssignedShip: Math.max(0, penalties.shipWorkersPerAssignedShip ?? 5)
    }
  };
}

class HazardousMachineryHazard {
  constructor(manager) {
    this.manager = manager;
    this.hackBatchSize = 1;
  }

  normalize(parameters) {
    return normalizeHazardousMachineryParameters(parameters);
  }

  getResource() {
    try {
      return resources?.surface?.hazardousMachinery || null;
    } catch (error) {
      return null;
    }
  }

  hasConfiguredHazard(parameters) {
    return isPlainObject(parameters);
  }

  getTerraforming() {
    try {
      return terraforming;
    } catch (error) {
      return null;
    }
  }

  getInitialLand(terraforming) {
    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }
    return this.manager.resolveInitialLandForHazards(terraforming, resourcesState?.surface?.land);
  }

  getWaterCoverage(terraforming) {
    if (!terraforming) {
      return 0;
    }
    if (calculateAverageCoverageHelper) {
      return clampRatio(calculateAverageCoverageHelper(terraforming, 'liquidWater'));
    }

    const cache = terraforming.zonalCoverageCache || {};
    const zones = terraforming.zoneKeys || ['tropical', 'temperate', 'polar'];
    let total = 0;
    zones.forEach((zone) => {
      const weight = terraforming.getZoneWeight ? terraforming.getZoneWeight(zone) : 0;
      total += (cache[zone]?.liquidWater || 0) * weight;
    });
    return clampRatio(total);
  }

  getMaxCoverageShare(terraforming, parameters) {
    const base = clampRatio(parameters?.maxCoverageBase ?? 1);
    const waterCoverage = this.getWaterCoverage(terraforming);
    return clampRatio(base - waterCoverage * (parameters?.waterCoveragePenalty ?? 0.5));
  }

  getFullCoverageAmount(terraforming) {
    return this.getInitialLand(terraforming);
  }

  getMaxAmount(terraforming, parameters) {
    return this.getFullCoverageAmount(terraforming) * this.getMaxCoverageShare(terraforming, parameters);
  }

  getInitialAmount(terraforming, parameters) {
    const startShare = Math.min(
      clampRatio(parameters?.initialCoverage ?? 1),
      this.getMaxCoverageShare(terraforming, parameters)
    );
    return this.getFullCoverageAmount(terraforming) * startShare;
  }

  hasHazard() {
    const resource = this.getResource();
    return (resource?.value || 0) > 0;
  }

  isCleared() {
    return !this.hasHazard();
  }

  ensureCrusaderPresence() {
    let crusaders = null;
    try {
      crusaders = resources?.special?.crusaders || null;
    } catch (error) {
      crusaders = null;
    }
    if (!crusaders || !crusaders.unlocked || !this.hasHazard()) {
      return;
    }
    if ((crusaders.value || 0) < 10) {
      crusaders.value = 10;
    }
  }

  getHazardStrength(terraforming, parameters, currentAmount = null) {
    const amount = currentAmount ?? (this.getResource()?.value || 0);
    const fullCoverageAmount = this.getFullCoverageAmount(terraforming);
    if (!(amount > 0) || !(fullCoverageAmount > 0)) {
      return 0;
    }
    return clampRatio(amount / fullCoverageAmount);
  }

  syncResource(terraforming, parameters, options = {}) {
    if (!this.hasConfiguredHazard(parameters)) {
      this.manager.setHazardLandReservationShare('hazardousMachinery', 0);
      return null;
    }

    const resource = this.getResource();
    if (!resource) {
      return null;
    }

    let unlock = null;
    try {
      unlock = unlockResource;
    } catch (error) {
      unlock = null;
    }

    resource.unlocked = true;
    if (unlock && unlock.call) {
      unlock(resource);
    }

    resource.initialValue = this.getInitialAmount(terraforming, parameters);

    if (!options.unlockOnly && !options.preserveValue && !(resource.value > 0)) {
      resource.value = resource.initialValue;
    }

    const maxAmount = this.getMaxAmount(terraforming, parameters);
    if (resource.value > maxAmount) {
      resource.value = maxAmount;
    }

    const initialLand = this.getInitialLand(terraforming);
    const effectiveAmount = Math.min(resource.value || 0, maxAmount);
    const share = initialLand > 0 ? clampRatio(effectiveAmount / initialLand) : 0;
    this.manager.setHazardLandReservationShare('hazardousMachinery', share);
    return {
      resource,
      maxAmount,
      initialLand,
      currentAmount: resource.value || 0
    };
  }

  initialize(terraforming, parameters, options = {}) {
    if (!this.hasConfiguredHazard(parameters)) {
      this.manager.setHazardLandReservationShare('hazardousMachinery', 0);
      return;
    }
    this.syncResource(terraforming, parameters, options);
  }

  clearEffectsOnTravel() {
    this.manager.setHazardLandReservationShare('hazardousMachinery', 0);
  }

  getCrusaderDecayPerSecond(parameters) {
    let crusaders = null;
    try {
      crusaders = resources?.special?.crusaders || null;
    } catch (error) {
      crusaders = null;
    }
    if (!crusaders || !crusaders.unlocked) {
      return 0;
    }
    return Math.max(0, crusaders.value || 0) * Math.max(0, parameters?.crusaderRemovalPerSecond || 0);
  }

  getAvailableAndroids() {
    try {
      if (populationModule?.getAndroidWorkerState) {
        return Math.max(0, populationModule.getAndroidWorkerState(false).availableAndroids || 0);
      }
    } catch (error) {
      // fall through
    }

    try {
      const androids = Math.min(resources.colony.androids.value || 0, resources.colony.androids.cap || 0);
      const assigned = projectManager?.getAssignedAndroids ? projectManager.getAssignedAndroids() : 0;
      return Math.max(0, androids - assigned);
    } catch (error) {
      return 0;
    }
  }

  getLifeBiomassDensity(terraforming) {
    const surfaceArea = terraforming?.celestialParameters?.surfaceArea;
    if (!(surfaceArea > 0)) {
      return 0;
    }

    let biomass = 0;
    try {
      biomass = Math.max(0, resources?.surface?.biomass?.value || 0);
    } catch (error) {
      biomass = 0;
    }

    if (!(biomass > 0)) {
      return 0;
    }

    return biomass / surfaceArea;
  }

  getLifeDesignInvasiveness() {
    let designer = null;

    try {
      designer = lifeDesigner;
    } catch (error) {
      designer = null;
    }

    if (!designer || !designer.currentDesign || !designer.currentDesign.invasiveness) {
      return 0;
    }

    const value = designer.currentDesign.invasiveness.value;
    return Number.isFinite(value) ? value : 0;
  }

  getCurrentPenaltyValues(terraforming, parameters) {
    if (!this.hasConfiguredHazard(parameters)) {
      return {
        currentAmount: 0,
        maxAmount: 0,
        fullCoverageAmount: this.getFullCoverageAmount(terraforming),
        initialLand: this.getInitialLand(terraforming),
        currentCoverageShare: 0,
        maxCoverageShare: 0,
        waterCoverage: this.getWaterCoverage(terraforming),
        hazardStrength: 0,
        baseGrowthPercentPerSecond: Math.max(0, parameters?.baseGrowth ?? 0),
        totalPenaltyPercentPerSecond: 0,
        netNaturalGrowthPercentPerSecond: Math.max(0, parameters?.baseGrowth ?? 0),
        naturalGrowthRatePerSecond: 0,
        nanoColonyGrowthMultiplier: 1,
        researchMultiplier: 1,
        buildCostMultiplier: 1,
        electronicsMaintenanceMultiplier: 1,
        shipWorkersPerAssignedShip: 0,
        availableAndroids: this.getAvailableAndroids(),
        androidDecayRatePerSecond: 0,
        lifeDensity: 0,
        invasivenessValue: this.getLifeDesignInvasiveness(),
        invasivenessThreshold: Number.isFinite(parameters?.invasivenessDecay?.value) ? parameters.invasivenessDecay.value : 30,
        invasivenessDecayPercentPerSecond: 0,
        invasivenessDecayRatePerSecond: 0,
        temperatureC: 0,
        temperatureThresholdC: Number.isFinite(parameters?.temperatureDecayThresholdC) ? parameters.temperatureDecayThresholdC : 500,
        temperatureDecayPercentPerSecond: 0,
        temperatureDecayRatePerSecond: 0,
        oxygenDecayPercentPerSecond: 0,
        oxygenDecayRatePerSecond: 0,
        crusaderDecayRatePerSecond: 0
      };
    }

    const resource = this.getResource();
    const currentAmount = Math.max(0, resource?.value || 0);
    const hazardStrength = this.getHazardStrength(terraforming, parameters, currentAmount);
    const maxAmount = this.getMaxAmount(terraforming, parameters);
    const baseGrowthPercentPerSecond = Math.max(0, parameters?.baseGrowth ?? 0);
    const penalties = parameters?.penalties || {};
    const nanoColonyGrowthMultiplier = 1 - hazardStrength * (1 - Math.max(0, penalties.nanoColonyGrowthMultiplier || 0));
    const researchMultiplier = 1 - hazardStrength * (1 - Math.max(0, penalties.researchMultiplier ?? 0.1));
    const buildCostMultiplier = 1 + hazardStrength * (Math.max(1, penalties.buildCostMultiplier || 1) - 1);
    const electronicsMaintenanceMultiplier = 1 + hazardStrength * (Math.max(1, penalties.electronicsMaintenanceMultiplier || 1) - 1);
    const shipWorkersPerAssignedShip = Math.max(0, penalties.shipWorkersPerAssignedShip || 0);
    const availableAndroids = this.getAvailableAndroids();
    const androidDecayRatePerSecond = availableAndroids * Math.max(0, penalties.availableAndroidDecayRate || 0) * hazardStrength;
    const lifeDensity = this.getLifeBiomassDensity(terraforming);
    const invasivenessValue = this.getLifeDesignInvasiveness();
    const invasivenessEntry = parameters?.invasivenessDecay || {};
    const invasivenessThreshold = Number.isFinite(invasivenessEntry.value) ? invasivenessEntry.value : 30;
    const invasivenessSeverity = Number.isFinite(invasivenessEntry.severity) ? invasivenessEntry.severity : 0;
    const invasivenessDifference = Math.max(0, invasivenessValue - invasivenessThreshold);
    const invasivenessDecayPercentPerSecond = Math.max(0, lifeDensity * invasivenessDifference * invasivenessSeverity);
    const invasivenessDecayRatePerSecond = Math.min(
      currentAmount,
      currentAmount * invasivenessDecayPercentPerSecond
    );
    const temperatureK = Math.max(0, terraforming?.temperature?.value || 0);
    const temperatureC = temperatureK - 273.15;
    const temperatureThresholdC = Number.isFinite(parameters?.temperatureDecayThresholdC)
      ? parameters.temperatureDecayThresholdC
      : 500;
    const temperatureExcessC = Math.max(0, temperatureC - temperatureThresholdC);
    const rawTemperatureDecayPercentPerSecond = temperatureExcessC * Math.max(0, parameters?.temperatureDecayCoefficient || 0);
    const temperatureDecayRatePerSecond = Math.min(
      currentAmount,
      currentAmount * rawTemperatureDecayPercentPerSecond
    );
    const temperatureDecayPercentPerSecond = currentAmount > 0
      ? Math.min(1, temperatureDecayRatePerSecond / currentAmount)
      : 0;

    let oxygenResource = null;
    try {
      oxygenResource = resources?.atmospheric?.oxygen || null;
    } catch (error) {
      oxygenResource = null;
    }
    const oxygenAmount = Math.max(0, oxygenResource?.value || 0);
    const rawOxygenDecayPercentPerSecond = oxygenAmount * Math.max(0, parameters?.oxygenDecayCoefficient || 0);
    const oxygenDecayRatePerSecond = Math.min(
      currentAmount,
      oxygenAmount,
      currentAmount * rawOxygenDecayPercentPerSecond
    );
    const oxygenDecayPercentPerSecond = currentAmount > 0
      ? Math.min(1, oxygenDecayRatePerSecond / currentAmount)
      : 0;
    const totalPenaltyPercentPerSecond = invasivenessDecayPercentPerSecond
      + temperatureDecayPercentPerSecond
      + oxygenDecayPercentPerSecond;
    const netNaturalGrowthPercentPerSecond = baseGrowthPercentPerSecond - totalPenaltyPercentPerSecond;
    const naturalGrowthLogisticTerm = netNaturalGrowthPercentPerSecond > 0 && maxAmount > 0
      ? Math.max(0, 1 - currentAmount / maxAmount)
      : 1;
    const naturalGrowthRatePerSecond = currentAmount * netNaturalGrowthPercentPerSecond * naturalGrowthLogisticTerm;

    return {
      currentAmount,
      maxAmount,
      fullCoverageAmount: this.getFullCoverageAmount(terraforming),
      initialLand: this.getInitialLand(terraforming),
      currentCoverageShare: this.getFullCoverageAmount(terraforming) > 0
        ? clampRatio(currentAmount / this.getFullCoverageAmount(terraforming))
        : 0,
      maxCoverageShare: this.getMaxCoverageShare(terraforming, parameters),
      waterCoverage: this.getWaterCoverage(terraforming),
      hazardStrength,
      baseGrowthPercentPerSecond,
      totalPenaltyPercentPerSecond,
      netNaturalGrowthPercentPerSecond,
      naturalGrowthRatePerSecond,
      nanoColonyGrowthMultiplier,
      researchMultiplier,
      buildCostMultiplier,
      electronicsMaintenanceMultiplier,
      shipWorkersPerAssignedShip,
      availableAndroids,
      androidDecayRatePerSecond,
      lifeDensity,
      invasivenessValue,
      invasivenessThreshold,
      invasivenessDecayPercentPerSecond,
      invasivenessDecayRatePerSecond,
      temperatureC,
      temperatureThresholdC,
      temperatureDecayPercentPerSecond,
      temperatureDecayRatePerSecond,
      oxygenDecayPercentPerSecond,
      oxygenDecayRatePerSecond,
      crusaderDecayRatePerSecond: this.getCrusaderDecayPerSecond(parameters)
    };
  }

  getProjectWorkerAvailabilityRatio(project) {
    if (!project || !project.getHazardousMachineryWorkerRequirement || !(project.getHazardousMachineryWorkerRequirement() > 0)) {
      return 1;
    }
    try {
      return populationModule?.getWorkerAvailabilityRatio ? populationModule.getWorkerAvailabilityRatio(0) : 1;
    } catch (error) {
      return 1;
    }
  }

  getAdditionalWorkerRequirements() {
    if (!this.hasHazard()) {
      return { high: 0, normal: 0, low: 0 };
    }

    let total = 0;
    try {
      const projects = projectManager?.projects || {};
      Object.keys(projects).forEach((key) => {
        const project = projects[key];
        if (!project || project.isPermanentlyDisabled?.()) {
          return;
        }
        total += Math.max(0, project.getHazardousMachineryWorkerRequirement?.() || 0);
      });
    } catch (error) {
      total = 0;
    }

    return { high: 0, normal: total, low: 0 };
  }

  applyEffects(context = {}, parameters) {
    if (!this.hasConfiguredHazard(parameters)) {
      return false;
    }

    if (!this.hasHazard()) {
      return false;
    }

    const { addEffect, buildings = {}, colonies = {} } = context;
    if (!addEffect) {
      return false;
    }

    const values = this.getCurrentPenaltyValues(this.getTerraforming(), parameters);
    let applied = 0;
    const applyTrackedEffect = (effect) => {
      applied += 1;
      addEffect(effect);
    };

    if (values.nanoColonyGrowthMultiplier < 1) {
      applyTrackedEffect({
        effectId: 'hazardousMachinery-nanoColonyGrowth',
        target: 'nanotechManager',
        type: 'nanoColonyGrowthMultiplier',
        value: values.nanoColonyGrowthMultiplier,
        sourceId: 'hazardPenalties',
        name: getHazardousMachineryText('title', 'Hazardous Machinery')
      });
    }

    if (values.researchMultiplier < 1) {
      applyTrackedEffect({
        effectId: 'hazardousMachinery-research',
        target: 'researchManager',
        type: 'globalResearchBoost',
        value: values.researchMultiplier - 1,
        sourceId: 'hazardPenalties',
        name: getHazardousMachineryText('title', 'Hazardous Machinery')
      });
    }

    if (values.buildCostMultiplier > 1) {
      const applyBuildCostEffect = (target, targetId, cost) => {
        if (!cost) {
          return;
        }

        Object.keys(cost).forEach((category) => {
          const categoryCosts = cost[category];
          if (!categoryCosts) {
            return;
          }

          Object.keys(categoryCosts).forEach((resourceId) => {
            applyTrackedEffect({
              effectId: `hazardousMachinery-buildCost-${targetId}-${category}-${resourceId}`,
              target,
              targetId,
              type: 'resourceCostMultiplier',
              resourceCategory: category,
              resourceId,
              value: values.buildCostMultiplier,
              sourceId: 'hazardPenalties',
              name: getHazardousMachineryText('title', 'Hazardous Machinery')
            });
          });
        });
      };

      Object.keys(buildings).forEach((id) => {
        if (buildings[id]) {
          applyBuildCostEffect('building', id, buildings[id].cost);
        }
      });

      Object.keys(colonies).forEach((id) => {
        if (colonies[id]) {
          applyBuildCostEffect('colony', id, colonies[id].cost);
        }
      });
    }

    if (values.electronicsMaintenanceMultiplier > 1) {
      const applyElectronicsEffect = (target, targetId) => {
        applyTrackedEffect({
          effectId: `hazardousMachinery-electronicsMaintenance-${targetId}`,
          target,
          targetId,
          type: 'maintenanceCostMultiplier',
          resourceCategory: 'colony',
          resourceId: 'electronics',
          value: values.electronicsMaintenanceMultiplier,
          sourceId: 'hazardPenalties',
          name: getHazardousMachineryText('title', 'Hazardous Machinery')
        });
      };

      Object.keys(buildings).forEach((id) => {
        if (buildings[id]) {
          applyElectronicsEffect('building', id);
        }
      });

      Object.keys(colonies).forEach((id) => {
        if (colonies[id]) {
          applyElectronicsEffect('colony', id);
        }
      });
    }

    return applied > 0;
  }

  performDangerousHack(terraforming, parameters, batchCount = 1) {
    if (!this.hasConfiguredHazard(parameters)) {
      return 0;
    }

    const resource = this.getResource();
    if (!resource || !(batchCount > 0)) {
      return 0;
    }

    const costPerHack = Math.max(1, parameters?.electronicsToAndroidCost || 1000);
    const electronics = resources?.colony?.electronics;
    const androids = resources?.colony?.androids;
    if (!electronics || !androids) {
      return 0;
    }

    const maxByElectronics = Math.floor((electronics.value || 0) / costPerHack);
    const maxByMachinery = Math.floor(resource.value || 0);
    const actual = Math.max(0, Math.min(batchCount, maxByElectronics, maxByMachinery));

    if (!(actual > 0)) {
      return 0;
    }

    electronics.decrease(actual * costPerHack);
    androids.increase(actual);
    resource.decrease(actual);
    this.syncResource(terraforming, parameters, { preserveValue: true });
    return actual;
  }

  save() {
    return {
      hackBatchSize: this.hackBatchSize
    };
  }

  setHackBatchSize(value) {
    this.hackBatchSize = Math.max(1, Math.floor(value || 1));
    return this.hackBatchSize;
  }

  load(data) {
    this.setHackBatchSize(data?.hackBatchSize || 1);
  }

  update(deltaTime, terraforming, parameters) {
    if (!this.hasConfiguredHazard(parameters)) {
      this.manager.setHazardLandReservationShare('hazardousMachinery', 0);
      return;
    }

    const syncState = this.syncResource(terraforming, parameters, { preserveValue: true });
    if (!syncState) {
      return;
    }

    const resource = syncState.resource;
    if (!(resource.value > 0) || !(deltaTime > 0)) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const penaltyValues = this.getCurrentPenaltyValues(terraforming, parameters);
    let currentAmount = Math.max(0, resource.value || 0);
    const naturalGrowthDelta = penaltyValues.naturalGrowthRatePerSecond * deltaSeconds;

    if (naturalGrowthDelta > 0) {
      resource.increase(naturalGrowthDelta);
      resource.modifyRate?.(
        penaltyValues.naturalGrowthRatePerSecond,
        getHazardousMachineryText('rateLabels.baseGrowth', 'Self-Replication'),
        'hazard'
      );
      currentAmount += naturalGrowthDelta;
    } else if (naturalGrowthDelta < 0) {
      const naturalDecay = Math.min(currentAmount, Math.abs(naturalGrowthDelta));
      if (naturalDecay > 0) {
        resource.decrease(naturalDecay);
        resource.modifyRate?.(
          -Math.abs(penaltyValues.naturalGrowthRatePerSecond),
          getHazardousMachineryText('rateLabels.baseGrowth', 'Self-Replication'),
          'hazard'
        );
        currentAmount -= naturalDecay;
      }
    }

    const oxygenResource = resources?.atmospheric?.oxygen || null;
    const invasivenessDecay = Math.min(
      currentAmount,
      penaltyValues.invasivenessDecayRatePerSecond * deltaSeconds
    );
    if (invasivenessDecay > 0) {
      resource.decrease(invasivenessDecay);
      resource.modifyRate?.(
        -penaltyValues.invasivenessDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.invasiveness', 'Life Invasiveness'),
        'hazard'
      );
      currentAmount -= invasivenessDecay;
    }

    const temperatureDecay = Math.min(
      currentAmount,
      penaltyValues.temperatureDecayRatePerSecond * deltaSeconds
    );
    if (temperatureDecay > 0) {
      resource.decrease(temperatureDecay);
      resource.modifyRate?.(
        -penaltyValues.temperatureDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.temperature', 'Heat Damage'),
        'hazard'
      );
      currentAmount -= temperatureDecay;
    }

    const oxygenDecay = Math.min(
      currentAmount,
      oxygenResource?.value || 0,
      penaltyValues.oxygenDecayRatePerSecond * deltaSeconds
    );
    if (oxygenDecay > 0) {
      oxygenResource.decrease(oxygenDecay);
      resource.decrease(oxygenDecay);
      oxygenResource.modifyRate?.(
        -penaltyValues.oxygenDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.oxidation', 'Oxidation'),
        'hazard'
      );
      resource.modifyRate?.(
        -penaltyValues.oxygenDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.oxidation', 'Oxidation'),
        'hazard'
      );
      currentAmount -= oxygenDecay;
    }

    const crusaderDecay = Math.min(
      currentAmount,
      penaltyValues.crusaderDecayRatePerSecond * deltaSeconds
    );
    if (crusaderDecay > 0) {
      resource.decrease(crusaderDecay);
      resource.modifyRate?.(
        -penaltyValues.crusaderDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.crusaders', 'Crusader Patrols'),
        'hazard'
      );
      currentAmount -= crusaderDecay;
    }

    const androidLoss = Math.min(
      penaltyValues.availableAndroids,
      penaltyValues.androidDecayRatePerSecond * deltaSeconds
    );
    if (androidLoss > 0) {
      resources.colony.androids.value = Math.max(0, (resources.colony.androids.value || 0) - androidLoss);
      resource.increase(androidLoss);
      resources.colony.androids.modifyRate?.(
        -penaltyValues.androidDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.androidDecay', 'Hazardous Machinery'),
        'hazard'
      );
      resource.modifyRate?.(
        penaltyValues.androidDecayRatePerSecond,
        getHazardousMachineryText('rateLabels.androidDecay', 'Hazardous Machinery'),
        'hazard'
      );
    }

    const maxAmount = this.getMaxAmount(terraforming, parameters);
    if (resource.value > maxAmount) {
      resource.value = maxAmount;
    }

    this.syncResource(terraforming, parameters, { preserveValue: true });
  }
}

try {
  window.HazardousMachineryHazard = HazardousMachineryHazard;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = { HazardousMachineryHazard };
} catch (error) {
  // Module system not available in browser
}
