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

  const fundingBtn = document.getElementById('solis-shop-funding-button');
  if (fundingBtn) {
    fundingBtn.addEventListener('click', () => {
      solisManager.purchaseUpgrade('funding');
      updateSolisUI();
    });
  }
  
  // New: Set initial button text
  if (multBtn) multBtn.textContent = '+';
  if (divBtn) divBtn.textContent = '-';

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
      questText.innerHTML = `Deliver <span class="solis-quest-quantity">${quest.quantity}</span> units of <span class="solis-quest-resource">${quest.resource}</span>`;
    } else {
      questText.textContent = 'No new quest available at this time.';
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
      const totalCooldown = solisManager.questInterval;
      const progress = Math.max(0, 1 - remainingComplete / totalCooldown);
      cooldownDiv.innerHTML = `
        <span>Next quest in ${Math.ceil(remainingComplete / 1000)}s</span>
        <div class="solis-progress-bar-container">
          <div class="solis-progress-bar" style="width: ${progress * 100}%"></div>
        </div>
      `;
    } else {
      cooldownDiv.classList.add('hidden');
      cooldownDiv.innerHTML = '';
    }
  }

  const fundingCost = document.getElementById('solis-shop-funding-cost');
  const fundingCount = document.getElementById('solis-shop-funding-count');
  const fundingBtn = document.getElementById('solis-shop-funding-button');
  if (fundingCost) fundingCost.textContent = solisManager.getUpgradeCost('funding');
  if (fundingCount) fundingCount.textContent = solisManager.shopUpgrades.funding.purchases;
  if (fundingBtn) fundingBtn.disabled = solisManager.solisPoints < solisManager.getUpgradeCost('funding');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hideSolisTab, showSolisTab };
}
