const researchParameters = require('../src/js/research-parameters.js');

describe('AI Metropolis Expansion research', () => {
  it('scales metropolis housing, output, and upkeep each repeat', () => {
    const entry = researchParameters.colonization.find((research) => research.id === 'ai_metropolis_expansion');

    expect(entry).toBeDefined();
    expect(entry.repeatable).toBe(true);

    const storageEffect = entry.effects.find((effect) => effect.type === 'storageMultiplier' && effect.targetId === 't6_colony');
    const productionEffect = entry.effects.find((effect) => effect.type === 'productionMultiplier' && effect.targetId === 't6_colony');
    const consumptionEffect = entry.effects.find((effect) => effect.type === 'consumptionMultiplier' && effect.targetId === 't6_colony');

    expect(storageEffect).toMatchObject({ value: 1.1, repeatableMultiplier: 1.1 });
    expect(productionEffect).toMatchObject({ value: 1.1, repeatableMultiplier: 1.1 });
    expect(consumptionEffect).toMatchObject({ value: 1.1, repeatableMultiplier: 1.1 });
  });
});
