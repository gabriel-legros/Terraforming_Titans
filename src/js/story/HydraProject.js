const HYDRA_CORE_IDS = ['aether', 'aero', 'aqua', 'ignis', 'terra'];
const HYDRA_SOURCE_ID = 'project:hydra';
const HYDRA_CORE_DETAILS = {
  aether: { abilities: ['rebuild', 'imports', 'stripping'], penalties: ['research', 'delay', 'capture', 'bombardment'] },
  aero: { abilities: ['rebuild', 'disposal'], penalties: ['occupation', 'hacking'] },
  aqua: { abilities: ['rebuild', 'excavation'], penalties: ['occupation', 'hacking'] },
  ignis: { abilities: ['rebuild', 'emissions'], penalties: ['occupation', 'buildCost', 'maintenance', 'nanocolonyCap'] },
  terra: { abilities: ['rebuild', 'heat', 'venting'], penalties: ['delay', 'attacks'] }
};

class HydraProject extends ArtificialSkyProject {
  constructor(config, name) {
    super(config, name);
    this.coreMass = null;
    this.rates = {};
    this.netMass = 0;
    this.netCaptureRate = 0;
    this.netAttritionRate = 0;
    this.stellarFeedstock = 0;
    this.outerAetherMass = 0;
    this.aetherOrbitAltitude = 0;
    this.aetherOrbitRadius = 0;
    this.baseCoreHeatFlux = 0;
    this.partialLosses = {};
    this.ui = null;
    for (const id of [...HYDRA_CORE_IDS, 'net']) {
      registerRateSource(`project:hydra:${id}`, t(`ui.projects.hydra.rateSources.${id}`));
    }
  }

  enable() {
    super.enable();
    if (!projectManager.isProjectRelevantToCurrentPlanet(this)) return;
    if (this.isCompleted) {
      this.clearHydraEffects();
      return;
    }
    this.initializeHydra();
    const config = currentPlanetParameters.specialAttributes.hydra;
    this.syncPenalties(this.getEnvironment(), Object.fromEntries(HYDRA_CORE_IDS.map(id =>
      [id, Math.min(1, this.coreMass[id] / config.cores[id].initialMass)])));
  }

  canStart() {
    return !this.isCompleted
      && projectManager.isProjectRelevantToCurrentPlanet(this)
      && this.netMass < currentPlanetParameters.specialAttributes.hydra.net.maximumMass
      && this.getNetBuildRate() > 0
      && Project.prototype.canStart.call(this);
  }

  getScaledCost() {
    if (!projectManager.isProjectRelevantToCurrentPlanet(this)) return super.getScaledCost();
    const net = currentPlanetParameters.specialAttributes.hydra.net;
    return { colony: Object.fromEntries(Object.entries(net.costPerTon)
      .map(([key, amount]) => [key, amount * net.segmentMass])) };
  }

  getMaxRepeats() {
    this.maxRepeatCount = Infinity;
    return this.maxRepeatCount;
  }

  canContinue() {
    return !this.isCompleted
      && projectManager.isProjectRelevantToCurrentPlanet(this)
      && this.getRemainingSegments() > 0;
  }

  getRemainingSegments() {
    const net = currentPlanetParameters.specialAttributes.hydra.net;
    return Math.max(0, (net.maximumMass - this.netMass) / net.segmentMass);
  }

  getKesslerSuccessChance() { return 1; }
  applyArtificialSkyCompletionEffects() {}

  complete() {
    const net = currentPlanetParameters.specialAttributes.hydra.net;
    this.netMass = Math.min(net.maximumMass, this.netMass + net.segmentMass);
    super.complete();
  }

  applyContinuousProgress(progress) {
    const net = currentPlanetParameters.specialAttributes.hydra.net;
    this.netMass = Math.min(net.maximumMass, this.netMass + progress * net.segmentMass);
    if (!this.canContinue()) this.completeProjectFully();
  }

  finalizeAssignmentChange(wasContinuous) {
    if (this.isActive && !wasContinuous && this.isContinuous() && this.startingDuration > 0) {
      const net = currentPlanetParameters.specialAttributes.hydra.net;
      const progress = Math.max(0, Math.min(1,
        (this.startingDuration - this.remainingTime) / this.startingDuration));
      this.netMass = Math.min(net.maximumMass, this.netMass + progress * net.segmentMass);
    }
    super.finalizeAssignmentChange(wasContinuous);
  }

  completeProjectFully() {
    this.isActive = false;
    this.isPaused = false;
    this.remainingTime = 0;
    this.startingDuration = 0;
  }

  getEffectiveDuration() {
    if (!projectManager.isProjectRelevantToCurrentPlanet(this)) return super.getEffectiveDuration();
    const net = currentPlanetParameters.specialAttributes.hydra.net;
    const rate = this.getNetBuildRate();
    return rate > 0 ? net.segmentMass / rate * 1000 : Infinity;
  }

  getWarningState() {
    if (this.netMass >= currentPlanetParameters.specialAttributes.hydra.net.maximumMass) {
      return { blocksStart: true, message: t('ui.projects.hydra.netFull') };
    }
    if (this.getNetBuildRate() <= 0) {
      return { blocksStart: true, blocksProgress: true, message: t('ui.projects.hydra.netNoShips') };
    }
    return null;
  }

  renderAutomationUI() {}

  autoAssign() {
    if (!this.isCompleted) super.autoAssign();
  }

  getNetBuildRate() {
    const net = currentPlanetParameters.specialAttributes.hydra.net;
    return net.buildTonsPerSecond + this.assignedSpaceships * net.shipBuildTonsPerSecond;
  }

  updateCostAndGains(elements) {
    if (!elements?.totalCostElement || !projectManager.isProjectRelevantToCurrentPlanet(this)) return;
    this.initializeHydra();
    const net = currentPlanetParameters.specialAttributes.hydra.net;
    const perSecond = this.isContinuous();
    updateTotalCostDisplayElement(elements.totalCostElement, this.calculateSpaceshipTotalCost(perSecond), this, perSecond,
      t(perSecond ? 'ui.projects.artificialSky.costPerSecond' : 'ui.projects.artificialSky.segmentCost') + ' ');
    const values = {
      totalGainElement: t('ui.projects.artificialSky.buildRate', {
        value: formatNumber(this.isCompleted ? 0 : this.getNetBuildRate() / net.segmentMass, true, 3)
      }),
      segmentProgressElement: t('ui.projects.hydra.netSegments', {
        built: formatNumber(this.netMass / net.segmentMass, true, 3),
        max: formatNumber(net.maximumMass / net.segmentMass, true, 3)
      }),
      netCaptureElement: t('ui.projects.hydra.netCapture', {
        capture: formatNumber(this.isCompleted ? 0 : this.netCaptureRate, true, 3)
      }),
      netAttritionElement: t('ui.projects.hydra.netAttrition', {
        segments: formatNumber(this.isCompleted ? 0 : this.netAttritionRate / net.segmentMass, true, 3)
      })
    };
    for (const key in values) {
      if (elements[key].textContent !== values[key]) elements[key].textContent = values[key];
    }
  }

  initializeHydra() {
    const config = currentPlanetParameters.specialAttributes.hydra;
    // Older Hydra saves predate the restoration objective and started below capacity.
    if (!config.objective) {
      config.objective = { ...getSpecialSeedParameters('hydra').specialAttributes.hydra.objective };
      for (const id of HYDRA_CORE_IDS) {
        config.cores[id].maximumMass = config.cores[id].initialMass;
        if (this.coreMass) this.coreMass[id] = Math.min(this.coreMass[id], config.cores[id].maximumMass);
      }
    }
    // Saved worlds retain their parameter object across code updates.
    if (config.net.segmentMass === undefined) {
      const defaults = getSpecialSeedParameters('hydra').specialAttributes.hydra.net;
      config.net.segmentMass = defaults.segmentMass;
      config.net.shipBuildTonsPerSecond = defaults.shipBuildTonsPerSecond;
    }
    if (config.aether.researchOrbitalDisableAboveFraction === undefined) {
      config.aether.researchOrbitalDisableAboveFraction = getSpecialSeedParameters('hydra')
        .specialAttributes.hydra.aether.researchOrbitalDisableAboveFraction;
    }
    if (this.coreMass) return;
    this.coreMass = Object.fromEntries(HYDRA_CORE_IDS.map(id => [id, config.cores[id].initialMass]));
    this.outerAetherMass = this.coreMass.aether * config.aether.outerOrbitFraction;
    this.stellarFeedstock = config.aether.stellarFeedstockTons;
    this.baseCoreHeatFlux = terraforming.celestialParameters.coreHeatFlux;
    const distribution = hazardManager.kesslerHazard.getPeriapsisDistribution();
    const near = distribution.slice(0, terraformingParameters.hazards.kessler.periapsisSampleCount);
    const nearMass = near.reduce((sum, bin) => sum + bin.massTons, 0);
    this.aetherOrbitAltitude = nearMass > 0
      ? near.reduce((sum, bin) => sum + bin.periapsisMeters * bin.massTons, 0) / nearMass
      : terraformingParameters.hazards.kessler.distributionMeanMinimumMeters;
    this.aetherOrbitRadius = terraforming.celestialParameters.radius;
  }

  // Every continuous atmosphere/surface transfer joins the normal woven resource step.
  transferResource(core, category, key, amount, changes, seconds) {
    const resource = resources[category][key];
    const available = Math.max(0, resource.value + changes[category][key]);
    const applied = amount < 0 ? -Math.min(available, -amount) : amount;
    changes[category][key] += applied;
    resource.modifyRate(applied / seconds, `project:hydra:${core}`, 'project');
    if (applied > 0) resource.unlocked = true;
    return applied;
  }

  excavate(core, amount, changes, seconds, composition) {
    const removed = disposeDynamicWorldPlanetaryMass(terraforming, amount);
    resources.underground.planetaryMass.modifyRate(-removed / seconds, `project:hydra:${core}`, 'project');
    for (const category in composition) {
      for (const key in composition[category]) {
        this.transferResource(core, category, key, removed * composition[category][key], changes, seconds);
      }
    }
    return removed;
  }

  salvage(core, amount, changes, seconds) {
    const fraction = currentPlanetParameters.specialAttributes.hydra.debrisScrapFraction;
    this.transferResource(core, 'surface', 'scrapMetal', amount * fraction, changes, seconds);
    this.transferResource(core, 'surface', 'junk', amount * (1 - fraction), changes, seconds);
  }

  getEnvironment() {
    const config = currentPlanetParameters.specialAttributes.hydra;
    const land = resolveWorldGeometricLand(terraforming, resources.surface.land);
    const oceanCoverage = Math.min(1, config.oceanKeys.reduce(
      (sum, key) => sum + calculateAverageCoverage(terraforming, key), 0
    ));
    const mines = projectManager.projects.deeperMining;
    const mineCoverage = Math.min(1, buildings.oreMine.countNumber / Math.max(1, currentPlanetParameters.resources.underground.ore.maxDeposits));
    let playerLand = 0;
    for (const structure of [...Object.values(buildings), ...Object.values(colonies)]) {
      if (structure.requiresLand) playerLand += structure.activeNumber * structure.requiresLand;
    }
    return {
      land, oceanCoverage, temperature: terraforming.temperature.value,
      pressure: terraforming.atmosphericPressureCache.totalPressure,
      planetaryMass: getDynamicWorldCurrentPlanetaryMassKg(terraforming) / 1000,
      dugOutFraction: mines.averageDepth >= config.terra.dugOutMinimumDepth ? mineCoverage : 0,
      playerLandFraction: land > 0 ? playerLand / land : 0
    };
  }

  applyStructureAttrition(structure, key, fraction) {
    const loss = Math.min(structure.countNumber,
      structure.countNumber * fraction + (this.partialLosses[key] || 0));
    const whole = Math.floor(loss);
    this.partialLosses[key] = loss - whole;
    if (!whole) return { losses: 0, conversions: {} };
    return destroyStructuresWithSalvage(structure, normalizeBuildingCount(whole));
  }

  applyCounterattacks(seconds, env, strength, changes) {
    const config = currentPlanetParameters.specialAttributes.hydra;
    const aether = config.aether;
    const objective = config.objective;
    const pressureDeficit = Math.max(0, 1 - env.pressure / objective.pressurePa - objective.pressureToleranceFraction);
    const pressureExcess = Math.max(0, env.pressure / objective.pressurePa - 1 - objective.pressureToleranceFraction);
    const temperatureDeficit = Math.max(0, objective.temperatureK - env.temperature - objective.temperatureToleranceK);
    const otherStrength = HYDRA_CORE_IDS.filter(id => id !== 'aether')
      .reduce((sum, id) => sum + strength[id], 0) / (HYDRA_CORE_IDS.length - 1);
    const bombardment = otherStrength < aether.bombardmentSiblingFraction
      ? strength.aether * aether.buildingAttritionPerSecond : 0;
    const undermining = env.playerLandFraction >= config.terra.playerSurfaceTriggerFraction
      ? strength.terra : 0;
    const attackRate = bombardment + undermining * config.terra.buildingAttritionPerSecond;
    const attrition = 1 - Math.exp(-attackRate * seconds);
    if (attrition > 0) {
      const structureConversions = {};
      for (const [id, structure] of Object.entries(buildings)) {
        const destroyed = this.applyStructureAttrition(structure, `building:${id}`, attrition);
        mergeDebrisDiskConversions(structureConversions, destroyed.conversions);
      }
      for (const [id, structure] of Object.entries(colonies)) {
        if (id !== 'aerostat_colony') {
          const destroyed = this.applyStructureAttrition(structure, `colony:${id}`, attrition);
          mergeDebrisDiskConversions(structureConversions, destroyed.conversions);
        }
      }
      const resourceAttrition = calculateColonyResourceAttrition(seconds, attackRate, changes);
      mergeDebrisDiskConversions(resourceAttrition.conversions, structureConversions);
      for (const [core, share] of [['aether', bombardment / attackRate], ['terra', 1 - bombardment / attackRate]]) {
        if (!(share > 0)) continue;
        for (const [resource, loss] of Object.entries(resourceAttrition.losses)) {
          this.transferResource(core, 'colony', resource, -loss * share, changes, seconds);
        }
        for (const [category, conversions] of Object.entries(resourceAttrition.conversions)) {
          for (const [resource, amount] of Object.entries(conversions)) {
            this.transferResource(core, category, resource, amount * share, changes, seconds);
          }
        }
      }
    }
    if (strength.aero < config.aero.hackingBelowFraction) {
      const lost = this.applyStructureAttrition(colonies.aerostat_colony, 'aero:hacking',
        1 - Math.exp(-strength.aero * config.aero.hackingPerSecond * seconds)).losses;
      this.coreMass.aero += lost * config.aero.massPerAerostat;
    }
    const androidLoss = -this.transferResource('aqua', 'colony', 'androids',
      -resources.colony.androids.value * (1 - Math.exp(-strength.aqua * config.aqua.androidHackingPerSecond * seconds)), changes, seconds);
    this.coreMass.aqua += androidLoss * config.aqua.massPerAndroid;
    for (const project of Object.values(projectManager.projects)) {
      if (!(project.assignedSpaceships > 0) || !project.isActive) continue;
      const key = `ship:${project.name}`;
      const loss = project.assignedSpaceships * (1 - Math.exp(-strength.aether * aether.shipCapturePerSecond * seconds))
        + (this.partialLosses[key] || 0);
      const captured = Math.min(project.assignedSpaceships, Math.floor(loss));
      this.partialLosses[key] = loss - Math.floor(loss);
      project.assignedSpaceships -= captured;
      if (captured > 0) {
        this.transferResource('aether', 'special', 'orbitalDebris', captured * aether.massPerShip, changes, seconds);
        hazardManager.kesslerHazard.permanentlyCleared = false;
      }
    }
    if (undermining > 0) {
      const fraction = 1 - Math.exp(-undermining * config.terra.excavationAttritionPerSecond * seconds);
      const mines = projectManager.projects.deeperMining;
      mines.averageDepth = 1 + (mines.averageDepth - 1) * (1 - fraction);
      mines.isCompleted = false;
      mines.applyCompletionEffect();
      const expansion = projectManager.projects.undergroundExpansion;
      const lost = expansion.getTotalProgress() * fraction;
      const remaining = Math.max(0, expansion.getTotalProgress() - lost);
      expansion.repeatCount = Math.floor(remaining);
      expansion.fractionalRepeatCount = remaining - expansion.repeatCount;
      expansion.isCompleted = false;
      this.transferResource('terra', 'surface', 'land', -lost * expansion.getPerCompletionLand(), changes, seconds);
    }
    const totalMassKg = terraforming.celestialParameters.mass;
    if (totalMassKg > aether.fusionAvoidanceMassKg) {
      const atmosphere = Object.values(resources.atmospheric).reduce((sum, resource) => sum + resource.value, 0);
      const removed = Math.min(atmosphere, strength.aether * aether.strippingTonsPerSecond * seconds);
      if (atmosphere > 0) {
        for (const key in resources.atmospheric) {
          this.transferResource('aether', 'atmospheric', key, -removed * resources.atmospheric[key].value / atmosphere, changes, seconds);
        }
      }
    } else if (pressureDeficit > 0) {
      const amount = Math.min(this.stellarFeedstock, aether.starliftTonsPerSecond * strength.aether * seconds
        * pressureDeficit);
      this.stellarFeedstock -= amount;
      for (const key in aether.starliftComposition) {
        this.transferResource('aether', 'atmospheric', key, amount * aether.starliftComposition[key], changes, seconds);
      }
    }
    if (pressureExcess > 0 && strength.aero > 0) {
      const atmosphere = Object.entries(resources.atmospheric).map(([key, resource]) =>
        [key, Math.max(0, resource.value + changes.atmospheric[key])]);
      const total = atmosphere.reduce((sum, [, amount]) => sum + amount, 0);
      const removed = Math.min(total, config.aero.gasDisposalTonsPerSecond * strength.aero * pressureExcess * seconds);
      if (total > 0) {
        for (const [key, amount] of atmosphere) {
          this.transferResource('aero', 'atmospheric', key, -removed * amount / total, changes, seconds);
        }
      }
    }
    if (pressureDeficit > 0) {
      this.excavate('aqua', config.aqua.excavationTonsPerSecond * strength.aqua * seconds
        * pressureDeficit, changes, seconds, config.aqua.composition);
    }
    if (temperatureDeficit > 0) {
      this.excavate('ignis', config.ignis.emissionsTonsPerSecond * strength.ignis * seconds
        * (temperatureDeficit / objective.temperatureK), changes, seconds,
        { atmospheric: config.ignis.emissions });
    }
    if (pressureDeficit > 0) {
      this.excavate('terra', config.terra.ventTonsPerSecond * strength.terra * seconds
        * pressureDeficit, changes, seconds,
        { atmospheric: config.terra.ventComposition });
    }
    // Terra can add heat, but cannot actively refrigerate the planet.
    terraforming.celestialParameters.coreHeatFlux = this.baseCoreHeatFlux + strength.terra
      * Math.min(config.terra.maximumHeatFlux, temperatureDeficit * config.terra.heatFluxPerKelvin);
  }

  syncPenalties(env, strength) {
    const config = currentPlanetParameters.specialAttributes.hydra;
    const effect = { sourceId: HYDRA_SOURCE_ID, effectId: 'hydra-occupation', name: this.displayName };
    const researchLocked = this.coreMass.aether > config.cores.aether.maximumMass
      * config.aether.researchOrbitalDisableAboveFraction;
    const hasResearchLock = followersManager.activeEffects.some(entry =>
      entry.sourceId === HYDRA_SOURCE_ID && entry.effectId === 'hydra-research-orbitals');
    if (researchLocked !== hasResearchLock) {
      if (researchLocked) {
        followersManager.addAndReplace({ sourceId: HYDRA_SOURCE_ID,
          effectId: 'hydra-research-orbitals', type: 'booleanFlag',
          flagId: 'disableResearchOrbitals', value: true });
      } else {
        followersManager.removeEffect({ sourceId: HYDRA_SOURCE_ID });
      }
      followersManager.markUIDirty();
    }
    colonies.aerostat_colony.addAndReplace({ ...effect, type: 'aerostatCapacityMultiplier',
      value: 1 - config.aero.occupiedAerostatFraction * strength.aero });
    nanotechManager.addAndReplace({ sourceId: HYDRA_SOURCE_ID, effectId: 'hydra-ignis-nanocolony-cap',
      name: t('ui.projects.hydra.rateSources.ignis'), type: 'nanobotDensityMultiplier',
      value: Math.max(0, 1 - this.coreMass.ignis / config.cores.ignis.maximumMass
        / config.ignis.nanocolonyCapRecoveryBelowFraction) });
    nanotechManager.syncNanobotsResource();
    nanotechManager.markUIDirty();
    applyAerostatProtectedMaintenancePenalty(1 + (config.ignis.maintenanceMultiplier - 1)
      * Math.min(1, this.coreMass.ignis / config.cores.ignis.maximumMass), {
      sourceId: HYDRA_SOURCE_ID, effectId: 'hydra-ignis-maintenance',
      name: t('ui.projects.hydra.rateSources.ignis') });
    for (const structure of [...Object.values(buildings), ...Object.values(colonies)]) {
      for (const [category, costs] of Object.entries(structure.cost)) {
        structure.addAndReplace({ sourceId: HYDRA_SOURCE_ID,
          effectId: `hydra-ignis-build-cost-${category}`, name: t('ui.projects.hydra.rateSources.ignis'),
          type: 'resourceCostMultiplier', resourceCategory: category, resourceId: Object.keys(costs),
          value: 1 + (config.ignis.buildCostMultiplier - 1) * strength.ignis });
      }
    }
    for (const id of ['deeperMining', 'undergroundExpansion']) {
      projectManager.projects[id].addAndReplace({ ...effect, type: 'projectDurationMultiplier',
        value: 1 + strength.terra * (config.terra.excavationDurationMultiplier - 1) });
    }
    for (const project of Object.values(projectManager.projects)) {
      if (project.kesslerDebrisSize) {
        project.addAndReplace({ ...effect, type: 'projectDurationMultiplier',
          value: 1 + strength.aether * (config.aether.orbitalProjectDurationMultiplier - 1) });
      }
    }
    hazardManager.setHazardLandReservationShare('hydra', strength.aqua > 0 ? env.oceanCoverage : 0);
    const underground = projectManager.projects.undergroundExpansion;
    resources.surface.land.setReservedAmountForSource('hydra:ignis',
      underground.getTotalProgress() * underground.getPerCompletionLand()
      * config.ignis.maximumLandFraction * strength.ignis);
  }

  clearHydraEffects() {
    nanotechManager.removeEffect({ sourceId: HYDRA_SOURCE_ID });
    nanotechManager.syncNanobotsResource();
    nanotechManager.markUIDirty();
    for (const structure of [...Object.values(buildings), ...Object.values(colonies)]) {
      structure.removeEffect({ sourceId: HYDRA_SOURCE_ID });
    }
    followersManager.removeEffect({ sourceId: HYDRA_SOURCE_ID });
    followersManager.markUIDirty();
    colonies.aerostat_colony.removeEffect({ sourceId: HYDRA_SOURCE_ID });
    for (const project of Object.values(projectManager.projects)) {
      project.removeEffect({ sourceId: HYDRA_SOURCE_ID });
    }
    hazardManager.setHazardLandReservationShare('hydra', 0);
    resources.surface.land.setReservedAmountForSource('hydra:ignis', 0);
    if (this.coreMass) terraforming.celestialParameters.coreHeatFlux = this.baseCoreHeatFlux;
  }

  cleanupForReset() { if (this.coreMass) this.clearHydraEffects(); }

  getResourceExecutionDeltaTime(deltaTime) { return deltaTime; }

  getCostRateLabel() {
    return registerRateSource('project:hydra:net', t('ui.projects.hydra.rateSources.net'));
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, changes = null) {
    return super.estimateProjectCostAndGain(
      Project.prototype.getResourceExecutionDeltaTime.call(this, deltaTime), applyRates, productivity, changes);
  }

  applyCostAndGain(deltaTime, changes, productivity = 1) {
    if (!this.unlocked || isEquilibrating || !(deltaTime > 0)) return;
    const config = currentPlanetParameters.specialAttributes.hydra;
    const seconds = deltaTime / 1000;
    const laser = buildings.laserCannon;
    const laserStrength = laser.activeNumber * laser.productivity * laser.getEffectiveProductionMultiplier()
      * laser.getEffectiveResourceProductionMultiplier('special', 'orbitalDebris');
    this.transferResource('aether', 'special', 'orbitalDebris', -laserStrength * config.aether.laserDebrisTonsPerSecond * seconds, changes, seconds);
    this.netCaptureRate = 0;
    this.netAttritionRate = 0;
    if (this.isCompleted) return;
    this.initializeHydra();
    const env = this.getEnvironment();
    const before = { ...this.coreMass };
    const strength = Object.fromEntries(HYDRA_CORE_IDS.map(id => [id,
      Math.min(1, this.coreMass[id] / config.cores[id].initialMass)]));
    const suitability = {
      aether: 1,
      aero: Math.min(1, env.pressure / config.aero.minimumPressurePa),
      aqua: Math.min(1, env.oceanCoverage / config.aqua.minimumOceanCoverage),
      ignis: env.temperature <= config.objective.temperatureK
        ? Math.max(0, Math.min(1, (env.temperature + config.objective.temperatureToleranceK - config.ignis.coldTemperatureK) / (config.objective.temperatureK - config.ignis.coldTemperatureK)))
        : Math.max(0, Math.min(1, (config.ignis.hotTemperatureK - env.temperature + config.objective.temperatureToleranceK) / (config.ignis.hotTemperatureK - config.objective.temperatureK))),
      terra: env.planetaryMass <= config.terra.depletedMassTons ? 0 : 1 - env.dugOutFraction
    };
    super.applyCostAndGain(Project.prototype.getResourceExecutionDeltaTime.call(this, deltaTime), changes, productivity);
    const laserLoss = laserStrength * config.aether.laserTonsPerSecond * seconds;
    const outerLaserLoss = this.coreMass.aether > 0
      ? Math.min(this.coreMass.aether, laserLoss) * this.outerAetherMass / this.coreMass.aether : 0;
    this.outerAetherMass = Math.max(0, this.outerAetherMass - outerLaserLoss);
    const altitude = Math.max(0, this.aetherOrbitAltitude + (this.aetherOrbitRadius - terraforming.celestialParameters.radius) * 1000);
    const density = getAtmosphericDensityModel(terraforming).getDensity(altitude);
    const dragRate = config.aether.dragPerSecond * Math.min(1, Math.max(0, density - config.objective.orbitalDensityKgPerM3 * (1 + config.objective.orbitalDensityToleranceFraction)) / config.aether.dragDensityReference);
    const nearMass = Math.max(0, this.coreMass.aether - this.outerAetherMass - outerLaserLoss);
    const capture = Math.min(this.coreMass.aero, this.netMass * config.net.captureTonsPerTonPerSecond * seconds,
      config.net.attritionTonsPerCapturedTon > 0 ? this.netMass / config.net.attritionTonsPerCapturedTon : Infinity);
    const attrition = capture * config.net.attritionTonsPerCapturedTon;
    this.netMass = Math.max(0, this.netMass - attrition);
    this.netCaptureRate = capture / seconds;
    this.netAttritionRate = attrition / seconds;
    const loss = {
      aether: laserLoss + Math.min(Math.max(0, this.coreMass.aether - laserLoss), nearMass * dragRate * seconds),
      aero: capture + config.cores.aero.maximumMass * config.aero.collapsePerSecond * (1 - suitability.aero) * seconds,
      aqua: config.cores.aqua.maximumMass * config.aqua.exposurePerSecond * (1 - suitability.aqua) * seconds,
      ignis: resources.special.crusaders.value * config.ignis.crusaderTonsPerSecond * seconds
        + config.cores.ignis.maximumMass * (env.temperature < config.objective.temperatureK
          ? config.ignis.coldSuppressionPerSecond : config.ignis.hotSuppressionPerSecond) * (1 - suitability.ignis) * seconds,
      terra: config.cores.terra.maximumMass * config.terra.dugOutSuppressionPerSecond * (1 - suitability.terra) * seconds
    };
    const growth = {};
    const repairs = {};
    // Repair current damage in the same step; donors share the remaining capacity.
    const repairCapacity = Object.fromEntries(HYDRA_CORE_IDS.map(id =>
      [id, Math.max(0, config.cores[id].maximumMass - this.coreMass[id] + loss[id])]));
    for (const id of HYDRA_CORE_IDS) {
      const core = config.cores[id];
      const replenishment = this.coreMass[id] * core.growthPerSecond * suitability[id] * seconds;
      const requested = Math.min(repairCapacity[id], replenishment);
      repairs[id] = Object.fromEntries(HYDRA_CORE_IDS.filter(other => other !== id).map(other => [other,
        Math.min(repairCapacity[other], replenishment * config.siblingSupportFraction)]));
      const material = requested + Object.values(repairs[id]).reduce((sum, value) => sum + value, 0);
      let supplied = 0;
      if (id === 'aether') {
        supplied = -this.transferResource(id, 'special', 'orbitalDebris', -material, changes, seconds);
        const stellarRepair = Math.min(material - supplied, material * config.aether.stellarRepairFraction,
          this.stellarFeedstock);
        this.stellarFeedstock -= stellarRepair;
        supplied += stellarRepair;
      } else if (id === 'aero') {
        const feedstocks = Object.entries(config.aero.carbonFeedstocks).map(([key, recipe]) => ({
          key, recipe, available: Math.max(0, resources.atmospheric[key].value + changes.atmospheric[key])
        }));
        const availableCarbon = feedstocks.reduce((sum, stock) =>
          sum + stock.available * stock.recipe.carbonFraction, 0);
        const consumedFraction = availableCarbon > 0 ? Math.min(1, material / availableCarbon) : 0;
        for (const { key, recipe, available } of feedstocks) {
          const extracted = -this.transferResource(id, 'atmospheric', key,
            -available * consumedFraction, changes, seconds);
          this.transferResource(id, 'atmospheric', recipe.byproduct,
            extracted * (1 - recipe.carbonFraction), changes, seconds);
          supplied += extracted * recipe.carbonFraction;
        }
      } else if (id === 'ignis') {
        for (const key of ['scrapMetal', 'junk']) {
          supplied -= this.transferResource(id, 'surface', key, -Math.max(0, material - supplied), changes, seconds);
        }
        supplied += this.excavate(id, Math.min(Math.max(0, material - supplied),
          config.ignis.miningTonsPerSecond * suitability.ignis * seconds), changes, seconds, {});
      } else {
        const miningRate = id === 'aqua' ? config.aqua.excavationTonsPerSecond : config.terra.miningTonsPerSecond;
        supplied = this.excavate(id, Math.min(material, miningRate * suitability[id] * seconds), changes, seconds, {});
      }
      const suppliedFraction = material > 0 ? supplied / material : 0;
      growth[id] = requested * suppliedFraction;
      repairCapacity[id] = Math.max(0, repairCapacity[id] - growth[id]);
      for (const other in repairs[id]) {
        repairs[id][other] *= suppliedFraction;
        repairCapacity[other] = Math.max(0, repairCapacity[other] - repairs[id][other]);
      }
    }
    this.applyCounterattacks(seconds, env, strength, changes);
    for (const id of HYDRA_CORE_IDS) {
      const support = HYDRA_CORE_IDS.filter(other => other !== id)
        .reduce((sum, other) => sum + repairs[other][id], 0);
      const core = config.cores[id];
      // Environmental attrition can exhaust these cores, including incoming repairs.
      if (id === 'aero' || id === 'aqua' || id === 'ignis' || id === 'terra') loss[id] = Math.min(loss[id], this.coreMass[id] + growth[id] + support);
      const destroyedMass = Math.min(loss[id], this.coreMass[id] + growth[id] + support);
      this.coreMass[id] = Math.max(0, Math.min(core.maximumMass, this.coreMass[id] + growth[id] + support - loss[id]));
      if (id === 'aether') {
        this.outerAetherMass = Math.min(this.coreMass.aether,
          this.outerAetherMass + (growth[id] + support) * config.aether.outerOrbitFraction);
      }
      this.rates[id] = { growth: growth[id] / seconds, support: support / seconds,
        loss: destroyedMass / seconds, net: (this.coreMass[id] - before[id]) / seconds };
      this.salvage(id, destroyedMass, changes, seconds);
    }
    this.salvage('net', attrition, changes, seconds);
    if (HYDRA_CORE_IDS.every(id => this.coreMass[id] === 0)) {
      this.isCompleted = true;
      this.autoStart = false;
      this.isActive = false;
      this.isPaused = false;
      this.autoAssignSpaceships = false;
      this.assignSpaceships(-this.assignedSpaceships);
      this.clearHydraEffects();
      projectManager.markUIDirty();
    } else {
      this.syncPenalties(env, Object.fromEntries(HYDRA_CORE_IDS.map(id => [id,
        Math.min(1, this.coreMass[id] / config.cores[id].initialMass)])));
    }
  }

  getThresholdState(core, value, threshold, active, enabled = true, allowWaking = true) {
    if (this.isCompleted || this.coreMass[core] === 0 || !enabled) return 'dormant';
    if (active) return 'active';
    if (!allowWaking) return 'dormant';
    return Math.abs(value - threshold) <= Math.abs(threshold) * 0.25 ? 'waking' : 'dormant';
  }

  renderUI(container) {
    const panel = document.createElement('div');
    panel.className = 'hydra-panel';
    const summary = document.createElement('p');
    summary.className = 'hydra-objective';
    const supplies = document.createElement('p');
    supplies.className = 'hydra-supplies';
    const objective = document.createElement('p');
    objective.className = 'hydra-targets';
    const grid = document.createElement('div');
    grid.className = 'hydra-core-grid';
    const rows = {};
    panel.append(summary, objective, supplies, grid);
    for (const id of HYDRA_CORE_IDS) {
      const card = document.createElement('section');
      card.className = `hydra-core hydra-core-${id}`;
      const heading = document.createElement('h3');
      const name = document.createElement('span');
      heading.append(name);
      const health = document.createElement('span');
      health.className = 'hydra-health';
      heading.append(health);
      const bar = document.createElement('div');
      bar.className = 'hydra-hp-track';
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      const fill = document.createElement('div');
      fill.className = 'hydra-hp-fill';
      bar.append(fill);
      const mass = document.createElement('div');
      mass.className = 'hydra-mass';
      const rates = document.createElement('div');
      rates.className = 'hydra-rates';
      const abilitiesLabel = document.createElement('h4');
      const abilities = document.createElement('ul');
      abilities.className = 'hydra-detail-list';
      const penaltiesLabel = document.createElement('h4');
      const penalties = document.createElement('ul');
      penalties.className = 'hydra-detail-list';
      const details = {};
      for (const group of ['abilities', 'penalties']) {
        details[group] = {};
        for (const key of HYDRA_CORE_DETAILS[id][group]) {
          const item = document.createElement('li');
          const text = document.createElement('span');
          const state = document.createElement('span');
          state.className = 'hydra-detail-state';
          state.hidden = true;
          item.append(text, state);
          (group === 'abilities' ? abilities : penalties).append(item);
          details[group][key] = { text, state };
        }
      }
      const tacticsLabel = document.createElement('h4');
      const tactics = document.createElement('p');
      tactics.className = 'hydra-tactics';
      card.append(heading, bar, mass, rates, abilitiesLabel, abilities, penaltiesLabel, penalties, tacticsLabel, tactics);
      grid.append(card);
      rows[id] = { name, health, bar, fill, mass, rates, abilitiesLabel, penaltiesLabel, tacticsLabel, tactics, details };
    }
    const netPanel = document.createElement('section');
    netPanel.className = 'hydra-net';
    const netTitle = document.createElement('h3');
    const netHelp = document.createElement('p');
    const top = document.createElement('div');
    top.className = 'project-top-section';
    this.createSpaceshipAssignmentUI(top);
    SpaceshipProject.prototype.createProjectDetailsGridUI.call(this, top);
    const elements = projectElements[this.name];
    elements.costPerShipElement.hidden = true;
    elements.resourceGainPerShipElement.hidden = true;
    elements.spaceAccessStatusElement.hidden = true;
    const segments = document.createElement('div');
    const capture = document.createElement('div');
    const attrition = document.createElement('div');
    elements.totalGainElement.parentElement.append(segments, capture, attrition);
    elements.segmentProgressElement = segments;
    elements.netCaptureElement = capture;
    elements.netAttritionElement = attrition;
    netPanel.append(netTitle, netHelp, top);
    panel.append(netPanel);
    container.append(panel);
    this.ui = { panel, summary, objective, supplies, rows, netTitle, netHelp };
    this.updateUI();
  }

  updateUI() {
    if (!this.ui || !projectManager.isProjectRelevantToCurrentPlanet(this)) return;
    this.initializeHydra();
    const config = currentPlanetParameters.specialAttributes.hydra;
    const ui = this.ui;
    const env = this.getEnvironment();
    const strength = Object.fromEntries(HYDRA_CORE_IDS.map(id =>
      [id, Math.min(1, this.coreMass[id] / config.cores[id].initialMass)]));
    const siblingStrength = HYDRA_CORE_IDS.filter(id => id !== 'aether')
      .reduce((sum, id) => sum + strength[id], 0) / (HYDRA_CORE_IDS.length - 1);
    const pressureThreshold = config.objective.pressurePa * (1 - config.objective.pressureToleranceFraction);
    const temperatureThreshold = config.objective.temperatureK - config.objective.temperatureToleranceK;
    const pressureTriggered = Math.max(0, 1 - env.pressure / config.objective.pressurePa
      - config.objective.pressureToleranceFraction) > 0;
    const temperatureTriggered = env.temperature < temperatureThreshold;
    const fusionMass = terraforming.celestialParameters.mass;
    const states = {
      aether: {
        imports: this.getThresholdState('aether', env.pressure, pressureThreshold, pressureTriggered,
          fusionMass <= config.aether.fusionAvoidanceMassKg && this.stellarFeedstock > 0, false),
        stripping: this.getThresholdState('aether', fusionMass, config.aether.fusionAvoidanceMassKg,
          fusionMass > config.aether.fusionAvoidanceMassKg),
        research: this.getThresholdState('aether', this.coreMass.aether / config.cores.aether.maximumMass,
          config.aether.researchOrbitalDisableAboveFraction,
          this.coreMass.aether > config.cores.aether.maximumMass * config.aether.researchOrbitalDisableAboveFraction),
        bombardment: this.getThresholdState('aether', siblingStrength, config.aether.bombardmentSiblingFraction,
          siblingStrength < config.aether.bombardmentSiblingFraction)
      },
      aero: {
        disposal: this.getThresholdState('aero', env.pressure,
          config.objective.pressurePa * (1 + config.objective.pressureToleranceFraction),
          Math.max(0, env.pressure / config.objective.pressurePa - 1 - config.objective.pressureToleranceFraction) > 0,
          true, false),
        hacking: this.getThresholdState('aero', strength.aero, config.aero.hackingBelowFraction,
          strength.aero < config.aero.hackingBelowFraction)
      },
      aqua: { excavation: this.getThresholdState('aqua', env.pressure, pressureThreshold, pressureTriggered, true, false) },
      ignis: { emissions: this.getThresholdState('ignis', env.temperature, temperatureThreshold, temperatureTriggered, true, false) },
      terra: {
        heat: this.getThresholdState('terra', env.temperature, temperatureThreshold, temperatureTriggered, true, false),
        venting: this.getThresholdState('terra', env.pressure, pressureThreshold, pressureTriggered, true, false),
        attacks: this.getThresholdState('terra', env.playerLandFraction, config.terra.playerSurfaceTriggerFraction,
          env.playerLandFraction >= config.terra.playerSurfaceTriggerFraction)
      }
    };
    const detailVars = {
      pressureThreshold: formatNumber(pressureThreshold / 1e6, true),
      disposalPressureThreshold: formatNumber(config.objective.pressurePa
        * (1 + config.objective.pressureToleranceFraction) / 1e6, true),
      temperatureThreshold: formatNumber(temperatureThreshold, true),
      fusionMass: formatNumber(config.aether.fusionAvoidanceMassKg / 1000, true),
      orbitalThreshold: formatNumber(config.aether.researchOrbitalDisableAboveFraction * 100, true),
      stellarRepairPercent: formatNumber(config.aether.stellarRepairFraction * 100, true),
      siblingThreshold: formatNumber(config.aether.bombardmentSiblingFraction * 100, true),
      hackingThreshold: formatNumber(config.aero.hackingBelowFraction * 100, true),
      surfaceThreshold: formatNumber(config.terra.playerSurfaceTriggerFraction * 100, true),
      orbitalSlow: formatNumber(1 + (config.aether.orbitalProjectDurationMultiplier - 1) * strength.aether, true),
      occupied: formatNumber(config.aero.occupiedAerostatFraction * 100 * strength.aero, true),
      oceanOccupied: formatNumber(this.coreMass.aqua > 0 ? env.oceanCoverage * 100 : 0, true),
      landOccupied: formatNumber(config.ignis.maximumLandFraction * 100 * strength.ignis, true),
      buildCostPenalty: formatNumber((config.ignis.buildCostMultiplier - 1) * 100 * strength.ignis, true),
      ignisMaintenanceMultiplier: formatNumber(1 + (config.ignis.maintenanceMultiplier - 1)
        * Math.min(1, this.coreMass.ignis / config.cores.ignis.maximumMass), true),
      nanocolonyCapPercent: formatNumber(100 * Math.max(0, 1 - this.coreMass.ignis
        / config.cores.ignis.maximumMass / config.ignis.nanocolonyCapRecoveryBelowFraction), true),
      nanocolonyRecoveryThreshold: formatNumber(100 * config.ignis.nanocolonyCapRecoveryBelowFraction, true),
      slow: formatNumber(1 + (config.terra.excavationDurationMultiplier - 1) * strength.terra, true)
    };
    const text = t(this.isCompleted ? 'ui.projects.hydra.victory' : 'ui.projects.hydra.summary');
    if (ui.summary.textContent !== text) ui.summary.textContent = text;
    const objective = t('ui.projects.hydra.objective', {
      temperature: formatNumber(config.objective.temperatureK, true),
      pressure: formatNumber(config.objective.pressurePa / 1e6, true)
    });
    if (ui.objective.textContent !== objective) ui.objective.textContent = objective;
    for (const key of ['netTitle', 'netHelp']) {
      const value = t(`ui.projects.hydra.${key}`);
      if (ui[key].textContent !== value) ui[key].textContent = value;
    }
    const chances = hazardManager.kesslerHazard.getProjectFailureChances();
    const supplies = t('ui.projects.hydra.supplies', { debris: formatNumber(resources.special.orbitalDebris.value, true),
      small: formatNumber(chances.smallFailure * 100, true), large: formatNumber(chances.largeFailure * 100, true) });
    if (ui.supplies.textContent !== supplies) ui.supplies.textContent = supplies;
    for (const id of HYDRA_CORE_IDS) {
      const rate = this.rates[id] || { growth: 0, support: 0, loss: 0 };
      const percent = Math.min(100, 100 * this.coreMass[id] / config.cores[id].maximumMass);
      const row = ui.rows[id];
      const width = `${percent.toFixed(3)}%`;
      if (row.fill.style.width !== width) row.fill.style.width = width;
      const accessibleValue = percent.toFixed(1);
      if (row.bar.getAttribute('aria-valuenow') !== accessibleValue) row.bar.setAttribute('aria-valuenow', accessibleValue);
      const barLabel = t(`ui.projects.hydra.cores.${id}.name`);
      if (row.bar.getAttribute('aria-label') !== barLabel) row.bar.setAttribute('aria-label', barLabel);
      const values = {
        health: t('ui.projects.hydra.health', { percent: formatNumber(Number(accessibleValue), true) }),
        abilitiesLabel: t('ui.projects.hydra.abilities'),
        penaltiesLabel: t('ui.projects.hydra.penalties'),
        tacticsLabel: t('ui.projects.hydra.countermeasures'),
        name: t(`ui.projects.hydra.cores.${id}.name`),
        mass: t('ui.projects.hydra.mass', { mass: formatNumber(this.coreMass[id], true) }),
        rates: t('ui.projects.hydra.rates', { growth: formatNumber(rate.growth, true), support: formatNumber(rate.support, true), loss: formatNumber(rate.loss, true) }),
        tactics: t(`ui.projects.hydra.cores.${id}.tactics`, {
          dugOutDepth: formatNumber(config.terra.dugOutMinimumDepth, true),
          pressure: formatNumber(config.aero.minimumPressurePa, true),
          cold: formatNumber(config.ignis.coldTemperatureK, true), hot: formatNumber(config.ignis.hotTemperatureK, true),
          ocean: formatNumber(config.aqua.minimumOceanCoverage * 100, true),
          currentOcean: formatNumber(env.oceanCoverage * 100, true)
        })
      };
      for (const key in values) if (ui.rows[id][key].textContent !== values[key]) ui.rows[id][key].textContent = values[key];
      for (const group of ['abilities', 'penalties']) {
        for (const key of HYDRA_CORE_DETAILS[id][group]) {
          const detail = row.details[group][key];
          const text = t(`ui.projects.hydra.cores.${id}.${group}.${key}`, detailVars);
          if (detail.text.textContent !== text) detail.text.textContent = text;
          const state = states[id][key];
          const hidden = state === undefined;
          if (detail.state.hidden !== hidden) detail.state.hidden = hidden;
          if (!hidden) {
            const label = t(`ui.projects.hydra.states.${state}`);
            if (detail.state.textContent !== label) detail.state.textContent = label;
            if (detail.state.dataset.state !== state) detail.state.dataset.state = state;
          }
        }
      }
    }
    super.updateUI();
    projectElements[this.name].autoAssignCheckbox.disabled = this.isCompleted;
  }

  saveState() {
    return { ...super.saveState(), coreMass: this.coreMass && { ...this.coreMass },
      netMass: this.netMass, netControlsVersion: 2,
      weaveNet: this.autoStart, netBuilding: this.isActive,
      stellarFeedstock: this.stellarFeedstock,
      outerAetherMass: this.outerAetherMass, aetherOrbitAltitude: this.aetherOrbitAltitude,
      aetherOrbitRadius: this.aetherOrbitRadius, baseCoreHeatFlux: this.baseCoreHeatFlux,
      partialLosses: { ...this.partialLosses } };
  }

  loadState(state) {
    this.netCaptureRate = 0;
    this.netAttritionRate = 0;
    if (projectManager.isProjectRelevantToCurrentPlanet(this)) {
      currentPlanetParameters.specialAttributes.hydra = cloneSpecialSeedValue(getSpecialSeedParameters('hydra').specialAttributes.hydra);
    }
    super.loadState(state);
    if (state.coreMass) {
      this.coreMass = { ...state.coreMass };
      this.netMass = state.netMass;
      // Native project state wins in new saves, including automation/travel overrides.
      if (state.netControlsVersion === undefined) {
        if (state.weaveNet !== undefined) this.autoStart = state.weaveNet;
        if (state.netBuilding !== undefined || state.weaveNet !== undefined) {
          this.isActive = state.netBuilding ?? state.weaveNet;
          this.isPaused = false;
        }
      }
      this.stellarFeedstock = state.stellarFeedstock;
      this.outerAetherMass = state.outerAetherMass;
      this.aetherOrbitAltitude = state.aetherOrbitAltitude;
      this.aetherOrbitRadius = state.aetherOrbitRadius;
      this.baseCoreHeatFlux = state.baseCoreHeatFlux;
      this.partialLosses = { ...state.partialLosses };
      if (this.isCompleted) {
        this.isActive = false;
        this.isPaused = false;
        this.autoStart = false;
      }
      if (state.netControlsVersion !== 2 && !this.isCompleted) {
        // Streamed builds did not prepay a timed segment; restart through the shared lifecycle.
        this.isActive = false;
        this.isPaused = false;
        this.segmentProgress = 0;
        this.remainingTime = this.getEffectiveDuration();
        this.startingDuration = this.remainingTime;
      }
      this.updateDurationFromEffects();
    }
  }
}
window.HydraProject = HydraProject;
