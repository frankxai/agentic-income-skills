---
name: income-legal-ops
description: The guardrail layer. The legal, tax, disclosure, and operational risks per income model, and how to design them out before they cost the operator. Use during the audit stage of /income, before shipping any offer or agent-earns endpoint. Trigger phrases — is this legal, disclosure, FTC, ToS risk, ops burden, refund, tax, compliance.
---

# income-legal-ops — design the risk out before it costs you

The architect uses this as its audit checklist. The goal isn't legal advice — it's catching the categories of risk that quietly turn a clean income system into a liability, and redesigning around them early when it's free instead of late when it's expensive.

## The risk categories (screen every model against these)

- **Disclosure** — affiliate links require clear disclosure before the money page (FTC-style). One disclosure per page, labeled, above the first affiliate CTA. Paid endpoints disclose the price before the charge. This is cheap and non-negotiable.
- **Claims** — no income guarantees, no "you'll make $X," no testimonials you can't substantiate. Confident about the method, precise about the uncertainty. Income-outcome claims are the fastest way to earn a regulator's attention.
- **Advice licensing** — financial, legal, medical, or tax *advice* is regulated. Educational frameworks and "here's the tool and the honest tradeoff" are not. Stay on the education side of the line; never tell a reader what *they* specifically should invest in or do with their money.
- **Data & scraping** — reselling scraped platform data, or a "signal feed" built on abusing a marketplace's terms, is a ToS breach and often worse. If a model depends on scraping-for-resale or rate-limit abuse, reject it — it was never an asset.
- **Likeness & voice** — AI avatars and voice cloning require consent from the person cloned. Disclose synthetic media in commercial use. Never clone a voice or face you don't have rights to.
- **Securities-adjacent** — token launches, yield/staking promises, "agent coins" are securities-shaped and off-thesis. The web3 layer sells *services for stablecoin*, not speculation.
- **Ops burden** — a support SLA, an uptime guarantee, a refund treadmill, or a client relationship each convert "autonomous income" into a job. Flag them; only accept them if the operator explicitly wants that trade.
- **Tax** — recurring affiliate and product income is taxable income; agent-wallet earnings are too. Not advice, just a flag: the operator needs a record. The revenue ledger already gives them one.

## How the architect uses this

For each candidate model, the architect names which of these it triggers and whether the trigger is **designed out** (disclosure added, claim removed, consent obtained), **accepted with eyes open** (operator wants the ops burden), or **disqualifying** (ToS abuse, unconsented likeness, securities). A model that can't clear this without becoming something the operator doesn't want to run gets rejected — with the reason stated, so the operator learns the filter.

## The standing rule

Nothing outbound — publish, send, deploy to a live domain, spend from a wallet — happens without the operator's explicit go. Every guardrail above is enforced by keeping the human at the approval boundary, not by trusting the automation to be careful.
