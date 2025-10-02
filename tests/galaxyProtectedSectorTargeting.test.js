const { loadGalaxyConstants } = require('./helpers/loadGalaxyConstants');
const EffectableEntity = require('../src/js/effectable-entity');

loadGalaxyConstants();

global.EffectableEntity = EffectableEntity;

const { GalaxyManager } = require('../src/js/galaxy/galaxy');
const { GalaxyFaction } = require('../src/js/galaxy/faction');
const { GalaxySector } = require('../src/js/galaxy/sector');

describe('Galaxy protected sector targeting', () => {
    let manager;
    let helian;
    let uhf;
    let sector;

    beforeEach(() => {
        manager = new GalaxyManager();
        manager.factions.clear();
        manager.sectors.clear();
        manager.operations.clear();

        global.spaceManager = {
            getTerraformedPlanetCount: () => 0,
            getWorldCountPerSector: () => 0
        };

        helian = new GalaxyFaction({ id: 'helian', name: 'Helian' });
        helian.fleetCapacity = 500;
        helian.fleetPower = 250;
        manager.factions.set('helian', helian);

        uhf = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        uhf.fleetCapacity = 500;
        uhf.fleetPower = 100;
        manager.factions.set('uhf', uhf);

        sector = new GalaxySector({ q: 4, r: -5 });
        manager.sectors.set(sector.key, sector);
    });

    afterEach(() => {
        delete global.spaceManager;
    });

    test('blocks operations against R5-07 when UHF control is at threshold', () => {
        sector.setControl('uhf', 0.1);
        sector.setControl('helian', 0.9);

        const operation = manager.startOperation({
            sectorKey: sector.key,
            factionId: 'helian',
            assignedPower: 100
        });

        expect(operation).toBeNull();
    });

    test('allows operations once UHF control exceeds threshold', () => {
        sector.setControl('uhf', 0.2);
        sector.setControl('helian', 0.8);

        const operation = manager.startOperation({
            sectorKey: sector.key,
            factionId: 'helian',
            assignedPower: 100
        });

        expect(operation).not.toBeNull();
        expect(operation.status).toBe('running');
    });
});
