# Postęp audytu

Ostatnia aktualizacja: 2026-11-04

| Etap | Status | Uwagi |
|---|---|---|
| I. Rekonesans repo, stack, stan git | DONE | `PROJECT_OVERVIEW.md` |
| I. Lint / typecheck / build / audit | DONE | wszystko przechodzi; 7 podatnych zależności |
| II. Code review | DONE (statycznie) | `CODE_REVIEW.md` — BUG-01..16, DB-01..08, ARCH, PERF |
| III. Audyt bezpieczeństwa | IN PROGRESS | `SECURITY_AUDIT.md`; RLS sprawdzony: wyłączony na `public` |
| IV. Wydajność | NOT STARTED | tylko obserwacje statyczne; pomiary po postawieniu środowiska dev |
| V. SEO / UX / responsywność | NOT STARTED | E2E działa na PGlite; przegląd UX po podpięciu widoków w fazie 3 |
| VII. Wywiad produktowy + specyfikacja | DONE | `PRODUCT_SPECIFICATION.md`; otwarte tylko liczby ekonomii i „Premium” |
| VIII. Gap analysis | DONE | `GAP_ANALYSIS.md` |
| IX. Docelowa architektura | DONE | `TARGET_ARCHITECTURE.md` — Drizzle zaakceptowany |
| X. Plan refaktoryzacji | DONE | `REFACTORING_PLAN.md` — zaakceptowany |
| XI. Faza 0 — fundamenty | DONE | `IMPLEMENTATION_LOG.md`; PR `phase-0` → `rebuild` |
| XI. Faza 1 — baza i domena | DONE | `IMPLEMENTATION_LOG.md`; gałąź `phase-1` |
| XI. Faza 2 — konta i sesje | DONE | `IMPLEMENTATION_LOG.md`; gałąź `phase-2` |
| XI. Faza 3 — rdzeń gry | DONE | `IMPLEMENTATION_LOG.md`; gałąź `phase-3` |
| XI. Faza 4 — przełączenie produkcji | DONE | produkcja na `7272fef`, stare obiekty usunięte, połączenie z bazą poprawione; test i rotacja potwierdzone przez właściciela |
| XI. Faza 4.5 — system designu i przebudowa widoków | DONE | kierunek B „Holo”; na produkcji `1a61348`, region `fra1`. Właściciel przeszedł do fazy 5, ale osobnego potwierdzenia testu na koncie nie ma (pytanie 9) |
| XI. Faza 5 — nowe otwieranie paczek | IN PROGRESS | wdrożona za zgodą właściciela (`d323fd3`), poprawka migania okien po zgłoszeniu właściciela (`b8a0199`); czeka na test właściciela na koncie |
| XI. Fazy 6–9 | NOT STARTED | |

## Ustalenia

- 2026-11-03: projekt portfolio + znajomi, dopuszczalny pełny reset danych, brak pilnych wdrożeń;
  planowane wymiany kart i publiczne profile. Schemat tabel w `DB_SCHEMA_SNAPSHOT.sql`.
- 2026-11-03: **auth — zostaje własny JWT** (decyzja właściciela, odrzucono Supabase Auth).
  Wymagania techniczne wynikające z decyzji:
  - token tylko w cookie `HttpOnly; Secure; SameSite=Lax`, ustawianym przez serwer; usunięcie z `localStorage`;
  - weryfikacja biblioteką `jose` (działa w Edge middleware; `jsonwebtoken` nie działa, a jego zależność `jws` ma advisory high);
  - jeden helper `requireUser()` w każdym route handlerze, `uid` wyłącznie z tokenu, parametr `uid` usunięty z API;
  - middleware weryfikuje podpis, a nie samą obecność cookie;
  - krótszy czas życia sesji + `token_version` w `users` do unieważniania (wylogowanie wszędzie, zmiana hasła);
  - rate limit logowania/rejestracji, walidacja danych, wymóg obecnego hasła przy zmianie emaila/hasła i usunięciu konta;
  - RLS włączony na wszystkich tabelach bez polityk dla `anon` (dostęp tylko przez serwer kluczem service-role);
  - reset hasła mailem — poza zakresem, chyba że właściciel zdecyduje inaczej.

- 2026-11-03: brak Dockera i wolnych projektów Supabase; produkcję można wyczyścić i postawić od nowa.
  Plan środowiska: schemat jako migracje SQL w repo (`supabase/migrations`), wgrywane przez Supabase CLI
  `db push` (nie wymaga Dockera); do czasu ponownego startu jedyny projekt służy jako dev.
  Testy logiki SQL bez Dockera: PGlite (Postgres w WASM) w testach — do potwierdzenia przy projektowaniu.
- 2026-11-03: wymiany 1:1 tylko między znajomymi, akceptacja/odrzucenie, bez monet,
  karty w slocie dochodu zablokowane. Otrzymano: funkcję `choose_daily_pack_for_today`, widok, listę cronów.

- 2026-11-03: zasady wymian, znajomych (inbox, nick unikalny), profilu publicznego (do 3 statystyk + gablota)
  w `PRODUCT_SPECIFICATION.md`. Sudoku i Saper do usunięcia. Otrzymano `add_hourly_income`, joby resetu.
  Odczytano dane ekonomii z bazy (skrypt tylko do odczytu, nic nie zapisano).

- 2026-11-03: streak z limitem, zadania tylko solo, rotacja 9 wariantów minigier, gablota 5 kart,
  inbox globalny z czerwoną kropką, lista statystyk profilu zaakceptowana.

- 2026-11-03: doba gry od 10:00 Europe/Warsaw; nick case-insensitive w wyszukiwaniu; hasło min. 8 dowolnych; profil jako pop-up; 10. egzemplarz z paczki i z wymiany przepada (oznaczenie „LIMIT”); cel ~5 paczek dziennie.
- 2026-11-03: minigry zaakceptowane; osiągnięcia mogą dawać paczki; limit 9 egzemplarzy karty bez
  sprzedaży; otwieranie paczek do całkowitej przebudowy. Spisano specyfikację v1 do weryfikacji.

- 2026-11-03: Drizzle ORM zaakceptowany (Next.js 16 przyjęty razem z architekturą).
- 2026-11-04: właściciel przetestował lokalnie fazę 3 („działają”). Dodano fazę 4.5: pełna przebudowa UI/UX,
  przed nowymi funkcjami; tryb ciemny przeniesiony z fazy 8.

- 2026-11-04: właściciel wybrał klimat „jasny i kolorowy” oraz kierunek B „Holo”; wszystkie podstrony w nowym stylu,
  szybkie ładowanie i placeholdery. Domyślny motyw jasny, do wyboru także ciemny i systemowy.

## Otwarte pytania do właściciela

1. ~~Liczby ekonomii~~ — zaakceptowane 2026-11-03 (bez wariantu „Premium”).
2. ~~Plan refaktoryzacji~~ — zaakceptowany 2026-11-03.
3. ~~RLS i dostęp anon~~ — zamknięte 2026-11-03 (`SECURITY_AUDIT.md`).
4. ~~`DATABASE_URL`~~ — ustawiony 2026-11-03.
5. ~~Faza 4: przełączenie i usunięcie starych obiektów~~ — wykonane 2026-11-04, rotacja kluczy zgłoszona przez właściciela.
6. Czy ograniczyć paczkę dnia do 1 sztuki dziennie?
7. ~~Faza 4.5: kierunek wizualny~~ — wybrany 2026-11-04: B „Holo”.
8. ~~Faza 4.5: zgoda na wdrożenie i region `fra1`~~ — udzielona i wykonana 2026-11-04.
9. Faza 4.5: test na produkcji na koncie właściciela (brak wyraźnego potwierdzenia).
10. ~~Faza 5: zgoda na wdrożenie~~ — udzielona i wykonana 2026-11-05 (czasu polskiego).
11. Faza 5: test na produkcji na koncie właściciela.
