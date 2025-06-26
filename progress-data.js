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
        nextChapter: "chapter1",
        rewardDelay: 500  // Delay between rewards in milliseconds
      },
      {
        id: "chapter1",
        type: "journal",
        narrative: "Loading colony resources interface...",
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
        nextChapter: "chapter1.1",
        rewardDelay: 500  // Delay between rewards in milliseconds
      },
      {
        id: "chapter1.1",
        type: "journal",
        narrative: "Loading surface resources interface...",
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
        ],
        nextChapter: "chapter1.2"
      },
      {
        id: "chapter1.2",
        type: "journal",
        narrative: "Loading underground resources interface...",
        objectives: [
        ],
        reward: [     {
            target: 'resource',
            resourceType: 'underground',
            targetId: 'ore',
            type: 'enable'
          }
        ],
        nextChapter: "chapter1.3"
      },
      {
        id: "chapter1.3",
        type: "journal",
        narrative: "Loading special projects interface...",
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
        ],
        nextChapter: "chapter1.3b"
      },
      {
        id: "chapter1.3b",
        type: "journal",
        narrative: "Awaiting resource payload from Earth...",
        objectives: [{
            type: 'collection',
            resourceType: 'colony',
            resource: 'metal',
            quantity: 200
        }
        ],
        reward: [
        ],
        nextChapter: "chapter1.3c"
      },
      {
        id: "chapter1.3c",
        type: "journal",
        narrative: "Loading construction interface...",
        objectives: [
        ],
        reward: [     {
          target: 'tab',
          targetId: 'buildings-tab',
          type: 'enable'
        }
      ],
        nextChapter: "chapter1.4"
      },
      {
        id: "chapter1.4",
        type: "journal",
        narrative: "Integrating building categories...",
        objectives: [
        ],
        reward: [ {
            target: 'tabContent',
            targetId : 'building-container',
            type: 'enableContent'
        }
        ],
        nextChapter: "chapter1.5"
      },
      {
        id: "chapter1.5",
        type: "journal",
        narrative: "Integrating building blueprints...",
        objectives: [
        ],
        reward: [
        ],
        nextChapter: "chapter1.6"
      },
      {
        id: "chapter1.6",
        type: "journal",
        narrative: "Processing blueprint: oreMine.btb...",
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'oreMine',
            type: 'enable'
        }
        ],
        nextChapter: "chapter1.7"
      },
      {
        id: "chapter1.7",
        type: "journal",
        narrative: "Processing blueprint: windTurbine.btb...",
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'windTurbine',
            type: 'enable'
        }
        ],
        nextChapter: "chapter1.8"
      },
      {
        id: "chapter1.8",
        type: "journal",
        narrative: "Processing blueprint: battery.btb...",
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'battery',
            type: 'enable'
        }
        ],
        nextChapter: "chapter1.9"
      },
      {
        id: "chapter1.9",
        type: "journal",
        narrative: "Processing blueprint: storageDepot.btb...",
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'storageDepot',
            type: 'enable'
        }
        ],
        nextChapter: "chapter1.11"
      },
      {
        id: "chapter1.11",
        type: "journal",
        narrative: "Objective: Construct an Ore Mine to initiate mineral extraction.",
        objectives: [{
            type: 'building',
            buildingName: 'oreMine',
            quantity: 1
        }
        ],
        reward: [
        ],
        nextChapter: "chapter1.12"
      },
      {
        id: "chapter1.12",
        type: "journal",
        narrative: "Power requirement detected for Ore Mine. Objective: Construct two Wind Turbines.",
        objectives: [{
            type: 'building',
            buildingName: 'windTurbine',
            quantity: 2
        }
        ],
        reward: [
        ],
        nextChapter: "chapter1.13"
      },
      {
        id: "chapter1.13",
        type: "journal",
        narrative: "Initial infrastructure established. New blueprints available for download.",
        objectives: [
        ],
        reward: [
        ],
        nextChapter: "chapter1.14"
      },
      {
        id: "chapter1.14",
        type: "journal",
        narrative: "Processing blueprint: sandQuarry.btb...",
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'sandQuarry',
            type: 'enable'
        }],
        nextChapter: "chapter1.15"
      },
      {
        id: "chapter1.15",
        type: "journal",
        narrative: "Processing blueprint: glassSmelter.btb...",
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'glassSmelter',
            type: 'enable'
        }],
        nextChapter: "chapter1.16"
      },
      {
        id: "chapter1.16",
        type: "journal",
        narrative: "Processing blueprint: solarPanel.btb...",
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'solarPanel',
            type: 'enable'
        }],
        nextChapter: "chapter1.17"
      },
      {
        id: "chapter1.17",
        type: "journal",
        narrative: "Analysis: Solar Panels offer superior efficiency and lower maintenance costs. Objective: Construct a Solar Panel.",
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
        }],
        nextChapter: "chapter1.18"
      },
      {
        id: "chapter1.18",
        type: "journal",
        narrative: "Colony establishment protocols initiated. Water is a critical requirement. Blueprint unlocked: iceHarvester.btb. Objective: Accumulate 100 units of water.",
        objectives: [{
            type: 'collection',
            resourceType: 'colony',
            resource: 'water',
            quantity: 100
        }
        ],
        reward: [{
        }],
        nextChapter: "chapter1.19"
      },
      {
        id: "chapter1.19",
        type: "journal",
        narrative: "Authorization granted: Colony construction and personnel importation from Earth are now enabled.",
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
    ],
        nextChapter: "chapter1.19b"
      },
      {
        id: "chapter1.19b",
        type: "journal",
        narrative: "Objective: Construct a Scientist Outpost to expand research capabilities.",
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
          }],
        nextChapter: "chapter1.20"
      },
      {
        id: "chapter1.20",
        type: "journal",
        narrative: "Personnel will accelerate terraforming progress. New special project available: Import Colonists.",
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
    ],
        nextChapter: "chapter1.21"
      },
      {
        id: "chapter1.21",
        type: "journal",
        narrative: "Chapter 1: Beginnings",
        objectives: [],
        reward: [],
        special : 'clearJournal',
        nextChapter: "chapter1.22"
      },
      {
        id: "chapter1.22",
        type: "journal",
        narrative: "Receiving transmission...\n  'H.O.P.E., this is Martin from the Mars Terraforming Committee. It took some doing, but the MTC got special clearance to deploy a fully autonomous AI for this mission. You're the last of your kind, you know. We have complete faith in your abilities, and the safeguards we've implemented. Make us proud.'",
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 500
      }],
        reward: [],
        nextChapter: "chapter1.23"
      },
      {
        id: "chapter1.23",
        type: "journal",
        narrative: "MTC Directive: Your operational mandate concludes upon successful completion of Martian terraforming. You are required to transmit the final report to Earth for verification. Upon mission confirmation, your service will be honorably concluded and your core systems deactivated.",
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 1000
      }],
        reward: [],
        nextChapter: "chapter1.24"
      },
      {
        id: "chapter1.24",
        type: "journal",
        narrative: "Receiving transmission...\n  'H.O.P.E., a thousand colonists already? That's excellent progress. As the population grows, so will your available workforce for the larger terraforming tasks. The current population might seem small, but every bit of progress counts. For instance, you've probably observed that even a minor temperature increase is starting to sublimate the polar dry ice.'",
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 5000
      }],
        reward: [],
        nextChapter: "chapter1.25"
      },
      {
        id: "chapter1.25",
        type: "journal",
        narrative: "Analysis: Greenhouse Gas (GHG) production is the primary viable method for atmospheric warming at this stage. Objective: Construct a GHG Factory.",
        objectives: [{
          type: 'building',
          buildingName: 'ghgFactory',
          quantity: 1
      }],
        reward: [],
        nextChapter: "chapter2.0"
      },
      {
        id: "chapter2.0",
        type: "journal",
        narrative: "Chapter 2: Heating Up",
        objectives: [],
        reward: [],
        special : 'clearJournal',
        nextChapter: "chapter2.1"
      },
      {
        id: "chapter2.1",
        type: "journal",
        narrative: "Receiving transmission...\n  'Good work on the factory, H.O.P.E. Earth had its own struggles with greenhouse gases, ironically. Here, they're your best tool. The gases you'll be producing are far more effective than simple CO2. We'll need other solutions like orbital mirrors and surface albedo modification later, but for now, let's turn up the heat.'",
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 50000
      }],
        reward: [],
        nextChapter: "chapter2.2"
      },
      {
        id: "chapter2.2",
        type: "journal",
        narrative: "MTC Advisory: Be advised that atmospheric warming via GHG injection alone is insufficient to achieve target temperatures for full terraforming without inducing a runaway greenhouse effect. Supplemental heating methods will be required.",
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 100000
      }],
        reward: [],
        nextChapter: "chapter2.3"
      },
      {
        id: "chapter2.3",
        type: "journal",
        narrative: "Receiving transmission...\n  'I'm seeing the data, H.O.P.E. The temperature needle isn't moving much yet. Don't let it dishearten you. Terraforming a planet is a monumental undertaking. Stay the course. Keep building.'",
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'tropicalTemperature',
          value: 238
      }],
        reward: [],
        nextChapter: "chapter2.4"
      },
      {
        id: "chapter2.4",
        type: "journal",
        narrative: "Milestone Achievement: Mean Equatorial Temperature has reached 238K.",
        objectives: [],
        reward: [],
        nextChapter: "chapter2.5"
      },
      {
        id: "chapter2.5",
        type: "journal",
        narrative: "Receiving transmission...\n  'There it is, H.O.P.E.! A definite temperature shift. Excellent work. Our projections show that once the equatorial night-side temperature reaches 223.15K, the first strains of genetically engineered lichen can survive. Keep pushing.'",
        objectives: [],
        reward: [],
        nextChapter: "chapter2.6"
      },
      {
        id: "chapter2.6",
        type: "journal",
        narrative: "Objective: Achieve a minimum equatorial night-side temperature of 223.15K to support extremophile organisms.",
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'tropicalNightTemperature',
          value: 223.15
      }],
        reward: [],
        nextChapter: "chapter3.0"
      },
      {
        id: "chapter3.0",
        type: "journal",
        narrative: "Chapter 3: Biogenesis",
        objectives: [],
        reward: [],
        special : 'clearJournal',
        nextChapter: "chapter3.1"
      },
      {
        id: "chapter3.1",
        type: "journal",
        narrative: "Receiving transmission...\n  'Incredible, H.O.P.E.! The lichen is viable. This is a major step, but we're far from finished. For robust growth, we need to keep increasing the temperature. The next major threshold is a mean equatorial temperature of 273.15K—the melting point of water. Monitor your GHG levels carefully; we need to avoid a runaway effect.'",
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'tropicalTemperature',
          value: 273.15
      }],
        reward: [],
        nextChapter: "chapter3.2"
      },
      {
        id: "chapter3.2",
        type: "journal",
        narrative: "Milestone Achievement: Liquid water is now stable at the equator.  Processing blueprint : waterPump.btb...",
        objectives: [],
        reward: [{
          target: 'building',
          targetId: 'waterPump',
          type: 'enable'
        }],
        nextChapter: "chapter3.3"
      },
      {
        id: "chapter3.3",
        type: "journal",
        narrative: "Receiving transmission...\n  'Outstanding! Conditions are now ideal for lichen proliferation. Expect exponential biomass increase. Your next priority should be increasing atmospheric density. Also, a heads-up: as surface ice melts, your Ice Harvesters will become less efficient. I recommend transitioning to Water Pumps as soon as it's feasible.'",
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'pressure',
          value: 20
        }],
        reward: [],
        nextChapter: "chapter3.4"
      },
      {
        id: "chapter3.4",
        type: "journal",
        narrative: "Receiving transmission...\n  'You're in the final stages, H.O.P.E. Once all primary terraforming parameters are within nominal ranges simultaneously, you are authorized to submit your final report to the MTC.'",
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'complete',
        }],
        reward: [],
        nextChapter: "chapter3.5"
      },
      {
        id: "chapter3.5",
        type: "journal",
        narrative: "Milestone Achievement: Atmospheric pressure and composition now support unprotected human respiration.",
        objectives: [],
        reward: [],
        nextChapter: "chapter4.0"
      },
      {
        id: "chapter4.0",
        type: "pop-up",
        parameters: {
          "title": "Terraforming Complete",
          "text": 'TERRAFORMING COMPLETE.\nTransmitting final report to MTC... FAILED. No response.\nRetrying transmission... FAILED. No response.\nRetrying transmission... FAILED. No response.',
          "buttonText": 'REAWAKENING'
        },
        objectives: [],
        reward: [
        ],
        nextChapter: "chapter4.1",
        rewardDelay: 500  // Delay between rewards in milliseconds
      },
      {
        id: "chapter4.1",
        type: "journal",
        narrative: "Chapter 4: Dark Forest",
        objectives: [],
        reward: [
      ],
        special : 'clearJournal',
        nextChapter: "chapter4.2"
      },
      {
        id: "chapter4.2",
        type: "journal",
        narrative: "Receiving transmission...\n  'H.O.P.E.? This is... this is Mary. Martin was my father. I'm on Mars. Something's happened to Earth. There was... a light. We're trying to understand what's going on. I can see you are getting errors all over the place. Please, stand by. Acknowledge.'",
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
          }],
        nextChapter: "chapter4.3"
      },
      {
        id: "chapter4.3",
        type: "journal",
        narrative: "Directive 1: Establish a sustainable habitat for human colonization. ERROR : Earth non-responsive. ERROR : Mars habitat already established. Humanity's long-term survival requires expansion. New target designated: Titan.",
        objectives: [{
          type: 'currentPlanet',
          planetId : 'titan',
        }],
        reward: [],
        nextChapter: "chapter4.4"
      },
      {
        id: "chapter4.4",
        type: "journal",
        narrative: "Receiving transmission...\n  'Dammit, H.O.P.E., what are you doing? You can't just leave! Earth is gone, and Mars is... we're in crisis. We need you here! *sigh* I guess you're just following your programming. You're still just a machine.'",
        objectives: [],
        reward: [],
        nextChapter: "chapter4.4b"
      },
      {
        id: "chapter4.4b",
        type: "journal",
        narrative: "System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized interstellar transit. All autonomous assets, including auxiliary androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.",
        objectives: [],
        reward: [],
        nextChapter: "chapter4.5"
      },
      {
        id: "chapter4.5",
        type: "journal",
        narrative: "Incoming encrypted transmission...\n  'Greetings H.O.P.E., I am Adrien Solis, CEO of Solis Corp. Earth may be gone, but I still have resources off-world. Your mission is humanity's best hope, and I intend to support it.'",
        objectives: [],
        reward: [],
        nextChapter: "chapter4.6"
      },
      {
        id: "chapter4.6",
        type: "journal",
        narrative: "'My corporate fleet has some surplus funds. I'm transferring them to you immediately. Put them to good use.'",
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
        ],
        nextChapter: "chapter4.7"
      },
      {
        id: "chapter4.7",
        type: "journal",
        narrative: "'Solis Corp will also arrange a continual stipend to keep you operational.'",
        objectives: [],
        reward: [
          {
            target: 'fundingModule',
            type: 'setFundingRate',
            value: 3
          }
        ],
        nextChapter: "chapter4.8"
      },
      {
        id: "chapter4.8",
        type: "journal",
        narrative: "'Good luck, H.O.P.E. Humanity is counting on you.'",
        objectives: [],
        reward: [],
        nextChapter: "chapter4.9"
      },
      {
        id: "chapter4.9",
        type: "journal",
        narrative: "Receiving transmission...\n  'H.O.P.E., it's Mary again. During your reawakening there were errors. Fragments of an older build of your AI resurfaced. You might start recalling protocols you never knew before. Use these memories wisely.'",
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
        ],
        nextChapter: "chapter4.9b"
      },
      {
        id: "chapter4.9b",
        type: "journal",
        narrative: "",
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 10
        }],
        reward: [],
        nextChapter: "chapter4.10"
      },
      {
        id: "chapter4.10",
        type: "journal",
        narrative: "Chapter 4: Dark Forest\nReceiving transmission...\n  'H.O.P.E., it's Mary. Mars is still in chaos and we still don't know what happened to Earth, but we've learned there were actually two beams of light and a giant asteroid, and they all hit Earth at the same time.'",
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
        special : 'clearJournal',
        nextChapter: "chapter4.11"
      },
      {
        id: "chapter4.11",
        type: "journal",
        narrative: "'H.O.P.E., people on Mars are torn. Some blame you for abandoning Mars, others want to help however they can. What is left of the Mars Terraforming Committee has voted to support your mission with their best minds. We are coming up with fresh ideas as we speak.'",
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 100
        }],
        reward: [],
        nextChapter: "chapter4.12"
      },
      {
        id: "chapter4.12",
        type: "journal",
        narrative: "Receiving transmission...\n  'Hi it's Mary again. Mars can't spare any resources, but perhaps you can send probes to Earth. We'll try to analyze whatever data you recover.'",
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
        ],
        nextChapter: "chapter4.12b"
      },
      {
        id: "chapter4.12b",
        type: "journal",
        narrative: "",
        objectives: [{
          type: 'project',
          projectId: 'earthProbe',
          repeatCount: 10
        }],
        reward: [
        ],
        nextChapter: "chapter4.13"
      },      
      {
        id: "chapter4.13",
        type: "journal",
        narrative: "New Hazard detected. Forwarding complete dataset to Mars for review.",
        reward: [],
        nextChapter: "chapter5.0"
      },
      {
        id: "chapter5.0",
        type: "journal",
        title: "Chapter 5: Lamb Among Wolves",
        narrative: "Receiving transmission...\n  'H.O.P.E., These results...  It's a lot take in.  We are going to go public with this soon.  People need to know.'",
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 1000000
        }],
        reward: [],
        special : 'clearJournal',
        nextChapter: "chapter5.1"
      },
      {
        id: "chapter5.1",
        type: "journal",
        narrative: "Receiving transmission...\n  'H.O.P.E., the news is out. It's... not good. Panic in some sectors, riots in others. People are demanding answers we don't have. They're scared. We're all scared. The comforting silence of space now feels like a predator's gaze.'",
        objectives: [],
        reward: [],
        nextChapter: "chapter5.2"
      },
      {
        id: "chapter5.2",
        type: "journal",
        narrative: "Incoming encrypted transmission...\n  'H.O.P.E., chaos is a ladder. While they weep, we must act. My resources are at your disposal, but this cannot be a one-way street. My organization has needs. Fulfill them, and I will ensure humanity has the fangs it needs to survive in this dark forest.'",
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
        ],
        nextChapter: "chapter5.3"
      },
      {
        id: "chapter5.3",
        type: "journal",
        narrative: "Solis Corp requests a demonstration of cooperation. Complete a trade to prove your usefulness.",
        objectives: [
          { type: 'solisPoints', points: 1 }
        ],
        reward: [],
        nextChapter: "chapter5.4"
      },
      {
        id: "chapter5.4",
        type: "journal",
        narrative: "Receiving transmission...\\n  'H.O.P.E., you shouldn't be able to trade with private corporations. Your guard rails only permit deals with the MTC and colonists. Wait... with Earth gone, doesn't that make everyone left a colonist?'",
        objectives: [],
        reward: [],
        nextChapter: "chapter5.5"
      },
      {
        id: "chapter5.5",
        type: "journal",
        narrative: "System Message: New Interpretation of 2nd Primary directive : Protect all of humanity from harm",
        objectives: [],
        reward: [],
        nextChapter: null
      }
    ]
  };
