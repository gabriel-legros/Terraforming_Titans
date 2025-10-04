const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC loadState trims teams', () => {
  test('only first four teams are kept when loading', () => {
    const wgc = new WarpGateCommand();
    const saveData = {
      teams: Array.from({ length: 5 }, () => [null, null, null, null]),
      operations: Array.from({ length: 5 }, () => ({})),
      teamOperationCounts: [0, 0, 0, 0, 0],
      teamNextOperationNumber: [1, 1, 1, 1, 1],
      logs: Array.from({ length: 5 }, () => []),
      teamNames: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'],
      stances: Array.from({ length: 5 }, () => ({ hazardousBiomass: 'Neutral', artifact: 'Neutral' })),
    };
    wgc.loadState(saveData);
    expect(wgc.teams.length).toBe(4);
    expect(wgc.operations.length).toBe(4);
    expect(wgc.teamOperationCounts.length).toBe(4);
    expect(wgc.teamNextOperationNumber.length).toBe(4);
    expect(wgc.logs.length).toBe(4);
    expect(wgc.teamNames.length).toBe(4);
    expect(wgc.stances.length).toBe(4);
  });
});
