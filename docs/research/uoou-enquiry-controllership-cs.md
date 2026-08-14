# Dotaz na ÚOOÚ — správcovství u aplikace, jejíž data zůstávají v zařízení a ve vlastním účtu iCloud uživatele

**Věc:** Žádost o konzultaci podle čl. 57 odst. 1 písm. b) a d) nařízení — je vývojář mobilní aplikace správcem osobních údajů, které aplikace zpracovává výhradně na zařízení uživatele a v jeho vlastním účtu iCloud?

Vážení,

jsem samostatný vývojář (fyzická osoba) s bydlištěm a místem podnikání v České republice a připravuji vydání mobilní aplikace pro iOS. Před volbou architektury úložiště a před sepsáním záznamů o činnostech zpracování potřebuji vyřešit jednu otázku, kterou se mi nepodařilo uzavřít ani z textu nařízení, ani z pokynů EDPB. Obracím se na Úřad proto, že podle čl. 56 odst. 6 nařízení je pro mě Úřad jediným kontaktním místem.

**Nejmenoval jsem pověřence pro ochranu osobních údajů.** Nejsem orgánem veřejné moci a mou hlavní činností není rozsáhlé pravidelné a systematické monitorování subjektů údajů. Podmínka čl. 37 odst. 1 písm. c) podle mého názoru splněna není, protože u sebe nemám žádné údaje z aplikace — jak je popsáno níže; podotýkám však, že tento závěr závisí na téže otázce počítání rozsahu, kterou kladu v části 3 pod bodem 1, takže si jím nejsem jist. Obracím se proto přímo na Úřad, do kategorie konzultací pro správce, kteří pověřence nejmenovali.

**Nežádám o právní poradenství, o aprobaci svého postupu ani o posouzení souladu celé aplikace.** Jsem si vědom, že aprobace popsaného jednání správce nemůže být předmětem konzultace a že odpovědnost za posouzení zůstává na mně. Ptám se na výklad jednoho pojmu — „správce" podle čl. 4 odst. 7 — na konkrétním a úzce vymezeném skutkovém stavu, a v souladu s konzultačními kritérii Úřadu předkládám v části 3 vlastní návrhy řešení s odůvodněním. Postačí mi nezávazné stanovisko.

## 1. Skutkový stav

**Aplikace.** Aplikace slouží rodiči k zápisu údajů o kojenci s atopickým ekzémem: co dítě (a kojící matka) jedlo, jak vypadala kůže v devíti oblastech těla, a fotografie postižené kůže. Aplikace pouze **zaznamenává**. Nevyhodnocuje, nehledá souvislosti mezi jídlem a stavem kůže, nestanoví diagnózu, nedává doporučení ani pokyny. Neobsahuje žádné profilování, žádnou umělou inteligenci a žádnou analytiku.

**Údaje.** Jde o údaje o zdravotním stavu, tedy zvláštní kategorii podle čl. 9 odst. 1. Subjektem údajů je kojenec; údaje zadává rodič.

**Kde data jsou.** Data jsou uložena v zařízení uživatele. Zároveň se synchronizují do **privátní databáze (private database) kontejneru CloudKit této aplikace**, která se nachází ve **vlastním účtu iCloud uživatele** a odečítá se z **jeho vlastní** úložné kapacity iCloud.

**Co já jako vývojář mám a nemám.**
- **Nezpracovávám žádné osobní údaje z aplikace — žádné ke mně neputují.** Neprovozuji žádný server. Žádný. Aplikace neobsahuje reklamu, nesleduje chování uživatele a údaje z ní nikam neodesílá.
- Nezpracovávám údaje pro žádné **své vlastní účely**. Jediným prospěchem, který z aplikace mám, je kupní cena, tedy prospěch čistě obchodní.
- Nedostávám žádnou analytiku, žádná telemetrická data s obsahem, žádné hlášení chyb obsahující uživatelský obsah.
- K obsahu privátní databáze uživatele navíc **nemám přístup a nemohu ho získat**. Podle dokumentace Apple není obsah privátní databáze viditelný ve vývojářském portálu a přístup k ní má pouze uživatel.
- Neurčuji, kde fyzicky data leží — to určuje Apple.

**Co naopak určuji.** Určuji strukturu záznamu (co je „jídlo", co je „pozorování kůže", devět tělesných oblastí, čtyři stupně závažnosti), určuji, že se data synchronizují právě do iCloudu, a určuji, že se data uchovávají, dokud je uživatel nesmaže. Uživatel tyto volby nemůže změnit — může aplikaci pouze používat, nebo nepoužívat.

**Role Apple.** Apple nezveřejňuje pro vývojáře samostatné zpracovatelské smlouvy (DPA). Ustanovení odpovídající čl. 28 je vloženo do Apple Developer Program License Agreement, Attachment 4, čl. 3.6 — jeho hypotéza však míří na případ, kdy *„You store"*, tedy kdy osobní údaje do iCloudu ukládá **vývojář**. V architektuře s privátní databází ukládá data zařízení uživatele do jeho vlastního účtu. Apple se v čl. 3.5 téhož ujednání zavazuje k obsahu privátních kontejnerů nepřistupovat a v čl. 1.2 potvrzuje, že data uživatele přetrvají i po ukončení mého vztahu s Apple. Vůči koncovému uživateli je přitom Apple sám správcem (Apple Distribution International Ltd., Irsko).

## 2. Právní jádro otázky

Intuitivní odpověď zní, že správcem je matka a já pouze poskytuji nástroj. Text pokynů EDPB však míří jinam.

**Pokyny EDPB 07/2020** k pojmům správce a zpracovatel, verze 2.1, uvádějí v bodě 45 výslovně:

> „It is not necessary that the controller actually has access to the data that is being processed. Someone who outsources a processing activity and in doing so, has a determinative influence on the purpose and (essential) means of the processing … is to be regarded as controller even though he or she will never have actual access to the data."

První větu tohoto bodu shrnutí pokynů (str. 3) opakuje bez jakékoli výhrady. Mezi „podstatné prostředky" (essential means) tytéž pokyny řadí právě to, co určuji já: druh zpracovávaných osobních údajů, dobu zpracování a kategorie příjemců.

Při bližším čtení má však tento bod vlastní kontext. Popisuje toho, kdo zpracování **zadává externě** („outsources a processing activity") a nastavováním parametrů služby ovlivňuje, čí údaje se zpracují — tedy správce, který řídí zpracovatele. Ilustrující příklad („Market research 1") je případ, kdy si společnost objedná výzkum pro **své vlastní** účely. Nejde tedy zřejmě o samostatné pravidlo, že nedostatek přístupu je bez dalšího nerozhodný; přesto je věta ve shrnutí formulována bezvýhradně, a právě proto si nejsem jejím dopadem na svůj případ jist.

Podstatnější je pro mě **poznámka pod čarou č. 29** k bodu 65 týchž pokynů (str. 21), která poskytovatele systému řeší výslovně:

> „The provider of the system can be a joint controller if the criteria mentioned above are met, i.e. if the provider participates in the determination of purposes and means. Otherwise, **the provider should be considered as a processor**."

Tato poznámka staví poskytovatele systému do dvojice správce/zpracovatel a možnost, že by stál mimo ni, nezmiňuje. Na mém skutkovém stavu však vede k výsledku, který se mi jeví jako neuskutečnitelný: mým správcem by musel být uživatel — rodič — jehož zpracování je přitom podle čl. 2 odst. 2 písm. c) z působnosti nařízení vyňato. Takový správce mi nemůže dát pokyny podle čl. 28 odst. 3 ani se mnou uzavřít zpracovatelskou smlouvu. Bod 68 týchž pokynů k tomu dodává, že poskytovatel je zpracovatelem „in the absence of any purpose of its own", přičemž pouhý obchodní prospěch se za vlastní účel nepovažuje — což je právě můj případ.

Na druhé straně stojí čl. 2 odst. 2 písm. c) — zpracování prováděné fyzickou osobou v průběhu výlučně osobních či domácích činností — ve spojení s poslední větou bodu 18 odůvodnění:

> „Toto nařízení se však vztahuje na správce nebo zpracovatele, kteří poskytují prostředky pro zpracování osobních údajů pro tyto osobní či domácí činnosti."

Tato věta říká, že se nařízení na poskytovatele prostředků *vztahuje*. Neříká však, že poskytovatel prostředků je **správcem údajů zpracovávaných v rámci domácí činnosti**.

Příklady v pokynech EDPB 07/2020 (standardizované cloudové úložiště, hostingová služba) mají přitom všechny stejný tvar: správce **si nechává zpracovávat své vlastní** údaje externě. Můj případ tento tvar nemá — údaje nejsou moje a nikdo je pro mě nezpracovává.

K samotné aplikaci v zařízení existuje starší stanovisko WP29 č. 02/2013 o aplikacích na inteligentních zařízeních (WP 202). To v části 3.3.1 uvádí, že vývojář je správcem „to the extent the app developer determines the purposes and means of the processing of personal data on smart devices", a dále:

> „The responsibilities of the app developer will be **considerably limited if no personal data are processed and/or made available outside the device**, or if the app developer has taken appropriate technical and organisational measures to ensure that data are irreversibly anonymised and aggregated on the device itself, prior to any data leaving the device."

Tato věta ovšem omezuje **rozsah povinností**, nikoli samotnou roli, a stanovisko je přijaté ještě za účinnosti směrnice 95/46/ES; ve stejné části se navíc uvádí, že i tam, kde se na uživatele vztahuje domácí výjimka, vývojář odpovídá jako správce, „**if he processes the data for his own purposes**" — což já nečiním.

**Dva zdroje, které jsem našel, hovoří v můj neprospěch, a proto je uvádím sám.**

Francouzský CNIL ve své *Recommandation relative aux applications mobiles* (přijaté deliberací č. 2025-024 ze dne 27. března 2025; jde o doporučení, tedy nezávazný výklad, nikoli o závazný referenciál) k plně lokální aplikaci uvádí, že „**l'acteur ne fait que fournir un logiciel au service de l'utilisateur. Le RGPD n'est pas applicable au logiciel fourni**". Tato úvaha je však výslovně podmíněna tím, že ke sdílení údajů nedochází ani se servery vydavatele aplikace, „**ni avec ceux du fournisseur du système d'exploitation**", a u zdravotnické aplikace tím, že jde o uchovávání „**uniquement locale, sans connexion extérieure**". **Tuto podmínku můj případ nesplňuje**: synchronizace do iCloudu je připojení k serverům poskytovatele operačního systému. CNIL pro ostatní případy dodává, že „le tiers qui traite les données à la demande de la personne est susceptible d'assumer une forme de responsabilité de traitement … soit comme responsable de traitement, soit comme sous-traitant".

Obdobně pokyny EDPB č. 01/2020 k propojeným vozidlům (verze 2.0) v bodě 74 uvádějí, že u tam popsaných aplikací jde o zpracování prováděné fyzickou osobou pro výlučně osobní činnosti „**without the transfer of personal data to a data controller or data processor**", a proto stojí mimo působnost nařízení — hned v bodě 75 však dodávají, že nařízení „**does apply to controllers or processors, which provide the means for processing personal data for such personal or household activities**", a to „**when they are acting as data controller or data processor**". Tím se vracím k témuž kruhu jako u bodu 18 odůvodnění: věta předpokládá roli, kterou se právě snažím určit.

Nenašel jsem tedy žádný zdroj, který by se zabýval dodavatelem softwaru, jehož produkt zpracovává údaje výhradně na zařízení koncového uživatele **a v jeho vlastním cloudovém účtu u poskytovatele operačního systému**, pro jeho vlastní účely, a který by výslovně řešil, zda je takový dodavatel správcem, zpracovatelem, nebo ani jedním. Právě proto, že mi tato jediná okolnost — synchronizace do vlastního účtu uživatele — vyřazuje jinak nejpříznivější zdroj, potřebuji vědět, jak ji hodnotí Úřad.

## 3. Otázky

**Hlavní otázka.** Jakou roli má vývojář na výše popsaném skutkovém stavu ve vztahu k obsahu, který uživatel v aplikaci vytvoří — platí výklad A, B, nebo C?

- **Výklad A:** Správcem je rodič, který data zadává. Vývojář poskytuje pouze prostředek a správcem tohoto obsahu není. Na vývojáře se nařízení vztahuje (bod 18 odůvodnění), avšak nikoli v roli správce tohoto obsahu.
- **Výklad B:** Vývojář je (samostatným nebo společným) správcem obsahu každé instalace, protože určuje podstatné prostředky zpracování; to, že k údajům nemá přístup a že k němu žádné údaje neputují, je pro určení role nerozhodné.
- **Výklad C:** Vývojář je **zpracovatelem** ve smyslu poznámky pod čarou č. 29 pokynů EDPB 07/2020. Pak prosím o vodítko, kdo je jeho správcem a jak lze splnit čl. 28 odst. 3, je-li jediným dalším aktérem uživatel, jehož zpracování je z působnosti nařízení vyňato podle čl. 2 odst. 2 písm. c).

**Je-li odpověď na hlavní otázku výklad B, pak dále otázky 1 až 3; otázky 4 a 5 jsou relevantní v každém případě:**

1. Jak se u charakteristiky č. 4 („Zpracování osobních údajů ve velkém rozsahu") Seznamu druhů operací zpracování podle čl. 35 odst. 4, který Úřad vydal, počítá počet subjektů údajů? Jsou to subjekty, jejichž data mám u sebe já — tedy nula — nebo součet subjektů ve všech instalacích aplikace? Ptám se proto, že tato jediná veličina rozhoduje, zda zpracování dosáhne dvou kritických charakteristik (spolu s charakteristikou č. 2, údaje o zdravotním stavu), a tedy zda je posouzení vlivu podle čl. 35 povinné. Podotýkám, že orientační hodnoty Úřadu u této charakteristiky vedle počtu subjektů uvádějí i počet přistupujících zaměstnanců a počet míst zpracování, což podle mého čtení míří na vlastní provoz správce.

2. Co má v mé situaci obsahovat pole „kategorie příjemců" v záznamech o činnostech zpracování podle čl. 30 odst. 1 písm. d)? Je příjemcem Apple, nebo příjemce není žádný, když data putují pouze do vlastního účtu uživatele?

3. Je Apple v případě privátní databáze mým **zpracovatelem**, jestliže citované ujednání dopadá na případ, kdy osobní údaje do iCloudu ukládá vývojář, a nikoli zařízení uživatele do vlastního účtu uživatele? Pokud zpracovatelem není, jaké ujednání podle čl. 28 odst. 3 mám podle Úřadu uzavřít a s kým, když Apple žádnou samostatnou zpracovatelskou smlouvu pro vývojáře nevydává?

4. Jak má poskytovatel prostředků chápat poslední větu bodu 18 odůvodnění, říká-li, že se na něj nařízení vztahuje, aniž by určovala, v jaké roli? Vylučuje tato věta výklad A, nebo je s ním slučitelná v tom smyslu, že poskytovateli prostředků zakládá jiné povinnosti než povinnosti správce obsahu vytvořeného uživatelem?

5. Je pro určení mé role rozhodné, že se data synchronizují do **vlastního účtu uživatele u poskytovatele operačního systému** (iCloud), a nikoli do mé vlastní infrastruktury? Jinak řečeno: posuzuje Úřad synchronizaci do vlastního účtu uživatele stejně jako uchovávání výhradně v zařízení, nebo jako „připojení k vnějším serverům", které aplikaci z čistě lokálního režimu vyřazuje? Byla-li by moje role odlišná, kdyby aplikace žádnou synchronizaci nenabízela a data zůstala jen v zařízení, je tato okolnost pro mě zásadní, protože o ní rozhoduji ještě před vydáním první verze.

## 4. Proč se ptám předem

Odpověď rozhoduje o tom, jak aplikaci postavím, ne pouze o tom, co o ní napíšu. Rozhodnutí o šifrování jednotlivých polí v CloudKitu a o struktuře záznamu jsou po vydání první verze velmi drahá na změnu, protože schéma lze následně měnit jen aditivně. Chci je udělat správně napoprvé.

Jsem si vědom, že Úřad neposkytuje individuální právní poradenství a že jeho stanovisko není závazným posouzením. I nezávazný názor na výklad čl. 4 odst. 7 na tomto skutkovém stavu mi však umožní rozhodnout se poučeně.

Za odpověď v přiměřené lhůtě předem děkuji. Bude-li pro Úřad vhodnější odpovědět jen na hlavní otázku a ostatní ponechat bez odpovědi, i taková odpověď pro mě bude užitečná.

S pozdravem

[jméno a příjmení]
[datum narození]
[adresa místa podnikání / trvalého pobytu]
[IČO]
[e-mail]
