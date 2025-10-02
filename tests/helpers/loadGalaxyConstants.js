const LOADED_FLAG = '__galaxyConstantsLoaded__';

function loadGalaxyConstants() {
    if (global[LOADED_FLAG]) {
        return;
    }

    global.GALAXY_RADIUS = 6;
    global.GALAXY_OPERATION_DURATION_MS = 600000;
    global.FULL_CONTROL_EPSILON = 1e-6;
    global.FLEET_UPGRADE_INCREMENT = 0.1;
    global.UHF_FACTION_ID = 'uhf';
    global.UHF_FLEET_PER_WORLD = 100;
    global.factionDefaultSectorValue = 100;
    global.REPLACEMENT_SECONDS = 3600;
    global.BORDER_CONTROL_EPSILON = 1e-6;
    global.BORDER_HEX_NEIGHBOR_DIRECTIONS = [
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 0, r: -1 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: 0, r: 1 }
    ];
    global.HEX_NEIGHBOR_DIRECTIONS = global.BORDER_HEX_NEIGHBOR_DIRECTIONS;

    global[LOADED_FLAG] = true;
}

module.exports = { loadGalaxyConstants };
