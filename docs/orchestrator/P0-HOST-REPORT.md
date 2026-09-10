# P0 — raport operatora hosta

> **Rola:** zapis pomiaru możliwości hosta dla deweloperskiego harnessu
> **Status:** `PARTIAL`; nie jest dowodem S.6 ani enforce
> **Zakres:** host Codex/OpenCode i efektywne uprawnienia delegowanego childa na checkoutcie Tallysticka
> **Źródła:** terminalowy przebieg operatora 2026-09-10; komendy podane poniżej
> **Kiedy traci aktualność:** po zmianie hosta, konta, konfiguracji, repozytorium albo SHA.

## Identyfikacja

| Pole | Wynik |
|---|---|
| Repo SHA | `a0cc68b85b4b8c948ba81b5c218febea5160725f` podczas pomiaru; wynik odnosi się wyłącznie do hosta, nie do kodu |
| Codex | `codex-cli 0.154.0` |
| OpenCode | `1.18.22` |
| Node | `v26.2.0` |
| gh | `2.97.0` |
| Codex auth | `codex login status`: Logged in using ChatGPT; kategoria uwierzytelnienia, bez sekretu |

## Wyniki

- `codex debug models` reklamuje `gpt-6-astra`, `gpt-5.6-luna` i `gpt-5.6-sol`; to katalog hosta, nie atestacja wykonania inference.
- Delegacja parent→child jest potwierdzona tożsamością zadania hosta. Dokładny model wykonującego childa pozostaje `UNKNOWN`, bo dostępne metadane sesji go nie ujawniają.
- Efektywny kontekst delegowanego childa miał `filesystem unrestricted` i `approval_policy=never`. Repozytoryjne TOML z `sandbox_mode=read-only` nie stanowią na tym hoście egzekwowanej granicy: izolacja childa = `FAIL`.
- `codex features list` wykazało `multi_agent stable=true`, `multi_agent_v2 stable=false`, `goals stable=true`, `worktrees experimental=false`.
- OpenCode reklamuje osobne poświadczenie OpenCode Go i model `opencode-go/deepseek-flash`; nie jest to dowód użycia konta Codex Pro.

## Odtworzenie bez sekretów

```sh
codex --version
codex login status
codex debug models
codex features list
opencode --version
opencode providers list
opencode models opencode-go
git rev-parse HEAD
git status --short --branch
```

Nie wykonano instalacji, testów, push, merge, operacji zdalnych ani zapisu do repo podczas pomiaru. Próba utworzenia tymczasowego stderr została zachowana jako nieudana/nieusunięta artefaktowa ścieżka poza repo; nie zawiera danych uwierzytelniających.
