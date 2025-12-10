class DysonManager {
  getSwarmProject() {
    return projectManager?.projects?.dysonSwarmReceiver || null;
  }

  getSphereProject() {
    return projectManager?.projects?.dysonSphere || null;
  }

  getSwarmCollectorCount() {
    return this.getSwarmProject()?.collectors || 0;
  }

  getSphereCollectorCount() {
    return this.getSphereProject()?.collectors || 0;
  }

  getCollectorCount() {
    return this.getSwarmCollectorCount() + this.getSphereCollectorCount();
  }

  getEnergyPerCollector() {
    return this.getSwarmProject()?.energyPerCollector || 0;
  }

  getSwarmEnergyPerSecond() {
    const collectors = this.getSwarmCollectorCount();
    const perCollector = this.getEnergyPerCollector();
    return Math.max(collectors * perCollector, 0);
  }

  getSphereEnergyPerCollector() {
    return this.getSphereProject()?.energyPerCollector || 0;
  }

  getSphereEnergyPerSecond() {
    const collectors = this.getSphereCollectorCount();
    const perCollector = this.getSphereEnergyPerCollector();
    return Math.max(collectors * perCollector, 0);
  }

  getTotalCollectorEnergyPerSecond() {
    return this.getSwarmEnergyPerSecond() + this.getSphereEnergyPerSecond();
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
    const receiverUsage = this.getReceiverEnergyPerSecond();
    return Math.max(this.getTotalCollectorEnergyPerSecond() - receiverUsage, 0);
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
