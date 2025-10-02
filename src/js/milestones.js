const festivalEffects = [
    {
        target: 'fundingModule',
        type: 'productionMultiplier',
        value : 3
    },
    {
        target: 'building',
        targetId: 'oreMine',
        type: 'productionMultiplier',
        value: 3
    },
    {
        target: 'building',
        targetId: 'componentFactory',
        type: 'productionMultiplier',
        value: 3
    },
    {
        target: 'building',
        targetId: 'electronicsFactory',
        type: 'productionMultiplier',
        value: 3
    },
    {
      target: 'population',
      type: 'growthMultiplier',
      value: 3
  },
    {
        type: 'booleanFlag',
        target: 'resource',
        resourceType: 'colony',
        targetId: 'funding',
        flagId: 'festival',
        value: true
    },
    {
        type: 'booleanFlag',
        target: 'resource',
        resourceType: 'colony',
        targetId: 'metal',
        flagId: 'festival',
        value: true
    },
    {
        type: 'booleanFlag',
        target: 'resource',
        resourceType: 'colony',
        targetId: 'components',
        flagId: 'festival',
        value: true
    },
    {
        type: 'booleanFlag',
        target: 'resource',
        resourceType: 'colony',
        targetId: 'electronics',
        flagId: 'festival',
        value: true
    },   
    {
      type: 'booleanFlag',
      target: 'resource',
      resourceType: 'colony',
      targetId: 'colonists',
      flagId: 'festival',
      value: true
  }
]

const terraformingMilestones = 
    [
        {
        type : 'temperature',
        value : 1e-4,
        name : 'Temperature 1',
        description : 'Increase or decrease temperature in any zone by 0.1 mK',
    }, {
        type : 'temperature',
        value : 1e-3,
        name : 'Temperature 2',
        description : 'Increase or decrease temperature in any zone by 1 mK',
    }, {
        type : 'temperature',
        value : 1e-2,
        name : 'Temperature 3',
        description : 'Increase or decrease temperature in any zone by 10 mK',
    }, {
        type : 'temperature',
        value : 0.1,
        name : 'Temperature 4',
        description : 'Increase or decrease temperature in any zone by 0.1 K',
    }, {
        type : 'temperature',
        value : 1,
        name : 'Temperature 5',
        description : 'Increase or decrease temperature in any zone by 1 K',
    }, {
        type : 'pressure',
        value : 0.01,
        name : 'Pressure 1',
        description : 'Increase or decrease total atmospheric pressure by 0.01 Pa',
    }, {
        type : 'pressure',
        value : 0.1,
        name : 'Pressure 2',
        description : 'Increase or decrease total atmospheric pressure by 0.1 Pa',
    }, {
        type : 'pressure',
        value : 5,
        name : 'Pressure 3',
        description : 'Increase or decrease total atmospheric pressure by 5 Pa',
    }, {
        type : 'pressure',
        value : 100,
        name : 'Pressure 4',
        description : 'Increase or decrease total atmospheric pressure by 100 Pa',
    }, {
        type : 'pressure',
        value : 1e3,
        name : 'Pressure 5',
        description : 'Increase or decrease total atmospheric pressure by 1 kPa',
    }, {
        type : 'water',
        value : 1000,
        name : 'Water 1',
        description : 'Have at least 1k surface liquid water',
    }, {
        type : 'water',
        value : 1e6,
        name : 'Water 2',
        description : 'Have at least 1M surface liquid water',
    }, {
        type : 'water',
        value : 1e9,
        name : 'Water 3',
        description : 'Have at least 1B surface liquid water',
    }, {
        type : 'water',
        value : 1e12,
        name : 'Water 4',
        description : 'Have at least 1T surface liquid water',
    }, {
        type : 'water',
        value : 1e15,
        name : 'Water 5',
        description : 'Have at least 1Q surface liquid water',
    }, {
        type : 'life',
        value : 1,
        name : 'Life 1',
        description : 'Have at least 1 surface biomass',
    }, {
        type : 'life',
        value : 1000,
        name : 'Life 2',
        description : 'Have at least 1k surface biomass',
    }, {
        type : 'life',
        value : 1e6,
        name : 'Life 3',
        description : 'Have at least 1M surface biomass',
    }, {
        type : 'life',
        value : 1e9,
        name : 'Life 4',
        description : 'Have at least 1B surface biomass',
    }, {
        type : 'life',
        value : 1e12,
        name : 'Life 5',
        description : 'Have at least 1T surface biomass',
    }
    ];

class MilestonesManager {
    constructor() {
        this.milestones = terraformingMilestones.map(milestone => ({
            ...milestone,
            isCompleted: false, // Add an isCompleted flag to track completion
        }));
        this.countdownRemainingTime = 0;
        this.countdownActive = false;
    }

    // Save the state of completed milestones and additional attributes, returning an object
    saveState() {
        const state = {
            milestones: this.milestones.reduce((result, milestone) => {
                result[milestone.name] = {
                    isCompleted: milestone.isCompleted,
                };
                return result;
            }, {}),
            countdownRemainingTime: this.countdownRemainingTime,
            countdownActive: this.countdownActive
        };
        return state;
    }

    // Load the state of milestones and additional attributes from a provided object
    loadState(state) {
        if (state.milestones) {
            this.milestones.forEach(milestone => {
                if (state.milestones[milestone.name]) {
                    milestone.isCompleted = state.milestones[milestone.name].isCompleted || false;
                }
            });
        }

        if (state.hasOwnProperty('countdownRemainingTime')) {
            this.countdownRemainingTime = state.countdownRemainingTime;
        }

        if (state.hasOwnProperty('countdownActive')) {
            this.countdownActive = state.countdownActive;
        }

        if(this.countdownActive){
            this.addEffects();
        }
    }

    // Update which milestones can be completed based on current game state
    update(delta) {
        this.milestones.forEach(milestone => {
            if (!milestone.isCompleted && this.checkIfCanBeCompleted(milestone)) {
                milestone.canBeCompleted = true;
            } else {
                milestone.canBeCompleted = false;
            }
        });

        if (this.countdownActive) {
            this.countdownRemainingTime -= delta;
      
            if (this.countdownRemainingTime <= 0) {
              this.removeEffects();
              this.countdownActive = false;
            }
          }
    }

    // Check if a milestone can be completed based on its type and game state
    checkIfCanBeCompleted(milestone) {
        switch (milestone.type) {
            case 'temperature':
                const zones = terraforming.temperature.zones;
                return Object.values(zones).some(zone => {
                    const difference = Math.abs(zone.value - zone.initial);
                    return difference >= milestone.value;
                });
            case 'pressure':
                const pressureDelta = terraforming.calculateTotalPressureDelta();
                return pressureDelta > milestone.value;
            case 'water':
                const waterAmount = resources.surface.liquidWater.value;
                return waterAmount > milestone.value;
            case 'life':
                const lifeAmount = resources.surface.biomass.value;
                return lifeAmount > milestone.value;
            // Add more types here as needed
            default:
                return false;
        }
    }

    // Mark a milestone as completed
    completeMilestone(milestoneName) {
        const milestone = this.milestones.find(m => m.name === milestoneName);
        if (milestone && milestone.canBeCompleted) {
            milestone.isCompleted = true;
            milestone.canBeCompleted = false;
        }
        this.addEffects();
        this.startCountdown(30000);
    }

    // Get milestones that can be completed
    getCompletableMilestones() {
        return this.milestones.filter(milestone => milestone.canBeCompleted);
    }

    // Get milestones that are already completed
    getCompletedMilestones() {
        return this.milestones.filter(milestone => milestone.isCompleted);
    }

    getHappinessBonus() {
        const totalMilestones = this.milestones.length;
        const completedMilestones = this.milestones.filter(milestone => milestone.isCompleted || milestone.canBeCompleted).length;
    
        // Calculate happiness bonus
        const happinessBonus = totalMilestones > 0 
            ? 10 * (completedMilestones / totalMilestones) 
            : 0;
    
        return happinessBonus; // Return as a percentage with 2 decimal places
    }

    startCountdown(duration) {
        if (this.countdownActive) {
            this.countdownRemainingTime += duration;
        } else {
            this.countdownRemainingTime = duration;
            this.countdownActive = true;
        }
    }

    addEffects(){
        this.removeEffects();

        festivalEffects.forEach((effect) => {
            addEffect({...effect, sourceId: 'festival'})
          });
    }

    removeEffects(){
        festivalEffects.forEach((effect) => {
            removeEffect({...effect, sourceId: 'festival'})
          });
    }
}
