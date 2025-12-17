const DEFAULT_LIFE_DESIGN_REQUIREMENTS = {
  survivalTemperatureRangeK: { min: 273.15, max: 313.15 },
  optimalGrowthTemperatureBaseK: 293.15,
  growthTemperatureToleranceBaseC: 1,
  growthTemperatureTolerancePerPointC: 0.5,
  photosynthesisRatePerPoint: 0.00008,
  baseMaxBiomassDensityTPerM2: 0.1,
  radiationToleranceThresholdPoints: 25,
  minimumBiomassDecayRateTPerS: 1,
  attributeMaxUpgrades: {
    minTemperatureTolerance: 60,
    maxTemperatureTolerance: 40,
    optimalGrowthTemperature: 15,
    growthTemperatureTolerance: 40,
    photosynthesisEfficiency: 500,
    radiationTolerance: 25,
    invasiveness: 50,
    spaceEfficiency: 100,
    geologicalBurial: 50,
    bioworkforce: 100,
  },
};

function getTerraformingSafe() {
  try {
    return terraforming;
  } catch (error) {
    return null;
  }
}

function getDefaultTerraformingRequirementIdSafe() {
  try {
    return DEFAULT_TERRAFORMING_REQUIREMENT_ID;
  } catch (error) {
    return 'human';
  }
}

function getTerraformingRequirementSafe(id) {
  try {
    return getTerraformingRequirement(id);
  } catch (error) {
    return null;
  }
}

function getActiveLifeDesignRequirements() {
  const activeTerraforming = getTerraformingSafe();
  if (activeTerraforming?.requirements?.lifeDesign) {
    return activeTerraforming.requirements.lifeDesign;
  }
  const fallback = getTerraformingRequirementSafe(getDefaultTerraformingRequirementIdSafe());
  if (fallback?.lifeDesign) {
    return fallback.lifeDesign;
  }
  return DEFAULT_LIFE_DESIGN_REQUIREMENTS;
}

function calculateGrowthTemperatureTolerance(points) {
  const requirements = getActiveLifeDesignRequirements();
  return requirements.growthTemperatureToleranceBaseC + points * requirements.growthTemperatureTolerancePerPointC;
}

const lifeDesignerConfig = {
  maxPoints : 0
}

function getAttributeMaxUpgrades(attributeName) {
  const requirements = getActiveLifeDesignRequirements();
  return requirements.attributeMaxUpgrades?.[attributeName]
    ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.attributeMaxUpgrades[attributeName];
}

if (typeof module !== 'undefined' && module.exports) {
  ({ getEcumenopolisLandFraction } = require('./advanced-research/ecumenopolis.js'));
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
    const requirements = getActiveLifeDesignRequirements();
    const survivalTemperatureRangeK = requirements.survivalTemperatureRangeK
      ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.survivalTemperatureRangeK;
    switch (this.name) {
      case 'minTemperatureTolerance':
        return (survivalTemperatureRangeK.min - this.value).toFixed(2) + 'K';
      case 'maxTemperatureTolerance':
        return (survivalTemperatureRangeK.max + this.value).toFixed(2) + 'K';
      case 'optimalGrowthTemperature':
        return (
          requirements.optimalGrowthTemperatureBaseK + this.value
        ).toFixed(2) + 'K';
      case 'growthTemperatureTolerance':
        return calculateGrowthTemperatureTolerance(this.value).toFixed(2);
      case 'photosynthesisEfficiency':
        return (requirements.photosynthesisRatePerPoint * this.value).toFixed(5);
      case 'radiationTolerance':
        return this.value * 4 + '%';
      case 'invasiveness':
        return this.value;
      case 'spaceEfficiency':
        // Calculate and display the actual max density
        const densityMultiplier = 1 + this.value; // Each point adds 100% of base density
        const maxDensity = requirements.baseMaxBiomassDensityTPerM2 * densityMultiplier;
        return formatNumber(maxDensity, false, 1) + ' tons/m²'; // Display calculated density with 1 decimal place
      case 'geologicalBurial':
        // Calculate rate: starts at 0, adds 0.0001 per point, max 0.001 at 10 points
        const burialRate = this.value * 0.0001;
        return burialRate.toFixed(4); // Display rate with 4 decimal places
      case 'bioworkforce':
        return `${(this.value * 0.00001).toFixed(5)} workers per ton biomass`;
      default:
        return null;
    }
  }
}

class LifeDesign {
  constructor(
    minTemperatureTolerance,
    maxTemperatureTolerance,
    photosynthesisEfficiency,
    radiationTolerance,
    invasiveness,
    spaceEfficiency, // Added new attribute
    geologicalBurial, // Added Geological Burial
    growthTemperatureTolerance = 0,
    bioworkforce = 0
  ) {
    this.minTemperatureTolerance = new LifeAttribute('minTemperatureTolerance', minTemperatureTolerance, 'Minimum Temperature Tolerance', 'Lowest survivable temperature (day or night).', getAttributeMaxUpgrades('minTemperatureTolerance'));
    this.maxTemperatureTolerance = new LifeAttribute('maxTemperatureTolerance', maxTemperatureTolerance, 'Maximum Temperature Tolerance', 'Highest survivable temperature (day or night).', getAttributeMaxUpgrades('maxTemperatureTolerance'));
    this.optimalGrowthTemperature = new LifeAttribute(
      'optimalGrowthTemperature',
      0,
      'Optimal Growth Temperature',
      'Daytime temperature for peak growth. Costs 1 point per degree from the 20\xB0C base.',
      getAttributeMaxUpgrades('optimalGrowthTemperature')
    );
    this.growthTemperatureTolerance = new LifeAttribute('growthTemperatureTolerance', growthTemperatureTolerance, 'Growth Temperature Tolerance', 'Controls how quickly growth falls off from the optimal temperature.', getAttributeMaxUpgrades('growthTemperatureTolerance'));
    this.photosynthesisEfficiency = new LifeAttribute('photosynthesisEfficiency', photosynthesisEfficiency, 'Photosynthesis Efficiency', 'Efficiency of converting light to energy; affects growth rate.', getAttributeMaxUpgrades('photosynthesisEfficiency'));
    this.radiationTolerance = new LifeAttribute('radiationTolerance', radiationTolerance, 'Radiation Tolerance', 'Resistance to radiation; vital without a magnetosphere.', getAttributeMaxUpgrades('radiationTolerance'));
    this.invasiveness = new LifeAttribute('invasiveness', invasiveness, 'Invasiveness', 'Speed of spreading/replacing existing life; reduces deployment time.', getAttributeMaxUpgrades('invasiveness'));
    this.spaceEfficiency = new LifeAttribute('spaceEfficiency', spaceEfficiency, 'Space Efficiency', 'Increases maximum biomass density per unit area.', getAttributeMaxUpgrades('spaceEfficiency'));
    this.geologicalBurial = new LifeAttribute('geologicalBurial', geologicalBurial, 'Geological Burial', 'Removes existing biomass into inert storage.', getAttributeMaxUpgrades('geologicalBurial'));
    this.bioworkforce = new LifeAttribute('bioworkforce', bioworkforce, 'Bioworkforce', 'Allocates a fraction of global biomass to work for you.', getAttributeMaxUpgrades('bioworkforce'));
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

  getGrowthTemperatureToleranceWidth() {
    return calculateGrowthTemperatureTolerance(this.growthTemperatureTolerance.value);
  }

  getRadiationMitigationRatio() {
    const requirements = getActiveLifeDesignRequirements();
    return this.radiationTolerance.value / requirements.radiationToleranceThresholdPoints;
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
      invasiveness: this.invasiveness.value,
      spaceEfficiency: this.spaceEfficiency.value, // Added for saving
      geologicalBurial: this.geologicalBurial.value, // Added Geological Burial
      bioworkforce: this.bioworkforce.value
    };
    return data;
  }

  static load(data) {
    const design = new LifeDesign(
      data.minTemperatureTolerance,
      data.maxTemperatureTolerance,
      data.photosynthesisEfficiency,
      data.radiationTolerance,
      data.invasiveness,
      data.spaceEfficiency ?? 0, // Added for loading, default to 0 if missing in save
      data.geologicalBurial ?? 0, // Added Geological Burial, default 0
      data.growthTemperatureTolerance ?? 0,
      data.bioworkforce ?? 0
    );

    design.optimalGrowthTemperature.value = data.optimalGrowthTemperature ?? 0;
    return design;
  }

  // Checks survival temperature for a specific zone and returns details
  temperatureSurvivalCheckZone(zoneName) {
      const ranges = this.getTemperatureRanges().survival;
      const zoneData = terraforming.temperature.zones[zoneName];
      let reason = null;

      const unit = typeof getTemperatureUnit === 'function' ? getTemperatureUnit() : 'K';
      const fmt = v => formatNumber(
        typeof toDisplayTemperature === 'function' ? toDisplayTemperature(v) : v,
        false,
        1
      );

      if (zoneData.day < ranges.min - 0.5) reason = `Day too cold (${fmt(zoneData.day)}${unit} < ${fmt(ranges.min - 0.5)}${unit})`;
      else if (zoneData.day > ranges.max + 0.5) reason = `Day too hot (${fmt(zoneData.day)}${unit} > ${fmt(ranges.max + 0.5)}${unit})`;
      else if (zoneData.night < ranges.min - 0.5) reason = `Night too cold (${fmt(zoneData.night)}${unit} < ${fmt(ranges.min - 0.5)}${unit})`;
      else if (zoneData.night > ranges.max + 0.5) reason = `Night too hot (${fmt(zoneData.night)}${unit} > ${fmt(ranges.max + 0.5)}${unit})`;

      if (reason) {
          return { pass: false, reason };
      }

      const dayPen = this.temperaturePenalty(zoneData.day, ranges);
      const nightPen = this.temperaturePenalty(zoneData.night, ranges);
      const penalty = Math.max(dayPen, nightPen);
      if (penalty > 0) {
          const growthPercent = Math.round((1 - penalty) * 100);
          return { pass: true, warning: true, reason: `Growth scaled to ${growthPercent}%` };
      }
      return { pass: true, warning: false, reason: null };
  }
 
  // Checks only daytime survival temperature for a specific zone
  daytimeTemperatureSurvivalCheckZone(zoneName) {
      const ranges = this.getTemperatureRanges().survival;
      const temp = terraforming.temperature.zones[zoneName].day;
      const unit = typeof getTemperatureUnit === 'function' ? getTemperatureUnit() : 'K';
      const fmt = v => formatNumber(
        typeof toDisplayTemperature === 'function' ? toDisplayTemperature(v) : v,
        false,
        1
      );

      const penalty = this.temperaturePenalty(temp, ranges);
      if (penalty === 1) {
          const limit = temp < ranges.min ? ranges.min - 0.5 : ranges.max + 0.5;
          const comparison = temp < ranges.min ? '<' : '>';
          const text = temp < ranges.min ? 'cold' : 'hot';
          return { pass: false, reason: `Day too ${text} (${fmt(temp)}${unit} ${comparison} ${fmt(limit)}${unit})` };
      }
      if (penalty > 0) {
          return { pass: true, warning: true, reason: `Growth scaled to ${Math.round((1 - penalty) * 100)}%` };
      }
      return { pass: true, warning: false, reason: null };
  }
 
  // Checks only nighttime survival temperature for a specific zone
  nighttimeTemperatureSurvivalCheckZone(zoneName) {
      const ranges = this.getTemperatureRanges().survival;
      const temp = terraforming.temperature.zones[zoneName].night;
      const unit = typeof getTemperatureUnit === 'function' ? getTemperatureUnit() : 'K';
      const fmt = v => formatNumber(
        typeof toDisplayTemperature === 'function' ? toDisplayTemperature(v) : v,
        false,
        1
      );

      const penalty = this.temperaturePenalty(temp, ranges);
      if (penalty === 1) {
          const limit = temp < ranges.min ? ranges.min - 0.5 : ranges.max + 0.5;
          const comparison = temp < ranges.min ? '<' : '>';
          const text = temp < ranges.min ? 'cold' : 'hot';
          return { pass: false, reason: `Night too ${text} (${fmt(temp)}${unit} ${comparison} ${fmt(limit)}${unit})` };
      }
      if (penalty > 0) {
          return { pass: true, warning: true, reason: `Growth scaled to ${Math.round((1 - penalty) * 100)}%` };
      }
      return { pass: true, warning: false, reason: null };
  }
 
   // Returns an object indicating survival status for all zones
  temperatureSurvivalCheck() {
      const results = {};
      let globalPass = false;
      let anySafe = false;
      let anyWarning = false;
      for (const zoneName of ['tropical', 'temperate', 'polar']) {
          const res = this.temperatureSurvivalCheckZone(zoneName);
          results[zoneName] = res;
          if (res.pass) {
              globalPass = true;
              if (res.warning) anyWarning = true; else anySafe = true;
          }
      }
      const globalWarning = !anySafe && anyWarning;
      results.global = {
          pass: globalPass,
          warning: globalWarning,
          reason: globalPass ? (globalWarning ? 'Growth reduced in all zones' : null) : 'Fails in all zones'
      };
      return results;
  }

  // Computes temperature penalty for interpolation around survival limits
  temperaturePenalty(temp, ranges) {
      if (temp < ranges.min - 0.5 || temp > ranges.max + 0.5) return 1;
      if (temp < ranges.min + 0.5) return 1 - (temp - (ranges.min - 0.5));
      if (temp > ranges.max - 0.5) return 1 - ((ranges.max + 0.5) - temp);
      return 0;
  }

  // Returns a penalty fraction [0,1] based on how close zone temps are to survival range
  temperatureSurvivalPenalty(zoneName) {
      const ranges = this.getTemperatureRanges().survival;
      const zoneData = terraforming.temperature.zones[zoneName];
      const dayPen = this.temperaturePenalty(zoneData.day, ranges);
      const nightPen = this.temperaturePenalty(zoneData.night, ranges);
      return Math.max(dayPen, nightPen);
  }

    // Checks radiation tolerance against magnetosphere status
    radiationCheck() {
        const hasShield = terraforming.getMagnetosphereStatus();
        const basePenalty = terraforming.radiationPenalty || 0;
        let finalPenalty = 0;
        if (!hasShield) {
            const mitigation = this.getRadiationMitigationRatio();
            finalPenalty = basePenalty * (1 - mitigation);
        }
        if (finalPenalty < 0.0001) {
            finalPenalty = 0;
        }

        const pass = finalPenalty === 0;
        const reason = pass ? null : "High radiation";
        const reductionPercent = finalPenalty * 100;
        return { pass, reason, reduction: reductionPercent };
    }

  // Checks if the lifeform can survive in at least one zone based on temperature
  // TODO: Incorporate global radiation checks?
  canSurviveAnywhere() {
      const tempResults = this.temperatureSurvivalCheck();
      // Check if any zone passed the temperature check
      return tempResults.global.pass;
  }

  getPrimarySurvivalFailureReason() {
      const tempResults = this.temperatureSurvivalCheck();
      if (tempResults.global.pass) {
          return null;
      }

      const ranges = this.getTemperatureRanges().survival;
      const lower = ranges.min - 0.5;
      const upper = ranges.max + 0.5;
      const distanceToRange = (temp) => {
          if (temp < lower) return lower - temp;
          if (temp > upper) return temp - upper;
          return 0;
      };

      let closestZone = null;
      let closestDistance = Infinity;

      ['tropical', 'temperate', 'polar'].forEach(zoneName => {
          if (!tempResults[zoneName] || tempResults[zoneName].pass) {
              return;
          }
          const temps = terraforming.temperature.zones[zoneName];
          const dayDistance = distanceToRange(temps.day);
          const nightDistance = distanceToRange(temps.night);
          const zoneDistance = Math.max(dayDistance, nightDistance);
          if (zoneDistance < closestDistance) {
              closestDistance = zoneDistance;
              closestZone = zoneName;
          }
      });

      if (closestZone) {
          const zoneLabel = `${closestZone[0].toUpperCase()}${closestZone.slice(1)}`;
          const reason = tempResults[closestZone].reason || 'Unsure why this zone fails';
          return `${zoneLabel}: ${reason}`;
      }

      return tempResults.global.reason || 'Life cannot survive anywhere';
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
      const requirements = getActiveLifeDesignRequirements();
      const optimal = requirements.optimalGrowthTemperatureBaseK + this.optimalGrowthTemperature.value;
      const tolerance = this.getGrowthTemperatureToleranceWidth();
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
    const requirements = getActiveLifeDesignRequirements();
    const survivalTemperatureRangeK = requirements.survivalTemperatureRangeK
      ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.survivalTemperatureRangeK;
    const survivalRange = {
      min: survivalTemperatureRangeK.min - this.minTemperatureTolerance.value,
      max: survivalTemperatureRangeK.max + this.maxTemperatureTolerance.value
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
    this.currentDesign = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0); // Added spaceEfficiency, geologicalBurial, and bioworkforce defaults
    this.tentativeDesign = null;

    this.baseMaxPoints = lifeDesignerConfig.maxPoints;
    this.designPointBonus = 0;

    this.isActive = false;
    this.remainingTime = this.getTentativeDuration();
    this.totalTime = this.getTentativeDuration();
    this.elapsedTime = 0;

    this.basePointCost = 100;
    this.pointCostMultiplier = 2;
    this.advancedResearchBaseCost = 100000;

    this.purchaseCounts = this.createEmptyPurchaseCounts();

    this.biodomePoints = 0;
    this.biodomePointRate = 0;

    this.enabled = false;
  }

  createEmptyPurchaseCounts() {
    return {
      research: 0,
      funding: 0,
      androids: 0,
      components: 0,
      electronics: 0,
      advancedResearch: 0
    };
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
    invasiveness,
    spaceEfficiency,
    geologicalBurial,
    growthTemperatureTolerance = 0,
    bioworkforce = 0
  ) {
    this.tentativeDesign = new LifeDesign(
      minTemperatureTolerance,
      maxTemperatureTolerance,
      photosynthesisEfficiency,
      radiationTolerance,
      invasiveness,
      spaceEfficiency,
      geologicalBurial, // Pass geologicalBurial
      growthTemperatureTolerance,
      bioworkforce
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

    this.updateBiodomePoints(delta);
  }

  updateBiodomePoints(delta) {
    const biodomeCount =
      typeof buildings !== 'undefined' && buildings.biodome
        ? buildings.biodome.active
        : 0;
    const rate = biodomeCount > 0 ? Math.log10(10 * biodomeCount) : 0;
    this.biodomePointRate = rate;
    this.biodomePoints += (rate * delta) / 3600000;
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

  getPurchaseCount(category) {
    return this.purchaseCounts[category] || 0;
  }

  getAdvancedResearchPointCost(purchaseIndex) {
    const index = purchaseIndex + 1;
    return this.advancedResearchBaseCost * index * index;
  }

  getAdvancedResearchTotalCost(quantity = 1) {
    const normalizedQuantity = Math.max(0, Math.floor(quantity));
    if (normalizedQuantity === 0) {
      return 0;
    }
    const start = this.getPurchaseCount('advancedResearch');
    const end = start + normalizedQuantity;
    const squareSum = (value) => value * (value + 1) * (2 * value + 1) / 6;
    const purchases = squareSum(end) - squareSum(start);
    return this.advancedResearchBaseCost * purchases;
  }

  getPointCost(category){
    if (category === 'advancedResearch') {
      return this.getAdvancedResearchPointCost(this.getPurchaseCount(category));
    }
    return this.basePointCost * Math.pow(this.pointCostMultiplier, this.getPurchaseCount(category));
  }

  getTotalPointCost(category, quantity = 1) {
    if (category === 'advancedResearch') {
      return this.getAdvancedResearchTotalCost(quantity);
    }
    const normalizedQuantity = Math.max(1, Math.floor(quantity));
    const firstCost = this.getPointCost(category);
    if (normalizedQuantity === 1) {
      return firstCost;
    }
    const multiplier = this.pointCostMultiplier;
    if (multiplier === 1) {
      return firstCost * normalizedQuantity;
    }
    const ratioIncrease = Math.pow(multiplier, normalizedQuantity) - 1;
    return firstCost * (ratioIncrease / (multiplier - 1));
  }

  canAfford(category, quantity = 1) {
    if (category === 'advancedResearch' && !(lifeManager?.isBooleanFlagSet?.('nextGenBioEngineering'))) {
      return false;
    }
    const totalCost = this.getTotalPointCost(category, quantity);
    const resource = resources.colony[category];
    return resource && resource.value >= totalCost;
  }

  buyPoint(category, quantity = 1) {
    if (this.canAfford(category, quantity)) {
      const totalCost = this.getTotalPointCost(category, quantity);
      resources.colony[category].decrease(totalCost);
      this.purchaseCounts[category] = this.getPurchaseCount(category) + quantity;
    }
  }

  maxLifeDesignPoints() {
    const totalPurchases = Object.values(this.purchaseCounts)
      .reduce((acc, val) => acc + val, 0);
    return (
      this.baseMaxPoints +
      this.designPointBonus +
      totalPurchases +
      Math.floor(this.biodomePoints)
    );
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
      biodomePoints: this.biodomePoints,
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
    this.purchaseCounts = {
      ...this.createEmptyPurchaseCounts(),
      ...(data.purchaseCounts || {})
    };
    this.biodomePoints = data.biodomePoints || 0;
  }

  prepareTravelState() {
    return {
      advancedResearchPurchases: this.getPurchaseCount('advancedResearch')
    };
  }

  restoreTravelState(travelState = {}) {
    const restored = Number.isFinite(travelState.advancedResearchPurchases)
      ? travelState.advancedResearchPurchases
      : 0;
    this.purchaseCounts.advancedResearch = Math.max(0, restored);
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

        // Define consumption/production ratios (mass-based)
        const waterRatio = 1;
        const co2Ratio = 2.44;
        const biomassRatio = 1.66612;
        const oxygenRatio = 1.77388;

          const secondsMultiplier = deltaTime / 1000;
          terraforming.biomassDyingZones = terraforming.biomassDyingZones || { tropical: false, temperate: false, polar: false };

          const zonePercentages = {};
          let totalZonePercentage = 0;
          for (const zone of ['tropical', 'temperate', 'polar']) {
              const percentage = getZonePercentage(zone) || 0;
              zonePercentages[zone] = percentage;
              totalZonePercentage += percentage;
          }
          if (totalZonePercentage <= 0) totalZonePercentage = 1;

          const totalCO2ForGrowth = resources.atmospheric['carbonDioxide']?.value || 0;
          const totalOxygenForDecay = resources.atmospheric['oxygen']?.value || 0;
          const co2AvailableByZone = {};
          const oxygenAvailableByZone = {};
          for (const zone of ['tropical', 'temperate', 'polar']) {
              const share = zonePercentages[zone] / totalZonePercentage;
              co2AvailableByZone[zone] = totalCO2ForGrowth * share;
              oxygenAvailableByZone[zone] = totalOxygenForDecay * share;
          }

          for (const zoneName of ['tropical', 'temperate', 'polar']) {
            let usedLiquidWater = false;
            terraforming.biomassDyingZones[zoneName] = false;
            const zonalBiomass = terraforming.zonalSurface[zoneName].biomass || 0;
            if (zonalBiomass <= 0) continue;

            const penaltyFraction = design.temperatureSurvivalPenalty(zoneName);
            const growthFactor = 1 - penaltyFraction;
            const moisturePass = design.moistureCheckZone(zoneName).pass;
            const requirements = getActiveLifeDesignRequirements();

            let zonalMaxGrowthRate = baseGrowthRate;
            const radMitigation = design.getRadiationMitigationRatio();
            const radPenalty = terraforming.getMagnetosphereStatus() ? 0 : (terraforming.radiationPenalty || 0) * (1 - radMitigation);
            zonalMaxGrowthRate *= (1 - radPenalty);
            zonalMaxGrowthRate *= terraforming.calculateZonalSolarPanelMultiplier(zoneName);
            zonalMaxGrowthRate *= this.getEffectiveLifeGrowthMultiplier();

            let growthBiomass = 0;
            let growthWater = 0;
            let growthCO2 = 0;
            let growthOxygen = 0;
            let decayBiomass = 0;
            let decayWater = 0;
            let decayCO2 = 0;
            let decayOxygen = 0;

            if (moisturePass && growthFactor > 0) {
                const landMultiplier = Math.max(0, 1 - getEcumenopolisLandFraction(terraforming));
                const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentage(zoneName) * landMultiplier;
                const liquidWaterCoverage = terraforming.zonalCoverageCache[zoneName]?.liquidWater ?? 0;
                const iceCoverage = terraforming.zonalCoverageCache[zoneName]?.ice ?? 0;
                const spaceEfficiencyValue = design.spaceEfficiency.value;
                const baseMaxDensity = requirements.baseMaxBiomassDensityTPerM2;
                const densityMultiplier = 1 + spaceEfficiencyValue;
                const maxBiomassForZone = zoneArea * baseMaxDensity * densityMultiplier;

                if (maxBiomassForZone <= 0 || zonalBiomass > maxBiomassForZone) {
                    const targetOverflowDecay = Math.min(zonalBiomass, zonalBiomass * 0.01 * secondsMultiplier);
                    if (targetOverflowDecay > 0) {
                        decayBiomass -= targetOverflowDecay;

                        if (secondsMultiplier > 0 && targetOverflowDecay > 1e-9) {
                            const decayRateMultiplier = 1 / secondsMultiplier;
                            if (resources.surface.biomass) resources.surface.biomass.modifyRate(-targetOverflowDecay * decayRateMultiplier, 'Life Density Decay', 'life');
                        }
                    }
                }

                const logisticFactor = maxBiomassForZone > 0 ? Math.max(0, 1 - zonalBiomass / maxBiomassForZone) : 0;
                const tempMultiplier = design.temperatureGrowthMultiplierZone(zoneName);
                const actualGrowthRate = zonalMaxGrowthRate * logisticFactor * tempMultiplier * growthFactor;
                const potentialBiomassIncrease = zonalBiomass * actualGrowthRate * secondsMultiplier;

                const availableLiquidWater = terraforming.zonalWater[zoneName]?.liquid || 0;
                if (availableLiquidWater > 1e-9) {
                    usedLiquidWater = true;
                    const maxGrowthByLiquidWater = (availableLiquidWater / waterRatio) * biomassRatio;
                    const zoneCO2Available = co2AvailableByZone[zoneName] || 0;
                    const maxGrowthByCO2 = (zoneCO2Available / co2Ratio) * biomassRatio;
                    growthBiomass = Math.min(potentialBiomassIncrease, maxGrowthByCO2, maxGrowthByLiquidWater);
                    growthWater = -(growthBiomass / biomassRatio) * waterRatio;
                    growthCO2 = -(growthBiomass / biomassRatio) * co2Ratio;
                    growthOxygen = (growthBiomass / biomassRatio) * oxygenRatio;

                    const co2Consumed = -growthCO2;
                    co2AvailableByZone[zoneName] = Math.max(0, zoneCO2Available - co2Consumed);

                    if (secondsMultiplier > 0 && growthBiomass > 1e-9) {
                        const growthRateMultiplier = 1 / secondsMultiplier;
                        if (resources.atmospheric.carbonDioxide) resources.atmospheric.carbonDioxide.modifyRate(growthCO2 * growthRateMultiplier, 'Life Growth', 'life');
                        if (resources.atmospheric.oxygen) resources.atmospheric.oxygen.modifyRate(growthOxygen * growthRateMultiplier, 'Life Growth', 'life');
                        if (resources.surface.biomass) resources.surface.biomass.modifyRate(growthBiomass * growthRateMultiplier, 'Life Growth', 'life');
                        if (usedLiquidWater && resources.surface.liquidWater) resources.surface.liquidWater.modifyRate(growthWater * growthRateMultiplier, 'Life Growth', 'life');
                    }
                }
            }

            if (penaltyFraction > 0) {
                const decayFactor = 0.01 * penaltyFraction;
                const percentDecayAmount = zonalBiomass * decayFactor * secondsMultiplier;
                const minDecayAmount = requirements.minimumBiomassDecayRateTPerS * secondsMultiplier * penaltyFraction;
                const targetDecayAmount = Math.max(percentDecayAmount, minDecayAmount);

                const zoneOxygenAvailable = oxygenAvailableByZone[zoneName] || 0;
                const maxDecayByOxygen = (zoneOxygenAvailable / oxygenRatio) * biomassRatio;

                const totalDecay = Math.min(targetDecayAmount, zonalBiomass);
                const oxygenDecay = Math.min(maxDecayByOxygen, totalDecay);
                const deletedBiomass = totalDecay - oxygenDecay;

                decayBiomass = -(oxygenDecay + deletedBiomass);
                decayWater = (oxygenDecay / biomassRatio) * waterRatio;
                decayCO2 = (oxygenDecay / biomassRatio) * co2Ratio;
                decayOxygen = -(oxygenDecay / biomassRatio) * oxygenRatio;

                const oxygenConsumed = -decayOxygen;
                oxygenAvailableByZone[zoneName] = Math.max(0, zoneOxygenAvailable - oxygenConsumed);

                if (secondsMultiplier > 0 && totalDecay > 1e-9) {
                    const decayRateMultiplier = 1 / secondsMultiplier;
                    if (resources.atmospheric.carbonDioxide) resources.atmospheric.carbonDioxide.modifyRate(decayCO2 * decayRateMultiplier, 'Life Decay', 'life');
                    if (resources.atmospheric.oxygen) resources.atmospheric.oxygen.modifyRate(decayOxygen * decayRateMultiplier, 'Life Decay', 'life');
                    if (resources.atmospheric.atmosphericWater) resources.atmospheric.atmosphericWater.modifyRate(decayWater * decayRateMultiplier, 'Life Decay', 'life');
                    if (resources.surface.biomass) resources.surface.biomass.modifyRate(decayBiomass * decayRateMultiplier, 'Life Decay', 'life');
                }
            }

            const biomassChange = growthBiomass + decayBiomass;
            if (biomassChange < -1e-9) {
                terraforming.biomassDyingZones[zoneName] = true;
            }
            const co2Change = growthCO2 + decayCO2;
            const oxygenChange = growthOxygen + decayOxygen;

            if (Math.abs(biomassChange) > 1e-9) {
                terraforming.zonalSurface[zoneName].biomass += biomassChange;

                if (usedLiquidWater && growthBiomass > 0) {
                    terraforming.zonalWater[zoneName].liquid += growthWater;
                    terraforming.zonalWater[zoneName].liquid = Math.max(0, terraforming.zonalWater[zoneName].liquid);
                }

                if (resources.atmospheric['carbonDioxide']) {
                    resources.atmospheric['carbonDioxide'].value += co2Change;
                    resources.atmospheric['carbonDioxide'].value = Math.max(0, resources.atmospheric['carbonDioxide'].value);
                }

                if (resources.atmospheric['oxygen']) {
                    resources.atmospheric['oxygen'].value += oxygenChange;
                    resources.atmospheric['oxygen'].value = Math.max(0, resources.atmospheric['oxygen'].value);
                }

                terraforming.zonalSurface[zoneName].biomass = Math.max(0, terraforming.zonalSurface[zoneName].biomass);
                if (terraforming.zonalSurface[zoneName].biomass < 1e-2) {
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

      if (this.isBooleanFlagSet('surfaceFoodProduction')) {
          const biomassResource = resources.surface?.biomass;
          const foodResource = resources.colony?.food;
          const biomassAmount = biomassResource?.value || 0;

          if (foodResource && biomassAmount > 0) {
              const foodPerSecond = biomassAmount * 0.01;
              foodResource.modifyRate(foodPerSecond, 'Surface Biomass', 'life');

              if (secondsMultiplier > 0) {
                  foodResource.increase(foodPerSecond * secondsMultiplier);
              }
          }
      }
  }


}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LifeDesign,
    LifeDesigner
  };
} else if (typeof window !== 'undefined') {
  window.LifeDesign = LifeDesign;
  window.LifeDesigner = LifeDesigner;
}
