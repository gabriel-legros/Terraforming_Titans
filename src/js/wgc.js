class WarpGateCommand extends EffectableEntity {
  constructor() {
    super({ description: 'Warp Gate Command manager' });
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
    if (typeof showWGCTab === 'function') {
      showWGCTab();
    }
  }

  update(_delta) {
    // placeholder for future behavior
  }

  saveState() {
    return { enabled: this.enabled };
  }

  loadState(data = {}) {
    this.enabled = data.enabled || false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WarpGateCommand };
}
