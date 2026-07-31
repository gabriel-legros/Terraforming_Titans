// Stable resource-rate identities and their localized display labels.
var resourceRateSourceLabels = Object.create(null);
var RESOURCE_RATE_SOURCE_IDS = Object.freeze({
  overflow: 'system:overflow',
  overflowExcluded: 'system:overflowExcluded',
  spaceshipMining: 'project:spaceshipMining',
  spaceshipExport: 'project:spaceshipExport',
  spaceshipCost: 'project:spaceshipCost',
  spaceStorageTransfer: 'project:spaceStorageTransfer',
  galacticMarket: 'project:galacticMarket',
  artificialEcosystems: 'project:artificialEcosystems'
});

var registerRateSource = function(sourceId, displayName) {
  resourceRateSourceLabels[sourceId] = displayName || sourceId;
  return sourceId;
};

var getRateSourceDisplayName = function(sourceId) {
  return resourceRateSourceLabels[sourceId] || sourceId;
};

var getLocalizedRateSource = function(sourceId, path, fallback, vars = {}) {
  return registerRateSource(sourceId, t(path, vars, fallback));
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RESOURCE_RATE_SOURCE_IDS,
    registerRateSource,
    getRateSourceDisplayName,
    getLocalizedRateSource
  };
}
