const EffectableEntity = require('../src/js/effectable-entity');

global.EffectableEntity = EffectableEntity;

const { GalaxyManager } = require('../src/js/galaxy/galaxy');
const { GalaxyFaction } = require('../src/js/galaxy/faction');
const { GalaxySector } = require('../src/js/galaxy/sector');

describe('Galaxy operation defender losses', () => {
    let manager;
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

        sector = new GalaxySector({ q: 0, r: 0 });
        sector.setControl('uhf', 10);
        sector.setControl('enemy', 90);
        manager.sectors.set(sector.key, sector);

        const uhf = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        uhf.fleetCapacity = 1000;
        uhf.setFleetPower(500);
        manager.factions.set('uhf', uhf);
    });

    afterEach(() => {
        delete global.spaceManager;
    });

    test('applies defender fleet losses on success', () => {
        const enemy = new GalaxyFaction({ id: 'enemy', name: 'Enemy Faction' });
        enemy.fleetCapacity = 300;
        enemy.setFleetPower(200);
        enemy.getSectorDefense = () => 60;
        enemy.update = () => {};
        manager.factions.set('enemy', enemy);

        const operation = manager.startOperation({
            sectorKey: sector.key,
            factionId: 'uhf',
            assignedPower: 120,
            durationMs: 1000
        });
        expect(operation).not.toBeNull();

        manager.update(1000);

        expect(operation.result).toBe('success');
        const defenderLoss = operation.defenderLosses.find((entry) => entry.factionId === 'enemy');
        expect(defenderLoss).toBeDefined();
        expect(defenderLoss.loss).toBeCloseTo(60);
        expect(enemy.fleetPower).toBeCloseTo(140);
    });

    test('distributes losses across defenders and clamps to available fleet', () => {
        const enemyA = new GalaxyFaction({ id: 'enemy', name: 'Enemy A' });
        enemyA.fleetCapacity = 200;
        enemyA.setFleetPower(50);
        enemyA.getSectorDefense = () => 30;
        enemyA.update = () => {};

        const enemyB = new GalaxyFaction({ id: 'enemyB', name: 'Enemy B' });
        enemyB.fleetCapacity = 150;
        enemyB.setFleetPower(60);
        enemyB.getSectorDefense = () => 90;
        enemyB.update = () => {};

        sector.setControl('enemy', 45);
        sector.setControl('enemyB', 45);

        manager.factions.set('enemy', enemyA);
        manager.factions.set('enemyB', enemyB);

        const operation = manager.startOperation({
            sectorKey: sector.key,
            factionId: 'uhf',
            assignedPower: 240,
            durationMs: 1000
        });
        expect(operation).not.toBeNull();

        manager.update(1000);

        expect(operation.result).toBe('success');
        const lossA = operation.defenderLosses.find((entry) => entry.factionId === 'enemy');
        const lossB = operation.defenderLosses.find((entry) => entry.factionId === 'enemyB');
        expect(lossA).toBeDefined();
        expect(lossA.loss).toBeCloseTo(30);
        expect(lossB).toBeDefined();
        expect(lossB.loss).toBeCloseTo(60);
        expect(enemyA.fleetPower).toBeCloseTo(20);
        expect(enemyB.fleetPower).toBeCloseTo(0);
    });
});
