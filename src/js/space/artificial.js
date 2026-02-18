const EARTH_AREA_HA = Math.round(4 * Math.PI * (EARTH_RADIUS_KM * 1000) * (EARTH_RADIUS_KM * 1000) / 10_000);
const DEFAULT_RADIUS_BOUNDS = { min: 2, max: 8 };
const ARTIFICIAL_TYPES = [
    { value: 'shell', label: 'Shellworld', disabled: false },
    { value: 'ring', label: 'Ringworld', disabled: true, disabledSource: 'World 10' },
    { value: 'disk', label: 'Artificial disk (coming not so soon)', disabled: true }
];
const ARTIFICIAL_CORES = [
    { value: 'super-earth', label: 'Super Earth', disabled: false, minRadiusEarth: 1.4, maxRadiusEarth: 3.2, allowStar: true, minFlux: 800, maxFlux: 1600 },
    { value: 'ice-giant', label: 'Ice giant', disabled: false, minRadiusEarth: 3.2, maxRadiusEarth: 4.5, allowStar: true, minFlux: 50, maxFlux: 500 },
    { value: 'intermediate-giant', label: 'Intermediate giant', disabled: false, minRadiusEarth: 4.5, maxRadiusEarth: 20, allowStar: true, minFlux: 50, maxFlux: 800 },
    { value: 'gas-giant', label: 'Gas giant', disabled: true, disabledSource : "World 9", minRadiusEarth: 20, maxRadiusEarth: 70, allowStar: true, minFlux: 50, maxFlux: 800 },
    { value: 'brown-dwarf', label: 'Brown Dwarf', disabled: true, disabledSource : "World 10", minRadiusEarth: 70, maxRadiusEarth: 160, allowStar: false},
    { value: 'white-dwarf', label: 'White Dwarf', disabled: true, disabledSource : "World 12", minRadiusEarth: 360, maxRadiusEarth: 600, allowStar: false},
    { value: 'neutron-star', label: 'Neutron Star', disabled: true, disabledSource : "World 13", minRadiusEarth: 600, maxRadiusEarth: 900, allowStar: false},
    { value: 'stellar-bh', label: 'Stellar Black Hole', disabled: true, disabledSource : "World 14", minRadiusEarth: 900, maxRadiusEarth: 10000, allowStar: false},
    { value: 'smbh', label: 'Supermassive Black Hole', disabled: true, disabledSource : "World 14 & Galactic Conquest", minRadiusEarth: 1200000, maxRadiusEarth: 1200000, allowStar: false}
];
const ARTIFICIAL_STAR_CONTEXTS = [
    { value: 'with-star', label: 'Star in system', hasStar: true, disabled: false },
    { value: 'starless', label: 'Starless deep space', hasStar: false, disabled: false }
];
const SOLAR_CONSTANT_WM2 = 1361;
const AU_IN_KM = 149_597_870.7;
const AU_TO_EARTH_RADII = 23_481.07;
const RINGWORLD_WIDTH_BOUNDS_KM = { min: 1_000, max: 1_000_000 };
const RINGWORLD_TARGET_FLUX_WM2 = 1_300;
const RINGWORLD_FLUX_BOUNDS_WM2 = { min: 1_000, max: 1_400 };
const RINGWORLD_STAR_CORES = [
    { value: 'm-dwarf', label: 'Red Dwarf (M‑class)', spectralType: 'M', disabled: false, minRadiusAU: 0.03, maxRadiusAU: 0.25, minPeriodDays_1g: 1.56, maxPeriodDays_1g: 4.49, maxWidthKm: 80_000 },
    { value: 'k-dwarf', label: 'Orange Dwarf (K‑class)', spectralType: 'K', disabled: true, disabledSource: "World 11", minRadiusAU: 0.30, maxRadiusAU: 0.80, minPeriodDays_1g: 4.92, maxPeriodDays_1g: 8.03, maxWidthKm: 110_000 },
    { value: 'g-dwarf', label: 'Yellow Dwarf (G‑class)', spectralType: 'G', disabled: true, disabledSource: "World 12", minRadiusAU: 0.85, maxRadiusAU: 1.60, minPeriodDays_1g: 8.28, maxPeriodDays_1g: 11.36, maxWidthKm: 120_000 },
    { value: 'f-dwarf', label: 'Yellow‑White (F‑class)', spectralType: 'F', disabled: true, disabledSource: "World 13", minRadiusAU: 1.70, maxRadiusAU: 3.00, minPeriodDays_1g: 11.71, maxPeriodDays_1g: 15.56, maxWidthKm: 150_000 },
    { value: 'a-star', label: 'White Star (A‑class)', spectralType: 'A', disabled: true, disabledSource: "World 14", minRadiusAU: 3.20, maxRadiusAU: 8.00, minPeriodDays_1g: 16.07, maxPeriodDays_1g: 25.40, maxWidthKm: 200_000 },
    { value: 'b-star', label: 'Blue Star (B‑class)', spectralType: 'B', disabled: true, disabledSource: "World 14 & Galactic Conquest", minRadiusAU: 8.50, maxRadiusAU: 120, minPeriodDays_1g: 26.19, maxPeriodDays_1g: 98.39, maxWidthKm: 300_000 },
    { value: 'o-star', label: 'O‑class (very massive)', spectralType: 'O', disabled: true, disabledSource: "World 14 & Galactic Conquest", minRadiusAU: 130, maxRadiusAU: 600, minPeriodDays_1g: 102.41, maxPeriodDays_1g: 220.01, maxWidthKm: 400_000 }
];
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
const AUTO_RADIUS_STEP = 0.01;
const AUTO_RADIUS_ITERATIONS = 32;
const AUTO_RING_ORBIT_STEP = 0.001;
const AUTO_RING_WIDTH_STEP = 1;
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

function getRingStarCores() {
    return RINGWORLD_STAR_CORES;
}

function getRingStarCoreConfig(value) {
    const fallback = RINGWORLD_STAR_CORES[0];
    return RINGWORLD_STAR_CORES.find((entry) => entry.value === value) || fallback;
}

function getRingRadiusBoundsAU(coreValue) {
    const core = getRingStarCoreConfig(coreValue);
    const min = Math.max(core?.minRadiusAU || 0.03, 0.01);
    const max = Math.max(core?.maxRadiusAU || min, min);
    return { min, max };
}

function getRingWidthBoundsKm(coreValue) {
    const core = getRingStarCoreConfig(coreValue);
    const min = RINGWORLD_WIDTH_BOUNDS_KM.min;
    const max = Math.max(core?.maxWidthKm || RINGWORLD_WIDTH_BOUNDS_KM.max, min);
    return { min, max };
}

function clampRingWidthKm(value, coreValue) {
    const bounds = getRingWidthBoundsKm(coreValue);
    const next = Math.max(0, Number(value) || 0);
    return Math.min(Math.max(next, bounds.min), bounds.max);
}

function clampRingOrbitRadiusAU(value, bounds) {
    const next = Math.max(0, Number(value) || 0);
    return Math.min(Math.max(next, bounds.min), bounds.max);
}

function clampRingTargetFluxWm2(value) {
    const next = Math.max(0, Number(value) || 0);
    return Math.min(Math.max(next, RINGWORLD_FLUX_BOUNDS_WM2.min), RINGWORLD_FLUX_BOUNDS_WM2.max);
}

function estimateRingRotationPeriodHours(orbitRadiusAU) {
    const radiusMeters = (Math.max(orbitRadiusAU || 0, 0) * AU_IN_KM) * 1000;
    const gravity = 9.81;
    if (!radiusMeters) return 24;
    const omega = Math.sqrt(gravity / radiusMeters);
    const seconds = (2 * Math.PI) / omega;
    return Math.max(0.1, seconds / 3600);
}

function generateRingStar({ seed, spectralType, orbitRadiusAU, targetFluxWm2 }) {
    const rng = mulberry32(seed >>> 0);
    const spec = spectralType || 'G';
    const distanceAU = Math.max(orbitRadiusAU || 1, 0.01);
    const desiredLuminositySolar = Math.max(0.0005, (Math.max(targetFluxWm2 || RINGWORLD_TARGET_FLUX_WM2, 0) / SOLAR_CONSTANT_WM2) * (distanceAU * distanceAU));
    const range = ARTIFICIAL_STAR_MASS_RANGES[spec] || ARTIFICIAL_STAR_MASS_RANGES.M;
    const massFromLuminosity = Math.pow(desiredLuminositySolar, 1 / 3.5);
    const mass = Math.min(Math.max(massFromLuminosity, range[0]), range[1]);
    const radius = radiusFromMassSolar(mass);
    const buildSegment = () => {
        const index = Math.floor(rng() * ARTIFICIAL_STAR_SYLLABLES.length);
        return ARTIFICIAL_STAR_SYLLABLES[index] || 'sol';
    };
    const core = `${buildSegment()}${buildSegment()}${buildSegment()}`;
    const name = `${core.charAt(0).toUpperCase()}${core.slice(1)}-${String((seed >>> 0) % 1000).padStart(3, '0')}`;
    const temperatureK = calculateStarTemperatureK(desiredLuminositySolar, radius);
    return {
        name,
        spectralType: spec,
        luminositySolar: desiredLuminositySolar,
        massSolar: mass,
        radiusSolar: radius,
        temperatureK,
        habitableZone: buildHabitableZone(desiredLuminositySolar)
    };
}

function calculateRingLandHectares(orbitRadiusAU, widthKm) {
    const radiusKm = Math.max(orbitRadiusAU || 0, 0) * AU_IN_KM;
    const width = Math.max(widthKm || 0, 0);
    const circumferenceKm = 2 * Math.PI * radiusKm;
    const areaKm2 = circumferenceKm * width;
    return Math.max(0, areaKm2 * 100);
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
        this.draftSelection = this.normalizeDraftSelection(this.createDefaultDraftSelection());
        this.history = [];
        this.travelHistory = [];
        this.prepay = {
            signature: '',
            paid: { metal: 0, superalloys: 0 }
        };
        this.fleetCapacityWorldCap = ARTIFICIAL_FLEET_CAPACITY_WORLDS;
        this._tickTimer = 0;
    }

    createDefaultDraftSelection() {
        const types = getArtificialTypes();
        const typeDefault = types.find((entry) => !entry.disabled) || types[0];
        const cores = getArtificialCores();
        const coreDefault = cores.find((entry) => !entry.disabled) || cores[0];
        const starContexts = getArtificialStarContexts();
        const starDefault = starContexts.find((entry) => !entry.disabled) || starContexts[0];
        const ringCores = getRingStarCores();
        const ringDefault = ringCores.find((entry) => !entry.disabled) || ringCores[0];
        const coreBounds = getArtificialCoreBounds(coreDefault.value);
        const orbitBounds = getRingRadiusBoundsAU(ringDefault.value);
        return {
            type: typeDefault.value,
            core: coreDefault.value,
            starContext: starDefault.value,
            radiusEarth: coreBounds.min,
            ringStarCore: ringDefault.value,
            orbitRadiusAU: clampRingOrbitRadiusAU(orbitBounds.min, orbitBounds),
            widthKm: clampRingWidthKm(10_000, ringDefault.value),
            targetFluxWm2: clampRingTargetFluxWm2(RINGWORLD_TARGET_FLUX_WM2),
            sector: 'auto',
            sectorFilter: 'all',
            name: ''
        };
    }

    normalizeDraftSelection(selection) {
        const types = getArtificialTypes();
        const typeDefault = types.find((entry) => !entry.disabled) || types[0];
        const typeValue = types.some((entry) => entry.value === selection.type)
            ? selection.type
            : typeDefault.value;
        const cores = getArtificialCores();
        const coreDefault = cores.find((entry) => !entry.disabled) || cores[0];
        const coreValue = cores.some((entry) => entry.value === selection.core)
            ? selection.core
            : coreDefault.value;
        const starContexts = getArtificialStarContexts();
        const starDefault = starContexts.find((entry) => !entry.disabled) || starContexts[0];
        const starValue = starContexts.some((entry) => entry.value === selection.starContext)
            ? selection.starContext
            : starDefault.value;
        const ringCores = getRingStarCores();
        const ringDefault = ringCores.find((entry) => !entry.disabled) || ringCores[0];
        const requestedRingCore = selection.ringStarCore || (typeValue === 'ring' ? selection.core : null);
        const ringValue = ringCores.some((entry) => entry.value === requestedRingCore)
            ? requestedRingCore
            : ringDefault.value;
        const coreBounds = getArtificialCoreBounds(coreValue);
        const orbitBounds = getRingRadiusBoundsAU(ringValue);
        return {
            type: typeValue,
            core: coreValue,
            starContext: starValue,
            radiusEarth: Math.min(Math.max(Number(selection.radiusEarth) || coreBounds.min, coreBounds.min), coreBounds.max),
            ringStarCore: ringValue,
            orbitRadiusAU: clampRingOrbitRadiusAU(selection.orbitRadiusAU, orbitBounds),
            widthKm: clampRingWidthKm(selection.widthKm, ringValue),
            targetFluxWm2: clampRingTargetFluxWm2(selection.targetFluxWm2),
            sector: selection.sector || 'auto',
            sectorFilter: selection.sectorFilter || 'all',
            name: selection.name || ''
        };
    }

    getDraftSelection() {
        return { ...this.draftSelection };
    }

    setDraftSelection(next) {
        const incoming = next || {};
        const merged = { ...this.draftSelection };
        Object.keys(incoming).forEach((key) => {
            incoming[key] !== undefined && (merged[key] = incoming[key]);
        });
        this.draftSelection = this.normalizeDraftSelection(merged);
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

    enableRingworld() {
        const entry = ARTIFICIAL_TYPES.find((type) => type.value === 'ring');
        if (!entry || !entry.disabled) return;
        entry.disabled = false;
        entry.disabledSource = null;
        this.updateUI(true);
    }

    unlockCore(coreId) {
        const entry = ARTIFICIAL_CORES.find((core) => core.value === coreId);
        if (!entry || !entry.disabled) return;
        entry.disabled = false;
        entry.disabledSource = null;
        this.updateUI(true);
    }

    unlockRingStarCore(coreId) {
        const entry = RINGWORLD_STAR_CORES.find((core) => core.value === coreId);
        if (!entry || !entry.disabled) return;
        entry.disabled = false;
        entry.disabledSource = null;
        this.updateUI(true);
    }

    getFleetCapacityWorldCap() {
        return Math.max(1, Math.floor(this.fleetCapacityWorldCap || ARTIFICIAL_FLEET_CAPACITY_WORLDS));
    }

    setFleetCapacityWorldCap(value) {
        const next = Math.max(1, Math.floor(value || ARTIFICIAL_FLEET_CAPACITY_WORLDS));
        if (next === this.fleetCapacityWorldCap) return;
        this.fleetCapacityWorldCap = next;
        if (this.activeProject) {
            const terraformedValue = this.deriveTerraformWorldValue(this.activeProject);
            this.activeProject.fleetCapacityValue = this.calculateFleetCapacityWorldValue(
                this.activeProject.radiusEarth,
                terraformedValue
            );
        }
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
        if (effect.type === 'enableRingworld') {
            this.enableRingworld();
            return;
        }
        if (effect.type === 'unlockCore') {
            this.unlockCore(effect.targetId);
            return;
        }
        if (effect.type === 'unlockRingStarCore') {
            this.unlockRingStarCore(effect.targetId);
            return;
        }
        if (effect.type === 'setFleetCapacityWorldCap') {
            this.setFleetCapacityWorldCap(effect.value);
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

    calculateRingworldCost(landHa, widthKm) {
        const land = Math.max(landHa || 0, 0);
        const width = Math.max(widthKm || 0, 0);
        const widthFactor = Math.max(width / 10_000, 0);
        const superalloysPerHa = SHELL_COST_CALIBRATION.superalloys / SHELL_COST_CALIBRATION.landHa;
        const superalloys = superalloysPerHa * land * 100 * widthFactor;
        return { superalloys, metal: superalloys };
    }

    calculateRingWorldAreaHectares(orbitRadiusAU, widthKm) {
        return calculateRingLandHectares(orbitRadiusAU, widthKm);
    }

    calculateRadiusEarthFromLandHectares(landHa) {
        const land = Math.max(landHa || 0, 0);
        if (!land) return DEFAULT_RADIUS_BOUNDS.min;
        return Math.sqrt(land / EARTH_AREA_HA);
    }

    calculateTerraformWorldValue(radiusEarth) {
        const land = this.calculateAreaHectares(radiusEarth);
        return Math.max(1, Math.floor((land || 0) / TERRAFORM_WORLD_DIVISOR));
    }

    calculateFleetCapacityWorldValue(radiusEarth, terraformedValue) {
        const worldValue = Number.isFinite(terraformedValue) && terraformedValue > 0
            ? terraformedValue
            : this.calculateTerraformWorldValue(radiusEarth);
        return Math.min(this.getFleetCapacityWorldCap(), worldValue);
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

    getAutoRadius(bounds) {
        const targetMs = MAX_SHELL_DURATION_MS;
        let low = bounds.min;
        let high = bounds.max;
        const lowDuration = this.getDurationContext(low).durationMs;
        const highDuration = this.getDurationContext(high).durationMs;
        let candidate = high;
        if (lowDuration >= targetMs) {
            candidate = low;
        } else if (highDuration <= targetMs) {
            candidate = high;
        } else {
            for (let i = 0; i < AUTO_RADIUS_ITERATIONS; i += 1) {
                const mid = (low + high) / 2;
                const midDuration = this.getDurationContext(mid).durationMs;
                if (midDuration > targetMs) {
                    high = mid;
                } else {
                    low = mid;
                }
            }
            candidate = high;
        }
        let snapped = Math.round(candidate / AUTO_RADIUS_STEP) * AUTO_RADIUS_STEP;
        let durationMs = this.getDurationContext(snapped).durationMs;
        while (durationMs > targetMs && snapped > bounds.min) {
            snapped = Math.round((snapped - AUTO_RADIUS_STEP) / AUTO_RADIUS_STEP) * AUTO_RADIUS_STEP;
            durationMs = this.getDurationContext(snapped).durationMs;
        }
        return Math.min(Math.max(snapped, bounds.min), bounds.max);
    }

    getAutoRingOrbit(bounds, widthKm) {
        const targetMs = MAX_SHELL_DURATION_MS;
        const width = Math.max(widthKm || 0, 0);
        const getDuration = (orbitRadiusAU) => {
            return this.getRingConstructionDurationMs(orbitRadiusAU, width);
        };
        let low = bounds.min;
        let high = bounds.max;
        const lowDuration = getDuration(low);
        const highDuration = getDuration(high);
        let candidate = high;
        if (lowDuration >= targetMs) {
            candidate = low;
        } else if (highDuration <= targetMs) {
            candidate = high;
        } else {
            for (let i = 0; i < AUTO_RADIUS_ITERATIONS; i += 1) {
                const mid = (low + high) / 2;
                const midDuration = getDuration(mid);
                if (midDuration > targetMs) {
                    high = mid;
                } else {
                    low = mid;
                }
            }
            candidate = high;
        }
        let snapped = Math.round(candidate / AUTO_RING_ORBIT_STEP) * AUTO_RING_ORBIT_STEP;
        let durationMs = getDuration(snapped);
        while (durationMs > targetMs && snapped > bounds.min) {
            snapped = Math.round((snapped - AUTO_RING_ORBIT_STEP) / AUTO_RING_ORBIT_STEP) * AUTO_RING_ORBIT_STEP;
            durationMs = getDuration(snapped);
        }
        return Math.min(Math.max(Number(snapped.toFixed(3)), bounds.min), bounds.max);
    }

    getAutoRingSelection(bounds, widthBounds) {
        const targetMs = MAX_SHELL_DURATION_MS;
        const minWidth = Math.max(widthBounds.min, 0);
        const maxWidth = Math.max(widthBounds.max, minWidth);
        const snappedMaxWidth = Math.floor(maxWidth / AUTO_RING_WIDTH_STEP) * AUTO_RING_WIDTH_STEP;
        const snappedMinWidth = Math.ceil(minWidth / AUTO_RING_WIDTH_STEP) * AUTO_RING_WIDTH_STEP;
        const minOrbitAU = Math.min(Math.max(bounds.min, 0.01), bounds.max);
        // Width-first: compute the largest width that still meets 5h at the smallest orbit.
        // Duration scales linearly with ring width for fixed orbit/core bounds.
        const minOrbitDurationAtMaxWidth = this.getRingConstructionDurationMs(minOrbitAU, snappedMaxWidth);
        const widthScale = minOrbitDurationAtMaxWidth > 0
            ? targetMs / minOrbitDurationAtMaxWidth
            : 1;
        let chosenWidthKm = Math.floor((snappedMaxWidth * widthScale) / AUTO_RING_WIDTH_STEP) * AUTO_RING_WIDTH_STEP;
        chosenWidthKm = Math.min(Math.max(chosenWidthKm, snappedMinWidth), snappedMaxWidth);

        let orbitRadiusAU = this.getAutoRingOrbit(bounds, chosenWidthKm);
        let durationMs = this.getRingConstructionDurationMs(orbitRadiusAU, chosenWidthKm);

        // Safety backoff for rare rounding edges.
        while (durationMs > targetMs && chosenWidthKm > snappedMinWidth) {
            chosenWidthKm -= AUTO_RING_WIDTH_STEP;
            orbitRadiusAU = this.getAutoRingOrbit(bounds, chosenWidthKm);
            durationMs = this.getRingConstructionDurationMs(orbitRadiusAU, chosenWidthKm);
        }

        return { orbitRadiusAU, widthKm: chosenWidthKm };
    }

    getRingConstructionDurationMs(orbitRadiusAU, widthKm) {
        const landHa = calculateRingLandHectares(orbitRadiusAU, widthKm);
        const radiusEarth = this.calculateRadiusEarthFromLandHectares(landHa);
        return this.getDurationContext(radiusEarth).durationMs;
    }

    exceedsDurationLimit(durationMs) {
        return Math.max(durationMs || 0, 0) > MAX_SHELL_DURATION_MS;
    }

    setPrioritizeSpaceStorage(value) {
        this.prioritizeSpaceStorage = !!value;
    }

    getPrioritizeSpaceStorage() {
        return this.prioritizeSpaceStorage;
    }

    createSeed() {
        const id = String(this.nextId).padStart(3, '0');
        return `A-${id}`;
    }

    getDefaultWorldName(type) {
        const baseName = type === 'ring' ? 'Ringworld' : 'Shellworld';
        const pattern = new RegExp(`^${baseName} \\d+$`);
        const statuses = spaceManager?.artificialWorldStatuses || {};
        const count = Object.values(statuses).reduce((total, status) => {
            const name = status?.name
                || status?.original?.merged?.name
                || status?.artificialSnapshot?.name
                || '';
            return pattern.test(name) ? total + 1 : total;
        }, 0);
        return `${baseName} ${count + 1}`;
    }

    getTotalPaymentAvailability(resourceKey) {
        const storageProj = projectManager && projectManager.projects && projectManager.projects.spaceStorage;
        const colonyRes = resources.colony[resourceKey];
        const colonyAvailable = colonyRes ? colonyRes.value : 0;
        const storageKey = resourceKey === 'water' ? 'liquidWater' : resourceKey;
        const storageAvailable = storageProj && storageProj.getAvailableStoredResource
            ? storageProj.getAvailableStoredResource(storageKey)
            : 0;
        return colonyAvailable + storageAvailable;
    }

    canCoverCost(cost) {
        for (const key of Object.keys(cost)) {
            const required = Math.max(cost[key] || 0, 0);
            if (!required) continue;
            const total = this.getTotalPaymentAvailability(key);
            if (total < required) {
                return false;
            }
        }
        return true;
    }

    buildPrepaySignature(selection, cost) {
        return JSON.stringify({
            type: selection?.type || 'shell',
            radiusEarth: selection?.radiusEarth || 0,
            orbitRadiusAU: selection?.orbitRadiusAU || 0,
            widthKm: selection?.widthKm || 0,
            targetFluxWm2: selection?.targetFluxWm2 || 0,
            core: selection?.core || '',
            starCore: selection?.starCore || '',
            starContext: selection?.starContext || '',
            cost: {
                metal: Math.max(cost?.metal || 0, 0),
                superalloys: Math.max(cost?.superalloys || 0, 0)
            }
        });
    }

    resetPrepay() {
        this.prepay.signature = '';
        this.prepay.paid = { metal: 0, superalloys: 0 };
    }

    clearPrepay() {
        this.resetPrepay();
        this.updateUI(true);
    }

    getRemainingCost(cost, paid) {
        const remaining = {};
        Object.keys(cost).forEach((key) => {
            const required = Math.max(cost[key] || 0, 0);
            const prepaid = Math.max(paid[key] || 0, 0);
            remaining[key] = Math.max(required - prepaid, 0);
        });
        return remaining;
    }

    getResourceAvailability(cost) {
        const availability = {};
        Object.keys(cost).forEach((key) => {
            const required = Math.max(cost[key] || 0, 0);
            if (!required) {
                availability[key] = 0;
                return;
            }
            availability[key] = this.getTotalPaymentAvailability(key);
        });
        return availability;
    }

    getPrepayState(selection, cost) {
        const signature = this.buildPrepaySignature(selection, cost);
        this.prepay.signature = signature;
        const paid = this.prepay.paid;
        const remaining = this.getRemainingCost(cost, paid);
        const availability = this.getResourceAvailability(remaining);
        const keys = Object.keys(remaining);
        let canStart = true;
        let canPrepay = false;
        let hasRemaining = false;
        keys.forEach((key) => {
            const due = remaining[key] || 0;
            const avail = availability[key] || 0;
            if (due > 0) {
                hasRemaining = true;
                if (avail < due) canStart = false;
                if (avail > 0) canPrepay = true;
            }
        });
        if (!hasRemaining) {
            canStart = true;
            canPrepay = false;
        }
        return {
            signature,
            paid,
            remaining,
            availability,
            canStart,
            canPrepay,
            hasRemaining
        };
    }

    applyPrepay(selection, cost) {
        const state = this.getPrepayState(selection, cost);
        const remaining = state.remaining;
        const availability = state.availability;
        const payload = {};
        Object.keys(remaining).forEach((key) => {
            const due = remaining[key] || 0;
            const avail = availability[key] || 0;
            const pay = Math.min(due, avail);
            if (pay > 0) {
                payload[key] = pay;
            }
        });
        const payloadKeys = Object.keys(payload);
        if (!payloadKeys.length) {
            return { status: 'insufficient', state };
        }
        const deduction = this.pullResources(payload);
        if (!deduction) {
            return { status: 'insufficient', state };
        }
        payloadKeys.forEach((key) => {
            this.prepay.paid[key] = (this.prepay.paid[key] || 0) + payload[key];
        });
        const nextState = this.getPrepayState(selection, cost);
        this.updateUI(false);
        return { status: nextState.canStart ? 'ready' : 'prepaid', state: nextState };
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

            if (useStorage) {
                const fromStorage = prioritizeStorage
                    ? Math.min(storageAvailable, required)
                    : Math.max(required - colonyAvailable, 0);
                const fromColony = required - fromStorage;
                plan[key] = { colony: fromColony, storage: fromStorage, storageKey };
            } else {
                const fromColony = Math.min(colonyAvailable, required);
                plan[key] = { colony: fromColony, storage: 0, storageKey };
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
      const chosenName = (options?.name && String(options.name).trim()) || this.getDefaultWorldName('shell');
      const cost = this.calculateCost(radiusEarth);
      const durationContext = this.getDurationContext(radiusEarth);
      if (this.exceedsDurationLimit(durationContext.durationMs)) {
        return false;
      }
      const selection = {
        type: 'shell',
        radiusEarth,
        core,
        starContext
      };
      const prepayState = this.getPrepayState(selection, cost);
      const remainingCost = this.getRemainingCost(cost, prepayState.paid);
      if (!this.canCoverCost(remainingCost)) {
        return false;
      }
      const deduction = this.pullResources(remainingCost);
      if (!deduction) return false;
      this.resetPrepay();

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

    startRingConstruction(options) {
      if (!this.enabled || this.activeProject) return false;

      const starCore = options?.starCore || RINGWORLD_STAR_CORES[0].value;
      const starCoreConfig = getRingStarCoreConfig(starCore);
      if (starCoreConfig.disabled) return false;

      const bounds = getRingRadiusBoundsAU(starCore);
      const orbitRadiusAU = clampRingOrbitRadiusAU(options?.orbitRadiusAU, bounds);
      const widthKm = clampRingWidthKm(options?.widthKm, starCore);
      const landHa = this.calculateRingWorldAreaHectares(orbitRadiusAU, widthKm);
      const radiusEarth = this.calculateRadiusEarthFromLandHectares(landHa);

      const chosenName = (options?.name && String(options.name).trim()) || this.getDefaultWorldName('ring');
      const cost = this.calculateRingworldCost(landHa, widthKm);
      const durationContext = this.getDurationContext(radiusEarth);
      if (this.exceedsDurationLimit(durationContext.durationMs)) return false;
      const selection = {
        type: 'ring',
        radiusEarth,
        orbitRadiusAU,
        widthKm,
        targetFluxWm2: options?.targetFluxWm2 || RINGWORLD_TARGET_FLUX_WM2,
        starCore
      };
      const prepayState = this.getPrepayState(selection, cost);
      const remainingCost = this.getRemainingCost(cost, prepayState.paid);
      if (!this.canCoverCost(remainingCost)) return false;
      const deduction = this.pullResources(remainingCost);
      if (!deduction) return false;
      this.resetPrepay();

      const terraformedValue = this.calculateTerraformWorldValue(radiusEarth);
      const { durationMs, worldCount } = durationContext;

      let sector = options?.sector || 'auto';
      if (sector === 'auto') {
        sector = (spaceManager && spaceManager.getCurrentWorldOriginal)
          ? spaceManager.getCurrentWorldOriginal()?.merged?.celestialParameters?.sector || null
          : null;
      }

      const now = Date.now();
      const generationSeed = (this.nextId * 0x517cc1b7) >>> 0;
      const targetFluxWm2 = clampRingTargetFluxWm2(options?.targetFluxWm2 || RINGWORLD_TARGET_FLUX_WM2);
      const star = generateRingStar({
        seed: generationSeed,
        spectralType: starCoreConfig.spectralType,
        orbitRadiusAU,
        targetFluxWm2
      });
      const fluxWm2 = (SOLAR_CONSTANT_WM2 * star.luminositySolar) / (orbitRadiusAU * orbitRadiusAU);

      this.activeProject = {
          id: this.nextId,
          seed: this.createSeed(),
          name: chosenName,
          type: 'ring',
          core: starCore,
          starCore,
          spectralType: starCoreConfig.spectralType,
          orbitRadiusAU,
          orbitRadiusEarth: orbitRadiusAU * AU_TO_EARTH_RADII,
          widthKm,
          radiusEarth,
          areaHa: landHa,
          landHa,
          durationMs,
          remainingMs: durationMs,
          status: 'building',
          startedAt: now,
          completedAt: null,
          cost,
          terraformedValue,
          fleetCapacityValue: this.calculateFleetCapacityWorldValue(radiusEarth, terraformedValue),
          distanceFromStarAU: orbitRadiusAU,
          targetFluxWm2: fluxWm2,
          isRogue: false,
          hasStar: true,
          allowStar: true,
          starContext: ARTIFICIAL_STAR_CONTEXTS[0].value,
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
        const type = params.classification?.type || 'shell';
        const core = params.classification?.core || (type === 'ring' ? RINGWORLD_STAR_CORES[0].value : 'super-earth');
        const coreConfig = type === 'ring' ? null : getArtificialCoreConfig(core);
        const isRogue = params.celestialParameters.rogue === true;
        const allowStar = type === 'ring' ? true : coreConfig.allowStar !== false;
        const hasStar = type === 'ring' ? true : (allowStar && !isRogue);
        return {
            name: params.name,
            type,
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
            orbitRadiusAU: params.celestialParameters?.distanceFromSun,
            widthKm: params.specialAttributes?.ringWidthKm || params.specialAttributes?.ring?.widthKm || undefined,
            stockpile: {
                metal: params.resources.colony.metal?.initialValue || 0,
                silicon: params.resources.colony.silicon?.initialValue || 0
            }
        };
    }

    buildOverride(project) {
        if (!project) return null;
        const gravity = 9.81;
        const sector = project.sector || currentPlanetParameters?.celestialParameters?.sector || 'R5-07';
        const isRing = project.type === 'ring';
        const radiusKm = (project.radiusEarth || 1) * EARTH_RADIUS_KM;
        const allowStar = isRing ? true : (project.hasStar !== false && project.allowStar !== false);
        let star = project.star ? JSON.parse(JSON.stringify(project.star)) : null;
        const stockpileMetal = project.stockpile?.metal || project.initialDeposit?.metal || 0;
        const stockpileSilicon = project.stockpile?.silicon || project.initialDeposit?.silicon || 0;
        const isRogue = isRing ? false : (project.isRogue === true || !allowStar);
        const distanceFromStarAU = isRogue ? 0 : (isRing ? (project.orbitRadiusAU || project.distanceFromStarAU || 1) : (project.distanceFromStarAU || 1));
        const targetFluxWm2 = isRing
            ? clampRingTargetFluxWm2(project.targetFluxWm2 || RINGWORLD_TARGET_FLUX_WM2)
            : project.targetFluxWm2;
        if (isRing) {
            const ringCore = getRingStarCoreConfig(project.starCore || project.core);
            const seed = (project.id || 1) * 0x517cc1b7;
            star = generateRingStar({
                seed,
                spectralType: ringCore.spectralType,
                orbitRadiusAU: distanceFromStarAU,
                targetFluxWm2
            });
        }
        const starLuminosity = star ? star.luminositySolar : 0;
        const spaceElevatorEffects = projectParameters.spaceElevator.attributes.completionEffect;

        const base = JSON.parse(JSON.stringify(defaultPlanetParameters || {}));
        this.resetInitialResources(base.resources);
        base.name = project.name;
        base.specialAttributes = { ...(base.specialAttributes || {}), hasSand: false, hasOre: false };
        if (isRing) {
            base.specialAttributes.zoneKeys = ['tropical'];
            base.specialAttributes.ringOrbitRadiusAU = project.orbitRadiusAU || distanceFromStarAU;
            base.specialAttributes.ringWidthKm = project.widthKm || project.ringWidthKm || 0;
            base.specialAttributes.ringConstructionCostTons = project.cost?.superalloys || 0;
        }
        base.classification = {
            archetype: 'artificial',
            type: project.type,
            core: project.core
        };
        const rotationPeriod = isRing
            ? estimateRingRotationPeriodHours(project.orbitRadiusAU || distanceFromStarAU)
            : 24;
        base.celestialParameters = {
            ...base.celestialParameters,
            gravity,
            radius: radiusKm,
            rotationPeriod,
            spinPeriod: isRogue ? 0 : rotationPeriod, // Rogue worlds have no spin, others match rotation
            starLuminosity: isRogue ? 0 : starLuminosity,
            sector,
            distanceFromSun: distanceFromStarAU,
            rogue: isRogue,
            targetFluxWm2
        };
        base.effects = isRing
            ? [
                {
                    target: 'project',
                    targetId: 'spaceMirrorFacility',
                    type: 'permanentProjectDisable',
                    value: true,
                    effectId: 'ringworld-disable-space-mirror-facility'
                },
                {
                    target: 'building',
                    targetId: 'spaceMirror',
                    type: 'permanentBuildingDisable',
                    value: true,
                    effectId: 'ringworld-disable-space-mirrors'
                },
                {
                    target: 'building',
                    targetId: 'hyperionLantern',
                    type: 'permanentBuildingDisable',
                    value: true,
                    effectId: 'ringworld-disable-hyperion-lanterns'
                },
                {
                    target: 'project',
                    targetId: 'planetaryThruster',
                    type: 'permanentProjectDisable',
                    value: true,
                    effectId: 'ringworld-disable-planetary-thrusters'
                },
                {
                    target: 'researchManager',
                    targetId: 'space_elevator',
                    type: 'researchDisable',
                    effectId: 'ringworld-disable-space-elevator-research'
                },
                {
                    target: 'project',
                    targetId: 'ringworldTerraforming',
                    type: 'enable',
                    effectId: 'ringworld-enable-terraforming-protocol'
                },
                ...spaceElevatorEffects
            ]
            : [
                {
                    target: 'projectManager',
                    type: 'spaceshipCostMultiplier',
                    resourceCategory: 'colony',
                    resourceId: 'energy',
                    value: project.radiusEarth,
                    effectId: 'artificial-ship-energy-multiplier'
                }
            ];
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
            sector: this.activeProject.sector || currentPlanetParameters?.celestialParameters?.sector || null,
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

    setWorldNameById(id, name) {
        const key = String(id);
        const nextName = (String(name || '').trim()) || `Artificial ${key}`;
        const project = this.activeProject;
        if (project && String(project.id) === key) {
            project.name = nextName;
            project.override = null;
        }
        if (spaceManager && spaceManager.artificialWorldStatuses && spaceManager.artificialWorldStatuses[key]) {
            const status = spaceManager.artificialWorldStatuses[key];
            status.name = nextName;
            if (status.original && status.original.merged) {
                status.original.merged.name = nextName;
            }
            if (status.artificialSnapshot) {
                status.artificialSnapshot.name = nextName;
            }
        }
        if (spaceManager && spaceManager.currentArtificialKey !== null && String(spaceManager.currentArtificialKey) === key) {
            spaceManager.currentRandomName = nextName;
            if (currentPlanetParameters) {
                currentPlanetParameters.name = nextName;
            }
        }
        if (this.history && this.history.length) {
            this.history.forEach((entry) => {
                if (String(entry.id) === key) {
                    entry.name = nextName;
                }
            });
        }
        if (this.travelHistory && this.travelHistory.length) {
            this.travelHistory.forEach((entry) => {
                if (String(entry.id) === key) {
                    entry.name = nextName;
                }
            });
        }
        this.updateUI(true);
        return true;
    }

    setActiveProjectName(name) {
        const project = this.activeProject;
        if (!project) return false;
        return this.setWorldNameById(project.id, name);
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
                sector: status.sector || merged?.celestialParameters?.sector || snapshot?.sector || null,
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
                sector: proj.sector || currentPlanetParameters?.celestialParameters?.sector || null,
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
            fleetCapacityWorldCap: this.fleetCapacityWorldCap,
            nextId: this.nextId,
            activeProject: project,
            draftSelection: { ...this.draftSelection },
            history: this.history,
            travelHistory: this.travelHistory,
            prepay: this.prepay
        };
    }

    loadState(state) {
        if (!state) return;
        this.prioritizeSpaceStorage = state.prioritizeSpaceStorage !== false;
        const existingFleetCap = this.getFleetCapacityWorldCap();
        const hasSavedFleetCap = Object.prototype.hasOwnProperty.call(state, 'fleetCapacityWorldCap');
        if (hasSavedFleetCap) {
            const savedFleetCap = Math.max(1, Math.floor(state.fleetCapacityWorldCap || ARTIFICIAL_FLEET_CAPACITY_WORLDS));
            this.fleetCapacityWorldCap = Math.max(existingFleetCap, savedFleetCap);
        } else {
            this.fleetCapacityWorldCap = existingFleetCap;
        }
        this.activeProject = state.activeProject || null;
        const draft = state.draftSelection || {};
        const defaultDraft = this.createDefaultDraftSelection();
        this.draftSelection = this.normalizeDraftSelection({ ...defaultDraft, ...draft });
        const prepay = state.prepay || {};
        this.prepay = {
            signature: prepay.signature || '',
            paid: {
                metal: Math.max(prepay.paid?.metal || 0, 0),
                superalloys: Math.max(prepay.paid?.superalloys || 0, 0)
            }
        };
        if (this.activeProject) {
            this.resetPrepay();
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
            const isRing = this.activeProject.type === 'ring';
            if (this.activeProject.hasStar === undefined) {
                this.activeProject.hasStar = true;
            }
            if (!this.activeProject.starContext) {
                this.activeProject.starContext = ARTIFICIAL_STAR_CONTEXTS[0].value;
            }
            if (isRing) {
                if (this.activeProject.orbitRadiusAU === undefined) {
                    this.activeProject.orbitRadiusAU = this.activeProject.distanceFromStarAU || 1;
                }
                if (this.activeProject.widthKm === undefined) {
                    this.activeProject.widthKm = this.activeProject.ringWidthKm || 10_000;
                }
                this.activeProject.widthKm = clampRingWidthKm(this.activeProject.widthKm, this.activeProject.starCore || this.activeProject.core);
                if (!this.activeProject.landHa) {
                    this.activeProject.landHa = this.activeProject.areaHa || this.calculateRingWorldAreaHectares(this.activeProject.orbitRadiusAU, this.activeProject.widthKm);
                }
                if (!this.activeProject.radiusEarth) {
                    this.activeProject.radiusEarth = this.calculateRadiusEarthFromLandHectares(this.activeProject.landHa);
                }
                if (!this.activeProject.star) {
                    const seed = (this.activeProject.id || this.nextId || 1) * 0x517cc1b7;
                    const ringCore = getRingStarCoreConfig(this.activeProject.starCore || this.activeProject.core);
                    const star = generateRingStar({
                        seed,
                        spectralType: ringCore.spectralType,
                        orbitRadiusAU: this.activeProject.orbitRadiusAU,
                        targetFluxWm2: clampRingTargetFluxWm2(this.activeProject.targetFluxWm2 || RINGWORLD_TARGET_FLUX_WM2)
                    });
                    this.activeProject.star = star;
                }
                this.activeProject.distanceFromStarAU = this.activeProject.orbitRadiusAU;
                if (this.activeProject.targetFluxWm2 === undefined) {
                    const dist = this.activeProject.distanceFromStarAU || 1;
                    this.activeProject.targetFluxWm2 = (SOLAR_CONSTANT_WM2 * this.activeProject.star.luminositySolar) / (dist * dist);
                }
                this.activeProject.isRogue = false;
                this.activeProject.allowStar = true;
            } else {
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

function getRingStarCoreBounds(coreValue) {
    return getRingRadiusBoundsAU(coreValue);
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
    window.getRingStarCores = getRingStarCores;
    window.getRingStarCoreBounds = getRingStarCoreBounds;
    window.getRingWidthBoundsKm = getRingWidthBoundsKm;
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
        getRingStarCores,
        getRingStarCoreBounds,
        getRingWidthBoundsKm,
        getArtificialStarContexts,
        getArtificialCoreBounds,
        getArtificialCoreConfig,
        ARTIFICIAL_FLEET_CAPACITY_WORLDS
    };
}
