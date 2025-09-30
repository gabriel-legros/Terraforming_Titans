const DEFAULT_SECTOR_VALUE = 100;

function createSectorKey(q, r) {
    if (Number.isFinite(q) && Number.isFinite(r)) {
        return `${q},${r}`;
    }
    if (typeof q === 'string' && q) {
        return q;
    }
    return '0,0';
}

const galaxySectorParameters = {
    defaultValue: DEFAULT_SECTOR_VALUE,
    overrides: {
        [createSectorKey(0, 0)]: { value: 1000 }
    }
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
