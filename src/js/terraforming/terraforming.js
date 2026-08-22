const TERRAFORMING_GAMEPLAY_PARAMETERS = terraformingParameters.gameplay;
const TERRAFORMING_SOLAR_PARAMETERS = TERRAFORMING_GAMEPLAY_PARAMETERS.solar;
const TERRAFORMING_TEMPERATURE_PARAMETERS = TERRAFORMING_GAMEPLAY_PARAMETERS.temperature;
const TERRAFORMING_SURFACE_HEAT_PARAMETERS = TERRAFORMING_GAMEPLAY_PARAMETERS.surfaceHeat;
const TERRAFORMING_SIMULATION_PARAMETERS = TERRAFORMING_GAMEPLAY_PARAMETERS.simulation;
const TERRAFORMING_OXIDATION_PARAMETERS = terraformingParameters.atmosphere.chemistry.oxidation;
const TERRAFORMING_AEROBRAKING_PARAMETERS = terraformingParameters.atmosphere.aerobraking;
const SOLAR_LUMINOSITY_W = terraformingParameters.physical.solarLuminosityW;
let starLuminosityMultiplier = 1; // Multiplier relative to Sol
function setStarLuminosity(multiplier) {
  starLuminosityMultiplier = Number.isFinite(multiplier) ? multiplier : 1;
}
function getStarLuminosity() {
  return starLuminosityMultiplier;
}
const AU_METER = terraformingParameters.physical.astronomicalUnitMeters;
const SOLAR_RADIUS_AU = terraformingParameters.physical.solarRadiusAu;
const DISK_GRAZING_FLUX_FACTOR = TERRAFORMING_SOLAR_PARAMETERS.diskGrazingFluxFactor;

const SOLAR_PANEL_BASE_LUMINOSITY = TERRAFORMING_SOLAR_PARAMETERS.solarPanelBaseLuminosity;
const BACKGROUND_SOLAR_FLUX = TERRAFORMING_SOLAR_PARAMETERS.backgroundSolarFluxWm2;
const COMFORTABLE_TEMPERATURE_MIN = TERRAFORMING_TEMPERATURE_PARAMETERS.comfortableMinimumK;
const COMFORTABLE_TEMPERATURE_MAX = TERRAFORMING_TEMPERATURE_PARAMETERS.comfortableMaximumK;
const MAINTENANCE_PENALTY_THRESHOLD = TERRAFORMING_TEMPERATURE_PARAMETERS.maintenancePenaltyThresholdK;
const MAINTENANCE_PENALTY_EXPONENTIAL_THRESHOLD = TERRAFORMING_TEMPERATURE_PARAMETERS.maintenancePenaltyExponentialThresholdK;
const MAINTENANCE_PENALTY_LINEAR_RATE = TERRAFORMING_TEMPERATURE_PARAMETERS.maintenancePenaltyLinearRatePerK;
const MAINTENANCE_PENALTY_EXPONENTIAL_DOUBLING_INTERVAL = TERRAFORMING_TEMPERATURE_PARAMETERS.maintenancePenaltyDoublingIntervalK;
const MAINTENANCE_PENALTY_MAX_MULTIPLIER = TERRAFORMING_TEMPERATURE_PARAMETERS.maintenancePenaltyMaximumMultiplier;
const KPA_PER_ATM = terraformingParameters.physical.paPerAtmosphere / 1000;

function calculateMaintenancePenaltyForTemperature(temp) {
  if (!Number.isFinite(temp) || temp <= MAINTENANCE_PENALTY_THRESHOLD) {
    return 1;
  }

  const linearPenalty =
    1 +
    MAINTENANCE_PENALTY_LINEAR_RATE *
      (temp - MAINTENANCE_PENALTY_THRESHOLD);

  if (temp <= MAINTENANCE_PENALTY_EXPONENTIAL_THRESHOLD) {
    return linearPenalty;
  }

  const thresholdPenalty =
    1 +
    MAINTENANCE_PENALTY_LINEAR_RATE *
      (MAINTENANCE_PENALTY_EXPONENTIAL_THRESHOLD - MAINTENANCE_PENALTY_THRESHOLD);
  const excessTemperature =
    temp - MAINTENANCE_PENALTY_EXPONENTIAL_THRESHOLD;
  const doublingExponent =
    excessTemperature / MAINTENANCE_PENALTY_EXPONENTIAL_DOUBLING_INTERVAL;

  return Math.min(
    MAINTENANCE_PENALTY_MAX_MULTIPLIER,
    thresholdPenalty * Math.pow(2, doublingExponent)
  );
}

function createEmptyZonalSurface() {
  return new ZonalResources(ZONAL_SURFACE_RESOURCE_KEYS, getZones());
}

function applyLegacyZonalSurface(target, source, mapping) {
  const data = source || {};
  const zones = getZones();
  for (const zone of zones) {
    const zoneSource = data[zone] || {};
    for (const [fromKey, toKey] of Object.entries(mapping)) {
      target.set(toKey, zone, zoneSource[fromKey] ?? target.get(toKey, zone));
    }
  }
}

function applyZonalSurfaceOverrides(target, overrides) {
  const data = overrides || {};
  const zones = getZones();
  for (const key of ZONAL_SURFACE_RESOURCE_KEYS) {
    const resourceSource = data[key] || {};
    for (const zone of zones) {
      const value = resourceSource[zone] ?? data[zone]?.[key];
      if (value !== undefined) {
        target.set(key, zone, value);
      }
    }
  }
}

function applyZonalSurfaceFromLegacy(target, legacy) {
  const source = legacy || {};
  for (const entry of LEGACY_ZONAL_SURFACE_MAPPINGS) {
    applyLegacyZonalSurface(target, source[entry.sourceKey], entry.map);
  }
  applyZonalSurfaceOverrides(target, source.zonalSurface);
}

function buildPhaseGroupMappings(groups) {
  const surfaceKeys = [];
  const liquidCoverageKeys = {};
  const legacyMappings = [];
  for (const [groupKey, group] of Object.entries(groups)) {
    surfaceKeys.push(group.surfaceKeys.liquid, group.surfaceKeys.ice, group.surfaceKeys.buriedIce);
    liquidCoverageKeys[groupKey] = group.surfaceKeys.liquid;
    legacyMappings.push({
      sourceKey: group.legacyZonalKey,
      map: {
        liquid: group.surfaceKeys.liquid,
        ice: group.surfaceKeys.ice,
        buriedIce: group.surfaceKeys.buriedIce,
      },
    });
  }
  surfaceKeys.push('liquidHydrogen', 'fineSand', 'biomass', 'hazardousBiomass');
  return {
    surfaceKeys,
    liquidCoverageKeys,
    legacyMappings,
  };
}

const phaseGroupMappings = buildPhaseGroupMappings(resourcePhaseGroups);
const LIQUID_COVERAGE_KEYS = phaseGroupMappings.liquidCoverageKeys;
const ZONAL_SURFACE_RESOURCE_KEYS = phaseGroupMappings.surfaceKeys;
const LEGACY_ZONAL_SURFACE_MAPPINGS = phaseGroupMappings.legacyMappings;

function buildLiquidCoverageTargets(requirements) {
  const fallbackLiquidType = requirements.liquidType || 'water';
  const hasFallbackTarget = Number.isFinite(requirements.liquidCoverageTarget);
  const fallbackTarget = hasFallbackTarget ? requirements.liquidCoverageTarget : 0;
  const entries = Array.isArray(requirements.liquidCoverageTargets) && requirements.liquidCoverageTargets.length
    ? requirements.liquidCoverageTargets
    : (hasFallbackTarget ? [{ liquidType: fallbackLiquidType, coverageTarget: fallbackTarget }] : []);

  const targets = [];
  for (const entry of entries) {
    const liquidType = entry.liquidType || fallbackLiquidType;
    const coverageKey = entry.coverageKey || LIQUID_COVERAGE_KEYS[liquidType] || LIQUID_COVERAGE_KEYS[fallbackLiquidType] || 'liquidWater';
    const rawTarget = Number.isFinite(entry.coverageTarget) ? entry.coverageTarget : fallbackTarget;
    const coverageTarget = Math.max(0, Math.min(rawTarget, 1));
    const comparison = entry.comparison === 'atMost' ? 'atMost' : 'atLeast';
    targets.push({ liquidType, coverageKey, coverageTarget, comparison });
  }
  return targets;
}

function isLiquidCoverageTargetMet(entry, currentCoverage) {
  if (entry.comparison === 'atMost') {
    return currentCoverage <= entry.coverageTarget;
  }
  return currentCoverage >= entry.coverageTarget;
}

const HYDROGEN_CAPPED_TERRAFORMING_COVERAGE_KEYS = {
  liquidWater: true,
  ice: true,
  liquidMethane: true,
  hydrocarbonIce: true,
  dryIce: true,
  liquidCO2: true,
  liquidAmmonia: true,
  ammoniaIce: true,
  liquidOxygen: true,
  oxygenIce: true,
  liquidNitrogen: true,
  nitrogenIce: true,
  fineSand: true,
};

function calculateTerraformingTargetCoverage(terraforming, coverageKey) {
  const rawCoverage = calculateAverageCoverage(terraforming, coverageKey) || 0;
  if (!HYDROGEN_CAPPED_TERRAFORMING_COVERAGE_KEYS[coverageKey]) {
    return rawCoverage;
  }
  const hydrogenCoverage = calculateAverageCoverage(terraforming, 'liquidHydrogen') || 0;
  return Math.min(rawCoverage, Math.max(0, 1 - hydrogenCoverage));
}

function buildZonalSurfaceResourceConfigs() {
  const configs = [];
  const surfaceResources = defaultPlanetResources.surface;
  for (const resourceKey in surfaceResources) {
    const resource = surfaceResources[resourceKey];
    const zonalConfig = resource.zonalConfig || {};
    const keys = zonalConfig.keys || [];
    if (keys.length === 0) {
      continue;
    }
    configs.push({
      name: resourceKey,
      resource,
      keys,
      coverageKeys: zonalConfig.coverageKeys || [],
      coverageScale: zonalConfig.coverageScale || 0.0001,
      coverageScales: zonalConfig.coverageScales || {},
      distributionKey: zonalConfig.distributionKey || keys[0] || resourceKey,
      distribution: zonalConfig.distribution || {},
    });
  }
  return configs;
}

function mergeExtraTerraformingRequirements(baseRequirements, extraRequirements) {
  const merged = { ...(baseRequirements || {}) };
  const baseOtherRequirements = Array.isArray(baseRequirements?.otherRequirements)
    ? baseRequirements.otherRequirements
    : [];
  const extraOtherRequirements = Array.isArray(extraRequirements)
    ? extraRequirements.filter((requirement) => requirement)
    : [];
  merged.otherRequirements = baseOtherRequirements.concat(extraOtherRequirements);
  return merged;
}

const STEFAN_BOLTZMANN = terraformingParameters.physical.stefanBoltzmannConstant;
const MIN_SURFACE_HEAT_CAPACITY = TERRAFORMING_SURFACE_HEAT_PARAMETERS.minimumHeatCapacityJPerM2K;
const MEGA_HEAT_SINK_POWER_W = TERRAFORMING_SURFACE_HEAT_PARAMETERS.megaHeatSinkPowerW;
const TERRAFORMING_RESOURCE_SUBSTEP_MS = TERRAFORMING_SIMULATION_PARAMETERS.resourceSubstepMs;
const TERRAFORMING_RESOURCE_MAX_SUBSTEPS = TERRAFORMING_SIMULATION_PARAMETERS.maximumResourceSubsteps;

function getEffectiveLifeFraction(terraforming) {
    const fraction = getEcumenopolisLandFraction(terraforming);
    return Math.max(0, (terraforming.life?.target || 0) - fraction);
}

function getLifeBiomassDensityTarget(terraforming) {
    return Math.max(0, terraforming?.requirements?.lifeBiomassDensityTargetTPerM2 || 0);
}

function getTerraformingTotalBiomass(terraforming) {
    let totalBiomass = 0;
    const zones = (terraforming && Array.isArray(terraforming.zoneKeys) && terraforming.zoneKeys.length)
      ? terraforming.zoneKeys
      : getZones();
    for (let i = 0; i < zones.length; i += 1) {
        const zone = zones[i];
        totalBiomass += terraforming.zonalSurface.biomass[zone] || 0;
    }
    return totalBiomass;
}

function getLifeBiomassDensity(terraforming) {
    const surfaceArea = terraforming?.celestialParameters?.surfaceArea || 0;
    return surfaceArea > 0 ? getTerraformingTotalBiomass(terraforming) / surfaceArea : 0;
}

function getEffectiveLifeTargetAmount(terraforming) {
    const densityTarget = getLifeBiomassDensityTarget(terraforming);
    if (densityTarget <= 0) {
        return 0;
    }
    return densityTarget * (terraforming?.celestialParameters?.surfaceArea || 0);
}

function buildAtmosphereContext(atmospheric, gravity, radius, surfaceArea) {
    let totalPressurePa = 0;
    const pressureByKey = {};
    const availableByKey = {};
    for (const key in atmospheric) {
        const amount = atmospheric[key]?.value || 0;
        const pressure = calculateAtmosphericPressure(amount, gravity, radius, surfaceArea);
        totalPressurePa += pressure;
        pressureByKey[key] = pressure;
        availableByKey[key] = amount;
    }
    return { totalPressure: totalPressurePa, pressureByKey, availableByKey };
}

function calculateInitialAtmosphericPressureForDelta(terraformingState, amount) {
    const currentCelestial = terraformingState.celestialParameters;
    const initialCelestial = terraformingState.initialCelestialParameters;
    const dynamicMassWorld = currentPlanetParameters.specialAttributes?.dynamicMass === true;
    const gravity = dynamicMassWorld
        ? (initialCelestial.gravity || initialCelestial.baseGravity)
        : currentCelestial.gravity;
    const radius = dynamicMassWorld
        ? (initialCelestial.radius || initialCelestial.baseRadius)
        : currentCelestial.radius;
    const surfaceArea = dynamicMassWorld
        ? initialCelestial.surfaceArea
        : currentCelestial.surfaceArea;
    return calculateAtmosphericPressure(amount, gravity, radius, surfaceArea);
}

class Terraforming extends EffectableEntity{
  constructor(resources, celestialParameters, specialAttributes = {}) {
    super({ description: 'This module manages all terraforming compononents' });

    this.resources = resources;
    this.summaryUnlocked = false;
    this.lifeDesignerUnlocked = false;
    this.milestonesUnlocked = false;
    this.hazardsUnlocked = false;
    this.zonalSurfaceResourceConfigs = buildZonalSurfaceResourceConfigs();
    this.zoneKeys = getZones();
    this.zoneWeights = {};
    let zoneWeightTotal = 0;
    for (let index = 0; index < this.zoneKeys.length; index += 1) {
      zoneWeightTotal += getZonePercentage(this.zoneKeys[index]);
    }
    zoneWeightTotal = zoneWeightTotal > 0 ? zoneWeightTotal : 1;
    for (let index = 0; index < ZONES.length; index += 1) {
      this.zoneWeights[ZONES[index]] = 0;
    }
    for (let index = 0; index < this.zoneKeys.length; index += 1) {
      const zone = this.zoneKeys[index];
      this.zoneWeights[zone] = getZonePercentage(zone) / zoneWeightTotal;
    }

    // Clone so config values remain immutable
    this.celestialParameters = structuredClone(celestialParameters);
    this.initialCelestialParameters = structuredClone(celestialParameters);
    this.celestialParameters.dayNightPeriod = this.celestialParameters.dayNightPeriod || this.celestialParameters.rotationPeriod || 24;
    this.initialCelestialParameters.dayNightPeriod = this.initialCelestialParameters.dayNightPeriod || this.initialCelestialParameters.rotationPeriod || 24;
    this.refreshDynamicWorldGeometry();

    const isRogueWorld = this.celestialParameters.rogue === true;
    const starLuminosity = isRogueWorld
      ? 0
      : (Number.isFinite(this.celestialParameters.starLuminosity)
        ? this.celestialParameters.starLuminosity
        : 1);
    this.celestialParameters.starLuminosity = starLuminosity;
    this.initialCelestialParameters.starLuminosity = starLuminosity;
    setStarLuminosity(starLuminosity);

    this.requirementId = specialAttributes.terraformingRequirementId
      || this.celestialParameters.terraformingRequirementId
      || DEFAULT_TERRAFORMING_REQUIREMENT_ID;
    this.requirements = mergeExtraTerraformingRequirements(
      getTerraformingRequirement(this.requirementId),
      specialAttributes.otherRequirements
    );
    this.gasTargets = this.requirements.gasTargetsPa;
    this.applyRequirementEffects();

    this.apparentEquatorialGravity = calculateApparentEquatorialGravity(this.celestialParameters);

    this.lifeParameters = lifeParameters; // Load external life parameters
    this.zonalCoverageCache = {};
    this.atmosphericPressureCache = {
        totalPressure: 0,
        totalPressureKPa: 0,
        pressureByKey: {},
        availableByKey: {},
    };
    this.heatCapacityCache = null;
    this.phaseChangeHeatPower = 0;
    this.phaseChangeHeatFlux = 0;
    this.phaseChangeHeatFluxByZone = { tropical: 0, temperate: 0, polar: 0 };
    this.phaseChangeHeatEnergyByZone = { tropical: 0, temperate: 0, polar: 0 };
    this.factoryHeatPower = 0;
    this.factoryHeatFlux = 0;
    this.factoryCoolingPower = 0;
    this.factoryCoolingFlux = 0;
    this.factoryHeatContributors = [];
    this.megaHeatSinkDirectHeatCapacityJ = 0;
    this.exosphereHeightMeters = 0;
    this.resourceSubstepMilliseconds = TERRAFORMING_RESOURCE_SUBSTEP_MS;
    this.maxResourceSubsteps = TERRAFORMING_RESOURCE_MAX_SUBSTEPS;
    this.moltenSurfaceAttritionPartialByStructure = {};
    this.lastMoltenSurfaceAttritionLosses = 0;

    this.initialValuesCalculated = false;
    this.completed = false;
      // Indicates whether all terraforming parameters are within target ranges
      // but completion has not yet been confirmed by the player
    this.readyForCompletion = false;

    // Zonal Surface Data
    this.zonalSurface = createEmptyZonalSurface();

    // Global liquid targets (supports multi-liquid terraforming requirements)
    this.liquidCoverageTargets = buildLiquidCoverageTargets(this.requirements);
    const waterTargetEntry = this.liquidCoverageTargets.find((entry) => entry.liquidType === 'water')
      || this.liquidCoverageTargets[0]
      || { coverageTarget: 0, coverageKey: 'liquidWater' };
    this.waterTarget = waterTargetEntry.coverageTarget;
    this.liquidCoverageKey = waterTargetEntry.coverageKey;
    this.waterUnlocked = false; // Global unlock status

    // Atmospheric amounts and pressures are derived from global resources.
    this.atmosphere = {
        name: t('ui.terraforming.coreNames.atmosphere', {}, 'Atmosphere'),
        totalPressureTargetRangeKPa: this.requirements.totalPressureRangeKPa,
        unlocked: false
    };
    this.temperature = {
      name: t('ui.terraforming.coreNames.temperature', {}, 'Temperature'),
      value: 0,
      trendValue: 0,
      targetMin: this.requirements.temperatureRangeK.min,
      targetMax: this.requirements.temperatureRangeK.max,
      effectiveTempNoAtmosphere: 0,
      equilibriumTemperature: 0,
      emissivity: 0,
      opticalDepth: 0,
      opticalDepthContributions: {},
      combustionWarmingRateKPerDay: 0,
      aerobrakingWarmingRateKPerDay: 0,
      unlocked: false,
      zones: {
        tropical: {
          initial: 0,
          value: 0,
          day: 0,
          night: 0,
          trendValue: 0,
          equilibriumTemperature: 0
        },
        temperate: {
          initial: 0,
          value: 0,
          day: 0,
          night: 0,
          trendValue: 0,
          equilibriumTemperature: 0
        },
        polar: {
          initial: 0,
          value: 0,
          day: 0,
          night: 0,
          trendValue: 0,
          equilibriumTemperature: 0
        }
      }
    };
    this.luminosity = {
      name: t('ui.terraforming.coreNames.luminosity', {}, 'Luminosity'),
      value: 100,
      targetMin: this.requirements.luminosityRange.min,
      targetMax: this.requirements.luminosityRange.max,
      unlocked: false,
      albedo: 0.25,
      groundAlbedo: 0,
      surfaceAlbedo: 0,
      actualAlbedo: 0,
      cloudFraction: 0,
      waterCloudActivity: 0,
      hazeFraction: 0,
      initialSurfaceAlbedo: undefined,
      initialActualAlbedo: undefined,
      solarFlux: 0,
      modifiedSolarFlux: 0,
      modifiedSolarFluxUnpenalized: 0,
      cloudHazePenalty: 0,
      cloudHazeRaw: 0,
      surfaceTemperature: 0,
      zonalFluxes : {}
    };
    this.biomassDyingZones = {};
    ['tropical', 'temperate', 'polar'].forEach(zone => {
        this.biomassDyingZones[zone] = false;
    });
    this.life = {
        name: t('ui.terraforming.coreNames.life', {}, 'Life'),
        unlocked: false,
        target: this.requirements.lifeCoverageTarget
    };
    this.magnetosphere = {
      name: t('ui.terraforming.coreNames.others', {}, 'Others'),
      value: 0,
      target: this.requirements.magnetosphereThreshold,
      unlocked: false
    };

    // If the planet has a natural magnetosphere, treat it as if the
    // magnetic shield project has already been completed.
    if (this.celestialParameters.hasNaturalMagnetosphere) {
      this.magnetosphere.value = 100;
      this.booleanFlags.add('magneticShield');
    }

    // Current estimated surface and orbital radiation in mSv/day
      this.surfaceRadiation = 0;
      this.orbitalRadiation = 0;
      this.radiationPenalty = 0;
      this.gravityPenaltyEnabled = Boolean(currentPlanetParameters.gravityPenaltyEnabled);
      this.gravityCostPenalty = this.gravityPenaltyEnabled
        ? this.calculateGravityCostPenalty()
        : createNoGravityPenalty();

  }

  getZoneWeight(zone) {
    const weight = this.zoneWeights ? this.zoneWeights[zone] : undefined;
    if (weight !== undefined) return weight;
    return getZonePercentage(zone);
  }

  calculateInitialValues(planetParameters = currentPlanetParameters) {
      const zones = getZones();
      const zonalTemperatureDefaults = planetParameters.zonalTemperatures;
      const hasZonalTemperatureDefaults = !!zonalTemperatureDefaults;

      if (!hasZonalTemperatureDefaults) {
          for (const zone of zones) {
              this.temperature.zones[zone].initial = this.temperature.zones[zone].value;
          }
      }
      const initialLiquidWater = planetParameters.resources.surface.liquidWater?.initialValue || 0;
      const initialIce = planetParameters.resources.surface.ice?.initialValue || 0;
          const initialDryIce = planetParameters.resources.surface.dryIce?.initialValue || 0;
          const initialBiomass = planetParameters.resources.surface.biomass?.initialValue || 0;
          const initialLiquidCO2 = planetParameters.resources.surface.liquidCO2?.initialValue || 0;
          const initialLiquidHydrogen = planetParameters.resources.surface.liquidHydrogen?.initialValue || 0;

      const singleZone = zones.length === 1;
      const iceZoneDistribution = singleZone ? null : { tropical: 0.01, temperate: 0.09, polar: 0.90 };
      const buriedFractions = singleZone ? null : { tropical: 1, temperate: 1, polar: 0.3 };

      zones.forEach(zone => {
          const zoneRatio = this.getZoneWeight(zone);
          // Distribute Liquid Water and Biomass proportionally
          this.zonalSurface.liquidWater[zone] = initialLiquidWater * zoneRatio;
          this.zonalSurface.biomass[zone] = initialBiomass * zoneRatio;
          this.zonalSurface.liquidCO2[zone] = initialLiquidCO2 * zoneRatio;
          this.zonalSurface.liquidHydrogen[zone] = initialLiquidHydrogen * zoneRatio;

          if (singleZone) {
            this.zonalSurface.ice[zone] = initialIce;
            this.zonalSurface.buriedIce[zone] = 0;
            this.zonalSurface.dryIce[zone] = initialDryIce;
          } else {
            const zoneIce = initialIce * (iceZoneDistribution[zone] || 0);
            const buriedFraction = buriedFractions[zone] || 0;
            this.zonalSurface.ice[zone] = zoneIce * (1 - buriedFraction);
            this.zonalSurface.buriedIce[zone] = zoneIce * buriedFraction;

            // Allocate Dry Ice only to Polar zone (assuming CO2 ice is less stable at lower latitudes initially)
            this.zonalSurface.dryIce[zone] = (zone === 'polar') ? initialDryIce : 0;
          }
  
          const initialLiquidMethane = planetParameters.resources.surface.liquidMethane?.initialValue || 0;
          const initialHydrocarbonIce = planetParameters.resources.surface.hydrocarbonIce?.initialValue || 0;
          const initialFineSand = planetParameters.resources.surface.fineSand?.initialValue || 0;
          this.zonalSurface.liquidMethane[zone] = initialLiquidMethane * zoneRatio;
          this.zonalSurface.hydrocarbonIce[zone] = initialHydrocarbonIce * zoneRatio;
          this.zonalSurface.fineSand[zone] = initialFineSand * zoneRatio;
      });

      applyZonalSurfaceFromLegacy(this.zonalSurface, planetParameters);

    // Initialize global atmospheric resource amounts (no longer storing in this.atmosphere.gases)
    for (const gas in planetParameters.resources.atmospheric) {
        const initialTotalGasAmount = planetParameters.resources.atmospheric[gas]?.initialValue || 0;
        if (this.resources.atmospheric[gas]) {
            this.resources.atmospheric[gas].value = initialTotalGasAmount; // Set initial value in global resource
        } else {
            console.warn(`Atmospheric gas '${gas}' defined in parameters but not in global resources.`);
        }
    }

      this.synchronizeGlobalResources();
      if (planetParameters.specialAttributes?.dynamicMass === true) {
          const baseCelestialParameters = structuredClone(planetParameters.celestialParameters);
          Object.assign(this.initialCelestialParameters, baseCelestialParameters);
          Object.assign(this.celestialParameters, baseCelestialParameters, {
              dynamicDirectMassDeltaKg: baseCelestialParameters.dynamicDirectMassDeltaKg || 0,
              dynamicDirectVolumeDeltaM3: baseCelestialParameters.dynamicDirectVolumeDeltaM3 || 0,
              dynamicMassDeltaKg: 0,
              dynamicSurfaceVolumeDeltaM3: 0,
              currentPlanetaryMassKg: null,
              currentSurfaceMassKg: null,
              currentAtmosphericMassKg: null,
              currentPlanetaryVolumeM3: null,
              currentSurfaceVolumeM3: null
          });
          this.refreshDynamicWorldGeometry(planetParameters);
          Object.assign(this.initialCelestialParameters, {
              mass: this.celestialParameters.mass,
              radius: this.celestialParameters.radius,
              gravity: this.celestialParameters.gravity,
              surfaceArea: this.celestialParameters.surfaceArea,
              crossSectionArea: this.celestialParameters.crossSectionArea
          });
          reconcileLandResourceValue();
      }
      this._updateZonalCoverageCache();
      this.updateLuminosity();
      this.luminosity.initialSurfaceAlbedo = this.luminosity.surfaceAlbedo;
      this.luminosity.initialActualAlbedo = this.luminosity.actualAlbedo;
      this.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });

      this.luminosity.initialSolarFlux = this.calculateSurfaceSolarFlux();

      if (hasZonalTemperatureDefaults && (!planetParameters.classification || !planetParameters.classification?.archetype == 'artificial')) {
          let weightedTemperature = 0;
          let weightedEquilibriumTemperature = 0;
          zones.forEach(zone => {
              const zoneDefaults = zonalTemperatureDefaults[zone] || {};
              const meanValue = zoneDefaults.value ?? this.temperature.zones[zone].value;
              const dayValue = zoneDefaults.day ?? meanValue;
              const nightValue = zoneDefaults.night ?? meanValue;

              this.temperature.zones[zone].initial = meanValue;
              this.temperature.zones[zone].value = meanValue;
              this.temperature.zones[zone].day = dayValue;
              this.temperature.zones[zone].night = nightValue;
              this.temperature.zones[zone].trendValue = meanValue;

              const zoneWeight = this.getZoneWeight(zone);
              weightedTemperature += meanValue * zoneWeight;
              weightedEquilibriumTemperature += (this.temperature.zones[zone].equilibriumTemperature ?? meanValue) * zoneWeight;
          });
          this.temperature.value = weightedTemperature;
          this.temperature.trendValue = weightedTemperature;
          this.temperature.equilibriumTemperature = weightedEquilibriumTemperature;
      } else {
          this.temperature.zones.tropical.value = this.temperature.zones.tropical.trendValue;
          this.temperature.zones.temperate.value = this.temperature.zones.temperate.trendValue;
          this.temperature.zones.polar.value = this.temperature.zones.polar.trendValue;
          this.temperature.zones.tropical.initial = this.temperature.zones.tropical.value;
          this.temperature.zones.temperate.initial = this.temperature.zones.temperate.value;
          this.temperature.zones.polar.initial = this.temperature.zones.polar.value;
      }
      this.initialValuesCalculated = true;
    }

    getSubstepDurations(deltaTime = 0, options = {}) {
        if (deltaTime <= 0) {
            return [];
        }
        if (options.ignoreSubstepping) {
            return [deltaTime];
        }
        if (!gameSettings.enableTerraformingSubsteps) {
            return [deltaTime];
        }
        if (deltaTime <= this.resourceSubstepMilliseconds) {
            return [deltaTime];
        }

        const durations = [];
        let remaining = deltaTime;
        while (
            remaining > this.resourceSubstepMilliseconds &&
            durations.length + 1 < this.maxResourceSubsteps
        ) {
            durations.push(this.resourceSubstepMilliseconds);
            remaining -= this.resourceSubstepMilliseconds;
        }
        durations.push(remaining);
        return durations;
    }

    refreshDynamicWorldGeometry(planetParameters = currentPlanetParameters) {
      return syncDynamicWorldGeometry(this, planetParameters);
    }

    runUpdateStep(deltaTime = 0, options = {}) {
      this.synchronizeGlobalResources();
      this.refreshDynamicWorldGeometry();
      syncStellarEvolutionState(this, currentPlanetParameters);
      if (deltaTime > 0 && options.disableStellarAbsorption !== true) {
        applyStellarEvolutionAbsorption(
          this,
          currentPlanetParameters,
          options.accumulatedSpecialChanges?.stellarAbsorption
        );
        this.synchronizeGlobalResources();
        this.refreshDynamicWorldGeometry();
      }
      this._updateZonalCoverageCache();
      this._updateAtmosphericPressureCache();
      this._updateHeatCapacityCache();

      this.updateLuminosity();
      this._updateExosphereHeightCache();
      const unusedMegaHeatSinkPower = this.updateSurfaceTemperature(deltaTime, options);
      const durationSeconds = Math.max(0, deltaTime) * 86400 / 1000;
      this.megaHeatSinkDirectHeatCapacityJ = unusedMegaHeatSinkPower * durationSeconds;

      this.apparentEquatorialGravity = calculateApparentEquatorialGravity(this.celestialParameters);
    }

    runHazardUpdate(deltaTime = 0, options = {}) {
      if (options.skipHazardUpdates) {
        return;
      }
      this.applyMoltenSurfaceAttrition(deltaTime);
      if (hazardManager && hazardManager.update) {
        hazardManager.update(deltaTime, this, options);
      }
    }

    finalizeUpdate(options = {}) {
      if (!options.skipTerraformingEffects) {
        this.applyTerraformingEffects();
      }

      this.readyForCompletion = this.getTerraformingStatus();
      this.updateSurfaceRadiation();
    }

    update(deltaTime = 0, options = {}, stepDurations = null) {
      const durations = Array.isArray(stepDurations) && stepDurations.length > 0
        ? stepDurations
        : this.getSubstepDurations(deltaTime);

      if (durations.length === 0) {
        this.runUpdateStep(0, options);
        this.runHazardUpdate(0, options);
        this.finalizeUpdate(options);
        return;
      }

      for (const stepDuration of durations) {
        this.runUpdateStep(stepDuration, options);
      }

      this.runHazardUpdate(deltaTime, options);
      this.finalizeUpdate(options);
    }

    applyBooleanFlag(effect) {
      super.applyBooleanFlag(effect);
      if (effect.flagId === 'summaryUnlocked' && typeof setTerraformingSummaryVisibility === 'function') {
        setTerraformingSummaryVisibility(!!effect.value);
      }
      if (effect.flagId === 'lifeDesignerUnlocked' && typeof setTerraformingLifeVisibility === 'function') {
        setTerraformingLifeVisibility(!!effect.value);
      }
      if (effect.flagId === 'milestonesUnlocked' && typeof setTerraformingMilestonesVisibility === 'function') {
        setTerraformingMilestonesVisibility(!!effect.value);
      }
      if (
        effect.flagId === 'hazardsUnlocked' &&
        effect.value &&
        typeof hazardManager !== 'undefined' &&
        hazardManager &&
        typeof hazardManager.enable === 'function'
      ) {
        hazardManager.enable();
      }
      if (effect.flagId === 'hazardsUnlocked') {
        this.hazardsUnlocked = !!effect.value;
      }
    }

    removeEffect(effect) {
      const result = super.removeEffect(effect);
      if (
        effect.type === 'booleanFlag' &&
        effect.flagId === 'summaryUnlocked' &&
        !this.summaryUnlocked &&
        typeof setTerraformingSummaryVisibility === 'function'
      ) {
        setTerraformingSummaryVisibility(false);
      }
      if (
        effect.type === 'booleanFlag' &&
        effect.flagId === 'lifeDesignerUnlocked' &&
        !this.lifeDesignerUnlocked &&
        typeof setTerraformingLifeVisibility === 'function'
      ) {
        setTerraformingLifeVisibility(false);
      }
      if (
        effect.type === 'booleanFlag' &&
        effect.flagId === 'milestonesUnlocked' &&
        !this.milestonesUnlocked &&
        typeof setTerraformingMilestonesVisibility === 'function'
      ) {
        setTerraformingMilestonesVisibility(false);
      }
      if (
        effect.type === 'booleanFlag' &&
        effect.flagId === 'hazardsUnlocked' &&
        typeof hazardManager !== 'undefined' &&
        hazardManager &&
        typeof hazardManager.disable === 'function'
      ) {
        hazardManager.disable();
        this.hazardsUnlocked = false;
      }
      return result;
    }

    initializeTerraforming(){
        initializeTerraformingTabs();
        if (typeof setTerraformingSummaryVisibility === 'function') {
          setTerraformingSummaryVisibility(this.summaryUnlocked);
        }
        if (typeof setTerraformingLifeVisibility === 'function') {
          setTerraformingLifeVisibility(this.lifeDesignerUnlocked);
        }
        if (typeof setTerraformingHazardsVisibility === 'function') {
          const hazardsEnabled = typeof hazardManager !== 'undefined' && hazardManager && hazardManager.enabled;
          setTerraformingHazardsVisibility(!!hazardsEnabled);
        }
        if (typeof setTerraformingMilestonesVisibility === 'function') {
          setTerraformingMilestonesVisibility(this.milestonesUnlocked);
        }
        if (
          typeof hazardManager !== 'undefined' &&
          hazardManager &&
          hazardManager.enabled &&
          typeof hazardManager.updateUI === 'function'
        ) {
          hazardManager.updateUI();
        }
        createTerraformingSummaryUI();
        if(!this.initialValuesCalculated){
          this.calculateInitialValues(currentPlanetParameters);
        }
    }
}

const terraformingMethodDependencies = {
  status: {
    calculateTerraformingTargetCoverage,
    getEffectiveLifeFraction,
    getLifeBiomassDensity,
    getLifeBiomassDensityTarget,
    isLiquidCoverageTargetMet,
  },
  resources: {
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
    waterCycle,
  },
  climate: {
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
    surfaceLiquidHeatCapacityConfigs,
  },
  effects: {
    COMFORTABLE_TEMPERATURE_MAX,
    COMFORTABLE_TEMPERATURE_MIN,
    KPA_PER_ATM,
    calculateAtmosphericHeatProperties,
    calculateInitialAtmosphericPressureForDelta,
    calculateMaintenancePenaltyForTemperature,
    createNoGravityPenalty,
    getFactoryTemperatureMaintenancePenaltyReduction,
    isBuildingEligibleForFactoryMitigation,
  },
  state: {
    ZONAL_SURFACE_RESOURCE_KEYS,
    applyZonalSurfaceFromLegacy,
    createEmptyZonalSurface,
    calculateApparentEquatorialGravity,
  },
};

function registerTerraformingMethods(groupName, createMethods) {
  const methods = createMethods(terraformingMethodDependencies[groupName]);
  for (const name in methods) {
    Object.defineProperty(Terraforming.prototype, name, {
      value: methods[name],
      configurable: true,
      writable: true,
    });
  }
}
