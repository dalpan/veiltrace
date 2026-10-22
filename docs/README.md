# VeilTrace documentation

Technical documentation for reviewers, operators and contributors. Hackathon materials in Indonesian (proposal, slides, video script, jury Q&A) are in [../submission/](../submission/).

## Start here (reviewers)

| Question | Document |
|---|---|
| What problem, for whom, and what is in scope? | [PRODUCT_SPEC](PRODUCT_SPEC.md) |
| How is it built? Components, the `PageSnapshot` contract, permissions | [ARCHITECTURE](ARCHITECTURE.md) |
| How does it decide? Signals, regions, rules, context modifiers, every detector version | [DETECTION_MODEL](DETECTION_MODEL.md) |
| What attacks does it target, and what can evade it? | [THREAT_MODEL](THREAT_MODEL.md) |
| How is privacy protected, and how is each promise verified? | [PRIVACY_SECURITY](PRIVACY_SECURITY.md) |
| How good is it, honestly? | [EVALUATION_RESULTS](EVALUATION_RESULTS.md) (held-out v1) · [EVALUATION_RESULTS_V2](EVALUATION_RESULTS_V2.md) (held-out v2) · [AI_EVAL](AI_EVAL.md) (on-device AI, not used) |
| How does it compare with similar tools? | [COMPETITIVE_ANALYSIS](COMPETITIVE_ANALYSIS.md) · [RESEARCH](RESEARCH.md) |

## Using and deploying it

| For | Document |
|---|---|
| IT or security staff: reading results, limits, installation, troubleshooting | [OPERATOR_GUIDE](OPERATOR_GUIDE.md) |
| Organizations: managed build, policies, update server | [DEPLOYMENT](DEPLOYMENT.md) |
| Presenters: demo setup and scripts | [PRESENTER_GUIDE](PRESENTER_GUIDE.md) · [DEMO](DEMO.md) |
| Release engineers: reproducible builds, checksums, SBOMs | [RELEASE](RELEASE.md) |

## Evaluation protocol

Held-out sets are written before testing, hash-locked, preregistered and run once on the owner's request; results are published whether or not targets are met.

- [EVALUATION_PLAN](EVALUATION_PLAN.md): corpora, leakage controls, metrics, baselines
- Preregistrations: [v1](EVAL_PREREGISTRATION.md) · [v2](EVAL_PREREGISTRATION_V2.md) · [v3](EVAL_PREREGISTRATION_V3.md)
- Real-world field sample: [../corpus/realworld/README.md](../corpus/realworld/README.md)

## Project records

Kept in the repository on purpose: they show how and why each choice was made.

- [DECISIONS](DECISIONS.md): every accepted design decision (D-001 …), with its reason
- [PROGRESS](PROGRESS.md): dated log of what was done, how it was verified, and what is next
- [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md): milestones and acceptance criteria
