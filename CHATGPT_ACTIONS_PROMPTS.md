# ChatGPT Actions Prompt Guide

Use these prompts when you want ChatGPT connected to the Explorers Map Actions API to create new editorial records effectively.

Pair these prompts with `CHATGPT_ACTIONS_OPERATING_PROCEDURE.md` when you want the GPT to follow the short, low-hesitation create routine.

## Prompt Pattern

The strongest prompts usually include:

- country
- exact region
- how many listings to create
- whether ChatGPT should research candidates itself
- whether to create drafts immediately
- whether to leave listings region-only or link destinations when clearly supported
- any media preference such as Wikimedia cover images

Recommended base pattern:

```text
Create [number] new draft listings in [region], [country]. Research suitable outdoor/nature places yourself, check for existing matches first, use real evidence, and create only the listings that are clearly new. If there are weak out-of-scope lookalikes, treat them as warnings only. Leave listings region-only unless a destination is clearly supported by evidence.
```

## Single Listing Prompts

```text
Create 1 new draft listing in Somerset, United Kingdom. Research a strong outdoor or nature place yourself, check for duplicates first, use real evidence when available, and create it if it is clearly new. If optional metadata like cover images or coordinates is still missing after research, create the draft anyway with the required copy only. Treat weak out-of-scope lookalikes as warnings only.
```

```text
Create a new draft listing for Glastonbury Tor in Somerset, United Kingdom. Research the place, gather evidence, choose the best category, set accurate coordinates, and create it if there is no real duplicate in Somerset. If other-region lookalikes appear, treat them as advisory warnings only.
```

```text
Research and create 1 hidden-gem hiking listing in Snowdonia, United Kingdom. Use real sources, avoid duplicates, and create the draft directly if the evidence is good enough.
```

## Batch Region Prompts

```text
Create 3 new draft listings in Gloucestershire, United Kingdom. Choose well-known outdoor or nature places yourself, gather evidence with web search, avoid duplicates, and create only the listings that are clearly new. If some optional metadata is still missing, create best-effort drafts instead of stalling. If fewer than 3 can be created safely, say which ones were created and which were skipped.
```

```text
Create 2 new listings in Devon, United Kingdom for scenic viewpoints. Research candidates yourself, verify coordinates and category from evidence, and create only records that are clearly new to Devon.
```

```text
Create 3 new draft listings in the Dorset region, United Kingdom, and link them to Jurassic Coast only if that destination membership is clearly supported by evidence. Check for duplicates first and proceed autonomously.
```

## Destination-Aware Prompt

```text
Create 3 new draft listings in Somerset, United Kingdom. Research suitable outdoor/nature places yourself, check for existing matches first, use real evidence, and create only the listings that are clearly new. If there are weak out-of-scope lookalikes, treat them as warnings only. Leave listings region-only unless a destination is clearly supported by evidence. Source the cover image from Wikimedia.
```

## Strong Add-On Sentence

If you want the GPT to act with less back-and-forth, append this sentence:

```text
Do the research yourself and proceed without asking me for source links unless the geography is ambiguous or credible evidence cannot be found.
```

Example:

```text
Create 1 new draft listing in Somerset, United Kingdom. Do the research yourself and proceed without asking me for source links unless the geography is ambiguous or credible evidence cannot be found. Check for duplicates first, use real evidence, and treat weak out-of-scope lookalikes as warnings only.
```

## Prompts To Avoid

These are workable, but they leave too much unstated:

- `Create one listing in Somerset`
- `Add some places in England`
- `Create Glastonbury Tor`

## Best Short Template

```text
Create [N] new draft listings in [Region], [Country]. Research candidates yourself, check for existing matches first, use real evidence, and create only records that are clearly new. Treat weak out-of-scope lookalikes as warnings only. [Optional: leave region-only / link to destination X if supported.]
```
