let solisTabVisible = false;
let solisUIInitialized = false;

const shopElements = {};
const solisUIElements = {
  tabButton: null,
  tabContent: null,
  refreshButton: null,
  completeButton: null,
  minButton: null,
  multiplyButton: null,
  divideButton: null,
  maxButton: null,
  silenceToggle: null,
  pointsValue: null,
  rewardValue: null,
  questContainer: null,
  questMessage: null,
  questDetail: null,
  cooldownContainer: null,
  cooldownText: null,
  cooldownBar: null,
  shopItems: null,
  shopSection: null,
  shopHeader: null,
  shopTitle: null,
  shopHeaderControls: null,
  shopDivideButton: null,
  shopMultiplyButton: null,
  donationSection: null,
  donationItems: null,
  donationTitle: null,
  donationLabel: null,
  donationInput: null,
  donationButton: null,
  donationCount: null,
  researchShop: null,
  researchShopItems: null,
  researchTitle: null,
  automationShop: null,
  automationShopItems: null,
  automationTitle: null
};

function getSolisUIText(path, vars, fallback) {
  return t(`ui.hope.solisUi.${path}`, vars, fallback);
}

function formatSolisValue(value, short, precision) {
  return formatNumber(value, short, precision);
}

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
  androidsPermanentResearch: 'Permanently unlock Android Manufacturing research across colonies',
  advancedOversight: 'Enables advanced oversight for the space mirror facility, which can precisely control mirrors and lanterns based on a target temperature.',
  researchUpgrade: 'Permanently Auto-complete one colonization technology per purchase',
  autoResearch: 'Enable automatic research assignment for unlocked technologies',
  researchAutomation: 'Provides HOPE with software for managing research presets',
  shipAssignment: 'Provides HOPE with software for easier spaceship management',
  lifeAutomation: 'Provides HOPE with software for easier biomass management',
  buildingsAutomation: 'Provides HOPE with software for easier buildings management',
  projectsAutomation: 'Provides HOPE with software for easier projects management',
  colonyAutomation: 'Provides HOPE with software for easier colony management'
};

const automationShopKeys = ['autoResearch', 'shipAssignment', 'lifeAutomation', 'buildingsAutomation', 'projectsAutomation', 'colonyAutomation', 'researchAutomation'];
const solisShopRepeatableKeys = [
  'funding',
  'metal',
  'food',
  'components',
  'electronics',
  'glass',
  'water',
  'androids',
  'colonistRocket',
  'startingShips',
  'research'
];
const solisShopControls = {
  multiplier: 1,
  divideButton: null,
  multiplyButton: null,
  donationAmount: 1
};

function isRepeatableSolisShopUpgrade(key) {
  return solisShopRepeatableKeys.indexOf(key) !== -1;
}

function setSolisShopMultiplier(nextValue) {
  solisShopControls.multiplier = Math.max(1, Math.floor(nextValue));
}

function updateSolisShopMultiplierControls() {
  if (solisShopControls.divideButton) {
    solisShopControls.divideButton.textContent = '/10';
  }
  if (solisShopControls.multiplyButton) {
    solisShopControls.multiplyButton.textContent = 'x10';
  }
}

function getSolisShopPurchaseMultiplier() {
  return solisShopControls.multiplier;
}

function cacheSolisTabElements() {
  if (!solisUIElements.tabButton || !solisUIElements.tabButton.isConnected) {
    solisUIElements.tabButton = document.querySelector('.hope-subtab[data-subtab="solis-hope"]');
  }
  if (!solisUIElements.tabContent || !solisUIElements.tabContent.isConnected) {
    solisUIElements.tabContent = document.getElementById('solis-hope');
  }
  return solisUIElements;
}

function cacheSolisUIElements() {
  cacheSolisTabElements();
  if (!solisUIElements.refreshButton || !solisUIElements.refreshButton.isConnected) {
    solisUIElements.refreshButton = document.getElementById('solis-refresh-button');
  }
  if (!solisUIElements.completeButton || !solisUIElements.completeButton.isConnected) {
    solisUIElements.completeButton = document.getElementById('solis-complete-button');
  }
  if (!solisUIElements.minButton || !solisUIElements.minButton.isConnected) {
    solisUIElements.minButton = document.getElementById('solis-min-button');
  }
  if (!solisUIElements.multiplyButton || !solisUIElements.multiplyButton.isConnected) {
    solisUIElements.multiplyButton = document.getElementById('solis-multiply-button');
  }
  if (!solisUIElements.divideButton || !solisUIElements.divideButton.isConnected) {
    solisUIElements.divideButton = document.getElementById('solis-divide-button');
  }
  if (!solisUIElements.maxButton || !solisUIElements.maxButton.isConnected) {
    solisUIElements.maxButton = document.getElementById('solis-max-button');
  }
  if (!solisUIElements.silenceToggle || !solisUIElements.silenceToggle.isConnected) {
    solisUIElements.silenceToggle = document.getElementById('solis-silence-toggle');
  }
  if (!solisUIElements.pointsValue || !solisUIElements.pointsValue.isConnected) {
    solisUIElements.pointsValue = document.getElementById('solis-points-value');
  }
  if (!solisUIElements.rewardValue || !solisUIElements.rewardValue.isConnected) {
    solisUIElements.rewardValue = document.getElementById('solis-reward');
  }
  if (!solisUIElements.questContainer || !solisUIElements.questContainer.isConnected) {
    solisUIElements.questContainer = document.getElementById('solis-quest-text');
  }
  if (!solisUIElements.cooldownContainer || !solisUIElements.cooldownContainer.isConnected) {
    solisUIElements.cooldownContainer = document.getElementById('solis-cooldown');
  }
  if (!solisUIElements.shopItems || !solisUIElements.shopItems.isConnected) {
    solisUIElements.shopItems = document.getElementById('solis-shop-items');
  }
  if (!solisUIElements.donationSection || !solisUIElements.donationSection.isConnected) {
    solisUIElements.donationSection = document.getElementById('solis-donation-section');
  }
  if (!solisUIElements.donationItems || !solisUIElements.donationItems.isConnected) {
    solisUIElements.donationItems = document.getElementById('solis-donation-items');
  }
  if (!solisUIElements.researchShop || !solisUIElements.researchShop.isConnected) {
    solisUIElements.researchShop = document.getElementById('solis-research-shop');
  }
  if (!solisUIElements.researchShopItems || !solisUIElements.researchShopItems.isConnected) {
    solisUIElements.researchShopItems = document.getElementById('solis-research-shop-items');
  }
  if (!solisUIElements.automationShop || !solisUIElements.automationShop.isConnected) {
    solisUIElements.automationShop = document.getElementById('solis-automation-shop');
  }
  if (!solisUIElements.automationShopItems || !solisUIElements.automationShopItems.isConnected) {
    solisUIElements.automationShopItems = document.getElementById('solis-automation-shop-items');
  }
  return solisUIElements;
}

function ensureSolisQuestElements() {
  const refs = cacheSolisUIElements();
  const questContainer = refs.questContainer;
  if (!questContainer) {
    return refs;
  }

  if (!refs.questMessage || refs.questMessage.parentElement !== questContainer || !refs.questMessage.isConnected) {
    refs.questMessage = document.getElementById('solis-quest-message');
  }
  if (!refs.questDetail || refs.questDetail.parentElement !== questContainer || !refs.questDetail.isConnected) {
    refs.questDetail = document.getElementById('solis-quest-detail');
  }
  if (!refs.questMessage || refs.questMessage.parentElement !== questContainer || !refs.questDetail || refs.questDetail.parentElement !== questContainer) {
    questContainer.textContent = '';

    refs.questMessage = document.createElement('span');
    refs.questMessage.id = 'solis-quest-message';
    refs.questMessage.textContent = t('ui.hope.noQuestAvailable', {}, 'No quest available');

    refs.questDetail = document.createElement('span');
    refs.questDetail.id = 'solis-quest-detail';
    refs.questDetail.classList.add('hidden');
    refs.questDetail.textContent = '';

    questContainer.append(refs.questMessage, refs.questDetail);
  }

  return refs;
}

function ensureSolisCooldownElements() {
  const refs = cacheSolisUIElements();
  const cooldownContainer = refs.cooldownContainer;
  if (!cooldownContainer) {
    return refs;
  }

  if (!refs.cooldownText || refs.cooldownText.parentElement !== cooldownContainer || !refs.cooldownText.isConnected) {
    refs.cooldownText = document.getElementById('solis-cooldown-text');
  }
  if (!refs.cooldownBar || !refs.cooldownBar.isConnected) {
    refs.cooldownBar = document.getElementById('solis-cooldown-bar');
  }
  if (!refs.cooldownText || refs.cooldownText.parentElement !== cooldownContainer || !refs.cooldownBar) {
    cooldownContainer.textContent = '';
    refs.cooldownText = document.createElement('span');
    refs.cooldownText.id = 'solis-cooldown-text';
    const barContainer = document.createElement('div');
    barContainer.classList.add('solis-progress-bar-container');
    refs.cooldownBar = document.createElement('div');
    refs.cooldownBar.classList.add('solis-progress-bar');
    refs.cooldownBar.id = 'solis-cooldown-bar';
    refs.cooldownBar.style.width = '0%';
    barContainer.appendChild(refs.cooldownBar);
    cooldownContainer.append(refs.cooldownText, barContainer);
  }

  return refs;
}

function showSolisTab() {
  solisTabVisible = true;
  if (hopeSubtabManager) {
    hopeSubtabManager.show('solis-hope');
    return;
  }
  const refs = cacheSolisTabElements();
  if (refs.tabButton) {
    refs.tabButton.classList.remove('hidden');
  }
  if (refs.tabContent) {
    refs.tabContent.classList.remove('hidden');
  }
}

function hideSolisTab() {
  solisTabVisible = false;
  if (hopeSubtabManager) {
    hopeSubtabManager.hide('solis-hope');
    return;
  }
  const refs = cacheSolisTabElements();
  if (refs.tabButton) {
    refs.tabButton.classList.add('hidden');
  }
  if (refs.tabContent) {
    refs.tabContent.classList.add('hidden');
  }
}

function updateSolisVisibility() {
  if (solisManager.enabled) {
    if (!solisTabVisible) {
      showSolisTab();
    }
  } else if (solisTabVisible) {
    hideSolisTab();
  }
}

function getResearchNameById(id) {
  for (const category in researchParameters) {
    const research = researchParameters[category].find(item => item.id === id);
    if (research) {
      return research.name;
    }
  }
  const research = researchManager.getResearchById(id);
  if (research) {
    return research.name;
  }
  return id;
}

function createShopItem(key) {
  const item = document.createElement('div');
  item.classList.add('solis-shop-item');

  const label = document.createElement('span');
  label.classList.add('solis-shop-item-label');
  const description = t(`ui.hope.solisShopDescriptions.${key}`, {}, shopDescriptions[key] || key);
  label.append(document.createTextNode(`${description} `));
  const costWrapper = document.createElement('span');
  costWrapper.classList.add('solis-shop-item-cost');
  const costSpan = document.createElement('span');
  costSpan.id = `solis-shop-${key}-cost`;
  costWrapper.textContent = `(${getSolisUIText('costLabel', { value: '' }, 'Cost: ')}`;
  costWrapper.appendChild(costSpan);
  costWrapper.append(document.createTextNode(')'));
  label.appendChild(costWrapper);
  item.appendChild(label);

  const actions = document.createElement('div');
  actions.classList.add('solis-shop-item-actions');

  const button = document.createElement('button');
  button.id = `solis-shop-${key}-button`;
  const repeatable = isRepeatableSolisShopUpgrade(key);
  button.textContent = repeatable
    ? getSolisUIText('buyWithMultiplier', { value: getSolisShopPurchaseMultiplier() }, `Buy x${getSolisShopPurchaseMultiplier()}`)
    : getSolisUIText('buyButton', {}, 'Buy');
  button.addEventListener('click', () => {
    if (repeatable) {
      solisManager.purchaseUpgradeMultiple(key, getSolisShopPurchaseMultiplier());
    } else {
      solisManager.purchaseUpgrade(key);
    }
    updateSolisUI();
  });
  actions.appendChild(button);

  const purchased = document.createElement('span');
  purchased.classList.add('solis-shop-item-count');
  purchased.textContent = getSolisUIText('purchasedLabel', {}, 'Purchased: ');
  const countSpan = document.createElement('span');
  countSpan.id = `solis-shop-${key}-count`;
  purchased.appendChild(countSpan);
  actions.appendChild(purchased);

  item.appendChild(actions);
  const elementRecord = { button, cost: costSpan, costWrapper, count: countSpan, purchased, item, repeatable };

  if (key === 'researchUpgrade') {
    const list = document.createElement('ul');
    list.classList.add('solis-research-list');
    const order = solisManager.getResearchUpgradeOrder();
    elementRecord.listItems = [];
    order.forEach(id => {
      const listItem = document.createElement('li');
      listItem.textContent = getResearchNameById(id);
      list.appendChild(listItem);
      elementRecord.listItems.push(listItem);
    });
    item.appendChild(list);
  }

  shopElements[key] = elementRecord;
  return item;
}

function ensureSolisShopHeader() {
  const refs = cacheSolisUIElements();
  const shopItems = refs.shopItems;
  if (!shopItems) {
    return refs;
  }
  if (!refs.shopSection || !refs.shopSection.isConnected) {
    refs.shopSection = shopItems.parentElement;
  }
  const shopSection = refs.shopSection;
  if (!shopSection) {
    return refs;
  }
  shopSection.classList.add('solis-shop-container');

  if (!refs.shopHeader || refs.shopHeader.parentElement !== shopSection || !refs.shopHeader.isConnected) {
    refs.shopHeader = shopSection.querySelector('.solis-shop-header');
  }
  if (!refs.shopHeader) {
    refs.shopHeader = document.createElement('div');
    refs.shopHeader.classList.add('solis-shop-header');
    shopSection.insertBefore(refs.shopHeader, shopItems);
  }

  if (!refs.shopTitle || refs.shopTitle.parentElement !== refs.shopHeader || !refs.shopTitle.isConnected) {
    refs.shopTitle = refs.shopHeader.querySelector('h3');
  }
  if (!refs.shopTitle) {
    refs.shopTitle = document.createElement('h3');
    refs.shopHeader.appendChild(refs.shopTitle);
  }
  refs.shopTitle.textContent = getSolisUIText('shopTitle', {}, 'Solis Shop');

  if (!refs.shopHeaderControls || refs.shopHeaderControls.parentElement !== refs.shopHeader || !refs.shopHeaderControls.isConnected) {
    refs.shopHeaderControls = refs.shopHeader.querySelector('.solis-shop-header-controls');
  }
  if (!refs.shopHeaderControls) {
    refs.shopHeaderControls = document.createElement('div');
    refs.shopHeaderControls.classList.add('solis-shop-header-controls');
    refs.shopHeader.appendChild(refs.shopHeaderControls);
  }

  if (!refs.shopDivideButton || refs.shopDivideButton.parentElement !== refs.shopHeaderControls || !refs.shopDivideButton.isConnected) {
    refs.shopDivideButton = document.getElementById('solis-shop-divide-button');
  }
  if (!refs.shopDivideButton) {
    refs.shopDivideButton = document.createElement('button');
    refs.shopDivideButton.id = 'solis-shop-divide-button';
    refs.shopDivideButton.addEventListener('click', () => {
      setSolisShopMultiplier(Math.max(1, Math.floor(getSolisShopPurchaseMultiplier() / 10)));
      updateSolisUI();
    });
    refs.shopHeaderControls.appendChild(refs.shopDivideButton);
  }

  if (!refs.shopMultiplyButton || refs.shopMultiplyButton.parentElement !== refs.shopHeaderControls || !refs.shopMultiplyButton.isConnected) {
    refs.shopMultiplyButton = document.getElementById('solis-shop-multiply-button');
  }
  if (!refs.shopMultiplyButton) {
    refs.shopMultiplyButton = document.createElement('button');
    refs.shopMultiplyButton.id = 'solis-shop-multiply-button';
    refs.shopMultiplyButton.addEventListener('click', () => {
      setSolisShopMultiplier(getSolisShopPurchaseMultiplier() * 10);
      updateSolisUI();
    });
    refs.shopHeaderControls.appendChild(refs.shopMultiplyButton);
  }

  solisShopControls.divideButton = refs.shopDivideButton;
  solisShopControls.multiplyButton = refs.shopMultiplyButton;
  updateSolisShopMultiplierControls();
  return refs;
}

function ensureDonationSection() {
  const refs = cacheSolisUIElements();
  const donationItems = refs.donationItems;
  if (!donationItems) {
    return refs;
  }
  const donationSection = refs.donationSection || donationItems.parentElement;
  refs.donationSection = donationSection;
  donationSection.classList.add('solis-shop-container', 'hidden');

  if (!refs.donationTitle || refs.donationTitle.parentElement !== donationSection || !refs.donationTitle.isConnected) {
    refs.donationTitle = donationSection.querySelector('h3');
  }
  if (!refs.donationTitle) {
    refs.donationTitle = document.createElement('h3');
    donationSection.insertBefore(refs.donationTitle, donationItems);
  }
  refs.donationTitle.textContent = getSolisUIText('donationTitle', {}, 'Alien Artifact Donation');

  if (!refs.donationLabel || !refs.donationLabel.isConnected) {
    refs.donationLabel = document.getElementById('solis-donation-label');
  }
  if (!refs.donationInput || !refs.donationInput.isConnected) {
    refs.donationInput = document.getElementById('solis-donation-input');
  }
  if (!refs.donationButton || !refs.donationButton.isConnected) {
    refs.donationButton = document.getElementById('solis-donation-button');
  }
  if (!refs.donationCount || !refs.donationCount.isConnected) {
    refs.donationCount = document.getElementById('solis-donation-count');
  }

  if (!refs.donationButton || !refs.donationInput || !refs.donationLabel || !refs.donationCount) {
    donationItems.textContent = '';

    const item = document.createElement('div');
    item.classList.add('solis-shop-item');

    refs.donationLabel = document.createElement('span');
    refs.donationLabel.classList.add('solis-shop-item-label');
    refs.donationLabel.id = 'solis-donation-label';
    item.appendChild(refs.donationLabel);

    const actions = document.createElement('div');
    actions.classList.add('solis-shop-item-actions');

    refs.donationInput = document.createElement('input');
    refs.donationInput.type = 'text';
    refs.donationInput.id = 'solis-donation-input';
    wireStringNumberInput(refs.donationInput, {
      datasetKey: 'donationAmount',
      parseValue: value => Math.max(1, parseFlexibleNumber(value) || 1),
      formatValue: parsed => (parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed)),
      onValue: parsed => {
        solisShopControls.donationAmount = parsed;
      }
    });
    refs.donationInput.dataset.donationAmount = '1';
    refs.donationInput.value = '1';
    actions.appendChild(refs.donationInput);

    refs.donationButton = document.createElement('button');
    refs.donationButton.id = 'solis-donation-button';
    refs.donationButton.textContent = getSolisUIText('donateButton', {}, 'Donate');
    refs.donationButton.addEventListener('click', () => {
      solisManager.donateArtifacts(solisShopControls.donationAmount || 0);
      updateSolisUI();
    });
    actions.appendChild(refs.donationButton);

    const owned = document.createElement('span');
    owned.classList.add('solis-shop-item-count');
    owned.textContent = getSolisUIText('ownedLabel', {}, 'Owned: ');
    refs.donationCount = document.createElement('span');
    refs.donationCount.id = 'solis-donation-count';
    refs.donationCount.textContent = '0';
    owned.appendChild(refs.donationCount);
    actions.appendChild(owned);

    item.appendChild(actions);
    donationItems.appendChild(item);
  }

  return refs;
}

function ensureResearchShopSection() {
  const refs = cacheSolisUIElements();
  const researchShopItems = refs.researchShopItems;
  if (!researchShopItems) {
    return refs;
  }
  const researchShop = refs.researchShop || researchShopItems.parentElement;
  refs.researchShop = researchShop;
  researchShop.classList.add('solis-shop-container', 'hidden');

  if (!refs.researchTitle || refs.researchTitle.parentElement !== researchShop || !refs.researchTitle.isConnected) {
    refs.researchTitle = researchShop.querySelector('h3');
  }
  if (!refs.researchTitle) {
    refs.researchTitle = document.createElement('h3');
    researchShop.insertBefore(refs.researchTitle, researchShopItems);
  }
  refs.researchTitle.textContent = getSolisUIText('researchUpgradesTitle', {}, 'Research Upgrades');
  return refs;
}

function ensureAutomationShopSection() {
  const refs = cacheSolisUIElements();
  const automationShopItems = refs.automationShopItems;
  if (!automationShopItems) {
    return refs;
  }
  const automationShop = refs.automationShop || automationShopItems.parentElement;
  refs.automationShop = automationShop;
  automationShop.classList.add('solis-shop-container', 'hidden');

  if (!refs.automationTitle || refs.automationTitle.parentElement !== automationShop || !refs.automationTitle.isConnected) {
    refs.automationTitle = automationShop.querySelector('h3');
  }
  if (!refs.automationTitle) {
    refs.automationTitle = document.createElement('h3');
    automationShop.insertBefore(refs.automationTitle, automationShopItems);
  }
  refs.automationTitle.textContent = getSolisUIText('automationUpgradesTitle', {}, 'Automation Upgrades');
  return refs;
}

function ensureBaseShopItems() {
  const refs = ensureSolisShopHeader();
  const shopItems = refs.shopItems;
  if (!shopItems) {
    return;
  }

  const baseKeys = ['funding', 'metal', 'food', 'components', 'electronics', 'glass', 'water', 'androids', 'colonistRocket'];
  baseKeys.forEach(key => {
    if (!shopElements[key]) {
      shopItems.appendChild(createShopItem(key));
    }
  });
}

function ensureResearchBaseItems() {
  const refs = ensureResearchShopSection();
  if (refs.researchShopItems && !shopElements.researchUpgrade) {
    refs.researchShopItems.appendChild(createShopItem('researchUpgrade'));
  }
}

function ensureSolisSections() {
  ensureSolisShopHeader();
  ensureDonationSection();
  ensureResearchShopSection();
  ensureAutomationShopSection();
  ensureBaseShopItems();
  ensureResearchBaseItems();
  ensureSolisQuestElements();
  ensureSolisCooldownElements();
}

function initializeSolisControls() {
  const refs = cacheSolisUIElements();
  if (refs.refreshButton) {
    refs.refreshButton.addEventListener('click', () => {
      solisManager.refreshQuest();
      updateSolisUI();
    });
  }
  if (refs.completeButton) {
    refs.completeButton.addEventListener('click', () => {
      if (solisManager.completeQuest()) {
        updateSolisUI();
      }
    });
  }
  if (refs.multiplyButton) {
    refs.multiplyButton.addEventListener('click', () => {
      solisManager.multiplyReward();
      updateSolisUI();
    });
  }
  if (refs.divideButton) {
    refs.divideButton.addEventListener('click', () => {
      solisManager.divideReward();
      updateSolisUI();
    });
  }
  if (refs.minButton) {
    refs.minButton.addEventListener('click', () => {
      solisManager.setMinimumRewardMultiplier();
      updateSolisUI();
    });
  }
  if (refs.maxButton) {
    refs.maxButton.addEventListener('click', () => {
      solisManager.setMaximumAffordableRewardMultiplier();
      updateSolisUI();
    });
  }
  if (refs.silenceToggle) {
    refs.silenceToggle.checked = gameSettings.silenceSolisAlert || false;
    refs.silenceToggle.addEventListener('change', () => {
      gameSettings.silenceSolisAlert = refs.silenceToggle.checked;
      updateHopeAlert();
    });
  }

  if (refs.multiplyButton) {
    refs.multiplyButton.textContent = '+';
  }
  if (refs.divideButton) {
    refs.divideButton.textContent = '-';
  }
  if (refs.minButton) {
    refs.minButton.textContent = t('ui.common.min', {}, 'Min');
  }
  if (refs.maxButton) {
    refs.maxButton.textContent = t('ui.common.max', {}, 'Max');
  }
}

function initializeSolisUI() {
  if (solisUIInitialized) {
    return;
  }
  cacheSolisUIElements();
  hideSolisTab();
  initializeSolisControls();
  ensureSolisSections();
  solisUIInitialized = true;
}

function syncConditionalShopItem(key, enabled, container) {
  const record = shopElements[key];
  if (enabled) {
    if (!record && container) {
      container.appendChild(createShopItem(key));
    }
    return;
  }
  if (record) {
    record.item.remove();
    delete shopElements[key];
  }
}

function updateSolisDynamicShopItems(refs) {
  const solis1 = solisManager.isBooleanFlagSet('solisUpgrade1');
  const solis2 = solisManager.isBooleanFlagSet('solisUpgrade2');
  const terraformingUnlocked = solisManager.isBooleanFlagSet('solisTerraformingMeasurements');
  const androidsResearchUnlocked = solisManager.isBooleanFlagSet('solisAndroidsPermanentResearch');

  syncConditionalShopItem('research', solis1, refs.shopItems);
  syncConditionalShopItem('startingShips', solis2, refs.shopItems);
  syncConditionalShopItem('advancedOversight', solis1, refs.researchShopItems);
  syncConditionalShopItem('terraformingMeasurements', terraformingUnlocked, refs.researchShopItems);
  syncConditionalShopItem('androidsPermanentResearch', androidsResearchUnlocked, refs.researchShopItems);

  let automationVisible = 0;
  automationShopKeys.forEach(key => {
    const enabled = solisManager.isUpgradeEnabled(key);
    if (enabled) {
      automationVisible += 1;
    }
    syncConditionalShopItem(key, enabled, refs.automationShopItems);
  });
  if (refs.automationShop) {
    refs.automationShop.classList.toggle('hidden', automationVisible === 0);
  }
}

function updateSolisHeader(refs) {
  if (refs.pointsValue) {
    refs.pointsValue.textContent = formatSolisValue(solisManager.solisPoints, false, 2);
  }
  if (refs.rewardValue) {
    refs.rewardValue.textContent = formatSolisValue(solisManager.getCurrentReward(), false, 2);
  }
}

function updateSolisQuestArea(refs) {
  const quest = solisManager.currentQuest;
  if (refs.questMessage && refs.questDetail) {
    if (quest) {
      const quantity = formatSolisValue(quest.quantity, true, 2);
      refs.questDetail.textContent = '';
      refs.questDetail.append(document.createTextNode(`${getSolisUIText('deliverPrefix', {}, 'Deliver')} `));

      const quantitySpan = document.createElement('span');
      quantitySpan.classList.add('solis-quest-quantity');
      quantitySpan.textContent = quantity;
      refs.questDetail.appendChild(quantitySpan);

      refs.questDetail.append(document.createTextNode(` ${getSolisUIText('deliverUnitsOf', {}, 'units of')} `));

      const resourceSpan = document.createElement('span');
      resourceSpan.classList.add('solis-quest-resource');
      resourceSpan.textContent = quest.resource;
      refs.questDetail.appendChild(resourceSpan);

      refs.questMessage.classList.add('hidden');
      refs.questDetail.classList.remove('hidden');
    } else {
      refs.questMessage.textContent = getSolisUIText('noQuestAvailableNow', {}, 'No new quest available at this time.');
      refs.questMessage.classList.remove('hidden');
      refs.questDetail.classList.add('hidden');
    }
  }

  if (refs.completeButton) {
    refs.completeButton.disabled = !quest || resources.colony[quest.resource].value < quest.quantity;
  }

  const remainingRefresh = solisManager.refreshCooldownRemaining;
  const remainingQuest = solisManager.questCooldownRemaining;
  const remaining = Math.max(remainingRefresh, remainingQuest);
  if (refs.refreshButton) {
    if (remaining > 0) {
      refs.refreshButton.disabled = true;
      refs.refreshButton.textContent = getSolisUIText('refreshWithSeconds', { value: Math.ceil(remaining / 1000) }, `Refresh (${Math.ceil(remaining / 1000)}s)`);
    } else {
      refs.refreshButton.disabled = false;
      refs.refreshButton.textContent = t('ui.common.refresh', {}, 'Refresh');
    }
  }

  if (refs.cooldownContainer && refs.cooldownText && refs.cooldownBar) {
    if (!quest && remainingQuest > 0) {
      refs.cooldownContainer.classList.remove('hidden');
      const progress = Math.max(0, 1 - remainingQuest / solisManager.questInterval);
      refs.cooldownText.textContent = getSolisUIText('nextQuestIn', { value: Math.ceil(remainingQuest / 1000) }, `Next quest in ${Math.ceil(remainingQuest / 1000)}s`);
      refs.cooldownBar.style.width = `${progress * 100}%`;
    } else {
      refs.cooldownContainer.classList.add('hidden');
      refs.cooldownText.textContent = '';
      refs.cooldownBar.style.width = '0%';
    }
  }
}

function updateSolisDonationSection(refs) {
  const donationUnlocked = solisManager.isBooleanFlagSet('solisAlienArtifactUpgrade');
  if (refs.donationSection) {
    refs.donationSection.classList.toggle('hidden', !donationUnlocked);
  }
  if (refs.researchShop) {
    refs.researchShop.classList.toggle('hidden', !donationUnlocked);
  }

  if (refs.donationCount) {
    refs.donationCount.textContent = formatSolisValue(resources.special.alienArtifact.value, false, 2);
  }

  if (refs.donationLabel) {
    const pointsPerArtifact = 25;
    refs.donationLabel.textContent = getSolisUIText(
      'donationLabel',
      { value: formatSolisValue(pointsPerArtifact, false, 2) },
      `Donate artifacts for ${formatSolisValue(pointsPerArtifact, false, 2)} Solis points each`
    );
  }

  if (refs.donationInput) {
    if (document.activeElement !== refs.donationInput) {
      refs.donationInput.value = solisShopControls.donationAmount >= 1e6
        ? formatSolisValue(solisShopControls.donationAmount, true, 3)
        : String(solisShopControls.donationAmount);
    }
    refs.donationInput.dataset.donationAmount = String(solisShopControls.donationAmount);
  }
  if (refs.donationButton) {
    refs.donationButton.disabled = solisShopControls.donationAmount <= 0
      || solisShopControls.donationAmount > resources.special.alienArtifact.value;
  }
}

function updateSolisShopItems() {
  for (const key in shopElements) {
    const record = shopElements[key];
    const upgrade = solisManager.shopUpgrades[key];
    if (!record || !upgrade) {
      continue;
    }

    const atMax = Number.isFinite(upgrade.max) && upgrade.purchases >= upgrade.max;
    const multiplier = record.repeatable ? getSolisShopPurchaseMultiplier() : 1;
    const totalCost = record.repeatable
      ? solisManager.getUpgradeTotalCost(key, multiplier)
      : solisManager.getUpgradeCost(key);

    if (record.purchased && record.count) {
      if (atMax) {
        record.purchased.textContent = getSolisUIText('purchasedMaxed', {}, 'Purchased');
      } else {
        record.purchased.textContent = getSolisUIText('purchasedLabel', {}, 'Purchased: ');
        record.purchased.appendChild(record.count);
        record.count.textContent = upgrade.purchases;
      }
    }

    if (atMax) {
      if (record.button) {
        record.button.classList.add('hidden');
      }
      if (record.costWrapper) {
        record.costWrapper.classList.add('hidden');
      }
    } else {
      if (record.cost) {
        record.cost.textContent = record.repeatable
          ? formatSolisValue(totalCost, false, 0)
          : totalCost;
      }
      if (record.costWrapper) {
        record.costWrapper.classList.remove('hidden');
      }
      if (record.button) {
        record.button.classList.remove('hidden');
        record.button.textContent = record.repeatable
          ? getSolisUIText('buyWithMultiplier', { value: multiplier }, `Buy x${multiplier}`)
          : getSolisUIText('buyButton', {}, 'Buy');
        record.button.disabled = solisManager.solisPoints < totalCost;
      }
    }

    if (key === 'researchUpgrade' && record.listItems) {
      const purchases = solisManager.shopUpgrades.researchUpgrade.purchases;
      record.listItems.forEach((item, index) => {
        item.classList.toggle('solis-research-completed', index < purchases);
      });
    }
  }
}

function updateSolisUI() {
  if (!solisUIInitialized) {
    initializeSolisUI();
  }
  const refs = cacheSolisUIElements();
  ensureSolisSections();
  updateSolisDynamicShopItems(refs);
  updateSolisHeader(refs);
  updateSolisQuestArea(refs);
  updateSolisDonationSection(refs);
  updateSolisShopItems();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hideSolisTab, showSolisTab, updateSolisVisibility };
}
