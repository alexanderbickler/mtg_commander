# Commander Bracket Rater

Paste a Magic: The Gathering Commander decklist and get a recommended bracket (1–5) based on Wizards of the Coast's official Commander Bracket system.

**Live site:** [https://alexanderbickler.github.io/commander-bracket-rater/](https://alexanderbickler.github.io/mtg_commander/)

## What it checks

| Rule | Bracket effect |
| --- | --- |
| Game Changers (53-card list, Feb 2026 update) | 1–3 → Bracket 3, 4+ → Bracket 4 |
| Mass land denial | Bracket 4 |
| Chained extra turns | Bracket 4 (single extra turns → Bracket 2) |
| Two-card infinite combos | Late game → Bracket 3, early game → Bracket 4 |

## Power level (1–10)

The page looks up every card on [Scryfall](https://scryfall.com/docs/api) and scores seven factors from 0 to 10:

| Factor | Weight | How it's scored |
| --- | --- | --- |
| Tutors | 15% | Cards that search your library for a nonland card. 8+ scores 10. |
| Dedicated card draw | 15% | Repeatable draw, or spells that draw two or more. 10+ scores 10. |
| Interaction / removal | 15% | Spot removal, counterspells, bounce and board wipes (free spells count 1.5). 14+ scores 10. |
| Win condition efficiency | 20% | Early two-card combo 10, late combo 7.5, otherwise finishers and alternate wins, adjusted for their cost and tutor support. |
| Mana base consistency | 15% | Mana sources vs. what the curve needs, ramp (fast mana counts extra), and lands that fix the commander's colors. |
| Commander impact | 10% | Known high-power commanders, combo pieces, Game Changers, card-advantage or mana engines, and a cheap cost. |
| Average CMC | 10% | Nonland cards, commander excluded. 2.0 or lower scores 10; each +1 costs 3 points. |

**Power level = 1 + 0.9 × (weighted total)**, which maps to a bracket:

| Power level | 1.0–3.9 | 4.0–5.9 | 6.0–7.4 | 7.5–8.9 | 9.0–10 |
| --- | --- | --- | --- | --- | --- |
| Bracket | 1 Exhibition | 2 Core | 3 Upgraded | 4 Optimized | 5 cEDH |

The recommended bracket is the higher of the power level's bracket and the rules floor above, so the power level can raise a bracket but never lower it below what the rules require. You can also mark a deck as "theme first" (lets a Bracket 2 power level with no rule violations drop to Bracket 1) or "tuned for competitive pods" (turns Bracket 4 into Bracket 5).

If Scryfall can't be reached, the page falls back to its built-in lists: tutors, fast mana and free interaction are shown as power signals and can move a deck up one bracket.

Flagged cards link to [Scryfall](https://scryfall.com), commanders to [EDHREC](https://edhrec.com), and combos to [Commander Spellbook](https://commanderspellbook.com).

## How to use

1. On [Moxfield](https://moxfield.com), open your deck's **More** menu → **Export** and copy the plain-text list (Archidekt and MTGO/Arena text exports work too).
2. Paste it into the decklist box. The result updates as you type.

## Limits

- Card draw, removal, tutor, ramp and finisher counts come from reading each card's rules text, so unusual wording can be missed or miscounted. The weights are a starting point, not an official formula. Edit `powerLevel()` in `index.html` to tune them.
- The power level needs an internet connection to reach Scryfall.
- Mass land denial, extra-turn, combo and tutor detection uses built-in lists of well-known cards and may miss obscure ones. Use [Commander Spellbook's Find My Combos](https://commanderspellbook.com/find-my-combos/) for a full combo check.
- Doesn't check the [banned list](https://magic.wizards.com/en/banned-restricted-list).
- When Wizards updates the Game Changers list, edit the `GAME_CHANGERS` array in `index.html`. The live list is on [Scryfall](https://scryfall.com/search?q=is%3Agamechanger).

## Running locally

It's one static file with no build step. Open `index.html` in a browser (the power level needs internet access for Scryfall).

---

Commander Bracket Rater is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved or endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
