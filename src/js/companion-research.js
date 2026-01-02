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
    const mirrorProject = projectManager.projects.spaceMirrorFacility;
    mirrorProject.enable();
    if (!mirrorProject.isCompleted) {
      mirrorProject.complete();
    }
    const terraformedCount = Math.floor(spaceManager.getTerraformedPlanetCount());
    const freeMirrors = Math.max(0, terraformedCount) * 1000;
    const mirrorBuilding = buildings.spaceMirror;
    mirrorBuilding.count = freeMirrors;
    mirrorBuilding.active = 0;
    mirrorBuilding.productivity = 0;
    mirrorBuilding.updateResourceStorage();
  }
}

window.applyCompanionResearchTravelRewards = applyCompanionResearchTravelRewards;
