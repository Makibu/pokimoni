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
