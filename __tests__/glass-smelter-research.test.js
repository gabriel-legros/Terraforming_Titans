const researchParameters = require('../src/js/research-parameters.js');

describe('Massive scale glass smelting research', () => {
  it('defines the research entry with cost and glass smelter multipliers', () => {
    const research = researchParameters.industry.find(
      (entry) => entry.id === 'massive_scale_glass_smelting'
    );

    expect(research).toBeDefined();
    expect(research.cost).toEqual({ research: 500_000_000 });
    expect(research.effects).toEqual([
      {
        target: 'building',
        targetId: 'glassSmelter',
        type: 'productionMultiplier',
        value: 2
      },
      {
        target: 'building',
        targetId: 'glassSmelter',
        type: 'consumptionMultiplier',
        value: 2
      }
    ]);
  });
});
