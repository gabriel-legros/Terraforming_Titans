class SpaceStorageProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SpaceStorageProject = SpaceStorageProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceStorageProject;
}
