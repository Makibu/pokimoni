# Raport z testów

Stan na 2026-11-05, gałąź `phase-9`, Windows 11, Node 22.14. Wszystkie wyniki poniżej pochodzą z poleceń faktycznie uruchomionych tego dnia na końcowym kodzie. CI na GitHubie tego kodu jeszcze nie widziało, bo nic nie zostało wypchnięte. Ostatni zielony przebieg CI dotyczy `264c861` z fazy 8.

## Wyniki

| Polecenie | Wynik |
|---|---|
| `npm run format:check` | przechodzi |
| `npm run lint` | przechodzi |
| `npm run typecheck` | przechodzi |
| `npm test` | **523 z 523**, 25 plików: 260 jednostkowych, 263 integracyjne |
| `npx drizzle-kit generate` | brak zmian w schemacie |
| `npm run build` | przechodzi |
| `npx playwright test` | **107 zaliczonych, 3 pominięte, 0 błędów**, 110 scenariuszy na dwóch projektach |
| `npm audit --omit=dev` | 0 podatności |
| `npm audit` | 12 moderate, tylko narzędzia deweloperskie (FIN-09) |
| `measure` | wyniki w `FINAL_REPORT.md` |
| `responsive-screens` | 4 z 4, bez poziomego przewijania przy 360, 768, 1280, 1920 px |
| `prod-smoke-quality` | wszystkie sprawdzenia przechodzą na produkcji `264c861` |

Trzy pominięte scenariusze są celowe i dotyczą projektu `mobile`: test gier przy 360 px sam ustawia szerokość, a dwa testy axe w grach sprawdzają ten sam kod co na desktopie.

## Rodzaje testów

| Rodzaj | Gdzie | Co sprawdza |
|---|---|---|
| Jednostkowe | `tests/unit` | reguły gry: rozkład rzadkości na 100 000 paczkach, doba gry i zmiana czasu, seria, skarbonka, limit 9, zadania, trzy minigry, symulacja ekonomii, połączenie z bazą, obrazki minigry |
| Integracyjne | `tests/integration` | serwisy na PGlite z prawdziwymi migracjami: transakcje, wymiany, escrow, osiągnięcia, zadania |
| API | `tests/integration/*-api.test.ts` | trasy: 401, walidacja, CSRF, limity, kształt błędów |
| E2E | `tests/e2e` | Playwright na buildzie produkcyjnym i PGlite, desktop oraz Pixel 7 |
| Regresji | E2E, m.in. `lazy-dialogs.spec.ts` | błędy zgłoszone wcześniej, np. migające okno paczki |
| Bezpieczeństwa | `security.spec.ts`, `account.spec.ts`, testy API | nagłówki, CSP podczas gry, podrobione ciasteczko, unieważnienie sesji, próby oszustwa w grach. **Bez testów destrukcyjnych i bez testów penetracyjnych** |
| Wydajności | `tests/perf/measure.spec.ts` | rozmiar JS i czasy przy ograniczonym łączu, pomiar lokalny |
| Responsywności | `tests/perf/responsive-screens.spec.ts`, E2E 360 px | poziome przewijanie, rozmiar celów dotykowych |
| Dostępności | axe w `a11y.spec.ts`, `daily.spec.ts`, `social.spec.ts` | automatycznie, w obu motywach |
| Danych produkcyjnych | skrypt tylko do odczytu, poza repo | niezmienniki w `READ ONLY`, wypisywane tylko liczby |

## Testy dodane w fazie 9

- Limit prób hasła: blokada po 10 błędach także dla poprawnego hasła i dla usuwania konta, zerowanie po poprawnym haśle.
- Limit feedbacku: po 10 wiadomościach odmowa 429, w bazie zostaje 10 wierszy.
- `Origin: null` daje 403, a nie 500.
- Logi błędów: parametry zapytania i treść wiersza nie trafiają do logu, inne błędy są logowane w całości, klient nie widzi szczegółów.

## Niestabilny test

Test „the whole ritual works from the keyboard” (mobile) czasem nie przechodził. W fazie 8 przyczyny nie ustaliłem.

- **Odtworzenie:** 1 błąd na 27 testów, potem 1 na 36. Pojedyncze uruchomienie tego testu 15 razy przeszło, potrzebne było obciążenie.
- **Przyczyna:** błąd testu, nie gry. Test naciskał klawisz, gdy karta była jeszcze zakryta, a pierwsze naciśnięcie na zakrytej karcie celowo tylko ją odwraca. Stan strony w chwili błędu potwierdza to: „Karta 5 z 5” z odsłoniętą kartą, zamiast podsumowania.
- **Poprawka:** test czeka na odsłonięcie karty przed każdym klawiszem.
- **Weryfikacja:** 6 przebiegów po 36 testów (216 uruchomień) bez błędu, potem pełne E2E bez błędu.

## Czego testy nie obejmują

| Luka | Skutek | Patrz |
|---|---|---|
| Równoległe połączenia na prawdziwym Postgresie | testy wyścigów działają sekwencyjnie na PGlite | FIN-01 |
| `sharp` na Vercelu | obrazki „Kto to Pokémon?” niesprawdzone na produkcji | FIN-02 |
| Znajomi i wymiany na prawdziwej bazie | cały cykl sprawdzony tylko na PGlite; baza 2026-11-05 nie ma żadnego zaproszenia ani wymiany | FIN-03 |
| Zalogowane strony na produkcji w testach automatycznych | nie zakładam kont; właściciel napisał 2026-11-05 „Wszystko przetestowane i działa”, bez podania zakresu | |
| Fizyczny telefon, czytnik ekranu | tylko emulacja i axe | FIN-11 |
| Podgląd linku w komunikatorze | sprawdzone same metadane i obrazek | |
| Testy obciążeniowe | nie uruchamiane, mała skala | |
| Prawdziwy koszt wzrostu danych | na produkcji jest jedno konto | |

Test wydajności liczy bajty wraz z nagłówkami HTTP lokalnego serwera, więc liczby nie odpowiadają dokładnie transferowi na Vercelu. Pojedynczy pomiar ma rozrzut do ok. 60 ms.

## Jak powtórzyć

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test
```

Pomiar i przegląd responsywności, z katalogiem wyjściowym w `PERF_OUT` lub `SCREENS_OUT`:

```bash
npx playwright test -c playwright.perf.config.ts measure
npx playwright test -c playwright.perf.config.ts responsive-screens
```
