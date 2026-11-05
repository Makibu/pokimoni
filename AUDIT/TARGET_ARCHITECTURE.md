# Docelowa architektura (propozycja do akceptacji, 2026-11-03)

## 1. Zasady

1. **Serwer jest źródłem prawdy.** Klient wysyła intencje („kup paczkę setu X”), nigdy wyniki
   („dodaj mi 5 kart”, „dodaj 250 monet”).
2. **Każda operacja zmieniająca stan gry to jedna transakcja bazodanowa.**
3. **Reguły gry to czyste funkcje TypeScript** bez I/O — testowalne jednostkowo, z wstrzykiwanym RNG i zegarem.
4. **Ograniczenia w bazie** (UNIQUE, CHECK, FK) są ostatnią linią obrony — kod nie może ich obejść.
5. **Prosto.** Mała skala: bez kolejek, cache'y, websocketów i mikroserwisów.

## 2. Stack — decyzje

| Obszar | Teraz | Docelowo | Uzasadnienie |
|---|---|---|---|
| Framework | Next.js 15.4.6 | **Next.js 16** (aktualna stabilna), React 19.2 | Krytyczne advisory w 15.4; i tak przepisujemy większość, więc koszt skoku jest najniższy teraz. W 16 `middleware.ts` nazywa się `proxy.ts`. |
| Dostęp do bazy | `supabase-js` (REST/PostgREST) kluczem service-role | **Drizzle ORM + `pg`** przez pooler Supabase (początkowo `postgres.js`, zmienione 2026-11-04, zob. `IMPLEMENTATION_LOG.md`) | supabase-js **nie ma transakcji** — atomowe wymiany i zakupy wymagałyby całej logiki w PL/pgSQL. Drizzle daje transakcje w TS, typowany schemat, migracje bez Dockera i testy na PGlite. Supabase zostaje jako hostowany Postgres. |
| Migracje | brak | **drizzle-kit** → pliki SQL w `drizzle/` | Odtwarzalny schemat; `drizzle-kit migrate` działa bez Dockera. |
| Auth | jsonwebtoken, token w localStorage | **jose** + bcryptjs, ciasteczko `HttpOnly; Secure; SameSite=Lax` | `jose` działa w każdym runtime (Node i Edge), bez zależności od podatnego `jws`. |
| Walidacja | brak | **zod** | Jeden schemat na wejście każdego endpointu; typy wywnioskowane. |
| Stan klienta | React Query + uid z localStorage | React Query + **fabryka kluczy**; tożsamość z sesji (serwer) | Usuwa 13 kopii boilerplate'u i niespójne klucze. |
| Motyw | atrapa | **next-themes** (już w zależnościach) + tokeny CSS | Prawdziwy tryb ciemny. |
| Animacje | framer-motion (nieużywana) | **CSS + Pointer Events, bez biblioteki** | Zmiana względem pierwszego planu: otwieranie paczek nie potrzebowało biblioteki, a `framer-motion` nie był nigdzie importowany, więc usunięty (faza 5). |
| Testy | brak | **Vitest** (unit + integracja na **PGlite**), **Playwright** (E2E) | PGlite = Postgres w procesie testów, bez Dockera. |
| CI | brak | **GitHub Actions**: lint, typecheck, test, build | Repo już na GitHubie. |
| Hosting | Vercel + Supabase | bez zmian, funkcje w `fra1` (`vercel.json`) | Baza jest w `eu-central-1`; każde zapytanie z `iad1` przelatywało przez Atlantyk. |

**Alternatywa odrzucona:** zostać przy supabase-js i pisać operacje jako funkcje PL/pgSQL wołane przez RPC.
Działa, ale logika gry (paczki, wymiany, zadania, minigry) w SQL jest trudniejsza do czytania,
testowania i pokazania w portfolio. Wybieram ją tylko, jeśli właściciel chce zostać przy supabase-js.

## 3. Warstwy

```
UI (app/, features/)          komponenty, React Query, animacje — zero reguł gry
   │ fetch JSON
API (app/api/**/route.ts)     cienkie: sesja → zod → serwis → mapowanie błędów na HTTP
   │
Serwisy (server/services)     przypadki użycia w transakcji: kup paczkę, zaakceptuj wymianę…
   │                 └──────► Domena (domain/) — czyste funkcje: losowanie, doba gry, streak,
   │                                              skarbonka, warunki osiągnięć, walidacja minigier
Baza (server/db)              schemat Drizzle, klient, migracje
```

Reguła zależności: `domain` nie importuje niczego z projektu; `services` importują `domain` i `db`;
`app/api` importuje tylko `services` i `server/http`; UI nie importuje niczego z `server/`.

## 4. Drzewo projektu

```
src/
  app/
    (auth)/login/page.tsx            logowanie / rejestracja
    (game)/layout.tsx                serwerowy layout: sprawdza sesję, nawigacja, inbox
    (game)/page.tsx                  strona główna (sloty, nagroda dzienna, zadania)
    (game)/shop/  collection/  achievements/  statistics/  friends/  minigame/
    api/                             route handlery (auth, shop, packs, collection, slots, daily,
                                     quests, minigame, achievements, friends, trades, profile,
                                     notifications, feedback)
  domain/
    rarity.ts                        jedna definicja rzadkości i kolejności
    game-day.ts                      doba gry: 10:00 Europe/Warsaw
    packs.ts                         tabele szans per poziom, losowanie, god pack, limit 9
    economy.ts                       ceny, streak, skarbonka, nagrody
    achievements.ts  badges.ts       warunki
    quests.ts                        pula zadań i postęp
    minigames/                       who-is-it.ts, memory.ts, sliding-puzzle.ts (generowanie + walidacja + widok bez odpowiedzi)
    trades.ts                        reguły dostępności egzemplarzy
  server/
    db/schema.ts  db/client.ts
    auth/session.ts  password.ts  rate-limit.ts
    http/handler.ts                  withUser(), parse(zod), AppError → JSON
    services/                        packs, economy, collection, achievements, quests, minigames,
                                     friends, trades, profile, notifications, feedback, account
  features/                          UI per funkcja: pack-opening/, collection/, social/ (skrzynka,
                                     znajomi, profil, wymiany), shop/, daily/ (zadania i minigra)
  components/ui/                     shadcn
  lib/                               api-client.ts, query-keys.ts, utils.ts
drizzle/                             migracje SQL (generowane)
scripts/                             export-catalog.ts (dump kart/setów z obecnej bazy), seed.ts
tests/
  unit/  integration/  e2e/
```

## 5. Model danych (szkic)

Wszystkie znaczniki czasu `timestamptz`; „doba gry” zapisywana jako `date` (`game_day`).

| Tabela | Kluczowe kolumny / ograniczenia |
|---|---|
| `users` | `id uuid PK`, `username` (wyświetlany), `username_key` = lower(username) **UNIQUE**, `email` UNIQUE (lower), `password_hash`, `avatar`, `token_version int`, `created_at` |
| `player_state` | `user_id PK`, `coins int CHECK ≥ 0`, `piggy_last_collected_at`, `streak_day 0–7`, `last_daily_claim_day date`, `slot_1_card_id`, `slot_2_card_id` |
| `coin_ledger` | `user_id`, `amount`, `reason` (enum), `ref`, `created_at` — dziennik każdej zmiany salda |
| `sets` | `id PK`, `name`, `series`, `tier 1–3`, `total`, `images`, `release_date` |
| `cards` | `id PK`, `set_id FK` (indeks), `name`, `rarity` (enum), `income`, `images` |
| `user_cards` | **PK (`user_id`, `card_id`)**, `quantity CHECK 1–9`, `first_acquired_at` |
| `pack_openings` | `id`, `user_id` (indeks), `set_id`, `source` (shop/daily/voucher), `price`, `cards jsonb` (5 × id + over_limit), `is_god_pack`, `created_at` |
| `pack_vouchers` | PK (`user_id`, `tier`), `quantity CHECK ≥ 0` — darmowe paczki z osiągnięć |
| `daily_pack` | `game_day PK`, `set_id` — wstawiane `ON CONFLICT DO NOTHING` (brak wyścigu) |
| `achievements` / `user_achievements` | warunek (`type`, `amount`), nagroda (`reward_coins` lub `reward_pack_tier`+`qty`); `claimed_at` — odbiór raz |
| `badges` / `user_badges` | jedno źródło definicji (seed) |
| `daily_quests` | PK (`user_id`, `game_day`, `slot`), `quest_type`, `target`, `progress`, `claimed_at` |
| `minigame_days` | `game_day PK`, `game`, `difficulty`, `payload jsonb` (obecnie puste: wariant jest wspólny, a karty są osobne dla każdego gracza i leżą w `minigame_attempts.state`) |
| `minigame_attempts` | PK (`user_id`, `game_day`), `state jsonb` (z odpowiedziami, klient dostaje tylko widok bez nich), `status`, `reward`, `finished_at` |
| `friend_requests` | `from_user`, `to_user`, `status`; częściowy UNIQUE na parę dla `pending` |
| `friendships` | PK (`user_a`, `user_b`) z `CHECK user_a < user_b` |
| `trades` | `from_user`, `to_user`, `offered_card_id`, `requested_card_id`, `status`, `created_at`, `resolved_at`; **częściowy UNIQUE (`from_user`, `to_user`) WHERE status = 'pending'** = limit 1 oferty na kierunek |
| `showcase` | PK (`user_id`, `position 1–5`), `card_id` |
| `profile_stats` | PK (`user_id`, `position 1–3`), `stat_key` (enum) |
| `notifications` | `user_id` (indeks), `type`, `payload`, `created_at`, `read_at` |
| `feedback` | bez zmian (+ `timestamptz`) |
| `auth_attempts` | rate limit logowania (klucz, okno, licznik) |

Escrow nie wymaga osobnej tabeli: egzemplarze w escrow = liczba ofert `pending` z danym
`offered_card_id`; dostępne = `quantity − sloty − escrow` (liczone w transakcji z `FOR UPDATE`).

Stan po fazie 6: `FOR UPDATE` zakładany jest na wierszach `player_state`, nie `user_cards`. Każda operacja zmieniająca karty lub sloty gracza najpierw blokuje jego wiersz, a wymiana blokuje obu graczy w stałej kolejności identyfikatorów, co wyklucza zakleszczenie między nimi. Wiersza `user_cards` może jeszcze nie być, a `player_state` jest zawsze.

Wszystkie FK do `users` z `ON DELETE CASCADE`. **RLS włączony na każdej tabeli bez polityk** —
publiczne API Supabase (PostgREST) nie ma dostępu do niczego; aplikacja łączy się bezpośrednio.

## 6. Kluczowe przepływy

**Zakup paczki** — `POST /api/packs/open {setId, source}` → w transakcji: zablokuj `player_state`
→ cena z domeny → sprawdź saldo → pobierz monety + wpis w `coin_ledger` → losuj 5 kart (domena)
→ upsert `user_cards` z limitem 9 → `pack_openings` → postęp zadań → ocena osiągnięć/odznak
→ powiadomienia → odpowiedź z kartami (flagi `isNew`, `overLimit`). Klient dopiero wtedy animuje.

**Akceptacja wymiany** — w transakcji: zablokuj ofertę i wiersze `user_cards` obu stron w stałej
kolejności (unikanie deadlocków) → sprawdź status `pending`, znajomość, dostępność egzemplarza
odbiorcy → przenieś egzemplarze (limit 9 → nadwyżka przepada) → popraw gabloty → status
`accepted` → powiadomienie nadawcy.

**Doba gry** — `gameDay(now)` = data w Europe/Warsaw dla `now − 10h`. Jedna funkcja w domenie, używana
przez streak, zadania, minigrę i paczkę dnia. Brak cronów: stan „dzienny” to wiersze kluczowane `game_day`.

## 7. Bezpieczeństwo

- `proxy.ts` weryfikuje podpis JWT dla stron; każdy route handler woła `withUser()` (weryfikacja +
  `token_version`). Brak parametru `uid` w API.
- CSRF: `SameSite=Lax` + wymóg `Content-Type: application/json` + sprawdzenie nagłówka `Origin` dla metod modyfikujących.
- Walidacja zod; komunikaty błędów bez szczegółów bazy; logi błędów po stronie serwera.
- Nagłówki: CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` w `next.config.ts`.
- Sekrety tylko w zmiennych środowiskowych Vercel; `.env.example` w repo bez wartości.

## 8. Testy

| Poziom | Narzędzie | Zakres |
|---|---|---|
| Unit | Vitest | cała `domain/`: rozkład losowania (100k paczek), doba gry na granicach 10:00 i zmianie czasu, streak, skarbonka, walidatory minigier |
| Integracja | Vitest + PGlite + migracje | serwisy: zakup bez środków, limit 9, wyścig dwóch zakupów, pełny cykl wymiany, limit ofert, usunięcie konta |
| API | Vitest (wywołanie handlerów) | brak sesji → 401, walidacja → 400, cudze zasoby niedostępne |
| E2E | Playwright | rejestracja → nagroda dzienna → zakup i otwarcie paczki → kolekcja; zaproszenie → wymiana; widoki 360 px i desktop |

## 9. Decyzje

1. **Drizzle + bezpośrednie połączenie z Postgresem** zamiast supabase-js — zaakceptowane 2026-11-03.
2. **Next.js 16** — przyjęte razem z architekturą (brak sprzeciwu właściciela).
3. **Nowe tabele w osobnym schemacie Postgresa `game`** podczas przebudowy — stara aplikacja na
   produkcji działa na `public` bez zmian aż do przełączenia; dopiero wtedy stare tabele są usuwane.
