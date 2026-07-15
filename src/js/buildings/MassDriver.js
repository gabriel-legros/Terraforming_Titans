class MassDriver extends Building {
  isAutoActiveLocked() {
    return this.isBooleanFlagSet('autoActiveLockedByShipAutomation');
  }

  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const { targetProductivity: baseTarget } = this.computeBaseProductivity(
      resources,
      deltaTime
    );

    if (this.active === 0n) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      this.displayProductivity = 0;
      return;
    }

    if (!MassDriver.isResourceDisposalProjectActive()) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      this.displayProductivity = 0;
      return;
    }

    let targetProductivity = baseTarget;
    const maintenanceCap = gameSettings.unfulfilledMaintenancePenalties
      ? Math.max(0, Math.min(1, this.maintenanceProductivity))
      : 1;

    this.productivity = Math.min(
      this.applyProductivityDamping(
        this.productivity,
        targetProductivity,
        deltaTime
      ),
      maintenanceCap
    );
    this.displayProductivity = Math.min(
      this.applyProductivityDamping(
        this.displayProductivity,
        targetProductivity,
        deltaTime
      ),
      maintenanceCap
    );
  }

  static getResourceDisposalProject() {
    let manager;
    try {
      manager = projectManager;
    } catch (error) {
      return null;
    }

    if (!manager || !manager.projects) {
      return null;
    }

    const project = manager.projects.disposeResources;
    if (!project) {
      return null;
    }

    if (
      manager.isProjectRelevantToCurrentPlanet instanceof Function &&
      manager.isProjectRelevantToCurrentPlanet(project) === false
    ) {
      return null;
    }

    return project;
  }

  static isResourceDisposalProjectActive() {
    const project = MassDriver.getResourceDisposalProject();
    return project ? project.isActive === true : false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MassDriver };
} else {
  globalThis.MassDriver = MassDriver;
}
