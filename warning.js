function updateColonistWarning() {
    const warningContainer = document.getElementById('warning-container');
    const colonists = resources.colony.colonists;
  
    if (colonists.consumptionRate > colonists.productionRate) {
      warningContainer.innerHTML = '<div class="warning-message">Warning: Colonists are dying!</div>';
    } else {
      warningContainer.innerHTML = '';
    }
  }