function getMilestoneText(path) {
    try {
        return t(path, null, '');
    } catch (error) {
        return '';
    }
}

const festivalEffects = [
    {
        target: 'fundingModule',
        type: 'productionMultiplier',
        value : 3,
        name: getMilestoneText('catalogs.milestones.festivalName')
    },
    {
        target: 'building',
        targetId: 'oreMine',
        type: 'productionMultiplier',
        value: 3,
        name: getMilestoneText('catalogs.milestones.festivalName')
    },
    {
        target: 'building',
        targetId: 'componentFactory',
        type: 'productionMultiplier',
        value: 3,
        name: getMilestoneText('catalogs.milestones.festivalName')
    },
    {
        target: 'building',
        targetId: 'electronicsFactory',
        type: 'productionMultiplier',
        value: 3,
        name: getMilestoneText('catalogs.milestones.festivalName')
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

function getGlobalFestivalDurationBonusMs() {
    if (!globalEffects || !globalEffects.activeEffects) {
        return 0;
    }
    let bonus = 0;
    for (let i = 0; i < globalEffects.activeEffects.length; i += 1) {
        const effect = globalEffects.activeEffects[i];
        if (effect.type === 'festivalDurationBonusMs') {
            bonus += effect.value || 0;
        }
    }
    return bonus;
}

const terraformingMilestones = 
    [
        {
        id: 'temperature_1',
        type : 'temperature',
        value : 1e-4,
        name : getMilestoneText('catalogs.milestones.terraforming.temperature_1.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.temperature_1.description'),
    }, {
        id: 'temperature_2',
        type : 'temperature',
        value : 1e-3,
        name : getMilestoneText('catalogs.milestones.terraforming.temperature_2.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.temperature_2.description'),
    }, {
        id: 'temperature_3',
        type : 'temperature',
        value : 1e-2,
        name : getMilestoneText('catalogs.milestones.terraforming.temperature_3.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.temperature_3.description'),
    }, {
        id: 'temperature_4',
        type : 'temperature',
        value : 0.1,
        name : getMilestoneText('catalogs.milestones.terraforming.temperature_4.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.temperature_4.description'),
    }, {
        id: 'temperature_5',
        type : 'temperature',
        value : 1,
        name : getMilestoneText('catalogs.milestones.terraforming.temperature_5.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.temperature_5.description'),
    }, {
        id: 'pressure_1',
        type : 'pressure',
        value : 0.01,
        name : getMilestoneText('catalogs.milestones.terraforming.pressure_1.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.pressure_1.description'),
    }, {
        id: 'pressure_2',
        type : 'pressure',
        value : 0.1,
        name : getMilestoneText('catalogs.milestones.terraforming.pressure_2.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.pressure_2.description'),
    }, {
        id: 'pressure_3',
        type : 'pressure',
        value : 5,
        name : getMilestoneText('catalogs.milestones.terraforming.pressure_3.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.pressure_3.description'),
    }, {
        id: 'pressure_4',
        type : 'pressure',
        value : 100,
        name : getMilestoneText('catalogs.milestones.terraforming.pressure_4.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.pressure_4.description'),
    }, {
        id: 'pressure_5',
        type : 'pressure',
        value : 1e3,
        name : getMilestoneText('catalogs.milestones.terraforming.pressure_5.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.pressure_5.description'),
    }, {
        id: 'water_1',
        type : 'water',
        value : 1000,
        name : getMilestoneText('catalogs.milestones.terraforming.water_1.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.water_1.description'),
    }, {
        id: 'water_2',
        type : 'water',
        value : 1e6,
        name : getMilestoneText('catalogs.milestones.terraforming.water_2.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.water_2.description'),
    }, {
        id: 'water_3',
        type : 'water',
        value : 1e9,
        name : getMilestoneText('catalogs.milestones.terraforming.water_3.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.water_3.description'),
    }, {
        id: 'water_4',
        type : 'water',
        value : 1e12,
        name : getMilestoneText('catalogs.milestones.terraforming.water_4.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.water_4.description'),
    }, {
        id: 'water_5',
        type : 'water',
        value : 1e15,
        name : getMilestoneText('catalogs.milestones.terraforming.water_5.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.water_5.description'),
    }, {
        id: 'life_1',
        type : 'life',
        value : 1,
        name : getMilestoneText('catalogs.milestones.terraforming.life_1.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.life_1.description'),
    }, {
        id: 'life_2',
        type : 'life',
        value : 1000,
        name : getMilestoneText('catalogs.milestones.terraforming.life_2.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.life_2.description'),
    }, {
        id: 'life_3',
        type : 'life',
        value : 1e6,
        name : getMilestoneText('catalogs.milestones.terraforming.life_3.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.life_3.description'),
    }, {
        id: 'life_4',
        type : 'life',
        value : 1e9,
        name : getMilestoneText('catalogs.milestones.terraforming.life_4.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.life_4.description'),
    }, {
        id: 'life_5',
        type : 'life',
        value : 1e12,
        name : getMilestoneText('catalogs.milestones.terraforming.life_5.name'),
        description : getMilestoneText('catalogs.milestones.terraforming.life_5.description'),
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
                result[milestone.id || milestone.name] = {
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
        if (!state) {
            return;
        }

        this.removeEffects();

        this.countdownActive = false;
        this.countdownRemainingTime = 0;

        if (this.countdownElement) {
            this.countdownElement.remove();
            this.countdownElement = null;
        }

        if (typeof document !== 'undefined') {
            const festivalContainer = document.getElementById('festival-container');
            if (festivalContainer && festivalContainer.querySelectorAll) {
                festivalContainer.querySelectorAll('.festival-countdown').forEach(element => element.remove());
            }
        }

        if (state.milestones) {
            this.milestones.forEach(milestone => {
                const savedMilestone = state.milestones[milestone.id] || state.milestones[milestone.name];
                if (savedMilestone) {
                    milestone.isCompleted = savedMilestone.isCompleted || false;
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
        this.startCountdown(30000 + getGlobalFestivalDurationBonusMs());
    }

    completeAllMilestones() {
        const completableMilestones = this.getCompletableMilestones().slice();
        completableMilestones.forEach(milestone => this.completeMilestone(milestone.name));
        return completableMilestones.length;
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
