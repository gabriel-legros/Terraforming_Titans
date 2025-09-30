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
        expect(estimate.successChance).toBeCloseTo(120 / (120 + 60));
        expect(estimate.failureChance).toBeCloseTo(1 - (120 / (120 + 60)));
        const expectedSuccessLoss = Math.min(120, (60 * 60) / (120 + 60));
        expect(estimate.successLoss).toBeCloseTo(expectedSuccessLoss);
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
        const expectedChance = 80 / (80 + 40);
        expect(estimate.successChance).toBeCloseTo(expectedChance);
        const expectedSuccessLoss = Math.min(80, (40 * 40) / (80 + 40));
        expect(estimate.successLoss).toBeCloseTo(expectedSuccessLoss);
        expect(estimate.failureLoss).toBeCloseTo(80);
    });
});
