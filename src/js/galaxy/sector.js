class GalaxySector {
    constructor({ q, r, control, value, originalController } = {}) {
        this.q = Number.isFinite(q) ? q : 0;
        this.r = Number.isFinite(r) ? r : 0;
        this.key = GalaxySector.createKey(this.q, this.r);
        this.ring = GalaxySector.computeRing(this.q, this.r);
        this.value = this.#sanitizeValue(value);
        this.control = {};
        this.originalController = typeof originalController === 'string' && originalController
            ? originalController
            : null;
        this.controlChangeHandler = null;
        if (control) {
            this.replaceControl(control, { suppressNotification: true });
        }
        if (!this.originalController) {
            const dominant = this.getDominantController();
            if (dominant) {
                this.originalController = dominant.factionId;
            }
        }
    }

    static createKey(q, r) {
        return `${q},${r}`;
    }

    static computeRing(q, r) {
        const s = -q - r;
        return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
    }

    replaceControl(controlMap, options = {}) {
        const before = this.getControlBreakdown();
        this.control = {};
        if (controlMap) {
            Object.entries(controlMap).forEach(([factionId, value]) => {
                this.setControl(factionId, value, { suppressNotification: true });
            });
        }
        const after = this.getControlBreakdown();
        const changed = before.length !== after.length
            || before.some((entry, index) => {
                const next = after[index];
                if (!next) {
                    return true;
                }
                return entry.factionId !== next.factionId || entry.value !== next.value;
            });
        if (changed && !options.suppressNotification) {
            this.#notifyControlChange();
        }
    }

    setValue(rawValue) {
        this.value = this.#sanitizeValue(rawValue);
    }

    getValue() {
        return this.value;
    }

    setControl(factionId, rawValue, options = {}) {
        if (!factionId) {
            return;
        }
        const existing = this.control[factionId];
        const hadEntry = Object.prototype.hasOwnProperty.call(this.control, factionId);
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value <= 0) {
            if (hadEntry) {
                delete this.control[factionId];
                if (!options.suppressNotification) {
                    this.#notifyControlChange();
                }
            }
            return;
        }
        const numericExisting = Number(existing);
        const unchanged = hadEntry && Number.isFinite(numericExisting) && numericExisting === value;
        this.control[factionId] = value;
        if (!this.originalController) {
            this.originalController = factionId;
        }
        if (!unchanged && !options.suppressNotification) {
            this.#notifyControlChange();
        }
    }

    clearControl(factionId) {
        this.setControl(factionId, 0);
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

    getTotalControlValue() {
        return Object.values(this.control).reduce((total, value) => {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue) || numericValue <= 0) {
                return total;
            }
            return total + numericValue;
        }, 0);
    }

    setControlChangeHandler(handler) {
        if (handler && handler.call) {
            this.controlChangeHandler = handler;
            return;
        }
        this.controlChangeHandler = null;
    }

    setOriginalController(factionId, { overwrite = false } = {}) {
        if (!overwrite && this.originalController) {
            return;
        }
        const candidate = typeof factionId === 'string' ? factionId.trim() : '';
        if (!candidate) {
            if (overwrite) {
                this.originalController = null;
            }
            return;
        }
        this.originalController = candidate;
    }

    getOriginalController() {
        return this.originalController;
    }

    #sanitizeValue(rawValue) {
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            return 100;
        }
        return numericValue;
    }

    #notifyControlChange() {
        const handler = this.controlChangeHandler;
        if (handler && handler.call) {
            handler(this);
        }
    }

    toJSON() {
        return {
            q: this.q,
            r: this.r,
            control: { ...this.control },
            value: this.value,
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
