class ArtificialManager extends EffectableEntity {
    constructor() {
        super({ description: 'Manages artificial constructs' });
        this.enabled = false;
    }

    enable() {
        if (this.enabled) {
            return;
        }
        this.enabled = true;
        this.updateUI(true);
    }

    disable() {
        if (!this.enabled) {
            return;
        }
        this.enabled = false;
        this.updateUI(true);
    }

    update(delta) {
        if (!this.enabled) {
            return;
        }
        this.updateUI();
    }

    applyEffect(effect) {
        if (!effect) {
            return;
        }
        if (effect.type === 'enable') {
            this.enable(effect.targetId);
            return;
        }
        super.applyEffect(effect);
    }

    updateUI(force = false) {
        const updateFn = (typeof updateArtificialUI === 'function') ? updateArtificialUI : null;
        if (updateFn) {
            updateFn({ force });
        }
    }
}

function setArtificialManager(instance) {
    artificialManager = instance;

    if (typeof window !== 'undefined') {
        window.artificialManager = artificialManager;
    } else if (typeof global !== 'undefined') {
        global.artificialManager = artificialManager;
    }

    return artificialManager;
}

if (typeof window !== 'undefined') {
    window.ArtificialManager = ArtificialManager;
    window.setArtificialManager = setArtificialManager;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ArtificialManager, setArtificialManager };
}
