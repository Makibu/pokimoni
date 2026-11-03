# Pokimoni — przegląd projektu (rekonesans, 2026-11-03)

Stan bazowy: branch `master`, commit `70d47d8`, drzewo robocze czyste. Produkcja: https://pokimoni.vercel.app/ (Vercel).

## Czym jest aplikacja (wg kodu i README)

Przeglądarkowa gra kolekcjonerska w stylu Pokémon TCG Pocket (UI po polsku). Pętla gry:
monety → kupno paczki → losowanie 5 kart wg rzadkości → kolekcja → osiągnięcia/odznaki → monety.
Źródła monet: codzienne 300 monet, minigry dzienne (Sudoku, Saper), nagrody za osiągnięcia,
pasywny dochód z 2 slotów na karty (+X/h, limit 1000 monet).

## Stack

| Warstwa | Technologia |
|---|---|
| Framework | Next.js 15.4.6 (App Router, Turbopack w dev), React 19.1 |
| Język | TypeScript 5.9 (`strict: true`) |
| UI | Tailwind 4, shadcn/ui (Radix), framer-motion, lottie-react, sonner, vaul |
| Stan / dane | TanStack React Query 5 (globalnie `staleTime: Infinity`), React Context (auth) |
| Backend | Next.js Route Handlers (`app/api/**`) — 24 endpointy |
| Baza | Supabase Postgres, dostęp wyłącznie przez **service-role key** z serwera |
| Auth | Własne: tabela `users` + bcryptjs + JWT (jsonwebtoken, 30 dni) |
| Zewnętrzne | youdosudoku.com (generowanie sudoku), obrazy kart z images.pokemontcg.io |
| Testy / CI | **brak** |

## Struktura

```
app/                 strony (wszystkie "use client") + app/api/** route handlers
  api/               login, register, sets, cards, daily-sudoku, daily-minesweeper, user/*
components/
  ui/                shadcn (wygenerowane, nie audytowane jak kod własny)
  shop/ home/ data-display/ forms/ layout/ providers/
context/authContext  logowanie, ustawienia (localStorage)
hooks/queries/       9 hooków React Query, każdy sam czyta uid z localStorage
lib/                 typy, klienci Supabase, logika achievementów/odznak (klient), changelog
middleware.ts        przekierowanie na /login gdy brak cookie auth_token (pomija /api)
public/              obrazy, awatary, animacja Lottie
```

## Przepływ danych (stan obecny)

```
Przeglądarka                               Next API (Vercel)              Supabase
localStorage.user.uid ──► fetch(/api/...?uid=X) ──► supabaseServer (service role) ──► tabele
   ▲                          (brak weryfikacji JWT)       (RLS omijane)
   └─ logika gry: ceny, nagrody, sprawdzanie sudoku/sapera, achievementy, odznaki
```

Kluczowa obserwacja: serwer ufa klientowi co do tożsamości (`uid`) i co do wyników gry
(ilość monet, wylosowane karty, zdobyte osiągnięcia). Szczegóły: `SECURITY_AUDIT.md`.

## Elementy poza repozytorium (do potwierdzenia)

Kod zakłada istnienie w Supabase rzeczy, których nie ma w repo (brak migracji / schematu):
- tabele: `users, user_stats, user_cards, user_packs, user_achievements, user_badges, cards, sets,
  achievements, badges, feedback, daily_sudoku, daily_minesweeper`
- widok/tabela `user_unclaimed_achievements_flag`
- RPC `choose_daily_pack_for_today`
- zadania cykliczne (zapewne pg_cron): dochód godzinowy ze slotów z limitem 1000, reset
  `daily_coins_flag` / `sudoku_flag` / `minesweeper_flag`, czyszczenie `daily_sudoku` / `daily_minesweeper`
- status RLS na tabelach

## Wyniki poleceń (2026-11-03, Node 22.14, npm 10.9)

| Polecenie | Wynik |
|---|---|
| `npx tsc --noEmit` | Przed buildem: 2 błędy w nieaktualnym `.next/types` (usunięta trasa `api/user/sudoku`). Po świeżym buildzie: **0 błędów**. |
| `npx next lint` | 0 błędów, 11 ostrzeżeń (`<img>` zamiast `next/image` ×8, nieużywane `req` ×2, brak zależności w `useEffect` ×1) |
| `npx next build` | **sukces**, 32 trasy; największy First Load JS: `/` 248 kB, `/statistics` 232 kB |
| `npm audit --omit=dev` | 7 podatności: 1 critical (`next`), 6 high (`jws`, `nanoid`, `postcss`, `sharp`, `source-map-js`, `ws`) |
| testy | brak skryptu i plików testowych |
| sekrety w historii git | nie znaleziono (`.env*` w `.gitignore`) |
