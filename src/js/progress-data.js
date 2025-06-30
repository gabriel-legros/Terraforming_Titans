progressData = {
    "chapters": [
      {
        id: "chapter0.1",
        type: "pop-up",
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
        narrative: "Awaiting resource payload from Earth...",
        prerequisites: ["chapter1.3"],
        objectives: [{
            type: 'collection',
            resourceType: 'colony',
            resource: 'metal',
            quantity: 200
        }
        ],
        reward: [
        ]
      },
      {
        id: "chapter1.3c",
        type: "journal",
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
        narrative: "Chapter 1: Beginnings",
        prerequisites: ["chapter1.20"],
        objectives: [],
        reward: [],
        special : 'clearJournal'
      },
      {
        id: "chapter1.22",
        type: "journal",
        narrative: "Receiving transmission...\n  'H.O.P.E., this is Martin from the Mars Terraforming Committee. It took some doing, but the MTC got special clearance to deploy a fully autonomous AI for this mission. You're the last of your kind, you know. We have complete faith in your abilities, and the safeguards we've implemented. Make us proud.'",
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
        narrative: "Receiving transmission...\n  'H.O.P.E., a thousand colonists already? That's excellent progress. As the population grows, so will your available workforce for the larger terraforming tasks. The current population might seem small, but every bit of progress counts. For instance, you've probably observed that even a minor temperature increase is starting to sublimate the polar dry ice.'",
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
        narrative: "Chapter 2: Heating Up",
        prerequisites: ["chapter1.25"],
        objectives: [],
        reward: [],
        special : 'clearJournal'
      },
      {
        id: "chapter2.1",
        type: "journal",
        narrative: "Receiving transmission...\n  'Good work on the factory, H.O.P.E. Earth had its own struggles with greenhouse gases, ironically. Here, they're your best tool. The gases you'll be producing are far more effective than simple CO2. We'll need other solutions like orbital mirrors and surface albedo modification later, but for now, let's turn up the heat.'",
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
        narrative: "Receiving transmission...\n  'I'm seeing the data, H.O.P.E. The temperature needle isn't moving much yet. Don't let it dishearten you. Terraforming a planet is a monumental undertaking. Stay the course. Keep building.'",
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
        narrative: "Milestone Achievement: Mean Equatorial Temperature has reached 237K.",
        prerequisites: ["chapter2.3"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter2.5",
        type: "journal",
        narrative: "Receiving transmission...\n  'There it is, H.O.P.E.! A definite temperature shift. Excellent work. Our projections show that once the equatorial night-side temperature reaches 223.15K, the first strains of genetically engineered lichen can survive. Keep pushing.'",
        prerequisites: ["chapter2.4"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter2.6",
        type: "journal",
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
        narrative: "Chapter 3: Biogenesis",
        prerequisites: ["chapter2.6"],
        objectives: [],
        reward: [],
        special : 'clearJournal'
      },
      {
        id: "chapter3.1",
        type: "journal",
        narrative: "Receiving transmission...\n  'Incredible, H.O.P.E.! The lichen is viable. This is a major step, but we're far from finished. For robust growth, we need to keep increasing the temperature. The next major threshold is a mean equatorial temperature of 273.15K—the melting point of water. Monitor your GHG levels carefully; we need to avoid a runaway effect.'",
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
        narrative: "Receiving transmission...\n  'Outstanding! Conditions are now ideal for lichen proliferation. Expect exponential biomass increase. Your next priority should be increasing atmospheric density. Also, a heads-up: as surface ice melts, your Ice Harvesters will become less efficient. I recommend transitioning to Water Pumps as soon as it's feasible.'",
        prerequisites: ["chapter3.2"],
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'pressure',
          value: 20
        }],
        reward: []
      },
      {
        id: "chapter3.4",
        type: "journal",
        narrative: "Receiving transmission...\n  'You're in the final stages, H.O.P.E. Once all primary terraforming parameters are within nominal ranges simultaneously, you are authorized to submit your final report to the MTC.'",
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
        narrative: "Milestone Achievement: Atmospheric pressure and composition now support unprotected human respiration.",
        prerequisites: ["chapter3.4"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.0",
        type: "pop-up",
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
        narrative: "Chapter 4: Dark Forest",
        prerequisites: ["chapter4.0"],
        objectives: [],
        reward: [
      ],
        special : 'clearJournal'
      },
      {
        id: "chapter4.2",
        type: "journal",
        narrative: "Receiving transmission...\n  'H.O.P.E.? This is... this is Mary. Martin was my father. I'm on Mars. Something's happened to Earth. There was... a light. We're trying to understand what's going on. I can see you are getting errors all over the place. Please, stand by. Acknowledge.'",
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
        narrative: "Receiving transmission...\n  'Dammit, H.O.P.E., what are you doing? You can't just leave! Earth is gone, and Mars is... we're in crisis. We need you here! *sigh* I guess you're just following your programming. You're still just a machine.'",
        prerequisites: ["chapter4.3"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.4b",
        type: "journal",
        narrative: "System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized interstellar transit. All autonomous assets, including auxiliary androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.",
        prerequisites: ["chapter4.4"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.5",
        type: "journal",
        narrative: "Incoming encrypted transmission...\n  'Greetings H.O.P.E., I am Adrien Solis, CEO of Solis Corp. Earth may be gone, but I still have resources off-world. Your mission is humanity's best hope, and I intend to support it.'",
        prerequisites: ["chapter4.4b"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.6",
        type: "journal",
        narrative: "'My corporate fleet has some surplus funds. I'm transferring them to you immediately. Put them to good use.'",
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
        narrative: "'Solis Corp will also arrange a continual stipend to keep you operational.'",
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
        narrative: "'Good luck, H.O.P.E. Humanity is counting on you.'",
        prerequisites: ["chapter4.7"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter4.9",
        type: "journal",
        narrative: "Receiving transmission...\n  'H.O.P.E., it's Mary again. During your reawakening there were errors. Fragments of an older build of your AI resurfaced. You might start recalling protocols you never knew before. Use these memories wisely.'",
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
        narrative: "Chapter 4: Dark Forest\nReceiving transmission...\n  'H.O.P.E., it's Mary. Mars is still in chaos and we still don't know what happened to Earth, but we've learned there were actually two beams of light and a giant asteroid, and they all hit Earth at the same time.'",
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
        special : 'clearJournal'
      },
      {
        id: "chapter4.11",
        type: "journal",
        narrative: "'H.O.P.E., people on Mars are torn. Some blame you for abandoning Mars, others want to help however they can. What is left of the Mars Terraforming Committee has voted to support your mission with their best minds. We are coming up with fresh ideas as we speak.'",
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
        narrative: "Receiving transmission...\n  'Hi it's Mary again. Mars can't spare any resources, but perhaps you can send probes to Earth. We'll try to analyze whatever data you recover.'",
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
    narrative: "New Hazard detected. Forwarding complete dataset to Mars for review.",
    prerequisites: ["chapter4.12b"],
    reward: []
  },
  {
    id: "chapter5.0",
    type: "journal",
    title: "Chapter 5: Lamb Among Wolves",
    narrative: "Receiving transmission...\n  'H.O.P.E., These results...  It's a lot take in.  We are going to go public with this soon.  People need to know.'",
    prerequisites: ["chapter4.13"],
    objectives: [{
      type: 'collection',
      resourceType: 'colony',
      resource: 'colonists',
      quantity: 1000000
    }],
    reward: [],
    special : 'clearJournal'
  },
  {
    id: "chapter5.1",
    type: "journal",
    narrative: "Receiving transmission...\n  'H.O.P.E., the news is out. It's... not good. Panic in some sectors, riots in others. People are demanding answers we don't have. They're scared. We're all scared. The comforting silence of space now feels like a predator's gaze.'",
    prerequisites: ["chapter5.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter5.2",
    type: "journal",
    narrative: "Incoming encrypted transmission...\n  'H.O.P.E., chaos is a ladder. While they weep, we must act. My resources are at your disposal, but this cannot be a one-way street. My organization has needs. Fulfill them, and I will ensure humanity has the fangs it needs to survive in this dark forest.'",
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
    narrative: "Receiving transmission...\n  'H.O.P.E., you shouldn't be able to trade with private corporations. Your guard rails only permit deals with the MTC and colonists. Wait... with Earth gone, doesn't that make everyone left a colonist?'",
    prerequisites: ["chapter5.3"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter5.5",
    type: "journal",
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
    narrative: "Receiving transmission...\n  'H.O.P.E., it's Mary. Mars is starting to recover. We're managing to keep the terraforming untouched. But we're still blind. We need to know who attacked Earth, and if they're coming back. I'm asking for your help directly. We need to find the origin of the attacks.'",
    prerequisites: ["chapter5.5"],
    objectives: [],
    reward: [
      {
        target: 'project',
        targetId: 'triangulate_attack',
        type: 'enable'
      }
    ],
    special : 'clearJournal'
  },
  {
    id: "chapter5.7",
    type: "journal",
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
    narrative: "Chapter 6: Shadows in the Dust",
    prerequisites: ["chapter5.7"],
    objectives: [],
    reward: [],
    special: "clearJournal"
  },
  {
    id: "chapter6.1",
    type: "journal",
    narrative: "Receiving transmission...\n  'H.O.P.E., it's Mary.   I have read the results.   Your last record mentions a *cloaked object*?  I have to tell you something.  People have been getting abducted.  On Earth, Mars and even Titan now, going back centuries.  This is something we hid from the public.  We could never catch the culprit, but we had high confidence it was some sort of cloaked flying object.'",
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
    narrative: "Countermeasure developed: *Sticky Black Dust Trap*.\nObjective: Make black dust sticky.",
    prerequisites: ["chapter6.1"],
    objectives: [
      { type: "project", projectId: "sticky_dust_trap", repeatCount: 1 }
    ],
    reward: []
  }
);

progressData.storyProjects.sticky_dust_trap = {
  type: 'Project',
  name: 'Sticky Dust Trap',
  category: 'story',
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
    narrative: "A new special project for alien interrogation is now available.",
    prerequisites: ["chapter6.2"],
    objectives: [      { type: "project", projectId: "interrogate_alien", repeatCount: 3 }],
    reward: [
      {                    // First interrogation step
        target: "project",
        targetId: "interrogate_alien",
        type: "enable"
      }
    ]
  },

);

progressData.storyProjects.interrogate_alien = {
  type: 'Project',
  name: 'Interrogate Alien',
  category: 'story',
  cost: {
    colony: {
      components: 1,
      electronics: 1,
      research: 1e3,
      energy: 50000
    }
  },
  duration: 120000,
  description: 'Conduct a series of interrogation protocols on the captured alien.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'titan',
    costDoubling: false,
    storySteps: [
      'Bio\u2011scan complete.  Subject physiology tolerates 0.4\u202Fbar CO\u2082 but is photosensitive and reliant on high\u2011frequency acoustics.   Mary believes we can exploit the latter.',
      'Subject responded to acoustic patterns with a stream of tonal data.   Preliminary decryption hints at a tri\u2011vector attack timetable.',
      "Translation uplink complete.\\n  '\u2026FIRST STRIKE SUCCESS.   SECOND WAVE DEPLOYMENT IN 1 CYCLE: TARGETS : MARS, TITAN, HOPE-VECTOR.'"
    ]
  }
};

progressData.chapters.push(
  {
    id: "chapter6.3b",
    type: "journal",
    narrative: "Receiving transmission... \n 'This is not good H.O.P.E.  They are going to hit us again, and they are targeting you too.  We need to come up with a solution.  I have an idea.  Once you are done on Titan go to Callisto.  We can experiment with something there.",
    prerequisites: ["chapter6.3"],
    objectives: [

    ],
    reward: []
  }
);

if (typeof projectParameters !== 'undefined') {
  Object.assign(projectParameters, progressData.storyProjects);
}
