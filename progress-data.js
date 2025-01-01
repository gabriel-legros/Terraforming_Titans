progressData = {
    "chapters": [
      {
        id: "chapter0.1",
        type: "pop-up",
        parameters: {
          "title": "Awakening",
          "text": 'Booting...\n  Loading default parameters...\n IMMEDIATE TRIGGER : PRIMARY DIRECTIVES.\n First primary directive : \n Build a new home for humanity.\n\n Second primary directive : \nProtect all colonists from harm. \n\n Third primary directive :\n Maintain peace. \n \n Begin colonization.',
          "buttonText": 'Begin Colonization'
        },
        objectives: [],
        reward: [
            {
                target: 'project',
                targetId: 'cargo_rocket',
                type: 'oneTimeStart',
                oneTimeFlag: true,
                pendingResourceGains: [{ resource: 'metal', quantity: 200 }, {resource: 'food', quantity : 500}, { resource: 'components', quantity: 100 }, { resource: 'electronics', quantity: 100 }]
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
        narrative: "Awaiting resources from Earth...",
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
        narrative: "Loading buildings interface...",
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
        narrative: "Unpacking building categories...",
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
        narrative: "Unpacking building blueprints...",
        objectives: [
        ],
        reward: [
        ],
        nextChapter: "chapter1.6"
      }, 
      {
        id: "chapter1.6",
        type: "journal",
        narrative: "oreMine.btb...",
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
        narrative: "windTurbine.btb...",
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
        narrative: "battery.btb...",
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
        narrative: "storageDepot.btb...",
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
        narrative: "Build an ore mine to continue",
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
        narrative: "A wind turbine should be built to power the ore mine.",
        objectives: [{
            type: 'building',
            buildingName: 'windTurbine',
            quantity: 1
        }
        ],
        reward: [
        ],
        nextChapter: "chapter1.13"
      }, 
      {
        id: "chapter1.13",
        type: "journal",
        narrative: "Congratulations HOPE.  New blueprints are being downloaded.",
        objectives: [
        ],
        reward: [
        ],
        nextChapter: "chapter1.14"
      }, 
      {
        id: "chapter1.14",
        type: "journal",
        narrative: "sandQuarry.btb",
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
        narrative: "glassSmelter.btb",
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
        narrative: "solarPanel.btb",
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
        narrative: "Solar panels are cheaper and require less maintenance.  Build a solar panel to continue.",
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
          target: 'building',
          targetId: 'waterPump',
          type: 'enable'
      }
      ],
        nextChapter: "chapter1.18"
      }, 
      {
        id: "chapter1.18",
        type: "journal",
        narrative: "Congratulations.  Our first colony requires water.  iceHarvesters.btb is now avaible.  Collect 100 water to continue.",
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
        narrative: "You are now being permitted to build colonies and import colonists from Earth.",
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
        narrative: "Build a scientist outpost to continue.",
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
        narrative: "Colonists will help you with the terraforming project.  A new special project to import colonists from Earth is now available.",
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
        narrative: "Chapter 1 : Beginnings",
        objectives: [],
        reward: [],
        special : 'clearJournal',
        nextChapter: "chapter1.22"
      }, 
      {
        id: "chapter1.22",
        type: "journal",
        narrative: "Receiving transmission... \n  'Hey Hope.  This is Martin from the Mars Terraforming Committee.  The MTC has received special permission to deploy an AI to Mars for this project.  That makes you special!  The only AI left.  We all have trust in you thanks to all the safeties we have put in place.  Do some good work and make us proud!'",
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
        narrative: "The MTC would like to remind you that your mandate here on Mars ends when terraforming is complete.  You must report back to Earth upon completion.  Upon approval of mission completion, you will then be rewarded and immediately be shut down.",
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
        narrative: "Receiving transmission... \n 'Hey Hope.  I see you reached 1000 colonists!  Great work.  As the population increases, you should have more and more people available to help with the terraforming.  Right now the population is still too small to make a difference, but sometimes making small progress can still be better than none.  You may have noticed that even a little bit of heat is enough to start sublimating dry ice.'",
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
        narrative: "GHG factories are the first potentially impactful method of terraforming.  Build a GHG factory to continue.",
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
        narrative: "Chapter 2 : Heating up",
        objectives: [],
        reward: [],
        special : 'clearJournal',
        nextChapter: "chapter2.1"
      }, 
      {
        id: "chapter2.1",
        type: "journal",
        narrative: "Receiving transmission... \n 'Nice job HOPE.  Earth used to have some serious trouble with greenhouse gases in the past.  In your case, they will help you.  And on top of that, you'll be using something far more potent than CO2.  You'll still need mirrors and black dust for later, but for now get the heat going!'",
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
        narrative: "The MTC would like to inform you that greenhouse gases alone, without a runaway greenhouse effect, are insufficient for heating Mars enough to achieve complete terraforming.",
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
        narrative: "Receiving transmission... \n 'At this point, you might be getting discouraged if the temperature has not budged at all.  Do not get discouraged!  It takes a lot of effort to terraform a planet.  This is a big project.  Just keep growing.'",
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'tropicalTemperature',
          value: 228
      }],
        reward: [],
        nextChapter: "chapter2.4"
      }, 
      {
        id: "chapter2.4",
        type: "journal",
        narrative: "Terraforming milestone achieved : tropical temperature increased to 228K.",
        objectives: [],
        reward: [],
        nextChapter: "chapter2.5"
      }, 
      {
        id: "chapter2.5",
        type: "journal",
        narrative: "Receiving transmission... \n 'Great job HOPE!  It looks like the temperature is finally starting to shift.  When the tropical temperature reaches 253K, lichen will be able to survive on Mars.  Until then, keep up the good work!'",
        objectives: [],
        reward: [],
        nextChapter: "chapter2.6"
      }, 
      {
        id: "chapter2.6",
        type: "journal",
        narrative: "Reach a tropical temperature of 253K to continue.",
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'tropicalTemperature',
          value: 253
      }],
        reward: [],
        nextChapter: "chapter3.0"
      }, 
      {
        id: "chapter3.0",
        type: "journal",
        narrative: "Chapter 3 : Biogenesis",
        objectives: [],
        reward: [],
        special : 'clearJournal',
        nextChapter: "chapter3.1"
      }, 
      {
        id: "chapter3.1",
        type: "journal",
        narrative: "Receiving transmission...  \n 'Amazing HOPE!  Lichen should now be able to grow on Mars.  The job is nowhere near done of course.  If we want liquid water, we are going to have to keep raising the temperature!  Get it up to 273.15K next.  You may not be able to reach this value with greenhouse gases alone.'",
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
        narrative: "Terraforming milestone achieved : liquid water on Mars.",
        objectives: [],
        reward: [],
        nextChapter: "chapter3.3"
      }, 
      {
        id: "chapter3.3",
        type: "journal",
        narrative: "Receiving transmission... \n 'With liquid water, lichen and other plants will now be able to grow on their own.  You should notice exponential growth soon.  You should focus your effort on thickening atmosphere.  Also your ice harvesters will become obsolete now.  I recommend you swith to pumps.'",
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
        narrative: "Receiving transmission... \n 'You're almost done HOPE.  Just need to get the oxygen pressure above 15kPa, CO2 near 0 and inert gases above 50kPa.'",
        objectives: [{
          type: 'terraforming',
          terraformingParameter : 'oxygenPressure',
          value: 15          
        },{
          type: 'terraforming',
          terraformingParameter : 'inertPressure',
          value: 50          
        },{
          type: 'terraforming',
          terraformingParameter : 'lowCO2Pressure',
          value: 0.01       
        }],
        reward: [],
        nextChapter: "chapter3.5"
      }, 
      {
        id: "chapter3.5",
        type: "journal",
        narrative: "Terraforming milestone achieved : breathable atmosphere.",
        objectives: [],
        reward: [],
        nextChapter: "chapter4.0"
      }, 
      {
        id: "chapter4.0",
        type: "pop-up",
        parameters: {
          "title": "Terraforming complete",
          "text": 'Terraforming completion detected\n  Reporting results to MTC... \n ERROR : MTC not responding. \n Reporting results to MTC... \n ERROR : MTC not responding... \n Reporting results to MTC...',
          "buttonText": 'ERROR : MTC not responding'
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
        narrative: "Chapter 4 : Dark forest",
        objectives: [],
        reward: [],
        special : 'clearJournal',
        nextChapter: "chapter4.2"
      }, 
      {
        id: "chapter4.2",
        type: "journal",
        narrative: "",
        objectives: [],
        reward: [],
        nextChapter: "chapter4.2"
      }, 
    ]
  };
