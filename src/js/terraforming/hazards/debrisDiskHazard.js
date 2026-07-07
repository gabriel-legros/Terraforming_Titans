const DEBRIS_DISK_EFFECT_SOURCE_ID = 'debris-disk-hazard';
const DEBRIS_DISK_ATTRITION_LABEL = t('ui.terraforming.hazardEffects.debrisDiskAttrition', {}, 'Debris Disk Attrition');

function normalizeDebrisDiskParameters(parameters = {}) {
  const attritionRate = Number.isFinite(parameters.attritionRatePerSecond)
    ? Math.max(0, parameters.attritionRatePerSecond)
    : 0.01;
  const colonistGrowthPenalty = Number.isFinite(parameters.colonistGrowthPenalty)
    ? Math.max(0, Math.min(1, parameters.colonistGrowthPenalty))
    : 0.9;
  const debrisPerLand = Number.isFinite(parameters.debrisPerLand)
    ? Math.max(0, parameters.debrisPerLand)
    : 1e10;
  const initialDebrisTons = Number.isFinite(parameters.initialDebrisTons)
    ? Math.max(0, parameters.initialDebrisTons)
    : 0;
  return {
    debrisPerLand,
    initialDebrisTons,
    attritionRatePerSecond: attritionRate,
    colonistGrowthPenalty
  };
}

function getDebrisDiskResource() {
  return resources.special.systemDebris;
}

function isDebrisDiskRogueCleared(terraformingState) {
  return terraformingState && terraformingState.celestialParameters && terraformingState.celestialParameters.rogue === true;
}

function getDebrisDiskInitialDebris(terraformingState, parameters) {
  if (parameters.initialDebrisTons > 0) {
    return parameters.initialDebrisTons;
  }
  const initialLand = resolveWorldGeometricLand(terraformingState, resources.surface.land);
  return Math.max(0, initialLand * parameters.debrisPerLand);
}

function clampDebrisDiskRatio(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function addDebrisDiskSurfaceResource(resourceKey, amount, seconds) {
  if (!(amount > 0)) {
    return;
  }
  const resource = resources.surface[resourceKey];
  resource.unlocked = true;
  resource.increase(amount, true);
  if (seconds > 0) {
    resource.modifyRate(amount / seconds, DEBRIS_DISK_ATTRITION_LABEL, 'hazard');
  }
  try {
    unlockResource(resource);
  } catch (error) {
    // Missing UI helpers are acceptable in isolated tests.
  }
}

function getDebrisDiskSalvageTarget(category, resource) {
  const resourceData = resources[category] ? resources[category][resource] : null;
  const conversion = resourceData && resourceData.maintenanceConversion && resourceData.maintenanceConversion.surface;
  if (conversion === 'scrapMetal' || conversion === 'junk') {
    return conversion;
  }
  if (
    resource === 'metal' ||
    resource === 'components' ||
    resource === 'electronics' ||
    resource === 'superconductors' ||
    resource === 'superalloys'
  ) {
    return 'scrapMetal';
  }
  if (resource === 'glass' || resource === 'silicon' || resource === 'androids') {
    return 'junk';
  }
  return null;
}

class DebrisDiskHazard {
  constructor(manager) {
    this.manager = manager;
    this.permanentlyCleared = false;
    this.partialAttritionByStructure = {};
    this.lastAttritionLosses = 0;
    this.lastScrapMetalPerSecond = 0;
    this.lastJunkPerSecond = 0;
    this.effectsActive = false;
    this.lastGrowthMultiplier = 1;
    this.companionMirrorReleased = false;
  }

  normalize(parameters = {}) {
    return normalizeDebrisDiskParameters(parameters);
  }

  initializeResources(terraformingState, debrisDiskParameters, options = {}) {
    const parameters = this.normalize(debrisDiskParameters);
    const calculatedValue = getDebrisDiskInitialDebris(terraformingState, parameters);
    const resource = getDebrisDiskResource();
    const unlockOnly = options.unlockOnly === true;

    resource.unlocked = true;
    resource.initialValue = calculatedValue;
    if (!unlockOnly && (options.resetValue === true || resource.value === 0) && calculatedValue > 0) {
      resource.value = calculatedValue;
    }

    try {
      unlockResource(resource);
    } catch (error) {
      // Missing UI helpers are acceptable in isolated tests.
    }

    this.syncEffects(terraformingState, parameters);
  }

  save() {
    return {
      permanentlyCleared: this.permanentlyCleared,
      partialAttritionByStructure: { ...this.partialAttritionByStructure }
    };
  }

  load(data) {
    this.permanentlyCleared = Boolean(data && data.permanentlyCleared);
    this.partialAttritionByStructure = data && data.partialAttritionByStructure
      ? { ...data.partialAttritionByStructure }
      : {};
  }

  isCleared(terraformingState = null) {
    if (isDebrisDiskRogueCleared(terraformingState)) {
      this.permanentlyCleared = true;
      return true;
    }
    const resource = getDebrisDiskResource();
    const currentValue = resource.value || 0;
    this.permanentlyCleared = this.permanentlyCleared || currentValue <= 0;
    return this.permanentlyCleared;
  }

  getRemainingRatio(terraformingState = null) {
    if (this.isCleared(terraformingState)) {
      return 0;
    }
    const resource = getDebrisDiskResource();
    const initial = Math.max(resource.initialValue || 0, resource.value || 0);
    return initial > 0 ? clampDebrisDiskRatio((resource.value || 0) / initial) : 0;
  }

  getClearanceRatio(terraformingState = null) {
    return 1 - this.getRemainingRatio(terraformingState);
  }

  getCurrentAttritionRate(terraformingState, parameters) {
    return (parameters.attritionRatePerSecond || 0) * this.getRemainingRatio(terraformingState);
  }

  getCurrentGrowthMultiplier(terraformingState, parameters) {
    const penalty = (parameters.colonistGrowthPenalty || 0) * this.getRemainingRatio(terraformingState);
    return Math.max(0, 1 - penalty);
  }

  clearEffects() {
    removeEffect({ target: 'population', sourceId: DEBRIS_DISK_EFFECT_SOURCE_ID });
    removeEffect({ target: 'followersManager', sourceId: DEBRIS_DISK_EFFECT_SOURCE_ID });
    removeEffect({ target: 'project', targetId: 'lifters', sourceId: DEBRIS_DISK_EFFECT_SOURCE_ID });
    removeEffect({ target: 'building', targetId: 'dysonReceiver', sourceId: DEBRIS_DISK_EFFECT_SOURCE_ID });
    this.effectsActive = false;
    this.lastGrowthMultiplier = 1;
  }

  syncEffects(terraformingState, debrisDiskParameters) {
    const parameters = this.normalize(debrisDiskParameters);
    if (this.isCleared(terraformingState)) {
      this.clearEffects();
      return;
    }

    const growthMultiplier = this.getCurrentGrowthMultiplier(terraformingState, parameters);
    this.lastGrowthMultiplier = growthMultiplier;
    this.effectsActive = true;

    addEffect({
      target: 'population',
      type: 'growthMultiplier',
      value: growthMultiplier,
      effectId: 'debris-disk-colonist-growth',
      sourceId: DEBRIS_DISK_EFFECT_SOURCE_ID,
      name: t('ui.terraforming.hazardEffects.debrisDisk', {}, 'Debris Disk')
    });
    addEffect({
      target: 'followersManager',
      type: 'booleanFlag',
      flagId: 'disableOrbitals',
      value: true,
      effectId: 'debris-disk-disable-orbitals',
      sourceId: DEBRIS_DISK_EFFECT_SOURCE_ID
    });
    addEffect({
      target: 'project',
      targetId: 'lifters',
      type: 'booleanFlag',
      flagId: 'disableAtmosphereStripMode',
      value: true,
      effectId: 'debris-disk-disable-lifter-stripping',
      sourceId: DEBRIS_DISK_EFFECT_SOURCE_ID
    });
  }

  releaseCompanionMirrorIfReady() {
    if (this.companionMirrorReleased) {
      return;
    }
    const companionMirror = researchManager.getResearchById('companion_mirror');
    if (!companionMirror.isResearched) {
      return;
    }
    this.companionMirrorReleased = applyCompanionMirrorTravelReward(true, false);
  }

  applyAttritionToStructure(structure, structureKey, seconds, attritionRate) {
    if (!structure || !(attritionRate > 0) || !(seconds > 0)) {
      return { losses: 0, scrapMetal: 0, junk: 0 };
    }

    if (structure.count <= 10n) {
      this.partialAttritionByStructure[structureKey] = 0;
      return { losses: 0, scrapMetal: 0, junk: 0 };
    }

    const countNumber = structure.countNumber;
    const rawLoss = countNumber * attritionRate * seconds;
    const partial = this.partialAttritionByStructure[structureKey] || 0;
    const accumulated = rawLoss + partial;
    if (accumulated < 1) {
      this.partialAttritionByStructure[structureKey] = accumulated;
      return { losses: 0, scrapMetal: 0, junk: 0 };
    }

    const maxLoss = structure.count - 10n;
    let lossBigInt = Number.isFinite(accumulated)
      ? normalizeBuildingCount(Math.floor(accumulated))
      : maxLoss;
    if (lossBigInt > maxLoss) {
      lossBigInt = maxLoss;
    }
    if (lossBigInt <= 0n) {
      this.partialAttritionByStructure[structureKey] = accumulated;
      return { losses: 0, scrapMetal: 0, junk: 0 };
    }

    const inactiveAvailable = structure.count > structure.active ? structure.count - structure.active : 0n;
    const inactiveLoss = inactiveAvailable < lossBigInt ? inactiveAvailable : lossBigInt;
    const activeLoss = lossBigInt - inactiveLoss;
    structure.count -= lossBigInt;
    if (activeLoss > 0n) {
      structure.active = structure.active > activeLoss ? structure.active - activeLoss : 0n;
      structure.adjustLand(-activeLoss);
    }
    if (structure.updateResourceStorage) {
      structure.updateResourceStorage();
    }
    structure.productivity = Math.min(structure.productivity, structure.activeNumber > 0 ? structure.productivity : 0);
    structure.displayProductivity = Math.min(structure.displayProductivity, structure.activeNumber > 0 ? structure.displayProductivity : 0);

    this.partialAttritionByStructure[structureKey] = Number.isFinite(accumulated)
      ? accumulated - Math.floor(accumulated)
      : 0;

    const lossCount = Number(lossBigInt);
    const cost = structure.getBaseEffectiveCost ? structure.getBaseEffectiveCost(1) : structure.cost;
    const salvage = { losses: Number.isFinite(lossCount) ? lossCount : 0, scrapMetal: 0, junk: 0 };
    Object.keys(cost || {}).forEach((category) => {
      Object.keys(cost[category] || {}).forEach((resource) => {
        const target = getDebrisDiskSalvageTarget(category, resource);
        if (!target) {
          return;
        }
        salvage[target] += (cost[category][resource] || 0) * salvage.losses;
      });
    });
    return salvage;
  }

  applyAttrition(seconds, attritionRate) {
    let losses = 0;
    let scrapMetal = 0;
    let junk = 0;
    const applyGroup = (group, prefix) => {
      Object.keys(group).forEach((id) => {
        const result = this.applyAttritionToStructure(group[id], `${prefix}:${id}`, seconds, attritionRate);
        losses += result.losses;
        scrapMetal += result.scrapMetal;
        junk += result.junk;
      });
    };

    applyGroup(buildings, 'building');
    applyGroup(colonies, 'colony');
    addDebrisDiskSurfaceResource('scrapMetal', scrapMetal, seconds);
    addDebrisDiskSurfaceResource('junk', junk, seconds);
    this.lastAttritionLosses = losses;
    this.lastScrapMetalPerSecond = seconds > 0 ? scrapMetal / seconds : 0;
    this.lastJunkPerSecond = seconds > 0 ? junk / seconds : 0;
  }

  update(deltaSeconds, terraformingState, debrisDiskParameters) {
    const parameters = this.normalize(debrisDiskParameters);
    this.syncEffects(terraformingState, parameters);
    if (this.isCleared(terraformingState)) {
      this.lastAttritionLosses = 0;
      this.lastScrapMetalPerSecond = 0;
      this.lastJunkPerSecond = 0;
      this.releaseCompanionMirrorIfReady();
      return;
    }
    this.companionMirrorReleased = false;
    const attritionRate = this.getCurrentAttritionRate(terraformingState, parameters);
    this.applyAttrition(deltaSeconds, attritionRate);
  }
}

try {
  window.DebrisDiskHazard = DebrisDiskHazard;
} catch (error) {
  try {
    global.DebrisDiskHazard = DebrisDiskHazard;
  } catch (innerError) {
    // no-op
  }
}

try {
  module.exports = { DebrisDiskHazard, normalizeDebrisDiskParameters };
} catch (error) {
  // Module system not available in browser
}
