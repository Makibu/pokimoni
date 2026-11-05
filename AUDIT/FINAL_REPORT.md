# Raport końcowy Pokimoni

Stan na 2026-11-05. Dotyczy gałęzi `phase-9`. Produkcja działa na `264c861`, czyli na fazie 8 bez poprawek opisanych w tym raporcie. Wdrożenie czeka na zgodę właściciela.

Oznaczenia: **fakt** to coś sprawdzonego w kodzie, teście, bazie lub na produkcji. **Hipoteza** to wniosek bez pełnego dowodu. **Rekomendacja** to moja propozycja. Wyniki testów są w `TEST_REPORT.md`.

## 1. Podsumowanie

Pokimoni przestało być prototypem, w którym przeglądarka decydowała o monetach i tożsamości gracza. Serwer rozstrzyga teraz wszystko, schemat bazy jest w repozytorium, a testy i CI pilnują reguł gry. Doszły funkcje, których wcześniej nie było: nowe otwieranie paczek, znajomi, wymiany, profile, zadania i trzy minigry.

Projekt nadaje się do pokazania w portfolio i do grania ze znajomymi. Nie jest wolny od ryzyk. Najważniejsze trzy, wszystkie opisane w rozdziale 5:

1. Blokady wierszy i wyścigi nie były sprawdzone na prawdziwym Postgresie, bo testy działają na PGlite z jednym połączeniem.
2. Znajomych i wymian nikt jeszcze nie użył na produkcji. Baza ma 0 zaproszeń i 0 wymian.
3. „Kto to Pokémon?” nie wypadło jeszcze na produkcji, więc działanie `sharp` na Vercelu nadal nie jest potwierdzone.

## 2. Porównanie przed i po

| Obszar | Przed (`70d47d8`) | Po (`phase-9`) | Źródło |
|---|---|---|---|
| Tożsamość gracza | `uid` z parametru, JWT nigdy nieweryfikowany | sesja w ciasteczku `HttpOnly`, `requireUser` w każdej trasie poza rejestracją, logowaniem i wylogowaniem | kod, testy API |
| Ekonomia | cenę, kwotę i karty podawał klient | wszystko liczy serwer w jednej transakcji | kod, testy integracyjne |
| Minigry | rozwiązanie sudoku i plansza sapera w przeglądarce | stan na serwerze, klient dostaje tylko to, co odsłoniły reguły | kod, testy |
| Podatności w zależnościach produkcyjnych | 1 critical, 6 high | 0 | `npm audit --omit=dev` |
| Baza | 15 tabel z RLS wyłączonym, schemat poza repo, crony | 24 tabele w schemacie `game`, RLS na wszystkich, migracja w repo, 0 cronów | odczyt z bazy |
| Testy | 0 | 523 w Vitest, 107 zaliczonych scenariuszy E2E | `TEST_REPORT.md` |
| CI | brak | format, lint, typy, testy, build, E2E | `.github/workflows/ci.yml` |
| JS na stronach gry | 369–372 KB | 266–274 KB | pomiar `measure`, te same warunki |
| JS logowania | 259 KB | 208 KB | jw. |
| Fonty | 49 KB | 132 KB, **pogorszenie** przy pierwszej wizycie | jw. |
| Największy element sklepu, kolekcji, osiągnięć, statystyk | ok. 2,5 s | 0,84–0,87 s | jw. |
| Telefon | sztywne 900 px w oknie paczki | brak poziomego przewijania przy 360, 768, 1280 i 1920 px | `responsive-screens` |
| Motyw ciemny | atrapa | jasny, ciemny, systemowy, axe w obu | E2E |
| Region funkcji | `iad1`, baza w Europie | `fra1` | nagłówek `x-vercel-id` |
| Kod bez `components/ui` | ok. 5,5 tys. wierszy | ok. 11,3 tys. wierszy oraz ok. 7,2 tys. wierszy testów | policzone z gita |

Kodu jest dwa razy więcej, bo przybyło funkcji. Znaczników długu w kodzie aplikacji jest 0: `any`, `@ts-ignore`, `eslint-disable`, `TODO`, `dangerouslySetInnerHTML`, surowe `<img>`.

## 3. Co stało się z ustaleniami pierwszego audytu

### Bezpieczeństwo

| ID | Było | Stan | Dowód |
|---|---|---|---|
| SEC-01 | API bez uwierzytelniania | **Naprawione** | testy 401 dla tras, stare ścieżki na produkcji zwracały 404 |
| SEC-02 | ekonomia po stronie klienta | **Naprawione** | testy prób oszustwa w grach i zakupach |
| SEC-03 | podatne zależności | **Naprawione w produkcyjnych**, 12 moderate w narzędziach deweloperskich (FIN-09) | `npm audit` |
| SEC-04 | wstrzyknięcie filtra | **Znikło** razem z PostgREST | Drizzle, parametry |
| SEC-05 | brak walidacji i limitów | **Naprawione**, w fazie 9 doszedł limit prób hasła i zgłoszeń | testy |
| SEC-06 | token w `localStorage` | **Naprawione** | E2E z podrobionym ciasteczkiem |
| SEC-07 | ujawnianie błędów | **Naprawione**, w fazie 9 także logi | testy |
| SEC-08 | brak nagłówków | **Naprawione**, CSP z ograniczeniem (FIN-07) | produkcja, E2E |
| SEC-09 | RLS wyłączony, stare tabele | **Naprawione** | 0 tabel w `public`, anon bez dostępu do `game` |
| SEC-10 | połączenie z bazą bez TLS | **Naprawione**, certyfikat niezweryfikowany (FIN-06) | `SECURITY_AUDIT.md` |

Historia gita ma 80 commitów i jest publiczna. Przeszukałem ją pod kątem wartości z `.env.local` i typowych wzorców sekretów: **nie znalazłem żadnego prawdziwego sekretu**. Adresy baz w historii to przykłady testowe (`example.com`, `localhost`). Plik `.env` nigdy nie trafił do repo.

### Błędy

| ID | Stan |
|---|---|
| BUG-01 feedback zawsze „sukces” | Naprawione, test |
| BUG-02, BUG-03, BUG-10, BUG-12 Sudoku i Saper | Gry usunięte, zastąpione nowymi |
| BUG-04, BUG-05 brak atomowości monet | Naprawione: jedna transakcja, warunek salda w bazie |
| BUG-06 niesprawdzony odbiór osiągnięcia | Naprawione, odbiór na serwerze |
| BUG-07 `uid` po logowaniu | Znikło razem z `authContext` |
| BUG-08 mnożące się interwały | Znikło: 0 `setInterval` w kodzie |
| BUG-09 filtr setu | Znikło razem z PostgREST |
| BUG-11 usuwanie konta | Naprawione, test i E2E |
| BUG-13, BUG-14 nazwa i „0” na kafelku karty | Naprawione: nazwa zależy od ustawienia, dochód jest zawsze > 0 (ograniczenie w bazie) |
| BUG-15 skopiowany nagłówek | Naprawione |
| BUG-16 sortowanie osiągnięć | Naprawione |

### Baza, architektura, wydajność

| ID | Stan |
|---|---|
| DB-01 duplikaty kart | Naprawione: klucz główny `(user_id, card_id)` |
| DB-02 indeksy | Naprawione tam, gdzie mają znaczenie; dwa świadomie pominięte (FIN-15) |
| DB-03 brak ograniczeń | Naprawione: `CHECK`, enumy, klucze obce |
| DB-04 rozjeżdżające się liczniki | Znikło: statystyki liczone z tabel |
| DB-05, DB-11 strefy czasu | Naprawione: `timestamptz`, jedna funkcja doby gry |
| DB-06 nazewnictwo | Naprawione |
| DB-07 podwójne definicje odznak | Naprawione: w działaniu tylko baza, kod zawiera dane startowe seeda |
| DB-08, ARCH-04 brak migracji | Naprawione |
| DB-09 wadliwe losowanie paczki dnia | Naprawione, test |
| DB-12, DB-13, DB-14 crony i limit salda | Znikły: skarbonka liczona przy odczycie, 0 cronów |
| ARCH-01, ARCH-02, ARCH-03 logika i `uid` w kliencie | Naprawione |
| ARCH-05, ARCH-06 odpowiedzi API, klucze zapytań | Naprawione |
| ARCH-07 strony klienckie, `lang="en"` | `lang="pl"`. **7 z 9 stron pozostaje klienckich**, świadomie: statyczny szkielet plus dane z API |
| ARCH-08 brak testów i martwy kod | Naprawione |
| PERF-01, PERF-02, PERF-03 liczba zapytań | Naprawione: jedna transakcja i zapytania zbiorcze |
| PERF-04 `<img>` | Naprawione |

## 4. Audyt według obszarów

### Architektura

**Fakt:** warstwy trzymają się reguły z `TARGET_ARCHITECTURE.md`. `domain/` nie importuje nic spoza siebie, interfejs importuje z serwera tylko typy. Dwie trasy omijały warstwę serwisów (feedback, obrazek minigry), poprawione w fazie 9. Na 40 plików tras wszystkie korzystają ze wspólnego `route()`.

**Odstępstwo od planu:** ochrona stron działa w `proxy.ts` i `SessionGuard`, nie w serwerowym layoucie. Dzięki temu strony mają statyczny szkielet i szybki pierwszy obraz.

### Jakość kodu

W fazie 9 przeczytałem w całości warstwę serwisów, uwierzytelnianie oraz reguły paczek, ekonomii, postępu i minigier. Znaleziska są opisane niżej i naprawione. Nie czytałem linia po linii komponentów interfejsu, ich zachowanie sprawdzają testy E2E. Największy plik własny poza schematem to `AccountDialog.tsx` (329 wierszy), więc nic nie wymaga pilnego dzielenia.

### Bezpieczeństwo

Znalezione i naprawione w fazie 9:

| Znalezisko | Skutek | Poprawka |
|---|---|---|
| Brak limitu prób hasła przy zmianie emaila i usunięciu konta | skradziona sesja pozwalała bez końca zgadywać hasło | 10 błędnych prób na 15 minut, test |
| Komunikat błędu zapytania w logach zawierał parametry, w tym np. hash hasła | hash w logach Vercela przy nieudanym zapisie | logowany tylko kod i opis, test |
| Brak limitu feedbacku | zalogowany gracz mógł zapełniać tabelę | 10 wiadomości na 15 minut, test |
| `Origin: null` kończył się 500 | fałszywy błąd serwera zamiast odmowy | teraz 403, test |

Sprawdzone na produkcji bez konta: wszystkie nagłówki, HSTS, CSP bez `unsafe-eval`, obrazek minigry bez sesji daje 401. Nie wykonywałem testów destrukcyjnych ani ataków.

### Wydajność

Pomiar lokalny na buildzie produkcyjnym: łącze 200 KB/s, opóźnienie 150 ms, procesor spowolniony 4 razy, pusta pamięć podręczna.

| Strona | JS | FCP | Treść z danych, pierwsza wizyta | Treść, przejście w aplikacji |
|---|---|---|---|---|
| `/login` | 208 KB | 884 ms | 788 ms | nie dotyczy |
| `/` | 274 KB | 868 ms | 2954 ms | nie mierzone |
| `/shop` | 274 KB | 864 ms | 2879 ms | 350 ms |
| `/collection` | 266 KB | 840 ms | 2798 ms | 403 ms |
| `/collection/sv3` | 271 KB | 836 ms | 3280 ms | nie mierzone |
| `/friends` | 266 KB | 868 ms | 2813 ms | 302 ms |
| `/minigame` | 273 KB | 848 ms | 2809 ms | 104 ms |
| `/achievements` | 266 KB | 852 ms | 2897 ms | 350 ms |
| `/statistics` | 266 KB | 868 ms | 2825 ms | 303 ms |

W fazie 9 ponowny start minigry nie wczytuje już całego katalogu 3169 kart. To jedyne zapytanie, które gracz mógł bez limitu powtarzać, a które było kosztowne. **Nie mierzono:** czasów na produkcji, fizycznego telefonu, płynności animacji na słabym sprzęcie.

### SEO

Strona logowania ma tytuł, opis, Open Graph, `robots.txt`, `sitemap.xml` i ikony, co sprawdziłem na produkcji. Reszta jest za logowaniem i celowo nie jest indeksowana. Podgląd linku w komunikatorze nie został potwierdzony.

### UX i interfejs

Wszystkie funkcje są w stylu Holo, w obu motywach, ze stanami ładowania i błędów. Automatyczny test axe przechodzi na stronach, w grach i widokach społecznych, w obu motywach. Lista zmian w oknie „Informacje o aplikacji” była nieaktualna: nie wspominała o znajomych, wymianach, zadaniach ani minigrze. Poprawiona, wersja `v2.1.0`.

### Responsywność

Przegląd 360, 768, 1280 i 1920 px na końcowym kodzie: 0 poziomego przewijania na wszystkich stronach. Przy 360 px jedyny element poniżej 44 px to ukryty link „Przejdź do treści”, widoczny dopiero po użyciu klawiatury. **Nie sprawdzono na fizycznym telefonie**, tylko w emulacji Pixel 7 i przy szerokości 360 px.

### Obsługa błędów

Wszystkie trasy zwracają jeden kształt błędu, po polsku, bez szczegółów technicznych. Strony mają `error.tsx`, `not-found.tsx` i ekrany ładowania. Odrzucona sesja wraca do logowania bez pętli przekierowań, co sprawdza E2E. Braki w FIN-10.

### Funkcje F1–F20

„Testy” oznaczają testy automatyczne na lokalnym buildzie. „Produkcja” to użycie widoczne w bazie produkcyjnej (tylko liczby).

| Funkcja | Testy | Produkcja |
|---|---|---|
| F1 Konto | tak | konto założone, używane |
| F2 Ustawienia, motyw | tak | potwierdzenie ogólne właściciela |
| F3 Ekonomia | tak | dziennik działa; saldo właściciela zmienione ręcznie (FIN-04) |
| F4 Sklep, paczki | tak | 10 paczek dnia; zwykłego zakupu i darmowych paczek jeszcze nie użyto |
| F5 Otwieranie | tak | właściciel potwierdził |
| F6 Limit 9 | tak | nie wystąpił |
| F7 Skarbonka | tak | 7 odbiorów |
| F8 Nagroda dzienna | tak | 2 dni serii |
| F9 Zadania | tak | 1 odebrane |
| F10 Minigra | tak | tylko Puzzle średnie, wygrane; Memory i „Kto to Pokémon?” jeszcze nie wypadły |
| F11 Kolekcja | tak | potwierdzenie ogólne |
| F12 Osiągnięcia | tak | 4 odebrane, kwoty zgodne z dziennikiem |
| F13 Odznaki, F14 Statystyki | tak | potwierdzenie ogólne |
| F15 Znajomi, F16 Wymiany | tak | **nieużywane: 0 zaproszeń, 0 wymian** |
| F17 Profil, F18 Skrzynka | tak | brak potwierdzenia, drugi gracz nie istnieje |
| F19 Lista zmian | sprawdzone na zrzucie | poprawka czeka na wdrożenie |
| F20 Feedback | tak | potwierdzenie ogólne |

Odstępstwa od specyfikacji są w niej zapisane i przyjęte przez właściciela: ciemny cień zamiast prawdziwej sylwetki, skarbonka dająca ok. 1200 monet dziennie zamiast ok. 1000.

### Testy, build, konfiguracja produkcyjna

Bramka lokalna przechodzi w całości. Szczegóły w `TEST_REPORT.md`. Baza produkcyjna, odczyt tylko do odczytu: 0 tabel w `public`, RLS na 24 z 24 tabel `game`, 0 polityk, `anon` i `authenticated` bez uprawnień, 0 cronów, jedna migracja zastosowana, `drizzle-kit generate` nie widzi zmian. Sprawdzone niezmienniki danych: brak ujemnych sald, karty w zakresie 1–9, brak przekroczeń po escrow i slotach, brak podwójnych nagród dziennych, ceny paczek i nagrody osiągnięć zgodne z dziennikiem. Jedyna rozbieżność salda to ręczna zmiana właściciela (FIN-04).

### Dokumentacja

`README.md` po angielsku opisuje architekturę, decyzje i uruchomienie. Dzienniki faz są w `AUDIT/IMPLEMENTATION_LOG.md`. Zamiast osobnych `ARCHITECTURE_ANALYSIS.md`, `PERFORMANCE_AUDIT.md` i `SEO_UX_AUDIT.md`, wymienionych jako opcjonalne, treść jest w tym raporcie, `CODE_REVIEW.md` i dzienniku, żeby nie mnożyć dokumentów powtarzających to samo.

## 5. Pozostałe problemy

Priorytety: P2 warto zrobić wkrótce, P3 można odłożyć. Nie ma otwartych P0 ani P1. Trudność: mała to do godziny, średnia to kilka godzin.

### FIN-01 · Testy · P2 · Wyścigi niesprawdzone na prawdziwym Postgresie

- **Miejsce:** `tests/integration/*`, `.github/workflows/ci.yml`.
- **Problem (fakt):** PGlite ma jedno połączenie, więc testy wyścigów działają jeden po drugim.
- **Dlaczego to problem:** zakleszczenia i kolejność blokad ujawniają się tylko przy równoległych połączeniach. W fazie 7 odwrotny porządek blokad znalazłem wyłącznie czytając kod.
- **Konsekwencje:** hipotetyczny błąd 500 przy równoczesnej akcji. Podwójnemu wydaniu monet zapobiegają też warunki w bazie, więc utrata danych jest mało prawdopodobna.
- **Rekomendacja:** osobne zadanie CI z usługą `postgres` i prawdziwie równoległymi testami zakupu, odbioru i wymiany.
- **Zależności:** brak. Docker nie jest potrzebny lokalnie, działa w GitHub Actions.
- **Trudność:** średnia.

### FIN-02 · Poprawność · P2 · `sharp` niepotwierdzony na Vercelu

- **Miejsce:** `src/server/services/clue-picture.ts`.
- **Problem (fakt):** w bazie jest tylko jeden dzień minigry: Puzzle, i ani jedna próba „Kto to Pokémon?”. Właściciel napisał 2026-11-05 „Wszystko przetestowane i działa”, ale na produkcji ta gra jeszcze nie wypadła, więc obrazków nie dało się tam wywołać. Binaria Linuksa są w `package-lock.json`, a testy `renderClue` przechodziły w CI na Ubuntu, ale to nie jest środowisko Vercela.
- **Konsekwencje:** gdyby `sharp` nie działał, w dniu tej gry obrazek się nie wyświetli, a gracz może stracić nagrodę z tego dnia. Okno pokaże „Spróbuj ponownie”.
- **Rekomendacja:** właściciel zagra, gdy ta gra wypadnie. Jeśli obrazek się nie pojawi, trzeba przejrzeć logi Vercela.
- **Zależności:** losowanie gry dnia. **Trudność:** mała.

### FIN-03 · Poprawność · P2 · Funkcje społeczne nieużyte na produkcji

- **Miejsce:** F15–F18.
- **Problem (fakt):** odczyt 2026-11-05 po wiadomości właściciela „Wszystko przetestowane i działa”: 1 konto, 0 zaproszeń, 0 znajomości, 0 wymian, 0 powiadomień. Licznik rejestracji ma jedną próbę, z 2026-11-04, sprzed wdrożenia fazy 6, więc drugiego konta nie założono też i nie skasowano później. Gablota i statystyki profilu są zapisane, więc ta część była używana.
- **Rozbieżność:** baza nie potwierdza testu na dwóch kontach. Właściciel może mieć na myśli to, co dostępne z jednego konta, albo inne środowisko. Zakres testu jest niewyjaśniony.
- **Konsekwencje:** E2E sprawdza cały cykl, ale na PGlite. Wymiana na prawdziwej bazie nie została ani razu wykonana.
- **Rekomendacja:** właściciel przechodzi cykl na dwóch kontach: zaproszenie, wymiana, odrzucenie, usunięcie znajomego. Nie zakładam kont na produkcji samodzielnie.
- **Zależności:** brak. **Trudność:** mała.

### FIN-04 · Dane · Zamknięte · Saldo różni się od dziennika monet

- **Miejsce:** `game.player_state.coins`, `game.coin_ledger`, konto właściciela.
- **Problem (fakt):** saldo 1200, suma dziennika 138, różnica 1062.
- **Wyjaśnienie:** właściciel potwierdził 2026-11-05, że ręcznie dodał sobie monety, żeby testować otwieranie paczek. To nie błąd aplikacji.
- **Konsekwencje:** brak. To konto ma trwałą różnicę w dzienniku, więc przy późniejszym sprawdzaniu zgodności trzeba je pominąć lub zacząć od czystych danych.

### FIN-05 · Bezpieczeństwo · P3 · Limit logowania nieatomowy przy nagłym zalewie

- **Miejsce:** `src/server/services/account.ts`, `loginAccount`.
- **Problem (fakt):** próba jest liczona po sprawdzeniu hasła, więc równoległe żądania przechodzą sprawdzenie limitu razem. Dotyczy to też nowego limitu prób hasła.
- **Konsekwencje:** w krótkim zalewie można wykonać więcej niż 10 prób, potem konto i tak się blokuje. bcrypt spowalnia to dodatkowo.
- **Rekomendacja:** atomowe zwiększenie licznika przed sprawdzeniem hasła. Mała gra, więc zostawiam jako przyjęte ryzyko.
- **Zależności:** FIN-01 pozwoli to przetestować. **Trudność:** mała.

### FIN-06 · Bezpieczeństwo · P3 · Certyfikat bazy niezweryfikowany

- **Miejsce:** `src/server/db/connection.ts`.
- **Problem (fakt):** połączenie jest szyfrowane, ale bez weryfikacji certyfikatu, bo pooler używa CA Supabase.
- **Konsekwencje:** ochrona przed podsłuchem, ale nie przed aktywnym podszyciem się pod serwer na trasie Vercel → Supabase.
- **Rekomendacja:** dodać CA z panelu Supabase. **Zależności:** certyfikat od właściciela. **Trudność:** mała.

### FIN-07 · Bezpieczeństwo · P3 · CSP z `unsafe-inline`

- **Miejsce:** `next.config.ts`.
- **Problem (fakt):** decyzja z fazy 8. Nonce wymusiłyby renderowanie każdej strony na żądanie i utratę statycznego szkieletu.
- **Konsekwencje:** słabsza ochrona przed XSS. Ograniczają to: brak surowego HTML w aplikacji, ciasteczko `HttpOnly`, blokada obcych hostów.
- **Rekomendacja:** zostawić. **Zależności:** brak. **Trudność:** średnia, gdyby zmieniać.

### FIN-08 · Utrzymanie · P3 · Tabela prób nie jest czyszczona

- **Miejsce:** `game.auth_attempts`, `src/server/auth/rate-limit.ts`.
- **Problem (fakt):** wygasłe wiersze zostają. Teraz 16 wierszy, 32 kB.
- **Konsekwencje:** powolny wzrost, większy tylko przy celowym zalewaniu z wielu adresów.
- **Rekomendacja:** usuwać wygasłe wiersze, gdy tabela urośnie. **Zależności:** brak. **Trudność:** mała.

### FIN-09 · Zależności · P3 · 12 podatności moderate w narzędziach

- **Miejsce:** `drizzle-kit` (przez `esbuild`), `eslint-config-next` (przez `typescript-eslint`, `minimatch`).
- **Problem (fakt):** tylko narzędzia deweloperskie, nie trafiają na produkcję. `npm audit fix --force` wprowadziłby zmiany łamiące.
- **Rekomendacja:** aktualizować, gdy wyjdą poprawione wersje. **Zależności:** dostawcy. **Trudność:** mała.

### FIN-10 · UX · P3 · Brak `global-error.tsx`

- **Miejsce:** `src/app/`.
- **Problem (fakt):** awaria samego głównego layoutu pokaże domyślną angielską stronę Nexta. Pozostałe błędy mają polskie ekrany.
- **Konsekwencje:** rzadki i brzydki, ale nieszkodliwy ekran.
- **Rekomendacja:** dodać, gdy będzie okazja. **Zależności:** brak. **Trudność:** mała.

### FIN-11 · Dostępność · P3 · Czytnik ekranu i fizyczny telefon niesprawdzone

- **Miejsce:** cała aplikacja, szczególnie `WhoIsItGame.tsx`.
- **Problem (fakt):** axe przechodzi, ale automat nie zastąpi czytnika. „Kto to Pokémon?” z natury wymaga wzroku.
- **Rekomendacja:** przejście z NVDA lub VoiceOver oraz granie na prawdziwym telefonie. **Zależności:** brak. **Trudność:** mała.

### FIN-12 · Konfiguracja · P3 · Stare zmienne środowiskowe

- **Miejsce:** `.env.local`, możliwe że również Vercel (tego nie widzę).
- **Problem (fakt):** `JWT_SECRET`, `API_NINJAS_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` nie są używane w kodzie.
- **Rekomendacja:** właściciel usuwa je ręcznie. Sam nie zmieniam plików środowiskowych. **Zależności:** brak. **Trudność:** mała.

### FIN-13 · Produkt · P3 · Brak resetu hasła

- **Miejsce:** F1. Poza zakresem z decyzji z 2026-11-03.
- **Konsekwencje:** gracz, który zapomni hasła, traci dostęp, chyba że właściciel pomoże ręcznie.
- **Rekomendacja:** dodać dopiero, gdy pojawi się taka potrzeba, bo wymaga wysyłki maili. **Trudność:** średnia.

### FIN-14 · Produkt · P3 · Paczka dnia może zdominować sklep

- **Miejsce:** F4.
- **Obserwacja (fakt):** wszystkie 10 kupionych paczek to paczki dnia. **Hipoteza:** zniżka 30% bez limitu sprawia, że zwykły zakup bywa nieopłacalny. Próba jednego gracza z dwóch dni niczego nie dowodzi.
- **Rekomendacja:** przyjrzeć się, gdy zagra kilka osób. Decyzja o braku limitu należy do właściciela i została podjęta. **Trudność:** mała.

### FIN-15 · Wydajność · P3 · Dwa indeksy świadomie pominięte

- **Miejsce:** `friend_requests.from_user_id`, `feedback.user_id`.
- **Problem (fakt):** bez nich lista znajomych i usuwanie konta skanują te tabele. Przy kilku graczach to bez znaczenia, a indeks wymaga migracji.
- **Rekomendacja:** dodać przy następnej migracji. **Zależności:** brak. **Trudność:** mała.

### Inne ryzyka

- Obrazy kart pochodzą z `images.pokemontcg.io`. Gdy host nie działa, kart nie widać, a „Kto to Pokémon?” zwraca błąd z ponowieniem.
- Repozytorium jest publiczne i używa nazw oraz grafik Pokémon. README zawiera zastrzeżenie o niekomercyjnym charakterze. To nie jest opinia prawna.
- Darmowe projekty Supabase mogą być usypiane po okresie bezczynności. Obecnych zasad i limitów nie sprawdzałem.

## 6. Rekomendowane dalsze kroki

1. Wdrożyć fazę 9. Migracji nie ma.
2. Przejść cykl społeczny na dwóch kontach (FIN-03) i zagrać w „Kto to Pokémon?”, gdy wypadnie (FIN-02).
3. Dodać do CI testy na prawdziwym Postgresie (FIN-01).
4. Pozostałe P3 w miarę potrzeby.
