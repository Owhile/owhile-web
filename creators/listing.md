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
  Three of its verdicts — adult, child-facing and undeclared age — are each asserted in the
  gate test suite, along with the rule that a small reading budget never implies a child.
  That suite runs 94 checks; with the authoring-sheet suite the repository runs 126, and all
  of them pass. The fourth verdict, `audience_unknown`, is implemented but has no test.
- The report format that carries that verdict, bound by digest to the exact content it
  describes and to the exact code that checked it.

**Not built. Not in beta, not behind a flag, not a form we have not linked yet:**

- Submission. There is no upload, no endpoint, no queue, no review, no account.
- A board with entries on it. The catalogue is empty and the site says so on the front page.
- An `owhile` command — or any other way for you to run these checks yourself. There is no
  CLI. The published `owhile` package on PyPI is an empty `0.0.0` placeholder registered to
  hold the name; installing it gives you no command. The gate code itself lives in a private
  repository, so there is no library to import and no hosted checker either. **You cannot
  produce a gate report today.** The rules below are built, tested and running — on our
  side, not yet on yours.

So you cannot list today, and nothing on this page tells you how to. What you can do today
is design content that will satisfy the rule when there is somewhere to send it — which is
worth doing, because the rule is the part that would otherwise send you back to the start.

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
returning that object. Only the report manufactures it.

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
be a whole number from 0 to 120. Strings, floats and booleans are refused at load.

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
  "code_version": "89753a1fc7791314",
  "audience": "a",
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

Every report carries `"schema": "praxis.gate-report/1"` and two digests, plus a third when
the profile was loaded from a file path:

| Field | Covers | Answers |
|---|---|---|
| `bank.content_digest` | every item in the bank | was this verdict about the content you are holding? |
| `code_version` | the gate, profile-loader and authoring-sheet source | which code reached this verdict? |
| `profile.file_digest` *(optional)* | the profile file, and only when one was loaded from a path | were these the declared audiences and budgets? |

`bank.content_digest` is **order-independent**: it is built from the sorted per-item digests, so
re-serialising a bank does not invalidate its report, while changing one character of one item
does. That is the property that makes the report worth submitting. A digest that does not match
what you serve means the report is stale or the content changed after gating, and it is
detectable without anyone reading your bank.

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

Four things in the report are less than they look, and four more bound what a `pass` is worth.
All eight are confirmed against the current code. None is a plan; this is what runs today.

**Limits in the report:**

- **The `listing` block appears only when an audience is named at the top level.** Items may
  each carry their own `audience` field, and the gates fall back to it when you do not name
  one. If you rely on that fallback, the gates still run and the report still reaches a
  verdict — but the report's `audience` is `null` and there is **no `listing` key at all**.
  Absent is not eligible. If you are producing a report for a human to keep, name the audience.
- **`profile.file_digest` is written only when the profile was loaded from a path.** Load a
  shipped profile by name and the report binds the content and the code but not the declared
  budgets and ages. Pass the file path if you want all three digests.
- **`code_version` is not a digest of the gate logic alone.** It hashes three files — the
  gates, the profile loader and the authoring-sheet builder — so editing the sheet builder
  changes the digest while every gate is byte-identical.
- **The `audience_unknown` branch has no test.** The other three verdicts are asserted; this
  one is implemented and reproducible but uncovered. Treat it as working code that nothing
  yet holds to its behaviour.

**Limits in the gates the report certifies:**

- **`max` on a `count` invariant is accepted and never enforced.** The loader takes `eq`,
  `min` or `max`; the gate evaluates only `eq` and `min`. A mechanic declaring
  `{"kind": "count", "field": "options[]", "max": 2}` loads without complaint, and an item
  with four options passes. If you need a ceiling, spell it as `eq`.
- **`count_where` evaluates `eq` only.** Declared with `min` or `max` alone it loads clean and
  then reports `GATE CRASHED (KeyError): 'eq'` on every item. A gate that cannot run is a
  failure rather than a skip, so this blocks the whole bank instead of passing it — noisy, but
  not silent. Spell the count with `eq`.
- **`role_totality` walks strings only.** A field an author invents that holds a number or a
  boolean — `difficulty: 7`, `is_trick: true` — carries no declared role and is never
  reported. The guarantee is over the text a person reads, not over every field in the item.
  That matters here because the roles most likely to be added without updating a mechanic,
  `best` and `trick`, are usually booleans.
- **The resource-binding check only reads numeric values.** It flags a resource's name followed
  by a wrong value, but the pattern it matches must start and end with a digit. A canonical
  value that is not a number is never checked: the reference workplace profile declares a
  policy with the canonical value `HR-114`, and prose reading "the harassment policy HR-999"
  passes without a finding. A wrong phone number is caught; a wrong policy code is not.

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
