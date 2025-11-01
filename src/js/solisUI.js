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
  startingShips: 'Add one Solis-built cargo ship to your starting fleet (base cost: 100)',
  research: 'Increase starting research points by 100',
  terraformingMeasurements: 'Permanently unlock Terraforming measurements research across colonies',
  advancedOversight: 'Enables advanced oversight for the space mirror facility, which can precisely control mirrors and lanterns based on a target temperature.',
  researchUpgrade: 'Permanently Auto-complete one colonization technology per purchase',
  autoResearch: 'Enable automatic research assignment for unlocked technologies'
};

const automationShopKeys = ['autoResearch'];

function showSolisTab() {
  solisTabVisible = true;
  if (typeof hopeSubtabManager !== 'undefined' && hopeSubtabManager) {
    hopeSubtabManager.show('solis-hope');
  } else {
    const tab = document.querySelector('.hope-subtab[data-subtab="solis-hope"]');
    const content = document.getElementById('solis-hope');
    if (tab) tab.classList.remove('hidden');
    if (content) content.classList.remove('hidden');
  }
}

function hideSolisTab() {
  solisTabVisible = false;
  if (typeof hopeSubtabManager !== 'undefined' && hopeSubtabManager) {
    hopeSubtabManager.hide('solis-hope');
  } else {
    const tab = document.querySelector('.hope-subtab[data-subtab="solis-hope"]');
    const content = document.getElementById('solis-hope');
    if (tab) tab.classList.add('hidden');
    if (content) content.classList.add('hidden');
  }
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
  purchased.textContent = 'Purchased: ';
  const countSpan = document.createElement('span');
  countSpan.id = `solis-shop-${key}-count`;
  purchased.appendChild(countSpan);
  actions.appendChild(purchased);

  item.appendChild(actions);

  const costWrapper = label.querySelector('.solis-shop-item-cost');
  const costSpan = costWrapper.querySelector(`#solis-shop-${key}-cost`);
  const elementRecord = { button, cost: costSpan, costWrapper, count: countSpan, purchased, item };

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

  const managerRef = globalThis.solisManager;
  const solis1 = Boolean(managerRef?.isBooleanFlagSet?.('solisUpgrade1'));
  const solis2 = Boolean(managerRef?.isBooleanFlagSet?.('solisUpgrade2'));
  const container = document.getElementById('solis-shop-items');
  if (container) {
    const shopContainer = container.parentElement;
    shopContainer.classList.add('solis-shop-container');

    const title = document.createElement('h3');
    title.textContent = 'Solis Shop';
    shopContainer.insertBefore(title, container);

    const baseKeys = ['funding', 'metal', 'food', 'components', 'electronics', 'glass', 'water', 'androids', 'colonistRocket'];
    const keys = baseKeys.slice();
    if (solis2) {
      keys.push('startingShips');
    }
    if (solis1) {
      keys.push('research');
    }
    keys.forEach(key => {
      const item = createShopItem(key);
      container.appendChild(item);
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
    label.id = 'solis-donation-label';
    label.textContent = 'Donate artifacts for 10 Solis points each';
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
    if (managerRef?.isBooleanFlagSet?.('solisTerraformingMeasurements')) {
      researchShopItems.appendChild(createShopItem('terraformingMeasurements'));
    }
    if (solis1) {
      researchShopItems.appendChild(createShopItem('advancedOversight'));
    }
  }

  const automationShopItems = document.getElementById('solis-automation-shop-items');
  if (automationShopItems) {
    const parent = automationShopItems.parentElement;
    parent.classList.add('solis-shop-container', 'hidden');
    const title = document.createElement('h3');
    title.textContent = 'Automation Upgrades';
    parent.insertBefore(title, automationShopItems);
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
  const donationLabel = document.getElementById('solis-donation-label');
  const researchShop = document.getElementById('solis-research-shop');
  const researchShopItems = document.getElementById('solis-research-shop-items');
  const automationShop = document.getElementById('solis-automation-shop');
  const automationShopItems = document.getElementById('solis-automation-shop-items');

  const flag = solisManager.isBooleanFlagSet && solisManager.isBooleanFlagSet('solisAlienArtifactUpgrade');
  if (donationSection) donationSection.classList.toggle('hidden', !flag);
  if (researchShop) researchShop.classList.toggle('hidden', !flag);

  const managerRef = solisManager;
  const solis1 = Boolean(managerRef?.isBooleanFlagSet?.('solisUpgrade1'));
  const solis2 = Boolean(managerRef?.isBooleanFlagSet?.('solisUpgrade2'));
  const terraformingFlag = Boolean(managerRef?.isBooleanFlagSet?.('solisTerraformingMeasurements'));
  let automationVisible = 0;
  automationShopKeys.forEach((key) => {
    const enabled = solisManager.isUpgradeEnabled?.(key) ?? true;
    const record = shopElements[key];
    if (enabled) {
      automationVisible += 1;
      if (!record && automationShopItems) {
        const item = createShopItem(key);
        automationShopItems.appendChild(item);
      }
    } else if (record) {
      record.item.remove();
      delete shopElements[key];
    }
  });
  if (automationShop) {
    automationShop.classList.toggle('hidden', automationVisible === 0);
  }
  ['research'].forEach(k => {
    const record = shopElements[k];
    if (solis1) {
      if (!record) {
        const container = document.getElementById('solis-shop-items');
        if (container) {
          const item = createShopItem(k);
          container.appendChild(item);
        }
      }
    } else if (record) {
      record.item.remove();
      delete shopElements[k];
    }
  });
  const startingShipsRecord = shopElements.startingShips;
  if (solis2) {
    if (!startingShipsRecord) {
      const container = document.getElementById('solis-shop-items');
      if (container) {
        const item = createShopItem('startingShips');
        container.appendChild(item);
      }
    }
  } else if (startingShipsRecord) {
    startingShipsRecord.item.remove();
    delete shopElements.startingShips;
  }
  const advRecord = shopElements.advancedOversight;
  if (solis1) {
    if (!advRecord && researchShopItems) {
      researchShopItems.appendChild(createShopItem('advancedOversight'));
    }
  } else if (advRecord) {
    advRecord.item.remove();
    delete shopElements.advancedOversight;
  }
  const terraformingRecord = shopElements.terraformingMeasurements;
  if (terraformingFlag) {
    if (!terraformingRecord && researchShopItems) {
      researchShopItems.appendChild(createShopItem('terraformingMeasurements'));
    }
  } else if (terraformingRecord) {
    terraformingRecord.item.remove();
    delete shopElements.terraformingMeasurements;
  }

  if (pointsSpan) {
    const format = typeof formatNumber === 'function'
      ? formatNumber
      : (n, _s, p = 2) => Number(n).toFixed(p);
    pointsSpan.textContent = format(solisManager.solisPoints, false, 2);
  }
  if (rewardSpan) {
    const format = typeof formatNumber === 'function'
      ? formatNumber
      : (n, _s, p = 2) => Number(n).toFixed(p);
    rewardSpan.textContent = format(solisManager.getCurrentReward(), false, 2);
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
    donationCount.textContent = formatNumber(resources.special.alienArtifact.value, false, 2);
  }
  if (donationButton && donationInput && resources.special && resources.special.alienArtifact) {
    const amt = parseInt(donationInput.value, 10) || 0;
    donationButton.disabled = amt <= 0 || amt > resources.special.alienArtifact.value;
  }
  if (donationLabel) {
    const format = typeof formatNumber === 'function'
      ? formatNumber
      : (n, _s, p = 2) => Number(n).toFixed(p);
    const per = 10 * (solisManager.getTerraformedWorldBonus ? solisManager.getTerraformedWorldBonus() : 1);
    donationLabel.textContent = `Donate artifacts for ${format(per, false, 2)} Solis points each`;
  }

  for (const key in shopElements) {
    const el = shopElements[key];
    if (!el) continue;
    const up = solisManager.shopUpgrades[key];
    if (!up) continue;
    const atMax = typeof up.max === 'number' && up.purchases >= up.max;
    if (el.purchased && el.count) {
      if (atMax) {
        el.purchased.textContent = 'Purchased';
      } else {
        el.purchased.textContent = 'Purchased: ';
        el.purchased.appendChild(el.count);
        el.count.textContent = up.purchases;
      }
    }
    if (atMax) {
      if (el.button) el.button.classList.add('hidden');
      if (el.costWrapper) el.costWrapper.classList.add('hidden');
    } else {
      if (el.cost) el.cost.textContent = solisManager.getUpgradeCost(key);
      if (el.costWrapper) el.costWrapper.classList.remove('hidden');
      if (el.button) {
        el.button.classList.remove('hidden');
        el.button.disabled = solisManager.solisPoints < solisManager.getUpgradeCost(key);
      }
    }
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
