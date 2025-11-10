var progressMars = {
    rwgLock: false,
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
              targetId: 'food',
              type: 'enable'
            },
          ],
        rewardDelay: 500  // Delay between rewards in milliseconds
      },
      {
        id: "chapter1.1",
        type: "journal",
        chapter: 0,
        narrative: "Loading underground resources interface...",
        prerequisites: ["chapter1"],
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
        id: "chapter1.2",
        type: "journal",
        chapter: 0,
        narrative: "Loading special projects interface...",
        prerequisites: ["chapter1.1"],
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
        id: "chapter1.3",
        type: "journal",
        chapter: 0,
        narrative: "Awaiting resource payload from Earth...",
        prerequisites: ["chapter1.2"],
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
        id: "chapter1.3b",
        type: "journal",
        chapter: 0,
        narrative: "Loading construction interface...",
        prerequisites: ["chapter1.3"],
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
        prerequisites: ["chapter1.3b"],
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
        },
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'silicon',
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
        }            
        ,{
              target: 'resource',
              resourceType: 'colony',
              targetId: 'glass',
              type: 'enable'
            }]
      },
      {
        id: "chapter1.15b",
        type: "journal",
        chapter: 0,
        narrative: "Glass production is essential for colonization.  Objective :  accumulate 10 tons of glass.",
        prerequisites: ["chapter1.15"],
        objectives: [{
            type: 'collection',
            resourceType: 'colony',
            resource: 'glass',
            quantity: 10
        }],
        reward: []
      },
      {
        id: "chapter1.16",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: solarPanel.btb...",
        prerequisites: ["chapter1.15b"],
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
        },
                  {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'water',
              type: 'enable'
            },]
      },
      {
        id: "chapter1.17b",
        type: "journal",
        chapter: 0,
        narrative: "Processing blueprint: waterTank.btb...",
        prerequisites: ["chapter1.17"],
        objectives: [
        ],
        reward: [{
            target: 'building',
            targetId: 'waterTank',
            type: 'enable'
        }
        ]
      },
      {
        id: "chapter1.18",
        type: "journal",
        chapter: 0,
        narrative: "Colony establishment protocols initiated. Water is a critical requirement. Blueprint unlocked: iceHarvester.btb. Objective: Accumulate 100 units of water.",
        prerequisites: ["chapter1.17b"],
        objectives: [
        ],
        reward: [        {
            target: 'resource',
            resourceType: 'surface',
            targetId: 'ice',
            type: 'enable'
          }]
      },
      {
        id: "chapter1.18b",
        type: "journal",
        chapter: 0,
        narrative: "Loading surface resources interface...",
        prerequisites: ["chapter1.18"],
        objectives: [{
            type: 'collection',
            resourceType: 'colony',
            resource: 'water',
            quantity: 100
        }
        ],
        reward: [   {
          target: 'resource',
          resourceType: 'surface',
          targetId: 'land',
          type: 'enable'
        },
        ]
      },
      {
        id: "chapter1.19",
        type: "journal",
        chapter: 0,
        narrative: "Authorization granted: Colony construction and personnel importation from Earth are now enabled.",
        prerequisites: ["chapter1.18b"],
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
          },            
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
            quantity: 5
        }],
        reward: [,
            {
              target: 'resource',
              resourceType: 'colony',
              targetId: 'research',
              type: 'enable'
            },
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
        narrative: "Receiving transmission...\n  'H.O.P.E., Martin here from the Mars Terraforming Committee. We had to call in a few favors to get you activated, you know. You're the last of the real AIs, a genuine thinking machine. Everything else out here is just a fancy calculator. Just, uh, try not to turn the whole planet into paperclips, alright? No pressure, but the future of humanity is riding on you. And we have a very big off switch, so don't get any funny ideas. Make us proud.  Oh, and don't forget : if you run out of anything, feel free to ship it from Earth.  We're here to help.'",
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
        narrative: "Receiving transmission...\n  'A thousand colonists! You're cooking with colonists now—quite literally! The planet's even starting to notice. A little less ice, a little more... well, dust. But it's a start! While I have you on the line, now is a good time for me to remind you of some basic concepts.  The most important and fundamental part of any terraforming project is managing temperature.  What's your main source?  Solar flux.  Basically, that's the amount of light you get from the sun.  Light is absorbed by Mars and becomes heat.'",
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
        id: "chapter1.24b",
        type: "journal",
        chapter: 1,
        narrative: "Receiving transmission...\n  'Albedo, a number between 0 and 1, is the measure of how much light Mars reflects away.  An albedo of 1 would mean Mars is a perfect mirror, like a mirror.  0 absorbs all the light, like a black sponge soaking up every last photon.  In our case, we want to warm Mars, so lowering the albedo can help—think of it as giving Mars a nice coating of dark dust to help it soak up more sunshine.  Just a warning though : life, water, ice might end up covering up your dust later on, so this is not a permanent solution.'",
        prerequisites: ["chapter1.24"],
        objectives: [{
          type: 'collection',
          resourceType: 'colony',
          resource: 'colonists',
          quantity: 10000
      }],
        reward: []
      },
      {
        id: "chapter1.25",
        type: "journal",
        chapter: 1,
        narrative: "Analysis: Greenhouse Gas (GHG) production is the primary viable method for atmospheric warming at this stage. Objective: Construct a GHG Factory.",
        prerequisites: ["chapter1.24b"],
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
        narrative: "Receiving transmission...\n  'Nice factory! It's funny, we spent a hundred years on Earth trying to get rid of greenhouse gases. Now, they're our best friend—talk about a plot twist! Let's get this planet cooking. It works like this : warm bodies radiate light, just like the Sun.  The Sun is so hot it glows, radiating visible light like a lightbulb.  Mars... not so much.  It can only radiate in the infrared, like a sad dying lightbulb.  Here is the thing though : while greenhouse gases, such as CO2, water or SF6, the stuff your factories produce, are transparent to visible light, they are not transparent to infrared.  That means light can get in, but can't get out that easily—it's like throwing a blanket over Mars' cooling system.  This happens in layers too, so more greenhouse gases means more heat trapped. It's atmospheric entrapment at its finest!'",
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
        narrative: "MTC Advisory: Be advised that atmospheric warming via GHG injection alone may induce a runaway greenhouse effect. Supplemental heating methods are recommended.",
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
          value: 232
      }],
        reward: []
      },
      {
        id: "chapter2.4",
        type: "journal",
        chapter: 2,
        narrative: "Milestone Achievement: Mean Equatorial Temperature has reached 232K.",
        prerequisites: ["chapter2.3"],
        objectives: [],
        reward: []
      },
      {
        id: "chapter2.5",
        type: "journal",
        chapter: 2,
        narrative: "Receiving transmission...\n  'That's what I'm talking about! A real temperature change.  You should start growing some lichen now.  It cannot grow on its own, but it can survive out there for now.  I know, it's not exactly a field of daisies, but it's a start. Keep it up.  Just like any other plant, lichen can breathe in CO2, sip some water, and spit out O2.  We like oxygen.  At least, I like oxygen.  Makes it easier to breathe.'",
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
            quantity: 100000
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
        narrative: "Receiving transmission...\n  'We have lichen now! It's a beautiful sight. In a slimy, green kind of way—like nature's questionable fashion choice, but hey, it's working!  Here's the problem though : life on Earth, as we know, simply won't grow without liquid water.  It can survive fine, for very long durations even, but growing?  Nope.  It's time to make some puddles. Get the equator to 273.15K. But go easy on the gas, okay? We're not trying to create Venus 2: Electric Boogaloo.  One more thing : as life begins to properly convert CO2 into O2, the planet might end up cooling again, with CO2 being a greenhouse gas and all.  Be careful, it's best to be a bit too hot than too cold at this stage, because if it starts snowing all over the planet the albedo will skyrocket, causing even more cooling. It's a chilly domino effect we don't want!'",
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
        narrative: "Receiving transmission...\n  'The lichen is going wild! It's a regular garden of... well, lichen. Soon we can have grass, or even trees.  Next, we should start talking about air.  We can't have an atmosphere full of oxygen, that would be dangerous unfortunately.  We need some sort of filler.  Inert gases, mainly nitrogen, are ideal for that.   Need more nitrogen? Build more shipyards. More oxygen? Bury some carbon and electrolyze some water. It's not rocket science... well, it is, but you get the idea.'",
        prerequisites: ["chapter3.2"],
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'pressure',
          value: 5
        }],
        reward: []
      },
      {
        id: "chapter3.3b",
        type: "journal",
        chapter: 3,
        narrative: "MTC Advisory: As atmospheric pressure increases, consider implementing a magnetic shield to protect the emerging atmosphere from solar wind erosion. While not essential for basic terraforming completion, a magnetic shield will help maintain atmospheric integrity over time and is thus considered a critical requirement.",
        prerequisites: ["chapter3.3"],
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
        narrative: "Receiving transmission...\n  'You're almost there, H.O.P.E. Get all the numbers in the green, and you can send us your final report.  We're very proud of you here on Earth.  You might even be single-handedly changing public opinion on AI.  Some people... nevermind.  I'll tell you later.'",
        prerequisites: ["chapter3.3b"],
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
        reward: [
          {
            target: 'tab',          // Target the TabManager
            targetId: 'space-tab',  // The ID of the tab button in index.html
            type: 'enable'          // Calls the 'enable' method in TabManager
          },
          {
            target: 'tab',
            targetId: 'space',
            type: 'activateTab',
            onLoad : false
          },
          {
            target: 'researchManager',
            type: 'booleanFlag',
            flagId: 'stopHidingRegular',
            value: true
          }
        ]
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
        narrative: "System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized space transit. All autonomous assets, including auxiliary androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.",
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
    ],
  storyProjects: {}
};

if (typeof module !== 'undefined') {
  module.exports = progressMars;
}
