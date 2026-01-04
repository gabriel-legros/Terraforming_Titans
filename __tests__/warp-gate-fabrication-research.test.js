const researchParameters = require('../src/js/research-parameters.js');

describe('Warp Gate Fabrication advanced research', () => {
  it('defines the research entry with the correct cost and flag', () => {
    const research = researchParameters.advanced.find((entry) => entry.id === 'warp_gate_fabrication');
    expect(research).toBeDefined();
    expect(research.cost).toEqual({ advancedResearch: 5000000 });
    expect(research.effects).toEqual([
      {
        target: 'warpGateNetworkManager',
        type: 'booleanFlag',
        flagId: 'warpGateFabrication',
        value: true,
      },
    ]);
  });
});
