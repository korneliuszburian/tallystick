# MVP-0 — release-baseline

## FACT — zakres i identyfikacja dowodu

Audyt GitHub: **8 września 2026 r.** Ten dokument jest historycznym baseline, nie ruchomym wskaźnikiem ostatniego zielonego commitu.

| Pole | Zweryfikowana wartość |
|---|---|
| Repozytorium | `korneliuszburian/tallystick` |
| Default branch w chwili audytu | `main` |
| Pełny SHA main | `0683f1dc006c37d9c05cb69e054e6bf4a5976a45` |
| Zdarzenie | Merge PR #20, 2026-09-08 13:25:02 UTC |
| Workflow | `LEDGER CI`, run #103, ID `34231830068` |
| Check / job | `ledger-acceptance`, ID `102079623149` |
| Wynik | `completed / success`, 2026-09-08 13:25:31 UTC |
| Środowisko z logu | Ubuntu 24.04; Node 24.20.0; npm 11.19.0; Git 2.55.0 |

Dowody pierwotne: [commit main](https://github.com/korneliuszburian/tallystick/commit/0683f1dc006c37d9c05cb69e054e6bf4a5976a45), [run CI](https://github.com/korneliuszburian/tallystick/actions/runs/34231830068), [job i log](https://github.com/korneliuszburian/tallystick/actions/runs/34231830068/job/102079623149). Wyniki sprawdzono w logu main, nie wyłącznie w opisie PR #20. Retencja logów może ograniczyć późniejszą dostępność; brak odczytywalnego logu nie jest nowym potwierdzeniem PASS.

## FACT — moduły i testy

| Moduł / etap | Publiczna odpowiedzialność | Test suite | Wynik baseline |
|---|---|---|---|
| Event Ledger | `openLedger`: append-only events, raw CAS, integralność i odzyskiwalne źródła. | `npm run test:ledger` | PASS, 19/19 |
| Acquisition Adapters | `createAdapters`: shell, test-runner, compiler, git-diff; raw capture i bounded typed digest. | `npm run test:adapters` | PASS, 12/12 |
| State Twin | `createStateTwin`, `computeStateEpoch`, `epochFor`, `revalidateMemory`: pomiar świata i preconditions. | `npm run test:state` | PASS, 35/35 |
| Failure Antibody Gate | `createFailureGate`, `fingerprint`, preflight i failure records: reservations, permits i blokowanie powtórek. | `npm run test:guards` | PASS, 15/15 |
| Middleware + E2E/chaos/demo | `createLedgerMiddleware` w `src/index.ts`: cienka kompozycja, receipt i testy całej ścieżki, bez piątego modułu. | `npm run test:e2e` | PASS, 12/12 |

Łącznie **93/93 testy**. W logu są wszystkie pięć suit w wymaganej kolejności, bez pominięcia któregoś etapu. `npm ci` i `npx --no-install tsc --noEmit` przeszły. Test E2E uruchomił literalne `npm run demo` i otrzymał `All three deterministic demo scenarios passed.`

**FACT — granica twierdzenia:** w CI wykonano łańcuch pięciu skryptów odpowiadający `test:acceptance`; osobnego literalnego wywołania wrappera `npm run test:acceptance` nie ma w tym logu. `verify` dodany w porządkowym PR nie istniał w tym SHA i nie ma wyniku w historycznym baseline. Wyniki nowego PR należy czytać w jego własnych checkach.

Status release-baseline: deterministyczny vertical slice MVP-0 jest zintegrowany na main i przeszedł repozytoryjną bramkę testową. Nie jest to niezależny formalny dowód braku wszelkich defektów ani potwierdzenie realnej integracji enforce.

## Indeks ADR-001–ADR-018

**ADR — ZAMROŻONE.** Poniższe zdania wyłącznie indeksują decyzje z [SPEC.md](../SPEC.md); nie zastępują ich reguł, uzasadnień ani historii.

| ADR | Znaczenie |
|---|---|
| ADR-001 | `epoch_id` opisuje wejścia świata, a `state_revision_id` wiedzę; zapis porażki lub wyniku testu nie zmienia epoki eksperymentu. |
| ADR-002 | Dozwolona ścieżka wykonania omijająca broker uniemożliwia start enforce, bez automatycznego observer fallback. |
| ADR-003 | Crash po spawn bez zatwierdzonego wyniku oznacza UNKNOWN i reconciliation przed jakimkolwiek retry. |
| ADR-004 | Blob poprzedza wskazujący go event, a zatwierdzony Evidence Receipt poprzedza admission digestu. |
| ADR-005 | Hot path czterech modułów pozostaje deterministyczny i nie wywołuje LLM. |
| ADR-006 | Obowiązuje kolejność Event Ledger → Acquisition Adapters → State Twin → Failure Antibody Gate → E2E, z zieloną bramką przed następnym etapem. |
| ADR-007 | Kompletność konkretnego capture należy do eventu i nie wynika z samego hasha blobu deduplikowanego przez CAS. |
| ADR-008 | `changed_artifacts` wynika z lokalnego pomiaru SHA-256 plików przed i po procesie, nie z tekstowej deklaracji procesu. |
| ADR-009 | `BlobRef.stream` zachowuje tożsamość strumienia, a SourceHandle rozwiązuje się przez zapisane powiązanie eventu, blobu i strumienia. |
| ADR-010 | Na etapie adapterów `receipt_id` i `raw_event_id` wskazują zatwierdzony `tool_output` z request/reservation, przy zachowaniu rozdzielnych pól kontraktu. |
| ADR-011 | `epochFor` uwzględnia Git HEAD, fingerprint środowiska i zmierzone zależności requestu, a nie zmiany plików poza dependency set. |
| ADR-012 | State Twin wiąże Ledger przy konstrukcji, podczas gdy samodzielny `computeStateEpoch` pozostaje czystym pomiarem. |
| ADR-013 | Gate wiąże storage przy konstrukcji i utrwala historię decyzji w events, z projekcjami pomocniczymi; klauzulę o osobnym połączeniu zmienia ADR-015. |
| ADR-014 | Escape proof jest jednorazowy, weryfikowalny przez evidence i podpisany HMAC-SHA256 kluczem harnessu niedostępnym modelowi. |
| ADR-015 | Gate i append używają jednej transakcji BEGIN IMMEDIATE na połączeniu Ledgera, zastępując własne połączenie Gate z ADR-013. |
| ADR-016 | Middleware składa cztery moduły, zarządza kluczem i zużyciem permit oraz zwraca obwolutę receipt opartą na trwałych składnikach evidence. |
| ADR-017 | Strumieniowe przekroczenie limitu raw zatrzymuje proces i zachowuje częściowy capture z `RAW_LIMIT_EXCEEDED`. |
| ADR-018 | Demo kompiluje `src` i `scripts` do `.demo-dist`, następnie uruchamia JavaScript bez nowych loaderów i zmian specyfikatorów `.js`. |

**Historia, nie nowe decyzje:** ADR-010 zawiera również ówczesny plan osobnego zdarzenia receipt; późniejszy ADR-016 opisuje obwolutę w pamięci i brak nowego rodzaju eventu. Historyczna instrukcja uruchamiania source TypeScript w ADR-016 jest zastąpiona sposobem demo z ADR-018 i S.4. Indeks nie usuwa tych wcześniejszych zapisów ani nie upoważnia do zmian API/SPEC.

## FACT — granice MVP-0

Normatywne źródła: [SPEC R.0, R.1–R.5, S.1–S.6](../SPEC.md) i [AGENTS.md](../AGENTS.md).

MVP-0 obejmuje cztery moduły, cztery acquisition adapters oraz middleware, E2E/chaos i demo. Rozdziela transcript, persistent memory, verified world state, tool observations i learned experience; kontrakt `MemoryRecord` do revalidation nie oznacza wdrożenia persistent semantic memory.

Poza tym wycinkiem pozostają Context Atlas/pełny Context Assembler, Recovery Engine, persistent semantic memory i jej lifecycle, utility promotion, Compounding Evaluator, pozostałe adaptery file-read/directory/search/HTML i rzeczywisty audyt Codex/MCP. Zawartość designu docelowego nie jest deklaracją implementacji tych elementów.

Nie ma gwarancji wspólnej transakcji exactly-once ani atomowego rollbacku Git, SQLite i zewnętrznych efektów procesu. UNKNOWN nie daje prawa do automatycznego retry.

## Ograniczenia, TODO i BLOCKED

| Status | Ograniczenie / dług | Dalsze postępowanie |
|---|---|---|
| TODO / BLOCKED | S.6 nie ma w tym baseline dowodu z realnego Codexa/MCP. | Wykonać [laptop audit](LAPTOP-INTEGRATION-AUDIT.md); do tego czasu brak deklaracji production enforce. |
| FACT / TODO | Workflow warunkuje cztery suity istnieniem katalogów; na tym HEAD wszystkie się wykonały, lecz konstrukcja nie wymusza ich obecności. | Odnotować dług; nie zmieniać workflow w porządkowym PR ani traktować nieobecnego katalogu jako PASS. |
| FACT / TODO | Dowód środowiskowy dotyczy Ubuntu/Node/npm z tabeli; demo używa `rm -rf`, a storage wymaga lokalnego filesystemu i jednego writera. | Zmierzyć laptop, zależności natywne, shell i SQLite używane przez `better-sqlite3`; nie zakładać zgodności innych platform. |
| FACT / TODO | `.gitignore` baseline obejmuje tylko `.demo-dist/` i `node_modules/`. | Trzymać bazę, CAS, logi audytu i `<databasePath>.harness-key` poza wersjonowanym worktree; nie commitować klucza ani sekretów. |
| FACT / TODO | `ISSUES.md` opisuje historyczne etapy #1–#5, nie aktualne numery i statusy GitHub Issues. | Traktować go jako plan; stan sprawdzać w GitHub, a kontrakt w SPEC. |
| FACT / TODO | W logu instalacji wystąpiły ostrzeżenia o `prebuild-install` i skrypcie instalacyjnym `better-sqlite3`, mimo sukcesu `npm ci`. | Sprawdzić instalację i politykę skryptów lokalnie; brak zgody na aktualizacje zależności w porządkowym PR. |

## Kiedy dokument przestaje być aktualnym potwierdzeniem

**FACT:** dokument nadal opisuje historyczny SHA wskazany powyżej. Każdy inny HEAD wymaga własnej weryfikacji; nawet merge dokumentacyjny nie otrzymuje automatycznie tych checków. Zmiana kodu, testów, SPEC, lockfile, CI, narzędzi, platformy, konfiguracji hosta lub execution paths unieważnia transfer tego wyniku na nowe warunki.

**TODO:** dla nowego baseline zapisać nowy SHA, własny CI run i odczytane logi; nie przepisywać historycznego dowodu jako wyniku nowej rewizji. Wynik S.6 musi ponadto identyfikować wersję/config Codexa/MCP i zbadany zestaw ścieżek. **BLOCKED:** niedostępny dowód lub nieobserwowalna granica nigdy nie stają się PASS na podstawie tego dokumentu.
