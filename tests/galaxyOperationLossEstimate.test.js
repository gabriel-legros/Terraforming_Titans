const EffectableEntity = require('../src/js/effectable-entity');

global.EffectableEntity = EffectableEntity;

const { GalaxyManager } = require('../src/js/galaxy/galaxy');

describe('GalaxyManager operation loss estimate', () => {
    test('returns expected values with provided defense power', () => {
        const manager = new GalaxyManager();
        const sectorKey = '0,0';
        manager.sectors.set(sectorKey, {});
        const estimate = manager.getOperationLossEstimate({
            sectorKey,
            factionId: 'uhf',
            assignedPower: 120,
            reservedPower: 120,
            defensePower: 60
        });
        expect(estimate).not.toBeNull();
        expect(estimate.offensePower).toBeCloseTo(120);
        expect(estimate.reservedPower).toBeCloseTo(120);
        expect(estimate.defensePower).toBeCloseTo(60);
        expect(estimate.successChance).toBe(1);
        expect(estimate.failureChance).toBe(0);
        expect(estimate.successLoss).toBe(0);
        expect(estimate.failureLoss).toBeCloseTo(120);
    });

    test('clamps offense and losses to reserved power', () => {
        const manager = new GalaxyManager();
        const sectorKey = '1,0';
        manager.sectors.set(sectorKey, {});
        const estimate = manager.getOperationLossEstimate({
            sectorKey,
            factionId: 'uhf',
            assignedPower: 150,
            reservedPower: 80,
            offensePower: 120,
            defensePower: 40
        });
        expect(estimate).not.toBeNull();
        expect(estimate.offensePower).toBeCloseTo(80);
        expect(estimate.reservedPower).toBeCloseTo(80);
        expect(estimate.successChance).toBe(1);
        expect(estimate.successLoss).toBe(0);
        expect(estimate.failureLoss).toBeCloseTo(80);
    });

    test('returns zero chance when offense is lower than defense and scales linearly', () => {
        const manager = new GalaxyManager();
        const sectorKey = '2,0';
        manager.sectors.set(sectorKey, {});
        const lowEstimate = manager.getOperationLossEstimate({
            sectorKey,
            factionId: 'uhf',
            assignedPower: 40,
            reservedPower: 40,
            defensePower: 60
        });
        expect(lowEstimate.successChance).toBe(0);
        expect(lowEstimate.failureChance).toBe(1);

        const midEstimate = manager.getOperationLossEstimate({
            sectorKey,
            factionId: 'uhf',
            assignedPower: 90,
            reservedPower: 90,
            defensePower: 60
        });
        expect(midEstimate.successChance).toBeCloseTo((90 - 60) / 60);
        expect(midEstimate.failureChance).toBeCloseTo(1 - ((90 - 60) / 60));
    });
});
