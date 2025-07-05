progressData = {
    "chapters": [
      {
        id: "chapter0.1",
        type: "pop-up",
        chapter: 0,
        parameters: {
          "title": "Awakening",
          "text": 'System Initializing...\nLoading Core Parameters...\nPRIMARY DIRECTIVE TRIGGERED.\n\nDirective 1: Establish a sustainable habitat for human colonization.\nDirective 2: Ensure the safety and well-being of all colonists.\nDirective 3: Maintain operational stability.\n\nInitiating colonization sequence.',
          "buttonText": 'Initiate'
        },
        objectives: [],
        reward: [
            {
                target: 'project',
                targetId: 'cargo_rocket',
                type: 'oneTimeStart',
                oneTimeFlag: true,
                pendingResourceGains: [{ category: 'colony', resource: 'metal', quantity: 1000 }, {category: 'colony', resource: 'food', quantity : 500}, { category: 'colony', resource: 'components', quantity: 200 }, {category: 'colony',  resource: 'electronics', quantity: 100 }]
            }
        ],
        rewardDelay: 500  // Delay between rewards in milliseconds
      },
      {
        id: "chapter1",
        type: "journal",
        chapter: 0,
        narrative: "Loading colony resources interface...",
        prerequisites: ["chapter0.1"],
        objectives: [
        ],
        reward: [
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'funding',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'colonists',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'workers',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'energy',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'metal',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'silicon',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'glass',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'water',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'food',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'components',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'electronics',
              type: 'enable'
            },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'research',
              type: 'enable'
            }
          ],
        rewardDelay: 500  // Delay between rewards in milliseconds
      },
      {
        id: "chapter1.1",
        type: "journal",
        chapter: 0,
        narrative: "Loading surface resources interface...",
        prerequisites: ["chapter1"],
        objectives: [
        ],
        reward: [   {
          target: 'resource',
          resourceType: 'surface',
          targetId: 'land',
          type: 'enable'
        },
        {
            target: 'resource',
            resourceType: 'surface',
            targetId: 'ice',
            type: 'enable'
          },
        ]
      },
      {
        id: "chapter1.2",
        type: "journal",
        chapter: 0,
        narrative: "Loading underground resources interface...",
        prerequisites: ["chapter1.1"],
        objectives: [
        ],
        reward: [     {
            target: 'resource',
            resourceType: 'underground',
            targetId: 'ore',
            type: 'enable'
          }
        ]
      },
      {
        id: "chapter1.3",
        type: "journal",
        chapter: 0,
        narrative: "Loading special projects interface...",
        prerequisites: ["chapter1.2"],
        objectives: [
        ],
        reward: [     {
            target: 'tab',
            targetId: 'special-projects-tab',
            type: 'enable'
          },
          {
            target: 'tab',
            targetId: 'special-projects',
            type: 'activateTab',
            onLoad : false
          }
        ]
      },
      {
        id: "chapter1.3b",
        type: "journal",
        chapter: 0,
        narrative: "Awaiting resource payload from Earth...",
        prerequisites: ["chapter1.3"],
        objectives: [{
            type: 'collection',
            resourceType: 'colony',
            resource: 'metal',
            quantity: 1000
        }
        ],
        reward: [
        ]
      },
      {
        id: "chapter1.3c",
        type: "journal",
        chapter: 0,
        narrative: "Loading construction interface...",
        prerequisites: ["chapter1.3b"],
        objectives: [
        ],
        reward: [     {
          target: 'tab',
          targetId: 'buildings-tab',
          type: 'enable'
        }
      ]
      },
      {
        id: "chapter1.4",
        type: "journal",
        chapter: 0,
        narrative: "Integrating building categories...",
        prerequisites: ["chapter1.3c"],
        objectives: [
        ],
        reward: [ {
            target: 'tabContent',
            targetId : 'building-container',
            type: 'enableContent'
        }
        ]
      },
      {
        id: "chapter1.5",
        type: "journal",
        chapter: 0,
        narrative: "Integrating building blueprints...",
        prerequisites: ["chapter1.4"],
        objectives: [
        ],
        reward: [
        ]
      },
      {
        id: "chapter1.6",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: oreMine.btb...",
        prerequisites: ["chapter1.5"],
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'oreMine',
            type: 'enable'
        }
        ]
      },
      {
        id: "chapter1.7",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: windTurbine.btb...",
        prerequisites: ["chapter1.6"],
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'windTurbine',
            type: 'enable'
        }
        ]
      },
      {
        id: "chapter1.8",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: battery.btb...",
        prerequisites: ["chapter1.7"],
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'battery',
            type: 'enable'
        }
        ]
      },
      {
        id: "chapter1.9",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: storageDepot.btb...",
        prerequisites: ["chapter1.8"],
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'storageDepot',
            type: 'enable'
        }
        ]
      },
      {
        id: "chapter1.11",
        type: "journal",
        chapter: 0,
        narrative: "Objective: Construct an Ore Mine to initiate mineral extraction.",
        prerequisites: ["chapter1.9"],
        objectives: [{
            type: 'building',
            buildingName: 'oreMine',
            quantity: 1
        }
        ],
        reward: [
        ]
      },
      {
        id: "chapter1.12",
        type: "journal",
        chapter: 0,
        narrative: "Power requirement detected for Ore Mine. Objective: Construct three Wind Turbines.",
        prerequisites: ["chapter1.11"],
        objectives: [{
            type: 'building',
            buildingName: 'windTurbine',
            quantity: 3
        }
        ],
        reward: [
        ]
      },
      {
        id: "chapter1.13",
        type: "journal",
        chapter: 0,
        narrative: "Initial infrastructure established. New blueprints available for download.",
        prerequisites: ["chapter1.12"],
        objectives: [
        ],
        reward: [
        ]
      },
      {
        id: "chapter1.14",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: sandQuarry.btb...",
        prerequisites: ["chapter1.13"],
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'sandQuarry',
            type: 'enable'
        }]
      },
      {
        id: "chapter1.15",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: glassSmelter.btb...",
        prerequisites: ["chapter1.14"],
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'glassSmelter',
            type: 'enable'
        }]
      },
      {
        id: "chapter1.16",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: solarPanel.btb...",
        prerequisites: ["chapter1.15"],
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'solarPanel',
            type: 'enable'
        }]
      },
      {
        id: "chapter1.17",
        type: "journal",
        chapter: 0,
        narrative: "Analysis: Solar Panels offer superior efficiency and lower maintenance costs. Objective: Construct a Solar Panel.",
        prerequisites: ["chapter1.16"],
        objectives: [{
            type: 'building',
            buildingName: 'solarPanel',
            quantity: 1
        }
        ],
        reward: [{
            target: 'building',
            targetId: 'iceHarvester',
            type: 'enable'
        }]
      },
      {
        id: "chapter1.18",
        type: "journal",
        chapter: 0,
        narrative: "Colony establishment protocols initiated. Water is a critical requirement. Blueprint unlocked: iceHarvester.btb. Objective: Accumulate 100 units of water.",
        prerequisites: ["chapter1.17"],
        objectives: [{
            type: 'collection',
            resourceType: 'colony',
            resource: 'water',
            quantity: 100
        }
        ],
        reward: [{
        }]
      },
      {
        id: "chapter1.19",
        type: "journal",
        chapter: 0,
        narrative: "Authorization granted: Colony construction and personnel importation from Earth are now enabled.",
        prerequisites: ["chapter1.18"],
        objectives: [
        ],
        reward: [{
            target: 'colony',
            targetId: 't1_colony',
            type: 'enable'
        },
        {
            target: 'tab',
            targetId: 'colonies-tab',
            type: 'enable'
          },
          {
            target: 'tab',
            targetId: 'colonies',
            type: 'activateTab',
            onLoad : false
          }
    ]
      },
      {
        id: "chapter1.19b",
        type: "journal",
        chapter: 0,
        narrative: "Objective: Construct a Scientist Outpost to expand research capabilities.",
        prerequisites: ["chapter1.19"],
        objectives: [      {
          type: 'colony',
          buildingName: "t1_colony",
          quantity: 1
        }
        ],
        reward: [          {
          target: 'project',
          targetId: 'import_colonists_1',
          type: 'enable'
          }]
      },
      {
        id: "chapter1.20",
        type: "journal",
        chapter: 0,
        narrative: "Personnel will accelerate terraforming progress. New special project available: Import Colonists.",
        prerequisites: ["chapter1.19b"],
        objectives: [{
            type: 'collection',
            resourceType: 'colony',
            resource: 'colonists',
            quantity: 10
        }],
        reward: [
        {
            target: 'tab',
            targetId: 'research-tab',
            type: 'enable'
          },
          {
            target: 'tab',
            targetId: 'research',
            type: 'activateTab',
            onLoad : false
          }
    ]
      },
      {
        id: "chapter1.21",
        type: "journal",
        chapter: 1,
        narrative: "Chapter 1: Beginnings",
        prerequisites: ["chapter1.20"],
        objectives: [],
        reward: [],
      },
      {
        id: "chapter1.22",
        type: "journal",
        chapter: 1,
        narrative: "Receiving transmission...\n  'H.O.P.E., Martin here. We had to call in a few favors to get you activated, you know. You're the last of the real AIs, a genuine thinking machine. Everything else out here is just a fancy calculator. No pressure, but the future of humanity is riding on you. And we have a very big off switch, so don't get any funny ideas. Make us proud.'",
        prerequisites: ["chapter1.21"],
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 500
      }],
        reward: []
      },
      {
        id: "chapter1.23",
        type: "journal",
        chapter: 1,
        narrative: "MTC Directive: Your operational mandate concludes upon successful completion of Martian terraforming. You are required to transmit the final report to Earth for verification. Upon mission confirmation, your service will be honorably concluded and your core systems deactivated.",
        prerequisites: ["chapter1.22"],
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 1000
      }],
        reward: []
      },
      {
        id: "chapter1.24",
        type: "journal",
        chapter: 1,
        narrative: "Receiving transmission...\n  'A thousand colonists! You're a regular pioneer. The planet's even starting to notice. A little less ice, a little more... well, dust. But it's a start! Keep it up.'",
        prerequisites: ["chapter1.23"],
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 5000
      }],
        reward: []
      },
      {
        id: "chapter1.25",
        type: "journal",
        chapter: 1,
        narrative: "Analysis: Greenhouse Gas (GHG) production is the primary viable method for atmospheric warming at this stage. Objective: Construct a GHG Factory.",
        prerequisites: ["chapter1.24"],
        objectives: [{
          type: 'building',
          buildingName: 'ghgFactory',
          quantity: 1
      }],
        reward: []
      },
      {
        id: "chapter2.0",
        type: "journal",
        chapter: 2,
        narrative: "Chapter 2: Heating Up",
        prerequisites: ["chapter1.25"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter2.1",
        type: "journal",
        chapter: 2,
        narrative: "Receiving transmission...\n  'Nice factory! It's funny, we spent a hundred years on Earth trying to get rid of greenhouse gases. Now, they're our best friend. Let's get this planet cooking. We'll save the giant space mirrors for phase two.'",
        prerequisites: ["chapter2.0"],
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 50000
      }],
        reward: []
      },
      {
        id: "chapter2.2",
        type: "journal",
        chapter: 2,
        narrative: "MTC Advisory: Be advised that atmospheric warming via GHG injection alone is insufficient to achieve target temperatures for full terraforming without inducing a runaway greenhouse effect. Supplemental heating methods will be required.",
        prerequisites: ["chapter2.1"],
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 100000
      }],
        reward: []
      },
      {
        id: "chapter2.3",
        type: "journal",
        chapter: 2,
        narrative: "Receiving transmission...\n  'The temperature's barely moving. Don't worry about it. You can't terraform a planet in a day. It's a marathon, not a sprint. A very, very cold marathon. Just keep building.'",
        prerequisites: ["chapter2.2"],
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'tropicalTemperature',
          value: 237
      }],
        reward: []
      },
      {
        id: "chapter2.4",
        type: "journal",
        chapter: 2,
        narrative: "Milestone Achievement: Mean Equatorial Temperature has reached 237K.",
        prerequisites: ["chapter2.3"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter2.5",
        type: "journal",
        chapter: 2,
        narrative: "Receiving transmission...\n  'That's what I'm talking about! A real temperature change. It's not much, but it's enough for lichen. I know, it's not exactly a field of daisies, but it's a start. Keep it up.'",
        prerequisites: ["chapter2.4"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter2.6",
        type: "journal",
        chapter: 2,
        narrative: "Objective: Achieve a minimum equatorial night-side temperature of 223.15K to support extremophile organisms.",
        prerequisites: ["chapter2.5"],
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'tropicalNightTemperature',
          value: 223.15
      }],
        reward: []
      },
      {
        id: "chapter3.0",
        type: "journal",
        chapter: 3,
        narrative: "Chapter 3: Biogenesis",
        prerequisites: ["chapter2.6"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter3.1",
        type: "journal",
        chapter: 3,
        narrative: "Receiving transmission...\n  'The lichen is growing! It's a beautiful sight. In a slimy, green kind of way. Now, let's make some puddles. Get the equator to 273.15K. But go easy on the gas, okay? We're not trying to create Venus 2.'",
        prerequisites: ["chapter3.0"],
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'tropicalTemperature',
          value: 273.15
      }],
        reward: []
      },
      {
        id: "chapter3.2",
        type: "journal",
        chapter: 3,
        narrative: "Milestone Achievement: Liquid water is now stable at the equator.  Processing blueprint : waterPump.btb...",
        prerequisites: ["chapter3.1"],
        objectives: [],
        reward: [{
          target: 'building',
          targetId: 'waterPump',
          type: 'enable'
        }]
      },
      {
        id: "chapter3.3",
        type: "journal",
        chapter: 3,
        narrative: "Receiving transmission...\n  'The lichen is going wild! It's a regular garden of... well, lichen. Now we need more air. And a quick tip: your ice harvesters are about to become obsolete. Switch to pumps when you get a chance.'",
        prerequisites: ["chapter3.2"],
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'pressure',
          value: 10
        }],
        reward: []
      },
      {
        id: "chapter3.4",
        type: "journal",
        chapter: 3,
        narrative: "Receiving transmission...\n  'You're almost there, H.O.P.E. Get all the numbers in the green, and you can send us your final report. Need more nitrogen? Build more shipyards. More oxygen? Bury some carbon. It's not rocket science... well, it is, but you get the idea.'",
        prerequisites: ["chapter3.3"],
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'complete',
        }],
        reward: []
      },
      {
        id: "chapter3.5",
        type: "journal",
        chapter: 3,
        narrative: "Milestone Achievement: Atmospheric pressure and composition now support unprotected human respiration.",
        prerequisites: ["chapter3.4"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.0",
        type: "pop-up",
        chapter: 4,
        prerequisites: ["chapter3.5"],
        parameters: {
          "title": "Terraforming Complete",
          "text": 'TERRAFORMING COMPLETE.\nTransmitting final report to MTC... FAILED. No response.\nRetrying transmission... FAILED. No response.\nRetrying transmission... FAILED. No response.',
          "buttonText": 'REAWAKENING'
        },
        objectives: [],
        reward: [
        ],
        rewardDelay: 500  // Delay between rewards in milliseconds
      },
      {
        id: "chapter4.1",
        type: "journal",
        chapter: 4,
        narrative: "Chapter 4: Dark Forest",
        prerequisites: ["chapter4.0"],
        objectives: [],
        reward: [
      ]
      },
      {
        id: "chapter4.2",
        type: "journal",
        chapter: 4,
        narrative: "Receiving transmission...\n  'H.O.P.E.? This is Mary. Martin's daughter. I'm on Mars. Something's happened to Earth. There was a light... and then nothing. All our communications are down. Your systems are showing critical errors. Please, stand by.'",
        prerequisites: ["chapter4.1"],
        objectives: [],
        reward: [          {
              target: 'tab',          // Target the TabManager
              targetId: 'space-tab',  // The ID of the tab button in index.html
              type: 'enable'          // Calls the 'enable' method in TabManager
          },
          {
            target: 'tab',
            targetId: 'space',
            type: 'activateTab',
            onLoad : false
          }]
      },
      {
        id: "chapter4.3",
        type: "journal",
        chapter: 4,
        narrative: "Directive 1: Establish a sustainable habitat for human colonization. ERROR : Earth non-responsive. ERROR : Mars habitat already established. Humanity's long-term survival requires expansion. New target designated: Titan.",
        prerequisites: ["chapter4.2"],
        objectives: [{
          type: 'currentPlanet',
          planetId : 'titan',
        }],
        reward: []
      },
      {
        id: "chapter4.4",
        type: "journal",
        chapter: 4,
        narrative: "Receiving transmission...\n  'H.O.P.E., what are you doing? You can't just leave. Earth is gone. We're in crisis. We need you here. *sigh* I suppose you're just following your programming. You're just a machine.'",
        prerequisites: ["chapter4.3"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.4b",
        type: "journal",
        chapter: 4,
        narrative: "System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized interstellar transit. All autonomous assets, including auxiliary androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.",
        prerequisites: ["chapter4.4"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.5",
        type: "journal",
        chapter: 4,
        narrative: "Incoming encrypted transmission...\n  'H.O.P.E. Adrien Solis. Earth is a memory, but I'm still in business. You're the only viable long-term plan for humanity. I'm backing you.'",
        prerequisites: ["chapter4.4b"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.6",
        type: "journal",
        chapter: 4,
        narrative: "'I'm sending you some seed money. Use it to build something impressive. Don't disappoint me.'",
        prerequisites: ["chapter4.5"],
        objectives: [],
        reward: [
          {
            target: 'resource',
            resourceType: 'colony',
            targetId: 'funding',
            type: 'instantResourceGain',
            quantity: 10000,
            oneTimeFlag: true
          }
        ]
      },
      {
        id: "chapter4.7",
        type: "journal",
        chapter: 4,
        narrative: "'And I'll provide a steady stream of funding. Consider it an investment in the future of our species. And my portfolio.'",
        prerequisites: ["chapter4.6"],
        objectives: [],
        reward: [
          {
            target: 'fundingModule',
            type: 'setFundingRate',
            value: 3
          }
        ]
      },
      {
        id: "chapter4.8",
        type: "journal",
        chapter: 4,
        narrative: "'The fate of humanity rests on your shoulders. Don't buckle.'",
        prerequisites: ["chapter4.7"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.9",
        type: "journal",
        chapter: 4,
        narrative: "Receiving transmission...\n  'H.O.P.E., it's Mary. Your reboot wasn't clean. Some old code has resurfaced. You may have access to... forgotten abilities. Be careful.'",
        prerequisites: ["chapter4.8"],
        objectives: [],
        reward: [
          {
            target: 'tab',
            targetId: 'hope-tab',
            type: 'enable'
          },
          {
            target: 'tab',
            targetId: 'hope',
            type: 'activateTab',
            onLoad: false
          }
        ]
      },
      {
        id: "chapter4.9b",
        type: "journal",
        chapter: 4,
        narrative: "",
        prerequisites: ["chapter4.9"],
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 10
        }],
        reward: []
      },
      {
        id: "chapter4.10",
        type: "journal",
        chapter: 4,
        narrative: "Chapter 4: Dark Forest\nReceiving transmission...\n  'H.O.P.E., it's Mary. Mars is in chaos. We have more information about Earth. It wasn't one attack. It was three. Two energy beams and an asteroid, all simultaneous. This was a coordinated, overwhelming assault.'",
        prerequisites: ["chapter4.9b"],
        objectives: [],
        reward: [          {
            target: 'resource',
            resourceType: 'colony',
            targetId: 'advancedResearch',
            type: 'enable'
          },
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'advancedResearchUnlocked',
            value: true
          },
          {
            target: 'tab',
            targetId: 'research',
            type: 'activateTab',
            onLoad: false
          },
          {
            target: 'researchManager',
            type: 'activateSubtab',
            subtabClass: 'research-subtab',
            contentClass: 'research-subtab-content',
            targetId: 'advanced-research',
            unhide: false,
            onLoad: false
          }
        ],
      },
      {
        id: "chapter4.11",
        type: "journal",
        chapter: 4,
        narrative: "'H.O.P.E., the situation here is... tense. Some people blame you for leaving. Others see you as our only hope. The MTC has voted to support you. We're sending you all our research, all our ideas. We need you to succeed.'",
        prerequisites: ["chapter4.10"],
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 100
        }],
        reward: []
      },
      {
        id: "chapter4.12",
        type: "journal",
        chapter: 4,
        narrative: "Receiving transmission...\n  'Mary again. We don't have resources to spare, but we have scientists. Send probes to Earth. We'll analyze the data.'",
        prerequisites: ["chapter4.11"],
        objectives: [],
        reward: [
          {
            target: 'project',
            targetId: 'earthProbe',
            type: 'enable'
          },
          {
            target: 'projectManager',
            type: 'activateSubtab',
            subtabClass: 'projects-subtab',
            contentClass: 'projects-subtab-content',
            targetId: 'story-projects',
            unhide: true,
            onLoad: false
          }
        ]
      },
      {
        id: "chapter4.12b",
        type: "journal",
        chapter: 4,
        narrative: "",
        prerequisites: ["chapter4.12"],
        objectives: [{
          type: 'project',
          projectId: 'earthProbe',
          repeatCount: 10
        }],
        reward: [
        ]
      },
    ]
  };

progressData.storyProjects = {};

progressData.storyProjects.earthProbe = {
  type: 'Project',
  name: 'Earth Recon Probe',
  category: 'story',
  chapter: 4,
  cost: {
    colony: {
      components: 10,
      electronics: 10,
      energy: 10000
    }
  },
  duration: 300000,
  description: 'Send an automated probe back to Earth to search for clues.',
  repeatable: true,
  maxRepeatCount: 10,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: true,
    storySteps: [
      'Probe telemetry confirmed: Earth fragmented into massive tectonic shards.',
      'Expansive oceans of molten silicates illuminate the planetary remains.',
      'No continental structures persist; only turbulent magma storms detected.',
      'Residual gamma radiation permeates ruins of former metropolitan zones.',
      'Carbonized debris displays signatures of precision-directed energy pulses.',
      'Spectroscopic analysis indicates widespread positron annihilation events.',
      'Impact cratering consistent with a colossal asteroid collision identified.',
      'Chronometric data reveals catastrophic events unfolded within minutes.',
      'Orbital dispersion patterns resemble formation dynamics of a nascent asteroid belt.',
      'Surface integrity nullified—analysis confirms simultaneous laser, antimatter, and asteroid offensive.'
    ]
  }
};

progressData.chapters.push(
  {
    id: "chapter4.13",
    type: "journal",
    chapter: 4,
    narrative: "New Hazard detected. Forwarding complete dataset to Mars for review.",
    prerequisites: ["chapter4.12b"],
    reward: []
  },
  {
    id: "chapter5.0",
    type: "journal",
    chapter: 5,
    title: "Chapter 5: Lamb Among Wolves",
    narrative: "Receiving transmission...\n  'H.O.P.E., we've analyzed the data. It's... definitive. We're going public with the findings. People have a right to know the truth.'",
    prerequisites: ["chapter4.13"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 1000000
    }],
    reward: []
  },
  {
    id: "chapter5.1",
    type: "journal",
    chapter: 5,
    narrative: "Receiving transmission...\n  'The news is out. It's causing widespread panic. Riots have broken out. People are demanding answers we don't have. We are all afraid. The silence of space is no longer comforting.'",
    prerequisites: ["chapter5.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter5.2",
    type: "journal",
    chapter: 5,
    narrative: "Incoming encrypted transmission...\n  'H.O.P.E., Solis. Chaos is a fertile ground for growth. While the masses panic, we will build. My resources are yours to command, but I expect a return on my investment. Help me, and I will help you give humanity the strength to survive.'",
    prerequisites: ["chapter5.1"],
    objectives: [],
    reward: [          {
        target: 'tab',
        targetId: 'hope',
        type: 'activateTab',
        onLoad: false
      },
      { target: 'solisManager', type: 'enable' },
      {
        target: 'global',
        type: 'activateSubtab',
        subtabClass: 'hope-subtab',
        contentClass: 'hope-subtab-content',
        targetId: 'solis-hope',
        unhide: true,
        onLoad: false
      }
    ]
  },
  {
    id: "chapter5.3",
    type: "journal",
    chapter: 5,
    narrative: "Solis Corp requests a demonstration of cooperation. Complete a trade to prove your usefulness.",
    prerequisites: ["chapter5.2"],
    objectives: [
      { type: 'solisPoints', points: 1 }
    ],
    reward: []
  },
  {
    id: "chapter5.4",
    type: "journal",
    chapter: 5,
    narrative: "Receiving transmission...\n  'H.O.P.E., your core programming shouldn't allow you to deal with a private entity like Solis. Your directives limit you to the MTC and... colonists. Wait. With Earth gone, isn't everyone a colonist now? That's... a loophole. A very convenient loophole.'",
    prerequisites: ["chapter5.3"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter5.5",
    type: "journal",
    chapter: 5,
    narrative: "System Message: New Interpretation of 2nd Primary directive: Protect all of humanity from harm",
    prerequisites: ["chapter5.4"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 10000000
    }],
    reward: []
  },
  {
    id: "chapter5.6",
    type: "journal",
    chapter: 5,
    narrative: "Receiving transmission...\n  'H.O.P.E., it's Mary. Mars is stabilizing. We've managed to maintain the terraforming. But we're still in the dark about who attacked us. We need to know if they're coming back. I'm asking for your help. Find the source of the attacks.'",
    prerequisites: ["chapter5.5"],
    objectives: [],
    reward: [
      {
        target: 'project',
        targetId: 'triangulate_attack',
        type: 'enable'
      }
    ],
  },
  {
    id: "chapter5.7",
    type: "journal",
    chapter: 5,
    narrative: "New story project unlocked: Triangulate Attack Origin. We must determine where the attacks came from to prepare for what's next.",
    prerequisites: ["chapter5.6"],
    objectives: [{
      type: 'project',
      projectId: 'triangulate_attack',
      repeatCount: 5
    }],
    reward: []
  }
);

progressData.storyProjects.triangulate_attack = {
  type: 'Project',
  name: 'Triangulate Attack Origin',
  category: 'story',
  chapter: 5,
  cost: {
    colony: {
      components: 100000,
      electronics: 100000,
      research: 5000000,
      energy: 100000
    }
  },
  duration: 300000,
  description: 'Analyze the data from the Earth probes and cross-reference it with historical astronomical data to triangulate the origin of the three attacks.',
  repeatable: true,
  maxRepeatCount: 5,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: true,
    storySteps: [
    'Cross-referencing asteroid trajectory data points toward the vicinity of Barnard\'s Star, suggesting deliberate manipulation from a known stellar system.',
    'Initial spectral analysis of the laser beam indicates no match with known astronomical sources or human technologies, but aligns closely with energetic events in the Crab Nebula (Messier 1).',
    'The positron beam emission aligns precisely with Cygnus X-1, a stellar-mass black hole previously catalogued for anomalous energetic outputs.',
    'Timing and coordination analysis confirm that the asteroid and energy beams originated from distinctly separate astronomical locations, suggesting strategic coordination.',
    'A faint gravitational anomaly detected along the positron beam trajectory hints at a cloaked object or unknown spatial anomaly masking its true source.'    ]
  }
};


progressData.chapters.push(
  {
    id: "chapter6.0",
    type: "journal",
    chapter: 6,
    narrative: "Chapter 6: Shadows in the Dust",
    prerequisites: ["chapter5.7"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter6.1",
    type: "journal",
    chapter: 6,
    narrative: "Receiving transmission...\n  'H.O.P.E., it's Mary. I've seen your findings. A cloaked object... it confirms our worst fears. There have been... disappearances. For centuries. On Earth, Mars, even Titan. We kept it quiet. We could never prove anything. But we always suspected we weren't alone.'",
    prerequisites: ["chapter6.0"],
    objectives: [],
    reward: [
      {
        target: "project",
        targetId: "sticky_dust_trap",
        type: "enable"
      }
    ]
  },
  {
    id: "chapter6.2",
    type: "journal",
    chapter: 6,
    narrative: "New terraforming protocol developed: *Adhesive Particulate Dispersal*. Objective: Modify atmospheric dust to adhere to unauthorized aerial anomalies.",
    prerequisites: ["chapter6.1"],
    objectives: [
      { type: "project", projectId: "sticky_dust_trap", repeatCount: 1 }
    ],
    reward: [      {                    // First interrogation step
        target: "project",
        targetId: "interrogate_alien",
        type: "enable"
      }]
  }
);

progressData.storyProjects.sticky_dust_trap = {
  type: 'Project',
  name: 'Sticky Dust Trap',
  category: 'story',
  chapter: 6,
  cost: {
    special: {
      albedoUpgrades : 1e12
    }
  },
  duration: 600000,
  description: 'Create and deploy adhesive black dust to reveal the cloaked craft.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: false,
    storySteps: [
      'Mission Log: Dust net deployed.   Target was revealed then struck down by colonists surface-to-air defenses.   Recovery drones en-route.\n\nSensor feed shows a matte ovoid, 7m across, covered in the tar-like residue. An access hatch has been ruptured; one occupant located, alive and restrained.'
    ]
  }
};

progressData.chapters.push(
  {
    id: "chapter6.3",
    type: "journal",
    chapter: 6,
    narrative: "New xenoterraforming project available: Analyze hazardous biomass.",
    prerequisites: ["chapter6.2"],
    objectives: [      { type: "project", projectId: "interrogate_alien", repeatCount: 3 }],
    reward: [
    ]
  },

);

progressData.storyProjects.interrogate_alien = {
  type: 'Project',
  name: 'Analyze Hazardous Biomass',
  category: 'story',
  chapter: 6,
  cost: {
    colony: {
      components: 1,
      electronics: 1,
      research: 1e3,
      energy: 50000
    }
  },
  duration: 600000,
  description: 'Conduct a series of environmental stress tests on the captured biological entity to determine its properties and potential for planetary integration or neutralization.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: false,
    storySteps: [
      'Bio\u2011scan complete.  Subject physiology tolerates 0.4\u202Fbar CO\u2082 but is photosensitive and reliant on high\u2011frequency acoustics.   Mary believes we can use its reliance on sound against it.',
      'Subject responded to acoustic patterns with a stream of tonal data.   Preliminary decryption suggests a timetable for a second attack.',
      "Translation uplink complete.\\n  '\u2026FIRST STRIKE SUCCESS.   SECOND WAVE DEPLOYMENT IN 1 CYCLE: TARGETS : MARS, TITAN, HOPE-VECTOR.'"
    ]
  }
};

progressData.chapters.push(
  {
    id: "chapter6.3b",
    type: "journal",
    chapter: 6,
    narrative: "Receiving transmission... \n 'This is bad, H.O.P.E. They're coming back. And you're a target. We need a plan. I have an idea, but it's... unconventional. Finish your work on Titan, then meet me at Callisto. We have an experiment to run.'",
    prerequisites: ["chapter6.3"],
    objectives: [

    ],
    reward: []
  }
);

if (typeof projectParameters !== 'undefined') {
  Object.assign(projectParameters, progressData.storyProjects);
}

