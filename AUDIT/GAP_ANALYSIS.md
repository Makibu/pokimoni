# Gap analysis — stan obecny vs specyfikacja v1 (2026-11-03)

Priorytety: P0 krytyczne (bezpieczeństwo/fundament), P1 wysokie, P2 średnie, P3 niskie.
Odniesienia: `SECURITY_AUDIT.md` (SEC), `CODE_REVIEW.md` (BUG/DB/ARCH/PERF), `PRODUCT_SPECIFICATION.md` (F).

## Funkcje

| Funkcja | Stan obecny | Stan oczekiwany | Luka | Prio |
|---|---|---|---|---|
| F1 Konto | JWT wystawiany, nigdy weryfikowany; token w localStorage; brak walidacji; usuwanie konta nie działa (BUG-11) | Sesja w HttpOnly cookie, `uid` tylko z sesji, walidacja, rate limit, hasło przy zmianach wrażliwych, nick case-insensitive | Przebudowa całej warstwy auth | **P0** |
| F2 Ustawienia | Ukrywanie nazw nie działa po najechaniu (BUG-13); tryb ciemny to atrapa | Działające ukrywanie, motyw jasny/ciemny/systemowy | Naprawa + implementacja motywu | P2 |
| F3 Ekonomia | Kwoty i typy operacji podaje klient; brak atomowości; saldo może być ujemne | Operacje serwerowe, atomowe, dziennik transakcji, saldo ≥ 0 | Nowy moduł ekonomii | **P0** |
| F4 Sklep / paczki | Cena liczona w kliencie; karty zapisuje klient; 14 zapytań na paczkę; wadliwa paczka dnia (DB-09/10); jedna tabela szans | Jedna transakcja serwera; 3 poziomy z własnymi szansami; poprawna paczka dnia; darmowe paczki w ekwipunku | Nowy moduł paczek | **P0** |
| F5 Otwieranie paczki (UX) | Sztywne 900 px, nieużywalne na telefonie, wynik zapisywany po animacji | Rozcinanie, odkrywanie po kolei, podsumowanie, podgląd, 360 px+, reduced motion | Przepisanie od zera | P1 |
| F6 Limit 9 egzemplarzy | Brak | Nadwyżka z paczki oznaczona „LIMIT”, nie trafia do kolekcji; ostrzeżenie przy wymianie | Nowa reguła | P1 |
| F7 Sloty + skarbonka | Cron co godzinę, limit 1000 salda karzący oszczędzanie (DB-13) | Skarbonka 300, naliczanie leniwe, bez crona | Przebudowa | P1 |
| F8 Nagroda dzienna | Stałe 300, flaga resetowana cronem o 23:00 UTC | Streak 7-dniowy, doba od 10:00 Europe/Warsaw | Nowa mechanika | P1 |
| F9 Zadania dzienne | Brak | 3 losowe zadania solo, postęp na serwerze | Nowa funkcja | P2 |
| F10 Minigra dnia | Sudoku/Saper do oszukania (rozwiązanie w przeglądarce, BUG-02/03/12) | 3 gry × 3 poziomy, rotacja, weryfikacja serwerowa | Usunięcie starych, 3 nowe gry | P2 |
| F11 Kolekcja | Działa; duplikat `rarityOrder`; filtr setu bez `!inner` (BUG-09) | Jak teraz + liczba egzemplarzy + podgląd karty | Refaktor | P2 |
| F12 Osiągnięcia | Klient sam ogłasza zdobycie i kwotę; wielokrotny odbiór; zepsute sortowanie (BUG-16) | Ocenianie i nagroda na serwerze, jednorazowo; nagrody monety lub paczki | Przebudowa | **P0** (bezpieczeństwo) / P1 (paczki) |
| F13 Odznaki | Definicje w kodzie i w bazie, przyznaje klient | Jedno źródło (baza), przyznaje serwer, widoczne w profilu | Przebudowa | P1 |
| F14 Statystyki | ~10 sekwencyjnych zapytań; liczniki zdenormalizowane i rozjeżdżające się | Dane z faktycznych tabel, 1–2 zapytania | Refaktor | P2 |
| F15 Znajomi | Brak | Zaproszenia po nicku, lista, usuwanie | Nowa funkcja | P1 |
| F16 Wymiany | Brak | 1:1, escrow, limit 1 oferty na kierunek, atomowa zamiana | Nowa funkcja | P1 |
| F17 Profil (pop-up) | Brak | Nick, awatar, odznaki, 3 statystyki, gablota 5 kart | Nowa funkcja | P1 |
| F18 Inbox | Brak (jest tylko znacznik osiągnięć) | Globalny inbox, czerwona kropka, akcje | Nowa funkcja | P1 |
| F19 Changelog | Działa | Bez zmian | — | — |
| F20 Feedback | Zawsze zgłasza sukces (BUG-01) | Sukces tylko po zapisie | Poprawka | P2 |

## Obszary przekrojowe

| Obszar | Stan obecny | Stan oczekiwany | Prio |
|---|---|---|---|
| Zależności | `next@15.4.6` z advisory critical; 6 high | Aktualne wersje, `npm audit` bez high/critical | **P0** |
| Baza | Schemat poza repo; brak UNIQUE/indeksów/CHECK; mieszane strefy czasu; crony | Migracje w repo, ograniczenia, indeksy, RLS, `timestamptz`, doba gry w jednym miejscu | **P0** |
| Dane kart | Tylko w produkcyjnej bazie | Eksport `sets`/`cards`/`achievements`/`badges` do seedów w repo **przed resetem** | **P0** |
| Architektura kodu | Logika gry w komponentach; uid z localStorage w 13 plikach | Warstwy: domena (czyste funkcje) → serwisy (transakcje) → API → UI | P1 |
| Testy | Brak | Unit (domena), integracja (serwisy na PGlite), E2E (Playwright) | P1 |
| CI | Brak | GitHub Actions: lint, typecheck, test, build | P1 |
| Responsywność / a11y | Sztywne szerokości, puste tytuły dialogów, klikalne `div` | 360 px+, klawiatura, kontrast w obu motywach | P2 |
| SEO | `lang="en"`, generyczne metadane | `lang="pl"`, metadane strony logowania, OG do linku w portfolio; reszta za loginem — SEO nieistotne | P3 |
| Dokumentacja | README ogólnikowy | README: architektura, uruchomienie, decyzje, zrzuty ekranu | P2 |

## Do usunięcia

- Sudoku, Saper (komponenty, endpointy, tabele `daily_sudoku`, `daily_minesweeper`, flagi w `user_stats`).
- Crony: wszystkie obecne (resety zastąpione datą doby gry, dochód — skarbonką).
- `lib/supabaseClient.ts` (nieużywany), `lib/badgesData.ts` (po przeniesieniu definicji do bazy),
  `API_NINJAS_KEY` (nieużywany), zakomentowany kod.
