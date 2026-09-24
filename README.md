# Commander Bracket Rater

Paste a Magic: The Gathering Commander decklist and get a recommended bracket (1–5) based on Wizards of the Coast's official Commander Bracket system.

**Live site:** https://YOUR-USERNAME.github.io/commander-bracket-rater/

## What it checks

| Rule | Bracket effect |
| --- | --- |
| Game Changers (53-card list, Feb 2026 update) | 1–3 → Bracket 3, 4+ → Bracket 4 |
| Mass land denial | Bracket 4 |
| Chained extra turns | Bracket 4 (single extra turns → Bracket 2) |
| Two-card infinite combos | Late game → Bracket 3, early game → Bracket 4 |

Tutors, fast mana and free interaction are shown as power signals and can move a deck up one bracket. You can also mark a deck as "theme first" (allows Bracket 1) or "tuned for competitive pods" (allows Bracket 5).

Flagged cards link to [Scryfall](https://scryfall.com), commanders to [EDHREC](https://edhrec.com), and combos to [Commander Spellbook](https://commanderspellbook.com).

## How to use

1. On [Moxfield](https://moxfield.com), open your deck's **More** menu → **Export** and copy the plain-text list (Archidekt and MTGO/Arena text exports work too).
2. Paste it into the decklist box. The result updates as you type.

## Limits

- Mass land denial, extra-turn, combo and tutor detection uses built-in lists of well-known cards and may miss obscure ones. Use [Commander Spellbook's Find My Combos](https://commanderspellbook.com/find-my-combos/) for a full combo check.
- Doesn't check the [banned list](https://magic.wizards.com/en/banned-restricted-list).
- When Wizards updates the Game Changers list, edit the `GAME_CHANGERS` array in `index.html`. The live list is on [Scryfall](https://scryfall.com/search?q=is%3Agamechanger).

## Running locally

It's one static file with no build step. Open `index.html` in a browser.

---

Commander Bracket Rater is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved or endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
