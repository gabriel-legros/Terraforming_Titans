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
        const key = createSectorKey(coordinate.q, coordinate.r);
        const override = overrides[key] || {};
        override.value = value;
        overrides[key] = override;
    });
}

function registerRewards(coordinates, amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return;
    }
    const rewardLabel = numericAmount === 1 ? 'Habitable World' : 'Habitable Worlds';
    coordinates.forEach((coordinate) => {
        const key = createSectorKey(coordinate.q, coordinate.r);
        if (!overrides[key]) {
            overrides[key] = {};
        }
        overrides[key].reward = [
            {
                type: 'habitableWorld',
                label: rewardLabel,
                amount: numericAmount
            }
        ];
    });
}

function registerStoryRequirements(requirements) {
    requirements.forEach(({ coordinates, world }) => {
        const worldNumber = Number(world);
        if (!Number.isFinite(worldNumber) || worldNumber <= 0 || !Array.isArray(coordinates)) {
            return;
        }
        coordinates.forEach((coordinate) => {
            const key = createSectorKey(coordinate.q, coordinate.r);
            const override = overrides[key] || {};
            override.storyRequirement = { world: worldNumber };
            overrides[key] = override;
        });
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
overrides['R5-07'] = { ...(overrides['R5-07'] || {}), value: R507_SECTOR_BASE_VALUE };

registerStoryRequirements([
    { coordinates: [{ q: 4, r: -5 }], world: 8 },
    { coordinates: [{ q: 5, r: -5 }], world: 9 },
    { coordinates: [{ q: 4, r: -4 }], world: 10 },
    { coordinates: [{ q: 4, r: -2 }], world: 11 },
    { coordinates: [{ q: 1, r: -5 }], world: 12 },
    { coordinates: [{ q: 1, r: -1 }], world: 13 },
    { coordinates: [{ q: 3, r: 2 }], world: 14 },
    { coordinates: CORE_COORDINATES, world: 15 }
]);

registerRewards(CORE_COORDINATES, 10);
registerRewards(FIRST_RING_COORDINATES, 5);
registerRewards(STRATEGIC_SECTOR_COORDINATES, 5);
registerRewards(STRATEGIC_NEIGHBOR_COORDINATES, 2);

// SECTOR_RESOURCE_OVERRIDES_START
const SECTOR_RESOURCE_OVERRIDES = {
    "1,0": { richResource: 'metal', poorResources: ['carbon', 'water'] },
    "1,-1": { richResource: 'nitrogen', poorResources: ['water', 'metal'] },
    "0,-1": { richResource: 'metal', poorResources: ['water', 'carbon'] },
    "-1,0": { richResource: 'metal', poorResources: ['nitrogen', 'water'] },
    "-1,1": { richResource: 'nitrogen', poorResources: ['water', 'metal'] },
    "0,1": { richResource: 'nitrogen', poorResources: ['metal', 'carbon'] },
    "2,0": { richResource: 'nitrogen', poorResources: ['water', 'silicon'] },
    "2,-1": { richResource: 'nitrogen', poorResources: ['metal', 'water'] },
    "2,-2": { richResource: 'carbon', poorResources: ['metal', 'water'] },
    "1,-2": { richResource: 'water', poorResources: ['metal', 'carbon'] },
    "0,-2": { richResource: 'silicon', poorResources: ['water', 'metal'] },
    "-1,-1": { richResource: 'silicon', poorResources: ['metal', 'water'] },
    "-2,0": { richResource: 'nitrogen', poorResources: ['water', 'metal'] },
    "-2,1": { richResource: 'silicon', poorResources: ['nitrogen', 'metal'] },
    "-2,2": { richResource: 'nitrogen', poorResources: ['water', 'silicon'] },
    "-1,2": { richResource: 'water', poorResources: ['carbon', 'nitrogen'] },
    "0,2": { richResource: 'nitrogen', poorResources: ['metal', 'silicon'] },
    "1,1": { richResource: 'water', poorResources: ['carbon', 'nitrogen'] },
    "3,0": { richResource: 'carbon', poorResources: ['silicon', 'nitrogen'] },
    "3,-1": { richResource: 'carbon', poorResources: ['silicon', 'metal'] },
    "3,-2": { richResource: 'water', poorResources: ['metal', 'carbon'] },
    "3,-3": { richResource: 'water', poorResources: ['silicon', 'metal'] },
    "2,-3": { richResource: 'nitrogen', poorResources: ['carbon', 'metal'] },
    "1,-3": { richResource: 'carbon', poorResources: ['metal', 'silicon'] },
    "0,-3": { richResource: 'silicon', poorResources: ['metal', 'water'] },
    "-1,-2": { richResource: 'water', poorResources: ['carbon', 'metal'] },
    "-2,-1": { richResource: 'metal', poorResources: ['silicon', 'carbon'] },
    "-3,0": { richResource: 'metal', poorResources: ['water', 'nitrogen'] },
    "-3,1": { richResource: 'nitrogen', poorResources: ['silicon', 'carbon'] },
    "-3,2": { richResource: 'carbon', poorResources: ['water', 'metal'] },
    "-3,3": { richResource: 'nitrogen', poorResources: ['silicon', 'metal'] },
    "-2,3": { richResource: 'metal', poorResources: ['silicon', 'carbon'] },
    "-1,3": { richResource: 'water', poorResources: ['nitrogen', 'carbon'] },
    "0,3": { richResource: 'nitrogen', poorResources: ['metal', 'silicon'] },
    "1,2": { richResource: 'silicon', poorResources: ['water', 'nitrogen'] },
    "2,1": { richResource: 'carbon', poorResources: ['water', 'metal'] },
    "4,0": { richResource: 'carbon', poorResources: ['water', 'silicon'] },
    "4,-1": { richResource: 'metal', poorResources: ['nitrogen', 'carbon'] },
    "4,-2": { richResource: 'water', poorResources: ['carbon', 'metal'] },
    "4,-3": { richResource: 'silicon', poorResources: ['water', 'carbon'] },
    "4,-4": { richResource: 'silicon', poorResources: ['nitrogen', 'water'] },
    "3,-4": { richResource: 'water', poorResources: ['metal', 'carbon'] },
    "2,-4": { richResource: 'water', poorResources: ['carbon', 'silicon'] },
    "1,-4": { richResource: 'water', poorResources: ['nitrogen', 'carbon'] },
    "0,-4": { richResource: 'carbon', poorResources: ['nitrogen', 'silicon'] },
    "-1,-3": { richResource: 'metal', poorResources: ['silicon', 'carbon'] },
    "-2,-2": { richResource: 'silicon', poorResources: ['water', 'nitrogen'] },
    "-3,-1": { richResource: 'water', poorResources: ['carbon', 'nitrogen'] },
    "-4,0": { richResource: 'carbon', poorResources: ['nitrogen', 'water'] },
    "-4,1": { richResource: 'nitrogen', poorResources: ['silicon', 'carbon'] },
    "-4,2": { richResource: 'nitrogen', poorResources: ['silicon', 'metal'] },
    "-4,3": { richResource: 'silicon', poorResources: ['metal', 'nitrogen'] },
    "-4,4": { richResource: 'metal', poorResources: ['carbon', 'water'] },
    "-3,4": { richResource: 'water', poorResources: ['nitrogen', 'metal'] },
    "-2,4": { richResource: 'nitrogen', poorResources: ['metal', 'silicon'] },
    "-1,4": { richResource: 'silicon', poorResources: ['carbon', 'nitrogen'] },
    "0,4": { richResource: 'silicon', poorResources: ['metal', 'carbon'] },
    "1,3": { richResource: 'metal', poorResources: ['carbon', 'nitrogen'] },
    "2,2": { richResource: 'carbon', poorResources: ['water', 'silicon'] },
    "3,1": { richResource: 'carbon', poorResources: ['metal', 'nitrogen'] },
    "5,0": { richResource: 'nitrogen', poorResources: ['silicon', 'carbon'] },
    "5,-1": { richResource: 'silicon', poorResources: ['metal', 'nitrogen'] },
    "5,-2": { richResource: 'water', poorResources: ['nitrogen', 'metal'] },
    "5,-3": { richResource: 'carbon', poorResources: ['water', 'metal'] },
    "5,-4": { richResource: 'metal', poorResources: ['nitrogen', 'silicon'] },
    "5,-5": { richResource: 'nitrogen', poorResources: ['silicon', 'carbon'] },
    "3,-5": { richResource: 'silicon', poorResources: ['nitrogen', 'water'] },
    "2,-5": { richResource: 'silicon', poorResources: ['metal', 'nitrogen'] },
    "1,-5": { richResource: 'silicon', poorResources: ['nitrogen', 'metal'] },
    "0,-5": { richResource: 'metal', poorResources: ['carbon', 'silicon'] },
    "-1,-4": { richResource: 'water', poorResources: ['metal', 'silicon'] },
    "-2,-3": { richResource: 'carbon', poorResources: ['water', 'nitrogen'] },
    "-3,-2": { richResource: 'nitrogen', poorResources: ['carbon', 'metal'] },
    "-4,-1": { richResource: 'carbon', poorResources: ['metal', 'water'] },
    "-5,0": { richResource: 'carbon', poorResources: ['water', 'metal'] },
    "-5,1": { richResource: 'metal', poorResources: ['nitrogen', 'silicon'] },
    "-5,2": { richResource: 'nitrogen', poorResources: ['silicon', 'metal'] },
    "-5,3": { richResource: 'water', poorResources: ['silicon', 'nitrogen'] },
    "-5,4": { richResource: 'nitrogen', poorResources: ['carbon', 'silicon'] },
    "-5,5": { richResource: 'nitrogen', poorResources: ['carbon', 'metal'] },
    "-4,5": { richResource: 'silicon', poorResources: ['nitrogen', 'carbon'] },
    "-3,5": { richResource: 'silicon', poorResources: ['carbon', 'water'] },
    "-2,5": { richResource: 'metal', poorResources: ['silicon', 'carbon'] },
    "-1,5": { richResource: 'metal', poorResources: ['carbon', 'nitrogen'] },
    "0,5": { richResource: 'water', poorResources: ['silicon', 'metal'] },
    "1,4": { richResource: 'metal', poorResources: ['water', 'carbon'] },
    "2,3": { richResource: 'metal', poorResources: ['nitrogen', 'carbon'] },
    "3,2": { richResource: 'silicon', poorResources: ['carbon', 'nitrogen'] },
    "4,1": { richResource: 'metal', poorResources: ['water', 'carbon'] },
    "6,0": { richResource: 'metal', poorResources: ['silicon', 'water'] },
    "6,-1": { richResource: 'metal', poorResources: ['water', 'nitrogen'] },
    "6,-2": { richResource: 'carbon', poorResources: ['nitrogen', 'water'] },
    "6,-3": { richResource: 'water', poorResources: ['nitrogen', 'carbon'] },
    "6,-4": { richResource: 'carbon', poorResources: ['metal', 'silicon'] },
    "6,-5": { richResource: 'carbon', poorResources: ['metal', 'water'] },
    "6,-6": { richResource: 'metal', poorResources: ['silicon', 'water'] },
    "5,-6": { richResource: 'silicon', poorResources: ['metal', 'nitrogen'] },
    "4,-6": { richResource: 'nitrogen', poorResources: ['water', 'carbon'] },
    "3,-6": { richResource: 'silicon', poorResources: ['carbon', 'water'] },
    "2,-6": { richResource: 'metal', poorResources: ['nitrogen', 'water'] },
    "1,-6": { richResource: 'metal', poorResources: ['carbon', 'water'] },
    "0,-6": { richResource: 'water', poorResources: ['metal', 'silicon'] },
    "-1,-5": { richResource: 'nitrogen', poorResources: ['carbon', 'water'] },
    "-2,-4": { richResource: 'metal', poorResources: ['water', 'silicon'] },
    "-3,-3": { richResource: 'metal', poorResources: ['nitrogen', 'water'] },
    "-4,-2": { richResource: 'carbon', poorResources: ['nitrogen', 'metal'] },
    "-5,-1": { richResource: 'water', poorResources: ['silicon', 'carbon'] },
    "-6,0": { richResource: 'silicon', poorResources: ['nitrogen', 'carbon'] },
    "-6,1": { richResource: 'nitrogen', poorResources: ['metal', 'water'] },
    "-6,2": { richResource: 'nitrogen', poorResources: ['water', 'silicon'] },
    "-6,3": { richResource: 'carbon', poorResources: ['nitrogen', 'metal'] },
    "-6,4": { richResource: 'nitrogen', poorResources: ['silicon', 'metal'] },
    "-6,5": { richResource: 'nitrogen', poorResources: ['water', 'silicon'] },
    "-6,6": { richResource: 'metal', poorResources: ['nitrogen', 'silicon'] },
    "-5,6": { richResource: 'metal', poorResources: ['water', 'silicon'] },
    "-4,6": { richResource: 'water', poorResources: ['metal', 'silicon'] },
    "-3,6": { richResource: 'silicon', poorResources: ['water', 'carbon'] },
    "-2,6": { richResource: 'carbon', poorResources: ['metal', 'nitrogen'] },
    "-1,6": { richResource: 'carbon', poorResources: ['water', 'nitrogen'] },
    "0,6": { richResource: 'silicon', poorResources: ['nitrogen', 'water'] },
    "1,5": { richResource: 'nitrogen', poorResources: ['metal', 'water'] },
    "2,4": { richResource: 'carbon', poorResources: ['silicon', 'water'] },
    "3,3": { richResource: 'silicon', poorResources: ['carbon', 'metal'] },
    "4,2": { richResource: 'nitrogen', poorResources: ['carbon', 'silicon'] },
    "5,1": { richResource: 'nitrogen', poorResources: ['carbon', 'metal'] },
};

Object.entries(SECTOR_RESOURCE_OVERRIDES).forEach(([key, entry]) => {
    const override = overrides[key] || {};
    override.richResource = entry.richResource;
    override.poorResources = entry.poorResources;
    overrides[key] = override;
});
// SECTOR_RESOURCE_OVERRIDES_END
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
