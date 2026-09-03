> ## Documentation index
> Fetch the complete index at: https://owhile.vercel.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Listing

Listing is the last step. A gate report says your content passed; a listing puts it on the
board here. This page is about what stands between those two things.

Most of what this page describes is not built yet. Read the Status section before you plan
around any of it.

---

## Words used here

- **Item** — one unit of content: a single scenario, sort or question. On disk, one JSON
  object on one line.
- **Bank** — the file of items your experience draws on. Everything on this page is about a
  bank as a whole, not about a single item.
- **Mechanic** — the play verb an item uses, such as `sort`, `branch` or `reflect`. The
  profile declares each mechanic's fields and what each field means.
- **Audience** — a named group the profile declares, carrying a reading budget, a set of
  permitted mechanics and a `min_age`. A bank is always gated *against* one audience.
- **Field paths** — `items[]` means "every element of the `items` list"; `items[].text`
  means "the `text` field of each of those elements". A path without `[]`, such as `prompt`,
  names a single field.

---

## Status — read this first

**Built, tested, running today:**

- The eligibility rule. It decides whether a bank gated for a given audience may appear on a
  general-audience catalogue. Adults only, declared rather than inferred, failing closed.
  All four of its verdicts — adult, child-facing, undeclared age and unknown audience — are
  each asserted in the gate test suite, along with the rule that a small reading budget never
  implies a child. That suite runs 159 checks; with the authoring-sheet suite the repository
  runs 191, and all of them pass.
- The report format that carries that verdict, bound by digest to the exact content it
  describes, to the profile that declared the audience, and to the exact code that checked it.

**Not built. Not in beta, not behind a flag, not a form we have not linked yet:**

- Submission. There is no upload, no endpoint, no queue, no review, no account.
- A board with entries on it. The catalogue is empty and the site says so on the front page.

So you cannot list today, and nothing on this page tells you how to.

What you **can** do is produce the report a listing will be built on. That part shipped:
`pip install owhile`, then `owhile check --report report.json`. Keep it. When there is somewhere
to send one, the rule it has to satisfy is the rule described below — which is the part that
would otherwise send you back to the start.

---

## The rule: adults only

The threshold is 18. It is a constant in the gate code, not a policy note:
`LISTING_ADULT_AGE = 18`.

The check reads one field — `min_age` on the audience your bank was gated for. `min_age` is
the youngest age your experience is *intended* for, declared by you in the profile. It is
not the reading age of the text and not a legal minimum somebody looked up.

The check itself returns one of three verdicts. The report records a fourth of its own when
the check refuses to run at all.

**Eligible.** The audience declares an age of 18 or over.

```json
{ "eligible": true, "reason": "adult_audience", "min_age": 18 }
```

**Child-facing.** The audience declares an age below 18. Seventeen blocks. The threshold is
18, not "roughly adult".

```json
{
  "eligible": false,
  "reason": "child_facing",
  "min_age": 5,
  "detail": "audience 'early-reader' declares min_age 5, below 18. Listing it would make the catalogue a service likely to be accessed by children, which attaches age assurance and parental-consent obligations to the catalogue itself."
}
```

**Age not declared.** The audience says nothing about age. This blocks.

```json
{
  "eligible": false,
  "reason": "age_not_declared",
  "detail": "audience 'reviewers' declares no min_age. An undeclared age is unknown, and unknown blocks — silence is never read as adult."
}
```

**Audience unknown.** You named an audience the profile does not declare. This one does not
come from the check: the check raises and returns nothing, and the report writes the refusal
down in its place. An unknown audience is never a default.

```json
{
  "eligible": false,
  "reason": "audience_unknown",
  "detail": "unknown audience 'nope'. Declared: ['managers', 'staff']. An unknown audience is never a default — it is a refusal."
}
```

Calling the eligibility check directly with an unknown audience raises an error rather than
returning that object. Only the report manufactures it. Three checks hold that path: that the
verdict is not eligible, that the reason is `audience_unknown` rather than an age verdict, and
that the detail names the audience you got wrong.

---

## Why the rule is shaped this way

**The obligation attaches to the catalogue, not to you.** A service likely to be accessed by
children pulls in age assurance, parental consent and the Age Appropriate Design Code. If
Owhile lists an experience likely to be accessed by under-18s, those duties attach to
**Owhile**, whoever built the thing. That is why this is a listing-time check rather than a
declaration we take on trust.

**The trigger is likely access, not stated intent.** This is the part people get backwards. A
mixed adult-and-child audience is **not** safer than a child-only one. The Age Appropriate
Design Code applies to any service *likely to be accessed by* children under 18 — it does not
ask whether children are your *exclusive* audience, so an experience spanning adults and
children falls in scope just as one aimed squarely at children does. The rule therefore turns
on the youngest reader you declare, not the one you had in mind.

The 18 in the code comes from that regime. COPPA, the US rule people usually reach for first,
is a narrower thing: it covers services directed to under-13s or with actual knowledge of
them, and it has its own lighter mixed-audience treatment. It is not what this threshold is
built on, and it is not named anywhere in the gate code.

**None of this is a judgement about your work.** A child-facing bank can be excellent, and it
passes every gate. It simply cannot go on this catalogue, because this catalogue is a
different kind of thing with a different set of duties.

### Declared, never inferred

The answer comes from `min_age` and from nothing else. The gate will not deduce "child-facing"
from a small reading budget, a simple vocabulary, or a subject that sounds young — that is
exactly the label-reading [the gates](https://owhile.vercel.app/creators/gates.md) exist to
refuse. A 40-grapheme budget could be a pre-reader or an adult with a cognitive disability,
and guessing between them is not something software should do. An audience with a 40-grapheme
budget and `min_age: 30` is eligible, and that case is in the test suite.

(Budgets are counted in graphemes — what a reader would call a character, so one emoji or one
accented letter counts once regardless of how many bytes it takes. The setup runbook says
"characters" for the same measure.)

The value is validated when the profile loads, not when the listing is checked: `min_age` must
be a whole number from 0 to 120. Strings, floats and booleans are refused at load. The budgets
are held to the same standard — `text_budget` and `prose_budget` must be positive whole
numbers, and a boolean is refused explicitly, because in Python a `true` is an integer and it
used to load as a budget of one grapheme.

### Fail closed

Absence is unknown, and unknown blocks. The failure mode of reading silence as "adult" is a
children's product on a general catalogue, which is the single outcome this rule exists to
prevent.

This is why [the setup runbook](https://owhile.vercel.app/creators/start.md) stops and makes
your human answer the age question, and why an agent must not fill it in from the project
pitch. There is no default. If nobody knows the answer yet, the answer is "we come back to
this" — not a plausible number.

### Listing is not a gate

Eligibility is reported, never gated. A child-facing bank with clean content produces a report
whose `verdict` is `pass` and whose `listing.eligible` is `false`. Both statements are true and
they answer different questions:

- `verdict` — is this content sound against the profile it declares?
- `listing` — may this catalogue carry it?

Abridged, from a real report over a one-item bank gated for an audience declaring `min_age: 8`:

```json
{
  "schema": "praxis.gate-report/1",
  "verdict": "pass",
  "code_version": "b48e810a5c171213",
  "audience": "a",
  "profile": { "id": "t", "content_digest": "c84bc6b57be62bec906d8954f64ec273" },
  "bank": { "items": 1, "content_digest": "97b37629a601b5c8582687bf8c236f8b" },
  "listing": {
    "eligible": false,
    "reason": "child_facing",
    "min_age": 8,
    "detail": "audience 'a' declares min_age 8, below 18. …"
  }
}
```

An agent reading a report must check both. A green verdict is not a listing.

---

## The digest binding

A listing needs a report that is provably about the content being listed. The report format
does that work, and it is the reason a report cannot be detached from its bank or reused
after an edit.

Every report carries `"schema": "praxis.gate-report/1"` and three digests, plus a fourth when
the profile was loaded from a file path:

| Field | Covers | Answers |
|---|---|---|
| `bank.content_digest` | every item in the bank | was this verdict about the content you are holding? |
| `profile.content_digest` | the profile's declarations | were these the declared audiences, budgets and ages? |
| `code_version` | the gate, profile-loader and authoring-sheet source | which code reached this verdict? |
| `profile.file_digest` *(optional)* | the profile file as bytes, and only when one was loaded from a path | was it this exact file? |

`bank.content_digest` is **order-independent**: it is built from the sorted per-item digests, so
re-serialising a bank does not invalidate its report, while changing one character of one item
does. That is the property that makes the report worth submitting. A digest that does not match
what you serve means the report is stale or the content changed after gating, and it is
detectable without anyone reading your bank.

`profile.content_digest` has the matching property on the other side. It is computed when the
profile loads, and it digests the **declarations** rather than the file bytes — so reformatting
a profile, reordering its keys or reindenting it does not invalidate its reports, while changing
one budget, one `min_age` or one invariant does. It is always in the report, including when the
profile was loaded by name rather than from a path.

`code_version` is a digest of the source that produced the verdict, not a version string
somebody maintains — version strings drift from what actually ran. Two reports with the same
`code_version` were produced by byte-identical code. Two with different digests were not,
whatever they claim — though the difference can come from any of the three files it covers,
so a changed digest does not on its own mean the gate logic changed.

**If you change the content, gate it again.** A report describes one exact bank; edit the bank
and the old report describes something that no longer exists. That re-run is not something you
can do yourself yet — see Status.

---

## Known limits

Three things in the report are less than they look, and two bound what a `pass` is worth. All
five are confirmed against the current code. None is a plan; this is what runs today. Five
more were on this list and are now fixed — they are written up in the next section rather than
deleted.

**Limits in the report:**

- **The `listing` block appears only when an audience is named at the top level.** Items may
  each carry their own `audience` field, and the gates fall back to it when you do not name
  one. If you rely on that fallback, the gates still run and the report still reaches a
  verdict — but the report's `audience` is `null` and there is **no `listing` key at all**.
  Absent is not eligible. If you are producing a report for a human to keep, name the audience.
- **`profile.file_digest` is written only when the profile was loaded from a path.** This is no
  longer the difference between a profile binding and none — the declarations are always bound.
  It is the difference between "these were the rules" and "this was the file". Pass the path if
  you want both.
- **`code_version` is not a digest of the gate logic alone.** It hashes three files — the
  gates, the profile loader and the authoring-sheet builder — so editing the sheet builder
  changes the digest while every gate is byte-identical.

**Limits in the gates the report certifies:**

- **A missing `[]` in a field path is silent.** `{"kind": "count", "field": "items", "max": 4}`
  counts the list as a single value, so a nine-element list satisfies it; `{"kind": "unique",
  "field": "items.id"}` resolves to nothing and checks nothing. Both load clean, because the
  loader cannot tell a path that names one field from a path that meant every element of a
  list. Write `items[]` when you mean every element, and read a rule that never fires as a
  suspect rather than as a pass.
- **Naming an audience overrides each item's own.** The top-level audience wins wherever it is
  given; an item's `audience` field is only the fallback for items when none is named. So
  gating a mixed bank against one audience silently checks every item against that one — and
  the listing verdict is about that one audience too, not about the mix you actually shipped.
  If your bank spans audiences, do not name one.

---

## Fixed, and what holds them fixed

Seven defects are fixed — five of them were on this page's own limits list. They stay written
down rather than quietly deleted, because a rule is worth what the record of its failures says it
is worth. Three of the seven were **fail-open**: a rule that loaded, reported nothing, and looked
exactly like a pass. The rest failed loudly, which is bad but not dangerous.

Every fix below is asserted in the suite and mutation-tested. The suite went from 126 checks to
193, and the 29,365-item corpus still gates to zero findings across all five gates.

- **`max` on a `count` invariant is enforced.** It used to load and never run: a mechanic
  declaring `{"kind": "count", "field": "items[]", "max": 2}` accepted an item with four
  options and reported nothing anywhere. A three-element list against that rule now reports
  `items[]: 3 (need at most 2)`.
- **`count_where` takes `min` and `max`, not `eq` alone.** Declared with either one it used to
  load clean and then crash with `KeyError: 'eq'` on every item — noisy rather than silent,
  since a gate that cannot run counts as a failure, but it blocked banks whose profiles were
  correct. All three bounds now evaluate exactly as they do on `count`:
  `xs[] where {'b': True}: 1 (need at least 2)`, or `… (need at most 1)`.
- **`role_totality` walks every scalar, not only strings.** An invented field holding a number,
  a boolean or a null carried no declared role and was never reported. This was the worst of
  the four, because the roles most likely to be added to an item without updating its mechanic
  — `best`, `trick` — are usually booleans, so the fields the role system exists to force into
  the open were exactly the ones it could not see. An undeclared `difficulty: 7` now reports
  `field 'difficulty' has no declared role in mechanic 'sort' (value '7')`. The message is
  unchanged; the value is stringified into it.
- **Resource binding checks non-numeric values.** The pattern it matched had to start and end
  with a digit, so a canonical value that is not a number was never checked at all — including
  `HR-114` in this repository's own reference profile, where prose reading "the harassment
  policy HR-999" passed without a finding. A captured value may now carry letters but must
  contain at least one digit, so `HR-999` is caught while ordinary prose ("call the ethics line
  at reception") is still not a binding. Trailing prose is trimmed off the capture, so "ethics
  line 0800 555 0100 to report" binds `0800 555 0100`; and comparison is case-folded, so
  `hr-114` reads as a correct citation of `HR-114` rather than a wrong one.
- **Budgets are refused at load unless they are positive whole numbers.** A JSON `true` is an
  integer in Python, so it loaded as a budget of one grapheme and then failed every visible
  field in the bank — a profile mistake that read as broken content. `text_budget` and
  `prose_budget` now refuse booleans, non-integers and anything at or below zero, at load.
- **The report always carries a profile digest.** `profile.file_digest` needs a path, so a
  report produced from a profile loaded by name used to bind the content and the code and
  nothing about the declarations — while this page said every report bound all three.
  `profile.content_digest` is computed at load and is always present.
- **`audience_unknown` is tested.** The branch was implemented and reproducible, and nothing
  held it to its behaviour, so a refactor that let the error escape — or that quietly recorded
  `eligible: true` — would have been caught by no test at all. Three checks now cover it.

Two of these were the same shape: **the loader accepted a rule the gate could not execute.**
That is the class the fixes closed, and it is why the loader is strict about things it could
plausibly wave through — a bound it will not evaluate, a budget it cannot count with. A rule
that loads is a rule that runs, or it does not load.

---

## What a submission would have to establish

This much is decided, and it is the whole reason the report format exists:

> To be listed, submit a gate report whose digest matches what you serve.

That is a deliberate choice about enforcement. Owhile does not want your bank — a self-hosted
creator keeps their content, and the digest lets a claim be checked without anyone handing it
over. The lever is distribution, not private use: nothing here stops you building, running or
selling child-facing work. It stops it appearing on this board.

**What is not decided:** everything else a listing needs. What a submission carries beyond the
report — metadata, a preview image, a duration, a description — is an open question. So is how
Owhile verifies a digest against a live experience. So is pricing. None of that is designed, and
this page will not guess at it.

---

## What to do in the meantime

1. **Declare `min_age` now.** It costs nothing and it is the field that decides everything else.
   See [the profile](https://owhile.vercel.app/creators/profile.md).
2. **If your audience is under 18, know that early.** Nothing else on this page will change that
   outcome, and finding out at submission time is worse than finding out now.
3. **Plan to keep the report next to the content it describes.** They are a pair, and a report
   on its own is an assertion about a bank nobody can identify. You cannot produce one yet, so
   for now this is a habit to build into your project layout rather than a step to take.
4. **Do not wait for the board to start building.** The catalogue is quiet and we are not going
   to pretend otherwise. What we can offer today is the rules themselves — written down,
   implemented and tested, so you can build against them. The tooling that would let you run
   them yourself is not published, and an audience is not something we can promise yet.

---

## Related

- [Setup runbook](https://owhile.vercel.app/creators/start.md) — the loop that ends in a report.
- [The profile](https://owhile.vercel.app/creators/profile.md) — where `min_age` is declared.
- [Gates](https://owhile.vercel.app/creators/gates.md) — what the verdict is made of.
