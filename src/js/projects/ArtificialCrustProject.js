const ARTIFICIAL_CRUST_SEGMENT_AREA_M2 = 1e11;
const ARTIFICIAL_CRUST_REFERENCE_SURFACE_AREA_M2 = 4 * Math.PI * Math.pow(6371000, 2);

class ArtificialCrustProject extends ArtificialSkyProject {
  getCostRateLabel() {
    return 'Artificial Crust';
  }

  getBaseCoreHeatFlux() {
    const params = currentPlanetParameters?.celestialParameters || terraforming?.celestialParameters || {};
    return Math.max(0, params.coreHeatFlux || 0);
  }

  isRelevantToCurrentPlanet() {
    return this.getBaseCoreHeatFlux() > 0;
  }

  getSurfaceArea() {
    return Math.max(terraforming?.celestialParameters?.surfaceArea || currentPlanetParameters?.celestialParameters?.surfaceArea || 0, 0);
  }

  getAreaRatio() {
    return this.getSurfaceArea() / ARTIFICIAL_CRUST_REFERENCE_SURFACE_AREA_M2;
  }

  getMaxRepeats() {
    const segments = Math.max(1, Math.ceil(this.getSurfaceArea() / ARTIFICIAL_CRUST_SEGMENT_AREA_M2));
    this.maxRepeatCount = segments;
    return segments;
  }

  getFullBuildCost() {
    const baseCost = Project.prototype.getScaledCost.call(this);
    const fullCost = {};
    const areaRatio = this.getAreaRatio();

    for (const category in baseCost) {
      fullCost[category] = {};
      for (const resource in baseCost[category]) {
        const scaled = baseCost[category][resource] * areaRatio;
        if (scaled > 0) {
          fullCost[category][resource] = scaled;
        }
      }
      if (!Object.keys(fullCost[category]).length) {
        delete fullCost[category];
      }
    }

    return fullCost;
  }

  applyArtificialSkyCompletionEffects() {}
}

try {
  window.ArtificialCrustProject = ArtificialCrustProject;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = ArtificialCrustProject;
} catch (error) {
  // Module system not available in browser
}
