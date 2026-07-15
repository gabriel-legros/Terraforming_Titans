function applyCompanionResearchTravelRewards() {
  const companionSatellite = researchManager.getResearchById('companion_satellite');
  if (companionSatellite.isResearched) {
    const count = Math.floor(spaceManager.getTerraformedPlanetCount());
    const proj = projectManager.projects.satellite;
    proj.repeatCount = Math.min(count, proj.maxRepeatCount);
    proj.update(0);
  }

  const companionMirror = researchManager.getResearchById('companion_mirror');
  if (companionMirror.isResearched) {
    applyCompanionMirrorTravelReward();
  }
}

function isCompanionMirrorBlockedByDebrisDisk() {
  const hazards = currentPlanetParameters.hazards;
  const celestial = currentPlanetParameters.celestialParameters;
  return hazards && hazards.debrisDisk && (!celestial || celestial.rogue !== true);
}

function applyCompanionMirrorTravelReward(ignoreDebrisDiskBlock = false, resetMirrorState = true) {
  if (!ignoreDebrisDiskBlock && isCompanionMirrorBlockedByDebrisDisk()) {
    return false;
  }

  const stellarEngine = projectManager.projects.stellarEngine;
  if (stellarEngine.isSpaceMirrorFacilityLocked()) {
    return false;
  }

  const mirrorProject = projectManager.projects.spaceMirrorFacility;
  if (mirrorProject.isPermanentlyDisabled()) {
    return false;
  }
  mirrorProject.enable();
  if (!mirrorProject.isCompleted) {
    mirrorProject.complete();
  }
  const terraformedCount = Math.floor(spaceManager.getTerraformedPlanetCount());
  const freeMirrors = Math.max(0, terraformedCount) * 1000;
  const mirrorBuilding = buildings.spaceMirror;
  mirrorBuilding.count = freeMirrors;
  if (resetMirrorState) {
    mirrorBuilding.active = 0;
    mirrorBuilding.productivity = 0;
  }
  mirrorBuilding.updateResourceStorage();
  return true;
}

window.applyCompanionResearchTravelRewards = applyCompanionResearchTravelRewards;
window.applyCompanionMirrorTravelReward = applyCompanionMirrorTravelReward;
