const { loadGalaxyConstants } = require('./helpers/loadGalaxyConstants');
const EffectableEntity = require('../src/js/effectable-entity');

loadGalaxyConstants();

global.EffectableEntity = EffectableEntity;

const { GalaxyManager } = require('../src/js/galaxy/galaxy');
const { GalaxyFaction } = require('../src/js/galaxy/faction');
const { GalaxySector } = require('../src/js/galaxy/sector');

describe('Galaxy operation persistence', () => {
    beforeEach(() => {
        global.spaceManager = {
            getTerraformedPlanetCount: () => 0,
            getWorldCountPerSector: () => 0
        };
    });

    afterEach(() => {
        delete global.spaceManager;
    });

    test('clamps assigned power to available fleet on load', () => {
        const manager = new GalaxyManager();
        manager.factions.clear();
        manager.sectors.clear();
        manager.operations.clear();

        const sector = new GalaxySector({ q: 0, r: 0 });
        sector.setControl('uhf', 10);
        sector.setControl('enemy', 90);
        manager.sectors.set(sector.key, sector);

        const uhf = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        uhf.fleetCapacity = 10000;
        uhf.setFleetPower(8000);
        manager.factions.set('uhf', uhf);

        const enemy = new GalaxyFaction({ id: 'enemy', name: 'Enemy' });
        enemy.getSectorDefense = () => 0;
        enemy.update = () => {};
        manager.factions.set('enemy', enemy);

        const assignedPower = 7841;
        const operation = manager.startOperation({
            sectorKey: sector.key,
            factionId: 'uhf',
            assignedPower,
            durationMs: 600000
        });

        expect(operation).not.toBeNull();
        expect(operation.assignedPower).toBe(assignedPower);

        const state = manager.saveState();

        const reloaded = new GalaxyManager();
        reloaded.loadState(state);

        const restored = reloaded.operations.get(sector.key);
        expect(restored).toBeDefined();
        expect(restored.assignedPower).toBe(0);
        expect(restored.offensePower).toBe(0);
        expect(restored.reservedPower).toBe(0);
    });
});
