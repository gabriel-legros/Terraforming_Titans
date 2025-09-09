var oxygenFactorySettingsRef = oxygenFactorySettingsRef ||
  (typeof require !== 'undefined'
    ? require('../ghg-automation.js').oxygenFactorySettings
    : globalThis.oxygenFactorySettings);

class OxygenFactory extends Building {
  updateProductivity(resources, deltaTime) {
    const {
      targetProductivity: baseTarget,
      hasAtmosphericOversight,
      computeMaxProduction,
      solveRequired
    } = this.computeBaseProductivity(resources, deltaTime);

    if (this.active === 0) {
      this.productivity = 0;
      return;
    }

    let targetProductivity = baseTarget;

    if (
      hasAtmosphericOversight &&
      oxygenFactorySettingsRef.autoDisableAbovePressure &&
      terraforming &&
      resources.atmospheric?.oxygen &&
      typeof calculateAtmosphericPressure === 'function'
    ) {
      const oxygen = resources.atmospheric.oxygen;
      const targetPa = oxygenFactorySettingsRef.disablePressureThreshold * 1000;
      const currentPa = calculateAtmosphericPressure(
        oxygen.value,
        terraforming.celestialParameters.gravity,
        terraforming.celestialParameters.radius
      );
      if (currentPa >= targetPa) {
        this.productivity = 0;
        return;
      }
      const maxProduction = computeMaxProduction('atmospheric', 'oxygen');
      if (maxProduction > 0) {
        const originalAmount = oxygen.value;
        const required = solveRequired((added) => {
          return (
            calculateAtmosphericPressure(
              originalAmount + added,
              terraforming.celestialParameters.gravity,
              terraforming.celestialParameters.radius
            ) - targetPa
          );
        }, maxProduction);
        this.productivity = Math.min(
          targetProductivity,
          required / maxProduction
        );
        return;
      }
    }

    if (Math.abs(targetProductivity - this.productivity) < 0.001) {
      this.productivity = targetProductivity;
    } else {
      const difference = Math.abs(targetProductivity - this.productivity);
      const dampingFactor = difference < 0.01 ? 0.01 : 0.1;
      this.productivity +=
        dampingFactor * (targetProductivity - this.productivity);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OxygenFactory };
} else {
  globalThis.OxygenFactory = OxygenFactory;
}
