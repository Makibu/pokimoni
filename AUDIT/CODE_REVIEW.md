# Code review — wstępne znaleziska (2026-11-03)

Fakty = zweryfikowane w kodzie. Hipotezy oznaczone „(hipoteza)”.

## Błędy funkcjonalne

| ID | Prio | Miejsce | Opis |
|---|---|---|---|
| BUG-01 | P1 | `app/api/user/feedback/route.ts:17` | brak `return` przy błędzie insertu → zawsze zwraca `success: true`, feedback może ginąć po cichu |
| BUG-02 | P1 | `components/shop/MinesweeperDialog.tsx:133-134` | po trafieniu miny `saveState(newBoard, lives)` zapisuje starą liczbę żyć → odświeżenie strony przywraca życie |
| BUG-03 | P1 | `components/shop/MinesweeperDialog.tsx:139-143` | warunek wygranej liczy pola oflagowane jak odkryte → oflaguj wszystko = wygrana |
| BUG-04 | P1 | `components/shop/OpenPackDialog.tsx:72-84` | monety pobierane przed losowaniem i zapisem kart, bez transakcji/zwrotu; toast „Zakupiono” przed zakupem |
| BUG-05 | P1 | `app/api/user/coins/route.ts:36-59` | read-modify-write bez atomowości → równoległe żądania mogą zgubić lub zdublować monety (np. podwójne „daily”) |
| BUG-06 | P2 | `components/data-display/AchievementTile.tsx:52-58` | wynik `claim` nie jest sprawdzany przed dodaniem monet |
| BUG-07 | P2 | `context/authContext.tsx:43-50,107` | `uid` ustawiane tylko gdy istnieje `user_settings` i tylko przy montowaniu; zaraz po pierwszym logowaniu `updateUser` wysyła `?uid=null` (hipoteza — do sprawdzenia w przeglądarce) |
| BUG-08 | P2 | `components/data-display/Balance.tsx:22` | `setInterval` w `setTimeout` nigdy nie czyszczony → mnożące się interwały |
| BUG-09 | P3 | `app/api/user/cards/route.ts:24` | filtr `cards.set_id` na zagnieżdżonym zasobie bez `!inner` zwraca też karty z innych setów z `cards: null` (hipoteza co do skutków w UI) |
| BUG-10 | P3 | Sudoku/Saper `toISOString()` | „dzisiaj” liczone w UTC w przeglądarce, reset dzienny w bazie — możliwa rozbieżność koło północy czasu PL (hipoteza) |

| BUG-11 | P1 | `components/home/UserMenu.tsx:106-117` + schemat | usunięcie konta: FK do `users` (`user_stats`, `user_cards`, …) bez widocznego `ON DELETE CASCADE` → DELETE zwraca 500, a klient nie sprawdza `res.ok`, pokazuje „Konto zostało trwale usunięte” i wylogowuje; konto zostaje (hipoteza — eksport Supabase może pomijać ON DELETE) |
| BUG-12 | P1 | `app/api/daily-sudoku/route.ts:14`, `daily-minesweeper/route.ts:110` | „plansza dnia” = jedyny wiersz tabeli (`.single()`), bez kolumny daty/UNIQUE. Dwa równoczesne pierwsze żądania po resecie wstawiają 2 wiersze → od tej chwili `.single()` zwraca błąd i każde żądanie generuje i wstawia nową planszę; gracze dostają różne plansze |
| BUG-13 | P2 | `components/data-display/CardTile.tsx:34-44` | panel po najechaniu pokazuje nazwę karty nawet dla nieposiadanych kart, gdy ustawienie ukrywa nazwy („???”) → ustawienie nie działa; nazwa wyświetlana 2× |
| BUG-14 | P3 | `components/data-display/CardTile.tsx:46` | `{income && …}` renderuje „0” dla kart z `income = 0` |
| BUG-15 | P3 | `app/achievements/page.tsx:62` | nagłówek skopiowany z kolekcji („Twój indeks kart… Kliknij w paczkę”) |
| BUG-16 | P3 | `app/achievements/page.tsx:22` | **potwierdzone danymi:** w bazie rzadkości osiągnięć to `common/rare/epic`, a sortowanie używa `Common/Rare/Epic` → porównanie `undefined - undefined = NaN`, kolejność osiągnięć przypadkowa |

## Baza danych (na podstawie `DB_SCHEMA_SNAPSHOT.sql`)

- **DB-01** `user_cards` nie ma `UNIQUE(uid, card_id)` — kod robi select→insert, więc przy wyścigu powstają duplikaty wierszy. Naturalny klucz to `(uid, card_id)`.
- **DB-02** Brak indeksów na kolumnach FK używanych w filtrach: `user_cards(uid)`, `user_packs(uid)`, `cards(set_id)`, `feedback(uid)` (Postgres nie indeksuje FK automatycznie).
- **DB-03** Brak `CHECK (coins >= 0)`, `CHECK (quantity > 0)`; `rarity`, `difficulty`, `class` jako dowolny tekst/liczba bez CHECK/enum.
- **DB-04** Liczniki `total_cards / total_unique_cards / total_packs` w `user_stats` są denormalizacją aktualizowaną ręcznie i nieatomowo — mogą rozjechać się z `user_cards`/`user_packs`. Przy wymianach kart rozjazd będzie pewny.
- **DB-05** Mieszane `timestamp` i `timestamptz`; `daily_pack` używa `CURRENT_DATE` (strefa serwera = UTC), a gracze są w PL → „dzień” zmienia się o 1:00/2:00.
- **DB-06** Niespójne nazewnictwo: `user_badges.user_id` vs `uid` wszędzie indziej; `daily_sudoku.id serial` vs `daily_minesweeper.id uuid`; `achievements.reward` jako jsonb tablica tekstów, z której klient regexem wyciąga kwotę.
- **DB-07** Odznaki zdefiniowane dwa razy: tabela `badges` i `lib/badgesData.ts` (warunki w kodzie); id muszą być ręcznie zsynchronizowane.
- **DB-09** `choose_daily_pack_for_today`: losowanie ważone jest wadliwe. `random()` w `WHERE` liczy się
  osobno dla każdego wiersza, a potem `ORDER BY random() LIMIT 1` wybiera losowo spośród przepuszczonych.
  Zestaw o najniższym `id` alfabetycznie przechodzi zawsze, a im dalej w alfabecie, tym rzadziej.
  O wyniku decyduje więc kolejność alfabetyczna, a nie wagi.
- **DB-10** Ta sama funkcja liczy „zużycie” z `daily_pack_history`, ale niczego do niej nie wstawia
  (wstawia do `daily_pack`). Jeśli nic innego nie zapisuje historii, kara za powtórki nie działa (hipoteza).
- **DB-11** Strefy czasowe: crony resetu chodzą o 23:00 UTC (północ zimą, 1:00 latem w PL), a paczka dnia
  zmienia się o 00:00 UTC (`current_date`). Monety dzienne i paczka dnia przełączają się o różnych godzinach.
- **DB-12** Dzienne resety oparte o flagi + cron: jeśli cron nie zadziała, nikt nie odbierze nagrody.
  Dwa wyłączone, zdublowane joby. Prostszy model to zapis daty odbioru (`daily_claimed_on date`)
  porównywanej z „dzisiaj w Europe/Warsaw” — bez cronów do resetów.
- **DB-13** `add_hourly_income()`: limit 1000 dotyczy **salda portfela**, a nie naliczonego dochodu.
  Gracz, który odkłada monety na droższą paczkę, przestaje zarabiać po przekroczeniu 1000, czyli
  mechanika karze oszczędzanie. Do tego dochód naliczany jest cronem co godzinę dla wszystkich graczy.
- **DB-14** Crony `daily_minigames_reset` czyszczą `daily_sudoku`/`daily_minesweeper` o 23:00 UTC; plansza
  powstaje leniwie przy pierwszym żądaniu (wyścig opisany w BUG-12).
- **DB-08** Brak migracji w repo — schematu, widoku, RPC i cronów nie da się odtworzyć ani zrecenzować.

## Architektura i spójność

- **ARCH-01** Brak warstwy auth po stronie serwera; `uid` czytany z `localStorage` w 13 plikach
  (ten sam boilerplate `useEffect` w każdym hooku).
- **ARCH-02** Logika domenowa w kliencie: ceny paczek, nagrody minigier (zduplikowane w 2 plikach),
  ewaluacja osiągnięć i odznak (`lib/checkUser*.ts` woła API z przeglądarki).
- **ARCH-03** `rarityOrder` zduplikowany w 5 plikach; wagi losowania w `cards/[setId]/random`
  powtórzone 3× dla pozycji 0–2.
- **ARCH-04** Schemat bazy, RPC, crony i RLS poza repo — brak migracji, projekt nieodtwarzalny.
- **ARCH-05** Niespójne kształty odpowiedzi API (`{data}`, `{userCards}`, surowy obiekt;
  `/api/badges` zwraca klucz `achievements`), mieszane PL/EN w komunikatach, snake/camel w polach.
- **ARCH-06** Klucze React Query niespójne (`["achievements", uid]` vs `["userAchievements"]`),
  globalne `staleTime: Infinity` + ręczne invalidacje rozsiane po komponentach.
- **ARCH-07** Wszystkie strony są client components; `lang="en"` przy polskim UI.
- **ARCH-08** Brak testów, CI, formattera; martwy kod (`supabaseClient`, zakomentowany JSX).

## Wydajność (potencjalne, bez pomiarów)

- **PERF-01** `/api/user/stats`: ~10 sekwencyjnych zapytań, pobiera wszystkie `user_cards` z obrazkami;
  wywoływany m.in. po każdej zmianie slotu.
- **PERF-02** `POST /api/user/cards`: 2 zapytania na kartę sekwencyjnie + 4 kolejne (≈14 round-tripów na paczkę).
- **PERF-03** Otwarcie paczki = ~8 żądań z klienta (monety, losowanie, zapis, badges, rarity-stats,
  achievements ×2, invalidacje).
- **PERF-04** `<img>` zamiast `next/image` (8 miejsc), duże tła JPG.

## UX / responsywność (wstępne)

- `OpenPackDialog` w fazie odkrywania ma sztywne `w-[900px] h-[500px]` (tylko ekran startowy ma wariant mobilny).
- `AchievementTile` ma `w-[400px]` — przepełnienie na małych telefonach (hipoteza, do sprawdzenia w przeglądarce).
- Puste `<DialogTitle/>` (ostrzeżenia a11y Radix), klikalne `div` bez obsługi klawiatury.
- Stany ładowania to goły tekst „Ładowanie...”, błędy bez akcji ponowienia.
