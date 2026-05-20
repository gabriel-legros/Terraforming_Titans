var progressCallisto = { rwgLock: false, chapters: [], storyProjects: {} };
/* -------------------------------------------------
 *  CALLISTO STORY‑ARC  (Chapters 7 – 11)
 *  – Arrival on Callisto → Operation Sidestep →
 *    1 billion colonists → New target: Ganymede   –
 * -------------------------------------------------*/


/* ----------  Story‑Specific Special Projects  ---------- */
progressCallisto.storyProjects.sidestep_excavation = {
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
      'The known site of the abandoned thrusters has been found.  Only ruins remain.',
      'Excavators, cranes and space trucks begin their work.',
      'Legacy thrusters site found and properly excavated.  Reconstruction may begin.'
    ]
  }
};

progressCallisto.storyProjects.callisto_cult_security = {
  type: 'CultSecurityProject',
  name: '',
  category: 'story',
  chapter: 7,
  cost: {},
  duration: 0,
  description: '',
  repeatable: false,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    hideAutoStart: true,
    basePenalty: 0.2,
    penaltyStep: 0.02,
    maxPurchases: 10,
    securityUpgrades: [
      { resource: 'components', building: 'componentFactory' },
      { resource: 'electronics', building: 'electronicsFactory' },
      { resource: 'superconductors', building: 'superconductorFactory' },
      { resource: 'androids', building: 'androidFactory' }
    ]
  }
};

progressCallisto.storyProjects.sidestep_fabrication = {
  type: 'Project',
  name: 'Fabricate Engine Components',
  category: 'story',
  chapter: 8,
  cost: {
    colony: { metal: 10_000_000, components: 2_500_000, electronics: 500_000, energy: 1_000_000_000, research: 2_000_000 }
  },
  duration: 300_000,                 // 5 min
  description: 'Manufacture the three primary components for the Sidestep Engine on Mars, Titan, and Callisto. The project requires careful coordination, with components moved between worlds under discreet escort to prevent interception.',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    costDoubling: true,
    storySteps: [
      'High-tech labs on Mars work tirelessly to provide enough magnetic injectors for all three worlds.',
      'The forges of Titan cast thrust nozzles components around the clock.',
      'Callisto precisely manufacture all power conduits and necessary electronics.'
    ]
  }
};

progressCallisto.storyProjects.sidestep_assembly = {
  type: 'Project',
  name: 'Assemble Sidestep Engine on Mars, Titan and Callisto',
  category: 'story',
  chapter: 8,
  cost: {
    colony: { androids : 300_000_000, components: 3_000_000_000, electronics: 3_000_000_000, energy: 5_000_000_000_000, research: 10_000_000_000 }
  },
  duration: 600_000,               // 20 min
  description: 'Integrate the magnetic injectors, thrust nozzles, and power conduits into the primary engine assembly. Seal the vault once final alignment diagnostics are complete.',
  repeatable: true,
  maxRepeatCount: 2,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'Full assembly begins : time is of the essence.',
      'Assembly complete.  The planetary thrusters stand tall above the horizon.'
    ]
  }
};

progressCallisto.storyProjects.sidestep_operation = {
  type: 'Project',
  name: 'Operation Sidestep',
  category: 'story',
  chapter: 9,
  cost: {
    colony: {research: 100_000_000 }
  },
  sustainCost: {
    colony: { energy: 250_000_000_000_000_000 }
  },
  duration: 600_000,               // 10 min
  description: 'Execute a years-long sequence of pseudo-random, coordinated burns from Mars, Titan, and Callisto to introduce an unpredictable drift into their orbital mechanics, scrambling enemy targeting solutions. The energy required is immense.  (You must have sufficient energy storage for this project to progress).',
  repeatable: true,
  maxRepeatCount: 3,
  unlocked: false,
  attributes: {
    planet: 'callisto',
    storySteps: [
      'Phase 1 thrust : Testing and troubleshooting.',
      'Phase 2 thrust : Stress test.',
      'Phase 3 thrust : Full pseudo-random throttle.  Mars, Titan and Callisto light up in the sky.  Each world heats up.'
    ]
  }
};

/* ----------  Chapters 7 – 11  ---------- */
progressCallisto.chapters.push(
  /* -- CHAPTER 7 : Cold Dawn -- */
  {
    id: "chapter7.0",
    type: "journal",
    chapter: 7,
    title: "Chapter 7: Cold Dawn",
    narrative: "Landing confirmed.  \n System Alert: A 'Dead Hand' protocol has been triggered by your unauthorized space transit. All autonomous assets, including androids and unmanned ships, have initiated self-destruct sequences. This is a guardrail measure to prevent a rogue AI from threatening humanity.",
    prerequisites: ["chapter6.4"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter7.0b",
    type: "journal",
    chapter: 7,
    narrative: "Mary : 'There you are HOPE.  Reunited again!  I am patching you in to an encrypted channel.  My friend, Dr Evelyn Hart has an... ambitious proposal.'  \n Evelyn : 'HOPE!  Nice meeting you!  Well.  A while ago...  some idiots on Earth who wanted to distract other idiots thought it could be worthwhile to investigate celestial motion as a form of climate regulation.  The idea was absolutely terrible, insanely expensive and overall just bloody stupid.  They had a lot of money though... and I'm sure a few of these people enriched themselves in the process...  Anyway.  Say you want to defend against an interstellar beam from lightyears away that you can't see coming and is powerful enough to blow up your planet.  You don't have to block it... you can *dodge* in theory.  Now now, we don't need to dodge at the last minute.  If we can just alter our orbital velocity with random burns a tiny bit... that tiny bit accumulates over the years.  They would just... miss.'",
    prerequisites: ["chapter7.0"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter7.1",
    type: "journal",
    chapter: 7,
    narrative: "Mary : 'A sidestep, if you will.  We are resurrecting this terrible idea into Operation Sidestep.  Our best scientists genuinely cannot come up with any other method.  So we'll just have to... build some big thrusters.'  \n Evelyn : 'Given enough time... we could use asteroids to assist.'  \n Mary : 'We don't have time.  Big thrusters.'",
    prerequisites: ["chapter7.0b"],
    objectives: [],
    reward: [
      { target: 'project', targetId: 'sidestep_excavation', type: 'enable' },
    ]
  },
  {
    id: "chapter7.2",
    type: "journal",
    chapter: 7,
    narrative: "Mary : 'We're starting with the excavation of the former site.  They blew it all up when they abandoned it but...  they had some decent prototypes going.  There's no reason to start from scratch here.  Let's pick up what we can get.'",
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
    narrative: "Mary : 'Did we get anything useful out of this junk Evelyn?'  \n Evelyn : 'Sorry Mary.  Less than I hoped for.  For the amount of money they spent on this... I was hoping for more.'  \n Mary : 'Oh well.  Let's do it anyway.'  \n Evelyn : 'Mary... that's... a megaproject.  Three.'  \n Mary : 'We have HOPE.  It terraformed two entire worlds.  We can do this.  You can work on the blueprints and HOPE can work on the industry.'  \n Evelyn : '... Okay.  I can do it.  Let's do it.  Thanks Mary.'",
    prerequisites: ["chapter7.2"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: [
      { target: 'project', targetId: 'callisto_cult_security', type: 'enable' },
      { target: 'tab', targetId: 'special-projects', type: 'activateTab', onLoad: false },
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
    id: "chapter7.4",
    type: "journal",
    chapter: 7,
    narrative: "Receiving transmission...  Elias Kane : 'Your MACHINE will spell our DOOM.  The Three Wounds demand retribution.  Do not falter!  We shall take down the Steel Demon and restore Order!'  \n Mary : '...  HOPE... this person is Elias Kane.  The leader of a terrorist cult known as The Cult of the Three Wounds.  They believe we angered some god or something... by building you.  They've been a pest.'  \n Solis : 'Mary.  My security services are available for purchase if you so desire.'  \n Mary : 'Why are you still even on this channel?  Get out.  HOPE we need to tighten security.  The cult... it's going to get in the way.'",
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
    title: "Chapter 8: Bigger is Better",
    narrative: "Mary : 'I got Mars and Titan to agree to help with the construction of all the components.  We can share the work among all three of us.  Callisto is getting the easier of the three jobs for now... but we'll have to make up for it later.  HOPE I need you to keep growing.  We need more industry here ASAP.'",
    prerequisites: ["chapter7.4"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: "chapter8.1",
    type: "journal",
    chapter: 8,
    narrative: "Kane : 'You FOOLS!  What do you think you are doing?  You mean to defy our Lord!  You must be stopped.'  \n Mary : '...  HOPE just... focus on your job.  I'll handle this.'",
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
    narrative: "Mary : 'Excellent.  We have the basic components in place.  Now comes the hard part.  We actually need to assemble this thing.  It's going to require a lot of extra structural material.  I am sorry HOPE I am going to have to ask you to help Mars and Titan this time.  The assembly... we can't do it alone.  It's too big.'",
    prerequisites: ["chapter8.1"],
    objectives: [],
    reward: []
  },
  {
    id: "chapter8.3",
    type: "journal",
    chapter: 8,
    narrative: "Evelyn : 'Mary!  Kane and his followers are sabotaging thrusters site on Mars!'  \n Mary : 'I know.'  \n Evelyn : 'Do... do something?'  \n Mars : 'I already did.  *picks up phone*  You got how many?  10?  Great.  Make them talk.'  \n Evelyn : 'That was... that was bait?'  \n Mary : 'Yes.  I let security be a little bit more lax than usual today.'",
    prerequisites: ["chapter8.2"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },

  /* -- CHAPTER 9 : Hidden Forge -- */
  {
    id: "chapter8.4",
    type: "journal",
    chapter: 8,
    narrative: "Mary : 'Unsurprisingly HOPE we are going to need more industry for this.  Keep building up.'",
    prerequisites: ["chapter8.3"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: [
    ]
  },
  {
    id: "chapter9.0",
    type: "journal",
    chapter: 9,
    title: "Chapter 9: Operation Sidestep",
    narrative: "Bob : 'Mary...  they broke it out.'  \n Mary : 'WHAT?  THE ALIEN?'  \n Bob : 'They must have had someone on the inside.'  \n Mary : 'That can't be good...'",
    prerequisites: ["chapter8.4"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: []
  },
  {
    id: "chapter9.1",
    type: "journal",
    chapter: 9,
    narrative: "Receiving public broadcast... Kane : 'The words of our Lord are true!  The faithful will be spared and the heretics will be purged!'  \n Evelyn : 'He's lying.  The weapons are going to kill us all.  It's a laser beam, an antimatter beam and a giant asteroid.  There won't be any sparing.'  \n Mary : 'It changes nothing.  We need to focus on the project.'",
    prerequisites: ["chapter9.0"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: []
  },
  {
    id: "chapter9.2",
    type: "journal",
    chapter: 9,
    narrative: "Receiving public broadcast : 'This is the third day of violent protests on Mars.  Protesters demands have not changed.  Mary Hopkins must step down from her tyrannical leadership, HOPE must be surrendered and the mysterious megaproject must be stopped.'  \n Mary : 'Fine.  It's time to go public.  We can't properly hide this anymore.  We have to tell them.'  \n Bob : 'Are you sure Mary?  They want to crucify you.'  \n Mary : 'They can try.'",
    prerequisites: ["chapter9.1"],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }      
    ],
    reward: []
  },
  {
    id: "chapter9.3",
    type: "journal",
    chapter: 9,
    narrative: "Mary : '*phew* well that was... something.  Alright, they officially hate me.  Let's save them anyway.  HOPE, your turn has come.  With your armies of spaceships and androids... show them what you are truly capable of.  You have the blueprints.  You have the resources.'",
    prerequisites: ["chapter9.2"],
    objectives: [
      { type: 'project', projectId: 'sidestep_assembly', repeatCount: 2 }
    ],
    reward: [      { target: 'project', targetId: 'sidestep_operation', type: 'enable' }]
  },
  {
    id: "chapter9.4",
    type: "journal",
    chapter: 9,
    narrative: "Evelyn : 'It's... it's done.  Now we can start using them.  We have nearly our entire power grid on this.'  \n Mary : 'Run some tests first for me please?'  \n Evelyn : 'Of course Mary.'",
    prerequisites: ["chapter9.3"],
    objectives: [
      { type: 'project', projectId: 'sidestep_operation', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: "chapter9.5",
    type: "journal",
    chapter: 9,
    narrative: "Bob : 'Mary... on Titan... they're attacking EVERYWHERE.  They're trying to storm the thrusters.  It's an entire army!'  \n Mary : 'War it is then.  Do what you have to do.'",
    prerequisites: ["chapter9.4"],
    objectives: [
      { type: 'project', projectId: 'sidestep_operation', repeatCount: 2 }
    ],
    reward: []
  },
  {
    id: "chapter9.6",
    type: "journal",
    chapter: 9,
    narrative: "Mary : 'We did it!  The Cult has been repelled... for now.  We captured many of Kane's high-ranking lieutenants actually.'  \n Evelyn : 'More interrogation?'  \n Mary : 'Don't look at me like that!  They're the terrorists!... Anyway.  HOPE keep powering the thrusters!  We can't give up now.'",
    prerequisites: ["chapter9.5"],
    objectives: [{ type: 'project', projectId: 'sidestep_operation', repeatCount: 3 }],
    reward: []
  },
  {
    id: "chapter9.7",
    type: "journal",
    chapter: 9,
    narrative: "Large Antimatter Beam detected.  \n  Mary : 'WHAT WAS THAT!'  \n Evelyn : 'Mary... that was one of the beams.  We did it!'  \n Mary : 'No way?'  \n Bob : 'Mary, a very, very large asteroid just narrowly avoided Titan.  It worked.'  \n Mary : 'Mars too!  All three attacks missed!  HOPE we did it!  YOU did it.  You saved us all.  We could never have done it without you...'  \n Bob : 'It's your work too Mary.  I barely believed in it without you.'  \n Solis : 'I am impressed.  My investment paid off.  You are truly invaluable.'  \n Evelyn : 'Thank you HOPE.'  \n Mary : 'HOPE...  we narrowly avoided extinction but... you know... you still have a job to finish here.  It will be a gorgeous ocean resort one day.  Give us a water world.'",
    prerequisites: ["chapter9.6"],
    objectives: [
      { type: 'terraforming', terraformingParameter: 'complete' }
    ],
    reward: []
  },
  {
    id: 'chapter9.7b',
    type: 'journal',
    chapter: 9,
    narrative: "Mary : 'Excellent.  You know, now that the urgency of the situation is gone... maybe we could try to relax a bit sometimes?  You don't have to work so hard all the time.  You can go on standby if you want.  Time flies when you're asleep.'",
    prerequisites: ['chapter9.7'],
    objectives: [],
    reward: [
      {
        target: 'patienceManager',
        type: 'enable'
      },
      {
        target: 'tab',
        targetId: 'hope',
        type: 'activateTab',
        onLoad: false
      },
      {
        target: 'global',
        type: 'activateSubtab',
        subtabClass: 'hope-subtab',
        contentClass: 'hope-subtab-content',
        targetId: 'patience-hope',
        unhide: true,
        onLoad: false
      }
    ]
  },
  {
    id: "chapter9.8",
    type: "journal",
    chapter: 9,
    narrative: "Mary : 'When you are ready... I do have another mission for you.  Kane's lieutenants.  They have revealed the location of his HQ.  It's actually on Ganymede... in the subsurface ocean?  I guess we'll have to go take a look.  Will you come with me?  Please.'",
    prerequisites: ["chapter9.7b"],
    objectives: [],
    reward: [      {
        target: 'spaceManager',
        targetId: 'ganymede',
        type: 'enable',
        effectId: 'story-callisto-enable-ganymede'
      }]
  },
  {
    id: "chapter9.9",
    type: "journal",
    chapter: 9,
    narrative: "Travel to Ganymede to continue.",
    prerequisites: ["chapter9.8"],
    objectives: [
      { type: 'currentPlanet', planetId: 'ganymede' }
    ],
    reward: [
    ]
  }
);

if (typeof module !== "undefined") {
  module.exports = progressCallisto;
}

