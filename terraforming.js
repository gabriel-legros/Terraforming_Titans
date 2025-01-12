let solarLuminosity = 3.828e26; // Solar luminosity (W)
const R_AIR = 287; // J/kg·K (specific gas constant for dry air)
const C_P_AIR = 1004; // J/kg·K
const EPSILON = 0.622; // Molecular weight ratio
const AU_METER = 149597870700;

const SOLAR_PANEL_BASE_LUMINOSITY = 1000;
const BASE_COMFORTABLE_TEMPERATURE = 295.15;

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

    this.completed = false;

    this.water = {
      name: 'Water',
      value: 0,
      iceValue: 0,
      target: 0.2,
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
      totalDelta : 0,
      gases : {}
    };
    this.temperature = {
      name: 'Temperature',
      value: 0,
      targetMin: 278.15, // 15°C in Kelvin,
      targetMax: 293.15,
      effectiveTempNoAtmosphere: 0,
      emissivity: 0,
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
    this.life = {
      name: 'Life',
      unlocked: false,
      target : 0.50,
      biomassCoverage : 0,
      dryIceCoverage: 0
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
    for(const gas in terraformingGasTargets){
      const gasPressure = calculateGasPressure(gas);
      if(gasPressure < terraformingGasTargets[gas].min || gasPressure > terraformingGasTargets[gas].max){
        return false;
      }
    }
    return true;
  }

  getWaterStatus() {
    return (this.water.value > this.water.target);
  }

  getLuminosityStatus() {
    return ((this.luminosity.modifiedSolarFlux > this.luminosity.targetMin) && (this.luminosity.modifiedSolarFlux < this.luminosity.targetMax));
  }

  getLifeStatus() {
    return (this.life.biomassCoverage > this.life.target);
  }

  getTerraformingStatus() {
    return (this.getTemperatureStatus() && this.getAtmosphereStatus() && this.getWaterStatus() && this.getLuminosityStatus() && this.getLifeStatus() && this.getMagnetosphereStatus());
  }

  calculateInitialValues(){
    for (const zone in this.temperature.zones) {
      this.temperature.zones[zone].initial = this.temperature.zones[zone].value;
    }

    for (const gas in terraforming.resources.atmospheric) {
      this.atmosphere.gases[gas] = {initial : calculateGasPressure(gas)};
    }
  }

    updateResources(accumulatedChanges, deltaTime){
      this.applyEvaporationAndSublimation(accumulatedChanges, deltaTime);
      this.applyRainfallAndSnow(accumulatedChanges, deltaTime);
      this.applyMeltingAndFreezing(accumulatedChanges, deltaTime);

      this.condenseCO2(accumulatedChanges, deltaTime);
    }

    // Function to update luminosity properties
    updateLuminosity() {
      this.luminosity.albedo = this.calculateEffectiveAlbedo();
      this.luminosity.solarFlux = this.calculateSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
      this.luminosity.modifiedSolarFlux = this.calculateModifiedSolarFlux(this.celestialParameters.distanceFromSun * AU_METER);
    }

    updateSurfaceTemperature() {
      const albedo = this.luminosity.albedo;
      const modifiedSolarFlux = this.luminosity.modifiedSolarFlux;
      const radiusInMeters = this.celestialParameters.radius * 1000; // 

      let co2WaterMass = 0;
      let greenhouseGasMass = 0;
      let inertMass = 0;
      let totalMass = 0;
  
      for (const gas in this.resources.atmospheric) {
        if (gas === 'carbonDioxide' || gas === 'atmosphericWater') {
          co2WaterMass += 1e3*this.resources.atmospheric[gas].value;
        } else if(gas === 'greenhouseGas') {
          greenhouseGasMass += 1e3*this.resources.atmospheric[gas].value;
        } else {
          inertMass += 1e3*this.resources.atmospheric[gas].value;
        }
      }
      totalMass = co2WaterMass + greenhouseGasMass + inertMass;

      const emissivity = calculateEmissivity(radiusInMeters, inertMass, co2WaterMass, greenhouseGasMass);

      this.temperature.emissivity = emissivity;
      this.temperature.effectiveTempNoAtmosphere = calculateEffectiveTemperatureNoAtm(modifiedSolarFlux, albedo, 0.25);
      this.temperature.value = calculateEffectiveTemperature(modifiedSolarFlux, albedo, emissivity, 0.25);

      for (const zone in this.temperature.zones) {
        this.temperature.zones[zone].value = calculateEffectiveTemperature(modifiedSolarFlux, albedo, emissivity, getZoneRatio(zone));
        const variation = calculateDayNightTemperatureVariation(this.temperature.zones[zone].value, totalMass / this.celestialParameters.surfaceArea);
        this.temperature.zones[zone].day = this.temperature.zones[zone].value + variation / 2;
        this.temperature.zones[zone].night = this.temperature.zones[zone].value - variation / 2;
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
      //First update luminosity
      this.updateLuminosity();

      // Update temperature based on the new calculateSurfaceTemperature function
      this.updateSurfaceTemperature();
  
      // Update atmospheric pressure
      this.atmosphere.value = this.calculateTotalPressure();
  
      // Update water level
      this.calculateCoverage('liquidWater');
      this.calculateCoverage('ice');
      this.calculateCoverage('dryIce');
      this.calculateCoverage('biomass');

      this.applyTerraformingEffects();
    }
  
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
        }
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
      if(resourceType === 'biomass'){
        resourceRatio = 1000 * resourceRatio;
      }
    
      let coverage;
    
      if (resourceRatio <= 0.001) {
        coverage = 10 * resourceRatio;
        coverage = Math.max(coverage, 0.00001);
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
      } else if (resourceType === 'biomass') {
        this.life.biomassCoverage = coverage;
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
        this.luminosity.modifiedSolarFlux,   // solarFlux: Incoming solar radiation (W/m²)
        this.atmosphere.value,        // atmPressure: Atmospheric pressure (Pa)
        waterGasPressure,    // e_a: Actual vapor pressure of water in the atmosphere (Pa)
        100                            // r_a: Aerodynamic resistance (s/m); adjust based on wind conditions
    ); // kg/m²/s
    
      // Calculate Sublimation Rate for Water Ice
      const sublRate = sublimationRateWater(
          this.temperature.value,       // T: Temperature in Kelvin (K)
          this.luminosity.modifiedSolarFlux,   // solarFlux: Incoming solar radiation (W/m²)
          this.atmosphere.value,        // atmPressure: Atmospheric pressure (Pa)
          waterGasPressure,    // e_a: Actual vapor pressure of water in the atmosphere (Pa)
          100                            // r_a: Aerodynamic resistance (s/m); adjust based on wind conditions
      ); // kg/m²/s

      const sublRateCO2 = sublimationRateCO2(
          this.temperature.value,
          this.luminosity.modifiedSolarFlux,
          this.atmosphere.value,
          co2GasPressure,
          100
      )

      const surfaceArea = 4 * Math.PI * Math.pow(this.celestialParameters.radius * 1000, 2);
      const waterSurface = surfaceArea*this.water.value;
      const iceSurface = surfaceArea*this.water.iceValue;
      const dryIceSurface = surfaceArea*this.life.dryIceCoverage;

      const evaporationAmount = Math.min(evpRate * waterSurface * timeMultiplier / 1000, resources['surface']['liquidWater'].value); //Divide by 1000 to go from kg to tons
      const sublimationAmount = Math.min(sublRate * iceSurface * timeMultiplier / 1000, resources['surface']['ice'].value);
      const sublimationCo2Amount = Math.min(sublRateCO2 * dryIceSurface * timeMultiplier / 1000, resources['surface']['dryIce'].value);

      // Save evaporation and sublimation rates
      this.water.evaporationRate = evaporationAmount * (1000 / deltaTime);
      this.water.sublimationRate = sublimationAmount * (1000 / deltaTime);
      this.life.co2sublimationRate = sublimationCo2Amount * (1000 / deltaTime);

      // Apply evaporation
      accumulatedChanges['surface']['liquidWater'] -= evaporationAmount;
      resources['surface']['liquidWater'].modifyRate(- (evaporationAmount * (1000 / deltaTime)), 'Evaporation');
      accumulatedChanges['atmospheric']['atmosphericWater'] += evaporationAmount;
      resources['atmospheric']['atmosphericWater'].modifyRate(evaporationAmount * (1000 / deltaTime), 'Evaporation');

      // Apply sublimation
      accumulatedChanges['surface']['ice'] -= sublimationAmount;
      resources['surface']['ice'].modifyRate(- sublimationAmount * (1000 / deltaTime), 'Sublimation');
      accumulatedChanges['atmospheric']['atmosphericWater'] += sublimationAmount;
      resources['atmospheric']['atmosphericWater'].modifyRate(sublimationAmount * (1000 / deltaTime), 'Sublimation');

      // Apply sublimation of CO2
      accumulatedChanges['surface']['dryIce'] -= sublimationCo2Amount;
      resources['surface']['dryIce'].modifyRate(- sublimationCo2Amount * (1000 / deltaTime), 'Sublimation');
      accumulatedChanges['atmospheric']['carbonDioxide'] += sublimationCo2Amount;
      resources['atmospheric']['carbonDioxide'].modifyRate(sublimationCo2Amount * (1000 / deltaTime), 'Sublimation');
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
            resources['surface']['liquidWater'].modifyRate(precipitationAmount * (1000 / deltaTime), 'Rain');
            totalRainfall += precipitationAmount;
          } else {
            // Snow
            accumulatedChanges['surface']['ice'] += precipitationAmount;
            resources['surface']['ice'].modifyRate(precipitationAmount * (1000 / deltaTime), 'Condensation');
            totalSnowfall += precipitationAmount;
          }
    
          accumulatedChanges['atmospheric']['atmosphericWater'] -= precipitationAmount;
          resources['atmospheric']['atmosphericWater'].modifyRate(-precipitationAmount * (1000 / deltaTime), 'Rain or Snow');
        }
     }

      // Save rainfall and snowfall rates
      this.water.rainfallRate = totalRainfall  * (1000 / deltaTime);
      this.water.snowfallRate = totalSnowfall  * (1000 / deltaTime);
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
        const waterToFreeze = Math.min(waterCoverage * freezingRateMultiplier * temperatureDifference * timeMultiplier / 1000, resources['surface']['liquidWater'].value);
        freezingRate = waterToFreeze / deltaTime;
        accumulatedChanges['surface']['liquidWater'] -= waterToFreeze * surfaceArea;
        resources['surface']['liquidWater'].modifyRate(- waterToFreeze * (1000 / deltaTime), 'Freezing');
        accumulatedChanges['surface']['ice'] += waterToFreeze * surfaceArea;
        resources['surface']['ice'].modifyRate(waterToFreeze * (1000 / deltaTime), 'Freezing');
      } else if (tropicalTemperature >= freezingPoint && temperateTemperature >= freezingPoint && polarTemperature >= freezingPoint) {
        // All zones above freezing point, melt ice based on the melting rate multiplier
        const temperatureDifference = tropicalTemperature - freezingPoint;
        const iceToMelt = Math.min(iceCoverage * meltingRateMultiplier * temperatureDifference * timeMultiplier / 1000, resources['surface']['ice']);
        meltingRate = iceToMelt / deltaTime;
        accumulatedChanges['surface']['ice'] -= iceToMelt * surfaceArea;
        resources['surface']['ice'].modifyRate(-iceToMelt * (1000 / deltaTime), 'Melting');
        accumulatedChanges['surface']['liquidWater'] += iceToMelt * surfaceArea;
        resources['surface']['liquidWater'].modifyRate(iceToMelt * (1000 / deltaTime), 'Melting');
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
    
        accumulatedChanges['surface']['liquidWater'] -= waterToFreeze * surfaceArea;
        resources['surface']['liquidWater'].modifyRate(- waterToFreeze * (1000 / deltaTime), 'Freezing');
        accumulatedChanges['surface']['ice'] += waterToFreeze * surfaceArea;
        resources['surface']['ice'].modifyRate(waterToFreeze * (1000 / deltaTime), 'Freezing');
        accumulatedChanges['surface']['ice'] -= iceToMelt * surfaceArea;
        resources['surface']['ice'].modifyRate(-iceToMelt * (1000 / deltaTime), 'Melting');
        accumulatedChanges['surface']['liquidWater'] += iceToMelt * surfaceArea;
        resources['surface']['liquidWater'].modifyRate(iceToMelt * (1000 / deltaTime), 'Melting');
      }
    
      this.water.meltingRate = meltingRate * surfaceArea  * (1000 / deltaTime);
      this.water.freezingRate = freezingRate * surfaceArea  * (1000 / deltaTime);
    }

    condenseCO2(accumulatedChanges, deltaTime){
      const timeMultiplier = 86400 * (deltaTime / 1000);
      const surfaceArea = 4 * Math.PI * Math.pow(this.celestialParameters.radius * 1000, 2);
      const polarCoverage = getZonePercentage('polar');
      const condensationTemperature = 170;
      const condensationParameter = 1.7699e-7;
      const co2GasPressure = calculateGasPressure('carbonDioxide');

      const polarTemperature = this.temperature.zones.polar.value;

      if(polarTemperature < condensationTemperature){
        const tempDifference = condensationTemperature - polarTemperature;
        const co2change = condensationParameter * tempDifference * surfaceArea * polarCoverage * timeMultiplier * co2GasPressure / 1000;
        // Apply condensation of CO2
        accumulatedChanges['surface']['dryIce'] += co2change;
        resources['surface']['dryIce'].modifyRate(co2change * (1000 / deltaTime), 'Deposition');
        accumulatedChanges['atmospheric']['carbonDioxide'] -= co2change;
        resources['atmospheric']['carbonDioxide'].modifyRate(-co2change * (1000 / deltaTime), 'Deposition');
      }

    }

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

    calculateTotalPressureDelta() {
      this.totalDelta = 0;
  
      for (const gas in terraforming.resources.atmospheric) {
          const currentPressure = calculateGasPressure(gas);
          const initialPressure = this.atmosphere.gases[gas]?.initial || 0;
          this.totalDelta += Math.abs(currentPressure - initialPressure);
      }

      return this.totalDelta;
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
    }

  saveState(){
    return {
      initialValuesCalculated: this.initialValuesCalculated,
      temperature: this.temperature,
      atmosphere: this.atmosphere,
      completed: this.completed
      };    
  }

  loadState(terraformingState){
    this.initialValuesCalculated = terraformingState.initialValuesCalculated;
    this.temperature.zones.tropical.initial = terraformingState.temperature.zones.tropical.initial;
    this.temperature.zones.temperate.initial = terraformingState.temperature.zones.temperate.initial;
    this.temperature.zones.polar.initial = terraformingState.temperature.zones.polar.initial;
    this.atmosphere = terraformingState.atmosphere;
    this.completed = terraformingState.completed || false;
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

function calculateDayNightTemperatureVariation(temperature, columnMass){
  if(columnMass < 1){
    return temperature/0.75;
  } else {
    return temperature/(0.75 + 0.255*Math.pow(Math.log10(columnMass), 2.91));
  }
}