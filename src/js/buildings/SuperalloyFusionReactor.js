class SuperalloyFusionReactor extends MultiRecipesBuilding {}

try {
  registerBuildingConstructor('superalloyFusionReactor', SuperalloyFusionReactor);
} catch (error) {}

try {
  module.exports = { SuperalloyFusionReactor };
} catch (error) {}
