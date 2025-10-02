class DysonReceiver extends Building {
  updateProductivity(resources, deltaTime) {
    const { targetProductivity } = this.computeBaseProductivity(resources, deltaTime);
    if (this.active === 0) {
      this.productivity = 0;
      return;
    }
    const project = projectManager?.projects?.dysonSwarmReceiver;
    const perBuilding = this.production?.colony?.energy || 0;
    if (!project || !project.isCompleted || project.collectors <= 0 || perBuilding <= 0) {
      this.productivity = 0;
      return;
    }
    const totalEnergy = project.collectors * project.energyPerCollector;
    const maxProductivity = totalEnergy / (perBuilding * this.active);
    this.productivity = Math.min(targetProductivity, maxProductivity);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DysonReceiver, dysonReceiver: DysonReceiver };
} else {
  globalThis.DysonReceiver = DysonReceiver;
  globalThis.dysonReceiver = DysonReceiver;
}
