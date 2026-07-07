# -*- coding: utf-8 -*-
"""
Curated diet elimination schedule data (OCR-verified from PDF tables).

Structure: dict keyed by CSV filename → list of (type, allergen, day, instructions) rows.
Types: bez_prikrmu | kojene_prikrmy | plne_prikrmy
"""

TYPE_BEZ = "plne kojene dite (bez prikrmu)"
TYPE_KOJENE = "kojene dite + prikrmy"
TYPE_PLNE = "dite plne na prikrmech"

CSV_DATA = {}

CSV_DATA["01-lepek"] = {
    "allergen": "Lepek",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: 50 g bezvaječných těstovin nebo 50 g kuskusu"),
        (TYPE_BEZ, "2. den", "maminka: 100 g bezvaječných těstovin nebo 100 g kuskusu"),
        (TYPE_BEZ, "3. den", "maminka: neomezené množství bezvaječných těstovin nebo kuskusu"),
        (TYPE_KOJENE, "1. den", "maminka: 50 g bezvaječných těstovin nebo 50 g kuskusu; dítě: hypoalergenní příkrmy (žádný lepek)"),
        (TYPE_KOJENE, "2. den", "maminka: 50 g bezvaječných těstovin nebo 50 g kuskusu; dítě: 1 kousek bezvaječné těstoviny nebo půl lžičky kuskusu"),
        (TYPE_KOJENE, "3. den", "maminka: neomezené množství bezvaječných těstovin nebo kuskusu; dítě: 2 kusy bezvaječných těstovin nebo 1 lžička kuskusu"),
        (TYPE_KOJENE, "4. den", "maminka: neomezené množství bezvaječných těstovin nebo kuskusu; dítě: neomezené množství bezvaječných těstovin nebo kuskusu"),
        (TYPE_PLNE, "1. den", "dítě: malý kousíček bezvaječné těstoviny nebo špičku lžičky kuskusu"),
        (TYPE_PLNE, "2. den", "dítě: 1 kus bezvaječné těstoviny (např. jedno kolínko) nebo půl lžičky kuskusu"),
        (TYPE_PLNE, "3. den", "dítě: 2 kusy bezvaječných těstovin nebo 1 lžička kuskusu"),
        (TYPE_PLNE, "4. den", "dítě: neomezené množství bezvaječných těstovin nebo kuskusu"),
    ],
}

CSV_DATA["02-lusteniny"] = {
    "allergen": "Luštěniny",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: např. červená čočka, 30 g (červená čočka nejméně nadýmá, proto je k testu luštěnin nejvýhodnější)"),
        (TYPE_BEZ, "2. den", "maminka: např. červená čočka, 50—100 g"),
        (TYPE_BEZ, "3. den", "maminka: neomezené množství červené čočky, případně cizrny, hrachu či fazolí (lze kombinovat vícero druhů luštěnin)"),
        (TYPE_KOJENE, "1. den", "maminka: např. červená čočka, 30 g; dítě: hypoalergenní příkrmy (žádné luštěniny)"),
        (TYPE_KOJENE, "2. den", "maminka: např. červená čočka, 50—100 g; dítě: 1 lžička červené čočky"),
        (TYPE_KOJENE, "3. den", "maminka: neomezené množství luštěnin; dítě: 2—3 lžičky červené čočky"),
        (TYPE_KOJENE, "4. den", "maminka: neomezené množství luštěnin; dítě: neomezené množství luštěnin"),
        (TYPE_PLNE, "1. den", "dítě: půl lžičky červené čočky"),
        (TYPE_PLNE, "2. den", "dítě: 1 lžička červené čočky"),
        (TYPE_PLNE, "3. den", "dítě: 2—3 lžičky červené čočky"),
        (TYPE_PLNE, "4. den", "dítě: neomezené množství luštěnin"),
    ],
}

CSV_DATA["03-ryby"] = {
    "allergen": "Ryby",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: 80—100 g ryby"),
        (TYPE_BEZ, "2. den", "maminka: 100—130 g ryby"),
        (TYPE_BEZ, "3. den", "maminka: neomezené množství ryby"),
        (TYPE_KOJENE, "1. den", "maminka: 80—100 g ryby; dítě: hypoalergenní příkrmy (žádná ryba)"),
        (TYPE_KOJENE, "2. den", "maminka: 100—130 g ryby; dítě: 1 lžičku ryby"),
        (TYPE_KOJENE, "3. den", "maminka: neomezené množství ryby; dítě: 2—3 lžičky ryby"),
        (TYPE_KOJENE, "4. den", "maminka: neomezené množství ryby; dítě: neomezené množství ryby"),
        (TYPE_PLNE, "1. den", "dítě: 1 lžička ryby"),
        (TYPE_PLNE, "2. den", "dítě: 2—3 lžičky ryby"),
        (TYPE_PLNE, "3. den", "dítě: neomezené množství ryby"),
    ],
}

CSV_DATA["04-exoticke_ovoce"] = {
    "allergen": "Exotické ovoce",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: 1 banán"),
        (TYPE_BEZ, "2. den", "maminka: 2 banány"),
        (TYPE_BEZ, "3. den", "maminka: neomezené množství výše uvedeného exotického ovoce (např. ovocný salát z banánu, manga a kiwi)"),
        (TYPE_KOJENE, "1. den", "maminka: 1 banán; dítě: hypoalergenní příkrmy (žádné tropické ovoce)"),
        (TYPE_KOJENE, "2. den", "maminka: 2 banány; dítě: 1 lžička banánu"),
        (TYPE_KOJENE, "3. den", "maminka: neomezené množství výše uvedeného exotického ovoce; dítě: 2—3 lžičky banánu"),
        (TYPE_KOJENE, "4. den", "maminka: neomezené množství výše uvedeného exotického ovoce; dítě: neomezené množství výše uvedeného exotického ovoce"),
        (TYPE_PLNE, "1. den", "dítě: půl lžičky banánu"),
        (TYPE_PLNE, "2. den", "dítě: 1 lžička banánu"),
        (TYPE_PLNE, "3. den", "dítě: 2—3 lžičky banánu"),
        (TYPE_PLNE, "4. den", "dítě: neomezené množství výše uvedeného exotického ovoce"),
    ],
}

CSV_DATA["05-citrusy"] = {
    "allergen": "Citrusy",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: 50 g kteréhokoli citrusu"),
        (TYPE_BEZ, "2. den", "maminka: 70—100 g kteréhokoli citrusu"),
        (TYPE_BEZ, "3. den", "maminka: neomezené množství výše uvedených citrusů"),
        (TYPE_KOJENE, "1. den", "maminka: 50 g kteréhokoli citrusu; dítě: hypoalergenní příkrmy (žádné citrusy)"),
        (TYPE_KOJENE, "2. den", "maminka: 70—100 g kteréhokoli citrusu; dítě: dítěti dáme „ožužlat“ půl dílku mandarinky nebo třetinu dílku pomeranče; jestliže dítě ještě nekouše, lze mu dát 1 lžičku mandarinkové šťávy"),
        (TYPE_KOJENE, "3. den", "maminka: neomezené množství výše uvedených citrusů; dítě: dítěti dáme „ožužlat“ 1 dílek mandarinky nebo půl dílku pomeranče, případně 2—3 lžičky mandarinkové nebo pomerančové šťávy"),
        (TYPE_KOJENE, "4. den", "maminka: neomezené množství výše uvedených citrusů; dítě: neomezená dávka citrusů ve formě, která vyhovuje dítěti"),
        (TYPE_PLNE, "1. den", "dítě: čtvrt lžičky mandarinkové/pomerančové šťávy"),
        (TYPE_PLNE, "2. den", "dítě: dítěti dáme „ožužlat“ půl dílku mandarinky nebo třetinu dílku pomeranče; jestliže dítě ještě nekouše, lze mu dát 1 lžičku mandarinkové šťávy"),
        (TYPE_PLNE, "3. den", "dítě: dítěti dáme „ožužlat“ 1 dílek mandarinky nebo půl dílku pomeranče, případně 2—3 lžičky mandarinkové nebo pomerančové šťávy"),
        (TYPE_PLNE, "4. den", "dítě: neomezená dávka citrusů ve formě, která vyhovuje dítěti"),
    ],
}

CSV_DATA["06-jahody_maliny_rajcata_paprika"] = {
    "allergen": "Jahody | Maliny | Rajčata/Papriky",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: 50 g jahod | malin | rajčat/paprik"),
        (TYPE_BEZ, "2. den", "maminka: 70—100 g jahod | malin | rajčat/paprik"),
        (TYPE_BEZ, "3. den", "maminka: neomezené množství jahod | malin | rajčat/paprik"),
        (TYPE_KOJENE, "1. den", "maminka: 50 g jahod | malin | rajčat/paprik; dítě: pouze hypoalergenní příkrmy"),
        (TYPE_KOJENE, "2. den", "maminka: 70—100 g jahod | malin | rajčat/paprik; dítě: 1 lžička jahodové | malinové přesnídávky | polovina cherry rajčátka"),
        (TYPE_KOJENE, "3. den", "maminka: neomezené množství jahod | malin | rajčat/paprik; dítě: 2 lžičky jahodové | malinové přesnídávky | cherry rajčátko"),
        (TYPE_KOJENE, "4. den", "maminka: neomezené množství jahod | malin | rajčat/paprik; dítě: neomezené množství jahod | malin | rajčat/paprik"),
        (TYPE_PLNE, "1. den", "dítě: čtvrt lžičky jahodové | malinové přesnídávky | čtvrt cherry rajčátka"),
        (TYPE_PLNE, "2. den", "dítě: 1 lžička jahodové | malinové přesnídávky | půl cherry rajčátka"),
        (TYPE_PLNE, "3. den", "dítě: 2 lžičky jahodové | malinové přesnídávky | cherry rajčátko"),
        (TYPE_PLNE, "4. den", "dítě: neomezená dávka jahodové | malinové přesnídávky | cherry rajčátek"),
    ],
}

CSV_DATA["07-korenova_zelenina"] = {
    "allergen": "Kořenová zelenina",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: 1 ks syrové mrkve (cca 70—120 g)"),
        (TYPE_BEZ, "2. den", "maminka: 2—3 ks syrové mrkve nebo 150—200 ml vývaru z kořenové zeleniny"),
        (TYPE_BEZ, "3. den", "maminka: neomezené množství mrkve či vývaru z kořenové zeleniny"),
        (TYPE_KOJENE, "1. den", "maminka: 1 ks syrové mrkve (cca 70—120 g); dítě: pouze hypoalergenní příkrmy"),
        (TYPE_KOJENE, "2. den", "maminka: 2—3 ks syrové mrkve nebo 150—200 ml vývaru z kořenové zeleniny; dítě: 1 lžička vařené mrkve"),
        (TYPE_KOJENE, "3. den", "maminka: neomezené množství mrkve nebo vývaru z kořenové zeleniny; dítě: 2 lžičky vařené mrkve nebo 1 lžička syrové mrkve"),
        (TYPE_KOJENE, "4. den", "maminka: neomezené množství mrkve nebo vývaru z kořenové zeleniny; dítě: neomezené množství mrkve nebo vývaru z kořenové zeleniny"),
        (TYPE_PLNE, "1. den", "dítě: čtvrt lžičky vařené mrkve"),
        (TYPE_PLNE, "2. den", "dítě: půl lžičky až 1 lžička vařené mrkve"),
        (TYPE_PLNE, "3. den", "dítě: 2 lžičky vařené mrkve nebo 1 lžička syrové mrkve"),
        (TYPE_PLNE, "4. den", "dítě: neomezené množství mrkve nebo vývaru z kořenové zeleniny"),
    ],
}

CSV_DATA["08-vejce"] = {
    "allergen": "Vejce",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: 1 žloutek (např. vejce natvrdo a sníst pouze žloutek, bílek NE)"),
        (TYPE_BEZ, "2. den", "maminka: 50 g piškotů (lze Opavia), případně buchty či kteréhokoli jiného výrobku, v jehož složení je vejce"),
        (TYPE_BEZ, "3. den", "maminka: vejce v libovolné formě (míchaná vejce, volské oko či vařené vajíčko)"),
        (TYPE_KOJENE, "1. den", "maminka: 1 žloutek (např. vejce natvrdo a sníst pouze žloutek, bílek NE); dítě: pouze hypoalergenní příkrmy"),
        (TYPE_KOJENE, "2. den", "maminka: 50 g piškotů (lze Opavia), případně buchty či kteréhokoli jiného výrobku, v jehož složení je vejce; dítě: půl lžičky žloutku"),
        (TYPE_KOJENE, "3. den", "maminka: neomezené množství pečených vajec ve formě výrobku typu piškotu; dítě: 1 ks vaječné těstoviny nebo polovina piškotu"),
        (TYPE_KOJENE, "4. den", "maminka: libovolná forma vajíčka (míchaná vejce, volské oko či vařené vajíčko); dítě: 2—5 ks vaječných těstovin nebo 1—3 ks piškotů"),
        (TYPE_PLNE, "1. den", "dítě: na špičku lžičky žloutku — postupujte extrémně opatrně!"),
        (TYPE_PLNE, "2. den", "dítě: 1 ks vaječné těstoviny nebo polovina piškotu"),
        (TYPE_PLNE, "3. den", "dítě: 2—3 ks vaječných těstovin nebo 1—2 ks piškotů"),
        (TYPE_PLNE, "4. den", "dítě: neomezená dávka vaječných těstovin nebo piškotů"),
    ],
}

CSV_DATA["09-mlecne_vyrobky"] = {
    "allergen": "Mléčné výrobky",
    "rows": [
        (TYPE_BEZ, "1. den", "maminka: minimálně 2 plné čajové lžičky másla, maximum je 10 čajových lžiček másla"),
        (TYPE_BEZ, "2. den", "maminka: 50—75 g bílého jogurtu, případně 2 plátky tvrdého sýra (eidam, ementál, gouda a podobně)"),
        (TYPE_BEZ, "3. den", "maminka: 150 g jogurtu, případně 3—5 plátků tvrdého sýra"),
        (TYPE_BEZ, "4. den", "maminka: 100 g sušenek, buchty, koláče či jiného výrobku, který obsahuje mléko"),
        (TYPE_BEZ, "5. den", "maminka: 150 g sušenek, buchty, koláče či jiného výrobku, který obsahuje mléko"),
        (TYPE_BEZ, "6. den", "maminka: pokud do tohoto dne nenastalo jakékoli zhoršení stavu kůže či stolice ani jiná trávicí obtíž (zvracení atd.), můžete zkusit mléčnou zátěžovou zkoušku, která spočívá v neomezené konzumaci mléčných výrobků; mohou být podány jakékoli mléčné výrobky včetně nezakysaných v nepečené formě; v tento den si můžete dopřát například jogurt k snídani, k obědu jídlo s omáčkou obsahující smetanu, po obědě si dát cappuccino s klasickým mlékem a k večeři smetanový zákusek či buchtu s tvarohem"),
        (TYPE_KOJENE, "1. den", "maminka: 1—2 čajové lžičky másla; dítě: pouze hypoalergenní příkrmy"),
        (TYPE_KOJENE, "2. den", "maminka: 50—75 g bílého jogurtu, případně 2 plátky tvrdého sýra (eidam, ementál, gouda atd.); dítě: půlku sušenky podle receptu „Sušenky pro eliminační dietu“"),
        (TYPE_KOJENE, "3. den", "maminka: 150 g jogurtu, případně 3—5 plátků tvrdého sýra; dítě: 1 ks sušenky podle receptu „Sušenky pro eliminační dietu“"),
        (TYPE_KOJENE, "4. den", "maminka: 100 g sušenek, buchty, koláče či jiného výrobku, který obsahuje mléko; dítě: 2—3 sušenky podle receptu „Sušenky pro eliminační dietu“"),
        (TYPE_KOJENE, "5. den", "maminka: 150 g sušenek, buchty, koláče či jiného výrobku, který obsahuje mléko; dítě: 4—7 lžiček jogurtu, případně 7—10 sušenek"),
        (TYPE_KOJENE, "6. den", "maminka: neomezené množství jakéhokoli mléčného výrobku; dítě: 50—70 g jogurtu"),
        (TYPE_KOJENE, "7. den", "maminka: neomezené množství jakéhokoli mléčného výrobku; dítě: libovolné množství jogurtu, libovolné množství „pečeného“ mléka, můžeme podat i mléčnou kaši, v tento den již v neomezené dávce; nedoporučuji podávat ani v tento den klasické kravské mléko ani tvarohové krémy typu lipánku nebo pribináčku — s těmito výrobky opatrně i v budoucnu"),
        (TYPE_PLNE, "1. den", "dítě: čtvrt sušenky podle receptu „Sušenky pro eliminační dietu“ — postupujte extrémně opatrně!"),
        (TYPE_PLNE, "2. den", "dítě: polovina sušenky podle receptu „Sušenky pro eliminační dietu“"),
        (TYPE_PLNE, "3. den", "dítě: 1 ks sušenky podle receptu „Sušenky pro eliminační dietu“"),
        (TYPE_PLNE, "4. den", "dítě: 2—3 sušenky podle receptu „Sušenky pro eliminační dietu“"),
        (TYPE_PLNE, "5. den", "dítě: 4—7 lžiček jogurtu nebo 7—10 sušenek"),
        (TYPE_PLNE, "6. den", "dítě: 50—70 g jogurtu"),
        (TYPE_PLNE, "7. den", "dítě: libovolné množství jogurtu (kolik dítě sní), případně libovolné množství „pečeného“ mléka; můžeme podat i mléčnou kaši, v tento den již v neomezené dávce; naopak nedoporučuji ani v tento den klasické kravské mléko ani tvarohové krémy typu lipánku nebo pribináčku — s těmito výrobky opatrně i do budoucna"),
    ],
}
