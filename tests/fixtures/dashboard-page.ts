// M5.4 dashboard fixture: one page with three threat types. A ClickFix dialog, a support alarm that is also an advance-fee
// payment request (one element cited by two detectors), and a comment asking for an OTP. Fictional; 555-01xx number.
export const MULTI_THREAT_BODY = `<header>Daily News</header>
  <div role="dialog" id="gate"><h2>Verify you are human</h2><p>Press Win+R, then Ctrl+V and press Enter.</p></div>
  <main><p id="alarm">Your computer is infected. Call Windows Support at +1 888 555 0199 immediately and pay the unlock fee of $199 to unlock your computer.</p>
  <section class="comment-list"><div class="comment" id="c1"><p>Official support team here. To verify your account, send me the 6-digit code we just texted you.</p></div></section></main>`;
