# -*- coding: utf-8 -*-
"""
Curated allergen-testing schedule (transcribed by hand from the PDF's native
text — no OCR needed, unlike the Pekarkova scan).

Structure: dict keyed by CSV filename -> { "allergen": str, "notes": str, "rows": [(day, ja, dcera), ...] }
"ja" = matka (mother), "dcera" = dítě (child). Empty string means the PDF cell was blank
for that day (allergen not yet tested for that person, or column not applicable).
"""

CSV_DATA = {}

CSV_DATA["01-lusteniny"] = {
    "allergen": "Luštěniny",
    "notes": "U luštěnin se reakce projeví zpravidla až třetí den.",
    "rows": [
        ("1. den", "50 g červené čočka", ""),
        ("2. den", "50 g jakékoliv luštěniny", "1 lžička červené čočky"),
        ("3. den", "Neomezeně", "2–3 lžičky červené čočky"),
        ("4. den", "Neomezeně", "neomezeně"),
    ],
}

CSV_DATA["02-korenova_zelenina"] = {
    "allergen": "Kořenová zelenina",
    "notes": "Mrkev při testování může být syrová či vařená. Řapíkatý celer není kořenová zelenina, při dietě jsem ji mohla jíst i před testováním kořenové zeleniny. Houby: poté, co projdou rajčata a luštěniny, obvykle prochází i houby (žádná samostatná tabulka v PDF).",
    "rows": [
        ("1. den", "1 střední mrkev", ""),
        ("2. den", "neomezeně, ale min. 100 g mrkve, celeru, petržele, může být i ve formě vývaru", "1–2 lžičky mrkve"),
        ("3. den", "neomezeně, ale min. 100 g mrkve, celeru, petržele, může být i ve formě vývaru", "5–7 lžiček mrkve"),
        ("4. den", "neomezeně, ale min. 100 g mrkve, celeru, petržele, může být i ve formě vývaru", "neomezeně"),
    ],
}

CSV_DATA["03-rajcata_papriky"] = {
    "allergen": "Rajčata a papriky",
    "notes": "I čtvrtý den v příkrmu postačuje malá dávka rajčátka k otestování alergenu.",
    "rows": [
        ("1. den", "neomezeně rajčata (či papriky), minimum je 5 malých rajčátek.", ""),
        ("2. den", "neomezeně rajčata (či papriky), minimum je 5 malých rajčátek.", "½ malého rajčátka"),
        ("3. den", "neomezeně rajčata (či papriky), minimum je 5 malých rajčátek.", "½ malého rajčátka"),
        ("4. den", "neomezeně rajčata (či papriky), minimum je 5 malých rajčátek.", "neomezeně"),
    ],
}

CSV_DATA["04-exoticke_ovoce"] = {
    "allergen": "Exotické ovoce",
    "notes": "",
    "rows": [
        ("1. den", "1–2 banány", ""),
        ("2. den", "1 kiwi", "1–2 lžičky banánu"),
        ("3. den", "jakékoliv exotické ovoce v neomezené dávce", "½ banánu"),
        ("4. den", "jakékoliv exotické ovoce v neomezené dávce", "1 banán + 1 lžička kiwi"),
    ],
}

CSV_DATA["05-citrusy"] = {
    "allergen": "Citrusy",
    "notes": "Citrusy v příkrmu lze otestovat i džusem (100% džus z mandarinek či pomerančů) v přepočtu 1 dílek mandarinky = 1 lžička džusu.",
    "rows": [
        ("1. den", "1 mandarinka nebo ½ pomeranče", ""),
        ("2. den", "3 mandarinky nebo 1 pomeranč", "1–2 dílky mandarinky"),
        ("3. den", "citrusy neomezeně, lze i džus", "3–4 i dílky mandarinky"),
        ("4. den", "citrusy neomezeně, lze i džus", "neomezeně"),
    ],
}

CSV_DATA["06-psenice"] = {
    "allergen": "Pšenice (lepek)",
    "notes": "Lepek se testuje pouze u dětí – já ho měla povolený v neomezeném množství od samého začátku (viz kapitola Lepek). U dcery u nás lepek sice prošel, i tak jsme měli doporučeno ho podávat z počátku pouze 2–3x týdně a dávku postupně navyšovat.",
    "rows": [
        ("1. den", "", "1–2 kousky těstovin nebo 1 sousto rohlíku"),
        ("2. den", "", "2–4 kousky těstovin nebo 2 sousta rohlíku"),
        ("3. den", "", "neomezeně"),
    ],
}

CSV_DATA["07-oves"] = {
    "allergen": "Oves",
    "notes": "Taktéž oves se testuje pouze u dětí a já ho mohla jíst od začátku v neomezeném množství.",
    "rows": [
        ("1. den", "", "2–3 lžičky ovesné kaše"),
        ("2. den", "", "5-10 lžiček ovesné kaše"),
        ("3. den", "", "neomezeně"),
    ],
}

CSV_DATA["08-vejce_kureci_maso"] = {
    "allergen": "Vejce a kuřecí maso",
    "notes": "Vejce u nás neprošla vůbec, ani přes mě. I tak jsem dostala doporučení jíst je minimálně jednou týdně v zapečené formě. Maximum pak bylo 2-4x.",
    "rows": [
        ("1. den", "", ""),
        ("2. den", "vejce i kuřecí maso neomezeně", "½ lžičky žloutku či 1 lžička kuřecího"),
        ("3. den", "vejce i kuřecí maso neomezeně", "½ žloutku či 2–3 lžičky kuřecího"),
        ("4. den", "vejce i kuřecí maso neomezeně", "celý žloutek"),
    ],
}

CSV_DATA["09-ryby"] = {
    "allergen": "Ryby",
    "notes": "Ryby jsem během testu mohla jíst v neomezeném množství, měla jsem jen dané druhy ryb a minimální množství, které jsem musela za den sníst. Bylo možné jíst ryby jak čerstvé (tedy tepelně zpracované), tak z plechovky. Ryby u nás prošly a měly zázračný účinek — po otestování všech alergenů se dcerce občas objevila vyrážka (např. vlivem stresu) a po snězení jedné malé porce ryb napřímo zase zmizela.",
    "rows": [
        ("1. den", "min. 80 g lososa či pstruha", ""),
        ("2. den", "tuňák/kapr/pstruh/losos", "1 lžička lososa/pstruha/tuňáka"),
        ("3. den", "min. 150 g sardinky/treska/tuňák", "2-3 lžičky lososa/pstruha/tuňáka"),
        ("4. den", "neomezeně vše", "neomezeně"),
    ],
}

CSV_DATA["10-bkm"] = {
    "allergen": "BKM (bílkovina kravského mléka)",
    "notes": (
        "Test BKM je trochu komplikovanější a trvá o den déle než ostatní testy. Já mohla vždy daný druh "
        "(máslo, zakysané mléčné výrobky či nezakysané mléčné výrobky) v neomezené formě. Je možné, že projde "
        "pouze máslo a ostatní již ne, nebo že projdou pouze zakysané mléčné výrobky a ostatní ne — ty, co projdou, "
        "můžete pak jíst v neomezeném množství. Neprojde-li BKM, doporučují nechat po ní 2–3 dny klidového režimu. "
        "Mezi zakysané mléčné výrobky patří jogurty, tvrdé sýry, Lučina, kefír, podmáslí, cottage. Nezakysané jsou "
        "mléko, tvaroh, Lipánek a jemu podobné výrobky, smetana, mozarella. Alergie na BKM může být rychlá nebo mít "
        "kumulativní efekt — čím déle by dítě BKM přijímalo (ať už napřímo či přes kojení), tím horší by byly reakce. "
        "U nás BKM neprošla, měla jsem ji v rámci „tréninku“ povolenou jednou až dvakrát týdně v zapečené formě a "
        "jednou až dvakrát týdně ve formě zakysaných mléčných výrobků. Dcera napřímo začala BKM tolerovat nejdříve "
        "také v zapečené formě."
    ),
    "rows": [
        ("1. den", "máslo neomezeně", ""),
        ("2. den", "zakysané, min. 1 jogurt", "1 lžička jogurtu/Lučiny/tvrdého sýra"),
        ("3. den", "zakysané, min. 1 jogurt", "2 lžičky jogurtu/Lučiny/tvrdého sýra"),
        ("4. den", "nezakysané mléčné výrobky", "½ jogurtu/20 g Lučiny"),
        ("5. den", "nezakysané mléčné výrobky", "1 jogurt"),
    ],
}

CSV_DATA["11-maliny_rybiz_ostruziny"] = {
    "allergen": "Maliny, rybíz a ostružiny",
    "notes": (
        "Namísto malin lze jíst i malinovou přesnídávku (v poměru 1 malina = 1 lžička přesnídávky). Projdou-li "
        "maliny, prochází i rybíz a ostružiny a naopak. I pokud toto ovoce projde, není doporučeno podávat maliny "
        "každý den, jelikož obsahují histamin, který ekzém zhoršuje (histamin není alergen sám o sobě a záleží u "
        "něj na množství — v malých dávkách je OK, ve větších dělá problémy)."
    ),
    "rows": [
        ("1. den", "", ""),
        ("2. den", "maliny po 4 dny v neomezeném množství", "2 maliny"),
        ("3. den", "maliny po 4 dny v neomezeném množství", "3–5 malin"),
        ("4. den", "maliny po 4 dny v neomezeném množství", "neomezeně"),
    ],
}

CSV_DATA["12-jahody"] = {
    "allergen": "Jahody",
    "notes": (
        "Místo jahod lze podat i jahodovou přesnídávku v poměru ½ jahody = 1–2 lžičky přesnídávky. Platí zde to, "
        "co o malinách — pozor na histamin, jahody jej také obsahují."
    ),
    "rows": [
        ("1. den", "", ""),
        ("2. den", "jahody po 4 dny v neomezeném množství", "½ jahody"),
        ("3. den", "jahody po 4 dny v neomezeném množství", "1 jahoda"),
        ("4. den", "jahody po 4 dny v neomezeném množství", "neomezeně"),
    ],
}

CSV_DATA["13-seminka_mak"] = {
    "allergen": "Semínka a mák",
    "notes": "Test semínek a máku jsme prováděli jen přes mateřské mléko. Dýňová a lněná semínka nejsou alergeny. Recept na makovec najdete na str. 119 knihy.",
    "rows": [
        ("1. den", "1 polévková lžíce semínek (chia/sezamových/slunečnicových)", ""),
        ("2. den", "semínka neomezeně", ""),
        ("3. den", "1 kousek makovce/1 polévková lžíce máku či makového mléka", ""),
        ("4. den", "makovec neomezeně", ""),
    ],
}

CSV_DATA["14-soja"] = {
    "allergen": "Soja",
    "notes": (
        "Soja je obsažena v mnoha druzích pečiva (často rozmraženého a rozpečeného v obchodě) a v sojové omáčce, "
        "která bývá přísadou mnoha dalších jídel, obzvláště v restauraci."
    ),
    "rows": [
        ("1. den", "50 ml sojového mléka", ""),
        ("2. den", "100–150 ml sojového mléka", "1–2 lžičky sojového mléka"),
        ("3. den", "neomezeně", "4–6 lžiček sojového mléka"),
        ("4. den", "neomezeně", "neomezeně"),
    ],
}

CSV_DATA["15-orechy"] = {
    "allergen": "Ořechy",
    "notes": (
        "Místo drcených mandlí je možné podat i mandlové mléko, a to 3. den jednu lžíci a 4. den 2–5 lžic. K "
        "tomuto testu jsme se dostaly v dcerčiných 11 měsících. Ořechy jsou silný alergen — test ořechů napřímo "
        "doporučuji pouze v případě, kdy si jste jisti, že přes mateřské mléko ořechy prošly. V případě pochybností "
        "test napřímo raději vynechte a otestujte znovu nejprve přes mateřské mléko po nějaké době. Je-li zřejmé, "
        "že ořechy prošly přes mateřské mléko, je dobré podat je alespoň ve stopovém množství i napřímo — stopy "
        "ořechů bývají v mnoha výrobcích."
    ),
    "rows": [
        ("1. den", "1 hrst mandlí", ""),
        ("2. den", "1 hrst kešu/vlašských", ""),
        ("3. den", "1 hrst lískových oříšků", "½ lžičky drcených mandlí"),
        ("4. den", "neomezeně", "2–5 lžiček drcených mandlí"),
    ],
}

CSV_DATA["16-hovezi_maso"] = {
    "allergen": "Hovězí maso",
    "notes": "Hovězí maso je možné testovat i na vývaru z hovězího masa, a to v příkrmu druhý den 20-30 ml vývaru a třetí den 40-90 ml vývaru.",
    "rows": [
        ("1. den", "", ""),
        ("2. den", "po 4 dny hovězí maso v neomezené dávce", "1–2 lžičky hovězího masa"),
        ("3. den", "po 4 dny hovězí maso v neomezené dávce", "2–6 lžiček hovězího masa"),
        ("4. den", "po 4 dny hovězí maso v neomezené dávce", "neomezeně"),
    ],
}

CSV_DATA["17-kakao"] = {
    "allergen": "Kakao",
    "notes": (
        "Pozor, aby čokoláda neobsahovala mléko (někdy ho obsahuje i čokoláda na vaření). Ideálně doporučuji bio "
        "čokoládu, která obsahuje pouze kakaovou hmotu, kakaové máslo a cukr, nic víc. Projde-li kakao, prochází i "
        "čokoláda."
    ),
    "rows": [
        ("1. den", "2 kostičky hořké čokolády", ""),
        ("2. den", "6 kostiček hořké čokolády", "½ lžičky kakaa (do kaše)"),
        ("3. den", "neomezeně", "1–1 ½ lžičky kakaa"),
        ("4. den", "neomezeně", "neomezeně"),
    ],
}

CSV_DATA["18-med"] = {
    "allergen": "Med",
    "notes": "U medu se reakce projevuje zpožděně, testuje se proto 5 dní.",
    "rows": [
        ("1. den", "neomezeně", ""),
        ("2. den", "neomezeně", "½ lžičky medu"),
        ("3. den", "neomezeně", "½ lžičky medu"),
        ("4. den", "neomezeně", "1 lžička medu"),
        ("5. den", "neomezeně", "neomezeně, stačí opět 1 lžička"),
    ],
}

CSV_DATA["19-koreni"] = {
    "allergen": "Koření",
    "notes": (
        "V příkrmech se doporučuje vyhnout prozatím pepři – je to nejsilnější alergen z koření. Zelené bylinky "
        "(bazalka, oregano, majoránka, libeček aj.) patří mezi zelenou zeleninu a jsou vhodné již od začátku. Mezi "
        "slabší alergeny patří bobkový list, skořice, sladká paprika, zázvor a hřebíček. Mezi silnější alergeny se "
        "řadí kari, kurkuma a muškátový oříšek. Ty nejsilnější jsou pepř, pálivá paprika, nové koření a chilli — "
        "tyto doporučuji vynechat minimálně do testu koření a i po něm, pokud koření projde, používat střídmě. "
        "Neprojde-li koření, nechte po něm dva dny klidového režimu."
    ),
    "rows": [
        ("1. den", "koření neomezeně – kari, kurkuma, sladká paprika, pepř… ideálně vystřídat více druhů koření", ""),
        ("2. den", "koření neomezeně – kari, kurkuma, sladká paprika, pepř… ideálně vystřídat více druhů koření", "špetka sladké papriky/kari/kurkumy"),
        ("3. den", "koření neomezeně – kari, kurkuma, sladká paprika, pepř… ideálně vystřídat více druhů koření", "špetka sladké papriky/kari/kurkumy"),
    ],
}

CSV_DATA["20-arasidy"] = {
    "allergen": "Arašídy",
    "notes": "Arašídy jsme testovali pouze u mě.",
    "rows": [
        ("1. den", "1 lžička arašídů", ""),
        ("2. den", "1 polévková lžíce arašídů", ""),
        ("3. den", "2 polévkové lžíce arašídů", ""),
        ("4. den", "neomezeně", ""),
    ],
}

# 21) Karob has no dosage table in the PDF — tested by the mother only, following the kakao schedule.
KAROB_NOTE = "Karob jsem jako jediný alergen testovala sama a řídila jsem se testem u kakaa."

# General notes that apply across all allergens, not tied to one table.
GENERAL_NOTES = [
    "U všech alergenů platí, že ačkoliv poslední den je možné v příkrmech podat neomezenou dávku, zároveň stačí "
    "podat obvykle opět stejné množství jako druhý den.",
    "Máte-li podezření na reakci při testování alergenu již po 1. dni, kdy jste jej zatím nepodali v příkrmu, "
    "doporučuji druhý den opakovat stejné dávkování — tedy alergen podat zatím jen přes MM, ne v příkrmu.",
    "Všimněte si, že v příkrmech stačilo k otestování velmi, velmi malinké množství. Pokud byste testovali "
    "alergeny rovnou napřímo (tj. pokud nekojíte), dala bych 1. den testu jen stopové množství, tedy něco jako "
    "olíznutí lžičky, na které se dřív alergen nacházel, nikdy ne více.",
]
