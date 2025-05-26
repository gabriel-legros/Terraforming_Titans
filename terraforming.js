let solarLuminosity = 3.828e26; // Solar luminosity (W)
const C_P_AIR = 1004; // J/kg·K
const EPSILON = 0.622; // Molecular weight ratio
const AU_METER = 149597870700;

const SOLAR_PANEL_BASE_LUMINOSITY = 1000;
const BASE_COMFORTABLE_TEMPERATURE = 295.15;

const EQUILIBRIUM_WATER_PARAMETER = 0.042841229754382766;
const EQUILIBRIUM_CO2_PARAMETER = 6.204412788729393e-8;

// Fraction of precipitation redistributed across zones
const PRECIPITATION_REDISTRIBUTION_FRACTION = 0.3;
// Weights for redistribution: small effect from winds, larger from water coverage
const WIND_WEIGHT = 0.2;
const WATER_WEIGHT = 0.8;

const terraformingGasTargets = {
  carbonDioxide : {min : 0, max : 100},
  oxygen : {min : 15000, max : 25000},
  inertGas : {min : 50000, max : 100000}
}

class Terraforming extends EffectableEntity{
  constructor(resources, celestialParameters) {
    super({description : 'This module manages all terraforming compononents'});

    this.resources = resources;
    this.celestialParameters = celestialParameters;
    this.celestialParameters.surfaceArea = 4 * Math.PI * Math.pow(this.celestialParameters.radius * 1000, 2);

    this.lifeParameters = lifeParameters; // Load external life parameters

    this.initialValuesCalculated = false;
    this.equilibriumPrecipitationMultiplier = EQUILIBRIUM_WATER_PARAMETER; // Default, will be calculated
    this.equilibriumCondensationParameter = EQUILIBRIUM_CO2_PARAMETER; // Default, will be calculated

    this.completed = false;
    // Add properties to store total rates for UI display
    this.totalEvaporationRate = 0;
    this.totalWaterSublimationRate = 0;
    this.totalCo2SublimationRate = 0;
    this.totalRainfallRate = 0;
    this.totalSnowfallRate = 0;
    this.totalCo2CondensationRate = 0;
    this.totalMeltRate = 0;
    this.totalFreezeRate = 0;

    // Zonal Water Data - Replaces global this.water
    this.zonalWater = {};
    ['tropical', 'temperate', 'polar'].forEach(zone => {
        this.zonalWater[zone] = {
            liquid: 0, // Represents amount/mass in the zone
            ice: 0,    // Represents amount/mass in the zone
            // humidity: 0, // Zonal humidity will likely be calculated dynamically
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
      targetMax: 293.15,
      effectiveTempNoAtmosphere: 0,
      emissivity: 0,
      opticalDepth: 0,
      unlocked: false,
      zones: {
        tropical: {
          initial: 0,
          value: 0,
          day: 0,
          night: 0
        },
        temperate: {
          initial: 0,
          value: 0,
          day: 0,
          night: 0
        },
        polar: {
          initial: 0,
          value: 0,
          day: 0,
          night: 0
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
      solarFlux: 0,
      modifiedSolarFlux: 0,
      surfaceTemperature: 0
    };
    // Zonal Surface Data (Life, Dry Ice) - Replaces global this.life coverages
    this.zonalSurface = {};
     ['tropical', 'temperate', 'polar'].forEach(zone => {
        this.zonalSurface[zone] = {
            dryIce: 0,  // Represents amount/mass in the zone
            biomass: 0 // Represents amount/mass in the zone
            // Zonal coverage values can be calculated from these amounts when needed
        };
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
      name: 'Magnetosphere',
      value: 0,
      target: 100,
      unlocked: false
    };

    this.updateLuminosity();
    this.updateSurfaceTemperature();
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
          const gasAmount = resources.atmospheric[gas]?.value || 0;
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

  // Calculates average coverage percentage using a logistic function
  _calculateAverageCoverage(resourceType) {
      const zones = ['tropical', 'temperate', 'polar'];
      let weightedAverageCoverage = 0;

      for (const zone of zones) {
          const zonalCoverage = this._calculateZonalCoverage(zone, resourceType);
          const zonePercentage = getZonePercentage(zone); // Get the surface area percentage for this zone
          weightedAverageCoverage += zonalCoverage * zonePercentage;
      }

      return Math.max(0, Math.min(weightedAverageCoverage, 1.0)); // Ensure result is between 0 and 1
  }

  // Calculates zonal coverage percentage using a logistic function
  _calculateZonalCoverage(zone, resourceType) {
      const totalSurfaceArea = this.celestialParameters.surfaceArea;
      const zoneArea = totalSurfaceArea * getZonePercentage(zone);
      if (zoneArea <= 0) return 0;

      let zonalAmount = 0;

      // Get amount (tons) from the specific zone
      if (resourceType === 'liquidWater') {
          zonalAmount = this.zonalWater[zone]?.liquid || 0;
      } else if (resourceType === 'ice') {
          zonalAmount = this.zonalWater[zone]?.ice || 0;
      } else if (resourceType === 'biomass') {
          zonalAmount = this.zonalSurface[zone]?.biomass || 0;
      } else if (resourceType === 'dryIce') {
          zonalAmount = this.zonalSurface[zone]?.dryIce || 0;
      } else {
          console.warn(`_calculateZonalCoverage called with invalid resourceType: ${resourceType}`);
          return 0;
      }

      // --- Piecewise Linear/Logarithmic Calculation (Based on old logic, applied zonally) ---
      let resourceRatio = 0.00005 * zonalAmount / zoneArea; // Base ratio for the zone (Reduced from 0.0001)

      // Apply specific multipliers
      if (resourceType === 'dryIce') {
          resourceRatio = 100 * resourceRatio;
      } else if (resourceType === 'biomass') {
          resourceRatio = 1000 * resourceRatio;
      }

      let coverage;

      if (resourceRatio <= 0) {
          coverage = 0;
      } else if (resourceRatio <= 0.001) {
          // Linear part
          coverage = 10 * resourceRatio;
          coverage = Math.max(coverage, 0.00001); // Ensure a minimum small value if ratio > 0
      } else if (resourceRatio < 1) {
          // Logarithmic part
          coverage = 0.143317 * Math.log(resourceRatio) + 1;
          // Clamp coverage between the end of the linear part and 1
          const linearEndCoverage = 10 * 0.001; // Coverage at ratio = 0.001
          coverage = Math.max(linearEndCoverage, Math.min(coverage, 1.0));
      } else { // resourceRatio >= 1
          // Plateau
          coverage = 1;
      }

      return Math.max(0, Math.min(coverage, 1.0)); // Ensure coverage is between 0 and 1
  }

  // Internal helper to calculate evaporation/sublimation RATES for a zone, averaging day/night potentials
  _calculateEvaporationSublimationRates(zone, dayTemperature, nightTemperature, waterVaporPressure, co2VaporPressure, avgAtmPressure, zonalSolarFlux) {
      const zoneArea = this.celestialParameters.surfaceArea * getZonePercentage(zone);
      if (zoneArea <= 0) return { evaporationRate: 0, waterSublimationRate: 0, co2SublimationRate: 0 };

      let dayEvaporationRate = 0, nightEvaporationRate = 0;
      let dayWaterSublimationRate = 0, nightWaterSublimationRate = 0;
      let dayCo2SublimationRate = 0, nightCo2SublimationRate = 0;

      // --- Calculate Rates for Day ---
      const liquidWaterCoverage = this._calculateZonalCoverage(zone, 'liquidWater');
      const liquidWaterCoveredArea = zoneArea * liquidWaterCoverage;
      const iceCoverage = this._calculateZonalCoverage(zone, 'ice');
      const iceCoveredArea = zoneArea * iceCoverage;
      const dryIceCoverage = this._calculateZonalCoverage(zone, 'dryIce');
      const dryIceCoveredArea = zoneArea * dryIceCoverage;

      const daySolarFlux = 2*zonalSolarFlux;

      if (liquidWaterCoveredArea > 0 && typeof dayTemperature === 'number') {
          const dayEvpRateKgM2S = evaporationRateWater(dayTemperature, daySolarFlux, avgAtmPressure, waterVaporPressure, 100);
          dayEvaporationRate = dayEvpRateKgM2S * liquidWaterCoveredArea / 1000;
      }
      if (iceCoveredArea > 0 && typeof dayTemperature === 'number') {
          const dayWaterSublRateKgM2S = sublimationRateWater(dayTemperature, daySolarFlux, avgAtmPressure, waterVaporPressure, 100);
          dayWaterSublimationRate = dayWaterSublRateKgM2S * iceCoveredArea / 1000;
      }
      if (dryIceCoveredArea > 0 && typeof dayTemperature === 'number') {
          const dayCo2SublRateKgM2S = sublimationRateCO2(dayTemperature, daySolarFlux, avgAtmPressure, co2VaporPressure, 100);
          dayCo2SublimationRate = dayCo2SublRateKgM2S * dryIceCoveredArea / 1000;
      }

      // --- Calculate Rates for Night (assuming zero solar flux at night) ---
      const nightSolarFlux = 0; // No sun at night
      if (liquidWaterCoveredArea > 0 && typeof nightTemperature === 'number') {
          const nightEvpRateKgM2S = evaporationRateWater(nightTemperature, nightSolarFlux, avgAtmPressure, waterVaporPressure, 100);
          nightEvaporationRate = nightEvpRateKgM2S * liquidWaterCoveredArea / 1000;
      }
      if (iceCoveredArea > 0 && typeof nightTemperature === 'number') {
          const nightWaterSublRateKgM2S = sublimationRateWater(nightTemperature, nightSolarFlux, avgAtmPressure, waterVaporPressure, 100);
          nightWaterSublimationRate = nightWaterSublRateKgM2S * iceCoveredArea / 1000;
      }
      if (dryIceCoveredArea > 0 && typeof nightTemperature === 'number') {
          const nightCo2SublRateKgM2S = sublimationRateCO2(nightTemperature, nightSolarFlux, avgAtmPressure, co2VaporPressure, 100);
          nightCo2SublimationRate = nightCo2SublRateKgM2S * dryIceCoveredArea / 1000;
      }

      // --- Average Day and Night Rates ---
      const avgEvaporationRate = (dayEvaporationRate + nightEvaporationRate) / 2;
      const avgWaterSublimationRate = (dayWaterSublimationRate + nightWaterSublimationRate) / 2;
      const avgCo2SublimationRate = (dayCo2SublimationRate + nightCo2SublimationRate) / 2;

      // Note: Limits (Math.min) are NOT applied here; they apply to the *amount* in updateResources
      return {
          evaporationRate: avgEvaporationRate,           // tons/s
          waterSublimationRate: avgWaterSublimationRate, // tons/s
          co2SublimationRate: avgCo2SublimationRate      // tons/s
      };
  }

  // Internal helper to calculate potential CO2 condensation RATE FACTOR (rate if parameter=1) for a zone, averaging day/night potentials
  _calculateCO2CondensationRateFactor(zone, co2VaporPressure, dayTemperature, nightTemperature) {
      const totalSurfaceArea = this.celestialParameters.surfaceArea;
      const zoneArea = totalSurfaceArea * getZonePercentage(zone);
      const condensationTemperatureCO2 = 195; // K
      let potentialCondensationRateFactor = 0; // tons/s if parameter=1

      // --- Add check: Only allow condensation if average temp is below condensation point ---
      const avgTemp = (dayTemperature + nightTemperature) / 2;
      if (avgTemp >= condensationTemperatureCO2) {
          return 0; // Return 0 immediately if average temp is too high
      }
      // --- End check ---

      // Function to calculate potential rate factor for a given temperature,
      // now including temperature scaling.
      const calculatePotential = (temp) => {
          let rateFactor = 0;
          if (zoneArea > 0 && typeof temp === 'number' && temp < condensationTemperatureCO2 && co2VaporPressure > 0) {
              const tempDifference = condensationTemperatureCO2 - temp; // How far below condensation point?
              const startLinearDiff = 5.0; // Start linear scaling 5K below condensation temp
              const maxLinearDiff = 45.0; // Reach max scaling 45K below condensation temp (Wider range for less sensitivity)

              // Piecewise scale factor
              let temperatureScale = 0;
              if (tempDifference > maxLinearDiff) {
                  temperatureScale = 1.0; // Constant max scale
              } else if (tempDifference > startLinearDiff) {
                  // Linear scale between startLinearDiff and maxLinearDiff
                  temperatureScale = (tempDifference - startLinearDiff) / (maxLinearDiff - startLinearDiff);
              } // Else (tempDifference <= startLinearDiff), temperatureScale remains 0 (Constant low scale)

              // Base factor related to area and pressure
              const baseCalculatedFactor = (zoneArea * co2VaporPressure / 1000);

              if (!isNaN(baseCalculatedFactor) && baseCalculatedFactor > 0) {
                   // Apply temperature scaling
                   rateFactor = baseCalculatedFactor * temperatureScale;
              }
          }
          return rateFactor;
      };

      // Calculate for night and day
      const nightPotentialFactor = calculatePotential(nightTemperature);
      const dayPotentialFactor = calculatePotential(dayTemperature);

      // Average the rate factors
      potentialCondensationRateFactor = (nightPotentialFactor + dayPotentialFactor) / 2;

      // Note: Limits (Math.min) are NOT applied here; they apply to the *amount* in updateResources
      return potentialCondensationRateFactor; // tons/s if parameter=1
  }

  // Internal helper to calculate potential precipitation RATE FACTOR (rate if multiplier=1) for a zone, averaging day/night potentials
  _calculatePrecipitationRateFactor(zone, waterVaporPressure, gravity, dayTemperature, nightTemperature) {
      const totalSurfaceArea = this.celestialParameters.surfaceArea;
      const zoneArea = totalSurfaceArea * getZonePercentage(zone);
      const freezingPointWater = 273.15; // K
      let potentialRainRateFactor = 0; // tons/s if multiplier=1
      let potentialSnowRateFactor = 0; // tons/s if multiplier=1

      // Calculate average zone temperature
      const avgZoneTemp = (dayTemperature + nightTemperature) / 2;

      // Function to calculate potential rate factor for a given temperature
        const calculatePotential = (temp) => {
            let rainFactor = 0;
            let snowFactor = 0;
            if (zoneArea > 0 && typeof temp === 'number') {
                const saturationPressure = saturationVaporPressureBuck(temp);

              if (waterVaporPressure > saturationPressure) { // Only proceed if there's some effective pressure
                  const excessPressure = waterVaporPressure - saturationPressure;
                  const excessMassKg = (excessPressure * zoneArea) / gravity;
                  const excessMassTons = excessMassKg / 1000;
                  const potentialRate = excessMassTons / 86400; // Base rate factor (tons/s if multiplier=1), using 86400s duration

                  if (!isNaN(potentialRate) && potentialRate > 0) {
                      // Determine form and apply scaling based on the specific temp (day or night)
                      // Rain occurs if instantaneous temp > freezing (check avg temp later)
                      if (temp > freezingPointWater) {
                          rainFactor = potentialRate; // Rain rate is not scaled by temp difference
                      } else {
                          // Apply linear scaling for snow based on how far below freezing it is
                          const tempDifference = freezingPointWater - temp;
                          const maxSnowScaleDiff = 10.0; // Reach max snow rate 10K below freezing
                          const temperatureScale = Math.min(tempDifference / maxSnowScaleDiff, 1.0);
                          snowFactor = potentialRate * temperatureScale;
                      }
                  }
              }
              // --- End Continuous Precipitation Calculation ---
          }
          
          // If average zone temperature is freezing or below, convert potential rain to snow
          if (avgZoneTemp <= freezingPointWater && rainFactor > 0) {
              snowFactor += rainFactor;
              rainFactor = 0;
          }

          return { rainFactor, snowFactor };
      };

      // Calculate for night and day
      const nightPotential = calculatePotential(nightTemperature);
      const dayPotential = calculatePotential(dayTemperature);

      // Average the rates (assuming day/night are equal length for simplicity)
      potentialRainRateFactor = (nightPotential.rainFactor + dayPotential.rainFactor) / 2;
      potentialSnowRateFactor = (nightPotential.snowFactor + dayPotential.snowFactor) / 2;

      // Note: Limits (Math.min) are NOT applied here; they apply to the *amount* in updateResources
      return { rainfallRateFactor: potentialRainRateFactor, snowfallRateFactor: potentialSnowRateFactor }; // tons/s if multiplier=1
  }

  // Internal helper to calculate melting/freezing RATES for a zone
  _calculateMeltingFreezingRates(zone, temperature) {
      const freezingPoint = 273.15;
      const meltingRateMultiplier = 0.0000001; // Rate based on temp difference and available ice
      const freezingRateMultiplier = 0.0000001; // Rate based on temp difference and available water
      const availableIce = this.zonalWater[zone].ice || 0;
      const availableLiquid = this.zonalWater[zone].liquid || 0;

      let meltingRate = 0; // tons/s
      let freezingRate = 0; // tons/s

      if (temperature > freezingPoint && availableIce > 0) {
          // Melting conditions
          const temperatureDifference = temperature - freezingPoint;
          // Rate calculation needs to be independent of duration here
          // Assuming multipliers are implicitly per second? Let's verify units later if needed.
          meltingRate = availableIce * meltingRateMultiplier * temperatureDifference;
      } else if (temperature < freezingPoint && availableLiquid > 0) {
          // Freezing conditions
          const temperatureDifference = freezingPoint - temperature;
          freezingRate = availableLiquid * freezingRateMultiplier * temperatureDifference;
      }
      // Note: Limits (Math.min) are NOT applied here; they apply to the *amount* in updateResources
      return { meltingRate: meltingRate, freezingRate: freezingRate }; // tons/s
  }


  getWaterStatus() {
    // Compare average liquid water coverage to the global target
    return (this._calculateAverageCoverage('liquidWater') > this.waterTarget);
  }

  getLuminosityStatus() {
    return ((this.luminosity.modifiedSolarFlux > this.luminosity.targetMin) && (this.luminosity.modifiedSolarFlux < this.luminosity.targetMax));
  }

  getLifeStatus() {
     // Compare average biomass coverage to the global target
    return (this._calculateAverageCoverage('biomass') > this.life.target);
  }

  getTerraformingStatus() {
    return (this.getTemperatureStatus() && this.getAtmosphereStatus() && this.getWaterStatus() && this.getLuminosityStatus() && this.getLifeStatus() && this.getMagnetosphereStatus());
  }

  calculateInitialValues() {
      // Store initial zonal temperatures
      for (const zone of ['tropical', 'temperate', 'polar']) {
          this.temperature.zones[zone].initial = this.temperature.zones[zone].value;
      }
      // This code block belongs inside calculateInitialValues
      const zones = ['tropical', 'temperate', 'polar'];
      // Get initial amounts directly from currentPlanetParameters
      const initialLiquidWater = currentPlanetParameters.resources.surface.liquidWater?.initialValue || 0;
      const initialIce = currentPlanetParameters.resources.surface.ice?.initialValue || 0;
      const initialDryIce = currentPlanetParameters.resources.surface.dryIce?.initialValue || 0;
      const initialBiomass = currentPlanetParameters.resources.surface.biomass?.initialValue || 0;

      zones.forEach(zone => {
          const zoneRatio = getZonePercentage(zone);
          // Distribute Liquid Water and Biomass proportionally
          this.zonalWater[zone].liquid = initialLiquidWater * zoneRatio;
          this.zonalSurface[zone].biomass = initialBiomass * zoneRatio;

          // Distribute Ice based on Mars-like model (90% Polar, 9% Temperate, 1% Tropical)
          let iceDistributionFactor = 0;
          if (zone === 'polar') {
              iceDistributionFactor = 1;
          } else if (zone === 'temperate') {
              iceDistributionFactor = 0;
          } else if (zone === 'tropical') {
              iceDistributionFactor = 0;
          }
          this.zonalWater[zone].ice = initialIce * iceDistributionFactor;

          // Allocate Dry Ice only to Polar zone (assuming CO2 ice is less stable at lower latitudes initially)
          if (zone === 'polar') {
              this.zonalSurface[zone].dryIce = initialDryIce;
          } else {
              this.zonalSurface[zone].dryIce = 0;
          }

    });

    // Initialize global atmospheric resource amounts (no longer storing in this.atmosphere.gases)
    for (const gas in currentPlanetParameters.resources.atmospheric) {
        const initialTotalGasAmount = currentPlanetParameters.resources.atmospheric[gas]?.initialValue || 0;
        if (resources.atmospheric[gas]) {
            resources.atmospheric[gas].value = initialTotalGasAmount; // Set initial value in global resource
        } else {
            console.warn(`Atmospheric gas '${gas}' defined in parameters but not in global resources.`);
        }
    }

    // Initial global pressures are no longer stored here. They will be calculated
    // on the fly when needed (e.g., for delta or equilibrium calculations)
    // based on the initial values stored in currentPlanetParameters.resources.atmospheric.

      // Initial synchronization to update global resource amounts and calculate initial pressures
      this.synchronizeGlobalResources(); // This will now read from this.atmosphere.gases

      this.updateSurfaceTemperature();

    this.temperature.zones.tropical.initial = this.temperature.zones.tropical.value;
    this.temperature.zones.temperate.initial = this.temperature.zones.temperate.value;
    this.temperature.zones.polar.initial = this.temperature.zones.polar.value;
    // Mark initial values as calculated
    this.initialValuesCalculated = true;
    } // Correct closing brace for calculateInitialValues

    // Calculates the equilibrium constants needed for precipitation and condensation
    // to balance initial evaporation/sublimation rates.
    calculateEquilibriumConstants() {
        if (!this.initialValuesCalculated) {
            console.error("Cannot calculate equilibrium constants before initial values are set.");
            return;
        }

        const gravity = this.celestialParameters.gravity;
        // Calculate initial global pressures on the fly from initial resource values
        let initialTotalPressurePa = 0;
        let initialWaterPressurePa = 0;
        let initialCo2PressurePa = 0;
        for (const gas in currentPlanetParameters.resources.atmospheric) {
            const initialAmount = currentPlanetParameters.resources.atmospheric[gas]?.initialValue || 0;
            const pressure = calculateAtmosphericPressure(initialAmount, gravity, this.celestialParameters.radius);
            initialTotalPressurePa += pressure;
            if (gas === 'atmosphericWater') initialWaterPressurePa = pressure;
            if (gas === 'carbonDioxide') initialCo2PressurePa = pressure;
        }
        const solarFlux = this.luminosity.modifiedSolarFlux; // Use initial modified flux

        // Use global average initial temperature for simplicity in equilibrium calculation
        // A more complex approach could average rates across zones.
        const avgInitialTemp = this.temperature.value; // Global average temp calculated in updateSurfaceTemperature called by calculateInitialValues
        // We need average day/night temps for the rate functions
        const avgInitialDayTemp = (this.temperature.zones.tropical.day + this.temperature.zones.temperate.day + this.temperature.zones.polar.day) / 3;
        const avgInitialNightTemp = (this.temperature.zones.tropical.night + this.temperature.zones.temperate.night + this.temperature.zones.polar.night) / 3;


        let initialTotalWaterEvapSublRate = 0; // tons/s
        let initialTotalCO2SublRate = 0;       // tons/s
        let potentialPrecipitationRateFactor = 0; // tons/s if multiplier=1
        let potentialCondensationRateFactor = 0;  // tons/s if parameter=1

        // --- Calculate Initial Rates and Potential Rate Factors using GLOBAL averages ---
        // Note: This is an approximation. Calculating per zone and summing would be more accurate but complex.

        // Calculate rates as if the whole planet was one zone
        const zones = ['tropical', 'temperate', 'polar']; // Still need zones for coverage/area calcs inside rate functions
        for (const zone of zones) {
            const dayTemp = this.temperature.zones[zone].day;
            const nightTemp = this.temperature.zones[zone].night;
            const zonalSolarFlux = solarFlux * getZoneRatio(zone); // Calculate zone-specific flux
             // Initial Upward Rates (tons/s) - Use average temps, global pressures
             // Pass zone only for coverage/area calculation inside the function
            const evapSublRates = this._calculateEvaporationSublimationRates(
                zone, dayTemp, nightTemp, initialWaterPressurePa, initialCo2PressurePa, initialTotalPressurePa, zonalSolarFlux
            );
            initialTotalWaterEvapSublRate += evapSublRates.evaporationRate + evapSublRates.waterSublimationRate;
            initialTotalCO2SublRate += evapSublRates.co2SublimationRate;

            // Potential Downward Rate Factors (tons/s if multiplier/parameter = 1) - Use average temps, global pressures
            // Pass zone only for area calculation inside the function
            const precipRateFactors = this._calculatePrecipitationRateFactor(
                zone, initialWaterPressurePa, gravity, dayTemp, nightTemp
            );
            potentialPrecipitationRateFactor += precipRateFactors.rainfallRateFactor + precipRateFactors.snowfallRateFactor;

            const co2CondRateFactor = this._calculateCO2CondensationRateFactor(
                zone, initialCo2PressurePa, dayTemp, nightTemp
            );
            potentialCondensationRateFactor += co2CondRateFactor;
        }
        // Since we looped over zones just for area/coverage, the summed rates represent the global total.

        // --- Derive Equilibrium Constants (based on rates) ---
        // Water Precipitation Multiplier
        // We want: TotalPrecipitationRate = initialTotalWaterEvapSublRate
        // We know: TotalPrecipitationRate = potentialPrecipitationRateFactor * equilibriumPrecipitationMultiplier
        if (potentialPrecipitationRateFactor > 1e-12) { // Use a smaller threshold for rates
            this.equilibriumPrecipitationMultiplier = initialTotalWaterEvapSublRate / potentialPrecipitationRateFactor;
        } else if (initialTotalWaterEvapSublRate < 1e-12) {
             this.equilibriumPrecipitationMultiplier = 0.0001; // Default value if both rates are near zero
        } else {
            console.warn("Initial state has upward water flux but no potential precipitation. Using default multiplier.");
            this.equilibriumPrecipitationMultiplier = 0.0001; // Default value
        }

        // CO2 Condensation Parameter
        // We want: TotalCondensationRate = initialTotalCO2SublRate
        // We know: TotalCondensationRate = potentialCondensationRateFactor * equilibriumCondensationParameter
        const defaultCondensationParameter = 1.7699e-7;
        if (potentialCondensationRateFactor > 1e-12) { // Use a smaller threshold for rates
            this.equilibriumCondensationParameter = initialTotalCO2SublRate / potentialCondensationRateFactor; //Slightly less than 1 to be biased towards evaporation, for player enjoyment
        } else if (initialTotalCO2SublRate < 1e-12) {
            this.equilibriumCondensationParameter = defaultCondensationParameter; // Default if both rates near zero
        } else {
            console.warn("Initial state has upward CO2 flux but no potential condensation. Using default parameter.");
            this.equilibriumCondensationParameter = defaultCondensationParameter;
        }

        // Optional: Clamp values
        // this.equilibriumPrecipitationMultiplier = Math.max(1e-6, Math.min(1, this.equilibriumPrecipitationMultiplier));
        // this.equilibriumCondensationParameter = Math.max(1e-10, Math.min(1e-5, this.equilibriumCondensationParameter));

        console.log(`Calculated Equilibrium Precipitation Multiplier (Rate-Based): ${this.equilibriumPrecipitationMultiplier}`);
        console.log(`Calculated Equilibrium Condensation Parameter (Rate-Based): ${this.equilibriumCondensationParameter}`);
    }


    // Calculates and applies changes from all atmospheric/surface processes for one tick,
    // ensuring calculations are based on the start-of-tick state.
    // Calculates and applies changes from atmospheric/surface processes for one tick,
    // using a global atmosphere model but zonal surface interactions.
    updateResources(deltaTime) {
        const durationSeconds = 86400 * deltaTime / 1000; // 1 in-game second equals one day
        if (durationSeconds <= 0) return;

        const zones = ['tropical', 'temperate', 'polar'];
        const gravity = this.celestialParameters.gravity;
        // Get current global atmospheric state directly from resources or calculate pressures
        let globalTotalPressurePa = 0;
        let globalWaterPressurePa = 0;
        let globalCo2PressurePa = 0;
        for (const gas in resources.atmospheric) {
             const amount = resources.atmospheric[gas].value || 0;
             const pressure = calculateAtmosphericPressure(amount, gravity, this.celestialParameters.radius);
             globalTotalPressurePa += pressure;
             if (gas === 'atmosphericWater') globalWaterPressurePa = pressure;
             if (gas === 'carbonDioxide') globalCo2PressurePa = pressure;
        }
        const availableGlobalWaterVapor = resources.atmospheric['atmosphericWater']?.value || 0; // tons
        const availableGlobalCo2Gas = resources.atmospheric['carbonDioxide']?.value || 0; // tons

        const solarFlux = this.luminosity.modifiedSolarFlux;
        const precipitationMultiplier = this.equilibriumPrecipitationMultiplier;
        const condensationParameter = this.equilibriumCondensationParameter;

        let zonalChanges = {}; // Store calculated zonal change *amounts* for the tick
        zones.forEach(zone => {
            zonalChanges[zone] = {
                liquidWater: 0, ice: 0, dryIce: 0, // Net surface changes
                // Store potential atmospheric changes originating/terminating in this zone
                potentialAtmosphericWaterChange: 0,
                potentialAtmosphericCO2Change: 0,
                // Store potential downward flux amounts for scaling
                potentialRainfall: 0,
                potentialSnowfall: 0,
                potentialCO2Condensation: 0,
                // Track realized precipitation before redistribution
                actualRainfall: 0,
                actualSnowfall: 0
            };
        });

        // Store total atmospheric changes calculated across all zones
        let totalAtmosphericWaterChange = 0;
        let totalAtmosphericCO2Change = 0;
        // Store total amounts for individual processes for UI rate reporting
        let totalEvaporationAmount = 0, totalWaterSublimationAmount = 0, totalCo2SublimationAmount = 0;
        let totalRainfallAmount = 0, totalSnowfallAmount = 0, totalCo2CondensationAmount = 0;
        let totalMeltAmount = 0, totalFreezeAmount = 0;

        // --- 1. Calculate potential zonal changes based on start-of-tick state ---
        for (const zone of zones) {
            const zoneTemp = this.temperature.zones[zone].value; // Current average zonal temperature
            const dayTemp = this.temperature.zones[zone].day;
            const nightTemp = this.temperature.zones[zone].night;
            const availableLiquid = this.zonalWater[zone].liquid || 0;
            const availableIce = this.zonalWater[zone].ice || 0;
            const availableDryIce = this.zonalSurface[zone].dryIce || 0;
            const zonalSolarFlux = solarFlux * getZoneRatio(zone); // Calculate zone-specific flux

            // --- Upward Flux (Surface -> Atmosphere) ---
            const evapSublRates = this._calculateEvaporationSublimationRates(
                zone, dayTemp, nightTemp, globalWaterPressurePa, globalCo2PressurePa, globalTotalPressurePa, zonalSolarFlux // Pass zone-specific flux
            );
            const evaporationAmount = Math.min(evapSublRates.evaporationRate * durationSeconds, availableLiquid);
            const waterSublimationAmount = Math.min(evapSublRates.waterSublimationRate * durationSeconds, availableIce);
            const co2SublimationAmount = Math.min(evapSublRates.co2SublimationRate * durationSeconds, availableDryIce);

            // Add potential atmospheric contribution from this zone
            zonalChanges[zone].potentialAtmosphericWaterChange += evaporationAmount + waterSublimationAmount;
            zonalChanges[zone].potentialAtmosphericCO2Change += co2SublimationAmount;
            // Store initial surface loss
            zonalChanges[zone].liquidWater -= evaporationAmount;
            zonalChanges[zone].ice -= waterSublimationAmount;
            zonalChanges[zone].dryIce -= co2SublimationAmount;
            // Accumulate totals for UI
            totalEvaporationAmount += evaporationAmount;
            totalWaterSublimationAmount += waterSublimationAmount;
            totalCo2SublimationAmount += co2SublimationAmount;

            // --- Downward Flux (Atmosphere -> Surface) ---
            const precipRateFactors = this._calculatePrecipitationRateFactor(
                zone, globalWaterPressurePa, gravity, dayTemp, nightTemp
            );
            // Calculate potential amounts based on zonal conditions (before global limits)
            zonalChanges[zone].potentialRainfall = precipRateFactors.rainfallRateFactor * precipitationMultiplier * durationSeconds;
            zonalChanges[zone].potentialSnowfall = precipRateFactors.snowfallRateFactor * precipitationMultiplier * durationSeconds;

            const co2CondRateFactor = this._calculateCO2CondensationRateFactor(
                zone, globalCo2PressurePa, dayTemp, nightTemp
            );
            zonalChanges[zone].potentialCO2Condensation = co2CondRateFactor * condensationParameter * durationSeconds;


            // Store potential atmospheric loss from this zone
            zonalChanges[zone].potentialAtmosphericWaterChange -= (zonalChanges[zone].potentialRainfall + zonalChanges[zone].potentialSnowfall);
            zonalChanges[zone].potentialAtmosphericCO2Change -= zonalChanges[zone].potentialCO2Condensation;

            // --- Phase Changes (Surface Only) ---
            const meltFreezeRates = this._calculateMeltingFreezingRates(zone, zoneTemp);
            // Calculate melt/freeze based on amounts *after* sublimation/evaporation but *before* potential precipitation
            const meltAmount = Math.min(meltFreezeRates.meltingRate * durationSeconds, availableIce + zonalChanges[zone].ice); // Limit by ice available after subl
            const freezeAmount = Math.min(meltFreezeRates.freezingRate * durationSeconds, availableLiquid + zonalChanges[zone].liquidWater); // Limit by liquid available after evap

            // Apply melt/freeze changes to surface stores (adjusting the net change)
            zonalChanges[zone].liquidWater += meltAmount - freezeAmount;
            zonalChanges[zone].ice += freezeAmount - meltAmount;
            // Accumulate totals for UI
            totalMeltAmount += meltAmount;
            totalFreezeAmount += freezeAmount;
        }

        // --- 2. Aggregate global atmospheric changes and apply limits ---
        let totalPotentialAtmosphericWaterLoss = 0;
        let totalPotentialAtmosphericCO2Loss = 0;
        zones.forEach(zone => {
            // Sum potential losses (negative changes)
            if (zonalChanges[zone].potentialAtmosphericWaterChange < 0) {
                totalPotentialAtmosphericWaterLoss -= zonalChanges[zone].potentialAtmosphericWaterChange; // Sum positive loss amounts
            }
            if (zonalChanges[zone].potentialAtmosphericCO2Change < 0) {
                totalPotentialAtmosphericCO2Loss -= zonalChanges[zone].potentialAtmosphericCO2Change; // Sum positive loss amounts
            }
            // Sum gains (positive changes) into the global total
            totalAtmosphericWaterChange += Math.max(0, zonalChanges[zone].potentialAtmosphericWaterChange);
            totalAtmosphericCO2Change += Math.max(0, zonalChanges[zone].potentialAtmosphericCO2Change);
        });

        // Calculate scaling factor if potential loss exceeds available amount
        const waterLossScale = (availableGlobalWaterVapor > 0 && totalPotentialAtmosphericWaterLoss > availableGlobalWaterVapor)
                             ? availableGlobalWaterVapor / totalPotentialAtmosphericWaterLoss : 1.0;
        const co2LossScale = (availableGlobalCo2Gas > 0 && totalPotentialAtmosphericCO2Loss > availableGlobalCo2Gas)
                           ? availableGlobalCo2Gas / totalPotentialAtmosphericCO2Loss : 1.0;

        // Apply scaled losses to global totals and calculate actual surface gains
        zones.forEach(zone => {
            // Adjust Water Loss/Gain
            if (zonalChanges[zone].potentialAtmosphericWaterChange < 0) {
                const scaledLoss = zonalChanges[zone].potentialAtmosphericWaterChange * waterLossScale;
                totalAtmosphericWaterChange += scaledLoss; // Add scaled negative change to global total

                // Calculate actual surface gain based on scaled loss
                const actualRainfall = zonalChanges[zone].potentialRainfall * waterLossScale;
                const actualSnowfall = zonalChanges[zone].potentialSnowfall * waterLossScale;
                zonalChanges[zone].liquidWater += actualRainfall; // Add actual rain gain
                zonalChanges[zone].ice += actualSnowfall; // Add actual snow gain
                // Accumulate actual totals for UI
                totalRainfallAmount += actualRainfall;
                totalSnowfallAmount += actualSnowfall;
                // Store for redistribution
                zonalChanges[zone].actualRainfall = actualRainfall;
                zonalChanges[zone].actualSnowfall = actualSnowfall;
            } else {
                // If it was a net gain zone, add potential precipitation anyway (it wasn't limited)
                // These amounts were stored as potential gains initially, add them now.
                const actualRainfall = zonalChanges[zone].potentialRainfall; // Not scaled
                const actualSnowfall = zonalChanges[zone].potentialSnowfall; // Not scaled
                zonalChanges[zone].liquidWater += actualRainfall;
                zonalChanges[zone].ice += actualSnowfall;
                // Accumulate actual totals for UI
                totalRainfallAmount += actualRainfall;
                totalSnowfallAmount += actualSnowfall;
                // Store for redistribution
                zonalChanges[zone].actualRainfall = actualRainfall;
                zonalChanges[zone].actualSnowfall = actualSnowfall;
            }

            // Adjust CO2 Loss/Gain
             if (zonalChanges[zone].potentialAtmosphericCO2Change < 0) {
                const scaledLoss = zonalChanges[zone].potentialAtmosphericCO2Change * co2LossScale;
                totalAtmosphericCO2Change += scaledLoss; // Add scaled negative change to global total

                // Calculate actual surface gain
                const actualCO2Condensation = zonalChanges[zone].potentialCO2Condensation * co2LossScale;
                zonalChanges[zone].dryIce += actualCO2Condensation; // Add actual dry ice gain
                // Accumulate actual total for UI
                totalCo2CondensationAmount += actualCO2Condensation;
            } else {
                 // If it was a net gain zone, add potential condensation anyway
                 const actualCO2Condensation = zonalChanges[zone].potentialCO2Condensation; // Not scaled
                 zonalChanges[zone].dryIce += actualCO2Condensation;
                 // Accumulate actual total for UI
                totalCo2CondensationAmount += actualCO2Condensation;
            }
        });

        // --- Redistribution of precipitation based on wind and water coverage ---
        const totalPrecip = zones.reduce((sum, z) => sum + zonalChanges[z].actualRainfall + zonalChanges[z].actualSnowfall, 0);
        if (totalPrecip > 0) {
            const zoneWeights = {};
            let weightSum = 0;
            zones.forEach(z => {
                const waterCov = this._calculateZonalCoverage(z, 'liquidWater');
                const w = WIND_WEIGHT + WATER_WEIGHT * waterCov;
                zoneWeights[z] = w;
                weightSum += w;
            });
            zones.forEach(z => {
                const current = zonalChanges[z].actualRainfall + zonalChanges[z].actualSnowfall;
                const desired = totalPrecip * zoneWeights[z] / weightSum;
                const diff = (desired - current) * PRECIPITATION_REDISTRIBUTION_FRACTION;
                if (diff !== 0) {
                    const rainRatio = current > 0 ? zonalChanges[z].actualRainfall / current : 0.5;
                    const rainAdj = diff * rainRatio;
                    const snowAdj = diff - rainAdj;
                    zonalChanges[z].liquidWater += rainAdj;
                    zonalChanges[z].ice += snowAdj;
                    totalRainfallAmount += rainAdj;
                    totalSnowfallAmount += snowAdj;
                }
            });
        }


        // --- 3. Apply net changes ---
        // Apply directly to Global Resources (Atmosphere)
        if (resources.atmospheric['atmosphericWater']) {
            resources.atmospheric['atmosphericWater'].value += totalAtmosphericWaterChange;
            resources.atmospheric['atmosphericWater'].value = Math.max(0, resources.atmospheric['atmosphericWater'].value);
        }
        if (resources.atmospheric['carbonDioxide']) {
            resources.atmospheric['carbonDioxide'].value += totalAtmosphericCO2Change;
            resources.atmospheric['carbonDioxide'].value = Math.max(0, resources.atmospheric['carbonDioxide'].value);
        }

        // Apply to Zonal Surface Stores
        for (const zone of zones) {
            // Net changes already calculated and stored in zonalChanges[zone].liquidWater, .ice, .dryIce
            this.zonalWater[zone].liquid += zonalChanges[zone].liquidWater;
            this.zonalWater[zone].ice += zonalChanges[zone].ice;
            if (!this.zonalSurface[zone].dryIce) this.zonalSurface[zone].dryIce = 0;
            this.zonalSurface[zone].dryIce += zonalChanges[zone].dryIce;

            // Ensure non-negative
            this.zonalWater[zone].liquid = Math.max(0, this.zonalWater[zone].liquid);
            this.zonalWater[zone].ice = Math.max(0, this.zonalWater[zone].ice);
            this.zonalSurface[zone].dryIce = Math.max(0, this.zonalSurface[zone].dryIce);
        }

        // --- 4. Update Global Rates for UI ---
        // Calculate and STORE rates for individual processes from total amounts accumulated earlier
        this.totalEvaporationRate = totalEvaporationAmount / durationSeconds * 86400;
        this.totalWaterSublimationRate = totalWaterSublimationAmount / durationSeconds * 86400;
        this.totalCo2SublimationRate = totalCo2SublimationAmount / durationSeconds * 86400;
        this.totalRainfallRate = totalRainfallAmount / durationSeconds * 86400;
        this.totalSnowfallRate = totalSnowfallAmount / durationSeconds * 86400;
        this.totalMeltRate = totalMeltAmount / durationSeconds * 86400;
        this.totalFreezeRate = totalFreezeAmount / durationSeconds * 86400;
        this.totalCo2CondensationRate = totalCo2CondensationAmount / durationSeconds * 86400;

        // Keep local consts for modifyRate calls below if needed, or use this. properties directly
        const evaporationRate = this.totalEvaporationRate;
        const waterSublimationRate = this.totalWaterSublimationRate;
        const co2SublimationRate = this.totalCo2SublimationRate;
        const rainfallRate = this.totalRainfallRate;
        const snowfallRate = this.totalSnowfallRate;
        const meltingRate = this.totalMeltRate;
        const freezingRate = this.totalFreezeRate;
        const co2CondensationRate = this.totalCo2CondensationRate;

        // Calculate individual atmospheric process rates
        const atmosphericWaterProductionRate = (totalEvaporationAmount + totalWaterSublimationAmount) / durationSeconds * 86400;
        const atmosphericWaterConsumptionRate = (totalRainfallAmount + totalSnowfallAmount) / durationSeconds * 86400;
        const atmosphericCO2ProductionRate = totalCo2SublimationAmount / durationSeconds * 86400;
        const atmosphericCO2ConsumptionRate = totalCo2CondensationAmount / durationSeconds * 86400;

        const rateType = 'terraforming';

        // Update Atmospheric Resource Rates (Individual Processes)
        if (resources.atmospheric.atmosphericWater) {
             resources.atmospheric.atmosphericWater.modifyRate(atmosphericWaterProductionRate, 'Evaporation/Sublimation', rateType);
             resources.atmospheric.atmosphericWater.modifyRate(-atmosphericWaterConsumptionRate, 'Precipitation', rateType); // Consumption is negative
        }
        if (resources.atmospheric.carbonDioxide) {
            resources.atmospheric.carbonDioxide.modifyRate(atmosphericCO2ProductionRate, 'CO2 Sublimation', rateType);
            resources.atmospheric.carbonDioxide.modifyRate(-atmosphericCO2ConsumptionRate, 'CO2 Condensation', rateType); // Consumption is negative
        }

        // Update Surface Resource Rates (Individual Processes for Tooltip)
        if (resources.surface.liquidWater) {
            resources.surface.liquidWater.modifyRate(-evaporationRate, 'Evaporation', rateType);
            resources.surface.liquidWater.modifyRate(rainfallRate, 'Rain', rateType);
            resources.surface.liquidWater.modifyRate(meltingRate, 'Melt', rateType);
            resources.surface.liquidWater.modifyRate(-freezingRate, 'Freeze', rateType);
        }
        if (resources.surface.ice) {
            resources.surface.ice.modifyRate(-waterSublimationRate, 'Sublimation', rateType);
            resources.surface.ice.modifyRate(snowfallRate, 'Snow', rateType);
            resources.surface.ice.modifyRate(-meltingRate, 'Melt', rateType);
            resources.surface.ice.modifyRate(freezingRate, 'Freeze', rateType);
        }
        if (resources.surface.dryIce) {
            resources.surface.dryIce.modifyRate(-co2SublimationRate, 'CO2 Sublimation', rateType);
            resources.surface.dryIce.modifyRate(co2CondensationRate, 'CO2 Condensation', rateType);
        }
    }

    // Function to update luminosity properties
    updateLuminosity() {
      this.luminosity.albedo = this.calculateEffectiveAlbedo();
      this.luminosity.solarFlux = this.calculateSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
      this.luminosity.modifiedSolarFlux = this.calculateModifiedSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
    }

    updateSurfaceTemperature() {
      const groundAlbedo = this.luminosity.albedo;
      const modifiedSolarFlux = this.luminosity.modifiedSolarFlux;
      const rotationPeriod = this.celestialParameters.rotationPeriod || 24;
      const gSurface = this.celestialParameters.gravity;

      let co2Mass = 0, h2oMass = 0, ch4Mass = 0, safeGHGMass = 0, inertMass = 0, totalMass = 0;

      for (const gas in resources.atmospheric) {
        const amountTons = resources.atmospheric[gas].value || 0;
        const kg = amountTons * 1000;
        if (gas === 'carbonDioxide') co2Mass += kg;
        else if (gas === 'atmosphericWater') h2oMass += kg;
        else if (gas === 'methane') ch4Mass += kg;
        else if (gas === 'greenhouseGas') safeGHGMass += kg;
        else inertMass += kg;
      }
      totalMass = co2Mass + h2oMass + ch4Mass + safeGHGMass + inertMass;

      const surfacePressurePa = calculateAtmosphericPressure(totalMass / 1000, gSurface, this.celestialParameters.radius);
      const surfacePressureBar = surfacePressurePa / 100000;

      const composition = {};
      if (totalMass > 0) {
        if (co2Mass > 0) composition.co2 = co2Mass / totalMass;
        if (h2oMass > 0) composition.h2o = h2oMass / totalMass;
        if (ch4Mass > 0) composition.ch4 = ch4Mass / totalMass;
        if (safeGHGMass > 0) composition.greenhouseGas = safeGHGMass / totalMass;
      }

      const emissivity = calculateEmissivity(composition, surfacePressureBar);
      this.temperature.emissivity = emissivity;
      const tau = emissivity < 1 ? -Math.log(1 - emissivity) : Infinity;
      this.temperature.opticalDepth = tau;

      const surfaceFractions = {
        ocean: this._calculateAverageCoverage('liquidWater'),
        ice: this._calculateAverageCoverage('ice')
      };

      const baseParams = {
        groundAlbedo: groundAlbedo,
        flux: modifiedSolarFlux,
        rotationPeriodH: rotationPeriod,
        surfacePressureBar: surfacePressureBar,
        composition: composition,
        surfaceFractions: surfaceFractions,
        gSurface: gSurface
      };

      const globalTemps = dayNightTemperaturesModel(baseParams);
      this.temperature.value = globalTemps.mean;
      this.temperature.effectiveTempNoAtmosphere = effectiveTemp(surfaceAlbedoMix(groundAlbedo, surfaceFractions), modifiedSolarFlux);

      for (const zone in this.temperature.zones) {
        const zoneFlux = modifiedSolarFlux * (getZoneRatio(zone) / 0.25);
        const zoneTemps = dayNightTemperaturesModel({ ...baseParams, flux: zoneFlux });
        this.temperature.zones[zone].value = zoneTemps.mean;
        this.temperature.zones[zone].day = zoneTemps.day;
        this.temperature.zones[zone].night = zoneTemps.night;
      }
    }

    calculateEffectiveAlbedo() {
        const baseAlbedo = this.celestialParameters.albedo;
        const oceanAlbedo = 0.06;
        const upgradeAlbedo = 0.05;
        const surfaceArea = this.celestialParameters.surfaceArea;

        // Use the new helper function to get water coverage ratio
        const waterRatio = this._calculateAverageCoverage('liquidWater');

        const albedoUpgrades = resources.special.albedoUpgrades.value;
        // Calculate ratios, ensuring they don't exceed available land area
        const albedoUpgradeRatio = surfaceArea > 0 ? Math.min(albedoUpgrades / surfaceArea, 1 - waterRatio) : 0;
        const untouchedRatio = Math.max(1 - waterRatio - albedoUpgradeRatio, 0);

        const effectiveAlbedo = oceanAlbedo * waterRatio + upgradeAlbedo * albedoUpgradeRatio + untouchedRatio * baseAlbedo;
        return effectiveAlbedo;
    }

    update(deltaTime) {
      // Distribute global changes (from buildings) into zones first
      this.distributeGlobalChangesToZones(deltaTime);

      //First update luminosity
      this.updateLuminosity();

      // Update temperature based on the new calculateSurfaceTemperature function
      this.updateSurfaceTemperature();

      // Update Resources will be called by resources.js
      //this.updateResources(deltaTime);

      // Update total atmospheric pressure (based on updated zonal amounts via synchronization later)
      // Note: synchronizeGlobalResources now calculates this.atmosphere.value
      // this.atmosphere.value = this.calculateTotalPressure(); // No longer needed here
  
      // Coverage is now calculated on-demand by _calculateAverageCoverage where needed.
      // Removed redundant calls to the old calculateCoverage function.

      // Simulate atmospheric and water flow between zones
      simulateSurfaceWaterFlow(this.zonalWater, deltaTime); // Call for Step 4

      this.applyTerraformingEffects();

      // --- Check and Update Overall Status ---
      const newStatus = this.getTerraformingStatus(); // Calculate based on current state

      // Check if the status has changed compared to the last known status
      if (newStatus !== this.completed) {
            this.completed = newStatus; // Update the internal flag
            // Notify SpaceManager about the status change for the CURRENT planet
            spaceManager.updateCurrentPlanetTerraformedStatus(this.completed);
      } // <-- Correct closing brace for the 'if' block

      // --- End of Status Update Logic ---

      // Synchronize zonal data back to global resources object for other systems/UI
      this.synchronizeGlobalResources();

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
          this.calculateInitialValues();
          // Calculate equilibrium constants immediately after initial values are set
          //this.calculateEquilibriumConstants();
        }
    }

    resetDefaultConstants(){
        this.equilibriumPrecipitationMultiplier = EQUILIBRIUM_WATER_PARAMETER;
        this.equilibriumCondensationParameter = EQUILIBRIUM_CO2_PARAMETER;
    }
    
    // Calculates the current total global atmospheric pressure (in kPa) from global resources
    calculateTotalPressure() {
        let totalPressurePa = 0;
        for (const gas in resources.atmospheric) {
            const amount = resources.atmospheric[gas].value || 0;
            totalPressurePa += calculateAtmosphericPressure(
                amount,
                this.celestialParameters.gravity,
                this.celestialParameters.radius
            );
        }
        return totalPressurePa / 1000; // Convert Pa to kPa
    }

    // Removed global calculateHumidity function as humidity should be calculated zonally if needed.

    // Removed redundant calculateCoverage function. Logic is now in _calculateAverageCoverage.
    // Mirror Effect Calculation
    calculateMirrorEffect() {
      // Solar flux hitting the mirror (same as base flux at mirror's position)
      const solarFluxAtMirror = this.calculateSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
      const mirrorSurfaceArea = buildings['spaceMirror'].surfaceArea; // m^2
      
      // The total power intercepted by the mirror
      const interceptedPower = solarFluxAtMirror * mirrorSurfaceArea; // W
      // Intercepted power per unit surface area of the planet
      const powerPerUnitArea = interceptedPower / this.celestialParameters.surfaceArea; // W/m²
      
      // Return both the total intercepted power and power per unit area
      return {
        interceptedPower: interceptedPower,
        powerPerUnitArea: powerPerUnitArea
      };
    }

    calculateSolarFlux(distanceFromSun){
      return solarLuminosity / (4*Math.PI * Math.pow(distanceFromSun, 2)); // W/m²
    }    

    calculateModifiedSolarFlux(distanceFromSunInMeters){
      const baseFlux = this.calculateSolarFlux(distanceFromSunInMeters);
      const mirrorFlux = this.calculateMirrorEffect().powerPerUnitArea;

      return baseFlux + mirrorFlux*buildings['spaceMirror'].active;
    }

    calculateSolarPanelMultiplier(){
      return this.luminosity.modifiedSolarFlux / SOLAR_PANEL_BASE_LUMINOSITY;
    }

    calculateColonyEnergyPenalty() {
      const zones = this.temperature.zones;
      const baseTemperature = BASE_COMFORTABLE_TEMPERATURE;
  
      // Find the smallest difference across all zones
      const smallestDifference = Math.min(
          Math.abs(zones.tropical.value - baseTemperature),
          Math.abs(zones.temperate.value - baseTemperature),
          Math.abs(zones.polar.value - baseTemperature)
      );
  
      // Calculate penalty based on the smallest difference
      return smallestDifference <= 2 ? 1 : 1 + smallestDifference / 10;
  }

    // Calculates the sum of absolute pressure changes for each gas since initialization
    calculateTotalPressureDelta() {
        let totalDelta = 0; // Use a local variable, no need to store this.totalDelta

        // Calculate current and initial pressures on the fly
        for (const gas in resources.atmospheric) { // Iterate through defined atmospheric gases
            const currentAmount = resources.atmospheric[gas].value || 0;
            const initialAmount = currentPlanetParameters.resources.atmospheric[gas]?.initialValue || 0;

            const currentPressure = calculateAtmosphericPressure(currentAmount, this.celestialParameters.gravity, this.celestialParameters.radius);
            const initialPressure = calculateAtmosphericPressure(initialAmount, this.celestialParameters.gravity, this.celestialParameters.radius);

            totalDelta += Math.abs(currentPressure - initialPressure);
        }

        return totalDelta; // Return the calculated sum of deltas (in Pa)
    }

    applyTerraformingEffects(){
      const solarPanelMultiplier = this.calculateSolarPanelMultiplier();

      const solarPanelEffect = {
        effectId : 'luminosity',
        target: 'building',
        targetId: 'solarPanel',
        type: 'productionMultiplier',
        value: solarPanelMultiplier
      }
      addEffect(solarPanelEffect);

      const colonyEnergyPenalty = this.calculateColonyEnergyPenalty()
      
      for (let i = 1; i <= 6; i++) {
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
    const zones = ['tropical', 'temperate', 'polar'];
    const secondsMultiplier = deltaTime / 1000;

    // Define which SURFACE resources need distribution
    const climateResources = {
        surface: ['liquidWater', 'ice', 'dryIce', 'biomass']
        // atmospheric distribution removed
    };

    for (const category in climateResources) {
        climateResources[category].forEach(resName => {
            const globalRes = resources[category]?.[resName];
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
                const survivableZoneResults = design.temperatureSurvivalCheck(); // Object {'tropical': {pass, reason}, ... 'global': {pass}}

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
    const zones = ['tropical', 'temperate', 'polar'];
    let totalLiquidWater = 0;
    let totalIce = 0;
    let totalDryIce = 0;
    let totalBiomass = 0;

    // Sum up surface resources from zones
    zones.forEach(zone => {
        totalLiquidWater += this.zonalWater[zone].liquid || 0;
        totalIce += this.zonalWater[zone].ice || 0;
        totalDryIce += this.zonalSurface[zone].dryIce || 0;
        totalBiomass += this.zonalSurface[zone].biomass || 0;
    });

    // Update global SURFACE resource values (Amounts)
    if (resources.surface.liquidWater) resources.surface.liquidWater.value = totalLiquidWater;
    if (resources.surface.ice) resources.surface.ice.value = totalIce;
    if (resources.surface.dryIce) resources.surface.dryIce.value = totalDryIce;
    if (resources.surface.biomass) resources.surface.biomass.value = totalBiomass;

    // Atmospheric resources are no longer synchronized here.
    // Pressures are calculated on the fly when needed.
}

  saveState(){
    return {
      initialValuesCalculated: this.initialValuesCalculated,
      temperature: this.temperature,
      // atmosphere: this.atmosphere, // REMOVED - No longer saving internal atmosphere state
      completed: this.completed,
      zonalWater: this.zonalWater,
      // zonalAtmosphere: this.zonalAtmosphere, // REMOVED - No longer saving internal zonal atmosphere state
      zonalSurface: this.zonalSurface,
      // zonalBiomass: this.zonalBiomass, // REMOVED - Biomass is stored in zonalSurface
      // Save equilibrium constants
      equilibriumPrecipitationMultiplier: this.equilibriumPrecipitationMultiplier,
      equilibriumCondensationParameter: this.equilibriumCondensationParameter,
      // NOTE: Stored rates (like totalEvaporationRate) are not saved, they are recalculated each tick.
      };
  }

  loadState(terraformingState) {
      if (!terraformingState) return;

      this.completed = terraformingState.completed || false;
      this.initialValuesCalculated = terraformingState.initialValuesCalculated || false;

      this.equilibriumPrecipitationMultiplier = terraformingState.equilibriumPrecipitationMultiplier ?? this.equilibriumPrecipitationMultiplier;
      this.equilibriumCondensationParameter = terraformingState.equilibriumCondensationParameter ?? this.equilibriumCondensationParameter;

      // Load Temperature (including zonal)
      if (terraformingState.temperature) {
          this.temperature.value = terraformingState.temperature.value || 0;
          this.temperature.emissivity = terraformingState.temperature.emissivity || 0;
          this.temperature.effectiveTempNoAtmosphere = terraformingState.temperature.effectiveTempNoAtmosphere || 0;
          this.temperature.opticalDepth = terraformingState.temperature.opticalDepth || 0;
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

      // If loading a save where initial values weren't calculated, run calculateInitialValues.
      // This will correctly initialize global resource amounts based on parameters
      // and distribute surface resources zonally.
      if (!this.initialValuesCalculated) {
           console.warn("Initial values not calculated in save. Running calculateInitialValues.");
           this.calculateInitialValues(); // This now correctly sets global resource values too
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
      this.updateSurfaceTemperature(); // Recalculate temperatures
  } // End loadState

} // End Terraforming Class

  // Removed redundant calculateGasPressure helper function.



if (typeof module !== "undefined" && module.exports) {
  module.exports = Terraforming;
}
