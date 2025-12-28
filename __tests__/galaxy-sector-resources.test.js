const { GalaxySector } = require('../src/js/galaxy/sector.js');
const { galaxySectorParameters } = require('../src/js/galaxy/sector-parameters.js');

describe('Galaxy sector resources', () => {
  test('initializes rich and poor resource data from parameters', () => {
    const override = galaxySectorParameters.overrides['1,0'];
    const sector = new GalaxySector({
      q: 1,
      r: 0,
      richResource: override.richResource,
      poorResources: override.poorResources,
    });

    expect(sector.richResource).toBe('metal');
    expect(sector.poorResources).toEqual(['carbon', 'water']);
  });
});
