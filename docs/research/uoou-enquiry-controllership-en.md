# ÚOOÚ enquiry — English reference version

**Not the version to send.** ÚOOÚ is a Czech authority and the owner is Czech-established; the Czech text is the artifact. This translation exists so the repo record, and any non-Czech reader of the map, can audit what was asked.

**Subject:** Request for a consultation under Art. 57(1)(b) and (d) of the Regulation — is the developer of a mobile application a controller of personal data that the application processes solely on the user's own device and in the user's own iCloud account?

---

Dear Sir or Madam,

I am a solo developer (a natural person) resident and established in the Czech Republic, preparing to release an iOS application. Before I choose the storage architecture and write my record of processing activities, I need to resolve one question that I have not been able to close from the text of the Regulation or from EDPB guidance. I am writing to the Office because, under Art. 56(6) of the Regulation, the Office is my sole interlocutor.

**I have not appointed a data protection officer.** I am not a public authority, and my core activity is not regular and systematic monitoring of data subjects on a large scale. In my view the condition in Art. 37(1)(c) is not met either, because I hold no data from the application at all — as described below; I note, however, that this conclusion turns on the same question of how scale is counted that I put in section 3 under question 1, so I am not certain of it. I therefore write to the Office directly, under the category of consultations for controllers that have not appointed a DPO.

**I am not asking for legal advice, for approval of my approach, nor for an assessment of the application's overall compliance.** I am aware that approval of a controller's described conduct cannot be the subject of a consultation and that responsibility for the assessment remains mine. I am asking about the interpretation of a single concept — "controller" under Art. 4(7) — on concrete and narrowly defined facts, and, in line with the Office's consultation criteria, I set out my own proposed answers with reasoning in section 3. A non-binding opinion is sufficient for my purposes.

## 1. The facts

**The application.** It lets a parent record data about an infant with atopic eczema: what the child (and the breastfeeding mother) ate, how the skin looked across nine body regions, and photographs of the affected skin. The application only **records**. It does not evaluate, does not look for connections between food and skin condition, makes no diagnosis, and gives no recommendations or instructions. There is no profiling, no artificial intelligence, and no analytics.

**The data.** These are data concerning health, a special category under Art. 9(1). The data subject is an infant; the parent enters the data.

**Where the data sits.** On the user's device, and synced to the **private database of this application's own CloudKit container**, which resides in the **user's own iCloud account** and counts against the **user's own** iCloud storage quota.

**What I as the developer do and do not have.**
- **I process no personal data from the application — none reaches me.** I operate no server. None. The application carries no advertising, does not track user behaviour, and sends no data anywhere.
- I process no data for any **purposes of my own**. The only benefit I derive from the application is the purchase price, i.e. a purely commercial benefit.
- I receive no analytics, no telemetry carrying content, and no crash reports containing user content.
- Beyond that, I have **no access to the contents of a user's private database and no way to obtain it.** Per Apple's documentation, private database content is not visible in the developer portal and only the user can access it.
- I do not determine where the data physically resides — Apple does.

**What I do determine.** I determine the record structure (what a "meal" is, what a "skin observation" is, the nine body regions, the four severity levels), I determine that the data syncs to iCloud specifically, and I determine that data is retained until the user deletes it. The user cannot vary these choices — they can only use the application or not use it.

**Apple's role.** Apple publishes no standalone data processing agreement for developers. Art. 28-style terms are embedded in the Apple Developer Program License Agreement, Attachment 4, §3.6 — but its trigger addresses the case where *"You store"*, i.e. where the **developer** stores personal data in iCloud. In a private-database architecture, the user's device writes to the user's own account. In §3.5 of the same terms Apple undertakes not to access the contents of private containers, and in §1.2 it confirms that the user's data outlives the termination of my relationship with Apple. Meanwhile, towards the end user Apple is itself a controller (Apple Distribution International Ltd., Ireland).

## 2. The legal core of the question

The intuitive answer is that the mother is the controller and I merely supply a tool. The text of the EDPB guidance points elsewhere.

**EDPB Guidelines 07/2020** on the concepts of controller and processor, version 2.1, state in paragraph 45:

> "It is not necessary that the controller actually has access to the data that is being processed. Someone who outsources a processing activity and in doing so, has a determinative influence on the purpose and (essential) means of the processing … is to be regarded as controller even though he or she will never have actual access to the data."

The executive summary (p. 3) repeats the first sentence of that paragraph without any qualification. Among "essential means" the same guidance counts precisely what I determine: the type of personal data processed, the duration of the processing, and the categories of recipients.

Read closely, however, that paragraph has a context of its own. It describes someone who **outsources** a processing activity and, by adjusting the parameters of a service, influences whose data will be processed — that is, a controller directing a processor. Its illustrative example ("Market research 1") is a company commissioning research for **its own** purposes. So it is probably not a free-standing rule that lack of access is simply irrelevant; and yet the sentence in the summary is stated without qualification, which is exactly why I am unsure of its effect on my case.

More to the point for me is **footnote 29** to paragraph 65 of the same guidance (p. 21), which addresses the provider of a system expressly:

> "The provider of the system can be a joint controller if the criteria mentioned above are met, i.e. if the provider participates in the determination of purposes and means. Otherwise, **the provider should be considered as a processor**."

That footnote places the provider of a system within the controller/processor pair and does not mention the possibility of standing outside it. On my facts, though, it leads to a result that seems to me unworkable: my controller would have to be the user — the parent — whose processing is itself excluded from the scope of the Regulation by Art. 2(2)(c). Such a controller cannot give me instructions under Art. 28(3) or conclude a processor agreement with me. Paragraph 68 of the same guidance adds that a provider is a processor "in the absence of any purpose of its own", a mere commercial benefit not counting as a purpose — which is precisely my position.

On the other side stands Art. 2(2)(c) — processing by a natural person in the course of a purely personal or household activity — read with the final sentence of Recital 18:

> "However, this Regulation applies to controllers or processors which provide the means for processing personal data for such personal or household activities."

That sentence says the Regulation *applies to* means-providers. It does not say that a means-provider is a **controller of the data processed in the course of the household activity**.

The examples in EDPB Guidelines 07/2020 (standardised cloud storage, hosting services) all share one shape: a controller **outsources its own** processing. My case does not have that shape — the data are not mine, and nobody processes them for me.

On the on-device case itself there is an older WP29 opinion, 02/2013 on apps on smart devices (WP 202). Section 3.3.1 states that the developer is a controller "to the extent the app developer determines the purposes and means of the processing of personal data on smart devices", and further:

> "The responsibilities of the app developer will be **considerably limited if no personal data are processed and/or made available outside the device**, or if the app developer has taken appropriate technical and organisational measures to ensure that data are irreversibly anonymised and aggregated on the device itself, prior to any data leaving the device."

That sentence, however, limits the **extent of the obligations**, not the role itself, and the opinion was adopted under Directive 95/46/EC. The same section adds that even where the household exemption applies to the user, the developer remains responsible as a controller "**if he processes the data for his own purposes**" — which I do not.

**Two sources I found tell against me, and I therefore raise them myself.**

The French CNIL, in its *Recommandation relative aux applications mobiles* (adopted by délibération no. 2025-024 of 27 March 2025; a recommendation, i.e. non-binding interpretation, not a binding référentiel), says of a fully local application that "**l'acteur ne fait que fournir un logiciel au service de l'utilisateur. Le RGPD n'est pas applicable au logiciel fourni**". That reasoning is, however, expressly conditioned on no data being shared with the publisher's servers "**ni avec ceux du fournisseur du système d'exploitation**" (nor with those of the operating-system provider), and, for a health application, on storage being "**uniquement locale, sans connexion extérieure**". **My case does not satisfy that condition**: syncing to iCloud is a connection to the servers of the operating-system provider. For other cases CNIL adds that "le tiers qui traite les données à la demande de la personne est susceptible d'assumer une forme de responsabilité de traitement … soit comme responsable de traitement, soit comme sous-traitant."

Similarly, EDPB Guidelines 01/2020 on connected vehicles (version 2.0), at paragraph 74, state that the applications described there involve processing carried out for purely personal activities by a natural person "**without the transfer of personal data to a data controller or data processor**", and therefore fall outside the scope of the Regulation — but paragraph 75 immediately adds that the Regulation "**does apply to controllers or processors, which provide the means for processing personal data for such personal or household activities**", and that "**when they are acting as data controller or data processor**". That returns me to the same circle as Recital 18: the sentence presupposes the role I am trying to determine.

I have therefore found no source addressing a software vendor whose product processes data solely on the end user's own device **and in the user's own cloud account with the operating-system provider**, for the user's own purposes, and expressly resolving whether such a vendor is a controller, a processor, or neither. Precisely because this single circumstance — syncing into the user's own account — disqualifies the otherwise most favourable source, I need to know how the Office assesses it.

## 3. The questions

**The main question.** On the facts above, what role does the developer have in relation to the content the user creates in the application — does Reading A, B or C apply?

- **Reading A:** The controller is the parent who enters the data. The developer supplies only the means and is not a controller of that content. The Regulation applies to the developer (Recital 18), but not in the role of controller of that content.
- **Reading B:** The developer is a (sole or joint) controller of every installation's content, because he determines the essential means of the processing; the fact that he has no access to the data, and that no data reaches him, is irrelevant to the allocation of the role.
- **Reading C:** The developer is a **processor**, in the sense of footnote 29 to EDPB Guidelines 07/2020. In that case I ask for guidance on who his controller is, and how Art. 28(3) can be satisfied, when the only other actor is a user whose processing is excluded from the scope of the Regulation by Art. 2(2)(c).

**If the answer to the main question is Reading B, then questions 1 to 3 below; questions 4 and 5 are relevant in any event:**

1. For characteristic 4 ("Processing of personal data on a large scale") of the Office's own Art. 35(4) list, how is the number of data subjects counted? Is it the subjects whose data I hold — i.e. zero — or the aggregate of subjects across all installations of the application? I ask because this single quantity decides whether the processing reaches two critical characteristics (together with characteristic 2, data concerning health), and therefore whether a data protection impact assessment under Art. 35 is mandatory. I note that the Office's indicative figures for this characteristic list, alongside the number of subjects, the number of employees with access and the number of processing locations — which on my reading are measures of the controller's own operation.

2. What should the "categories of recipients" field of the record of processing activities under Art. 30(1)(d) contain in my situation? Is Apple a recipient, or is there no recipient at all, given that the data travels only into the user's own account?

3. In the private-database case, is Apple my **processor**, when the terms cited above address the case where the developer stores personal data in iCloud rather than the user's device writing into the user's own account? If Apple is not a processor, what arrangement under Art. 28(3) does the Office consider I should conclude, and with whom, given that Apple issues no standalone processor agreement for developers?

4. How should a provider of the means understand the final sentence of Recital 18, when it says the Regulation applies to him without determining in what role? Does that sentence exclude Reading A, or is it compatible with Reading A in the sense that it imposes on a means-provider obligations other than those of a controller of the content the user creates?

5. Is it material to the allocation of my role that the data syncs into the **user's own account with the operating-system provider** (iCloud), rather than into infrastructure of my own? Put differently: does the Office treat syncing into the user's own account the same as storage solely on the device, or as a "connection to external servers" that takes the application out of the purely local case? If my role would be different were the application to offer no sync at all and keep data only on the device, that circumstance is decisive for me, because I decide it before the first release.

## 4. Why I am asking in advance

The answer decides how I build the application, not merely what I write about it. Decisions about per-field encryption in CloudKit and about record structure are very expensive to change after the first release, because the schema can afterwards only be modified additively. I would like to get them right the first time.

I am aware that the Office does not provide individual legal advice and that its opinion is not a binding assessment. Even a non-binding view on the interpretation of Art. 4(7) on these facts would let me decide on an informed basis.

Thank you in advance for a reply within a reasonable period. If it is more convenient for the Office to answer only the main question and leave the rest unanswered, such a reply would still be useful to me.

Yours faithfully,

[first name and surname]
[date of birth]
[address of place of business / permanent residence]
[IČO]
[email]
