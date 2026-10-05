# Commander Bracket Rater

Paste a Magic: The Gathering Commander decklist or deck link and get a recommended bracket (1–5) based on Wizards of the Coast's published Commander Bracket rules, a 1–10 power level, and a breakdown of the mana base.

**Live site:** [https://alexanderbickler.github.io/commander-bracket-rater/](https://alexanderbickler.github.io/mtg_commander/)

## What it checks

| Rule | Bracket effect |
| --- | --- |
| Game Changers (53-card list, Feb 2026 update) | 1–3 → Bracket 3, 4+ → Bracket 4 |
| Mass land denial | Bracket 4 |
| Chained extra turns | Bracket 4 (single extra turns → Bracket 2) |
| Two-card infinite combos | Late game → Bracket 3, early game → Bracket 4 |

## Power level (1–10)

The page looks up every card on [Scryfall](https://scryfall.com/docs/api), scores eight factors from 0 to 10, and combines them with the formula from [CodingAce's EDH power level calculator](https://codingace.net/general/edh_power_level.html):

**Power Level = Mana Engine × 18% + Consistency × 18% + Win Pressure × 20% + Interaction × 14% + Resilience × 10% + Protection × 8% + Disruptive Pressure × 7% + Card Quality × 5%**

The weights are CodingAce's. How each factor is scored from the cards is this site's own estimate:

| Factor | Weight | Built from |
| --- | --- | --- |
| Mana Engine | 18% | Curve (30%), land count and color fixing (25%), ramp (20%), fast mana (25%) |
| Consistency | 18% | Dedicated card draw (40%), tutors (35%), synergy: commander impact and share of spells on the commander's creature types (25%) |
| Win Pressure | 20% | Win condition efficiency (55%) and expected win turn (45%) |
| Interaction | 14% | Removal, counterspells, bounce and board wipes. 18 answers score 10 |
| Resilience | 10% | Recursion, repeatable token makers and draw engines |
| Protection | 8% | Hexproof, indestructible, ward, phasing or protection, plus counterspells |
| Disruptive Pressure | 7% | Taxes, locks, discard, theft and mass land denial aimed at opponents |
| Card Quality | 5% | Game Changers, known staples, and the share of spells costing 2 or less |

The result also lists the headline deck stats: tutors, dedicated card draw, interaction/removal, win condition efficiency, mana base consistency, commander impact and average CMC.

The power level maps to a bracket:

| Power level | 1.0–3.9 | 4.0–5.9 | 6.0–6.9 | 7.0–7.9 | 8.0–10 |
| --- | --- | --- | --- | --- | --- |
| Bracket | 1 Exhibition | 2 Core | 3 Upgraded | 4 Optimized | 5 cEDH |

The recommended bracket is the higher of the power level's bracket and the rules floor above, so the power level can raise a bracket but never lower it below what the rules require. You can also mark a deck as "theme first" (lets a Bracket 2 power level with no rule violations drop to Bracket 1) or "tuned for competitive pods" (turns Bracket 4 into Bracket 5).

While cards are being looked up, the verdict panel shows a loading spinner, **"Rating your deck, please wait…"** and a progress bar, so a provisional bracket never flashes up and then changes. If Scryfall can't be reached, the page falls back to its built-in lists: tutors, fast mana and free interaction are shown as power signals and can move a deck up one bracket, and the verdict is labeled "rules only".

## Mana base

The result counts the basic lands by type (Plains, Island, Swamp, Mountain, Forest, plus Wastes when the deck makes colorless mana), shows how many lands can make each color, and lists the nonbasic and mixed lands grouped by the colors they make. Fetch lands count toward the basic types they can find.

Each color has its own gem: white (Plains), blue (Island), black (Swamp), red (Mountain), green (Forest) and colorless. The header labels them with their basic land's letter (**P**, **I**, **S**, **M**, **F**). The gems are original drawings (sun, drop, skull, flame, tree, diamond in a hexagon), not Wizards' mana symbols, which the Fan Content Policy doesn't allow fan sites to use.

## Design, accessibility and fan-content rules

- **Theme:** an original parchment-and-gold look (midnight and gold in dark mode). It uses no Wizards logos, mana symbols, planeswalker, guild or set symbols, card frames, card backs, card art or the Beleren typeface. The required Fan Content notice is in the footer.
- **Accessibility:** built to WCAG 2.2 AA. Every color pair meets contrast minimums in both themes, the page has landmarks, a skip link and a clean heading order, and screen readers hear "Rating your deck, please wait" and the result through a live region. Every result section except the recommended bracket can be collapsed with a keyboard-accessible button. Links that open new tabs say so, the spinner stops for people who prefer reduced motion, and the layout reflows at 320px wide with no sideways scrolling. Checked with axe-core in every state, in light, dark and high-contrast modes.

## How to use

There are three ways to get a deck in. None of them rates the deck until you choose **Rate deck**, so you can check the fields first.

1. **Paste an Archidekt link** into the deck link box. The commander and decklist fill in automatically.
2. **Moxfield (one click):** Moxfield blocks other websites from reading its decks, so pasting a Moxfield link can't load it directly. Instead, open **One-click import** on the page and drag the **Send to Rater** button to your bookmarks bar. On any Moxfield or Archidekt deck page, click the bookmark: it reads the deck in your own browser and opens this page with the commander and decklist filled in.
3. **Paste the text export** (Moxfield: **More** → **Export** → plain text; Archidekt and MTGO/Arena exports work too) into the decklist box. A full list replaces both fields: a Commander section goes into the Commander box and the rest into the decklist. Sideboard and maybeboard sections are left out.

Editing the fields after a rating shows a notice instead of re-rating; choose **Rate deck** again to update.

## Limits

- Card draw, removal, tutor, ramp and finisher counts come from reading each card's rules text, so unusual wording can be missed or miscounted. Factor scoring and the bracket bands are estimates. Edit `POWER_WEIGHTS` and `powerLevel()` in `index.html` to tune them.
- The power level and the land colors need an internet connection to reach Scryfall.
- This is not legal advice. The theme and gems were designed to stay clear of Wizards' protected marks, but only a lawyer can assess legal risk.
- Deck import relies on Moxfield's and Archidekt's own deck data, which they can change at any time. If an import stops working, paste the text export instead.
- Mass land denial, extra-turn, combo and tutor detection uses built-in lists of well-known cards and may miss obscure ones. Use [Commander Spellbook's Find My Combos](https://commanderspellbook.com/find-my-combos/) for a full combo check.
- Doesn't check the [banned list](https://magic.wizards.com/en/banned-restricted-list).
- When Wizards updates the Game Changers list, edit the `GAME_CHANGERS` array in `index.html`. The live list is on [Scryfall](https://scryfall.com/search?q=is%3Agamechanger).

## Running locally

It's one static file with no build step. Open `index.html` in a browser (the power level needs internet access for Scryfall).

---

Commander Bracket Rater is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved or endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
