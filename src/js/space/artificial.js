const EARTH_RADIUS_KM = 6_371;
const EARTH_AREA_HA = Math.round(4 * Math.PI * (EARTH_RADIUS_KM * 1000) * (EARTH_RADIUS_KM * 1000) / 10_000);
const BASE_SHELL_COST = {
    superalloys: EARTH_AREA_HA,
    metal: EARTH_AREA_HA * 10
};
const SHELL_RADIUS_MIN = 2;
const SHELL_RADIUS_MAX = 8;

class ArtificialManager extends EffectableEntity {
    constructor() {
        super({ description: 'Manages artificial constructs' });
        this.enabled = true;
        this.constructionHoursPer50B = 5;
        this.prioritizeSpaceStorage = true;
        this.nextId = 1;
        this.activeProject = null;
        this.history = [];
        this._tickTimer = 0;
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.updateUI(true);
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        this.updateUI(true);
    }

    update(delta) {
        if (!this.enabled || !this.activeProject) return;
        if (this.activeProject.status === 'building') {
            this.setRemainingTime(this.activeProject.remainingMs - delta, false);
            if (this.activeProject && this.activeProject.status === 'completed') return;
        }
        this._tickTimer += delta;
        if (this._tickTimer >= 500) {
            this._tickTimer = 0;
            this.updateUI();
        }
    }

    applyEffect(effect) {
        if (!effect) return;
        if (effect.type === 'enable') {
            this.enable(effect.targetId);
            return;
        }
        super.applyEffect(effect);
    }

    calculateAreaHectares(radiusEarth) {
        const size = Math.max(radiusEarth || 0, 0);
        return EARTH_AREA_HA * (size * size);
    }

    calculateCost(radiusEarth) {
        const size = Math.max(radiusEarth || 0, 0);
        const factor = size ** 3;
        return {
            superalloys: BASE_SHELL_COST.superalloys * factor,
            metal: BASE_SHELL_COST.metal * factor
        };
    }

    calculateDurationMs(radiusEarth) {
        const hectares = this.calculateAreaHectares(radiusEarth);
        const batches = hectares / 50_000_000_000;
        const hours = this.constructionHoursPer50B * Math.max(batches, 0);
        return hours * 3_600_000;
    }

    getDurationContext(radiusEarth) {
        const base = this.calculateDurationMs(radiusEarth);
        const worlds = spaceManager && spaceManager.getTerraformedPlanetCount
            ? Math.max(spaceManager.getTerraformedPlanetCount(), 1)
            : 1;
        return { durationMs: base / worlds, worldCount: worlds };
    }

    setPrioritizeSpaceStorage(value) {
        this.prioritizeSpaceStorage = !!value;
    }

    createSeed() {
        const id = String(this.nextId).padStart(3, '0');
        return `A-${id}`;
    }

    canCoverCost(cost, prioritizeStorage = this.prioritizeSpaceStorage) {
        const storageProj = projectManager && projectManager.projects && projectManager.projects.spaceStorage;
        const useStorage = !!storageProj;
        for (const key of Object.keys(cost)) {
            const required = Math.max(cost[key] || 0, 0);
            if (!required) continue;
            const colonyRes = resources.colony[key];
            const colonyAvailable = colonyRes ? colonyRes.value : 0;
            const storageKey = key === 'water' ? 'liquidWater' : key;
            const storageAvailable = useStorage && storageProj.getAvailableStoredResource
                ? storageProj.getAvailableStoredResource(storageKey)
                : 0;
            const total = prioritizeStorage ? storageAvailable + colonyAvailable : colonyAvailable + storageAvailable;
            if (total < required) {
                return false;
            }
        }
        return true;
    }

    pullResources(cost, prioritizeStorage = this.prioritizeSpaceStorage) {
        const storageProj = projectManager && projectManager.projects && projectManager.projects.spaceStorage;
        const useStorage = !!storageProj;
        const plan = {};

        for (const key of Object.keys(cost)) {
            const required = Math.max(cost[key] || 0, 0);
            if (!required) continue;
            const colonyRes = resources.colony[key];
            const colonyAvailable = colonyRes ? colonyRes.value : 0;
            const storageKey = key === 'water' ? 'liquidWater' : key;
            const storageAvailable = useStorage && storageProj.getAvailableStoredResource
                ? storageProj.getAvailableStoredResource(storageKey)
                : 0;
            const total = colonyAvailable + storageAvailable;
            if (total < required) {
                return null;
            }

            if (prioritizeStorage && useStorage) {
                const fromStorage = Math.min(storageAvailable, required);
                plan[key] = { colony: required - fromStorage, storage: fromStorage, storageKey };
            } else {
                const fromColony = Math.min(colonyAvailable, required);
                plan[key] = { colony: fromColony, storage: required - fromColony, storageKey };
            }
        }

        Object.keys(plan).forEach((key) => {
            const step = plan[key];
            if (step.colony > 0 && resources.colony[key]) {
                resources.colony[key].decrease(step.colony);
            }
            if (useStorage && step.storage > 0) {
                const storageKey = step.storageKey || key;
                const usage = storageProj.resourceUsage[storageKey] || 0;
                const remainingUsage = usage - step.storage;
                if (remainingUsage > 0) {
                    storageProj.resourceUsage[storageKey] = remainingUsage;
                } else {
                    delete storageProj.resourceUsage[storageKey];
                }
                storageProj.usedStorage = Math.max(0, storageProj.usedStorage - step.storage);
            }
        });

        if (useStorage && typeof updateSpaceStorageUI === 'function') {
            updateSpaceStorageUI(storageProj);
        }
        return plan;
    }

    startShellConstruction(options) {
        if (!this.enabled || this.activeProject) return false;
        const requestedRadius = options?.radiusEarth || SHELL_RADIUS_MIN;
        const radiusEarth = Math.min(Math.max(requestedRadius, SHELL_RADIUS_MIN), SHELL_RADIUS_MAX);
        const core = options?.core || 'super-earth';
        const chosenName = (options?.name && String(options.name).trim()) || `Shellworld ${this.nextId}`;
        const cost = this.calculateCost(radiusEarth);
        if (!this.canCoverCost(cost, this.prioritizeSpaceStorage)) {
            return false;
        }
        const deduction = this.pullResources(cost, this.prioritizeSpaceStorage);
        if (!deduction) return false;

        const areaHa = this.calculateAreaHectares(radiusEarth);
        const { durationMs, worldCount } = this.getDurationContext(radiusEarth);
        const now = Date.now();
        const sector = (spaceManager && spaceManager.getCurrentWorldOriginal)
            ? spaceManager.getCurrentWorldOriginal()?.merged?.celestialParameters?.sector || null
            : null;
        const starSource = (spaceManager && spaceManager.getCurrentWorldOriginal)
            ? spaceManager.getCurrentWorldOriginal()
            : null;
        const star = starSource && starSource.star ? JSON.parse(JSON.stringify(starSource.star)) : (currentPlanetParameters && currentPlanetParameters.star)
            ? JSON.parse(JSON.stringify(currentPlanetParameters.star))
            : null;

        this.activeProject = {
            id: this.nextId,
            seed: this.createSeed(),
            name: chosenName,
            type: 'shell',
            core,
            radiusEarth,
            areaHa,
            landHa: areaHa,
            durationMs,
            remainingMs: durationMs,
            status: 'building',
            startedAt: now,
            completedAt: null,
            cost,
            sector,
            star,
            initialDeposit: { metal: 0, silicon: 0 },
            builtFrom: spaceManager && spaceManager.getCurrentPlanetKey ? spaceManager.getCurrentPlanetKey() : 'unknown',
            worldDivisor: worldCount
        };

        this.nextId += 1;
        this.updateUI(true);
        return true;
    }

    cancelConstruction() {
        if (!this.activeProject || this.activeProject.status !== 'building') return false;
        this.recordHistoryEntry('cancelled');
        this.activeProject = null;
        this.updateUI(true);
        return true;
    }

    discardConstructedWorld() {
        if (!this.activeProject || this.activeProject.status !== 'completed') return false;
        this.recordHistoryEntry('discarded');
        this.activeProject = null;
        this.updateUI(true);
        return true;
    }

    addInitialDeposit(payload, prioritizeStorage = this.prioritizeSpaceStorage) {
        if (!this.activeProject) return false;
        const amounts = {
            metal: Math.max(payload?.metal || 0, 0),
            silicon: Math.max(payload?.silicon || 0, 0)
        };
        if (!amounts.metal && !amounts.silicon) return false;
        const deduction = this.pullResources(amounts, prioritizeStorage);
        if (!deduction) return false;
        this.activeProject.initialDeposit.metal += amounts.metal;
        this.activeProject.initialDeposit.silicon += amounts.silicon;
        this.activeProject.override = null;
        this.updateUI(true);
        return true;
    }

    buildOverride(project) {
        if (!project) return null;
        const radiusKm = project.radiusEarth * EARTH_RADIUS_KM;
        const gravity = 9.81;
        const sector = project.sector || currentPlanetParameters?.celestialParameters?.sector || 'R5-07';
        const star = project.star ? JSON.parse(JSON.stringify(project.star)) : (currentPlanetParameters && currentPlanetParameters.star)
            ? JSON.parse(JSON.stringify(currentPlanetParameters.star))
            : null;
        const depositMetal = project.initialDeposit?.metal || 0;
        const depositSilicon = project.initialDeposit?.silicon || 0;

        const base = JSON.parse(JSON.stringify(defaultPlanetParameters || {}));
        base.name = project.name;
        base.classification = {
            archetype: 'artificial',
            type: project.type,
            core: project.core
        };
        base.celestialParameters = {
            ...base.celestialParameters,
            gravity,
            radius: radiusKm,
            rotationPeriod: 24,
            starLuminosity: currentPlanetParameters?.celestialParameters?.starLuminosity || 1,
            sector
        };
        if (star) {
            base.star = star;
        }
        base.resources = base.resources || {};
        base.resources.surface = base.resources.surface || {};
        base.resources.colony = base.resources.colony || {};
        base.resources.surface.land = {
            ...(base.resources.surface.land || {}),
            initialValue: project.landHa,
            baseCap: project.landHa
        };
        base.resources.surface.ice = { ...(base.resources.surface.ice || {}), initialValue: 0 };
        base.resources.surface.liquidWater = { ...(base.resources.surface.liquidWater || {}), initialValue: 0 };
        base.resources.surface.dryIce = { ...(base.resources.surface.dryIce || {}), initialValue: 0 };
        base.resources.surface.biomass = { ...(base.resources.surface.biomass || {}), initialValue: 0 };
        base.resources.surface.hazardousBiomass = { ...(base.resources.surface.hazardousBiomass || {}), initialValue: 0 };
        base.resources.surface.liquidCO2 = { ...(base.resources.surface.liquidCO2 || {}), initialValue: 0 };
        base.resources.surface.liquidMethane = { ...(base.resources.surface.liquidMethane || {}), initialValue: 0 };
        base.resources.surface.hydrocarbonIce = { ...(base.resources.surface.hydrocarbonIce || {}), initialValue: 0 };
        const metalCap = Math.max(base.resources.colony.metal?.baseCap || 0, depositMetal);
        const siliconCap = Math.max(base.resources.colony.silicon?.baseCap || 0, depositSilicon);
        base.resources.colony.metal = {
            ...(base.resources.colony.metal || {}),
            initialValue: depositMetal,
            baseCap: metalCap
        };
        base.resources.colony.silicon = {
            ...(base.resources.colony.silicon || {}),
            initialValue: depositSilicon,
            baseCap: siliconCap
        };
        base.zonalWater = {
            tropical: { liquid: 0, ice: 0, buriedIce: 0 },
            temperate: { liquid: 0, ice: 0, buriedIce: 0 },
            polar: { liquid: 0, ice: 0, buriedIce: 0 }
        };
        base.zonalCO2 = {
            tropical: { liquid: 0, ice: 0 },
            temperate: { liquid: 0, ice: 0 },
            polar: { liquid: 0, ice: 0 }
        };
        base.zonalHydrocarbons = {
            tropical: { liquid: 0, ice: 0, buriedIce: 0 },
            temperate: { liquid: 0, ice: 0, buriedIce: 0 },
            polar: { liquid: 0, ice: 0, buriedIce: 0 }
        };
        base.zonalSurface = {
            tropical: { biomass: 0, hazardousBiomass: 0 },
            temperate: { biomass: 0, hazardousBiomass: 0 },
            polar: { biomass: 0, hazardousBiomass: 0 }
        };
        base.visualization = { ...(base.visualization || {}), baseColor: '#2a3d4f' };
        return base;
    }

    recordHistoryEntry(status) {
        if (!this.activeProject) return;
        this.history.unshift({
            id: this.activeProject.id,
            seed: this.activeProject.seed,
            name: this.activeProject.name,
            type: this.activeProject.type,
            core: this.activeProject.core,
            radiusEarth: this.activeProject.radiusEarth,
            builtFrom: this.activeProject.builtFrom,
            constructedAt: this.activeProject.startedAt,
            completedAt: this.activeProject.completedAt || null,
            status,
            traveledAt: status === 'traveled' ? Date.now() : null,
            discardedAt: status === 'discarded' ? Date.now() : null
        });
        this.history = this.history.slice(0, 50);
    }

    travelToConstructedWorld() {
        if (!this.activeProject || this.activeProject.status !== 'completed') return false;
        const override = this.activeProject.override || this.buildOverride(this.activeProject);
        const res = {
            merged: override,
            seedString: this.activeProject.seed,
            original: {
                merged: override,
                override,
                star: override.star,
                artificial: true,
                archetype: override.classification?.archetype
            },
            artificial: true
        };
        const traveled = spaceManager && spaceManager.travelToRandomWorld
            ? spaceManager.travelToRandomWorld(res, this.activeProject.seed)
            : false;
        if (!traveled) return false;
        this.recordHistoryEntry('traveled');
        this.activeProject = null;
        this.updateUI(true);
        return true;
    }

    getRemainingTime() {
        if (!this.activeProject || this.activeProject.status !== 'building') return 0;
        return this.activeProject.remainingMs;
    }

    setRemainingTime(value, triggerUpdate = true) {
        if (!this.activeProject || this.activeProject.status !== 'building') return false;
        const next = Math.max(0, Number(value) || 0);
        this.activeProject.remainingMs = next;
        if (next === 0) {
            this.activeProject.status = 'completed';
            this.activeProject.completedAt = Date.now();
            this.activeProject.override = this.buildOverride(this.activeProject);
        }
        if (triggerUpdate) {
            this.updateUI(true);
        }
        return true;
    }

    getStatusText() {
        if (!this.enabled) return 'Artificial systems standby.';
        if (!this.activeProject) return 'No active megastructure. Ready to draft a shellworld.';
        if (this.activeProject.status === 'building') {
            const pct = Math.max(0, Math.min(100, 100 - (this.activeProject.remainingMs / this.activeProject.durationMs) * 100));
            return `${this.activeProject.name} under construction (${pct.toFixed(1)}%).`;
        }
        if (this.activeProject.status === 'completed') {
            return `${this.activeProject.name} is complete and awaiting travel.`;
        }
        return 'Artificial systems online.';
    }

    saveState() {
        const project = this.activeProject ? { ...this.activeProject } : null;
        if (project && project.override) {
            delete project.override;
        }
        return {
            enabled: this.enabled,
            constructionHoursPer50B: this.constructionHoursPer50B,
            prioritizeSpaceStorage: this.prioritizeSpaceStorage,
            nextId: this.nextId,
            activeProject: project,
            history: this.history
        };
    }

    loadState(state) {
        if (!state) return;
        this.enabled = state.enabled !== false;
        this.constructionHoursPer50B = Number.isFinite(state.constructionHoursPer50B)
            ? state.constructionHoursPer50B
            : this.constructionHoursPer50B;
        this.prioritizeSpaceStorage = !!state.prioritizeSpaceStorage;
        this.activeProject = state.activeProject || null;
        if (this.activeProject) {
            this.activeProject.override = null;
            if (!this.activeProject.worldDivisor) {
                this.activeProject.worldDivisor = 1;
            }
        }
        this.nextId = Math.max(state.nextId || this.nextId, (this.activeProject?.id || 0) + 1, 1);
        this.history = Array.isArray(state.history) ? state.history : [];
        this.updateUI(true);
    }

    updateUI(force = false) {
        if (typeof updateArtificialUI === 'function') {
            updateArtificialUI({ force });
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
