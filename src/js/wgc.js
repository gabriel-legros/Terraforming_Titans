class WarpGateCommand extends EffectableEntity {
  constructor() {
    super({ description: 'Warp Gate Command manager' });
    this.enabled = false;
    this.rdUpgrades = {
      wgtEquipment: { purchases: 0 },
      componentsEfficiency: { purchases: 0, max: 400 },
      electronicsEfficiency: { purchases: 0, max: 400 },
      superconductorEfficiency: { purchases: 0, max: 400 },
      androidsEfficiency: { purchases: 0, max: 400 },
    };
  }

  enable() {
    this.enabled = true;
    if (typeof showWGCTab === 'function') {
      showWGCTab();
    }
  }

  getUpgradeCost(key) {
    const up = this.rdUpgrades[key];
    return up ? up.purchases + 1 : 0;
  }

  getMultiplier(key) {
    const up = this.rdUpgrades[key];
    if (!up) return 1;
    return 1 + (up.purchases / 100);
  }

  purchaseUpgrade(key) {
    const up = this.rdUpgrades[key];
    if (!up) return false;
    if (up.max && up.purchases >= up.max) return false;
    const cost = this.getUpgradeCost(key);
    const art = resources && resources.special && resources.special.alienArtifact;
    if (!art || art.value < cost) return false;
    if (typeof art.decrease === 'function') art.decrease(cost);
    up.purchases += 1;
    this.applyUpgradeEffect(key);
    return true;
  }

  applyUpgradeEffect(key) {
    const mult = this.getMultiplier(key);
    const effectId = `wgc-${key}`;
    const mapping = {
      componentsEfficiency: 'componentFactory',
      electronicsEfficiency: 'electronicsFactory',
      superconductorEfficiency: 'superconductorFactory',
      androidsEfficiency: 'androidFactory',
    };
    if (mapping[key]) {
      addEffect({
        target: 'building',
        targetId: mapping[key],
        type: 'productionMultiplier',
        value: mult,
        effectId,
        sourceId: 'wgcRD'
      });
    }
  }

  reapplyEffects() {
    for (const key in this.rdUpgrades) {
      if (this.rdUpgrades[key].purchases > 0) {
        this.applyUpgradeEffect(key);
      }
    }
  }

  update(_delta) {
    // placeholder for future behavior
  }

  saveState() {
    return {
      enabled: this.enabled,
      upgrades: Object.keys(this.rdUpgrades).reduce((o, k) => {
        o[k] = this.rdUpgrades[k].purchases;
        return o;
      }, {}),
    };
  }

  loadState(data = {}) {
    this.enabled = data.enabled || false;
    if (data.upgrades) {
      for (const k in data.upgrades) {
        if (this.rdUpgrades[k]) {
          this.rdUpgrades[k].purchases = data.upgrades[k];
        }
      }
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WarpGateCommand };
}
