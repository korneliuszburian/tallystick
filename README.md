# Tallystick / LEDGER

Deterministyczny **transaction/control plane dla coding agents**, projektowany wokół istniejącego runtime'u Codexa. LEDGER utrwala dowody wykonania, kontroluje dopuszczenie wyników do kontekstu, mierzy stan repozytorium i blokuje równoważne znane porażki przed uruchomieniem procesu.

## What it is

Cztery moduły oraz ich cienka kompozycja w `src/index.ts`:

| Element MVP-0 | Odpowiedzialność |
|---|---|
| Event Ledger | Append-only events i content-addressable storage odzyskiwalnego raw evidence. |
| Acquisition Adapters | Shell, test-runner, compiler i git-diff: przechwycenie raw oraz bounded typed digest. |
| State Twin | Pomiary plików, Git i środowiska; epoki preconditions i revalidation. |
| Failure Antibody Gate | Deterministyczny preflight, reservations, permits i blokowanie równoważnych porażek. |
| Middleware + E2E/chaos/demo | Kompozycja czterech modułów i sprawdzenie całej ścieżki; **nie piąty moduł**. |

```text
proposal -> guard -> execution -> raw evidence -> typed digest -> State Twin
```

Diagram skraca pipeline R.5: przed guardem wykonywany jest pomiar preconditions; zatwierdzone intent/reservation poprzedzają spawn, raw blob poprzedza event, a zatwierdzony receipt i aktualizacja stanu poprzedzają admission wyniku. Model-facing odpowiedź to bounded digest albo BLOCK, nie pełny raw output.

Raw truth, derived memory, verified world state i assembled context nie są tym samym. Raw evidence dowodzi zaobserwowanych bajtów, nie prawdziwości każdej wypowiedzi narzędzia. Jest to transakcyjność stanu epistemicznego, nie atomowy rollback procesu, SQLite i Git.

## What it is not

LEDGER nie jest chatbotem, RAG systemem, vector-memory-only, własnym agent runtime'em, wrapperem na provider API ani nową pętlą inference. Sesja, reasoning i model/tool loop pozostają odpowiedzialnością hosta. Hot path LEDGER-a nie wywołuje LLM. MVP-0 nie dostarcza Context Atlas, Recovery Engine, persistent semantic memory ani Compounding Evaluator.

## Status MVP-0

**FACT — baseline lokalnej biblioteki zweryfikowany w CI main:** commit `0683f1dc006c37d9c05cb69e054e6bf4a5976a45`, 8 września 2026 r.; 93 testy w pięciu suitach, typecheck i wszystkie trzy scenariusze demo PASS. Źródło: [CI main, run 34231830068](https://github.com/korneliuszburian/tallystick/actions/runs/34231830068) oraz [release-baseline z granicami dowodu](docs/MVP-0-STATUS.md).

Ten wynik nie przenosi się automatycznie na nowszy HEAD ani na inne środowisko. Status konkretnego checkoutu wymaga jego własnych wyników.

### Uruchomienie

Zweryfikowany baseline CI: Ubuntu 24.04, Node 24.20.0, npm 11.19.0. Wymagany jest Git i lokalny storage; wymagania normatywne podaje SPEC R.0. Poniższe polecenia uruchamiaj w katalogu repozytorium:

```sh
npm ci
npm run test:acceptance
npm run demo
```

**FACT:** log baseline potwierdza literalne `npm ci`, wszystkie pięć suit w kolejności skryptu `test:acceptance` i literalne `npm run demo` uruchomione w teście E2E. CI nie wywołało osobno wrappera `npm run test:acceptance`; nie przedstawiamy tego jako dodatkowego wykonania.

`npm run demo` kompiluje `src/` i `scripts/` przez `tsc -p tsconfig.demo.json`, następnie uruchamia wyemitowany JavaScript w `.demo-dist/` zgodnie z ADR-018; nie wymaga nowego loadera ani zmiany specyfikatorów `.js` w źródłach.

Dodatkowy skrót `npm run verify` wykonuje `npm run test:acceptance && npm run demo`. Nie instaluje zależności i nie zastępuje oddzielnego `npx --no-install tsc --noEmit`. Jego obecność w `package.json` nie jest dowodem wykonania tego polecenia.

## Not production enforce yet

**TODO — laptop-only integration audit zgodny z SPEC S.6.** **BLOCKED — deklaracja production enforce / Codex-integrated do czasu zebrania dowodu z rzeczywistego hosta.** Zielona biblioteka i demo nie dowodzą podłączenia do Codexa/MCP.

Należy zmierzyć broker coverage wszystkich dozwolonych execution paths, guard przed spawn, raw-output admission boundary, model-facing bounded typed digest i brak native-tool bypass. Znany dozwolony bypass oznacza odmowę startu profilu enforce, nie observer mode (ADR-002).

Pełny plan pomiaru, evidence i kryteria PASS / FAIL / BLOCKED: [Laptop integration audit](docs/LAPTOP-INTEGRATION-AUDIT.md).

## Dokumentacja i źródła prawdy

[ SPEC.md ](SPEC.md) określa kontrakty i ADR; [AGENTS.md](AGENTS.md) określa reguły pracy. [ISSUES.md](ISSUES.md) jest historycznym podziałem etapów, nie bieżącą listą GitHub Issues. Aktualne refs, kod, PR, issues i CI w GitHub mają pierwszeństwo przed historycznymi opisami projektu.

Katalog [docs/](docs/) zawiera [MVP-0 status](docs/MVP-0-STATUS.md), [laptop audit](docs/LAPTOP-INTEGRATION-AUDIT.md) i [repository hygiene](docs/REPOSITORY-HYGIENE.md).
