const { loadGalaxyConstants } = require('./helpers/loadGalaxyConstants');

loadGalaxyConstants();

global.globalScope = global;
// eslint-disable-next-line no-undef
globalScope = global;

require('../src/js/galaxy/faction');

const { GalaxyFactionAI } = require('../src/js/galaxy/factionAI');

describe('GalaxyFactionAI sector defense scaling', () => {
    const originalRandom = Math.random;

    beforeAll(() => {
        Math.random = jest.fn(() => 0.5);
    });

    afterAll(() => {
        Math.random = originalRandom;
    });

    function createManager(sector) {
        const enemyFaction = {
            id: 'enemy',
            originalControlledSectorCount: 2,
            getControlledSectorKeys: () => ['1,1', '2,2', '3,3']
        };
        return {
            startOperation: jest.fn(() => ({})),
            getOperationForSector: () => null,
            getReservedOperationPower: () => 0,
            getSector: (q, r) => (q === sector.q && r === sector.r ? sector : null),
            getFaction: (factionId) => {
                if (factionId === 'enemy') {
                    return enemyFaction;
                }
                if (factionId === 'uhf') {
                    return { getControlledSectorKeys: () => [] };
                }
                if (factionId === 'test') {
                    return {
                        id: 'test',
                        originalControlledSectorCount: 4,
                        getControlledSectorKeys: () => ['0,0', '1,0', '0,1']
                    };
                }
                return null;
            }
        };
    }

    function createSector() {
        return {
            key: '0,0',
            q: 0,
            r: 0,
            getControlBreakdown: () => ([
                { factionId: 'test', value: 0.6 },
                { factionId: 'enemy', value: 0.4 }
            ]),
            getControlValue: (factionId) => {
                if (factionId === 'test') {
                    return 0.6;
                }
                if (factionId === 'enemy') {
                    return 0.4;
                }
                return 0;
            },
            getTotalControlValue: () => 1
        };
    }

    it('reserves additional defense when adoption and doctrine increase', () => {
        const sector = createSector();
        const manager = createManager(sector);
        const faction = new GalaxyFactionAI({ id: 'test', defensiveness: 0.5 });
        faction.updateFleetCapacity = jest.fn();
        faction.contestedCacheDirty = false;
        faction.neighborEnemyCacheDirty = false;
        faction.borderCacheDirty = false;
        faction.getControlledSectorKeys = () => ['0,0'];
        faction.getContestedSectorKeys = () => [];
        faction.getNeighborEnemySectorKeys = () => ['0,0'];
        faction.fleetCapacity = 100;
        faction.fleetPower = 100;
        faction.pendingOperationPower = 10;

        faction.update(60000, manager);

        expect(manager.startOperation).toHaveBeenCalledTimes(1);
        expect(manager.startOperation.mock.calls[0][0]).toMatchObject({
            factionId: 'test',
            sectorKey: '0,0',
            assignedPower: 10
        });

        manager.startOperation.mockClear();
        faction.pendingOperationPower = 10;
        faction.autoOperationTimer = 0;
        faction.electronicAdoption = 1;
        faction.uhfDoctrineAdoption = 1;

        faction.update(60000, manager);

        expect(manager.startOperation).not.toHaveBeenCalled();
    });
});
