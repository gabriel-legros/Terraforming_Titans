class GalaxySector {
    constructor({ q, r, control } = {}) {
        this.q = Number.isFinite(q) ? q : 0;
        this.r = Number.isFinite(r) ? r : 0;
        this.key = GalaxySector.createKey(this.q, this.r);
        this.ring = GalaxySector.computeRing(this.q, this.r);
        this.control = {};
        if (control) {
            this.replaceControl(control);
        }
    }

    static createKey(q, r) {
        return `${q},${r}`;
    }

    static computeRing(q, r) {
        const s = -q - r;
        return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
    }

    replaceControl(controlMap) {
        this.control = {};
        if (!controlMap) {
            return;
        }
        Object.entries(controlMap).forEach(([factionId, value]) => {
            this.setControl(factionId, value);
        });
    }

    setControl(factionId, rawValue) {
        if (!factionId) {
            return;
        }
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value <= 0) {
            delete this.control[factionId];
            return;
        }
        this.control[factionId] = value;
    }

    clearControl(factionId) {
        if (!factionId) {
            return;
        }
        delete this.control[factionId];
    }

    getControlValue(factionId) {
        return this.control[factionId] || 0;
    }

    getDominantController() {
        const entries = Object.entries(this.control);
        if (!entries.length) {
            return null;
        }
        let bestId = '';
        let bestValue = -Infinity;
        let tie = false;
        entries.forEach(([factionId, value]) => {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue) || numericValue <= 0) {
                return;
            }
            if (numericValue > bestValue) {
                bestValue = numericValue;
                bestId = factionId;
                tie = false;
                return;
            }
            if (numericValue === bestValue) {
                tie = true;
            }
        });
        if (bestValue <= 0 || tie) {
            return null;
        }
        return { factionId: bestId, value: bestValue };
    }

    toJSON() {
        return {
            q: this.q,
            r: this.r,
            control: { ...this.control }
        };
    }
}

if (typeof window !== 'undefined') {
    window.GalaxySector = GalaxySector;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GalaxySector };
}
