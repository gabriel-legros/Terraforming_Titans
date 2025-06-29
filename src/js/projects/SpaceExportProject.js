class SpaceExportProject extends SpaceExportBaseProject {}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceExportProject = SpaceExportProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceExportProject;
}
