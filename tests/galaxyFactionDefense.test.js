const { GalaxyFaction } = require('../src/js/galaxy/faction');
const { GalaxySector } = require('../src/js/galaxy/sector');

describe('GalaxyFaction defense calculations', () => {
    it('caches controlled sector keys until marked dirty', () => {
        const faction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        const primary = new GalaxySector({ q: 0, r: 0 });
        primary.setControl('uhf', 100);
        const frontier = new GalaxySector({ q: 1, r: -1 });

        const sectors = [primary, frontier];
        let sectorCalls = 0;
        const manager = {
            getSectors: () => {
                sectorCalls += 1;
                return sectors;
            }
        };

        const initialKeys = faction.getControlledSectorKeys(manager);
        expect(initialKeys).toEqual([primary.key]);
        expect(sectorCalls).toBe(1);

        const cachedKeys = faction.getControlledSectorKeys(manager);
        expect(cachedKeys).toBe(initialKeys);
        expect(sectorCalls).toBe(1);

        frontier.setControl('uhf', 60);
        faction.markControlDirty();

        const updatedKeys = faction.getControlledSectorKeys(manager);
        expect(updatedKeys).toContain(frontier.key);
        expect(sectorCalls).toBe(2);
    });

    it('computes UHF defense from terraformed worlds, upgrades, and fleet distribution', () => {
        const faction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        faction.fleetPower = 900;

        const sectorAlpha = new GalaxySector({ q: 0, r: 0 });
        sectorAlpha.setControl('uhf', 100);
        const sectorBeta = new GalaxySector({ q: 1, r: 0 });
        sectorBeta.setControl('uhf', 80);
        const neutral = new GalaxySector({ q: -1, r: 1 });

        const sectors = [sectorAlpha, sectorBeta, neutral];
        const manager = {
            getSectors: () => sectors,
            getTerraformedWorldCountForSector: (sector) => {
                if (sector === sectorAlpha) {
                    return 3;
                }
                if (sector === sectorBeta) {
                    return 1;
                }
                return 0;
            },
            getFleetCapacityMultiplier: () => 1.5
        };

        faction.markControlDirty();

        const alphaDefense = faction.getSectorDefense(sectorAlpha, manager);
        const betaDefense = faction.getSectorDefense(sectorBeta, manager);
        const neutralDefense = faction.getSectorDefense(neutral, manager);

        expect(alphaDefense).toBeCloseTo(450);
        expect(betaDefense).toBeCloseTo(150);
        expect(neutralDefense).toBe(0);
    });

    it('uses sector base value as defense for non-UHF factions', () => {
        const faction = new GalaxyFaction({ id: 'ally', name: 'Ally Fleet' });
        const contested = new GalaxySector({ q: 2, r: -2 });
        contested.setControl('ally', 40);

        const manager = {
            getSectors: () => [contested],
            getTerraformedWorldCountForSector: () => 5,
            getFleetCapacityMultiplier: () => 2
        };

        faction.markControlDirty();

        const baseValue = contested.getValue();
        expect(faction.getSectorDefense(contested, manager)).toBe(baseValue);
    });

    it('distributes fleet power only to border sectors', () => {
        const faction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        faction.fleetPower = 600;

        const alpha = new GalaxySector({ q: 0, r: 0 });
        alpha.setControl('uhf', 100);

        const beta = new GalaxySector({ q: 1, r: 0 });
        beta.setControl('uhf', 60);
        beta.setControl('ally', 40);

        const interior = new GalaxySector({ q: 2, r: 0 });
        interior.setControl('uhf', 90);

        const enemyStronghold = new GalaxySector({ q: 0, r: 1 });
        enemyStronghold.setControl('ally', 100);

        const sectors = [alpha, beta, interior, enemyStronghold];
        const sectorMap = new Map(sectors.map((sector) => [sector.key, sector]));

        const manager = {
            getSectors: () => sectors,
            getSector: (q, r) => sectorMap.get(GalaxySector.createKey(q, r)) || null,
            getTerraformedWorldCountForSector: (sector) => {
                if (sector === alpha) {
                    return 2;
                }
                if (sector === beta) {
                    return 1;
                }
                if (sector === interior) {
                    return 3;
                }
                return 0;
            },
            getFleetCapacityMultiplier: () => 1
        };

        faction.markControlDirty();

        const borderKeys = faction.getBorderSectorKeys(manager);
        expect(borderKeys).toContain(alpha.key);
        expect(borderKeys).toContain(beta.key);
        expect(borderKeys).not.toContain(interior.key);

        const alphaDefense = faction.getSectorDefense(alpha, manager);
        const betaDefense = faction.getSectorDefense(beta, manager);
        const interiorDefense = faction.getSectorDefense(interior, manager);

        expect(alphaDefense).toBeCloseTo(500);
        expect(betaDefense).toBeCloseTo(400);
        expect(interiorDefense).toBeCloseTo(300);
    });
});
