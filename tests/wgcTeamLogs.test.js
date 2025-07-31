const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC team logs', () => {
  test('logs stored per team and trimmed to last three operations', () => {
    const wgc = new WarpGateCommand();
    for(let i=0;i<4;i++){
      const m = WGCTeamMember.create('A'+i,'','Soldier',{});
      m.power = 10; m.athletics = 10; m.wit = 10;
      wgc.recruitMember(0, i, m);
    }
    wgc.roll = () => ({ sum: 80, rolls: [20,20,20,20] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    wgc.startOperation(0);
    wgc.update(600000); // finish op 1
    wgc.update(600000); // finish op 2
    wgc.update(600000); // finish op 3
    wgc.update(600000); // finish op 4
    const logText = wgc.logs[0].join('\n');
    expect(logText).not.toMatch(/Operation #1/);
    expect(logText).toMatch(/Operation #2/);
    expect(logText).toMatch(/Operation #5/);
    const headers = wgc.logs[0].filter(l => l.startsWith('=== Operation'));
    expect(headers.length).toBe(4);
    Math.random.mockRestore();
  });
});
