const warningContainer = typeof document !== 'undefined'
  ? document.getElementById('warning-container')
  : null;

const warningMessage = typeof document !== 'undefined'
  ? document.createElement('div')
  : null;

if (warningMessage) {
  warningMessage.className = 'warning-message';
}

function updateWarnings() {
  if (!warningContainer || !warningMessage) {
    return;
  }

  const colonists = resources.colony.colonists;
  const tau = terraforming?.temperature?.opticalDepth || 0;
  const tempK = terraforming?.temperature?.value || 0;

  let message = '';

  if (colonists.consumptionRate > colonists.productionRate) {
    message = 'Warning: Colonists are dying!';
  } else if (tau > 10 && tempK > 313.15) {
    message = 'Warning: Runaway Greenhouse Effect!';
  }

  if (message) {
    warningMessage.textContent = message;
    warningMessage.style.display = '';
    if (!warningContainer.contains(warningMessage)) {
      warningContainer.appendChild(warningMessage);
    }
  } else {
    warningMessage.style.display = 'none';
    if (warningContainer.contains(warningMessage)) {
      warningContainer.removeChild(warningMessage);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = updateWarnings;
}

if (typeof window !== 'undefined') {
  window.updateWarnings = updateWarnings;
}
