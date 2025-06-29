class SpaceMiningProject extends SpaceshipProject {
  renderUI(container) {
    super.renderUI(container);
  }

  updateUI() {
    super.updateUI();
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.SpaceMiningProject = SpaceMiningProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceMiningProject;
}
