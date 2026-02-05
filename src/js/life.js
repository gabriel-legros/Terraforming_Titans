let DEFAULT_LIFE_DESIGN_REQUIREMENTS;
try {
  DEFAULT_LIFE_DESIGN_REQUIREMENTS = terraformingRequirements.human.lifeDesign;
} catch (error) {
  DEFAULT_LIFE_DESIGN_REQUIREMENTS = require('./terraforming/terraforming-requirements.js').terraformingRequirements.human.lifeDesign;
}

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

function getActiveLifeMetabolismProcess() {
  const requirements = getActiveLifeDesignRequirements();
  const metabolism = requirements.metabolism ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.metabolism;
  const primaryProcessId = metabolism.primaryProcessId ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.metabolism.primaryProcessId;
  return metabolism.processes[primaryProcessId] ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.metabolism.processes.photosynthesis;
}

const METABOLISM_EQUATION_SPECIES = {
  carbonDioxide: { key: 'co2', label: 'CO₂ (g)' },
  oxygen: { key: 'o2', label: 'O₂ (g)' },
  hydrogen: { key: 'h2', label: 'H₂ (g)' },
  atmosphericAmmonia: { key: 'nh3', label: 'NH₃ (g)' },
  inertGas: { key: 'n2', label: 'N₂ (g)' },
  atmosphericMethane: { key: 'ch4', label: 'CH₄ (g)' },
  atmosphericWater: { key: 'h2o_atm', label: 'H₂O (g)' },
  liquidWater: { key: 'h2o_liq', label: 'H₂O (l)' },
  liquidCO2: { key: 'co2_liq', label: 'CO₂ (l)' },
  biomass: { key: 'biomass', label: 'Biomass' },
};

function formatMetabolismCoefficient(value) {
  const rounded = Math.abs(value).toFixed(2);
  return rounded.endsWith('.00') ? rounded.slice(0, -3) : rounded;
}

function formatMetabolismTerm(value, label, options) {
  if (!options.includeCoefficients) return label;
  const coefficient = formatMetabolismCoefficient(value);
  if (coefficient === '1') return label;
  return `${coefficient} ${label}`;
}

function summarizeMetabolismGrowthMap(process) {
  const growth = process?.growth ?? null;
  const surface = growth?.perBiomass?.surface ?? {};
  const atmospheric = growth?.perBiomass?.atmospheric ?? {};
  const combined = { ...surface, ...atmospheric };
  const normalized = {};

  Object.entries(combined).forEach(([resourceKey, value]) => {
    const mapping = METABOLISM_EQUATION_SPECIES[resourceKey];
    const key = mapping?.key ?? resourceKey;
    normalized[key] = (normalized[key] ?? 0) + value;
  });

  return normalized;
}

function formatMetabolismGrowthEquation(process, options = {}) {
  const mergedOptions = {
    includeCoefficients: false,
    includeBiomass: true,
    includeLight: true,
    ...options,
  };

  const normalized = summarizeMetabolismGrowthMap(process);
  if (!mergedOptions.includeBiomass) delete normalized.biomass;

  const left = [];
  const right = [];

  const order = ['co2', 'co2_liq', 'h2', 'nh3', 'h2o_liq', 'h2o_atm', 'ch4', 'n2', 'o2', 'biomass'];
  const entries = order
    .filter(key => normalized[key])
    .map(key => [key, normalized[key]]);

  entries.forEach(([key, value]) => {
    const label =
      Object.values(METABOLISM_EQUATION_SPECIES).find(species => species.key === key)?.label ?? key;
    const term = formatMetabolismTerm(value, label, mergedOptions);
    if (value < 0) left.push(term);
    if (value > 0) right.push(term);
  });

  const usesLuminosity = !!process?.growth?.usesLuminosity;
  if (mergedOptions.includeLight && usesLuminosity) left.push('Light');

  const leftSide = left.length ? left.join(' + ') : '—';
  const rightSide = right.length ? right.join(' + ') : '—';
  return `${leftSide} → ${rightSide}`;
}

function calculateGrowthTemperatureTolerance(points) {
  const requirements = getActiveLifeDesignRequirements();
  return requirements.growthTemperatureToleranceBaseC + points * requirements.growthTemperatureTolerancePerPointC;
}

const lifeDesignerConfig = {
  maxPoints : 0,
  attributeMaxBonuses: {}
}

function getAttributeMaxUpgrades(attributeName) {
  const requirements = getActiveLifeDesignRequirements();
  const baseMax = requirements.attributeMaxUpgrades?.[attributeName]
    ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.attributeMaxUpgrades[attributeName];
  const bonus = lifeDesignerConfig.attributeMaxBonuses[attributeName] || 0;
  return baseMax + bonus;
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
        const bioworkersPerBiomassPerPoint = requirements.bioworkersPerBiomassPerPoint
          ?? DEFAULT_LIFE_DESIGN_REQUIREMENTS.bioworkersPerBiomassPerPoint
          ?? 0.00001;
        return `${(this.value * bioworkersPerBiomassPerPoint).toFixed(5)} workers per ton biomass`;
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
      'Daytime temperature for peak growth. Costs 1 point per degree from the base temperature.',
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
      const zones = getZones();
      for (const zoneName of zones) {
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

      const zones = getZones();
      zones.forEach(zoneName => {
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

      const zones = getZones();
      for (const zoneName of zones) {
          if (survivalTempResults[zoneName]?.pass && this.moistureCheckZone(zoneName).pass) {
              growableZones.push(zoneName);
          }
      }
      return growableZones;
  } // Correct closing brace for the getGrowableZones method

  // Checks if sufficient moisture (liquid only) is available for growth in a specific zone.
  moistureCheckZone(zoneName) {
      if (!terraforming || !terraforming.zonalSurface) {
          console.error("Terraforming or resource data not available for moisture check in zone:", zoneName);
          return { pass: false, reason: "Data unavailable" };
      }

      const liquidWater = terraforming.zonalSurface[zoneName]?.liquidWater || 0;
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
      const zones = getZones();
      for (const zoneName of zones) {
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
      const zones = getZones();
      for (const zoneName of zones) {
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
    this.pointShopMultiplier = 1;
    this.biodomePointMultiplier = 1;
    this.attributeMaxBonuses = {};

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
    this.pointShopMultiplier = 1;
    this.biodomePointMultiplier = 1;
    this.attributeMaxBonuses = {};
    lifeDesignerConfig.attributeMaxBonuses = this.attributeMaxBonuses;
    super.applyActiveEffects(firstTime);
    this.refreshAttributeMaxUpgrades();
  }

  applyLifeDesignPointBonus(effect){
    this.designPointBonus += effect.value;
  }

  applyLifeDesignPointShopMultiplier(effect) {
    this.pointShopMultiplier *= 1 + effect.value;
  }

  applyLifeDesignPointBiodomeMultiplier(effect) {
    this.biodomePointMultiplier *= 1 + effect.value;
  }

  applyLifeDesignAttributeMaxBonus(effect) {
    const bonuses = effect.bonuses || {};
    for (const key in bonuses) {
      this.attributeMaxBonuses[key] = (this.attributeMaxBonuses[key] || 0) + bonuses[key];
    }
    lifeDesignerConfig.attributeMaxBonuses = this.attributeMaxBonuses;
    this.refreshAttributeMaxUpgrades();
  }

  refreshAttributeMaxUpgrades() {
    this.updateDesignAttributeMaxUpgrades(this.currentDesign);
    this.updateDesignAttributeMaxUpgrades(this.tentativeDesign || this.currentDesign);
  }

  updateDesignAttributeMaxUpgrades(design) {
    for (const key in design) {
      design[key].maxUpgrades = getAttributeMaxUpgrades(key);
    }
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
    const biodome = buildings.biodome;
    const biodomeCount = biodome.active;
    const workerProductivity = biodome.workerProductivity;
    const rate =
      (biodomeCount > 0 ? Math.log10(10 * biodomeCount) : 0) *
      this.biodomePointMultiplier *
      workerProductivity;
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
    const boostedPurchases = totalPurchases * this.pointShopMultiplier;
    return (
      this.baseMaxPoints +
      this.designPointBonus +
      boostedPurchases +
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
    this.biomassGrowthLimiters = {};
  }

  getEngineeredNitrogenFixationInfo() {
    const pressurePa = terraforming.atmosphericPressureCache.pressureByKey.inertGas || 0;
    const pressureKPa = pressurePa / 1000;
    const clampedPressure = Math.min(Math.max(pressureKPa, 0), 10);
    const multiplier = 1 + clampedPressure / 10;
    return { multiplier, pressureKPa };
  }

  getLifeGrowthMultiplierBreakdown() {
    let effectMultiplier = 1;
    this.activeEffects.forEach(effect => {
      if (effect.type === 'lifeGrowthMultiplier') {
        effectMultiplier *= effect.value;
      }
    });

    let nitrogenMultiplier = 1;
    let nitrogenPressureKPa = 0;
    if (this.isBooleanFlagSet('engineeredNitrogenFixation')) {
      const info = this.getEngineeredNitrogenFixationInfo();
      nitrogenMultiplier = info.multiplier;
      nitrogenPressureKPa = info.pressureKPa;
    }

    return {
      effectMultiplier,
      nitrogenMultiplier,
      nitrogenPressureKPa,
      totalMultiplier: effectMultiplier * nitrogenMultiplier,
    };
  }

  getEffectiveLifeGrowthMultiplier() {
    return this.getLifeGrowthMultiplierBreakdown().totalMultiplier;
  }

  buildAtmosphericPlan(deltaTime) {
    const design = lifeDesigner.currentDesign;
    const baseGrowthRate = Number(design.getBaseGrowthRate());
    const requirements = getActiveLifeDesignRequirements();
    const process = getActiveLifeMetabolismProcess();
    const growthPerBiomass = process.growth.perBiomass;
    const decayPerBiomass = process.decay.perBiomass;
    const processName = process.displayName || 'Photosynthesis';
    const growthReason = processName;
    const decayReason = `${processName} Decay`;
    const usesLuminosity = process.growth.usesLuminosity === true;
    const secondsMultiplier = deltaTime / 1000;
    const landMultiplier = Math.max(0, 1 - getEcumenopolisLandFraction(terraforming));
    const zones = getZones();

    const biomassByZone = {};
    const waterByZone = {};
    const overflowDecayByZone = {};
    zones.forEach(zoneName => {
      biomassByZone[zoneName] = terraforming.zonalSurface[zoneName].biomass || 0;
      waterByZone[zoneName] = terraforming.zonalSurface[zoneName].liquidWater || 0;
      overflowDecayByZone[zoneName] = 0;
    });

    const surfaceInputsPerBiomass = Object.entries(growthPerBiomass.surface || {})
      .filter(([, coef]) => coef < 0);
    const atmosphericInputsPerBiomass = Object.entries(growthPerBiomass.atmospheric || {})
      .filter(([, coef]) => coef < 0);

    const biomassGrowthLimiters = {};
    const addBiomassGrowthLimiter = (resourceKey, zoneName, scope) => {
      const entry = biomassGrowthLimiters[resourceKey] || (biomassGrowthLimiters[resourceKey] = {
        scope,
        zones: [],
      });
      if (scope === 'surface' && zoneName && !entry.zones.includes(zoneName)) {
        entry.zones.push(zoneName);
      }
    };

    const canGrowByZone = {};
    const baseMaxDensity = requirements.baseMaxBiomassDensityTPerM2;
    const densityMultiplier = 1 + design.spaceEfficiency.value;
    const effectiveGrowthMultiplier = this.getEffectiveLifeGrowthMultiplier();
    const radMitigation = design.getRadiationMitigationRatio();
    let radPenalty = terraforming.getMagnetosphereStatus()
      ? 0
      : (terraforming.radiationPenalty || 0) * (1 - radMitigation);
    if (radPenalty < 0.0001) radPenalty = 0;
    const radMult = 1 - radPenalty;
    zones.forEach(zoneName => {
      const lumMult = usesLuminosity ? terraforming.calculateZonalSolarPanelMultiplier(zoneName) : 1;
      const tempMult = design.temperatureGrowthMultiplierZone(zoneName);
      const waterMult = waterByZone[zoneName] > 1e-9 ? 1 : 0;
      const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentage(zoneName) * landMultiplier;
      const maxBiomassForZone = zoneArea * baseMaxDensity * densityMultiplier;
      const growthRate = baseGrowthRate * lumMult * tempMult * radMult * waterMult * effectiveGrowthMultiplier;
      canGrowByZone[zoneName] = growthRate > 0 && maxBiomassForZone > 0;
    });

    const potentialGrowthByZone = {};
    zones.forEach(zoneName => {
      potentialGrowthByZone[zoneName] = 0;
    });
    let totalPotentialGrowth = 0;

    zones.forEach(zoneName => {
      let zonalBiomass = biomassByZone[zoneName];
      if (zonalBiomass <= 0) return;

      const penaltyFraction = design.temperatureSurvivalPenalty(zoneName);
      const growthFactor = 1 - penaltyFraction;
      const moisturePass = design.moistureCheckZone(zoneName).pass;
      if (!moisturePass || growthFactor <= 0) return;

      let zonalMaxGrowthRate = baseGrowthRate;
      zonalMaxGrowthRate *= radMult;
      zonalMaxGrowthRate *= usesLuminosity ? terraforming.calculateZonalSolarPanelMultiplier(zoneName) : 1;
      zonalMaxGrowthRate *= effectiveGrowthMultiplier;

      const zoneArea = terraforming.celestialParameters.surfaceArea * getZonePercentage(zoneName) * landMultiplier;
      const maxBiomassForZone = zoneArea * baseMaxDensity * densityMultiplier;

      if (zonalBiomass > maxBiomassForZone) {
        const overflowDecay = Math.min(zonalBiomass, zonalBiomass * 0.01 * secondsMultiplier);
        overflowDecayByZone[zoneName] = overflowDecay;
        zonalBiomass = Math.max(0, zonalBiomass - overflowDecay);
        biomassByZone[zoneName] = zonalBiomass;
      }

      const logisticFactor = maxBiomassForZone > 0
        ? Math.max(0, 1 - zonalBiomass / maxBiomassForZone)
        : 0;
      const tempMultiplier = design.temperatureGrowthMultiplierZone(zoneName);
      const actualGrowthRate = zonalMaxGrowthRate * logisticFactor * tempMultiplier * growthFactor;
      const potentialBiomassIncrease = zonalBiomass * actualGrowthRate * secondsMultiplier;

      let maxBySurfaceInputs = potentialBiomassIncrease;
      let limitingSurfaceKey = '';
      let limitingSurfaceValue = potentialBiomassIncrease;
      surfaceInputsPerBiomass.forEach(([resourceKey, coef]) => {
        const requiredPerBiomass = -coef;
        let available = 0;
        if (resourceKey === 'liquidWater') {
          available = waterByZone[zoneName];
        } else {
          available = terraforming.zonalSurface[zoneName][resourceKey] || 0;
        }
        if (requiredPerBiomass > 0) {
          const maxGrowth = available / requiredPerBiomass;
          maxBySurfaceInputs = Math.min(maxBySurfaceInputs, maxGrowth);
          if (maxGrowth < limitingSurfaceValue) {
            limitingSurfaceValue = maxGrowth;
            limitingSurfaceKey = resourceKey;
          }
        }
      });
      if (limitingSurfaceKey && limitingSurfaceValue < potentialBiomassIncrease) {
        addBiomassGrowthLimiter(limitingSurfaceKey, zoneName, 'surface');
      }

      const capped = Math.max(0, maxBySurfaceInputs);
      potentialGrowthByZone[zoneName] = capped;
      totalPotentialGrowth += capped;
    });

    let maxByAtmosphericInputs = totalPotentialGrowth;
    let limitingAtmosphericKey = '';
    let limitingAtmosphericValue = totalPotentialGrowth;
    atmosphericInputsPerBiomass.forEach(([resourceKey, coef]) => {
      const requiredPerBiomass = -coef;
      const available = resources.atmospheric[resourceKey].value;
      if (requiredPerBiomass > 0) {
        const maxGrowth = available / requiredPerBiomass;
        maxByAtmosphericInputs = Math.min(maxByAtmosphericInputs, maxGrowth);
        if (maxGrowth < limitingAtmosphericValue) {
          limitingAtmosphericValue = maxGrowth;
          limitingAtmosphericKey = resourceKey;
        }
      }
    });
    if (limitingAtmosphericKey && maxByAtmosphericInputs < totalPotentialGrowth) {
      addBiomassGrowthLimiter(limitingAtmosphericKey, '', 'atmospheric');
    }

    const totalGrowthBiomass = Math.max(0, Math.min(totalPotentialGrowth, maxByAtmosphericInputs));
    const zoneGrowthByZone = {};
    zones.forEach(zoneName => {
      zoneGrowthByZone[zoneName] = 0;
    });
    zones.forEach(zoneName => {
      const zonePotential = potentialGrowthByZone[zoneName];
      if (zonePotential <= 0) return;
      zoneGrowthByZone[zoneName] = totalPotentialGrowth > 0
        ? totalGrowthBiomass * (zonePotential / totalPotentialGrowth)
        : 0;
    });

    const seedTargets = zones.filter(zoneName => {
      const zonalBiomass = biomassByZone[zoneName];
      return zonalBiomass < 1 && canGrowByZone[zoneName];
    });
    const seedDonors = zones.filter(zoneName =>
      biomassByZone[zoneName] > 0 && !seedTargets.includes(zoneName)
    );

    seedTargets.forEach(targetZone => {
      let availableGrowth = 0;
      seedDonors.forEach(donorZone => {
        availableGrowth += zoneGrowthByZone[donorZone];
      });
      if (availableGrowth <= 0) return;
      const seedAmount = Math.min(1, availableGrowth);
      zoneGrowthByZone[targetZone] += seedAmount;
      seedDonors.forEach(donorZone => {
        const donorGrowth = zoneGrowthByZone[donorZone];
        if (donorGrowth <= 0) return;
        const share = donorGrowth / availableGrowth;
        zoneGrowthByZone[donorZone] = donorGrowth - seedAmount * share;
      });
    });

    const growthAtmosphericDeltas = {};
    const waterDeltaByZone = {};
    zones.forEach(zoneName => {
      waterDeltaByZone[zoneName] = 0;
    });
    zones.forEach(zoneName => {
      const zoneGrowth = zoneGrowthByZone[zoneName];
      if (zoneGrowth <= 0) return;
      biomassByZone[zoneName] += zoneGrowth;
      const waterDelta = zoneGrowth * (growthPerBiomass.surface.liquidWater || 0);
      if (waterDelta) {
        waterDeltaByZone[zoneName] = waterDelta;
        waterByZone[zoneName] = Math.max(0, waterByZone[zoneName] + waterDelta);
      }
      Object.entries(growthPerBiomass.atmospheric || {}).forEach(([resourceKey, coef]) => {
        growthAtmosphericDeltas[resourceKey] =
          (growthAtmosphericDeltas[resourceKey] || 0) + zoneGrowth * coef;
      });
    });

    const decayTargetsByZone = {};
    zones.forEach(zoneName => {
      decayTargetsByZone[zoneName] = 0;
    });
    let totalDecayTarget = 0;
    zones.forEach(zoneName => {
      const zonalBiomass = biomassByZone[zoneName];
      if (zonalBiomass <= 0) return;
      const penaltyFraction = design.temperatureSurvivalPenalty(zoneName);
      if (penaltyFraction <= 0) return;
      const decayFactor = 0.01 * penaltyFraction;
      const percentDecayAmount = zonalBiomass * decayFactor * secondsMultiplier;
      const minDecayAmount = requirements.minimumBiomassDecayRateTPerS * secondsMultiplier * penaltyFraction;
      const targetDecay = Math.min(zonalBiomass, Math.max(percentDecayAmount, minDecayAmount));
      decayTargetsByZone[zoneName] = targetDecay;
      totalDecayTarget += targetDecay;
    });

    const decaySurfaceInputsPerBiomass = Object.entries(decayPerBiomass.surface || {})
      .filter(([resourceKey, coef]) => resourceKey !== 'biomass' && coef < 0);
    const decayAtmosphericInputsPerBiomass = Object.entries(decayPerBiomass.atmospheric || {})
      .filter(([, coef]) => coef < 0);

    const potentialDecayByZone = {};
    zones.forEach(zoneName => {
      potentialDecayByZone[zoneName] = 0;
    });
    let totalPotentialDecay = 0;
    zones.forEach(zoneName => {
      const targetDecay = decayTargetsByZone[zoneName];
      if (targetDecay <= 0) return;
      let maxBySurfaceInputs = targetDecay;
      decaySurfaceInputsPerBiomass.forEach(([resourceKey, coef]) => {
        const requiredPerBiomass = -coef;
        let available = 0;
        if (resourceKey === 'liquidWater') {
          available = waterByZone[zoneName];
        }
        if (requiredPerBiomass > 0) {
          maxBySurfaceInputs = Math.min(maxBySurfaceInputs, available / requiredPerBiomass);
        }
      });
      const capped = Math.max(0, maxBySurfaceInputs);
      potentialDecayByZone[zoneName] = capped;
      totalPotentialDecay += capped;
    });

    let maxSupportedDecayByAtmosphere = totalPotentialDecay;
    decayAtmosphericInputsPerBiomass.forEach(([resourceKey, coef]) => {
      const requiredPerBiomass = -coef;
      const available = resources.atmospheric[resourceKey].value;
      if (requiredPerBiomass > 0) {
        maxSupportedDecayByAtmosphere = Math.min(maxSupportedDecayByAtmosphere, available / requiredPerBiomass);
      }
    });

    const supportedDecayTotal = Math.max(0, Math.min(totalPotentialDecay, maxSupportedDecayByAtmosphere));
    const decayAtmosphericDeltas = {};
    zones.forEach(zoneName => {
      const targetDecay = decayTargetsByZone[zoneName];
      if (targetDecay <= 0) return;
      const supportedDecay = totalPotentialDecay > 0
        ? supportedDecayTotal * (potentialDecayByZone[zoneName] / totalPotentialDecay)
        : 0;
      Object.entries(decayPerBiomass.atmospheric || {}).forEach(([resourceKey, coef]) => {
        decayAtmosphericDeltas[resourceKey] =
          (decayAtmosphericDeltas[resourceKey] || 0) + supportedDecay * coef;
      });
    });

    return {
      design,
      requirements,
      process,
      growthPerBiomass,
      decayPerBiomass,
      growthReason,
      decayReason,
      usesLuminosity,
      secondsMultiplier,
      zones,
      biomassByZone,
      waterByZone,
      overflowDecayByZone,
      biomassGrowthLimiters,
      potentialGrowthByZone,
      totalPotentialGrowth,
      zoneGrowthByZone,
      waterDeltaByZone,
      decayTargetsByZone,
      growthAtmosphericDeltas,
      decayAtmosphericDeltas,
    };
  }

  estimateAtmosphericConsumption(deltaTime) {
    const secondsMultiplier = deltaTime / 1000;
    if (secondsMultiplier <= 0) {
      return {};
    }
    const deltas = this.calculateAtmosphericDeltas(deltaTime);
    const consumption = {};
    Object.entries(deltas).forEach(([resourceKey, delta]) => {
      if (delta < 0) {
        consumption[resourceKey] = -delta;
      }
    });
    return consumption;
  }

  calculateAtmosphericDeltas(deltaTime) {
    const secondsMultiplier = deltaTime / 1000;
    if (secondsMultiplier <= 0) {
      return {};
    }
    const plan = this.buildAtmosphericPlan(deltaTime);
    const netAtmosphericDeltas = {};
    Object.entries(plan.growthAtmosphericDeltas).forEach(([resourceKey, delta]) => {
      if (!delta) return;
      netAtmosphericDeltas[resourceKey] = (netAtmosphericDeltas[resourceKey] || 0) + delta;
    });
    Object.entries(plan.decayAtmosphericDeltas).forEach(([resourceKey, delta]) => {
      if (!delta) return;
      netAtmosphericDeltas[resourceKey] = (netAtmosphericDeltas[resourceKey] || 0) + delta;
    });

    return netAtmosphericDeltas;
  }
  // Method to update life growth/decay based on zonal environmental conditions
  // Now uses global atmospheric resources instead of zonal atmosphere
  updateLife(deltaTime) {
    if (this.isBooleanFlagSet('ringworldLowGravityLife')) {
      return;
    }
    const plan = this.buildAtmosphericPlan(deltaTime);
    const {
      design,
      growthReason,
      decayReason,
      secondsMultiplier,
      zones,
      overflowDecayByZone,
      biomassGrowthLimiters,
      zoneGrowthByZone,
      waterDeltaByZone,
      decayTargetsByZone,
      growthAtmosphericDeltas,
      decayAtmosphericDeltas,
    } = plan;

    terraforming.biomassDyingZones = {};
    const netBiomassChangeByZone = {};
    zones.forEach(zoneName => {
      terraforming.biomassDyingZones[zoneName] = false;
      netBiomassChangeByZone[zoneName] = 0;
    });

    zones.forEach(zoneName => {
      const overflowDecay = overflowDecayByZone[zoneName] || 0;
      if (overflowDecay <= 0) return;
      terraforming.zonalSurface[zoneName].biomass -= overflowDecay;
      netBiomassChangeByZone[zoneName] -= overflowDecay;
      if (secondsMultiplier > 0 && overflowDecay > 1e-9) {
        resources.surface.biomass.modifyRate(-overflowDecay / secondsMultiplier, 'Life Density Decay', 'life');
      }
    });

    this.biomassGrowthLimiters = biomassGrowthLimiters;

    zones.forEach(zoneName => {
      const zoneGrowth = zoneGrowthByZone[zoneName];
      if (zoneGrowth <= 0) return;

      terraforming.zonalSurface[zoneName].biomass += zoneGrowth;
      netBiomassChangeByZone[zoneName] += zoneGrowth;
      resources.surface.biomass.modifyRate(zoneGrowth / secondsMultiplier, growthReason, 'life');

      const waterDelta = waterDeltaByZone[zoneName] || 0;
      if (waterDelta) {
        terraforming.zonalSurface[zoneName].liquidWater += waterDelta;
        terraforming.zonalSurface[zoneName].liquidWater = Math.max(0, terraforming.zonalSurface[zoneName].liquidWater);
        resources.surface.liquidWater.modifyRate(waterDelta / secondsMultiplier, growthReason, 'life');
      }
    });

    Object.entries(growthAtmosphericDeltas).forEach(([resourceKey, delta]) => {
      if (!delta) return;
      resources.atmospheric[resourceKey].modifyRate(delta / secondsMultiplier, growthReason, 'life');
      resources.atmospheric[resourceKey].value = Math.max(0, resources.atmospheric[resourceKey].value + delta);
    });

    zones.forEach(zoneName => {
      const targetDecay = decayTargetsByZone[zoneName];
      if (targetDecay <= 0) return;

      terraforming.zonalSurface[zoneName].biomass -= targetDecay;
      terraforming.zonalSurface[zoneName].biomass = Math.max(0, terraforming.zonalSurface[zoneName].biomass);
      netBiomassChangeByZone[zoneName] -= targetDecay;
      resources.surface.biomass.modifyRate(-targetDecay / secondsMultiplier, decayReason, 'life');
    });

    Object.entries(decayAtmosphericDeltas).forEach(([resourceKey, delta]) => {
      if (!delta) return;
      resources.atmospheric[resourceKey].modifyRate(delta / secondsMultiplier, decayReason, 'life');
      resources.atmospheric[resourceKey].value = Math.max(0, resources.atmospheric[resourceKey].value + delta);
    });

    zones.forEach(zoneName => {
      if (netBiomassChangeByZone[zoneName] < -1e-9) {
        terraforming.biomassDyingZones[zoneName] = true;
      }
      if (terraforming.zonalSurface[zoneName].biomass < 1e-5) {
        terraforming.zonalSurface[zoneName].biomass = 0;
      }
    });

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

      zones.forEach(zoneName => {
        let currentZonalBiomass = terraforming.zonalSurface[zoneName].biomass || 0;
        if (currentZonalBiomass > 0) {
          let burialAmount = currentZonalBiomass * burialRatePerDay * secondsMultiplier;
          burialAmount = Math.min(burialAmount, currentZonalBiomass); // Cannot bury more than exists

          if (burialAmount > 1e-9) { // Only apply if significant
            terraforming.zonalSurface[zoneName].biomass -= burialAmount;
            if (resources.surface.biomass) {
              resources.surface.biomass.modifyRate(-burialAmount / secondsMultiplier, 'Geological Burial', 'life');
            }
          }
        }
      });
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
    LifeDesigner,
    LifeManager,
    getActiveLifeDesignRequirements,
    getActiveLifeMetabolismProcess,
    formatMetabolismGrowthEquation,
  };
} else if (typeof window !== 'undefined') {
  window.LifeDesign = LifeDesign;
  window.LifeDesigner = LifeDesigner;
}
