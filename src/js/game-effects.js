function applyGameEffects() {
  if (typeof applyDayNightSettingEffects === 'function') {
    applyDayNightSettingEffects();
  }
}

const DIFFICULTY_SETTINGS_EFFECT_SOURCE_ID = 'difficulty-settings';

const DIFFICULTY_SETTING_DEFINITIONS = {
  buildingCostMultiplier: { min: 0.01 },
  researchCostMultiplier: { min: 0 },
  workerRequirementMultiplier: { min: 0 },
  projectDurationMultiplier: { min: 0.01 },
  popGrowthMultiplier: { min: 0 },
  lifeGrowthMultiplier: { min: 0 },
  maintenanceCostMultiplier: { min: 0 },
  spaceshipEnergyBeforeSpaceElevatorMultiplier: { min: 0 },
  spaceshipEnergyAfterSpaceElevatorMultiplier: { min: 0 },
  advancedResearchMultiplier: { min: 0 },
  galaxyFleetCapacityMultiplier: { min: 0 },
  galaxyThreatScalingMultiplier: { min: 0 },
  artificialWorldConstructionTimeMultiplier: { min: 0.0001 },
};

function normalizeDifficultySettingValue(settingId, value) {
  const definition = DIFFICULTY_SETTING_DEFINITIONS[settingId];
  const parsed = Number(value);
  const fallback = 1;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(definition.min, parsed);
}

function normalizeDifficultySettings() {
  for (const settingId in DIFFICULTY_SETTING_DEFINITIONS) {
    gameSettings[settingId] = normalizeDifficultySettingValue(settingId, gameSettings[settingId]);
  }
}

function formatDifficultyMultiplierValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '1';
  }
  return String(parsed);
}

function isSpaceElevatorCostProfileActiveForEffects() {
  const project = projectManager?.projects?.spaceElevator;
  if (project && project.isCompleted) {
    return true;
  }
  const effects = currentPlanetParameters.effects || [];
  for (let i = 0; i < effects.length; i += 1) {
    if (effects[i].effectId === 'space-elevator-space-storage-spaceship-metal-cost') {
      return true;
    }
  }
  return false;
}

function clearDifficultySettingEffects() {
  const source = { sourceId: DIFFICULTY_SETTINGS_EFFECT_SOURCE_ID };
  globalEffects.removeEffect(source);
  if (populationModule) {
    populationModule.removeEffect(source);
  }
  if (projectManager) {
    projectManager.removeEffect(source);
    for (const id in projectManager.projects) {
      projectManager.projects[id].removeEffect(source);
    }
  }
  if (researchManager) {
    researchManager.removeEffect(source);
    researchManager.updateAllResearchCosts();
  }
  if (artificialManager) {
    artificialManager.removeEffect(source);
  }
  if (lifeManager) {
    lifeManager.removeEffect(source);
  }
  for (const id in buildings) {
    buildings[id].removeEffect(source);
  }
  for (const id in colonies) {
    colonies[id].removeEffect(source);
  }
  if (galaxyManager) {
    galaxyManager.removeEffect(source);
  }
  if (projectManager) {
    projectManager.updateProjectDurations();
  }
}

function addDifficultySettingEffect(effect) {
  addEffect({
    sourceId: DIFFICULTY_SETTINGS_EFFECT_SOURCE_ID,
    name: 'Difficulty settings',
    ...effect
  });
}

function applyDifficultySettingEffects() {
  normalizeDifficultySettings();
  clearDifficultySettingEffects();

  for (const id in buildings) {
    buildings[id].refreshDifficultyConsumption();
  }

  if (gameSettings.buildingCostMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'global',
      type: 'globalCostReduction',
      value: 1 - gameSettings.buildingCostMultiplier,
      effectId: 'difficulty-building-cost'
    });
  }
  if (gameSettings.researchCostMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'global',
      type: 'globalResearchBoost',
      value: gameSettings.researchCostMultiplier - 1,
      effectId: 'difficulty-research-multiplier'
    });
  }
  if (gameSettings.workerRequirementMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'global',
      type: 'globalWorkerReduction',
      value: 1 - gameSettings.workerRequirementMultiplier,
      effectId: 'difficulty-worker-requirement'
    });
  }
  if (gameSettings.projectDurationMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'projectManager',
      type: 'projectDurationMultiplier',
      value: gameSettings.projectDurationMultiplier,
      effectId: 'difficulty-project-duration'
    });
  }
  if (gameSettings.popGrowthMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'population',
      type: 'growthMultiplier',
      value: gameSettings.popGrowthMultiplier,
      effectId: 'difficulty-pop-growth'
    });
  }
  if (gameSettings.lifeGrowthMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'lifeManager',
      type: 'lifeGrowthMultiplier',
      value: gameSettings.lifeGrowthMultiplier,
      effectId: 'difficulty-life-growth'
    });
  }
  if (gameSettings.maintenanceCostMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'global',
      type: 'globalMaintenanceReduction',
      value: 1 - gameSettings.maintenanceCostMultiplier,
      effectId: 'difficulty-maintenance-cost'
    });
  }
  if (gameSettings.spaceshipEnergyBeforeSpaceElevatorMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'projectManager',
      type: 'spaceshipCostMultiplier',
      resourceCategory: 'colony',
      resourceId: 'energy',
      value: gameSettings.spaceshipEnergyBeforeSpaceElevatorMultiplier,
      appliesBeforeSpaceElevator: true,
      effectId: 'difficulty-spaceship-energy-before-space-elevator'
    });
  }
  if (gameSettings.spaceshipEnergyAfterSpaceElevatorMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'projectManager',
      type: 'spaceshipCostMultiplier',
      resourceCategory: 'colony',
      resourceId: 'energy',
      value: gameSettings.spaceshipEnergyAfterSpaceElevatorMultiplier,
      appliesAfterSpaceElevator: true,
      effectId: 'difficulty-spaceship-energy-after-space-elevator'
    });
  }
  if (gameSettings.advancedResearchMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'researchManager',
      type: 'advancedResearchBoost',
      value: gameSettings.advancedResearchMultiplier,
      effectId: 'difficulty-advanced-research-multiplier'
    });
  }
  if (gameSettings.galaxyFleetCapacityMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'galaxyManager',
      type: 'fleetCapacityMultiplier',
      value: gameSettings.galaxyFleetCapacityMultiplier,
      effectId: 'difficulty-galaxy-fleet-capacity'
    });
  }
  if (gameSettings.galaxyThreatScalingMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'galaxyManager',
      type: 'threatScalingMultiplier',
      value: gameSettings.galaxyThreatScalingMultiplier,
      effectId: 'difficulty-galaxy-threat-scaling'
    });
  }
  if (gameSettings.artificialWorldConstructionTimeMultiplier !== 1) {
    addDifficultySettingEffect({
      target: 'artificialManager',
      type: 'artificialWorldConstructionTimeMultiplier',
      value: gameSettings.artificialWorldConstructionTimeMultiplier,
      effectId: 'difficulty-artificial-world-construction-time'
    });
  }
  if (gameSettings.earlyAdvancedOversight) {
    addDifficultySettingEffect({
      target: 'project',
      targetId: 'spaceMirrorFacility',
      type: 'booleanFlag',
      flagId: 'advancedOversight',
      value: true,
      effectId: 'difficulty-early-advanced-oversight'
    });
  }

  if (populationModule) {
    populationModule.updateWorkerRequirements();
  }
  if (projectManager) {
    projectManager.updateProjectDurations();
  }
  if (researchManager) {
    researchManager.updateAllResearchCosts();
  }
  if (galaxyManager) {
    galaxyManager.getFactions().forEach((faction) => {
      faction.updateFleetCapacity(galaxyManager);
    });
  }
}
