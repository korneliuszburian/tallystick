# Repository hygiene

## FACT — źródła prawdy

`main` jest canonical source kodu. [SPEC.md](../SPEC.md) określa kontrakty i ADR, [AGENTS.md](../AGENTS.md) reguły pracy, a aktualny GitHub stan refs, PR, issues i CI. [ISSUES.md](../ISSUES.md) jest historycznym planem etapów, nie aktualnym trackerem. [Release-baseline](MVP-0-STATUS.md) jest dowodem dla określonego SHA, nie dla dowolnego przyszłego main.

Audyt 2026-09-08 wykazał brak otwartych PR i issues przed porządkowym PR, `protected: false` dla main, wyłączone auto-merge i `delete_branch_on_merge: false`. Są to obserwacje z chwili audytu, nie deklaracja obecnych ustawień po kolejnych zmianach. Ten PR nie zmienia ustawień repo.

## TODO — utrzymanie gałęzi i PR

Jedna aktywna gałąź na aktywny PR, domyślnie z aktualnego main. Nie zostawiaj stacked ani porzuconych branchy po merge. Przed każdym zapisem przedstaw plan plików i uzyskaj zgodę właściciela; utrzymuj zatwierdzony zakres.

Po merge sprawdź powiązane obiekty: zamknij superseded PR, zamknij linked issue dopiero po potwierdzeniu kryteriów (sprawdź również działanie closing keywords), następnie usuń head branch. Autor nie wykonuje merge'u. Nie obchodź required checks i nie włączaj auto-merge w celu ukrycia czerwonego wyniku.

Przed usunięciem porównaj aktualny head SHA z aktualnym main. `ahead_by=0` i status `behind`/`identical` potwierdzają zawarcie historii. Zamknięty PR, podobne pliki lub squash merge same w sobie nie dowodzą zawarcia wszystkich commitów. Każda gałąź rozbieżna wymaga osobnego przeglądu; żadnego force-delete na podstawie nazwy lub historycznego opisu.

## FACT / TODO — lista porządkowa z audytu

Dla main `0683f1dc006c37d9c05cb69e054e6bf4a5976a45` poniższe heads miały `ahead_by=0` i były w pełni zawarte w main. **Nie jest to zapis ich usunięcia.** Nowy commit na gałęzi wymaga nowego porównania.

| Gałąź | Sprawdzony HEAD | Podstawa |
|---|---|---|
| `bootstrap-ledger` | `74a937a5bc68fe1fd2ca6e752fdb9668adddd338` | W pełni zawarta w main. |
| `ledger/issue-2-spec-conflict-capture` | `d534c2f97ddaec4a9a1178a56ebc3c1b18b9d3e2` | W pełni zawarta w main. |
| `codex/handle-environment-setup-for-event-ledger` | `4869d74dcb0754d7f0eb2ea0c1b134f15323ae8f` | W pełni zawarta w main. |
| `codex/implement-acquisition-adapters` | `113cd727c28647a1a6f601d510b4c30c9e38cba9` | W pełni zawarta w main. |
| `codex/implement-state-twin` | `1afea8e3abdbc5a0c6640d6a063f9e0ff18b33ec` | W pełni zawarta w main. |
| `codex/implement-failure-antibody-gate` | `a793a4a2f477f9066d8cf127b90ab3d572cdc4eb` | W pełni zawarta w main. |
| `codex/issue-6-e2e-chaos` | `5756e8283f0c7ec8d9115a00145663f06061bdcd` | W pełni zawarta w main. |

`codex/implement-event-ledger-according-to-adr-007` (`0acd2177030a16fd7f80fb5988dbacf42538b87d`, PR #15) miała **2 unikalne commity i 58 commitów opóźnienia**: nie jest w grupie bezpiecznych usunięć. PR #15 zamknięto bez merge; późniejszy PR #16 dostarczył implementację, ale nie dowodzi to zawarcia dwóch unikalnych commitów.

**BLOCKED — automatyczne usuwanie w tej sesji:** connector udostępnia zapis plików i PR, lecz nie operację usuwania gałęzi. Ścieżka ręczna: **GitHub mobile → repo → Branches → Delete**; dostępność konkretnego widoku należy sprawdzić w używanej aplikacji/przeglądarce. Usuwaj wyłącznie aktualnie potwierdzone heads po zgodzie właściciela.

**TODO — ustawienie właściciela:** włącz w repo **Automatically delete head branches**. Nie zostało to wykonane przez porządkowy PR. Branch protection i auto-merge włączaj dopiero po potwierdzeniu stabilnych wymaganych checków dla aktualnego pipeline; pojedynczy zielony run nie jest automatyczną zgodą na zmianę ustawień.

## Typy PR

| Typ | Zakres i warunek oceny |
|---|---|
| Dokumentacyjny / porządkowy | Opis istniejących kontraktów i evidence; brak nowych funkcji i niezatwierdzonych zmian API/ADR; ewentualny convenience script musi być jawnie w zakresie. |
| Implementacyjny | Konkretny issue i zatwierdzony kontrakt SPEC; rzeczywiste testy danego etapu oraz regresji; brak rozszerzenia zakresu. |
| Diagnostic STOP | Cytaty sprzecznych wymagań, dotknięty invariant/API i minimalny test-case; nie deklaruje ukończenia implementacji i nie obchodzi konfliktu. |

Korzystaj z [szablonu PR](../.github/pull_request_template.md). **FACT** opisuje obserwację z dowodem, **TODO** niewykonaną pracę, a **BLOCKED** brak możliwości sprawdzenia. Nie zamieniaj czerwonego testu w BLOCKED ani niewykonanego testu w PASS.
