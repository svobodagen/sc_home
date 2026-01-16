# DEFINITIVNÍ SOUHRN PRAVIDEL SYSTÉMU CÍLŮ

## 1. Základní Principy
*   **ODZNAK (Badge) = Automatický.** Řídí se statistikami (hodiny/projekty).
    *   *Pozn:* Záznam v DB je pouze historický. Stav se počítá dynamicky.
*   **CERTIFIKÁT (Certificate) = Manuální.** Řídí se tlačítkem Aktivovat/Deaktivovat (rozhoduje Mistr).
    *   *Pozn:* Záznam v DB je rozhodující.

### Filtrování (Perspektiva)
*   **MISTR** vidí jen **svůj svět**.
    *   Odznaky: Splnil učedník podmínky **u mě**?
    *   Certifikáty: Udělil jsem mu to **já**?
    *   *(Výsledky od jiných mistrů jsou skryté/nepodstatné pro rozhodování mistra)*.
*   **UČEDNÍK** (a Host) vidí **celý svůj profil**.
    *   Agregace výsledků od všech mistrů.

## 2. Logika Zobrazení
*   **Nadpis (Název):** Je totožný pro Náhled i Detail (Název + Typ).
*   **Pravidlo v Detailu:** Zobrazuje se **VŽDY** (u aktivních i neaktivních položek).
    *   *Odznak:* Textový popis pravidel (např. "Odpracuj 100 hodin").
    *   *Certifikát:* Fixní text "Uděluje mistr".
*   **Iniciály:**
    *   *Neaktivní:* Nikdy se nezobrazují.
    *   *Aktivní:* Zobrazují se iniciály relevantních osob (dle filtru níže).

## 3. Tabulky Zobrazení

### A. ODZNAKY (Automatické)

| Rozhraní | Stav | NÁHLED: Ikona | NÁHLED: Iniciály | NADPIS (Náhled i Detail) | DETAIL: Info/Kontext | DETAIL: Pravidlo | DETAIL: Akce |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MISTR**<br>*(vidí: Učedníka)* | **AKTIVNÍ**<br>*(Splněno u mě)* | **Barevná ikona Odznaku** | **Iniciály Učedníka**<br>*(např. "LN")* | **Název + "Odznak"** | "Stav u vás: **Splněno**"<br>"Získali: **[Jména]**" | **[Text pravidel]** | Zavřít |
| **MISTR**<br>*(vidí: Učedníka)* | **NEAKTIVNÍ**<br>*(Nesplněno u mě)* | **Šedá ikona Odznaku** | **-** | **Název + "Odznak"** | "Stav u vás: **Nesplněno**" | **[Text pravidel]** | Zavřít |
| **UČEDNÍK**<br>*(vidí: Sebe)* | **AKTIVNÍ**<br>*(Splněno)* | **Barevná ikona Odznaku** | **Iniciály Mistrů**<br>*(např. "JP")* | **Název + "Odznak"** | "Získáno u mistra: **[Jména]**" | **[Text pravidel]** | Zavřít |
| **UČEDNÍK**<br>*(vidí: Sebe)* | **NEAKTIVNÍ**<br>*(Nesplněno)* | **Šedá ikona Odznaku** | **-** | **Název + "Odznak"** | "Stav: **Nesplněno**" | **[Text pravidel]** | Zavřít |

### B. CERTIFIKÁTY (Manuální)

| Rozhraní | Stav | NÁHLED: Ikona | NÁHLED: Iniciály | NADPIS (Náhled i Detail) | DETAIL: Info/Kontext | DETAIL: Pravidlo | DETAIL: Akce |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MISTR**<br>*(vidí: Učedníka)* | **AKTIVNÍ**<br>*(Udělil JÁ)* | **Barevná ikona Certifikátu** | **Iniciály Učedníka**<br>*(např. "LN")* | **Název + "Certifikát"** | "Stav: **Uděleno vámi**" | **"Uděluje mistr"** | **DEAKTIVOVAT** |
| **MISTR**<br>*(vidí: Učedníka)* | **NEAKTIVNÍ**<br>*(Neudělil JÁ)* | **Šedá ikona Certifikátu** | **-** | **Název + "Certifikát"** | "Stav: **Neuděleno vámi**" | **"Uděluje mistr"** | **AKTIVOVAT** |
| **UČEDNÍK**<br>*(vidí: Sebe)* | **AKTIVNÍ**<br>*(Mám to)* | **Barevná ikona Certifikátu** | **Iniciály Mistrů**<br>*(např. "JP, MK")* | **Název + "Certifikát"** | "Udělili mistři: **[Jména]**" | **"Uděluje mistr"** | Zavřít |
| **UČEDNÍK**<br>*(vidí: Sebe)* | **NEAKTIVNÍ**<br>*(Nemám to)* | **Šedá ikona Certifikátu** | **-** | **Název + "Certifikát"** | "Stav: **Zatím neuděleno**" | **"Uděluje mistr"** | Zavřít |
