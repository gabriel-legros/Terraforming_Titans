let GalaxySectorClass;
let GalaxyFactionClass;
let galaxyFactionParametersConfig;
let galaxySectorControlOverridesConfig;
const defaultUpdateFactions = () => {};
let updateFactionsFunction = defaultUpdateFactions;

if (typeof module !== 'undefined' && module.exports) {
    ({ GalaxySector: GalaxySectorClass } = require('./sector'));
    ({ GalaxyFaction: GalaxyFactionClass, updateFactions: updateFactionsFunction } = require('./faction'));
    ({
        galaxyFactionParameters: galaxyFactionParametersConfig,
        galaxySectorControlOverrides: galaxySectorControlOverridesConfig
    } = require('./factions-parameters'));
} else if (typeof window !== 'undefined') {
    GalaxySectorClass = window.GalaxySector;
    GalaxyFactionClass = window.GalaxyFaction;
    galaxyFactionParametersConfig = window.galaxyFactionParameters;
    galaxySectorControlOverridesConfig = window.galaxySectorControlOverrides;
    if (typeof window.updateFactions === 'function') {
        updateFactionsFunction = window.updateFactions;
    }
}

if ((!GalaxySectorClass || !GalaxyFactionClass || !Array.isArray(galaxyFactionParametersConfig)) && typeof globalThis !== 'undefined') {
    if (!GalaxySectorClass && globalThis.GalaxySector) {
        GalaxySectorClass = globalThis.GalaxySector;
    }
    if (!GalaxyFactionClass && globalThis.GalaxyFaction) {
        GalaxyFactionClass = globalThis.GalaxyFaction;
    }
    if ((!galaxyFactionParametersConfig || !Array.isArray(galaxyFactionParametersConfig)) && globalThis.galaxyFactionParameters) {
        galaxyFactionParametersConfig = globalThis.galaxyFactionParameters;
    }
    if (!galaxySectorControlOverridesConfig && globalThis.galaxySectorControlOverrides) {
        galaxySectorControlOverridesConfig = globalThis.galaxySectorControlOverrides;
    }
    if (typeof updateFactionsFunction !== 'function' && typeof globalThis.updateFactions === 'function') {
        updateFactionsFunction = globalThis.updateFactions;
    }
}

if ((!GalaxySectorClass || !GalaxyFactionClass || !Array.isArray(galaxyFactionParametersConfig)) && typeof require === 'function') {
    try {
        if (!GalaxySectorClass) {
            ({ GalaxySector: GalaxySectorClass } = require('./sector'));
        }
        if (!GalaxyFactionClass || updateFactionsFunction === defaultUpdateFactions) {
            ({ GalaxyFaction: GalaxyFactionClass, updateFactions: updateFactionsFunction } = require('./faction'));
        }
        if (!Array.isArray(galaxyFactionParametersConfig)) {
            ({
                galaxyFactionParameters: galaxyFactionParametersConfig,
                galaxySectorControlOverrides: galaxySectorControlOverridesConfig
            } = require('./factions-parameters'));
        }
    } catch (error) {
        // Ignore resolution errors in browser contexts.
    }
}

if (typeof updateFactionsFunction !== 'function') {
    updateFactionsFunction = defaultUpdateFactions;
}

if (!Array.isArray(galaxyFactionParametersConfig)) {
    galaxyFactionParametersConfig = [];
}
galaxySectorControlOverridesConfig = galaxySectorControlOverridesConfig || {};

const GALAXY_RADIUS = 6;

function generateSectorCoordinates(radius) {
    const coordinates = [];
    for (let q = -radius; q <= radius; q += 1) {
        const rMin = Math.max(-radius, -q - radius);
        const rMax = Math.min(radius, -q + radius);
        for (let r = rMin; r <= rMax; r += 1) {
            coordinates.push({ q, r });
        }
    }
    return coordinates;
}

class GalaxyManager extends EffectableEntity {
    constructor() {
        super({ description: 'Manages the galactic view.' });
        this.enabled = false;
        this.initialized = false;
        this.radius = GALAXY_RADIUS;
        this.factions = new Map();
        this.sectors = new Map();
    }

    initialize() {
        if (this.initialized) {
            this.refreshUIVisibility();
            return;
        }
        this.initialized = true;
        this.#initializeSectors();
        this.#initializeFactions();
        this.#applyFactionStartingControl();
        this.refreshUIVisibility();
    }

    update(deltaMs) {
        updateFactionsFunction.call(this, deltaMs);
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
        const sectors = Array.from(this.sectors.values()).map((sector) => sector.toJSON());
        return {
            enabled: this.enabled,
            sectors
        };
    }

    loadState(state) {
        this.initialize();
        if (state && typeof state.enabled === 'boolean') {
            this.enabled = state.enabled;
        }
        if (state && Array.isArray(state.sectors)) {
            this.sectors.forEach((sector) => {
                sector.replaceControl({});
            });
            this.#applyFactionStartingControl();
            state.sectors.forEach((sectorData) => {
                const sector = this.getSector(sectorData.q, sectorData.r);
                if (!sector) {
                    return;
                }
                sector.replaceControl(sectorData.control);
            });
        }
        this.refreshUIVisibility();
    }

    resetGalaxy() {
        this.initialized = false;
        this.radius = GALAXY_RADIUS;
        this.factions.clear();
        this.sectors.clear();
        this.initialize();
        this.enable();
    }

    getSector(q, r) {
        return this.sectors.get(GalaxySectorClass.createKey(q, r)) || null;
    }

    getSectorController(q, r) {
        const sector = this.getSector(q, r);
        if (!sector) {
            return null;
        }
        const dominant = sector.getDominantController();
        if (!dominant) {
            return null;
        }
        const faction = this.factions.get(dominant.factionId);
        if (!faction) {
            return null;
        }
        return { faction, strength: dominant.value };
    }

    getFaction(id) {
        return this.factions.get(id) || null;
    }

    getFactions() {
        return Array.from(this.factions.values());
    }

    #initializeSectors() {
        this.sectors.clear();
        const coordinates = generateSectorCoordinates(this.radius);
        coordinates.forEach(({ q, r }) => {
            const sector = new GalaxySectorClass({ q, r });
            this.sectors.set(sector.key, sector);
        });
    }

    #initializeFactions() {
        this.factions.clear();
        const ringCache = new Map();
        galaxyFactionParametersConfig.forEach((definition) => {
            const startingSectors = this.#resolveStartingSectors(definition, ringCache);
            const faction = new GalaxyFactionClass({
                ...definition,
                startingSectors
            });
            this.factions.set(faction.id, faction);
        });
    }

    #applyFactionStartingControl() {
        this.sectors.forEach((sector) => {
            sector.replaceControl({});
        });
        this.factions.forEach((faction) => {
            faction.getStartingSectors().forEach((sectorKey) => {
                const sector = this.sectors.get(sectorKey);
                if (!sector) {
                    return;
                }
                sector.setControl(faction.id, 100);
            });
        });
        Object.entries(galaxySectorControlOverridesConfig).forEach(([sectorKey, controlMap]) => {
            const sector = this.sectors.get(sectorKey);
            if (!sector) {
                return;
            }
            const entries = Object.entries(controlMap || {});
            const sanitized = [];
            entries.forEach(([factionId, value]) => {
                if (!factionId || !this.factions.has(factionId)) {
                    return;
                }
                const numericValue = Number(value);
                if (!Number.isFinite(numericValue) || numericValue <= 0) {
                    return;
                }
                sanitized.push([factionId, numericValue]);
            });
            if (!sanitized.length) {
                return;
            }
            sector.replaceControl({});
            sanitized.forEach(([factionId, numericValue]) => {
                sector.setControl(factionId, numericValue);
            });
        });
    }

    #getSectorKeysForRing(targetRing) {
        if (!Number.isFinite(targetRing) || targetRing < 0) {
            return [];
        }
        if (targetRing === 0) {
            const centerKey = GalaxySectorClass.createKey(0, 0);
            return this.sectors.has(centerKey) ? [centerKey] : [];
        }
        const keys = [];
        const directions = [
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: 1, r: 0 },
            { q: 1, r: -1 }
        ];
        let currentQ = targetRing;
        let currentR = 0;
        directions.forEach(({ q: dq, r: dr }) => {
            for (let step = 0; step < targetRing; step += 1) {
                const key = GalaxySectorClass.createKey(currentQ, currentR);
                if (this.sectors.has(key)) {
                    keys.push(key);
                }
                currentQ += dq;
                currentR += dr;
            }
        });
        return keys;
    }

    #resolveStartingSectors(definition, ringCache) {
        const resolved = new Set();
        const { startingSectors, ringSlices } = definition;
        if (Array.isArray(startingSectors)) {
            startingSectors.forEach((entry) => {
                if (!entry) {
                    return;
                }
                if (typeof entry === 'string') {
                    resolved.add(entry);
                    return;
                }
                if (entry && Number.isFinite(entry.q) && Number.isFinite(entry.r)) {
                    resolved.add(GalaxySectorClass.createKey(entry.q, entry.r));
                }
            });
        }
        if (Array.isArray(ringSlices)) {
            ringSlices.forEach(({ ring, start, end }) => {
                if (!Number.isFinite(ring)) {
                    return;
                }
                if (!ringCache.has(ring)) {
                    ringCache.set(ring, this.#getSectorKeysForRing(ring));
                }
                const keys = ringCache.get(ring);
                if (!keys || !keys.length) {
                    return;
                }
                const total = keys.length;
                const rawStart = Number.isFinite(start) ? Math.floor(start) : NaN;
                const rawEnd = Number.isFinite(end) ? Math.floor(end) : NaN;
                const beginPosition = Number.isFinite(rawStart) ? Math.max(1, Math.min(total, rawStart)) : 1;
                const endPosition = Number.isFinite(rawEnd) ? Math.max(beginPosition, Math.min(total, rawEnd)) : total;
                for (let position = beginPosition; position <= endPosition; position += 1) {
                    resolved.add(keys[position - 1]);
                }
            });
        }
        return Array.from(resolved);
    }
}

if (typeof window !== 'undefined') {
    window.GalaxyManager = GalaxyManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GalaxyManager };
}
