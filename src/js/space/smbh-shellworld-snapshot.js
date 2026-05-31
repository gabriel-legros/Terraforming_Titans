const SMBH_SHELLWORLD_SNAPSHOT_VERSION = 1;
const SMBH_SHELLWORLD_ALLOWED_PROJECT_CATEGORIES = new Set(['resources', 'infrastructure']);
const SMBH_SHELLWORLD_ALLOWED_MEGA_PROJECTS = new Set(['megaHeatSink', 'spaceStorage']);

function cloneSmbhShellworldSnapshotData(value) {
  return JSON.parse(JSON.stringify(value));
}

function captureSmbhShellworldResourceValues() {
  const snapshot = {};
  for (const category in resources) {
    if (category === 'spaceStorage') continue;
    snapshot[category] = {};
    for (const resourceName in resources[category]) {
      if (category === 'space' && resourceName === 'energy') continue;
      if (category === 'special' && resourceName === 'alienArtifact') continue;
      snapshot[category][resourceName] = resources[category][resourceName].value || 0;
    }
  }
  return snapshot;
}

function restoreSmbhShellworldResourceValues(snapshot) {
  for (const category in snapshot || {}) {
    if (category === 'spaceStorage') continue;
    const categoryResources = resources[category];
    if (!categoryResources) continue;
    for (const resourceName in snapshot[category]) {
      if (category === 'space' && resourceName === 'energy') continue;
      if (category === 'special' && resourceName === 'alienArtifact') continue;
      const resource = categoryResources[resourceName];
      if (!resource) continue;
      const value = Math.max(Number(snapshot[category][resourceName]) || 0, 0);
      if (resource.setExactLandValue) {
        resource.setExactLandValue(value);
      } else {
        resource.value = value;
      }
    }
  }
}

function captureSmbhShellworldTerraformingValues() {
  return cloneSmbhShellworldSnapshotData(terraforming.saveState());
}

function restoreSmbhShellworldTerraformingValues(snapshot) {
  if (!snapshot) return;
  if (snapshot.initialValuesCalculated !== undefined) {
    terraforming.loadState(snapshot);
  } else if (snapshot.zonalSurface) {
    terraforming.zonalSurface = createEmptyZonalSurface();
    applyZonalSurfaceFromLegacy(terraforming.zonalSurface, { zonalSurface: snapshot.zonalSurface });
    terraforming.synchronizeGlobalResources();
  }
}

function captureSmbhShellworldStructures(collection) {
  const snapshot = {};
  for (const name in collection) {
    const structure = collection[name];
    snapshot[name] = structure.saveState();
  }
  return snapshot;
}

function restoreSmbhShellworldStructures(collection, snapshot) {
  for (const name in snapshot || {}) {
    const structure = collection[name];
    if (structure) {
      structure.loadState(snapshot[name]);
      structure.activeEffects = [];
    }
  }
}

function isSmbhShellworldSnapshotProjectAllowed(name, project) {
  const category = project.attributes?.category || projectParameters?.[name]?.category || '';
  return SMBH_SHELLWORLD_ALLOWED_PROJECT_CATEGORIES.has(category)
    || SMBH_SHELLWORLD_ALLOWED_MEGA_PROJECTS.has(name);
}

function captureSmbhShellworldSpaceStorageSettings(project) {
  const state = project.saveState();
  return {
    assignedSpaceships: state.assignedSpaceships || 0,
    autoAssignSpaceships: state.autoAssignSpaceships === true,
    waitForCapacity: state.waitForCapacity !== false,
    assignmentMultiplier: state.assignmentMultiplier || 1,
    highAgilityFreightersEnabled: state.highAgilityFreightersEnabled === true,
    autoStart: state.autoStart,
    autoStartUncheckOnTravel: state.autoStartUncheckOnTravel,
    selectedResources: state.selectedResources || [],
    expansionRecipeKey: state.expansionRecipeKey,
    megaProjectResourceMode: state.megaProjectResourceMode,
    megaProjectSpaceOnlyOnTravel: state.megaProjectSpaceOnlyOnTravel,
    resourceStrategicReserves: state.resourceStrategicReserves || {},
    waterWithdrawTarget: state.waterWithdrawTarget,
    hydrogenTransferTarget: state.hydrogenTransferTarget,
    artificialEcosystemsEnabled: state.artificialEcosystemsEnabled,
    resourceCaps: state.resourceCaps || {},
    resourceTransferWeights: state.resourceTransferWeights || {},
    resourceImportLimitRespects: state.resourceImportLimitRespects || {},
    resourceBiomassDensityWithdrawLimits: state.resourceBiomassDensityWithdrawLimits || {},
    resourcePressureWithdrawLimits: state.resourcePressureWithdrawLimits || {},
    shipTransferMode: state.shipTransferMode,
    lastUniformTransferMode: state.lastUniformTransferMode,
    resourceTransferModes: state.resourceTransferModes || {},
    shipOperationAutoStart: state.shipOperation?.autoStart === true
  };
}

function restoreSmbhShellworldSpaceStorageSettings(project, state = {}) {
  project.assignedSpaceships = Math.max(0, Math.floor(state.assignedSpaceships || 0));
  project.autoAssignSpaceships = state.autoAssignSpaceships === true;
  project.waitForCapacity = state.waitForCapacity !== false;
  project.assignmentMultiplier = Math.max(1, Math.floor(state.assignmentMultiplier || 1));
  if (project.setHighAgilityFreightersEnabled) {
    project.setHighAgilityFreightersEnabled(state.highAgilityFreightersEnabled === true);
  } else {
    project.highAgilityFreightersEnabled = state.highAgilityFreightersEnabled === true;
  }
  if (Object.prototype.hasOwnProperty.call(state, 'autoStart')) {
    project.autoStart = state.autoStart === true;
  }
  if (Object.prototype.hasOwnProperty.call(state, 'autoStartUncheckOnTravel')) {
    project.autoStartUncheckOnTravel = state.autoStartUncheckOnTravel === true;
  }
  project.selectedResources = Array.isArray(state.selectedResources)
    ? cloneSmbhShellworldSnapshotData(state.selectedResources)
    : [];
  project.expansionRecipeKey = state.expansionRecipeKey || project.expansionRecipeKey;
  if (MEGA_PROJECT_RESOURCE_MODE_MAP[state.megaProjectResourceMode]) {
    project.megaProjectResourceMode = state.megaProjectResourceMode;
  }
  project.megaProjectSpaceOnlyOnTravel = state.megaProjectSpaceOnlyOnTravel === true;
  project.resourceStrategicReserves = cloneSmbhShellworldSnapshotData(state.resourceStrategicReserves || {});
  project.sanitizeResourceStrategicReserves();
  project.waterWithdrawTarget = state.waterWithdrawTarget || 'colony';
  project.hydrogenTransferTarget = state.hydrogenTransferTarget === 'colony' ? 'colony' : 'atmospheric';
  project.artificialEcosystemsEnabled = state.artificialEcosystemsEnabled === true;
  project.resourceCaps = cloneSmbhShellworldSnapshotData(state.resourceCaps || {});
  project.sanitizeResourceCaps();
  project.resourceTransferWeights = cloneSmbhShellworldSnapshotData(state.resourceTransferWeights || {});
  project.sanitizeTransferWeights();
  project.resourceImportLimitRespects = cloneSmbhShellworldSnapshotData(state.resourceImportLimitRespects || {});
  project.sanitizeImportLimitRespects();
  project.resourceBiomassDensityWithdrawLimits = cloneSmbhShellworldSnapshotData(state.resourceBiomassDensityWithdrawLimits || {});
  project.sanitizeBiomassDensityWithdrawLimits();
  project.resourcePressureWithdrawLimits = cloneSmbhShellworldSnapshotData(state.resourcePressureWithdrawLimits || {});
  project.sanitizePressureWithdrawLimits();
  project.shipTransferMode = state.shipTransferMode || project.shipTransferMode;
  project.lastUniformTransferMode = state.lastUniformTransferMode || project.lastUniformTransferMode;
  project.resourceTransferModes = cloneSmbhShellworldSnapshotData(state.resourceTransferModes || {});
  if (project.shipTransferMode === 'store' || project.shipTransferMode === 'withdraw') {
    project.resourceTransferModes = {};
    project.lastUniformTransferMode = project.shipTransferMode;
  }
  project.shipOperationAutoStart = state.shipOperationAutoStart === true;
  project.sanitizeTransferModes();
  project.getExpansionRecipeKey();
  project.syncSpaceStorageResourceUnlocks();
  project.reconcileUsedStorage();
}

function captureSmbhShellworldProjects() {
  projectManager.normalizeImportProjectOrder();
  projectManager.normalizeGroupedProjectOrder();
  const snapshot = { projects: {}, order: [] };
  for (const name in projectManager.projects) {
    const project = projectManager.projects[name];
    if (!isSmbhShellworldSnapshotProjectAllowed(name, project)) continue;
    snapshot.projects[name] = name === 'spaceStorage'
      ? captureSmbhShellworldSpaceStorageSettings(project)
      : project.saveState();
    snapshot.order.push(name);
  }
  return snapshot;
}

function restoreSmbhShellworldProjects(snapshot) {
  const projectStates = snapshot?.projects || {};
  for (const name in projectStates) {
    const project = projectManager.projects[name];
    if (!project || !isSmbhShellworldSnapshotProjectAllowed(name, project)) continue;
    if (name === 'spaceStorage') {
      restoreSmbhShellworldSpaceStorageSettings(project, projectStates[name]);
    } else {
      project.loadState(projectStates[name]);
    }
  }
  if (Array.isArray(snapshot?.order)) {
    const restored = snapshot.order.filter((name) => projectManager.projects[name]);
    projectManager.projectOrder = restored.concat(
      projectManager.projectOrder.filter((name) => !restored.includes(name))
    );
    projectManager.normalizeImportProjectOrder();
    projectManager.normalizeGroupedProjectOrder();
  }
}

function captureSmbhShellworldResearch() {
  const snapshot = {};
  for (const category in researchManager.researches) {
    const completed = [];
    researchManager.researches[category].forEach((research) => {
      if (research.isResearched || research.timesResearched > 0) {
        completed.push({
          id: research.id,
          isResearched: true,
          timesResearched: research.timesResearched || 1
        });
      }
    });
    if (completed.length > 0) {
      snapshot[category] = completed;
    }
  }
  return { researches: snapshot };
}

function captureSmbhShellworldOrbitalAllocation() {
  followersManager.ensureTrackedOrbitals();
  return {
    enabled: followersManager.enabled,
    assignmentMode: followersManager.assignmentMode,
    assignmentStep: followersManager.assignmentStep,
    autoAssignId: followersManager.autoAssignId,
    manualAssignments: { ...followersManager.manualAssignments },
    weights: { ...followersManager.weights }
  };
}

function restoreSmbhShellworldOrbitalAllocation(snapshot) {
  if (!snapshot) return;
  followersManager.ensureTrackedOrbitals();
  followersManager.enabled = snapshot.enabled === true;
  followersManager.assignmentMode = snapshot.assignmentMode === 'weight' ? 'weight' : 'manual';
  followersManager.assignmentStep = Math.max(1, Math.floor(snapshot.assignmentStep || 1));
  followersManager.autoAssignId = snapshot.autoAssignId || null;
  const assignments = snapshot.manualAssignments || {};
  const weights = snapshot.weights || {};
  const configs = followersManager.getOrbitalConfigs();
  for (let index = 0; index < configs.length; index += 1) {
    const id = configs[index].id;
    followersManager.manualAssignments[id] = Math.max(0, Math.floor(assignments[id] || 0));
    followersManager.weights[id] = Math.max(0, Math.floor(weights[id] || 0));
    followersManager.lastProductionRates[id] = 0;
    followersManager.lastAppliedAssignments[id] = 0;
  }
  followersManager.reapplyEffects();
}

function reapplySmbhShellworldEffects() {
  reapplySharedManagerEffects({
    includeConditionalReconcile: true,
    includeStory: true,
    includeProject: true,
    includeAutomation: true,
    includePlanetParameterEffects: true,
    includeRWGEffects: true
  });
}

function captureSmbhShellworldSnapshot() {
  return {
    version: SMBH_SHELLWORLD_SNAPSHOT_VERSION,
    capturedAt: Date.now(),
    resources: captureSmbhShellworldResourceValues(),
    terraforming: captureSmbhShellworldTerraformingValues(),
    buildings: captureSmbhShellworldStructures(buildings),
    colonies: captureSmbhShellworldStructures(colonies),
    colonySliderSettings: colonySliderSettings.saveState(),
    nanotechManager: nanotechManager.saveState(),
    orbitalAllocation: captureSmbhShellworldOrbitalAllocation(),
    projects: captureSmbhShellworldProjects(),
    research: captureSmbhShellworldResearch()
  };
}

function restoreSmbhShellworldSnapshot(snapshot) {
  if (!snapshot) return false;
  researchManager.loadState(snapshot.research || {});
  projectManager.applyEffects();
  updateAllResearchButtons(researchManager.researches);
  updateAdvancedResearchVisibility();
  initializeResearchAlerts();

  restoreSmbhShellworldResourceValues(snapshot.resources);
  restoreSmbhShellworldTerraformingValues(snapshot.terraforming);
  restoreSmbhShellworldStructures(buildings, snapshot.buildings);
  restoreSmbhShellworldStructures(colonies, snapshot.colonies);
  structures = { ...buildings, ...colonies };
  colonySliderSettings.loadState(snapshot.colonySliderSettings || {});
  nanotechManager.loadState(snapshot.nanotechManager || {});
  restoreSmbhShellworldOrbitalAllocation(snapshot.orbitalAllocation);
  restoreSmbhShellworldProjects(snapshot.projects);

  reapplySmbhShellworldEffects();
  terraforming.refreshDynamicWorldGeometry(currentPlanetParameters);
  terraforming.synchronizeGlobalResources();
  reconcileLandResourceValue();
  hazardManager.syncHazardLandReservation(terraforming);
  recalculateLandUsage();
  createResourceDisplay(resources);
  createBuildingButtons(buildings);
  createColonyButtons(colonies);
  renderProjects();
  updateBuildingDisplay(buildings);
  updateBuildingDisplay(colonies);
  updateFollowersUI();
  nanotechManager.updateUI();
  return true;
}

function captureCurrentSmbhShellworldSnapshot(spaceManager) {
  const status = spaceManager.getCurrentWorldStatus();
  if (!isSupermassiveShellworldStatus(status)) return null;
  return cloneSmbhShellworldSnapshotData(captureSmbhShellworldSnapshot());
}

function restoreCurrentSmbhShellworldSnapshot(spaceManager) {
  const status = spaceManager.getCurrentWorldStatus();
  if (!isSupermassiveShellworldStatus(status) || !status.smbhSnapshot) return false;
  return restoreSmbhShellworldSnapshot(status.smbhSnapshot);
}
