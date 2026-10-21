# VeilTrace demo site (fictional)

`nusaverta/` is a static, fictional help center used in the hackathon demo. "Nusaverta" and all hosts are invented. The pages contain no JavaScript and load no external resources. The community post in `index.html` is a synthetic, defanged social-engineering lure: its hidden command points to a `.invalid` host, and nothing on the page copies, downloads or runs anything.

| Page | Purpose | Engine 0.2.0 result (tested) |
|---|---|---|
| `index.html` | Help article + third-party community widget with a ClickFix lure | Manipulative instruction (R1) |
| `benign.html` | Same page, ordinary community answer | No suspicious instructions |
| `cli.html` | Developer docs with install commands | Observed instructions only (R5) |

Serve it with `npm run manual:fixtures` and `python3 -m http.server 8080 -d dist/manual`, then open `http://localhost:8080/demo/`. Presenter instructions: `docs/PRESENTER_GUIDE.md`. This folder is not part of the extension and is not included in release ZIPs.
