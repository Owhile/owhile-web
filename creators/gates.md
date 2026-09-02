> ## Documentation index
> Fetch the complete index at: https://owhile.vercel.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Gates

A gate is a check that either passes or does not. There are five, they run over every item in your
bank, and they are the same five for everyone.

Five words first, because the rest of this page leans on them.

- An **item** is one thing a person is shown — one JSON object, one line of your bank file.
- A **bank** is the file of items: newline-delimited JSON, one item per line.
- A **mechanic** is the kind of interaction an item asks for — sort these into bins, spot the wrong
  one, reflect on this. Your profile declares which mechanics exist and which fields each one
  carries. An item names its mechanic in a field, usually `mechanic`.
- An **audience** is a named group declared in your profile — `pre-reader`, `staff` — carrying its
  own reading budget and its own list of permitted mechanics. Every item is checked against one
  audience: the one the whole run is given, or — when the run names none — the one the item
  declares in its `audience` field. A run-level audience **overrides** what the items say, so
  gating a mixed bank with one audience silently checks every item against that audience.
- A **field path** names a place inside an item. `prompt` is a top-level field. `items[]` means every
  element of the `items` array, and `items[].text` means the `text` of each of those elements. Your
  profile uses this notation to annotate fields, and every failure message uses it to point at one.

The gates exist because of one rule: **anything a script can prove, a script proves — and blocks
on.** Not warns, not scores. Blocks. What a script cannot prove — is this answer key right, is this
right for this audience, is this a reskin of the last one — is left to a person, and the gates claim
nothing about it. Every rule they do enforce comes out of your
[profile](https://owhile.vercel.app/creators/profile.md): the mechanics, the field shapes, the
budgets, the resource registry, the framing rules. The code is identical everywhere; only the
profile differs.

## How this runs today

**There is no `owhile` command.** The name is registered on PyPI and holds an empty placeholder —
installing it gives you nothing to run. The gates are Python modules in a private repository, with
126 tests that are mutation-tested: disabling any of the five gates, reverting the grapheme counter
to `len`, or making an unknown mechanic fail open each kills at least one test. What is published
here is the **contract** — what is checked, and what each failure means. It is implemented; the
command that will wrap it is not. When it exists, this page will name it.

## Where these run

The gates are not a separate step at the end. They run in two places, over the same shared loop, so
the two can never disagree about what passing means:

- **At build time, from the sheet.** The authoring tool generates a spreadsheet template from your
  profile — repeat counts taken from the `count` invariants, structural ids pre-filled, answer-key
  columns named after those ids, the budget and enum values stated in the guide. When you build, the
  rows are gated before anything is written. Nothing is written unless every row passes. Findings
  come back **into a copy of the sheet** as a `_findings` column, so you fix them where you wrote
  them rather than in a terminal.
- **Over an existing bank.** The same gates, run against an NDJSON file you already have, optionally
  emitting a JSON report.

Two rules of the sheet layer are load-bearing for content correctness. **An empty cell omits the
field** — it never becomes `""`, because an empty string is a real value that would pass a budget and
render as a blank thing a person is asked to read. **Only `true` and `false` are coerced**;
everything else stays a string, so the id `007` stays `007` and the version `1.10` stays `1.10`. An
explicit `::int` or `::float` suffix on the column header is the escape hatch.

## The five gates

| Gate | Proves |
|---|---|
| `role_totality` | Every *string* in the item has a declared role. |
| `invariants` | The profile's structural rules — counts, uniqueness, enums, key coverage. |
| `permissions` | This audience is allowed this mechanic. |
| `budgets` | Visible text fits this audience's reading budget, counted in graphemes. |
| `resources` | Named resources are registered and correctly valued; denied framing is absent. |

Findings are grouped **by rule** rather than by item — so you fix a class of error once instead of
the same mistake four hundred times. Most findings are prefixed with the item id. Two are not:
`parse` prefixes the source line number, because a line that would not decode has no id to name, and
`dedup_prose` names a pair of ids rather than one.

A malformed profile stops the run before any of this: an invariant missing its arguments, an
audience permitting an undeclared mechanic, or a field with a role that is not one of the five is
refused at load time. One profile wrong in one word once produced 4,689 identical crashes by being
checked too late. One invariant kind still escapes that discipline — see [Known
limits](#known-limits).

### `role_totality` — nothing goes unread

Your profile annotates each field of each mechanic with a role: `visible`, `deliberate_falsehood`,
`semantic`, `opaque` or `resource_ref`. This gate walks every **string** in the item and checks that
a declared path covers it; a declared path covers itself and everything beneath it. The id field, the
mechanic field and `audience` are exempt. It fails when an item carries a string the mechanic does
not declare — a field you invented, or one added to the mechanic without updating its roles.

```
r-001: field 'tone' has no declared role in mechanic 'reflect' (value 'warm')
```

Add the field to the profile if it is real; delete it from the item if it is not.

It walks strings only. A field holding a number or a boolean is not reported — see [Known
limits](#known-limits).

Do not reach for `opaque` to silence a finding. `opaque` means never shown and never budgeted, so
text hidden there is skipped by `budgets` and by both checks in `resources` — and it also drops out
of both duplicate fingerprints, so a reskin of an item you already have stops being detectable at
all. That is the one defect class these gates otherwise catch that nothing else will.

### `invariants` — your own structural rules

These are whatever your profile declared, per mechanic. A worked example first, so the field paths
have something to point at. This item:

```json
{"id":"v-001","mechanic":"sort","audience":"staff","prompt":"Sort these.",
 "items":[{"id":"a","text":"One"},{"id":"b","text":"Two"}],
 "bins":[{"id":"ok","label":"Fine","valence":"pos"},
         {"id":"no","label":"Not fine","valence":"WRONG"}],
 "key":{"a":"ok","b":"nonexistent"}}
```

against a `sort` mechanic declaring `count items[] min 4`, `unique items[].id`,
`enum bins[].valence`, and `key_covers` from `items[].id` into `bins[].id`, produces exactly:

```
v-001: items[]: 2 (need at least 4)
v-001: bins[].valence: 'WRONG' not in ['caution', 'neg', 'neutral', 'pos']
v-001: key points at undeclared target(s) ['nonexistent']
```

Each kind, and the text it emits:

- `count` — `items[]: 2 (need exactly 6)` or `items[]: 2 (need at least 4)`
- `unique` — `items[].id: duplicate values`
- `enum` — `bins[].valence: 'WRONG' not in ['caution', 'neg', 'neutral', 'pos']`
- `key_covers` — `key does not cover ['c']` / `key points at undeclared target(s) ['nonexistent']`
- `exactly_one` — `options: 2 matching {'best': True} (need exactly 1)`
- `count_where` — `options[] where {'best': True}: 2 (need exactly 1)`
- `member_of`, `subset_of` — `answer='x' not among parts[] ['a', 'b']`; `key[] has value(s) not present in pieces[]: …`
- `distinct` — `pieces[] has repeated element(s): …` / `fields ['left', 'right'] must differ from each other`

These are the commonest failures and the cheapest to fix: each message names the field path and the
number it wanted. `key_covers` fails both when your key misses an item and when it names no such bin.
`count_where` and `exactly_one` ask a similar question and print different strings, so grep for the
right one.

### `permissions` — this audience, this mechanic

An audience declares which mechanics it permits. An item using one it does not permit fails,
whatever the item says.

```
v-002: mechanic 'branch' is not permitted for audience 'pre-reader' (permitted: ['reflect', 'sort'])
```

This is a profile decision, not an authoring one. In the early-years reference profile `spot` is
permitted for early readers and forbidden for pre-readers — a small child hunting for the dangerous
thing is a different act. Either the item uses the wrong mechanic, or your profile should permit it.

### `budgets` — how much text at once

Two limits, both from the audience. `text_budget` caps any single visible field. `prose_budget`, if
you set one, caps total visible text across the whole item.

```
v-003: prompt: 165 graphemes (budget 90 for pre-reader)
p-001: item prose 1475 graphemes (budget 900 for staff)
```

Only `visible` and `deliberate_falsehood` fields count. A myth the content teaches a reader to
reject is still text they read, so it is budgeted. It is also framing-checked and resource-checked
like any other visible prose — see `resources` below. What it is exempt from is being read as a
claim the content asserts; nothing here judges whether a claim is true in any case.

**Graphemes, not characters.** The count is what a reader perceives as one unit, not what `len()`
returns: `किसी ने तुम्हारा फ़ोन मांगा` counts 14 where `len()` says 27; `क्ष` counts 1 where `len()`
says 3; a four-person family emoji counts 1 where `len()` says 7. A 90-character cap calibrated on
English becomes a roughly 45-character cap in Devanagari if you count code points — the same written
rule, silently twice as harsh, on exactly the scripts a budget is most likely to hurt. The counter
handles combining marks, viramas (so क् + ष is one cluster), zero-width joiners and
regional-indicator pairs. It approximates the Unicode segmentation algorithm rather than all of it;
Hangul jamo composition and emoji modifier sequences are the known gaps.

### `resources` — real numbers, and framing

**A `resource_ref` must name a resource your profile declares.** Content cannot invent one.

```
v-002: policy_ref: unknown resource ref 'hr.policy-INVENTED'; declared: ['hr.ethics-line', 'hr.policy-harassment']
```

**A resource named in visible prose, immediately followed by a number, must carry that resource's
own value.** This catches a real-sounding pairing that is wrong, without flagging a correct value
that merely appears near other text.

```
v-003: prompt: 'hr.ethics-line' bound to '0800 555 9999' (canonical 0800 555 0100)
```

The match is on a digit run, so only numeric values are checked at all. A registered resource whose
canonical value is not a number, and a resource that declares no name patterns, are never
binding-checked — see [Known limits](#known-limits).

**Denied framing is reported by this same gate.** Every pattern in your `framing_denylist` is
matched against every `visible` and `deliberate_falsehood` field — the same text the budgets count. A
myth you are teaching someone to reject is exempt from fact-checking, not from framing. If a framing
finding surprises you by turning up under `resources`, that is why: both read the same text.

```
v-002: prompt: framing denied for this profile — '\\bchairman\\b' in 'The chairman will decide whether he or she atten'
```

The doubled backslashes are real output, not a typo here — the pattern is printed as a Python repr.

Note what this gate cannot do. It checks that a number you name is the number you registered; it has
no idea whether what you registered is real. That verification is yours, and it is the most
dangerous thing here to hand to an agent — an invented helpline clears every structural check.

## Bank-level rules

Five more rules run across the whole bank rather than item by item. They are **not gates**: they are
reported under their own names, outside the five-gate block, and carry no pass/fail status — they
either fired or they did not. They still block: a verdict is `pass` only when all five gates pass
**and** no bank rule fired at all.

**`parse`** — `line 1: json parse failed: Expecting ',' delimiter…`. Anything starting with `{` that
fails to decode, or decodes without an `id` or a mechanic. An earlier version dropped such lines
silently, and sixteen malformed items rode through a passing run.

**`duplicate_id`** — `d-001: appears more than once`. Whichever loads second wins, and any signal
keyed on that id conflates two different things. On a real 29,365-item corpus this found 14 ids
shared by entirely different items.

**`dedup_structural`** — `s-002: identical structure to s-001`. The fingerprint is derived from the
mechanic plus the normalised content of every `visible`, `deliberate_falsehood` and `semantic` field.
It is never author-declared — a projection you chose would let you decide what looks unique.

**`dedup_prose`** — `d-001 ≈ d-002 (jaccard 0.95 ≥ 0.82)`. Visible-word overlap above a threshold,
0.82 by default, compared across the whole bank rather than within a chapter or a mechanic, so it
sees duplicates that cross whatever categories you use. The naive version is 431 million set
comparisons at corpus scale and never finishes; the shipped one prefix-filters and finds every pair
the naive one would.

**`audience`** — `s-001: no audience given and the item declares none`. An item that fires this is
**skipped by all five gates** — with no audience there are no budgets or permissions to check
against — and it is set aside before its structural fingerprint is taken, so `dedup_structural` does
not see it either. `dedup_prose` still does. The bank blocks, but that report's gate section says
nothing about that item, and fixing the audience and re-running can surface a structural duplicate
the first run never looked for.

## Pass, fail, could not run

Every gate reports one of three statuses, and always reports one — `pass` (ran, found nothing),
`fail` (ran, found something), `could_not_run` (not evaluated on any item). A gate cannot be missing
from the results, so one that never ran can never be mistaken for one that passed. A gate that
raises is recorded as a finding, never omitted:

```
v-004: GATE COULD NOT RUN: unknown mechanic 'telepathy'. Declared: ['branch', 'reflect', 'sort'].
       The gate never infers a mechanic's shape; declare it or it does not ship.
```

An unknown mechanic is the usual cause, and it marks **four** of the five gates, not all of them.
`permissions` is the exception: it only tests the mechanic id against the audience's permit list and
never looks the mechanic's shape up, so it still runs. Since a profile is refused at load time if an
audience permits a mechanic it never declared, an undeclared mechanic can never be permitted — so
`permissions` always reports the ordinary
`mechanic 'telepathy' is not permitted for audience 'staff'` for one. Four unrun markers plus one
permission failure means the mechanic is undeclared; do not read the permission line as evidence
that it exists.

An **unknown audience** produces the same marker on the two gates that take an audience — `budgets`
and `permissions` — and on those two only:

```
v-005: GATE COULD NOT RUN: unknown audience 'interns'. Declared: ['managers', 'staff'].
       An unknown audience is never a default — it is a refusal.
```

Which gates carry the marker tells you which of the two problems you have. Either way it blocks: the
report counts `unrun_items` separately from `findings`, because a gate that could not run on one item
still examined the rest, and calling it "never ran" hides the real violations it found. A non-zero
`unrun_items` blocks, and an unexpected exception reports `GATE CRASHED (TypeError): …` and blocks
identically.

## The report

A run can emit a machine-readable JSON report: the verdict, per-gate status with a sample of
findings, the bank rules that fired, and totals. Two fields in it matter more than the verdict.
**`bank.content_digest`** is a digest of the bank, order-independent — re-serialising it does not
invalidate the report, changing one character of one item does. **`code_version`** is a digest of
the gate source itself: two reports with the same value came from byte-identical checking logic, two
with different values did not, whatever version numbers either claims. Together they answer the only
question a third party has — *was this verdict about the bank I am holding, and by which rules?*

A third digest, **`profile.file_digest`**, binds the report to the declared budgets and audiences —
but it is written only when the profile was loaded from a file path. Gate against a shipped profile
by name and the report carries no profile digest at all. Pass the path if you want all three.

A run that finds anything exits non-zero, so it fails a build step with nobody reading the output.
There is nowhere to send a report yet; see [Listing](https://owhile.vercel.app/creators/listing.md)
for what a listing will require and what is still undecided.

## Reported, never gated

Three things can appear in the report and pass or fail nothing. Unlike the gates, each one is
conditional — a gate cannot be missing from the results, but these can, and an absence is never a
pass.

**Concept coverage** — items per concept, how many carry none, and the thin tail: concepts held up
by one or two items, where a reader meets an idea once and never again. It appears only if your
profile names a `concept_field`, pointing at an existing field carrying the `opaque` role on every
mechanic. Neither reference profile declares one, so neither produces a coverage block.

**Guessability** — the chance of getting an item right by guessing, per decision rather than per
item (a six-item, two-bin sort has whole-item chance 1/64 but per-placement chance 1/2), plus the
blind spots: gradeable mechanics with no chance model, whose items no later signal can flag as below
chance, because they have no chance to be below. It appears only if the bank contains a gradeable
mechanic at all.

**Listing eligibility** — whether a bank gated for this audience may appear on the board. It reads
`min_age` off the audience: declared, never inferred. An audience declaring a `min_age` below 18 is
not listable, and an audience declaring no `min_age` is not listable either — silence is never read
as adult. A child-facing bank is valid content and passes every gate cleanly; it simply cannot be
listed here. This block appears **only when the run is given a single audience explicitly.** A run
that reads each item's own `audience` field emits no listing verdict at all, and its absence is not
an eligible verdict.

## Known limits

Said plainly, because a check you think you have is worse than one you know you lack.

- **`max` on a `count` invariant is accepted and never evaluated.** A profile declaring an upper
  bound loads without complaint and the bound never fires. A `count` with `max: 2` over three
  elements passes. Only `eq` and `min` are evaluated; use `eq` for an exact count.
- **`count_where` evaluates `eq` only.** The loader accepts `eq`, `min` or `max`. Declared with
  `min` or `max` and no `eq`, it loads clean and then reports `GATE CRASHED (KeyError): 'eq'` on
  every matching item. It blocks — a check that cannot run is a failure, not a skip — but it blocks
  for the wrong reason and after load, which is exactly the class of defect load-time validation
  exists to prevent. Always spell `count_where` with `eq`.
- **`role_totality` walks strings only.** A field an author invents that holds a number or a boolean
  — `difficulty: 7`, `is_trick: true` — carries no role and is never reported. This is awkward
  rather than incidental: `semantic` is the documented role for `best` and `trick`, which are
  typically booleans, so the fields most likely to be added to a mechanic without updating its roles
  are the ones this gate cannot see. The guarantee is over the text a person reads, not over every
  field in the item.
- **Resource binding only checks numbers.** The matcher looks for a digit run after the resource's
  name, and the captured value must start and end with a digit. A resource whose canonical value is
  not numeric — a policy code like `HR-114` — is registered but never verified in prose: an item
  reading "See the harassment policy HR-999" passes. A resource that declares no name patterns is
  never matched at all.
- **The `listing` block is written only when the run is given an audience.** It is not derived from
  each item's own `audience` field, so the ordinary per-item way of working produces a report with
  no listing verdict. A `pass` verdict with no listing block is not an eligibility finding.
- **`profile.file_digest` is written only when the profile was loaded from a path.** Gate against a
  profile by name and the report binds the content and the code, but not the declared budgets and
  ages.
- **The corpus proof covers four gates, not five.** The gates ran over a real 29,365-item corpus
  across 69 banks with zero findings and zero crashes on `role_totality`, `invariants`, `permissions`
  and `budgets`. That run used an empty resource registry, so `resources` is proven by the reference
  profiles and the test suite, not by that corpus.
- **Nothing here judges meaning.** Every gate is structural. An item can pass all five, clear every
  bank rule, and still teach the wrong thing, in the wrong voice, to the wrong person.

## Related

- [Setup](https://owhile.vercel.app/creators/start.md) — the step-by-step runbook.
- [The profile](https://owhile.vercel.app/creators/profile.md) — where every rule here comes from.
- [Listing](https://owhile.vercel.app/creators/listing.md) — the rule a report has to satisfy, the
  digest that binds it to its content, and why there is nowhere to send one yet.
