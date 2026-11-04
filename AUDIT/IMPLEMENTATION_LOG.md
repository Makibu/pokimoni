# Dziennik wdrożenia

## Faza 0 — Fundamenty narzędziowe (2026-11-03)

Stan bazowy: `master` @ `70d47d8`. Gałąź robocza: `phase-0` → PR do `rebuild`.

| Krok | Commit | Co zrobiono |
|---|---|---|
| 0.1 | `f42faa3` | Dokumenty audytu w `AUDIT/` |
| 0.2 | `8444057` | `scripts/export-catalog.mjs` (tylko odczyt) → `data/catalog/`: sets 15, cards 3169, achievements 34, badges 9 — zgodne z licznościami w bazie |
| 0.3 | `b472d5a` | Next.js 15.4.6 → **16.4.5**, React 19.1 → **19.3.1**, eslint-config-next 16 (flat config, `eslint .` zamiast usuniętego `next lint`), `middleware.ts` → `proxy.ts`, aktualizacje minor zależności |
| 0.4 | `5541368` | Kod w `src/` (aliasy `@/*`, `@public/*`), Vitest 5, Playwright (desktop + Pixel 7), Prettier, `.env.example`, GitHub Actions, `engines.node >= 22` |
| 0.4 | `a0be794` | Formatowanie Prettierem — wyłącznie mechaniczne |

### Decyzje podjęte w trakcie

- **TypeScript zostaje na 5.9.3**, nie 7.x (nowy kompilator natywny — zbyt świeży względem reszty narzędzi).
- **ESLint 9.39**, nie 10 — wtyczki React/Next deklarują zgodność z 9.
- **framer-motion i lucide-react bez skoku major** — oba wymienimy/przejrzymy przy przepisywaniu UI (faza 5).
- Nowe reguły `react-hooks` v7 (`set-state-in-effect`, `immutability`) zgłaszają 21 błędów w starym wzorcu
  „uid z localStorage w efekcie”. Ten kod jest usuwany w fazach 2–3, więc reguły obniżono do ostrzeżeń
  **tylko dla wymienionych plików** (`eslint.config.mjs`); nowy kod podlega pełnym regułom.
- Weryfikacja `pglite-socket` dla E2E przeniesiona do fazy 1 (wtedy powstaje nowa baza).

### Wyniki bramki (lokalnie, Node 22.14, Windows)

| Polecenie | Wynik |
|---|---|
| `npm run format:check` | OK |
| `npm run lint` | 0 błędów, 33 ostrzeżenia (wszystkie w kodzie do przepisania) |
| `npm run typecheck` | OK |
| `npm test` | 1/1 |
| `npm run build` | OK |
| `npm run test:e2e` | 4/4 (przekierowanie gościa, formularz logowania; desktop + mobile) |
| `npm audit --omit=dev` | **0 podatności** (było: 1 critical, 6 high) |
| `npm audit` (z dev) | 16 moderate — `minimatch` w wtyczkach ESLint; tylko narzędzia deweloperskie |
| Smoke `next start` | `/login` 200, `/` → 307 `/login`, `/api/sets` 200 |

### Nie zweryfikowano

- Ścieżek wymagających zalogowania w starej aplikacji (wymagałoby logowania na produkcyjne konto) —
  stary kod i tak jest zastępowany w fazach 2–3.
- Przebiegu CI na GitHubie — pierwsze uruchomienie po wypchnięciu gałęzi.

## Faza 1 — Baza i domena (2026-11-03)

Gałąź: `phase-1` (od `phase-0`) → PR do `rebuild` po scaleniu fazy 0.

| Krok | Commit | Co zrobiono |
|---|---|---|
| 1.2 | `d5a5557` | `src/domain/`: `rarity`, `game-day` (doba od 10:00 Europe/Warsaw), `economy` (zaakceptowane liczby, streak 7 dni, skarbonka 300), `packs` (wagi per slot, mnożnik trafień per poziom, god pack 0,05%, limit 9) |
| 1.1 + 1.3 | `4b01a61` | `src/server/db/`: schemat Drizzle (24 tabele w schemacie `game`, RLS), migracja `drizzle/0000_init.sql`, seed katalogu, klient `postgres.js`; harness PGlite i testy schematu |

### Decyzje podjęte w trakcie

- **Losowanie: najpierw rzadkość, potem karta.** Stary kod ważył każdą kartę osobno, więc szansa
  rzadkości rosła z liczbą kart tej rzadkości w secie. Teraz szanse odpowiadają tabeli wag niezależnie
  od składu setu (zgodnie z kryterium akceptacji F4). Zmienia to odczuwalne szanse względem starej wersji.
- **Poziomy paczek:** w slotach 4–5 szanse rzadkości „hit” (illustration rare i wyżej) mnożone ×1 / ×1,5 / ×2,5
  dla poziomów 1 / 2 / 3. Wartości do strojenia symulacją w fazie 8.
- **Nagrody osiągnięć:** nagrody < 500 monet zostają monetami; ≥ 500 zamieniono na darmowe paczki
  najwyższego poziomu (`round(monety / 400)`), np. 2000 monet → 5 paczek.
- **Odznaki:** jedyne źródło to baza; reguły przeniesione z `lib/badgesData.ts`. Odznaka 4 w starej bazie
  nazywała się „Łowca Special Rare”, a kod sprawdzał Secret Rare — przyjęto nazwę i opis zgodne z regułą.
- **Escrow wymian** pilnowany w serwisie (faza 6), nie kluczem obcym — FK blokowałby też zakończone oferty.
- **Sloty i gablota** mają złożone FK do `user_cards` — baza nie pozwoli wstawić karty, której gracz nie ma.
- `vite-tsconfig-paths` usunięty — Vite 8 rozwiązuje aliasy natywnie.

### Wyniki bramki

| Polecenie | Wynik |
|---|---|
| `format:check`, `typecheck`, `build` | OK |
| `lint` | 0 błędów, 33 ostrzeżenia (bez zmian — stary kod) |
| `npm test` | **49/49** (36 unit domeny, 13 integracyjnych na PGlite) |
| `test:e2e` | 4/4 |

### Nie zrobiono / do zrobienia

- **Migracja nie jest jeszcze wgrana do Supabase** — wymaga `DATABASE_URL` (connection string poolera
  z hasłem do bazy) w `.env.local`. Potrzebne od fazy 2; wgranie tworzy tylko schemat `game`, nie dotyka `public`.
- Weryfikacja `pglite-socket` dla lokalnych E2E — przeniesiona do fazy 2 (pierwsze E2E z bazą).

## Faza 2 — Konta i sesje (2026-11-03)

Gałąź: `phase-2` (od `phase-1`).

**Baza:** `DATABASE_URL` ustawiony w `.env.local` (poza repo). Migracja i seed wgrane do schematu `game`
na Supabase: 15 setów, 3169 kart, 34 osiągnięcia, 9 odznak, RLS na wszystkich tabelach.
Stare tabele w `public` sprawdzone po migracji: bez zmian (4 konta, 678 paczek, 3169 kart).

### Co zrobiono

- `server/auth`: hasła bcrypt (koszt 12), token HS256 przez `jose`, limit prób w tabeli `auth_attempts`
  (10 nieudanych logowań na email, 50 na IP, 10 rejestracji na IP w oknie 15 min).
- `server/http/handler.ts`: `route()` (kontrola Origin, jednolite błędy bez szczegółów bazy), `parseBody()`
  (zod, wymagany JSON), `requireUser()` (podpis + `token_version` + istnienie konta).
- `server/services/account.ts` i `/api/auth/{register,login,logout,me}`. Żaden endpoint kont nie przyjmuje `uid`.
- `proxy.ts` weryfikuje podpis tokenu (nie samą obecność ciasteczka).
- UI: `features/account` (React Query), `SessionGuard`, `features/settings`, nowy `UserMenu` i strona logowania;
  usunięte `context/authContext.tsx`, `jsonwebtoken`, `/api/login`, `/api/register`, `/api/user/update`, `/api/user/avatar`.
- E2E na PGlite przez `pglite-socket` (`scripts/e2e-db.ts`) — bez Dockera, ta sama ścieżka lokalnie i w CI.

### Decyzje podjęte w trakcie

- **Nowa zmienna `SESSION_SECRET`** (48 losowych bajtów) zamiast nadpisywania `JWT_SECRET`: obecny `JWT_SECRET`
  ma 11 znaków, a nowy kod wymaga co najmniej 32. Na Vercel trzeba ją dodać przy przełączeniu (faza 4).
- **Ustawienie „tryb ciemny”** usunięte z UI do czasu implementacji w fazie 8 (dotąd atrapa).
- **Sesja 30 dni** z unieważnianiem przez `token_version` przy zmianie hasła.

### Wyniki bramki

| Polecenie | Wynik |
|---|---|
| `format:check`, `typecheck`, `build` | OK |
| `lint` | 0 błędów, 28 ostrzeżeń (stary kod) |
| `npm test` | **74/74** (w tym 25 testów API kont) |
| `test:e2e` | **14/14** (desktop + mobile): rejestracja, wylogowanie, logowanie, błędne hasło, sfałszowane ciasteczko, usunięcie konta, wylogowanie innych sesji po zmianie hasła |
| `npm audit --omit=dev` | 0 podatności |
| Izolacja testów | `game.users` na Supabase = 0 po E2E: testy nie dotykają prawdziwej bazy |

### Stan przejściowy

Na tej gałęzi widoki gry (sklep, kolekcja, statystyki) nie mają jeszcze danych: stare hooki czytają `uid`
z `localStorage`, którego już nikt nie zapisuje, a stare endpointy nadal działają na `public`. Podpięcie
pod nowy backend to faza 3. `master` i produkcja nie są dotknięte.

## Faza 3 — Rdzeń gry na nowym backendzie (2026-11-03)

Gałąź: `phase-3` (od `phase-2`).

### Co zrobiono

- **Domena:** `progress` (warunki osiągnięć i odznak), `daily-pack` (poprawne losowanie ważone, DB-09).
- **Serwisy:** `coins` (atomowa zmiana salda + dziennik), `wallet` (streak, skarbonka, sloty), `packs` (sklep, paczka dnia,
  zakup i otwarcie w jednej transakcji, darmowe paczki, limit 9), `progress` (ocena i jednorazowy odbiór nagród),
  `collection` (kolekcja, statystyki z faktycznych tabel).
- **API:** `/api/player`, `/api/daily/claim`, `/api/piggy-bank/collect`, `/api/slots/[slot]`, `/api/shop`, `/api/packs/open`,
  `/api/collection`, `/api/collection/owned`, `/api/collection/[setId]`, `/api/achievements`,
  `/api/achievements/[id]/claim`, `/api/statistics`, `/api/feedback`.
- **UI:** wszystkie widoki na nowym API (`features/game/use-game.ts`). Tymczasowe, proste okno otwierania paczek (faza 5).
- **Usunięto:** wszystkie stare endpointy, Sudoku, Saper, `hooks/queries`, `lib/checkUser*`, `lib/badgesData`, `lib/types`,
  klientów Supabase, `@supabase/supabase-js`, `scripts/export-catalog.mjs`, tymczasowe obniżenie reguł ESLint.

Naprawione: BUG-01, 02, 03, 04, 05, 06, 08, 09, 12, 13, 14, 15, 16, DB-01, DB-04, DB-09, DB-13.

### Błędy znalezione przez testy

- `secureRng`: zakres `2^48` przekraczał limit `randomInt`, więc każde losowanie paczki dnia kończyło się wyjątkiem.
- **Awatary:** `proxy.ts` przekierowywał na logowanie wewnętrzne żądania `next/image` (bez ciasteczka). Pliki publiczne
  są teraz wyłączone z proxy; dodany test E2E.
- Dynamiczne klasy Tailwind w `StatTile` nie zostałyby wygenerowane — zastąpione jawną mapą.
- E2E przekraczały limit 10 rejestracji na IP; każdy test działa teraz jako osobny klient.

### Decyzje podjęte w trakcie

- **Zmiana karty w slocie wypłaca naliczony dochód od razu do portfela** (skarbonka startuje od zera przy nowej stawce).
- **Paczka dnia bez limitu sztuk** — jak w starej wersji. Pytanie do właściciela, czy ograniczyć do 1 dziennie.
- **Karty z katalogu ładowane bez optymalizacji Vercel** (`unoptimized`): obrazy są już małe, a limit optymalizacji darmowego planu by nie wystarczył.
- Obrazy kart nadal hostowane na `images.pokemontcg.io` (zewnętrzna zależność).
- Limit prób opiera się na `x-forwarded-for`, który na Vercelu ustawia platforma; poza Vercelem nagłówek można podrobić.

### Wyniki bramki

| Polecenie | Wynik |
|---|---|
| `format:check`, `typecheck`, `build` | OK |
| `lint` | **0 błędów, 0 ostrzeżeń** |
| `npm test` | **155/155** |
| `test:e2e` | **22/22** (desktop + mobile) |
| `npm audit --omit=dev` | 0 podatności |

### Znane ograniczenia (do kolejnych faz)

- Na szerokości 1280 px pasek boczny zasłania lewy brzeg strony statystyk (faza 8).
- Okno otwierania paczek jest tymczasowe (faza 5). Sekcja minigier zniknęła ze sklepu do fazy 7.
- `lang="en"` przy polskim UI i brak nagłówków bezpieczeństwa (faza 8).
- Współbieżność sprawdzona na PGlite (jedno połączenie); blokady wierszy nie były testowane na prawdziwym Postgresie z wieloma połączeniami.

## Faza 4 — Przełączenie produkcji: przygotowanie (2026-11-04)

- **Blokady na prawdziwym Postgresie** (pooler Supabase, kilka połączeń, tymczasowy gracz testowy, usunięty po teście):
  5 równoległych odbiorów nagrody dziennej → 1 sukces; 6 równoległych zakupów przy 600 monetach → 4 sukcesy, saldo 0;
  5 równoległych odbiorów osiągnięcia → 1 sukces; 5 równoległych wyborów paczki dnia → jeden wynik.
  Dziennik zgadza się z saldem (500 startowe w teście wstawione bez wpisu + dziennik −500 = 0). Asercja dziennika w samym
  skrypcie miała błąd w działaniu i zgłosiła FAIL; zgodność sprawdzono ręcznie na wypisanej wartości.
- **Migracje** aktualne, katalog kompletny, stare tabele nietknięte.
- **`rebuild`** przewinięte do `phase-3`. Pierwszy przebieg CI wykrył błąd typecheck na czystej kopii (brak `next-env.d.ts`);
  naprawione przez `next typegen` w skrypcie `typecheck` (`ee1df1b`).
- Repozytorium jest publiczne: dokumenty `AUDIT/` z opisem luk starej wersji są widoczne na wypchniętych gałęziach.

Do zrobienia: scalenie do `master` (wymaga zmiennych na Vercelu), test produkcji, kopia `feedback`, usunięcie starych tabel i cronów.
