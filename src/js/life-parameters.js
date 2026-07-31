const lifeParameters = {
    lichen: {
        displayName: '',
        minTemperature : 253,
        maxTemperature : 313,
        minRainfall : 0,
        growthRate : 0.0004
    },
    grass: {
        displayName: '',
        minTemperature : 278,
        maxTemperature : 308,
        minRainfall : 1e6,
        growthRate : 0.0008
    },
    trees: {
        displayName: '',
        minTemperature : 288,
        maxTemperature : 308,
        minRainfall : 1e9,
        growthRate : 0.0012
    }
}

const DEFAULT_BIOMASS_COLOR = '#18693a';
const BIOMASS_COLOR_ALBEDO_RANGE = {
    min: 0.05,
    base: 0.20,
    max: 0.80
};
const BIOMASS_COLOR_MAX_GROWTH_PENALTY = 0.80;

function normalizeBiomassColor(color) {
    const normalized = String(color || '').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : DEFAULT_BIOMASS_COLOR;
}

function getBiomassColorLuminance(color) {
    const normalized = normalizeBiomassColor(color);
    const r = parseInt(normalized.slice(1, 3), 16) / 255;
    const g = parseInt(normalized.slice(3, 5), 16) / 255;
    const b = parseInt(normalized.slice(5, 7), 16) / 255;
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

const DEFAULT_BIOMASS_COLOR_LUMINANCE = getBiomassColorLuminance(DEFAULT_BIOMASS_COLOR);
let activeBiomassColor = DEFAULT_BIOMASS_COLOR;

function getBiomassAlbedoFromColor(color) {
    const luminance = getBiomassColorLuminance(color);
    if (luminance <= DEFAULT_BIOMASS_COLOR_LUMINANCE) {
        const ratio = luminance / DEFAULT_BIOMASS_COLOR_LUMINANCE;
        return BIOMASS_COLOR_ALBEDO_RANGE.min
            + ratio * (BIOMASS_COLOR_ALBEDO_RANGE.base - BIOMASS_COLOR_ALBEDO_RANGE.min);
    }
    const ratio = (luminance - DEFAULT_BIOMASS_COLOR_LUMINANCE)
        / (1 - DEFAULT_BIOMASS_COLOR_LUMINANCE);
    return BIOMASS_COLOR_ALBEDO_RANGE.base
        + ratio * (BIOMASS_COLOR_ALBEDO_RANGE.max - BIOMASS_COLOR_ALBEDO_RANGE.base);
}

function getBiomassGrowthMultiplierFromAlbedo(albedo) {
    if (albedo <= BIOMASS_COLOR_ALBEDO_RANGE.base) {
        return 1;
    }
    const brightening = (albedo - BIOMASS_COLOR_ALBEDO_RANGE.base)
        / (BIOMASS_COLOR_ALBEDO_RANGE.max - BIOMASS_COLOR_ALBEDO_RANGE.base);
    return 1 - BIOMASS_COLOR_MAX_GROWTH_PENALTY * brightening;
}

function getBiomassColorPalette(color) {
    const normalized = normalizeBiomassColor(color);
    if (normalized === DEFAULT_BIOMASS_COLOR) {
        return {
            base: [24, 105, 58],
            low: [34, 110, 78],
            high: [12, 150, 44]
        };
    }
    const base = [
        parseInt(normalized.slice(1, 3), 16),
        parseInt(normalized.slice(3, 5), 16),
        parseInt(normalized.slice(5, 7), 16)
    ];
    return {
        base,
        low: base.map(channel => Math.min(255, Math.round(channel * 0.85 + 20))),
        high: base.map(channel => Math.max(0, Math.min(255, Math.round(channel * 1.15 - 10))))
    };
}

function getActiveBiomassColor() {
    return activeBiomassColor;
}

function setActiveBiomassColor(color) {
    activeBiomassColor = normalizeBiomassColor(color);
}

function getActiveBiomassAlbedo() {
    return getBiomassAlbedoFromColor(getActiveBiomassColor());
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = lifeParameters;
}
