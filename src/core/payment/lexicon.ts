// Lexicon of the EXPERIMENTAL payment-manipulation detector (M5.2), English and Indonesian. Written for VEILTRACE (D-012).
// Negation, reported-speech and educational cues are reused read-only from the ClickFix lexicon.
import { AWARENESS_ID, AWARENESS_ID_EXAMPLES, IMPERSONATION_REPORT_ID, IMPERSONATION_REPORT_ID_EXAMPLES } from '../awareness.js';
import { LEXICON } from '../lexicon/index.js';
import { APOS, B, E } from '../lexicon/patterns.js';
import type { Lang, Strength } from '../types.js';
import type { PayLexiconEntry } from './types.js';

function entry(id: string, signal: PayLexiconEntry['signal'], lang: Lang, strength: Strength, source: string, examples: string[]): PayLexiconEntry {
  return { id, signal, lang, strength, pattern: new RegExp(source, 'gu'), examples };
}

const NUM = '\\d[\\d.,]*';

const REQUESTS: PayLexiconEntry[] = [
  // Imperatives and obligations addressed to the reader. Past tense ("paid", "transferred") is a report, not a request.
  entry('pay.en.pay', 'PY.PAY', 'en', 'strong',
    `${B}(?:pay|make\\s+(?:a\\s+|the\\s+)?payment|transfer|wire|deposit|top\\s+up|send\\s+(?:the\\s+|a\\s+|us\\s+|me\\s+)?(?:money|funds|payment|fee|amount|deposit)|(?:buy|purchase|get)\\s+(?:[\\p{L}\\d$]+\\s+){0,3}?(?:gift|google\\s+play|itunes|steam|apple)\\s+cards?)${E}`,
    ['pay', 'make a payment', 'transfer', 'send the money', 'buy three Google Play gift cards']),
  entry('pay.id.pay', 'PY.PAY', 'id', 'strong',
    `${B}(?:bayar(?:kan|lah)?|transfer(?:kan|lah)?|tf|lakukan\\s+(?:pembayaran|transfer)|setor(?:kan)?|top\\s*-?up|lunasi|kirim(?:kan)?\\s+(?:uang|dana|biaya|pembayaran)|(?:harus|wajib|perlu|diharuskan|segera|mohon|silakan|cukup)\\s+(?:membayar|mentransfer|menyetor|melunasi|mengirim(?:kan)?\\s+(?:uang|dana|biaya))|beli(?:kan)?\\s+(?:voucher|kartu\\s+hadiah)|(?:di)?wajib(?:kan)?\\s+(?:membeli|dibayar(?:kan)?)|(?:harus|wajib)\\s+(?:sudah\\s+)?di\\s?bayar(?:kan)?)${E}`,
    ['bayar', 'transfer', 'lakukan pembayaran', 'kirimkan uang', 'wajib membayar', 'belikan voucher', 'wajib membeli', 'diwajibkan dibayarkan']),
  // Requests phrased as an obligation, a demand under a condition ("jika tidak membayar") or a balance to fill (pay-0.6.0).
  entry('pay.id.pay_obligation', 'PY.PAY', 'id', 'strong',
    `${B}(?:selesaikan\\s+pembayaran|(?:jika|kalau|bila|apabila)\\s+(?:tidak|tdk|ga|gak|ora)\\s+(?:membayar|bayar|mentransfer|transfer)|(?:harus|wajib|segera|mohon)\\s+di\\s?(?:kirim|transfer)(?:kan)?|(?:saldo|deposit)\\s+(?:\\p{L}+\\s+)?(?:harus|wajib|perlu)\\s+(?:di)?isi)${E}`,
    ['selesaikan pembayaran', 'jika tidak membayar', 'harus dikirim', 'saldo tugas harus diisi']),
  // A down payment ("DP 50% dulu", "uang muka"): a request like any other; it needs an amount or a destination (D-102).
  entry('pay.id.down_payment', 'PY.PAY', 'id', 'strong', `${B}(?:dp|uang\\s+muka|down\\s*payment)(?:\\s+\\d+\\s?%)?(?:\\s+(?:dulu|dl|duluan))?${E}`, ['DP 50% dulu', 'uang muka', 'DP dl']),
  // Paying in capital for an "investment" ("setor modal", "investasikan dana", "modal mulai 500rb") (D-102).
  entry('pay.id.invest_pay', 'PY.PAY', 'id', 'strong',
    `${B}(?:setor(?:kan)?\\s+modal|(?:investasikan|tanamkan)\\s+(?:dana|modal|uang)|modal\\s+(?:awal\\s+)?(?:minimal|hanya|cuma|mulai(?:\\s+dari)?))${E}`,
    ['setor modal', 'investasikan dana', 'modal awal minimal', 'modal mulai dari']),
  // Phone-credit (pulsa) requests, a bare account handed over to pay into, and a payment routed through someone (pay-0.5.0).
  entry('pay.id.pulsa', 'PY.PAY', 'id', 'strong',
    `${B}(?:(?:kirim(?:i|in|kan)?|isi(?:kan|in)?|beli(?:kan|in|kn)?|tf(?:in)?)\\s+(?:\\p{L}+\\s+){0,2}?pulsa|ini\\s+(?:no\\.?\\s*)?rek(?:ening)?(?:nya|ku)?|(?:kirim|transfer|tf)(?:kan)?\\s+ke\\s+(?:bank|rek(?:ening)?)|di\\s?transfer\\s+ke\\s+rek(?:ening)?|pembayaran(?:nya)?\\s+(?:harus|agar|supaya|mohon|wajib)\\s+(?:\\p{L}+\\s+)?(?:melalui|lewat|via|ke|di)|(?:hanya|cuma)\\s+(?:melalui|lewat|via|ke)\\s+rek(?:ening)?)${E}`,
    ['kirimin pulsa', 'hanya melalui rekening', 'isi dl pulsa', 'Ini rekeningnya', 'Kirim ke Bank', 'ditransfer ke rek', 'Pembayaran harus melalui']),
];

const OBJECTS: PayLexiconEntry[] = [
  // Amounts: matched to tie a request to money. The value itself is never reported (PayObservation.text is "").
  entry('pay.amount', 'PA.AMOUNT', 'en', 'strong',
    `${B}(?:(?:rp\\.?|idr|usd|us\\$|\\$|€|£|eur)\\s?${NUM}(?:\\s?(?:juta|jt|ribu|rb|k|million|thousand))?|${NUM}\\s?(?:juta|jt|ribu|rb)?\\s?(?:rupiah|dollars?|usd|idr|euros?))${E}`,
    ['Rp 150.000', 'Rp2 juta', '$49.99', 'USD 200', '300 dollars', '500 ribu rupiah']),
  // Informal amounts without a currency sign ("50rb", "2jt", "100k"): only an object when a pay verb is in the same block.
  entry('pay.amount.informal', 'PA.AMOUNT', 'id', 'strong', `${B}\\d[\\d.,]*\\s?(?:rb|rbu|ribu|ewu|jt|juta|k)${E}`, ['50rb', '2jt', '100k', '150 ribu', '20ewu', '20 rbu']),
  entry('pay.en.fee', 'PF.FEE', 'en', 'weak', `${B}(?:fees?|surcharges?|charges?)${E}`, ['fee', 'charges']),
  entry('pay.id.fee', 'PF.FEE', 'id', 'weak', `${B}(?:biaya|ongkos(?:\\s+kirim)?|ongkir|pajak|pembayaran\\s+administrasi|saldo\\s+tugas)${E}`, ['biaya', 'ongkir', 'pajak', 'pembayaran administrasi', 'saldo tugas']),
  // A fee whose stated purpose is to release, unlock or hand over something: the core of advance-fee fraud.
  entry('pay.en.release_fee', 'PF.RELEASE_FEE', 'en', 'strong',
    `${B}(?:(?:account\\s+)?(?:verification|unlock(?:ing)?|unblock(?:ing)?|reactivation|account\\s+activation|release|clearance|anti-?money\\s+laundering|aml)\\s+(?:fees?|charges?|deposits?|tax(?:es)?)|(?:prize|winnings|lottery)\\s+(?:tax(?:es)?|fees?)|(?:tax(?:es)?|fees?)\\s+on\\s+(?:your\\s+)?(?:prize|winnings))${E}`,
    ['verification fee', 'unlock fee', 'release fee', 'clearance fee', 'prize tax', 'tax on your winnings']),
  entry('pay.id.release_fee', 'PF.RELEASE_FEE', 'id', 'strong',
    `${B}(?:biaya\\s+(?:verifikasi|aktivasi\\s+akun|buka\\s+blokir|pembukaan\\s+blokir|pencairan|pelepasan|klaim(?:\\s+hadiah)?|pengurusan\\s+hadiah)|pajak\\s+(?:hadiah|undian|pemenang)|biaya\\s+validasi|deposit\\s+aktivasi|uang\\s+jaminan|(?:dengan\\s+)?syarat\\s+biaya\\s+(?:admin(?:istrasi)?|pendaftaran)|biaya\\s+(?:seragam|id\\s*card)|(?:pembayaran\\s+)?(?:kaos\\s+)?seragam\\s+karyawan)${E}`,
    ['biaya verifikasi', 'biaya buka blokir', 'biaya pencairan', 'pajak hadiah', 'uang jaminan', 'syarat biaya admin', 'pembayaran kaos seragam karyawan']),
];

const DESTINATIONS: PayLexiconEntry[] = [
  // "your personal account" is the reader's own account (ordinary banking), so only someone else's personal account counts.
  entry('pay.en.personal', 'PD.PERSONAL', 'en', 'strong',
    `${B}(?:my|his|her|their|this|(?:the|our|an?)\\s+agent${APOS}s)\\s+(?:personal|private|own)\\s+(?:bank\\s+)?(?:account|wallet)${E}`,
    ['my personal account', "the agent's personal account"]),
  entry('pay.id.personal', 'PD.PERSONAL', 'id', 'strong',
    `${B}rekening\\s+(?:(?:pribadi|perorangan)(?!\\s+(?:anda|kamu))(?:\\s+(?:saya|kami|admin|petugas|agen))?|(?:saya|admin|petugas|agen|kurir|ajudan|staf|sekretaris))${E}`,
    ['rekening pribadi saya', 'rekening pribadi', 'rekening admin']),
  entry('pay.id.personal_informal', 'PD.PERSONAL', 'id', 'strong',
    `${B}(?:rek\\.?|norek|rekening)\\s+(?:admin|sy|aku|gw|gue|petugas|agen|kurir)${E}|${B}(?:dana|ovo|gopay|shopeepay|e-?wallet)\\s+(?:saya|sy|aku|gw|gue|admin|petugas)${E}`,
    ['rek admin', 'norek sy', 'dana sy', 'ovo admin']),
  entry('pay.id.personal_wallet', 'PD.PERSONAL', 'id', 'strong',
    `${B}(?:e-?wallet\\s+)?(?:dana|ovo|gopay|shopeepay|linkaja)\\s+\\+?\\d[\\d\\s-]{8,}\\d${E}|${B}(?:a\\s?/\\s?n|a\\.n|atas\\s+nama)[\\s.:;]+(?!(?:pt|cv|yayasan|koperasi|bank|perusahaan|(?:anda|kamu|mas|mbak|kak|kakak|bapak|ibu|bpk|penerima|pengirim)(?:nya)?)${E})\\p{L}`,
    ['E-WALLET DANA 081200000000', 'A/N Budi', 'A/n.RASTO']),
  // A phone number given as where to send phone credit or money ("pulsa ke nomor baru ini 0812…").
  entry('pay.id.personal_phone', 'PD.PERSONAL', 'id', 'strong',
    `${B}(?:ke|di|kana)\\s+(?:no(?:mor|mer)?\\.?|nmr|hp)\\s*(?:\\p{L}+[\\s,:]+){0,2}?\\+?\\d[\\d\\s-]{8,}\\d${E}`,
    ['ke no 081200000000', 'di nomor baru ini 0812 0000 0000']),
  // A bare account or phone number as where to send the money ("transfer … ke 1234567890").
  entry('pay.id.bare_account', 'PD.PERSONAL', 'id', 'strong', `${B}ke\\s+(?:rek(?:ening)?\\.?\\s*)?\\d[\\d\\s-]{7,}\\d${E}`, ['ke 1234567890', 'ke rekening 1234 5678 90']),
  // Payment redirected to another person who "has been authorized" (rent, instalments).
  entry('pay.id.proxy_payee', 'PD.PERSONAL', 'id', 'strong',
    `${B}(?:(?:sudah|sdh|dh|telah)\\s+(?:(?:saya|sy|aku)\\s+)?(?:di\\s?)?kuasakan|di\\s?kuasakan(?:\\s+sepenuhnya)?|(?:perubahan|ganti|pergantian)\\s+(?:no(?:mor)?\\.?\\s*)?rek(?:ening)?)${E}`, ['sudah dikuasakan', 'sdh dikuasakan', 'ada perubahan no rekening']),
  entry('pay.en.off_platform', 'PD.OFF_PLATFORM', 'en', 'strong',
    `${B}(?:(?:outside|off)\\s+(?:of\\s+)?(?:the\\s+|this\\s+)?(?:app|platform|marketplace|website|site|escrow)|directly\\s+to\\s+(?:me|my\\s+(?:account|number|wallet))|(?:skip|avoid|bypass|instead\\s+of)\\s+(?:using\\s+)?(?:the\\s+)?(?:checkout|escrow|platform\\s+payment|app\\s+payment))${E}`,
    ['outside the app', 'directly to me', 'instead of using the checkout']),
  entry('pay.id.off_platform', 'PD.OFF_PLATFORM', 'id', 'strong',
    `${B}(?:di\\s+luar\\s+(?:aplikasi|platform|marketplace|situs|rekber)|langsung\\s+ke\\s+(?:saya|rekening\\s+saya|nomor\\s+saya)|tanpa\\s+(?:melalui|lewat)\\s+(?:aplikasi|platform|checkout|rekber)|(?:transfer|tf)\\s+langsung)${E}`,
    ['di luar aplikasi', 'langsung ke saya', 'tanpa melalui aplikasi', 'transfer langsung']),
  entry('pay.en.gift_card', 'PD.GIFT_CARD', 'en', 'strong',
    `${B}(?:gift\\s*cards?|google\\s+play\\s+(?:gift\\s+)?cards?|itunes\\s+cards?|steam\\s+(?:gift\\s+|wallet\\s+)?cards?)${E}`, ['gift card', 'Google Play cards']),
  entry('pay.id.gift_card', 'PD.GIFT_CARD', 'id', 'strong',
    `${B}(?:kartu\\s+hadiah|voucher\\s+(?:google\\s+play|steam|itunes))${E}`, ['kartu hadiah', 'voucher Google Play']),
  entry('pay.en.crypto', 'PD.CRYPTO', 'en', 'strong',
    `${B}(?:bitcoin|btc|usdt|crypto(?:currency)?(?:\\s+wallet)?|wallet\\s+address)${E}`, ['bitcoin', 'USDT', 'wallet address']),
  entry('pay.id.crypto', 'PD.CRYPTO', 'id', 'strong', `${B}(?:aset\\s+kripto|kripto|alamat\\s+dompet)${E}`, ['kripto', 'alamat dompet']),
];

const RECEIVE: PayLexiconEntry[] = [
  entry('pay.en.refund', 'PR.REFUND', 'en', 'weak',
    `${B}(?:refunds?|reimbursement|compensation|overpayment|(?:release|unfreeze)\\s+(?:your\\s+|the\\s+)?(?:funds|money|payment|package|parcel|shipment)|(?:funds|money|payment|package|parcel)\\s+(?:is|are|has\\s+been|have\\s+been)\\s+(?:on\\s+hold|held|frozen))${E}`,
    ['refund', 'compensation', 'release your funds', 'package is on hold']),
  entry('pay.id.refund', 'PR.REFUND', 'id', 'weak',
    `${B}(?:pengembalian\\s+dana|refund|ganti\\s+rugi|kompensasi|kelebihan\\s+(?:bayar|pembayaran)|(?:dana|paket)(?:\\s+(?:anda|kamu))?\\s+(?:tertahan|dibekukan|ditahan)|(?:pencairan|mencairkan)\\s+dana|(?:dana|komisi|saldo)\\s+(?:pada|di|dalam|dari)?\\s*(?:[\\p{L}]+\\s+){0,4}?(?:tertahan|dibekukan|ditahan))${E}`,
    ['pengembalian dana', 'dana pada akun email tertahan', 'komisi pekerjaan tertahan', 'kompensasi', 'dana Anda tertahan', 'pencairan dana']),
  entry('pay.id.release_informal', 'PR.REFUND', 'id', 'weak',
    `${B}(?:saldo|bonus|hadiah|dana|uang|cashback|komisi)\\s+(?:[\\p{L}\\d]+\\s+){0,4}?(?:siap\\s+|bisa\\s+|langsung\\s+)?(?:dicair(?:kan|in)|cair|ditarik|withdraw)${E}`,
    ['saldo bonus 2jt kakak udah siap dicairin', 'komisi bisa ditarik']),
  entry('pay.en.prize', 'PR.PRIZE', 'en', 'weak',
    `${B}(?:you(?:${APOS}ve|\\s+have)?\\s+(?:won|been\\s+selected)|(?:lucky|selected)\\s+winner|your\\s+(?:prize|winnings|reward)|claim\\s+(?:your\\s+)?(?:prize|winnings|reward)|grand\\s+prize|lottery\\s+winnings?)${E}`,
    ["you've won", 'lucky winner', 'claim your prize']),
  entry('pay.id.prize', 'PR.PRIZE', 'id', 'weak',
    `${B}(?:anda\\s+(?:telah\\s+|resmi\\s+)?(?:memenangkan|terpilih|menang|mendapatkan\\s+hadiah)|pemenang(?:\\s+(?:undian|program|giveaway))?|hadiah\\s+(?:undian|utama|anda|uang\\s+tunai)|klaim\\s+hadiah|undian\\s+berhadiah)${E}`,
    ['Anda memenangkan', 'pemenang undian', 'hadiah utama', 'klaim hadiah']),
  // A guaranteed place in a selection (recruitment, admission) is never sold: paying for it is the scam (P2, D-087).
  entry('pay.id.recruit', 'PR.RECRUIT', 'id', 'strong',
    `${B}(?:(?:dijamin|pasti|100\\s?%)\\s+(?:lulus|lolos|diterima|masuk)|jalur\\s+(?:khusus|belakang|titipan|orang\\s+dalam)\\s+(?:masuk|seleksi|pendaftaran|penerimaan|rekrutmen|bintara|tamtama|akmil|akpol|polri|tni|cpns|pns|kedinasan)|(?:lewat|melalui|via)\\s+jalur\\s+(?:belakang|titipan|orang\\s+dalam)|uang\\s+(?:pelicin|titipan\\s+(?:seleksi|masuk))|orang\\s+dalam|jaminan\\s+100\\s?%|tanpa\\s+(?:tes|test|seleksi|interview|wawancara)(?:\\s+(?:ataupun|atau|maupun|dan)\\s+(?:tes|test|interview|wawancara))?|langsung\\s+(?:ttd|tanda\\s+tangan)\\s+kontrak)${E}`,
    ['dijamin lulus', 'jalur khusus seleksi bintara', 'lewat jalur belakang', 'uang pelicin', 'orang dalam', 'tanpa Tes ataupun Interview', 'JAMINAN 100%']),
  // A job offer: something the reader is promised to receive. A fee or purchase required for it is pay-to-receive (pay-0.4.0).
  entry('pay.id.job', 'PR.JOB', 'id', 'weak',
    `${B}(?:panggilan\\s+kerja|lowongan(?:\\s+kerja)?|karyawan\\s+baru|calon\\s+(?:karyawan|pekerja|mitra)|diterima\\s+(?:kerja|bekerja)|siap\\s+kerja|kerja\\s+(?:di\\s?sini|besok)|(?:pekerjaan|kerja)\\s+online|tugas\\s+(?:online|harian|like|follow|review|rating)|komisi\\s+(?:tugas|pekerjaan|harian))${E}`,
    ['Panggilan kerja', 'pekerjaan online', 'tugas like', 'komisi pekerjaan', 'lowongan', 'karyawan baru', 'calon mitra', 'siap kerja']),
  entry('pay.en.job', 'PR.JOB', 'en', 'weak',
    `${B}(?:job\\s+offer|you(?:${APOS}ve|\\s+have)\\s+been\\s+(?:hired|selected\\s+for\\s+the\\s+(?:job|position))|new\\s+(?:hire|employee)s?|(?:work|job)\\s+from\\s+home\\s+(?:job|position))${E}`,
    ['job offer', "you've been hired", 'new employees']),
  // A guaranteed or fixed investment return: a percentage per day or week, a profit that is "fixed", "certain" or "guaranteed",
  // capital that "doubles", an investment "without risk" (D-102). Interest per month or year (deposits, loans) is not matched.
  entry('pay.id.invest', 'PR.INVEST', 'id', 'strong',
    `${B}(?:(?:keuntungan|profit|untung|cuan|hasil)\\s+(?:harian\\s+)?(?:tetap|pasti|dijamin|terjamin|konsisten)|\\d+(?:[.,]\\d+)?\\s?%\\s*(?:per|tiap|setiap|/)\\s*(?:hari|minggu|pekan)|(?:modal|dana|uang)\\s+(?:\\p{L}+\\s+){0,2}?(?:dijamin\\s+)?(?:berlipat(?:\\s+ganda)?|kembali\\s+\\d+\\s?(?:x|kali))|(?:investasi|modal|dana)\\s+(?:\\p{L}+\\s+){0,3}?(?:tanpa|bebas|nol)\\s+risiko|(?:pasti|dijamin)\\s+(?:untung|profit|cuan))${E}`,
    ['keuntungan tetap', 'profit 5% per hari', 'modal dijamin berlipat', 'investasi tanpa risiko', 'pasti untung']),
  entry('pay.en.invest', 'PR.INVEST', 'en', 'strong',
    `${B}(?:guaranteed\\s+(?:returns?|profits?|income|daily\\s+(?:returns?|profits?))|(?:fixed|daily)\\s+(?:returns?|profits?)|\\d+(?:\\.\\d+)?\\s?%\\s*(?:daily|per\\s+day|a\\s+day|per\\s+week|weekly)|risk[\\s-]free\\s+(?:investment|returns?|profits?)|double\\s+your\\s+(?:money|investment|capital))${E}`,
    ['guaranteed returns', '3% daily', 'risk-free investment', 'double your money']),
  entry('pay.en.recruit', 'PR.RECRUIT', 'en', 'strong',
    `${B}(?:guaranteed\\s+(?:to\\s+pass|admission|acceptance|a\\s+(?:place|spot|seat))|back[\\s-]?door\\s+(?:entry|admission|route)|special\\s+(?:quota|route)\\s+for\\s+(?:a\\s+)?fee)${E}`,
    ['guaranteed to pass', 'backdoor admission']),
  entry('pay.en.unlock', 'PR.UNLOCK', 'en', 'weak',
    `${B}(?:(?:unlock|unblock|reactivate|re-activate|restore|reopen|unfreeze)\\s+(?:your\\s+|the\\s+)?(?:account|wallet|card|access|profile|withdrawals?)|(?:verify|activate)\\s+(?:your\\s+)?(?:account|wallet))${E}`,
    ['unlock your account', 'reactivate your wallet', 'verify your account']),
  entry('pay.id.unlock', 'PR.UNLOCK', 'id', 'weak',
    `${B}(?:buka\\s+blokir|membuka\\s+blokir|aktivasi(?:\\s+ulang)?|mengaktifkan(?:\\s+kembali)?|memulihkan|pemulihan|verifikasi)\\s+(?:akun|rekening|dompet|kartu|saldo)${E}`,
    ['buka blokir akun', 'aktivasi ulang akun', 'verifikasi akun']),
  entry('pay.id.unlock_informal', 'PR.UNLOCK', 'id', 'weak',
    `${B}(?:buka|bka|aktifin|aktifkan|pulihin|balikin)\\s+(?:lagi\\s+)?akun(?:nya|\\s+(?:kamu|lu|lo|kakak|kak))?${E}`, ['buka akunnya', 'aktifin lagi akun kamu']),
  // The clause that makes the payment a precondition for receiving something.
  entry('pay.en.condition', 'PC.CONDITION', 'en', 'weak',
    `${B}(?:(?:in\\s+order\\s+)?to|before\\s+(?:we|you)\\s+can|so\\s+(?:that\\s+)?(?:we|you)\\s+can|for\\s+us\\s+to)\\s+(?:receive|claim|release|unlock|unblock|reactivate|activate|withdraw|collect|redeem|restore|recover|unfreeze|process\\s+(?:your\\s+|the\\s+)?(?:refund|prize|withdrawal))${E}`,
    ['to receive', 'to claim', 'before we can release', 'to process your refund']),
  entry('pay.id.condition', 'PC.CONDITION', 'id', 'weak',
    `${B}(?:(?:agar|supaya|untuk|sebelum|baru)\\s+(?:(?:dapat|bisa)\\s+)?(?:menerima|mencairkan|dicairkan|mengklaim|diklaim|membuka|dibuka|mengaktifkan|diaktifkan|menarik|ditarik|memulihkan|dipulihkan|dilepas|mengambil|diambil|diproses|dikirim)|(?:terlebih|lebih)\\s+dahulu|sebelum\\s+(?:mulai|memulai|bekerja)|(?:cair(?:kan)?|ditarik|tarik)\\s+setelah|(?:setelah|sesudah)\\s+(?:deposit|top\\s*-?up|isi\\s+saldo))${E}`,
    ['agar dapat dicairkan', 'untuk mengambil', 'terlebih dahulu', 'cairkan setelah deposit', 'untuk mencairkan', 'supaya bisa dibuka']),
  entry('pay.id.condition_obligation', 'PC.CONDITION', 'id', 'weak',
    `${B}(?:(?:di)?wajib(?:kan)?\\s+(?:membeli|membayar|dibayar(?:kan)?|bayar)|dengan\\s+syarat|sebagai\\s+syarat|(?:harus|wajib)\\s+(?:sudah\\s+)?di\\s?bayar(?:kan)?)${E}`,
    ['wajib membeli', 'diwajibkan dibayarkan', 'dengan syarat', 'harus sudah di bayarkan']),
  entry('pay.id.condition_informal', 'PC.CONDITION', 'id', 'weak',
    `${B}(?:(?:abis|habis|setelah|sesudah)\\s+(?:itu|bayar|transfer|tf)|baru(?:\\s+(?:bisa|dapat))?)\\s+(?:langsung\\s+)?(?:cair|dicair(?:kan|in)|masuk|dikirim|aktif|dibuka|kebuka)${E}`,
    ['abis itu langsung cair', 'setelah transfer langsung masuk', 'baru bisa cair']),
  entry('pay.en.condition_after', 'PC.CONDITION', 'en', 'weak',
    `${B}(?:then|after\\s+that|once\\s+(?:paid|you\\s+pay))\\s+(?:your\\s+)?(?:funds|money|prize|refund|balance|parcel|package|account)\\s+(?:will\\s+be\\s+)?(?:released|sent|unlocked|credited|delivered)${E}`,
    ['then your funds will be released', 'once paid your parcel will be delivered']),
];

const PRESSURE: PayLexiconEntry[] = [
  entry('pay.en.threat', 'PP.THREAT', 'en', 'weak',
    `${B}(?:(?:account|wallet|card|access|profile|funds|number|sim)\\s+(?:will\\s+be|has\\s+been|is\\s+being|may\\s+be)\\s+(?:permanently\\s+)?(?:suspended|locked|blocked|disabled|deactivated|closed|terminated|frozen|restricted|seized)|(?:will|may|could)\\s+be\\s+(?:arrested|prosecuted|sued|charged|jailed|detained|deported)|arrest\\s+warrant|warrant\\s+for\\s+your\\s+arrest|(?:face|facing)\\s+(?:legal\\s+action|prosecution|criminal\\s+charges|arrest)|legal\\s+action\\s+(?:will|against\\s+you))${E}`,
    ['account will be suspended', 'will be arrested', 'warrant for your arrest', 'face legal action']),
  entry('pay.id.threat', 'PP.THREAT', 'id', 'weak',
    `${B}(?:(?:akun|rekening|kartu|dompet|saldo|nomor)(?:\\s+(?:anda|kamu))?\\s+(?:akan\\s+|telah\\s+|sudah\\s+)?(?:di)?(?:blokir|nonaktifkan|tutup|bekukan|sita|tangguhkan)|akan\\s+(?:di)?(?:tangkap|penjarakan|pidanakan|polisikan|proses\\s+(?:secara\\s+)?hukum|laporkan\\s+ke\\s+(?:polisi|pihak\\s+berwajib))|surat\\s+(?:penangkapan|perintah\\s+penangkapan)|terancam\\s+(?:pidana|penjara|ditangkap)|untuk\\s+menghindari\\s+(?:pemblokiran|penonaktifan|penutupan|denda)|(?:data|foto|video)\\s+(?:\\p{L}+\\s+){0,2}?(?:akan\\s+)?(?:disebar(?:kan)?|dipublikasikan|diviralkan|dibocorkan)|agar\\s+(?:data|foto|video)\\s+(?:\\p{L}+\\s+)?(?:tidak|tdk|ora)\\s+(?:disebar(?:kan)?|dipublikasikan|diviralkan|dibocorkan)|(?:sebelum\\s+)?paket\\s+(?:akan\\s+)?(?:dikembalikan|dimusnahkan))${E}`,
    ['akun Anda akan diblokir', 'untuk menghindari pemblokiran', 'data pribadi Anda akan disebarkan', 'sebelum paket dikembalikan', 'akan ditangkap', 'terancam pidana']),
  entry('pay.id.threat_informal', 'PP.THREAT', 'id', 'weak',
    `${B}(?:(?:ke|ter)hapus\\s+permanen|kena\\s+(?:blokir|banned|suspend)|(?:bakal|mau)\\s+(?:di)?(?:blokir|hapus|banned|suspend))${E}`,
    ['kehapus permanen', 'kena blokir', 'bakal diblokir']),
  // Deadlines in minutes or hours and explicit pressure. "Expires in / valid for" on real payment links is excluded.
  entry('pay.en.urgency', 'PP.URGENCY', 'en', 'weak',
    `${B}(?:(?<!(?:expires?|valid\\s+for|valid)\\s)within\\s+\\d+\\s+(?:minutes?|mins?|hours?|hrs?)|immediately|right\\s+now|act\\s+now|urgent(?:ly)?|as\\s+soon\\s+as\\s+possible|before\\s+it${APOS}?s\\s+too\\s+late|final\\s+warning|last\\s+chance)${E}`,
    ['within 2 hours', 'immediately', 'urgent', 'final warning']),
  entry('pay.id.urgency', 'PP.URGENCY', 'id', 'weak',
    `${B}(?:(?<!(?:berlaku|kedaluwarsa|kadaluarsa|hangus)\\s)dalam\\s+(?:waktu\\s+)?\\d+\\s+(?:menit|jam)|segera|sekarang\\s+juga|hari\\s+ini\\s+juga|peringatan\\s+terakhir|mendesak|secepatnya|kesempatan\\s+terakhir)${E}`,
    ['dalam 30 menit', 'segera', 'sekarang juga', 'secepatnya']),
  entry('pay.id.urgency_informal', 'PP.URGENCY', 'id', 'weak',
    `${B}(?:buruan|cepetan|cpt|penting|jangan\\s+(?:telepon|telpon|tlp|nelpon|telfon)|usahakan\\s+hari\\s+ini|sebelum\\s+jam\\s+\\d+|sampe\\s+jam\\s+\\d+|slot(?:nya)?\\s+(?:cuma|terbatas)|(?:paling\\s+lambat\\s+)?malam\\s+ini|(?:lowongan|kuota)\\s+(?:hanya|cuma)\\s+untuk\\s+\\d+|(?:tidak|tdk|ora|tanpa)\\s+(?:perlu\\s+)?(?:konfirmasi|verifikasi|cek)(?:\\s+(?:ulang|lagi|lembaga))?|jangan\\s+(?:tanya|bertanya|konfirmasi|cek)(?:\\s+(?:ke\\s+)?(?:lembaga|siapa|pihak))?)${E}`, ['buruan', 'cpt', 'sampe jam 12', 'slotnya cuma', 'malam ini', 'lowongan hanya untuk 2', 'tidak perlu konfirmasi ulang', 'tanpa perlu verifikasi', 'jangan tanya lembaga']),
  // Claimed identity or authority. Never verified; never escalates on its own.
  entry('pay.en.authority', 'PP.AUTHORITY', 'en', 'weak',
    `${B}(?:customer\\s+(?:support|service|care)(?:\\s+(?:team|agent|officer|representative))?|support\\s+(?:team|agent|staff|desk)|help\\s*desk|(?:security|fraud|billing|compliance|verification)\\s+(?:team|department|officer|agent)|bank\\s+(?:officer|representative|staff|manager)|police(?:\\s+(?:officer|department))?|customs\\s+(?:office|officer|department|authority)|tax\\s+(?:office|officer|authority|department)|court\\s+(?:officer|order)|(?:government|federal)\\s+agent|official\\s+(?:support|agent|representative|account))${E}`,
    ['customer service', 'support agent', 'fraud department', 'police officer', 'customs officer']),
  entry('pay.id.authority', 'PP.AUTHORITY', 'id', 'weak',
    `${B}(?:customer\\s+service|cs\\s+resmi|layanan\\s+pelanggan|petugas(?:\\s+(?:bank|resmi|bea\\s+cukai|pajak|kepolisian|kurir|ekspedisi))?|pihak\\s+(?:bank|kepolisian|bea\\s+cukai|berwajib)|polisi|kepolisian|bea\\s+cukai|kantor\\s+pajak|admin\\s+resmi|tim\\s+(?:keamanan|resmi|verifikasi)|kurir\\s+resmi)${E}`,
    ['customer service', 'petugas bank', 'pihak kepolisian', 'bea cukai']),
  // Ranks and positions used to impersonate officials (P2, D-087): a claim only, never verified.
  entry('pay.id.authority_rank', 'PP.AUTHORITY', 'id', 'weak', `${B}(?:dandim|danrem|pangdam|danyon|danramil|kapolres|kapolda|kapolsek|kasdam|ajudan|babinsa|perwira|komandan|kolonel|letkol|mayor|kapten|lettu|letda|jenderal|brigjen|sertu|serka|pejabat|staf\\s+ahli|penyidik|bagian\\s+penyidikan|pimpinan|atasan)${E}`, ['Dandim', 'ajudan', 'Kapten', 'penyidik', 'pimpinan']),
  // A message that claims to come from a family member on a new number ("ini nomor baru papa"), or opens by addressing a parent.
  entry('pay.id.family', 'PP.FAMILY', 'id', 'weak',
    `${B}(?:ini\\s+(?:no(?:mor|mer)?|nmr)\\s+baru(?:\\s+(?:papa|mama|ayah|ibu|bapak|mamah|bunda|om|tante|kakak|adik|aku|saya))?|no(?:mor|mer)?\\s+baru(?:ku|\\s+(?:papa|mama|ayah|ibu|aku|saya))|^(?:ma|mah|mama|mamah|pa|pah|papa|yah|ayah|bu|ibu|bunda|bun)(?=[\\s,'"”!.:]))${E}`,
    ['ini nomor baru papa', 'no baruku', 'ma, isi dl pulsa']),
  entry('pay.en.authority_rank', 'PP.AUTHORITY', 'en', 'weak', `${B}(?:colonel|captain|lieutenant|commanding\\s+officer|commander|investigator|detective)${E}`, ['colonel', 'investigator']),
];

/** Context cues reused unchanged from the ClickFix lexicon (negation, reported speech, educational framing). */
const OWN_CONTEXT: PayLexiconEntry[] = [entry('pay.id.awareness', 'C.EDUCATIONAL', 'id', 'strong', AWARENESS_ID, AWARENESS_ID_EXAMPLES),
  entry('pay.id.impersonation_report', 'C.REPORTED', 'id', 'strong', IMPERSONATION_REPORT_ID, IMPERSONATION_REPORT_ID_EXAMPLES)];

const SHARED_CONTEXT: PayLexiconEntry[] = LEXICON
  .filter((e) => e.signal === 'C.NEGATION' || e.signal === 'C.REPORTED' || e.signal === 'C.EDUCATIONAL')
  .map((e) => ({ ...e, signal: e.signal as 'C.NEGATION' | 'C.REPORTED' | 'C.EDUCATIONAL' }));

export const PAY_LEXICON: readonly PayLexiconEntry[] = [...REQUESTS, ...OBJECTS, ...DESTINATIONS, ...RECEIVE, ...PRESSURE, ...OWN_CONTEXT, ...SHARED_CONTEXT];
export const PAY_OWN_LEXICON: readonly PayLexiconEntry[] = [...REQUESTS, ...OBJECTS, ...DESTINATIONS, ...RECEIVE, ...PRESSURE];
