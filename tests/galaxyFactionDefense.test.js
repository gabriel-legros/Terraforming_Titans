const { loadGalaxyConstants } = require('./helpers/loadGalaxyConstants');

loadGalaxyConstants();

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

    it('does not treat contested sectors as controlled', () => {
        const faction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        const home = new GalaxySector({ q: 0, r: 0 });
        home.setControl('uhf', 100);
        const contested = new GalaxySector({ q: 1, r: 0 });
        contested.setControl('uhf', 40);
        contested.setControl('ally', 60);

        const sectors = [home, contested];
        const manager = {
            getSectors: () => sectors
        };

        const controlledKeys = faction.getControlledSectorKeys(manager);
        expect(controlledKeys).toContain(home.key);
        expect(controlledKeys).not.toContain(contested.key);
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

    it('caches contested and neighbouring enemy sector keys until marked dirty', () => {
        const faction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });

        const home = new GalaxySector({ q: 0, r: 0 });
        home.setControl('uhf', 100);

        const contested = new GalaxySector({ q: 1, r: 0 });
        contested.setControl('uhf', 40);
        contested.setControl('ally', 60);

        const enemyNeighbor = new GalaxySector({ q: 0, r: 1 });
        enemyNeighbor.setControl('ally', 100);

        const distantEnemy = new GalaxySector({ q: 3, r: -1 });
        distantEnemy.setControl('ally', 100);

        const sectors = [home, contested, enemyNeighbor, distantEnemy];
        const sectorMap = new Map(sectors.map((sector) => [sector.key, sector]));
        let getSectorsCalls = 0;

        const manager = {
            getSectors: () => {
                getSectorsCalls += 1;
                return sectors;
            },
            getSector: (q, r) => sectorMap.get(GalaxySector.createKey(q, r)) || null
        };

        const enemyKeys = faction.getNeighborEnemySectorKeys(manager);
        expect(enemyKeys).toContain(enemyNeighbor.key);
        expect(enemyKeys).not.toContain(distantEnemy.key);

        const contestedKeys = faction.getContestedSectorKeys(manager);
        expect(contestedKeys).toContain(contested.key);

        expect(getSectorsCalls).toBe(1);

        const cachedEnemyKeys = faction.getNeighborEnemySectorKeys(manager);
        const cachedContestedKeys = faction.getContestedSectorKeys(manager);
        expect(cachedEnemyKeys).toBe(enemyKeys);
        expect(cachedContestedKeys).toBe(contestedKeys);
        expect(getSectorsCalls).toBe(1);

        enemyNeighbor.clearControl('ally');
        faction.markBorderDirty();

        const refreshedEnemyKeys = faction.getNeighborEnemySectorKeys(manager);
        expect(refreshedEnemyKeys).not.toContain(enemyNeighbor.key);
        expect(getSectorsCalls).toBe(2);

        contested.clearControl('ally');
        faction.markBorderDirty();

        const refreshedContestedKeys = faction.getContestedSectorKeys(manager);
        expect(refreshedContestedKeys).not.toContain(contested.key);
        expect(getSectorsCalls).toBe(3);
    });

    it('records highest enemy threats when rebuilding conflict caches', () => {
        const uhfFaction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });
        const allyFaction = new GalaxyFaction({ id: 'ally', name: 'Ally Fleet' });
        const rivalFaction = new GalaxyFaction({ id: 'rival', name: 'Rival Fleet' });

        const home = new GalaxySector({ q: 0, r: 0 });
        home.setControl('uhf', 80);

        const shared = new GalaxySector({ q: 1, r: 0 });
        shared.setControl('uhf', 40);
        shared.setControl('ally', 30);
        shared.setControl('rival', 30);

        const allyStronghold = new GalaxySector({ q: 0, r: 1 });
        allyStronghold.setControl('ally', 100);

        const rivalOutpost = new GalaxySector({ q: 1, r: -1 });
        rivalOutpost.setControl('rival', 100);

        const allyExpansion = new GalaxySector({ q: 2, r: -1 });
        allyExpansion.setControl('ally', 100);

        const sectors = [home, shared, allyStronghold, rivalOutpost, allyExpansion];
        const sectorMap = new Map(sectors.map((sector) => [sector.key, sector]));
        const factionMap = new Map([
            ['uhf', uhfFaction],
            ['ally', allyFaction],
            ['rival', rivalFaction]
        ]);

        allyFaction.markControlDirty();
        rivalFaction.markControlDirty();

        const manager = {
            getSectors: () => sectors,
            getSector: (q, r) => sectorMap.get(GalaxySector.createKey(q, r)) || null,
            getFaction: (id) => factionMap.get(id) || null
        };

        uhfFaction.markBorderDirty();

        const contestedKeys = uhfFaction.getContestedSectorKeys(manager);
        expect(contestedKeys).toContain(shared.key);

        const neighborKeys = uhfFaction.getNeighborEnemySectorKeys(manager);
        expect(neighborKeys).toContain(allyStronghold.key);
        expect(neighborKeys).toContain(rivalOutpost.key);

        expect(uhfFaction.getContestedThreatLevel(shared.key)).toBe(2);
        expect(uhfFaction.getNeighborThreatLevel(home.key)).toBe(2);
        expect(uhfFaction.getNeighborThreatLevel(allyStronghold.key)).toBe(0);
        expect(uhfFaction.getNeighborThreatLevel(rivalOutpost.key)).toBe(0);
        expect(uhfFaction.getContestedThreatLevel(home.key)).toBe(0);
    });

    it('rebuilds contested caches during update when marked dirty', () => {
        const faction = new GalaxyFaction({ id: 'uhf', name: 'UHF' });

        const home = new GalaxySector({ q: 0, r: 0 });
        home.setControl('uhf', 100);

        const contested = new GalaxySector({ q: 1, r: 0 });
        contested.setControl('uhf', 40);
        contested.setControl('ally', 60);

        const enemyNeighbor = new GalaxySector({ q: 0, r: 1 });
        enemyNeighbor.setControl('ally', 100);

        const sectors = [home, contested, enemyNeighbor];
        const sectorMap = new Map(sectors.map((sector) => [sector.key, sector]));
        let getSectorsCalls = 0;

        const manager = {
            getSectors: () => {
                getSectorsCalls += 1;
                return sectors;
            },
            getSector: (q, r) => sectorMap.get(GalaxySector.createKey(q, r)) || null,
            getTerraformedWorldCount: () => 0,
            getFleetCapacityMultiplier: () => 1
        };

        faction.markBorderDirty();
        expect(faction.contestedCacheDirty).toBe(true);

        faction.update(1000, manager);

        expect(getSectorsCalls).toBeGreaterThan(0);
        expect(faction.contestedCacheDirty).toBe(false);
        expect(faction.neighborEnemyCacheDirty).toBe(false);
        expect(faction.contestedSectors).toContain(contested.key);
        expect(faction.neighborEnemySectors).toContain(enemyNeighbor.key);
    });
});
