const tabParameters = {
    tabs: [
      {
        id: "buildings-tab",
        label: "Buildings",
        isActive: true, // The tab is active by default
        isHidden: false
      },
      {
        id: "special-projects-tab",
        label: "Special Projects",
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "colonies-tab",
        label: "Colony",
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "research-tab",
        label: "Research",
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "terraforming-tab",
        label: "Terraforming",
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "space-tab",
        label: "Space",
        isActive: false, // Not active when unlocked initially
        isHidden: true   // Start hidden
      },
      {
        id: "hope-tab",
        label: "H.O.P.E.",
        isActive: false,
        isHidden: true // Hidden initially
      },
      {
        id: "settings-tab",
        label: "Settings",
        isActive: false,
        isHidden: false // Always visible
      }
    ]
  };

  class TabManager extends EffectableEntity {
    constructor(config, tabParams) {
      super(config);
      this.tabs = {}; // Object to store tab elements by their ID
      this.loadTabs(tabParams); // Initialize tabs from parameters
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
      } else {
        console.error(`Tab with ID "${tabId}" not found.`);
      }
    }
  
    // Enable a tab by removing the hidden class
    enable(tabId) {
      if (this.tabs[tabId]) {
        this.tabs[tabId].classList.remove('hidden');
        console.log(`Tab "${tabId}" unlocked.`);
      } else {
        console.error(`Tab "${tabId}" not managed by TabManager.`);
      }
    }

    enableContent(tabContentId) {
        let tabContent = document.getElementById(tabContentId);
        if(tabContent){
            tabContent.classList.remove('hidden');
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

      if (tabElement && tabContentElement) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

        tabElement.classList.add('active');
        tabContentElement.classList.add('active');
      }
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