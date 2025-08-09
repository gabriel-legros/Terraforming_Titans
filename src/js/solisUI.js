let solisTabVisible = false;
let solisUIInitialized = false;
const shopElements = {};
const shopDescriptions = {
  funding: 'Increase funding by 1',
  metal: 'Increase starting metal and base storage by 100',
  food: 'Increase starting food and base storage by 100',
  components: 'Increase starting components and base storage by 100',
  electronics: 'Increase starting electronics and base storage by 100',
  glass: 'Increase starting glass and base storage by 100',
  water: 'Increase starting water and base storage by 1M',
  androids: 'Increase starting androids and base storage by 100',
  colonistRocket: 'Increase colonists per import rocket by 1',
  researchUpgrade: 'Auto-complete one early infrastructure technology per purchase'
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

function updateSolisVisibility() {
  if (typeof solisManager === 'undefined') return;
  if (solisManager.enabled) {
    if (!solisTabVisible) {
      showSolisTab();
    }
  } else if (solisTabVisible) {
    hideSolisTab();
  }
}

function getResearchNameById(id) {
  if (typeof researchParameters !== 'undefined') {
    for (const category in researchParameters) {
      const r = researchParameters[category].find(x => x.id === id);
      if (r) return r.name;
    }
  }
  if (typeof researchManager !== 'undefined' && typeof researchManager.getResearchById === 'function') {
    const r = researchManager.getResearchById(id);
    if (r) return r.name;
  }
  return id;
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
  const elementRecord = { button, cost: costSpan, count: countSpan };

  if (key === 'researchUpgrade') {
    const list = document.createElement('ul');
    list.classList.add('solis-research-list');
    const order = solisManager.getResearchUpgradeOrder ? solisManager.getResearchUpgradeOrder() : [];
    elementRecord.listItems = [];
    order.forEach(id => {
      const li = document.createElement('li');
      li.textContent = getResearchNameById(id);
      list.appendChild(li);
      elementRecord.listItems.push(li);
    });
    item.appendChild(list);
  }

  shopElements[key] = elementRecord;
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
    
    ['funding', 'metal', 'food', 'components', 'electronics', 'glass', 'water', 'androids', 'colonistRocket'].forEach(key => {
      container.appendChild(createShopItem(key));
    });
  }

  const donationContainer = document.getElementById('solis-donation-items');
  if (donationContainer) {
    const parent = donationContainer.parentElement;
    parent.classList.add('solis-shop-container', 'hidden');
    const title = document.createElement('h3');
    title.textContent = 'Alien Artifact Donation';
    parent.insertBefore(title, donationContainer);

    const item = document.createElement('div');
    item.classList.add('solis-shop-item');

    const label = document.createElement('span');
    label.classList.add('solis-shop-item-label');
    label.textContent = 'Donate artifacts for 100 Solis points each';
    item.appendChild(label);

    const actions = document.createElement('div');
    actions.classList.add('solis-shop-item-actions');

    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'solis-donation-input';
    input.min = '1';
    input.value = '1';
    actions.appendChild(input);

    const button = document.createElement('button');
    button.id = 'solis-donation-button';
    button.textContent = 'Donate';
    button.addEventListener('click', () => {
      const amount = parseInt(input.value, 10) || 0;
      solisManager.donateArtifacts(amount);
      updateSolisUI();
    });
    actions.appendChild(button);

    const owned = document.createElement('span');
    owned.classList.add('solis-shop-item-count');
    owned.innerHTML = `Owned: <span id="solis-donation-count">0</span>`;
    actions.appendChild(owned);

    item.appendChild(actions);
    donationContainer.appendChild(item);
  }

  const researchShopItems = document.getElementById('solis-research-shop-items');
  if (researchShopItems) {
    const parent = researchShopItems.parentElement;
    parent.classList.add('solis-shop-container', 'hidden');
    const title = document.createElement('h3');
    title.textContent = 'Research Upgrades';
    parent.insertBefore(title, researchShopItems);
    researchShopItems.appendChild(createShopItem('researchUpgrade'));
  }

  const questText = document.getElementById('solis-quest-text');
  if (questText) {
    questText.textContent = '';
    const messageSpan = document.createElement('span');
    messageSpan.id = 'solis-quest-message';
    messageSpan.textContent = 'No quest available';
    const detailSpan = document.createElement('span');
    detailSpan.id = 'solis-quest-detail';
    detailSpan.classList.add('hidden');
    const qtySpan = document.createElement('span');
    qtySpan.id = 'solis-quest-quantity';
    qtySpan.classList.add('solis-quest-quantity');
    const resSpan = document.createElement('span');
    resSpan.id = 'solis-quest-resource';
    resSpan.classList.add('solis-quest-resource');
    detailSpan.append('Deliver ', qtySpan, ' units of ', resSpan);
    questText.append(messageSpan, detailSpan);
  }

  const cooldownDiv = document.getElementById('solis-cooldown');
  if (cooldownDiv) {
    cooldownDiv.textContent = '';
    const cooldownText = document.createElement('span');
    cooldownText.id = 'solis-cooldown-text';
    const barContainer = document.createElement('div');
    barContainer.classList.add('solis-progress-bar-container');
    const bar = document.createElement('div');
    bar.classList.add('solis-progress-bar');
    bar.id = 'solis-cooldown-bar';
    bar.style.width = '0%';
    barContainer.appendChild(bar);
    cooldownDiv.append(cooldownText, barContainer);
  }

  // New: Set initial button text
  if (multBtn) multBtn.textContent = '+';
  if (divBtn) divBtn.textContent = '-';

  solisUIInitialized = true;
}

function updateSolisUI() {
  const questMessage = document.getElementById('solis-quest-message');
  const questDetail = document.getElementById('solis-quest-detail');
  const questQuantitySpan = document.getElementById('solis-quest-quantity');
  const questResourceSpan = document.getElementById('solis-quest-resource');
  const refreshBtn = document.getElementById('solis-refresh-button');
  const completeBtn = document.getElementById('solis-complete-button');
  const pointsSpan = document.getElementById('solis-points-value');
  const rewardSpan = document.getElementById('solis-reward');
  const cooldownDiv = document.getElementById('solis-cooldown');
  const cooldownText = document.getElementById('solis-cooldown-text');
  const cooldownBar = document.getElementById('solis-cooldown-bar');
  const donationSection = document.getElementById('solis-donation-section');
  const donationCount = document.getElementById('solis-donation-count');
  const donationInput = document.getElementById('solis-donation-input');
  const donationButton = document.getElementById('solis-donation-button');
  const researchShop = document.getElementById('solis-research-shop');

  const flag = solisManager.isBooleanFlagSet && solisManager.isBooleanFlagSet('solisAlienArtifactUpgrade');
  if (donationSection) donationSection.classList.toggle('hidden', !flag);
  if (researchShop) researchShop.classList.toggle('hidden', !flag);

  if (pointsSpan) {
    pointsSpan.textContent = solisManager.solisPoints;
  }
  if (rewardSpan) {
    rewardSpan.textContent = solisManager.rewardMultiplier;
  }
  const quest = solisManager.currentQuest;
  if (questMessage && questDetail && questQuantitySpan && questResourceSpan) {
    if (quest) {
      const format = typeof formatNumber === 'function' ? formatNumber : (n => n);
      const qty = format(quest.quantity, true);
      questQuantitySpan.textContent = qty;
      questResourceSpan.textContent = quest.resource;
      questMessage.classList.add('hidden');
      questDetail.classList.remove('hidden');
    } else {
      questMessage.textContent = 'No new quest available at this time.';
      questMessage.classList.remove('hidden');
      questDetail.classList.add('hidden');
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
  if (cooldownDiv && cooldownText && cooldownBar) {
    const remainingComplete = solisManager.postCompletionCooldownUntil - now;
    if (!quest && remainingComplete > 0) {
      cooldownDiv.classList.remove('hidden');
      const totalCooldown = solisManager.questInterval;
      const progress = Math.max(0, 1 - remainingComplete / totalCooldown);
      cooldownText.textContent = `Next quest in ${Math.ceil(remainingComplete / 1000)}s`;
      cooldownBar.style.width = `${progress * 100}%`;
    } else {
      cooldownDiv.classList.add('hidden');
      cooldownText.textContent = '';
      cooldownBar.style.width = '0%';
    }
  }
  if (donationCount && resources.special && resources.special.alienArtifact) {
    donationCount.textContent = resources.special.alienArtifact.value;
  }
  if (donationButton && donationInput && resources.special && resources.special.alienArtifact) {
    const amt = parseInt(donationInput.value, 10) || 0;
    donationButton.disabled = amt <= 0 || amt > resources.special.alienArtifact.value;
  }

  for (const key in shopElements) {
    const el = shopElements[key];
    if (!el) continue;
    if (el.cost) el.cost.textContent = solisManager.getUpgradeCost(key);
    if (el.count) el.count.textContent = solisManager.shopUpgrades[key].purchases;
    if (el.button) el.button.disabled = solisManager.solisPoints < solisManager.getUpgradeCost(key);
    if (key === 'researchUpgrade' && el.listItems) {
      const purchases = solisManager.shopUpgrades.researchUpgrade.purchases;
      el.listItems.forEach((li, idx) => {
        if (idx < purchases) {
          li.classList.add('solis-research-completed');
        } else {
          li.classList.remove('solis-research-completed');
        }
      });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hideSolisTab, showSolisTab, updateSolisVisibility };
}
