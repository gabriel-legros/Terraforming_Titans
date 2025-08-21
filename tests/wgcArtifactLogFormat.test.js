const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC artifact log formatting', () => {
  test('artifact gains use formatNumber with two decimals', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A' + i, '', 'Soldier', {}));
    }
    wgc.startOperation(0, 1); // difficulty 1 for decimal artifact reward
    wgc.roll = () => ({ sum: 20, rolls: [20] }); // critical success guarantees artifact
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const event = { name: 'Test', type: 'individual', skill: 'athletics' };
    wgc.resolveEvent(0, event);

    const eventLog = wgc.logs[0][wgc.logs[0].length - 1];
    expect(eventLog).toMatch(/\+1\.10 Artifact/);

    wgc.finishOperation(0);
    const summaryLog = wgc.logs[0].find(l => l.includes('Operation 1 Complete'));
    expect(summaryLog).toMatch(/1\.10 artifact\(s\)/);
    const bonusLog = wgc.logs[0].find(l => l.includes('Highest difficulty'));
    expect(bonusLog).toMatch(/\+2\.00 Artifact/);
    Math.random.mockRestore();
  });
});

