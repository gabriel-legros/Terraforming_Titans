var ghgFactorySettingsRef = ghgFactorySettingsRef ||
  (typeof require !== 'undefined'
    ? require('../ghg-automation.js').ghgFactorySettings
    : globalThis.ghgFactorySettings);

class GhgFactory extends Building {
  updateProductivity(resources, deltaTime) {
    const {
      targetProductivity,
      hasAtmosphericOversight,
      computeMaxProduction,
      solveRequired
    } = this.computeBaseProductivity(resources, deltaTime);

    if (this.active === 0) {
      this.productivity = 0;
      return;
    }

    if (
      hasAtmosphericOversight &&
      ghgFactorySettingsRef.autoDisableAboveTemp &&
      terraforming && terraforming.temperature
    ) {
      const A = ghgFactorySettingsRef.disableTempThreshold;
      let B = ghgFactorySettingsRef.reverseTempThreshold ?? A + 5;
      if (B - A < 1) {
        B = A + 1;
        ghgFactorySettingsRef.reverseTempThreshold = B;
      }
      const currentTemp = terraforming.temperature.value;
      let recipeKey = this.currentRecipeKey || 'ghg';
      let resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';

      if (!this.reversalAvailable) {
        const targetTemp = A;
        if (currentTemp >= targetTemp) {
          this.productivity = 0;
          return;
        }
        if (
          typeof terraforming.updateSurfaceTemperature === 'function' &&
          resources?.atmospheric?.[resourceName]
        ) {
          const maxProduction = computeMaxProduction('atmospheric', resourceName);
          if (maxProduction > 0) {
            const res = resources.atmospheric[resourceName];
            const originalAmount = res.value;
            const required = solveRequired((added) => {
              res.value = originalAmount + added;
              terraforming.updateSurfaceTemperature();
              const diff = terraforming.temperature.value - targetTemp;
              res.value = originalAmount;
              terraforming.updateSurfaceTemperature();
              return diff;
            }, maxProduction);
            this.reverseEnabled = false;
            this.productivity = Math.min(targetProductivity, required / maxProduction);
            return;
          }
        }
      } else {
        if (currentTemp > A && currentTemp < B) {
          this.productivity = 0;
          return;
        }
        let reverse =
          (recipeKey === 'ghg' && currentTemp >= B) ||
          (recipeKey === 'calcite' && currentTemp <= A);

        if (reverse) {
          const resObj = resources?.atmospheric?.[resourceName];
          const available = resObj ? resObj.value || 0 : 0;
          if (available <= 0 && typeof this._toggleRecipe === 'function') {
            this._toggleRecipe();
            recipeKey = this.currentRecipeKey || 'ghg';
            resourceName = recipeKey === 'calcite' ? 'calciteAerosol' : 'greenhouseGas';
            reverse =
              (recipeKey === 'ghg' && currentTemp >= B) ||
              (recipeKey === 'calcite' && currentTemp <= A);
          }
        }

        const targetTemp = reverse ? (recipeKey === 'ghg' ? B : A) : (recipeKey === 'ghg' ? A : B);
        if (
          typeof terraforming.updateSurfaceTemperature === 'function' &&
          resources?.atmospheric?.[resourceName]
        ) {
          const maxProduction = computeMaxProduction('atmospheric', resourceName);
          if (maxProduction > 0) {
            const res = resources.atmospheric[resourceName];
            const originalAmount = res.value;
            const required = solveRequired((amt) => {
              res.value = originalAmount + (reverse ? -amt : amt);
              terraforming.updateSurfaceTemperature();
              const diff = terraforming.temperature.value - targetTemp;
              res.value = originalAmount;
              terraforming.updateSurfaceTemperature();
              return diff;
            }, maxProduction);
            this.reverseEnabled = reverse;
            this.productivity = Math.min(targetProductivity, required / maxProduction);
            return;
          }
        }
      }
    }

    if (Math.abs(targetProductivity - this.productivity) < 0.001) {
      this.productivity = targetProductivity;
    } else {
      const difference = Math.abs(targetProductivity - this.productivity);
      const dampingFactor = difference < 0.01 ? 0.01 : 0.1;
      this.productivity += dampingFactor * (targetProductivity - this.productivity);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GhgFactory };
} else {
  globalThis.GhgFactory = GhgFactory;
}
