const DEBRIS_DISK_EFFECT_SOURCE_ID = 'debris-disk-hazard';
const DEBRIS_DISK_ATTRITION_LABEL = t('ui.terraforming.hazardEffects.debrisDiskAttrition', {}, 'Debris Disk Attrition');
const DEBRIS_DISK_PARAMETERS = terraformingParameters.hazards.debrisDisk;
const DEBRIS_DISK_STRUCTURE_MINIMUM = BigInt(DEBRIS_DISK_PARAMETERS.structureMinimum);
const DEBRIS_DISK_AEROSTAT_MINIMUM = BigInt(DEBRIS_DISK_PARAMETERS.aerostatMinimum);
const DEBRIS_DISK_COLONY_RESOURCE_MINIMUM = DEBRIS_DISK_PARAMETERS.colonyResourceMinimum;
const DEBRIS_DISK_SPACESHIP_MINING_SOURCE = t(
  'ui.projects.spaceship.rateSources.mining',
  {},
  'Spaceship Mining'
);
const DEBRIS_DISK_DEFAULT_KESSLER_REGENERATION_RATE_PER_BIN_PER_SECOND = DEBRIS_DISK_PARAMETERS.defaultKesslerRegenerationRatePerBinPerSecond;

function normalizeDebrisDiskParameters(parameters = {}) {
  const attritionRate = Number.isFinite(parameters.attritionRatePerSecond)
    ? Math.max(0, parameters.attritionRatePerSecond)
    : DEBRIS_DISK_PARAMETERS.attritionRatePerSecond;
  const colonistGrowthPenalty = Number.isFinite(parameters.colonistGrowthPenalty)
    ? Math.max(0, Math.min(1, parameters.colonistGrowthPenalty))
    : DEBRIS_DISK_PARAMETERS.colonistGrowthPenalty;
  const debrisPerLand = Number.isFinite(parameters.debrisPerLand)
    ? Math.max(0, parameters.debrisPerLand)
    : DEBRIS_DISK_PARAMETERS.debrisPerLand;
  const initialDebrisTons = Number.isFinite(parameters.initialDebrisTons)
    ? Math.max(0, parameters.initialDebrisTons)
    : DEBRIS_DISK_PARAMETERS.initialDebrisTons;
  const kesslerRegenerationRatePerBinPerSecond = Number.isFinite(parameters.kesslerRegenerationRatePerBinPerSecond)
    ? Math.max(0, parameters.kesslerRegenerationRatePerBinPerSecond)
    : DEBRIS_DISK_DEFAULT_KESSLER_REGENERATION_RATE_PER_BIN_PER_SECOND;
  return {
    debrisPerLand,
    initialDebrisTons,
    attritionRatePerSecond: attritionRate,
    colonistGrowthPenalty,
    kesslerRegenerationRatePerBinPerSecond
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

function addDebrisDiskConvertedResource(category, resourceKey, amount, seconds) {
  if (!(amount > 0)) {
    return;
  }
  const resource = resources[category][resourceKey];
  resource.unlocked = true;
  resource.increase(amount, true);
  if (seconds > 0) {
    resource.modifyRate(amount / seconds, DEBRIS_DISK_ATTRITION_LABEL, 'hazard');
  }
  unlockResource(resource);
}

function getDebrisDiskSpaceshipMiningRate(category, resourceKey) {
  const resource = resources[category] && resources[category][resourceKey];
  if (!resource || !resource.productionRateByType || !resource.productionRateByType.project) {
    return 0;
  }
  const projectRates = resource.productionRateByType.project;
  let miningRate = projectRates[DEBRIS_DISK_SPACESHIP_MINING_SOURCE] || 0;
  if (DEBRIS_DISK_SPACESHIP_MINING_SOURCE !== 'Spaceship Mining') {
    miningRate += projectRates['Spaceship Mining'] || 0;
  }
  return Math.max(0, miningRate);
}

function getDebrisDiskPositiveAccumulatedChange(accumulatedChanges, category, resourceKey) {
  return Math.max(0, accumulatedChanges?.[category]?.[resourceKey] || 0);
}

function getDebrisDiskMinedResourceAmount(category, resourceKey, seconds, accumulatedChanges) {
  const rateAmount = getDebrisDiskSpaceshipMiningRate(category, resourceKey) * seconds;
  if (!(rateAmount > 0)) {
    return 0;
  }
  const accumulatedAmount = getDebrisDiskPositiveAccumulatedChange(accumulatedChanges, category, resourceKey);
  return accumulatedAmount > 0 ? Math.min(rateAmount, accumulatedAmount) : rateAmount;
}

function getDebrisDiskPlanetaryMassImportAmount(accumulatedSpecialChanges, materialKey) {
  const imports = accumulatedSpecialChanges?.planetaryMassImports || {};
  let amount = imports[DEBRIS_DISK_SPACESHIP_MINING_SOURCE]?.materials?.[materialKey] || 0;
  if (DEBRIS_DISK_SPACESHIP_MINING_SOURCE !== 'Spaceship Mining') {
    amount += imports['Spaceship Mining']?.materials?.[materialKey] || 0;
  }
  return Math.max(0, amount);
}

function addDebrisDiskConversionSalvage(conversions, category, resource, amount) {
  const resourceData = resources[category] ? resources[category][resource] : null;
  const conversionEntries = getMaintenanceConversionEntries(resourceData);
  let added = false;
  for (let i = 0; i < conversionEntries.length; i += 1) {
    const conversion = conversionEntries[i];
    if (!resources[conversion.category] || !resources[conversion.category][conversion.resource]) {
      continue;
    }
    if (!conversions[conversion.category]) {
      conversions[conversion.category] = {};
    }
    conversions[conversion.category][conversion.resource] =
      (conversions[conversion.category][conversion.resource] || 0) + amount * conversion.value;
    added = true;
  }
  if (added) {
    return;
  }

  let fallbackResource = null;
  if (
    resource === 'metal' ||
    resource === 'components' ||
    resource === 'electronics' ||
    resource === 'superconductors' ||
    resource === 'superalloys'
  ) {
    fallbackResource = 'scrapMetal';
  } else if (resource === 'glass' || resource === 'silicon' || resource === 'androids') {
    fallbackResource = 'junk';
  }
  if (fallbackResource) {
    if (!conversions.surface) {
      conversions.surface = {};
    }
    conversions.surface[fallbackResource] = (conversions.surface[fallbackResource] || 0) + amount;
  }
}

function mergeDebrisDiskConversions(target, source) {
  Object.keys(source).forEach((category) => {
    if (!target[category]) {
      target[category] = {};
    }
    Object.keys(source[category]).forEach((resource) => {
      target[category][resource] = (target[category][resource] || 0) + source[category][resource];
    });
  });
}

function getDebrisDiskColonyResourceMinimum(resourceKey, resource) {
  let solisStorage = 0;
  const effects = resource.activeEffects || [];
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    if (effect.effectId === `solisStorage-${resourceKey}`) {
      solisStorage += effect.value || 0;
    }
  }
  const kesslerActive = hazardManager.parameters.kessler && !hazardManager.kesslerHazard.isCleared();
  if (kesslerActive && resourceKey !== 'metal' && resourceKey !== 'research') {
    solisStorage = Math.min(solisStorage, 1000);
  }
  return Math.max(DEBRIS_DISK_COLONY_RESOURCE_MINIMUM, solisStorage);
}

function getDebrisDiskStructureMinimum(structureKey) {
  return structureKey === 'colony:aerostat_colony'
    ? DEBRIS_DISK_AEROSTAT_MINIMUM
    : DEBRIS_DISK_STRUCTURE_MINIMUM;
}

class DebrisDiskHazard {
  constructor(manager) {
    this.manager = manager;
    this.permanentlyCleared = false;
    this.partialAttritionByStructure = {};
    this.lastAttritionLosses = 0;
    this.lastColonyResourceLossPerSecond = 0;
    this.lastConversionRatesPerSecond = {};
    this.effectsActive = false;
    this.lastGrowthMultiplier = 1;
    this.companionMirrorReleased = false;
    this.pendingResourceConversions = { amounts: {}, seconds: 0 };
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

  consumeSystemDebris(amount, seconds = 0, sourceName = null, rateType = 'hazard') {
    if (!(amount > 0)) {
      return 0;
    }
    const resource = getDebrisDiskResource();
    const removed = Math.min(resource.value || 0, amount);
    if (!(removed > 0)) {
      return 0;
    }
    resource.decrease(removed);
    if (seconds > 0) {
      resource.modifyRate(
        -(removed / seconds),
        sourceName || t('ui.terraforming.hazardEffects.debrisDisk', {}, 'Debris Disk'),
        rateType
      );
    }
    if ((resource.value || 0) <= 0) {
      this.permanentlyCleared = true;
    }
    return removed;
  }

  consumeMinedSystemDebris(seconds, options = {}) {
    if (!(seconds > 0)) {
      return 0;
    }
    const accumulatedChanges = options.accumulatedChanges || null;
    const accumulatedSpecialChanges = options.accumulatedSpecialChanges || null;
    const metalResourceAmount =
      getDebrisDiskMinedResourceAmount('colony', 'metal', seconds, accumulatedChanges) +
      getDebrisDiskMinedResourceAmount('spaceStorage', 'metal', seconds, accumulatedChanges);
    const siliconResourceAmount =
      getDebrisDiskMinedResourceAmount('colony', 'silicon', seconds, accumulatedChanges) +
      getDebrisDiskMinedResourceAmount('spaceStorage', 'silicon', seconds, accumulatedChanges);
    const waterMiningAmount =
      getDebrisDiskMinedResourceAmount('surface', 'ice', seconds, accumulatedChanges) +
      getDebrisDiskMinedResourceAmount('surface', 'liquidWater', seconds, accumulatedChanges) +
      getDebrisDiskMinedResourceAmount('colony', 'water', seconds, accumulatedChanges) +
      getDebrisDiskMinedResourceAmount('spaceStorage', 'liquidWater', seconds, accumulatedChanges);
    const metalPlanetaryMassAmount = Math.max(
      0,
      getDebrisDiskPlanetaryMassImportAmount(accumulatedSpecialChanges, 'metal') - metalResourceAmount
    );
    const siliconPlanetaryMassAmount = Math.max(
      0,
      getDebrisDiskPlanetaryMassImportAmount(accumulatedSpecialChanges, 'silicon') - siliconResourceAmount
    );
    const minedAmount = metalResourceAmount +
      siliconResourceAmount +
      waterMiningAmount +
      metalPlanetaryMassAmount +
      siliconPlanetaryMassAmount;
    return this.consumeSystemDebris(
      minedAmount,
      seconds,
      DEBRIS_DISK_SPACESHIP_MINING_SOURCE,
      'project'
    );
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
      return { losses: 0, conversions: {} };
    }

    const minimumCount = getDebrisDiskStructureMinimum(structureKey);
    if (structure.count <= minimumCount) {
      this.partialAttritionByStructure[structureKey] = 0;
      return { losses: 0, conversions: {} };
    }

    const countNumber = structure.countNumber;
    const rawLoss = countNumber * attritionRate * seconds;
    const partial = this.partialAttritionByStructure[structureKey] || 0;
    const accumulated = rawLoss + partial;
    if (accumulated < 1) {
      this.partialAttritionByStructure[structureKey] = accumulated;
      return { losses: 0, conversions: {} };
    }

    const maxLoss = structure.count - minimumCount;
    let lossBigInt = Number.isFinite(accumulated)
      ? normalizeBuildingCount(Math.floor(accumulated))
      : maxLoss;
    if (lossBigInt > maxLoss) {
      lossBigInt = maxLoss;
    }
    if (lossBigInt <= 0n) {
      this.partialAttritionByStructure[structureKey] = accumulated;
      return { losses: 0, conversions: {} };
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
    const salvage = { losses: Number.isFinite(lossCount) ? lossCount : 0, conversions: {} };
    Object.keys(cost || {}).forEach((category) => {
      Object.keys(cost[category] || {}).forEach((resource) => {
        addDebrisDiskConversionSalvage(salvage.conversions, category, resource, (cost[category][resource] || 0) * salvage.losses);
      });
    });
    return salvage;
  }

  applyAttritionToColonyResources(seconds, attritionRate) {
    const salvage = { resourceLoss: 0, conversions: {} };
    if (!(attritionRate > 0) || !(seconds > 0)) {
      return salvage;
    }

    Object.keys(resources.colony).forEach((resourceKey) => {
      const resource = resources.colony[resourceKey];
      if (resource.hasCap !== true) {
        return;
      }
      const currentValue = resource.value || 0;
      const minimumValue = getDebrisDiskColonyResourceMinimum(resourceKey, resource);
      const attritableValue = Math.max(0, currentValue - minimumValue);
      const loss = Math.min(attritableValue, currentValue * attritionRate * seconds);
      if (!(loss > 0)) {
        return;
      }

      resource.decrease(loss);
      resource.modifyRate(-loss / seconds, DEBRIS_DISK_ATTRITION_LABEL, 'hazard');
      addDebrisDiskConversionSalvage(salvage.conversions, 'colony', resourceKey, loss);
      salvage.resourceLoss += loss;
    });
    return salvage;
  }

  queueResourceConversions(conversions, seconds) {
    mergeDebrisDiskConversions(this.pendingResourceConversions.amounts, conversions);
    this.pendingResourceConversions.seconds += seconds > 0 ? seconds : 0;
  }

  applyPendingResourceConversions() {
    const pending = this.pendingResourceConversions;
    Object.keys(pending.amounts).forEach((category) => {
      Object.keys(pending.amounts[category]).forEach((resource) => {
        addDebrisDiskConvertedResource(category, resource, pending.amounts[category][resource], pending.seconds);
      });
    });
    pending.amounts = {};
    pending.seconds = 0;
  }

  applyAttrition(seconds, attritionRate) {
    let losses = 0;
    let colonyResourceLoss = 0;
    const conversions = {};
    const applyGroup = (group, prefix) => {
      Object.keys(group).forEach((id) => {
        const result = this.applyAttritionToStructure(group[id], `${prefix}:${id}`, seconds, attritionRate);
        losses += result.losses;
        mergeDebrisDiskConversions(conversions, result.conversions);
      });
    };

    applyGroup(buildings, 'building');
    applyGroup(colonies, 'colony');
    const colonyResourceResult = this.applyAttritionToColonyResources(seconds, attritionRate);
    colonyResourceLoss += colonyResourceResult.resourceLoss;
    mergeDebrisDiskConversions(conversions, colonyResourceResult.conversions);
    this.queueResourceConversions(conversions, seconds);
    this.lastAttritionLosses = losses;
    this.lastColonyResourceLossPerSecond = seconds > 0 ? colonyResourceLoss / seconds : 0;
    this.lastConversionRatesPerSecond = {};
    if (seconds > 0) {
      Object.keys(conversions).forEach((category) => {
        this.lastConversionRatesPerSecond[category] = {};
        Object.keys(conversions[category]).forEach((resource) => {
          this.lastConversionRatesPerSecond[category][resource] = conversions[category][resource] / seconds;
        });
      });
    }
  }

  regenerateKesslerIfPresent(terraformingState, seconds, debrisDiskParameters) {
    if (!(seconds > 0) || !this.manager.parameters.kessler) {
      return;
    }
    const regenerated = this.manager.kesslerHazard.regenerateDebrisFromDisk(
      terraformingState,
      this.manager.parameters.kessler,
      seconds,
      debrisDiskParameters.kesslerRegenerationRatePerBinPerSecond,
      getDebrisDiskResource().value || 0
    );
    this.consumeSystemDebris(
      regenerated,
      seconds,
      t('ui.terraforming.hazardEffects.debrisDiskKesslerRegeneration', {}, 'Debris Disk Regeneration'),
      'hazard'
    );
  }

  update(deltaSeconds, terraformingState, debrisDiskParameters, options = {}) {
    const parameters = this.normalize(debrisDiskParameters);
    this.syncEffects(terraformingState, parameters);
    if (this.isCleared(terraformingState)) {
      this.lastAttritionLosses = 0;
      this.lastColonyResourceLossPerSecond = 0;
      this.lastConversionRatesPerSecond = {};
      this.releaseCompanionMirrorIfReady();
      return;
    }
    this.companionMirrorReleased = false;
    this.consumeMinedSystemDebris(deltaSeconds, options);
    this.regenerateKesslerIfPresent(terraformingState, deltaSeconds, parameters);
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
