function formatNanotechRate(current, optimal, unit) {
  return t('ui.colony.nanotech.rateWithUnit', {
    current: formatNumber(current, false, 2, true),
    optimal: formatNumber(optimal, false, 2, true),
    unit,
  });
}

function formatNanotechSingleRate(current, unit) {
  return t('ui.colony.nanotech.singleRateWithUnit', {
    current: formatNumber(current, false, 2, true),
    unit,
  });
}

class NanotechManager extends EffectableEntity {
  constructor() {
    super({
      description: t('ui.colony.nanotech.managerDescription'),
      resetAt: GAME_RESET_LEVEL.NEW_GAME
    });
    this.nanobots = 1;
    this.showNanobotsInSidebar = false;
    this.travelNanobotFloor = 1;
    this.enabled = false;
    this.uiDirty = true;
    this.uiCache = null;
    this.uiState = {};
    this.initializeControlState();
    this.resetActivityState();
    this.setActivityFractions(1);
  }

  initializeControlState() {
    NANOTECH_CONTROL_PARAMETERS.forEach((control) => {
      this[control.property] = control.defaultValue;
    });
    NANOTECH_LIMIT_PARAMETERS.forEach((limit) => {
      this[limit.percentProperty] = limit.defaultPercent;
      this[limit.absoluteProperty] = limit.defaultAbsolute;
      this[limit.modeProperty] = 'percent';
    });
    NANOTECH_RECYCLING_PARAMETERS.forEach((recycling) => {
      this[recycling.onlyProperty] = false;
      this[recycling.uncappedProperty] = false;
    });
  }

  ensureNanobotsResource() {
    if (!resources.special.nanobots) {
      const config = defaultPlanetParameters.resources.special.nanobots;
      resources.special.nanobots = new Resource({
        ...config,
        name: 'nanobots',
        category: 'special',
        displayName: t('catalogs.resources.special.nanobots.name'),
      });
    }
    return resources.special.nanobots;
  }

  get nanobots() {
    return this.ensureNanobotsResource().value;
  }

  set nanobots(value) {
    this.ensureNanobotsResource().value = value;
  }

  syncNanobotsResource() {
    const resource = this.ensureNanobotsResource();
    resource.hasCap = true;
    resource.cap = this.getMaxNanobots();
    resource.unlocked = this.enabled && !isCurrentWorldManagerDisabled('nanotechManager');
    resource.showInSidebar = this.showNanobotsInSidebar;
  }

  setNanobotsSidebarVisibility(show) {
    this.showNanobotsInSidebar = show === true;
    this.syncNanobotsResource();
  }

  isStageEnabled(stage) {
    return !stage.enabledFlag || this.isBooleanFlagSet(stage.enabledFlag);
  }

  isAlternateElectronicsRecipeUnlocked() {
    return projectManager.projects.nanoworld.getShopPurchaseCount('alternateElectronicsRecipe') > 0;
  }

  usesStage3Graphite() {
    return this.stage3Resource === 'graphite' && this.isAlternateElectronicsRecipeUnlocked();
  }

  getExtraNanotechStages() {
    let extraStages = 0;
    this.booleanFlags.forEach((flag) => {
      if (flag !== 'stage1_enabled' && flag.startsWith('stage') && flag.endsWith('_enabled')) {
        extraStages += 1;
      }
    });
    return extraStages;
  }

  getTravelPreserveCap() {
    return 1e15 * Math.pow(10, this.getExtraNanotechStages());
  }

  getTravelNanobotFloor() {
    const floor = Number.isFinite(this.travelNanobotFloor) ? this.travelNanobotFloor : 1;
    return Math.max(1, floor);
  }

  getNanotechEfficiencyMultiplier() {
    let multiplier = 1;
    this.activeEffects.forEach((effect) => {
      if (effect.type === 'nanotechEfficiencyMultiplier') multiplier *= effect.value;
    });
    return multiplier;
  }

  getNanoworldStageMultiplier(stageNumber) {
    let multiplier = 1;
    this.activeEffects.forEach((effect) => {
      if (effect.type === 'nanoworldStageMultiplier' && effect.stage === stageNumber) {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  getStageOutputRate(stageNumber, sliderValue) {
    const stage = NANOTECH_STAGE_PARAMETERS.find((candidate) => candidate.number === stageNumber);
    return this.nanobots
      * stage.input.coefficient
      * (sliderValue / 10)
      * this.getNanotechEfficiencyMultiplier()
      * this.getNanoworldStageMultiplier(stageNumber);
  }

  getStageGrowthContribution(stage) {
    if (!this.isStageEnabled(stage)) return 0;
    return 0.0015
      * this[stage.input.fractionProperty]
      * this.getNanoworldStageMultiplier(stage.number)
      * this.getNanotechEfficiencyMultiplier();
  }

  getSkullGrowthContribution() {
    return this.isStageEnabled(NANOTECH_SKULL_STAGE_PARAMETER)
      ? 0.0015 * this.hazardousBiomassFraction * this.getNanotechEfficiencyMultiplier()
      : 0;
  }

  getGrowthRateBreakdown(productionFractions = {}) {
    const efficiencyMultiplier = this.getNanotechEfficiencyMultiplier();
    const contributions = {
      base: 0.0025
        * Math.pow(2, this.getExtraNanotechStages())
        * this.powerFraction
        * this.getNanoworldStageMultiplier(1)
        * efficiencyMultiplier,
    };
    NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
      contributions[stage.input.key] = this.getStageGrowthContribution(stage);
    });
    contributions.hazardousBiomass = this.getSkullGrowthContribution();

    let penalty = 0;
    NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
      if (!this.isStageEnabled(stage)) return;
      const fraction = productionFractions[stage.output.key] ?? this[stage.output.fractionProperty];
      penalty += (this[stage.maintenance.sliderProperty] / 10) * 0.0015;
      penalty += (this[stage.output.sliderProperty] / 10) * 0.0015 * fraction;
    });
    if (this.isStageEnabled(NANOTECH_SKULL_STAGE_PARAMETER)) {
      NANOTECH_SKULL_STAGE_PARAMETER.input.extraSliderProperties.forEach((property) => {
        penalty += (this[property] / 10) * 0.0015;
      });
    }
    const rawRate = Object.values(contributions).reduce((total, value) => total + value, 0) - penalty;
    const growthMultiplier = this.getEffectiveGrowthMultiplier();
    return {
      contributions,
      penalty,
      rawRate,
      growthMultiplier,
      effectiveRate: rawRate * growthMultiplier,
    };
  }

  getNanobotDensityMultiplier() {
    let multiplier = 1;
    this.activeEffects.forEach((effect) => {
      if (effect.type === 'nanobotDensityMultiplier') multiplier *= effect.value;
    });
    return multiplier;
  }

  isPulsarHazardActive() {
    if (!hazardManager || !hazardManager.parameters || !hazardManager.pulsarHazard) return false;
    const pulsar = hazardManager.parameters.pulsar;
    return pulsar && !hazardManager.pulsarHazard.isCleared(terraforming, pulsar);
  }

  getPulsarNanobotCapMultiplier() {
    if (!this.isPulsarHazardActive()) return 1;
    const pulsar = hazardManager.parameters.pulsar;
    const initialLand = Math.max(resolveWorldBaseLand(terraforming), 0);
    if (initialLand <= 0) return 0;
    const undergroundExpansion = projectManager?.projects?.undergroundExpansion;
    if (!undergroundExpansion) return 0;
    const completions = Math.max(undergroundExpansion.repeatCount || 0, 0);
    const undergroundMultiplier = Math.min(1, completions / initialLand);
    let skyMultiplier = 0;
    if (hazardManager.pulsarHazard.getHazardStrength) {
      skyMultiplier = Math.max(0, Math.min(1, 1 - hazardManager.pulsarHazard.getHazardStrength(terraforming, pulsar)));
    }
    return Math.max(undergroundMultiplier, skyMultiplier);
  }

  getMaxNanobots() {
    if (!resources.surface?.land) return 1e40;
    const baseCap = resources.surface.land.value * 10000 * 1e19 * this.getNanobotDensityMultiplier();
    return baseCap * this.getPulsarNanobotCapMultiplier();
  }

  isTemperatureDisabled() {
    return terraforming.temperature.value > MAINTENANCE_PENALTY_EXPONENTIAL_THRESHOLD;
  }

  getTemperatureDisableWarning() {
    if (!this.isTemperatureDisabled()) return '';
    const unit = getTemperatureUnit();
    const currentTemperature = formatNumber(toDisplayTemperature(terraforming.temperature.value), false, 2);
    const cutoffTemperature = formatNumber(toDisplayTemperature(MAINTENANCE_PENALTY_EXPONENTIAL_THRESHOLD), false, 2);
    return t('ui.colony.nanotech.temperature.warning', { currentTemperature, cutoffTemperature, unit });
  }

  getTemperatureDisableLabel() {
    const unit = getTemperatureUnit();
    const cutoffTemperature = formatNumber(toDisplayTemperature(MAINTENANCE_PENALTY_EXPONENTIAL_THRESHOLD), false, 2);
    return t('ui.colony.nanotech.temperature.disabledLabel', { cutoffTemperature, unit });
  }

  resetActivityState() {
    NANOTECH_ACTIVITY_PARAMETERS.forEach((activity) => {
      this[activity.currentProperty] = 0;
      this[activity.optimalProperty] = 0;
      this[activity.fractionProperty] = 0;
      this[activity.enoughProperty] = true;
      if (activity.outputCurrentProperty) {
        this[activity.outputCurrentProperty] = 0;
        this[activity.outputFractionProperty] = 1;
      }
    });
    NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
      this[stage.maintenance.currentProperty] = 0;
    });
    this.effectiveGrowthRate = 0;
  }

  setActivityFractions(value) {
    NANOTECH_ACTIVITY_PARAMETERS.forEach((activity) => {
      this[activity.fractionProperty] = value;
    });
  }

  clearCurrentActivity() {
    NANOTECH_ACTIVITY_PARAMETERS.forEach((activity) => {
      this[activity.currentProperty] = 0;
      if (activity.outputCurrentProperty) this[activity.outputCurrentProperty] = 0;
    });
    NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
      this[stage.maintenance.currentProperty] = 0;
    });
  }

  getLimitRate(limitId, productionRate, totalAvailable = 0) {
    const limit = NANOTECH_LIMIT_PARAMETERS.find((parameter) => parameter.id === limitId);
    const mode = this[limit.modeProperty];
    if (mode === 'absolute') return Math.max(0, this[limit.absoluteProperty]);
    if (mode === 'uncapped') return Number.POSITIVE_INFINITY;
    if (mode === 'percent_total') return Math.max(0, totalAvailable * this[limit.percentProperty] / 100);
    return Math.max(0, productionRate * this[limit.percentProperty] / 100);
  }

  getEstimatedLifeBiomassProductionRate(deltaTime, accumulatedChanges) {
    const seconds = deltaTime / 1000;
    if (seconds <= 0 || lifeManager.isBooleanFlagSet('ringworldLowGravityLife')) return 0;
    const plan = lifeManager.buildAtmosphericPlan(deltaTime, accumulatedChanges);
    let growthTotal = 0;
    plan.zones.forEach((zoneName) => {
      const growth = plan.zoneGrowthByZone[zoneName] || 0;
      if (growth > 0) growthTotal += growth;
    });
    return growthTotal / seconds;
  }

  addAccumulatedChange(accumulatedChanges, category, resourceId, amount) {
    accumulatedChanges[category][resourceId] = (accumulatedChanges[category][resourceId] || 0) + amount;
  }

  getAvailableResource(resource, accumulatedChanges, category, resourceId) {
    return Math.max(resource.value + (accumulatedChanges[category][resourceId] || 0), 0);
  }

  recordResourceRate(resource, rate, input) {
    resource.modifyRate(
      rate,
      registerRateSource(input.rateSourceId, t(input.rateSourcePath)),
      'nanotech'
    );
  }

  consumeStage3Graphite(stage, deltaTime, accumulatedChanges) {
    const seconds = deltaTime / 1000;
    const input = stage.input;
    const resource = resources.surface.graphite;
    const needed = this[input.optimalProperty] * seconds;
    const limitRate = this.getLimitRate(input.limitId, resource.productionRate || 0);
    const limitedNeed = Math.min(needed, limitRate * seconds);
    const used = Math.min(limitedNeed, this.getAvailableResource(resource, accumulatedChanges, 'surface', 'graphite'));
    this[input.enoughProperty] = limitedNeed >= needed && used >= needed;
    this[input.currentProperty] = used / seconds;
    if (used > 0) {
      this.addAccumulatedChange(accumulatedChanges, 'surface', 'graphite', -used);
      resource.modifyRate(
        -this[input.currentProperty],
        registerRateSource(input.alternateRateSourceId, t(input.alternateRateSourcePath)),
        'nanotech'
      );
    }
    this[input.fractionProperty] = this[input.enoughProperty] ? 1 : (needed > 0 ? used / needed : 1);
    return used;
  }

  consumeStage3Biomass(stage, deltaTime, accumulatedChanges, recyclingEnabled) {
    const seconds = deltaTime / 1000;
    const input = stage.input;
    const resource = resources.surface.biomass;
    const recycling = input.recycling;
    const extraResource = resources.surface[recycling.resourceId];
    const onlyExtra = recyclingEnabled && this[recycling.onlyProperty];
    const uncappedExtra = recyclingEnabled && this[recycling.uncappedProperty];
    const resourceAvailable = this.getAvailableResource(resource, accumulatedChanges, 'surface', input.resourceId);
    const extraAvailable = recyclingEnabled
      ? this.getAvailableResource(extraResource, accumulatedChanges, 'surface', recycling.resourceId)
      : 0;
    const totalAvailable = uncappedExtra
      ? resourceAvailable
      : (onlyExtra ? extraAvailable : resourceAvailable + extraAvailable);
    const baseProduction = uncappedExtra
      ? (onlyExtra ? 0 : (resource.productionRate || 0))
      : (onlyExtra
        ? (extraResource.productionRate || 0)
        : (resource.productionRate || 0) + (recyclingEnabled ? (extraResource.productionRate || 0) : 0));
    const lifeProduction = this.biomassLimitMode === 'percent' && !onlyExtra
      ? this.getEstimatedLifeBiomassProductionRate(deltaTime, accumulatedChanges)
      : 0;
    const limitRate = this.getLimitRate(input.limitId, baseProduction + lifeProduction, totalAvailable);
    const needed = this[input.optimalProperty] * seconds;
    const limitedNeed = Math.min(needed, limitRate * seconds);
    const extraNeed = uncappedExtra ? needed : limitedNeed;
    const usedExtra = recyclingEnabled ? Math.min(extraNeed, extraAvailable) : 0;
    if (usedExtra > 0) {
      this.addAccumulatedChange(accumulatedChanges, 'surface', recycling.resourceId, -usedExtra);
      this.recordResourceRate(extraResource, -usedExtra / seconds, recycling);
    }
    const remaining = (uncappedExtra ? needed : limitedNeed) - usedExtra;
    const resourceNeed = uncappedExtra ? Math.min(remaining, limitRate * seconds) : remaining;
    const usedResource = onlyExtra ? 0 : Math.min(resourceNeed, resourceAvailable);
    if (usedResource > 0) {
      this.addAccumulatedChange(accumulatedChanges, 'surface', input.resourceId, -usedResource);
      this.recordResourceRate(resource, -usedResource / seconds, input);
    }
    const totalUsed = usedExtra + usedResource;
    this[input.enoughProperty] = uncappedExtra
      ? totalUsed >= needed
      : limitedNeed >= needed && totalUsed >= needed;
    this[input.currentProperty] = totalUsed / seconds;
    this[input.fractionProperty] = this[input.enoughProperty] ? 1 : (needed > 0 ? totalUsed / needed : 1);
    return totalUsed;
  }

  consumeStandardStageInput(stage, deltaTime, accumulatedChanges, recyclingEnabled) {
    const seconds = deltaTime / 1000;
    const input = stage.input;
    const resource = resources[input.category][input.resourceId];
    const recycling = input.recycling;
    const useRecycling = recyclingEnabled && recycling;
    const extraResource = useRecycling ? resources[recycling.category][recycling.resourceId] : null;
    const onlyExtra = useRecycling && this[recycling.onlyProperty];
    const uncappedExtra = useRecycling && this[recycling.uncappedProperty];
    const productionRate = uncappedExtra
      ? (onlyExtra ? 0 : (resource.productionRate || 0))
      : (onlyExtra
        ? (extraResource.productionRate || 0)
        : (resource.productionRate || 0) + (useRecycling ? (extraResource.productionRate || 0) : 0));
    const needed = this[input.optimalProperty] * seconds;
    const limitRate = this.getLimitRate(input.limitId, productionRate);
    const limitedNeed = Math.min(needed, limitRate * seconds);
    const extraNeed = uncappedExtra ? needed : limitedNeed;
    const extraAvailable = useRecycling
      ? this.getAvailableResource(extraResource, accumulatedChanges, recycling.category, recycling.resourceId)
      : 0;
    const usedExtra = useRecycling ? Math.min(extraNeed, extraAvailable) : 0;
    if (usedExtra > 0) {
      this.addAccumulatedChange(accumulatedChanges, recycling.category, recycling.resourceId, -usedExtra);
      this.recordResourceRate(extraResource, -usedExtra / seconds, recycling);
    }
    const remaining = (uncappedExtra ? needed : limitedNeed) - usedExtra;
    const resourceNeed = uncappedExtra ? Math.min(remaining, limitRate * seconds) : remaining;
    const resourceAvailable = this.getAvailableResource(resource, accumulatedChanges, input.category, input.resourceId);
    const usedResource = onlyExtra ? 0 : Math.min(resourceNeed, resourceAvailable);
    if (usedResource > 0) {
      this.addAccumulatedChange(accumulatedChanges, input.category, input.resourceId, -usedResource);
      this.recordResourceRate(resource, -usedResource / seconds, input);
    }
    const totalUsed = usedExtra + usedResource;
    this[input.enoughProperty] = uncappedExtra
      ? totalUsed >= needed
      : limitedNeed >= needed && totalUsed >= needed;
    this[input.currentProperty] = totalUsed / seconds;
    this[input.fractionProperty] = this[input.enoughProperty] ? 1 : (needed > 0 ? totalUsed / needed : 1);
    return totalUsed;
  }

  consumeStageInput(stage, deltaTime, accumulatedChanges, recyclingEnabled) {
    if (!this.isStageEnabled(stage)) {
      this[stage.input.fractionProperty] = 0;
      this[stage.input.enoughProperty] = true;
      return 0;
    }
    if (stage.id === 'stage3') {
      return this.usesStage3Graphite()
        ? this.consumeStage3Graphite(stage, deltaTime, accumulatedChanges)
        : this.consumeStage3Biomass(stage, deltaTime, accumulatedChanges, recyclingEnabled);
    }
    return this.consumeStandardStageInput(stage, deltaTime, accumulatedChanges, recyclingEnabled);
  }

  hasDepositType(depositType) {
    if (depositType === 'sand') return this.hasSandDeposits();
    if (depositType === 'ore') return this.hasOreDeposits();
    if (depositType === 'graphite') return this.hasGraphiteDeposits();
    if (depositType === 'sandOrArtificial') {
      return this.hasSandDeposits() && currentPlanetParameters?.classification?.archetype !== 'artificial';
    }
    return true;
  }

  produceStageOutput(stage, deltaTime, accumulatedChanges, inputProvided) {
    if (!this.isStageEnabled(stage)) return;
    const seconds = deltaTime / 1000;
    const output = stage.output;
    const resource = resources[output.category][output.resourceId];
    const optimalRate = this.getStageOutputRate(stage.number, this[output.sliderProperty]);
    const optimalAmount = optimalRate * seconds;
    const amount = this.hasDepositType(output.depositType)
      ? optimalAmount
      : Math.min(optimalAmount, inputProvided);
    this[output.currentProperty] = amount / seconds;
    this[output.fractionProperty] = optimalRate > 0
      ? Math.max(0, Math.min(1, this[output.currentProperty] / optimalRate))
      : 1;
    if (amount > 0) {
      this.addAccumulatedChange(accumulatedChanges, output.category, output.resourceId, amount);
      resource.modifyRate(
        this[output.currentProperty],
        registerRateSource(output.rateSourceId, t(output.rateSourcePath)),
        'nanotech'
      );
    }
  }

  processSkullStage(deltaTime, accumulatedChanges) {
    const stage = NANOTECH_SKULL_STAGE_PARAMETER;
    const input = stage.input;
    if (!this.isStageEnabled(stage)) {
      this[input.fractionProperty] = 0;
      this[input.enoughProperty] = true;
      return;
    }
    const seconds = deltaTime / 1000;
    const resource = resources[input.category][input.resourceId];
    const needed = this[input.optimalProperty] * seconds;
    const available = this.getAvailableResource(resource, accumulatedChanges, input.category, input.resourceId);
    const used = Math.min(needed, available);
    this[input.enoughProperty] = used >= needed;
    this[input.currentProperty] = used / seconds;
    this[input.fractionProperty] = needed > 0 ? used / needed : 1;
    if (used > 0) {
      this.addAccumulatedChange(accumulatedChanges, input.category, input.resourceId, -used);
      this.recordResourceRate(resource, -this[input.currentProperty], input);
    }
  }

  processEnergy(deltaTime, accumulatedChanges) {
    const seconds = deltaTime / 1000;
    const energy = resources.colony.energy;
    const productionRate = energy.productionRate || 0;
    const allowedPower = this.getLimitRate('energy', productionRate);
    const requiredEnergy = this.optimalEnergyConsumption * seconds;
    const available = this.getAvailableResource(energy, accumulatedChanges, 'colony', 'energy');
    const actualEnergy = Math.min(requiredEnergy, allowedPower * seconds, available);
    this.currentEnergyConsumption = actualEnergy / seconds;
    this.powerFraction = this.optimalEnergyConsumption > 0
      ? this.currentEnergyConsumption / this.optimalEnergyConsumption
      : 0;
    this.hasEnoughEnergy = allowedPower >= this.optimalEnergyConsumption;
    this.addAccumulatedChange(accumulatedChanges, 'colony', 'energy', -actualEnergy);
    energy.modifyRate(
      -this.currentEnergyConsumption,
      registerRateSource('nanotech:growth', t('ui.colony.nanotech.sources.growth')),
      'nanotech'
    );
  }

  produceResources(deltaTime, accumulatedChanges, accumulatedSpecialChanges) {
    if (deltaTime === 0) return;
    this.syncNanobotsResource();
    if (!isManagerEffectivelyEnabled(this, 'nanotechManager') || this.isTemperatureDisabled()) {
      this.resetActivityState();
      this.applyMaintenanceEffects();
      return;
    }
    this.resetActivityState();
    const efficiency = this.getNanotechEfficiencyMultiplier();
    NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
      this[stage.input.optimalProperty] = this.isStageEnabled(stage)
        ? this.nanobots * stage.input.coefficient * efficiency * this.getNanoworldStageMultiplier(stage.number)
        : 0;
    });
    const skull = NANOTECH_SKULL_STAGE_PARAMETER;
    const extraStreams = skull.input.extraSliderProperties.reduce((total, property) => total + this[property] / 10, 1);
    this[skull.input.optimalProperty] = this.isStageEnabled(skull)
      ? this.nanobots * skull.input.coefficient * extraStreams * efficiency
      : 0;
    this.optimalEnergyConsumption = this.nanobots * 1e-12;

    const recyclingEnabled = this.isBooleanFlagSet('nanotechRecycling');
    NANOTECH_PROCESSING_ORDER.forEach((stageId) => {
      const stage = NANOTECH_STAGE_BY_ID[stageId];
      const inputProvided = this.consumeStageInput(stage, deltaTime, accumulatedChanges, recyclingEnabled);
      this.produceStageOutput(stage, deltaTime, accumulatedChanges, inputProvided);
    });
    this.processSkullStage(deltaTime, accumulatedChanges);
    this.processEnergy(deltaTime, accumulatedChanges);

    const breakdown = this.getGrowthRateBreakdown();
    this.effectiveGrowthRate = breakdown.effectiveRate;
    const growthDelta = this.nanobots * breakdown.effectiveRate * (deltaTime / 1000);
    const max = this.getMaxNanobots();
    if (growthDelta > 0 && this.nanobots < max) this.nanobots = Math.min(max, this.nanobots + growthDelta);
    else if (growthDelta < 0) this.nanobots = Math.max(1, this.nanobots + growthDelta);
    this.applyMaintenanceEffects();
  }

  enable() {
    if (isCurrentWorldManagerDisabled('nanotechManager')) return;
    this.enabled = true;
    this.syncNanobotsResource();
    this.markUIDirty();
  }

  markUIDirty() {
    this.uiDirty = true;
  }

  prepareForTravel(resetLevel = GAME_RESET_LEVEL.PLANET) {
    if (resetLevel >= this.departureResetAt) {
      return;
    }
    const travelCap = this.getTravelPreserveCap();
    this.nanobots = Math.max(1, Math.min(Number(this.nanobots), travelCap)) || travelCap;
    this.travelNanobotFloor = this.nanobots;
    this.resetControlsForTravel();
  }

  resetControlsForTravel() {
    NANOTECH_CONTROL_PARAMETERS.forEach((control) => {
      if (control.travelValue !== undefined) this[control.property] = control.travelValue;
    });
    NANOTECH_LIMIT_PARAMETERS.forEach((limit) => {
      if (limit.id === 'energy') {
        this[limit.percentProperty] = limit.defaultPercent;
        this[limit.absoluteProperty] = limit.defaultAbsolute;
        this[limit.modeProperty] = 'percent';
      } else {
        this[limit.percentProperty] = 0;
        this[limit.absoluteProperty] = 0;
      }
    });
    this.clearCurrentActivity();
    this.markUIDirty();
  }

  getMaintenanceEffectId(stage, resourceId) {
    return `${stage.maintenance.effectPrefix}_${resourceId}`;
  }

  clearNanotechMaintenanceEffects() {
    const effectIds = [];
    NANOTECH_STAGE_PARAMETERS.filter((stage) => !stage.maintenance.additive).forEach((stage) => {
      stage.maintenance.resources.forEach((resourceId) => {
        effectIds.push(this.getMaintenanceEffectId(stage, resourceId));
      });
    });
    for (const name in structures) {
      const target = colonies && colonies[name] ? 'colony' : 'building';
      effectIds.forEach((effectId) => removeEffect({ target, targetId: name, effectId }));
    }
  }

  getMaintenanceTotals() {
    const resourceIds = NANOTECH_STAGE_BY_ID.stage4.maintenance.resources;
    const totals = {};
    resourceIds.forEach((resourceId) => { totals[resourceId] = 0; });
    const nanotechSources = new Set(NANOTECH_STAGE_PARAMETERS.map((stage) => stage.maintenance.sourceId));
    for (const name in structures) {
      const structure = structures[name];
      if (!structure || !structure.maintenanceCost) continue;
      const productivity = structure.productivity !== undefined ? structure.productivity : 1;
      const activeCount = Number.isFinite(structure.activeNumber)
        ? structure.activeNumber
        : buildingCountToNumber(structure.active);
      const colonyCost = structure.getEffectiveCost().colony || {};
      const maintenanceMultiplier = structure.getEffectiveMaintenanceMultiplier();
      resourceIds.forEach((resourceId) => {
        const resourceCost = colonyCost[resourceId];
        if (!(resourceCost > 0)) return;
        let nonNanotechMultiplier = 1;
        structure.activeEffects.forEach((effect) => {
          if (
            effect.type === 'maintenanceCostMultiplier'
            && effect.resourceCategory === 'colony'
            && effect.resourceId === resourceId
            && !nanotechSources.has(effect.sourceId)
          ) {
            nonNanotechMultiplier *= effect.value;
          }
        });
        const resourceData = resources.colony[resourceId];
        const resourceMultiplier = resourceData.maintenanceMultiplier !== undefined
          ? resourceData.maintenanceMultiplier
          : 1;
        totals[resourceId] += resourceCost
          * maintenanceFraction
          * structure.maintenanceFactor
          * nonNanotechMultiplier
          * resourceMultiplier
          * maintenanceMultiplier
          * activeCount
          * productivity;
      });
    }
    return totals;
  }

  calculateMaintenanceReductions(totals) {
    const coveragePerBot = 1e-18 * this.getNanotechEfficiencyMultiplier();
    NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
      const total = stage.maintenance.resources.reduce((sum, resourceId) => sum + totals[resourceId], 0);
      const coverage = total > 0
        ? Math.min(0.5, this.nanobots * coveragePerBot * this.getNanoworldStageMultiplier(stage.number) / total)
        : 0;
      this[stage.maintenance.currentProperty] = this.isStageEnabled(stage)
        ? coverage * (this[stage.maintenance.sliderProperty] / 10)
        : 0;
    });
  }

  applyStructureMaintenanceEffect(structureName, stage, resourceId, multiplier) {
    const isColony = colonies && colonies[structureName];
    const targetObject = isColony ? colonies[structureName] : structures[structureName];
    const effectId = this.getMaintenanceEffectId(stage, resourceId);
    const existing = targetObject.activeEffects.find((effect) => effect.effectId === effectId);
    if (
      existing
      && existing.type === 'maintenanceCostMultiplier'
      && existing.resourceCategory === 'colony'
      && existing.resourceId === resourceId
      && existing.sourceId === stage.maintenance.sourceId
      && Math.abs(existing.value - multiplier) < 1e-12
    ) return;
    addEffect({
      target: isColony ? 'colony' : 'building',
      targetId: structureName,
      type: 'maintenanceCostMultiplier',
      resourceCategory: 'colony',
      resourceId,
      value: multiplier,
      effectId,
      sourceId: stage.maintenance.sourceId,
      name: t('ui.colony.nanotech.effectName'),
    });
  }

  applyMaintenanceEffects() {
    if (!structures) return;
    if (!isManagerEffectivelyEnabled(this, 'nanotechManager') || this.isTemperatureDisabled()) {
      this.clearNanotechMaintenanceEffects();
      NANOTECH_STAGE_PARAMETERS.forEach((stage) => {
        this[stage.maintenance.currentProperty] = 0;
      });
      return;
    }
    const totals = this.getMaintenanceTotals();
    this.calculateMaintenanceReductions(totals);
    const additiveReduction = this[NANOTECH_STAGE_BY_ID.stage4.maintenance.currentProperty];
    NANOTECH_STAGE_PARAMETERS.filter((stage) => !stage.maintenance.additive).forEach((stage) => {
      const stageReduction = this[stage.maintenance.currentProperty];
      stage.maintenance.resources.forEach((resourceId) => {
        const multiplier = 1 - Math.min(1, stageReduction + additiveReduction);
        for (const name in structures) {
          this.applyStructureMaintenanceEffect(name, stage, resourceId, multiplier);
        }
      });
    });
  }

  hasSandDeposits() {
    const quarryHasSand = buildings?.sandQuarry?.hasSandAvailable?.();
    const attributeHasSand = currentPlanetParameters?.specialAttributes?.hasSand;
    return quarryHasSand !== false && attributeHasSand !== false;
  }

  hasOreDeposits() {
    return (currentPlanetParameters?.resources?.underground?.ore?.maxDeposits || 0) > 0;
  }

  hasGraphiteDeposits() {
    return (currentPlanetParameters?.resources?.surface?.graphite?.initialValue || 0) > 0;
  }

  saveState() {
    const state = {
      nanobots: this.nanobots,
      showNanobotsInSidebar: this.showNanobotsInSidebar,
      travelNanobotFloor: this.getTravelNanobotFloor(),
    };
    NANOTECH_CONTROL_PARAMETERS.forEach((control) => {
      state[control.property] = this[control.property];
    });
    NANOTECH_LIMIT_PARAMETERS.forEach((limit) => {
      state[limit.percentProperty] = this[limit.percentProperty];
      state[limit.absoluteProperty] = this[limit.absoluteProperty];
      state[limit.modeProperty] = this[limit.modeProperty];
    });
    ['onlyScrap', 'onlyTrash', 'onlyJunk', 'uncappedScrap', 'uncappedTrash', 'uncappedJunk'].forEach((property) => {
      state[property] = this[property];
    });
    return state;
  }

  loadState(state) {
    if (!state) return;
    this.nanobots = state.nanobots || 1;
    this.setNanobotsSidebarVisibility(state.showNanobotsInSidebar === true);
    this.travelNanobotFloor = Number.isFinite(state.travelNanobotFloor)
      ? Math.max(1, state.travelNanobotFloor)
      : Math.max(1, Math.min(this.nanobots, this.getTravelPreserveCap()));
    NANOTECH_CONTROL_PARAMETERS.forEach((control) => {
      if (control.fixedOnLoad) this[control.property] = control.defaultValue;
      else if (control.property === 'stage3Resource') this.stage3Resource = state.stage3Resource === 'graphite' ? 'graphite' : 'biomass';
      else this[control.property] = state[control.property] || control.defaultValue;
    });
    NANOTECH_LIMIT_PARAMETERS.forEach((limit) => {
      this[limit.percentProperty] = state[limit.percentProperty] ?? limit.defaultPercent;
      this[limit.absoluteProperty] = state[limit.absoluteProperty] ?? limit.defaultAbsolute;
      this[limit.modeProperty] = state[limit.modeProperty] || 'percent';
    });
    NANOTECH_RECYCLING_PARAMETERS.forEach((recycling) => {
      this[recycling.onlyProperty] = !!state[recycling.onlyProperty];
      this[recycling.uncappedProperty] = !!state[recycling.uncappedProperty];
    });
    this.reapplyEffects();
    this.markUIDirty();
  }

  reset() {
    this.nanobots = 1;
    this.showNanobotsInSidebar = false;
    this.travelNanobotFloor = 1;
    this.enabled = false;
    this.initializeControlState();
    this.resetActivityState();
    this.setActivityFractions(1);
    this.syncNanobotsResource();
    this.markUIDirty();
  }

  reapplyEffects() {
    this.syncNanobotsResource();
    if (!isCurrentWorldManagerDisabled('nanotechManager')) this.applyMaintenanceEffects();
  }

  getEffectiveGrowthMultiplier() {
    let multiplier = 1;
    this.activeEffects.forEach((effect) => {
      if (effect.type === 'nanoColonyGrowthMultiplier') multiplier *= effect.value;
    });
    return multiplier;
  }
}
