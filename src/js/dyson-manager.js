class DysonManager {
  getSwarmProject() {
    return projectManager?.projects?.dysonSwarmReceiver || null;
  }

  getCollectorCount() {
    return this.getSwarmProject()?.collectors || 0;
  }

  getEnergyPerCollector() {
    return this.getSwarmProject()?.energyPerCollector || 0;
  }

  getSwarmEnergyPerSecond() {
    const collectors = this.getCollectorCount();
    const perCollector = this.getEnergyPerCollector();
    return Math.max(collectors * perCollector, 0);
  }

  getReceiverBuilding() {
    return buildings?.dysonReceiver || null;
  }

  getReceiverEnergyPerSecond() {
    const receiver = this.getReceiverBuilding();
    const perBuilding = receiver?.production?.colony?.energy || 0;
    const activeCount = receiver?.active || 0;
    const productivity = receiver?.productivity ?? 0;
    return Math.max(perBuilding * activeCount * Math.max(productivity, 0), 0);
  }

  getOverflowEnergyPerSecond() {
    const swarmEnergy = this.getSwarmEnergyPerSecond();
    const receiverUsage = this.getReceiverEnergyPerSecond();
    return Math.max(swarmEnergy - receiverUsage, 0);
  }
}

const dysonManager = new DysonManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = dysonManager;
  module.exports.DysonManager = DysonManager;
}

if (typeof window !== 'undefined') {
  window.DysonManager = DysonManager;
  window.dysonManager = dysonManager;
} else if (typeof global !== 'undefined') {
  global.DysonManager = DysonManager;
  global.dysonManager = dysonManager;
}
