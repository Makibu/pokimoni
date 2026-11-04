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

## Faza 4 — Przełączenie produkcji: deploy (2026-11-04)

- Właściciel ustawił na Vercelu `DATABASE_URL` i `SESSION_SECRET`.
- CI dla `2fba0e8` zielone ([przebieg](https://github.com/Makibu/pokimoni/actions/runs/41897614170)).
  `master` przewinięty z `70d47d8` na `2fba0e8` (bez force). Nowa wersja na produkcji po 77 s.
- **Test produkcji bez konta** (skrypt tymczasowy, statusy HTTP):
  strony bez sesji i ze sfałszowanym ciasteczkiem → przekierowanie na `/login`; API bez sesji → 401;
  dane rejestracji niepoprawne → 400; obce `Origin` → 403; logowanie na nieistniejące konto → 401;
  23 z 24 starych ścieżek API → 404. Pozostała `/api/achievements` zwraca 401, bo ta nazwa istnieje też w nowym API
  i wymaga sesji. Skrypt zgłosił to jako FAIL przez błąd na liście, nie w aplikacji.
- **Baza:** w `game.auth_attempts` pojawiły się nowe wpisy po próbie logowania, więc produkcja zapisuje do nowego schematu
  przez `DATABASE_URL`. `game.users` = 1, stare tabele bez zmian (4 użytkowników, 678 paczek).
- **Nie zweryfikowano w tym teście:** `SESSION_SECRET`. `verifySessionToken` zamienia błąd braku sekretu na `null`,
  więc odpowiedzi 401 i przekierowania nie dowodzą jego poprawności. Potwierdzi go dopiero udane logowanie.
  Logowanie, otwarcie paczki i kolekcję na produkcji sprawdza właściciel na swoim koncie.

- Właściciel potwierdził na produkcji logowanie, otwarcie paczki i kolekcję, więc `SESSION_SECRET` działa.

## Faza 4 — Przełączenie produkcji: usunięcie starej wersji (2026-11-04)

- Za osobną zgodą właściciela. Kopia `feedback` (4 wiersze) poza repozytorium, na dysku właściciela. Pełnej kopii świadomie nie zrobiono.
- W jednej transakcji, po nazwach, bez `CASCADE`: 5 cronów, widok, 15 tabel, 5 funkcji.
- Po operacji: `public` bez tabel, widoków i funkcji; `cron.job` puste; `game` nienaruszone; produkcja odpowiada poprawnie.

## Poprawka po przełączeniu: połączenie z bazą (2026-11-04, gałąź `fix/db-connection`)

Skrypt usuwający zawiesił się na kontroli końcowej. Odtworzenie go ujawniło dwa problemy w kliencie bazy.

**1. Zawieszanie zapytań (`postgres.js` przez pooler Supabase).** Pomiar: 5 połączeń, po transakcji, 5 rund równoległych zapytań, limit 30 s.

| Równoległych zapytań | `postgres.js` | `pg` |
|---|---|---|
| 4–5 | ok | ok |
| 6, 8, 20 | zawieszone | ok (sprawdzone 20) |
| 100 | nie testowano | ok |

- Próg to dokładnie o jedno zapytanie więcej niż połączeń, czyli moment, w którym `postgres.js` zaczyna pipelining.
  `max_pipeline: 1` i `fetch_types: false` nie pomagają, a `max_pipeline: 0` psuje `sql.begin`.
- Mechanizmu po stronie poolera nie ustalono. Przyczyna pipeliningu to wniosek z progu i kodu klienta, nie bezpośredni pomiar.
- **Wpływ na produkcję:** problemu nie zaobserwowano, test właściciela przeszedł. Ryzyko: `getShop` i `getStatistics` wysyłają
  zapytania równolegle, a kilka żądań obsługiwanych naraz przez jedną instancję mogłoby przekroczyć 5 połączeń.

**2. Brak szyfrowania (`SEC-10`).** Adres bez `sslmode` i `postgres.js` bez opcji `ssl` dawały zwykłe TCP (pomiar: 0 wywołań `tls.connect`).

**Zmiana:** sterownik `pg` z `drizzle-orm/node-postgres`, `secureConnectionUrl` w aplikacji i `drizzle-kit`,
limit czasu oczekiwania na połączenie 10 s, obsługa błędów bezczynnych połączeń.

**Weryfikacja na prawdziwym poolerze** (usługi aplikacji, tymczasowy gracz, usunięty po teście): połączenie szyfrowane;
30 równoległych żądań → 30 ok; 5 odbiorów nagrody → 1 sukces; 6 zakupów przy 600 monetach → 4 sukcesy, saldo 0;
`db:migrate` działa przez `pg`.

**Bramka:** format, lint i typecheck OK; 160/160 testów; build OK; E2E 22/22 (przez `pg`, do PGlite po gnieździe); `npm audit` prod 0.

**Ograniczenia:** certyfikat poolera nie jest weryfikowany (`SEC-10`). `postgres` zostaje w `package-lock.json` jako zależność
`drizzle-orm`, ale aplikacja go nie używa.

**Wdrożenie:** `master` przewinięty na `7272fef` za zgodą właściciela, CI zielone, deployment `Production` = `success`.
Test produkcji bez konta przechodzi w całości (23/23 stare ścieżki → 404). Logowanie na nieistniejące konto kończy się 401,
a nie 500, więc produkcja łączy się z bazą nowym sterownikiem.

**Nie zmierzono na Vercelu:** szyfrowania, bo tam nie ma dostępu do gniazda; wynika ono z tego samego kodu i tego samego adresu
co w pomiarze lokalnym, jeśli `DATABASE_URL` na Vercelu ma tę samą postać. Logowanie i rozgrywka na `pg` na produkcji czekają na test właściciela.

## Faza 4 — Zamknięcie (2026-11-04)

- Właściciel potwierdził, że po zmianie hasła i redeployu logowanie oraz paczka działają.
- W bazie widać ten test: otwarcia paczek 3 → 4, karty 15 → 19, czyli zapis z produkcji przez `pg` działa.
- `.env.local` łączy się z bazą przez TLS (`encrypted = true`). `public` puste, `cron.job` puste.
- **Nie zweryfikowano niezależnie:** samej rotacji hasła i klucza `service_role` ani usunięcia starych zmiennych na Vercelu
  (brak dostępu; przyjęto deklarację właściciela). GitHub nie pokazuje deploymentu `Production` nowszego niż `7272fef` z 20:00 UTC,
  ale ręczny redeploy nie musi być tam widoczny.
