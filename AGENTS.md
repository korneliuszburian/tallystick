# AGENTS.md

## Kontekst projektu

LEDGER otacza istniejący runtime Codexa; granicę systemu i zakres MVP-0 określa [SPEC.md](SPEC.md#cel-i-granica-systemu).

## Źródło wymagań

Implementuj DOKŁADNIE [SPEC.md](SPEC.md). `main` jest kanoniczną bazą kodu; aktualne refs, kod, PR, issues i CI sprawdzaj w GitHub. [ISSUES.md](ISSUES.md) jest historycznym podziałem etapów, nie aktualnym trackerem ani zamiennikiem SPEC. [Release-baseline](docs/MVP-0-STATUS.md) dotyczy wskazanego SHA, nie dowolnego przyszłego main.

Przed zadaniem przeczytaj kolejno [ADR](SPEC.md#decyzje-niepodlegące-negocjacji), specyfikację modułu w [R](SPEC.md#r-mvp-0-implementation-spec), jego testy w [S](SPEC.md#s-mvp-0-acceptance-tests) i zależności etapu w [ISSUES.md](ISSUES.md).

## Reguły pracy

- Nie zmieniaj architektury, API, nazw modułów ani plików bez jawnej zgody; nie edytuj po cichu historii ADR, a nowa decyzja supersedująca zachowuje wcześniejszy zapis — [SPEC: zamrożone decyzje](SPEC.md#decyzje-niepodlegące-negocjacji).
- Przy znanym dozwolonym bypassie brokera odmów startu `enforce`, bez cichego observer fallback; bez dowodu pokrycia nie deklaruj potwierdzonej integracji — [ADR-002](SPEC.md#adr-002--enforcement-działa-fail-closed), [S.6](SPEC.md#s6-dodatkowa-bramka-wdrożenia--poza-mvp-0).
- Guard i zatwierdzony zamiar muszą poprzedzać `spawn`; nie uruchamiaj procesu bez poprawnego, niezużytego permit — [R.4](SPEC.md#r4-failure-antibody-gate), [ADR-016](SPEC.md#adr-016--kompozycja-middleware-zużycie-permit-klucz-i-obwoluta-receipt).
- `UNKNOWN` oznacza zero automatycznych retry i reconciliation przed kontynuacją — [ADR-003](SPEC.md#adr-003--nieznany-wynik-wykonania-nie-uprawnia-do-retry), [R.5](SPEC.md#r5-cienkie-złożenie-w-srcindexts).
- Nie dopuszczaj digestu bez zatwierdzonego receipt ani nie zastępuj jedynego raw evidence przez summary/digest — [ADR-004](SPEC.md#adr-004--dowód-poprzedza-admission), [R.1](SPEC.md#r1-event-ledger).
- Nie wykonuj wywołań LLM w hot path — [ADR-005](SPEC.md#adr-005--hot-path-jest-deterministyczny).
- Nie traktuj memory ani odpowiedzi modelu jako stanu repo — [R.3](SPEC.md#r3-state-twin).
- Nie zmieniaj epoki eksperymentu przez zapis failure, wyniku testu, timestampu lub obserwacji — [ADR-001](SPEC.md#adr-001--epoka-świata-jest-oddzielona-od-rewizji-wiedzy).
- Nie rozszerzaj MVP-0 o piąty moduł, provider/model loop ani elementy poza zakresem i nie dodawaj niezatwierdzonych zależności — [granica systemu](SPEC.md#cel-i-granica-systemu), [R.0](SPEC.md#r0-zakres-środowisko-i-struktura).
- Nie pomijaj edge cases specyfikacji ani nie zastępuj testów rzeczywistych procesów mockowanym LLM — [R](SPEC.md#r-mvp-0-implementation-spec), [S](SPEC.md#s-mvp-0-acceptance-tests).
- Przed zapisem przedstaw plan plików i uzyskaj zgodę właściciela; utrzymuj zatwierdzony zakres.

## Sprzeczności i brak rozstrzygnięcia

- Przy sprzeczności wymagań wykonaj STOP i zgłoś konflikt w PR zamiast samodzielnie rozstrzygać kontrakt — [SPEC: zamrożone ADR](SPEC.md#decyzje-niepodlegące-negocjacji), [R](SPEC.md#r-mvp-0-implementation-spec), [S](SPEC.md#s-mvp-0-acceptance-tests).

Zgłoszenie zawiera dokładne cytaty sprzecznych fragmentów, dotknięty invariant/publiczne API i test-case, którego nie można jednoznacznie zaimplementować. Diagnostic STOP nie jest ukończeniem implementacji. Nie obchodź konfliktu zmianą API, poluzowaniem testu, dodatkową zależnością ani obejściem fail-closed.

## Kolejność i bramki ukończenia

Kolejność etapów i warunek rozpoczęcia następnego: [ADR-006](SPEC.md#adr-006--kolejność-implementacji-jest-zamrożona). Kryteria ukończenia modułu: jego API, invariants i edge cases w [R](SPEC.md#r-mvp-0-implementation-spec) oraz testy w [S](SPEC.md#s-mvp-0-acceptance-tests), z regresją wcześniejszych modułów. Bramka całego MVP-0: [S.1–S.5](SPEC.md#s1-sekwencja-obowiązkowa); oddzielna bramka rzeczywistej integracji: [S.6](SPEC.md#s6-dodatkowa-bramka-wdrożenia--poza-mvp-0).

## Konwencje commitów i PR

- Twórz atomowe commity per test-case; opis zmiany ma format `module: co i dlaczego`.
- W PR podaj powiązane issue, zmieniony test-case i wyniki rzeczywiście wykonanych testów; korzystaj z [szablonu PR](.github/pull_request_template.md).
- Nie wykonuj push do `main`; wszystkie zmiany integruj przez PR. Autor nie wykonuje merge'u.
- Nie obchodź branch protection ani required checks i nie włączaj auto-merge w celu ukrycia czerwonego wyniku.
- Nie włączaj `continue-on-error`, nie pomijaj grup testów i nie osłabiaj asercji ani bramki, aby uzyskać pozorny sukces.

Typ PR: dokumentacyjny/porządkowy opisuje istniejące decyzje i evidence bez nowych funkcji; convenience script wymaga jawnego zakresu. Implementacyjny realizuje konkretne issue i zatwierdzony SPEC z testami etapu i regresji. Diagnostic STOP stosuje procedurę powyżej. Żaden typ nie upoważnia do rozszerzenia zakresu ani niezatwierdzonej zmiany API/ADR.

## Porządek gałęzi po merge

Jedna aktywna gałąź na aktywny PR, domyślnie z aktualnego main; nie pozostawiaj stacked ani porzuconych gałęzi po merge. Zamknij superseded PR, a linked issue dopiero po potwierdzeniu kryteriów, sprawdzając także closing keywords; następnie uporządkuj head branch.

Przed usunięciem porównaj aktualny head SHA z aktualnym main: `ahead_by=0` i status `behind`/`identical` potwierdzają zawarcie historii. Zamknięty PR, podobne pliki ani squash merge same tego nie dowodzą. Rozbieżna gałąź wymaga osobnego przeglądu, zmieniony head ponownego porównania; nie wykonuj force-delete na podstawie nazwy lub historycznego opisu. Usuwaj tylko aktualnie potwierdzone heads po zgodzie właściciela.

Zmiany ustawień repo wymagają osobnej zgody. Branch protection i auto-merge włączaj dopiero po potwierdzeniu stabilnych wymaganych checków aktualnego pipeline; pojedynczy zielony run nie jest zgodą na zmianę ustawień. Do zapisania wykonanych kontroli służy [checklista](docs/REPOSITORY-HYGIENE.md).

## Wyniki i evidence

FACT oznacza obserwację z dowodem, TODO niewykonaną pracę, BLOCKED brak możliwości sprawdzenia. Zmierzony błąd pozostaje FAIL; niewykonany lub pominięty test nie jest PASS. Plan, kod testu ani cudza deklaracja nie zastępują wykonania. Wynik wiąż z testowanym SHA, środowiskiem i odczytanym evidence; historyczny baseline nie potwierdza nowego HEAD.

## Dokumentacja

- Dokument w docs/ istnieje tylko, jeśli koduje decyzję, kryterium testu albo dowód. Dokument procesowy jest krótki i linkuje źródła normatywne zamiast je kopiować.
- Jedna reguła = jedno kanoniczne miejsce. SPEC.md jest jedyną kopią kontraktów; AGENTS.md jedyną kopią reguł pracy.
- Każdy fakt w dokumencie ma dowód (plik, run, commit, sekcja SPEC). Dokument bez linii utraty aktualności nie może wejść do docs/.
- PR dokumentacyjny wykazuje w opisie, którym elementem filtra zarabia każdy nowy lub zmieniony plik.
- Nie dodawaj dokumentacji, która opowiada to, co egzekwuje kod lub test.

**Kiedy ten dokument traci aktualność:** po jawnej zmianie reguł pracy lub zmianie przywołanych kontraktów/ścieżek SPEC wymagającej aktualizacji instrukcji; obowiązuje wersja z badanego checkoutu, nie kopia z pamięci.
