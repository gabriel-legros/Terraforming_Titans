const GALAXY_RADIUS = 6;
const GALAXY_OPERATION_DURATION_MS = 600000;
const FULL_CONTROL_EPSILON = 1e-6;
const FLEET_UPGRADE_INCREMENT = 0.1;
const UHF_FACTION_ID = 'uhf';
let factionDefaultSectorValue = 100;
const REPLACEMENT_SECONDS = 3600;
const BORDER_CONTROL_EPSILON = 1e-6;
const BORDER_HEX_NEIGHBOR_DIRECTIONS = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
];
