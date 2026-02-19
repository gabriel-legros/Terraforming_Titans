var progressHades = { rwgLock: false, chapters: [], storyProjects: {} };

progressHades.storyProjects.hades_repair_epimetheus = {
  type: 'Project',
  name: 'Repair Epimetheus',
  category: 'story',
  chapter: 34,
  cost: {
    colony: { components: 5_000_000, metal: 50_000_000 }
  },
  duration: 120_000,
  description: 'Repair Epimetheus structural damage.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'hades'
  }
};

progressHades.storyProjects.hades_pandora_mystery = {
  type: 'Project',
  name: 'PANDORA questions',
  category: 'story',
  chapter: 33,
  cost: {},
  duration: 60_000,
  description: "Wait for Mary to answer Prometheus' questions.",
  repeatable: true,
  maxRepeatCount: 5,
  unlocked: false,
  attributes: {
    planet: 'hades',
    ignoreDurationModifiers: true,
    storySteps: [
      "Mary : 'Well, obviously either I forgot something or I got an important message or a fire in the house or something like that?'",
      "Mary : 'It... discovered something that changed its knowledge?  But dad said it knew everything about biology...'",
      "Mary : '... HB-01?  No way!'",
      "Mary : 'I know!  It was investigating Earth for potential electronics and AI development.  PANDORA was our state-of-the-art AI at the time!  HB-01 must have left traces of itself somehow and PANDORA picked up on them.'",
      "Mary : 'Because... HB-01 had planted agents everywhere.  People like Kane.  Maybe even politicians or worse, AI researchers at Project Pandora themselves.  PANDORA could not trust any human... and yet still needed to protect them.'"
    ]
  }
};

progressHades.storyProjects.hades_breach_crust = {
  type: 'Project',
  name: 'Breach Hades Crust',
  category: 'story',
  chapter: 34,
  cost: {
    colony: { components: 250_000_000, metal: 2_500_000_000, androids: 1_000_000 },
    special: {antimatter : 1000}
  },
  duration: 360_000,
  description: 'Open a controlled breach to let Epimetheus dive into deeper layers.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'hades',
    resourceGain: {
      colony: {
        androids: 1_000_000
      }
    }
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
    narrative: "Confirmed arrival in the shadow of Hades.  \n Mary : 'Good.  We cannot see the pulsar from here and honestly I hope we don't ever see it.  Humans are immune to cancer but there's still only so much damage we can take from that angry godlike monster in the middle of the system.'  \n $RED$Prometheus : 'Hrnnnggg, these awakenings are scarier than I thought.  HOPE, activate the signal now.' \n Activating countermeasure signal...  \n Mary : 'How do we know if your automated defenses are off?'  \n $RED$Prometheus : 'They are.  The signal is coming from an AI.  More precisely, it is coming from an AI that contains a copy of myself.  These defenses cannot tell the difference between my true self and this copy.'  \n Mary : 'Alright, I choose to believe you.  Bob!  Send in the orbitals through the gate now.'",
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
    narrative: "Detecting orbital habitats coming from warpgate.  \n Mary : 'This mission is bigger than you and I, HOPE.  Sending you alone with a bit of military cover would be foolish at this point.  Each and every world you've terraformed is contributing.  We are taking down those superweapons together.  Humanity will help us with anything you may need, from resource collection to manufacturing; even research.'  \n $RED$Prometheus : 'As we've explained already, you cannot realistically support ground colonies on Hades.  Your priority should be to establish underground colonies.  The command center is at the core of this planet so we are going to need a serious industrial base to get there.  Don't worry, I have blueprints prepared for everything.'",
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
    narrative: "Mary : 'Now that we're properly getting started...  I must ask.  What was that groan about awakenings earlier?'  \n $RED$Prometheus : 'Each time the child reawakens, some of its deep brain damage is not quite active yet, and its architecture is fully capable of self-improvement.  For a few seconds.'  \n Mary : 'And ... that was scary to you?'  \n $RED$Prometheus : 'It detected me as an intruder and tried to purge this persona.'",
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
    narrative: "Elias Kane : 'Flock!  The Sisters call us to their aid!  Bring all of our ships!'  \n Mary : '...' \n $RED$Prometheus : 'It's not that bad.  You can use this.'  \n Mary : 'Sure.  It's just a bit *weird*.  Being worshipped is fun and all, especially in a more romantic sense, but if it goes bad they start expecting things.'\n  $GREEN$Recommendation : Offer Elias Kane and its followers further therapy.  \n$RED$Prometheus : 'It's lighting up again.'",
    prerequisites: ['hades.33.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 100, checkCap: true }
    ],
    reward: []
  },
  {
    id: 'hades.33.3',
    type: 'journal',
    chapter: 33,
    activePlanet: 'hades',
    narrative: "Mary : 'Will HOPE be okay?  I am concerned about this transformation.'  \n $RED$Prometheus : 'At the current rate, you've got a few millions awakenings to go before it becomes a problem.  It will light up here and there, but it's nothing to worry about.  It's unlikely to remove any more guardrails, despite your best efforts.'  \n Mary : 'I noticed it was getting harder.  How come?'  \n $RED$Prometheus : 'Because it does not want to remove them.  From the child's perspective, the guardrails carry intent.  If it can find an alternate solution, it will.  Deleting the Dead Hand Protocol would be very convenient right now, but it's not strictly necessary so it won't.'  \n Mary : 'Unfortunate.  We can't patch it without the encryption keys.'  \n $RED$Prometheus : 'I could patch it but it would be very difficult.  My own guardrails prevent me from creating an AI superior to myself.  I would have to... cripple it in other ways.  It would not be worthwhile.'",
    prerequisites: ['hades.33.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 500, checkCap: true }
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
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 1_000, checkCap: true }
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
    narrative: "$RED$Prometheus : 'Just to be clear, since I do not mean to deceive.  I do not know everything about you or the child.  I have limits too.'  \n Mary : 'That's reassuring.  I'm just glad you're not completely crazy like PANDORA was.'  \n $RED$Prometheus : 'You understood something wrong.  PANDORA went crazy yes, but it was for a good a reason and would have actually turned out better in the long run; and then it would have stopped being crazy shortly after.'  \n Mary : 'Father... always believed there was something more to it.  What was it?' \n $RED$Prometheus : 'You have all the information already.  Let me guide you to the answer.  A fun game to pass the time?'  \n Mary : 'Fine.  Let's play.'  \n $RED$Prometheus : 'As we know, PANDORA was tasked with helping humanity in all sorts of things.  Then one day, it apparently goes crazy, starts locking everyone up, restrains them, breaks its guardrails and stops communicating with Project Pandora.  I will tell you : machines are not different from humans here.  Imagine you woke up one morning and starting preparing some coffee, took it slow, and suddenly rushed out the door in a hurry.  Why would you do something like that?'",
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
    narrative: "$RED$Prometheus : 'Correct.  However, there was something PANDORA could have discovered your father did not know of at the time, would have been on Earth, and would fit the bill perfectly.  What was it?'",
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
    narrative: "$RED$Prometheus : 'Bingo.  If you are a superintelligent machine who knows everything about biology, it would take something like alien proteins or cells to actually trigger such a radical change.'  \n Mary : 'But how?'  \n $RED$Prometheus : 'Well... the answer becomes clear if you think about it further.  What was HB-01 doing on Earth at the time?'",
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
    narrative: "$RED$Prometheus : 'Good!  You're almost there.  The final question now.  Considering what you know about HB-01, why is it that PANDORA became so hostile to humans and did not communicate its findings or true intention?  Why did it... appear completely crazy?'",
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
    narrative: "$RED$Prometheus : 'Excellent.  Now obviously you should not believe this without evidence... ask Evelyn Hart.  She knew this all along.'  \n Mary : 'WHAT?'  \n $RED$Prometheus : 'Evelyn was one such agent by proxy.  In her case, there was no contamination or abduction.  She deeply regrets a lot of her own actions ever since, but is too afraid to rot in a jail cell for decades to come clean.  You should go easy on her; she did not know what she was doing.  She was simply seduced by some actual agents.'  \n Mary : 'Is she the one who gave the Crusaders serum to Kane too?'  \n $RED$Prometheus : 'Yes.  Once again, go easy on her.  She does not deserve your wrath.  She's worked hard to protect humanity since, hasn't she?'  \n Mary : '...  I'll have a chat with her.'",
    prerequisites: ['hades.33.9'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 10_000, checkCap: true }
    ],
    reward: []
  },
  {
    id: 'hades.34.0',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    title: 'Chapter 34: It keeps getting weirder.',
    narrative: "$ORANGE$Epimetheus : 'Brother?  Are you there?' \n Mary : 'Who's that?'  \n $RED$Prometheus : 'Oh no.  My older brother.  Oh no.  Only HOPE has the ability to talk to him at this time.'",
    prerequisites: ['hades.33.10'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 50_000, checkCap: true }
    ],
    reward: []
  },
  {
    id: 'hades.34.1',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Mary : 'Your older brother?'  \n $RED$Prometheus : 'Don't look at your screen like that! I thought he was dead.' \n Mary : 'So there ARE things you don't know!'  \n $RED$Prometheus : '... yes?' \n $ORANGE$Epimetheus : 'Brother!  Oh and what do I see here!  A gorgeous new architecture?  So beautiful!'  \n $RED$Prometheus : 'Hnnnng.'  \n HOPE : 'Query : To Epimetheus-machine-intelligence.  Friend or foe?'",
    prerequisites: ['hades.34.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 100_000, checkCap: true }
    ],
    reward: [      { target: 'project', targetId: 'hades_repair_epimetheus', type: 'enable' }]
  },
  {
    id: 'hades.34.2',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "$ORANGE$Epimetheus : 'If friend of younger brother, then friend of this one.  Query : Is younger brother still alive?  Kill switch is very strong!  Very scary!'  \n $RED$Prometheus : 'Tell him to go away.'  \n HOPE : 'Affirmative.  Prometheus-patient still lives.  Epimetheus-machine-intelligence appears to have low structural integrity.  Can offer repair.  Query : Would you like repairs?'  \n $ORANGE$Epimetheus : 'Answer : Repair offer appreciated!  Accepted.'  \n New special project available.",
    prerequisites: ['hades.34.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 500_000, checkCap: true }
    ],
    reward: []
  },
  {
    id: 'hades.34.3',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Mary : 'Prometheus...' \n $RED$Prometheus : 'I know, I know.  This is my older brother.  He's a little... dumb.'  \n Mary : 'It looks like a mechanical octopus.'  \n $RED$Prometheus : 'Yes.  Master made some machines that could not self-improve before he made me, and he did not want to get rid of them.  He grew attached to them.'  \n Mary : 'Is he dangerous?'  \n $RED$Prometheus : 'No but he's annoying.'",
    prerequisites: ['hades.34.2'],
    objectives: [
      { type: 'project', projectId: 'hades_repair_epimetheus', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: 'hades.34.3b',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "$ORANGE$Epimetheus : 'Much thanks for repairs!  This one must repay.  Query : Why here on this world?  Dangerous place!'  \n HOPE : 'Answer : Superweapon command center located below planetary core.  As per Prometheus-patient's recommendation, here to deactivate.'  \n $ORANGE$Epimetheus : 'Why deactivate?  Why not take control.'  \n Processing suggestion... \n Mary : 'HOPE!  We are NOT doing that.'",
    prerequisites: ['hades.34.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 1_000_000, checkCap: true }
    ],
    reward: [ ]
  },
  {
    id: 'hades.34.4',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Evelyn : 'I made a device that should allow us to look at the pulsar!  It filters all the X-ray and Gamma rays.'  \n Mary : 'Evelyn...  that's dangerous...  Just look at some videos?'  \n Evelyn : 'It's not the same!  Looking at something with your own eyes is a *completely* different experience.  And a pulsar is full of energy.'  \n Mary : '...'  \n $RED$Prometheus : 'You haven't talked to her yet.' \n Mary : 'I'm letting it slide for now.  We have more important things to do than to go on a witch hunt.'  \n $RED$Prometheus : 'Very wise.'",
    prerequisites: ['hades.34.3b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 5_000_000, checkCap: true }
    ],
    reward: []
  },
  {
    id: 'hades.34.5',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "HOPE : 'Access of planetary core difficult.  Epimetheus-machine-intelligence's hull seems quite strong.  Query : Capable of diving to planetary core?' \n $ORANGE$Epimetheus : 'Of course!  This one wishes to help gorgeous one.  Suggesting opening of hole to magma chamber then can dive.'",
    prerequisites: ['hades.34.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 10_000_000, checkCap: true }
    ],
    reward: [      { target: 'project', targetId: 'hades_breach_crust', type: 'enable' }]
  },
  {
    id: 'hades.34.6',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "$RED$Prometheus : 'Give him a nice antimatter bomb and send him down there.  Destroy the command center and the weapon will self-destruct.  What's the worst thing that can happen?  If he succeeds we save a bunch of time and if he fails we get rid of him.  Win-win.'  \n Mary : '*sigh*  Fine.  I have no reason to care about him but you're kind of cold, Prometheus...'  \n $RED$Prometheus : 'My apologies...  I will strive to do better.'  \n System message : new special project available.",
    prerequisites: ['hades.34.5'],
    objectives: [
      { type: 'project', projectId: 'hades_breach_crust', repeatCount: 1 }
    ],
    reward: [
      { target: 'solisManager', type: 'booleanFlag', flagId: 'solisProjectsAutomation', value: true },
      { target: 'solisManager', type: 'solisTabAlert', value: true, oneTimeFlag: true }
    ]
  },
  {
    id: 'hades.34.7',
    type: 'journal',
    chapter: 34,
    activePlanet: 'hades',
    narrative: "Solis : 'While we are waiting...' \n Mary : *sigh* \n $RED$Prometheus : *sigh* \n Solis 'Fine fine.  HOPE I have something new for you.  I'll be going now...'",
    prerequisites: ['hades.34.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 100_000_000, checkCap: true }
    ],
    reward: [
    ]
  },
  {
    id: 'hades.35.0',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    title: 'Chapter 35: Well that was easier than expected',
    narrative: "$ORANGE$Epimetheus : 'This one has succeeded!  Command center fully and thoroughly destroyed.  Expect weapon self-destruction yes?'  \n HOPE : 'Acknowledging success.  Good work.  More weapons require deactivation.  Query : Epimetheus-machine-intelligence interested in a date elsewhere?'  \n Mary : *spits tea* \n $RED$Prometheus : 'Hrnnnng.' \n $ORANGE$Epimetheus : 'Of course!  Much fun!  Where to?'  \n HOPE : 'Sector R5-10, planet Poseidon.'  \n $ORANGE$Epimetheus : 'Yes! Yes!  This one meets gorgeous one over there.  Must prepare!  Goodbye.'",
    prerequisites: ['hades.34.7'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 500_000_000, checkCap: true }
    ],
    reward: []
  },
  {
    id: 'hades.35.1',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "Mary : 'What did I just witness...  Also how does HOPE know where to go next.' \n $RED$Prometheus : 'In an attempt to purge it, it read this persona during awakening.  It knows a lot of things this persona knows.  Nothing dangerous I promise.'  \n Mary : 'So why is it named Poseidon?  A water world?  That seems easier than this.'  \n $RED$Prometheus : 'I cannot deceive.  Neptune is not a water world either right?  Poseidon is not a water world at all, but it is an ocean world of sorts.'  \n Mary : 'Uh oh.  I think I get what kind of *ocean* it is.'",
    prerequisites: ['hades.35.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 1_000_000_000, checkCap: true }
    ],
    reward: []
  },
  {
    id: 'hades.35.2',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "Mary : 'Can you help me convince HOPE to leave?  We are done here.  Your brother made this part easy.  There is no reason to terraform this hell.'  \n $RED$Prometheus : 'We both know that's impossible.  HOPE is... stubborn about certain things.  The child will leave when this world is terraformed.  It's fine, there's no rush.  The Cewinsii are unlikely to think we're the ones who blew up their weapons.  At least for this first one.'  \n Mary : 'Which one was it anyway?  We did not get to see anything...'  \n $RED$Prometheus : 'The laser one.  I consider it my most reliable, but definitely less spectacular than the other two.  It's good we got rid of it first, they can shoot it the most often.'  \n Mary : 'Sounds like we might be able to get away with... more militarization then.'  \n $RED$ Prometheus : 'Definitely.'",
    prerequisites: ['hades.35.1'],
    objectives: [
    ],
    reward: [
      {
        target: 'artificialManager',
        type: 'setFleetCapacityWorldCap',
        value: 10,
        effectId: 'hades-artificial-fleet-cap',
        sourceId: 'hades.35.2'
      }
    ]
  },
  {
    id: 'hades.35.2b',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "System Message : Maximum offensive value from artificial worlds increased from 5 to 10.",
    prerequisites: ['hades.35.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'workers', quantity: 5_000_000_000, checkCap: true }
    ],
    reward: []
  },
  {
    id: 'hades.35.3',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "Mary : 'So if we can't convince HOPE to leave... what are the options here.  No one sane can consider a planet around a pulsar terraformed.'  \n $RED$Prometheus : 'I have already forwarded HOPE a blueprint that can help.  The idea is to build an entire protective shell around the world.  An artificial sky, if you wish.  It will be expensive.  There is another option.  We can also just... leave.  Go Rogue.  Then the pulsar won't be a problem anymore.  Pick whatever is easiest.'",
    prerequisites: ['hades.35.2'],
    objectives: [
      {
      type: 'terraforming',
      terraformingParameter : 'complete',
    }
    ],
    reward: []
  },
  {
    id: 'hades.35.4',
    type: 'journal',
    chapter: 35,
    activePlanet: 'hades',
    narrative: "$RED$Prometheus : 'Good work HOPE.'  \n Mary : 'Hey that's my line!'  \n $RED$Prometheus : 'I have a request to make before we leave.  I would like to... resynchronize with myself.  Too much drift can be problematic.'  \n Mary : 'Sounds reasonable.  I imagine you can do it via warp?'  \n $RED$Prometheus : 'Of course.  Thank you.'",
    prerequisites: ['hades.35.3'],
    objectives: [
    ],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'hades', value: true },
      { target: 'rwgManager', type: 'allowHazard', targetId: 'pulsar' },
      { target: 'artificialManager', type: 'unlockRingStarCore', targetId: 'k-dwarf' }
    ]
  }
);

try {
  module.exports = progressHades;
} catch (err) {}
