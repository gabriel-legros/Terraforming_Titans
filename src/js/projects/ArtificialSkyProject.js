class ArtificialSkyProject extends Project {
  getScaledCost() {
    const scaledCost = super.getScaledCost();
    const initialLand = Math.max(terraforming.initialLand || 0, 0);
    if (scaledCost.colony) {
      const scaledResources = ['superalloys', 'water', 'metal'];
      for (let index = 0; index < scaledResources.length; index += 1) {
        const resource = scaledResources[index];
        if (!scaledCost.colony[resource]) {
          continue;
        }
        scaledCost.colony[resource] *= initialLand;
        if (scaledCost.colony[resource] <= 0) {
          delete scaledCost.colony[resource];
        }
      }
      if (!Object.keys(scaledCost.colony).length) {
        delete scaledCost.colony;
      }
    }
    return scaledCost;
  }
}

try {
  window.ArtificialSkyProject = ArtificialSkyProject;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = ArtificialSkyProject;
} catch (error) {
  // Module system not available in browser
}
