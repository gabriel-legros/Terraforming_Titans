const { captureAutoBuildSettings, restoreAutoBuildSettings } = require('../src/js/autobuild');

describe('autobuild travel persistence', () => {
  test('settings persist across travel and enabled resets', () => {
    const before = {
      Alpha: { autoBuildPercent: 2, autoBuildEnabled: true, autoBuildPriority: true, autoBuildBasis: 'population', autoActiveEnabled: false },
      Beta: { autoBuildPercent: 5, autoBuildEnabled: true, autoBuildPriority: false, autoBuildBasis: 'workers', autoActiveEnabled: true },
    };
    captureAutoBuildSettings(before);
    const after = {
      Alpha: { autoBuildPercent: 0.1, autoBuildEnabled: true, autoBuildPriority: false, autoBuildBasis: 'population', autoActiveEnabled: true },
      Beta: { autoBuildPercent: 0.1, autoBuildEnabled: true, autoBuildPriority: true, autoBuildBasis: 'population', autoActiveEnabled: false },
      Gamma: { autoBuildPercent: 0.1, autoBuildEnabled: true, autoBuildPriority: true, autoBuildBasis: 'population', autoActiveEnabled: true },
    };
    restoreAutoBuildSettings(after);
    expect(after.Alpha.autoBuildPercent).toBe(2);
    expect(after.Beta.autoBuildPercent).toBe(5);
    expect(after.Gamma.autoBuildPercent).toBe(0.1);
    expect(after.Alpha.autoBuildBasis).toBe('population');
    expect(after.Beta.autoBuildBasis).toBe('workers');
    expect(after.Gamma.autoBuildBasis).toBe('population');
    expect(after.Alpha.autoBuildPriority).toBe(true);
    expect(after.Beta.autoBuildPriority).toBe(false);
    expect(after.Gamma.autoBuildPriority).toBe(false);
    expect(after.Alpha.autoActiveEnabled).toBe(false);
    expect(after.Beta.autoActiveEnabled).toBe(false);
    expect(after.Gamma.autoActiveEnabled).toBe(false);
    for (const key of Object.keys(after)) {
      expect(after[key].autoActiveEnabled).toBe(false);
    }
  });
});
