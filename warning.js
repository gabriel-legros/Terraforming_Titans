function updateWarnings() {
    const warningContainer = document.getElementById('warning-container');
    const colonists = resources.colony.colonists;
    const tau = terraforming?.temperature?.opticalDepth || 0;

    if (colonists.consumptionRate > colonists.productionRate) {
      warningContainer.innerHTML = '<div class="warning-message">Warning: Colonists are dying!</div>';
    } else if (tau > 10) {
      warningContainer.innerHTML = '<div class="warning-message">Warning: Excess greenhouse gases!</div>';
    } else {
      warningContainer.innerHTML = '';
    }
}

