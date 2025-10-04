const { loadGalaxyConstants } = require('./helpers/loadGalaxyConstants');

loadGalaxyConstants();

const { GalaxyFaction } = require('../src/js/galaxy/faction');
const { GalaxySector } = require('../src/js/galaxy/sector');

const CAPACITY_PER_WORLD = global.UHF_FLEET_PER_WORLD || 100;
const REPLACEMENT_SECONDS_CONST = global.REPLACEMENT_SECONDS || 3600;

function createManager({ sectors = [], terraformedWorlds = 0 } = {}) {
    return {
        getSectors: () => sectors,
        getTerraformedWorldCount: () => terraformedWorlds
    };
}

describe('GalaxyFaction fleet power and capacity', () => {
    beforeEach(() => {
        global.spaceManager = undefined;
    });

    it('initializes non-UHF factions at full fleet power based on sector control', () => {
        const primarySector = new GalaxySector({ q: 0, r: 0 });
        primarySector.setValue(150);
        primarySector.setControl('test', 60);
        primarySector.setControl('rival', 40);

        const frontierSector = new GalaxySector({ q: 1, r: -1 });
        frontierSector.setValue(80);
        frontierSector.setControl('test', 20);
        frontierSector.setControl('rival', 80);

        const faction = new GalaxyFaction({ id: 'test', name: 'Test Collective' });
        const manager = createManager({ sectors: [primarySector, frontierSector] });

        faction.initializeFleetPower(manager);

        const expectedCapacity = (primarySector.getValue() * (60 / 100)) + (frontierSector.getValue() * (20 / 100));
        expect(faction.fleetCapacity).toBeCloseTo(expectedCapacity);
        expect(faction.fleetPower).toBeCloseTo(expectedCapacity);
    });

    it('calculates UHF capacity from terraformed worlds and regrows with replacement time', () => {
        const faction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        const worlds = 4;
        const manager = createManager({ terraformedWorlds: worlds });

        faction.initializeFleetPower(manager);

        const expectedCapacity = worlds * CAPACITY_PER_WORLD;
        expect(faction.fleetCapacity).toBe(expectedCapacity);
        expect(faction.fleetPower).toBe(0);

        faction.update(600000, manager);

        expect(faction.fleetPower).toBeCloseTo(expectedCapacity * (600 / REPLACEMENT_SECONDS_CONST));
    });

    it('applies an asymptotic penalty above half capacity', () => {
        const faction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        const worlds = 5;
        const manager = createManager({ terraformedWorlds: worlds });

        faction.initializeFleetPower(manager);
        const capacity = worlds * CAPACITY_PER_WORLD;
        const startingPower = Math.round(capacity * 0.7);
        faction.setFleetPower(startingPower);

        faction.update(3600000, manager);

        const halfCapacity = capacity * 0.5;
        const penalty = Math.min(1, (startingPower - halfCapacity) / halfCapacity);
        const deficit = capacity - startingPower;
        const baseChange = deficit * (3600 / REPLACEMENT_SECONDS_CONST);
        const expected = Math.min(capacity, startingPower + (baseChange * (1 - penalty)));
        expect(faction.fleetPower).toBeCloseTo(expected);
    });

    it('retains fleet power when capacity drops', () => {
        const contestedSector = new GalaxySector({ q: 2, r: -1 });
        contestedSector.setControl('ally', 100);

        const faction = new GalaxyFaction({ id: 'ally', name: 'Ally Faction' });
        const manager = createManager({ sectors: [contestedSector] });

        faction.initializeFleetPower(manager);
        const startingPower = faction.fleetPower;
        expect(startingPower).toBeGreaterThan(0);

        contestedSector.clearControl('ally');

        faction.update(1000, manager);

        expect(faction.fleetCapacity).toBe(0);
        expect(faction.fleetPower).toBe(startingPower);
    });
});
