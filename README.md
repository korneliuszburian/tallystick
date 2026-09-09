# Tallystick

**Kontrolowane działania. Odzyskiwalne dowody. Jawne granice wiedzy.**

Transaction/control plane wokół runtime’u Codexa. Cztery moduły MVP-0 łączą trwały zapis obserwacji, deterministyczne digesty, pomiar stanu i kontrolę powtórek. Codex zachowuje sesję i pętlę model–narzędzia. [Granica systemu →](SPEC.md#cel-i-granica-systemu)

[Kontrakty](SPEC.md) · [Dlaczego ta architektura](docs/ARCHITECTURE.md) · [Dowody MVP-0](docs/MVP-0-STATUS.md) · [Audyt integracji](docs/LAPTOP-INTEGRATION-AUDIT.md) · [Research](docs/RESEARCH.md)

---

## Status bez skrótów

| Warstwa | Gdzie sprawdzić stan |
|---|---|
| **Lokalna biblioteka MVP-0** | [Baseline: SHA, CI, wyniki i ograniczenia](docs/MVP-0-STATUS.md). Wynik dotyczy wskazanego wykonania, nie dowolnego HEAD. |
| **Rzeczywisty host** | [Rejestr audytu i raportów operatora](docs/AUDIT-REGISTER.md). Pomiary poszczególnych scenariuszy nie są PASS całego S.6. |
| **Docelowa pamięć i kontekst** | [Granica designu i MVP-0](docs/ARCHITECTURE.md#design-docelowy-a-mvp-0). Obecność w designie nie oznacza implementacji. |

> **Enforce pozostaje niedopuszczony bez dowodu całego profilu.** Kryteria oceny są w [S.6](SPEC.md#s6-dodatkowa-bramka-wdrożenia--poza-mvp-0); otwarty proces pomiarowy prowadzi [issue #22](https://github.com/korneliuszburian/tallystick/issues/22).

## Mapa rdzenia

| Moduł | Kontrakt | Kod |
|---|---|---|
| Event Ledger | [R.1 — trwałe źródła](SPEC.md#r1-event-ledger) | [src/ledger/](src/ledger/) |
| Acquisition Adapters | [R.2 — kontrolowane obserwacje](SPEC.md#r2-acquisition-adapters) | [src/adapters/](src/adapters/) |
| State Twin | [R.3 — pomiary i zależności](SPEC.md#r3-state-twin) | [src/state/](src/state/) |
| Failure Antibody Gate | [R.4 — dopuszczenie powtórek](SPEC.md#r4-failure-antibody-gate) | [src/guards/](src/guards/) |

Kompozycja: [R.5](SPEC.md#r5-cienkie-złożenie-w-srcindexts) · [src/index.ts](src/index.ts). Nie jest piątym modułem.

## Od czego zacząć

| Cel | Właściwe miejsce |
|---|---|
| Uruchomić lokalną weryfikację | [Setup, komendy i zapis evidence](docs/LAPTOP-INTEGRATION-AUDIT.md#2-setup-lokalny--todo); definicje skryptów w [package.json](package.json). |
| Zrozumieć decyzje i odrzucone alternatywy | [Motywacje, kill-round i indeks ADR](docs/ARCHITECTURE.md). |
| Sprawdzić ryzyka zamiast liczyć zielone testy | [Rejestr A01–A24 i mapowanie F01–F15](docs/AUDIT-REGISTER.md). |
| Przygotować eksperyment, nie nowy moduł | [Pytania DR-01–DR-20 i źródła](docs/RESEARCH.md). |
| Wprowadzić zmianę | [AGENTS.md](AGENTS.md) i [szablon PR](.github/pull_request_template.md). |
| Odczytać dawny podział pracy | [Historyczna mapa etapów](ISSUES.md), nie aktualny tracker. |
| Uporządkować gałąź po merge | [Checklista operacyjna](docs/REPOSITORY-HYGIENE.md). |

## Nazwa i źródła prawdy

**Tallystick** to nazwa produktu, `tallystick` — nazwa repozytorium. **LEDGER** jest historyczną nazwą tego samego designu, zachowaną w SPEC, źródłach i identyfikatorach technicznych. Nie oznacza drugiego produktu. [Zasada nazewnictwa →](AGENTS.md#nazewnictwo)

Kontrakty i ADR mają jedno miejsce: [SPEC.md](SPEC.md). Reguły pracy i format dokumentacji: [AGENTS.md](AGENTS.md). Aktualny kod, refs, PR i CI sprawdzamy w repozytorium; dokumentacja wskazuje dowody, nie zastępuje ich.

---

**Rola:** mapa. **Kiedy ten dokument traci aktualność:** po zmianie granicy produktu, struktury repo lub wskazanych źródeł; statusy wykonania zawsze wymagają własnego SHA i evidence.
