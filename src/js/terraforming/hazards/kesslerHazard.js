const SOLIS_RESOURCE_CAP = 1000;
const SOLIS_WATER_KEEP = 1000;
const SOLIS_CAPPED_RESOURCES = ['food', 'components', 'electronics', 'glass', 'androids'];
const SMALL_PROJECT_BASE_SUCCESS = 0.5;
const LARGE_PROJECT_BASE_SUCCESS = 0.95;

function normalizeKesslerParameters(parameters = {}) {
  return {
    orbitalDebrisPerLand: parameters.orbitalDebrisPerLand ?? 100
  };
}

class KesslerHazard {
  constructor(manager) {
    this.manager = manager;
    this.permanentlyCleared = false;
  }

  normalize(parameters = {}) {
    return normalizeKesslerParameters(parameters);
  }

  initializeResources(terraforming, kesslerParameters, options = {}) {
    const perLand = kesslerParameters.orbitalDebrisPerLand;
    const initialLand = terraforming.initialLand;
    const calculatedValue = initialLand * perLand;
    const resource = resources.surface.orbitalDebris;
    const unlockOnly = options.unlockOnly === true;

    resource.unlocked = true;
    resource.initialValue = calculatedValue;
    if (!unlockOnly && resource.value === 0 && calculatedValue > 0) {
      resource.value = calculatedValue;
    }

    try {
      unlockResource(resource);
    } catch (error) {
      // ignore missing UI helpers in tests
    }
  }

  isCleared() {
    const debris = resources.surface.orbitalDebris;
    const currentValue = debris.value || 0;
    this.permanentlyCleared = this.permanentlyCleared || currentValue <= 0;
    return this.permanentlyCleared;
  }

  save() {
    return {
      permanentlyCleared: this.permanentlyCleared
    };
  }

  load(data) {
    this.permanentlyCleared = Boolean(data && data.permanentlyCleared);
  }

  applySolisTravelAdjustments(terraforming) {
    try {
      if (globalGameIsLoadingFromSave) {
        return;
      }
    } catch (error) {
      // ignore missing globals in tests
    }

    const waterResource = resources.colony.water;
    const totalWater = waterResource.value;
    const keptWater = Math.min(totalWater, SOLIS_WATER_KEEP);
    const excessWater = totalWater - keptWater;

    waterResource.value = keptWater;
    waterResource.activeEffects = waterResource.activeEffects.filter((effect) => effect.effectId !== 'solisStorage-water');
    waterResource.updateStorageCap();

    if (excessWater > 0) {
      const surfaceWater = resources.surface.liquidWater;
      ZONES.forEach((zone) => {
        const zoneShare = excessWater * getZonePercentage(zone);
        terraforming.zonalSurface[zone].liquidWater += zoneShare;
      });

      terraforming.synchronizeGlobalResources();
      terraforming._updateZonalCoverageCache();
      surfaceWater.unlocked = true;
      try {
        unlockResource(surfaceWater);
      } catch (error) {
        // ignore missing UI helpers in tests
      }
    }

    SOLIS_CAPPED_RESOURCES.forEach((resourceKey) => {
      const resource = resources.colony[resourceKey];
      if (resource.value > SOLIS_RESOURCE_CAP) {
        resource.value = SOLIS_RESOURCE_CAP;
      }
    });
  }

  getProjectFailureChances() {
    const debris = resources.surface.orbitalDebris;
    const initialAmount = debris.initialValue || 0;
    const currentAmount = debris.value || 0;
    const ratio = initialAmount ? currentAmount / initialAmount : 0;
    const smallSuccess = Math.pow(SMALL_PROJECT_BASE_SUCCESS, ratio);
    const largeSuccess = Math.pow(LARGE_PROJECT_BASE_SUCCESS, ratio);
    return {
      smallFailure: 1 - smallSuccess,
      largeFailure: 1 - largeSuccess,
      smallSuccess,
      largeSuccess
    };
  }
}

try {
  window.KesslerHazard = KesslerHazard;
} catch (error) {
  try {
    global.KesslerHazard = KesslerHazard;
  } catch (innerError) {
    // no-op
  }
}

try {
  module.exports = { KesslerHazard };
} catch (error) {
  // Module system not available in browser
}
