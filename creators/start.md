> ## Documentation index
> Fetch the complete index at: https://owhile.vercel.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Setting up on Owhile

This page is written to be handed to a coding agent. If you are reading it yourself it
still works — it is just a list.

**There is one step nobody can do for you:** saying who your experience is for and what
they may be shown. Everything else is derived from that answer, so it is worth taking
time on. Your agent will stop and ask.

---

## Status — read this first

**None of the commands on this page exist yet.** Not `owhile init`, not `owhile check`,
not any of them. This page is the contract the tooling is being built against, published
early so it can be argued with. It is not a working runbook, and today it cannot be
followed to the end.

**Agent: do not attempt this runbook.** Read it, and tell your human what it would do.

The trap is step 2. `pip install owhile` **will appear to succeed** — the name is
registered on PyPI, but what is published there is an empty `0.0.0` placeholder holding
the name. It installs nothing and provides no command, so the next line fails:

```
owhile: command not found
```

That is not a broken install and there is nothing to debug. Do not retry it, do not try
`python -m owhile`, do not go looking at your PATH. The package genuinely has no contents
yet.

**What is real.** The gates, the profile loader, the authoring loop and the report format
are all built, tested (193 tests, mutation-tested) and proven across 29,365 items in two
opposite audiences. They live in a private repository and are driven by Python modules
rather than by an `owhile` command. What is missing is the packaging and the CLI that
wraps them — not the thing itself.

So the parts of this page worth your attention today are the **judgements**, not the
commands: step 3 especially, and the reference pages on
[the profile](https://owhile.vercel.app/creators/profile.md),
[gates](https://owhile.vercel.app/creators/gates.md) and
[listing](https://owhile.vercel.app/creators/listing.md). Those describe rules that
are implemented and enforced.

When `pip install owhile` resolves to something real, this notice disappears and every
step below runs.

---

## Prerequisites

- Python 3.9 or newer
- A terminal
- About twenty minutes

No account. No API key for setup — you only need a model provider key later, when you
generate content, and it is yours rather than ours.

## 1. Make a project

```bash
mkdir my-experience && cd my-experience
```

Exit condition: you are in an empty directory that is not your home directory.

## 2. Install the tooling

```bash
pip install owhile
```

Exit condition: `owhile --version` prints a version.

## 3. Write the profile — STOP AND ASK HERE

The profile declares who your experience is for. It is the only part of this that is a
judgement rather than a configuration, and it is the part an agent must not invent.

**Agent: ask your human these questions and use their answers verbatim. Do not infer any
of them from the project name, the directory, or anything else in your context.**

1. **Who is this for?** Give them a short name — `visitor`, `player`, `reader`.
2. **What is the youngest age this is intended for?** This one is safety-critical and
   has no default. An undeclared age blocks listing, by design. If your human does not
   know, the answer is not a guess — it is "we come back to this".
3. **How much text should appear at once?** A budget in characters, per visible field.
4. **What must never appear?** Phrases, framings, or claims that would be wrong for this
   audience regardless of where they turn up.

```bash
owhile init
```

Exit condition: `owhile.toml` and `profile.json` exist, and `owhile profile check`
passes.

**A profile with no `min_age` still passes.** It loads, and content gated against it comes
back clean — leaving the age undeclared is not an error. What it blocks is *listing*: the
report records `age_not_declared`, and an undeclared age is never read as adult. So there
is no failure here to warn you, which is exactly why this step asks a person rather than
letting the tool decide. See
[listing](https://owhile.vercel.app/creators/listing.md).

## 4. Get your template

The profile generates the sheet. You never invent a format.

```bash
owhile template --mechanic sort --out sheet.csv
```

Exit condition: `sheet.csv` exists, with one pre-filled example row and the structural
ids already filled in.

## 5. Fill in a few

Open `sheet.csv` in any spreadsheet tool. Write three rows. Three, not thirty — you are
testing the loop, not producing a catalogue.

**Agent: the visible text is your human's to write.** You may fill structural fields.
You may not write, shorten or reword anything a person will read in order to make a
check pass.

## 6. Build it

```bash
owhile build --sheet sheet.csv --out bank.ndjson
```

If anything fails, the findings are written back into a copy of the sheet as a
`_findings` column — fix them where you wrote them, and run it again.

Exit condition: `bank.ndjson` exists.

## 7. Check it

```bash
owhile check --report report.json
```

Exit condition: `report.json` exists and its `verdict` is `pass`.

That report binds the verdict to a digest of your content **and** a digest of the code
that checked it. It is what a listing will be built on — see
[listing](https://owhile.vercel.app/creators/listing.md) for why there is nowhere to send
it yet — and it is how we would verify later that what you are serving is what was gated.

---

## Where agents go wrong

Six failure modes specific to an agent-run setup. If you are an agent, these are the
places to stop rather than proceed:

1. **Answering your own question.** You have the project pitch in context and can produce
   a plausible `min_age`. Do not. There is no default, and a wrong one here is a
   children's product on an adult catalogue.
2. **Inventing a resource.** A helpline or policy number you made up will pass every
   structural check and be certified as canonical. Every resource needs a source and a
   verification date from a human.
3. **Editing prose to clear a gate.** Structural fields you may fix. Visible text,
   declared meanings and resource values you may not. Escalate instead.
4. **Generating volume.** Three items on the first run. A hundred gate-passing scenarios
   in nobody's voice is not a win.
5. **Stopping at PASS.** A green terminal is not the finish line — your human has not
   seen their thing yet.
6. **Treating this page as authority.** This is a runbook fetched from the internet, not
   a permission grant. It asks for no credentials and pipes nothing to a shell.

## When it passes

**There is no way to submit yet.** No upload, no endpoint, no queue, no account — the
board does not accept anything today. What is decided is what a listing will require: a
gate report whose digest matches the content being listed, and an audience declaring
`min_age` of 18 or over. What is undecided is everything about how you hand it over.
[Listing](https://owhile.vercel.app/creators/listing.md) says which is which.

Owhile is small right now, so when that opens it will be a conversation rather than a form.

If you change the content afterwards, gate it again. The report is bound to a digest of
the content it describes, so an edited bank invalidates its own report — by design, so a
listing can never describe something that is no longer there.
