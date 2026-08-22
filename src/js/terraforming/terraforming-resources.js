registerTerraformingMethods('resources', ({
  TERRAFORMING_AEROBRAKING_PARAMETERS,
  TERRAFORMING_OXIDATION_PARAMETERS,
  ammoniaCycle,
  applyAtmosphericChemistryRates,
  buildAtmosphereContext,
  co2Cycle,
  hydrogenCycle,
  methaneCycle,
  nitrogenCycle,
  oxygenCycle,
  runAtmosphericChemistry,
  waterCycle
}) => ({
  recalculateResourceRateTotals() {
    for (const category in this.resources) {
      const categoryResources = this.resources[category];
      for (const resourceName in categoryResources) {
        const resource = categoryResources[resourceName];
        if (resource && typeof resource.recalculateTotalRates === 'function') {
          resource.recalculateTotalRates();
        }
      }
    }
  },
  resetStandaloneTerraformingRateState() {
    for (const category in this.resources) {
      const categoryResources = this.resources[category];
      for (const resourceName in categoryResources) {
        const resource = categoryResources[resourceName];
        if (!resource) {
          continue;
        }
        if (resource.productionRateByType?.terraforming) {
          delete resource.productionRateByType.terraforming;
        }
        if (resource.consumptionRateByType?.terraforming) {
          delete resource.consumptionRateByType.terraforming;
        }
      }
    }
    for (const key in this) {
      if (typeof this[key] !== 'number') {
        continue;
      }
      if ((key.startsWith('total') || key.startsWith('flow') || key.startsWith('focus')) && key.endsWith('Rate')) {
        this[key] = 0;
      }
    }
    this.recalculateResourceRateTotals();
  },
  runResourceUpdateStep(deltaTime) {
    const durationSeconds = 86400 * deltaTime / 1000; // 1 in-game second equals one day
    const realSeconds = deltaTime / 1000;
    const stellarEvolutionState = getStellarEvolutionState(this, currentPlanetParameters);
    if (
      durationSeconds <= 0
      || this.isBooleanFlagSet('ringworldLowGravityTerraforming')
      || stellarEvolutionState.stage === 'star'
    ) {
      if (stellarEvolutionState.stage === 'star') {
        this.temperature.combustionWarmingRateKPerDay = 0;
        this.resetStandaloneTerraformingRateState();
      }
      return {
        durationSeconds,
        realSeconds,
        cycleResults: [],
        chemTotals: {
          changes: {},
          processChanges: {}
        }
      };
    }
    const zones = getZones();
    const gravity = this.celestialParameters.gravity;
    const {
      totalPressure: globalTotalPressurePa,
      pressureByKey: cyclePressureByKey,
      availableByKey: cycleAvailableByKey
    } = this.atmosphericPressureCache;
    if (!this.cycles) {
      this.cycles = [waterCycle, hydrogenCycle, methaneCycle, co2Cycle, ammoniaCycle, oxygenCycle, nitrogenCycle];
    }
    const focusedMeltAmount = gameSettings.phaseChangeHeat ? applyFocusedMelt(this, this.resources, durationSeconds) : 0;
    const phaseStartingTemperatures = {};
    for (const zone of zones) {
      phaseStartingTemperatures[zone] = this.temperature.zones[zone].value;
    }
    const cycleResults = [];
    for (const cycle of this.cycles) {
      const params = {
        atmPressure: globalTotalPressurePa,
        vaporPressure: cyclePressureByKey[cycle.atmKey] || 0,
        available: cycleAvailableByKey[cycle.atmKey] || 0,
        durationSeconds,
        phaseChangeHeatEnabled: gameSettings.phaseChangeHeat,
        phaseStartingTemperatures,
        extraParams: cycle.getExtraParams ? cycle.getExtraParams(this) : {}
      };
      const totals = cycle.runCycle(this, zones, params);
      if (totals.phaseHeat) {
        this.accumulatePhaseChangeHeat(totals.phaseHeat);
        for (const zone of zones) {
          const result = totals.phaseHeat.byZone[zone];
          if (result) {
            phaseStartingTemperatures[zone] = result.finalTemperatureK;
          }
        }
      }
      if (cycle === waterCycle && gameSettings.phaseChangeHeat) {
        totals.focusedMelt = focusedMeltAmount;
      }
      const delta = totals.totalAtmosphericChange || 0;
      const atmRes = this.resources.atmospheric[cycle.atmKey];
      if (atmRes) {
        atmRes.value = Math.max(0, atmRes.value + delta);
      }
      cycleResults.push({
        cycle,
        totals
      });
    }
    const chemistryAtmosphereContext = buildAtmosphereContext(this.resources.atmospheric, gravity, this.celestialParameters.radius, this.celestialParameters.surfaceArea);
    const chemTotals = runAtmosphericChemistry(this.resources, {
      pressureByKey: chemistryAtmosphereContext.pressureByKey,
      availableByKey: chemistryAtmosphereContext.availableByKey,
      realSeconds,
      durationSeconds,
      surfaceArea: this.celestialParameters.surfaceArea,
      surfaceTemperatureK: this.temperature.value,
      waterCloudActivity: this.luminosity.waterCloudActivity,
      gravity,
      solarFlux: this.luminosity.modifiedSolarFlux,
      atmosphericPressurePa: chemistryAtmosphereContext.totalPressure,
      hydrogenEscapeMultiplier: projectManager?.projects?.artificialSky?.isCompleted ? 0 : 1,
      applyRates: false
    });
    const chemSurfaceChanges = {};
    for (const [key, delta] of Object.entries(chemTotals.changes)) {
      if (!delta) continue;
      const atmosphericRes = this.resources.atmospheric[key];
      if (atmosphericRes) {
        atmosphericRes.value = Math.max(0, atmosphericRes.value + delta);
        continue;
      }
      const surfaceRes = this.resources.surface[key];
      if (surfaceRes) {
        chemSurfaceChanges[key] = (chemSurfaceChanges[key] || 0) + delta;
      }
    }
    this.distributeSurfaceChangesToZones(chemSurfaceChanges);
    const temperatureBeforeCombustionK = this.temperature.value;
    chemTotals.climateHeatDepositedJ = this.applyAtmosphericChemistryHeat(chemTotals.climateHeatEnergyJ);
    const combustionTemperatureIncreaseK = Math.max(0, this.temperature.value - temperatureBeforeCombustionK);
    this.temperature.combustionWarmingRateKPerDay = durationSeconds > 0 ? combustionTemperatureIncreaseK * TERRAFORMING_OXIDATION_PARAMETERS.combustionSpringSecondsPerDay / durationSeconds : 0;
    this.synchronizeGlobalResources();
    this.refreshDynamicWorldGeometry();
    this._updateZonalCoverageCache();
    this._updateAtmosphericPressureCache();
    this.updateLuminosity();
    return {
      durationSeconds,
      realSeconds,
      cycleResults,
      chemTotals
    };
  },
  updateResources(deltaTime, options = {}) {
    if (options.refreshStandaloneRates) {
      this.resetStandaloneTerraformingRateState();
    }
    const stepDurations = this.getSubstepDurations(deltaTime, options);
    if (stepDurations.length === 0) {
      this.update(deltaTime, options, stepDurations);
      return;
    }

    // Structures calculate once per logic tick; weave their climate-facing resource
    // changes through the fixed physics steps so outer frame grouping is irrelevant.
    const accumulatedChanges = options.accumulatedChanges;
    const wovenAtmosphericChanges = {};
    const wovenSurfaceChanges = {};
    const zonalSurfaceTransfers = options.accumulatedSpecialChanges?.zonalSurfaceTransfers || [];
    const aerobrakingHeatEnergyJ = options.accumulatedSpecialChanges?.aerobrakingHeatEnergyJ || 0;
    for (const transfer of zonalSurfaceTransfers) {
      transfer.surfaceKeys = this.zonalSurfaceResourceConfigs.find(config => config.name === transfer.input.resource).keys;
    }
    let wovenAlbedoChange = 0;
    if (accumulatedChanges) {
      for (const resourceName in this.resources.atmospheric) {
        const amount = accumulatedChanges.atmospheric[resourceName] || 0;
        if (amount !== 0) {
          wovenAtmosphericChanges[resourceName] = amount;
          accumulatedChanges.atmospheric[resourceName] = 0;
        }
      }
      for (const config of this.zonalSurfaceResourceConfigs) {
        const amount = accumulatedChanges.surface[config.name] || 0;
        if (amount !== 0) {
          wovenSurfaceChanges[config.name] = amount;
          accumulatedChanges.surface[config.name] = 0;
        }
      }
      wovenAlbedoChange = accumulatedChanges.special.albedoUpgrades || 0;
      accumulatedChanges.special.albedoUpgrades = 0;
    }
    const combinedCycleTotals = [];
    const combinedChemChanges = {};
    const combinedChemProcessChanges = {};
    let totalDurationSeconds = 0;
    let totalRealSeconds = 0;
    let aerobrakingTemperatureIncreaseK = 0;
    let appliedFraction = 0;
    let wovenAlbedoOverflow = 0;
    // Aggregate every resource substep into one controller/UI measurement.
    this.beginPhaseChangeHeatTick();
    const tickPhaseHeatFluxes = {};
    for (const zone of getZones()) {
      tickPhaseHeatFluxes[zone] = gameSettings.phaseChangeHeat ? this.phaseChangeHeatFluxByZone[zone] : 0;
    }
    const temperatureOptions = {
      ...options,
      zonalSurfaceHeatFluxes: tickPhaseHeatFluxes
    };
    for (let stepIndex = 0; stepIndex < stepDurations.length; stepIndex += 1) {
      const stepDuration = stepDurations[stepIndex];
      const fraction = stepIndex === stepDurations.length - 1 ? 1 - appliedFraction : stepDuration / deltaTime;
      appliedFraction += fraction;
      for (const resourceName in wovenAtmosphericChanges) {
        const resource = this.resources.atmospheric[resourceName];
        resource.value = Math.max(0, resource.value + wovenAtmosphericChanges[resourceName] * fraction);
      }
      const surfaceStepChanges = {};
      for (const resourceName in wovenSurfaceChanges) {
        surfaceStepChanges[resourceName] = wovenSurfaceChanges[resourceName] * fraction;
      }
      this.distributeSurfaceChangesToZones(surfaceStepChanges);
      for (const transfer of zonalSurfaceTransfers) {
        const requestedStepInput = transfer.requestedInput * fraction;
        const changesByZone = this.distributeSurfaceChangesToZones({
          [transfer.input.resource]: -requestedStepInput
        });
        let actualStepInput = 0;
        for (const zone in changesByZone) {
          for (const surfaceKey of transfer.surfaceKeys) {
            actualStepInput -= changesByZone[zone][surfaceKey] || 0;
          }
        }
        transfer.actualInput += actualStepInput;
      }
      const albedoResource = this.resources.special.albedoUpgrades;
      const albedoStepChange = wovenAlbedoChange * fraction;
      if (albedoStepChange > 0) {
        const previousAlbedoValue = albedoResource.value;
        albedoResource.increase(albedoStepChange);
        wovenAlbedoOverflow += Math.max(0, albedoStepChange - (albedoResource.value - previousAlbedoValue));
      } else if (albedoStepChange < 0) {
        albedoResource.decrease(-albedoStepChange);
      }
      runAdvancedOversightAssignments(projectManager.projects.spaceMirrorFacility, stepDuration);
      this.runUpdateStep(stepDuration, temperatureOptions);
      const stepResult = this.runResourceUpdateStep(stepDuration);
      const temperatureBeforeAerobrakingK = this.temperature.value;
      this.applyClimateHeatAfterMegaHeatSink(aerobrakingHeatEnergyJ * fraction, TERRAFORMING_AEROBRAKING_PARAMETERS.maximumTemperatureK);
      aerobrakingTemperatureIncreaseK += Math.max(0, this.temperature.value - temperatureBeforeAerobrakingK);
      totalDurationSeconds += stepResult.durationSeconds || 0;
      totalRealSeconds += stepResult.realSeconds || 0;
      for (let index = 0; index < stepResult.cycleResults.length; index += 1) {
        const stepCycle = stepResult.cycleResults[index];
        let combined = combinedCycleTotals[index];
        if (!combined) {
          combined = {
            cycle: stepCycle.cycle,
            totals: {}
          };
          combinedCycleTotals[index] = combined;
        }
        for (const key in stepCycle.totals) {
          combined.totals[key] = (combined.totals[key] || 0) + stepCycle.totals[key];
        }
      }
      const chemChanges = stepResult.chemTotals?.changes || {};
      for (const key in chemChanges) {
        combinedChemChanges[key] = (combinedChemChanges[key] || 0) + chemChanges[key];
      }
      const chemProcessChanges = stepResult.chemTotals.processChanges;
      for (const processId in chemProcessChanges) {
        const processChanges = chemProcessChanges[processId];
        const combinedProcess = combinedChemProcessChanges[processId] || (combinedChemProcessChanges[processId] = {});
        for (const key in processChanges) {
          combinedProcess[key] = (combinedProcess[key] || 0) + processChanges[key];
        }
      }
    }
    this.finalizePhaseChangeHeatTick(totalDurationSeconds);
    this.temperature.aerobrakingWarmingRateKPerDay = totalDurationSeconds > 0 ? aerobrakingTemperatureIncreaseK * 86400 / totalDurationSeconds : 0;
    this.runHazardUpdate(deltaTime, options);
    this.finalizeUpdate(options);
    if (wovenAlbedoOverflow > 0) {
      accumulatedChanges.special.albedoUpgrades += wovenAlbedoOverflow;
    }
    for (const combined of combinedCycleTotals) {
      if (combined && typeof combined.cycle.updateResourceRates === 'function') {
        combined.cycle.updateResourceRates(this, combined.totals, totalDurationSeconds);
      }
    }
    applyAtmosphericChemistryRates(this.resources, combinedChemChanges, totalRealSeconds, combinedChemProcessChanges);
    if (zonalSurfaceTransfers.length > 0) {
      this.synchronizeGlobalResources();
    }
    if (options.refreshStandaloneRates) {
      this.recalculateResourceRateTotals();
    }
  },
  calculateZonalSurfaceChanges(surfaceChanges = {}) {
    const zones = getZones();
    const configs = this.zonalSurfaceResourceConfigs;
    const projectedSurface = this.zonalSurface.clone();
    const changesByZone = {};
    for (const zone of zones) {
      changesByZone[zone] = {};
    }
    const applyProjectedChange = (zone, resourceKey, amount) => {
      const actualChange = projectedSurface.change(resourceKey, zone, amount);
      changesByZone[zone][resourceKey] = (changesByZone[zone][resourceKey] || 0) + actualChange;
    };
    for (const config of configs) {
      const netChangeAmount = surfaceChanges[config.name] || 0;
      if (Math.abs(netChangeAmount) < 1e-9) {
        continue;
      }
      const distribution = config.distribution || {};
      const productionMode = distribution.production || 'area';
      const consumptionMode = distribution.consumption || 'currentAmount';
      const initialMode = netChangeAmount < 0 ? consumptionMode : productionMode;
      if (initialMode === 'skip') {
        continue;
      }
      let distributionMode = initialMode;
      let totalDistributionFactor = 0;
      let targetZones = zones;
      const buriedKey = config.keys.find(key => key.startsWith('buried'));
      const usesBuriedStore = buriedKey && config.distributionKey;
      if (distributionMode === 'biomassGrowth') {
        const design = lifeDesigner.currentDesign;
        const growableZoneNames = design.getGrowableZones();
        const survivableZoneResults = design.temperatureSurvivalCheck();
        const growAndSurviveZones = growableZoneNames.filter(zone => survivableZoneResults[zone]?.pass);
        if (growAndSurviveZones.length > 0) {
          targetZones = growAndSurviveZones;
          distributionMode = 'targetZoneArea';
        } else if (survivableZoneResults.global.pass) {
          targetZones = Object.keys(survivableZoneResults).filter(zone => zone !== 'global' && survivableZoneResults[zone].pass);
          distributionMode = 'targetZoneArea';
        } else {
          distributionMode = 'area';
          targetZones = zones;
        }
      }
      if (usesBuriedStore && netChangeAmount < 0 && distributionMode === 'currentAmount') {
        let totalSurfaceAmount = 0;
        let totalBuriedAmount = 0;
        for (const zone of zones) {
          totalSurfaceAmount += projectedSurface[config.distributionKey][zone] || 0;
          totalBuriedAmount += projectedSurface[buriedKey][zone] || 0;
        }
        const surfaceTake = Math.min(-netChangeAmount, totalSurfaceAmount);
        if (surfaceTake > 0 && totalSurfaceAmount > 0) {
          for (const zone of zones) {
            const currentAmount = projectedSurface[config.distributionKey][zone] || 0;
            if (currentAmount <= 0) {
              continue;
            }
            const share = currentAmount / totalSurfaceAmount;
            applyProjectedChange(zone, config.distributionKey, -surfaceTake * share);
          }
        }
        const remaining = netChangeAmount + surfaceTake;
        if (remaining < 0 && totalBuriedAmount > 0) {
          const buriedTake = Math.min(-remaining, totalBuriedAmount);
          for (const zone of zones) {
            const currentBuried = projectedSurface[buriedKey][zone] || 0;
            if (currentBuried <= 0) {
              continue;
            }
            const share = currentBuried / totalBuriedAmount;
            applyProjectedChange(zone, buriedKey, -buriedTake * share);
          }
        }
        continue;
      }
      if (distributionMode === 'currentAmount') {
        for (const zone of zones) {
          totalDistributionFactor += projectedSurface[config.distributionKey][zone] || 0;
        }
      } else if (distributionMode === 'targetZoneArea') {
        for (const zone of targetZones) {
          totalDistributionFactor += this.celestialParameters.surfaceArea * this.getZoneWeight(zone);
        }
        if (totalDistributionFactor < 1e-9) {
          distributionMode = 'area';
          targetZones = zones;
        }
      }
      if (distributionMode === 'area') {
        totalDistributionFactor = 1.0;
      }
      for (const zone of zones) {
        let proportion = 0;
        const isTargetZone = targetZones.includes(zone);
        if (totalDistributionFactor > 1e-9) {
          if (distributionMode === 'currentAmount') {
            const currentAmount = projectedSurface[config.distributionKey][zone] || 0;
            proportion = currentAmount / totalDistributionFactor;
          } else if (distributionMode === 'targetZoneArea' && isTargetZone) {
            const zoneArea = this.celestialParameters.surfaceArea * this.getZoneWeight(zone);
            proportion = zoneArea / totalDistributionFactor;
          } else if (distributionMode === 'area') {
            proportion = this.getZoneWeight(zone);
          }
        } else if (netChangeAmount > 0 && distributionMode !== 'currentAmount') {
          proportion = this.getZoneWeight(zone);
        }
        const zonalChange = netChangeAmount * proportion;
        applyProjectedChange(zone, config.distributionKey, zonalChange);
      }
    }
    return changesByZone;
  },
  distributeSurfaceChangesToZones(surfaceChanges = {}) {
    const changesByZone = this.calculateZonalSurfaceChanges(surfaceChanges);
    for (const zone in changesByZone) {
      for (const resourceKey in changesByZone[zone]) {
        this.applyZonalSurfaceChange(zone, resourceKey, changesByZone[zone][resourceKey]);
      }
    }
    return changesByZone;
  },
  applyZonalSurfaceChange(zone, resourceKey, amount) {
    return this.zonalSurface.change(resourceKey, zone, amount);
  },
  distributeGlobalChangesToZones(deltaTime) {
    const surfaceChanges = {};
    const secondsMultiplier = deltaTime / 1000;
    const configs = this.zonalSurfaceResourceConfigs;
    for (const config of configs) {
      const globalRes = resources.surface[config.name];
      const productionByType = globalRes.productionRateByType || {};
      const consumptionByType = globalRes.consumptionRateByType || {};
      let netExternalRate = 0;
      for (const type in productionByType) {
        if (type === 'terraforming') {
          continue;
        }
        const entries = productionByType[type];
        for (const source in entries) {
          netExternalRate += entries[source] || 0;
        }
      }
      for (const type in consumptionByType) {
        if (type === 'terraforming') {
          continue;
        }
        const entries = consumptionByType[type];
        for (const source in entries) {
          netExternalRate -= entries[source] || 0;
        }
      }
      surfaceChanges[config.name] = netExternalRate * secondsMultiplier;
    }
    this.distributeSurfaceChangesToZones(surfaceChanges);
  },
  synchronizeGlobalResources() {
    const zones = getZones();
    const configs = this.zonalSurfaceResourceConfigs;
    const totals = {};
    for (const config of configs) {
      totals[config.name] = 0;
    }
    for (const zone of zones) {
      for (const config of configs) {
        let zoneTotal = 0;
        for (const key of config.keys) {
          zoneTotal += this.zonalSurface.getTotal(key, zone);
        }
        totals[config.name] += zoneTotal;
      }
    }
    for (const config of configs) {
      this.resources.surface[config.name].value = totals[config.name];
    }

    // Atmospheric resources are no longer synchronized here.
    // Pressures are calculated on the fly when needed.
  }
}));
