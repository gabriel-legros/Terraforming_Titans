class SpaceDisposalProject extends SpaceExportBaseProject {}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceDisposalProject = SpaceDisposalProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceDisposalProject;
}
