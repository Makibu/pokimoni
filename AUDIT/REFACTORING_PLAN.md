# Plan refaktoryzacji i wdrożenia (propozycja do akceptacji, 2026-11-03)

Podstawa: `PRODUCT_SPECIFICATION.md` (F1–F20), `GAP_ANALYSIS.md`, `TARGET_ARCHITECTURE.md`.

## Strategia

- **Charakter zmian:** backend i większość UI powstają od nowa; z obecnego kodu zostają komponenty
  shadcn, część widoków (kolekcja, statystyki, nawigacja) i assety. Zachowanie funkcji jest
  zdefiniowane przez specyfikację, nie przez obecny kod.
- **Gałęzie:** praca na `rebuild`. Każda faza = osobny PR do `rebuild` (do przejrzenia osobno).
  `master` (produkcja na Vercel) nie zmienia się aż do przełączenia w fazie 4.
- **Baza bez przestojów:** nowe tabele w schemacie Postgresa **`game`** w tym samym projekcie Supabase.
  Stara aplikacja dalej działa na `public`. Stare tabele usuwamy dopiero przy przełączeniu — jedyna
  nieodwracalna operacja, wykonywana **po osobnej zgodzie właściciela**.
- **Testy lokalne bez Dockera:** integracyjne na PGlite; E2E na PGlite wystawionym jako serwer
  Postgresa (`pglite-socket`) — do weryfikacji w fazie 0; w CI zwykły kontener Postgres.
- **Bramka po każdym kroku:** `lint` + `typecheck` + `test` + `build` zielone; wynik w `IMPLEMENTATION_LOG.md`.

## Fazy

### Faza 0 — Fundamenty narzędziowe (P0)

| # | Zmiana | Pliki | Ryzyko | Weryfikacja |
|---|---|---|---|---|
| 0.1 | Gałąź `rebuild`; commit dokumentów `AUDIT/` | `AUDIT/*` | — | `git log` |
| 0.2 | **Eksport katalogu** (sets, cards, achievements, badges) z obecnej bazy do `data/catalog/*.json` skryptem tylko do odczytu | `scripts/export-catalog.ts`, `data/catalog/` | Niski; **musi być przed jakimkolwiek resetem** | liczności: 15 setów, 3169 kart, 34 osiągnięcia, 9 odznak |
| 0.3 | Next.js 16, React 19.2, aktualizacja zależności; ESLint przez CLI (`next lint` usunięte w 16); `npm audit` bez high/critical | `package.json`, `eslint.config.mjs`, `next.config.ts` | Średnie — zmiany API w 16 | build + ręczne przejście starej aplikacji lokalnie |
| 0.4 | Przeniesienie do `src/`; Prettier; Vitest; Playwright; `.env.example`; GitHub Actions (lint, typecheck, test, build) | konfiguracje, `.github/workflows/ci.yml` | Niskie | zielone CI na PR |

### Faza 1 — Baza i domena (P0)

| # | Zmiana | Ryzyko | Weryfikacja |
|---|---|---|---|
| 1.1 | Schemat Drizzle w `game` (wszystkie tabele z `TARGET_ARCHITECTURE.md` §5), migracje, RLS, seed z `data/catalog` | Średnie — projekt modelu | migracje na PGlite od zera; seed daje poprawne liczności |
| 1.2 | `domain/`: rarity, game-day, packs (3 tabele szans), economy (ceny, streak, skarbonka), limit 9 | Niskie | testy unit: rozkład 100k paczek, granice doby 10:00 i zmiany czasu, streak, skarbonka |
| 1.3 | Harness testów integracyjnych (PGlite + migracje + seed na test) | Niskie | przykładowy test przechodzi |

### Faza 2 — Konta i sesje (P0) — F1

| # | Zmiana | Weryfikacja |
|---|---|---|
| 2.1 | `server/auth`: hasła (bcrypt), sesja JWT `jose` w ciasteczku HttpOnly, `token_version`, rate limit, `withUser()`, `proxy.ts` | testy: brak/zły/wygasły token → 401; unieważnienie po zmianie hasła |
| 2.2 | API: register, login, logout, me, update (hasło wymagane przy email/hasło), delete | testy API + walidacja zod; nick case-insensitive |
| 2.3 | UI logowania/rejestracji/profilu na nowym API; usunięcie `localStorage` z tożsamością i `AuthContext` z logiką sieciową | E2E: rejestracja → wylogowanie → logowanie |

### Faza 3 — Rdzeń gry na nowym backendzie (P0/P1) — F3, F4, F6, F7, F8, F11–F14, F20

| # | Zmiana | Weryfikacja |
|---|---|---|
| 3.1 | Serwis ekonomii (dziennik, saldo ≥ 0) + nagroda dzienna ze streakiem | testy: podwójny odbiór w wyścigu → jeden sukces |
| 3.2 | Sklep, paczka dnia (naprawione losowanie), zakup i otwarcie paczki w jednej transakcji, darmowe paczki, limit 9 | testy: brak środków, wyścig dwóch zakupów, nadwyżka „LIMIT” |
| 3.3 | Sloty + skarbonka (rozliczenie przy zmianie karty) | testy: pojemność 300, zmiana karty rozlicza naliczone |
| 3.4 | Osiągnięcia i odznaki oceniane w serwisach; odbiór jednorazowy; nagrody monety/paczki | testy: podwójny odbiór → jeden sukces |
| 3.5 | Kolekcja, statystyki (z faktycznych tabel), feedback (BUG-01) | testy API |
| 3.6 | Podpięcie istniejących widoków (home, sklep, kolekcja, osiągnięcia, statystyki) pod nowe API; tymczasowo proste otwieranie paczki; usunięcie starych endpointów, Sudoku, Sapera, `lib/checkUser*`, `supabaseClient` | E2E: dzienna nagroda → zakup → kolekcja → osiągnięcie |

### Faza 4 — Przełączenie produkcji (P0) — **wymaga osobnej zgody**

| # | Zmiana | Weryfikacja |
|---|---|---|
| 4.1 | Zmienne na Vercel (`DATABASE_URL` poolera, nowy `SESSION_SECRET`); migracje + seed na produkcyjnym projekcie | `drizzle-kit migrate` bez błędów |
| 4.2 | Merge `rebuild` → `master`, deploy | smoke test na produkcji: rejestracja, paczka |
| 4.3 | Wyłączenie cronów; **usunięcie starych tabel w `public`**; rotacja klucza service-role (nie będzie już używany) | lista tabel `public` pusta; crony nieaktywne |

Od tej chwili kolejne fazy trafiają na produkcję normalnym PR-em do `master`.

### Faza 4.5 — System designu i przebudowa widoków (P1) — dodana 2026-11-04 na prośbę właściciela

Przed fazami 5–7, aby nowe ekrany od razu powstawały w docelowym stylu. Po fazie 4, aby przebudowa
nie opóźniała usunięcia luk starej wersji z produkcji.

| # | Zmiana | Weryfikacja |
|---|---|---|
| 4.5.1 | Kierunek wizualny: 2–3 propozycje głównego ekranu, wybór właściciela. Własna oprawa, bez kopiowania wyglądu istniejących aplikacji | akceptacja właściciela przed kodem |
| 4.5.2 | System designu: tokeny kolorów, typografia, odstępy, wspólne komponenty, stany ładowania / puste / błędów | przegląd komponentów w obu motywach |
| 4.5.3 | Tryb ciemny (jasny / ciemny / systemowy), przeniesiony z fazy 8 | E2E przełączania; kontrast w obu motywach |
| 4.5.4 | Układ i nawigacja na desktopie i telefonie, w tym pasek boczny zasłaniający treść przy 1280 px | zrzuty 360/768/1280/1920 |
| 4.5.5 | Przebudowa widoków: logowanie, strona główna, sklep, kolekcja, osiągnięcia, statystyki | E2E bez regresji, zrzuty do akceptacji właściciela |

Zmiana dotyczy wyglądu i obsługi. Reguły gry i API pozostają bez zmian.

Wybrany kierunek: B „Holo”. Ustalenia przy realizacji:

- 5 zestawów na poziom mieści się na desktopie w siatce, więc znika karuzela z przejmowaniem kółka myszy; niżej zwykłe przewijanie w poziomie.
- Opisy odznak są widocznym tekstem zamiast dymków, które nie działały dotykiem.
- Kafelki strony głównej są pastelowe, bez banerów z grafikami Pokémon.
- Obrazki kart pozostają bez optymalizacji Vercela (limit darmowego planu); mają placeholder, płynne pojawianie się i tekst zastępczy.
- Funkcje z faz 5–7 nie istnieją jeszcze w kodzie, więc nie ma ich atrap w interfejsie (np. dzwonka). Powstaną od razu w tym stylu.

### Faza 5 — Nowe otwieranie paczek (P1) — F5

Rozcinanie gestem, odkrywanie po kolei z efektami rzadkości, podsumowanie z „NOWA”/„LIMIT”, podgląd
karty, „Pomiń”, `prefers-reduced-motion`, 360 px+. Weryfikacja: E2E na 360 px i desktop, przejście klawiaturą,
zrzuty ekranu do akceptacji właściciela.

Stan: zamknięta, na produkcji (`d323fd3`, poprawka migania okien `b8a0199`); szczegóły w `IMPLEMENTATION_LOG.md`. Bez zmian zasad gry, API i bazy.

### Faza 6 — Funkcje społeczne (P1) — F15–F18

| # | Zmiana | Weryfikacja |
|---|---|---|
| 6.1 | Powiadomienia + inbox (czerwona kropka, oznaczanie przy otwarciu) | testy API, E2E |
| 6.2 | Znajomi: zaproszenia po nicku, akceptacja, usuwanie | testy: duplikat zaproszenia, zaproszenie do siebie |
| 6.3 | Profil pop-up: gablota 5, 3 statystyki, odznaki, edycja własnego | testy: karta spoza kolekcji nie wchodzi do gabloty |
| 6.4 | Wymiany: escrow, limit 1 oferty na kierunek, akceptacja/odrzucenie/anulowanie, „LIMIT”, gabloty | testy integracyjne pełnego cyklu, wyścig akceptacja vs anulowanie, karta w slocie |

Stan: na produkcji (`b87f13c`), czeka na test właściciela na dwóch kontach. Bez migracji bazy; szczegóły w `IMPLEMENTATION_LOG.md`.

### Faza 7 — Dzienne aktywności (P2) — F9, F10

| # | Zmiana |
|---|---|
| 7.1 | Zadania dzienne (pula solo, postęp w serwisach, odbiór) |
| 7.2 | Silnik minigry dnia (losowanie 1 z 9 per `game_day`, stan na serwerze, jedna nagradzana próba) |
| 7.3 | „Kto to Pokémon?” (3 poziomy) |
| 7.4 | Memory (3 poziomy) |
| 7.5 | Puzzle przesuwne (3 poziomy) |

Każda gra: walidator w `domain/` z testami (wygrana, przegrana, próba oszustwa), osobny PR.

### Faza 8 — Jakość produktu (P2/P3) — F2, F19

Końcowy przegląd responsywności (360/768/1280/1920) i dostępności; `lang="pl"`, metadane i OG
strony logowania; nagłówki bezpieczeństwa; README (architektura, uruchomienie, decyzje, zrzuty);
symulacja ekonomii jako test.

### Faza 9 — Audyt końcowy (P1)

Ponowny audyt wg etapów I–VI, porównanie przed/po, `FINAL_REPORT.md`, `TEST_REPORT.md`.

## Ryzyka

| Ryzyko | Skutek | Ograniczenie |
|---|---|---|
| Utrata danych katalogu przy resecie | Brak kart w grze | Eksport w 0.2 przed czymkolwiek; reset dopiero w 4.3 |
| Limit połączeń darmowego Supabase na Vercelu | Błędy połączeń | Pooler w trybie transakcyjnym, `prepare: false`, mała pula |
| `pglite-socket` niewystarczający do E2E lokalnie | Wolniejsza pętla testów | Fallback: E2E tylko w CI (kontener Postgres) |
| Zmiany API Next.js 16 | Błędy buildu | Aktualizacja jako osobny krok 0.3, przed przepisywaniem |
| Zakres (dużo nowych funkcji) | Długi czas do pierwszego efektu | Kolejność faz: najpierw grywalny i bezpieczny rdzeń (fazy 0–4), potem nowości |
