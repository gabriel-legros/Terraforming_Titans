const GALAXY_RADIUS = 6;
const GALAXY_OPERATION_DURATION_MS = 5 * 60 * 1000;
const FULL_CONTROL_EPSILON = 1e-6;
const FLEET_UPGRADE_INCREMENT = 0.1;
const UHF_FACTION_ID = 'uhf';
const UHF_FLEET_PER_WORLD = 100;
let factionDefaultSectorValue = 100;
const REPLACEMENT_SECONDS = 3600;
const BORDER_CONTROL_EPSILON = 1e-6;
const R507_PROTECTED_KEY = '4,-5';
const R507_PROTECTED_CONTROL_THRESHOLD = 0.1;
const R507_PROTECTED_CONTROL_TOLERANCE = 1e-6;
const BORDER_HEX_NEIGHBOR_DIRECTIONS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
];
const GALAXY_FLEET_UPGRADE_DEFINITIONS = {
    militaryResearch: {
        key: 'militaryResearch',
        label: 'Military R&D',
        description: 'Channel advanced research into hangar expansions that squeeze in additional wings.',
        increment: FLEET_UPGRADE_INCREMENT,
        baseCost: 100000,
        costType: 'resource',
        resourceCategory: 'colony',
        resourceId: 'advancedResearch',
        costLabel: 'Advanced Research'
    },
    micOutsource: {
        key: 'micOutsource',
        label: 'MIC Outsourcing',
        description: 'Cut Solis a check so they can subcontract extra yards for the fleet.',
        increment: FLEET_UPGRADE_INCREMENT,
        baseCost: 1000,
        costType: 'solis',
        costLabel: 'Solis Points'
    },
    enemyLessons: {
        key: 'enemyLessons',
        label: 'Reverse Engineering',
        description: 'Reverse-engineer alien tactics and fold their tricks into UHF logistics.',
        increment: FLEET_UPGRADE_INCREMENT,
        baseCost: 100,
        costType: 'artifact',
        costLabel: 'Alien Artifacts'
    },
    pandoraBox: {
        key: 'pandoraBox',
        label: "PANDORA'S Box",
        description: 'Spend a skill point to greenlight unconventional fleet experiments.',
        increment: 0.25,
        baseCost: 1,
        costType: 'skill',
        costLabel: 'Skill Points'
    }
};
const GALAXY_FLEET_UPGRADE_KEYS = Object.keys(GALAXY_FLEET_UPGRADE_DEFINITIONS);
