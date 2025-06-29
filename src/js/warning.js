function updateWarnings() {
    const warningContainer = document.getElementById('warning-container');
    const colonists = resources.colony.colonists;
    const tau = terraforming?.temperature?.opticalDepth || 0;
    const tempK = terraforming?.temperature?.value || 0;

    if (colonists.consumptionRate > colonists.productionRate) {
      warningContainer.innerHTML = '<div class="warning-message">Warning: Colonists are dying!</div>';
    } else if (tau > 10) {
    } else if (tau > 10 && tempK > 313.15) {
      warningContainer.innerHTML = '<div class="warning-message">Warning: Runaway Greenhouse Effect!</div>';
    } else {
      warningContainer.innerHTML = '';
    }
}