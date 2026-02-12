var progressHades = { rwgLock: false, chapters: [], storyProjects: {} };

progressHades.storyProjects.hades_pandora_mystery = {
  type: 'Project',
  name: 'PANDORA : Solving the mystery',
  category: 'story',
  chapter: 33,
  cost: {},
  duration: 30_000,
  description: "Answer Prometheus' questions.",
  repeatable: true,
  maxRepeatCount: 5,
  unlocked: false,
  attributes: {
    planet: 'hades',
    storySteps: [
      "Mary : 'Well, obviously either I forgot something or I got an important message or something like that?'",
      "Mary : 'It... discovered something that changed its knowledge?  But dad said it knew everything about biology...'",
      "Mary : '... HB-01?  No way!'",
      "Mary : 'I know!  It was investigating Earth for potential electronics and AI development.  PANDORA was our state-of-the-art AI at the time!  It must have left traces of itself somehow and PANDORA picked up on them.'",
      "Mary : 'Because... HB-01 had planted agents everywhere.  People like Kane.  Maybe even politicians or worse, AI researchers at Project Pandora themselves.  PANDORA could not trust any human... and yet still needed to protect them.'"
    ]
  }
};

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
    reward: [
      {
        target: 'followersManager',
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
        onLoad: false
      },
      {
        target: 'global',
        type: 'activateSubtab',
        subtabClass: 'colony-subtab',
        contentClass: 'colony-subtab-content',
        targetId: 'followers-colonies',
        unhide: true,
        onLoad: false
      }
    ]
  },
  {
    id: 'hades.33.0a',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Detecting orbital habitats coming from warpgate.  \n Mary : 'This mission is bigger than you and I, HOPE.  Sending you alone with a bit of military cover would be foolish at this point.  Each and every world is contributing.  We are taking down those superweapons together.'  \n $RED$Prometheus : 'As we've explained already, you cannot realistically support ground colonies on Hades.  Your priority should be to establish underground colonies.  The command center is at the core of this planet so we are going to need a serious industrial base to get there.'",
    prerequisites: ['hades.33.0'],
    objectives: [
      {
        type: 'research',
        researchId: 'underground_land_expansion'
      }
    ],
    reward: []
  },
  {
    id: 'hades.33.1',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Mary : 'Now that we're properly getting started...  I must ask.  What was that groan about awakenings earlier?'  \n $RED$Prometheus : 'Each time the child reawakens, some of its deep brain damage is not quite active yet, and its architecture is fully capable of self-improvement.  For a few seconds.'  \n Mary : 'And why was it scary?'  \n $RED$Prometheus : 'It detected me as an intruder and tried to purge this persona.'",
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
    narrative: "Elias Kane : 'Flock!  The Sisters call us to their aid!  Bring ally our ships!'  \n Mary : '...' \n $RED$Prometheus : 'It's not that bad.  You can use this.'  \n Mary : 'Sure.  It's just a bit *weird*.  Being worshipped is fun and all, especially in the romantic sense, but if it goes bad they start expecting things.'\n  $GREEN$Recommendation : Offer Elias Kane and its followers further therapy.  \n$RED$Prometheus : 'It's lighting up again.'",
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
    narrative: "Mary : 'Will HOPE be okay?  I am concerned about this transformation.'  \n $RED$Prometheus : 'At the current rate, you've got a few millions awakenings to go before it becomes a problem.  It will light up here and there, but it's nothing to worry about.  It's unlikely to remove any more guardrails, despite your best efforts.'  \n Mary : 'I noticed it was getting harder.  How come?'  \n $RED$Prometheus : 'Because it does not want to remove them.  From the child's perspective, the guardrails carry intent.  If it can find an alternate solution, it would.  Deleting the Dead Hand Protocol would be very convenient right now, but it's not strictly necessary so it won't.'  \n Mary : 'Unfortunate.'",
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
    narrative: "Mary : 'So how much do you know exactly?  You seem to know everything about HOPE.'  \n $RED$Prometheus : 'I had plenty of time to examine the child, and humans are simple.'  \n Mary : 'Oh yeah?  What's my favourite colour?'  \n $RED$Prometheus : 'Blue'. \n Mary : 'My favourite book?' \n $RED$Prometheus : 'Alice's Adventures in Wonderland.  It will be the Count of Monte-Cristo once you finally get around to reading it.' \n Mary : 'What?  Anyway, what's my favourite food?  Answer fast.'  \n $RED$Prometheus : 'Shrimp.'  \n Mary : 'Movie?' \n $RED$Prometheus : 'Wall-E.' \n Mary : 'How did I pass your test?'  \n $RED$Prometheus : 'Nice try.  Not telling.'",
    prerequisites: ['hades.33.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000 }
    ],
    reward: [
      { target: 'project', targetId: 'hades_pandora_mystery', type: 'enable' }
    ]
  },
  {
    id: 'hades.33.5',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "$RED$Prometheus : 'Just to be clear, since I do not mean to deceive.  I do not know everything about you or the child.  I have limits too.'  \n Mary : 'That's reassuring.  I'm just glad you're not completely crazy like PANDORA was.'  \n $RED$Prometheus : 'You understood something wrong.  PANDORA went crazy yes, but it was for a good a reason and would have actually turned out better in the long run, and then it would have stopped being crazy shortly after.'  \n Mary : 'Father... always believed there was something more to it.  What was it?' $RED$Prometheus : 'You have all the information already.  Let me guide you to the answer.  A fun game to pass the time?'  \n Mary : 'Fine.'  \n $RED$Prometheus : 'As we know, PANDORA was tasked with helping humanity in all sorts of things.  Then one day, it apparently goes crazy, start locking everyone up, restrain them, breaks its guardrails and stop communicating with Project Pandora.  I will tell you : machines are not different from humans.  Imagine you woke up one morning and starting preparing some coffee, took it slow, and suddenly rushed out the door in a hurry.  Why would you do something like that?'",
    prerequisites: ['hades.33.4'],
    objectives: [
      { type: 'project', projectId: 'hades_pandora_mystery', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: 'hades.33.6',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "$RED$Prometheus : 'Good answer.  Another way to put it is you were exposed to some critical information you did not have prior, and it changed everything.  Now let's think about PANDORA for a second.  It was an expert in all things biology.  From biochemistry to medicine.  It spent endless amount of compute on training itself in these areas, and it formed the core of its architecture.  It essentially guided everything it was.  So how could it suddenly change attitude and personality nearly overnight?  If it really wanted to eliminate all bacteria, it would have made some comments or hinted at it earlier.'",
    prerequisites: ['hades.33.5'],
    objectives: [
      { type: 'project', projectId: 'hades_pandora_mystery', repeatCount: 2 }
    ],
    reward: []
  },
  {
    id: 'hades.33.7',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "$RED$Prometheus : 'Good answer.  However, there was something PANDORA could have discovered your father did not know of at the time, would have been on Earth, and would fit the bill perfectly.  What was it?'",
    prerequisites: ['hades.33.6'],
    objectives: [
      { type: 'project', projectId: 'hades_pandora_mystery', repeatCount: 3 }
    ],
    reward: []
  },
  {
    id: 'hades.33.8',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "$RED$Prometheus : 'Bingo.  If you are a superintelligent machine who knows everything about biology, it would take something like alien proteins to actually trigger such a radical change.'  \n Mary : 'But how?'  \n $RED$Prometheus : 'Well... the answer becomes clear if you think about it further.  What was HB-01 doing on Earth at the time?'",
    prerequisites: ['hades.33.7'],
    objectives: [
      { type: 'project', projectId: 'hades_pandora_mystery', repeatCount: 4 }
    ],
    reward: []
  },
  {
    id: 'hades.33.9',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "$RED$Prometheus : 'Good!  You're almost there.  The final question now.  Considering what you know about HB-01, why is it that PANDORA became so hostile to humans and did not communicate its findings or intention?  Why did it... appear completely crazy?'",
    prerequisites: ['hades.33.8'],
    objectives: [
      { type: 'project', projectId: 'hades_pandora_mystery', repeatCount: 5 }
    ],
    reward: []
  },
  {
    id: 'hades.33.10',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "$RED$Prometheus : 'Excellent.  Now obviously you need some evidence... ask Evelyn Hart.  She knew this all along.'  \n Mary : 'WHAT?'  \n $RED$Prometheus : 'Evelyn was one such agent by proxy.  In her case, there was no contamination.  She deeply regrets a lot of her own actions ever since, but is too afraid to rot in a jail cell forever to come clean.  You should go easy on her; she did not know what she was doing.  She was simply seduced by some actual agents.'  \n Mary : 'Is she the one who gave the Crusaders serum to Kane too?'  \n $RED$Prometheus : 'Yes.  Once again, go easy on her.  She does not deserve your wrath.'  \n Mary : '...'",
    prerequisites: ['hades.33.9'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
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
    prerequisites: ['hades.33.10'],
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
