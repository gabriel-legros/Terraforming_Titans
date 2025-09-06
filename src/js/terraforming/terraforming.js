const SOLAR_LUMINOSITY_W = 3.828e26; // Base solar luminosity (W)
let starLuminosityMultiplier = 1; // Multiplier relative to Sol
function setStarLuminosity(multiplier) {
  starLuminosityMultiplier = multiplier || 1;
}
function getStarLuminosity() {
  return starLuminosityMultiplier;
}
const C_P_AIR = 1004; // J/kg·K
const EPSILON = 0.622; // Molecular weight ratio
const AU_METER = 149597870700;

// Load utility functions when running under Node for tests
var getZonePercentage, estimateCoverage, waterCycleInstance, methaneCycleInstance, co2CycleInstance;
if (typeof module !== 'undefined' && module.exports) {
    const waterCycleMod = require('./water-cycle.js');
    waterCycleInstance = waterCycleMod.waterCycle;

    const hydrocarbonCycleMod = require('./hydrocarbon-cycle.js');
    methaneCycleInstance = hydrocarbonCycleMod.methaneCycle;

    const dryIceCycleMod = require('./dry-ice-cycle.js');
    co2CycleInstance = dryIceCycleMod.co2Cycle;
    const zones = require('./zones.js');
    ZONES = zones.ZONES;
    getZonePercentage = zones.getZonePercentage;
    estimateCoverage = zones.estimateCoverage;
    if (typeof globalThis.ZONES === 'undefined') {
        globalThis.ZONES = ZONES;
    }

    var terraformUtils = require('./terraforming-utils.js');
    var calculateAverageCoverage = terraformUtils.calculateAverageCoverage;
    var calculateSurfaceFractions = terraformUtils.calculateSurfaceFractions;
    var calculateZonalSurfaceFractions = terraformUtils.calculateZonalSurfaceFractions;

      const radiation = require('./radiation-utils.js');
      var estimateSurfaceDoseByColumn = radiation.estimateSurfaceDoseByColumn;
      var radiationPenalty = radiation.radiationPenalty;

    const physics = require('./physics.js');
    if (typeof globalThis.surfaceAlbedoMix === 'undefined') {
        globalThis.surfaceAlbedoMix = physics.surfaceAlbedoMix;
    }
    if (typeof globalThis.cloudFraction === 'undefined') {
        globalThis.cloudFraction = physics.cloudFraction;
    }
    if (typeof globalThis.calculateActualAlbedoPhysics === 'undefined') {
        globalThis.calculateActualAlbedoPhysics = physics.calculateActualAlbedoPhysics;
    }
    if (typeof globalThis.calculateAtmosphericPressure === 'undefined') {
        globalThis.calculateAtmosphericPressure = physics.calculateAtmosphericPressure;
    }
} else {
    getZonePercentage = globalThis.getZonePercentage;
    estimateCoverage = globalThis.estimateCoverage;
    waterCycleInstance = globalThis.waterCycle;
    methaneCycleInstance = globalThis.methaneCycle;
    co2CycleInstance = globalThis.co2Cycle;
}

var getEcumenopolisLandFraction;
if (typeof module !== 'undefined' && module.exports) {
    ({ getEcumenopolisLandFraction } = require('../advanced-research/ecumenopolis.js'));
} else {
    getEcumenopolisLandFraction = globalThis.getEcumenopolisLandFraction;
}

function getEffectiveLifeFraction(terraforming) {
    const fraction = getEcumenopolisLandFraction(terraforming);
    return Math.max(0, (terraforming.life?.target || 0) - fraction);
}

const SOLAR_PANEL_BASE_LUMINOSITY = 1000;
const COMFORTABLE_TEMPERATURE_MIN = 288.15; // 15°C
const COMFORTABLE_TEMPERATURE_MAX = 293.15; // 20°C
const KPA_PER_ATM = 101.325;

const EQUILIBRIUM_WATER_PARAMETER = 0.451833045526663;
const EQUILIBRIUM_METHANE_PARAMETER = 1.35*0.0000095;
const EQUILIBRIUM_CO2_PARAMETER = 5.5e-9;
const METHANE_COMBUSTION_PARAMETER = 1e-15; // Rate coefficient for CH4/O2 combustion
const OXYGEN_COMBUSTION_THRESHOLD = 12000; // 12 kPa - minimum oxygen pressure for combustion
const METHANE_COMBUSTION_THRESHOLD = 100; // 0.1 kPa - minimum methane pressure for combustion

const CALCITE_HALF_LIFE_SECONDS = 240; // Calcite aerosol half-life
const CALCITE_DECAY_CONSTANT = Math.log(2) / CALCITE_HALF_LIFE_SECONDS;

if (typeof module !== 'undefined' && module.exports) {
    if (typeof globalThis.EQUILIBRIUM_CO2_PARAMETER === 'undefined') {
        globalThis.EQUILIBRIUM_CO2_PARAMETER = EQUILIBRIUM_CO2_PARAMETER;
    }
}


const terraformingGasTargets = {
  carbonDioxide : {min : 0, max : 100},
  oxygen : {min : 15000, max : 25000},
  inertGas : {min : 50000, max : 100000}
}

class Terraforming extends EffectableEntity{
  constructor(resources, celestialParameters) {
    super({ description: 'This module manages all terraforming compononents' });

    this.resources = resources;
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

    const starLuminosity = this.celestialParameters.starLuminosity || 1;
    this.celestialParameters.starLuminosity = starLuminosity;
    this.initialCelestialParameters.starLuminosity = starLuminosity;
    setStarLuminosity(starLuminosity);

    this.lifeParameters = lifeParameters; // Load external life parameters
    this.zonalCoverageCache = {};

    this.initialValuesCalculated = false;
    this.equilibriumPrecipitationMultiplier = EQUILIBRIUM_WATER_PARAMETER; // Default, will be calculated
    this.equilibriumCondensationParameter = globalThis.EQUILIBRIUM_CO2_PARAMETER || EQUILIBRIUM_CO2_PARAMETER; // Default, will be calculated
    this.equilibriumMethaneCondensationParameter = EQUILIBRIUM_METHANE_PARAMETER; // Default, will be calculated

      this.completed = false;
      // Indicates whether all terraforming parameters are within target ranges
      // but completion has not yet been confirmed by the player
      this.readyForCompletion = false;
    // Add properties to store total rates for UI display
    this.totalEvaporationRate = 0;
    this.totalWaterSublimationRate = 0;
    this.totalCo2SublimationRate = 0;
    this.totalMethaneSublimationRate = 0;
    this.totalRainfallRate = 0;
    this.totalSnowfallRate = 0;
    this.totalCo2CondensationRate = 0;
    this.totalMeltRate = 0;
    this.totalFreezeRate = 0;
    this.flowMeltAmount = 0;
    this.flowMeltRate = 0;
    this.focusMeltRate = 0;
    this.focusMeltAmount = 0;
    this.totalMethaneEvaporationRate = 0;
    this.totalMethaneCondensationRate = 0;
    this.totalMethaneMeltRate = 0;
    this.totalMethaneFreezeRate = 0;
    this.flowMethaneMeltAmount = 0;
    this.flowMethaneMeltRate = 0;
    this.totalMethaneCombustionRate = 0;
    this.totalOxygenCombustionRate = 0;
    this.totalCombustionWaterRate = 0;
    this.totalCombustionCo2Rate = 0;
    this.totalCalciteDecayRate = 0;

    // Zonal Water Data - Replaces global this.water
    this.zonalWater = {};
    ['tropical', 'temperate', 'polar'].forEach(zone => {
        this.zonalWater[zone] = {
            liquid: 0,     // Amount of liquid water at the surface
            ice: 0,        // Surface ice
            buriedIce: 0   // Subsurface/covered ice that does not directly sublimate
            // humidity: 0, // Zonal humidity will likely be calculated dynamically
        };
    });

    // Zonal Hydrocarbon Data
    this.zonalHydrocarbons = {};
    ['tropical', 'temperate', 'polar'].forEach(zone => {
        this.zonalHydrocarbons[zone] = {
            liquid: 0,
            ice: 0,
            buriedIce: 0
        };
    });

    // Global water target remains, moved outside the old structure
    this.waterTarget = 0.2; // Target for average liquid water coverage
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
      targetMin: 278.15, // 15°C in Kelvin,
      targetMax: 298.15,
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
          equilibriumTemperature: 0
        },
        temperate: {
          initial: 0,
          value: 0,
          day: 0,
          night: 0,
          equilibriumTemperature: 0
        },
        polar: {
          initial: 0,
          value: 0,
          day: 0,
          night: 0,
          equilibriumTemperature: 0
        }
      }
    };
    this.luminosity = {
      name: 'Luminosity',
      value: 100,
      targetMin: 600,
      targetMax: 2000,
      unlocked: false,
      albedo: 0.25,
      groundAlbedo: 0,
      surfaceAlbedo: 0,
      actualAlbedo: 0,
      initialSurfaceAlbedo: undefined,
      initialActualAlbedo: undefined,
      solarFlux: 0,
      modifiedSolarFlux: 0,
      modifiedSolarFluxUnpenalized: 0,
      cloudHazePenalty: 0,
      surfaceTemperature: 0
    };
    // Zonal Surface Data (Life, Dry Ice) - Replaces global this.life coverages
    this.zonalSurface = {};
    this.biomassDyingZones = {};
    ['tropical', 'temperate', 'polar'].forEach(zone => {
        this.zonalSurface[zone] = {
            dryIce: 0,  // Represents amount/mass in the zone
            biomass: 0 // Represents amount/mass in the zone
            // Zonal coverage values can be calculated from these amounts when needed
        };
        this.biomassDyingZones[zone] = false;
    });
    // Global life properties (name, target, unlock status)
    this.life = {
        name: 'Life',
        unlocked: false,
        target: 0.50, // Target for average biomass coverage
        // biomassCoverage: 0, // Removed - will be calculated from zonalSurface.biomass
        // dryIceCoverage: 0 // Removed - will be calculated from zonalSurface.dryIce
    };
    this.magnetosphere = {
      name: 'Others',
      value: 0,
      target: 100,
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



    this.updateLuminosity();
    this.updateSurfaceTemperature();
    this.updateSurfaceRadiation();
  }

  getMagnetosphereStatus() {
    if(this.magnetosphere.value >= 100){
      return true;
    }
    if(this.isBooleanFlagSet('magneticShield')){
      return true;
    }
    return false;
  }

  getTemperatureStatus() {
    return (this.temperature.value >= this.temperature.targetMin && this.temperature.value <= this.temperature.targetMax)
  }

  getAtmosphereStatus() {
      // Pressures are now calculated on the fly from global resources

      for (const gas in terraformingGasTargets) {
          // Calculate pressure on the fly from global resource amount
          const gasAmount = this.resources.atmospheric[gas]?.value || 0;
          const gasPressurePa = calculateAtmosphericPressure(
              gasAmount,
              this.celestialParameters.gravity,
              this.celestialParameters.radius
          );

          // Compare against targets (which are also in Pa)
          if (gasPressurePa < terraformingGasTargets[gas].min || gasPressurePa > terraformingGasTargets[gas].max) {
              return false;
          }
      }
      // Check if all required gases are within their target ranges
      return true;
  }




  getWaterStatus() {
    // Compare average liquid water coverage to the global target
    return (calculateAverageCoverage(this, 'liquidWater') > this.waterTarget);
  }

  getLuminosityStatus() {
    return ((this.luminosity.modifiedSolarFlux > this.luminosity.targetMin) && (this.luminosity.modifiedSolarFlux < this.luminosity.targetMax));
  }

  getLifeStatus() {
     // Compare average biomass coverage to the global target
    return (calculateAverageCoverage(this, 'biomass') >= getEffectiveLifeFraction(this));
  }

  getTerraformingStatus() {
    return (this.getTemperatureStatus() && this.getAtmosphereStatus() && this.getWaterStatus() && this.getLuminosityStatus() && this.getLifeStatus() && this.getMagnetosphereStatus());
  }


  calculateInitialValues(planetParameters = currentPlanetParameters) {
      // Store initial zonal temperatures
      for (const zone of ['tropical', 'temperate', 'polar']) {
          this.temperature.zones[zone].initial = this.temperature.zones[zone].value;
      }
      // This code block belongs inside calculateInitialValues
      const zones = ZONES;
      // Get initial amounts directly from provided planetParameters
      const initialLiquidWater = planetParameters.resources.surface.liquidWater?.initialValue || 0;
      const initialIce = planetParameters.resources.surface.ice?.initialValue || 0;
      const initialDryIce = planetParameters.resources.surface.dryIce?.initialValue || 0;
      const initialBiomass = planetParameters.resources.surface.biomass?.initialValue || 0;

      const iceZoneDistribution = { tropical: 0.01, temperate: 0.09, polar: 0.90 };
      const buriedFractions = { tropical: 1, temperate: 1, polar: 0.3 };

      zones.forEach(zone => {
          const zoneRatio = getZonePercentage(zone);
          // Distribute Liquid Water and Biomass proportionally
          this.zonalWater[zone].liquid = initialLiquidWater * zoneRatio;
          this.zonalSurface[zone].biomass = initialBiomass * zoneRatio;

          const zoneIce = initialIce * (iceZoneDistribution[zone] || 0);
          const buriedFraction = buriedFractions[zone] || 0;
          this.zonalWater[zone].ice = zoneIce * (1 - buriedFraction);
          this.zonalWater[zone].buriedIce = zoneIce * buriedFraction;

          // Allocate Dry Ice only to Polar zone (assuming CO2 ice is less stable at lower latitudes initially)
          this.zonalSurface[zone].dryIce = (zone === 'polar') ? initialDryIce : 0;
  
          const initialLiquidMethane = planetParameters.resources.surface.liquidMethane?.initialValue || 0;
          const initialHydrocarbonIce = planetParameters.resources.surface.hydrocarbonIce?.initialValue || 0;
          this.zonalHydrocarbons[zone].liquid = initialLiquidMethane * zoneRatio;
          this.zonalHydrocarbons[zone].ice = initialHydrocarbonIce * zoneRatio;
      });

    // Override defaults if planet parameters specify zonal water amounts
    if (planetParameters.zonalWater) {
        this.zonalWater = structuredClone(planetParameters.zonalWater);
        zones.forEach(z => {
            if (!this.zonalWater[z].hasOwnProperty('buriedIce')) {
                this.zonalWater[z].buriedIce = 0;
            }
        });
    }

    // Override defaults if planet parameters specify zonal hydrocarbon amounts
    if (planetParameters.zonalHydrocarbons) {
        this.zonalHydrocarbons = structuredClone(planetParameters.zonalHydrocarbons);
        zones.forEach(z => {
            if (this.zonalHydrocarbons[z] && !this.zonalHydrocarbons[z].hasOwnProperty('buriedIce')) {
                this.zonalHydrocarbons[z].buriedIce = 0;
            }
        });
    }

    // Override defaults if planet parameters specify zonal surface amounts
    if (planetParameters.zonalSurface) {
        this.zonalSurface = structuredClone(planetParameters.zonalSurface);
        zones.forEach(z => {
            if (!this.zonalSurface[z].hasOwnProperty('biomass')) {
                this.zonalSurface[z].biomass = 0;
            }
            if (!this.zonalSurface[z].hasOwnProperty('dryIce')) {
                this.zonalSurface[z].dryIce = 0;
            }
        });
    }

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
    this.synchronizeGlobalResources(); // This will now read from this.atmosphere.gases

    this._updateZonalCoverageCache();
    this.updateLuminosity();
    this.luminosity.initialSurfaceAlbedo = this.luminosity.surfaceAlbedo;
    this.luminosity.initialActualAlbedo = this.luminosity.actualAlbedo;
    this.updateSurfaceTemperature();
    this.luminosity.initialSolarFlux = this.luminosity.modifiedSolarFlux;

    this.temperature.zones.tropical.initial = this.temperature.zones.tropical.value;
    this.temperature.zones.temperate.initial = this.temperature.zones.temperate.value;
    this.temperature.zones.polar.initial = this.temperature.zones.polar.value;
    // Mark initial values as calculated
    this.initialValuesCalculated = true;
    } // Correct closing brace for calculateInitialValues



    // Calculates and applies changes from all atmospheric/surface processes for one tick,
    // ensuring calculations are based on the start-of-tick state.
    // Calculates and applies changes from atmospheric/surface processes for one tick,
    // using a global atmosphere model but zonal surface interactions.
    updateResources(deltaTime) {
        this.update();

        const durationSeconds = 86400 * deltaTime / 1000; // 1 in-game second equals one day
        const realSeconds = deltaTime / 1000;
        if (durationSeconds <= 0) return;


        const zones = ZONES;
        const gravity = this.celestialParameters.gravity;
        // Get current global atmospheric state directly from resources or calculate pressures
        let globalTotalPressurePa = 0;
        let globalWaterPressurePa = 0;
        let globalCo2PressurePa = 0;
        let globalMethanePressurePa = 0;
        let globalOxygenPressurePa = 0;
        for (const gas in this.resources.atmospheric) {
             const amount = this.resources.atmospheric[gas].value || 0;
             const pressure = calculateAtmosphericPressure(amount, gravity, this.celestialParameters.radius);
             globalTotalPressurePa += pressure;
             if (gas === 'atmosphericWater') globalWaterPressurePa = pressure;
             if (gas === 'carbonDioxide') globalCo2PressurePa = pressure;
             if (gas === 'atmosphericMethane') globalMethanePressurePa = pressure;
             if (gas === 'oxygen') globalOxygenPressurePa = pressure;
        }
        const availableGlobalWaterVapor = this.resources.atmospheric['atmosphericWater']?.value || 0; // tons
        const availableGlobalCo2Gas = this.resources.atmospheric['carbonDioxide']?.value || 0; // tons
        const availableGlobalMethaneGas = this.resources.atmospheric['atmosphericMethane']?.value || 0; // tons
        const availableGlobalOxygenGas = this.resources.atmospheric['oxygen']?.value || 0; // tons

        const precipitationMultiplier = this.equilibriumPrecipitationMultiplier;
        const condensationParameter = this.equilibriumCondensationParameter;
        const methaneCondensationParameter = this.equilibriumMethaneCondensationParameter;

        const cycles = [
            {
                name: 'water',
                instance: waterCycleInstance,
                zonalKey: 'zonalWater',
                surfaceBucket: 'water',
                atmosphereBucket: 'water',
                vaporPressure: () => globalWaterPressurePa,
                availableKeys: ['liquid', 'ice', 'buriedIce'],
                extraParams: () => ({ gravity, precipitationMultiplier }),
            },
            {
                name: 'methane',
                instance: methaneCycleInstance,
                zonalKey: 'zonalHydrocarbons',
                surfaceBucket: 'methane',
                atmosphereBucket: 'methane',
                vaporPressure: () => globalMethanePressurePa,
                availableKeys: ['liquid', 'ice', 'buriedIce'],
                extraParams: () => ({ gravity, condensationParameter: methaneCondensationParameter }),
            },
            {
                name: 'co2',
                instance: co2CycleInstance,
                zonalKey: 'zonalSurface',
                surfaceBucket: 'water',
                atmosphereBucket: 'co2',
                vaporPressure: () => globalCo2PressurePa,
                availableKeys: ['dryIce'],
                extraParams: () => ({ condensationParameter }),
            },
        ];

        const cycleTotals = {
            water: { evaporation: 0, sublimation: 0, melt: 0, freeze: 0 },
            methane: { evaporation: 0, sublimation: 0, melt: 0, freeze: 0 },
            co2: { sublimation: 0 },
        };

        let zonalChanges = {}; // Store calculated zonal change *amounts* for the tick
        zones.forEach(zone => {
            zonalChanges[zone] = {
                water: { liquid: 0, ice: 0, buriedIce: 0, dryIce: 0 },
                methane: { liquid: 0, ice: 0, buriedIce: 0 },
                atmosphere: { water: 0, co2: 0, methane: 0, oxygen: 0 },
                precipitation: {
                    rain: 0,
                    snow: 0,
                    methaneRain: 0,
                    methaneSnow: 0,
                    potentialRain: 0,
                    potentialSnow: 0,
                    potentialMethaneRain: 0,
                    potentialMethaneSnow: 0
                },
                potentialCO2Condensation: 0
            };
        });

        // Simulate surface flow for each resource cycle
        const tempMap = {};
        for (const z of zones) {
          tempMap[z] = this.temperature.zones[z].value;
        }
        for (const cycle of cycles) {
            if (typeof cycle.instance.simulateFlow === 'function') {
                const flowResult = cycle.instance.simulateFlow(this, durationSeconds, tempMap) || {};
                if (cycle.name === 'water') {
                    this.flowMeltAmount = flowResult.totalMelt || 0;
                    this.flowMeltRate = this.flowMeltAmount / durationSeconds * 86400;
                } else if (cycle.name === 'methane') {
                    this.flowMethaneMeltAmount = flowResult.totalMelt || 0;
                    this.flowMethaneMeltRate = this.flowMethaneMeltAmount / durationSeconds * 86400;
                }
                for (const zone of zones) {
                    const zoneChange = flowResult.changes && flowResult.changes[zone];
                    if (zoneChange) {
                        for (const key of Object.keys(zoneChange)) {
                            if (!zonalChanges[zone][cycle.surfaceBucket]) continue;
                            zonalChanges[zone][cycle.surfaceBucket][key] += zoneChange[key] || 0;
                        }
                    }
                }
            }
        }

        // Store total atmospheric changes calculated across all zones
        let totalAtmosphericWaterChange = 0;
        let totalAtmosphericCO2Change = 0;
        let totalAtmosphericMethaneChange = 0;
        let totalOxygenChange = 0;
        // Store total amounts for individual processes for UI rate reporting
        let totalRainfallAmount = 0, totalSnowfallAmount = 0, totalCo2CondensationAmount = 0, totalMethaneCondensationAmount = 0, totalMethaneIceCondensationAmount = 0;

        // --- 1. Calculate potential zonal changes based on start-of-tick state ---
        for (const zone of zones) {
            const zoneTemp = this.temperature.zones[zone].value; // Current average zonal temperature
            const dayTemp = this.temperature.zones[zone].day;
            const nightTemp = this.temperature.zones[zone].night;
            const zonalSolarFlux = this.calculateZoneSolarFlux(zone, true);
            const zoneArea = this.zonalCoverageCache[zone]?.zoneArea ?? this.celestialParameters.surfaceArea * getZonePercentage(zone);

            for (const cycle of cycles) {
                const coverage = (typeof cycle.instance.getCoverage === 'function')
                    ? cycle.instance.getCoverage(zone, this.zonalCoverageCache)
                    : {};

                const zonalSource = this[cycle.zonalKey]?.[zone] || {};
                const params = {
                    zoneArea,
                    dayTemperature: dayTemp,
                    nightTemperature: nightTemp,
                    zoneTemperature: zoneTemp,
                    atmPressure: globalTotalPressurePa,
                    vaporPressure: cycle.vaporPressure(),
                    zonalSolarFlux,
                    durationSeconds,
                    ...coverage,
                    ...cycle.extraParams(),
                };

                if (cycle.availableKeys.includes('liquid')) params.availableLiquid = zonalSource.liquid || 0;
                if (cycle.availableKeys.includes('ice')) params.availableIce = zonalSource.ice || 0;
                if (cycle.availableKeys.includes('buriedIce')) params.availableBuriedIce = zonalSource.buriedIce || 0;
                if (cycle.availableKeys.includes('dryIce')) params.availableDryIce = zonalSource.dryIce || 0;

                const result = cycle.instance.processZone(params);

                zonalChanges[zone].atmosphere[cycle.atmosphereBucket] += result.atmosphere[cycle.atmosphereBucket] || 0;

                const surfaceChanges = result[cycle.surfaceBucket] || {};
                for (const [key, value] of Object.entries(surfaceChanges)) {
                    if (!zonalChanges[zone][cycle.surfaceBucket].hasOwnProperty(key)) {
                        zonalChanges[zone][cycle.surfaceBucket][key] = 0;
                    }
                    zonalChanges[zone][cycle.surfaceBucket][key] += value;
                }

                if (result.precipitation) {
                    for (const [key, value] of Object.entries(result.precipitation)) {
                        if (!zonalChanges[zone].precipitation.hasOwnProperty(key)) {
                            zonalChanges[zone].precipitation[key] = 0;
                        }
                        zonalChanges[zone].precipitation[key] += value;
                    }
                }

                if (result.potentialCO2Condensation !== undefined) {
                    zonalChanges[zone].potentialCO2Condensation = result.potentialCO2Condensation;
                }

                const totals = cycleTotals[cycle.name];
                if (result.evaporationAmount) totals.evaporation += result.evaporationAmount;
                if (result.sublimationAmount) totals.sublimation += result.sublimationAmount;
                if (result.meltAmount) totals.melt += result.meltAmount;
                if (result.freezeAmount) totals.freeze += result.freezeAmount;
            }
        }

        // Include melt from zonal flow and focused power
        cycleTotals.water.melt += this.flowMeltAmount || 0;
        cycleTotals.methane.melt += this.flowMethaneMeltAmount || 0;

        const focusMeltAmount = (typeof globalThis.applyFocusedMelt === 'function')
            ? globalThis.applyFocusedMelt(this, this.resources, durationSeconds)
            : 0;
        cycleTotals.water.melt += focusMeltAmount;
        this.focusMeltAmount = focusMeltAmount;

        // --- 2. Aggregate global atmospheric changes and apply limits ---
        let totalPotentialAtmosphericWaterLoss = 0;
        let totalPotentialAtmosphericCO2Loss = 0;
        let totalPotentialAtmosphericMethaneLoss = 0;
        zones.forEach(zone => {
            // Sum potential losses (negative changes)
            if (zonalChanges[zone].atmosphere.water < 0) {
                totalPotentialAtmosphericWaterLoss -= zonalChanges[zone].atmosphere.water; // Sum positive loss amounts
            }
            if (zonalChanges[zone].atmosphere.co2 < 0) {
               totalPotentialAtmosphericCO2Loss -= zonalChanges[zone].atmosphere.co2; // Sum positive loss amounts
           }
           if (zonalChanges[zone].atmosphere.methane < 0) {
               totalPotentialAtmosphericMethaneLoss -= zonalChanges[zone].atmosphere.methane;
           }
           // Sum gains (positive changes) into the global total
           totalAtmosphericWaterChange += Math.max(0, zonalChanges[zone].atmosphere.water);
           totalAtmosphericCO2Change += Math.max(0, zonalChanges[zone].atmosphere.co2);
           totalAtmosphericMethaneChange += Math.max(0, zonalChanges[zone].atmosphere.methane);
       });

        // Calculate scaling factor if potential loss exceeds available amount
        const waterLossScale = (availableGlobalWaterVapor > 0 && totalPotentialAtmosphericWaterLoss > availableGlobalWaterVapor)
                             ? availableGlobalWaterVapor / totalPotentialAtmosphericWaterLoss : 1.0;
        const co2LossScale = (availableGlobalCo2Gas > 0 && totalPotentialAtmosphericCO2Loss > availableGlobalCo2Gas)
                           ? availableGlobalCo2Gas / totalPotentialAtmosphericCO2Loss : 1.0;
        const methaneLossScale = (availableGlobalMethaneGas > 0 && totalPotentialAtmosphericMethaneLoss > availableGlobalMethaneGas)
                           ? availableGlobalMethaneGas / totalPotentialAtmosphericMethaneLoss : 1.0;

        // Apply scaled losses to global totals and calculate actual surface gains
        zones.forEach(zone => {
            // Adjust Water Loss/Gain
            if (zonalChanges[zone].atmosphere.water < 0) {
                const scaledLoss = zonalChanges[zone].atmosphere.water * waterLossScale;
                totalAtmosphericWaterChange += scaledLoss; // Add scaled negative change to global total

                // Calculate actual surface gain based on scaled loss
                const actualRainfall = zonalChanges[zone].precipitation.potentialRain * waterLossScale;
                const actualSnowfall = zonalChanges[zone].precipitation.potentialSnow * waterLossScale;
                zonalChanges[zone].water.liquid += actualRainfall; // Add actual rain gain
                zonalChanges[zone].water.ice += actualSnowfall; // Add actual snow gain
                // Store for redistribution
                zonalChanges[zone].precipitation.rain = actualRainfall;
                zonalChanges[zone].precipitation.snow = actualSnowfall;
            } else {
                // If it was a net gain zone, add potential precipitation anyway (it wasn't limited)
                const actualRainfall = zonalChanges[zone].precipitation.potentialRain; // Not scaled
                const actualSnowfall = zonalChanges[zone].precipitation.potentialSnow; // Not scaled
                zonalChanges[zone].water.liquid += actualRainfall;
                zonalChanges[zone].water.ice += actualSnowfall;
                // Store for redistribution
                zonalChanges[zone].precipitation.rain = actualRainfall;
                zonalChanges[zone].precipitation.snow = actualSnowfall;
            }

            // Adjust CO2 Loss/Gain
             if (zonalChanges[zone].atmosphere.co2 < 0) {
                const scaledLoss = zonalChanges[zone].atmosphere.co2 * co2LossScale;
                totalAtmosphericCO2Change += scaledLoss; // Add scaled negative change to global total

                // Calculate actual surface gain
                const actualCO2Condensation = zonalChanges[zone].potentialCO2Condensation * co2LossScale;
                zonalChanges[zone].water.dryIce += actualCO2Condensation; // Add actual dry ice gain
                totalCo2CondensationAmount += actualCO2Condensation;
            } else {
                 // If it was a net gain zone, add potential condensation anyway
                 const actualCO2Condensation = zonalChanges[zone].potentialCO2Condensation; // Not scaled
                 zonalChanges[zone].water.dryIce += actualCO2Condensation;
                 totalCo2CondensationAmount += actualCO2Condensation;
            }

            // Adjust Methane Loss/Gain
            if (zonalChanges[zone].atmosphere.methane < 0) {
                const scaledLoss = zonalChanges[zone].atmosphere.methane * methaneLossScale;
                totalAtmosphericMethaneChange += scaledLoss;
                const actualMethaneCondensation = (zonalChanges[zone].precipitation.potentialMethaneRain || 0) * methaneLossScale;
                const actualMethaneIceCondensation = (zonalChanges[zone].precipitation.potentialMethaneSnow || 0) * methaneLossScale;
                zonalChanges[zone].methane.liquid += actualMethaneCondensation;
                zonalChanges[zone].methane.ice += actualMethaneIceCondensation;

                // Store for redistribution
                zonalChanges[zone].precipitation.methaneRain = actualMethaneCondensation;
                zonalChanges[zone].precipitation.methaneSnow = actualMethaneIceCondensation;
            } else {
                const actualMethaneCondensation = zonalChanges[zone].precipitation.potentialMethaneRain || 0;
                const actualMethaneIceCondensation = zonalChanges[zone].precipitation.potentialMethaneSnow || 0;
                zonalChanges[zone].methane.liquid += actualMethaneCondensation;
                zonalChanges[zone].methane.ice += actualMethaneIceCondensation;

                // Store for redistribution
                zonalChanges[zone].precipitation.methaneRain = actualMethaneCondensation;
                zonalChanges[zone].precipitation.methaneSnow = actualMethaneIceCondensation;
            }
        });

        // --- 3. Redistribute Precipitation via cycle hooks ---
        for (const cycle of cycles) {
            if (cycle.instance && typeof cycle.instance.redistributePrecipitation === 'function') {
                cycle.instance.redistributePrecipitation(this, zonalChanges, this.temperature.zones);
            }
        }


        // --- 4. Recalculate precipitation totals after redistribution for accurate UI reporting ---
        totalRainfallAmount = 0;
        totalSnowfallAmount = 0;
        totalMethaneCondensationAmount = 0;
        totalMethaneIceCondensationAmount = 0;
        zones.forEach(zone => {
            totalRainfallAmount += zonalChanges[zone].precipitation.rain || 0;
            totalSnowfallAmount += zonalChanges[zone].precipitation.snow || 0;
            totalMethaneCondensationAmount += zonalChanges[zone].precipitation.methaneRain || 0;
            totalMethaneIceCondensationAmount += zonalChanges[zone].precipitation.methaneSnow || 0;
        });

        // --- 4.5. Spontaneous methane/oxygen combustion ---
        let combustionMethaneAmount = 0;
        let combustionOxygenAmount = 0;
        let combustionWaterAmount = 0;
        let combustionCO2Amount = 0;
        if (globalOxygenPressurePa > OXYGEN_COMBUSTION_THRESHOLD && globalMethanePressurePa > METHANE_COMBUSTION_THRESHOLD) {
            const rate = METHANE_COMBUSTION_PARAMETER *
                (globalOxygenPressurePa - OXYGEN_COMBUSTION_THRESHOLD) *
                (globalMethanePressurePa - METHANE_COMBUSTION_THRESHOLD) *
                this.celestialParameters.surfaceArea;
            combustionMethaneAmount = Math.min(
                rate * durationSeconds,
                availableGlobalMethaneGas,
                availableGlobalOxygenGas / 4
            );
            combustionOxygenAmount = combustionMethaneAmount * 4;
            combustionWaterAmount = combustionMethaneAmount * 2.25;
            combustionCO2Amount = combustionMethaneAmount * 2.75;
            totalAtmosphericMethaneChange -= combustionMethaneAmount;
            totalAtmosphericWaterChange += combustionWaterAmount;
            totalAtmosphericCO2Change += combustionCO2Amount;
            totalOxygenChange -= combustionOxygenAmount;
        }

        // --- 4.6. Calcite aerosol decay ---
        let calciteDecayAmount = 0;
        if (this.resources.atmospheric.calciteAerosol) {
            const currentCalcite = this.resources.atmospheric.calciteAerosol.value || 0;
            if (realSeconds > 0 && currentCalcite > 0) {
                calciteDecayAmount = currentCalcite * (1 - Math.exp(-CALCITE_DECAY_CONSTANT * realSeconds));
                this.resources.atmospheric.calciteAerosol.value = Math.max(0, currentCalcite - calciteDecayAmount);
            }
        }

        // --- 5. Apply net changes ---
        // Ensure aggregated changes are finite numbers before applying
        if(!Number.isFinite(totalAtmosphericWaterChange)) totalAtmosphericWaterChange = 0;
        if(!Number.isFinite(totalAtmosphericCO2Change)) totalAtmosphericCO2Change = 0;
        if(!Number.isFinite(totalAtmosphericMethaneChange)) totalAtmosphericMethaneChange = 0;
        if(!Number.isFinite(totalOxygenChange)) totalOxygenChange = 0;

        // Apply directly to Global Resources (Atmosphere)
        const atmMap = {
            water: 'atmosphericWater',
            co2: 'carbonDioxide',
            methane: 'atmosphericMethane',
            oxygen: 'oxygen'
        };
        const atmTotals = {
            water: totalAtmosphericWaterChange,
            co2: totalAtmosphericCO2Change,
            methane: totalAtmosphericMethaneChange,
            oxygen: totalOxygenChange
        };
        for (const [key, delta] of Object.entries(atmTotals)) {
            const resKey = atmMap[key];
            if (this.resources.atmospheric[resKey]) {
                this.resources.atmospheric[resKey].value += delta;
                this.resources.atmospheric[resKey].value = Math.max(0, this.resources.atmospheric[resKey].value);
            }
        }

        // Apply to Zonal Surface Stores
        for (const zone of zones) {
            const change = zonalChanges[zone];
            // Water resources
            for (const [state, amount] of Object.entries(change.water)) {
                if (state === 'dryIce') {
                    if (!this.zonalSurface[zone].dryIce) this.zonalSurface[zone].dryIce = 0;
                    this.zonalSurface[zone].dryIce += amount;
                    this.zonalSurface[zone].dryIce = Math.max(0, this.zonalSurface[zone].dryIce);
                } else {
                    this.zonalWater[zone][state] += amount;
                    this.zonalWater[zone][state] = Math.max(0, this.zonalWater[zone][state]);
                }
            }

            // Methane resources
            for (const [state, amount] of Object.entries(change.methane)) {
                if (!this.zonalHydrocarbons[zone][state]) this.zonalHydrocarbons[zone][state] = 0;
                this.zonalHydrocarbons[zone][state] += amount;
                this.zonalHydrocarbons[zone][state] = Math.max(0, this.zonalHydrocarbons[zone][state]);
            }
        }

        // --- 5. Update Global Rates for UI ---
        // Calculate and STORE rates for individual processes from total amounts accumulated earlier
        this.totalEvaporationRate = cycleTotals.water.evaporation / durationSeconds * 86400;
        this.totalWaterSublimationRate = cycleTotals.water.sublimation / durationSeconds * 86400;
        this.totalCo2SublimationRate = cycleTotals.co2.sublimation / durationSeconds * 86400;
        this.totalMethaneSublimationRate = cycleTotals.methane.sublimation / durationSeconds * 86400;
        this.totalRainfallRate = totalRainfallAmount / durationSeconds * 86400;
        this.totalSnowfallRate = totalSnowfallAmount / durationSeconds * 86400;
        this.totalMeltRate = cycleTotals.water.melt / durationSeconds * 86400;
        this.totalFreezeRate = cycleTotals.water.freeze / durationSeconds * 86400;
        this.focusMeltRate = (this.focusMeltAmount || 0) / durationSeconds * 86400;
        this.totalCo2CondensationRate = totalCo2CondensationAmount / durationSeconds * 86400;
        this.totalMethaneEvaporationRate = cycleTotals.methane.evaporation / durationSeconds * 86400;
        this.totalMethaneCondensationRate = totalMethaneCondensationAmount / durationSeconds * 86400;
        this.totalMethaneIceCondensationRate = totalMethaneIceCondensationAmount / durationSeconds * 86400;
        this.totalMethaneMeltRate = cycleTotals.methane.melt / durationSeconds * 86400;
        this.totalMethaneFreezeRate = cycleTotals.methane.freeze / durationSeconds * 86400;
        this.totalMethaneCombustionRate = combustionMethaneAmount / durationSeconds * 86400;
        this.totalOxygenCombustionRate = combustionOxygenAmount / durationSeconds * 86400;
        this.totalCombustionWaterRate = combustionWaterAmount / durationSeconds * 86400;
        this.totalCombustionCo2Rate = combustionCO2Amount / durationSeconds * 86400;
        this.totalCalciteDecayRate = calciteDecayAmount / realSeconds;

        // Keep local consts for modifyRate calls below if needed, or use this. properties directly
        const evaporationRate = this.totalEvaporationRate;
        const waterSublimationRate = this.totalWaterSublimationRate;
        const co2SublimationRate = this.totalCo2SublimationRate;
        const rainfallRate = this.totalRainfallRate;
        const snowfallRate = this.totalSnowfallRate;
        const focusedMeltRate = this.focusMeltRate;
        const flowMeltRate = this.flowMeltRate;
        const meltingRate = this.totalMeltRate - focusedMeltRate - flowMeltRate;
        const freezingRate = this.totalFreezeRate;
        const co2CondensationRate = this.totalCo2CondensationRate;
        const combustionMethaneRate = this.totalMethaneCombustionRate;
        const combustionOxygenRate = this.totalOxygenCombustionRate;
        const combustionWaterRate = this.totalCombustionWaterRate;
        const combustionCo2Rate = this.totalCombustionCo2Rate;
        const calciteDecayRate = this.totalCalciteDecayRate;

        // Calculate individual atmospheric process rates
        const atmosphericWaterProductionRate = (cycleTotals.water.evaporation + cycleTotals.water.sublimation) / durationSeconds * 86400;
        const atmosphericWaterConsumptionRate = (totalRainfallAmount + totalSnowfallAmount) / durationSeconds * 86400;
        const atmosphericCO2ProductionRate = cycleTotals.co2.sublimation / durationSeconds * 86400;
        const atmosphericCO2ConsumptionRate = totalCo2CondensationAmount / durationSeconds * 86400;
        const atmosphericMethaneProductionRate = (cycleTotals.methane.evaporation + cycleTotals.methane.sublimation) / durationSeconds * 86400;
        const atmosphericMethaneConsumptionRate = (totalMethaneCondensationAmount + totalMethaneIceCondensationAmount) / durationSeconds * 86400;

        const rateType = 'terraforming';

        // Update Atmospheric Resource Rates (Individual Processes)
        if (this.resources.atmospheric.atmosphericWater) {
             this.resources.atmospheric.atmosphericWater.modifyRate(atmosphericWaterProductionRate, 'Evaporation/Sublimation', rateType);
             this.resources.atmospheric.atmosphericWater.modifyRate(-atmosphericWaterConsumptionRate, 'Precipitation', rateType); // Consumption is negative
        }
        if (this.resources.atmospheric.carbonDioxide) {
            this.resources.atmospheric.carbonDioxide.modifyRate(atmosphericCO2ProductionRate, 'CO2 Sublimation', rateType);
            this.resources.atmospheric.carbonDioxide.modifyRate(-atmosphericCO2ConsumptionRate, 'CO2 Condensation', rateType); // Consumption is negative
        }
        if (this.resources.atmospheric.atmosphericMethane) {
            this.resources.atmospheric.atmosphericMethane.modifyRate(atmosphericMethaneProductionRate, 'Evaporation/Sublimation', rateType);
            this.resources.atmospheric.atmosphericMethane.modifyRate(-atmosphericMethaneConsumptionRate, 'Precipitation', rateType); // Consumption is negative
        }

        if (combustionWaterRate && this.resources.atmospheric.atmosphericWater) {
            this.resources.atmospheric.atmosphericWater.modifyRate(
                combustionWaterRate,
                'Methane Combustion',
                rateType
            );
        }
        if (combustionCo2Rate && this.resources.atmospheric.carbonDioxide) {
            this.resources.atmospheric.carbonDioxide.modifyRate(
                combustionCo2Rate,
                'Methane Combustion',
                rateType
            );
        }
        if (combustionMethaneRate && this.resources.atmospheric.atmosphericMethane) {
            this.resources.atmospheric.atmosphericMethane.modifyRate(
                -combustionMethaneRate,
                'Methane Combustion',
                rateType
            );
        }
        if (combustionOxygenRate && this.resources.atmospheric.oxygen) {
            this.resources.atmospheric.oxygen.modifyRate(
                -combustionOxygenRate,
                'Methane Combustion',
                rateType
            );
        }
        if (calciteDecayRate && this.resources.atmospheric.calciteAerosol) {
            this.resources.atmospheric.calciteAerosol.modifyRate(
                -calciteDecayRate,
                'Calcite Decay',
                rateType
            );
        }

        // Update Surface Resource Rates (Individual Processes for Tooltip)
        if (this.resources.surface.liquidWater) {
            this.resources.surface.liquidWater.modifyRate(-evaporationRate, 'Evaporation', rateType);
            this.resources.surface.liquidWater.modifyRate(rainfallRate, 'Rain', rateType);
            this.resources.surface.liquidWater.modifyRate(meltingRate, 'Melt', rateType);
            this.resources.surface.liquidWater.modifyRate(-freezingRate, 'Freeze', rateType);
            if (focusedMeltRate > 0) {
                this.resources.surface.liquidWater.modifyRate(focusedMeltRate, 'Focused Melt', rateType);
            }
            if (flowMeltRate > 0) {
                this.resources.surface.liquidWater.modifyRate(flowMeltRate, 'Flow Melt', rateType);
            }
        }
        if (this.resources.surface.ice) {
            this.resources.surface.ice.modifyRate(-waterSublimationRate, 'Sublimation', rateType);
            this.resources.surface.ice.modifyRate(snowfallRate, 'Snow', rateType);
            this.resources.surface.ice.modifyRate(-meltingRate, 'Melt', rateType);
            this.resources.surface.ice.modifyRate(freezingRate, 'Freeze', rateType);
            if (focusedMeltRate > 0) {
                this.resources.surface.ice.modifyRate(-focusedMeltRate, 'Focused Melt', rateType);
            }
            if (flowMeltRate > 0) {
                this.resources.surface.ice.modifyRate(-flowMeltRate, 'Flow Melt', rateType);
            }
        }
        if (this.resources.surface.dryIce) {
            this.resources.surface.dryIce.modifyRate(-co2SublimationRate, 'CO2 Sublimation', rateType);
            this.resources.surface.dryIce.modifyRate(co2CondensationRate, 'CO2 Condensation', rateType);
        }
        if (this.resources.surface.liquidMethane) {
            this.resources.surface.liquidMethane.modifyRate(-this.totalMethaneEvaporationRate, 'Methane Evaporation', rateType);
            this.resources.surface.liquidMethane.modifyRate(this.totalMethaneCondensationRate, 'Methane Rain', rateType);
            this.resources.surface.liquidMethane.modifyRate(this.totalMethaneMeltRate - this.flowMethaneMeltRate, 'Melt', rateType);
            this.resources.surface.liquidMethane.modifyRate(-this.totalMethaneFreezeRate, 'Freeze', rateType);
            if (this.flowMethaneMeltRate > 0) {
                this.resources.surface.liquidMethane.modifyRate(this.flowMethaneMeltRate, 'Flow Melt', rateType);
            }
        }
        if (this.resources.surface.hydrocarbonIce) {
            this.resources.surface.hydrocarbonIce.modifyRate(-this.totalMethaneSublimationRate, 'Methane Sublimation', rateType);
            this.resources.surface.hydrocarbonIce.modifyRate(this.totalMethaneIceCondensationRate, 'Methane Snow', rateType);
            this.resources.surface.hydrocarbonIce.modifyRate(-(this.totalMethaneMeltRate - this.flowMethaneMeltRate), 'Melt', rateType);
            this.resources.surface.hydrocarbonIce.modifyRate(this.totalMethaneFreezeRate, 'Freeze', rateType);
            if (this.flowMethaneMeltRate > 0) {
                this.resources.surface.hydrocarbonIce.modifyRate(-this.flowMethaneMeltRate, 'Flow Melt', rateType);
            }
        }

        // reset stored melt from flow for next tick
        this.flowMeltAmount = 0;
        this.flowMethaneMeltAmount = 0;

      this.synchronizeGlobalResources();
    }

    // Function to update luminosity properties
    updateLuminosity() {
      this.luminosity.groundAlbedo = this.calculateGroundAlbedo();
      this.luminosity.surfaceAlbedo = this.calculateSurfaceAlbedo();
      const albRes = this.calculateActualAlbedo();
      this.luminosity.actualAlbedo = albRes.albedo;
      this.luminosity.cloudHazePenalty = albRes.penalty;
      this.luminosity.albedo = this.luminosity.surfaceAlbedo;
      this.luminosity.solarFlux = this.calculateSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
    }

    updateSurfaceTemperature() {
      const groundAlbedo = this.luminosity.groundAlbedo;
      const rotationPeriod = this.celestialParameters.rotationPeriod || 24;
      const gSurface = this.celestialParameters.gravity;

      const { composition, totalMass } = this.calculateAtmosphericComposition();

      const surfacePressurePa = calculateAtmosphericPressure(totalMass / 1000, gSurface, this.celestialParameters.radius);
      const surfacePressureBar = surfacePressurePa / 100000;

      const { emissivity, tau, contributions } = calculateEmissivity(composition, surfacePressureBar, gSurface);
      this.temperature.emissivity = emissivity;
      this.temperature.opticalDepth = tau;
      this.temperature.opticalDepthContributions = contributions;

      // Build aerosols (shortwave) columns in kg/m^2
      const aerosolsSW = {};
      const area_m2 = 4 * Math.PI * Math.pow((this.celestialParameters.radius || 1) * 1000, 2);
      if (this.resources?.atmospheric?.calciteAerosol) {
        const mass_ton = this.resources.atmospheric.calciteAerosol.value || 0;
        const column = area_m2 > 0 ? (mass_ton * 1000) / area_m2 : 0; // kg/m^2
        aerosolsSW.calcite = column;
      }

      const baseParams = {
        groundAlbedo: groundAlbedo,
        flux: this.luminosity.modifiedSolarFlux,
        rotationPeriodH: rotationPeriod,
        surfacePressureBar: surfacePressureBar,
        composition: composition,
        gSurface: gSurface,
        aerosolsSW
      };

      this.luminosity.zonalFluxes = {};
      let weightedTemp = 0;
      let weightedFlux = 0;
      let weightedEqTemp = 0;
      for (const zone in this.temperature.zones) {
        const zoneFlux = this.calculateZoneSolarFlux(zone);
        this.luminosity.zonalFluxes[zone] = zoneFlux;
        const zoneFractions = calculateZonalSurfaceFractions(this, zone);
        const zoneTemps = dayNightTemperaturesModel({ ...baseParams, flux: zoneFlux, surfaceFractions: zoneFractions });
        this.temperature.zones[zone].value = zoneTemps.mean;
        this.temperature.zones[zone].day = zoneTemps.day;
        this.temperature.zones[zone].night = zoneTemps.night;
        this.temperature.zones[zone].equilibriumTemperature = zoneTemps.equilibriumTemperature;
        const zonePct = getZonePercentage(zone);
        weightedTemp += zoneTemps.mean * zonePct;
        weightedFlux += zoneFlux * zonePct;
        weightedEqTemp += zoneTemps.equilibriumTemperature * zonePct;
      }
      this.temperature.value = weightedTemp;
      this.temperature.equilibriumTemperature = weightedEqTemp;
      this.luminosity.modifiedSolarFluxUnpenalized = weightedFlux;
      const penalty = Math.min(1, Math.max(0, this.luminosity.cloudHazePenalty || 0));
      this.luminosity.modifiedSolarFlux = this.luminosity.modifiedSolarFluxUnpenalized * (1 - penalty);
      this.temperature.effectiveTempNoAtmosphere = effectiveTemp(this.luminosity.surfaceAlbedo, this.luminosity.modifiedSolarFluxUnpenalized);
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
        const penalty = (comps.dA_ch4 || 0) + (comps.dA_calcite || 0) + (comps.dA_cloud || 0);
        return { albedo: result.albedo, penalty };
    }

    _updateZonalCoverageCache() {
        const resourceTypes = ['liquidWater', 'ice', 'biomass', 'dryIce', 'liquidMethane', 'hydrocarbonIce'];
        for (const zone of ZONES) {
            const zoneArea = this.celestialParameters.surfaceArea * getZonePercentage(zone);
            this.zonalCoverageCache[zone] = { zoneArea };
            for (const resourceType of resourceTypes) {
                let zonalAmount = 0;
                let scale = 0.0001;
                if (resourceType === 'liquidWater') {
                    zonalAmount = this.zonalWater[zone]?.liquid || 0;
                } else if (resourceType === 'ice') {
                    zonalAmount = this.zonalWater[zone]?.ice || 0;
                    scale *= 100;
                } else if (resourceType === 'biomass') {
                    zonalAmount = this.zonalSurface[zone]?.biomass || 0;
                    scale *= 100000;
                } else if (resourceType === 'dryIce') {
                    zonalAmount = this.zonalSurface[zone]?.dryIce || 0;
                    scale *= 100;
                } else if (resourceType === 'liquidMethane') {
                    zonalAmount = this.zonalHydrocarbons[zone]?.liquid || 0;
                } else if (resourceType === 'hydrocarbonIce') {
                    zonalAmount = this.zonalHydrocarbons[zone]?.ice || 0;
                    scale *= 100;
                }
                this.zonalCoverageCache[zone][resourceType] = estimateCoverage(zonalAmount, zoneArea, scale);
            }
        }
    }

    update() {
      // Distribute global changes (from buildings) into zones first

      this._updateZonalCoverageCache(); // New call at the start of the update tick

      //First update luminosity
      this.updateLuminosity();

      // Update temperature based on the new calculateSurfaceTemperature function
      this.updateSurfaceTemperature();

      // Update Resources will be called by resources.js
      //this.updateResources(deltaTime);

      // Update total atmospheric pressure (based on updated zonal amounts via synchronization later)
      // Note: synchronizeGlobalResources now calculates this.atmosphere.value
      // this.atmosphere.value = this.calculateTotalPressure(); // No longer needed here
  
      // Coverage is now calculated on-demand using calculateAverageCoverage from
      // terraforming-utils.js. Removed redundant calls to the old
      // calculateCoverage function.

      this.applyTerraformingEffects();

      // --- Check and Update Overall Status ---
      // Determine if all parameters meet completion conditions
      // This value is used by the UI to enable the "Complete Terraforming" button
      this.readyForCompletion = this.getTerraformingStatus();

      // --- End of Status Update Logic ---

      // Synchronize zonal data back to global resources object for other systems/UI
      this.synchronizeGlobalResources();
      this.updateSurfaceRadiation();

    } // <-- Correct closing brace for the 'update' method
  
    unlock(aspect) {
      if (this[aspect]) {
        this[aspect].unlocked = true;
      }
    }

    initializeTerraforming(){
        initializeTerraformingTabs();
        createTerraformingSummaryUI();
        if(!this.initialValuesCalculated){
          this.calculateInitialValues(currentPlanetParameters);
          // Calculate equilibrium constants immediately after initial values are set
          //this.calculateEquilibriumConstants();
        }
    }

    resetDefaultConstants(){
        this.equilibriumPrecipitationMultiplier = EQUILIBRIUM_WATER_PARAMETER;
        this.equilibriumCondensationParameter = globalThis.EQUILIBRIUM_CO2_PARAMETER;
        this.equilibriumMethaneCondensationParameter = EQUILIBRIUM_METHANE_PARAMETER; // Default value
    }
    
    // Calculates the current total global atmospheric pressure (in kPa) from global resources
    calculateTotalPressure() {
        const atmos = this.resources.atmospheric || {};
        let totalPressurePa = 0;
        for (const gas in atmos) {
            const amount = atmos[gas].value || 0;
            totalPressurePa += calculateAtmosphericPressure(
                amount,
                this.celestialParameters.gravity,
                this.celestialParameters.radius
            );
        }
        return totalPressurePa / 1000; // Convert Pa to kPa
    }

    calculateAtmosphericComposition() {
        let co2Mass = 0, h2oMass = 0, ch4Mass = 0, safeGHGMass = 0, inertMass = 0;
        for (const gas in this.resources.atmospheric) {
            const amountTons = this.resources.atmospheric[gas].value || 0;
            const kg = amountTons * 1000;
            if (gas === 'carbonDioxide') co2Mass += kg;
            else if (gas === 'atmosphericWater') h2oMass += kg;
            else if (gas === 'atmosphericMethane') ch4Mass += kg;
            else if (gas === 'greenhouseGas') safeGHGMass += kg;
            else inertMass += kg;
        }
        const totalMass = co2Mass + h2oMass + ch4Mass + safeGHGMass + inertMass;
        const composition = {};
        if (totalMass > 0) {
            if (co2Mass > 0) composition.co2 = co2Mass / totalMass;
            if (h2oMass > 0) composition.h2o = h2oMass / totalMass;
            if (ch4Mass > 0) composition.ch4 = ch4Mass / totalMass;
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
      const lum = SOLAR_LUMINOSITY_W * starLuminosityMultiplier;
      return lum / (4*Math.PI * Math.pow(distanceFromSun, 2)); // W/m²
    }

    calculateModifiedSolarFlux(distanceFromSunInMeters){
      const baseFlux = this.calculateSolarFlux(distanceFromSunInMeters);
      const mirrorEffect = this.calculateMirrorEffect();
      const mirrorFlux = mirrorEffect.powerPerUnitArea;
      const lanternFlux = this.calculateLanternFlux();
      const mirrors = (typeof buildings !== 'undefined' && buildings['spaceMirror']) ? buildings['spaceMirror'].active : 0;
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
      const mirrorContribution = mirrorFlux * mirrors * reverseFactor;
      const total = baseFlux + mirrorContribution + lanternFlux;

      return Math.max(total, 6e-6);
    }

    calculateLanternFlux(){
      const lantern = (typeof buildings !== 'undefined') ? buildings['hyperionLantern'] : null;
      if(lantern && lantern.active > 0){
        const productivity = typeof lantern.productivity === 'number' ? lantern.productivity : 1;
        const power = (lantern.powerPerBuilding || 0) * lantern.active * productivity;
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




      const colonyEnergyPenalty = this.calculateColonyEnergyPenalty()
      
      for (let i = 1; i <= 7; i++) {
        const temperaturePenaltyEffect = {
            effectId: 'temperaturePenalty',
            target: 'colony',
            targetId: `t${i}_colony`, // Dynamically set targetId
            type: 'resourceConsumptionMultiplier',
            resourceCategory: 'colony',
            resourceTarget: 'energy',
            value: colonyEnergyPenalty
        };
    
        addEffect(temperaturePenaltyEffect);
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
        surface: ['liquidWater', 'ice', 'dryIce', 'biomass']
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
                         if (resName === 'liquidWater' || resName === 'ice') currentAmount = this.zonalWater[zone][resName === 'liquidWater' ? 'liquid' : 'ice'] || 0;
                         else currentAmount = this.zonalSurface[zone][resName] || 0;
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
                             if (resName === 'liquidWater' || resName === 'ice') currentAmount = this.zonalWater[zone][resName === 'liquidWater' ? 'liquid' : 'ice'] || 0;
                             else currentAmount = this.zonalSurface[zone][resName] || 0;
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
                    if (resName === 'liquidWater') {
                        this.zonalWater[zone].liquid += zonalChange;
                        this.zonalWater[zone].liquid = Math.max(0, this.zonalWater[zone].liquid);
                    } else if (resName === 'ice') {
                        this.zonalWater[zone].ice += zonalChange;
                        this.zonalWater[zone].ice = Math.max(0, this.zonalWater[zone].ice);
                    } else {
                        if (!this.zonalSurface[zone][resName]) this.zonalSurface[zone][resName] = 0;
                        this.zonalSurface[zone][resName] += zonalChange;
                        this.zonalSurface[zone][resName] = Math.max(0, this.zonalSurface[zone][resName]);
                    }
                } // atmospheric removed
            });
        });
    }
}

// Updates the global SURFACE resources object based on summed zonal surface/water data.
// Atmospheric resources are now updated directly in updateResources.
synchronizeGlobalResources() {
    const zones = ZONES;
    let totalLiquidWater = 0;
    let totalIce = 0;
    let totalDryIce = 0;
    let totalBiomass = 0;
    let totalLiquidMethane = 0;
    let totalHydrocarbonIce = 0;

    // Sum up surface resources from zones
    zones.forEach(zone => {
        totalLiquidWater += this.zonalWater[zone].liquid || 0;
        const surfaceIce = this.zonalWater[zone].ice || 0;
        const buried = this.zonalWater[zone].buriedIce || 0;
        totalIce += surfaceIce + buried;
        totalDryIce += this.zonalSurface[zone].dryIce || 0;
        totalBiomass += this.zonalSurface[zone].biomass || 0;
        totalLiquidMethane += this.zonalHydrocarbons[zone].liquid || 0;
        const surfaceMethaneIce = this.zonalHydrocarbons[zone].ice || 0;
        const buriedMethaneIce = this.zonalHydrocarbons[zone].buriedIce || 0;
        totalHydrocarbonIce += surfaceMethaneIce + buriedMethaneIce;
    });

    // Update global SURFACE resource values (Amounts)
    if (this.resources.surface.liquidWater) this.resources.surface.liquidWater.value = totalLiquidWater;
    if (this.resources.surface.ice) this.resources.surface.ice.value = totalIce;
    if (this.resources.surface.dryIce) this.resources.surface.dryIce.value = totalDryIce;
    if (this.resources.surface.biomass) this.resources.surface.biomass.value = totalBiomass;
    if (this.resources.surface.liquidMethane) this.resources.surface.liquidMethane.value = totalLiquidMethane;
    if (this.resources.surface.hydrocarbonIce) this.resources.surface.hydrocarbonIce.value = totalHydrocarbonIce;

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
      zonalWater: this.zonalWater,
      // zonalAtmosphere: this.zonalAtmosphere, // REMOVED - No longer saving internal zonal atmosphere state
      zonalSurface: this.zonalSurface,
      zonalHydrocarbons: this.zonalHydrocarbons,
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

      // Load Zonal Water and Surface (Keep defaults if not in save)
      // Use structuredClone for deep copy to avoid reference issues if loading default
      this.zonalWater = terraformingState.zonalWater ? structuredClone(terraformingState.zonalWater) : this.zonalWater;
      this.zonalSurface = terraformingState.zonalSurface ? structuredClone(terraformingState.zonalSurface) : this.zonalSurface;
      this.zonalHydrocarbons = terraformingState.zonalHydrocarbons ? structuredClone(terraformingState.zonalHydrocarbons) : this.zonalHydrocarbons;
      if (this.zonalHydrocarbons) {
          for (const zone of ['tropical', 'temperate', 'polar']) {
              if (this.zonalHydrocarbons[zone] && !this.zonalHydrocarbons[zone].hasOwnProperty('buriedIce')) {
                  this.zonalHydrocarbons[zone].buriedIce = 0;
              }
          }
      }

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
      this.updateSurfaceTemperature(); // Recalculate temperatures
  } // End loadState

} // End Terraforming Class

  // Removed redundant calculateGasPressure helper function.



if (typeof module !== "undefined" && module.exports) {
  module.exports = Terraforming;
  module.exports.setStarLuminosity = setStarLuminosity;
  module.exports.getStarLuminosity = getStarLuminosity;
  module.exports.getEffectiveLifeFraction = getEffectiveLifeFraction;
  module.exports.METHANE_COMBUSTION_PARAMETER = METHANE_COMBUSTION_PARAMETER;
} else {
  globalThis.setStarLuminosity = setStarLuminosity;
  globalThis.getStarLuminosity = getStarLuminosity;
}

