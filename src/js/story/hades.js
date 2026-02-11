var progressHades = { rwgLock: false, chapters: [], storyProjects: {} };

/* -------------------------------------------------
 *  HADES PLACEHOLDER STORY (Chapters 33 - 35)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

progressHades.chapters.push(
  {
    id: 'hades.33.0',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    title: 'Chapter 33: The invisible enemy',
    narrative: "Confirmed arrival in the shadow of Hades.  \n Mary : 'Good.  We cannot see the pulsar from here and honestly I hope we don't ever see it.  Humans are immune to cancer but there's still only so much damage we can take.'  \n $RED$Prometheus : 'Hrnnnggg, these awakenings are scarier than I thought.  HOPE, activate the signal now.' \n Activating countermeasure signal...  \n Mary : 'How do we know if your automated defenses are off?'  \n $RED$Prometheus : 'They are.  The signal is coming from an AI.  More precisely, it is coming from an AI that contains a copy of myself.  These defenses cannot tell the difference between my true self and this copy.'  \n Mary : 'Alright, I choose to believe you.  Bob!  Send in the orbitals through the gate now.'",
    prerequisites: ['tartarus.32.13'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'hades.33.0a',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Detecting orbital habitats coming from warpgate.  \n Mary : 'This mission is bigger than you and I, HOPE.  Sending you alone with a bit of military cover would be foolish at this point.  Each and every world is contributing.  We are taking down those superweapons together.'  \n $RED$Prometheus : 'As we've explained already, you cannot realistically support ground colonies on Hades.  Your priority should be to establish underground colonies.'",
    prerequisites: ['hades.33.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'hades.33.1',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Placeholder: Establish first shelters on the airless surface.",
    prerequisites: ['hades.33.0a'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'hades.33.2',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Placeholder: Initial pulse-cycle observations archived.",
    prerequisites: ['hades.33.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'hades.33.3',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Placeholder: Logistics route stabilizes for baseline growth.",
    prerequisites: ['hades.33.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: []
  },
  {
    id: 'hades.33.4',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Placeholder: Surface operations move to continuous shifts.",
    prerequisites: ['hades.33.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: []
  },
  {
    id: 'hades.33.5',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Placeholder: New districts are plotted near hardened caverns.",
    prerequisites: ['hades.33.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 2_000 }
    ],
    reward: []
  },
  {
    id: 'hades.33.6',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Placeholder: First industrial cluster reaches full utilization.",
    prerequisites: ['hades.33.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: 'hades.34.0',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    title: 'Chapter 34: Pulsefront Expansion',
    narrative: "Placeholder: Strategic expansion begins across equatorial plateaus.",
    prerequisites: ['hades.33.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'hades.34.1',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Placeholder: Supply throughput scales with regional depots.",
    prerequisites: ['hades.34.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'hades.34.2',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Placeholder: Habitat shielding receives major revision.",
    prerequisites: ['hades.34.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'hades.34.3',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Placeholder: Pulse-event contingencies integrated into planning.",
    prerequisites: ['hades.34.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'hades.34.4',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Placeholder: Continuous fabrication network comes online.",
    prerequisites: ['hades.34.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'hades.34.5',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Placeholder: Transit infrastructure reaches planetwide coverage.",
    prerequisites: ['hades.34.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: 'hades.34.6',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Placeholder: Hades command nexus shifts to long-cycle operations.",
    prerequisites: ['hades.34.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'hades.35.0',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    title: 'Chapter 35: Black Signal',
    narrative: "Placeholder: Deep-system assets report anomalous pulse harmonics.",
    prerequisites: ['hades.34.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'hades.35.1',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "Placeholder: Outer mining arcs stabilize despite hostile conditions.",
    prerequisites: ['hades.35.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'hades.35.2',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "Placeholder: Command confirms full-spectrum infrastructure readiness.",
    prerequisites: ['hades.35.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: 'hades.35.3',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "Placeholder: Planetary logistics enter megascale operations.",
    prerequisites: ['hades.35.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'hades.35.4',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "Placeholder: Final expansion corridor opens for mass migration.",
    prerequisites: ['hades.35.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: []
  },
  {
    id: 'hades.35.5',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "Placeholder: Hades colony threshold complete at ten billion residents.",
    prerequisites: ['hades.35.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000_000 }
    ],
    reward: []
  }
);

try {
  module.exports = progressHades;
} catch (err) {}
