class GalaxySector {
    constructor({ q, r, control, value, defaultValue, reward } = {}) {
        this.q = Number.isFinite(q) ? q : 0;
        this.r = Number.isFinite(r) ? r : 0;
        this.key = GalaxySector.createKey(this.q, this.r);
        this.ring = GalaxySector.computeRing(this.q, this.r);
        this.defaultValue = this.#sanitizeValue(defaultValue);
        this.value = this.#sanitizeValue(value, this.defaultValue);
        this.control = {};
        this.reward = this.#sanitizeReward(reward);
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

    static #directions() {
        return [
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: 1, r: 0 },
            { q: 1, r: -1 }
        ];
    }

    static #computeRingIndex(q, r, ring) {
        if (ring === 0) {
            return 0;
        }
        let currentQ = ring;
        let currentR = 0;
        let index = 0;
        if (currentQ === q && currentR === r) {
            return index;
        }
        const directions = GalaxySector.#directions();
        for (let side = 0; side < directions.length; side += 1) {
            const dir = directions[side];
            for (let step = 0; step < ring; step += 1) {
                currentQ += dir.q;
                currentR += dir.r;
                index += 1;
                if (currentQ === q && currentR === r) {
                    return index;
                }
            }
        }
        return index % (ring * 6);
    }

    static formatDisplayName(q, r) {
        if (!Number.isFinite(q) || !Number.isFinite(r)) {
            return null;
        }
        const ring = GalaxySector.computeRing(q, r);
        if (ring === 0) {
            return 'Core';
        }
        const index = GalaxySector.#computeRingIndex(q, r, ring);
        const ringSize = ring * 6;
        const digits = Math.max(2, String(ringSize).length);
        return `R${ring}-${String(index + 1).padStart(digits, '0')}`;
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

    getDisplayName() {
        return GalaxySector.formatDisplayName(this.q, this.r);
    }

    setValue(rawValue) {
        this.value = this.#sanitizeValue(rawValue, this.defaultValue);
    }

    getValue() {
        return this.value;
    }

    setReward(rawReward) {
        this.reward = this.#sanitizeReward(rawReward);
    }

    getSectorReward() {
        if (!Array.isArray(this.reward) || this.reward.length === 0) {
            return [];
        }
        return GalaxySector.#cloneRewardEntries(this.reward);
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

    #sanitizeValue(rawValue, fallback = 100) {
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
            if (Number.isFinite(fallback) && fallback > 0) {
                return fallback;
            }
            return 100;
        }
        if (Number.isFinite(fallback) && fallback > 0 && numericValue < fallback) {
            return fallback;
        }
        return numericValue;
    }

    static #cloneRewardEntries(rewardEntries) {
        return rewardEntries.map((entry) => ({
            amount: entry.amount,
            label: entry.label,
            type: entry.type || null,
            resourceId: entry.resourceId || null,
            unit: entry.unit || null
        }));
    }

    static #normalizeRewardEntry(entry) {
        if (!entry) {
            return null;
        }
        if (typeof entry === 'string') {
            const label = entry.trim();
            if (!label) {
                return null;
            }
            return {
                amount: 1,
                label,
                type: label
            };
        }
        if (typeof entry !== 'object') {
            return null;
        }
        const providedLabel = typeof entry.label === 'string' ? entry.label.trim() : '';
        const type = typeof entry.type === 'string' && entry.type ? entry.type : null;
        const resourceId = typeof entry.resourceId === 'string' && entry.resourceId ? entry.resourceId : null;
        const unit = typeof entry.unit === 'string' && entry.unit ? entry.unit : null;
        const amount = Number(entry.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return null;
        }
        const label = providedLabel || resourceId || type;
        if (!label) {
            return null;
        }
        return {
            amount,
            label,
            type,
            resourceId,
            unit
        };
    }

    #sanitizeReward(rawReward) {
        if (!rawReward) {
            return [];
        }
        const entries = Array.isArray(rawReward) ? rawReward : [rawReward];
        const sanitized = [];
        entries.forEach((entry) => {
            const normalized = GalaxySector.#normalizeRewardEntry(entry);
            if (normalized) {
                sanitized.push(normalized);
            }
        });
        return sanitized;
    }

    toJSON() {
        return {
            q: this.q,
            r: this.r,
            control: { ...this.control },
            value: this.value
        };
    }
}

if (typeof window !== 'undefined') {
    window.GalaxySector = GalaxySector;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GalaxySector };
}
