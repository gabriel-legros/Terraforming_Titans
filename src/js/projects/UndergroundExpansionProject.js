class UndergroundExpansionProject extends AndroidProject {
  getScaledCost() {
    const cost = super.getScaledCost();
    const land = (resources?.surface?.land?.value) || 0;
    if (!land) {
      return cost;
    }
    const scaledCost = {};
    for (const category in cost) {
      scaledCost[category] = {};
      for (const resource in cost[category]) {
        scaledCost[category][resource] = cost[category][resource] * land;
      }
    }
    return scaledCost;
  }

  complete() {
    super.complete();
    // Completion effect to increase land will be implemented later.
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.UndergroundExpansionProject = UndergroundExpansionProject;
}

if (typeof module !== 'undefined') {
  module.exports = UndergroundExpansionProject;
}
