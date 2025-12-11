var MirrorLanternBase = typeof MirrorLanternBuilding !== 'undefined' ? MirrorLanternBuilding : null;
if (!MirrorLanternBase && typeof require === 'function') {
  ({ MirrorLanternBuilding: MirrorLanternBase } = require('./MirrorLanternBuilding.js'));
}
if (!MirrorLanternBase && typeof window !== 'undefined') {
  MirrorLanternBase = window.MirrorLanternBuilding;
}
if (!MirrorLanternBase) {
  MirrorLanternBase = Building;
}

class HyperionLantern extends MirrorLanternBase {
  constructor(config, buildingName) {
    super(config, buildingName);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HyperionLantern };
} else if (typeof window !== 'undefined') {
  window.HyperionLantern = HyperionLantern;
}
