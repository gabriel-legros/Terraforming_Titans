class DysonReceiver extends Building {
  getReceiverEnergyPerBuilding() {
    return this.consumption?.space?.energy || this.production?.colony?.energy || 0;
  }

  getCollectorTotals() {
    const swarm = projectManager?.projects?.dysonSwarmReceiver;
    const sphere = projectManager?.projects?.dysonSphere;
    const swarmCollectors = swarm?.collectors || 0;
    const sphereCollectors = sphere?.isCompleted ? (sphere.collectors || 0) : 0;
    const swarmEnergy = swarmCollectors * (swarm?.energyPerCollector || 0);
    const sphereEnergy = sphere?.isCompleted
      ? (sphere.getTotalCollectorPower ? sphere.getTotalCollectorPower() : sphereCollectors * (sphere?.energyPerCollector || 0))
      : 0;
    return {
      swarmCollectors,
      sphereCollectors,
      totalCollectors: swarmCollectors + sphereCollectors,
      totalEnergy: swarmEnergy + sphereEnergy,
    };
  }

  getDysonCapacity() {
    const perBuilding = this.getReceiverEnergyPerBuilding();
    if (perBuilding <= 0) {
      return 0;
    }

    const { totalEnergy } = this.getCollectorTotals();
    if (totalEnergy <= 0) {
      return 0;
    }

    return Math.max(Math.floor(totalEnergy / perBuilding), 0);
  }

  getAutoBuildMaxModeLabel() {
    return 'Dyson Capacity';
  }

  getAutoBuildMaxTargetCount() {
    return this.getDysonCapacity();
  }

  getAutoBuildMaxCount(reservePercent = 0, additionalReserves = null) {
    const base = super.getAutoBuildMaxCount(reservePercent, additionalReserves);
    if (this.autoBuildBasis !== 'max') {
      return base;
    }

    const cap = this.getDysonCapacity();
    if (cap <= 0) {
      return 0;
    }

    const remaining = Math.max(cap - this.count, 0);
    return Math.min(base, remaining);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DysonReceiver, dysonReceiver: DysonReceiver };
} else {
  if (typeof window !== 'undefined') {
    window.DysonReceiver = DysonReceiver;
    window.dysonReceiver = DysonReceiver;
  } else if (typeof global !== 'undefined') {
    global.DysonReceiver = DysonReceiver;
    global.dysonReceiver = DysonReceiver;
  }
}
