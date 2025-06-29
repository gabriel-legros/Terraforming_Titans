class SpaceMiningProject extends Project {
  renderUI(container) {
    // Uses default UI elements from projectsUI.js
  }

  updateUI() {
    // No additional UI updates
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.SpaceMiningProject = SpaceMiningProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpaceMiningProject;
}
