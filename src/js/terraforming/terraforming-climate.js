registerTerraformingMethods('climate', ({
  AU_METER,
  BACKGROUND_SOLAR_FLUX,
  DISK_GRAZING_FLUX_FACTOR,
  KPA_PER_ATM,
  MEGA_HEAT_SINK_POWER_W,
  MIN_SURFACE_HEAT_CAPACITY,
  SOLAR_LUMINOSITY_W,
  SOLAR_PANEL_BASE_LUMINOSITY,
  SOLAR_RADIUS_AU,
  STEFAN_BOLTZMANN,
  TERRAFORMING_AEROBRAKING_PARAMETERS,
  TERRAFORMING_OXIDATION_PARAMETERS,
  buildAtmosphereContext,
  calculateMolecularWeight,
  estimateCoverage,
  estimateExobaseTemperatureK,
  estimateExosphereHeightMeters,
  estimateExosphereTemperatureK,
  surfaceLiquidHeatCapacityConfigs
}) => ({
  getCoreHeatFlux() {
    const stellarEvolutionState = getStellarEvolutionState(this, currentPlanetParameters);
    const baseFlux = Math.max(0, this.celestialParameters.coreHeatFlux || 0)
      * (1 - stellarEvolutionState.absorptionProgress);
    if (isEquilibrating) {
      return baseFlux;
    }
    const crustCompletion = Math.max(0, Math.min(1, projectManager?.projects?.artificialCrust?.getCompletionFraction?.() || 0));
    return baseFlux * (1 - crustCompletion);
  },
  getMegaHeatSinkFlux() {
    if (isEquilibrating) {
      return 0;
    }
    const rawFlux = this.getMegaHeatSinkRawFlux();
    const megaHeatSinkProject = projectManager?.projects?.megaHeatSink;
    const stellarEvolutionState = getStellarEvolutionState(this, currentPlanetParameters);
    if (
      megaHeatSinkProject?.hasLiquidHydrogenBlocker?.()
      || isStellarEvolutionStarOrLater(stellarEvolutionState)
    ) {
      return 0;
    }
    return rawFlux;
  },
  getMegaHeatSinkRawFlux() {
    if (isEquilibrating) {
      return 0;
    }
    const megaHeatSinkProject = projectManager?.projects?.megaHeatSink;
    const megaHeatSinkCount = megaHeatSinkProject?.heatSinksActive === false ? 0 : megaHeatSinkProject?.getEffectiveHeatSinkCount?.() ?? megaHeatSinkProject?.repeatCount ?? 0;
    const surfaceArea = this.celestialParameters.surfaceArea || 4 * Math.PI * Math.pow((this.celestialParameters.radius || 0) * 1000, 2);
    return megaHeatSinkCount > 0 && surfaceArea > 0 ? megaHeatSinkCount * MEGA_HEAT_SINK_POWER_W / surfaceArea : 0;
  },
  getNetCoreHeatFlux() {
    const coreHeatFlux = this.getCoreHeatFlux();
    const megaHeatSinkFlux = this.getMegaHeatSinkFlux();
    return Math.max(0, coreHeatFlux - megaHeatSinkFlux);
  },
  getMegaHeatSinkAllocation() {
    const surfaceArea = this.celestialParameters.surfaceArea || 4 * Math.PI * Math.pow((this.celestialParameters.radius || 0) * 1000, 2);
    const megaHeatSinkProject = projectManager?.projects?.megaHeatSink;
    const stellarEvolutionState = getStellarEvolutionState(this, currentPlanetParameters);
    let remainingPower = this.getMegaHeatSinkRawFlux() * surfaceArea;
    const intrinsicHeatBlocked = megaHeatSinkProject?.hasLiquidHydrogenBlocker?.()
      || isStellarEvolutionStarOrLater(stellarEvolutionState);
    const coreHeatPower = intrinsicHeatBlocked
      ? 0
      : Math.min(remainingPower, this.getCoreHeatFlux() * surfaceArea);
    remainingPower -= coreHeatPower;
    const factoryHeatPower = Math.min(remainingPower, Math.max(0, this.getFactoryHeatFlux()) * surfaceArea);
    remainingPower -= factoryHeatPower;
    return {
      coreHeatFlux: surfaceArea > 0 ? coreHeatPower / surfaceArea : 0,
      factoryHeatFlux: surfaceArea > 0 ? factoryHeatPower / surfaceArea : 0,
      surplusCoolingPower: remainingPower
    };
  },
  setFactoryHeatPower(power, coolingPower, contributors = []) {
    const surfaceArea = this.celestialParameters.surfaceArea || 4 * Math.PI * Math.pow((this.celestialParameters.radius || 0) * 1000, 2);
    this.factoryHeatPower = Number(power) || 0;
    this.factoryCoolingPower = Number(coolingPower) || 0;
    this.factoryCoolingFlux = surfaceArea > 0 ? this.factoryCoolingPower / surfaceArea : 0;
    this.factoryHeatFlux = surfaceArea > 0 ? this.factoryHeatPower / surfaceArea : 0;
    this.factoryHeatContributors = contributors.map(contributor => ({
      name: contributor.name,
      flux: surfaceArea > 0 ? contributor.power / surfaceArea : 0
    }));
  },
  resetPhaseChangeHeat() {
    this.phaseChangeHeatPower = 0;
    this.phaseChangeHeatFlux = 0;
    for (const zone of getZones()) {
      this.phaseChangeHeatFluxByZone[zone] = 0;
      this.phaseChangeHeatEnergyByZone[zone] = 0;
    }
  },
  beginPhaseChangeHeatTick() {
    for (const zone of getZones()) {
      this.phaseChangeHeatEnergyByZone[zone] = 0;
    }
  },
  accumulatePhaseChangeHeat(phaseHeat) {
    for (const zone of getZones()) {
      const result = phaseHeat.byZone[zone];
      if (!result) continue;
      this.phaseChangeHeatEnergyByZone[zone] += result.netHeatEnergyJ;
    }
  },
  finalizePhaseChangeHeatTick(durationSeconds) {
    const surfaceArea = this.celestialParameters.surfaceArea;
    let totalEnergy = 0;
    for (const zone of getZones()) {
      const energy = this.phaseChangeHeatEnergyByZone[zone];
      const zoneArea = surfaceArea * this.getZoneWeight(zone);
      this.phaseChangeHeatFluxByZone[zone] = durationSeconds > 0 && zoneArea > 0 ? energy / durationSeconds / zoneArea : 0;
      totalEnergy += energy;
    }
    this.phaseChangeHeatPower = durationSeconds > 0 ? totalEnergy / durationSeconds : 0;
    this.phaseChangeHeatFlux = surfaceArea > 0 ? this.phaseChangeHeatPower / surfaceArea : 0;
  },
  getFactoryHeatFlux() {
    if (!gameSettings.factoryHeating || isEquilibrating) {
      return 0;
    }
    return this.factoryHeatFlux || 0;
  },
  getFactoryCoolingFlux() {
    if (!gameSettings.factoryHeating || isEquilibrating) {
      return 0;
    }
    return this.factoryCoolingFlux || 0;
  },
  getNetFactoryHeatFlux() {
    const factoryHeatFlux = this.getFactoryHeatFlux();
    if (factoryHeatFlux <= 0) {
      return factoryHeatFlux;
    }
    const allocation = this.getMegaHeatSinkAllocation();
    return factoryHeatFlux - allocation.factoryHeatFlux;
  },
  getFactoryHeatBreakdown() {
    if (!gameSettings.factoryHeating || isEquilibrating) {
      return [];
    }
    const contributors = this.factoryHeatContributors.slice();
    const factoryHeatFlux = this.getFactoryHeatFlux();
    if (factoryHeatFlux <= 0) {
      return contributors;
    }
    const megaHeatSinkProject = projectManager?.projects?.megaHeatSink;
    const mitigatedFactoryHeat = this.getMegaHeatSinkAllocation().factoryHeatFlux;
    if (mitigatedFactoryHeat > 0) {
      contributors.push({
        name: megaHeatSinkProject.displayName,
        flux: -mitigatedFactoryHeat
      });
    }
    return contributors;
  },
  getNetSurfaceHeatFlux(factoryCoolingScale = 1, megaHeatSinkAllocation = this.getMegaHeatSinkAllocation()) {
    const coreHeatFlux = this.getCoreHeatFlux();
    const fusionFlux = getStellarEvolutionState(this, currentPlanetParameters).fusionFluxWm2;
    const factoryHeatFlux = this.getFactoryHeatFlux();
    const factoryCoolingAdjustment = this.getFactoryCoolingFlux() * (1 - factoryCoolingScale);
    const positiveFactoryHeatFlux = Math.max(0, factoryHeatFlux);
    const factoryCoolingFlux = Math.max(0, -factoryHeatFlux);
    return fusionFlux + coreHeatFlux - megaHeatSinkAllocation.coreHeatFlux + positiveFactoryHeatFlux - megaHeatSinkAllocation.factoryHeatFlux - factoryCoolingFlux + factoryCoolingAdjustment;
  },
  setTemperatureValuesToTrend() {
    const zones = getZones();
    const globalTrend = this.temperature.trendValue;
    zones.forEach(zone => {
      const trend = this.temperature.zones[zone].trendValue;
      this.temperature.zones[zone].value = trend;
      this.temperature.zones[zone].day = trend;
      this.temperature.zones[zone].night = trend;
    });
    this.temperature.value = globalTrend;
  },
  applyClimateHeat(energyJ, maximumTemperatureK) {
    if (energyJ <= 0) return 0;
    const heatCapacity = this.getHeatCapacity();
    const heatPerAreaJ = energyJ / this.celestialParameters.surfaceArea;
    let depositedEnergyJ = 0;
    let weightedTemperature = 0;
    for (const zone of getZones()) {
      const zoneWeight = this.getZoneWeight(zone);
      if (zoneWeight <= 0) continue;
      const zoneCapacity = heatCapacity.zones[zone];
      const temperature = this.temperature.zones[zone];
      const unconstrainedIncrease = heatPerAreaJ / zoneCapacity.capacityPerArea;
      const temperatureIncrease = Math.min(unconstrainedIncrease, Math.max(0, maximumTemperatureK - temperature.value));
      temperature.value += temperatureIncrease;
      temperature.day += temperatureIncrease;
      temperature.night += temperatureIncrease;
      depositedEnergyJ += temperatureIncrease * zoneCapacity.capacityPerArea * zoneCapacity.zoneArea;
      weightedTemperature += temperature.value * zoneWeight;
    }
    this.temperature.value = weightedTemperature;
    return depositedEnergyJ;
  },
  applyClimateHeatAfterMegaHeatSink(energyJ, maximumTemperatureK) {
    const mitigatedEnergyJ = Math.min(Math.max(0, energyJ), this.megaHeatSinkDirectHeatCapacityJ);
    this.megaHeatSinkDirectHeatCapacityJ -= mitigatedEnergyJ;
    return this.applyClimateHeat(energyJ - mitigatedEnergyJ, maximumTemperatureK);
  },
  applyAtmosphericChemistryHeat(energyJ) {
    return this.applyClimateHeatAfterMegaHeatSink(energyJ, TERRAFORMING_OXIDATION_PARAMETERS.maximumCombustionTemperatureK);
  },
  hasAerobrakingAtmosphere() {
    const gravity = this.celestialParameters.gravity;
    if (!(gravity > 0)) return false;
    const pressurePa = this._updateAtmosphericPressureCache().totalPressure;
    return pressurePa / gravity >= TERRAFORMING_AEROBRAKING_PARAMETERS.minimumAtmosphericColumnMassKgM2;
  },
  applyAerobrakingHeat(importedMassTons, accumulatedSpecialChanges = null) {
    if (!gameSettings.aerobraking || !this.hasAerobrakingAtmosphere() || !(importedMassTons > 0)) {
      return 0;
    }
    const gravity = this.celestialParameters.gravity;
    const radiusMeters = this.celestialParameters.radius * 1000;
    // A zero-excess-speed arrival reaches the atmosphere with escape velocity,
    // so its minimum specific kinetic energy is v_escape^2 / 2 = GM/R = gR.
    const energyJ = importedMassTons * terraformingParameters.physical.kgPerTon * gravity * radiusMeters * TERRAFORMING_AEROBRAKING_PARAMETERS.climateHeatDepositionFraction;
    if (accumulatedSpecialChanges) {
      accumulatedSpecialChanges.aerobrakingHeatEnergyJ += energyJ;
      return energyJ;
    }
    const temperatureBeforeAerobrakingK = this.temperature.value;
    const depositedEnergyJ = this.applyClimateHeatAfterMegaHeatSink(energyJ, TERRAFORMING_AEROBRAKING_PARAMETERS.maximumTemperatureK);
    this.temperature.aerobrakingWarmingRateKPerDay = depositedEnergyJ > 0 && this.temperature.value > temperatureBeforeAerobrakingK ? TERRAFORMING_AEROBRAKING_PARAMETERS.warningTemperatureRateKPerDay : 0;
    return depositedEnergyJ;
  },
  updateLuminosity() {
    this.luminosity.groundAlbedo = this.calculateGroundAlbedo();
    const dustFactory = buildings.dustFactory;
    if (dustFactory.dustAlbedoTransitionActive) {
      const surfaceArea = this.celestialParameters.surfaceArea || 0;
      const special = this.resources.special;
      const black = special.albedoUpgrades.value;
      const bRatioRaw = surfaceArea > 0 ? Math.max(0, black / surfaceArea) : 0;
      const totalApplied = Math.min(bRatioRaw, 1);
      if (totalApplied >= 1) {
        dustFactory.dustAlbedoTransitionActive = false;
      }
    }
    this.luminosity.surfaceAlbedo = this.calculateSurfaceAlbedo();
    const albRes = this.calculateActualAlbedo();
    this.luminosity.actualAlbedo = albRes.albedo;
    this.luminosity.cloudFraction = albRes.cloudFraction;
    this.luminosity.waterCloudActivity = albRes.waterCloudActivity;
    this.luminosity.hazeFraction = albRes.hazeFraction;
    this.luminosity.cloudHazePenalty = albRes.penalty;
    this.luminosity.cloudHazeRaw = Number.isFinite(albRes.cloudHazeRaw) ? albRes.cloudHazeRaw : albRes.penalty;
    this.luminosity.albedo = this.luminosity.actualAlbedo;
    const fixedZonalAverageFlux = currentPlanetParameters.specialAttributes?.fixedZonalAverageFlux;
    let solarFlux = fixedZonalAverageFlux ?? this.calculateSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
    for (const effect of this.activeEffects) {
      if (effect.type === 'stellarFluxAddition') {
        solarFlux += effect.value || 0;
      }
    }
    this.luminosity.solarFlux = Math.max(0, solarFlux);
  },
  saveTemperatureState() {
    const zonesSnapshot = {};
    const zones = this.temperature?.zones || {};
    for (const zoneKey of Object.keys(zones)) {
      const zone = zones[zoneKey] || {};
      zonesSnapshot[zoneKey] = {
        initial: zone.initial,
        value: zone.value,
        day: zone.day,
        night: zone.night,
        trendValue: zone.trendValue,
        equilibriumTemperature: zone.equilibriumTemperature
      };
    }
    const contributionsSnapshot = {};
    const contributions = this.temperature?.opticalDepthContributions || {};
    for (const key of Object.keys(contributions)) {
      contributionsSnapshot[key] = contributions[key];
    }
    const zonalFluxSnapshot = {};
    const zonalFluxes = this.luminosity?.zonalFluxes || {};
    for (const key of Object.keys(zonalFluxes)) {
      zonalFluxSnapshot[key] = zonalFluxes[key];
    }
    return {
      temperature: {
        value: this.temperature?.value,
        trendValue: this.temperature?.trendValue,
        equilibriumTemperature: this.temperature?.equilibriumTemperature,
        effectiveTempNoAtmosphere: this.temperature?.effectiveTempNoAtmosphere,
        emissivity: this.temperature?.emissivity,
        opticalDepth: this.temperature?.opticalDepth,
        opticalDepthContributions: contributionsSnapshot,
        zones: zonesSnapshot
      },
      luminosity: {
        modifiedSolarFlux: this.luminosity?.modifiedSolarFlux,
        modifiedSolarFluxUnpenalized: this.luminosity?.modifiedSolarFluxUnpenalized,
        zonalFluxes: zonalFluxSnapshot
      }
    };
  },
  restoreTemperatureState(snapshot) {
    if (!snapshot) {
      return;
    }
    const tempSnapshot = snapshot.temperature || {};
    const lumSnapshot = snapshot.luminosity || {};
    if (this.temperature) {
      if (Object.prototype.hasOwnProperty.call(tempSnapshot, 'value')) {
        this.temperature.value = tempSnapshot.value;
      }
      if (Object.prototype.hasOwnProperty.call(tempSnapshot, 'trendValue')) {
        this.temperature.trendValue = tempSnapshot.trendValue;
      }
      if (Object.prototype.hasOwnProperty.call(tempSnapshot, 'equilibriumTemperature')) {
        this.temperature.equilibriumTemperature = tempSnapshot.equilibriumTemperature;
      }
      if (Object.prototype.hasOwnProperty.call(tempSnapshot, 'effectiveTempNoAtmosphere')) {
        this.temperature.effectiveTempNoAtmosphere = tempSnapshot.effectiveTempNoAtmosphere;
      }
      if (Object.prototype.hasOwnProperty.call(tempSnapshot, 'emissivity')) {
        this.temperature.emissivity = tempSnapshot.emissivity;
      }
      if (Object.prototype.hasOwnProperty.call(tempSnapshot, 'opticalDepth')) {
        this.temperature.opticalDepth = tempSnapshot.opticalDepth;
      }
      const contributions = tempSnapshot.opticalDepthContributions || {};
      const targetContributions = this.temperature.opticalDepthContributions || {};
      for (const key of Object.keys(targetContributions)) {
        delete targetContributions[key];
      }
      for (const key of Object.keys(contributions)) {
        targetContributions[key] = contributions[key];
      }
      const zones = this.temperature.zones || {};
      const zoneSnapshots = tempSnapshot.zones || {};
      for (const zoneKey of Object.keys(zones)) {
        const zone = zones[zoneKey];
        const snap = zoneSnapshots[zoneKey] || {};
        if (Object.prototype.hasOwnProperty.call(snap, 'initial')) {
          zone.initial = snap.initial;
        }
        if (Object.prototype.hasOwnProperty.call(snap, 'value')) {
          zone.value = snap.value;
        }
        if (Object.prototype.hasOwnProperty.call(snap, 'day')) {
          zone.day = snap.day;
        }
        if (Object.prototype.hasOwnProperty.call(snap, 'night')) {
          zone.night = snap.night;
        }
        if (Object.prototype.hasOwnProperty.call(snap, 'trendValue')) {
          zone.trendValue = snap.trendValue;
        }
        if (Object.prototype.hasOwnProperty.call(snap, 'equilibriumTemperature')) {
          zone.equilibriumTemperature = snap.equilibriumTemperature;
        }
      }
    }
    if (this.luminosity) {
      if (Object.prototype.hasOwnProperty.call(lumSnapshot, 'modifiedSolarFlux')) {
        this.luminosity.modifiedSolarFlux = lumSnapshot.modifiedSolarFlux;
      }
      if (Object.prototype.hasOwnProperty.call(lumSnapshot, 'modifiedSolarFluxUnpenalized')) {
        this.luminosity.modifiedSolarFluxUnpenalized = lumSnapshot.modifiedSolarFluxUnpenalized;
      }
      const zonalFluxes = lumSnapshot.zonalFluxes || {};
      const targetFluxes = this.luminosity.zonalFluxes || {};
      for (const key of Object.keys(targetFluxes)) {
        delete targetFluxes[key];
      }
      for (const key of Object.keys(zonalFluxes)) {
        targetFluxes[key] = zonalFluxes[key];
      }
    }
  },
  prepareSurfaceTemperatureProjectionContext(options = {}) {
    const groundAlbedo = this.luminosity.groundAlbedo;
    const rotationPeriodH = Math.abs(this.celestialParameters.dayNightPeriod) || 24;
    const gSurface = this.celestialParameters.gravity || 9.81;
    const {
      composition,
      totalMass
    } = this.calculateAtmosphericComposition();
    const surfacePressurePa = calculateAtmosphericPressure(totalMass / 1000, gSurface, this.celestialParameters.radius, this.celestialParameters.surfaceArea);
    const surfacePressureBar = surfacePressurePa / 1e5;
    const suppressAtmosphere = this.isBooleanFlagSet('ringworldLowGravityTerraforming') && options.ignoreLowGravityAtmosphere !== true;
    const effectiveComposition = suppressAtmosphere ? {} : composition;
    const effectiveSurfacePressurePa = suppressAtmosphere ? 0 : surfacePressurePa;
    const effectiveSurfacePressureBar = suppressAtmosphere ? 0 : surfacePressureBar;
    const greenhouseModel = this.celestialParameters.greenhouseModel || {};
    const aerosolsSW = {};
    const area_m2 = 4 * Math.PI * Math.pow((this.celestialParameters.radius || 1) * 1000, 2);
    if (!suppressAtmosphere && this.resources?.atmospheric?.calciteAerosol) {
      const mass_ton = this.resources.atmospheric.calciteAerosol.value || 0;
      aerosolsSW.calcite = area_m2 > 0 ? mass_ton * 1000 / area_m2 : 0;
    }
    const baseParams = {
      groundAlbedo,
      rotationPeriodH,
      surfacePressureBar: effectiveSurfacePressureBar,
      composition: effectiveComposition,
      gSurface,
      aerosolsSW,
      greenhouseModel
    };
    const zones = getZones();
    const megaHeatSinkAllocation = this.getMegaHeatSinkAllocation();
    const heatCapacityCache = this.getHeatCapacity();
    const baseSlabOptions = {
      atmosphereCapacity: suppressAtmosphere ? 0 : heatCapacityCache.atmosphericHeatCapacity
    };
    const rawGreenhouse = opticalDepth(effectiveComposition, effectiveSurfacePressureBar, gSurface);
    const albedoContributions = calculateCloudAlbedoContributions({
      pressureBar: effectiveSurfacePressureBar,
      composition: effectiveComposition,
      gSurface,
      aerosolsSW
    });
    const zoneContexts = {};
    const zoneWeights = {};
    let totalWeight = 0;
    let liquidCoverageWeighted = 0;
    let areaSum = 0;
    for (const zone of zones) {
      const zoneCapacity = heatCapacityCache.zones[zone];
      const zoneFractions = zoneCapacity.fractions;
      const zoneArea = zoneCapacity.zoneArea;
      const slabOptions = {
        ...baseSlabOptions,
        zoneArea,
        zoneLiquidWater: this.zonalSurface.liquidWater[zone] || 0
      };
      const mixedSurfaceAlbedo = surfaceAlbedoMix(groundAlbedo, zoneFractions);
      zoneContexts[zone] = {
        localSurfaceAlbedo: this.calculateZonalSurfaceAlbedo(zone),
        slabHeatCapacity: autoSlabHeatCapacity(rotationPeriodH, effectiveSurfacePressureBar, zoneFractions, gSurface, undefined, undefined, slabOptions),
        resolvedAlbedo: albedoAdditive({
          surfaceAlbedo: mixedSurfaceAlbedo,
          pressureBar: effectiveSurfacePressureBar,
          composition: effectiveComposition,
          gSurface,
          aerosolsSW,
          contribs: albedoContributions
        }).albedo
      };
      const zoneWeight = (zoneCapacity.capacityPerArea || 0) * (zoneArea || 0);
      zoneWeights[zone] = zoneWeight;
      totalWeight += zoneWeight;
      const liquidFraction = (zoneFractions.ocean || 0) + (zoneFractions.hydrocarbon || 0);
      liquidCoverageWeighted += liquidFraction * zoneArea;
      areaSum += zoneArea;
    }
    const mixingParameters = terraformingParameters.climate.meridionalMixing;
    const columnMass = effectiveSurfacePressurePa / Math.max(gSurface, 1e-6);
    const massBoost = 1 - Math.exp(-mixingParameters.columnMassRate * Math.pow(columnMass / mixingParameters.referenceColumnMassKgM2, mixingParameters.columnMassExponent));
    const rotFactor = Math.min(mixingParameters.maximumRotationFactor, Math.sqrt(Math.max(mixingParameters.minimumRotationPeriodRatio, rotationPeriodH / mixingParameters.referenceRotationPeriodHours)));
    const liquidCoverage = areaSum > 0 ? liquidCoverageWeighted / areaSum : 0;
    const gasMix = Math.max(0, Math.min(1, massBoost * rotFactor));
    const liquidMix = Math.max(0, Math.min(1, liquidCoverage));
    const mixFrac = Math.max(0, Math.min(mixingParameters.maximumMixFraction, 1 - (1 - gasMix) * (1 - liquidMix)));
    return {
      groundAlbedo,
      rotationPeriodH,
      gSurface,
      effectiveComposition,
      effectiveSurfacePressurePa,
      effectiveSurfacePressureBar,
      greenhouseModel,
      aerosolsSW,
      baseParams,
      zones,
      megaHeatSinkAllocation,
      globalNetSurfaceHeatFlux: this.getNetSurfaceHeatFlux(1, megaHeatSinkAllocation),
      heatCapacityCache,
      baseSlabOptions,
      rawGreenhouse,
      zoneContexts,
      zoneWeights,
      totalWeight,
      mixFrac
    };
  },
  updateSurfaceTemperature(deltaTimeMs = 0, options = {}) {
    const projectionContext = options.surfaceTemperatureProjectionContext;
    const groundAlbedo = projectionContext ? projectionContext.groundAlbedo : this.luminosity.groundAlbedo;
    const rotationPeriodH = projectionContext ? projectionContext.rotationPeriodH : Math.abs(this.celestialParameters.dayNightPeriod) || 24;
    const gSurface = projectionContext ? projectionContext.gSurface : this.celestialParameters.gravity || 9.81;
    let composition = projectionContext ? projectionContext.effectiveComposition : null;
    let surfacePressurePa = projectionContext ? projectionContext.effectiveSurfacePressurePa : 0;
    if (!projectionContext) {
      const atmosphere = this.calculateAtmosphericComposition();
      composition = atmosphere.composition;
      surfacePressurePa = calculateAtmosphericPressure(atmosphere.totalMass / 1000, gSurface, this.celestialParameters.radius, this.celestialParameters.surfaceArea);
    }
    const surfacePressureBar = surfacePressurePa / 1e5;
    const ignoreLowGravityAtmosphere = options?.ignoreLowGravityAtmosphere === true;
    const suppressAtmosphere = this.isBooleanFlagSet('ringworldLowGravityTerraforming') && !ignoreLowGravityAtmosphere;
    const effectiveComposition = projectionContext ? projectionContext.effectiveComposition : suppressAtmosphere ? {} : composition;
    const effectiveSurfacePressurePa = projectionContext ? projectionContext.effectiveSurfacePressurePa : suppressAtmosphere ? 0 : surfacePressurePa;
    const effectiveSurfacePressureBar = projectionContext ? projectionContext.effectiveSurfacePressureBar : suppressAtmosphere ? 0 : surfacePressureBar;
    const greenhouseModel = projectionContext ? projectionContext.greenhouseModel : this.celestialParameters.greenhouseModel || {};
    const rawGreenhouse = projectionContext ? projectionContext.rawGreenhouse : opticalDepth(effectiveComposition, effectiveSurfacePressureBar, gSurface);
    const aerosolsSW = projectionContext ? projectionContext.aerosolsSW : {};
    if (!projectionContext && !suppressAtmosphere && this.resources?.atmospheric?.calciteAerosol) {
      const area_m2 = 4 * Math.PI * Math.pow((this.celestialParameters.radius || 1) * 1000, 2);
      const mass_ton = this.resources.atmospheric.calciteAerosol.value || 0;
      aerosolsSW.calcite = area_m2 > 0 ? mass_ton * 1000 / area_m2 : 0;
    }
    const baseParams = projectionContext ? projectionContext.baseParams : {
      groundAlbedo,
      rotationPeriodH,
      surfacePressureBar: effectiveSurfacePressureBar,
      composition: effectiveComposition,
      gSurface,
      aerosolsSW,
      greenhouseModel
    };
    const ORDER = projectionContext ? projectionContext.zones : getZones();
    const z = {}; // per-zone working data

    const dtSeconds = Math.max(0, deltaTimeMs || 0) * (86400 / 1000);
    const ignoreHeatCapacity = !!(options && options.ignoreHeatCapacity);
    const zonalFluxOverrides = options && options.zonalFluxOverrides;
    const zonalSurfaceHeatFluxes = options && options.zonalSurfaceHeatFluxes;
    const disableAvailableAdvancedHeating = !!(options && options.disableAvailableAdvancedHeating);
    const megaHeatSinkAllocation = projectionContext ? projectionContext.megaHeatSinkAllocation : this.getMegaHeatSinkAllocation();
    const globalNetSurfaceHeatFlux = projectionContext ? projectionContext.globalNetSurfaceHeatFlux : this.getNetSurfaceHeatFlux(1, megaHeatSinkAllocation);
    const allowAvailableHeating = !!mirrorOversightSettings?.advancedOversight && mirrorOversightSettings.allowAvailableToHeat !== false;
    let availableAdvancedHeatingPower = 0;
    if (allowAvailableHeating && !disableAvailableAdvancedHeating) {
      const mirrorEffect = this.calculateMirrorEffect();
      const mirror = buildings.spaceMirror;
      const mirrorResourceFactor = Number.isFinite(mirror._baseProductivity) ? mirror._baseProductivity : mirror.productivity;
      const mirrorPowerPer = (mirrorEffect?.interceptedPower || 0) * Math.max(0, Math.min(1, mirrorResourceFactor));
      const lantern = buildings?.hyperionLantern;
      const lanternBaseProductivity = Number.isFinite(lantern?._baseProductivity) ? lantern._baseProductivity : Number.isFinite(lantern?.productivity) ? lantern.productivity : 1;
      const rawLanternProductionFactor = lantern ? lantern.getEffectiveProductionMultiplier() : 1;
      const lanternProductionFactor = Number.isFinite(rawLanternProductionFactor) ? rawLanternProductionFactor : 1;
      const lanternPowerPer = lantern ? (lantern.powerPerBuilding || 0) * lanternBaseProductivity * lanternProductionFactor : 0;
      const availableMirrors = Math.max(0, Number(mirrorOversightSettings.availableHeating?.mirrors) || 0);
      const availableLanterns = mirrorOversightSettings.applyToLantern ? Math.max(0, Number(mirrorOversightSettings.availableHeating?.lanterns) || 0) : 0;
      availableAdvancedHeatingPower = availableMirrors * mirrorPowerPer + availableLanterns * lanternPowerPer;
    }
    let weightedTemp = 0;
    let weightedTrendTemp = 0;
    let weightedEqTemp = 0;
    let weightedFluxUnpenalized = 0;
    const heatCapacityCache = projectionContext ? projectionContext.heatCapacityCache : this.getHeatCapacity();
    const effectiveAtmosphereCapacity = suppressAtmosphere ? 0 : heatCapacityCache.atmosphericHeatCapacity;
    const baseSlabOptions = projectionContext ? projectionContext.baseSlabOptions : {
      atmosphereCapacity: effectiveAtmosphereCapacity
    };
    const zoneFluxes = {};
    const zonalEffectiveLight = {};
    let weightedEffectiveLight = 0;
    for (const zone of ORDER) {
      const overrideFlux = zonalFluxOverrides && zonalFluxOverrides[zone];
      const zoneFlux = Number.isFinite(overrideFlux) ? Math.max(overrideFlux, BACKGROUND_SOLAR_FLUX) : this.calculateZoneSolarFlux(zone);
      const localSurfaceAlbedo = projectionContext ? projectionContext.zoneContexts[zone].localSurfaceAlbedo : this.calculateZonalSurfaceAlbedo(zone);
      const effectiveLight = Math.max(0, zoneFlux * (1 - localSurfaceAlbedo));
      const pct = this.getZoneWeight(zone);
      zoneFluxes[zone] = zoneFlux;
      zonalEffectiveLight[zone] = effectiveLight;
      weightedEffectiveLight += effectiveLight * pct;
      this.luminosity.zonalFluxes[zone] = zoneFlux;
    }
    for (const zone of ORDER) {
      const zoneFlux = zoneFluxes[zone];
      const zoneCapacity = heatCapacityCache.zones[zone];
      const zoneFractions = zoneCapacity.fractions;
      const pct = this.getZoneWeight(zone);
      if (pct <= 0) {
        continue;
      }
      const zoneArea = zoneCapacity.zoneArea;
      const slabOptions = {
        ...baseSlabOptions,
        zoneArea,
        zoneLiquidWater: this.zonalSurface.liquidWater[zone] || 0
      };
      const factoryCoolingScale = weightedEffectiveLight > 0 ? zonalEffectiveLight[zone] / weightedEffectiveLight : 0;
      const netSurfaceHeatFlux = this.getNetSurfaceHeatFlux(factoryCoolingScale, megaHeatSinkAllocation);
      const zTemps = dayNightTemperaturesModel({
        ...baseParams,
        flux: zoneFlux,
        addedSurfaceFlux: netSurfaceHeatFlux,
        surfaceFractions: zoneFractions,
        autoSlabOptions: slabOptions,
        slabHeatCapacity: projectionContext ? projectionContext.zoneContexts[zone].slabHeatCapacity : null,
        resolvedAlbedo: projectionContext ? projectionContext.zoneContexts[zone].resolvedAlbedo : null,
        rawGreenhouse
      });

      // Slab heat capacity (J/m²/K) including atmosphere + ocean/ice/soil
      const area = zoneArea; // m²
      const Cslab = zoneCapacity.Cslab;
      const capacityPerArea = zoneCapacity.capacityPerArea;
      z[zone] = {
        mean: zTemps.mean,
        day: zTemps.day,
        night: zTemps.night,
        eq: zTemps.equilibriumTemperature,
        albedo: zTemps.albedo,
        greenhouseFactor: zTemps.greenhouseFactor,
        frac: zoneFractions,
        area,
        Cslab,
        capacityPerArea,
        netSurfaceHeatFlux
      };
      weightedEqTemp += zTemps.equilibriumTemperature * pct;
      weightedFluxUnpenalized += zoneFlux * pct;
    }

    // --- Meridional (equator↔pole) mixing strength --------------------
    // Column mass (kg/m²) — higher => stronger mixing
    let mixFrac = projectionContext ? projectionContext.mixFrac : 0;
    if (!projectionContext) {
      const columnMass = effectiveSurfacePressurePa / Math.max(gSurface, 1e-6);
      const mixingParameters = terraformingParameters.climate.meridionalMixing;
      const MASS_REF = mixingParameters.referenceColumnMassKgM2;
      const K_MASS = mixingParameters.columnMassRate;
      const A_MASS = mixingParameters.columnMassExponent;

      // 0..~1: 1-e^{-K (M/Mref)^a}
      const massBoost = 1 - Math.exp(-K_MASS * Math.pow(columnMass / MASS_REF, A_MASS));

      // Rotation boost: slower rotation ⇒ larger Hadley cells (cap at 3×)
      const rotFactor = Math.min(mixingParameters.maximumRotationFactor, Math.sqrt(Math.max(mixingParameters.minimumRotationPeriodRatio, rotationPeriodH / mixingParameters.referenceRotationPeriodHours)));

      // Planet-wide liquid coverage (water + hydrocarbons), 0..1
      let liquidCoverageWeighted = 0,
        areaSum = 0;
      for (const zone of ORDER) {
        const liq = (z[zone].frac.ocean || 0) + (z[zone].frac.hydrocarbon || 0);
        liquidCoverageWeighted += liq * z[zone].area;
        areaSum += z[zone].area;
      }
      const liquidCoverage = areaSum > 0 ? liquidCoverageWeighted / areaSum : 0;

      // Gas-driven meridional mixing (0..1)
      let gasMix = massBoost * rotFactor;
      gasMix = Math.max(0, Math.min(1, gasMix));

      // Liquid-driven mixing (0..1) — independent contribution
      // 0 when no liquid, approaches 1 as coverage rises
      let liqMix = Math.max(0, Math.min(1, liquidCoverage));

      // Combine independent channels so either can reach 1 alone
      mixFrac = 1 - (1 - gasMix) * (1 - liqMix);
      mixFrac = Math.max(0, Math.min(mixingParameters.maximumMixFraction, mixFrac));
    }

    // Weights are energy capacities (J/K) so updates conserve energy
    const W = projectionContext ? projectionContext.zoneWeights : {};
    const T = {};
    for (const zone of ORDER) {
      if (!projectionContext) {
        W[zone] = (z[zone].capacityPerArea || 0) * (z[zone].area || 0);
      }
      T[zone] = z[zone].mean;
    }
    let totalWeight = projectionContext ? projectionContext.totalWeight : 0;
    let weightedMean = 0;
    for (const zone of ORDER) {
      if (!projectionContext) totalWeight += W[zone];
      weightedMean += T[zone] * W[zone];
    }
    if (totalWeight > 0 && mixFrac > 0) {
      weightedMean /= totalWeight;
      for (const zone of ORDER) {
        T[zone] += (weightedMean - T[zone]) * mixFrac;
      }
    }
    const baselineCombinedFluxes = {};
    const availableHeatingPowerDemands = {};
    const megaHeatSinkCoolingPowerDemands = {};
    let totalAvailableHeatingPowerDemand = 0;
    let totalMegaHeatSinkCoolingPowerDemand = 0;
    for (const zone of ORDER) {
      const previousMean = this.temperature.zones[zone].value;
      const capacity = z[zone].capacityPerArea;
      const greenhouseFactor = z[zone].greenhouseFactor || 1;
      const desiredDelta = T[zone] - previousMean;
      const zoneFlux = this.luminosity.zonalFluxes[zone];
      const usesFlatSurfaceFlux = isRingWorld() || isAldersonDiskWorld();
      const zonalSurfaceHeatFlux = zonalSurfaceHeatFluxes?.[zone] || 0;
      const absorbedFlux = (1 - z[zone].albedo) * zoneFlux * (usesFlatSurfaceFlux ? 1 : 0.25) + z[zone].netSurfaceHeatFlux;
      const emittedFlux = greenhouseFactor > 0 ? STEFAN_BOLTZMANN * Math.pow(Math.max(previousMean, 0), 4) / greenhouseFactor : 0;
      let nearIrCoolingFlux = 0;
      if (!ignoreHeatCapacity && dtSeconds > 0 && desiredDelta < 0) {
        const currentGreenhouse = calculateEffectiveGreenhouseOpticalDepth(effectiveComposition, effectiveSurfacePressureBar, gSurface, previousMean, greenhouseModel, rawGreenhouse);
        const currentGreenhouseFactor = 1 + 0.75 * currentGreenhouse.tau;
        const currentTemperatureEmission = currentGreenhouseFactor > 0 ? STEFAN_BOLTZMANN * Math.pow(Math.max(previousMean, 0), 4) / currentGreenhouseFactor : 0;
        nearIrCoolingFlux = Math.max(0, currentTemperatureEmission - emittedFlux);
      }
      const mixingDelta = T[zone] - z[zone].mean;
      const emittedFluxPreTarget = greenhouseFactor > 0 ? STEFAN_BOLTZMANN * Math.pow(Math.max(z[zone].mean, 0), 4) / greenhouseFactor : 0;
      const emittedFluxTarget = greenhouseFactor > 0 ? STEFAN_BOLTZMANN * Math.pow(Math.max(T[zone], 0), 4) / greenhouseFactor : 0;
      const windFlux = mixingDelta !== 0 ? emittedFluxPreTarget - emittedFluxTarget : 0;
      const nonPhaseCombinedFlux = absorbedFlux - emittedFlux - windFlux - nearIrCoolingFlux;
      let combinedFlux = nonPhaseCombinedFlux + zonalSurfaceHeatFlux;
      if (zonalSurfaceHeatFlux !== 0 && (desiredDelta === 0 || desiredDelta > 0 && combinedFlux < 0 || desiredDelta < 0 && combinedFlux > 0)) {
        combinedFlux = 0;
      }
      baselineCombinedFluxes[zone] = combinedFlux;
      const baselineTemperature = !ignoreHeatCapacity && dtSeconds > 0 && capacity > 0 ? previousMean + combinedFlux * dtSeconds / capacity : previousMean;
      let heatingPowerDemand = 0;
      if (allowAvailableHeating && !ignoreHeatCapacity && dtSeconds > 0 && desiredDelta > 0 && capacity > 0) {
        const requiredHeatingFlux = Math.max(0, (T[zone] - baselineTemperature) * capacity / dtSeconds);
        heatingPowerDemand = requiredHeatingFlux * (z[zone].area || 0);
      }
      availableHeatingPowerDemands[zone] = heatingPowerDemand;
      totalAvailableHeatingPowerDemand += heatingPowerDemand;
      let coolingPowerDemand = 0;
      if (!ignoreHeatCapacity && dtSeconds > 0 && desiredDelta < 0 && capacity > 0) {
        const requiredCoolingFlux = Math.max(0, (baselineTemperature - T[zone]) * capacity / dtSeconds);
        coolingPowerDemand = requiredCoolingFlux * (z[zone].area || 0);
      }
      megaHeatSinkCoolingPowerDemands[zone] = coolingPowerDemand;
      totalMegaHeatSinkCoolingPowerDemand += coolingPowerDemand;
    }
    this.availableAdvancedHeatingPowerDemand = totalAvailableHeatingPowerDemand;
    const usableAvailableHeatingPower = Math.min(availableAdvancedHeatingPower, totalAvailableHeatingPowerDemand);
    const usableMegaHeatSinkCoolingPower = Math.min(megaHeatSinkAllocation.surplusCoolingPower, totalMegaHeatSinkCoolingPowerDemand);

    // --- Write back temperatures; shift day/night by mean offset ------
    for (const zone of ORDER) {
      const pct = this.getZoneWeight(zone);
      if (pct <= 0) {
        continue;
      }
      const dMean = z[zone].day - z[zone].mean;
      this.temperature.zones[zone].trendValue = T[zone];
      weightedTrendTemp += T[zone] * pct;
      // Keep the radiative equilibrium diagnostic (pre‑mix) visible
      this.temperature.zones[zone].equilibriumTemperature = z[zone].eq;
      const previousMean = this.temperature.zones[zone].value;
      const capacity = z[zone].capacityPerArea;
      let newTemp = 0;
      const desiredDelta = T[zone] - previousMean;
      if (ignoreHeatCapacity) {
        newTemp = T[zone];
      } else {
        const targetTemp = T[zone];
        let combinedFlux = baselineCombinedFluxes[zone];
        if (desiredDelta > 0 && usableAvailableHeatingPower > 0) {
          const zoneArea = z[zone].area || 0;
          const heatingPowerDemand = availableHeatingPowerDemands[zone] || 0;
          if (zoneArea > 0 && totalAvailableHeatingPowerDemand > 0 && heatingPowerDemand > 0) {
            const heatingPower = usableAvailableHeatingPower * (heatingPowerDemand / totalAvailableHeatingPowerDemand);
            const heatingFlux = heatingPower / zoneArea;
            combinedFlux += heatingFlux;
          }
        }
        if (desiredDelta < 0 && usableMegaHeatSinkCoolingPower > 0) {
          const zoneArea = z[zone].area || 0;
          const coolingPowerDemand = megaHeatSinkCoolingPowerDemands[zone] || 0;
          if (zoneArea > 0 && totalMegaHeatSinkCoolingPowerDemand > 0 && coolingPowerDemand > 0) {
            const coolingPower = usableMegaHeatSinkCoolingPower * (coolingPowerDemand / totalMegaHeatSinkCoolingPowerDemand);
            combinedFlux -= coolingPower / zoneArea;
          }
        }
        newTemp = previousMean + combinedFlux * dtSeconds / capacity;
        const crossesTarget = previousMean < targetTemp && newTemp > targetTemp || previousMean > targetTemp && newTemp < targetTemp;
        if (crossesTarget || Math.abs(newTemp - targetTemp) < 0.001) {
          newTemp = targetTemp;
        }
      }
      this.temperature.zones[zone].value = newTemp;
      this.temperature.zones[zone].day = newTemp + dMean;
      const nightTemperature = newTemp - dMean;
      const minimumNightTemperature = newTemp / 4;
      this.temperature.zones[zone].night = Math.max(nightTemperature, minimumNightTemperature);
      weightedTemp += newTemp * pct;
    }
    this.temperature.value = weightedTemp;
    this.temperature.trendValue = weightedTrendTemp;
    this.temperature.equilibriumTemperature = weightedEqTemp;
    const greenhouseDiagnostics = calculateEmissivity(effectiveComposition, effectiveSurfacePressureBar, gSurface, weightedEqTemp, greenhouseModel, projectionContext ? projectionContext.rawGreenhouse : null);
    const diagnosticTau = greenhouseDiagnostics.tau;
    this.temperature.emissivity = greenhouseDiagnostics.emissivity;
    this.temperature.opticalDepth = diagnosticTau;
    this.temperature.opticalDepthContributions = diagnosticTau === 0 ? {} : greenhouseDiagnostics.contributions;
    const isRingworld = isRingWorld();
    const usesFlatSurfaceFlux = isRingworld || isAldersonDiskWorld();
    const averageFlux = weightedFluxUnpenalized / 4;
    const ringworldFlux = this.luminosity.solarFlux;
    this.luminosity.modifiedSolarFluxUnpenalized = isRingworld ? ringworldFlux : usesFlatSurfaceFlux ? weightedFluxUnpenalized : averageFlux * 4;
    const penalty = Math.min(1, Math.max(0, this.luminosity.cloudHazePenalty || 0));
    this.luminosity.modifiedSolarFlux = this.luminosity.modifiedSolarFluxUnpenalized * (1 - penalty);
    this.temperature.effectiveTempNoAtmosphere = effectiveTemp(this.luminosity.surfaceAlbedo, this.luminosity.modifiedSolarFluxUnpenalized, {
      addedFlux: globalNetSurfaceHeatFlux
    });
    return Math.max(0, megaHeatSinkAllocation.surplusCoolingPower - usableMegaHeatSinkCoolingPower);
  },
  getRadiationDoseBoostFromEffects() {
    let surfaceBoost = 0;
    let orbitalBoost = 0;
    this.activeEffects.forEach(effect => {
      if (!effect || effect.type !== 'radiationDoseBoost') {
        return;
      }
      if (Number.isFinite(effect.surfaceDoseBoost_mSvPerDay)) {
        surfaceBoost += effect.surfaceDoseBoost_mSvPerDay;
      }
      if (Number.isFinite(effect.orbitalDoseBoost_mSvPerDay)) {
        orbitalBoost += effect.orbitalDoseBoost_mSvPerDay;
      }
    });
    return {
      surfaceBoost,
      orbitalBoost
    };
  },
  updateSurfaceRadiation() {
    const pressurePa = this.calculateTotalPressure() * 1000; // kPa -> Pa
    const g = this.celestialParameters.gravity || 1;
    const column_gcm2 = g > 0 ? pressurePa / g * 0.1 : 0; // kg/m^2 -> g/cm^2

    const parent = this.celestialParameters.parentBody || {};
    let distance_Rp = parent.refDistance_Rp || 1;
    if (parent.orbitRadius && parent.radius) {
      distance_Rp = parent.orbitRadius / parent.radius;
    }
    const opts = {};
    if (parent.beltFalloffExp !== undefined) opts.beltFalloffExp = parent.beltFalloffExp;
    const beltDose = parent.parentBeltAtRef_mSvPerDay || 0;
    const refDistance = parent.refDistance_Rp || 1;
    const dose = estimateSurfaceDoseByColumn(column_gcm2, distance_Rp, beltDose, refDistance, opts);
    const radiationBoost = this.getRadiationDoseBoostFromEffects();
    this.surfaceRadiation = dose.total + (radiationBoost.surfaceBoost || 0);
    this.radiationPenalty = radiationPenalty(this.surfaceRadiation);
    const orbitalDose = estimateSurfaceDoseByColumn(0, distance_Rp, beltDose, refDistance, opts);
    this.orbitalRadiation = orbitalDose.total + (radiationBoost.orbitalBoost || 0);
  },
  calculateZonalGroundAlbedo(zone) {
    const baseAlbedo = this.celestialParameters.albedo;
    const dustAlbedo = DustFactory.getDustZoneAlbedo(zone);
    const surfaceArea = this.celestialParameters.surfaceArea || 0;
    const dustFactory = buildings.dustFactory;
    const special = this.resources.special;
    const black = special.albedoUpgrades.value;
    const bRatioRaw = surfaceArea > 0 ? Math.max(0, black / surfaceArea) : 0;
    const totalApplied = Math.min(bRatioRaw, 1);
    const shareBlack = totalApplied;
    const untouched = Math.max(0, 1 - totalApplied);
    const blended = dustAlbedo * shareBlack + baseAlbedo * untouched;
    if (dustFactory.dustAlbedoTransitionActive) {
      const starts = dustFactory.dustAlbedoStarts;
      const start = starts ? starts[zone] : dustFactory.dustAlbedoStart ?? baseAlbedo;
      const transitioned = start * (1 - totalApplied) + blended * totalApplied;
      return transitioned;
    }
    return blended;
  },
  calculateGroundAlbedo() {
    let weighted = 0;
    for (const zone of getZones()) {
      weighted += this.calculateZonalGroundAlbedo(zone) * this.getZoneWeight(zone);
    }
    return weighted;
  },
  calculateZonalSurfaceAlbedo(zone) {
    const groundAlbedo = this.calculateZonalGroundAlbedo(zone);
    const fractions = typeof calculateZonalSurfaceFractions === 'function' ? calculateZonalSurfaceFractions(this, zone) : {
      ocean: 0,
      ice: 0,
      hydrocarbon: 0,
      hydrocarbonIce: 0,
      co2_ice: 0,
      ammonia: 0,
      ammoniaIce: 0,
      oxygen: 0,
      oxygenIce: 0,
      nitrogen: 0,
      nitrogenIce: 0,
      fineSand: 0,
      biomass: 0
    };
    return surfaceAlbedoMix(groundAlbedo, fractions, {
      biomass: getActiveBiomassAlbedo()
    });
  },
  calculateSurfaceAlbedo() {
    let weighted = 0;
    for (const zone of getZones()) {
      const alb = this.calculateZonalSurfaceAlbedo(zone);
      const pct = this.getZoneWeight(zone);
      weighted += alb * pct;
    }
    return weighted;
  },
  calculateEffectiveAlbedo() {
    return this.calculateSurfaceAlbedo();
  },
  calculateActualAlbedo() {
    const surf = this.calculateSurfaceAlbedo();
    const pressureBar = this.calculateTotalPressure() / 100;
    const gSurface = this.celestialParameters.gravity;
    const {
      composition,
      totalMass
    } = this.calculateAtmosphericComposition();

    // Build aerosols (shortwave) columns in kg/m^2
    const aerosolsSW = {};
    const area_m2 = 4 * Math.PI * Math.pow((this.celestialParameters.radius || 1) * 1000, 2);
    if (this.resources?.atmospheric?.calciteAerosol) {
      const mass_ton = this.resources.atmospheric.calciteAerosol.value || 0;
      const column = area_m2 > 0 ? mass_ton * 1000 / area_m2 : 0; // kg/m^2
      aerosolsSW.calcite = column;
    }
    const result = calculateActualAlbedoPhysics(surf, pressureBar, composition, gSurface, aerosolsSW) || {};
    const comps = result.components || {};
    const base = Number.isFinite(comps.A_surf) ? comps.A_surf : surf;
    const actual = Number.isFinite(result.albedo) ? result.albedo : base;
    const layerReflectivity = Number.isFinite(result.layerReflectivity) ? result.layerReflectivity : Number.isFinite(result?.diagnostics?.layerReflectivity) ? result.diagnostics.layerReflectivity : 0;
    const rawCloudHaze = Math.max(0, Math.min(1, layerReflectivity));
    const penalty = rawCloudHaze;
    const cloudFraction = Number.isFinite(result.cfCloud) ? result.cfCloud : 0;
    const hazeFraction = Number.isFinite(result.cfHaze) ? result.cfHaze : 0;
    const waterCloudActivity = result.cloudByGas.h2o || 0;
    return {
      albedo: actual,
      penalty,
      cloudHazeRaw: rawCloudHaze,
      cloudFraction,
      waterCloudActivity,
      hazeFraction
    };
  },
  _updateZonalCoverageCache() {
    const configs = this.zonalSurfaceResourceConfigs;
    for (const zone of getZones()) {
      const zoneArea = this.celestialParameters.surfaceArea * this.getZoneWeight(zone);
      const cacheEntry = {
        zoneArea
      };
      for (const config of configs) {
        const coverageKeys = config.coverageKeys || [];
        const coverageScales = config.coverageScales || {};
        const baseScale = config.coverageScale || 0.0001;
        for (const key of coverageKeys) {
          const zonalAmount = this.zonalSurface[key][zone] || 0;
          const scale = coverageScales[key] || baseScale;
          cacheEntry[key] = estimateCoverage(zonalAmount, zoneArea, scale);
        }
      }
      this.zonalCoverageCache[zone] = cacheEntry;
    }
  },
  _updateAtmosphericPressureCache() {
    const cache = buildAtmosphereContext(this.resources.atmospheric, this.celestialParameters.gravity, this.celestialParameters.radius, this.celestialParameters.surfaceArea);
    cache.totalPressureKPa = cache.totalPressure / 1000;
    this.atmosphericPressureCache = cache;
    return cache;
  },
  getHeatCapacity() {
    return this.heatCapacityCache || this._updateHeatCapacityCache();
  },
  _updateHeatCapacityCache() {
    const rotationPeriodH = Math.abs(this.celestialParameters.dayNightPeriod) || 24;
    const gSurface = this.celestialParameters.gravity || 9.81;
    const {
      totalMass
    } = this.calculateAtmosphericComposition();
    const surfacePressurePa = calculateAtmosphericPressure(totalMass / 1000, gSurface, this.celestialParameters.radius, this.celestialParameters.surfaceArea);
    const surfacePressureBar = surfacePressurePa / 1e5;
    const atmosphericHeatCapacity = calculateEffectiveAtmosphericHeatCapacity(this.resources.atmospheric, surfacePressurePa, gSurface);
    const liquidConfigs = surfaceLiquidHeatCapacityConfigs;
    const baseSlabOptions = {
      atmosphereCapacity: atmosphericHeatCapacity,
      liquidConfigs
    };
    const zones = getZones();
    const zoneCache = {};
    for (const zone of zones) {
      const zoneFractions = calculateZonalSurfaceFractions(this, zone);
      const zoneArea = (this.celestialParameters.surfaceArea || 0) * this.getZoneWeight(zone);
      const liquidCoverageByKey = {};
      const liquidMassByKey = {};
      for (const config of liquidConfigs) {
        liquidCoverageByKey[config.coverageKey] = this.zonalCoverageCache[zone]?.[config.coverageKey] || 0;
        liquidMassByKey[config.key] = this.zonalSurface[config.key][zone] || 0;
      }
      const slabOptions = {
        ...baseSlabOptions,
        zoneArea,
        liquidCoverageByKey,
        liquidMassByKey,
        zoneLiquidWater: this.zonalSurface.liquidWater[zone] || 0
      };
      const Cslab = autoSlabHeatCapacity(rotationPeriodH, surfacePressureBar, zoneFractions, gSurface, undefined, undefined, slabOptions);
      zoneCache[zone] = {
        fractions: zoneFractions,
        zoneArea,
        Cslab,
        capacityPerArea: Math.max(Cslab, MIN_SURFACE_HEAT_CAPACITY)
      };
    }
    this.heatCapacityCache = {
      rotationPeriodH,
      surfacePressurePa,
      surfacePressureBar,
      atmosphericHeatCapacity,
      zones: zoneCache
    };
    return this.heatCapacityCache;
  },
  _updateExosphereHeightCache() {
    const atmospheric = this.resources.atmospheric;
    let totalMassTons = 0;
    for (const key in atmospheric) {
      totalMassTons += atmospheric[key].value || 0;
    }
    const meanMolecularWeight = calculateMolecularWeight(atmospheric);
    const exosphereTemperatureK = estimateExosphereTemperatureK(this.luminosity.solarFlux);
    const surfaceTemperatureK = this.temperature.value;
    const totalMassKg = totalMassTons * 1000;
    const columnMassKgPerM2 = totalMassKg / this.celestialParameters.surfaceArea;
    const temperatureK = estimateExobaseTemperatureK({
      surfaceTemperatureK,
      exosphereTemperatureK,
      columnMassKgPerM2
    });
    this.exosphereHeightMeters = estimateExosphereHeightMeters({
      totalMassKg,
      meanMolecularWeightGmol: meanMolecularWeight,
      temperatureK,
      gravity: this.celestialParameters.gravity,
      surfaceAreaM2: this.celestialParameters.surfaceArea
    });
  },
  calculateTotalPressure() {
    const cache = this._updateAtmosphericPressureCache();
    return cache.totalPressure / 1000; // Convert Pa to kPa
  },
  calculateAtmosphericComposition() {
    let co2Mass = 0,
      h2oMass = 0,
      ch4Mass = 0,
      h2Mass = 0,
      h2so4Mass = 0,
      safeGHGMass = 0,
      inertMass = 0;
    for (const gas in this.resources.atmospheric) {
      const amountTons = this.resources.atmospheric[gas].value || 0;
      const kg = amountTons * 1000;
      if (gas === 'carbonDioxide') co2Mass += kg;else if (gas === 'atmosphericWater') h2oMass += kg;else if (gas === 'atmosphericMethane') ch4Mass += kg;else if (gas === 'hydrogen') h2Mass += kg;else if (gas === 'sulfuricAcid') h2so4Mass += kg;else if (gas === 'greenhouseGas') safeGHGMass += kg;else inertMass += kg;
    }
    const totalMass = co2Mass + h2oMass + ch4Mass + h2Mass + h2so4Mass + safeGHGMass + inertMass;
    const composition = {};
    if (totalMass > 0) {
      if (co2Mass > 0) composition.co2 = co2Mass / totalMass;
      if (h2oMass > 0) composition.h2o = h2oMass / totalMass;
      if (ch4Mass > 0) composition.ch4 = ch4Mass / totalMass;
      if (h2Mass > 0) composition.h2 = h2Mass / totalMass;
      if (h2so4Mass > 0) composition.h2so4 = h2so4Mass / totalMass;
      if (safeGHGMass > 0) composition.greenhouseGas = safeGHGMass / totalMass;
    }
    return {
      composition,
      totalMass
    };
  },
  getDiskMirrorDistanceAU(zone) {
    if (zone) {
      const bounds = getDiskZoneBoundsAU(zone);
      return (bounds.innerRadiusAU + bounds.outerRadiusAU) / 2;
    }
    const outerRadiusAU = this.getDiskOuterRadiusAU();
    const innerRadiusAU = currentPlanetParameters?.specialAttributes?.diskInnerRadiusAU || currentPlanetParameters?.specialAttributes?.disk?.innerRadiusAU || 0;
    return (innerRadiusAU + outerRadiusAU) / 2;
  },
  calculateMirrorEffect(zone) {
    // Solar flux hitting the mirror (same as base flux at mirror's position).
    let mirrorDistanceAU = this.celestialParameters.distanceFromSun;
    if (isAldersonDiskWorld()) {
      mirrorDistanceAU = this.getDiskMirrorDistanceAU(zone);
    }
    const solarFluxAtMirror = this.calculateSolarFlux(mirrorDistanceAU * AU_METER);
    const mirrorSurfaceArea = buildings['spaceMirror'].surfaceArea; // m^2

    // The total power intercepted by the mirror
    const interceptedPower = solarFluxAtMirror * mirrorSurfaceArea; // W
    // Intercepted power per unit surface area of the planet
    const powerPerUnitArea = interceptedPower / this.celestialParameters.crossSectionArea; // W/m²

    // Return both the total intercepted power and power per unit area
    return {
      interceptedPower: interceptedPower,
      powerPerUnitArea: powerPerUnitArea
    };
  },
  getArtificialSkySolarFluxMultiplier() {
    if (isEquilibrating) {
      return 1;
    }
    const pulsarParameters = hazardManager?.parameters?.pulsar;
    if (!pulsarParameters) {
      return 1;
    }
    const completionRatio = hazardManager?.pulsarHazard?.getArtificialSkyCompletionRatio?.(this, pulsarParameters) ?? projectManager?.projects?.artificialSky?.getCompletionFraction?.() ?? 0;
    const clampedCompletion = Math.max(0, Math.min(1, completionRatio));
    return 1 - clampedCompletion;
  },
  calculateSolarFlux(distanceFromSun) {
    if (this.celestialParameters?.rogue || this.celestialParameters.starLuminosity <= 0) {
      return BACKGROUND_SOLAR_FLUX;
    }
    const validDistance = Number.isFinite(distanceFromSun) && distanceFromSun > 0 ? distanceFromSun : (this.celestialParameters.distanceFromSun || 0) * AU_METER;
    if (!validDistance) {
      return BACKGROUND_SOLAR_FLUX;
    }
    const lum = SOLAR_LUMINOSITY_W * this.celestialParameters.starLuminosity;
    if (!Number.isFinite(lum) || lum <= 0) {
      return BACKGROUND_SOLAR_FLUX;
    }
    const scaledLuminosity = lum * this.getArtificialSkySolarFluxMultiplier();
    if (!Number.isFinite(scaledLuminosity) || scaledLuminosity <= 0) {
      return BACKGROUND_SOLAR_FLUX;
    }
    return scaledLuminosity / (4 * Math.PI * Math.pow(validDistance, 2)); // W/m²
  },
  getDiskOuterRadiusAU() {
    return currentPlanetParameters.specialAttributes?.diskRadiusAU || currentPlanetParameters.specialAttributes?.disk?.radiusAU || this.celestialParameters.distanceFromSun || 1;
  },
  getDiskStarRadiusAU() {
    return (currentPlanetParameters.star?.radiusSolar || 1) * SOLAR_RADIUS_AU;
  },
  calculateDiskDirectSolarFlux(zone) {
    const fixedZonalAverageFlux = currentPlanetParameters.specialAttributes?.fixedZonalAverageFlux;
    if (fixedZonalAverageFlux !== undefined) {
      return Math.max(fixedZonalAverageFlux, 2.4e-5);
    }
    const diskRadiusAU = Math.max(this.getDiskOuterRadiusAU(), 0.000001);
    const annulusRadiusAU = Math.max(diskRadiusAU * getDiskZoneRadiusRatio(zone), 0.000001);
    const orbitalFlux = this.calculateSolarFlux(annulusRadiusAU * AU_METER);
    const grazingFactor = Math.min(1, DISK_GRAZING_FLUX_FACTOR * Math.max(0, this.getDiskStarRadiusAU()) / annulusRadiusAU);
    return Math.max(orbitalFlux * grazingFactor, 2.4e-5);
  },
  calculateModifiedSolarFlux(distanceFromSunInMeters) {
    const fixedZonalAverageFlux = currentPlanetParameters.specialAttributes?.fixedZonalAverageFlux;
    const baseFlux = fixedZonalAverageFlux ?? this.calculateSolarFlux(distanceFromSunInMeters);
    const mirrorEffect = this.calculateMirrorEffect();
    const mirrorFlux = mirrorEffect.powerPerUnitArea;
    const lanternFlux = this.calculateLanternFlux();
    const mirrors = typeof buildings !== 'undefined' && buildings['spaceMirror'] ? Number.isFinite(buildings.spaceMirror.activeNumber) ? buildings.spaceMirror.activeNumber : typeof buildingCountToNumber === 'function' ? buildingCountToNumber(buildings.spaceMirror.active) : Math.max(0, Math.floor(Number(buildings.spaceMirror.active) || 0)) : 0;
    const mirrorProductivity = Number.isFinite(buildings?.spaceMirror?.productivity) ? buildings.spaceMirror.productivity : 1;
    let reverseFactor = 1;
    if (typeof mirrorOversightSettings !== 'undefined') {
      if (mirrorOversightSettings.advancedOversight) {
        const signedAssignments = mirrorOversightSettings.assignments?.mirrors || {};
        const netAssignedMirrors = (signedAssignments.tropical || 0) + (signedAssignments.temperate || 0) + (signedAssignments.polar || 0) + (signedAssignments.focus || 0);
        reverseFactor = mirrors > 0 ? netAssignedMirrors / mirrors : 1;
      } else {
        const dist = mirrorOversightSettings.distribution || {};
        const rev = mirrorOversightSettings.assignments?.reversalMode || {};
        const anyPerc = Math.max(0, 1 - ((dist.tropical || 0) + (dist.temperate || 0) + (dist.polar || 0) + (dist.focus || 0)));
        const reversedPerc = (rev.tropical ? dist.tropical || 0 : 0) + (rev.temperate ? dist.temperate || 0 : 0) + (rev.polar ? dist.polar || 0 : 0) + (rev.focus ? dist.focus || 0 : 0) + (rev.any ? anyPerc : 0);
        reverseFactor = 1 - 2 * reversedPerc;
      }
    }
    const mirrorContribution = mirrorFlux * mirrors * reverseFactor * mirrorProductivity;
    const total = baseFlux + mirrorContribution + lanternFlux;
    return Math.max(total, BACKGROUND_SOLAR_FLUX);
  },
  calculateLanternFlux() {
    const lantern = typeof buildings !== 'undefined' ? buildings['hyperionLantern'] : null;
    if (lantern && lantern.active > 0n) {
      const resourceFactor = Number.isFinite(lantern._baseProductivity) ? lantern._baseProductivity : Number.isFinite(lantern.productivity) ? lantern.productivity : 1;
      const assignmentFactor = lantern._allowFullProductivity ? 1 : Number.isFinite(lantern._assignmentShare) ? lantern._assignmentShare : 1;
      const rawProductionFactor = lantern.getEffectiveProductionMultiplier();
      const productionFactor = Number.isFinite(rawProductionFactor) ? rawProductionFactor : 1;
      const power = (lantern.powerPerBuilding || 0) * lantern.activeNumber * resourceFactor * productionFactor * assignmentFactor;
      const area = this.celestialParameters.crossSectionArea || this.celestialParameters.surfaceArea;
      return power / area;
    }
    return 0;
  },
  calculateZoneSolarFlux(zone, angleAdjusted = false, byPassFacility = false) {
    if (calculateZoneSolarFluxWithFacility && !byPassFacility) {
      return calculateZoneSolarFluxWithFacility(this, zone, angleAdjusted);
    }
    if (isAldersonDiskWorld()) {
      return this.calculateDiskDirectSolarFlux(zone);
    }
    const usesFlatSurfaceFlux = isRingWorld();
    const ratio = usesFlatSurfaceFlux ? getZoneRatio(zone) : angleAdjusted ? getZoneRatio(zone) : getZoneRatio(zone) / 0.25;
    return this.luminosity.solarFlux * ratio;
  },
  calculateSurfaceSolarFlux() {
    const fluxScale = isAldersonDiskWorld() ? 4 : 1;
    return this.luminosity.modifiedSolarFlux * fluxScale;
  },
  calculateZonalSurfaceSolarFlux(zone) {
    if (isRingWorld()) {
      const penalty = Math.min(1, Math.max(0, this.luminosity.cloudHazePenalty || 0));
      const baseFlux = this.luminosity.zonalFluxes?.tropical ?? this.luminosity.solarFlux;
      return baseFlux * 4 * (1 - penalty);
    }
    if (this.luminosity.zonalFluxes && Number.isFinite(this.luminosity.zonalFluxes[zone])) {
      const penalty = Math.min(1, Math.max(0, this.luminosity.cloudHazePenalty || 0));
      const fluxScale = isAldersonDiskWorld() ? 4 : 1;
      return this.luminosity.zonalFluxes[zone] * (1 - penalty) * fluxScale;
    }
    return this.calculateSurfaceSolarFlux();
  },
  calculateSolarPanelMultiplier() {
    return this.calculateSurfaceSolarFlux() / SOLAR_PANEL_BASE_LUMINOSITY;
  },
  calculateZonalSolarPanelMultiplier(zone) {
    return this.calculateZonalSurfaceSolarFlux(zone) / SOLAR_PANEL_BASE_LUMINOSITY;
  },
  calculateWindTurbineMultiplier() {
    const pressureKPa = this.calculateTotalPressure();
    const pressureAtm = pressureKPa / KPA_PER_ATM;
    return Math.sqrt(pressureAtm);
  }
}));
