const { loadGalaxyConstants } = require('./helpers/loadGalaxyConstants');
const EffectableEntity = require('../src/js/effectable-entity');

loadGalaxyConstants();

global.EffectableEntity = EffectableEntity;

const { GalaxyManager } = require('../src/js/galaxy/galaxy');
const { GalaxyFaction } = require('../src/js/galaxy/faction');
const { GalaxySector } = require('../src/js/galaxy/sector');

describe('Galaxy incoming attack warning', () => {
    let manager;
    let sector;
    let warningSpy;

    beforeEach(() => {
        manager = new GalaxyManager();
        manager.factions.clear();
        manager.sectors.clear();
        manager.operations.clear();

        global.spaceManager = {
            getTerraformedPlanetCount: () => 0,
            getWorldCountPerSector: () => 0
        };

        sector = new GalaxySector({ q: 0, r: 0 });
        sector.setControl('uhf', 60);
        sector.setControl('enemy', 40);
        manager.sectors.set(sector.key, sector);

        const uhf = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        uhf.fleetCapacity = 1000;
        uhf.setFleetPower(400);
        manager.factions.set('uhf', uhf);

        const enemy = new GalaxyFaction({ id: 'enemy', name: 'Enemy Fleet' });
        enemy.fleetCapacity = 1000;
        enemy.setFleetPower(500);
        enemy.getSectorDefense = () => 0;
        enemy.update = () => {};
        manager.factions.set('enemy', enemy);

        warningSpy = jest.fn();
        global.setSpaceIncomingAttackWarning = warningSpy;

        manager.enable();
        warningSpy.mockClear();
    });

    afterEach(() => {
        delete global.spaceManager;
        delete global.setSpaceIncomingAttackWarning;
    });

    test('alerts whenever enemy fleets target UHF sectors', () => {
        const operation = manager.startOperation({
            sectorKey: sector.key,
            factionId: 'enemy',
            assignedPower: 120,
            durationMs: 1000,
            successChance: 0
        });

        expect(operation).not.toBeNull();
        expect(warningSpy).toHaveBeenCalledWith(true);

        warningSpy.mockClear();

        manager.update(1000);

        expect(warningSpy).toHaveBeenCalledWith(false);
    });
});
