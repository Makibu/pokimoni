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
