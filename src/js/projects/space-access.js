function hasIntrinsicUnlimitedSpaceAccess() {
  const worldType = currentPlanetParameters.classification?.type;
  return worldType === 'ring' || worldType === 'disk' || spaceManager.currentWorldHasOrbitalRing();
}

function getSpaceAccessProject() {
  return projectManager.projects.spaceElevator;
}

function hasBuiltSpaceAccess() {
  if (hasIntrinsicUnlimitedSpaceAccess()) {
    return true;
  }
  const project = getSpaceAccessProject();
  return project.getCompletedInstallationCount
    ? project.getCompletedInstallationCount() > 0
    : project.isCompleted || project.repeatCount > 0;
}

function getTotalSpaceAccessCapacity() {
  if (hasIntrinsicUnlimitedSpaceAccess()) {
    return Infinity;
  }
  const project = getSpaceAccessProject();
  return project.getSpaceAccessCapacity ? project.getSpaceAccessCapacity() : 0;
}

function getTotalContinuousSpaceAccessDemand() {
  let total = 0;
  for (const name in projectManager.projects) {
    const project = projectManager.projects[name];
    if (project.getSpaceAccessDemand) {
      total += Math.max(0, project.getSpaceAccessDemand());
    }
  }
  return total;
}

function getTotalContinuousSpaceAccessThroughput() {
  const demand = getTotalContinuousSpaceAccessDemand();
  const project = getSpaceAccessProject();
  if (!gameSettings.spaceAccessCapacity || !project.capThroughputToCapacity) {
    return demand;
  }
  return Math.min(demand, getTotalSpaceAccessCapacity());
}

function getSpaceAccessCoverage() {
  if (!gameSettings.spaceAccessCapacity) {
    return hasBuiltSpaceAccess() ? 1 : 0;
  }
  const capacity = getTotalSpaceAccessCapacity();
  if (capacity === Infinity) {
    return 1;
  }
  if (!(capacity > 0)) {
    return 0;
  }
  const demand = getTotalContinuousSpaceAccessDemand();
  return demand > 0 ? Math.min(1, capacity / demand) : 1;
}

function getSpaceAccessThroughputFraction(project) {
  const spaceAccessProject = getSpaceAccessProject();
  if (!gameSettings.spaceAccessCapacity || !spaceAccessProject.capThroughputToCapacity) {
    return 1;
  }
  const aerobrakingFraction = gameSettings.aerobraking
    ? project.getAerobrakingSpaceAccessBypassFraction()
    : 0;
  return aerobrakingFraction
    + (1 - aerobrakingFraction) * getSpaceAccessCoverage();
}

function getSpaceAccessBenefitFraction(project) {
  const aerobrakingFraction = gameSettings.aerobraking
    ? project.getAerobrakingSpaceAccessBypassFraction()
    : 0;
  if (!hasBuiltSpaceAccess()) {
    return aerobrakingFraction;
  }
  if (!gameSettings.spaceAccessCapacity || !project.isContinuous()) {
    return 1;
  }
  return aerobrakingFraction
    + (1 - aerobrakingFraction) * getSpaceAccessCoverage();
}

function getSpaceAccessMetalCostMultiplier(project) {
  return gameSettings.spaceAccessCapacity
    ? 1 - getSpaceAccessBenefitFraction(project)
    : 1;
}

function getSpaceAccessEnergyCostMultiplier(project) {
  if (!gameSettings.spaceAccessCapacity) {
    return 1;
  }
  const before = gameSettings.spaceshipEnergyBeforeSpaceElevatorMultiplier;
  const after = gameSettings.spaceshipEnergyAfterSpaceElevatorMultiplier;
  const coverage = getSpaceAccessBenefitFraction(project);
  return before + coverage * (after - before);
}
