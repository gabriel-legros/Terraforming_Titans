class ArtificialSkyProject extends Project {
  getScaledCost() {
    const scaledCost = super.getScaledCost();
    const initialLand = Math.max(terraforming.initialLand || 0, 0);
    if (scaledCost.colony && scaledCost.colony.superalloys) {
      scaledCost.colony.superalloys *= initialLand;
      if (scaledCost.colony.superalloys <= 0) {
        delete scaledCost.colony.superalloys;
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
