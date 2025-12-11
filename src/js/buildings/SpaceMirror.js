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

class SpaceMirror extends MirrorLanternBase {
  constructor(config, buildingName) {
    super(config, buildingName);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SpaceMirror };
} else if (typeof window !== 'undefined') {
  window.SpaceMirror = SpaceMirror;
}
