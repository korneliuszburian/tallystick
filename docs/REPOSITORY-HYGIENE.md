# Tallystick — porządek gałęzi po merge

[Start](../README.md) · [Kontrakty](../SPEC.md) · [Reguły pracy](../AGENTS.md)

> **Rola:** kryterium operacyjne · **Status:** CHECKLISTA  
> **Zakres:** pojedynczy zatwierdzony merge  
> **Źródła:** [AGENTS — porządek gałęzi](../AGENTS.md#porządek-gałęzi-po-merge)  
> **Kiedy ten dokument traci aktualność:** po zmianie procedury w AGENTS lub któregokolwiek porównywanego ref; stary wynik nie uprawnia do nowego usunięcia.

## Cel

Zapisać wykonanie kontroli po merge. Reguły dopuszczenia operacji są wyłącznie w [AGENTS.md](../AGENTS.md#porządek-gałęzi-po-merge).

## Kontrole

- [ ] Zapisano PR, merge commit i aktualne SHA `main` oraz head branch.
- [ ] Sprawdzono linked issues, closing keywords i superseded PR; zapisano wykonane czynności albo powód pozostawienia obiektu otwartego.
- [ ] Zapisano wynik porównania gałęzi oraz decyzję zgodną z regułą w AGENTS.
- [ ] Zapisano zgodę właściciela i rezultat operacji na gałęzi albo konkretny BLOCKED.

| PR / gałąź | SHA main / head | Dowód porównania | Zgoda i czynność | Wynik |
|---|---|---|---|---|
| PR #27/#28 · `chore/repository-hygiene`, `ci/strict-acceptance-gates` | `main=1f22a36`, heady `8508e9d` / `37234a9` | Oba heady scalone exact-head; zamknięte, zastąpione refy #15/#24 usunięte po porównaniu | Zgoda właściciela; usunięto zdalne i lokalne gałęzie bez aktywnego worktree | WYKONANO |

## Dowody historyczne

Tabela heads, wyjątek PR #15 i obserwacje ustawień z 8 września 2026 są w [baseline](MVP-0-STATUS.md#historyczny-audyt-porządku-repo). Nie są aktualną listą gałęzi do usunięcia. Bieżący odczyt po operacji: `origin/main=f8a504e`, jeden worktree, brak dodatkowych refów; `delete_branch_on_merge=true`, ochrona `main` wymaga `ledger-acceptance` i obejmuje administratorów.
