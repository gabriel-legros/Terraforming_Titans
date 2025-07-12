let solisTabVisible = false;
let solisUIInitialized = false;
const shopElements = {};
const shopDescriptions = {
  funding: 'Increase funding by 1',
  metal: 'Increase starting metal by 100',
  components: 'Increase starting components by 100',
  electronics: 'Increase starting electronics by 100',
  glass: 'Increase starting glass by 100',
  water: 'Increase starting water by 1M',
  androids: 'Increase starting androids by 100',
  food: 'Increase starting food by 100'
};

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

function createShopItem(key) {
  const item = document.createElement('div');
  item.classList.add('solis-shop-item');

  const label = document.createElement('span');
  label.classList.add('solis-shop-item-label');
  label.innerHTML = `${shopDescriptions[key]} <span class="solis-shop-item-cost">(Cost: <span id="solis-shop-${key}-cost"></span>)</span>`;
  item.appendChild(label);

  const actions = document.createElement('div');
  actions.classList.add('solis-shop-item-actions');

  const button = document.createElement('button');
  button.id = `solis-shop-${key}-button`;
  button.textContent = 'Buy';
  button.addEventListener('click', () => {
    solisManager.purchaseUpgrade(key);
    updateSolisUI();
  });
  actions.appendChild(button);

  const purchased = document.createElement('span');
  purchased.classList.add('solis-shop-item-count');
  purchased.innerHTML = `Purchased: <span id="solis-shop-${key}-count">0</span>`;
  actions.appendChild(purchased);

  item.appendChild(actions);

  const costSpan = label.querySelector(`#solis-shop-${key}-cost`);
  const countSpan = purchased.querySelector(`#solis-shop-${key}-count`);

  shopElements[key] = { button, cost: costSpan, count: countSpan };
  return item;
}

function initializeSolisUI() {
  if (solisUIInitialized) {
    return;
  }
  hideSolisTab();
  const refreshBtn = document.getElementById('solis-refresh-button');
  const completeBtn = document.getElementById('solis-complete-button');
  const multBtn = document.getElementById('solis-multiply-button');
  const divBtn = document.getElementById('solis-divide-button');
  const silenceToggle = document.getElementById('solis-silence-toggle');

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

  if (silenceToggle) {
    if (typeof gameSettings !== 'undefined') {
      silenceToggle.checked = gameSettings.silenceSolisAlert || false;
    }
    silenceToggle.addEventListener('change', () => {
      if (typeof gameSettings !== 'undefined') {
        gameSettings.silenceSolisAlert = silenceToggle.checked;
      }
      if (typeof updateHopeAlert === 'function') {
        updateHopeAlert();
      }
    });
  }

  const container = document.getElementById('solis-shop-items');
  if (container) {
    const shopContainer = container.parentElement;
    shopContainer.classList.add('solis-shop-container');

    const title = document.createElement('h3');
    title.textContent = 'Solis Shop';
    shopContainer.insertBefore(title, container);
    
    ['funding', 'metal', 'components', 'electronics', 'glass', 'water', 'androids', 'food'].forEach(key => {
      container.appendChild(createShopItem(key));
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
      const format = typeof formatNumber === 'function' ? formatNumber : (n => n);
      const qty = format(quest.quantity, true);
      questText.innerHTML = `Deliver <span class="solis-quest-quantity">${qty}</span> units of <span class="solis-quest-resource">${quest.resource}</span>`;
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

  for (const key in shopElements) {
    const el = shopElements[key];
    if (!el) continue;
    if (el.cost) el.cost.textContent = solisManager.getUpgradeCost(key);
    if (el.count) el.count.textContent = solisManager.shopUpgrades[key].purchases;
    if (el.button) el.button.disabled = solisManager.solisPoints < solisManager.getUpgradeCost(key);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hideSolisTab, showSolisTab };
}
