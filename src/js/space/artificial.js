const EARTH_RADIUS_KM = 6_371;
const EARTH_AREA_HA = Math.round(4 * Math.PI * (EARTH_RADIUS_KM * 1000) * (EARTH_RADIUS_KM * 1000) / 10_000);
const DEFAULT_RADIUS_BOUNDS = { min: 2, max: 8 };
const ARTIFICIAL_TYPES = [
    { value: 'shell', label: 'Shellworld', disabled: false },
    { value: 'ring', label: 'Ringworld (Locked by World 10)', disabled: true },
    { value: 'disk', label: 'Artificial disk (coming not so soon)', disabled: true }
];
const ARTIFICIAL_CORES = [
    { value: 'super-earth', label: 'Super Earth', disabled: false, minRadiusEarth: 1.4, maxRadiusEarth: 3.2, allowStar: true, minFlux: 800, maxFlux: 1600 },
    { value: 'ice-giant', label: 'Ice giant', disabled: false, minRadiusEarth: 3.2, maxRadiusEarth: 4.5, allowStar: true, minFlux: 50, maxFlux: 500 },
    { value: 'intermediate-giant', label: 'Intermediate giant', disabled: false, minRadiusEarth: 4.5, maxRadiusEarth: 20, allowStar: true, minFlux: 50, maxFlux: 800 },
    { value: 'gas-giant', label: 'Gas giant', disabled: true, disabledSource : "World 9", minRadiusEarth: 20, maxRadiusEarth: 70, allowStar: true, minFlux: 50, maxFlux: 800 },
    { value: 'brown-dwarf', label: 'Brown Dwarf', disabled: true, disabledSource : "World 11", minRadiusEarth: 70, maxRadiusEarth: 140, allowStar: false},
    { value: 'white-dwarf', label: 'White Dwarf', disabled: true, disabledSource : "World 12", minRadiusEarth: 360, maxRadiusEarth: 600, allowStar: false},
    { value: 'neutron-star', label: 'Neutron Star', disabled: true, disabledSource : "World 13", minRadiusEarth: 600, maxRadiusEarth: 900, allowStar: false},
    { value: 'stellar-bh', label: 'Stellar Black Hole', disabled: true, disabledSource : "World 14", minRadiusEarth: 900, maxRadiusEarth: 10000, allowStar: false},
    { value: 'smbh', label: 'Supermassive Black Hole', disabled: true, disabledSource : "World 14 & Galactic Conquest", minRadiusEarth: 500000, maxRadiusEarth: 500000, allowStar: false}
];
const ARTIFICIAL_STAR_CONTEXTS = [
    { value: 'with-star', label: 'Star in system', hasStar: true, disabled: false },
    { value: 'starless', label: 'Starless deep space', hasStar: false, disabled: false }
];
const SOLAR_CONSTANT_WM2 = 1361;
const ARTIFICIAL_STAR_SYLLABLES = [
    'al', 'be', 'ce', 'do', 'er', 'fi', 'ga', 'ha', 'io', 'ju', 'ka', 'lu', 'me', 'no', 'or', 'pi', 'qu', 'ra', 'su', 'ta', 'ul', 've', 'wo', 'xi', 'ya', 'zo'
];
const ARTIFICIAL_STAR_SPECTRAL_WEIGHTS = [
    { v: 'M', w: 76 },
    { v: 'K', w: 12 },
    { v: 'G', w: 7.6 },
    { v: 'F', w: 3.0 },
    { v: 'A', w: 1.2 },
    { v: 'B', w: 0.2 },
    { v: 'O', w: 0.02 }
];
const ARTIFICIAL_STAR_MASS_RANGES = {
    O: [16, 60],
    B: [2.1, 16],
    A: [1.4, 2.1],
    F: [1.1, 1.4],
    G: [0.9, 1.1],
    K: [0.6, 0.9],
    M: [0.08, 0.6]
};
const SHELL_COST_CALIBRATION = {
    landHa: 50_000_000_000,
    superalloys: 25_000_000_000_000
};
const CONSTRUCTION_HOURS_PER_50B = 10;
const MAX_SHELL_DURATION_MS = 5 * 3_600_000;
const BASE_SHELL_COST = (() => {
    const radiusAtCalibration = Math.sqrt(SHELL_COST_CALIBRATION.landHa / EARTH_AREA_HA);
    const superalloyBase = SHELL_COST_CALIBRATION.superalloys / (radiusAtCalibration ** 3);
    return {
        superalloys: superalloyBase,
        metal: superalloyBase * 100
    };
})();

function mulberry32(seed) {
    let t = seed >>> 0;
    return function rng() {
        t += 0x6d2b79f5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

function pickWeighted(rng, items) {
    let total = 0;
    items.forEach((item) => { total += item.w; });
    let roll = rng() * total;
    for (let i = 0; i < items.length; i += 1) {
        roll -= items[i].w;
        if (roll <= 0) return items[i].v;
    }
    return items[items.length - 1].v;
}

function luminosityFromMassSolar(mass) {
    return Math.max(0.0005, Math.min(100000, Math.pow(mass, 3.5)));
}

function radiusFromMassSolar(mass) {
    return Math.pow(mass, 0.8);
}

function calculateStarTemperatureK(luminosity, radius) {
    const scale = radius * radius || 1;
    const normalizedLuminosity = luminosity > 0 ? luminosity : 0;
    return Math.round(5772 * Math.pow(normalizedLuminosity / scale, 0.25));
}

function buildHabitableZone(luminosity) {
    const scale = Math.sqrt(Math.max(luminosity || 0, 0));
    return { inner: 0.95 * scale, outer: 1.37 * scale };
}

function buildRogueStar(seed) {
    const suffix = String(seed >>> 0);
    return {
        name: `Rogue-${suffix.slice(-3).padStart(3, '0')}`,
        spectralType: '-',
        luminositySolar: 0,
        massSolar: 0,
        radiusSolar: 0,
        temperatureK: 0,
        habitableZone: { inner: 0, outer: 0 }
    };
}

function generateArtificialStar(seed) {
    const rng = mulberry32(seed);
    const spectralType = pickWeighted(rng, ARTIFICIAL_STAR_SPECTRAL_WEIGHTS);
    const range = ARTIFICIAL_STAR_MASS_RANGES[spectralType] || ARTIFICIAL_STAR_MASS_RANGES.M;
    const mass = range[0] + (range[1] - range[0]) * rng();
    const luminosity = luminosityFromMassSolar(mass);
    const radius = radiusFromMassSolar(mass);
    const buildSegment = () => {
        const index = Math.floor(rng() * ARTIFICIAL_STAR_SYLLABLES.length);
        return ARTIFICIAL_STAR_SYLLABLES[index] || 'sol';
    };
    const core = `${buildSegment()}${buildSegment()}${buildSegment()}`;
    return {
        name: `${core.charAt(0).toUpperCase()}${core.slice(1)}-${String((seed >>> 0) % 1000).padStart(3, '0')}`,
        spectralType,
        luminositySolar: luminosity,
        massSolar: mass,
        radiusSolar: radius,
        temperatureK: calculateStarTemperatureK(luminosity, radius),
        habitableZone: buildHabitableZone(luminosity)
    };
}

function pickFluxWithinRange(seed, minFlux, maxFlux) {
    const low = Number.isFinite(minFlux) ? minFlux : 0;
    const high = Number.isFinite(maxFlux) ? maxFlux : low;
    const rng = mulberry32((seed ^ 0xf00d) >>> 0);
    const span = Math.max(high - low, 0);
    const flux = low + rng() * span;
    return flux > 0 ? flux : low;
}

function calculateOrbitFromFlux(luminosity, fluxWm2) {
    const safeLuminosity = luminosity || 1;
    const safeFlux = fluxWm2 > 0 ? fluxWm2 : 1;
    return Math.sqrt((safeLuminosity * SOLAR_CONSTANT_WM2) / safeFlux);
}

function buildArtificialStarContext({ seed, hasStar, minFlux, maxFlux }) {
    if (!hasStar) {
        return {
            star: buildRogueStar(seed),
            fluxWm2: 0,
            distanceFromStarAU: 0,
            isRogue: true
        };
    }
    const fluxWm2 = pickFluxWithinRange(seed, minFlux, maxFlux);
    const starSeed = (seed ^ 0x9e3779b9) >>> 0;
    const star = generateArtificialStar(starSeed);
    const distanceFromStarAU = calculateOrbitFromFlux(star.luminositySolar, fluxWm2);
    return {
        star,
        fluxWm2,
        distanceFromStarAU,
        isRogue: false
    };
}
const TERRAFORM_WORLD_DIVISOR = 50_000_000_000;
const ARTIFICIAL_FLEET_CAPACITY_WORLDS = 5;
class ArtificialManager extends EffectableEntity {
    constructor() {
        super({ description: 'Manages artificial constructs' });
        this.enabled = false;
        this.constructionHoursPer50B = CONSTRUCTION_HOURS_PER_50B;
        this.prioritizeSpaceStorage = true;
        this.nextId = 1;
        this.activeProject = null;
        this.history = [];
        this.travelHistory = [];
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

    unlockCore(coreId) {
        const entry = ARTIFICIAL_CORES.find((core) => core.value === coreId);
        if (!entry || !entry.disabled) return;
        entry.disabled = false;
        entry.disabledSource = null;
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
        if (effect.type === 'unlockCore') {
            this.unlockCore(effect.targetId);
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

    calculateTerraformWorldValue(radiusEarth) {
        const land = this.calculateAreaHectares(radiusEarth);
        return Math.max(1, Math.floor((land || 0) / TERRAFORM_WORLD_DIVISOR));
    }

    calculateFleetCapacityWorldValue(radiusEarth, terraformedValue) {
        const worldValue = Number.isFinite(terraformedValue) && terraformedValue > 0
            ? terraformedValue
            : this.calculateTerraformWorldValue(radiusEarth);
        return Math.min(ARTIFICIAL_FLEET_CAPACITY_WORLDS, worldValue);
    }

    deriveTerraformWorldValue(entry) {
        if (!entry) return undefined;
        if (entry.terraformedValue !== undefined) return entry.terraformedValue;
        if (entry.radiusEarth !== undefined) {
            return this.calculateTerraformWorldValue(entry.radiusEarth);
        }
        if (entry.landHa !== undefined) {
            return Math.max(1, Math.floor((entry.landHa || 0) / TERRAFORM_WORLD_DIVISOR));
        }
        return undefined;
    }

    deriveFleetCapacityWorldValue(entry) {
        if (!entry) {
            return this.calculateFleetCapacityWorldValue();
        }
        const terraformedValue = this.deriveTerraformWorldValue(entry);
        const baseValue = Number.isFinite(terraformedValue) && terraformedValue > 0
            ? terraformedValue
            : (Number.isFinite(entry.fleetCapacityValue) && entry.fleetCapacityValue > 0 ? entry.fleetCapacityValue : undefined);
        return this.calculateFleetCapacityWorldValue(entry.radiusEarth, baseValue);
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

    exceedsDurationLimit(durationMs) {
        return Math.max(durationMs || 0, 0) > MAX_SHELL_DURATION_MS;
    }

    setPrioritizeSpaceStorage(value) {
        const checked = !!value;
        const storageProj = projectManager?.projects?.spaceStorage;
        storageProj && (storageProj.prioritizeMegaProjects = checked);
        this.prioritizeSpaceStorage = checked;
    }

    getPrioritizeSpaceStorage() {
        return projectManager?.projects?.spaceStorage?.prioritizeMegaProjects ?? this.prioritizeSpaceStorage;
    }

    createSeed() {
        const id = String(this.nextId).padStart(3, '0');
        return `A-${id}`;
    }

    canCoverCost(cost, prioritizeStorage = this.getPrioritizeSpaceStorage()) {
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

    pullResources(cost, prioritizeStorage = this.getPrioritizeSpaceStorage()) {
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
      const core = options?.core || 'super-earth';
      const coreConfig = getArtificialCoreConfig(core);
      const bounds = getArtificialCoreBounds(core);
      const starContext = options?.starContext || ARTIFICIAL_STAR_CONTEXTS[0].value;
      const starOption = ARTIFICIAL_STAR_CONTEXTS.find((entry) => entry.value === starContext) || ARTIFICIAL_STAR_CONTEXTS[0];
      const allowStar = coreConfig.allowStar !== false;
      const hasStar = allowStar && starOption.hasStar !== false;
      const effectiveStarContext = allowStar
        ? starOption.value
        : (ARTIFICIAL_STAR_CONTEXTS.find((entry) => entry.hasStar === false)?.value || starOption.value);
      const requestedRadius = options?.radiusEarth || bounds.min;
      const radiusEarth = Math.min(Math.max(requestedRadius, bounds.min), bounds.max);
      const chosenName = (options?.name && String(options.name).trim()) || 'Artificial World';
      const cost = this.calculateCost(radiusEarth);
      const durationContext = this.getDurationContext(radiusEarth);
      if (this.exceedsDurationLimit(durationContext.durationMs)) {
        return false;
      }
      if (!this.canCoverCost(cost)) {
        return false;
      }
      const deduction = this.pullResources(cost);
      if (!deduction) return false;

      const areaHa = this.calculateAreaHectares(radiusEarth);
        const terraformedValue = this.calculateTerraformWorldValue(radiusEarth);
      const { durationMs, worldCount } = durationContext;
      if (this.exceedsDurationLimit(durationMs)) {
        return false;
      }
      const now = Date.now();
      let sector = options?.sector || 'auto';
      if (sector === 'auto') {
        sector = (spaceManager && spaceManager.getCurrentWorldOriginal)
          ? spaceManager.getCurrentWorldOriginal()?.merged?.celestialParameters?.sector || null
          : null;
      }
      const generationSeed = (this.nextId * 0x9e3779b9) >>> 0;
      const starContextDetails = buildArtificialStarContext({
        seed: generationSeed,
        hasStar,
        minFlux: coreConfig.minFlux,
        maxFlux: coreConfig.maxFlux
      });
      const star = starContextDetails.star;

      this.activeProject = {
          id: this.nextId,
          seed: this.createSeed(),
          name: chosenName,
          type: 'shell',
          core,
          starContext: effectiveStarContext,
          hasStar,
          allowStar,
          minFlux: coreConfig.minFlux,
          maxFlux: coreConfig.maxFlux,
          radiusEarth,
          areaHa,
          landHa: areaHa,
          durationMs,
          remainingMs: durationMs,
          status: 'building',
          startedAt: now,
          completedAt: null,
          cost,
          terraformedValue,
          fleetCapacityValue: this.calculateFleetCapacityWorldValue(radiusEarth, terraformedValue),
          distanceFromStarAU: starContextDetails.distanceFromStarAU,
          targetFluxWm2: starContextDetails.fluxWm2,
          isRogue: starContextDetails.isRogue,
          sector,
          star,
          stockpile: { metal: 0, silicon: 0 },
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

    isCurrentWorldArtificial() {
        if (spaceManager && spaceManager.currentArtificialKey !== null) {
            return true;
        }
        const archetype = currentPlanetParameters?.classification?.archetype;
        return archetype === 'artificial';
    }

    discardConstructedWorld() {
        if (!this.activeProject || this.activeProject.status !== 'completed') return false;
        this.recordHistoryEntry('discarded');
        this.activeProject = null;
        this.updateUI(true);
        return true;
    }

    getStockpileCap(project = this.activeProject) {
        if (!project) return 0;
        const landHa = project.landHa || project.areaHa || this.calculateAreaHectares(project.radiusEarth);
        return Math.max(0, landHa || 0);
    }

    addStockpile(payload, prioritizeStorage = this.getPrioritizeSpaceStorage()) {
        if (!this.activeProject) return false;
        const amounts = {
            metal: Math.max(payload?.metal || 0, 0),
            silicon: Math.max(payload?.silicon || 0, 0)
        };
        if (!amounts.metal && !amounts.silicon) return false;
        const cap = this.getStockpileCap(this.activeProject);
        const remainingMetal = Math.max(0, cap - this.activeProject.stockpile.metal);
        const remainingSilicon = Math.max(0, cap - this.activeProject.stockpile.silicon);
        const request = {};
        if (remainingMetal > 0 && amounts.metal > 0) {
            request.metal = Math.min(amounts.metal, remainingMetal);
        }
        if (remainingSilicon > 0 && amounts.silicon > 0) {
            request.silicon = Math.min(amounts.silicon, remainingSilicon);
        }
        if (!request.metal && !request.silicon) return false;

        const deduction = this.pullResources(request, prioritizeStorage);
        if (!deduction) return false;
        this.activeProject.stockpile.metal += request.metal || 0;
        this.activeProject.stockpile.silicon += request.silicon || 0;
        this.activeProject.override = null;
        this.updateUI(true);
        return true;
    }

    canUseSolisBailout() {
        if (!this.isCurrentWorldArtificial()) return false;
        const artifacts = resources?.special?.alienArtifact;
        return artifacts && artifacts.value >= 10;
    }

    claimSolisBailout() {
        if (!this.canUseSolisBailout()) return false;
        const artifacts = resources?.special?.alienArtifact;
        artifacts.decrease(10);
        const payout = 100_000_000;
        if (this.activeProject) {
            this.activeProject.stockpile.metal += payout;
            this.activeProject.stockpile.silicon += payout;
            this.activeProject.override = null;
        } else {
            resources?.colony?.metal?.increase?.(payout, true);
            resources?.colony?.silicon?.increase?.(payout, true);
        }
        this.updateUI(true);
        return true;
    }

    addInitialDeposit(payload, prioritizeStorage = this.getPrioritizeSpaceStorage()) {
        return this.addStockpile(payload, prioritizeStorage);
    }

    resetInitialResources(resources) {
        Object.keys(resources || {}).forEach((categoryKey) => {
            const category = resources[categoryKey];
            Object.keys(category || {}).forEach((resourceKey) => {
                const entry = category[resourceKey];
                if (!entry || resourceKey === 'metal' || resourceKey === 'silicon') return;
                if (entry.initialValue !== undefined) {
                    category[resourceKey] = { ...entry, initialValue: 0 };
                }
            });
        });
    }

    buildSnapshotFromParams(params) {
        const radiusKm = params.celestialParameters.radius;
        const radiusEarth = radiusKm / EARTH_RADIUS_KM;
        const landHa = params.resources.surface.land.initialValue
            || params.resources.surface.land.baseCap
            || this.calculateAreaHectares(radiusEarth);
        const core = params.classification?.core || 'super-earth';
        const coreConfig = getArtificialCoreConfig(core);
        const isRogue = params.celestialParameters.rogue === true;
        const allowStar = coreConfig.allowStar !== false;
        const hasStar = allowStar && !isRogue;
        return {
            name: params.name,
            type: params.classification?.type || 'shell',
            core,
            radiusEarth,
            landHa,
            sector: params.celestialParameters?.sector,
            star: params.star,
            distanceFromStarAU: params.celestialParameters?.distanceFromSun,
            targetFluxWm2: params.celestialParameters?.targetFluxWm2,
            isRogue,
            allowStar,
            hasStar,
            stockpile: {
                metal: params.resources.colony.metal?.initialValue || 0,
                silicon: params.resources.colony.silicon?.initialValue || 0
            }
        };
    }

    buildOverride(project) {
        if (!project) return null;
        const radiusKm = project.radiusEarth * EARTH_RADIUS_KM;
        const gravity = 9.81;
        const sector = project.sector || currentPlanetParameters?.celestialParameters?.sector || 'R5-07';
        const allowStar = project.hasStar !== false && project.allowStar !== false;
        const star = project.star ? JSON.parse(JSON.stringify(project.star)) : null;
        const stockpileMetal = project.stockpile?.metal || project.initialDeposit?.metal || 0;
        const stockpileSilicon = project.stockpile?.silicon || project.initialDeposit?.silicon || 0;
        const isRogue = project.isRogue === true || !allowStar;
        const distanceFromStarAU = isRogue ? 0 : (project.distanceFromStarAU || 1);
        const starLuminosity = star ? star.luminositySolar : 0;

        const base = JSON.parse(JSON.stringify(defaultPlanetParameters || {}));
        this.resetInitialResources(base.resources);
        base.name = project.name;
        base.specialAttributes = { ...(base.specialAttributes || {}), hasSand: false };
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
            spinPeriod: isRogue ? 0 : 24, // Rogue worlds have no spin, others match rotation
            starLuminosity: isRogue ? 0 : starLuminosity,
            sector,
            distanceFromSun: distanceFromStarAU,
            rogue: isRogue,
            targetFluxWm2: project.targetFluxWm2
        };
        if (star) {
            base.star = star;
        }
        base.resources = base.resources || {};
        base.resources.surface = base.resources.surface || {};
        base.resources.colony = base.resources.colony || {};
        base.resources.underground = base.resources.underground || {};
        base.resources.underground.ore = {
            ...(base.resources.underground.ore || {}),
            initialValue: 0,
            maxDeposits: 0,
            areaTotal: 0
        };
        base.resources.underground.geothermal = {
            ...(base.resources.underground.geothermal || {}),
            initialValue: 0,
            maxDeposits: 0,
            areaTotal: 0
        };
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
        const metalCap = Math.max(base.resources.colony.metal?.baseCap || 0, stockpileMetal);
        const siliconCap = Math.max(base.resources.colony.silicon?.baseCap || 0, stockpileSilicon);
        base.resources.colony.metal = {
            ...(base.resources.colony.metal || {}),
            initialValue: stockpileMetal,
            baseCap: metalCap
        };
        base.resources.colony.silicon = {
            ...(base.resources.colony.silicon || {}),
            initialValue: stockpileSilicon,
            baseCap: siliconCap
        };
        base.zonalSurface = {
            tropical: { liquidWater: 0, ice: 0, buriedIce: 0, dryIce: 0, buriedDryIce: 0, liquidCO2: 0, biomass: 0, hazardousBiomass: 0, liquidMethane: 0, hydrocarbonIce: 0, buriedHydrocarbonIce: 0 },
            temperate: { liquidWater: 0, ice: 0, buriedIce: 0, dryIce: 0, buriedDryIce: 0, liquidCO2: 0, biomass: 0, hazardousBiomass: 0, liquidMethane: 0, hydrocarbonIce: 0, buriedHydrocarbonIce: 0 },
            polar: { liquidWater: 0, ice: 0, buriedIce: 0, dryIce: 0, buriedDryIce: 0, liquidCO2: 0, biomass: 0, hazardousBiomass: 0, liquidMethane: 0, hydrocarbonIce: 0, buriedHydrocarbonIce: 0 }
        };
        base.visualization = { ...(base.visualization || {}), baseColor: '#2a3d4f' };
        return base;
    }

    recordHistoryEntry(status) {
        if (!this.activeProject) return;
        const landHa = this.activeProject.areaHa || this.activeProject.landHa || this.calculateAreaHectares(this.activeProject.radiusEarth);
        const entry = {
            id: this.activeProject.id,
            seed: this.activeProject.seed,
            name: this.activeProject.name,
            type: this.activeProject.type,
            core: this.activeProject.core,
            radiusEarth: this.activeProject.radiusEarth,
            landHa,
            terraformedValue: this.deriveTerraformWorldValue(this.activeProject),
            fleetCapacityValue: this.deriveFleetCapacityWorldValue(this.activeProject),
            builtFrom: this.activeProject.builtFrom,
            constructedAt: this.activeProject.startedAt,
            completedAt: this.activeProject.completedAt || null,
            status,
            traveledAt: status === 'traveled' ? Date.now() : null,
            discardedAt: status === 'discarded' ? Date.now() : null
        };
        this.history.unshift(entry);
        this.history = this.history.slice(0, 50);
        this.travelHistory.unshift(entry);
        this.travelHistory = this.travelHistory.slice(0, 50);
    }

    getTravelWarning() {
        if (!this.activeProject || this.activeProject.status !== 'completed') return null;
        const stockpile = this.activeProject.stockpile || {};
        const metal = stockpile.metal || this.activeProject.initialDeposit?.metal || 0;
        const silicon = stockpile.silicon || this.activeProject.initialDeposit?.silicon || 0;
        if (metal > 0 && silicon > 0) return null;
        const missing = [];
        if (!metal) missing.push('metal');
        if (!silicon) missing.push('silicon');
        return {
            message: `No ${missing.join(' and ')} staged for this artificial world. Travel anyway?`
        };
    }

    travelToConstructedWorld() {
        if (!this.activeProject || this.activeProject.status !== 'completed') return false;
        const override = this.buildOverride(this.activeProject);
        this.activeProject.override = override;
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

    travelToStoredWorld(key) {
        const seed = String(key);
        const status = spaceManager.artificialWorldStatuses[seed];
        const snapshot = status.artificialSnapshot;
        const override = this.buildOverride(snapshot);
        const res = {
            merged: override,
            seedString: seed,
            terraformedValue: status.terraformedValue,
            original: {
                merged: override,
                override,
                star: override.star,
                artificial: true,
                archetype: override.classification?.archetype
            },
            artificial: true
        };
        return spaceManager.travelToRandomWorld(res, seed);
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
            this.activeProject.override = null;
        }
        if (triggerUpdate) {
            this.updateUI(true);
        }
        return true;
    }

    getStatusText() {
        if (!this.enabled) return 'Artificial systems standby.';
        if (!this.activeProject) return 'No active megastructure. Ready to draft an artificial world.';
        if (this.activeProject.status === 'building') {
            const pct = Math.max(0, Math.min(100, 100 - (this.activeProject.remainingMs / this.activeProject.durationMs) * 100));
            return `${this.activeProject.name} under construction (${pct.toFixed(1)}%).`;
        }
        if (this.activeProject.status === 'completed') {
            return `${this.activeProject.name} is complete and awaiting travel.`;
        }
        return 'Artificial systems online.';
    }

    getHistoryEntries() {
        const entries = [];
        const statuses = spaceManager && spaceManager.artificialWorldStatuses ? spaceManager.artificialWorldStatuses : {};
        const currentKey = spaceManager && spaceManager.currentArtificialKey ? String(spaceManager.currentArtificialKey) : null;

        const pushEntry = (key, status, label) => {
            if (!status) return;
            const snapshot = status.artificialSnapshot;
            const merged = status.original?.merged || status.original || null;
            const radiusKm = merged?.celestialParameters?.radius;
            const radiusEarth = radiusKm ? (radiusKm / EARTH_RADIUS_KM) : status.radiusEarth;
            const landHa = status.cachedLandHa
                || status.landHa
                || snapshot?.landHa
                || merged?.resources?.surface?.land?.initialValue
                || merged?.resources?.surface?.land?.baseCap
                || (radiusEarth ? this.calculateAreaHectares(radiusEarth) : snapshot?.landHa);
            const terraformedValue = this.deriveTerraformWorldValue({
                terraformedValue: status.terraformedValue,
                radiusEarth,
                landHa
            });
            const canTravel = label === 'abandoned' && !!snapshot;
            entries.push({
                id: key,
                seed: key,
                name: status.name || merged?.name || snapshot?.name || `Artificial ${key}`,
                type: merged?.classification?.type || snapshot?.type || 'shell',
                core: merged?.classification?.core || snapshot?.core || 'unknown',
                radiusEarth: radiusEarth || snapshot?.radiusEarth,
                landHa,
                terraformedValue,
                builtFrom: status.original?.builtFrom || 'unknown',
                constructedAt: status.original?.constructedAt || null,
                completedAt: status.original?.completedAt || null,
                status: label,
                traveledAt: status.departedAt || status.arrivedAt || null,
                departedAt: status.departedAt || null,
                discardedAt: null,
                canTravel
            });
        };

        if (this.activeProject) {
            const proj = this.activeProject;
            const terraformedValue = this.deriveTerraformWorldValue(proj);
            entries.push({
                id: proj.id,
                seed: proj.seed,
                name: proj.name,
                type: proj.type,
                core: proj.core,
                radiusEarth: proj.radiusEarth,
                landHa: proj.areaHa || proj.landHa,
                terraformedValue,
                builtFrom: proj.builtFrom,
                constructedAt: proj.startedAt,
                completedAt: proj.completedAt || null,
                status: proj.status || 'building',
                traveledAt: proj.status === 'traveled' ? Date.now() : null,
                departedAt: null,
                discardedAt: null
            });
        }

        if (currentKey) {
            const liveStatus = statuses[currentKey] || {
                name: currentPlanetParameters?.name || `Artificial ${currentKey}`,
                terraformed: false,
                original: {
                    merged: currentPlanetParameters || null
                },
                visited: true
            };
            pushEntry(currentKey, liveStatus, liveStatus.terraformed ? 'terraformed' : 'current');
        }

        Object.entries(statuses).forEach(([key, status]) => {
            if (!status || key === currentKey) return;
            if (status.terraformed) {
                pushEntry(key, status, 'terraformed');
                return;
            }
            if (status.abandoned) {
                pushEntry(key, status, 'abandoned');
            }
        });

        entries.sort((a, b) => {
            const aDeparture = a.departedAt || null;
            const bDeparture = b.departedAt || null;
            if (aDeparture === null && bDeparture === null) return 0;
            if (aDeparture === null) return -1;
            if (bDeparture === null) return 1;
            return bDeparture - aDeparture;
        });

        return entries;
    }

    saveState() {
        const project = this.activeProject ? { ...this.activeProject } : null;
        if (project && project.override) {
            delete project.override;
        }
        return {
            enabled: this.enabled,
            prioritizeSpaceStorage: this.prioritizeSpaceStorage,
            nextId: this.nextId,
            activeProject: project,
            history: this.history,
            travelHistory: this.travelHistory
        };
    }

    loadState(state) {
        if (!state) return;
        this.prioritizeSpaceStorage = !!state.prioritizeSpaceStorage;
        this.activeProject = state.activeProject || null;
        if (this.activeProject) {
            this.activeProject.override = null;
            if (!this.activeProject.stockpile) {
                const legacyDeposit = this.activeProject.initialDeposit || {};
                const metal = legacyDeposit.metal || 0;
                const silicon = legacyDeposit.silicon || 0;
                this.activeProject.stockpile = { metal, silicon };
            }
            if (this.activeProject.initialDeposit) {
                delete this.activeProject.initialDeposit;
            }
            if (!this.activeProject.worldDivisor) {
                this.activeProject.worldDivisor = 1;
            }
            if (!this.activeProject.terraformedValue) {
                this.activeProject.terraformedValue = this.calculateTerraformWorldValue(this.activeProject.radiusEarth);
            }
            const terraformedValue = this.deriveTerraformWorldValue(this.activeProject);
            this.activeProject.fleetCapacityValue = this.calculateFleetCapacityWorldValue(
                this.activeProject.radiusEarth,
                Number.isFinite(this.activeProject.fleetCapacityValue) && this.activeProject.fleetCapacityValue > 0
                    ? this.activeProject.fleetCapacityValue
                    : terraformedValue
            );
            if (this.activeProject.hasStar === undefined) {
                this.activeProject.hasStar = true;
            }
            if (!this.activeProject.starContext) {
                this.activeProject.starContext = ARTIFICIAL_STAR_CONTEXTS[0].value;
            }
            if (this.activeProject.allowStar === undefined) {
                const cfg = getArtificialCoreConfig(this.activeProject.core);
                this.activeProject.allowStar = cfg.allowStar !== false;
            }
            if (this.activeProject.minFlux === undefined || this.activeProject.maxFlux === undefined) {
                const cfg = getArtificialCoreConfig(this.activeProject.core);
                this.activeProject.minFlux = cfg.minFlux;
                this.activeProject.maxFlux = cfg.maxFlux;
            }
            if (this.activeProject.isRogue === undefined) {
                this.activeProject.isRogue = this.activeProject.hasStar === false || this.activeProject.allowStar === false;
            }
            if (!this.activeProject.star) {
                const seed = (this.activeProject.id || this.nextId || 1) * 0x9e3779b9;
                const context = buildArtificialStarContext({
                    seed,
                    hasStar: !this.activeProject.isRogue,
                    minFlux: this.activeProject.minFlux,
                    maxFlux: this.activeProject.maxFlux
                });
                this.activeProject.star = context.star;
                this.activeProject.distanceFromStarAU = context.distanceFromStarAU;
                this.activeProject.targetFluxWm2 = context.fluxWm2;
                this.activeProject.isRogue = context.isRogue;
            }
            if (!this.activeProject.distanceFromStarAU && this.activeProject.star && !this.activeProject.isRogue) {
                const flux = this.activeProject.targetFluxWm2 || this.activeProject.minFlux || SOLAR_CONSTANT_WM2;
                this.activeProject.distanceFromStarAU = calculateOrbitFromFlux(this.activeProject.star.luminositySolar, flux);
            }
            if (this.activeProject.targetFluxWm2 === undefined) {
                if (this.activeProject.isRogue) {
                    this.activeProject.targetFluxWm2 = 0;
                } else if (this.activeProject.star) {
                    const dist = this.activeProject.distanceFromStarAU || 1;
                    this.activeProject.targetFluxWm2 = (SOLAR_CONSTANT_WM2 * this.activeProject.star.luminositySolar) / (dist * dist);
                }
            }
        }
        this.nextId = Math.max(state.nextId || this.nextId, (this.activeProject?.id || 0) + 1, 1);
        this.history = Array.isArray(state.history)
            ? state.history.map((entry) => ({
                ...entry,
                terraformedValue: this.deriveTerraformWorldValue(entry)
            }))
            : [];
        this.travelHistory = Array.isArray(state.travelHistory)
            ? state.travelHistory.map((entry) => ({
                ...entry,
                terraformedValue: this.deriveTerraformWorldValue(entry)
            }))
            : [...this.history];
        this.updateUI(true);
    }

    updateUI(force = false) {
        if (typeof updateArtificialUI === 'function') {
            updateArtificialUI({ force });
        }
    }
}

function getArtificialTypes() {
    return ARTIFICIAL_TYPES;
}

function getArtificialCores() {
    return ARTIFICIAL_CORES;
}

function getArtificialCoreConfig(coreValue) {
    const fallback = ARTIFICIAL_CORES[0];
    return ARTIFICIAL_CORES.find((entry) => entry.value === coreValue) || fallback;
}

function getArtificialStarContexts() {
    return ARTIFICIAL_STAR_CONTEXTS;
}

function getArtificialCoreBounds(coreValue) {
    const core = getArtificialCoreConfig(coreValue);
    const min = core?.minRadiusEarth || DEFAULT_RADIUS_BOUNDS.min;
    const max = core?.maxRadiusEarth || DEFAULT_RADIUS_BOUNDS.max;
    return {
        min: Math.min(Math.max(min, DEFAULT_RADIUS_BOUNDS.min), Math.max(max, DEFAULT_RADIUS_BOUNDS.min)),
        max: Math.max(min, max)
    };
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
    window.getArtificialTypes = getArtificialTypes;
    window.getArtificialCores = getArtificialCores;
    window.getArtificialStarContexts = getArtificialStarContexts;
    window.getArtificialCoreBounds = getArtificialCoreBounds;
    window.getArtificialCoreConfig = getArtificialCoreConfig;
    window.ARTIFICIAL_FLEET_CAPACITY_WORLDS = ARTIFICIAL_FLEET_CAPACITY_WORLDS;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ArtificialManager,
        setArtificialManager,
        getArtificialTypes,
        getArtificialCores,
        getArtificialStarContexts,
        getArtificialCoreBounds,
        getArtificialCoreConfig,
        ARTIFICIAL_FLEET_CAPACITY_WORLDS
    };
}
