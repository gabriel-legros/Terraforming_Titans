require('../src/js/effectable-entity.js');
const { LifeDesign } = require('../src/js/life.js');

describe('LifeDesign survival reasons', () => {
  beforeEach(() => {
    global.formatNumber = (value, _short = false, decimals = 1) => Number(value).toFixed(decimals);
    global.toDisplayTemperature = value => value;
    global.getTemperatureUnit = () => 'K';
  });

  afterEach(() => {
    delete global.formatNumber;
    delete global.toDisplayTemperature;
    delete global.getTemperatureUnit;
    delete global.terraforming;
  });

  it('provides a primary failure reason when no zones are survivable', () => {
    global.terraforming = {
      temperature: {
        zones: {
          tropical: { day: 400, night: 390 },
          temperate: { day: 400, night: 390 },
          polar: { day: 400, night: 390 },
        },
      },
    };

    const design = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0);
    const reason = design.getPrimarySurvivalFailureReason();

    expect(reason).toContain('Tropical');
    expect(reason.toLowerCase()).toContain('too hot');
  });

  it('returns null when at least one zone is survivable', () => {
    global.terraforming = {
      temperature: {
        zones: {
          tropical: { day: 300, night: 295 },
          temperate: { day: 400, night: 390 },
          polar: { day: 400, night: 390 },
        },
      },
    };

    const design = new LifeDesign(0, 0, 0, 0, 0, 0, 0, 0, 0);
    expect(design.getPrimarySurvivalFailureReason()).toBeNull();
  });
});
