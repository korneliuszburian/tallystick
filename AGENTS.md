# Tallystick — reguły pracy

[Start](README.md) · [Kontrakty](SPEC.md) · [Motywacje](docs/ARCHITECTURE.md)

> **Rola:** reguły pracy i kryteria dokumentacji. **Status:** OBOWIĄZUJE W TYM CHECKOUCIE.  
> **Źródła:** [SPEC.md](SPEC.md); zatwierdzony zakres zadania właściciela.  
> **Kiedy ten dokument traci aktualność:** po jawnej zmianie reguł pracy lub kontraktów/odsyłaczy; obowiązuje wersja z badanego checkoutu, nie kopia z pamięci.

## Kontekst projektu

Tallystick otacza istniejący runtime Codexa; granicę systemu i zakres MVP-0 określa [SPEC](SPEC.md#cel-i-granica-systemu).

## Nazewnictwo

Nazwa produktu w nowej dokumentacji: **Tallystick**; repo, ścieżki i slug: `tallystick`. **LEDGER** jest historycznym aliasem tego samego designu, nie osobnym produktem. Zachowuj go w cytatach, historycznych tytułach, istniejących kontraktach i rzeczywistych nazwach technicznych (`Event Ledger`, `createLedgerMiddleware`, `LEDGER CI`, `ledger-acceptance`). Normalizacja redakcyjna nie upoważnia do rename API, modułów, pakietu, workflow ani ADR.

## Źródło wymagań

Implementuj DOKŁADNIE [SPEC.md](SPEC.md). Aktualne refs, kod, PR, issues i CI sprawdzaj w GitHub; `main` jest bazą, nie dowodem statusu lokalnego checkoutu. [ISSUES.md](ISSUES.md) jest historyczną mapą etapów. [Baseline](docs/MVP-0-STATUS.md) potwierdza własny SHA.

Przed zadaniem przeczytaj [ADR](SPEC.md#decyzje-niepodlegące-negocjacji), właściwy moduł w [R](SPEC.md#r-mvp-0-implementation-spec), kryteria w [S](SPEC.md#s-mvp-0-acceptance-tests) i zależności etapu. Przy rozbieżności implementacyjnej repo wygrywa; motywacyjnej nie naprawiaj przez przepisywanie historii. Research i raport operatora nie są nowym ADR ani niezależną weryfikacją repo.

## Kod, wymagania i dowody

Kod na wskazanym SHA pokazuje, co jest zaimplementowane; rzeczywisty run pokazuje, co wykonano i sprawdzono. SPEC/ADR określają wymagane zachowanie, nie poświadczają jego realizacji. Opis implementacji sprzeczny z kodem wymaga korekty opisu; kod sprzeczny z kontraktem wymaga testu i naprawy w zatwierdzonym zakresie, nie przepisania SPEC pod istniejący błąd. Sprzeczność samych wymagań podlega procedurze STOP poniżej.

Po odczytaniu właściwych wymagań przejdź do typów, implementacji, wywołań i testów danego modułu — [mapa kodu](README.md#mapa-rdzenia). Docs czytaj selektywnie dla uzasadnień decyzji, odrzuconych alternatyw, języka domeny, kryteriów i dowodów. Nie ładuj całego researchu jako obowiązkowego wprowadzenia do każdej zmiany.

Czytelność utrzymuj w kodzie: jednoznaczne nazwy, spójne formatowanie, małe jednostki odpowiedzialności i istniejący podział typów oraz implementacji. Nie przykrywaj niezrozumiałego kodu opisującym go Markdownem ani komentarzem powtarzającym instrukcje. To nie zgoda na niezlecony refaktor lub zmianę API.

Rejestr badawczy jest indeksem hipotez i prób: ustalenie wiąż ze źródłem, SHA i reprodukcją. Przy kolizji identyfikatorów zachowaj prefiks źródła (np. SD:F01, SR:F16); zmiana dokumentacji nie oznacza naprawy ani zamknięcia ustalenia.

## Reguły pracy

- Nie zmieniaj architektury, API, nazw modułów ani plików bez jawnej zgody; nie edytuj po cichu historii ADR, a nowa decyzja supersedująca zachowuje wcześniejszy zapis — [SPEC](SPEC.md#decyzje-niepodlegące-negocjacji).
- Przy znanym dozwolonym bypassie brokera odmów startu `enforce`, bez observer fallback; bez dowodu pokrycia nie deklaruj potwierdzonej integracji — [ADR-002](SPEC.md#adr-002--enforcement-działa-fail-closed), [S.6](SPEC.md#s6-dodatkowa-bramka-wdrożenia--poza-mvp-0).
- Guard i zatwierdzony zamiar muszą poprzedzać `spawn`; nie uruchamiaj procesu bez poprawnego, niezużytego permit — [R.4](SPEC.md#r4-failure-antibody-gate), [ADR-016](SPEC.md#adr-016--kompozycja-middleware-zużycie-permit-klucz-i-obwoluta-receipt).
- `UNKNOWN` oznacza zero automatycznych retry i reconciliation przed kontynuacją — [ADR-003](SPEC.md#adr-003--nieznany-wynik-wykonania-nie-uprawnia-do-retry), [R.5](SPEC.md#r5-cienkie-złożenie-w-srcindexts).
- Nie dopuszczaj digestu bez zatwierdzonego receipt ani nie zastępuj jedynego raw evidence przez summary/digest — [ADR-004](SPEC.md#adr-004--dowód-poprzedza-admission), [R.1](SPEC.md#r1-event-ledger).
- Nie wykonuj wywołań LLM w hot path — [ADR-005](SPEC.md#adr-005--hot-path-jest-deterministyczny).
- Nie traktuj pamięci językowej ani odpowiedzi modelu jako stanu repo — [R.3](SPEC.md#r3-state-twin).
- Nie zmieniaj epoki przez zapis failure, wyniku testu, timestampu lub obserwacji — [ADR-001](SPEC.md#adr-001--epoka-świata-jest-oddzielona-od-rewizji-wiedzy).
- Nie rozszerzaj MVP-0 o piąty moduł, provider/model loop ani elementy poza zakresem i nie dodawaj niezatwierdzonych zależności — [R.0](SPEC.md#r0-zakres-środowisko-i-struktura).
- Nie pomijaj edge cases ani nie zastępuj testów rzeczywistych procesów mockowanym LLM — [R](SPEC.md#r-mvp-0-implementation-spec), [S](SPEC.md#s-mvp-0-acceptance-tests).
- Przed zapisem przedstaw plan plików i uzyskaj zgodę właściciela; realizuj zatwierdzony zakres bez samowolnego rozszerzania.

## Sprzeczności i brak rozstrzygnięcia

**STOP:** przy sprzeczności wymagań zatrzymaj realizację i zgłoś konflikt zamiast samodzielnie zmieniać kontrakt — [SPEC](SPEC.md#decyzje-niepodlegące-negocjacji).

Zgłoszenie zawiera dokładne cytaty i odsyłacze, dotknięty invariant/publiczne API oraz test-case bez jednoznacznej implementacji. Diagnostic STOP nie jest ukończeniem pracy. Nie obchodź konfliktu zmianą API, poluzowaniem testu, dodatkową zależnością ani obejściem fail-closed.

## Kolejność i bramki ukończenia

Kolejność i warunek rozpoczęcia kolejnego modułu: [ADR-006](SPEC.md#adr-006--kolejność-implementacji-jest-zamrożona). Ukończenie: zgodne API, invariants i edge cases w [R](SPEC.md#r-mvp-0-implementation-spec), testy w [S](SPEC.md#s-mvp-0-acceptance-tests) oraz regresja wcześniejszych modułów. Bramka MVP-0: [S.1–S.5](SPEC.md#s1-sekwencja-obowiązkowa); rzeczywista integracja: osobne [S.6](SPEC.md#s6-dodatkowa-bramka-wdrożenia--poza-mvp-0).

## Konwencje commitów i PR

- Twórz atomowe commity per test-case; opis: `module: co i dlaczego`.
- Podaj powiązane issue, zmieniony test-case i rzeczywiste wyniki; użyj [szablonu PR](.github/pull_request_template.md).
- Bez push do `main`; zmiany przez PR, bez merge’u wykonywanego przez autora.
- Nie obchodź branch protection/required checks ani nie włączaj auto-merge dla ukrycia czerwonego wyniku.
- Bez `continue-on-error`, pomijania suit i osłabiania asercji w celu uzyskania pozornego sukcesu.

PR dokumentacyjny opisuje decyzje, kryteria lub dowody; convenience script wymaga jawnego zakresu. Implementacyjny realizuje konkretne zlecenie i SPEC z testami oraz regresją. Diagnostic STOP stosuje procedurę powyżej. Żaden typ nie upoważnia do niezatwierdzonej zmiany ADR/API.

## Porządek gałęzi po merge

Jedna aktywna gałąź na aktywny PR, domyślnie z aktualnego main; nie zostawiaj porzuconych ani zbędnych stacked branches. Zamknij superseded PR; linked issue dopiero po potwierdzeniu kryteriów i sprawdzeniu closing keywords; następnie rozlicz head branch.

Przed usunięciem porównaj aktualne SHA: `ahead_by=0` i `behind`/`identical` potwierdzają zawarcie historii. Zamknięty PR, podobne pliki i squash merge nie wystarczają. Zmiana head wymaga nowego porównania; rozbieżność — osobnego przeglądu. Bez force-delete na podstawie nazwy lub starej listy. Usunięcie gałęzi wymaga zgody właściciela.

Zmiana ustawień repo wymaga osobnej zgody; branch protection/auto-merge dopiero po potwierdzeniu stabilnych wymaganych checków. Pojedynczy zielony run nie jest zgodą. Zapis czynności: [checklista](docs/REPOSITORY-HYGIENE.md).

## Wyniki i evidence

FACT wymaga dowodu; TODO oznacza niewykonaną pracę. PASS/FAIL/BLOCKED zawsze mają zakres: zmierzone naruszenie to FAIL, brak wystarczającego pomiaru to BLOCKED. Jednoczesny FAIL i BLOCKED nie dają PASS. Plan ani kod testu nie zastępują uruchomienia. Raport operatora oznacz jako taki, gdy nie odczytano źródłowych logów.

Wynik wiąż z SHA, środowiskiem, profilem i źródłem. Nie przenoś wyników między rewizjami; nie sumuj różnych profili do jednego PASS. Odczyt konfiguracji nie jest atestacją jej późniejszego użycia.

## Dokumentacja

- Dokument w docs/ istnieje tylko, jeśli koduje decyzję, kryterium testu albo dowód. Dokument procesowy jest krótki i linkuje źródła normatywne zamiast je kopiować.
- Jedna reguła = jedno kanoniczne miejsce. SPEC.md jest jedyną kopią kontraktów; AGENTS.md jedyną kopią reguł pracy.
- Każdy fakt w dokumencie ma dowód (plik, run, commit, sekcja SPEC). Dokument bez linii utraty aktualności nie może wejść do docs/.
- PR dokumentacyjny wykazuje w opisie, którym elementem filtra zarabia każdy nowy lub zmieniony plik.
- Nie dodawaj dokumentacji, która opowiada to, co egzekwuje kod lub test.

README jest mapą. Jeden plik ma jeden cel; nowy wymaga uzasadnienia filtrem. Bez przymiotników oceniających bez pomiaru, fikcyjnych badges PASS i rozbudowanych kopii tego samego summary. Wyjątkiem od unikania powtórzeń są krytyczne jednolinijkowe instrukcje agenta z odsyłaczem do SPEC w sekcji Reguły pracy.

### Wspólny szablon

Wspólna jest struktura informacji, nie obowiązek wypełniania pustych rozdziałów:

```markdown
# Tallystick — jednoznaczny cel

> **Rola:** decyzja / kryterium / dowód / mapa
> **Status:** status decyzji lub wynik o jawnym zakresie
> **Zakres:** data, rewizja, profil albo obszar obowiązywania
> **Źródła:** kanoniczne dokumenty i dowody
> **Kiedy ten dokument traci aktualność:** konkretny warunek

## Ustalenie
## Uzasadnienie
## Dowody lub kryteria PASS / FAIL / BLOCKED
## Granice i dalsze rozstrzygnięcie
```

Nazwy rozdziałów dopasuj do roli; pomiń niemające zastosowania. Zachowuj stabilne identyfikatory i istniejące odsyłacze. Polskie nagłówki/proza, oryginalne nazwy API/statusów. Nie wymieniaj istniejących nazw plików wyłącznie dla estetyki.

### ADR i źródła historyczne

ADR pozostaje w SPEC, bez drugiej kopii w `docs/adr/`. Nowy zatwierdzony ADR ma identyfikator/tytuł, status i zakres, **Regułę**, **Uzasadnienie**, źródła/kryterium oraz jawną relację zastępowania. Brak decyzji właściciela = REKOMENDACJA — NIEZAMROŻONE. Szablon nie upoważnia do edycji starych ADR ani kosmetycznego przepisania SPEC.

Historyczne wyniki i cytaty zachowują własne daty, nazwy i identyfikatory. Skrót lub przeniesienie wskazuje nowe miejsce albo permalink do niezmiennego oryginału. Research nie aktualizuje po cichu dawnego wyniku: osobno zapisuj późniejszy dowód i jego ograniczenia. Pełne raw, sekrety i lokalne klucze nie trafiają do publicznego repo; identyfikatory raportów nie są same dowodem prawdziwości ich wniosków.
