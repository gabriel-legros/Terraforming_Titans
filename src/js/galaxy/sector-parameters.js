const DEFAULT_SECTOR_VALUE = 1000;

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
const FIRST_RING_BASE_VALUE = 10000;
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

const overrides = {};

function registerOverrides(coordinates, value) {
    coordinates.forEach((coordinate) => {
        overrides[createSectorKey(coordinate.q, coordinate.r)] = { value };
    });
}

registerOverrides(CORE_COORDINATES, CORE_BASE_VALUE);
registerOverrides(FIRST_RING_COORDINATES, FIRST_RING_BASE_VALUE);
registerOverrides(R507_RADIUS_ONE_COORDINATES, R507_RADIUS_ONE_BASE_VALUE);
registerOverrides(R507_RADIUS_TWO_COORDINATES, R507_RADIUS_TWO_BASE_VALUE);

const galaxySectorParameters = {
    defaultValue: DEFAULT_SECTOR_VALUE,
    overrides
};

function getDefaultSectorValue() {
    const value = galaxySectorParameters.defaultValue;
    if (Number.isFinite(value) && value > 0) {
        return value;
    }
    return DEFAULT_SECTOR_VALUE;
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

if (typeof window !== 'undefined') {
    window.galaxySectorParameters = galaxySectorParameters;
    window.galaxySectorDefaultValue = getDefaultSectorValue();
    window.getSectorBaseValue = getSectorBaseValue;
    window.getGalaxySectorDefaultValue = getDefaultSectorValue;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEFAULT_SECTOR_VALUE, galaxySectorParameters, getDefaultSectorValue, getSectorBaseValue };
}
