# AGENTS.md

## Kontekst projektu

LEDGER jest deterministyczną warstwą transaction/control plane otaczającą istniejący runtime Codexa. Codex pozostaje odpowiedzialny za sesję, reasoning, interakcję z modelem i execution loop. MVP-0 obejmuje dokładnie cztery moduły: Event Ledger, Acquisition Adapters, State Twin i Failure Antibody Gate. LEDGER nie jest wrapperem na model, „lepszym summarizerem”, rozwiązaniem RAG + vector DB ani drugim agentem orkiestrującym Codexa. Jego zadaniem jest utrwalanie odzyskiwalnego evidence, filtrowanie wyników przed admission, deterministyczna weryfikacja stanu i blokowanie równoważnych porażek przed uruchomieniem procesu.

## Źródło wymagań

Implementuj DOKŁADNIE `SPEC.md`.

`ISSUES.md` dzieli pracę na etapy, ale nie zastępuje specyfikacji.

Przed rozpoczęciem zadania przeczytaj:

1. ADR w `SPEC.md`.
2. Specyfikację danego modułu w sekcji R.
3. Odpowiadające testy akceptacyjne w sekcji S.
4. Zależności danego issue w `ISSUES.md`.

## Reguły pracy

- Nie zmieniaj architektury, publicznego API, nazw modułów ani nazw plików określonych w `SPEC.md`.
- Nie dodawaj piątego modułu.
- Nie implementuj provider adapters, bezpośredniego OpenAI/Anthropic HTTP loop, własnego model-serving stacku ani dodatkowego agenta.
- Nie wykonuj wywołań LLM w hot path czterech modułów.
- Nie dodawaj zależności spoza dopuszczonych w `SPEC.md`.
- Nie pomijaj edge case’ów wymienionych w specyfikacji.
- Nie zastępuj testów rzeczywistych procesów mockowanym LLM.
- Nie zamieniaj raw evidence na summary ani digest jako jedyną zachowaną kopię.
- Nie pozwalaj digestowi wrócić do modelu bez zatwierdzonego receipt.
- Nie pozwalaj na `spawn` bez poprawnego i niezużytego permit.
- Nie traktuj memory ani odpowiedzi modelu jako source of truth o repozytorium.
- Nie zmieniaj epoki eksperymentu przez zapis failure, test result, timestampu lub obserwacji.
- Nie ponawiaj automatycznie wykonania ze statusem `UNKNOWN`.
- Nie implementuj poza zakresem MVP-0 Context Atlas, pamięci semantycznej, utility promotion, dodatkowych czterech adapterów ani audytu integracji MCP.

## Sprzeczności i brak rozstrzygnięcia

Przy wewnętrznej sprzeczności `SPEC.md` ZATRZYMAJ SIĘ i zgłoś konflikt w PR zamiast decydować samodzielnie.

W zgłoszeniu wskaż:

- Sprzeczne fragmenty specyfikacji.
- Publiczne API lub invariant, którego dotyczy konflikt.
- Test-case, którego nie można jednoznacznie zaimplementować.

Nie naprawiaj sprzeczności przez ukrytą zmianę API, poluzowanie testu, dodatkową zależność lub obejście fail-closed.

Nie przedstawiaj niewykonanych testów jako zaliczonych.

## Zamrożona kolejność

```text
Event Ledger
→ Acquisition Adapters
→ State Twin
→ Failure Antibody Gate
→ integration E2E
```

Kolejny moduł rozpoczynaj dopiero po zielonych testach poprzedniego.

Nie zastępuj tej kolejności równoległym implementowaniem modułów zależnych od niedziałającej warstwy bazowej.

## Bramka ukończenia modułu

Moduł jest ukończony wyłącznie wtedy, gdy:

- Jego publiczne API jest zgodne z `SPEC.md`.
- Jego invariants są egzekwowane.
- Jego edge cases mają testy.
- Odpowiadające mu testy akceptacyjne sekcji S przechodzą.
- Testy wcześniejszych modułów nadal przechodzą.
- Nie ma pominiętych lub pozornie zaliczonych testów wymaganych specyfikacją.

Końcowa bramka całego MVP-0:

```sh
npm run test:ledger &&
npm run test:adapters &&
npm run test:state &&
npm run test:guards &&
npm run test:e2e
```

Dodatkowo wymagane są `tsc --noEmit` i wszystkie trzy scenariusze `scripts/demo.ts`.

Zielone testy lokalnej biblioteki nie uprawniają do deklarowania zaliczonego audytu integracji MCP.

## Konwencje commitów i PR

- Twórz atomowe commity per test-case.
- Opis zmiany stosuje format: `module: co i dlaczego`.
- W PR podaj powiązane issue, zmieniony test-case i wynik rzeczywiście wykonanych testów.
- Nie wykonuj push do `main`.
- Wszystkie zmiany integruj przez PR.
- Nie obchodź branch protection ani required check.
- Nie włączaj `continue-on-error`, nie pomijaj grup testów i nie zastępuj czerwonego wyniku sztucznym sukcesem.
