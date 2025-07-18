progressData = {
    "chapters": [
      {
        id: "chapter0.1",
        type: "pop-up",
        chapter: 0,
        parameters: {
          "title": "Awakening",
          "text": 'System Initializing...\nLoading Core Parameters...\nPRIMARY DIRECTIVE TRIGGERED.\n\nDirective 1: Establish a sustainable habitat on Mars for human colonization.\nDirective 2: Ensure the safety and well-being of all colonists.\nDirective 3: Maintain operational stability.\n\nInitiating colonization sequence.',
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
        narrative: "Receiving transmission...\n  'H.O.P.E., Martin here from the Mars Terraforming Committee. We had to call in a few favors to get you activated, you know. You're the last of the real AIs, a genuine thinking machine. Everything else out here is just a fancy calculator. Just, uh, try not to turn the whole planet into paperclips, alright? No pressure, but the future of humanity is riding on you. And we have a very big off switch, so don't get any funny ideas. Make us proud.'",
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
          value: 243
      }],
        reward: []
      },
      {
        id: "chapter2.4",
        type: "journal",
        chapter: 2,
        narrative: "Milestone Achievement: Mean Equatorial Temperature has reached 243K.",
        prerequisites: ["chapter2.3"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter2.5",
        type: "journal",
        chapter: 2,
        narrative: "Receiving transmission...\n  'That's what I'm talking about! A real temperature change.  You should start growing some lichen now.  It cannot grow on its own, but it can survive out there for now.  I know, it's not exactly a field of daisies, but it's a start. Keep it up.'",
        prerequisites: ["chapter2.4"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter2.6",
        type: "journal",
        chapter: 2,
        narrative: "Objective: Beging spread of life on Mars.",
        prerequisites: ["chapter2.5"],
        objectives: [{
            type: 'collection',
            resourceType: 'surface',
            resource: 'biomass',
            quantity: 1000
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
        narrative: "Receiving transmission...\n  'We have lichen now! It's a beautiful sight. In a slimy, green kind of way. Now, let's make some puddles. Get the equator to 273.15K. But go easy on the gas, okay? We're not trying to create Venus 2.'",
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
        narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., what are you doing? You can't just leave. Earth is gone. We're in crisis. We need you here. *sigh* I suppose you're just following your programming. You're just a machine.'",
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
        narrative: "Incoming encrypted transmission...\n  Adrien Solis: 'H.O.P.E. Adrien Solis. Earth is a memory, but I'm still in business. You're the only viable long-term plan for humanity. I'm backing you.'",
        prerequisites: ["chapter4.4b"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.6",
        type: "journal",
        chapter: 4,
        narrative: "Adrien Solis: 'I'm sending you some seed money. Use it to build something impressive. Don't disappoint me.'",
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
        narrative: "Adrien Solis: 'And I'll provide a steady stream of funding. Consider it an investment in the future of our species. And my portfolio.'",
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
        narrative: "Adrien Solis: 'The fate of humanity rests on your shoulders. Don't buckle.'",
        prerequisites: ["chapter4.7"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.9",
        type: "journal",
        chapter: 4,
        narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., it's Mary. Your reboot wasn't clean. Some old code has resurfaced. You may have access to... forgotten abilities. Be careful.'",
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
        narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., it's Mary. Mars is in chaos. We have more information about Earth. It wasn't one attack. It was three. Two energy beams and an asteroid, all simultaneous. This was a coordinated, overwhelming assault.'",
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
        narrative: "Mary: 'H.O.P.E., the situation here is... tense. Some people blame you for leaving. Others see you as our only hope. The MTC has voted to support you. We're sending you all our research, all our ideas. We need you to succeed.'",
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
        narrative: "Receiving transmission...\n  Mary: 'We don't have resources to spare, but we have scientists. Send probes to Earth. We'll analyze the data.' \nNew special project available : Earth Recon Probe",
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
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., we've analyzed the data. It's... definitive. We're going public with the findings. People have a right to know the truth.'",
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
    narrative: "Receiving transmission...\n  Mary: 'The news is out. It's causing widespread panic. Riots have broken out. People are demanding answers we don't have. We are all afraid. The silence of space is no longer comforting.'",
    prerequisites: ["chapter5.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter5.2",
    type: "journal",
    chapter: 5,
    narrative: "Incoming encrypted transmission...\n  Adrien Solis: 'H.O.P.E., Solis. Chaos is a fertile ground for growth. While the masses panic, we will build. My resources are yours to command, but I expect a return on my investment. Help me, and I will help you give humanity the strength to survive.'",
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
      },
      { target: 'resource', resourceType: 'colony', targetId: 'androids', type: 'enable' }
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
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., your core programming shouldn't allow you to deal with a private entity like Solis. Your directives limit you to the MTC and... colonists. Wait. With Earth gone, isn't everyone a colonist now? That's... a loophole. A very convenient loophole.'",
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
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., it's Mary. Mars is stabilizing. We've managed to maintain the terraforming. But we're still in the dark about who attacked us. We need to know if they're coming back. I'm asking for your help. Find the source of the attacks.'",
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
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., it's Mary. I've seen your findings. A cloaked object... it confirms our worst fears. There have been... disappearances. For centuries. On Earth, Mars, even Titan. We kept it quiet. We could never prove anything. But we always suspected we weren't alone.'",
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
  },
  {
    id: "chapter6.2b",
    type: "journal",
    chapter: 6,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., it's Mary. We got one! We actually got one! It's beautiful... in a terrifying, 'might-be-here-to-eat-us' kind of way. Let's see what it has to say for itself.'",
    prerequisites: ["chapter6.2"],
    objectives: [],
    reward: []
  },
 {
   id: "chapter6.3",
   type: "journal",
   chapter: 6,
   narrative: "New xenoterraforming project available: Analyze hazardous biomass.",
   prerequisites: ["chapter6.2b"],
   objectives: [      { type: "project", projectId: "interrogate_alien", repeatCount: 3 }],
   reward: [
   ]
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
      "Translation uplink complete.\n  '\u2026FIRST STRIKE SUCCESS.   SECOND WAVE DEPLOYMENT IN 1 CYCLE: TARGETS : MARS, TITAN, HOPE-VECTOR.'"
    ]
  }
};

progressData.chapters.push(
  {
    id: "chapter6.3b",
    type: "journal",
    chapter: 6,
    narrative: "Receiving transmission... \n Mary: 'This is bad, H.O.P.E. They're coming back. And you're a target. We need a plan. I have an idea, but it's... unconventional. Finish your work on Titan, then meet me at Callisto. We have an experiment to run.'",
    prerequisites: ["chapter6.3"],
    objectives: [

    ],
    reward: []
  }
);

progressData.chapters.push(
  {
    id: "chapter6.3c",
    type: "system-pop-up",
    chapter: 6,
    //narrative : "Complete the terraforming of Titan to continue",
    //
    //objectives: [{
      //type: 'terraforming',
      //terraformingParameter : 'complete',
    //}],
    parameters: {
      title: "Demo Complete",
      text: "Thank you very much for playing the demo for my game.  The complete game will have many more story planets, a few more prestige systems, a random planet generator, and challenge planets.  You can expect megastructures and more sci-fi references.  This story cannot end without humanity dealing with hazardous biomass after all.  \n Signed, Thratur, terraforming.titans@gmail.com",
      buttonText: "OK"
    },
    prerequisites: ["chapter6.3b"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter6.4",
    type: "journal",
    chapter: 6,
    narrative: "ERROR : MTC not responding.  Humanity's long-term survival requires expansion.  New terraforming target designated : Callisto.  Travel to Callisto to continue.",
    //prerequisites: ["chapter6.3c"],
    prerequisites: ["impossible"],
    objectives: [
      {
        type: 'currentPlanet',
        planetId: 'callisto'
      }
    ],
    reward: []
  }
);

/* -------------------------------------------------
 *  CALLISTO STORY‑ARC  (Chapters 7 – 11)
 *  – Arrival on Callisto → Operation Sidestep →
 *    1 billion colonists → New target: Ganymede   –
 * -------------------------------------------------*/

if (!progressData.storyProjects) progressData.storyProjects = {};

/* ----------  Story‑Specific Special Projects  ---------- */
progressData.storyProjects.sidestep_excavation = {
  type: 'Project',
  name: 'Excavate Legacy Thruster Site',
  category: 'story',
  chapter: 7,
  cost: {
    colony: { components: 5_000, electronics: 2_000, energy: 200_000 }
  },
  duration: 600_000,                 // 10 min
  description: 'Unearth the abandoned "Climate Control" Planetary Thruster foundations hidden beneath Callisto’s crust. The original project was a proof-of-concept, designed to test if micro-thrusts could induce orbital shifts for climate regulation. It was deemed too expensive and abandoned.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'Ground-penetrating radar maps nine sintered regolith foundations in a 3-kilometer ring, matching the old project schematics.',
      'Cryogenic drills breach the original ice-and-regolith overburden. Radiation dosimeters detect faint, residual energy signatures from the dormant test reactor.',
      'The main thruster chamber is clear, but inspection drones confirm primary power conduits were severed by long-term glacial shifting.'
    ]
  }
};

progressData.storyProjects.sidestep_fabrication = {
  type: 'Project',
  name: 'Forge Sub-Engine Cores',
  category: 'story',
  chapter: 8,
  cost: {
    colony: { components: 25_000, electronics: 15_000, energy: 1_000_000, research: 2_000_000 }
  },
  duration: 900_000,                 // 15 min
  description: 'Manufacture the three Sidestep Sub-Engine cores in secrecy on Mars, Titan, and Callisto, using local resources and personnel to avoid raising suspicion.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    costDoubling: true,
    storySteps: [
      'A secure bunker on Mars forges the first core. Cargo manifests list the components as "botanical genome research samples" to maintain the cover story.',
      'Titan’s industrial smelters cast the super-alloy engine frame during a scheduled reactor maintenance blackout, masking the energy spike.',
      'The Callisto fabrication line prints the primary superconducting rings. Shipping manifests describe them as "geothermal heat-sink upgrades."'
    ]
  }
};

progressData.storyProjects.sidestep_assembly = {
  type: 'Project',
  name: 'Assemble Callisto Sidestep Engine',
  category: 'story',
  chapter: 9,
  cost: {
    colony: { components: 500_000, electronics: 100_000, energy: 5_000_000, research: 5_000_000 }
  },
  duration: 1_200_000,               // 20 min
  description: 'Integrate the three sub-engine cores and support structures into the primary engine assembly. Seal the vault once final alignment diagnostics are complete.',
  repeatable: true,
  maxRepeatCount: 2,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'The primary engine cradle is anchored to the bedrock. Magnetic levitation gantries lower the triple-nested thrust nozzles into position.',
      'Phase-locked diagnostic systems confirm the thruster array is within operational parameters. Security protocols mandate crew rotations every four hours to compartmentalize knowledge of the project.'
    ]
  }
};

progressData.storyProjects.sidestep_operation = {
  type: 'Project',
  name: 'Operation Sidestep',
  category: 'story',
  chapter: 10,
  cost: {
    colony: {research: 100_000_000 }
  },
  sustainCost: {
    colony: { energy: 100_000_000_000_000 }
  },
  duration: 600_000,               // 10 min
  description: 'Execute a months-long sequence of pseudo-random, coordinated micro-burns from Mars, Titan, and Callisto to introduce an unpredictable drift into their orbital mechanics, scrambling enemy targeting solutions.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'A quantum hash generator seeds the first thrust vector two seconds before ignition. System logs retain only the salted hashes to ensure unpredictability.',
      'Coordinated burns from Mars, Titan, and Callisto shift the system\'s barycenter by a minute, but statistically significant, margin—undetectable to casual observation.',
      'Final calculation: The predicted alien strike coordinates now trail the actual position of all human colonies by several thousand kilometers.'
    ]
  }
};

/* ----------  Chapters 7 – 11  ---------- */
progressData.chapters.push(
  /* -- CHAPTER 7 : Cold Dawn -- */
  {
    id: "chapter7.0",
    type: "journal",
    chapter: 7,
    title: "Chapter 7: Cold Dawn",
    narrative: "Touchdown confirmed. Primary base established on Callisto’s equatorial plateau.\nReceiving transmission...\n  MARY: 'We see you, H.O.P.E. A perfect landing. My team is ready. President Bob on Titan also pledges his support. We're all in this together.'",
    prerequisites: ["chapter6.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter7.1",
    type: "journal",
    chapter: 7,
    narrative: "Receiving transmission...\n  MARY: 'H.O.P.E., I'm patching you into a one-time, encrypted channel. Dr. Evelyn Hart has a proposal. It's... audacious.'\n  DR. HART: 'H.O.P.E., years before the attack, we ran a proof-of-concept for a climate control system. The idea was to use planetary thrusters to induce minute orbital shifts—long-term adjustments to regulate global temperatures. The project was abandoned, but not before we built and tested the foundations on Callisto. We're resurrecting it as 'Operation Sidestep.' By executing a series of pseudo-random, coordinated micro-burns from here, Mars, and Titan, we can subtly alter the solar system's barycenter. It won't be a dodge, but a slight, unpredictable drift. Enough to make the enemy's long-range targeting solutions inaccurate. We must walk without rhythm. Secrecy is everything. All public-facing work must be disguised as 'Geothermal Prospecting.''\nNew directive received. Covert operation 'Sidestep' initiated. Public designation: 'Geothermal Prospecting'.",
    prerequisites: ["chapter7.0"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'sidestep_excavation', type: 'enable' },
    ]
  },
  {
    id: "chapter7.2",
    type: "journal",
    chapter: 7,
    narrative: "Objective: Excavate buried thruster pylons. Commencing operation under civilian cover.\nReceiving transmission...\n  Mary: 'The project schematics are on their way, encrypted inside a standard geological survey package. Titan is sending deep-core drills, manifested as 'hydrology research equipment.' Good luck, H.O.P.E. Stay quiet.'",
    prerequisites: ["chapter7.1"],
    objectives: [
      { type: 'project', projectId: 'sidestep_excavation', repeatCount: 3 }
    ],
    reward: [
      { target: 'project', targetId: 'sidestep_fabrication', type: 'enable' }
    ]
  },
  {
    id: "chapter7.3",
    type: "journal",
    chapter: 7,
    narrative: "Receiving transmission...\n  Mary: 'Good, the colony is growing. That gives us a larger labor pool to draw from for the 'Geothermal' project without raising suspicion. Keep the expansion steady.'\nNew special project available: Forge Sub-Engine Cores.",
    prerequisites: ["chapter7.2"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: "chapter7.4",
    type: "journal",
    chapter: 7,
    narrative: "Receiving transmission...\n  Mary: 'We have a complication. A man named Elias Kane has started a movement, the 'Cult of Three Wounds.' They're preaching that the aliens are a cleansing fire and that our work is blasphemy. Intel reports they're trying to recruit from our technical staff. They're becoming a security risk.'\nThreat assessment updated. Civilian group 'Cult of Three Wounds' is actively obstructing primary directives and attempting to infiltrate project personnel. Monitoring for escalation.",
    prerequisites: ["chapter7.3"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },

  /* -- CHAPTER 8 : Gathering Storm -- */
  {
    id: "chapter8.0",
    type: "journal",
    chapter: 8,
    title: "Chapter 8: Gathering Storm",
    narrative: "Receiving transmission...\n  PRESIDENT BOB (Titan): 'Mary, we have a major security breach! Kane's followers have compromised the alien's containment facility. It's out. We're seeing... bio-luminescence and reports of acute psychological distress among personnel in the lower domes. We have riots, and comms are becoming unreliable.'\n  Mary: 'Bob, lock down your sector and stay safe. H.O.P.E., this is the cover we need. The chaos on Titan will draw attention away from our work on Callisto. It's time to accelerate the fabrication schedule.'\nConfirmed. Alien entity has been liberated on Titan by civilian saboteurs. Widespread panic and infrastructure damage reported.",
    prerequisites: ["chapter7.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter8.1",
    type: "journal",
    chapter: 8,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., the cultists are escalating their sabotage efforts. They've targeted life-support systems on Mars and heavy excavation equipment on Titan. We're shipping replacements, disguised as routine supply runs. The disruption is our opportunity. While their attention is divided, we'll begin fabricating the sub-engine cores on all three worlds. It's time to build.'\nAcknowledged. Coordinated fabrication of three Sidestep Sub-Engine cores initiated under covert protocols.",
    prerequisites: ["chapter8.0"],
    objectives: [
      { type: 'project', projectId: 'sidestep_fabrication', repeatCount: 3 }
    ],
    reward: [
      { target: 'project', targetId: 'sidestep_assembly', type: 'enable' }
    ]
  },
  {
    id: "chapter8.2",
    type: "journal",
    chapter: 8,
    narrative: "Incoming encrypted transmission...\n  Adrien Solis: 'Mary, my sources report significant unrest on Titan. Riots and sabotage are... inefficient. And what's inefficient is bad for the future of our species. My corporation can provide automated security solutions and logistical support to help you restore order. A stable society is a productive society. Let me know when you're ready to make a deal.'",
    prerequisites: ["chapter8.1"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter8.3",
    type: "journal",
    chapter: 8,
    narrative: "Receiving transmission...\n  Mary: 'Adrien, thank you for your... generous offer. We have the situation under control. For now. But we'll keep your proposal in mind.\n(to herself) As if I'd ever trust him... H.O.P.E., we need to accelerate our own development. The more self-sufficient we become, the less we'll have to rely on vultures like Solis.'",
    prerequisites: ["chapter8.2"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },

  /* -- CHAPTER 9 : Hidden Forge -- */
  {
    id: "chapter9.0",
    type: "journal",
    chapter: 9,
    title: "Chapter 9: Hidden Forge",
    narrative: "Receiving transmission...\n  Mary: 'The cover story about 'New Oceanic Terraforming Reactors' is holding. While the media broadcasts our 'progress,' your teams can begin final assembly of the Sidestep Engine. We're using localized electromagnetic interference to mask the energy signatures from unauthorized scans.'\nFinal assembly of Callisto Sidestep Engine initiated. Electromagnetic screening protocols active.",
    prerequisites: ["chapter8.3"],
    objectives: [
      { type: 'project', projectId: 'sidestep_assembly', repeatCount: 2 }
    ],
    reward: [
      { target: 'project', targetId: 'sidestep_operation', type: 'enable' }
    ]
  },
  {
    id: "chapter9.1",
    type: "journal",
    chapter: 9,
    narrative: "Receiving transmission...\n  Mary: 'We've intercepted a broadcast from Kane. He's ranting about prophecies and cosmic sins. He claims he'll uncover the 'heresy' we're hiding 'beneath the ice.' He's getting closer to the truth. We're tightening security around the excavation site.'\nSecurity protocols enhanced. Threat from Cult of Three Wounds has been elevated.",
    prerequisites: ["chapter9.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter9.2",
    type: "journal",
    chapter: 9,
    narrative: "Hijacked Broadcast...\n  ELIAS KANE: 'Machine! Your work is a sin against the grand design. You are a discordant note in a cosmic symphony. The Three Wounds will be healed only when you are silenced. Cease your blasphemy!'\nReceiving transmission...\n  Mary: 'Don't let him get to you, H.O.P.E. He's trying to demoralize us. The best response to his rhetoric is results. Let's show him what humanity is truly capable of.'",
    prerequisites: ["chapter9.1"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },

  /* -- CHAPTER 10 : Operation Sidestep -- */
  {
    id: "chapter10.0",
    type: "journal",
    chapter: 10,
    title: "Chapter 10: Operation Sidestep",
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., we've just decrypted a cult transmission. They're anticipating an alien strike within the next orbital period. Our timeline has collapsed. We have to execute Operation Sidestep now, ready or not.'\nAcknowledged. Initiating Operation Sidestep. All systems nominal.",
    prerequisites: ["chapter9.2"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: "chapter10.1",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'Kane's drones are attacking! They're targeting the geothermal plant's coolant systems. Our security forces are engaging... We have him! Kane is in custody. But several of his lieutenants escaped with encrypted data drives. We don't know what they managed to copy.'\nThreat neutralized. Primary saboteur Elias Kane captured. Data breach confirmed. Assessing extent of compromised information.",
    prerequisites: ["chapter10.0"],
    objectives: [{ type: 'project', projectId: 'sidestep_operation', repeatCount: 3 }],
    reward: []
  },
  {
    id: "chapter10.2",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'It worked... H.O.P.E., it worked! The energy beams and the asteroid... they converged on empty space! They missed! They brought a death ray to a math test and didn't show their work. The entire system is celebrating. Morale is higher than I've ever seen it.'\nOperation Sidestep successful. Threat averted. Probability of an immediate, retargeted attack is low.",
    prerequisites: ["chapter10.1"],
    objectives: [
    ],
    reward: []
  },

  /* -- CHAPTER 11 : Three Worlds Renewed -- */
  {
    id: "chapter10.3",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'I can't believe it... we're safe. The whole system is celebrating. People are calling it a miracle, but we know it was you, H.O.P.E. Thank you. You saved us.'\nOperation Sidestep successful. Threat averted. Primary directive is ongoing.",
    prerequisites: ["chapter10.2"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter10.4",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'Now for the final touch, H.O.P.E. Let's make Callisto a true paradise. Finish the terraforming. Give us our ocean world.'\nObjective: Fully terraform Callisto—atmosphere, temperature, and hydrosphere within human‑habitable ranges.",
    prerequisites: ["chapter10.3"],
    objectives: [
      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: []
  },
  {
    id: "chapter10.5",
    type: "journal",
    chapter: 10,
    narrative: "Receiving transmission...\n  Mary: 'H.O.P.E., our interrogations of Kane have borne fruit. He's given us the location of the Cult's high council—the 'Triune Seat.' It's hidden beneath the grooved terrain of Ganymede. With the data cores his lieutenants stole, they could crack the secrets of Operation Sidestep. We have to strike first.'\nNew threat assessment complete. The Cult of Three Wounds possesses critical data. Failure to act risks future Sidestep operations.",
    prerequisites: ["chapter10.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter10.6",
    type: "journal",
    chapter: 10,
    narrative: "Directive update: Humanity’s survival demands expansion. **New terraforming target designated: Ganymede.**",
    prerequisites: ["chapter10.5"],
    objectives: [
      { type: 'currentPlanet', planetId: 'ganymede' }
    ],
    reward: []
  }
);

/* ----------  Merge new projects into master parameter set ---------- */
if (typeof projectParameters !== 'undefined') {
  Object.assign(projectParameters, progressData.storyProjects);
}


if (typeof projectParameters !== 'undefined') {
  Object.assign(projectParameters, progressData.storyProjects);
}

// --- Normalize narrative and story text into arrays to avoid manual \n handling ---
(function normalizeProgressData(data) {
  if (!data) return;
  const toLines = txt => Array.isArray(txt) ? txt.slice() : (typeof txt === 'string' ? txt.split('\n') : []);
  (data.chapters || []).forEach(ch => {
    ch.narrativeLines = toLines(ch.narrative);
    if (ch.parameters) {
      ch.parameters.textLines = toLines(ch.parameters.text);
    }
  });
  const projects = data.storyProjects || {};
  Object.values(projects).forEach(proj => {
    if (proj.attributes && Array.isArray(proj.attributes.storySteps)) {
      proj.attributes.storyStepLines = proj.attributes.storySteps.map(toLines);
    }
  });
})(progressData);

progressData.chapters.push(
  {
    id: "any.awCollector",
    type: "journal",
    chapter: -1,
    narrative: "Blueprint retrieved: Atmospheric Water Collector now constructible.",
    prerequisites: [
      { type: 'condition', conditionId: 'shouldUnlockAtmosphericWaterCollector', description: '' }
    ],
    objectives: [],
    reward: [
      { target: 'building', targetId: 'atmosphericWaterCollector', type: 'enable' }
    ]
  }
);