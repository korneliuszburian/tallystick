# Tallystick — zatrzymanie diagnostyczne SPEC

> **Rola:** raport konfliktu kontraktu
> **Status:** `NEEDS_DECISION`
> **Zakres:** audyt implementacji na `ddc81034add54bf47bf63b5a11e48ed1bd64d4d9`; middleware MVP-0 i składane przez niego kontrakty
> **Źródła:** [SPEC](../SPEC.md), [reguła STOP](../AGENTS.md#sprzeczności-i-brak-rozstrzygnięcia), [PR #25](https://github.com/korneliuszburian/tallystick/pull/25)
> **Kiedy ten dokument traci aktualność:** po normatywnym rozstrzygnięciu wszystkich poniższych punktów albo zmianie dotkniętych kontraktów SPEC.

Raport rejestruje dwa bezpośrednie konflikty i sąsiadujące luki kontraktu. Nie zmienia SPEC ani nie wybiera rozwiązania.

## Konflikt 1: kolejność proposal, preflight i commitu reservation

Centralny invariant w [celu systemu](../SPEC.md#cel-i-granica-systemu) wymaga:

> „Każda wykonana akcja ma uprzednio zatwierdzony zapis zamiaru […]”.

Algorytm [R.4 preflight](../SPEC.md#algorytm-preflight) umieszcza zapis decyzji i reservation wewnątrz `preflight()`:

> „create reservation with fencing token → append ALLOW event → COMMIT → return permit”

Pipeline [R.5](../SPEC.md#r5-cienkie-złożenie-w-srcindexts) określa natomiast kolejność:

> „→ preflight → commit intent i reservation → wykonanie z permit”

Ta sama reservation nie może być commitowana jednocześnie wewnątrz `preflight()` i w późniejszym kroku R.5. R.5 wymaga też trwałego `proposal_id` w receipt, lecz nie określa, czy zablokowana propozycja ma już event `tool_proposal`.

Dotknięte API i inwarianty:

- `FailureGate.preflight()` i atomowość ADR-015;
- zapis intent przed `spawn`;
- kolejność `tool_proposal` oraz `guard_decision`;
- cykl życia reservation i permit;
- `proposal_id` w receipt R.5.

Niejednoznaczne testy:

- `Third identical failure` i `Concurrent duplicate`: nie wiadomo, czy każdy BLOCK ma poprzedzający trwały proposal;
- `Crash after intent`: nie wiadomo, czy intent oznacza `tool_proposal`, reservation czy `ALLOW`;
- crash injection pomiędzy intent, reservation, decyzją i `spawn`.

Możliwe rozstrzygnięcia:

1. Zapisać `tool_proposal` przed `preflight`; zachować atomowy zapis reservation i `ALLOW` wewnątrz `preflight`; usunąć z R.5 późniejszy, duplikujący commit reservation.
2. Uczynić `preflight` czystym obliczeniem decyzji, a proposal, reservation i `ALLOW` zapisywać później atomowo. Wymaga to zmiany ADR-015 i R.4.
3. Zdefiniować krok R.5 „commit intent i reservation” jako opis skutków już wykonanych przez `preflight`, a osobno zamrozić moment i payload `tool_proposal` dla ALLOW i BLOCK.

## Konflikt 2: tożsamość receipt w ADR-010 i ADR-016

[ADR-010](../SPEC.md#adr-010--receipt_id-wskazuje-zatwierdzone-zdarzenie-evidence-w-ledgerze) obiecuje rozdzielenie identyfikatorów w R.5:

> „wtedy `receipt_id` wskaże nowe zdarzenie receipt, a `raw_event_id` pozostanie przy raw”.

[ADR-016](../SPEC.md#adr-016--kompozycja-middleware-zużycie-permit-klucz-i-obwoluta-receipt) określa inny kształt:

> „Receipt to obwoluta w pamięci zwracana z intercept() […] Nie powstaje nowy rodzaj zdarzenia.”

ADR-016 odwołuje się przy tym do ADR-010, ale go jawnie nie zastępuje. `EventRecord.kind` nie definiuje rodzaju `receipt`, a SPEC nie wskazuje innego rodzaju eventu, jego payloadu ani momentu commitu. Nie wiadomo więc, jak po R.5 i reopen spełnić obietnicę osobnego `receipt_id`.

Dotknięte API i inwarianty:

- `DigestMeta.receipt_id` i `raw_event_id`;
- Evidence Receipt zwracany przez middleware;
- admission dopiero po zatwierdzonym evidence zgodnie z ADR-004;
- możliwość odtworzenia receipt po reopen.

Niejednoznaczne testy:

- `Missing blob`: nie określa, do którego eventu rozwiązuje się `receipt_id`;
- `zero false success receipts`: nie określa trwałej reprezentacji poprawnego receipt;
- reopen storage: nie określa sposobu rekonstrukcji obwoluty.

Możliwe rozstrzygnięcia:

1. Dodać jawny rodzaj eventu `receipt` oraz zamrozić jego payload i moment zapisu.
2. Użyć istniejącego rodzaju eventu oraz jawnie zdefiniować jego payload i relację z raw eventem.
3. Zachować Receipt wyłącznie w pamięci i `receipt_id === raw_event_id`, usuwając z ADR-010/R.2 obietnicę późniejszego rozdzielenia.

## Luki kontraktu wymagające decyzji przed naprawą

| Szew kontraktu | Brakujące rozstrzygnięcie | Testy dotknięte |
|---|---|---|
| Revalidation stanu | Kto zapisuje contradiction/freshness, gdy standalone `revalidateMemory()` pozostaje czyste, oraz jak epoch zachowuje zdolność pomiaru po reopen. | File mutation staleness; reopen |
| Projekcje Gate | Autorytatywne payloady eventów, reducer i jego wersja, moment odbudowy oraz reconciliation failures, reservations i consumed proofs. | Restart gate; replayed proof; reopen storage |
| Lease worktree | Właściciel, reentrancy, lifetime od pomiaru wejścia do wyjścia, expiry/recovery i walidacja fencing. | Concurrent duplicate; broker crash |
| Epoki digestów | Czy `tested_epoch` i `compiled_epoch` oznaczają request-specific precondition epoch, pełną world epoch czy osobny fingerprint wejść execution. | Adapter digests; test-result self-invalidation |
| Rodzice eventów | Jak niepuste `parent_event_ids` trafiają do `append`, storage i `event_hash`, albo czy pole wypada z MVP-0. | Reopen durability; receipt lineage |
| Reconciliation UNKNOWN | Rozdzielenie pre-spawn rejection i post-spawn uncertainty, authority/API reconciliation, payloady eventów i przejścia reservation. | Crash after intent; zero retry after UNKNOWN |
| Escape proof w kompozycji | Jak opaque proof trafia do `intercept()` bez ujawnienia signing key albo czy proof pozostaje poza R.5 MVP-0. | Escape proof; replayed proof; E2E |

Kod zależny od tych punktów pozostaje zatrzymany do czasu normatywnego rozstrzygnięcia w SPEC. Dla tego dokumentacyjnego raportu nie uruchomiono testów; odczyt kodu i testów nie jest wynikiem PASS.
