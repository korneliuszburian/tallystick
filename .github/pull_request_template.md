## Issue / ADR

Powiązane issue, obowiązujące ADR i sekcje SPEC:

Typ PR: dokumentacyjny / implementacyjny / diagnostic STOP.

## Zakres

Zatwierdzony plan plików i źródło zgody właściciela:

Co zmieniono i dlaczego; czego zakres nie obejmuje:

## Invariants

Które invariants dotyczą zmiany i jak są zachowane:

## Rzeczywiście wykonane komendy i wyniki

FACT = potwierdzone obserwacją; TODO = niewykonane; BLOCKED = brak możliwości sprawdzenia. FAIL pozostaje FAIL. Nie zaznaczaj PASS na podstawie planu, kodu testu lub cudzej deklaracji.

| Komenda / kontrola | SHA i środowisko | Rzeczywisty wynik / exit code | Evidence |
|---|---|---|---|
| Do uzupełnienia | | TODO — nie wykonano | |

## CI link / status

Link do run/checka, testowany SHA, push/PR merge ref, czas odczytu i wynik. Historyczny baseline nie jest wynikiem obecnego HEAD.

## Celowo niewykonane rzeczy

TODO / BLOCKED, uzasadnienie i brakujące evidence:

## SPEC CONFLICT

Tak / nie. Jeżeli tak: link, dokładne cytaty sprzecznych fragmentów, dotknięty invariant/publiczne API i test-case wymagający rozstrzygnięcia. Diagnostic STOP nie upoważnia do samodzielnej zmiany kontraktu.

## Checklist

- [ ] No fake green — wyniki mają rzeczywisty dowód; niewykonane lub pominięte testy nie są PASS.
- [ ] No weakened assertions — nie osłabiono asercji ani bramki, aby uzyskać sukces.
- [ ] No unapproved API changes — brak niezatwierdzonych zmian API, SPEC i ADR.
- [ ] No merge by author — autor nie wykonuje merge'u.
