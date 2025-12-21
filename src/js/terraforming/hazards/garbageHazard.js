function isPlainObject(value) {
  return value !== null && value.constructor === Object;
}

function withHazardSeverity(entry, defaultSeverity = 1) {
  if (!isPlainObject(entry)) {
    return { value: entry, severity: defaultSeverity };
  }

  const result = { ...entry };
  if (!Object.prototype.hasOwnProperty.call(result, 'severity')) {
    result.severity = defaultSeverity;
  }

  return result;
}

function normalizeHazardPenalties(penalties) {
  const source = isPlainObject(penalties) ? penalties : {};
  const normalized = {};

  Object.keys(source).forEach((key) => {
    normalized[key] = withHazardSeverity(source[key]);
  });

  return normalized;
}

function normalizeGarbageParameters(parameters) {
  const source = isPlainObject(parameters) ? parameters : {};
  const normalized = {};

  Object.keys(source).forEach((key) => {
    if (key === 'penalties') {
      normalized.penalties = normalizeHazardPenalties(source.penalties);
      return;
    }

    if (key === 'surfaceResources') {
      if (isPlainObject(source.surfaceResources)) {
        normalized.surfaceResources = {};
        Object.keys(source.surfaceResources).forEach((resourceKey) => {
          const resourceConfig = source.surfaceResources[resourceKey];
          normalized.surfaceResources[resourceKey] = isPlainObject(resourceConfig)
            ? { ...resourceConfig }
            : { amountMultiplier: 1 };
        });
      } else if (Array.isArray(source.surfaceResources)) {
        normalized.surfaceResources = {};
        source.surfaceResources.forEach((resourceKey) => {
          normalized.surfaceResources[resourceKey] = { amountMultiplier: 1 };
        });
      } else {
        normalized.surfaceResources = {};
      }
      return;
    }

    normalized[key] = withHazardSeverity(source[key]);
  });

  if (!Object.prototype.hasOwnProperty.call(normalized, 'penalties')) {
    normalized.penalties = {};
  }

  if (!Object.prototype.hasOwnProperty.call(normalized, 'surfaceResources')) {
    normalized.surfaceResources = {};
  }

  return normalized;
}

class GarbageHazard {
  constructor(manager) {
    this.manager = manager;
    this.androidAttritionRates = {};
    this.clearedCategories = {};
  }

  normalize(parameters) {
    return normalizeGarbageParameters(parameters);
  }

  resetClearedCategories() {
    this.clearedCategories = {};
  }

  markCategoryCleared(key, currentAmount, initialAmount) {
    if (currentAmount <= 0 || initialAmount <= 0) {
      this.clearedCategories[key] = true;
    }
  }

  isCategoryCleared(key) {
    return !!this.clearedCategories[key];
  }

  getClearedCategories() {
    return { ...this.clearedCategories };
  }

  save() {
    return { clearedCategories: this.getClearedCategories() };
  }

  load(data) {
    const cleared = (data && data.clearedCategories) || {};
    this.clearedCategories = { ...cleared };
  }

  isCleared(terraforming, garbageParameters) {
    const surfaceResources = garbageParameters?.surfaceResources || {};
    const resourceKeys = Object.keys(surfaceResources);
    if (!resourceKeys.length) {
      return true;
    }

    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const resourcesObj = resourcesState && resourcesState.surface ? resourcesState : { surface: {} };

    let clearedCount = 0;
    for (let index = 0; index < resourceKeys.length; index += 1) {
      const resourceKey = resourceKeys[index];
      const garbageResource = resourcesObj.surface[resourceKey];
      const currentAmount = Number.isFinite(garbageResource?.value) ? garbageResource.value : 0;
      const initialAmount = Number.isFinite(garbageResource?.initialValue) ? garbageResource.initialValue : 0;
      this.markCategoryCleared(resourceKey, currentAmount, initialAmount);
      if (this.isCategoryCleared(resourceKey)) {
        clearedCount += 1;
      }
    }

    return clearedCount === resourceKeys.length;
  }

  formatGarbageResourceName(key) {
    const withSpaces = `${key}`.replace(/([A-Z])/g, ' $1');
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }

  initializeResources(terraforming, garbageParameters) {
    if (!garbageParameters || !garbageParameters.surfaceResources) {
      return;
    }

    this.resetClearedCategories();

    const surfaceResourcesConfig = isPlainObject(garbageParameters.surfaceResources)
      ? garbageParameters.surfaceResources
      : {};
    const surfaceResourceKeys = Object.keys(surfaceResourcesConfig);
    if (!surfaceResourceKeys.length) {
      return;
    }

    const initialLand = terraforming?.initialLand || 0;

    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const resourcesObj = resourcesState && resourcesState.surface ? resourcesState : null;
    if (!resourcesObj) {
      return;
    }

    let ResourceClass = null;
    try {
      ResourceClass = Resource;
    } catch (error) {
      ResourceClass = null;
    }

    let unlock = null;
    try {
      unlock = unlockResource;
    } catch (error) {
      unlock = null;
    }

    surfaceResourceKeys.forEach((resourceKey) => {
      const resourceConfig = surfaceResourcesConfig[resourceKey] || {};
      const amountMultiplier = resourceConfig.amountMultiplier || 1;
      const resourceValue = initialLand * amountMultiplier;

      if (resourcesObj.surface[resourceKey]) {
        const existingResource = resourcesObj.surface[resourceKey];
        existingResource.unlocked = true;
        if (existingResource.value === 0 && resourceValue > 0) {
          existingResource.value = resourceValue;
        }
        if (!existingResource.initialValue && resourceValue > 0) {
          existingResource.initialValue = resourceValue;
        }
        if (unlock && unlock.call) {
          unlock(existingResource);
        }
        return;
      }

      if (!ResourceClass) {
        return;
      }

      const resourceData = {
        name: resourceKey,
        displayName: this.formatGarbageResourceName(resourceKey),
        category: 'surface',
        initialValue: resourceValue,
        hasCap: false,
        unlocked: true,
        hideWhenSmall: true,
        unit: 'ton'
      };

      const newResource = new ResourceClass(resourceData);
      newResource.value = resourceValue;
      resourcesObj.surface[resourceKey] = newResource;

      if (unlock && unlock.call) {
        unlock(newResource);
      }
    });
  }

  applyEffects({ addEffect, buildings, colonies }, garbageParameters) {
    if (!garbageParameters || !garbageParameters.penalties || !garbageParameters.surfaceResources) {
      this.androidAttritionRates = {};
      return;
    }

    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const resourcesObj = resourcesState && resourcesState.surface ? resourcesState : null;
    if (!resourcesObj) {
      this.androidAttritionRates = {};
      return;
    }

    this.androidAttritionRates = {};

    let nanotech = null;
    try {
      nanotech = nanotechManager;
    } catch (error) {
      nanotech = null;
    }

    let oreScannerModule = null;
    try {
      oreScannerModule = oreScanner;
    } catch (error) {
      oreScannerModule = null;
    }

    let lifeModule = null;
    try {
      lifeModule = lifeManager;
    } catch (error) {
      lifeModule = null;
    }

    const androidResource = resourcesState?.colony?.androids || null;

    Object.keys(garbageParameters.surfaceResources).forEach((garbageResourceKey) => {
      const penalties = garbageParameters.penalties[garbageResourceKey];
      if (!penalties) {
        return;
      }

      const garbageResource = resourcesObj.surface[garbageResourceKey];
      if (!garbageResource) {
        return;
      }

      const currentAmount = Number.isFinite(garbageResource.value) ? garbageResource.value : 0;
      const initialAmount = Number.isFinite(garbageResource.initialValue) ? garbageResource.initialValue : 1;
      this.markCategoryCleared(garbageResourceKey, currentAmount, initialAmount);
      if (this.isCategoryCleared(garbageResourceKey)) {
        return;
      }
      const garbageRatio = initialAmount > 0 ? Math.min(1, Math.max(0, currentAmount / initialAmount)) : 0;

      if (penalties.sandHarvesterMultiplier !== undefined && buildings.sandQuarry) {
        const minMultiplier = Number.isFinite(penalties.sandHarvesterMultiplier) ? penalties.sandHarvesterMultiplier : 0.1;
        const productionMultiplier = 1 - garbageRatio * (1 - minMultiplier);

        addEffect({
          effectId: `garbageHazard-${garbageResourceKey}-sandHarvester`,
          target: 'building',
          targetId: 'sandQuarry',
          type: 'resourceProductionMultiplier',
          resourceCategory: 'colony',
          resourceTarget: 'silicon',
          value: productionMultiplier,
          sourceId: 'hazardPenalties',
        });
      }

      if (penalties.nanoColonyGrowthMultiplier !== undefined && nanotech) {
        const minMultiplier = Number.isFinite(penalties.nanoColonyGrowthMultiplier) ? penalties.nanoColonyGrowthMultiplier : 0.1;
        const growthMultiplier = 1 - garbageRatio * (1 - minMultiplier);

        addEffect({
          effectId: `garbageHazard-${garbageResourceKey}-nanoColony`,
          target: 'nanotechManager',
          type: 'nanoColonyGrowthMultiplier',
          value: growthMultiplier,
          sourceId: 'hazardPenalties',
        });
      }

      if (penalties.happiness !== undefined) {
        const maxPenalty = Number.isFinite(penalties.happiness) ? Math.abs(penalties.happiness) : 0.1;
        const happinessPenalty = garbageRatio * maxPenalty;

        Object.keys(colonies).forEach((colonyId) => {
          addEffect({
            effectId: `garbageHazard-${garbageResourceKey}-happiness-${colonyId}`,
            target: 'colony',
            targetId: colonyId,
            type: 'happinessPenalty',
            value: happinessPenalty,
            sourceId: 'hazardPenalties',
          });
        });
      }

      if (penalties.oreScanningSpeedMultiplier !== undefined && oreScannerModule) {
        const minMultiplier = Number.isFinite(penalties.oreScanningSpeedMultiplier) ? penalties.oreScanningSpeedMultiplier : 0.1;
        const scanningMultiplier = 1 - garbageRatio * (1 - minMultiplier);

        addEffect({
          effectId: `garbageHazard-${garbageResourceKey}-oreScanning`,
          target: 'oreScanner',
          type: 'scanningSpeedMultiplier',
          value: scanningMultiplier,
          sourceId: 'hazardPenalties',
        });
      }

      if (penalties.lifeGrowthMultiplier !== undefined && lifeModule) {
        const minMultiplier = Number.isFinite(penalties.lifeGrowthMultiplier) ? penalties.lifeGrowthMultiplier : 0.1;
        const lifeMultiplier = 1 - garbageRatio * (1 - minMultiplier);

        addEffect({
          effectId: `garbageHazard-${garbageResourceKey}-lifeGrowth`,
          target: 'lifeManager',
          type: 'lifeGrowthMultiplier',
          value: lifeMultiplier,
          sourceId: 'hazardPenalties',
        });
      }

      if (penalties.androidAttrition !== undefined && androidResource) {
        const attritionRate = Number.isFinite(penalties.androidAttrition) ? penalties.androidAttrition : 0.001;
        this.androidAttritionRates[garbageResourceKey] = garbageRatio * attritionRate;
      }
    });
  }

  update(deltaSeconds) {
    if (!this.androidAttritionRates || deltaSeconds <= 0) {
      return;
    }

    let resourcesState = null;
    try {
      resourcesState = resources;
    } catch (error) {
      resourcesState = null;
    }

    const androidResource = resourcesState?.colony?.androids;
    if (!androidResource) {
      return;
    }

    let totalAttritionRate = 0;
    Object.values(this.androidAttritionRates).forEach((rate) => {
      if (Number.isFinite(rate)) {
        totalAttritionRate += rate;
      }
    });

    if (totalAttritionRate <= 0) {
      return;
    }

    const currentAndroids = Number.isFinite(androidResource.value) ? androidResource.value : 0;
    if (currentAndroids <= 0) {
      return;
    }

    const androidLoss = currentAndroids * totalAttritionRate * deltaSeconds;
    if (androidLoss > 0) {
      androidResource.value = Math.max(0, currentAndroids - androidLoss);
      if (androidResource.modifyRate) {
        androidResource.modifyRate(-currentAndroids * totalAttritionRate, 'Radioactive Attrition', 'hazard');
      }
    }
  }
}

try {
  window.GarbageHazard = GarbageHazard;
} catch (error) {
  try {
    global.GarbageHazard = GarbageHazard;
  } catch (innerError) {
    // no-op
  }
}

try {
  module.exports = { GarbageHazard };
} catch (error) {
  // Module system not available in browser
}
