let solisTabVisible = true;
let solisUIInitialized = false;

function showSolisTab() {
  solisTabVisible = true;
  const tab = document.querySelector('.hope-subtab[data-subtab="solis-hope"]');
  const content = document.getElementById('solis-hope');
  if (tab) tab.classList.remove('hidden');
  if (content) content.classList.remove('hidden');
}

function hideSolisTab() {
  solisTabVisible = false;
  const tab = document.querySelector('.hope-subtab[data-subtab="solis-hope"]');
  const content = document.getElementById('solis-hope');
  if (tab) tab.classList.add('hidden');
  if (content) content.classList.add('hidden');
}

function initializeSolisUI() {
  if (solisUIInitialized) {
    return;
  }
  const refreshBtn = document.getElementById('solis-refresh-button');
  const completeBtn = document.getElementById('solis-complete-button');
  const multBtn = document.getElementById('solis-multiply-button');
  const divBtn = document.getElementById('solis-divide-button');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      solisManager.refreshQuest();
      updateSolisUI();
    });
  }
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      if (solisManager.completeQuest()) {
        updateSolisUI();
      }
    });
  }
  if (multBtn) {
    multBtn.addEventListener('click', () => {
      solisManager.multiplyReward();
      updateSolisUI();
    });
  }
  if (divBtn) {
    divBtn.addEventListener('click', () => {
      solisManager.divideReward();
      updateSolisUI();
    });
  }

  solisUIInitialized = true;
}

function updateSolisUI() {
  const questText = document.getElementById('solis-quest-text');
  const refreshBtn = document.getElementById('solis-refresh-button');
  const completeBtn = document.getElementById('solis-complete-button');
  const pointsSpan = document.getElementById('solis-points-value');
  const rewardSpan = document.getElementById('solis-reward');
  const cooldownDiv = document.getElementById('solis-cooldown');

  if (pointsSpan) {
    pointsSpan.textContent = solisManager.solisPoints;
  }
  if (rewardSpan) {
    rewardSpan.textContent = solisManager.rewardMultiplier;
  }
  const quest = solisManager.currentQuest;
  if (questText) {
    if (quest) {
      questText.textContent = `Deliver ${quest.quantity} ${quest.resource}`;
    } else {
      questText.textContent = 'No quest available';
    }
  }
  const now = Date.now();
  if (refreshBtn) {
    const remainingRefresh = solisManager.refreshCooldown - (now - solisManager.lastRefreshTime);
    const remainingComplete = solisManager.postCompletionCooldownUntil - now;
    const remaining = Math.max(remainingRefresh, remainingComplete);
    if (remaining > 0) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = `Refresh (${Math.ceil(remaining / 1000)}s)`;
    } else {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh';
    }
  }
  if (completeBtn) {
    if (quest && resources.colony[quest.resource] && resources.colony[quest.resource].value >= quest.quantity) {
      completeBtn.disabled = false;
    } else {
      completeBtn.disabled = true;
    }
  }
  if (cooldownDiv) {
    const remainingComplete = solisManager.postCompletionCooldownUntil - now;
    if (!quest && remainingComplete > 0) {
      cooldownDiv.classList.remove('hidden');
      cooldownDiv.textContent = `Next quest in ${Math.ceil(remainingComplete / 1000)}s`;
    } else {
      cooldownDiv.classList.add('hidden');
      cooldownDiv.textContent = '';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hideSolisTab, showSolisTab };
}
