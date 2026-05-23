const SMBH_SHELLWORLD_SNAPSHOT_VERSION = 1;
const SMBH_SHELLWORLD_ALLOWED_PROJECT_CATEGORIES = new Set(['resources', 'infrastructure']);
const SMBH_SHELLWORLD_ALLOWED_MEGA_PROJECTS = new Set(['megaHeatSink']);

function cloneSmbhShellworldSnapshotData(value) {
  return JSON.parse(JSON.stringify(value));
}

function captureSmbhShellworldResourceValues() {
  const snapshot = {};
  for (const category in resources) {
    snapshot[category] = {};
    for (const resourceName in resources[category]) {
      snapshot[category][resourceName] = resources[category][resourceName].value || 0;
    }
  }
  return snapshot;
}

function restoreSmbhShellworldResourceValues(snapshot) {
  for (const category in snapshot || {}) {
    const categoryResources = resources[category];
    if (!categoryResources) continue;
    for (const resourceName in snapshot[category]) {
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

function captureSmbhShellworldProjects() {
  projectManager.normalizeImportProjectOrder();
  projectManager.normalizeGroupedProjectOrder();
  const snapshot = { projects: {}, order: [] };
  for (const name in projectManager.projects) {
    const project = projectManager.projects[name];
    if (!isSmbhShellworldSnapshotProjectAllowed(name, project)) continue;
    snapshot.projects[name] = project.saveState();
    snapshot.order.push(name);
  }
  return snapshot;
}

function restoreSmbhShellworldProjects(snapshot) {
  const projectStates = snapshot?.projects || {};
  for (const name in projectStates) {
    const project = projectManager.projects[name];
    if (!project || !isSmbhShellworldSnapshotProjectAllowed(name, project)) continue;
    project.loadState(projectStates[name]);
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

function captureSmbhShellworldSnapshot() {
  return {
    version: SMBH_SHELLWORLD_SNAPSHOT_VERSION,
    capturedAt: Date.now(),
    resources: captureSmbhShellworldResourceValues(),
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
  restoreSmbhShellworldStructures(buildings, snapshot.buildings);
  restoreSmbhShellworldStructures(colonies, snapshot.colonies);
  structures = { ...buildings, ...colonies };
  colonySliderSettings.loadState(snapshot.colonySliderSettings || {});
  nanotechManager.loadState(snapshot.nanotechManager || {});
  restoreSmbhShellworldOrbitalAllocation(snapshot.orbitalAllocation);
  restoreSmbhShellworldProjects(snapshot.projects);

  projectManager.applyEffects();
  terraforming.refreshDynamicWorldGeometry(currentPlanetParameters);
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
