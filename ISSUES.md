# ISSUES.md

## Kolejność

```text
#1 Event Ledger
→ #2 Acquisition adapters
→ #3 State Twin
→ #4 Failure Antibody Gate
→ #5 E2E + chaos
```

Numery określają kolejność pięciu issues. Wszystkie odwołania do kryteriów dotyczą `SPEC.md`, sekcji S.

## Issue #1

### Tytuł

Event Ledger: append-only events, CAS, blob integrity i reopen

### Etykieta

`module:ledger`

### Zależność od poprzedniego issue

Brak — #1 jest pierwszym issue i rozpoczyna zamrożoną sekwencję implementacji.

### Cel

Zaimplementować Event Ledger zgodnie z `SPEC.md`, sekcją R.1, jako trwałe źródło eventów i raw evidence dla kolejnych modułów.

### Zakres

- Struktura jednego pakietu npm określona w `SPEC.md`.
- Konfiguracja środowiska i skryptów wymagana do uruchomienia testów.
- Publiczne API `EventLedger` i `openLedger`.
- SQLite przez `better-sqlite3`.
- Sprawdzenie SQLite >=3.51.3.
- WAL, `synchronous=FULL`, foreign keys i busy timeout.
- Tabele `events`, `blobs` i `event_blobs`.
- Triggery blokujące UPDATE i DELETE eventów oraz referencji źródłowych.
- Stabilne event IDs i obsługa duplicate delivery.
- Content-addressable blob storage.
- Content hashes, source timestamps i raw integrity.
- Publikacja blobu przed eventem wskazującym go.
- Reopen durability.
- Binary round-trip.
- Orphan detection.
- Incomplete capture i limit raw output.
- Wszystkie edge cases R.1.

Nie rozpoczynać implementacji Acquisition Adapters przed zielonymi testami Event Ledger.

### Kryteria akceptacji — kopia z sekcji S

| Test | Asercja |
|---|---|
| Append-only ledger | UPDATE i DELETE eventu kończą się błędem storage |
| Stable event ID | Powtórne dostarczenie tego samego eventu nie tworzy nowego |
| Conflicting duplicate | Ten sam event ID z innym payloadem zostaje odrzucony |
| Raw blob integrity | Odczytane bajty i SHA-256 są identyczne z wejściem |

### Bramka

```sh
npm run test:ledger
```

## Issue #2

### Tytuł

Acquisition adapters: shell, test-runner, compiler i git-diff z digestem ≤4096 B

### Etykieta

`module:adapters`

### Zależność od poprzedniego issue

Zależy od #1. Pracę rozpocząć dopiero po zielonych testach Event Ledger.

### Cel

Zaimplementować dokładnie cztery acquisition adapters zgodnie z `SPEC.md`, sekcją R.2, tak aby raw był archiwizowany, a context-facing wynik zawierał wyłącznie bounded typed digest.

### Zakres

- Publiczne API `AcquisitionAdapters` i `createAdapters`.
- `ExecutionRequest`, `ExecutionPermit`, `AcquisitionResult` i `TypedDigest`.
- Dokładnie adaptery `shell`, `test-runner`, `compiler` i `git-diff`.
- Wszystkie wymagane pola digestów.
- Weryfikacja i zużycie permit przed `spawn`.
- Domyślne `shell: false`.
- Raw capture przez Event Ledger.
- Ograniczenie serializowanego digestu do 4096 bajtów UTF-8.
- Jawne completeness flags, parser status i source handles.
- Rzeczywiste fixtures shell, Vitest, `tsc` i `git diff`.
- Manifest pochodzenia każdego fixture.
- Zachowanie raw evidence bez normalizacyjnej podmiany bajtów.
- Obsługa malformed outputs, multiline diagnostics, sygnałów, timeoutów, binary diffs i nazw plików z whitespace.
- Wszystkie edge cases R.2.

Nie implementować adapterów file read, directory listing, search ani HTML.

Nie rozpoczynać State Twin przed zielonymi testami adapterów.

### Kryteria akceptacji — kopia z sekcji S

| Test | Asercja |
|---|---|
| Shell digest | Exit code, byte counts i wskazanie błędu zgodne z real fixture |
| Test-runner digest | Liczniki i failed test IDs zgodne z maszynowym raportem |
| Compiler digest | Kod, plik, linia i raw handle wskazują rzeczywisty błąd `tsc` |
| Git diff digest | Poprawne rename, binary files i nazwy z whitespace |
| 100 KB log | Raw ≥100 KiB zachowany; digest ≤4096 B |

### Bramka

```sh
npm run test:ledger &&
npm run test:adapters
```

## Issue #3

### Tytuł

State Twin: epoch determinism, dependency revalidation i stale memory

### Etykieta

`module:state`

### Zależność od poprzedniego issue

Zależy od #2. Pracę rozpocząć dopiero po zielonych testach Event Ledger i Acquisition Adapters.

### Cel

Zaimplementować deterministyczny State Twin zgodnie z `SPEC.md`, sekcją R.3, bez traktowania memory lub odpowiedzi modelu jako source of truth.

### Zakres

- Publiczne API `StateTwin`.
- `StateInput` i `StateEpoch`.
- `computeStateEpoch()`.
- `epochFor()`.
- `revalidateMemory(memory, epoch) → active | stale`.
- Per-file content hashes.
- Git HEAD.
- Dirty tree hash oparty na rzeczywistych wejściach, nie tekście `git status`.
- Environment fingerprint.
- Test fingerprint i atestacje dla odpowiednich epok wejściowych.
- Oddzielenie `epoch_id` od `state_revision_id`.
- Wykluczenie timestampów, liczby eventów i zapisów failure z epoki eksperymentu.
- Tabela `state_observations`.
- Obsługa brakujących plików, symlinków, submodules, mode changes i zmian środowiska.
- Wszystkie edge cases R.3.

Nie implementować pamięci semantycznej ani utility promotion.

Nie rozpoczynać Failure Antibody Gate przed zielonymi testami State Twin.

### Kryteria akceptacji — kopia z sekcji S

| Test | Asercja |
|---|---|
| State epoch determinism | Te same wejścia przy innym czasie pomiaru dają ten sam `epoch_id` |
| File mutation staleness | Memory active w E1 staje się stale po zmianie zależnego pliku |
| Test-result self-invalidation | Sam zapis nowego wyniku nie zmienia precondition epoch |

### Bramka

```sh
npm run test:ledger &&
npm run test:adapters &&
npm run test:state
```

## Issue #4

### Tytuł

Failure Antibody Gate: fingerprint, preflight, reservations i escape proof

### Etykieta

`module:guards`

### Zależność od poprzedniego issue

Zależy od #3. Pracę rozpocząć dopiero po zielonych testach State Twin i wcześniejszych modułów.

### Cel

Zaimplementować Failure Antibody Gate zgodnie z `SPEC.md`, sekcją R.4, tak aby znana równoważna porażka w niezmienionych preconditions była blokowana przed `spawn`.

### Zakres

- Publiczne API `FailureGate`.
- `FailureRecord`, `EscapeProof` i `PreflightResult`.
- Deterministyczny `fingerprint()`.
- Kanonizacja JSON z zachowaniem kolejności tablic i `argv`.
- `action_key` wyliczany przed wykonaniem.
- Lookup zapisanych failure signatures zamiast przewidywania przyszłego błędu.
- Deterministyczny `preflight()`.
- Tabele `failures`, `reservations` i `consumed_escape_proofs`.
- Atomowe reservation i fencing token.
- Runtime verification oraz jednokrotne zużycie permit.
- Powód BLOCK i reference do previous failure.
- Walidacja podpisu, świeżości, scope i source events escape proof.
- Odrzucenie replayed proof.
- Maksymalnie jeden autoryzowany retry bez zmiany preconditions w failure lineage.
- Brak automatycznych retry po `UNKNOWN`.
- Wszystkie edge cases R.4.

Nie zastępować gate decyzją modelu ani kontrolą wykonaną po `spawn`.

Nie rozpoczynać etapu E2E przed zielonymi testami Gate.

### Kryteria akceptacji — kopia z sekcji S

| Test | Asercja |
|---|---|
| Failure fingerprint determinism | Różna kolejność kluczy JSON nie zmienia fingerprintu |
| Argument order preservation | Zmiana kolejności `argv` zmienia fingerprint |
| Third identical failure | Trzecia propozycja BLOCK przed spawn |
| Changed state | Zmiana relevant file hash pozwala na nowy eksperyment |
| Irrelevant state change | Zmiana pliku poza dependency set nie odblokowuje failure |
| Escape proof | Ważny proof pozwala na jeden retry |
| Replayed proof | Ponowne użycie tego samego proof zostaje odrzucone |

### Bramka

```sh
npm run test:ledger &&
npm run test:adapters &&
npm run test:state &&
npm run test:guards
```

## Issue #5

### Tytuł

E2E + chaos: crash injection, concurrent duplicates, 100 KB log i demo

### Etykieta

`type:e2e`

### Zależność od poprzedniego issue

Zależy od #4. Pracę rozpocząć dopiero po zielonych testach wszystkich czterech modułów.

### Cel

Połączyć cztery moduły przez cienkie middleware w `src/index.ts` i zweryfikować deterministyczne scenariusze końcowe oraz zachowanie przy awariach.

### Zakres

- Cienka kompozycja `createLedgerMiddleware`, bez piątego modułu.
- Pełna ścieżka proposal → preflight → execution → raw archive → digest → state update.
- Evidence Receipt jako warunek admission.
- `scripts/demo.ts` zgodny z `SPEC.md`, sekcją S.4.
- Trzy scenariusze demo: tool loop, stale memory i 100 KB log.
- Crash injection na granicach intent, spawn, capture, blob seal i commit.
- Kill brokera i procesu potomnego.
- Disk-full.
- Duplicate concurrent proposals.
- Reopen storage.
- Niekompletny capture, osierocone bloby i missing blob.
- `execution_status=UNKNOWN` po nierozstrzygniętym wykonaniu.
- Zero automatycznych retry nieznanych efektów.
- Sekwencyjne skrypty npm z `&&`.
- TypeScript `tsc --noEmit`.
- Pełna końcowa bramka MVP-0.

Audyt integracji MCP z rzeczywistym Codexem pozostaje poza zakresem tego issue i MVP-0.

### Kryteria akceptacji — kopia z sekcji S

| Test | Asercja |
|---|---|
| Raw blob integrity | Odczytane bajty i SHA-256 są identyczne z wejściem |
| File mutation staleness | Memory active w E1 staje się stale po zmianie zależnego pliku |
| Third identical failure | Trzecia propozycja BLOCK przed spawn |
| 100 KB log | Raw ≥100 KiB zachowany; digest ≤4096 B |
| Concurrent duplicate | Dwa równoległe requests nie obchodzą reservation gate |
| Crash after intent | Po restarcie brak automatycznego retry `UNKNOWN` |
| Missing blob | Digest nie zostaje admitted |

### Asercje demo — kopia z sekcji S

**Scenariusz 1 — tool loop**

```text
pierwsza próba → EXECUTED
druga próba → BLOCK
trzecia próba → BLOCK
previousFailureId istnieje
liczba wykonanych procesów dla równoważnego requestu = 1
```

**Scenariusz 2 — stale memory**

```text
memory w E1 → active
mutacja pliku
computeStateEpoch() → E2
E1.epoch_id != E2.epoch_id
revalidateMemory(memory, E2) → stale
```

**Scenariusz 3 — 100 KB log**

```text
raw output = 100 * 1024 bajty
pełny output odzyskiwalny z blob storage
digest ≤4096 bajtów UTF-8
context-facing result nie zawiera pełnego raw outputu
```

### Bramka

```sh
npm run test:ledger &&
npm run test:adapters &&
npm run test:state &&
npm run test:guards &&
npm run test:e2e
```

Dodatkowo wymagane są `tsc --noEmit` i zakończenie wszystkich trzech scenariuszy demo bez nieudanej asercji.
