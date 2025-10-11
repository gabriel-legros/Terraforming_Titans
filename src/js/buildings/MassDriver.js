class MassDriver extends Building {
  updateProductivity(resources, deltaTime) {
    this.setAutomationActivityMultiplier(1);

    const { targetProductivity: baseTarget } = this.computeBaseProductivity(
      resources,
      deltaTime
    );

    if (this.active === 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    if (!MassDriver.isResourceDisposalProjectActive()) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    let targetProductivity = baseTarget;

    if (Math.abs(targetProductivity - this.productivity) < 0.001) {
      this.productivity = targetProductivity;
    } else {
      const difference = Math.abs(targetProductivity - this.productivity);
      const dampingFactor = difference < 0.01 ? 0.01 : 0.1;
      this.productivity +=
        dampingFactor * (targetProductivity - this.productivity);
    }
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
