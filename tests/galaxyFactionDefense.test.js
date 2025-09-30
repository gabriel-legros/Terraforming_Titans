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

        expect(alphaDefense).toBeCloseTo(900);
        expect(betaDefense).toBeCloseTo(600);
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
});
