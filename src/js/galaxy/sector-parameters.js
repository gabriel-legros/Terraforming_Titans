const DEFAULT_SECTOR_VALUE = 1000;
const DEFAULT_SECTOR_REWARD = [
    {
        type: 'habitableWorld',
        label: 'Habitable World',
        amount: 1
    }
];

function createSectorKey(q, r) {
    if (Number.isFinite(q) && Number.isFinite(r)) {
        return `${q},${r}`;
    }
    if (typeof q === 'string' && q) {
        return q;
    }
    return '0,0';
}

const CORE_COORDINATES = [{ q: 0, r: 0 }];
const CORE_BASE_VALUE = 50000;
const FIRST_RING_COORDINATES = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
];
const FIRST_RING_BASE_VALUE = 5000;
const R507_RADIUS_ONE_COORDINATES = [
    { q: 5, r: -5 },
    { q: 5, r: -6 },
    { q: 4, r: -6 },
    { q: 3, r: -5 },
    { q: 3, r: -4 },
    { q: 4, r: -4 }
];
const R507_RADIUS_ONE_BASE_VALUE = 200;
const R507_RADIUS_TWO_COORDINATES = [
    { q: 6, r: -5 },
    { q: 6, r: -6 },
    { q: 5, r: -4 },
    { q: 6, r: -7 },
    { q: 5, r: -7 },
    { q: 4, r: -7 },
    { q: 3, r: -6 },
    { q: 2, r: -5 },
    { q: 2, r: -4 },
    { q: 2, r: -3 },
    { q: 3, r: -3 },
    { q: 4, r: -3 }
];
const R507_RADIUS_TWO_BASE_VALUE = 500;
const R507_SECTOR_COORDINATES = [
    { q: 4, r: -5 }
];
const R507_SECTOR_BASE_VALUE = 100;

const STRATEGIC_SECTOR_COORDINATES = [
    { q: 3, r: 2 },
    { q: -5, r: 3 },
    { q: -4, r: 0 },
    { q: 0, r: -4 },
    { q: 6, r: -4 }
];
const STRATEGIC_SECTOR_BASE_VALUE = 15000;
const STRATEGIC_NEIGHBOR_COORDINATES = [
    { q: 3, r: 1 },
    { q: 2, r: 2 },
    { q: 2, r: 3 },
    { q: 3, r: 3 },
    { q: 4, r: 2 },
    { q: 4, r: 1 },
    { q: -5, r: 2 },
    { q: -6, r: 3 },
    { q: -6, r: 4 },
    { q: -5, r: 4 },
    { q: -4, r: 3 },
    { q: -4, r: 2 },
    { q: -4, r: -1 },
    { q: -5, r: 0 },
    { q: -5, r: 1 },
    { q: -4, r: 1 },
    { q: -3, r: 0 },
    { q: -3, r: -1 },
    { q: 0, r: -5 },
    { q: -1, r: -4 },
    { q: -1, r: -3 },
    { q: 0, r: -3 },
    { q: 1, r: -4 },
    { q: 1, r: -5 },
    { q: 6, r: -5 },
    { q: 5, r: -4 },
    { q: 5, r: -3 },
    { q: 6, r: -3 },
    { q: 7, r: -4 },
    { q: 7, r: -5 }
];
const STRATEGIC_NEIGHBOR_BASE_VALUE = 2500;

const overrides = {};

function registerOverrides(coordinates, value) {
    coordinates.forEach((coordinate) => {
        overrides[createSectorKey(coordinate.q, coordinate.r)] = { value };
    });
}

function cloneRewardDefinition(definition) {
    if (!definition) {
        return [];
    }
    const source = Array.isArray(definition) ? definition : [definition];
    const cloned = [];
    source.forEach((entry) => {
        if (!entry) {
            return;
        }
        if (typeof entry === 'object') {
            cloned.push({ ...entry });
            return;
        }
        if (typeof entry === 'string') {
            cloned.push(entry);
        }
    });
    return cloned;
}

registerOverrides(CORE_COORDINATES, CORE_BASE_VALUE);
registerOverrides(FIRST_RING_COORDINATES, FIRST_RING_BASE_VALUE);
registerOverrides(R507_RADIUS_ONE_COORDINATES, R507_RADIUS_ONE_BASE_VALUE);
registerOverrides(R507_RADIUS_TWO_COORDINATES, R507_RADIUS_TWO_BASE_VALUE);
registerOverrides(R507_SECTOR_COORDINATES, R507_SECTOR_BASE_VALUE);
registerOverrides(STRATEGIC_SECTOR_COORDINATES, STRATEGIC_SECTOR_BASE_VALUE);
registerOverrides(STRATEGIC_NEIGHBOR_COORDINATES, STRATEGIC_NEIGHBOR_BASE_VALUE);
overrides['R5-07'] = { value: R507_SECTOR_BASE_VALUE };

const galaxySectorParameters = {
    defaultValue: DEFAULT_SECTOR_VALUE,
    defaultReward: DEFAULT_SECTOR_REWARD,
    overrides
};

function getDefaultSectorValue() {
    const value = galaxySectorParameters.defaultValue;
    if (Number.isFinite(value) && value > 0) {
        return value;
    }
    return DEFAULT_SECTOR_VALUE;
}

function getDefaultSectorReward() {
    const reward = galaxySectorParameters.defaultReward;
    const cloned = cloneRewardDefinition(reward);
    if (cloned.length > 0) {
        return cloned;
    }
    return cloneRewardDefinition(DEFAULT_SECTOR_REWARD);
}

function getSectorBaseValue({ q, r, key } = {}) {
    const overrides = galaxySectorParameters.overrides || {};
    const sectorKey = key || createSectorKey(q, r);
    const override = overrides[sectorKey];
    if (override && Number.isFinite(override.value) && override.value > 0) {
        return override.value;
    }
    return getDefaultSectorValue();
}

function getSectorBaseReward({ q, r, key } = {}) {
    const overrides = galaxySectorParameters.overrides || {};
    const sectorKey = key || createSectorKey(q, r);
    const override = overrides[sectorKey];
    if (override && Object.prototype.hasOwnProperty.call(override, 'reward')) {
        return cloneRewardDefinition(override.reward);
    }
    return getDefaultSectorReward();
}

if (typeof window !== 'undefined') {
    window.galaxySectorParameters = galaxySectorParameters;
    window.galaxySectorDefaultValue = getDefaultSectorValue();
    window.galaxySectorDefaultReward = getDefaultSectorReward();
    window.getSectorBaseValue = getSectorBaseValue;
    window.getSectorBaseReward = getSectorBaseReward;
    window.getGalaxySectorDefaultValue = getDefaultSectorValue;
    window.getGalaxySectorDefaultReward = getDefaultSectorReward;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_SECTOR_VALUE,
        DEFAULT_SECTOR_REWARD,
        galaxySectorParameters,
        getDefaultSectorValue,
        getDefaultSectorReward,
        getSectorBaseValue,
        getSectorBaseReward
    };
}
