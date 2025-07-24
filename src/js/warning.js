function updateWarnings() {
    const warningContainer = document.getElementById('warning-container');
    const colonists = resources.colony.colonists;
    const tau = terraforming?.temperature?.opticalDepth || 0;
    const tempK = terraforming?.temperature?.value || 0;

    if (colonists.consumptionRate > colonists.productionRate) {
      warningContainer.innerHTML = '<div class="warning-message">Warning: Colonists are dying!</div>';
    } else if (tau > 10 && tempK > 313.15) {
      warningContainer.innerHTML = '<div class="warning-message">Warning: Runaway Greenhouse Effect!</div>';
    } else if (terraforming?.celestialParameters?.parentBody) {
      warningContainer.innerHTML = '<div class="warning-message">Moons must first their parent\'s gravity well before distance to the sun can be changed</div>';
    } else {
      warningContainer.innerHTML = '';
    }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = updateWarnings;
}

if (typeof window !== 'undefined') {
  window.updateWarnings = updateWarnings;
}
