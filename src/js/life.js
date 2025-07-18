const baseTemperatureRanges = {
  survival: {
    min: 273.15, // 0°C in Kelvin
    max: 313.15  // 50°C in Kelvin
  }
};

// Default optimal growth temperature (20°C in Kelvin)
const BASE_OPTIMAL_GROWTH_TEMPERATURE = 293.15;

const lifeDesignerConfig = {
  maxPoints : 0
}

const BASE_MAX_BIOMASS_DENSITY = 0.1; // Base max biomass in tons per m^2
const RADIATION_TOLERANCE_THRESHOLD = 25; // Points needed for full mitigation
const MINIMUM_BIOMASS_DECAY_RATE = 1; // Minimum decay in tons per second when conditions are lethal

class LifeAttribute {
  constructor(name, value, displayName, description, maxUpgrades) {
    this.name = name;
    this.displayName = displayName;
    this.value = value;
    this.description = description;
    this.maxUpgrades = maxUpgrades;
  }

  getConvertedValue() {
    switch (this.name) {
      case 'minTemperatureTolerance':
        return (baseTemperatureRanges.survival.min - this.value).toFixed(2) + 'K';
      case 'maxTemperatureTolerance':
        return (baseTemperatureRanges.survival.max + this.value).toFixed(2) + 'K';
      case 'optimalGrowthTemperature':
        return (
          BASE_OPTIMAL_GROWTH_TEMPERATURE + this.value
        ).toFixed(2) + 'K';
      case 'growthTemperatureTolerance':
        return (this.value * 0.5).toFixed(2) + 'K';
      case 'photosynthesisEfficiency':
        return (0.00008*this.value).toFixed(5); // Adjust as needed
      case 'radiationTolerance':
        return this.value * 4 + '%';
      case 'toxicityTolerance':
        return this.value * 10 + '%';
      case 'invasiveness':
        return this.value;
      case 'spaceEfficiency':
        // Calculate and display the actual max density
        const densityMultiplier = 1 + this.value; // Each point adds 100% of base density
        const maxDensity = BASE_MAX_BIOMASS_DENSITY * densityMultiplier;
        return formatNumber(maxDensity, false, 1) + ' tons/m²'; // Display calculated density with 1 decimal place
      case 'geologicalBurial':
        // Calculate rate: starts at 0, adds 0.0001 per point, max 0.001 at 10 points
        const burialRate = this.value * 0.0001;
        return burialRate.toFixed(4); // Display rate with 4 decimal places
      default:
        return null;
    }
  }
}

class LifeDesign {
  constructor(minTemperatureTolerance,
    maxTemperatureTolerance,
    photosynthesisEfficiency,
    radiationTolerance,
    toxicityTolerance,
    invasiveness,
    spaceEfficiency, // Added new attribute
    geologicalBurial, // Added Geological Burial
    growthTemperatureTolerance = 0
  ) {
    this.minTemperatureTolerance = new LifeAttribute('minTemperatureTolerance', minTemperatureTolerance, 'Minimum Temperature Tolerance', 'Lowest survivable temperature (day or night).', 50);
    this.maxTemperatureTolerance = new LifeAttribute('maxTemperatureTolerance', maxTemperatureTolerance, 'Maximum Temperature Tolerance', 'Highest survivable temperature (day or night).', 40);
    this.optimalGrowthTemperature = new LifeAttribute(
      'optimalGrowthTemperature',
      0,
      'Optimal Growth Temperature',
      'Daytime temperature for peak growth. Costs 1 point per degree from the 20\xB0C base.',
      15
    );
    this.growthTemperatureTolerance = new LifeAttribute('growthTemperatureTolerance', growthTemperatureTolerance, 'Growth Temperature Tolerance', 'Controls how quickly growth falls off from the optimal temperature.', 40);
    this.photosynthesisEfficiency = new LifeAttribute('photosynthesisEfficiency', photosynthesisEfficiency, 'Photosynthesis Efficiency', 'Efficiency of converting light to energy; affects growth rate.', 500);
    this.radiationTolerance = new LifeAttribute('radiationTolerance', radiationTolerance, 'Radiation Tolerance', 'Resistance to radiation; vital without a magnetosphere.', 25);
    this.toxicityTolerance = new LifeAttribute('toxicityTolerance', toxicityTolerance, 'Toxicity Tolerance', 'Resistance to environmental toxins.', 10);
    this.invasiveness = new LifeAttribute('invasiveness', invasiveness, 'Invasiveness', 'Speed of spreading/replacing existing life; reduces deployment time.', 50);
    this.spaceEfficiency = new LifeAttribute('spaceEfficiency', spaceEfficiency, 'Space Efficiency', 'Increases maximum biomass density per unit area.', 100);
    this.geologicalBurial = new LifeAttribute('geologicalBurial', geologicalBurial, 'Geological Burial', 'Removes existing biomass into inert storage.', 50);
   }

  getDesignCost() {
    return Object.values(this).reduce((sum, attribute) => {
      if (attribute instanceof LifeAttribute) {
        if (attribute.name === 'optimalGrowthTemperature') {
          return sum + Math.abs(attribute.value);
        }
        return sum + attribute.value;
      }
      return sum;
    }, 0);
  }

  // getMoistureType() method removed.

  getBaseGrowthRate() {
    return this.photosynthesisEfficiency.getConvertedValue();
  }

  getRadiationMitigationRatio() {
    // Use constant for scaling denominator
    return this.radiationTolerance.value / RADIATION_TOLERANCE_THRESHOLD;
  }

  // Method to copy attributes from another LifeDesign
  copyFrom(otherDesign) {
    for (const key in otherDesign) {
      if (otherDesign[key] instanceof LifeAttribute) {
        this[key] = new LifeAttribute(
          otherDesign[key].name,
          otherDesign[key].value,
          otherDesign[key].displayName,
          otherDesign[key].description,
          otherDesign[key].maxUpgrades
        );
      }
    }
  }

  save() {
    const data = {
      minTemperatureTolerance: this.minTemperatureTolerance.value,
      maxTemperatureTolerance: this.maxTemperatureTolerance.value,
      optimalGrowthTemperature: this.optimalGrowthTemperature.value,
      growthTemperatureTolerance: this.growthTemperatureTolerance.value,
      photosynthesisEfficiency: this.photosynthesisEfficiency.value,
      radiationTolerance: this.radiationTolerance.value,
      toxicityTolerance: this.toxicityTolerance.value,
      invasiveness: this.invasiveness.value,
      spaceEfficiency: this.spaceEfficiency.value, // Added for saving
      geologicalBurial: this.geologicalBurial.value // Added Geological Burial
    };
    return data;
  }

  static load(data) {
    const design = new LifeDesign(
      data.minTemperatureTolerance,
      data.maxTemperatureTolerance,
      data.photosynthesisEfficiency,
      data.radiationTolerance,
      data.toxicityTolerance,
      data.invasiveness,
      data.spaceEfficiency ?? 0, // Added for loading, default to 0 if missing in save
      data.geologicalBurial ?? 0, // Added Geological Burial, default 0
      data.growthTemperatureTolerance ?? 0
    );

    design.optimalGrowthTemperature.value = data.optimalGrowthTemperature ?? 0;
    return design;
  }

  // Checks survival temperature for a specific zone and returns details
  temperatureSurvivalCheckZone(zoneName) {
      const temperatureRanges = this.getTemperatureRanges().survival;
      const zoneData = terraforming.temperature.zones[zoneName];
      let reason = null;

      if (zoneData.day < temperatureRanges.min) reason = `Day too cold (${formatNumber(zoneData.day,false,1)}K < ${formatNumber(temperatureRanges.min,false,1)}K)`;
      else if (zoneData.day > temperatureRanges.max) reason = `Day too hot (${formatNumber(zoneData.day,false,1)}K > ${formatNumber(temperatureRanges.max,false,1)}K)`;
      else if (zoneData.night < temperatureRanges.min) reason = `Night too cold (${formatNumber(zoneData.night,false,1)}K < ${formatNumber(temperatureRanges.min,false,1)}K)`;
      else if (zoneData.night > temperatureRanges.max) reason = `Night too hot (${formatNumber(zoneData.night,false,1)}K > ${formatNumber(temperatureRanges.max,false,1)}K)`;

      return { pass: reason === null, reason: reason };
  }

  // Returns an object indicating survival status for all zones
  temperatureSurvivalCheck() {
      const results = {};
      // Global pass requires ANY zone to pass
      let globalPass = false;
      for (const zoneName of ['tropical', 'temperate', 'polar']) {
          results[zoneName] = this.temperatureSurvivalCheckZone(zoneName);
          if (results[zoneName].pass) globalPass = true; // If any zone passes, global passes
      }
      results.global = { pass: globalPass, reason: globalPass ? null : "Fails in all zones" };
      return results;
  }

  // Checks toxicity tolerance (currently a simple global check)
  toxicityCheck() {
      // Placeholder - Add actual toxicity check logic if/when implemented
      const isToxic = false; // Assume not toxic for now
      const pass = !isToxic || this.toxicityTolerance.value >= 5; // Example threshold
      return { pass: pass, reason: pass ? null : "High toxicity" };
  }

  // Checks radiation tolerance against magnetosphere status
  radiationCheck() {
      const hasShield = terraforming.getMagnetosphereStatus();
      const toleranceValue = this.radiationTolerance.value;
      // Use constant for threshold check
      const pass = hasShield || toleranceValue >= RADIATION_TOLERANCE_THRESHOLD;
      let reason = null;
      let reductionPercent = 0;

      if (!pass && !hasShield) { // Only calculate reduction if no shield and check fails
          reason = "High radiation";
          // Use the actual mitigation ratio calculation (scale of 20)
          const mitigationRatio = this.getRadiationMitigationRatio(); // Uses toleranceValue / 20
          const growthMultiplier = 0.5 + 0.5 * mitigationRatio; // Growth multiplier is 0.5 to 1.0
          reductionPercent = (1 - growthMultiplier) * 100; // Reduction is 50% down to 0%
      }
      
      // Return reduction percentage along with pass/fail and reason
      return { pass: pass, reason: reason, reduction: reductionPercent };
  }

  // Checks if the lifeform can survive in at least one zone based on temperature
  // TODO: Incorporate global radiation/toxicity checks?
  canSurviveAnywhere() {
      const tempResults = this.temperatureSurvivalCheck();
      // Check if any zone passed the temperature check
      return tempResults.global.pass;
  }

  // Returns an array of zone names where the lifeform can actively grow (meets temp & moisture reqs)
  getGrowableZones() {
      const survivalTempResults = this.temperatureSurvivalCheck();
      const growableZones = [];

      for (const zoneName of ['tropical', 'temperate', 'polar']) {
          if (survivalTempResults[zoneName]?.pass && this.moistureCheckZone(zoneName).pass) {
              growableZones.push(zoneName);
          }
      }
      return growableZones;
  } // Correct closing brace for the getGrowableZones method

  // Checks if sufficient moisture (liquid only) is available for growth in a specific zone.
  moistureCheckZone(zoneName) {
      if (!terraforming || !terraforming.zonalWater) {
          console.error("Terraforming or resource data not available for moisture check in zone:", zoneName);
          return { pass: false, reason: "Data unavailable" };
      }

      const liquidWater = terraforming.zonalWater[zoneName]?.liquid || 0;
      if (liquidWater > 1e-9) {
          return { pass: true, reason: null };
      }

      return { pass: false, reason: "Need liquid water" };
  }

  // Returns an object indicating moisture status for all zones
  moistureCheckAllZones() {
      const results = {};
      // Global pass requires ANY zone to pass
      let globalPass = false;
      for (const zoneName of ['tropical', 'temperate', 'polar']) {
          results[zoneName] = this.moistureCheckZone(zoneName);
          if (results[zoneName].pass) globalPass = true; // If any zone passes, global passes
      }
      results.global = { pass: globalPass, reason: globalPass ? null : "Fails in all zones" };
      return results;
  }

  // Calculates growth temperature multiplier for a specific zone
  temperatureGrowthMultiplierZone(zoneName) {
      const zoneData = terraforming.temperature.zones[zoneName];
      const optimal = BASE_OPTIMAL_GROWTH_TEMPERATURE + this.optimalGrowthTemperature.value;
      const tolerance = this.growthTemperatureTolerance.value * 0.5;
      if (tolerance <= 0) {
          return zoneData.day === optimal ? 1 : 0;
      }
      const diff = zoneData.day - optimal;
      return Math.exp(-(diff * diff) / (2 * tolerance * tolerance));
  }

  // Returns an object with temperature growth multiplier for all zones
  temperatureGrowthCheck() {
      const results = {};
      let globalMultiplier = 0;
      for (const zoneName of ['tropical', 'temperate', 'polar']) {
          const mult = this.temperatureGrowthMultiplierZone(zoneName);
          results[zoneName] = { pass: true, reason: null, multiplier: mult };
          if (mult > globalMultiplier) globalMultiplier = mult;
      }
      results.global = { pass: true, reason: null, multiplier: globalMultiplier };
      return results;
  }

  getTemperatureRanges() {
    const survivalRange = {
      min: baseTemperatureRanges.survival.min - this.minTemperatureTolerance.value,
      max: baseTemperatureRanges.survival.max + this.maxTemperatureTolerance.value
    };
  
    return {
      survival: survivalRange
    };
  }
}

class LifeDesigner extends EffectableEntity {
  constructor() {
    super({ description: 'Life Designer' });
    this.baseApplyDuration = 30000;
    this.currentDesign = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0); // Added spaceEfficiency and geologicalBurial default
    this.tentativeDesign = null;

    this.baseMaxPoints = lifeDesignerConfig.maxPoints;
    this.designPointBonus = 0;

    this.isActive = false;
    this.remainingTime = this.getTentativeDuration();
    this.totalTime = this.getTentativeDuration();
    this.elapsedTime = 0;

    this.basePointCost = 100;
    this.pointCostMultiplier = 2;

    this.purchaseCounts = {
      research: 0,
      funding: 0,
      androids: 0,
      components: 0,
      electronics: 0
    };

    this.enabled = false;
  }

  replaceEffect(effect) {
    const existingEffectIndex = this.activeEffects.findIndex(
      (activeEffect) => activeEffect.effectId === effect.effectId
    );
    if (existingEffectIndex !== -1) {
      this.activeEffects[existingEffectIndex] = effect;
      this.applyActiveEffects(false);
    } else {
      super.replaceEffect(effect);
    }
  }

  enable(){
    this.enabled = true;
  }

  applyActiveEffects(firstTime = true){
    this.designPointBonus = 0;
    super.applyActiveEffects(firstTime);
  }

  applyLifeDesignPointBonus(effect){
    this.designPointBonus += effect.value;
  }

  createNewDesign(
    minTemperatureTolerance,
    maxTemperatureTolerance,
    photosynthesisEfficiency,
    radiationTolerance,
    toxicityTolerance,
    invasiveness,
    geologicalBurial,
    growthTemperatureTolerance = 0
  ) {
    this.tentativeDesign = new LifeDesign(
      minTemperatureTolerance,
      maxTemperatureTolerance,
      photosynthesisEfficiency,
      radiationTolerance,
      toxicityTolerance,
      invasiveness,
      0, // Default spaceEfficiency for new design
      geologicalBurial, // Pass geologicalBurial
      growthTemperatureTolerance
    );
  }

  replaceDesign(newDesign) {
    this.tentativeDesign = newDesign;
  }

  confirmDesign() {
    if (this.tentativeDesign) {
      this.isActive = true;
      this.remainingTime = this.getTentativeDuration();
      this.totalTime = this.getTentativeDuration();
      this.elapsedTime = 0;
    }
  }

  getProgress() {
    if (this.isActive) {
      const progress = (this.elapsedTime / this.totalTime) * 100;
      return Math.min(progress, 100);
    }
    return 0;
  }

  update(delta) {
    if (this.isActive) {
      this.elapsedTime += delta;
      this.remainingTime = Math.max(0, this.totalTime - this.elapsedTime);
      if (this.remainingTime === 0) {
        this.isActive = false;
        this.isCompleted = true;
        this.currentDesign = this.tentativeDesign;
        this.tentativeDesign = null;
      }
    }
  }

  cancelDeployment() {
    if (this.isActive) {
      this.isActive = false;
      this.remainingTime = this.getTentativeDuration();
      this.totalTime = this.getTentativeDuration();
      this.elapsedTime = 0;
    }
  }

  discardTentativeDesign() {
    this.tentativeDesign = null;
  }

  getTentativeDuration() {
    if(this.tentativeDesign){
        return this.baseApplyDuration * (Math.log10(Math.max(resources.surface.biomass.value,1)) + 1) / (this.tentativeDesign.invasiveness.value + 1);
    } else {
      return this.baseApplyDuration * (Math.log10(Math.max(resources.surface.biomass.value,1)) + 1);
    }
  }

  getPointCost(category){
    return this.basePointCost * Math.pow(this.pointCostMultiplier, this.purchaseCounts[category]);
  }

  canAfford(category) {
    const numPurchases = this.purchaseCounts[category];
    const cost = this.basePointCost * Math.pow(this.pointCostMultiplier, numPurchases);

    return resources.colony[category].value >= cost;
  }

  buyPoint(category) {
    if (this.canAfford(category)) {
      const numPurchases = this.purchaseCounts[category];
      const cost = this.basePointCost * Math.pow(this.pointCostMultiplier, numPurchases);

      resources.colony[category].decrease(cost);
      this.purchaseCounts[category]++;
    }
  }

  maxLifeDesignPoints() {
    const totalPurchases = Object.values(this.purchaseCounts)
      .reduce((acc, val) => acc + val, 0);
    return this.baseMaxPoints + this.designPointBonus + totalPurchases;
  }

  saveState() {
    const data = {
      currentDesign: this.currentDesign.save(),
      tentativeDesign: this.tentativeDesign ? this.tentativeDesign.save() : null,
      isActive: this.isActive,
      remainingTime: this.remainingTime,
      totalTime: this.totalTime,
      elapsedTime: this.elapsedTime,
      purchaseCounts: { ...this.purchaseCounts },
      // spaceEfficiency and geologicalBurial are saved within currentDesign/tentativeDesign
    };
    return data;
  }

  loadState(data) {
    this.currentDesign = LifeDesign.load(data.currentDesign);
    if (data.tentativeDesign) {
      this.tentativeDesign = LifeDesign.load(data.tentativeDesign);
    }
    this.isActive = data.isActive;
    this.remainingTime = data.remainingTime;
    this.totalTime = data.totalTime;
    this.elapsedTime = data.elapsedTime;
    this.purchaseCounts = { ...data.purchaseCounts };
  }
}

function initializeLifeUI() {
  initializeLifeTerraformingDesignerUI();
}

class LifeManager extends EffectableEntity {
  constructor() {
    super({description : 'Life Manager'})
  }

  getEffectiveLifeGrowthMultiplier(){
    let multiplier = 1; // Start with default multiplier
    this.activeEffects.forEach(effect => {
      if (effect.type === 'lifeGrowthMultiplier') {
        multiplier *= effect.value;
      }
    });
    return multiplier;
  }

  // Method to update life growth/decay based on zonal environmental conditions
  // Now uses global atmospheric resources instead of zonal atmosphere
  updateLife(deltaTime) {
      const design = lifeDesigner.currentDesign;
      const baseGrowthRate = design.getBaseGrowthRate();
      const survivableTempZones = design.temperatureSurvivalCheck(); // Array of zone names
      const growableZones = design.getGrowableZones(); // Array of zone names where temp & moisture are OK

      // Define consumption/production ratios (mass-based)
      const waterRatio = 1;
      const co2Ratio = 2.44;
      const biomassRatio = 1.66612;
      const oxygenRatio = 1.77388;

      const secondsMultiplier = deltaTime / 1000;

      for (const zoneName of ['tropical', 'temperate', 'polar']) {
        let usedLiquidWater = false; // Declare here for broader scope
          const zonalBiomass = terraforming.zonalSurface[zoneName].biomass || 0;
          if (zonalBiomass <= 0) continue; // Skip if no biomass in this zone

          // Check the 'pass' property for the specific zone in the results object
          const canSurviveHere = survivableTempZones[zoneName]?.pass || false;
          const canGrowHere = growableZones.includes(zoneName);

          let zonalMaxGrowthRate = baseGrowthRate;
          // Apply radiation penalty if needed (assuming it's a global effect for now)
          if (!terraforming.getMagnetosphereStatus()) {
              zonalMaxGrowthRate *= (0.5 + 0.5 * design.getRadiationMitigationRatio());
          }
          // Apply luminosity bonus based on the zone
          zonalMaxGrowthRate *= terraforming.calculateZonalSolarPanelMultiplier(zoneName);
          // Apply global growth multiplier effects
          zonalMaxGrowthRate *= this.getEffectiveLifeGrowthMultiplier();


          let biomassChange = 0;
          let waterChange = 0;
          let co2Change = 0;
          let oxygenChange = 0;

          if (canGrowHere) {
              // --- Growth Calculation ---
              // Calculate land area and biomass capacity first
              const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentage(zoneName);
              const liquidWaterCoverage = terraforming.zonalCoverageCache[zoneName]?.liquidWater ?? 0;
              const iceCoverage = terraforming.zonalCoverageCache[zoneName]?.ice ?? 0;
              // const availableLandArea = Math.max(0, zoneArea * (1 - liquidWaterCoverage - iceCoverage)); // Land area calculation no longer used for biomass limit

              const spaceEfficiencyValue = design.spaceEfficiency.value;
              const baseMaxDensity = BASE_MAX_BIOMASS_DENSITY; // Use the constant
              const densityMultiplier = 1 + spaceEfficiencyValue; // Each point adds 100% of base density
              // Calculate max biomass based on TOTAL zone area, allowing growth over water/ice
              const maxBiomassForZone = zoneArea * baseMaxDensity * densityMultiplier;
              // Calculate logistic growth factor (approaches 0 as biomass nears capacity)
              const logisticFactor = maxBiomassForZone > 0 ? Math.max(0, 1 - zonalBiomass / maxBiomassForZone) : 0;
              const tempMultiplier = design.temperatureGrowthMultiplierZone(zoneName);
              // Calculate potential growth rate adjusted by logistic factor and temperature
              const actualGrowthRate = zonalMaxGrowthRate * logisticFactor * tempMultiplier;
              // Calculate potential biomass increase for the tick based on the adjusted rate
              const potentialBiomassIncrease = zonalBiomass * actualGrowthRate * secondsMultiplier;

              // --- Moisture Check and Growth Limitation ---
              const globalCO2 = resources.atmospheric['carbonDioxide']?.value || 0;
              const availableLiquidWater = terraforming.zonalWater[zoneName]?.liquid || 0;
              if (availableLiquidWater > 1e-9) {
                  usedLiquidWater = true;
                  const maxGrowthByLiquidWater = (availableLiquidWater / waterRatio) * biomassRatio;
                  const maxGrowthByCO2 = (globalCO2 / co2Ratio) * biomassRatio;
                  biomassChange = Math.min(potentialBiomassIncrease, maxGrowthByCO2, maxGrowthByLiquidWater);
                  waterChange = -(biomassChange / biomassRatio) * waterRatio;
              } else {
                  biomassChange = 0;
                  waterChange = 0;
              }

              // Calculate CO2 and O2 changes based on final biomassChange
              co2Change = -(biomassChange / biomassRatio) * co2Ratio;
              oxygenChange = (biomassChange / biomassRatio) * oxygenRatio;

              // Add modifyRate calls for Growth (using final biomassChange)
              if (secondsMultiplier > 0 && biomassChange > 1e-9) { // Only track rates if growth happened
                  const growthRateMultiplier = 1 / secondsMultiplier;
                  if (resources.atmospheric.carbonDioxide) resources.atmospheric.carbonDioxide.modifyRate(co2Change * growthRateMultiplier, 'Life Growth', 'life');
                  if (resources.atmospheric.oxygen) resources.atmospheric.oxygen.modifyRate(oxygenChange * growthRateMultiplier, 'Life Growth', 'life');
                  if (resources.surface.biomass) resources.surface.biomass.modifyRate(biomassChange * growthRateMultiplier, 'Life Growth', 'life');

                  // Update water rate when liquid water is consumed
                  if (usedLiquidWater) {
                      if (resources.surface.liquidWater) resources.surface.liquidWater.modifyRate(waterChange * growthRateMultiplier, 'Life Growth', 'life');
                  }
              }

          } else if (!canSurviveHere) {
              // --- Decay Calculation ---
              const decayFactor = 0.01; // Percentage decay rate
              const percentDecayAmount = zonalBiomass * decayFactor * secondsMultiplier;
              const minDecayAmount = MINIMUM_BIOMASS_DECAY_RATE * secondsMultiplier;
              
              // Target decay is the greater of the percentage or the minimum flat rate
              const targetDecayAmount = Math.max(percentDecayAmount, minDecayAmount);

              const globalOxygen = resources.atmospheric['oxygen']?.value || 0;
              const maxDecayByOxygen = (globalOxygen / oxygenRatio) * biomassRatio;

              const totalDecay = Math.min(targetDecayAmount, zonalBiomass);
              const oxygenDecay = Math.min(maxDecayByOxygen, totalDecay);
              const deletedBiomass = totalDecay - oxygenDecay;

              // Biomass removed from the zone (both decayed and deleted)
              biomassChange = -(oxygenDecay + deletedBiomass);

              // Resource changes only from the portion that had oxygen to decay
              waterChange = (oxygenDecay / biomassRatio) * waterRatio; // Decay RELEASES water
              co2Change = (oxygenDecay / biomassRatio) * co2Ratio;     // Decay RELEASES CO2
              oxygenChange = -(oxygenDecay / biomassRatio) * oxygenRatio; // Decay CONSUMES O2

              // Add modifyRate calls for Decay
              if (secondsMultiplier > 0 && biomassChange < -1e-9) { // Only track rates if decay happened
                  const decayRateMultiplier = 1 / secondsMultiplier;
                  if (resources.atmospheric.carbonDioxide) resources.atmospheric.carbonDioxide.modifyRate(co2Change * decayRateMultiplier, 'Life Decay', 'life');
                  if (resources.atmospheric.oxygen) resources.atmospheric.oxygen.modifyRate(oxygenChange * decayRateMultiplier, 'Life Decay', 'life');
                  // Decay always releases water back to the atmosphere (simplification)
                  if (resources.atmospheric.atmosphericWater) {
                      resources.atmospheric.atmosphericWater.modifyRate(waterChange * decayRateMultiplier, 'Life Decay', 'life');
                  }
                  if (resources.surface.biomass) resources.surface.biomass.modifyRate(biomassChange * decayRateMultiplier, 'Life Decay', 'life');
              }
          }

          // --- Apply Zonal Changes ---
          if (Math.abs(biomassChange) > 1e-9) { // Apply only if change is significant
              terraforming.zonalSurface[zoneName].biomass += biomassChange;

              // Apply water change (consumption or release)
              if (usedLiquidWater && biomassChange > 0) {
                  terraforming.zonalWater[zoneName].liquid += waterChange;
                  terraforming.zonalWater[zoneName].liquid = Math.max(0, terraforming.zonalWater[zoneName].liquid);
              }

              // Apply CO2 change directly to global resource
              if (resources.atmospheric['carbonDioxide']) {
                  resources.atmospheric['carbonDioxide'].value += co2Change;
                  resources.atmospheric['carbonDioxide'].value = Math.max(0, resources.atmospheric['carbonDioxide'].value);
              }

              // Apply Oxygen change directly to global resource
              if (resources.atmospheric['oxygen']) {
                  resources.atmospheric['oxygen'].value += oxygenChange;
                  resources.atmospheric['oxygen'].value = Math.max(0, resources.atmospheric['oxygen'].value);
              }

              // Ensure biomass doesn't go below zero
              terraforming.zonalSurface[zoneName].biomass = Math.max(0, terraforming.zonalSurface[zoneName].biomass);
               if(terraforming.zonalSurface[zoneName].biomass < 1e-2){ // Clean up near-zero values
                   terraforming.zonalSurface[zoneName].biomass = 0;
               }
          }
      }
      // Global resource object amounts are updated directly, modifyRate updates UI tracking.

      // --- Geological Burial Step (after growth/decay) ---
      const burialValue = design.geologicalBurial.value;
      if (burialValue > 0 && secondsMultiplier > 0) {
          // Base burial rate is 0.01% per point per day
          let burialRatePerDay = burialValue * 0.0001;
          // If CO2 has run out, slow burial drastically as life recycles more efficiently
          const co2Amount = resources.atmospheric['carbonDioxide']?.value || 0;
          if (co2Amount <= 1) {
              burialRatePerDay = 0; // 10,000 times slower without CO2
          }

          for (const zoneName of ['tropical', 'temperate', 'polar']) {
              let currentZonalBiomass = terraforming.zonalSurface[zoneName].biomass || 0;
              if (currentZonalBiomass > 0) {
                  let burialAmount = currentZonalBiomass * burialRatePerDay * secondsMultiplier;
                  burialAmount = Math.min(burialAmount, currentZonalBiomass); // Cannot bury more than exists

                  if (burialAmount > 1e-9) { // Only apply if significant
                      terraforming.zonalSurface[zoneName].biomass -= burialAmount;
                      // Update rate tracking for biomass resource
                      if (resources.surface.biomass) {
                          resources.surface.biomass.modifyRate(-burialAmount / secondsMultiplier, 'Geological Burial', 'life');
                      }
                  }
              }
          }
      }
  }


}