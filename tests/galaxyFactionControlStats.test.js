const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;

jest.mock('../src/js/galaxy/factions-parameters', () => {
    const { GalaxySector } = require('../src/js/galaxy/sector');
    return {
        galaxyFactionParameters: [
            {
                id: 'alpha',
                name: 'Alpha Concordat',
                color: '#ffffff',
                startingSectors: [GalaxySector.createKey(0, 0)]
            },
            {
                id: 'beta',
                name: 'Beta Accord',
                color: '#000000',
                startingSectors: [GalaxySector.createKey(1, 0)]
            }
        ],
        galaxySectorControlOverrides: {}
    };
});

const { GalaxyManager } = require('../src/js/galaxy/galaxy');
const { GalaxySector } = require('../src/js/galaxy/sector');

describe('Galaxy sector original controller tracking', () => {
    it('retains the first controlling faction as the original controller', () => {
        const sector = new GalaxySector({ q: 0, r: 0 });

        expect(sector.getOriginalController()).toBeNull();

        sector.setControl('alpha', 80);
        expect(sector.getOriginalController()).toBe('alpha');

        sector.setControl('beta', 40);
        expect(sector.getOriginalController()).toBe('alpha');

        sector.clearControl('alpha');
        expect(sector.getOriginalController()).toBe('alpha');

        const serialized = sector.toJSON();
        expect(serialized.originalController).toBe('alpha');
    });
});

describe('GalaxyManager faction control statistics', () => {
    let manager;

    beforeEach(() => {
        manager = new GalaxyManager();
        manager.initialize();
    });

    it('updates faction counts when sector control changes', () => {
        const alphaFaction = manager.getFaction('alpha');
        const betaFaction = manager.getFaction('beta');
        const alphaSector = manager.getSector(0, 0);
        const betaSector = manager.getSector(1, 0);

        expect(alphaSector.getOriginalController()).toBe('alpha');
        expect(betaSector.getOriginalController()).toBe('beta');

        expect(alphaFaction.originalSectorCount).toBe(1);
        expect(alphaFaction.originalControlledSectorCount).toBe(1);
        expect(alphaFaction.controlledSectorCount).toBe(1);

        expect(betaFaction.originalSectorCount).toBe(1);
        expect(betaFaction.originalControlledSectorCount).toBe(1);
        expect(betaFaction.controlledSectorCount).toBe(1);

        alphaSector.setControl('beta', 120);
        alphaSector.clearControl('alpha');

        expect(alphaFaction.controlledSectorCount).toBe(0);
        expect(alphaFaction.originalControlledSectorCount).toBe(0);
        expect(alphaFaction.originalSectorCount).toBe(1);

        expect(betaFaction.controlledSectorCount).toBe(2);
        expect(betaFaction.originalControlledSectorCount).toBe(1);
        expect(betaFaction.originalSectorCount).toBe(1);

        expect(alphaSector.getOriginalController()).toBe('alpha');
    });
});
