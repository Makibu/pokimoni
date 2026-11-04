# Audyt bezpieczeństwa — wstępny (2026-11-03)

Zakres: analiza statyczna kodu w repo + `npm audit`. Nie wykonywano żadnych testów na produkcji.
Nieznane: konfiguracja RLS i uprawnień w Supabase (poza repo).

## SEC-01 — CRITICAL — API nie uwierzytelnia żądań

- **Dowód:** `app/api/login/route.ts:29` wystawia JWT, ale żaden endpoint go nie weryfikuje
  (brak `jwt.verify` w całym repo). `middleware.ts:18` wyklucza `/api` z matchera.
  Każdy endpoint `app/api/user/**` bierze `uid` z query/body i wykonuje zapytanie kluczem
  service-role (omija RLS).
- **Scenariusz:** znając `uid` ofiary (UUID) można:
  `PATCH /api/user/update?uid=<ofiara>` z nowym hasłem/emailem → przejęcie konta;
  `DELETE /api/user/update?uid=<ofiara>` → usunięcie konta; odczyt i modyfikacja jej monet, kart, slotów.
  Na własnym koncie — dowolna manipulacja bez znajomości czegokolwiek.
- **Rekomendacja:** HttpOnly cookie z JWT ustawiane przez serwer; helper `requireUser(req)` w każdym
  route handlerze, `uid` wyłącznie z tokenu; usunięcie parametru `uid` z API.

## SEC-02 — HIGH — Ekonomia gry rozstrzygana po stronie klienta

| Miejsce | Problem |
|---|---|
| `app/api/user/coins/route.ts:24-63` | klient podaje `amount` i `type`; dowolna kwota dla `minigame`/`achievement`; brak sprawdzenia salda przy `purchase` (saldo może być ujemne) |
| `components/shop/OpenPackDialog.tsx:75-84` + `app/api/user/cards/route.ts:37` | cena paczki liczona w kliencie; karty wylosowane w GET są potem odsyłane przez klienta w POST → można zapisać dowolne karty |
| `app/api/daily-sudoku/route.ts:24` | rozwiązanie sudoku wysyłane do przeglądarki, sprawdzanie w kliencie |
| `app/api/daily-minesweeper/route.ts:115` | cała plansza z minami wysyłana do przeglądarki |
| `components/shop/MinesweeperDialog.tsx:139-143` | wygrana = każda komórka odkryta **lub oflagowana** → oflagowanie wszystkich pól daje wygraną |
| `app/api/user/achievements/route.ts:26`, `badges/route.ts:24` | klient sam ogłasza, które osiągnięcia/odznaki zdobył |
| `app/api/user/achievements/claim/route.ts:10` | brak warunku `claimed_flag = false`; nagroda liczona w kliencie z tekstu (`AchievementTile.tsx:36`) → wielokrotny odbiór |
| `app/api/user/minigames/route.ts` | flaga „zagrano dziś” ustawiana dobrowolnie przez klienta; endpoint monet jej nie sprawdza |

- **Rekomendacja:** przenieść reguły (ceny, nagrody, losowanie+zapis, weryfikacja minigier,
  ewaluacja osiągnięć) na serwer; operacje na monetach atomowo (RPC/transakcja w Postgresie).
  Sudoku: serwer sprawdza planszę. Saper: walidacja ruchów po stronie serwera albo przynajmniej
  weryfikacja końcowego stanu.

## SEC-03 — HIGH — Podatne zależności

`next@15.4.6` — advisory critical (m.in. GHSA-9qr9-h5gf-34mp RCE w protokole React Flight,
kilka obejść middleware, SSRF, DoS). `jws` (GHSA-869p-cjfg-cm3x — weryfikacja HMAC, istotne
gdy zaczniemy weryfikować JWT). Pozostałe high: `nanoid`, `postcss`, `sharp`, `source-map-js`, `ws`.
**Rekomendacja:** aktualizacja `next` w obrębie linii 15.x do najnowszej łatki + `npm audit fix`.

## SEC-04 — MEDIUM — Wstrzyknięcie filtra PostgREST przy rejestracji

`app/api/register/route.ts:17` — `.or(\`email.eq.${email},username.eq.${username}\`)` interpoluje
dane użytkownika do składni filtra. Przecinki/nawiasy w polu zmieniają filtr → obejście sprawdzenia
duplikatów (skutek zależy od constraintów UNIQUE w bazie). **Fix:** dwa osobne `.eq()` + UNIQUE w bazie.

## SEC-05 — MEDIUM — Brak walidacji wejścia i rate limitingu

Brak walidacji formatu/długości emaila, nazwy, hasła (`register`, `user/update`, `feedback`).
Brak limitu prób logowania (brute force). Zmiana emaila/hasła i usunięcie konta bez podania
obecnego hasła. **Fix:** schemat walidacji (np. zod) w route handlerach, rate limit na login/register.

## SEC-06 — MEDIUM — Przechowywanie tokenu

Token w `localStorage` i w cookie bez `HttpOnly`/`Secure` (`context/authContext.tsx:71-73`) —
dostępny dla każdego skryptu (XSS → kradzież sesji). 30 dni, brak unieważniania.
Middleware sprawdza tylko obecność cookie (dowolna wartość przechodzi).

## SEC-07 — LOW — Ujawnianie błędów

Endpointy zwracają `error.message` z Postgresa, `api/achievements` cały obiekt błędu.

## SEC-08 — LOW — Brak nagłówków bezpieczeństwa

`next.config.ts` nie ustawia CSP, `X-Frame-Options`, `Referrer-Policy` itp.

## SEC-09 — INFO

- `lib/supabaseClient.ts` (klucz anon) nie jest nigdzie importowany → klucz nie trafia do bundla.
  Jeśli jednak RLS jest wyłączony, ktokolwiek z URL+anon key ma bezpośredni dostęp do tabel
  (w tym hashy haseł w `users`). **Do potwierdzenia w Supabase.**
- `API_NINJAS_KEY` w `.env.local` — nieużywany w kodzie.
- Sekretów w historii git nie znaleziono.

## Aktualizacja 2026-11-03 — sprawdzone na bazie

- **SEC-09 potwierdzone — HIGH:** RLS jest **wyłączony na wszystkich 15 tabelach w `public`**, w tym `users`
  z hashami haseł. Klucz anon nie trafia do bundla (nieużywany `supabaseClient`), więc tabele nie są otwarte
  przez samą stronę, ale każdy, kto ma URL projektu i klucz anon, może je czytać i modyfikować przez REST API
  Supabase. Włączenie RLS nie zmienia działania starej aplikacji (klucz service-role omija RLS).
- **Słaby sekret — MEDIUM:** `JWT_SECRET` w `.env.local` ma 11 znaków. Nowy kod używa `SESSION_SECRET` (min. 32).
- **Hasło do bazy** zostało podane w rozmowie. Po przełączeniu produkcji (faza 4) należy je zmienić
  (Database → Settings) razem z rotacją klucza service-role.
- Schemat `game`: RLS na wszystkich tabelach, brak polityk, schemat nie jest wystawiony przez REST API.

## Aktualizacja 2026-11-03 — RLS włączony na produkcji

Za zgodą właściciela włączono RLS na 15 tabelach w `public` (bez polityk, jedna transakcja).
Cofnięcie: `alter table public."<tabela>" disable row level security`.

| Sprawdzenie | Przed | Po |
|---|---|---|
| Klucz anon: `users`, `user_stats`, `cards` przez REST | 200, zwraca wiersze | 200, **0 wierszy** |
| Klucz service-role: te same tabele | zwraca wiersze | zwraca wiersze |
| Produkcja: `/api/sets`, `/api/achievements` | — | 200, 15 setów |

Luka była realna: test przed zmianą pokazał, że klucz anon czytał `users`. Sprawdzano tylko liczbę wierszy.
Crony działają jako właściciel tabel (`postgres`), więc RLS ich nie dotyczy; ich kolejny przebieg nie był obserwowany.

### Dostęp klucza anon zamknięty

Za zgodą właściciela: widok `user_unclaimed_achievements_flag` dostał `security_invoker = true`, a 5 funkcji
(`add_hourly_income`, `choose_daily_pack_for_today`, `delete_daily_sudoku`, `delete_daily_minesweeper`,
`log_daily_pack_history`) straciło `EXECUTE` dla `public`, `anon`, `authenticated`.

| Sprawdzenie | Wynik |
|---|---|
| Klucz anon: widok | 0 wierszy (wcześniej zwracał `uid` graczy) |
| Uprawnienia funkcji (`has_function_privilege`) | anon i authenticated: brak; service_role: jest |
| Klucz service-role: tabele i widok | zwraca wiersze |
| Produkcja: `/api/sets`, `/api/sets/random` | 200 |

Funkcje nie są `SECURITY DEFINER`, więc po włączeniu RLS wywołanie przez anon i tak nie zmieniałoby danych;
cofnięcie uprawnień to druga warstwa. Cofnięcia: `alter view ... reset (security_invoker)`, `grant execute ...`.

**SEC-01 nadal dotyczy starej aplikacji:** kto zna `uid`, może przejąć konto przez stare API. Znika przy przełączeniu (faza 4).
Pierwszy przebieg cronów po zmianach nie był jeszcze obserwowany (kolejne: 23:00 UTC).

## Aktualizacja 2026-11-04 — po przełączeniu produkcji

- **SEC-01 zamknięte na produkcji:** stare ścieżki API zwracają 404, nowe bez sesji 401. Stare tabele usunięte.

## SEC-10 — HIGH — Połączenie aplikacji z bazą bez szyfrowania (nowa wersja, wprowadzone w fazie 1)

- **Dowód:** `postgres.js` bez opcji `ssl` i adres bez `sslmode` dawały zwykłe TCP do poolera (0 wywołań `tls.connect`).
  Dotyczyło to ruchu Vercel → Supabase od przełączenia oraz skryptów uruchamianych lokalnie.
- **Skutek:** ktoś na trasie sieciowej mógłby odczytać lub zmienić ruch: e-maile, hashe haseł, stan gry.
  Nie sprawdzono, czy pooler uwierzytelnia hasłem jawnym, więc hasło do bazy traktujemy jako ujawnione.
- **Poprawka:** `secureConnectionUrl` wymusza TLS dla serwerów zdalnych (gałąź `fix/db-connection`). Pomiar: `encrypted = true`.
- **Pozostałe ryzyko — LOW:** certyfikat nie jest weryfikowany (`no-verify`), bo pooler używa CA Supabase.
  Chroni to przed podsłuchem, ale nie przed aktywnym podszyciem się pod serwer. Pełna weryfikacja wymaga certyfikatu CA z panelu Supabase.
- **Wymagane działanie właściciela:** zmiana hasła bazy po wdrożeniu poprawki.
