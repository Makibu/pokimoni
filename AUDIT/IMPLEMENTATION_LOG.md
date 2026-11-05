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

## Faza 4.5 — System designu i przebudowa widoków (2026-11-04)

Gałąź `phase-4.5`. Właściciel wybrał klimat „jasny i kolorowy” i kierunek B „Holo”.

**Co powstało**

- Tokeny kolorów, typografia (Unbounded + Onest), promienie, wspólne stany: `Skeleton`, `ErrorState`, `EmptyState`, `LoadedImage`.
- Prawdziwy tryb jasny / ciemny / systemowy, domyślnie jasny.
- Nowy układ: pływający nagłówek na desktopie, dolny pasek nawigacji na telefonie, `(game)/layout.tsx`, strona 404 i ekrany błędów.
- Nowy wygląd: logowanie, start, sklep, kolekcja, zestaw, osiągnięcia, statystyki, profil, ustawienia, wybór karty do slotu, otwieranie paczki, zgłoszenia, informacje o aplikacji.
- `loading.tsx` i placeholdery na każdej stronie, które wyglądają jak docelowa treść.
- Dane: `queryOptions`, `staleTime` 30 s, wcześniejsze pobieranie przy nawigacji, natychmiastowa aktualizacja pamięci podręcznej po akcjach.

Reguły gry i API bez zmian. Nowe funkcje z faz 5–7 nie istnieją jeszcze w kodzie, więc nie mają atrap w interfejsie.

**Usunięte:** stare `Navbar`, `Sidebar`, `TabHeader`, `LoadingIndicator`, `PacksCarousel`, nieużywane komponenty UI, `useIsMobile`,
tła i animacja Lottie (`public/`), banery, zależności `lottie-react` i cztery paczki Radix.

**Naprawy znalezione przy okazji**

- Przewijanie kółkiem przejęte przez karuzelę sklepu → siatka na desktopie, zwykłe przewijanie niżej.
- Opisy odznak tylko w dymkach, niedostępne dotykiem → widoczny tekst.
- Ukryte paski przewijania → cienkie i widoczne.
- Niewidoczne placeholdery (kolor jak tło sceny) → osobny kolor i test.
- **Martwe przyciski na dev serwerze pod adresem innym niż `localhost`** (zgłoszone przez właściciela): Next 16 odrzuca wtedy gniazdo HMR,
  strona się nie hydratuje i kliknięcia nic nie robią. Odtworzone na `127.0.0.1:3000` i `192.168.1.20:3000`.
  Naprawa: `allowedDevOrigins` w `next.config.ts`, działa tylko w trybie dev. Produkcji błąd nie dotyczył. E2E tego nie wykryło, bo działa na buildzie produkcyjnym.

**Szybkość** (`tests/perf/measure.spec.ts`: Pixel 7, CPU ×4, 150 ms, 200 kB/s, bez grafik kart; PGlite lokalnie)

| Pierwsze wejście | Pierwsze malowanie (ms) | Największy element (ms) | Treść z danych (ms) |
|---|---|---|---|
| `/login` | 908 → 824 | 908 → 824 | bez porównania (zmiana sposobu pomiaru) |
| `/` | 856 → 848 | 856 → 2904 | 3257 → 2905 |
| `/shop` | 896 → 808 | 2352 → 808 | 2348 → 2829 |
| `/collection` | 880 → 796 | 2400 → 796 | 2396 → 2749 |
| `/collection/[id]` | 872 → 820 | 2808 → 3308 | 2814 → 3307 |
| `/achievements` | 964 → 824 | 2552 → 824 | 2544 → 2863 |
| `/statistics` | 892 → 860 | 2808 → 860 | 2800 → 2865 |

| Rozmiar | Przed | Po |
|---|---|---|
| JS na stronach gry | 369–372 KB | 260–265 KB |
| JS logowania | 259 KB | 208 KB |
| CSS | 15 KB | 11 KB |
| Fonty | 49 KB | 132 KB |
| Grafika tła logowania | 192 KB | 0 KB |

Przejścia w aplikacji: pierwsze 281–379 ms (było 329–388), kolejne 143–257 ms (było 125–164).

**Wniosek:** największy element sklepu, kolekcji, osiągnięć i statystyk maluje się po ok. 0,8 s zamiast ok. 2,5 s, bo nagłówek i placeholdery są od razu w HTML; na stronie głównej i w zestawie dalej zależy od danych. Treść z danych przy pierwszej wizycie na wolnym łączu pojawia się o 0,1–0,5 s później niż przed przebudową, poza stroną główną.
Główna przyczyna to fonty: po ograniczeniu Unbounded do wagi 700 spadły z 227 do 132 KB, a reszta różnicy dotyczy tylko pierwszej wizyty. Własne przycinanie fontów odłożone jako zbyt złożone wobec zysku.
Powrotne przejścia na `/shop` i `/collection` są wolniejsze o ok. 80–100 ms przy CPU ×4.

**Region funkcji:** `vercel.json` ustawia `fra1`, bo funkcje działały w `iad1`, a baza jest w `eu-central-1`. Lokalny pomiar tego nie pokaże; po wdrożeniu do sprawdzenia nagłówek `x-vercel-id`.

**Bramka:** format, lint i typecheck OK; Vitest 246/246; build OK; E2E 36/36 (desktop + Pixel 7), w tym axe WCAG A/AA na wszystkich stronach w obu motywach; `npm audit --omit=dev` 0.
Zrzuty: 360/768/1280/1920, oba motywy, strony, stany ładowania i okna dialogowe. Przycisk na adresach innych niż `localhost` sprawdzony ręcznie w przeglądarce.

**Nie sprawdzono:** wyglądu na fizycznym telefonie, czytnika ekranu, działania na produkcji (przed wdrożeniem) oraz ścieżki god packa i „LIMIT” w nowym oknie paczki na zrzutach.

**Wdrożenie (2026-11-04):** za zgodą właściciela `1a61348` trafił na `rebuild` (CI zielone) i na `master`, deployment `Production` = `success`. Bez migracji bazy.
Funkcje działają w nowym regionie: `x-vercel-id` dla `/api/auth/me` to `arn1::fra1` (wcześniej `arn1::iad1`). Test produkcji bez konta przechodzi w całości (w tym 23/23 stare ścieżki → 404, logowanie na nieistniejące konto → 401 przez bazę). W przeglądarce strona logowania się hydratuje, przełączanie formularzy działa, fonty mają 130 KB.

**Na produkcji nie sprawdzono:** rozgrywki na koncie, czeka na test właściciela. Zysku czasowego z `fra1` nie zmierzono na zalogowanych ścieżkach.

## Faza 5 — nowe otwieranie paczek (2026-11-04)

Gałąź `phase-5`. Zmienia tylko interfejs: zasady gry, API i baza bez zmian, bez migracji.

**Przebieg dla gracza:** oferta z ceną → zakup (serwer zna już wynik, a monety schodzą w tym momencie) → rozcięcie paczki → karty po kolei → podsumowanie → podgląd karty, „Otwórz kolejną” albo „Zamknij”. „Pomiń” działa od rozcinania do ostatniej karty. Zamknięcie okna w połowie nie zabiera kart, bo są już na koncie.

**Rozcinanie:** przeciągnięcie palcem lub myszą w dowolnym kierunku, na co najmniej 70% szerokości paczki. Krótkie przeciągnięcie nic nie robi. Kliknięcie, tapnięcie i Enter też rozcinają, żeby gest nie był jedyną drogą.

**Efekty rzadkości (`revealEffect`):** zwykłe bez efektu; od `rare` niebieska poświata; od `ultra rare` złota poświata i błysk; karty z `HIT_RARITIES` tęczowa poświata, rozbłysk i dłuższe oczekiwanie przed odwróceniem. Nieznana rzadkość liczy się jak zwykła.

**Karty:** zakryta karta odwraca się sama. Pierwsza akcja na zakrytej tylko ją odwraca, więc szybkie klikanie nie pomija kart bez ich pokazania. Odkrytą kartę można odrzucić przeciągnięciem, tapnięciem, przyciskiem albo klawiszem strzałki w prawo.

**Podgląd:** `CardPreview` pokazuje dużą kartę, rzadkość, zestaw, dochód w slocie i liczbę egzemplarzy. Działa w podsumowaniu i, jako nowość względem pierwotnego zakresu, po kliknięciu posiadanej karty w kolekcji (F11).

**Dostępność:** cała ścieżka z klawiatury, fokus przechodzi na paczkę i na przycisk kolejnej karty, region `aria-live` czyta nazwę i rzadkość każdej karty. Przy `prefers-reduced-motion` animacje znikają, a odliczanie `motionMs` wynosi 0.

**Usunięte:**
- `src/components/shop/OpenPackDialog.tsx` — tymczasowe okno;
- `public/card_backside.png` — 2,1 MB, nieużywany, obca grafika ze znakiem autora; tył karty jest teraz własny, rysowany w CSS;
- zależność `framer-motion` — nigdzie nieużywana; animacje to CSS i Pointer Events.

**Błędy znalezione przy weryfikacji i poprawione:**
- Przeciąganie myszą nie działało, gdy zaczynało się na obrazku: przeglądarka uruchamiała własne przeciąganie obrazka i przerywała gest. Złapał to E2E rzucania kartą; to samo dotyczyło logo na paczce, stąd `onDragStart` w obu miejscach i test cięcia zaczynanego na logo.
- Poświata najrzadszych kart malowała się nad nagłówkiem i tekstem, a jej obrót zamiatał długą krawędzią po nazwie i rzadkości. Teraz jest okręgiem pod tekstem, a licznik i opis mają własne tło.
- „NOWA”/„LIMIT” w podsumowaniu zasłaniały nazwę na karcie; przeniesione na dół karty.
- Podgląd na 360×640 ucinał dane karty; obraz ogranicza teraz wysokość ekranu.
- Pełnoekranowe okno miało zaokrąglone rogi, bo `tailwind-merge` nie rozpoznaje `rounded-section`.

**Rozmiar (pierwsza wizyta, CPU ×4, łącze 1,6 Mb/s i 150 ms opóźnienia):**

| Strona | JS przed | JS po | FCP przed | FCP po |
|---|---|---|---|---|
| `/login` | 208 KB | 208 KB | 824 ms | 816 ms |
| `/` | 260 KB | 267 KB | 848 ms | 824 ms |
| `/shop` | 260 KB | 267 KB | 808 ms | 820 ms |
| `/collection` | 260 KB | 260 KB | 796 ms | 856 ms |
| `/collection/[id]` | 265 KB | 266 KB | 820 ms | 816 ms |

Okno paczki to osobny, doładowywany fragment (ok. 20 KB nieskompresowane), a jego style 5 KB. Różnice FCP mieszczą się w rozrzucie pojedynczego pomiaru. Pomiar nie objął animacji na słabym telefonie.

**Bramka:** format, lint i typecheck OK; Vitest 267/267; build OK; E2E 54/54 na desktopie i Pixel 7, w tym prawdziwy dotyk na 360×640 i axe WCAG A/AA na wszystkich etapach; `npm audit --omit=dev` 0.
Zrzuty: 360/390/1280, wszystkie etapy i poziomy rzadkości.

**Nie sprawdzono:** fizycznego telefonu, czytnika ekranu, płynności animacji na słabym sprzęcie, działania na produkcji (przed wdrożeniem). Zawartość god packa i `LIMIT` sprawdzone na odpowiedzi udawanej w teście, bo prawdziwe wylosowanie ich w E2E zależałoby od losu.

**Wdrożenie:** za zgodą właściciela `d323fd3` trafił na `rebuild` (CI zielone) i na `master`, deployment `Production` = `success` (2026-11-04T23:11:54Z). Bez migracji bazy.
Test produkcji bez konta przechodzi w całości (w tym 23/23 stare ścieżki → 404, logowanie na nieistniejące konto → 401 przez bazę). Usunięty `/card_backside.png` zwraca 404. `x-vercel-id` dla `/api/auth/me` nadal wskazuje `fra1`.

**Na produkcji nie sprawdzono:** samego okna paczki, bo wymaga zalogowania, a test nie zakłada kont na produkcji. Czeka na test właściciela na koncie.

**Poprawka po zgłoszeniu właściciela: migotanie okien.** Przy pierwszym użyciu okno paczki znikało na ułamek sekundy, razem ze stroną pod spodem, a potem wracało. Podobnie w innych oknach.

Przyczyna: `dynamic()` z domyślnymi opcjami nie tworzy własnej granicy `Suspense` (`hasSuspenseBoundary = !opts.ssr || !!opts.loading`), więc wstrzymanie docierało do `loading.tsx` trasy, która na tę chwilę zastępowała całą stronę. `React.lazy` wstrzymuje się przy pierwszym renderze zawsze, nawet gdy plik jest już pobrany, dlatego samo wcześniejsze pobieranie nie pomagało, a miganie było widać też na szybkim łączu. Błąd dotyczył 7 okien, w tym starszych niż faza 5 (slot, ustawienia, zgłoszenie, informacje).

Naprawa:
- wszystkie doładowywane okna mają `{ssr: false}`, czyli własną granicę; otwierają się dopiero po kliknięciu, więc serwer ich nie renderuje;
- podgląd karty w oknie paczki przychodzi razem z oknem, zamiast przy pierwszym kliknięciu;
- reguła ESLint odrzuca `dynamic()` bez opcji, co dotyczy też przyszłych okien faz 6 i 7.

Weryfikacja: `tests/e2e/lazy-dialogs.spec.ts` spowalnia pobieranie plików i co klatkę sprawdza, czy treść nie zniknęła. Na kodzie sprzed poprawki nie przechodził, po poprawce przechodzi na desktopie i Pixel 7.

**Bramka:** format, lint i typecheck OK; Vitest 267/267; build OK; E2E 62/62; `npm audit --omit=dev` 0. JS na `/` i `/shop` 267 → 268 KB, reszta bez zmian.

**Nie sprawdzono:** braku migania na fizycznym telefonie i na koncie właściciela. Możliwe, że właściciel widział też inne miganie niż to z okien; zwykłe przejścia między stronami nadal celowo pokazują placeholdery z `loading.tsx`.

**Wdrożenie poprawki:** za zgodą właściciela `b8a0199` trafił na `rebuild` (CI zielone) i na `master`, deployment `Production` = `success` (2026-11-04T23:51:14Z). Bez migracji bazy. Test produkcji bez konta przechodzi w całości; `x-vercel-id` nadal wskazuje `fra1`. Okien nie sprawdzałem na produkcji sam, bo wymagają zalogowania; właściciel potwierdził na produkcji, że miganie zniknęło, i faza 5 jest zamknięta.

## Faza 6 — funkcje społeczne (2026-11-05, gałąź `phase-6`)

**Decyzje właściciela na starcie:** paczka dnia bez limitu sztuk; grafiki kafelków na stronie głównej bez zmian.

**Co powstało:**
- Skrzynka przy każdej podstronie: dzwonek z czerwoną kropką, odświeżanie co 30 s i przy wejściu na stronę, oznaczanie jako przeczytane po otwarciu.
- Znajomi: nowa zakładka `/friends`, wyszukiwanie po nicku bez względu na wielkość liter, zaproszenia, wycofanie, przyjęcie, odrzucenie, usunięcie znajomego.
- Profil w oknie: nick, awatar, odznaki, do 3 wybranych statystyk spośród 11, gablota do 5 kart, edycja własnego profilu, przyciski zależne od relacji.
- Wymiany: 1 egzemplarz za 1 egzemplarz, limit jednej oferty na kierunek, blokada egzemplarza nadawcy, ostrzeżenie `LIMIT` u odbiorcy, plakietka „W ofercie” w kolekcji, wykluczenie z wyboru do slotu.
- Warstwy jak w reszcie gry: `domain/trades.ts` i `domain/profile.ts`, serwisy `friends`, `trades`, `notifications`, `profile`, `players`, cienkie trasy API, UI w `features/social` i `components/social`.
- W menu użytkownika są teraz „Mój profil” (publiczny widok) i „Konto” (dotychczasowe okno z danymi logowania).

**Baza:** bez migracji. `drizzle-kit generate` potwierdza brak zmian, wszystkie tabele powstały już w `drizzle/0000_init.sql`. Na produkcję idzie tylko kod.

**Blokady:** każda operacja zmieniająca karty lub sloty gracza bierze najpierw blokadę jego `player_state`. Wymiana bierze oba wiersze w stałej kolejności (`lockPlayers`), potem blokuje ofertę i dopiero sprawdza jej stan oraz egzemplarze. Odrzucenie i wycofanie oferty blokują tylko jej wiersz. To odstępstwo od pierwotnego zapisu o blokowaniu `user_cards`; powód w `TARGET_ARCHITECTURE.md`.

**Decyzje techniczne do odbioru:** wycofanie własnego zaproszenia (status `cancelled` już był w schemacie), ciche odrzucenie zaproszenia, zakaz wymiany karty na tę samą, 3 domyślne statystyki i minimum 1, 30 ostatnich powiadomień w skrzynce, nowa zakładka w nawigacji. Spisane w F15–F18. Teksty powiadomień unikają form zależnych od płci, bo nick jej nie zdradza.

**Skutek dla ekonomii:** wymiana może odblokować osiągnięcia, a te dają prawdziwe nagrody. Przyznawane są raz, więc znajomi nie wyciągną ich w nieskończoność, ale mogą przyspieszyć sobie kolekcję. Ustalenia nie ograniczają liczby wymian; czy to problem, oceni symulacja ekonomii w fazie 8.

**Błędy znalezione przy weryfikacji i poprawione:**
- Edytor profilu otwarty tuż po zapisie pokazywał stare wybory. Odświeżanie wciąż trwało, a formularz bierze wartości startowe tylko raz. Teraz formularz czeka na świeże dane. Złapał to E2E, tylko na desktopie, bo to wyścig; po poprawce test przeszedł 10 razy na 10 w obu projektach.
- Długi nick poszerzał jedyną kolumnę okna, przez co treść wchodziła na prawy margines. Dotyczyło to skrzynki i profilu, a poprawka w `ui/dialog.tsx` działa we wszystkich oknach. Wcześniejszy test mierzył tylko krawędź okna, więc jej nie widział. Zaostrzony test bez poprawki nie przechodzi, a z poprawką przechodzi.
- Przyciski znikały na kolorowych wierszach (wariant `outline`), „Otrzymujesz” wychodziło poza okno na 360 px, a stopka edytora była ucinana (przyklejona stopka, niższa lista kart).

**Bramka (na tym kodzie):** format, lint i typecheck OK; Vitest 385/385, w tym 61 testów `tests/integration/social.test.ts`; build OK; E2E 82/82 na desktopie i Pixel 7, w tym pełny cykl z dwoma graczami, kropka po 30 s na podstawionym zegarze, 360 px i axe WCAG A/AA w obu motywach; `npm audit --omit=dev` 0. Testy API obejmują odrzucenie żądania z obcej strony, nieujawnianie cudzych ofert i zaproszeń oraz brak e-maila w profilu.

**Rozmiar (pierwsza wizyta, CPU ×4, łącze 1,6 Mb/s i 150 ms opóźnienia):**

| Strona | JS przed | JS po | FCP przed | FCP po |
|---|---|---|---|---|
| `/login` | 208 KB | 208 KB | 816 ms | 880 ms |
| `/` | 268 KB | 269 KB | 824 ms | 868 ms |
| `/shop` | 268 KB | 269 KB | 820 ms | 872 ms |
| `/collection` | 260 KB | 262 KB | 856 ms | 856 ms |
| `/collection/[id]` | 266 KB | 267 KB | 816 ms | 868 ms |
| `/friends` | — | 262 KB | — | 876 ms |

JS przed to wartości po poprawce migania, FCP przed pochodzi z pomiaru fazy 5 sprzed tej poprawki. FCP wzrósł też na `/login`, gdzie JS się nie zmienił, więc różnice do ok. 60 ms traktuję jako rozrzut pojedynczego pomiaru, a nie wniosek. Dane na `/friends` pojawiają się po 2,8 s przy pierwszej wizycie, jak na innych stronach gry, a po 0,1–0,3 s przy przejściu w aplikacji.

**Ograniczenia testów:**
- PGlite ma jedno połączenie, więc testy wyścigów (akceptacja kontra wycofanie, dwie akceptacje) wykonują się po kolei. Dowodzą, że wygrywa dokładnie jedna operacja, ale nie sprawdzają blokad ani zakleszczeń na prawdziwym Postgresie. Kolejność blokad wynika z kodu, a nie z testu.
- Limit zapytań (sprawdzenie, potem zapis) jest przybliżony przy równoległych żądaniach.
- Widok `LIMIT` na zrzutach pochodzi z odpowiedzi udawanej; sama logika utraty karty jest w testach integracyjnych.

**Nie sprawdzono przed wdrożeniem:** fizycznego telefonu, czytnika ekranu, działania na produkcji i na prawdziwej bazie.

**Wdrożenie:** za zgodą właściciela `b87f13c` trafił na `rebuild` (CI zielone) i na `master`, deployment `Production` = `success` (2026-11-05T11:49:17Z). Bez migracji bazy.
Test produkcji bez konta przechodzi w całości. Nowe trasy `/api/friends`, `/api/notifications`, `/api/notifications/unread`, `/api/trades`, `/api/profile` i `/api/players/search` odpowiadają 401, a `/friends` przekierowuje na logowanie. `x-vercel-id` nadal wskazuje `fra1`.

**Na produkcji nie sprawdzono:** samych funkcji społecznych, bo wymagają zalogowania na dwóch kontach, a test nie zakłada kont na produkcji. W szczególności blokady wymian nie pracowały jeszcze na prawdziwym Postgresie. Czeka na test właściciela.
