const SOLAR_LUMINOSITY_W = 3.828e26; // Base solar luminosity (W)
let starLuminosityMultiplier = 1; // Multiplier relative to Sol
function setStarLuminosity(multiplier) {
  starLuminosityMultiplier = Number.isFinite(multiplier) ? multiplier : 1;
}
function getStarLuminosity() {
  return starLuminosityMultiplier;
}
const C_P_AIR = 1004; // J/kg·K
const EPSILON = 0.622; // Molecular weight ratio
const AU_METER = 149597870700;

const SOLAR_PANEL_BASE_LUMINOSITY = 1000;
const BACKGROUND_SOLAR_FLUX = 6e-6;
const COMFORTABLE_TEMPERATURE_MIN = 288.15; // 15°C
const COMFORTABLE_TEMPERATURE_MAX = 293.15; // 20°C
const MAINTENANCE_PENALTY_THRESHOLD = 373.15; // 100°C
const KPA_PER_ATM = 101.325;
var resourcePhaseGroups;

function createEmptyZonalSurface() {
  const zonalSurface = {};
  const zones = getZones();
  for (const zone of zones) {
    const zoneStore = {};
    for (const key of ZONAL_SURFACE_RESOURCE_KEYS) {
      zoneStore[key] = 0;
    }
    zonalSurface[zone] = zoneStore;
  }
  return zonalSurface;
}

function applyLegacyZonalSurface(target, source, mapping) {
  const data = source || {};
  const zones = getZones();
  for (const zone of zones) {
    const zoneSource = data[zone] || {};
    const zoneTarget = target[zone];
    for (const [fromKey, toKey] of Object.entries(mapping)) {
      zoneTarget[toKey] = zoneSource[fromKey] ?? zoneTarget[toKey];
    }
  }
}

function applyZonalSurfaceOverrides(target, overrides) {
  const data = overrides || {};
  const zones = getZones();
  for (const zone of zones) {
    const zoneSource = data[zone] || {};
    const zoneTarget = target[zone];
    for (const key of ZONAL_SURFACE_RESOURCE_KEYS) {
      zoneTarget[key] = zoneSource[key] ?? zoneTarget[key];
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

let cloudPropsOnlyHelper;
let calculateCloudAlbedoContributionsHelper;
let terraformingRequirementLoader;
let terraformingRequirementPresets;
let defaultTerraformingRequirementId = 'human';

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
  surfaceKeys.push('biomass', 'hazardousBiomass');
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
  const fallbackTarget = Number.isFinite(requirements.liquidCoverageTarget) ? requirements.liquidCoverageTarget : 0;
  const entries = Array.isArray(requirements.liquidCoverageTargets) && requirements.liquidCoverageTargets.length
    ? requirements.liquidCoverageTargets
    : [{ liquidType: fallbackLiquidType, coverageTarget: fallbackTarget }];

  const targets = [];
  for (const entry of entries) {
    const liquidType = entry.liquidType || fallbackLiquidType;
    const coverageKey = LIQUID_COVERAGE_KEYS[liquidType] || LIQUID_COVERAGE_KEYS[fallbackLiquidType] || 'liquidWater';
    const rawTarget = Number.isFinite(entry.coverageTarget) ? entry.coverageTarget : fallbackTarget;
    const coverageTarget = Math.max(0, Math.min(rawTarget, 1));
    targets.push({ liquidType, coverageKey, coverageTarget });
  }
  return targets;
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

function getApparentEquatorialGravity(params) {
  if (calculateApparentEquatorialGravity) {
    return calculateApparentEquatorialGravity(params);
  }
  const gravity = params && Number.isFinite(params.gravity) ? params.gravity : 0;
  return gravity;
}

function getNoGravityPenalty() {
  if (createNoGravityPenalty) {
    return createNoGravityPenalty();
  }
  return { multiplier: 1, linearIncrease: 0, exponentialIncrease: 0 };
}

function resolveTerraformingRequirement(requirementId = defaultTerraformingRequirementId) {
  if (terraformingRequirements) {
    return terraformingRequirements[requirementId];
  }
  return {
    id: requirementId,
    temperatureRangeK: { min: 278.15, max: 298.15 },
    luminosityRange: { min: 600, max: 2000 },
    gasTargetsPa: {
      carbonDioxide: { min: 0, max: 100 },
      oxygen: { min: 15000, max: 25000 },
      inertGas: { min: 50000, max: 100000 }
    },
    liquidCoverageTarget: 0.2,
    liquidType: 'water',
    lifeCoverageTarget: 0.5,
    magnetosphereThreshold: 100,
    requireHazardClearance: true
  };
}

const STEFAN_BOLTZMANN = 5.670374419e-8;
const MIN_SURFACE_HEAT_CAPACITY = 100;
const AUTO_SLAB_ATMOS_CP = 850;
const MEGA_HEAT_SINK_POWER_W = 1_000_000_000_000_000;
let surfaceLiquidHeatCapacityConfigs = [];

// Load utility functions when running under Node for tests
var getZonePercentage, estimateCoverage, waterCycleInstance, methaneCycleInstance, co2CycleInstance, ammoniaCycleInstance, oxygenCycleInstance, nitrogenCycleInstance;
var getFactoryTemperatureMaintenancePenaltyReductionHelper;
var getAerostatMaintenanceMitigationHelper;
var isBuildingEligibleForFactoryMitigationHelper;
calculateEffectiveAtmosphericHeatCapacityHelper = calculateEffectiveAtmosphericHeatCapacity;

waterCycleInstance = waterCycle;
methaneCycleInstance = methaneCycle;
co2CycleInstance = co2Cycle;
ammoniaCycleInstance = ammoniaCycle;
oxygenCycleInstance = oxygenCycle;
nitrogenCycleInstance = nitrogenCycle;

if (!cloudPropsOnlyHelper && typeof globalThis.cloudPropsOnly === 'function') {
    cloudPropsOnlyHelper = globalThis.cloudPropsOnly;
}
if (!calculateCloudAlbedoContributionsHelper && typeof calculateCloudAlbedoContributions === 'function') {
    calculateCloudAlbedoContributionsHelper = calculateCloudAlbedoContributions;
}

try {
  surfaceLiquidHeatCapacityConfigs = window.surfaceLiquidHeatCapacityConfigs || [];
} catch (error) {
  surfaceLiquidHeatCapacityConfigs = [];
}
try {
  surfaceLiquidHeatCapacityConfigs = global.surfaceLiquidHeatCapacityConfigs || surfaceLiquidHeatCapacityConfigs;
} catch (error) {
  // Global not available.
}

function getSurfaceLiquidHeatCapacityConfigs() {
  if (surfaceLiquidHeatCapacityConfigs.length > 0) {
    return surfaceLiquidHeatCapacityConfigs;
  }
  try {
    return window.surfaceLiquidHeatCapacityConfigs || [];
  } catch (error) {
    // Browser-only export.
  }
  try {
    return global.surfaceLiquidHeatCapacityConfigs || [];
  } catch (error) {
    // Global not available.
  }
  return [];
}

function getEffectiveLifeFraction(terraforming) {
    const fraction = getEcumenopolisLandFraction(terraforming);
    return Math.max(0, (terraforming.life?.target || 0) - fraction);
}

var runAtmosphericChemistry;
var METHANE_COMBUSTION_PARAMETER_CONST;
var estimateExosphereHeightMetersHelper = () => 0;
var estimateExobaseTemperatureKHelper = () => 0;
var estimateExosphereTemperatureKHelper = () => 0;
var calculateMolecularWeightHelper = () => 0;

try {
  ({
    estimateExosphereHeightMeters: estimateExosphereHeightMetersHelper,
    estimateExobaseTemperatureK: estimateExobaseTemperatureKHelper
  } = require('./exosphere-utils.js'));
} catch (error) {
  try {
    estimateExosphereHeightMetersHelper = estimateExosphereHeightMeters;
  } catch (innerError) {
    // fallback stays
  }
  try {
    estimateExobaseTemperatureKHelper = estimateExobaseTemperatureK;
  } catch (innerError) {
    // fallback stays
  }
}

try {
  ({ estimateExosphereTemperatureK: estimateExosphereTemperatureKHelper } = require('./atmospheric-chemistry.js'));
} catch (error) {
  try {
    estimateExosphereTemperatureKHelper = estimateExosphereTemperatureK;
  } catch (innerError) {
    // fallback stays
  }
}

try {
  ({ calculateMolecularWeight: calculateMolecularWeightHelper } = require('./atmospheric-utils.js'));
} catch (error) {
  try {
    calculateMolecularWeightHelper = calculateMolecularWeight;
  } catch (innerError) {
    // fallback stays
  }
}


function buildAtmosphereContext(atmospheric, gravity, radius) {
    let totalPressurePa = 0;
    const pressureByKey = {};
    const availableByKey = {};
    for (const key in atmospheric) {
        const amount = atmospheric[key]?.value || 0;
        const pressure = calculateAtmosphericPressure(amount, gravity, radius);
        totalPressurePa += pressure;
        pressureByKey[key] = pressure;
        availableByKey[key] = amount;
    }
    return { totalPressure: totalPressurePa, pressureByKey, availableByKey };
}

class Terraforming extends EffectableEntity{
  constructor(resources, celestialParameters, specialAttributes = {}) {
    super({ description: 'This module manages all terraforming compononents' });

    this.resources = resources;
    this.summaryUnlocked = false;
    this.lifeDesignerUnlocked = false;
    this.milestonesUnlocked = false;
    this.hazardsUnlocked = false;
    this.initialLand = resources.surface?.land?.value || 0;
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

    const radiusMeters = this.celestialParameters.radius * 1000;
    if (!this.celestialParameters.surfaceArea) {
        this.celestialParameters.surfaceArea = 4 * Math.PI * Math.pow(radiusMeters, 2);
    }
    if (!this.celestialParameters.crossSectionArea) {
        this.celestialParameters.crossSectionArea = Math.PI * Math.pow(radiusMeters, 2);
    }

    const initRadiusMeters = this.initialCelestialParameters.radius * 1000;
    if (!this.initialCelestialParameters.surfaceArea) {
        this.initialCelestialParameters.surfaceArea = 4 * Math.PI * Math.pow(initRadiusMeters, 2);
    }
    if (!this.initialCelestialParameters.crossSectionArea) {
        this.initialCelestialParameters.crossSectionArea = Math.PI * Math.pow(initRadiusMeters, 2);
    }

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
      || defaultTerraformingRequirementId;
    this.requirements = resolveTerraformingRequirement(this.requirementId);
    this.gasTargets = this.requirements.gasTargetsPa;

    this.apparentEquatorialGravity = getApparentEquatorialGravity(this.celestialParameters);

    this.lifeParameters = lifeParameters; // Load external life parameters
    this.zonalCoverageCache = {};
    this.atmosphericPressureCache = {
        totalPressure: 0,
        totalPressureKPa: 0,
        pressureByKey: {},
        availableByKey: {},
    };
    this.heatCapacityCache = null;
    this.exosphereHeightMeters = 0;

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
      || this.liquidCoverageTargets[0];
    this.waterTarget = waterTargetEntry.coverageTarget;
    this.liquidCoverageKey = waterTargetEntry.coverageKey;
    this.waterUnlocked = false; // Global unlock status

    // Global atmosphere properties (Now primarily accessed via global 'resources.atmospheric')
    this.atmosphere = {
        name: 'Atmosphere',
        // value: 0, // REMOVED - Calculated on the fly
        // gases: {}, // REMOVED - Stored in global resources
        // globalPressures: {}, // REMOVED - Calculated on the fly
        // initialGlobalPressures: {}, // REMOVED - Calculated on the fly from initial resource values
        totalPressureTargetRangeKPa: this.requirements.totalPressureRangeKPa,
        unlocked: false // Keep track of unlock status if needed
    };
    this.temperature = {
      name: 'Temperature',
      value: 0,
      trendValue: 0,
      targetMin: this.requirements.temperatureRangeK.min,
      targetMax: this.requirements.temperatureRangeK.max,
      effectiveTempNoAtmosphere: 0,
      equilibriumTemperature: 0,
      emissivity: 0,
      opticalDepth: 0,
      opticalDepthContributions: {},
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
      name: 'Luminosity',
      value: 100,
      targetMin: this.requirements.luminosityRange.min,
      targetMax: this.requirements.luminosityRange.max,
      unlocked: false,
      albedo: 0.25,
      groundAlbedo: 0,
      surfaceAlbedo: 0,
      actualAlbedo: 0,
      cloudFraction: 0,
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
    // Global life properties (name, target, unlock status)
    this.life = {
        name: 'Life',
        unlocked: false,
        target: this.requirements.lifeCoverageTarget,
        // biomassCoverage: 0, // Removed - will be calculated from zonalSurface.biomass
        // dryIceCoverage: 0 // Removed - will be calculated from zonalSurface.dryIce
    };
    this.magnetosphere = {
      name: 'Others',
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
      this.gravityPenaltyEnabled = Boolean(globalThis.currentPlanetParameters?.gravityPenaltyEnabled);
      this.gravityCostPenalty = this.gravityPenaltyEnabled
        ? this.calculateGravityCostPenalty()
        : getNoGravityPenalty();

  }

  getZoneWeight(zone) {
    const weight = this.zoneWeights ? this.zoneWeights[zone] : undefined;
    if (weight !== undefined) return weight;
    return getZonePercentage(zone);
  }

  getMagnetosphereStatus() {
    if (this.magnetosphere.value >= this.magnetosphere.target) {
      return true;
    }
    if (this.isBooleanFlagSet('magneticShield')) {
      return true;
    }
    return false;
  }

  getTemperatureStatus() {
    return (this.temperature.value >= this.temperature.targetMin && this.temperature.value <= this.temperature.targetMax)
  }

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
  }

  getAtmosphereStatus() {
      const pressureTarget = this.atmosphere.totalPressureTargetRangeKPa;
      const totalPressureKPa = this.calculateTotalPressure();
      const totalPressureOk = !pressureTarget
        || (totalPressureKPa >= pressureTarget.min && totalPressureKPa <= pressureTarget.max);
      for (const gas in this.gasTargets) {
          const gasAmount = this.resources.atmospheric[gas]?.value || 0;
          const gasPressurePa = calculateAtmosphericPressure(
              gasAmount,
              this.celestialParameters.gravity,
              this.celestialParameters.radius
          );
          const target = this.gasTargets[gas];
          if (gasPressurePa < target.min || gasPressurePa > target.max) {
              return false;
          }
      }
      return totalPressureOk;
  }




  getWaterStatus() {
    for (const entry of this.liquidCoverageTargets) {
      if ((calculateAverageCoverage(this, entry.coverageKey) || 0) < entry.coverageTarget) {
        return false;
      }
    }
    return true;
  }

  getLuminosityStatus() {
    return ((this.luminosity.modifiedSolarFlux >= this.luminosity.targetMin) && (this.luminosity.modifiedSolarFlux <= this.luminosity.targetMax));
  }

  getLifeStatus() {
     // Compare average biomass coverage to the global target
    return (calculateAverageCoverage(this, 'biomass') >= getEffectiveLifeFraction(this));
  }

  getHazardClearanceStatus() {
    if (!this.requirements.requireHazardClearance) {
      return true;
    }
    try {
      return hazardManager.getHazardClearanceStatus(this);
    } catch (error) {
      // Fall back to direct hazardous biomass checks when hazard manager is unavailable.
    }
    const tolerance = 1e-6;
    for (const zone of getZones()) {
      if ((this.zonalSurface[zone]?.hazardousBiomass || 0) > tolerance) {
        return false;
      }
    }
    return true;
  }

  getTerraformingStatus() {
    return (
      this.getTemperatureStatus() &&
      this.getAtmosphereStatus() &&
      this.getWaterStatus() &&
      this.getLuminosityStatus() &&
      this.getLifeStatus() &&
      this.getHazardClearanceStatus() &&
      this.getMagnetosphereStatus()
    );
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
      // This code block belongs inside calculateInitialValues
      // Get initial amounts directly from provided planetParameters
      const initialLiquidWater = planetParameters.resources.surface.liquidWater?.initialValue || 0;
      const initialIce = planetParameters.resources.surface.ice?.initialValue || 0;
      const initialDryIce = planetParameters.resources.surface.dryIce?.initialValue || 0;
      const initialBiomass = planetParameters.resources.surface.biomass?.initialValue || 0;
      const initialLiquidCO2 = planetParameters.resources.surface.liquidCO2?.initialValue || 0;

      const singleZone = zones.length === 1;
      const iceZoneDistribution = singleZone ? null : { tropical: 0.01, temperate: 0.09, polar: 0.90 };
      const buriedFractions = singleZone ? null : { tropical: 1, temperate: 1, polar: 0.3 };

      zones.forEach(zone => {
          const zoneRatio = this.getZoneWeight(zone);
          // Distribute Liquid Water and Biomass proportionally
          this.zonalSurface[zone].liquidWater = initialLiquidWater * zoneRatio;
          this.zonalSurface[zone].biomass = initialBiomass * zoneRatio;
          this.zonalSurface[zone].liquidCO2 = initialLiquidCO2 * zoneRatio;

          if (singleZone) {
            this.zonalSurface[zone].ice = initialIce;
            this.zonalSurface[zone].buriedIce = 0;
            this.zonalSurface[zone].dryIce = initialDryIce;
          } else {
            const zoneIce = initialIce * (iceZoneDistribution[zone] || 0);
            const buriedFraction = buriedFractions[zone] || 0;
            this.zonalSurface[zone].ice = zoneIce * (1 - buriedFraction);
            this.zonalSurface[zone].buriedIce = zoneIce * buriedFraction;

            // Allocate Dry Ice only to Polar zone (assuming CO2 ice is less stable at lower latitudes initially)
            this.zonalSurface[zone].dryIce = (zone === 'polar') ? initialDryIce : 0;
          }
  
          const initialLiquidMethane = planetParameters.resources.surface.liquidMethane?.initialValue || 0;
          const initialHydrocarbonIce = planetParameters.resources.surface.hydrocarbonIce?.initialValue || 0;
          this.zonalSurface[zone].liquidMethane = initialLiquidMethane * zoneRatio;
          this.zonalSurface[zone].hydrocarbonIce = initialHydrocarbonIce * zoneRatio;
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

      // Initial global pressures are no longer stored here. They will be calculated
      // on the fly when needed (e.g., for delta or equilibrium calculations)
      // based on the initial values stored in planetParameters.resources.atmospheric.

      // Initial synchronization to update global resource amounts and calculate initial pressures
      this.synchronizeGlobalResources();
      this._updateZonalCoverageCache();
      this.updateLuminosity();
      this.luminosity.initialSurfaceAlbedo = this.luminosity.surfaceAlbedo;
      this.luminosity.initialActualAlbedo = this.luminosity.actualAlbedo;
      this.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });

      this.luminosity.initialSolarFlux = this.luminosity.modifiedSolarFlux;

      if (hasZonalTemperatureDefaults && (!planetParameters.classification || !planetParameters.classification?.archetype == 'artificial')) {
          let weightedTemperature = 0;
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

              weightedTemperature += meanValue * this.getZoneWeight(zone);
          });
          this.temperature.value = weightedTemperature;
          this.temperature.equilibriumTemperature = weightedTemperature;
      } else {
          this.temperature.zones.tropical.value = this.temperature.zones.tropical.trendValue;
          this.temperature.zones.temperate.value = this.temperature.zones.temperate.trendValue;
          this.temperature.zones.polar.value = this.temperature.zones.polar.trendValue;
          this.temperature.zones.tropical.initial = this.temperature.zones.tropical.value;
          this.temperature.zones.temperate.initial = this.temperature.zones.temperate.value;
          this.temperature.zones.polar.initial = this.temperature.zones.polar.value;
      }
      // Mark initial values as calculated
      this.initialValuesCalculated = true;
    } // Correct closing brace for calculateInitialValues



    // Calculates and applies changes from all atmospheric/surface processes for one tick,
    // ensuring calculations are based on the start-of-tick state.
    // Calculates and applies changes from atmospheric/surface processes for one tick,
    // using a global atmosphere model but zonal surface interactions.
    updateResources(deltaTime, options = {}) {
        this.update(deltaTime, options);

        const durationSeconds = 86400 * deltaTime / 1000; // 1 in-game second equals one day
        const realSeconds = deltaTime / 1000;
        if (durationSeconds <= 0) return;
        if (this.isBooleanFlagSet('ringworldLowGravityTerraforming')) return;


        const zones = getZones();
        const gravity = this.celestialParameters.gravity;
        const {
            totalPressure: globalTotalPressurePa,
            pressureByKey,
            availableByKey,
        } = this.atmosphericPressureCache;
        const globalMethanePressurePa = pressureByKey.atmosphericMethane || 0;
        const globalOxygenPressurePa = pressureByKey.oxygen || 0;
        const availableGlobalMethaneGas = availableByKey.atmosphericMethane || 0;
        const availableGlobalOxygenGas = availableByKey.oxygen || 0;

        if (!this.cycles) {
            this.cycles = [waterCycleInstance, methaneCycleInstance, co2CycleInstance, ammoniaCycleInstance, oxygenCycleInstance, nitrogenCycleInstance];
        }

        for (const cycle of this.cycles) {
            const params = {
                atmPressure: globalTotalPressurePa,
                vaporPressure: pressureByKey[cycle.atmKey] || 0,
                available: availableByKey[cycle.atmKey] || 0,
                durationSeconds,
                extraParams: cycle.getExtraParams ? cycle.getExtraParams(this) : {},
            };
            const totals = cycle.runCycle(this, zones, params);
            const delta = totals.totalAtmosphericChange || 0;
            const atmRes = this.resources.atmospheric[cycle.atmKey];
            if (atmRes) {
                atmRes.value = Math.max(0, atmRes.value + delta);
            }
            if (typeof cycle.updateResourceRates === 'function') {
                cycle.updateResourceRates(this, totals, durationSeconds);
            }
        }
        const chemTotals = runAtmosphericChemistry(this.resources, {
            globalOxygenPressurePa,
            globalMethanePressurePa,
            availableGlobalMethaneGas,
            availableGlobalOxygenGas,
            realSeconds,
            durationSeconds,
            surfaceArea: this.celestialParameters.surfaceArea,
            surfaceTemperatureK: this.temperature.value,
            gravity,
            solarFlux: this.luminosity.modifiedSolarFlux,
            atmosphericPressurePa : this.atmosphericPressureCache.totalPressure
        });

        for (const [key, delta] of Object.entries(chemTotals.changes)) {
            const res = this.resources.atmospheric[key];
            if (res && delta) {
                res.value = Math.max(0, res.value + delta);
            }
        }

        this.synchronizeGlobalResources();
        this._updateAtmosphericPressureCache();
      }

    // Function to update luminosity properties
    updateLuminosity() {
      this.luminosity.groundAlbedo = this.calculateGroundAlbedo();
      this.luminosity.surfaceAlbedo = this.calculateSurfaceAlbedo();
      const albRes = this.calculateActualAlbedo();
      this.luminosity.actualAlbedo = albRes.albedo;
      this.luminosity.cloudFraction = albRes.cloudFraction;
      this.luminosity.hazeFraction = albRes.hazeFraction;
      this.luminosity.cloudHazePenalty = albRes.penalty;
      this.luminosity.cloudHazeRaw = Number.isFinite(albRes.cloudHazeRaw)
        ? albRes.cloudHazeRaw
        : albRes.penalty;
      this.luminosity.albedo = this.luminosity.surfaceAlbedo;
      this.luminosity.solarFlux = this.calculateSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
    }

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
          equilibriumTemperature: zone.equilibriumTemperature,
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
          zones: zonesSnapshot,
        },
        luminosity: {
          modifiedSolarFlux: this.luminosity?.modifiedSolarFlux,
          modifiedSolarFluxUnpenalized: this.luminosity?.modifiedSolarFluxUnpenalized,
          zonalFluxes: zonalFluxSnapshot,
        },
      };
    }

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
    }

    updateSurfaceTemperature(deltaTimeMs = 0, options = {}) {
        const groundAlbedo = this.luminosity.groundAlbedo;
        const rotationPeriodH = Math.abs(this.celestialParameters.rotationPeriod) || 24;
        const gSurface = this.celestialParameters.gravity || 9.81;

        const { composition, totalMass } = this.calculateAtmosphericComposition();
        const surfacePressurePa = calculateAtmosphericPressure(
            totalMass / 1000,
            gSurface,
            this.celestialParameters.radius
        );
        const surfacePressureBar = surfacePressurePa / 1e5;

        const { emissivity, tau: computedTau, contributions: computedContributions } =
            calculateEmissivity(composition, surfacePressureBar, gSurface);
        const ignoreLowGravityAtmosphere = options?.ignoreLowGravityAtmosphere === true;
        const tau = this.isBooleanFlagSet('ringworldLowGravityTerraforming') && !ignoreLowGravityAtmosphere
          ? 0
          : computedTau;
        const contributions = tau === 0 ? {} : computedContributions;
        this.temperature.emissivity = emissivity;
        this.temperature.opticalDepth = tau;
        this.temperature.opticalDepthContributions = contributions;

        const aerosolsSW = {};
        const area_m2 = 4 * Math.PI * Math.pow((this.celestialParameters.radius || 1) * 1000, 2);
        if (this.resources?.atmospheric?.calciteAerosol) {
            const mass_ton = this.resources.atmospheric.calciteAerosol.value || 0;
            aerosolsSW.calcite = area_m2 > 0 ? (mass_ton * 1000) / area_m2 : 0;
        }

        const baseParams = {
            groundAlbedo,
            rotationPeriodH,
            surfacePressureBar,
            composition,
            gSurface,
            aerosolsSW
        };

    const ORDER = getZones();
    const z = {}; // per-zone working data

    const dtSeconds = Math.max(0, deltaTimeMs || 0) * (86400 / 1000);
    const greenhouseFactor = 1 + 0.75 * tau;
    const ignoreHeatCapacity = !!(options && options.ignoreHeatCapacity);
    const megaHeatSinkProject = projectManager?.projects?.megaHeatSink;
    const megaHeatSinkCount =
        megaHeatSinkProject?.heatSinksActive === false
          ? 0
          : (megaHeatSinkProject?.repeatCount ?? 0);
    const allowAvailableHeating =
        !!(mirrorOversightSettings?.advancedOversight) &&
        mirrorOversightSettings.allowAvailableToHeat !== false;
    let availableAdvancedHeatingPower = 0;
    if (allowAvailableHeating) {
      const mirrorEffect = this.calculateMirrorEffect();
      const mirrorPowerPer = mirrorEffect?.interceptedPower || 0;
      const totalMirrors = Math.max(0, buildings?.spaceMirror?.active || 0);
      const lantern = buildings?.hyperionLantern;
      const lanternBaseProductivity = Number.isFinite(lantern?._baseProductivity)
        ? lantern._baseProductivity
        : (Number.isFinite(lantern?.productivity) ? lantern.productivity : 1);
      const lanternPowerPer = lantern ? (lantern.powerPerBuilding || 0) * lanternBaseProductivity : 0;
      const assignM = mirrorOversightSettings.assignments?.mirrors || {};
      const assignL = mirrorOversightSettings.assignments?.lanterns || {};
      const assignedMirrors =
        (assignM.tropical || 0) +
        (assignM.temperate || 0) +
        (assignM.polar || 0) +
        (assignM.focus || 0);
      const assignedLanterns = mirrorOversightSettings.applyToLantern
        ? (assignL.tropical || 0) + (assignL.temperate || 0) + (assignL.polar || 0) + (assignL.focus || 0)
        : 0;
      const availableMirrors = Math.max(0, totalMirrors - assignedMirrors);
      const availableLanterns = mirrorOversightSettings.applyToLantern
        ? Math.max(0, (lantern?.active || 0) - assignedLanterns)
        : 0;
      availableAdvancedHeatingPower =
        (availableMirrors * mirrorPowerPer) +
        (availableLanterns * lanternPowerPer);
    }

    let weightedTemp = 0;
    let weightedTrendTemp = 0;
    let weightedEqTemp = 0;
    let weightedFluxUnpenalized = 0;
    const heatCapacityCache = this.getHeatCapacity();
    const baseSlabOptions = { atmosphereCapacity: heatCapacityCache.atmosphericHeatCapacity };
    for (const zone of ORDER) {
        const zoneFlux = this.calculateZoneSolarFlux(zone);
        this.luminosity.zonalFluxes[zone] = zoneFlux;

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
            zoneLiquidWater: this.zonalSurface[zone]?.liquidWater || 0
        };

        const zTemps = dayNightTemperaturesModel({
            ...baseParams,
            flux: zoneFlux,
            surfaceFractions: zoneFractions,
            autoSlabOptions: slabOptions
        });

        // Slab heat capacity (J/m²/K) including atmosphere + ocean/ice/soil
        const area = zoneArea; // m²
        const Cslab = zoneCapacity.Cslab;
        const capacityPerArea = zoneCapacity.capacityPerArea;

        z[zone] = {
            mean:  zTemps.mean,
            day:   zTemps.day,
            night: zTemps.night,
            eq:    zTemps.equilibriumTemperature,
            albedo: zTemps.albedo,
            frac:  zoneFractions,
            area,
            Cslab,
            capacityPerArea
        };

        weightedEqTemp           += zTemps.equilibriumTemperature * pct;
        weightedFluxUnpenalized  += zoneFlux * pct;
    }

    // --- Meridional (equator↔pole) mixing strength --------------------
    // Column mass (kg/m²) — higher => stronger mixing
    const columnMass = surfacePressurePa / Math.max(gSurface, 1e-6);

    // Tunables (picked to match Earth/Mars/Titan/Venus qualitatively)
    const MASS_REF = 1.03e4;  // ≈ Earth column mass at 1 bar
    const K_MASS   = 0.03;    // how quickly mixing rises with mass
    const A_MASS   = 1.0;     // exponent on (columnMass / MASS_REF)

    // 0..~1: 1-e^{-K (M/Mref)^a}
    const massBoost = 1 - Math.exp(-K_MASS * Math.pow(columnMass / MASS_REF, A_MASS));

    // Rotation boost: slower rotation ⇒ larger Hadley cells (cap at 3×)
    const rotFactor = Math.min(3, Math.sqrt(Math.max(0.5, rotationPeriodH / 24)));

    // Planet-wide liquid coverage (water + hydrocarbons), 0..1
    let liquidCoverageWeighted = 0, areaSum = 0;
    for (const zone of ORDER) {
        const liq = (z[zone].frac.ocean || 0) + (z[zone].frac.hydrocarbon || 0);
        liquidCoverageWeighted += liq * z[zone].area;
        areaSum += z[zone].area;
    }
    const liquidCoverage = areaSum > 0 ? liquidCoverageWeighted / areaSum : 0;

    // Liquids aid meridional transport; keep in a sane range [0.5, 2.0]
    const liquidFactor = 0.5 + 1.5 * Math.max(0, Math.min(1, liquidCoverage));

    // Final fraction of the zonal ΔT that is equalized in one pass (0..0.95)
    let mixFrac = massBoost * rotFactor * liquidFactor;
    mixFrac = Math.max(0, Math.min(0.95, mixFrac));

    // Weights are energy capacities (J/K) so updates conserve energy
    const W = {};
    const T = {};
    for (const zone of ORDER) {
        W[zone] = (z[zone].capacityPerArea || 0) * (z[zone].area || 0);
        T[zone] = z[zone].mean;
    }
    let totalWeight = 0;
    let weightedMean = 0;
    for (const zone of ORDER) {
        totalWeight += W[zone];
        weightedMean += T[zone] * W[zone];
    }
    if (totalWeight > 0 && mixFrac > 0) {
        weightedMean /= totalWeight;
        for (const zone of ORDER) {
            T[zone] += (weightedMean - T[zone]) * mixFrac;
        }
    }

    const heatWeights = {};
    let totalHeatWeight = 0;
    if (availableAdvancedHeatingPower > 0) {
        for (const zone of ORDER) {
            const previousMean = this.temperature.zones[zone].value;
            const desiredDelta = T[zone] - previousMean;
            const zoneArea = z[zone].area || 0;
            const weight = desiredDelta > 0 ? desiredDelta * zoneArea : 0;
            heatWeights[zone] = weight;
            totalHeatWeight += weight;
        }
    }

    // --- Write back temperatures; shift day/night by mean offset ------
    for (const zone of ORDER) {
        const zoneFlux = this.luminosity.zonalFluxes[zone];
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

        const absorbedFlux = (1 - z[zone].albedo) * zoneFlux * (isRingWorld() ? 1 : 0.25);
        const emittedFlux = greenhouseFactor > 0
            ? STEFAN_BOLTZMANN * Math.pow(Math.max(previousMean, 0), 4) / greenhouseFactor
            : 0;
        const netFlux = absorbedFlux - emittedFlux;

        let newTemp = 0;
        const desiredDelta = T[zone] - previousMean;
        const mixingDelta = T[zone] - z[zone].mean;

        if(ignoreHeatCapacity){
          newTemp = T[zone];
        }
        else{
            // Represent meridional mixing as the change in outgoing flux between pre- and post-wind temperatures
            const targetTemp = T[zone];
            const emittedFluxPreTarget = greenhouseFactor > 0
                ? STEFAN_BOLTZMANN * Math.pow(Math.max(z[zone].mean, 0), 4) / greenhouseFactor
                : 0;
            const emittedFluxTarget = greenhouseFactor > 0
                ? STEFAN_BOLTZMANN * Math.pow(Math.max(targetTemp, 0), 4) / greenhouseFactor
                : 0;
            const windFlux = mixingDelta !== 0 ? emittedFluxPreTarget - emittedFluxTarget : 0;
            let combinedFlux = netFlux - windFlux;

            if (desiredDelta < 0 && megaHeatSinkCount > 0) {
              const zoneArea = z[zone].area || 0;
              if (zoneArea > 0) {
                const zoneCoolingPower = megaHeatSinkCount * MEGA_HEAT_SINK_POWER_W * pct;
                const coolingFlux = zoneCoolingPower / zoneArea;
                combinedFlux -= coolingFlux;
              }
            }
            if (desiredDelta > 0 && availableAdvancedHeatingPower > 0) {
              const zoneArea = z[zone].area || 0;
              const heatWeight = heatWeights[zone] || 0;
              if (zoneArea > 0 && totalHeatWeight > 0 && heatWeight > 0) {
                const heatingPower = availableAdvancedHeatingPower * (heatWeight / totalHeatWeight);
                const heatingFlux = heatingPower / zoneArea;
                combinedFlux += heatingFlux;
              }
            }

            newTemp = previousMean + (combinedFlux * dtSeconds) / capacity;

            const crossesTarget =
                (previousMean < targetTemp && newTemp > targetTemp) ||
                (previousMean > targetTemp && newTemp < targetTemp);

            if (crossesTarget || Math.abs(newTemp - targetTemp) < 0.001) {
              newTemp = targetTemp;
            }
        }


        this.temperature.zones[zone].value = newTemp;
        this.temperature.zones[zone].day = newTemp + dMean;
        const nightTemperature = newTemp - dMean;
        const minimumNightTemperature = newTemp / 4;
        this.temperature.zones[zone].night = Math.max(nightTemperature, minimumNightTemperature);

        weightedTemp += newTemp*pct;
    }


        this.temperature.value = weightedTemp;
        this.temperature.trendValue = weightedTrendTemp;
        this.temperature.equilibriumTemperature = weightedEqTemp;

        const isRingworld = isRingWorld();
        const averageFlux = weightedFluxUnpenalized / 4;
        const ringworldFlux = this.luminosity.solarFlux;
        this.luminosity.modifiedSolarFluxUnpenalized = isRingworld
          ? ringworldFlux
          : (averageFlux * 4);
        const penalty = Math.min(1, Math.max(0, this.luminosity.cloudHazePenalty || 0));
        this.luminosity.modifiedSolarFlux = this.luminosity.modifiedSolarFluxUnpenalized * (1 - penalty);

        this.temperature.effectiveTempNoAtmosphere =
            effectiveTemp(this.luminosity.surfaceAlbedo, this.luminosity.modifiedSolarFluxUnpenalized);
    }

    // Estimate and store current surface and orbital radiation levels in mSv/day
    updateSurfaceRadiation() {
      const pressurePa = this.calculateTotalPressure() * 1000; // kPa -> Pa
      const g = this.celestialParameters.gravity || 1;
      const column_gcm2 = g > 0 ? (pressurePa / g) * 0.1 : 0; // kg/m^2 -> g/cm^2

      const parent = this.celestialParameters.parentBody || {};
      let distance_Rp = parent.refDistance_Rp || 1;
      if (parent.orbitRadius && parent.radius) {
        distance_Rp = parent.orbitRadius / parent.radius;
      }

      const opts = {};
      if (parent.beltFalloffExp !== undefined) opts.beltFalloffExp = parent.beltFalloffExp;

      const beltDose = parent.parentBeltAtRef_mSvPerDay || 0;
      const refDistance = parent.refDistance_Rp || 1;

        const dose = estimateSurfaceDoseByColumn(
          column_gcm2,
          distance_Rp,
          beltDose,
          refDistance,
          opts
        );
        this.surfaceRadiation = dose.total;
        this.radiationPenalty = radiationPenalty(this.surfaceRadiation);

      const orbitalDose = estimateSurfaceDoseByColumn(
        0,
        distance_Rp,
        beltDose,
        refDistance,
        opts
      );
      this.orbitalRadiation = orbitalDose.total;
    }

    calculateGroundAlbedo() {
        const baseAlbedo = this.celestialParameters.albedo;
        const blackAlbedo = dustFactorySettings.dustColorAlbedo; // black dust
        const whiteAlbedo = 0.8;  // white dust
        const surfaceArea = this.celestialParameters.surfaceArea || 0;

        const special = this.resources.special;
        const black = special.albedoUpgrades.value;
        const white = special.whiteDust.value;

        const bRatioRaw = surfaceArea > 0 ? Math.max(0, black / surfaceArea) : 0;
        const wRatioRaw = surfaceArea > 0 ? Math.max(0, white / surfaceArea) : 0;
        const totalApplied = Math.min(bRatioRaw + wRatioRaw, 1);
        let shareBlack = 0, shareWhite = 0;
        if (totalApplied > 0) {
            const sumRaw = bRatioRaw + wRatioRaw;
            // Distribute the applied coverage proportionally between black and white dust
            shareWhite = (wRatioRaw / sumRaw) * totalApplied;
            shareBlack = totalApplied - shareWhite;
        }
        const untouched = Math.max(0, 1 - totalApplied);
        const blended = (blackAlbedo * shareBlack) + (whiteAlbedo * shareWhite) + (baseAlbedo * untouched);

        if (dustFactorySettings.dustAlbedoTransitionActive) {
            const start = dustFactorySettings.dustAlbedoStart ?? baseAlbedo;
            const transitioned = (start * (1 - totalApplied)) + (blended * totalApplied);
            if (totalApplied >= 1) {
                dustFactorySettings.dustAlbedoTransitionActive = false;
            }
            return transitioned;
        }

        return blended;
    }

    calculateZonalSurfaceAlbedo(zone) {
        const groundAlbedo = this.calculateGroundAlbedo();
        const fractions = (typeof calculateZonalSurfaceFractions === 'function')
            ? calculateZonalSurfaceFractions(this, zone)
            : { ocean: 0, ice: 0, hydrocarbon: 0, hydrocarbonIce: 0, co2_ice: 0, ammonia: 0, ammoniaIce: 0, oxygen: 0, oxygenIce: 0, nitrogen: 0, nitrogenIce: 0, biomass: 0 };
        return surfaceAlbedoMix(groundAlbedo, fractions);
    }

    calculateSurfaceAlbedo() {
        let weighted = 0;
        for (const zone of getZones()) {
            const alb = this.calculateZonalSurfaceAlbedo(zone);
            const pct = this.getZoneWeight(zone);
            weighted += alb * pct;
        }
        return weighted;
    }

    calculateEffectiveAlbedo() {
        return this.calculateSurfaceAlbedo();
    }

    calculateActualAlbedo() {
        const surf = this.calculateSurfaceAlbedo();
        const pressureBar = this.calculateTotalPressure() / 100;
        const gSurface = this.celestialParameters.gravity;
        const { composition, totalMass } = this.calculateAtmosphericComposition();

        // Build aerosols (shortwave) columns in kg/m^2
        const aerosolsSW = {};
        const area_m2 = 4 * Math.PI * Math.pow((this.celestialParameters.radius || 1) * 1000, 2);
        if (this.resources?.atmospheric?.calciteAerosol) {
            const mass_ton = this.resources.atmospheric.calciteAerosol.value || 0;
            const column = area_m2 > 0 ? (mass_ton * 1000) / area_m2 : 0; // kg/m^2
            aerosolsSW.calcite = column;
        }

        const result = calculateActualAlbedoPhysics(surf, pressureBar, composition, gSurface, aerosolsSW) || {};
        const comps = result.components || {};
        const base = Number.isFinite(comps.A_surf) ? comps.A_surf : surf;
        const actual = Number.isFinite(result.albedo) ? result.albedo : base;
        const layerReflectivity = Number.isFinite(result.layerReflectivity)
          ? result.layerReflectivity
          : (Number.isFinite(result?.diagnostics?.layerReflectivity) ? result.diagnostics.layerReflectivity : 0);
        const rawCloudHaze = Math.max(0, Math.min(1, layerReflectivity));
        const penalty = rawCloudHaze;
        const cloudFraction = Number.isFinite(result.cfCloud) ? result.cfCloud : 0;
        const hazeFraction = Number.isFinite(result.cfHaze) ? result.cfHaze : 0;
        return {
            albedo: actual,
            penalty,
            cloudHazeRaw: rawCloudHaze,
            cloudFraction,
            hazeFraction
        };
    }

    _updateZonalCoverageCache() {
        const configs = this.zonalSurfaceResourceConfigs;
        for (const zone of getZones()) {
            const zoneArea = this.celestialParameters.surfaceArea * this.getZoneWeight(zone);
            const zoneData = this.zonalSurface[zone] || {};
            const cacheEntry = { zoneArea };
            for (const config of configs) {
                const coverageKeys = config.coverageKeys || [];
                const coverageScales = config.coverageScales || {};
                const baseScale = config.coverageScale || 0.0001;
                for (const key of coverageKeys) {
                    const zonalAmount = zoneData[key] || 0;
                    const scale = coverageScales[key] || baseScale;
                    cacheEntry[key] = estimateCoverage(zonalAmount, zoneArea, scale);
                }
            }
            this.zonalCoverageCache[zone] = cacheEntry;
        }
    }

    _updateAtmosphericPressureCache() {
        const cache = buildAtmosphereContext(
            this.resources.atmospheric,
            this.celestialParameters.gravity,
            this.celestialParameters.radius
        );
        cache.totalPressureKPa = cache.totalPressure / 1000;
        this.atmosphericPressureCache = cache;
        return cache;
    }

    getHeatCapacity() {
        return this.heatCapacityCache || this._updateHeatCapacityCache();
    }

    _updateHeatCapacityCache() {
        const rotationPeriodH = Math.abs(this.celestialParameters.rotationPeriod) || 24;
        const gSurface = this.celestialParameters.gravity || 9.81;
        const { totalMass } = this.calculateAtmosphericComposition();
        const surfacePressurePa = calculateAtmosphericPressure(
            totalMass / 1000,
            gSurface,
            this.celestialParameters.radius
        );
        const surfacePressureBar = surfacePressurePa / 1e5;
        const atmosphericHeatCapacity = calculateEffectiveAtmosphericHeatCapacityHelper(
            this.resources.atmospheric,
            surfacePressurePa,
            gSurface
        );
        const liquidConfigs = getSurfaceLiquidHeatCapacityConfigs();
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
                liquidMassByKey[config.key] = this.zonalSurface[zone]?.[config.key] || 0;
            }
            const slabOptions = {
                ...baseSlabOptions,
                zoneArea,
                liquidCoverageByKey,
                liquidMassByKey,
                zoneLiquidWater: this.zonalSurface[zone]?.liquidWater || 0
            };
            const Cslab = autoSlabHeatCapacity(
                rotationPeriodH,
                surfacePressureBar,
                zoneFractions,
                gSurface,
                undefined,
                undefined,
                slabOptions
            );
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
    }

    _updateExosphereHeightCache() {
        const atmospheric = this.resources.atmospheric;
        let totalMassTons = 0;
        for (const key in atmospheric) {
            totalMassTons += atmospheric[key].value || 0;
        }

        const meanMolecularWeight = calculateMolecularWeightHelper(atmospheric);
        const exosphereTemperatureK = estimateExosphereTemperatureKHelper(this.luminosity.solarFlux);
        const surfaceTemperatureK = this.temperature.value;
        const totalMassKg = totalMassTons * 1000;
        const columnMassKgPerM2 = totalMassKg / this.celestialParameters.surfaceArea;
        const temperatureK = estimateExobaseTemperatureKHelper({
            surfaceTemperatureK,
            exosphereTemperatureK,
            columnMassKgPerM2
        });

        this.exosphereHeightMeters = estimateExosphereHeightMetersHelper({
            totalMassKg,
            meanMolecularWeightGmol: meanMolecularWeight,
            temperatureK,
            gravity: this.celestialParameters.gravity,
            surfaceAreaM2: this.celestialParameters.surfaceArea
        });
    }

    update(deltaTime = 0, options = {}) {
      this.synchronizeGlobalResources();
      this._updateZonalCoverageCache(); // New call at the start of the update tick
      this._updateAtmosphericPressureCache();
      this._updateHeatCapacityCache();

      //First update luminosity
      this.updateLuminosity();
      this._updateExosphereHeightCache();

      // Update temperature with the new heat-capacity-aware integration
      this.updateSurfaceTemperature(deltaTime, options);

      this.apparentEquatorialGravity = getApparentEquatorialGravity(this.celestialParameters);

      // Update Resources will be called by resources.js
      //this.updateResources(deltaTime);

      // Update total atmospheric pressure (based on updated zonal amounts via synchronization later)
      // Note: synchronizeGlobalResources now calculates this.atmosphere.value
      // this.atmosphere.value = this.calculateTotalPressure(); // No longer needed here

      // Coverage is now calculated on-demand using calculateAverageCoverage from
      // terraforming-utils.js. Removed redundant calls to the old
      // calculateCoverage function.

      if (!options.skipTerraformingEffects) {
        this.applyTerraformingEffects();
      }

      // --- Check and Update Overall Status ---
      // Determine if all parameters meet completion conditions
      // This value is used by the UI to enable the "Complete Terraforming" button
      this.readyForCompletion = this.getTerraformingStatus();

      // --- End of Status Update Logic ---

      this.updateSurfaceRadiation();

      if (!options.skipHazardUpdates && hazardManager && hazardManager.update) {
        hazardManager.update(deltaTime, this);
      }

    } // <-- Correct closing brace for the 'update' method


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

    unlock(aspect) {
      if (this[aspect]) {
        this[aspect].unlocked = true;
      }
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
          // Calculate equilibrium constants immediately after initial values are set
          //this.calculateEquilibriumConstants();
        }
    }

    // Calculates the current total global atmospheric pressure (in kPa) from global resources
    calculateTotalPressure() {
        const cache = this._updateAtmosphericPressureCache();
        return cache.totalPressure / 1000; // Convert Pa to kPa
    }

    calculateAtmosphericComposition() {
        let co2Mass = 0, h2oMass = 0, ch4Mass = 0, h2Mass = 0, h2so4Mass = 0, safeGHGMass = 0, inertMass = 0;
        for (const gas in this.resources.atmospheric) {
            const amountTons = this.resources.atmospheric[gas].value || 0;
            const kg = amountTons * 1000;
            if (gas === 'carbonDioxide') co2Mass += kg;
            else if (gas === 'atmosphericWater') h2oMass += kg;
            else if (gas === 'atmosphericMethane') ch4Mass += kg;
            else if (gas === 'hydrogen') h2Mass += kg;
            else if (gas === 'sulfuricAcid') h2so4Mass += kg;
            else if (gas === 'greenhouseGas') safeGHGMass += kg;
            else inertMass += kg;
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
        return { composition, totalMass };
    }

    // Removed global calculateHumidity function as humidity should be calculated zonally if needed.

    // Removed redundant calculateCoverage function. Logic now resides in
    // calculateAverageCoverage within terraforming-utils.js.
    // Mirror Effect Calculation
    calculateMirrorEffect() {
      // Solar flux hitting the mirror (same as base flux at mirror's position)
      const solarFluxAtMirror = this.calculateSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
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
    }

    calculateSolarFlux(distanceFromSun){
      if (this.celestialParameters?.rogue || starLuminosityMultiplier <= 0) {
        return BACKGROUND_SOLAR_FLUX;
      }
      const validDistance = Number.isFinite(distanceFromSun) && distanceFromSun > 0
        ? distanceFromSun
        : (this.celestialParameters.distanceFromSun || 0) * AU_METER;
      if (!validDistance) {
        return BACKGROUND_SOLAR_FLUX;
      }
      const lum = SOLAR_LUMINOSITY_W * starLuminosityMultiplier;
      if (!Number.isFinite(lum) || lum <= 0) {
        return BACKGROUND_SOLAR_FLUX;
      }
      return lum / (4*Math.PI * Math.pow(validDistance, 2)); // W/m²
    }

    calculateModifiedSolarFlux(distanceFromSunInMeters){
      const baseFlux = this.calculateSolarFlux(distanceFromSunInMeters);
      const mirrorEffect = this.calculateMirrorEffect();
      const mirrorFlux = mirrorEffect.powerPerUnitArea;
      const lanternFlux = this.calculateLanternFlux();
      const mirrors = (typeof buildings !== 'undefined' && buildings['spaceMirror']) ? buildings['spaceMirror'].active : 0;
      const mirrorProductivity = Number.isFinite(buildings?.spaceMirror?.productivity) ? buildings.spaceMirror.productivity : 1;
      let reverseFactor = 1;
      if (typeof mirrorOversightSettings !== 'undefined') {
        const dist = mirrorOversightSettings.distribution || {};
        const rev = mirrorOversightSettings.assignments?.reversalMode || {};
        const anyPerc = Math.max(0, 1 - ((dist.tropical || 0) + (dist.temperate || 0) + (dist.polar || 0) + (dist.focus || 0)));
        const reversedPerc =
          (rev.tropical ? dist.tropical || 0 : 0) +
          (rev.temperate ? dist.temperate || 0 : 0) +
          (rev.polar ? dist.polar || 0 : 0) +
          (rev.focus ? dist.focus || 0 : 0) +
          (rev.any ? anyPerc : 0);
        reverseFactor = 1 - 2 * reversedPerc;
      }
      const mirrorContribution = mirrorFlux * mirrors * reverseFactor * mirrorProductivity;
      const total = baseFlux + mirrorContribution + lanternFlux;

      return Math.max(total, BACKGROUND_SOLAR_FLUX);
    }

    calculateLanternFlux(){
      const lantern = (typeof buildings !== 'undefined') ? buildings['hyperionLantern'] : null;
      if(lantern && lantern.active > 0){
        const resourceFactor = Number.isFinite(lantern._baseProductivity)
          ? lantern._baseProductivity
          : (Number.isFinite(lantern.productivity) ? lantern.productivity : 1);
        const assignmentFactor = lantern._allowFullProductivity
          ? 1
          : (Number.isFinite(lantern._assignmentShare) ? lantern._assignmentShare : 1);
        const power = (lantern.powerPerBuilding || 0) * lantern.active * resourceFactor * assignmentFactor;
        const area = this.celestialParameters.crossSectionArea || this.celestialParameters.surfaceArea;
        return power / area;
      }
      return 0;
    }

    calculateZoneSolarFlux(zone, angleAdjusted = false, byPassFacility = false) {
      if (typeof globalThis.calculateZoneSolarFluxWithFacility === 'function' && !byPassFacility) {
        return globalThis.calculateZoneSolarFluxWithFacility(this, zone, angleAdjusted);
      }
      const ratio = angleAdjusted ? getZoneRatio(zone) : (getZoneRatio(zone) / 0.25);
      return this.luminosity.solarFlux * ratio;
    }

    calculateSolarPanelMultiplier(){
      return this.luminosity.modifiedSolarFlux / SOLAR_PANEL_BASE_LUMINOSITY;
    }

    calculateZonalSolarPanelMultiplier(zone){
      if (isRingWorld && isRingWorld()) {
        const penalty = Math.min(1, Math.max(0, this.luminosity.cloudHazePenalty || 0));
        const baseFlux = this.luminosity.zonalFluxes?.tropical ?? this.luminosity.solarFlux;
        return (baseFlux * 4 * (1 - penalty)) / SOLAR_PANEL_BASE_LUMINOSITY;
      }
      if (this.luminosity.zonalFluxes && Number.isFinite(this.luminosity.zonalFluxes[zone])) {
        const penalty = Math.min(1, Math.max(0, this.luminosity.cloudHazePenalty || 0));
        return (this.luminosity.zonalFluxes[zone] * (1 - penalty)) / SOLAR_PANEL_BASE_LUMINOSITY;
      }
      return this.calculateSolarPanelMultiplier();
    }

    calculateWindTurbineMultiplier(){
      const pressureKPa = this.calculateTotalPressure();
      const pressureAtm = pressureKPa / KPA_PER_ATM;
      return Math.sqrt(pressureAtm);
    }

    calculateColonyPressureCostPenalty() {
      const pressureKPa = this.calculateTotalPressure();
      const pressureAtm = pressureKPa / KPA_PER_ATM;
      const multiplier = Math.sqrt(pressureAtm);
      return multiplier > 1.5 ? multiplier : 1;
    }

    calculateColonyEnergyPenalty() {
      const zones = this.temperature.zones;

      const differences = [
          zones.tropical.value,
          zones.temperate.value,
          zones.polar.value
      ].map(temp => {
          if (temp > COMFORTABLE_TEMPERATURE_MAX) {
              return temp - COMFORTABLE_TEMPERATURE_MAX;
          }
          if (temp < COMFORTABLE_TEMPERATURE_MIN) {
              return COMFORTABLE_TEMPERATURE_MIN - temp;
          }
          return 0;
      });

      const smallestDifference = Math.min(...differences);
      return 1 + smallestDifference / 10;
  }

    calculateGravityCostPenalty() {
      const gravity = this.celestialParameters.gravity;
      if (!calculateGravityCostPenalty) {
        return getNoGravityPenalty();
      }

      const equatorialGravity = calculateApparentEquatorialGravity
        ? calculateApparentEquatorialGravity(this.celestialParameters)
        : gravity;

      const landResource = this.resources?.surface?.land;
      const totalLand = landResource?.value || 0;
      const usedLand = landResource?.reserved || 0;

      return calculateGravityCostPenalty({
        gravity,
        equatorialGravity,
        totalLand,
        usedLand,
      });
    }

    calculateMaintenancePenalty() {
      const temp = this.temperature.value;
      if (temp <= MAINTENANCE_PENALTY_THRESHOLD) {
        return 1;
      }
      return 1 + 0.01 * (temp - MAINTENANCE_PENALTY_THRESHOLD);
    }

    getFactoryTemperatureMaintenancePenaltyReduction() {
      if (typeof getFactoryTemperatureMaintenancePenaltyReductionHelper === 'function') {
        return getFactoryTemperatureMaintenancePenaltyReductionHelper();
      }
      return 0;
    }

    // Calculates the sum of absolute pressure changes for each gas since initialization
    calculateTotalPressureDelta() {
        let totalDelta = 0; // Use a local variable, no need to store this.totalDelta

        // Calculate current and initial pressures on the fly
        for (const gas in this.resources.atmospheric) { // Iterate through defined atmospheric gases
            const currentAmount = this.resources.atmospheric[gas].value || 0;
            const initialAmount = currentPlanetParameters.resources.atmospheric[gas]?.initialValue || 0;

            const currentPressure = calculateAtmosphericPressure(currentAmount, this.celestialParameters.gravity, this.celestialParameters.radius);
            const initialPressure = calculateAtmosphericPressure(initialAmount, this.celestialParameters.gravity, this.celestialParameters.radius);

            totalDelta += Math.abs(currentPressure - initialPressure);
        }

        return totalDelta; // Return the calculated sum of deltas (in Pa)
    }

    applyTerraformingEffects(){
      const solarPanelMultiplier = this.calculateSolarPanelMultiplier();

      const windTurbineMultiplier = this.calculateWindTurbineMultiplier();

      const solarPanelEffect = {
        effectId : 'luminosity',
        target: 'building',
        targetId: 'solarPanel',
        type: 'productionMultiplier',
        value: solarPanelMultiplier,
        name: 'Luminosity'
      }
      addEffect(solarPanelEffect);

      const windTurbineEffect = {
        effectId: 'atmosphere',
        target: 'building',
        targetId: 'windTurbine',
        type: 'productionMultiplier',
        value: windTurbineMultiplier,
        name: 'Atmospheric pressure'
      }
      addEffect(windTurbineEffect);




      const colonyEnergyPenalty = this.calculateColonyEnergyPenalty();
      const colonyCostPenalty = this.calculateColonyPressureCostPenalty();
      const maintenancePenalty = this.calculateMaintenancePenalty();
      const aerostatMitigationDetails = getAerostatMaintenanceMitigation();
      const factoryPenaltyReduction =
        aerostatMitigationDetails &&
        Number.isFinite(aerostatMitigationDetails.workerShare)
          ? aerostatMitigationDetails.workerShare
          : this.getFactoryTemperatureMaintenancePenaltyReduction();
      const buildingMitigationById =
        aerostatMitigationDetails?.buildingCoverage?.byId ?? {};

      for (let i = 1; i <= 7; i++) {
        const energyPenaltyEffect = {
            effectId: 'temperaturePenalty',
            target: 'colony',
            targetId: `t${i}_colony`,
            type: 'resourceConsumptionMultiplier',
            resourceCategory: 'colony',
            resourceTarget: 'energy',
            value: colonyEnergyPenalty
        };

        addEffect(energyPenaltyEffect);

        const metalCostPenaltyEffect = {
            effectId: 'pressureCostPenalty-metal',
            target: 'colony',
            targetId: `t${i}_colony`,
            type: 'resourceCostMultiplier',
            resourceCategory: 'colony',
            resourceId: 'metal',
            value: colonyCostPenalty,
            name: 'High pressure'
        };

        const glassCostPenaltyEffect = {
            effectId: 'pressureCostPenalty-glass',
            target: 'colony',
            targetId: `t${i}_colony`,
            type: 'resourceCostMultiplier',
            resourceCategory: 'colony',
            resourceId: 'glass',
            value: colonyCostPenalty,
            name: 'High pressure'
        };

        addEffect(metalCostPenaltyEffect);
        addEffect(glassCostPenaltyEffect);
      }

      if (this.gravityPenaltyEnabled) {
        this.gravityCostPenalty = this.calculateGravityCostPenalty();
        const gravityCostMultiplier = this.gravityCostPenalty.multiplier;
        const combinedStructures = structures;

        for (const id in combinedStructures) {
          const structure = combinedStructures[id];
          if (!structure || !structure.cost || structure.temperatureMaintenanceImmune) continue;

          const isColony =
            colonies && Object.prototype.hasOwnProperty.call(colonies, id);
          const target = isColony ? 'colony' : 'building';

          for (const category in structure.cost) {
            const categoryCosts = structure.cost[category];
            if (!categoryCosts) continue;

            for (const resource in categoryCosts) {
              if (resource === 'electronics' || resource === 'water') continue;
              addEffect({
                effectId: `gravityCostPenalty-${category}-${resource}`,
                target,
                targetId: id,
                type: 'resourceCostMultiplier',
                resourceCategory: category,
                resourceId: resource,
                value: gravityCostMultiplier,
                name: 'Gravity'
              });
            }
          }
        }
      } else {
        this.gravityCostPenalty = getNoGravityPenalty();
      }

      if (typeof buildings !== 'undefined') {
        for (const id in buildings) {
          const b = buildings[id];
          if (!b || b.temperatureMaintenanceImmune) continue;

          const countsTowardFactoryMitigation =
            typeof isBuildingEligibleForFactoryMitigationHelper === 'function'
              ? isBuildingEligibleForFactoryMitigationHelper(id)
              : id !== 'oreMine';

          const workerNeed =
            typeof b.getTotalWorkerNeed === 'function'
              ? b.getTotalWorkerNeed()
              : b.requiresWorker || 0;

          let penaltyValue = maintenancePenalty;

          if (maintenancePenalty > 1) {
            const baseIncrease = maintenancePenalty - 1;
            let remainingFactor = 1;

            if (
              factoryPenaltyReduction > 0 &&
              workerNeed > 0 &&
              countsTowardFactoryMitigation
            ) {
              const clampedFactoryReduction = Math.max(
                0,
                Math.min(1, factoryPenaltyReduction)
              );
              remainingFactor *= 1 - clampedFactoryReduction;
            }

            const buildingMitigation = buildingMitigationById[id];
            if (buildingMitigation) {
              remainingFactor *= buildingMitigation.remainingFraction;
            }

            penaltyValue = 1 + baseIncrease * remainingFactor;
          }

          addEffect({
            effectId: 'temperatureMaintenancePenalty',
            target: 'building',
            targetId: id,
            type: 'maintenanceMultiplier',
            value: penaltyValue,
            name: 'Temperature penalty'
          });
        }
      }

      if (typeof colonies !== 'undefined') {
        for (const id in colonies) {
          if (id === 'aerostat_colony') continue;
          addEffect({
            effectId: 'temperatureMaintenancePenalty',
            target: 'colony',
            targetId: id,
            type: 'maintenanceMultiplier',
            value: maintenancePenalty,
            name: 'Temperature penalty'
          });
        }
      }

      if (
        typeof hazardManager !== 'undefined' &&
        hazardManager &&
        typeof hazardManager.applyHazardEffects === 'function'
      ) {
        hazardManager.applyHazardEffects({
          addEffect,
          structures: typeof structures !== 'undefined' ? structures : {},
          colonies: typeof colonies !== 'undefined' ? colonies : {},
          buildings: typeof buildings !== 'undefined' ? buildings : {},
          populationModule,
        });
      }
      // End of applyTerraformingEffects method body
    }

    // [simulateAtmosphericFlow function removed - no longer needed with global atmosphere]

// Distributes net changes from global resources (caused by buildings/other non-zonal processes)
// proportionally into the zonal data structures before zonal simulation runs.
distributeGlobalChangesToZones(deltaTime) {
    const zones = getZones();
    const secondsMultiplier = deltaTime / 1000;
    const configs = this.zonalSurfaceResourceConfigs;

    for (const config of configs) {
        const globalRes = resources.surface[config.distributionKey];
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

        const netChangeAmount = netExternalRate * secondsMultiplier;
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
        const iceUsesBuried = config.distributionKey === 'ice' && config.keys.includes('buriedIce');

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

        if (iceUsesBuried && netChangeAmount < 0 && distributionMode === 'currentAmount') {
            let totalSurfaceIce = 0;
            let totalBuriedIce = 0;
            for (const zone of zones) {
                totalSurfaceIce += this.zonalSurface[zone].ice || 0;
                totalBuriedIce += this.zonalSurface[zone].buriedIce || 0;
            }

            const surfaceTake = Math.min(-netChangeAmount, totalSurfaceIce);
            if (surfaceTake > 0 && totalSurfaceIce > 0) {
                for (const zone of zones) {
                    const currentIce = this.zonalSurface[zone].ice || 0;
                    if (currentIce <= 0) {
                        continue;
                    }
                    const share = currentIce / totalSurfaceIce;
                    this.zonalSurface[zone].ice = Math.max(0, currentIce - surfaceTake * share);
                }
            }

            const remaining = netChangeAmount + surfaceTake;
            if (remaining < 0 && totalBuriedIce > 0) {
                const buriedTake = -remaining;
                for (const zone of zones) {
                    const currentBuried = this.zonalSurface[zone].buriedIce || 0;
                    if (currentBuried <= 0) {
                        continue;
                    }
                    const share = currentBuried / totalBuriedIce;
                    this.zonalSurface[zone].buriedIce = Math.max(0, currentBuried - buriedTake * share);
                }
            }
            continue;
        }

        if (distributionMode === 'currentAmount') {
            for (const zone of zones) {
                totalDistributionFactor += this.zonalSurface[zone][config.distributionKey] || 0;
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
                    const currentAmount = this.zonalSurface[zone][config.distributionKey] || 0;
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
            const currentValue = this.zonalSurface[zone][config.distributionKey] || 0;
            this.zonalSurface[zone][config.distributionKey] = Math.max(0, currentValue + zonalChange);
        }
    }
}

// Updates the global SURFACE resources object based on summed zonal surface/water data.
// Atmospheric resources are now updated directly in updateResources.
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
                zoneTotal += this.zonalSurface[zone][key] || 0;
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

  saveState(){
    return {
      initialValuesCalculated: this.initialValuesCalculated,
      celestialParameters: this.celestialParameters,
      initialCelestialParameters: this.initialCelestialParameters,
      temperature: this.temperature,
      graphHistory: terraformingGraphsManager.saveState(),
      // atmosphere: this.atmosphere, // REMOVED - No longer saving internal atmosphere state
      completed: this.completed,
      // zonalAtmosphere: this.zonalAtmosphere, // REMOVED - No longer saving internal zonal atmosphere state
      zonalSurface: this.zonalSurface,
      // zonalBiomass: this.zonalBiomass, // REMOVED - Biomass is stored in zonalSurface
      };
  }

  loadState(terraformingState) {
      if (!terraformingState) return;

      // Start from fresh config each load
      this.celestialParameters = structuredClone(currentPlanetParameters.celestialParameters);
      this.initialCelestialParameters = structuredClone(currentPlanetParameters.celestialParameters);

      if (terraformingState.celestialParameters) {
          Object.assign(this.celestialParameters, terraformingState.celestialParameters);
      }

      // Ensure current has values for all initial parameters
      for (const key in this.initialCelestialParameters) {
          if (this.celestialParameters[key] === undefined) {
              this.celestialParameters[key] = this.initialCelestialParameters[key];
          }
          if(key === 'parentBody'){
            for (const key2 in this.initialCelestialParameters.parentBody) {
                if(this.celestialParameters.parentBody[key2] === undefined){
                    this.celestialParameters.parentBody[key2] = this.initialCelestialParameters.parentBody[key2];
                }
            }
          }
      }

      const radiusMeters = this.celestialParameters.radius * 1000;
      if (!this.celestialParameters.surfaceArea) {
          this.celestialParameters.surfaceArea = 4 * Math.PI * Math.pow(radiusMeters, 2);
      }
      if (!this.celestialParameters.crossSectionArea) {
          this.celestialParameters.crossSectionArea = Math.PI * Math.pow(radiusMeters, 2);
      }
      const initRadiusMeters = this.initialCelestialParameters.radius * 1000;
      if (!this.initialCelestialParameters.surfaceArea) {
          this.initialCelestialParameters.surfaceArea = 4 * Math.PI * Math.pow(initRadiusMeters, 2);
      }
      if (!this.initialCelestialParameters.crossSectionArea) {
          this.initialCelestialParameters.crossSectionArea = Math.PI * Math.pow(initRadiusMeters, 2);
      }

      this.completed = terraformingState.completed || false;
      this.initialValuesCalculated = terraformingState.initialValuesCalculated || false;

      // Load Temperature (including zonal)
      if (terraformingState.temperature) {
          this.temperature.value = terraformingState.temperature.value || 0;
          this.temperature.emissivity = terraformingState.temperature.emissivity || 0;
          this.temperature.effectiveTempNoAtmosphere = terraformingState.temperature.effectiveTempNoAtmosphere || 0;
          this.temperature.opticalDepth = terraformingState.temperature.opticalDepth || 0;
          this.temperature.opticalDepthContributions = terraformingState.temperature.opticalDepthContributions || {};
          this.temperature.unlocked = terraformingState.temperature.unlocked || false;
          if (terraformingState.temperature.zones) {
              for (const zone of ['tropical', 'temperate', 'polar']) {
                  this.temperature.zones[zone].initial = terraformingState.temperature.zones[zone]?.initial || 0;
                  this.temperature.zones[zone].value = terraformingState.temperature.zones[zone]?.value || 0;
                  this.temperature.zones[zone].day = terraformingState.temperature.zones[zone]?.day || 0;
                  this.temperature.zones[zone].night = terraformingState.temperature.zones[zone]?.night || 0;
              }
          }
      }

      // Load Atmosphere Unlock Status (other properties are derived from global resources)
      if (terraformingState.atmosphere) {
           this.atmosphere.unlocked = terraformingState.atmosphere.unlocked || false;
      }

      // Load Zonal Surface resources (keep defaults if not in save)
      this.zonalSurface = createEmptyZonalSurface();
      applyZonalSurfaceFromLegacy(this.zonalSurface, terraformingState);

      // If loading a save where initial values weren't calculated, run calculateInitialValues.
      // This will correctly initialize global resource amounts based on parameters
      // and distribute surface resources zonally.
      if (!this.initialValuesCalculated) {
           console.warn("Initial values not calculated in save. Running calculateInitialValues.");
           this.calculateInitialValues(currentPlanetParameters); // This now correctly sets global resource values too
      } else {
          // If initial values *were* calculated, we still need to ensure the global
          // resource amounts match the loaded zonal surface amounts.
          // Atmospheric amounts are assumed correct in the global 'resources' object
          // as they are not saved/loaded within the Terraforming state anymore.
          this.synchronizeGlobalResources(); // Sync loaded zonal surface data to global resources
      }

      // Ensure global resources reflect loaded/recalculated state
      this.synchronizeGlobalResources();
      this.updateLuminosity(); // Recalculate luminosity
      if (this.luminosity.initialSurfaceAlbedo === undefined) {
          this.luminosity.initialSurfaceAlbedo = this.luminosity.groundAlbedo;
      }
      if (this.luminosity.initialActualAlbedo === undefined) {
          this.luminosity.initialActualAlbedo = this.luminosity.actualAlbedo;
      }

      this.apparentEquatorialGravity = getApparentEquatorialGravity(this.celestialParameters);
      terraformingGraphsManager.loadState(terraformingState.graphHistory);

  } // End loadState

} // End Terraforming Class

  // Removed redundant calculateGasPressure helper function.



if (typeof module !== "undefined" && module.exports) {
  module.exports = Terraforming;
  module.exports.setStarLuminosity = setStarLuminosity;
  module.exports.getStarLuminosity = getStarLuminosity;
  module.exports.getEffectiveLifeFraction = getEffectiveLifeFraction;
  module.exports.METHANE_COMBUSTION_PARAMETER = METHANE_COMBUSTION_PARAMETER_CONST;
  module.exports.buildAtmosphereContext = buildAtmosphereContext;
  module.exports.calculateApparentEquatorialGravity = getApparentEquatorialGravity;
} else {
  globalThis.setStarLuminosity = setStarLuminosity;
  globalThis.getStarLuminosity = getStarLuminosity;
  globalThis.Terraforming = Terraforming;
  globalThis.buildAtmosphereContext = buildAtmosphereContext;
}
