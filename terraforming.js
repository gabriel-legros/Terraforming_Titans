let solarLuminosity = 3.828e26; // Solar luminosity (W)
const R_AIR = 287; // J/kg·K (specific gas constant for dry air)
const C_P_AIR = 1004; // J/kg·K
const EPSILON = 0.622; // Molecular weight ratio
const AU_METER = 149597870700;

class Terraforming {
  constructor(resources, celestialParameters) {
    this.resources = resources;
    this.celestialParameters = celestialParameters;
    this.celestialParameters.surfaceArea = 4 * Math.PI * Math.pow(this.celestialParameters.radius * 1000, 2);
    this.water = {
      name: 'Water',
      value: 0,
      iceValue: 0,
      target: 0.70,
      unlocked: false,
      humidity: 0,
      evaporationRate:0,
      sublimationRate:0,
      rainfallRate:0,
      snowfallRate:0,
      meltingRate:0,
      freezingRate:0
    };
    this.atmosphere = {
      name: 'Atmosphere',
      value: 0,
      target: 101.325,
      unlocked: false
    };
    this.temperature = {
      name: 'Temperature',
      value: 0,
      target: 288.15, // 15°C in Kelvin
      solarFlux: 0,
      modifiedSolarFlux: 0,
      effectiveTempNoAtmosphere: 0,
      emissivity: 0,
      unlocked: false,
      zones: {
        tropical: {
          value: 0
        },
        temperate: {
          value: 0
        },
        polar: {
          value: 0
        }
      }
    };
    this.life = {
      name: 'Life',
      value: 0,
      target: 50,
      unlocked: false,
      zones: {
        tropical: {
          value: 0
        },
        temperate: {
          value: 0
        },
        polar: {
          value: 0
        }
      },
      dryIceCoverage: 0
    };
    this.magnetosphere = {
      name: 'Magnetosphere',
      value: 0,
      target: 100,
      unlocked: false
    };
    this.toxicity = {
      name: 'Toxicity',
      value: 100,
      target: 0,
      unlocked: false
    };

    this.updateSurfaceTemperature();
  }

    updateResources(accumulatedChanges, deltaTime){
      this.applyEvaporationAndSublimation(accumulatedChanges, deltaTime);
      this.applyRainfallAndSnow(accumulatedChanges, deltaTime);
      this.applyMeltingAndFreezing(accumulatedChanges, deltaTime);

      this.condenseCO2(accumulatedChanges, deltaTime);
    }

    updateSurfaceTemperature() {
      const distanceFromSunInMeters = this.celestialParameters.distanceFromSun * AU_METER; // Convert AU to meters
      const radiusInMeters = this.celestialParameters.radius * 1000; // Convert km to meters
      const albedo = this.calculateEffectiveAlbedo();
  
      let co2WaterMass = 0;
      let greenhouseGasMass = 0;
      let inertMass = 0;
  
      for (const gas in this.resources.atmospheric) {
        if (gas === 'carbonDioxide' || gas === 'atmosphericWater') {
          co2WaterMass += 1e3*this.resources.atmospheric[gas].value;
        } else if(gas === 'greenhouseGas') {
          greenhouseGasMass += 1e3*this.resources.atmospheric[gas].value;
        } else {
          inertMass += 1e3*this.resources.atmospheric[gas].value;
        }
      }
  
      this.temperature.emissivity = calculateEmissivity(radiusInMeters, inertMass, co2WaterMass, greenhouseGasMass);
      this.temperature.solarFlux = calculateSolarFlux(distanceFromSunInMeters);
      this.temperature.modifiedSolarFlux = this.calculateModifiedSolarFlux(distanceFromSunInMeters);
      this.temperature.effectiveTempNoAtmosphere = calculateEffectiveTemperatureNoAtm(this.temperature.modifiedSolarFlux, albedo, 0.25);
      this.temperature.value = calculateEffectiveTemperature(this.temperature.modifiedSolarFlux, albedo, this.temperature.emissivity, 0.25);

      for (const zone in this.temperature.zones) {
        this.temperature.zones[zone].value = calculateEffectiveTemperature(this.temperature.modifiedSolarFlux, albedo, this.temperature.emissivity, getZoneRatio(zone));
      }
    }

    calculateEffectiveAlbedo() {
      const baseAlbedo = this.celestialParameters.albedo;
      const oceanAlbedo = 0.06;
      const upgradeAlbedo = 0.05;
      const waterRatio = this.water.value / 100;

      const albedoUpgrades = resources.special.albedoUpgrades.value;
      const albedoUpgradeRatio = Math.min(albedoUpgrades / this.celestialParameters.surfaceArea, 1 - waterRatio);
      const untouchedRatio = Math.max(1 - waterRatio - albedoUpgradeRatio, 0);
  
      const effectiveAlbedo = oceanAlbedo * waterRatio + upgradeAlbedo * albedoUpgradeRatio + untouchedRatio * baseAlbedo;
      return effectiveAlbedo;
    }
  
    update(deltaTime) {
      // Update temperature based on the new calculateSurfaceTemperature function
      this.updateSurfaceTemperature();
  
      // Update atmospheric pressure
      this.atmosphere.value = this.calculateTotalPressure();
  
      // Update water level
      this.calculateCoverage('liquidWater');
      this.calculateCoverage('ice');
      this.calculateCoverage('dryIce');
    }
  
    unlock(aspect) {
      if (this[aspect]) {
        this[aspect].unlocked = true;
      }
    }

    initializeTerraforming(){
        createTerraformingUI();
    }
    
    calculateTotalPressure() {
      let totalPressure = 0;
  
      for (const gas in this.resources.atmospheric) {
        const gasPressure = calculateGasPressure(gas);
        totalPressure += gasPressure;
      }
  
      return totalPressure / 1000; // Convert from Pa to kPa
    }

    calculateHumidity() {
      const satVapPress = saturationVaporPressureBuck(this.temperature.value - 273.15);
      return calculateGasPressure('atmosphericWater')/satVapPress;
    }

    calculateCoverage(resourceType) {
      const surfaceArea = this.celestialParameters.surfaceArea;
      const resourceAmount = resources['surface'][resourceType].value;
      let resourceRatio = 0.0001 * resourceAmount / surfaceArea;
      if(resourceType === 'dryIce'){
        resourceRatio = 100 * resourceRatio;
      }
    
      let coverage;
    
      if (resourceRatio <= 0.001) {
        coverage = 10 * resourceRatio;
      } else if (resourceRatio > 0.001 && resourceRatio < 1) {
        coverage = 0.143317 * Math.log(resourceRatio) + 1;
      } else if (resourceRatio >= 1) {
        coverage = 1;
      } else {
        coverage = 0;
      }
    
      if (resourceType === 'liquidWater') {
        this.water.value = coverage;
      } else if (resourceType === 'ice') {
        this.water.iceValue = coverage;
      } else if (resourceType === 'dryIce') {
        this.life.dryIceCoverage = coverage;
      }
    }

    applyEvaporationAndSublimation(accumulatedChanges, deltaTime){
      // deltaTime: Time step in milliseconds
      const secondsInDay = 86400;
      const timeMultiplier = secondsInDay * (deltaTime / 1000); // Convert deltaTime to seconds

      const waterGasPressure = calculateGasPressure('atmosphericWater');
      const co2GasPressure = calculateGasPressure('carbonDioxide');

      // Calculate Evaporation Rate for Liquid Water
      const evpRate = evaporationRateWater(
        this.temperature.value,       // T: Temperature in Kelvin (K)
        this.temperature.solarFlux,   // solarFlux: Incoming solar radiation (W/m²)
        this.atmosphere.value,        // atmPressure: Atmospheric pressure (Pa)
        waterGasPressure,    // e_a: Actual vapor pressure of water in the atmosphere (Pa)
        100                            // r_a: Aerodynamic resistance (s/m); adjust based on wind conditions
    ); // kg/m²/s
    
      // Calculate Sublimation Rate for Water Ice
      const sublRate = sublimationRateWater(
          this.temperature.value,       // T: Temperature in Kelvin (K)
          this.temperature.solarFlux,   // solarFlux: Incoming solar radiation (W/m²)
          this.atmosphere.value,        // atmPressure: Atmospheric pressure (Pa)
          waterGasPressure,    // e_a: Actual vapor pressure of water in the atmosphere (Pa)
          100                            // r_a: Aerodynamic resistance (s/m); adjust based on wind conditions
      ); // kg/m²/s

      const sublRateCO2 = sublimationRateCO2(
          this.temperature.value,
          this.temperature.solarFlux,
          this.atmosphere.value,
          co2GasPressure,
          100
      )

      const surfaceArea = 4 * Math.PI * Math.pow(this.celestialParameters.radius * 1000, 2);
      const waterSurface = surfaceArea*this.water.value;
      const iceSurface = surfaceArea*this.water.iceValue;
      const dryIceSurface = surfaceArea*this.life.dryIceCoverage;

      const evaporationAmount = evpRate * waterSurface * timeMultiplier / 1000; //Divide by 1000 to go from kg to tons
      const sublimationAmount = sublRate * iceSurface * timeMultiplier / 1000;
      const sublimationCo2Amount = sublRateCO2 * dryIceSurface * timeMultiplier / 1000;

      // Save evaporation and sublimation rates
      this.water.evaporationRate = evaporationAmount / deltaTime;
      this.water.sublimationRate = sublimationAmount / deltaTime;
      this.life.co2sublimationRate = sublimationCo2Amount / deltaTime;

      // Apply evaporation
      accumulatedChanges['surface']['liquidWater'] -= evaporationAmount;
      accumulatedChanges['atmospheric']['atmosphericWater'] += evaporationAmount;

      // Apply sublimation
      accumulatedChanges['surface']['ice'] -= sublimationAmount;
      accumulatedChanges['atmospheric']['atmosphericWater'] += sublimationAmount;

      // Apply sublimation of CO2
      accumulatedChanges['surface']['dryIce'] -= sublimationCo2Amount;
      accumulatedChanges['atmospheric']['carbonDioxide'] += sublimationCo2Amount;
    }

    applyRainfallAndSnow(accumulatedChanges, deltaTime) {
      const timeMultiplier = 86400 * (deltaTime / 1000);
      const precipitationMultiplier = 0.0001;
      const surfaceArea = 4 * Math.PI * Math.pow(this.celestialParameters.radius * 1000, 2);
    
      const waterGasPressure = calculateGasPressure('atmosphericWater');
    
      let totalRainfall = 0;
      let totalSnowfall = 0;

      const planetaryTemperature = this.temperature.value;
      const planetarySaturationPressure = saturationVaporPressureBuck(planetaryTemperature);

      if(waterGasPressure > planetarySaturationPressure){

        for (const zone in this.temperature.zones) {
          const zonePercentage = getZonePercentage(zone);
          const zoneTemperature = this.temperature.zones[zone].value;

          const precipitationAmount = precipitationMultiplier*(waterGasPressure - planetarySaturationPressure) * surfaceArea * zonePercentage * timeMultiplier / 1000; // Divide by 1000 to go from kg to tons
    
          if (zoneTemperature > 273.15) {
            // Rain
            accumulatedChanges['surface']['liquidWater'] += precipitationAmount;
            totalRainfall += precipitationAmount;
          } else {
            // Snow
            accumulatedChanges['surface']['ice'] += precipitationAmount;
            totalSnowfall += precipitationAmount;
          }
    
          accumulatedChanges['atmospheric']['atmosphericWater'] -= precipitationAmount;
        }
     }

      // Save rainfall and snowfall rates
      this.water.rainfallRate = totalRainfall / deltaTime;
      this.water.snowfallRate = totalSnowfall / deltaTime;
    }

    applyMeltingAndFreezing(accumulatedChanges, deltaTime) {
      const timeMultiplier = 86400 * (deltaTime / 1000);
      const surfaceArea = 4 * Math.PI * Math.pow(this.celestialParameters.radius * 1000, 2);
    
      const tropicalPercentage = getZonePercentage('tropical');
      const temperatePercentage = getZonePercentage('temperate');
      const polarPercentage = getZonePercentage('polar');
    
      const tropicalTemperature = this.temperature.zones.tropical.value;
      const temperateTemperature = this.temperature.zones.temperate.value;
      const polarTemperature = this.temperature.zones.polar.value;
    
      const freezingPoint = 273.15;
    
      const waterCoverage = this.water.value;
      const iceCoverage = this.water.iceValue;

      const meltingRateMultiplier = 0.0001; // Adjust this value to control the melting rate
      const freezingRateMultiplier = 0.0001; // Adjust this value to control the freezing rate
    
      let meltingRate = 0;
      let freezingRate = 0;
    
      if (tropicalTemperature < freezingPoint && temperateTemperature < freezingPoint && polarTemperature < freezingPoint) {
        // All zones below freezing point, freeze water based on the freezing rate multiplier
        const temperatureDifference = freezingPoint - polarTemperature;
        const waterToFreeze = waterCoverage * freezingRateMultiplier * temperatureDifference * timeMultiplier / 1000;
        freezingRate = waterToFreeze / deltaTime;
        accumulatedChanges['surface']['liquidWater'] -= waterToFreeze * surfaceArea;
        accumulatedChanges['surface']['ice'] += waterToFreeze * surfaceArea;
      } else if (tropicalTemperature >= freezingPoint && temperateTemperature >= freezingPoint && polarTemperature >= freezingPoint) {
        // All zones above freezing point, melt ice based on the melting rate multiplier
        const temperatureDifference = tropicalTemperature - freezingPoint;
        const iceToMelt = iceCoverage * meltingRateMultiplier * temperatureDifference * timeMultiplier / 1000;
        meltingRate = iceToMelt / deltaTime;
        accumulatedChanges['surface']['ice'] -= iceToMelt * surfaceArea;
        accumulatedChanges['surface']['liquidWater'] += iceToMelt * surfaceArea;
      } else if (tropicalTemperature >= freezingPoint && polarTemperature < freezingPoint) {
        // Tropical zone above freezing point, temperate or polar below freezing point
        const targetIceCoverage = Math.min(iceCoverage, polarPercentage);
        const targetWaterCoverage = Math.min(waterCoverage, tropicalPercentage);
    
        const meltingTemperatureDifference = tropicalTemperature - freezingPoint;
        const freezingTemperatureDifference = freezingPoint - polarTemperature;
    
        const iceToMelt = (iceCoverage - targetIceCoverage) * meltingRateMultiplier * meltingTemperatureDifference * timeMultiplier / 1000;
        const waterToFreeze = (waterCoverage - targetWaterCoverage) * freezingRateMultiplier * freezingTemperatureDifference * timeMultiplier / 1000;
    
        meltingRate = iceToMelt / deltaTime;
        freezingRate = waterToFreeze / deltaTime;
    
        accumulatedChanges['surface']['ice'] -= iceToMelt * surfaceArea;
        accumulatedChanges['surface']['liquidWater'] += iceToMelt * surfaceArea;
        accumulatedChanges['surface']['liquidWater'] -= waterToFreeze * surfaceArea;
        accumulatedChanges['surface']['ice'] += waterToFreeze * surfaceArea;
      }
    
      this.water.meltingRate = meltingRate * surfaceArea;
      this.water.freezingRate = freezingRate * surfaceArea;
    }

    condenseCO2(accumulatedChanges, deltaTime){
      const timeMultiplier = 86400 * (deltaTime / 1000);
      const surfaceArea = 4 * Math.PI * Math.pow(this.celestialParameters.radius * 1000, 2);
      const polarCoverage = getZonePercentage('polar');
      const condensationTemperature = 170;
      const condensationParameter = 1.77e-7;
      const co2GasPressure = calculateGasPressure('carbonDioxide');

      const polarTemperature = this.temperature.zones.polar.value;

      if(polarTemperature < condensationTemperature){
        const tempDifference = condensationTemperature - polarTemperature;
        const co2change = condensationParameter * tempDifference * surfaceArea * polarCoverage * timeMultiplier * co2GasPressure / 1000;
        // Apply condensation of CO2
        accumulatedChanges['surface']['dryIce'] += co2change;
        accumulatedChanges['atmospheric']['carbonDioxide'] -= co2change;
      }

    }

    // Mirror Effect Calculation
    calculateMirrorEffect() {
      // Solar flux hitting the mirror (same as base flux at mirror's position)
      const solarFluxAtMirror = calculateSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
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

    calculateModifiedSolarFlux(distanceFromSunInMeters){
      const baseFlux = calculateSolarFlux(distanceFromSunInMeters);
      const mirrorFlux = this.calculateMirrorEffect().powerPerUnitArea;

      return baseFlux + mirrorFlux;
    }
  }

  function calculateGasPressure(gas) {
    const mass = terraforming.resources.atmospheric[gas].value;
    const gravity = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
  
    return calculateAtmosphericPressure(mass, gravity, radius);
  }

  function calculateAtmosphericPressure(mass, gravity, radius) {
    // Check for valid input values
    if (mass < 0) {
        throw new Error("Mass must be a positive number.");
    }
    if (gravity <= 0) {
        throw new Error("Gravity must be a positive number.");
    }
    if (radius <= 0) {
        throw new Error("Radius must be a positive number.");
    }

    // Calculate the surface area of the planet (A = 4 * π * R^2)
    const surfaceArea = 4 * Math.PI * Math.pow(radius*1e3, 2);

    // Calculate the atmospheric pressure (P = (m * g) / A)
    const pressure = (1e3*mass * gravity) / surfaceArea;

    // Return the pressure in Pascals (Pa)
    return pressure;
}

function calculateEmissivity(radius, inertMass, co2WaterMass, greenhouseGasMass){
  const absorptionCoefficient = 0.0013; // Mean infrared absorption coefficient (m²/kg)
  const inertFactor = 0.1;
  const ghgFactor = 23500;

  // Calculate the planet's surface area (A)
  const surfaceArea = 4 * Math.PI * Math.pow(radius, 2); // m²

  // Calculate the column mass of greenhouse gases (m)
  const inertColumnMass = inertMass / surfaceArea;
  const co2WaterColumnMass = co2WaterMass / surfaceArea;
  const ghgColumnMass = greenhouseGasMass / surfaceArea; // kg/m²

  // Calculate the atmospheric emissivity (epsilon)
  const emissivity = 1 - Math.exp(-absorptionCoefficient*(co2WaterColumnMass + ghgFactor*ghgColumnMass + inertFactor*inertColumnMass));

  return emissivity;
}

function calculateSolarFlux(distanceFromSun){
  return solarLuminosity / (4*Math.PI * Math.pow(distanceFromSun, 2)); // W/m²
}

function calculateEffectiveTemperatureNoAtm(modifiedSolarFlux, albedo, zoneRatio){
  // Constants
  const stefanBoltzmann = 5.670374419e-8; // Stefan-Boltzmann constant (W·m⁻²·K⁻⁴)

  // Calculate the effective temperature without atmosphere (Teff)
  const effectiveTempNoAtmosphere = Math.pow(
    (zoneRatio*modifiedSolarFlux * (1 - albedo)) / (stefanBoltzmann),
    0.25
  );
  
  return effectiveTempNoAtmosphere;
}

function calculateEffectiveTemperature(
  modifiedSolarFlux,
  albedo,
  emissivity,
  zoneRatio
) {
  const effectiveTempNoAtmosphere = calculateEffectiveTemperatureNoAtm(modifiedSolarFlux, albedo, zoneRatio);

  // Calculate the surface temperature with greenhouse effect (Tsurface)
  const multiplier = Math.pow(1 / (1 - emissivity / 2), 0.25);
  const surfaceTemperature = effectiveTempNoAtmosphere * multiplier;

  return surfaceTemperature
}

// Function to calculate air density (rho_a)
function airDensity(atmPressure, T) {
    // atmPressure: Atmospheric pressure in Pa
    // T: Temperature in Kelvin (K)
    return atmPressure / (R_AIR * T); // kg/m³
}