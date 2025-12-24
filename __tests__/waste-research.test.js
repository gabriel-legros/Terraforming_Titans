const researchParameters = require('../src/js/research-parameters.js');

describe('Waste workforce automation research', () => {
  it('defines the worker reduction research for waste buildings', () => {
    const research = researchParameters.industry.find((entry) => entry.id === 'waste_workforce_automation');
    expect(research).toBeDefined();
    expect(research.cost).toEqual({ research: 200000 });
    expect(research.prerequisites).toEqual(['waste_processing']);
    expect(research.requiredFlags).toEqual(['gabbagWasteProcessing']);
    expect(research.effects).toEqual([
      {
        target: 'building',
        targetId: 'garbageSorter',
        type: 'workerMultiplier',
        value: 0.8,
      },
      {
        target: 'building',
        targetId: 'trashIncinerator',
        type: 'workerMultiplier',
        value: 0.8,
      },
      {
        target: 'building',
        targetId: 'junkRecycler',
        type: 'workerMultiplier',
        value: 0.8,
      },
      {
        target: 'building',
        targetId: 'scrapRecycler',
        type: 'workerMultiplier',
        value: 0.8,
      },
      {
        target: 'building',
        targetId: 'radioactiveRecycler',
        type: 'workerMultiplier',
        value: 0.8,
      },
    ]);
  });
});
