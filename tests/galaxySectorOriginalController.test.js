const { GalaxySector } = require('../src/js/galaxy/sector');

describe('GalaxySector original controller tracking', () => {
    test('records the first faction that gains control', () => {
        const sector = new GalaxySector({ q: 1, r: -2 });

        sector.setControl('alpha', 75);
        expect(sector.originalController).toBe('alpha');

        sector.setControl('beta', 120);
        expect(sector.originalController).toBe('alpha');

        sector.setControl('alpha', 0);
        expect(sector.originalController).toBe('alpha');
    });

    test('persists original controller through serialization', () => {
        const sector = new GalaxySector({ q: 0, r: 0 });
        sector.setControl('gamma', 55);

        const saved = sector.toJSON();
        expect(saved.originalController).toBe('gamma');

        const restored = new GalaxySector(saved);
        expect(restored.originalController).toBe('gamma');
        expect(restored.getControlValue('gamma')).toBe(55);

        restored.setControl('delta', 40);
        expect(restored.originalController).toBe('gamma');
    });

    test('respects provided original controller when present', () => {
        const sector = new GalaxySector({ q: -1, r: 2, originalController: 'omega' });
        expect(sector.originalController).toBe('omega');

        sector.setControl('sigma', 100);
        expect(sector.originalController).toBe('omega');
    });
});
