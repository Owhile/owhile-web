> ## Documentation index
> Fetch the complete index at: https://owhile.vercel.app/llms.txt
> Use this file to discover all available pages before exploring further.

# The profile

The profile is one JSON file. It says who your experience is for, what they may be shown,
and what shape each piece of content takes. Everything else derives from it — the authoring
template, the checks that run, whether you can be listed. (What of that you can run today is
in Status, below.)

Four words are used throughout, and they mean one thing each:

- An **item** is one thing a person is shown: a single sort, a single question.
- A **bank** is the file your finished items become — one JSON item per line.
- A **mechanic** is a verb. It is the kind of thing an item asks a person to do, and it is
  where the field shapes and structural rules are declared.
- An **audience** is a named group of readers, with its own budgets and permissions.

The profile declares four things: **audiences** (who is reading, and the budgets and
permissions that apply to them), **mechanics** (the verbs available, each with its field
roles and structural rules), **resources** (real-world things content may cite), and
**framing** (phrases that are wrong for this audience wherever they appear). `id`, `label`,
`audiences` and `mechanics` are required; a file missing one is refused before any content is
read. `locale`, `resources`, `framing_denylist`, `valences`, `item_keys` and `concept_field`
are optional.

If you would rather start from a file than from prose, there is a complete profile at the end
of this page. Adapt it rather than starting blank.

The checking code carries no assumptions about your audience. It has opinions, but they are
all opinions about *your declarations*. The same code gates a pre-reader safeguarding bank
and an adult compliance bank without a line changing. Only the profile differs.

## Status — read this before you plan around it

**You can install this.** `pip install owhile` gives you version 0.1.0 and the `owhile`
command, and `owhile init` writes a starting profile in the shape this page describes. Adapt
that rather than typing one from scratch.

The contract on this page is real: it describes what the code does today, limits included.
The loader, the gates and the report format are built and tested — 217 tests, mutation-tested;
161 over the gates and loader, 32 over the authoring template, 24 over the command — and proven across a
29,365-item corpus in two opposite audiences, which still gates to zero findings across all
five gates. That corpus run used an empty resource registry, so the resource rules on this
page are proven by the test suite rather than by the corpus. Where a declared rule is accepted
and then not enforced, [Limits worth knowing](#limits-worth-knowing) says so — and that list
is shorter than it was. Five rules this page used to document as accepted-but-not-running now
run. Where the history of one of those explains a design decision, it has been kept in the
section the decision belongs to rather than deleted.

Read this page as the format your file has to be in. The command will write you a valid one;
what it cannot write is the judgement about who your work is for.
[The setup runbook](https://owhile.vercel.app/creators/start.md) marks the same gap.

## Field paths

Every `field`, `over`, `into`, `of` and `key` argument is a path into one item, and so is
every key in a mechanic's `roles` map. Four shapes are understood:

| Path | Means |
|---|---|
| `prompt` | a top-level field |
| `key.a` | a field inside a map |
| `items[]` | every element of a list |
| `items[].text` | one field of every element |

A declared path covers everything beneath it, so declaring `key` as `opaque` covers `key.a`
and every other entry in that map.

**Write the `[]`.** Half the rules resolve a path literally, and a missing `[]` does not
error — it quietly resolves to something else. `{"kind": "count", "field": "items", "min": 4}`
counts the list as one value and fails a perfectly good four-item sort with
`items: 1 (need at least 4)`; `{"kind": "unique", "field": "items.id"}` resolves to nothing
and checks nothing at all, silently. `count`, `unique`, `enum`, `member_of` and `key_covers`
are the literal ones. The element-wise kinds — `count_where`, `exactly_one`, `subset_of`, and
`distinct` with `field` — accept either spelling, as do the `over` and `into` arguments of a
chance model.

This is the one silent failure left in path handling, and it is still silent. Proofread your
paths.

## Field roles

Every scalar in an item — string, number, boolean or null — declares what it *is*, except the
id field, the mechanic field and
`audience`, which the checker exempts because it already knows what those are. There are five
roles and no others:

| Role | Meaning |
|---|---|
| `visible` | A person reads or hears it. Counted against budget, framing-checked, deduped. |
| `deliberate_falsehood` | A person reads it and it is *meant* to be wrong — a myth being struck. Budgeted, framing-checked and deduped exactly like `visible`; never treated as an assertion. |
| `semantic` | Drives grading or presentation. Not prose. `valence`, `best`, `trick`. |
| `opaque` | Ids, keys, references. Never rendered, never budgeted, never deduped. |
| `resource_ref` | A pointer into your resource registry. Validated against it, never free text. |

**Why roles rather than a switch per mechanic.** The predecessor of this checker found an
item's visible text with a hand-written if/elif chain over mechanic names. An unrecognised
mechanic fell through it and returned almost nothing — blinding the length cap, the resource
binding, the claim check and the duplicate fingerprint at once, all reporting green. Roles
make "what will a person read?" a walk over your declarations instead. It cannot come out
incomplete: a field in your content with no declared role fails the first gate that runs, on
every item that carries it. That is a content finding, not a load-time refusal — the profile
loads fine, and the gate reports `field 'footnote' has no declared role in mechanic 'sort'`.

**The walk covers every scalar**, not only strings. It used to cover strings alone, which put
the hole exactly where the role system was most needed: `semantic` is the role for `best` and
`trick`, which are usually booleans, so the fields most likely to be added to a mechanic
without updating its `roles` were the ones the check could not see. An undeclared
`difficulty: 7` or `is_trick: true` passed silently and reported green. Numbers, booleans and
nulls are now reported like anything else, with the value stringified:
`field 'difficulty' has no declared role in mechanic 'sort' (value '7')`.

Two roles exist because of specific damage. `deliberate_falsehood` was added after a corpus of
4,661 struck myths went to a fact-check as ordinary visible text and every myth read as a false
claim. `semantic` exists because older code *inferred* which swipe side was affirming by
regex-matching the English label, and painted the negative side green on sixteen live consent
scenarios. A declared field cannot be wrong that way; it can only be absent.

## Audiences

Each audience carries:

- `text_budget` — **required**, a positive whole number. The longest any single visible field
  may be, counted in grapheme clusters rather than code points: a cap calibrated on English is
  a much harsher rule in Devanagari, so the count handles combining marks, viramas, ZWJ
  sequences and flag pairs. It approximates UAX #29 rather than implementing it — Hangul jamo
  composition and emoji modifier sequences are the known gaps.
- `prose_budget` — optional, and a positive whole number under the same test. The maximum
  total visible length of one whole item. Omit it and the total is unbounded; the per-field cap
  still applies.
- `permits` — the mechanic ids this audience may use. Optional at load, and an audience that
  omits it permits nothing: the profile loads and then every item fails on permission with
  `mechanic 'sort' is not permitted for audience 'operator' (permitted: [])`. Permitting a
  mechanic the profile does not declare is refused at load, because that is how an audience
  silently acquires a verb nobody validated.
- `min_age` — see below.
- `label`, `notes`, `policy_packs` — carried, for people. Nothing enforces them.

**A JSON `true` is not a budget.** Both budgets are refused unless they are positive whole
numbers, and the boolean is refused explicitly. In Python a bool *is* an int, so a plain
integer test accepted `true` and loaded it as a budget of 1 — every visible field longer than
one grapheme then failed, from a file that looked fine. Zero and negative numbers are refused
on the same reasoning: a budget that fails everything is indistinguishable from a gate that is
broken.

Budgets and permits are per audience, so the same mechanic can be tighter for one group than
another. In the shipped early-years profile, `spot` is permitted for early readers and
deliberately **not** for pre-readers: asking a small child to hunt for the dangerous thing is a
different act, gated by audience rather than left to an author's judgement.

## `min_age`

This is the safety-critical field, and it has no default. It is a whole number between 0 and 120;
a boolean is rejected. Leaving it out is legal — the profile loads, and a bank gated against it
comes back `pass` — but an audience with no declared `min_age` **cannot be listed**: the report
records `age_not_declared`. Absence is unknown, and unknown blocks. Reading silence as "adult"
would put a children's product on a general catalogue, which is the outcome the rule exists to
prevent. A green check is not evidence that anyone answered this question.

Declare it; never infer it. A 90-grapheme budget could be a pre-reader or an adult with a
cognitive disability, and guessing between them is not something software should do.

An audience under 18 is valid content that passes every check. It simply cannot go on the board.
If your audience is mixed, the number is the youngest likely reader, not the intended one — the
obligation attaches to likely access. See
[listing](https://owhile.vercel.app/creators/listing.md).

## Mechanics

A mechanic declares `roles` (required, non-empty), `gradeable`, `invariants` and `chance`.

The same declarations drive the authoring template: the sheet's columns, how many times a
collection repeats, and what the answer-key columns are called are all read back out of the
mechanic, so adding a mechanic adds columns with no code change.

**Invariants** are your structural rules. Nine kinds are understood:

| Kind | Requires | Checks |
|---|---|---|
| `count` | `field`, and any of `eq`/`min`/`max` | how many values sit at a path |
| `count_where` | `field`, `where`, and any of `eq`/`min`/`max` | how many elements match `where` |
| `unique` | `field` | no repeated values at a path |
| `enum` | `field`, `values` | every value is in a closed set |
| `key_covers` | `key`, `over`, `into` | the key covers every id and points nowhere else |
| `exactly_one` | `field`, `where` | exactly one element matches `where` |
| `member_of` | `field`, `of` | a value is one of a collection's values |
| `subset_of` | `field`, `of` | every value appears in another collection |
| `distinct` | one of `field`/`fields` | elements of a collection differ, or named paths differ |

`where` is a map of field names to the values an element must carry, tested against every
element of the collection. `{ "kind": "exactly_one", "field": "options[]", "where": { "best": true } }`
requires exactly one option marked as the right one. `count_where` and the `subset_selection`
chance model take the same shape.

Arguments are validated when the profile loads, not when content is checked. A profile that wrote
`distinct` with `field` instead of `fields` once loaded happily and then crashed the checker once
per item — 4,689 identical errors from one wrong word in one file. A rule whose arguments are
missing is refused up front.

**Loading a rule is not the same as running it**, and for a while two of these kinds did not run
what they had accepted. `count` evaluated `eq` and `min` and ignored `max` outright, so a `max` of
2 on a four-element collection produced no finding — a fail-open, reported green, from a rule the
author had every reason to believe was live. `count_where` read `eq` unconditionally, so a rule
written with `min` or `max` loaded without complaint and then raised `KeyError: 'eq'` on every
item the mechanic covered, blocking the whole bank. Both now evaluate `eq`, `min` and `max`
identically, and report in the same shape:

```
items[]: 3 (need at most 2)
xs[] where {'b': True}: 1 (need at least 2)
xs[] where {'b': True}: 2 (need at most 1)
```

Each branch is held by a test that fails if the branch is removed. That is the standing rule the
episode bought: the loader refuses arguments it cannot execute, and the evaluator runs every
argument the loader accepts.

**Chance** declares how someone could get an item right by guessing: `uniform_choice` (needs
`over`), `per_placement` (`over`, `into`), `subset_selection` (`over`, `where`) and `fixed` (`p`).
It is measured **per decision**, not per item — a six-item, two-bin sort has a whole-item chance of
1/64 and a per-placement chance of 1/2, and comparing whole-item numbers across mechanics compares
nothing. A mechanic that is not `gradeable` may not declare one: there is no correct answer, so
there is nothing to guess.

Chance is reported, never enforced. A guessable item is not a broken item. What it buys you is a
denominator: an item performing significantly *below* chance is the signature of an inverted
answer key, a defect class that has actually shipped.

**Invent nothing here.** When one profile added a `min 3` rule that a real corpus's own checker
never had, it produced three findings belonging to the profile author rather than to the content.
Declare the rule your content actually holds.

## Resources

Each entry needs `ref` and `canonical`. `kind`, `forms` and `name_patterns` are optional; a
`name_pattern` that is not a valid regular expression is refused at load.

Two things are then checked. A `resource_ref` field must name a resource you declared — content
cannot invent one. And in visible prose, a resource's name followed directly by a value — three
characters or more, carrying at least one digit, with a connective like "at", "on", "number", a
colon or a dash allowed between them — must be that resource's own value, matched against
`canonical` and `forms` with spaces, hyphens, brackets and letter case ignored. That catches a
real-sounding pairing that is wrong, without flagging a correct value that merely appears near
other text.

The prose half of that is narrower than it sounds, in two ways:

- It only fires for resources that declare `name_patterns`. Declare none and the resource gets
  the `resource_ref` check and nothing else.
- A **wrong** value is only named if the run after the resource's name reaches three characters.
  This bounds what the gate will *report*, not what it will *accept*: a correct citation is
  matched at its own full length before any of this runs, so a resource whose canonical value is
  long is checked normally.

It used to be narrower still, in two ways, both silent. The captured value had to start *and*
end with a digit, which meant a canonical that is not a plain number — a policy code like `HR-114` — was
never checked in prose at all, whatever the content paired it with. That exempted a resource in
this project's own reference profile without anyone noticing. A value may now carry letters and
only has to contain a digit somewhere, which admits `HR-114`, `999` and `0800 555 0100` while
leaving ordinary prose alone: "call the ethics line at reception" has no digit in it and is not a
binding. Trailing words are trimmed off the capture, so `ethics line 0800 555 0100 to report`
binds `0800 555 0100` rather than `0800 555 0100 to`. The comparison is case-folded, so `hr-114`
written in prose is the same reference as a canonical `HR-114` and is not reported as a wrong one.

A number you made up will pass every structural check and then ride out in a report that says the
content is clean. Every resource needs a source and a verification date from a person. This is the
part an agent must not fill in.

## `framing_denylist`

Regular expressions, matched case-insensitively against every visible field, including
`deliberate_falsehood` ones — a denied phrase inside a myth is still on screen. A pattern that
will not compile is refused at load. The shipped early-years profile denies "stranger danger" and
"bad touch"; the workplace one denies "he or she", "manpower" and "chairman". A denied phrase is
reported under the `resources` gate rather than a gate of its own.

## Two fields for content that predates you

`item_keys` maps the id and mechanic field names onto whatever your content already uses — one
real corpus keys its mechanic as `type`. Only `id` and `mechanic` are accepted keys.

`concept_field` names an existing `opaque` field saying what an item teaches, so coverage can be
counted. It must be declared on **every** mechanic, or the ones omitting it read as uncovered
rather than unclassifiable. Point it at a field your content already carries: one corpus made
coverage measurable across all 29,365 items with no content migration, because the field was
already there.

## A complete profile

This one loads, gates a bank clean, and is listable — it was run to check.

Replace its resource entry before you do anything else. `site.duty-line` is an invented number,
as is every value in a worked example. An invented canonical value clears every structural check
and is then reported as canonical.

```json
{
  "id": "night-shift",
  "label": "Night-shift decisions (adult)",
  "locale": "en",
  "audiences": {
    "operator": {
      "min_age": 18,
      "label": "Control-room operators",
      "text_budget": 220,
      "prose_budget": 900,
      "permits": ["sort", "reflect"],
      "notes": "Literate adults reading on a small screen mid-shift."
    }
  },
  "mechanics": {
    "sort": {
      "gradeable": true,
      "roles": {
        "prompt": "visible",
        "items[].id": "opaque", "items[].text": "visible",
        "bins[].id": "opaque", "bins[].label": "visible", "bins[].valence": "semantic",
        "key": "opaque", "help_ref": "resource_ref"
      },
      "chance": { "kind": "per_placement", "over": "items[]", "into": "bins[]" },
      "invariants": [
        { "kind": "count", "field": "items[]", "min": 4 },
        { "kind": "unique", "field": "items[].id" },
        { "kind": "enum", "field": "bins[].valence", "values": ["log", "escalate"] },
        { "kind": "exactly_one", "field": "bins[]", "where": { "valence": "escalate" } },
        { "kind": "key_covers", "key": "key", "over": "items[].id", "into": "bins[].id" }
      ]
    },
    "reflect": {
      "gradeable": false,
      "roles": {
        "prompt": "visible", "options[]": "visible",
        "affirm": "visible", "myth": "deliberate_falsehood"
      },
      "invariants": [{ "kind": "count", "field": "options[]", "min": 2 }]
    }
  },
  "resources": [
    { "ref": "site.duty-line", "kind": "internal-line", "canonical": "0800 555 0100",
      "forms": ["08005550100"], "name_patterns": ["duty ?line"] }
  ],
  "framing_denylist": ["\\bmanpower\\b"]
}
```

The shipped reference profiles carry `_doc` and `_note` keys explaining why a particular decision
was made. Unknown keys are ignored, so this is a free place to write the reasoning down — worth
doing, because the next person to widen a budget or permit a verb will want to know what the
number was protecting. Two of those reference profiles **ship with the package** — load them by name with
`owhile profile check --profile early-years-safeguarding` or `--profile workplace-compliance`,
and read them as worked examples of the same file this page describes. Their registry values are
illustrative rather than verified, so do not copy a helpline number out of one.

## What the file is refused for

Each of these stops the load. Nothing is checked until it is fixed.

- a required key is missing: `id`, `label`, `audiences`, `mechanics`
- `roles` is empty, or a field is given a role outside the five
- an audience permits a mechanic the profile does not declare
- `text_budget` or `prose_budget` is not a positive whole number — a JSON `true`, a `0` and a
  negative are all refused
- `min_age` is not a whole number in 0–120
- an invariant kind is unknown, or is missing an argument it needs
- a chance kind is unknown, is missing an argument, or sits on an ungradeable mechanic
- a resource entry has no `ref` or no `canonical`
- a `name_pattern` or a `framing_denylist` pattern will not compile
- `item_keys` names a key other than `id` or `mechanic`
- `concept_field` is absent from a mechanic, or is not `opaque` there

A field with no declared role is **not** on this list. That is caught per item when the content is
gated, not when the profile loads.

## What a report records about your profile

Every gate report carries `profile.content_digest`: a digest of your declarations, not of your
file's bytes. Reformat the JSON or reorder the keys and the digest is unchanged, so old reports still describe
the profile you have. Change a budget, an age, a role or an invariant and it changes, so a report
cannot quietly outlive the rule it was gating against.

It digests the whole file's declarations, so **editing a `_doc` or `_note` comment changes it
too**, even though nothing about the rules moved. That is the conservative direction: the digest
can say a report is stale when it is merely re-worded, and never the reverse.

It was once written only when the profile had been loaded from a path, which meant gating against
a shipped profile by name produced a report binding the content and the code but not your declared
budgets and ages — the half of the verdict a listing decision rests on. It is now computed at load
and is always present. `file_digest`, the digest of the bytes, is still written in addition when
you passed a path.

## Limits worth knowing

These are things the format accepts and the code does not do. They are listed because a rule you
believe is running and is not is worse than no rule.

- **A missing `[]` in a field path is silent.** `count` on `items` counts the list as one value;
  `unique` on `items.id` checks nothing at all. Neither errors. See
  [Field paths](#field-paths) for which kinds resolve literally.
- **`--audience` overrides each item's own `audience` field.** It does not fill in for items that
  lack one — it replaces every item's. Gate a mixed bank with one audience named on the command
  line and every item is silently checked against that audience's budgets and permits, including
  the items that declared a different one.
- **A listing verdict appears in a report only when the check names an audience.** If items carry
  their own `audience` field instead, the gates all run and you get gate results with no listing
  verdict at all. Naming an audience the profile does not declare is not a pass either: the
  report records `audience_unknown`, and says which id it could not find.
- **An audience with no `permits` blocks everything.** It loads clean and then fails every item on
  permission. This is deliberate — a verb nobody granted is not a verb you have — but it looks
  like a broken gate the first time you meet it.
- **`locale`, `valences`, `policy_packs` and `notes` are read into the profile and enforced by
  nothing.** `locale` in particular does not select the grapheme counter or the framing rules; it
  is a label for people. To have a closed set of valences enforced, write it as an `enum`
  invariant with the values spelled out.
- **`code_version` hashes the gate code, the loader and the template generator together.** A
  change to the authoring-sheet generator alone changes the `code_version` on a gate report it
  could not have affected. Two reports sharing a `code_version` did run identical gate logic; two
  differing may still have.
- **Nothing yet helps you write a profile.** You hand-write the JSON. The template generator goes
  the other way — profile in, authoring sheet out — which proves the format is rich enough to
  drive an editor, but that editor does not exist, and neither generator nor checker is something
  you can run today.

## Next

- [Gates](https://owhile.vercel.app/creators/gates.md) — what each check proves, and what a failure means
- [Listing](https://owhile.vercel.app/creators/listing.md) — the rule a report has to satisfy, and why there is nowhere to send one yet
- [Setup](https://owhile.vercel.app/creators/start.md) — the order to do this in, and where to stop and ask
