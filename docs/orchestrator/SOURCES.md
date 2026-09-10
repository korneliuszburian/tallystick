# Orchestrator — źródła i status dowodów

> **Rola:** indeks źródeł dla deweloperskiego harnessu orchestratora
> **Status:** `DRAFT`; nie jest źródłem normatywnym
> **Zakres:** identyfikatory użyte w `DESIGN.md`; funkcja task queue Tallysticka jest poza zakresem
> **Źródła normatywne:** [SPEC](../../SPEC.md), [AGENTS](../../AGENTS.md)
> **Kiedy traci aktualność:** po zmianie hosta, SPEC albo zakresu harnessu.

Identyfikatory `R*` wskazują sekcje bieżącego repozytorium; `S*` wskazują wymagania/testy lub zewnętrzne materiały opisane w dokumentach. Ten indeks nie zamienia hipotezy w dowód działania.

| ID | Znaczenie | Źródło / status |
|---|---|---|
| R1 | Codex jako runtime, bez provider loop | `SPEC.md` cel i granica systemu — normatywne |
| R2 | Cztery moduły MVP-0 i brak LLM hot path | `SPEC.md` ADR-001 i ADR-005/sekcja modułów — normatywne |
| R3 | Granica middleware przed spawn | `SPEC.md` R.5, S.6 — normatywne; host enforce niezweryfikowany |
| R4 | Evidence przed admission | `SPEC.md` ADR-004, R.1/R.5 — normatywne |
| R5 | Statusy BLOCK/UNKNOWN/EXECUTED i receipt | `SPEC.md` R.5 oraz bieżące API `src/index.ts` — implementacja do weryfikacji |
| S1 | Katalog modeli i hosta | P0 `codex debug models`, `codex features list` — host evidence, exact child model UNKNOWN |
| S2 | Natywna delegacja Codexa | P0 host task identity — delegacja VERIFIED; izolacja child: FAIL (zmierzony brak read-only), model child: UNKNOWN |
| S3 | Limity dzieci i delegacji | Propozycja harnessu — prompt/organizational policy, nie host enforcement |
| S4 | Konto Pro i brak założenia o API quota | Raport P0 — OpenCode credential jest osobne; brak utożsamienia z Codex Pro |
| S5 | Koszt i benchmark | `DESIGN.md` §11 oraz plan P5 — NOT_RUN |
| S6 | Audyt ścieżki desktop | `docs/DESKTOP-INTEGRATION-AUDIT.md`, `SPEC.md` S.6 — P2 NOT_RUN/BLOCKED |
| S7 | Integracja App Server/MCP | `docs/DESKTOP-INTEGRATION-AUDIT.md` — wymaga odrębnego audytu |
| S8 | Hooki i fail-open | `docs/DESKTOP-INTEGRATION-AUDIT.md` — obserwacja, nie enforcement |
| S9 | Worktree/sandbox i sekrety | `AGENTS.md` oraz macierz bezpieczeństwa — child sandbox FAIL (zmierzony brak read-only); zakres modelu/coverage BLOCKED |
| S10 | Rejestr postępu | Kontrakt harnessu — NOT_IMPLEMENTED |
| S11 | Jedyny writer | Plan P3 — BLOCKED do czasu P2 |
| S12 | Zagrożenia komunikacji agentów | Materiał badawczy zapisany w `docs/RESEARCH.md` — kontekst, nie norma |
| S13 | Zagrożenia presji na wynik | Materiał badawczy zapisany w `docs/RESEARCH.md` — kontekst, nie norma |
| S14 | Benchmark wariantów | Plan P5 — NOT_RUN |
