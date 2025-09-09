class SolarPanel extends Building {
  build(buildCount = 1, activate = true) {
    const initialLand = (typeof terraforming !== 'undefined' && terraforming.initialLand) ? terraforming.initialLand : 0;
    const cap = initialLand * 10;
    const remaining = cap - this.count;
    if (remaining <= 0) {
      return false;
    }
    const allowed = Math.min(buildCount, remaining);
    return super.build(allowed, activate);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SolarPanel, solarPanel: SolarPanel };
} else {
  globalThis.SolarPanel = SolarPanel;
  globalThis.solarPanel = SolarPanel;
}
