# How to send the ÚOOÚ enquiry

All facts below were verified against ÚOOÚ's own published pages and the cited statutes.
Sources are listed at the bottom. Anything unverified is marked as such.

## Send `letter-cs.md`, not `letter-en.md`

The Czech text is the artifact. Whether ÚOOÚ answers English-language written
enquiries is **not verified** — no published statement either way. The only explicit
language statement on the English contact page is that *phone* consultations are
Czech-only. `letter-en.md` exists for the repo record only.

## Channel

| Option | Address | Notes |
|---|---|---|
| **Datová schránka** (preferred) | `qkbaa2n` | Reliable identification + delivery receipt. Max 100 MB. |
| E-mail | `posta@uoou.gov.cz` | Formally fine for an enquiry. Max 20 MB. |
| Post / in person | ÚOOÚ podatelna | Needed only if you send a hand-signed original. |

ÚOOÚ says of datová schránka / signed e-mail / post / in-person that these
"umožňují Úřadu **spolehlivě ověřit Vaši totožnost**".

An unsigned e-mail is acceptable for an enquiry — a qualified signature or DS is
required only where a *formal filing* must be authenticated.

**Not verified:** whether a Czech sole trader has a mandatory datová schránka
(that turns on zákon č. 300/2008 Sb., which was not fetched). Check your own DS.

### Hard rules

- **Do not encrypt or password-protect** the message or any attachment. ÚOOÚ states
  that "zaheslovaná, zašifrovaná … nebudou dále zpracovávána" — it will not be processed.
- **No links to external storage.** Attach, or paste inline.
- Size caps: 20 MB by e-mail, 100 MB by datová schránka.

## Framing — already applied to the letter

Framed as a **žádost o konzultaci** under Art. 57(1)(b) and (d), in the category of
consultations for controllers that have **not** appointed a DPO. The letter states
explicitly that no DPO was appointed and why Art. 37(1) does not require one — this
pre-empts the "ask your DPO first" deflection.

The letter also follows ÚOOÚ's own consultation criteria by **proposing its own
answers with reasoning** (Readings A / B / C). Their template asks for exactly that
("Zpracujte návrhy řešení"). Pre-analysed enquiries are the ones that get substantive
replies.

### Do NOT reframe it as any of these

- **Art. 36 prior consultation** — the trigger fails (no DPIA), and Art. 36(2)
  expressly lets ÚOOÚ deploy Art. 58 powers, *including a processing ban*, inside
  that procedure. ÚOOÚ has received zero qualifying Art. 36 requests in its history.
- **A 106/1999 information request** — § 2(4) excludes opinions and the creation of
  new information. ÚOOÚ re-routes such enquiries to the consultations unit anyway, so
  you lose the 15-day deadline you were reaching for. Use 106/1999 *only* to obtain an
  existing document (a past decision, an internal methodology).
- **A podnět** — that invites an investigation *of you*.

## Identification to include

Give name + address + IČO + e-mail. It costs nothing and removes any pretext for not
answering. The signature block in the letter follows the § 37(2) správní řád standard
(name, date of birth, place of business/residence, IČO), which is the formal-filing
standard — stricter than anything published for enquiries, deliberately.

**Not verified:** whether ÚOOÚ discards anonymous enquiries. No published statement
found; the published authentication rule concerns Art. 77 *complaints* only. In any
case an anonymous enquiry has no address to answer to.

## What to expect

- A **non-binding** written *sdělení/vyjádření*.
- **No enforceable deadline.** § 71's 30 days does not reach part-four úkony, because
  § 154 omits § 71 from its cross-reference list. The letter therefore asks for a reply
  "v přiměřené lhůtě". Follow up rather than escalate for nečinnost.
  (Contested: whether § 154's "přiměřeně použije i další ustanovení" catch-all pulls
  § 71 back in. Verified only that § 71 is absent from the enumerated list.)
- **General východiska for your own assessment, not approval of your design.** ÚOOÚ
  states outright that "aprobace … popsaného jednání správce" cannot be the subject of
  a consultation.
- A real chance of a generic answer, or one surfacing as a generalised Q&A / annual-report
  entry rather than an individual reply ("méně již formou individuálních odpovědí").
- **Not free of charge as of right.** Art. 57(3) covers only data subjects and DPOs;
  Art. 57(4) permits a fee or refusal for manifestly unfounded/excessive requests. In
  practice ~1,300 written enquiries a year are answered without charge, but there is no
  entitlement.
- No in-person consultation. 2025's went to Škoda Auto, ŘLP and Česká školní inspekce —
  controllers affecting "značné množství subjektů údajů".

**Not verified:** typical real-world response latency. Annual reports give volumes, not
latencies.

## Relevant negative finding

ÚOOÚ has **no published position** on app developers, local-first / on-device-only
software, or whether device-local processing engages the GDPR. Both Q&A trees and the
sitemap were searched for `aplikac`, `mobiln`, `vývojář`, `lokáln`, `offline`,
`zařízení uživatel` — nothing on point. The question appears to be publicly unanswered,
which is what justifies asking it.

## Citation hazards (all verified first-hand)

Every quote in `letter-cs.md` was checked against text extracted from a PDF on disk.
The following traps were found and are already handled in the letter:

1. **CNIL's "Le RGPD n'est pas applicable au logiciel fourni" does NOT reach this app.**
   The exemption is conditioned on no sharing with the publisher's servers *"ni avec ceux
   du fournisseur du système d'exploitation"* and, for health apps, *"uniquement locale,
   sans connexion extérieure"*. CloudKit **is** the OS provider's servers. This is
   refuted, not merely unverified. The letter raises it against itself rather than
   hiding it. CNIL also treats OS backup as a processing operation requiring
   qualification (incl. Chapter V transfers) and recommends OS/third-party server
   backups be **off by default**.
2. **Never cite connected-vehicles ¶74 without ¶75.** ¶74 concerns the *natural
   person's* processing and is premised on "without the transfer of personal data to a
   data controller or data processor"; ¶75 immediately reasserts that the GDPR applies
   to means-providers, naming service providers. Citing ¶74 alone misrepresents the
   document.
3. **CNIL is soft law** — a *recommandation* adopted by délibération n° 2025-024
   (27 March 2025). Not a binding référentiel. Do not describe it as binding.
   Délibération n° 2024-061 is **repealed** — do not cite it as current.
4. **Do not quote the 2018 CNIL health-app sentence** ("...ne s'applique pas") — the
   published text is missing its grammatical subject, a CMS defect present in the live
   page and in 2018/2019 Wayback snapshots. Unquotable. The 2025 recommendation
   supersedes it.
5. **Nothing on this point is in the "Guide RGPD du développeur"** — the full repo was
   cloned and grepped. Do not attribute the quote there.
6. **The EDPB connected-vehicles v2.0 `/system/files/2021-03/...` URL 404s.** Pair any
   citation with a Wayback URL.
7. **WP202 is weaker than it first looks** — "considerably limited" limits the *extent
   of obligations*, not the role; §3.3.1 affirms the developer *is* controller to the
   extent it determines purposes and means on smart devices. It is also a 95/46/EC-era
   opinion.

## Sources

All fetched and quoted directly:

- https://uoou.gov.cz/kontakt
- https://uoou.gov.cz/kontakt/podatelna-a-elektronicka-podatelna
- https://uoou.gov.cz/verejnost/konzultacni-kriteria
- https://uoou.gov.cz/poradna/poradna-poverenec/chci-konzultovat-problem-zpracovani
- https://uoou.gov.cz/poradna/poradna-poverenec/konzultace-pro-poverence
- https://uoou.gov.cz/urad/postaveni-uradu
- https://uoou.gov.cz/urad/povinne-zverejnovane-informace/svobodny-pristupu-k-informacim/podani-zadosti-o-informace
- https://uoou.gov.cz/en/contact
- ÚOOÚ DPIA metodika (PDF), Výroční zprávy 2024 & 2025 (PDF)
- GDPR via EUR-Lex; zákony 500/2004, 106/1999, 110/2019 via zakonyprolidi.cz
