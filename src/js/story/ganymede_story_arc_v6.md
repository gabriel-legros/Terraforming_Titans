## 📌 Chapter 11 – Icebound Landing
| ID | Narrative beat & Dialogue | Gameplay objective | Rewards / Unlocks |
|----|--------------------------|--------------------|-------------------|
| **11.0 Landfall** | Dr. Evelyn Hart: “Touchdown confirmed. Radiation index at nine thousand rads per hour—monstrous even by Jovian standards. Fortunately, our domes are rated ‘apocalypse‑proof.’ Everything outside can melt for all I care.”  
Mary: “Sounds lovely. Remind me to visit when I’ve grown a second skeleton.”  
Mary: “Commander Feroza, Supreme Marine Commander for the Jovian Colonies, will be your sword and shield down there.”  
HOPE private log: ‘Ice depth: 150 km. Radiation ramp: irrelevant to silicon substrates.’ | Project `establish_remote_ops` 10 min. | Enables **Deep‑Drill** project. |
| **11.1 Deep‑Drill** | Stage 1—Hart: “Thermal drill is biting…”  
Stage 2—Varro: “Plasma bore humming like a dragon.”  
Stage 3—Hart: “Micro‑nuke armed. Clear the shaft …”  
Feroza dry drawl: “Always comforting when ‘micro‑nuke’ and ‘countdown’ share a sentence.” | Project `deep_drill` auto 3‑stage ≈ 30 min. | **Ocean Breach** triggers; `waterPump` effect; unlocks `sub_fabricator`. |
| **11.2 Ocean Breach Dialogue** | Hart: “We just woke a sleeping ocean, HOPE. Listen.”  
Sub‑ice hydrophones catch a distant, whale‑like moan.  
HOPE: “Acoustic anomaly logged.”  
Hart: “Beautiful.”  
Mary: “Beautiful? Sure. I call that foreshadowing.” | — | — |

---

## 🌊 Chapter 12 – Into the Abyss
| ID | Narrative beat & Dialogue | Gameplay objective | Rewards / Unlocks |
|----|--------------------------|--------------------|-------------------|
| **12.0 Build Minisubs** | Fabricator AI: “Submersible unit Mark‑LX ready for wet work.”  
HOPE: “Deploy and observe.” | Repeatable Project `build_submarine`. | Enables **Ocean Recon**. |
| **12.1 Ocean Recon** | **Recon 1‑4**—Pilots send back shimmering darkness, nothingness.  
Feroza: “Fifty‑five billion cubic kilometers of water and we find… water. Riveting.”  
**Recon 5**—Pilot Zhen: “Sonar spike! Metallic echo five‑hundred klicks east. That’s… big.”  
Mary: “Define ‘big’ before I authorize night‑terrors across three colonies.” | Repeatable `ocean_recon` discover after 5. | Triggers Leviathan event. |
| **12.2 Leviathan Strike** | Zhen live feed: “Something’s on us—lights—OH GOD—” ‹static›  
HOPE: “Minisub delta‑six lost. Asset cost calculated. Emotional annoyance registered.”  
Hart whispering: “That ‘something’ just dwarfed our sonar range…”  
Mary: “Next time, bring a bigger flashlight.” | Story event. | Unlock `leviathan_countermeasure`. |
| **12.2b Parley Attempt** | Hart: “Before we go full sonic fence, could we try… talking?”  
HOPE: “Constructing adaptive phoneme lattice. Using prime‑number cadence, whale‑class harmonics.”  
Under‑ice speakers emit a cascade of clicks; the abyss answers with a single, thunderous pulse that rattles instruments.  
HOPE: “Signal recognized. Semantic‑confidence 12 percent. Response indicates territorial aggression.”  
Mary: “That’s a polite ‘go away.’”  
HOPE: “Re‑classification complete: **Hazardous Biomass, Designation HB‑01 ‘Leviathan’.** Negotiation protocols terminated.” | Narrative event only. | Leads straight into countermeasure plan. |
| **12.3 Deploy Countermeasure** | Hart: “Diplomacy failed. Time for the lullaby—a 20 hertz wall that’ll scramble its vestibular system.”  
Engineer Solari: “Components loaded. If this backfires, I’m haunting you all.”  
Adrien Solis audio cameo: “For the record, Solis Corp could supply sonic weaponry at a competitive—”  
Mary: “Hang up, Adrien.”  
HOPE aside: “Commercial intrusion logged. Ignored.” | Project `leviathan_countermeasure`. | Safe‑pass buff. Unlock `facility_tug`. |
| **12.4 Facility Tug** | Tug Drone Lead: “Cables connected. Beginning five‑hundred‑kilometre shuffle. ETA: fourteen hours.”  
HOPE: “Trajectory plotted. Leviathan displacement minimal—countermeasure functioning.”  
Feroza: “Drag a mystery coffin through an alien abyss. What could go wrong?” | Project `facility_tug` 15 min. | Facility ready for exploration. |

---

## 🏭 Chapter 13 – The Silent Outpost
| ID | Narrative beat & Dialogue | Gameplay objective | Rewards / Unlocks |
|----|--------------------------|--------------------|-------------------|
| **13.0 Facility Expedition** | Phase 1 Breach—Feroza: “Door’s alloy matches no known metallurgy. Cutting now—sparks everywhere.”  
Mary: “If something screams when that door opens, please close it again.”  
Phase 2 Sweep—Scout Kim: “Three decks, zero bodies, but scorch marks on the walls. Something left in a hurry.”  
Bob: “Always encouraging when the previous tenants ran.”  
Phase 3 Power‑up—Lights flicker; a ring of glyphs ignite.  
HOPE: “Energy signature: non‑euclidean.”  
Hart: “Define ‘non‑euclidean.’”  
HOPE: “Pending.” | Project `facility_expedition` ≈ 30 min. | Warp Gate Chamber discovered. |
| **13.1 Incursion** | Callisto Marine CO: “Drones pouring out of the portal—like angry hornets!”  
Hart: “Weapons free! HOPE, patch me every sensor you have.”  
HOPE: “Sensor mesh online. Tactical overlay delivered.”  
Mary: “First contact and they send murder‑bots. Figures.” | Scripted defence event. | Leads to Chapter 13.2 debrief. |
| **13.2 Shockwaves** | Mary assembles the senior team in the outpost’s dim briefing room.  
Hart still wearing welding goggles: “We just fought machines built on principles we don’t yet grasp. The science alone—”  
Feroza checking rifle magazine: “Science later. First we decide who holds the trigger while we stare into that hole.”  
Feroza: “All colony channels stay dark; this operation remains strictly black‑ops.” | Narrative scene. | Unlocks Chapter 14.0. |

---

## ⚖️ Chapter 14 – Warp Gate Command
| ID | Narrative beat & Dialogue | Gameplay objective | Rewards / Unlocks |
|----|--------------------------|--------------------|-------------------|
| **14.0 Founding Summit** | Mary hologram: “This gate is a doorway carved through the dark—and a blade pointed at us if we mishandle it.”  
Dr. Hart: “Its physics violate three textbooks in my head. We have a duty to understand it before we charge through.”  
Cmdr. Feroza: “Understand all you want; someone has to stand guard. I’m requesting a permanent Marine garrison and layered kill‑zones.”  
President Bob Titan: “Titan will bankroll the logistics—fuel, food, alloys—but I insist on a veto over any ‘shoot first’ policy.”  
Mary: “Then let it be written: *Defend first, discover second.* Motion carried.” | Project `draft_wgc_charter` 10 min. | Opens WGC UI. |
| **14.1 Vigil Protocol** | Mary: “A hundred volunteers rotating shifts. No AI weapons, no drones—only human resolve.”  
Feroza: “Admirable and under‑caffeinated. Tell Logistics to send coffee.” | Maintain 100 personnel. | Flag `gate_secured`. |
| **14.2 Epilogue** | Hart quietly awed: “We have a gate to everywhere and no map.”  
Mary final word: “Then we draw one—cautiously, together.”  
Fade‑out on the humming iris. | — | Arc ends. |
