class GalaxySector {
    constructor({ q, r, control, originalController } = {}) {
        this.q = Number.isFinite(q) ? q : 0;
        this.r = Number.isFinite(r) ? r : 0;
        this.key = GalaxySector.createKey(this.q, this.r);
        this.ring = GalaxySector.computeRing(this.q, this.r);
        this.originalController = null;
        if (originalController || originalController === 0) {
            const value = `${originalController}`;
            this.originalController = value ? value : null;
        }
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
        if (!this.originalController) {
            this.originalController = `${factionId}`;
        }
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

    getControlBreakdown() {
        const entries = Object.entries(this.control);
        if (!entries.length) {
            return [];
        }
        const sanitized = [];
        entries.forEach(([factionId, value]) => {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue) || numericValue <= 0 || !factionId) {
                return;
            }
            sanitized.push({ factionId, value: numericValue });
        });
        if (sanitized.length <= 1) {
            return sanitized;
        }
        sanitized.sort((left, right) => {
            if (right.value === left.value) {
                return left.factionId.localeCompare(right.factionId);
            }
            return right.value - left.value;
        });
        return sanitized;
    }

    getControlLeaders(limit = 2) {
        const breakdown = this.getControlBreakdown();
        const numericLimit = Number(limit);
        if (!Number.isFinite(numericLimit) || numericLimit <= 0 || breakdown.length <= numericLimit) {
            return breakdown;
        }
        return breakdown.slice(0, numericLimit);
    }

    toJSON() {
        return {
            q: this.q,
            r: this.r,
            control: { ...this.control },
            originalController: this.originalController
        };
    }
}

if (typeof window !== 'undefined') {
    window.GalaxySector = GalaxySector;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GalaxySector };
}
