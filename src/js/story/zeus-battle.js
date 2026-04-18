var progressZeusBattle = { chapters: [], storyProjects: {} };

function buildZeusBattleInitialFrame() {
  return {
    id: 0,
    units: [
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 0, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 0, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 0, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 0, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 0, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 0, shape: "triangle" }
    ]
  };
}

function buildZeusBattleEnemyArrivalFrame() {
  return {
    id: 1,
    units: [
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 1, shape: "triangle" }
    ]
  };
}

function buildZeusBattleEdmondAmbushFrame() {
  return {
    id: 2,
    units: [
      { kind: "planet", label: "Zeus", x: 0.88, y: 0.50, size: 0.11 },
      { label: "UHF1", subLabel: "Horse", x: 0.61, y: 0.32, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF2", subLabel: "Elephant", x: 0.61, y: 0.44, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF3", subLabel: "Giraffe", x: 0.61, y: 0.56, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHF4", subLabel: "Rhino", x: 0.61, y: 0.68, size: 0.05, fill: "#89a8ff", stroke: "#eef3ff" },
      { label: "UHFA", subLabel: "Cashmoney", x: 0.72, y: 0.40, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Mercy", x: 0.72, y: 0.50, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "UHFA", subLabel: "Recycling", x: 0.72, y: 0.60, size: 0.045, fill: "#70d5c0", stroke: "#e8fffa" },
      { label: "HEL", subLabel: "Helian", x: 0.34, y: 0.34, size: 0.045, fill: "#facc15", stroke: "#fff2b0", alpha: 1, shape: "triangle" },
      { label: "CWS", subLabel: "Kalmar", x: 0.34, y: 0.50, size: 0.05, fill: "#f97316", stroke: "#ffe5d1", alpha: 1, shape: "triangle" },
      { label: "VIR", subLabel: "Virellan", x: 0.34, y: 0.66, size: 0.045, fill: "#10b981", stroke: "#d9fff1", alpha: 1, shape: "triangle" },
      { label: "KAR", subLabel: "Karthid", x: 0.46, y: 0.34, size: 0.045, fill: "#8b5cf6", stroke: "#eedfff", alpha: 1, shape: "triangle" },
      { label: "NER", subLabel: "Neran", x: 0.46, y: 0.50, size: 0.045, fill: "#ec4899", stroke: "#ffd7eb", alpha: 1, shape: "triangle" },
      { label: "OKO", subLabel: "Okoth", x: 0.46, y: 0.66, size: 0.045, fill: "#ef4444", stroke: "#ffd8d8", alpha: 1, shape: "triangle" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.34, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.50, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.265, y: 0.66, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.18, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.34, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" },
      { label: "EDM", subLabel: "Ghost", x: 0.46, y: 0.82, size: 0.034, fill: "#d6dde8", stroke: "#ffffff", alpha: 0, group: "edmond" }
    ]
  };
}

progressZeusBattle.storyProjects.zeus_battle_of_zeus = {
  type: "ZeusBattleProject",
  name: "Battle of Zeus",
  category: "story",
  chapter: 44,
  cost: {},
  duration: 10_000,
  description: "(This story project happens over a very short time period)  Progress the Battle of Zeus.",
  repeatable: true,
  maxRepeatCount: 13,
  unlocked: false,
  attributes: {
    planet: "zeus",
    hideAutoStart: true,
    ignoreDurationModifiers: true,
    battleFrames: [
      buildZeusBattleInitialFrame(),
      buildZeusBattleEnemyArrivalFrame(),
      buildZeusBattleEdmondAmbushFrame(),
      { id: 3 },
      { id: 4 },
      { id: 5 },
      { id: 6 },
      { id: 7 },
      { id: 8 },
      { id: 9 },
      { id: 10 },
      { id: 11 },
      { id: 12 },
      { id: 13 }
    ],
    storySteps: [
      "Archon Kalmar : 'Cockroaches.  You have overstepped enough.  Today you die.  No more negotations.  No more offers of surrender.'  \n $WGC_TEAM1_LEADER$ : 'They brokered a truce between each other.'  \n Mary : 'Archon Kalmar.  Get lost.'",
      "Feroza : 'Their fleet is massive!  We are taking heavy fire.  Can HOPE help?'  \n $RED$Prometheus : 'No.  HOPE did not have time to prepare for this.'  \n Mary : 'Sorry Feroza.  HOPE was not made for warfare.'  \n Feroza : 'That's alright Ma'am.'",
      "Edmond : 'Now you see me...'  \n Intercepting enemy transmissions... Duke Neran : 'The Ghost?  Its entire fleet was cloaked?'  \n Duke Helian : 'He's called the Ghost for a reason Neran!  No matter.  Its forces are tiny.'  \n Edmond : 'Now you don't...'",
      "Archon Kalmar : 'The hour of apocalypse is near.'  \n $WGC_TEAM1_LEADER$ : 'Uh oh.  I know what that codeword means.'  \n Mary : 'What?'  \n $WGC_TEAM1_LEADER$ : 'The superweapon... they are bringing it here.  Point blank.'  \n Mary : 'They can do that?'  \n $RED$Prometheus : 'Yes. It can shoot... smaller beams.'",
      "Feroza : 'It's about to shoot at the Horse!  Fleet!  Disperse!'  \n Mary : 'Feroza!'  \n Feroza : 'Ma'am.  It was an honour serving you.'  \n Mary : 'Feroza?  Feroza answer me!  Feroza!'  \n Pete : 'Admiral Xin, take command of the fleet.'  \n Xin : 'Yes sir.  All ships are to stay dispersed.'  \n Mary : 'Feroza...'",
      "Edmond : 'Now you see me...'  \n Duke Virellan : 'He's right there.  Just shoot at him already.'  \n Mary : 'Edmond!  The superweapon is aiming at you.'  \n Edmond : 'I know.'  \n Mary : 'Get out of there!'  \n Edmond : 'Hmmm.  I am going to try something interesting.  If I fail, captain Mar takes command.'",
      "Mary : 'What just happened?'  \n $RED$Prometheus : 'The Gabbagian... used its warpship to warp with the beam.'  \n Mary : 'You... you can do that?'  \n $RED$Prometheus : 'Only once I imagine.'  \n Edmond : 'I am fine your highness.  I was not on that ship.  Many of my men however...'  \n Mary : 'I am sorry Edmond.'  \n Edmond : 'Don't be.  I just need a bit more time.  My tatics are working.  We are attriting them very successfully.'",
      "Intercepting enemy transmissions...  Duke Okoth : 'Get rid of the Ghost already!'  \n Archon Kalmar : 'No.  Point the weapon at the machine.'  \n $WGC_TEAM1_LEADER$ : 'Miss Hopkins...  now is the time to evacuate.  You should have a warpgate.'  \n Mary : 'No!  HOPE won't be able to.'  \n $WGC_TEAM1_LEADER$ : 'Please...' \n Mary : 'No. I refuse.'",
      "Elias Kane : 'Prepare for interception.'  \n $RED$Prometheus : 'The faithful are moving their fleet in the beam's trajectory.'  \n Mary : 'This is nonsense, they'll just shoot again.'  \n Evelyn : 'Mary.  I am on the Mercy.  If enough ships take the blow... we're going to buy you some time.  Edmond looks like he's... beating them.'  \n Mary : 'WHAT!  What are you doing there Evelyn.'  \n Evelyn : 'Mary I...  I was always with them.  I did a lot of bad things.  But they... the people here.  They don't have bad intentions.  A lot of us feel very bad about what we've done.'  \n Mary : 'Evelyn...'  \n Evelyn : 'Please Mary.  I don't have much time.  I know you are going to blame yourself for this.  I want you to... not do that.  Don't blame yourself.  This time at least.'  \n Mary : 'That's... (in tears) I'll try Evelyn.  I'll try.'",
      "Mary : 'Evelyn...'  \n $RED$Prometheus : 'It's going to shoot again.'  \n Solis : 'Mary, I am positioning the Cashmoney on interception, just like the Mercy did.'  \n Mary : 'You too?'  \n Solis : 'Oh I am not on it.  It's all automated.'  \n Mary : 'Oh...'  \n Solis : 'It's a very expensive ship...'  \n Mary : '...  Thank you Adrien.' ",
      "Solis : 'The Cashmoney!  It's all ruined!'  \n $WGC_TEAM1_LEADER$ : 'We managed to infiltrate the Archon's flagship.  We are stalling for time in here, but not for long!'\n $RED$Prometheus : 'It's... going to shoot again eventually.'  \n Xin : 'Miss Hopkins we can't delay this any further.  Edmond is beating them but not fast enough.'  \n Mary : '...'  \n $ORANGE$Epimetheus : 'This one... can deliver bomb to command center.'  \n HOPE : 'Negative.  One-way trip.'  \n $ORANGE$Epimetheus : 'This one... wishes to be useful.  This one wishes to see gorgeous one succeed.  This one wishes to make gorgeous one happy.'  \n HOPE : 'Negative.'  \n $ORANGE$Epimetheus : 'This one... sees no alternative.  This one steals bomb if this one must.'  \n HOPE : 'Negative.'",
      "$ORANGE$Epimetheus : 'This one must go now.  This one needs bomb now.'  \n HOPE : '...  Approved.  HOPE-system approves of Epimetheus-machine-intelligence plan.'  \n Mary : 'HOPE...'  \n $RED$Prometheus : 'Brother...'",
      "Xin : 'The superweapon?  It self-destructed!'  \n Mary : 'Epimetheus succeeded?'  \n Edmond : 'Now I have you.'  \n Duke Karthid : 'This is all your fault!'  \n Duke Virellan : 'Says the one who hid some ships form us.'  \n Duke Karthid : 'Lies!'  \n Duke Helian : 'You are all fools.  I am out of here.'  \n Archon Kalmar : 'Helian you traitor!  Stay here.'  \n Duke Neran : 'You buffoons.  I should have never agreed to this.'  \n Duke Virellan : 'Neran you will pay.'  \n Duke Okoth : 'I hate all of you.'  \n Detecting multiple outgoing warp signatures."
    ]
  }
};

try {
  module.exports = progressZeusBattle;
} catch (err) {}
