const { loadGalaxyConstants } = require('./helpers/loadGalaxyConstants');
const EffectableEntity = require('../src/js/effectable-entity');

loadGalaxyConstants();

global.EffectableEntity = EffectableEntity;
global.spaceManager = {
    getTerraformedPlanetCount: () => 0,
    getWorldCountPerSector: () => 0
};

const { GalaxyManager } = require('../src/js/galaxy/galaxy');
const { UHF_FACTION_ID } = require('../src/js/galaxy/faction');

describe('GalaxyManager controlled sector world rewards', () => {
    let manager;

    beforeEach(() => {
        manager = new GalaxyManager();
        manager.initialize();
    });

    test('counts default world rewards when UHF has full control', () => {
        const core = manager.getSector(0, 0);
        const neighbor = manager.getSector(0, 1);

        core.replaceControl({ [UHF_FACTION_ID]: 100 });
        neighbor.replaceControl({ [UHF_FACTION_ID]: 50 });

        expect(manager.getControlledSectorWorldCount()).toBe(2);
    });

    test('ignores sectors without full UHF control', () => {
        const sector = manager.getSector(1, 0);
        sector.replaceControl({ [UHF_FACTION_ID]: 60, cewinsii: 40 });

        expect(manager.getControlledSectorWorldCount()).toBe(0);
    });

    test('counts custom rewards that reference worlds by label', () => {
        const sector = manager.getSector(1, -1);
        sector.setReward([{ label: 'Colony World', amount: 3 }]);
        sector.replaceControl({ [UHF_FACTION_ID]: 75 });

        expect(manager.getControlledSectorWorldCount()).toBe(3);
    });
});

afterAll(() => {
    delete global.EffectableEntity;
    delete global.spaceManager;
});
