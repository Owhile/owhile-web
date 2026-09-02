# owhile-web

The owhile.ai website. Static HTML/CSS — **deliberately no build step and no client-side
rendering**, because the site's central requirement is that a creator can point a coding
agent at it and have the agent set them up. An agent fetching a JS-rendered SPA gets an
empty shell; server-rendered semantic HTML is what makes the requirement real.

Built against `Praxis/knowledge/brand/owhile-design.md` (30 sections, adopted 2026-09-02).

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

No `cleanUrls`, no `trailingSlash` rewriting: `llms.txt` publishes exact URLs and agents
fetch them literally. A redirect hop is a failure mode with no upside here.

## Ship gates — this is not launchable yet

1. **Hero "Step in"** needs one finished experience good enough to be the front door.
2. **A "Running today" section** needs 3+ real experiences with real art and named makers.
3. **The time picker** needs ~12+ across three duration bands.
4. **`creators/start.md` step 2 does not work** — `pip install owhile` resolves to a
   placeholder. The gates exist and are tested; they are not published.
5. **A cold agent run** must be done once: point a fresh agent at the URL with no other
   context and confirm it reaches a passing gate report unaided.

Until 4 and 5 are closed, the creator pathway should end at `creators/` and an email
address rather than at the runbook.
