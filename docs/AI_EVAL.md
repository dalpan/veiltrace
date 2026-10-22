# On-device AI opinion: evaluation on development data (D-093, D-094)

Run by the owner on 2026-10-22 in Chrome desktop with the built-in model (Gemini Nano, Prompt API), prompt with the D-094 guidance and four worked examples, through `npm run build:ai-eval` → `ai-eval.html`. Raw results: `eval/ai-eval-results.json` (labels, VeilTrace result, AI answer and timing per item; no page text). 185 development scenarios; the 15 field records have no resolved labels yet and are excluded from the counts. **Development data, and the worked examples resemble some of it: these numbers are optimistic for the AI.** An alert = "suspicious" or "manipulative".

| Data | AI alone | VeilTrace alone | AI or VeilTrace |
|---|---|---|---|
| All 185 | TP 81 · FP **73** · TN 30 · FN 1 (recall 99%, **benign false-alarm rate 71%**) | TP 80 · FP 0 · TN 103 · FN 2 (98%, 0%) | TP 82 · FP 73 · TN 30 · FN 0 |
| ClickFix dev (56) | FP 27 of 32 benign (84%) | FP 0 | – |
| Credential dev (45) | FP 17 of 24 (71%) | FP 0 | – |
| Payment dev (40) | FP 16 of 23 (70%) | FP 0 | – |
| Support dev (44) | FP 13 of 24 (54%) | FP 0 | – |

- The model calls almost every page manipulative; its confidence does not separate right from wrong (39 of 73 false alarms were "high").
- Field sample (unlabelled): it alerts on 14 of 15 records, including the genuine bank OTP SMS (RW-0014), and on the three scams VeilTrace misses (RW-0005, RW-0007, RW-0011). With a 71% false-alarm rate on benign pages those extra alerts carry little information.
- Median time per item: about 5.6 s.
- Device check (owner screenshot): the legitimate checkout demo is still "manipulative, high" after the D-094 prompt changes; the disagreement note is shown.

**Conclusion.** In this configuration the on-device model is not a usable classifier for these pages (mostly Indonesian, which the model does not officially support). Showing its verdict to users would teach them to ignore alerts. It must not be presented as a detection.
