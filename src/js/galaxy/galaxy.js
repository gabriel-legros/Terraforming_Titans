class GalaxyManager extends EffectableEntity {
    constructor() {
        super({ description: 'Manages the galactic view.' });
        this.enabled = false;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) {
            this.refreshUIVisibility();
            return;
        }
        this.initialized = true;
        this.refreshUIVisibility();
    }

    update(deltaMs) { // Placeholder for future logic
        void deltaMs;
    }

    enable(targetId, { autoSwitch = true } = {}) {
        if (targetId && targetId !== 'space-galaxy' && targetId !== 'galaxy') {
            return;
        }
        this.enabled = true;
        this.refreshUIVisibility();
    }

    refreshUIVisibility() {
        if (this.enabled) {
            if (typeof showSpaceGalaxyTab === 'function') {
                showSpaceGalaxyTab();
            }
            if (typeof initializeGalaxyUI === 'function') {
                initializeGalaxyUI();
            }
            if (typeof updateGalaxyUI === 'function') {
                updateGalaxyUI();
            }
        } else if (typeof hideSpaceGalaxyTab === 'function') {
            hideSpaceGalaxyTab();
        }
    }

    applyEffect(effect) {
        if (!effect) {
            return;
        }
        if (effect.type === 'unlockGalaxy') {
            const autoSwitch = effect.autoSwitch !== false;
            this.enable(effect.targetId || 'space-galaxy', { autoSwitch });
            return;
        }
        if (effect.type === 'enable') {
            this.enable(effect.targetId, { autoSwitch: effect.autoSwitch !== false });
            return;
        }
        super.applyEffect(effect);
    }

    saveState() {
        return { enabled: this.enabled };
    }

    loadState(state) {
        this.initialize();
        if (state && typeof state.enabled === 'boolean') {
            this.enabled = state.enabled;
        }
        this.refreshUIVisibility();
    }
}

if (typeof window !== 'undefined') {
    window.GalaxyManager = GalaxyManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GalaxyManager };
}
