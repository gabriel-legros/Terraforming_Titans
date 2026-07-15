const tabParameters = {
    tabs: [
      {
        id: "buildings-tab",
        label: t('ui.tabs.buildings', {}, 'Buildings'),
        isActive: false,
        isHidden: true
      },
      {
        id: "special-projects-tab",
        label: t('ui.tabs.specialProjects', {}, 'Special Projects'),
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "colonies-tab",
        label: t('ui.tabs.colony', {}, 'Colony'),
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "research-tab",
        label: t('ui.tabs.research', {}, 'Research'),
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "terraforming-tab",
        label: t('ui.tabs.terraforming', {}, 'Terraforming'),
        isActive: false,
        isHidden: false // Visible by default
      },
      {
        id: "space-tab",
        label: t('ui.tabs.space', {}, 'Space'),
        isActive: false, // Not active when unlocked initially
        isHidden: true   // Start hidden
      },
      {
        id: "hope-tab",
        label: t('ui.tabs.hope', {}, 'H.O.P.E.'),
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "settings-tab",
        label: t('ui.tabs.settingsShort', {}, 'Settings'),
        isActive: false,
        isHidden: false // Always visible
      }
    ]
  };

  class TabManager extends EffectableEntity {
    constructor(config, tabParams) {
      super(config);
      this.tabs = {}; // Object to store tab elements by their ID
      this.activeTabId = null;
      this.loadTabs(tabParams); // Initialize tabs from parameters
    }

    // Reset visibility of all managed tabs according to provided parameters
    resetVisibility(tabParams) {
      // Clear active and hidden classes from every tab
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.classList.remove('hidden');
      });

      // Apply default hidden state from parameters
      tabParams.tabs.forEach(tabConfig => {
        const tab = this.tabs[tabConfig.id];
        if (tab) {
          if (tabConfig.isHidden || isCurrentWorldTabDisabled(tabConfig.id)) {
            tab.classList.add('hidden');
          } else {
            tab.classList.remove('hidden');
          }
        }
      });
    }
  
    // Method to load tabs from the provided tab parameters
    loadTabs(tabParams) {
      tabParams.tabs.forEach(tabConfig => {
        this.addTab(tabConfig.id);
        if (tabConfig.isHidden) {
          this.hide(tabConfig.id); // Hide tabs that are initially hidden
        }
        if (tabConfig.isActive) {
          this.activateTab(tabConfig.id); // Activate the tab if it's active
        }
      });
    }
  
    // Add a tab to manage
    addTab(tabId) {
      const tabElement = document.getElementById(tabId);
      if (tabElement) {
        this.tabs[tabId] = tabElement;
        this.bindTabClick(tabElement);
      } else {
        console.error(`Tab with ID "${tabId}" not found.`);
      }
    }

    bindTabClick(tabElement) {
      if (tabElement.dataset.tabClickBound === '1') {
        return;
      }
      tabElement.dataset.tabClickBound = '1';
      tabElement.addEventListener('click', () => {
        const tabId = tabElement.dataset.tab;
        if (tabElement.classList.contains('hidden')) {
          console.log(`Tab ${tabId} is hidden, cannot activate.`);
          return;
        }
        this.activateTab(tabId);
      });
    }
  
    // Enable a tab by removing the hidden class
    enable(tabId) {
      const managedTabId = this.tabs[tabId]
        ? tabId
        : document.querySelector(`[data-tab="${tabId}"]`)?.id;
      if (managedTabId && this.tabs[managedTabId]) {
        if (isCurrentWorldTabDisabled(tabId)) {
          this.hide(managedTabId);
          return;
        }
        this.tabs[managedTabId].classList.remove('hidden');
        console.log(`Tab "${tabId}" unlocked.`);
      } else {
        console.error(`Tab "${tabId}" not managed by TabManager.`);
      }
    }

    enableContent(tabContentId) {
        let tabContent = document.getElementById(tabContentId);
        if(tabContent){
            tabContent.classList.remove('hidden');
            tabContent.classList.remove('invisible');
        }
    }
  
    // Hide a tab by adding the hidden class
    hide(tabId) {
      if (this.tabs[tabId]) {
        this.tabs[tabId].classList.add('hidden');
      }
    }
  
    // Activate a tab
    activateTab(tabId) {
      const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
      const tabContentElement = document.getElementById(tabId);

      if (!tabElement) {
        console.error(`Tab button with data-tab="${tabId}" not found.`);
        return;
      }
      if (isCurrentWorldTabDisabled(tabId)) {
        tabElement.classList.add('hidden');
        this.activateTab('settings');
        return;
      }
      if (tabElement.classList.contains('hidden')) {
        console.log(`Tab ${tabId} is hidden, cannot activate.`);
        this.activateTab('settings');
        return;
      }
      if (tabContentElement) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

        tabElement.classList.add('active');
        tabContentElement.classList.add('active');
        this.activeTabId = tabId;
      } else {
        console.error(`Tab content with id "${tabId}" not found.`);
      }
      notifyTabActivated(tabId);
      if (tabId === 'terraforming') {
        try { window.handleTerraformingTabActivated(); } catch (e) {}
      }
      if (tabId === 'buildings') {
        markBuildingsViewed();
      }
      if (tabId === 'colonies') {
        markColoniesViewed();
      }
      if (tabId === 'special-projects') {
        markProjectsViewed();
      }
      if (tabId === 'research') {
        markResearchViewed();
      }
      if (tabId === 'terraforming') {
        markTerraformingMilestonesIfActive?.();
      }
      if (tabId === 'space') {
        markSpaceTabAlertViewed();
      }
    }

    getActiveTabId() {
      return this.activeTabId;
    }

    setSpaceTabAlert(effect) {
      const research = researchManager.getResearchById(effect.sourceId);
      const alreadyAlerted = research.alertedSpaceTab === true;
      if (alreadyAlerted) {
        return;
      }
      research.alertedSpaceTab = true;
      setSpaceTabUnlockAlert(effect);
    }
  }

function extractTabId(tabString) {
  const tabSuffix = '-tab';
  const suffixIndex = tabString.indexOf(tabSuffix);
  
  if (suffixIndex !== -1) {
    return tabString.substring(0, suffixIndex);
  }
  
  return tabString;
}

function activateTab(tabId) {
  if (tabManager && typeof tabManager.activateTab === 'function') {
    tabManager.activateTab(tabId);
  }
}
