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
  for (const zone of ZONES) {
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
  for (const zone of ZONES) {
    const zoneSource = data[zone] || {};
    const zoneTarget = target[zone];
    for (const [fromKey, toKey] of Object.entries(mapping)) {
      zoneTarget[toKey] = zoneSource[fromKey] ?? zoneTarget[toKey];
    }
  }
}

function applyZonalSurfaceOverrides(target, overrides) {
  const data = overrides || {};
  for (const zone of ZONES) {
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

let calculateApparentEquatorialGravityHelper;
let calculateGravityCostPenaltyHelper;
let createNoGravityPenaltyHelper;
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

function getApparentEquatorialGravity(params) {
  if (calculateApparentEquatorialGravityHelper) {
    return calculateApparentEquatorialGravityHelper(params);
  }
  const gravity = params && Number.isFinite(params.gravity) ? params.gravity : 0;
  return gravity;
}

function getNoGravityPenalty() {
  if (createNoGravityPenaltyHelper) {
    return createNoGravityPenaltyHelper();
  }
  return { multiplier: 1, linearIncrease: 0, exponentialIncrease: 0 };
}

function resolveTerraformingRequirement(requirementId = defaultTerraformingRequirementId) {
  if (terraformingRequirementLoader) {
    return terraformingRequirementLoader(requirementId);
  }
  if (terraformingRequirementPresets && terraformingRequirementPresets[requirementId]) {
    return terraformingRequirementPresets[requirementId];
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

// Load utility functions when running under Node for tests
var getZonePercentage, estimateCoverage, waterCycleInstance, methaneCycleInstance, co2CycleInstance;
var getFactoryTemperatureMaintenancePenaltyReductionHelper;
var getAerostatMaintenanceMitigationHelper;
var isBuildingEligibleForFactoryMitigationHelper;
calculateEffectiveAtmosphericHeatCapacityHelper = calculateEffectiveAtmosphericHeatCapacity;

waterCycleInstance = waterCycle;
methaneCycleInstance = methaneCycle;
co2CycleInstance = co2Cycle;

if (!cloudPropsOnlyHelper && typeof globalThis.cloudPropsOnly === 'function') {
    cloudPropsOnlyHelper = globalThis.cloudPropsOnly;
}
if (!calculateCloudAlbedoContributionsHelper && typeof calculateCloudAlbedoContributions === 'function') {
    calculateCloudAlbedoContributionsHelper = calculateCloudAlbedoContributions;
}

function getEffectiveLifeFraction(terraforming) {
    const fraction = getEcumenopolisLandFraction(terraforming);
    return Math.max(0, (terraforming.life?.target || 0) - fraction);
}

var runAtmosphericChemistry;
var METHANE_COMBUSTION_PARAMETER_CONST;


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

    this.initialValuesCalculated = false;
    this.completed = false;
      // Indicates whether all terraforming parameters are within target ranges
      // but completion has not yet been confirmed by the player
    this.readyForCompletion = false;

    // Zonal Surface Data
    this.zonalSurface = createEmptyZonalSurface();

    // Global liquid target remains, moved outside the old structure
    this.waterTarget = this.requirements.liquidCoverageTarget;
    this.liquidCoverageKey = LIQUID_COVERAGE_KEYS[this.requirements.liquidType] || 'liquidWater';
    this.waterUnlocked = false; // Global unlock status

    // Global atmosphere properties (Now primarily accessed via global 'resources.atmospheric')
    this.atmosphere = {
        name: 'Atmosphere',
        // value: 0, // REMOVED - Calculated on the fly
        // gases: {}, // REMOVED - Stored in global resources
        // globalPressures: {}, // REMOVED - Calculated on the fly
        // initialGlobalPressures: {}, // REMOVED - Calculated on the fly from initial resource values
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
    const zones = ['tropical', 'temperate', 'polar'];
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
      return true;
  }




  getWaterStatus() {
    // Compare average liquid water coverage to the global target
    return (calculateAverageCoverage(this, this.liquidCoverageKey) >= this.waterTarget);
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
    for (const zone of ZONES) {
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
      const zones = ZONES;
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

      const iceZoneDistribution = { tropical: 0.01, temperate: 0.09, polar: 0.90 };
      const buriedFractions = { tropical: 1, temperate: 1, polar: 0.3 };

      zones.forEach(zone => {
          const zoneRatio = getZonePercentage(zone);
          // Distribute Liquid Water and Biomass proportionally
          this.zonalSurface[zone].liquidWater = initialLiquidWater * zoneRatio;
          this.zonalSurface[zone].biomass = initialBiomass * zoneRatio;
          this.zonalSurface[zone].liquidCO2 = initialLiquidCO2 * zoneRatio;

          const zoneIce = initialIce * (iceZoneDistribution[zone] || 0);
          const buriedFraction = buriedFractions[zone] || 0;
          this.zonalSurface[zone].ice = zoneIce * (1 - buriedFraction);
          this.zonalSurface[zone].buriedIce = zoneIce * buriedFraction;

          // Allocate Dry Ice only to Polar zone (assuming CO2 ice is less stable at lower latitudes initially)
          this.zonalSurface[zone].dryIce = (zone === 'polar') ? initialDryIce : 0;
  
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

              weightedTemperature += meanValue * getZonePercentage(zone);
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


        const zones = ZONES;
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
            this.cycles = [waterCycleInstance, methaneCycleInstance, co2CycleInstance];
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

        const { emissivity, tau, contributions } =
            calculateEmissivity(composition, surfacePressureBar, gSurface);
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

    const ORDER = ['tropical', 'temperate', 'polar'];
    const z = {}; // per-zone working data

    const dtSeconds = Math.max(0, deltaTimeMs || 0) * (86400 / 1000);
    const greenhouseFactor = 1 + 0.75 * tau;
    const ignoreHeatCapacity = !!(options && options.ignoreHeatCapacity);
    const megaHeatSinkCount =
        projectManager?.projects?.megaHeatSink?.repeatCount ?? 0;
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
    const atmosphericHeatCapacity = calculateEffectiveAtmosphericHeatCapacityHelper(this.resources.atmospheric, surfacePressurePa, gSurface);
    const baseSlabOptions = { atmosphereCapacity: atmosphericHeatCapacity };
    for (const zone of ORDER) {
        const zoneFlux = this.calculateZoneSolarFlux(zone);
        this.luminosity.zonalFluxes[zone] = zoneFlux;

        const zoneFractions = (typeof calculateZonalSurfaceFractions === 'function')
        ? calculateZonalSurfaceFractions(this, zone)
        : { ocean: 0, ice: 0, hydrocarbon: 0, hydrocarbonIce: 0, co2_ice: 0, biomass: 0 };

        const pct = getZonePercentage(zone);
        const zoneArea = (this.celestialParameters.surfaceArea || 0) * pct;
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
        const Cslab = (typeof autoSlabHeatCapacity === 'function')
        ? autoSlabHeatCapacity(
            rotationPeriodH,
            surfacePressureBar,
            zoneFractions,
            gSurface,
            undefined,
            undefined,
            slabOptions
          )
        : // Fallback: atmosphere only
            (Number.isFinite(atmosphericHeatCapacity)
              ? atmosphericHeatCapacity
              : (1004 /* C_P_AIR */) * (surfacePressurePa / Math.max(gSurface, 1e-6)));

        const area = zoneArea; // m²
        const capacityPerArea = Math.max(Cslab, MIN_SURFACE_HEAT_CAPACITY);

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

    // Stronger mixing → a few passes of pairwise exchange
    const passes = Math.max(1, Math.min(5, Math.round(1 + 4 * mixFrac)));

    // Weights are energy capacities (J/K) so updates conserve energy
    const W = {};
    const T = {};
    for (const zone of ORDER) {
        W[zone] = (z[zone].capacityPerArea || 0) * (z[zone].area || 0);
        T[zone] = z[zone].mean;
    }

    function mixPair(a, b, f) {
        const Wa = W[a], Wb = W[b];
        const denom = Wa + Wb;
        if (denom <= 0 || f <= 0) return;
        const dT = T[a] - T[b];
        // Move fraction 'f' toward equalization, conserving energy
        const deltaA = -f * (Wb / denom) * dT;
        const deltaB =  f * (Wa / denom) * dT;
        T[a] += deltaA;
        T[b] += deltaB;
    }

    for (let p = 0; p < passes; p++) {
        mixPair('tropical', 'temperate', mixFrac);
        mixPair('temperate', 'polar',    mixFrac);
    }

    // --- Write back temperatures; shift day/night by mean offset ------
    for (const zone of ORDER) {
        const zoneFlux = this.luminosity.zonalFluxes[zone];
        const pct = getZonePercentage(zone);
        const dMean = z[zone].day - z[zone].mean;

        this.temperature.zones[zone].trendValue = T[zone];
        weightedTrendTemp += T[zone] * pct;
        // Keep the radiative equilibrium diagnostic (pre‑mix) visible
        this.temperature.zones[zone].equilibriumTemperature = z[zone].eq;


        const previousMean = this.temperature.zones[zone].value;
        const capacity = z[zone].capacityPerArea;

        const absorbedFlux = (1 - z[zone].albedo) * zoneFlux * 0.25;
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
              if (zoneArea > 0) {
                const heatingFlux = (availableAdvancedHeatingPower * pct) / zoneArea;
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

        this.luminosity.modifiedSolarFluxUnpenalized = weightedFluxUnpenalized;
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
        const blackAlbedo = 0.05; // black dust
        const whiteAlbedo = 0.8;  // white dust
        const surfaceArea = this.celestialParameters.surfaceArea || 0;

        const special = this.resources && this.resources.special ? this.resources.special : {};
        const black = (special.albedoUpgrades && typeof special.albedoUpgrades.value === 'number') ? special.albedoUpgrades.value : 0;
        const white = (special.whiteDust && typeof special.whiteDust.value === 'number') ? special.whiteDust.value : 0;

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

        return (blackAlbedo * shareBlack) + (whiteAlbedo * shareWhite) + (baseAlbedo * untouched);
    }

    calculateZonalSurfaceAlbedo(zone) {
        const groundAlbedo = this.calculateGroundAlbedo();
        const fractions = (typeof calculateZonalSurfaceFractions === 'function')
            ? calculateZonalSurfaceFractions(this, zone)
            : { ocean: 0, ice: 0, hydrocarbon: 0, hydrocarbonIce: 0, co2_ice: 0, biomass: 0 };
        return surfaceAlbedoMix(groundAlbedo, fractions);
    }

    calculateSurfaceAlbedo() {
        let weighted = 0;
        for (const zone of ZONES) {
            const alb = this.calculateZonalSurfaceAlbedo(zone);
            const pct = getZonePercentage(zone);
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
        const resourceTypes = ['liquidWater', 'ice', 'biomass', 'dryIce', 'liquidCO2', 'liquidMethane', 'hydrocarbonIce'];
        for (const zone of ZONES) {
            const zoneArea = this.celestialParameters.surfaceArea * getZonePercentage(zone);
            const zoneData = this.zonalSurface[zone] || {};
            this.zonalCoverageCache[zone] = { zoneArea };
            for (const resourceType of resourceTypes) {
                let zonalAmount = 0;
                let scale = 0.0001;
                if (resourceType === 'liquidWater') {
                    zonalAmount = zoneData.liquidWater || 0;
                } else if (resourceType === 'ice') {
                    zonalAmount = zoneData.ice || 0;
                    scale *= 100;
                } else if (resourceType === 'biomass') {
                    zonalAmount = zoneData.biomass || 0;
                    scale *= 100000;
                } else if (resourceType === 'dryIce') {
                    zonalAmount = zoneData.dryIce || 0;
                    scale *= 100;
                } else if (resourceType === 'liquidCO2') {
                    zonalAmount = zoneData.liquidCO2 || 0;
                } else if (resourceType === 'liquidMethane') {
                    zonalAmount = zoneData.liquidMethane || 0;
                } else if (resourceType === 'hydrocarbonIce') {
                    zonalAmount = zoneData.hydrocarbonIce || 0;
                    scale *= 100;
                }
                this.zonalCoverageCache[zone][resourceType] = estimateCoverage(zonalAmount, zoneArea, scale);
            }
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

    update(deltaTime = 0, options = {}) {
      this.synchronizeGlobalResources();
      this._updateZonalCoverageCache(); // New call at the start of the update tick
      this._updateAtmosphericPressureCache();

      //First update luminosity
      this.updateLuminosity();

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
      if(this.luminosity.zonalFluxes && typeof this.luminosity.zonalFluxes[zone] === 'number'){
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
      if (!calculateGravityCostPenaltyHelper) {
        return getNoGravityPenalty();
      }

      const equatorialGravity = calculateApparentEquatorialGravityHelper
        ? calculateApparentEquatorialGravityHelper(this.celestialParameters)
        : gravity;

      const landResource = this.resources?.surface?.land;
      const totalLand = landResource?.value || 0;
      const usedLand = landResource?.reserved || 0;

      return calculateGravityCostPenaltyHelper({
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
        value: solarPanelMultiplier
      }
      addEffect(solarPanelEffect);

      const windTurbineEffect = {
        effectId: 'atmosphere',
        target: 'building',
        targetId: 'windTurbine',
        type: 'productionMultiplier',
        value: windTurbineMultiplier
      }
      addEffect(windTurbineEffect);




      const colonyEnergyPenalty = this.calculateColonyEnergyPenalty();
      const colonyCostPenalty = this.calculateColonyPressureCostPenalty();
      const maintenancePenalty = this.calculateMaintenancePenalty();
      const aerostatMitigationDetails =
        typeof getAerostatMaintenanceMitigationHelper === 'function'
          ? getAerostatMaintenanceMitigationHelper()
          : null;
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
    const zones = ZONES;
    const secondsMultiplier = deltaTime / 1000;

    // Define which SURFACE resources need distribution
    const climateResources = {
        surface: ['liquidWater', 'ice', 'dryIce', 'liquidCO2', 'biomass', 'hazardousBiomass']
        // atmospheric distribution removed
    };

    for (const category in climateResources) {
        climateResources[category].forEach(resName => {
            const globalRes = this.resources[category]?.[resName];
            if (!globalRes) return; // Skip if resource doesn't exist

            // Calculate net rate EXCLUDING 'terraforming' type rates
            let netExternalRate = 0;
            for (const type in globalRes.productionRateByType) {
                if (type !== 'terraforming') {
                    for (const source in globalRes.productionRateByType[type]) {
                        netExternalRate += globalRes.productionRateByType[type][source] || 0;
                    }
                }
            }
            for (const type in globalRes.consumptionRateByType) {
                if (type !== 'terraforming') {
                    for (const source in globalRes.consumptionRateByType[type]) {
                        netExternalRate -= globalRes.consumptionRateByType[type][source] || 0; // Subtract consumption
                    }
                }
            }

            const netChangeAmount = netExternalRate * secondsMultiplier; // Total change in tons for this tick from external sources

            if (Math.abs(netChangeAmount) < 1e-9) return; // Skip if no significant change

            // --- Distribution Logic ---
            let totalDistributionFactor = 0;
            let distributionMode = 'area'; // Default: distribute by total zone area percentage
            let targetZones = [];
            // let zoneLandAreas = {}; // No longer needed for biomass distribution

            if (resName === 'biomass' && netChangeAmount > 0) { // Special logic for Biomass PRODUCTION
                const design = lifeDesigner.currentDesign;
                const growableZoneNames = design.getGrowableZones(); // Array of names ['tropical', ...]
                const survivableZoneResults = design.temperatureSurvivalCheck(); // Object {'tropical': {pass, reason}, ... '

                // Find zones that can both grow AND survive
                const growAndSurviveZones = growableZoneNames.filter(zone => survivableZoneResults[zone]?.pass);

                if (growAndSurviveZones.length > 0) {
                    // Priority 1: Distribute to zones that can grow & survive
                    targetZones = growAndSurviveZones;
                    distributionMode = 'targetZoneArea';
                } else if (survivableZoneResults.global.pass) {
                    // Priority 2: Distribute to zones that can only survive (but not grow)
                    targetZones = Object.keys(survivableZoneResults).filter(zone => zone !== 'global' && survivableZoneResults[zone].pass);
                    distributionMode = 'targetZoneArea';
                } else {
                    // Fallback: If can't survive anywhere, distribute by total area %
                    distributionMode = 'area';
                    targetZones = zones;
                }

                if (distributionMode === 'targetZoneArea') {
                    totalDistributionFactor = 0; // Reset factor for target zone area calculation
                    targetZones.forEach(zone => {
                        const zoneArea = this.celestialParameters.surfaceArea * getZonePercentage(zone);
                        totalDistributionFactor += zoneArea;
                    });
                    // If total area in target zones is zero (shouldn't happen unless planet area is 0), fallback to global area distribution
                    if (totalDistributionFactor < 1e-9) {
                        distributionMode = 'area';
                        targetZones = zones;
                    }
                }
                 if (distributionMode === 'area') { // Fallback case or if target zone area was zero
                     totalDistributionFactor = 1.0; // Use 1.0 for global area percentage distribution
                 }

            } else if (netChangeAmount < 0) { // Consumption (for any resource including biomass)
                distributionMode = 'currentAmount';
                // Distribute based on current zonal amount proportion
                zones.forEach(zone => {
                    let currentAmount = 0;
                    if (category === 'surface') {
                         currentAmount = this.zonalSurface[zone][resName] || 0;
                    } // atmospheric removed
                    totalDistributionFactor += currentAmount;
                });
            } else { // Production (for resources other than biomass)
                 distributionMode = 'area';
                 totalDistributionFactor = 1.0; // Represents 100% of area
                 targetZones = zones; // Target all zones for area distribution
            }

            // Apply distributed change to zones
            zones.forEach(zone => {
                let proportion = 0;
                // Check if the current zone is a target for distribution (relevant for biomass production)
                const isTargetZone = targetZones.includes(zone);

                if (totalDistributionFactor > 1e-9) { // Avoid division by zero
                    if (distributionMode === 'currentAmount') { // Consumption
                        let currentAmount = 0;
                         if (category === 'surface') {
                             currentAmount = this.zonalSurface[zone][resName] || 0;
                         } // atmospheric removed
                        proportion = currentAmount / totalDistributionFactor;
                    } else if (distributionMode === 'targetZoneArea' && isTargetZone) { // Biomass Production (Total Target Zone Area)
                        const zoneArea = this.celestialParameters.surfaceArea * getZonePercentage(zone);
                        proportion = zoneArea / totalDistributionFactor;
                    } else if (distributionMode === 'area') { // Default Production / Fallback
                        proportion = getZonePercentage(zone);
                    }
                    // If mode is landArea but zone is not a target, proportion remains 0
                } else if (netChangeAmount > 0 && distributionMode !== 'currentAmount') {
                     // Handle production when total factor is zero (e.g., no land in target zones)
                     // Fallback to area distribution for safety, though this case might need review
                     proportion = getZonePercentage(zone);
                }
                // If consuming (netChangeAmount < 0) and totalDistributionFactor is 0, proportion remains 0 (can't consume from nothing)


                const zonalChange = netChangeAmount * proportion;

                // Apply only to surface zonal structure
                if (category === 'surface') {
                    this.zonalSurface[zone][resName] += zonalChange;
                    this.zonalSurface[zone][resName] = Math.max(0, this.zonalSurface[zone][resName]);
                } // atmospheric removed
            });
        });
    }
}

// Updates the global SURFACE resources object based on summed zonal surface/water data.
// Atmospheric resources are now updated directly in updateResources.
synchronizeGlobalResources() {
    const zones = ZONES;
    const aggregations = [
        {
            key: 'liquidWater',
            compute: zone => this.zonalSurface[zone].liquidWater || 0
        },
        {
            key: 'ice',
            compute: zone => {
                const surfaceIce = this.zonalSurface[zone].ice || 0;
                const buried = this.zonalSurface[zone].buriedIce || 0;
                return surfaceIce + buried;
            }
        },
        {
            key: 'dryIce',
            compute: zone => {
                const surfaceDryIce = this.zonalSurface[zone].dryIce || 0;
                const buried = this.zonalSurface[zone].buriedDryIce || 0;
                return surfaceDryIce + buried;
            }
        },
        {
            key: 'liquidCO2',
            compute: zone => this.zonalSurface[zone].liquidCO2 || 0
        },
        {
            key: 'biomass',
            compute: zone => this.zonalSurface[zone].biomass || 0
        },
        {
            key: 'hazardousBiomass',
            compute: zone => this.zonalSurface[zone].hazardousBiomass || 0
        },
        {
            key: 'liquidMethane',
            compute: zone => this.zonalSurface[zone].liquidMethane || 0
        },
        {
            key: 'hydrocarbonIce',
            compute: zone => {
                const surfaceMethaneIce = this.zonalSurface[zone].hydrocarbonIce || 0;
                const buriedMethaneIce = this.zonalSurface[zone].buriedHydrocarbonIce || 0;
                return surfaceMethaneIce + buriedMethaneIce;
            }
        }
    ];

    const totals = {};
    aggregations.forEach(({ key }) => {
        totals[key] = 0;
    });

    zones.forEach(zone => {
        aggregations.forEach(aggregation => {
            totals[aggregation.key] += aggregation.compute(zone);
        });
    });

    aggregations.forEach(({ key }) => {
        if (this.resources.surface[key]) {
            this.resources.surface[key].value = totals[key];
        }
    });

    // Atmospheric resources are no longer synchronized here.
    // Pressures are calculated on the fly when needed.
}

  saveState(){
    return {
      initialValuesCalculated: this.initialValuesCalculated,
      celestialParameters: this.celestialParameters,
      initialCelestialParameters: this.initialCelestialParameters,
      temperature: this.temperature,
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
  globalThis.calculateApparentEquatorialGravity = (...args) => getApparentEquatorialGravity(...args);
}
