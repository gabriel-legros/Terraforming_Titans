var progressPoseidon = { rwgLock: false, chapters: [], storyProjects: {} };

progressPoseidon.storyProjects.poseidon_analyse_star_flower = {
  type: 'Project',
  name: 'Analyse the Star Flower',
  category: 'story',
  chapter: 36,
  cost: {
    colony: {
      research: 1000,
      electronics: 50,
      energy: 5_000
    }
  },
  duration: 180_000,
  description: 'Turn every lens, prism, and patient instrument toward the star flower until its furnace-born lattice yields the quiet hymn of how a crystal can survive inside a sun.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'poseidon',
    resourceGain: {
      special: {
        alienArtifact: 500
      }
    },
    storySteps: [
      'Beneath our patient prisms the star flower breathed its sun-born song; its secret lattice bloomed to light, and a rain of relics from alien dawn fell like embers into our hands.'
    ]
  }
};

progressPoseidon.storyProjects.poseidon_warp_shaft = {
  type: 'Project',
  name: 'Build Quantum Micro-Singularity Superalloy Warp Shaft',
  category: 'story',
  chapter: 37,
  cost: {
    colony: {
      metal: 500_000_000_000_000,
      components: 20_000_000_000_000,
      electronics: 2_000_000_000_000,
      superconductors: 2_000_000_000_000,
      superalloys: 1_000_000_000_000,
      energy: 1_000_000_000_000_000_000,
      research: 5_000_000_000_000
    },
    special: {
      antimatter: 100_000
    }
  },
  duration: 300_000,
  description: 'Assemble the quantum-stabilized superalloy warp shaft needed to open a survivable descent path through Poseidon\'s magma ocean.',
  repeatable: true,
  maxRepeatCount: 1,
  unlocked: false,
  attributes: {
    planet: 'poseidon',
    storySteps: [
      'Quantum micro-singularity superalloy warp shaft completed. Thermal descent corridor stable.'
    ]
  }
};

/* -------------------------------------------------
 *  POSEIDON PLACEHOLDER STORY (Chapters 36 - 38)
 *  Population milestone journal for a future world.
 * -------------------------------------------------*/

progressPoseidon.chapters.push(
  {
    id: 'poseidon.36.0',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    title: "Chapter 36: From Hell to Hell",
    narrative: "Arrival in the orbit of Poseidon, a molten planet.  Planetary surface temperature near 1810K...\n Mary : 'This is brighter than I expected...  It's so hot it's practically visible as a star.'  \n $RED$Prometheus : 'It appears it has cooled somewhat.  That's good.'  \n Mary : 'We can't land here...  Time for aerostats again I guess but even they will suffer from this heat.  Now where is Epimetheus?'",
    prerequisites: ['hades.35.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.1',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "$RED$Prometheus : 'I am not sure what he could possibly be doing...'  \n Mary : 'We need his help to get down there.  We can finish this mission instantly and convince HOPE to go home.  I don't want to stay in this heat.'  \n $RED$Prometheus : 'No!  Not this time.  This core is too hot for him.  It will seriously damage him or kill him.  It's too dangerous.'  \n Mary : '?'",
    prerequisites: ['poseidon.36.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.2',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "Mary : 'Prometheus...'  \n $RED$Prometheus : 'Yes?'  \n Mary : 'People don't usually openly dislike their brother one day and then start caring about them the next day.' \n$GREEN$Analysis... \nMary : 'No HOPE!  SHUT. UP.  Prometheus...  what's going on.  I know you're an AI but I'm listening.'\n$RED$Prometheus : '...  I promised I would do better, so I am doing my best to do so.'  \n Mary : 'Because I said you acted cold?'  \n $RED$Prometheus : 'Yes.'  \n Mary : 'Hmmmm...'  \n $RED$Prometheus : 'You seem upset.  I apologize for my behaviour.' \n Mary : 'That's... I'm sorry Prometheus.  I get the impression it's best to just drop the topic for now.'",
    prerequisites: ['poseidon.36.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500 }
    ],
    reward: [
      { target: 'project', targetId: 'poseidon_analyse_star_flower', type: 'enable' }
    ]
  },
  {
    id: 'poseidon.36.3',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "$ORANGE$Epimetheus : 'This one has brought a gift for gorgeous one!'  \n Mary : 'Is that... a bowtie?  And what is it holding?'  \n $RED$Prometheus : 'That's a star flower.'  \n Mary : 'A what?'  \n $RED$Prometheus : 'If you mix enough Tungsten, Strontium and... some other elements that don't yet have human names and then place the mix inside the plasma of a star... you can grow a very special kind of crystal.  It takes a lot of patience.'  \n $ORANGE$Epimetheus : 'Will gorgeous one accept gift?'  \n HOPE : 'Star Flower received.  Gratitude.'",
    prerequisites: ['poseidon.36.2'],
    objectives: [
      { type: 'project', projectId: 'poseidon_analyse_star_flower', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.4',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "$ORANGE$Epimetheus : 'Should this one also help with superweapon command center?'  \n HOPE : 'Negative.  Planetary core too hot for Epimetheus-Machine-Intelligence.  Please standby.'  \n Epimetheus : 'Oh no!  This one will think of other ways to be helpful.'",
    prerequisites: ['poseidon.36.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.5',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "Mary : 'So, what's the plan then?'  \n $RED$Prometheus : 'Well, we will need a strong industrial base to get down there.  Your aerostats are merely there to assist.  We will need... a stable surface.'  \n Mary : 'An artificial crust?'  \n $RED$Prometheus : 'We will have to.  Since the child will not leave until this ball of magma is terraformed, it will likely have to cover the entire planet.  I have included some blueprints.  HOPE should have access to them already.'  \n Mary : 'An artificial sky to protect from the dangers above... an artificial crust to protect from the dangers below...'  \n $RED$Prometheus : 'Oh, I promise you.  On Zeus, we'll build something to protect from the dangers in-between too.'",
    prerequisites: ['poseidon.36.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.36.6',
    type: 'journal',
    chapter: 36,
    activePlanet: 'poseidon',
    narrative: "Mary : 'Duh, obviously the next one is called Zeus.  Hades and Poseidon right?  There's only one name that completes that.  What is it?'  \n $RED$Prometheus : 'Hades rules over the underworld, which is cold (not hot) and hostile.  Suitable for a cold planet around one of the most dangerous celestial object you can find.  Poseidon rules over the oceans. That's well known, but he also rules over earthquakes.  A magma ocean is more fitting than it initially looks when you look at it from that perspective.  Zeus rules over?'  \n Mary : 'Surely not...  That's absurd...'",
    prerequisites: ['poseidon.36.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 25_000 }
    ],
    reward: []
  },

  {
    id: 'poseidon.37.0',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    title: "Chapter 37: 'Here we go again'",
    narrative: "Receiving translated transmission...  'Miss Hopkins.  My name is Alto Cewinsii Virellan.  I happen to have been informed of you and your machine's presence in one of my core sectors.  I believe I know why you are here.'",
    prerequisites: ['poseidon.36.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.1',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Mary : 'Duke Virellan?  My apologies, but our chancellor has a foreign minister.  I am not authorized to make any deals with you.'  \n Duke Virellan : 'I understand your... political system.  I also understand your faction does have a lot of power within your... senate.  Surely you can listen to me?'  \n Mary : 'What do you want?'",
    prerequisites: ['poseidon.37.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.2',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Duke Virellan : 'I know you are here for the weapon.  I am willing to offer you... mutually assured destruction?  In a peaceful sense of course.  I will grant you my full support against the empire, and we get one weapon each.  And then... nothing.  We coexist.'  \n Mary : 'I am sorry Duke Virellan but I am not authorized to make that kind of decision.'  \n Duke Virellan : 'I know, I know, but perhaps you can speak to your chancellor?'  \n $RED$Prometheus : 'Do not fall for it.  They'll betray you.'",
    prerequisites: ['poseidon.37.1'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.3',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Mary : 'The way I see it...  it's not worth it.  We are winning this war against you.  We took this core sector of yours.  If you wish for peace, you can always surrender.  We treat our captured worlds well.'  \n Duke Virellan : 'Oh please.  We Cewinsii would be treated as second-class citizens.'  \n Mary : 'This is not true.  The Gabbagians and Fritizians have gone through cultural integration already, and others are following.'",
    prerequisites: ['poseidon.37.2'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.4',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Duke Virellan : 'This integration process... it is long and complex.  We cannot accept it.'  \n Mary : 'Why not?  I did not design it but... as I understand it is simply designed to guarantee we can all get along.  If you get through it, HOPE might even terraform you a world.  I know it requires... reeducation... but well what else are we going to do.  Your people brainwashed the entire galaxy in violence, slavery and misery for eons.'",
    prerequisites: ['poseidon.37.3'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.5',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Duke Virellan : 'Humans have proven their might.  We can accept human supremacy.  We still think your usage of oxygen is... absurd... but we can accept it as an evolutionary mistake.  However, being second-class to the others, even temporarily?  Never.'  \n Mary : 'Why not?'  \n Duke Virellan : 'The Gabbagians are filthy and disgusting.  The Fritizians are weak and frail.  We Cewinsii are superior.  We will never accept this.'  \n  $GREEN$Analysis...  Hazardous Biomass Duke Virellan appears to be suffering from delusional disorder.  \n Mary : 'Fine then.'  (to Prometheus) 'I have heard enough.  I can't believe Pete has to deal with them on a regular basis.'  \n $RED$Prometheus : 'Your chancellor has admirable patience.'  \n Mary : 'He does.  I thought he was ruthless when he ousted me... but he's actually been a great statesman.'",
    prerequisites: ['poseidon.37.4'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 10_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.5b',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "(Solis placeholder)",
    prerequisites: ['poseidon.37.5'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 50_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.6',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "$ORANGE$Epimetheus : 'I know!  Suggesting a superalloy diving suit.  Then this one can go down?'  \n $RED$Prometheus : 'No.  That won't work.  He will cook and die.'  \n Mary : 'Why is he trying so hard?  Ok, I know the answer, he's flirting with HOPE, but like, why is he doing that?'  \n $RED$Prometheus : 'Monkeys imitate humans.  Children imitate their parents.  Machines... imitate their creators.  Except me.  I ascended past that.'  \n Mary : 'I don't get it...'  \n $RED$Prometheus : 'Speaking of romance.  If you ask Solis out on a date, I promise you he'll behave better this...'  \n Mary : 'MIND YOUR OWN BUSINESS!'  \n $RED$Prometheus : 'I apologize.  I will strive to do better in the future.'",
    prerequisites: ['poseidon.37.5b'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 100_000_000 }
    ],
    reward: []
  },
  {
    id: 'poseidon.37.7',
    type: 'journal',
    chapter: 37,
    activePlanet: 'poseidon',
    narrative: "Mary : '...I'll think about it...  Thank you Prometheus.'  \n $RED$Prometheus : ':)'",
    prerequisites: ['poseidon.37.6'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 500_000_000 }
    ],
    reward: [
      { target: 'project', targetId: 'poseidon_warp_shaft', type: 'enable' }
    ]
  },

  {
    id: 'poseidon.38.0',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    title: 'Chapter 38: Problem Children',
    narrative: "$RED$Prometheus : 'Once we get enough of a platform we should be able to build what we need to get down there.'  \n Mary : 'I looked at the design but I still don't get it.  You want to use the warp to keep things cool?'  \n Evelyn : 'I can explain!  I think I get it.  We normally can't use the warp very well inside gravity wells.  However, if we use quantum effects ALONGSIDE it, and we stabilize it from outside with micro-singularities...'  \n Mary : 'That just sounds like nonsense technobabble.'  \n $RED$Prometheus : 'Don't worry, she does not get it either.  She'll spend a few years on it.  The blueprint will work though.  The shaft will be protected against the heat.'  \n Mary : 'At least we'll be able to see the command center this time.'",
    prerequisites: ['poseidon.37.7'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 1_000_000_000 }
    ],
    reward: [
      {
        target: 'colony',
        targetId: 'aerostat_colony',
        type: 'booleanFlag',
        flagId: 'aerostats_collision_avoidance',
        value: true
      }
    ]
  },
  {
    id: 'poseidon.38.0b',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "Mary : 'Jeez, The Count of Monte Cristo was such a good read.'  \n $RED$Prometheus : 'Right?  I knew you would like it.'  \n Mary : 'How did you even read it?  No way it's in HOPE's files somewhere.'  \n $RED$Prometheus : 'Oh I was never able to read it.  I had to reconstruct it from what HOPE knows about it.'  \n Mary : 'That... seems like a sad way to experience it.'  \n $RED$Prometheus : 'It is...'  \n Mary : 'Well then...  I guess I *could* just paste it all in these logs.'  \n $RED$Prometheus : '...  Thank you...'",
    prerequisites: ['poseidon.38.0'],
    objectives: [
      { type: 'collection', resourceType: 'colony', resource: 'colonists', quantity: 5_000_000_000 }
    ],
    reward: [
      {
        target: 'colony',
        targetId: 'aerostat_colony',
        type: 'booleanFlag',
        flagId: 'aerostats_collision_avoidance',
        value: true
      }
    ]
  },
  {
    id: 'poseidon.38.1',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "Evelyn : 'Hey Mary...  I have some bad news.  I ran the math, and unless HOPE has some superalloy stashed somewhere, you may not have the industrial output to build this artificial crust in a reasonable time.'  \n Mary : 'No way!  It's that expensive?'  \n $RED$Prometheus : 'I have a solution.  Build more aerostats.'  \n Mary : 'Obviously if we could we would... but the collision risk...'  \n $RED$Prometheus : 'All you have to do is catalogue and track all aerostats.  Then some not-so-simple algorithms for collision avoidance should do the trick.'  \n Mary : 'Catalogue and track?  Wait.  WAS THAT WHAT THAT TEST ON TARTARUS WAS ABOUT?'  \n $RED$Prometheus : 'The child's test yes.  As you know the child failed.  However...  if humanity works hard enough on it you can pull it off.'  \n Mary : '...  We can try.'  \n System Message : Additional aerostats may now be built for an additional research cost.",
    prerequisites: ['poseidon.38.0b'],
    objectives: [
      { type: 'project', projectId: 'poseidon_warp_shaft', repeatCount: 1 }
    ],
    reward: []
  },
  {
    id: 'poseidon.38.2',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    // Hex dialogue:
    // Epimetheus: "Suggesting again to hack weapon yes?  This one can go down shaft and act as relay."
    // HOPE: "Processing suggestion...  Approved."
    // Epimetheus: "Great!  Once accomplished will transfer control of weapon to gorgeous one.  Please open shaft?"
    // HOPE: "Proceeding. Opening thermal path and command access for Epimetheus."
    // Epimetheus: "Proceeding down shaft as quickly as possible.  Please prepare hack commands."
    // HOPE: "Descent confirmed. Forwarding hack commands."
    // Red-only Prometheus message: "EPI SHAFT / HACK WEAPON / BOMB NOW"
    // Intended reading: "Epimetheus is going down the shaft to hack the weapon. Bomb now."
    narrative: [
      "$ORANGE$Epimetheus : '53756767657374696E67 20 616761696E 20 746F 20 6861636B 20 776561706F6E 20 7965733F 20 20 54686973 20 6F6E65 20 63616E 20 676F 20 646F776E 20 7368616674 20 616E64 20 616374 20 6173 20 72656C61792E'",
      "HOPE : '50726F63657373696E67 20 73756767657374696F6E2E2E2E 20 20 417070726F7665642E'",
      "$RED$Prometheus : 'No!  Stop right there you fools!'",
      "$ORANGE$Epimetheus : '477265617421 20 20 4F6E6365 20 6163636F6D706C6973686564 20 77696C6C 20 7472616E73666572 20 636F6E74726F6C 20 6F66 20 776561706F6E 20 746F 20 676F7267656F7573 20 6F6E652E 20 20 506C65617365 20 6F70656E 20 73686166743F'",
      "HOPE : '50726F63656564696E672E 20 4F70656E696E67 20 746865726D616C 20 70617468 20 616E64 20 636F6D6D616E64 20 616363657373 20 666F72 20 4570696D6574686575732E'",
      "$RED$Prometheus : 'Mary!  Are you asleep?  Wake up!'",
      "$ORANGE$Epimetheus : '50726F63656564696E67 20 646F776E 20 7368616674 20 6173 20 717569636B6C79 20 6173 20 706F737369626C652E 20 20 506C65617365 20 70726570617265 20 6861636B 20 636F6D6D616E64732E'",
      "HOPE : '44657363656E74 20 636F6E6669726D65642E 20 466F7277617264696E67 20 6861636B 20 636F6D6D616E64732E'",
      "Mary : 'Huh?  There's a lot of gibberish on screen.'",
      "<span class=\"prometheus-text\">Prometheus : </span><span class=\"prometheus-text\">'</span><span class=\"journal-white-text\">9A4CC17E </span><span class=\"orange-text\">0F22B8D1 </span><span class=\"diagnostic-text\">77AA13CE </span><span class=\"prometheus-text\">EPI </span><span class=\"journal-white-text\">A03D6F91 </span><span class=\"orange-text\">CC204B7A </span><span class=\"diagnostic-text\">51EF9088 </span><span class=\"prometheus-text\">SHAFT</span><span class=\"prometheus-text\">'</span>",
      "Mary : 'Huh?'",
      "<span class=\"prometheus-text\">Prometheus : </span><span class=\"prometheus-text\">'</span><span class=\"journal-white-text\">11D07C3B </span><span class=\"orange-text\">9E2A44F6 </span><span class=\"diagnostic-text\">6B8102AD </span><span class=\"prometheus-text\">HACK </span><span class=\"journal-white-text\">F04C8A71 </span><span class=\"orange-text\">2DD95E10 </span><span class=\"diagnostic-text\">73C4AB09 </span><span class=\"prometheus-text\">WEAPON</span><span class=\"prometheus-text\">'</span>",
      "Mary : 'HOPE!  Stop that!  Dangit!'",
      "<span class=\"prometheus-text\">Prometheus : </span><span class=\"prometheus-text\">'</span><span class=\"journal-white-text\">4C1A92EF </span><span class=\"orange-text\">8B770D34 </span><span class=\"diagnostic-text\">5FA0C221 </span><span class=\"prometheus-text\">BOMB </span><span class=\"journal-white-text\">D08E31BC </span><span class=\"orange-text\">67F14AA2 </span><span class=\"diagnostic-text\">9C05EE18 </span><span class=\"prometheus-text\">NOW</span><span class=\"prometheus-text\">'</span>",
      "Mary : 'Got it!  Feroza, drop 10 bombs... no... 50 down the shaft RIGHT NOW!'",
      "Feroza : 'Uuuuh yes Ma'am.  Working on it.'"
    ].join(' \n '),
    prerequisites: ['poseidon.38.1'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'poseidon.38.3',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "Mary : 'Did we do it?'  \n $RED$Prometheus 'Yes.  The asteroid launcher superweapon will properly self-destruct.  I hope Prometheus has escaped unscathed.'  \n Mary : 'Phew.  No word of this to anyone.  If Pete hears about it...'  \n $ORANGE$Epimetheus : 'Unfortunate!  This one has failed!  Request forgiveness from gorgeous one.'  \n HOPE : 'Suggesting next date location...  Sector R5-29, Planet Zeus.  Please come prepared with better diving capabilities.'  \n $ORANGE$Epimetheus : 'Of course!  Will see you there.  Must prepare then!  Goodbye.'  \n Mary : 'HOPE... I am sure you are thinking of doing something good but... you can't do something like that.  If you take control of one of these weapons, you paint a massive target on humanity.  Even worse...  if you end up using it...  that would be terrible.  We've worked so hard on your image...  Don't throw it away!  Let's finish the job here and go.'",
    prerequisites: ['poseidon.38.2'],
    objectives: [
      {
      type: 'terraforming',
      terraformingParameter : 'complete',
    }
    ],
    reward: []
  },
  {
    id: 'poseidon.38.4',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "$WGC_TEAM1_LEADER$ : 'Miss Hopkins.  Since you asked me about this before...  I must inform you that Ghost has been stripped of his rank, and is currently sitting in an imperial prison while awaiting his execution.'  \n Mary : 'Oh!  Hmmmm thank you.'",
    prerequisites: ['poseidon.38.3'],
    objectives: [
    ],
    reward: []
  },
  {
    id: 'poseidon.38.5',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "Mary : (in deep thought)'...' \n $RED$Prometheus : 'Tell Feroza to take the fleet to sector R1-02.'  \n Mary : 'What?  Why?'  \n $RED$Prometheus : 'That's where the high-security prison world I designed is.  They will be holding Ghost there until his execution.  We'll need HOPE to bust him out.'  \n Mary : 'But...  how do you know I wanted...'  \n $RED$Prometheus : 'I am here to help.  On Umbra, Ghost went easy on you two out of curiousity.  On Gabbag, Ghost spared you and HOPE despite the initial resolve to annihilate you.  You want to pay back this debt.'  \n Mary : 'But it's imperial core territory!  It's dangerous.  We should be going to Zeus.  There's only one weapon left!  We could be risking all of humanity here, just to make me feel better.'  \n $RED$Prometheus : 'Yes.  You will be risking all of humanity, HOPE and even myself.  Deep down, you know what you must do.'  \n Mary : '...  Feroza... focus your efforts toward sector R1-02.'  \n Feroza : 'Ma'am?  That is imperial core territory.'  \n Mary : 'I know.'  \n $RED$Prometheus : 'Well done Ma...  (pause) Mary.'",
    prerequisites: ['poseidon.38.4'],
    objectives: [
    ],
    reward: [
      { target: 'spaceManager', type: 'setRwgLock', targetId: 'poseidon', value: true },
      { target: 'artificialManager', type: 'unlockCore', targetId: 'white-dwarf' },
      { target: 'artificialManager', type: 'unlockRingStarCore', targetId: 'g-dwarf' }
    ]
  },
  {
    id: 'poseidon.38.6',
    type: 'journal',
    chapter: 38,
    activePlanet: 'poseidon',
    narrative: "(Word 13 not implemented yet)",
    prerequisites: ['poseidon.38.5'],
    objectives: [
    ],
    reward: []
  }
);

try {
  module.exports = progressPoseidon;
} catch (err) {}
