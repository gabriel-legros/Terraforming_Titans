class GalaxyFaction {
    constructor({ id, name, color, startingSectors } = {}) {
        this.id = id || '';
        this.name = name || '';
        this.color = color || '#ffffff';
        this.startingSectors = new Set();
        if (Array.isArray(startingSectors)) {
            startingSectors.forEach((sectorKey) => {
                if (typeof sectorKey === 'string' && sectorKey) {
                    this.startingSectors.add(sectorKey);
                }
            });
        }
    }

    getStartingSectors() {
        return Array.from(this.startingSectors);
    }

    getMapBackground() {
        const rgba = this.#toRgba(0.82);
        const darker = this.#toRgba(0.56);
        if (!rgba || !darker) {
            return this.color;
        }
        return `linear-gradient(160deg, ${rgba}, ${darker})`;
    }

    getHoverBackground() {
        const rgba = this.#toRgba(0.92);
        const darker = this.#toRgba(0.7);
        if (!rgba || !darker) {
            return this.color;
        }
        return `linear-gradient(160deg, ${rgba}, ${darker})`;
    }

    getBorderColor() {
        const rgba = this.#toRgba(0.9);
        return rgba || this.color;
    }

    #toRgba(alpha) {
        if (typeof this.color !== 'string') {
            return null;
        }
        const hex = this.color.trim();
        if (!hex.startsWith('#')) {
            return null;
        }
        const normalized = hex.length === 4
            ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
            : hex;
        if (normalized.length !== 7) {
            return null;
        }
        const r = parseInt(normalized.slice(1, 3), 16);
        const g = parseInt(normalized.slice(3, 5), 16);
        const b = parseInt(normalized.slice(5, 7), 16);
        if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
            return null;
        }
        const clampedAlpha = Math.max(0, Math.min(1, alpha));
        return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
    }
}

function updateFactions(deltaTime) {
    const manager = this || null;
    const factions = manager?.getFactions?.();
    if (!Array.isArray(factions) || factions.length === 0) {
        return;
    }
    factions.forEach((faction) => {
        faction?.update?.(deltaTime, manager);
    });
}

const globalScope = (() => {
    try {
        return globalThis;
    } catch (error) {
        return undefined;
    }
})();

if (globalScope) {
    globalScope.GalaxyFaction = GalaxyFaction;
    globalScope.updateFactions = updateFactions;
}

try {
    module.exports = {
        GalaxyFaction,
        updateFactions
    };
} catch (error) {
    // Ignore module resolution issues outside CommonJS environments.
}
