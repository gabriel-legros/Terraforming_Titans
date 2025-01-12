const baseTemperatureRanges = {
  survival: {
    min: 273.15, // 0°C in Kelvin
    max: 313.15  // 50°C in Kelvin
  },
  growth: {
    min: 283.15, // 10°C in Kelvin
    max: 313.15  // 30°C in Kelvin
  }
};

const lifeDesignerConfig = {
  maxPoints : 40
}

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
      case 'minTemperatureGrowth':
        return (baseTemperatureRanges.growth.min - this.value).toFixed(2) + 'K';
      case 'maxTemperatureGrowth':
        return (baseTemperatureRanges.growth.max + this.value).toFixed(2) + 'K';
      case 'photosynthesisEfficiency':
        return (0.00005*this.value).toFixed(5); // Adjust as needed
        case 'moistureEfficiency':
          if (this.value <= 9) {
            return (3*((10 - this.value)/10)).toFixed(2) + 'kg/m^2/s';
          } else {
            return (2000 / (this.value - 9)).toFixed(2) + 'Pa';
          }
      case 'radiationTolerance':
        return this.value * 10 + '%';
      case 'toxicityTolerance':
        return this.value * 10 + '%';
      case 'invasiveness':
        return this.value;
      default:
        return null;
    }
  }
}

class LifeDesign {
  constructor(minTemperatureTolerance,
    maxTemperatureTolerance,
    minTemperatureGrowth,
    maxTemperatureGrowth,
    photosynthesisEfficiency,
    moistureEfficiency,
    radiationTolerance,
    toxicityTolerance,
    invasiveness
  ) {
    this.minTemperatureTolerance = new LifeAttribute('minTemperatureTolerance', minTemperatureTolerance, 'Minimum Temperature Tolerance', 'The minimum temperature the life form can tolerate, day or night.', 50);
    this.maxTemperatureTolerance = new LifeAttribute('maxTemperatureTolerance', maxTemperatureTolerance, 'Maximum Temperature Tolerance', 'The maximum temperature the life form can tolerate, day or night.', 40);
    this.minTemperatureGrowth = new LifeAttribute('minTemperatureGrowth', minTemperatureGrowth, 'Minimum Temperature for Growth', 'The minimum temperature required for the life form to grow and thrive during the day.', 10);
    this.maxTemperatureGrowth = new LifeAttribute('maxTemperatureGrowth', maxTemperatureGrowth, 'Maximum Temperature for Growth', 'The maximum temperature at which the life form can grow and thrive during the day.', 40);
    this.photosynthesisEfficiency = new LifeAttribute('photosynthesisEfficiency', photosynthesisEfficiency, 'Photosynthesis Efficiency', 'The efficiency of the life form in converting light energy into chemical energy through photosynthesis.  Translates to growth rate.', 500);
    this.moistureEfficiency = new LifeAttribute('moistureEfficiency', moistureEfficiency, 'Moisture Efficiency', 'The efficiency of the life form in utilizing and retaining moisture.  Reduces water requirement.  Enough investment converts from liquid water to atmospheric water requirement.', 30);
    this.radiationTolerance = new LifeAttribute('radiationTolerance', radiationTolerance, 'Radiation Tolerance', 'The ability of the life form to tolerate and withstand radiation.  Especially useful without a magnetosphere.', 10);
    this.toxicityTolerance = new LifeAttribute('toxicityTolerance', toxicityTolerance, 'Toxicity Tolerance', 'The ability of the life form to tolerate and survive in the presence of toxic substances.', 10);
    this.invasiveness = new LifeAttribute('invasiveness', invasiveness, 'Invasiveness', 'The potential of the life form to spread and invade existing life.  Reduces deployment time.', 50);  }

  getDesignCost() {
    return Object.values(this).reduce((sum, attribute) => {
      if (attribute instanceof LifeAttribute) {
        return sum + attribute.value;
      }
      return sum;
    }, 0);
  }

  getMoistureType() {
    const moistureEfficiencyValue = this.moistureEfficiency.value;
      if(moistureEfficiencyValue <= 9){
        return 'Water';
      }
      else {
       return 'Atmospheric Water'; 
      }
  }

  getBaseGrowthRate() {
    return this.photosynthesisEfficiency.getConvertedValue();
  }

  getRadiationMitigationRatio() {
    return this.radiationTolerance.value / 10;
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
      minTemperatureGrowth: this.minTemperatureGrowth.value,
      maxTemperatureGrowth: this.maxTemperatureGrowth.value,
      photosynthesisEfficiency: this.photosynthesisEfficiency.value,
      moistureEfficiency: this.moistureEfficiency.value,
      radiationTolerance: this.radiationTolerance.value,
      toxicityTolerance: this.toxicityTolerance.value,
      invasiveness: this.invasiveness.value,
    };
    return data;
  }

  static load(data) {
    return new LifeDesign(
      data.minTemperatureTolerance,
      data.maxTemperatureTolerance,
      data.minTemperatureGrowth,
      data.maxTemperatureGrowth,
      data.photosynthesisEfficiency,
      data.moistureEfficiency,
      data.radiationTolerance,
      data.toxicityTolerance,
      data.invasiveness
    );
  }

  temperatureSurvivalCheck(){
    const temperatureRanges = this.getTemperatureRanges();
    const { tropical, temperate, polar } = terraforming.temperature.zones;

    const zones = [tropical, temperate, polar];
    for (const zone of zones) {
      if (
        zone.day >= temperatureRanges.survival.min &&
        zone.day <= temperatureRanges.survival.max &&
        zone.night >= temperatureRanges.survival.min &&
        zone.night <= temperatureRanges.survival.max
      ) {
        return true;
      }
    }

    return false;
  }

  toxicityCheck(){
    return true;
  }

  radiationCheck(){
    if(this.radiationTolerance.value >= 10){
      return true;
    }
    if(!terraforming.isBooleanFlagSet('magneticShield')){
      return false;
    } else
    {
      return true;
    }
  }

  canSurvive() {
    return this.temperatureSurvivalCheck();
  }

  canGrow() {
    return (this.moistureCheck() && this.temperatureGrowthCheck())
  }

  moistureCheck() {
    if(this.moistureEfficiency.value <= 9){
      const rainReq = 3*((10 - this.moistureEfficiency.value)/10);
      if(rainReq > 1000*terraforming.water.rainfallRate / terraforming.celestialParameters.surfaceArea){
        return false;
      }
    } else {
      const vapReq = (2000 / (this.moistureEfficiency.value - 9));
      const waterGasPressure = calculateGasPressure('atmosphericWater');
      if(vapReq > waterGasPressure){
        return false;
      }
    }
    return true;
  }

  temperatureGrowthCheck(){
    const temperatureRanges = this.getTemperatureRanges();
    const { tropical, temperate, polar } = terraforming.temperature.zones;

    const zones = [tropical, temperate, polar];
    for (const zone of zones) {
      if (
        zone.day >= temperatureRanges.growth.min &&
        zone.day <= temperatureRanges.growth.max
      ) {
        return true;
      }
    }
    return false;
  }

  getTemperatureRanges() {
    const survivalRange = {
      min: baseTemperatureRanges.survival.min - this.minTemperatureTolerance.value,
      max: baseTemperatureRanges.survival.max + this.maxTemperatureTolerance.value
    };
  
    const growthRange = {
      min: baseTemperatureRanges.growth.min - this.minTemperatureGrowth.value,
      max: baseTemperatureRanges.growth.max + this.maxTemperatureGrowth.value
    };
  
    return {
      survival: survivalRange,
      growth: growthRange
    };
  }
}

class LifeDesigner extends EffectableEntity {
  constructor() {
    super({ description: 'Life Designer' });
    this.baseApplyDuration = 60000;
    this.currentDesign = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0);
    this.tentativeDesign = null;

    this.isActive = false;
    this.remainingTime = this.getTentativeDuration();
    this.totalTime = this.getTentativeDuration();
    this.elapsedTime = 0;

    this.basePointCost = 1000;
    this.pointCostMultiplier = 10;

    this.purchaseCounts = {
      research: 0,
      funding: 0,
      androids: 0,
      components: 0,
      electronics: 0
    };

    this.enabled = false;
  }

  enable(){
    this.enabled = true;
  }

  createNewDesign(
    minTemperatureTolerance,
    maxTemperatureTolerance,
    minTemperatureGrowth,
    maxTemperatureGrowth,
    photosynthesisEfficiency,
    moistureEfficiency,
    radiationTolerance,
    toxicityTolerance,
    invasiveness
  ) {
    this.tentativeDesign = new LifeDesign(
      minTemperatureTolerance,
      maxTemperatureTolerance,
      minTemperatureGrowth,
      maxTemperatureGrowth,
      photosynthesisEfficiency,
      moistureEfficiency,
      radiationTolerance,
      toxicityTolerance,
      invasiveness
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
    return lifeDesignerConfig.maxPoints + totalPurchases;
  }

  saveState() {
    const data = {
      currentDesign: this.currentDesign.save(),
      tentativeDesign: this.tentativeDesign ? this.tentativeDesign.save() : null,
      isActive: this.isActive,
      remainingTime: this.remainingTime,
      totalTime: this.totalTime,
      elapsedTime: this.elapsedTime,
      purchaseCounts: { ...this.purchaseCounts }
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

  // Method to update life growth based on environmental conditions
  updateLife(deltaTime) {
    let maxGrowthRate = lifeDesigner.currentDesign.getBaseGrowthRate(); // Start with a base growth rate multiplier of 1
    let canGrow = lifeDesigner.currentDesign.canGrow(); // Track if any suitable condition for growth is met
    let canSurvive = lifeDesigner.currentDesign.canSurvive();
    let moistureType = lifeDesigner.currentDesign.getMoistureType();

    if(!terraforming.getMagnetosphereStatus()){
      maxGrowthRate *= (0.5 + 0.5*lifeDesigner.currentDesign.getRadiationMitigationRatio());
    }

    const biomass = resources.surface.biomass;
    const co2 = resources.atmospheric.carbonDioxide;
    const oxygen = resources.atmospheric.oxygen;
    let water = null;
    if(moistureType == 'Water'){
      water = resources.surface.liquidWater;
    }
    else if (moistureType == 'Atmospheric Water'){
      water = resources.atmospheric.atmosphericWater;
    }

    // Define consumption/production ratios
    const waterRatio = 1;
    const co2Ratio = 2.44;
    const biomassRatio = 1.66612;
    const oxygenRatio = 1.77388

    // Determine growth or decay factor
    const factor = canGrow ? maxGrowthRate : 0.999;
    const biomassChange = biomass.value * factor * deltaTime / 1000;
    const absoluteChange = Math.abs(biomassChange);

    // Apply resource adjustments based on growth or decay
    if (canGrow) {
      const maxPossibleBiomassIncrease = Math.min(
          biomassChange,
          (water.value / waterRatio) * biomassRatio,
          (co2.value / co2Ratio) * biomassRatio
      ) * this.getEffectiveLifeGrowthMultiplier();

      const adjustedWaterChange = (maxPossibleBiomassIncrease / biomassRatio) * waterRatio;
      const adjustedCo2Change = (maxPossibleBiomassIncrease / biomassRatio) * co2Ratio;
      const adjustedOxygenChange = (maxPossibleBiomassIncrease / biomassRatio) * oxygenRatio;

      // Apply growth-related resource adjustments
      water.value -= adjustedWaterChange;
      co2.value -= adjustedCo2Change;
      oxygen.value += adjustedOxygenChange;
      biomass.value += maxPossibleBiomassIncrease;

      // Update production and consumption rates
      water.modifyRate(- adjustedWaterChange * (1000 / deltaTime), 'Life Growth');
      co2.modifyRate(- adjustedCo2Change * (1000 / deltaTime), 'Life Growth');
      oxygen.modifyRate(adjustedOxygenChange * (1000 / deltaTime), 'Life Growth');
      biomass.modifyRate(maxPossibleBiomassIncrease * (1000 / deltaTime), 'Life Growth');
    } else if (oxygen.value > 0 && !canSurvive) {
      // Apply decay-related resource adjustments only if oxygen is available
      const tempDecay = Math.min(biomass.value, absoluteChange); // Prevent negative biomass
      const actualDecay = Math.min(tempDecay, oxygen.value * oxygenRatio / biomassRatio)
      biomass.value -= actualDecay;

      const adjustedWaterChange = (actualDecay / biomassRatio) * waterRatio;
      const adjustedCo2Change = (actualDecay / biomassRatio) * co2Ratio;
      const adjustedOxygenChange = (actualDecay / biomassRatio) * oxygenRatio;

      // Decay-related resource adjustments
      water.value += adjustedWaterChange;
      co2.value += adjustedCo2Change;
      oxygen.value -= adjustedOxygenChange;

      // Update production and consumption rates
      water.modifyRate(- adjustedWaterChange * (1000 / deltaTime), 'Life Decay');
      co2.modifyRate(- adjustedCo2Change * (1000 / deltaTime), 'Life Decay');
      oxygen.modifyRate(adjustedOxygenChange * (1000 / deltaTime), 'Life Decay');
      biomass.modifyRate(-actualDecay * (1000 / deltaTime), 'Life Decay');

      if(biomass.value < 1e-2){
        biomass.value = 0;
      }
  }

}


}