# owhile-web

> Public so it can be deployed and read. **Not open source** — see [LICENSE](LICENSE).

The owhile.ai website. Static HTML/CSS — **deliberately no build step and no client-side
rendering**, because the site's central requirement is that a creator can point a coding
agent at it and have the agent set them up. An agent fetching a JS-rendered SPA gets an
empty shell; server-rendered semantic HTML is what makes the requirement real.

Built against the Owhile design system (30 sections, adopted 2026-09-02).

## Run it

```bash
python3 -m http.server 8765
```

## What's here

| Path | |
|---|---|
| `index.html` | The station. Consumer landing. |
| `creators/` | The invitation — prose, for humans. |
| `creators/start.md` | The setup runbook — written to be executed by an agent. |
| `llms.txt` | Machine index, to the llms.txt **v2** spec (2026-08-10). |
| `robots.txt` | Explicitly allows `Claude-User` — blocking it would break the site's whole point. |
| `assets/css/owhile.css` | The design system. Every token traced to a section of the brand doc. |

## Deliberate choices

**No `llms-full.txt`.** Anthropic's is 42 MB; Stripe and llmstxt.org itself both 404 it.
A file that cannot enter a context window is a bulk-download artifact, not something an
agent reads mid-session.

**The self-locating banner.** `creators/start.md` opens with a pointer back to
`/llms.txt`, copying Anthropic's docs. An agent that lands on any single page — from a
search result, a stale link, a pasted URL — is then one hop from the map.

**The time picker is not built.** §13 makes "How long is your while?" a product
primitive, but a filter over an empty catalogue returns the same nothing at every
setting and teaches the visitor the site is empty in one click. The *question* ships as
a statement; the *picker* turns on at ~12 experiences across three duration bands.

## Production headers (`vercel.json`)

Three of these exist specifically to serve agents, copying what Anthropic's and Stripe's
docs actually send:

- **`Link: rel="llms-txt"` and `rel="describedby"`** — both, because the ecosystem has not
  converged. Mintlify emits the first; the llms.txt v2 spec says the second. They cost nothing.
- **`X-Llms-Txt`** — what Anthropic's docs send. Belt and braces.
- **`Content-Signal: search=yes, ai-train=yes, ai-input=yes`** — Stripe's posture. Worth
  setting explicitly because **Cloudflare auto-inserts `ai-train=no` by default on millions
  of domains**, and silently inheriting that would contradict the site's entire purpose.
- **Explicit `Content-Type` on `llms.txt` and `start.md`** so they render rather than download.

**No `cleanUrls`, no `trailingSlash` rewriting** — deliberately. `llms.txt` publishes exact
URLs and agents fetch them literally, so a redirect hop is a failure mode with no upside.

(Note for future edits: Vercel validates `vercel.json` against a strict schema that rejects
unknown keys, so it cannot carry `"//"` comment entries. Explanations go here instead.)

## What turns on when

Sections are written but held back until there is real content behind them, because a
page that implies a catalogue it does not have fails on its own terms.

| Turns on at | |
|---|---|
| 1 finished experience | The hero's **Step in** goes somewhere. |
| 3+ experiences | A **Running today** section, with real art and named makers. |
| ~12 across 3 duration bands | The **How long is your while?** picker becomes a control rather than a statement. |
| `owhile` published to PyPI | `creators/start.md` executes end to end. |

Until the last of those, the creator pathway ends at `creators/` and a conversation
rather than at the runbook.
