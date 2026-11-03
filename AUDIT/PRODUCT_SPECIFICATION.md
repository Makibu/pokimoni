# Specyfikacja produktu Pokimoni — v1 (do weryfikacji)

Stan: 2026-11-03. Źródło: wywiad z właścicielem + analiza kodu. Historia decyzji: `PROGRESS.md`.

Oznaczenia: **[USTALONE]** — decyzja właściciela; **[PROPOZYCJA]** — decyzja techniczna/produktowa
autora specyfikacji, do potwierdzenia; **[ZAAKCEPTOWANE]** — propozycja przyjęta przez właściciela; **[OTWARTE]** — wymaga odpowiedzi; **[LICZBY]** — wartości
do ustalenia symulacją ekonomii (rozdz. 4).

## 1. Kontekst

| Temat | Ustalenie |
|---|---|
| Charakter | Projekt portfolio + gra dla znajomych. Niekomercyjny, mała skala. **[USTALONE]** |
| Gracze / dane | Brak aktywnych graczy; dopuszczalny pełny reset bazy. **[USTALONE]** |
| Środowisko | Jeden projekt Supabase, bez Dockera; schemat z migracji w repo. **[USTALONE]** |
| Auth | Własne konta + JWT. **[USTALONE]** |
| Język UI | Polski. |
| Doba gry | Zaczyna się o **10:00 czasu polskiego (Europe/Warsaw)**. O tej godzinie zmieniają się: nagroda dzienna, zadania, minigra dnia, paczka dnia. **[USTALONE]** |
| Zasada nadrzędna | Serwer jest jedynym źródłem prawdy o tożsamości, monetach, kartach i wynikach gier. Klient tylko wyświetla i wysyła intencje. |

## 2. Role

- **Gość** — widzi tylko stronę logowania/rejestracji.
- **Gracz** — zalogowany użytkownik; wszystkie funkcje gry.
- **Developer** — czyta feedback bezpośrednio w bazie; brak panelu admina w aplikacji.

## 3. Funkcje

### F1. Konto

**Cel:** bezpieczny dostęp do własnego konta.

- Rejestracja: nick, email, hasło.
  - Nick wyświetlany tak, jak go wpisano (`Ash`), ale unikalność i wyszukiwanie **bez rozróżniania
    wielkości liter** (`ash` znajdzie `Ash`, nie da się założyć `ASH`). **[USTALONE]**
    Dozwolone znaki: 3–20 znaków `[a-zA-Z0-9_]`.
  - Email poprawny i unikalny. Hasło: **min. 8 dowolnych znaków**, bez wymogu cyfr / znaków specjalnych. **[USTALONE]**
  - Nowe konto dostaje kapitał startowy **[LICZBY]**.
- Logowanie emailem i hasłem → sesja w ciasteczku `HttpOnly`; limit nieudanych prób. **[ZAAKCEPTOWANE]**
- Wylogowanie unieważnia sesję w przeglądarce; zmiana hasła unieważnia wszystkie sesje.
- Edycja: nick, awatar (7 stałych obrazków **[USTALONE]**), email i hasło — **zmiana emaila/hasła
  wymaga podania obecnego hasła**.
- Usunięcie konta wymaga hasła. Skutki: usunięte dane gracza, znajomości, oferty wymian
  (karty w escrow drugiej strony wracają do niej), powiadomienia z nim związane.

**Kryteria akceptacji**
- Żaden endpoint nie przyjmuje identyfikatora gracza od klienta; tożsamość wynika wyłącznie z sesji.
- Próba rejestracji `ash` przy istniejącym `Ash` kończy się czytelnym błędem.
- Komunikat „konto usunięte” pojawia się tylko, gdy usunięcie faktycznie się powiodło.
- Po zmianie hasła stara sesja w innej przeglądarce przestaje działać.

### F2. Ustawienia

- Pokazywanie nazw nieposiadanych kart — działa także w panelu po najechaniu (naprawa BUG-13).
- **Tryb ciemny** — prawdziwy motyw całej aplikacji: jasny / ciemny / systemowy. **[USTALONE]**
- Ustawienia zapisywane per urządzenie (localStorage). **[ZAAKCEPTOWANE]**

### F3. Ekonomia monet (zasady wspólne)

- Saldo nigdy nie spada poniżej 0 (wymuszone w bazie).
- Każda zmiana salda jest atomowa i zapisana w dzienniku transakcji (źródło, kwota, czas). **[ZAAKCEPTOWANE]**
- Źródła: kapitał startowy, skarbonka (F7), nagroda dzienna (F8), zadania (F9), minigra (F10),
  osiągnięcia (F12). Wydatki: paczki (F4). **Brak** sprzedaży kart i monet w wymianach. **[USTALONE]**

### F4. Sklep i paczki

- Paczka dla każdego z 15 setów; **3 poziomy = 3 klasy setów** (słaba / średnia / najlepsza), każdy
  z własną tabelą szans i ceną. Rezygnuję z osobnego wariantu „Premium” — trzy poziomy wystarczą,
  a mniej opcji to czytelniejszy sklep. **[ZAAKCEPTOWANE]**
- **Paczka dnia** — jeden set dziennie ze zniżką, wybierany losowo z wagami (klasa, rzadkość powtórek);
  naprawa wadliwego losowania (DB-09/DB-10).
- Paczka = 5 kart; wagi rzadkości per pozycja; **god pack 0,05%** (same karty illustration rare+). **[USTALONE]**
- Darmowe paczki z osiągnięć (F12) leżą w ekwipunku do otwarcia w dowolnym momencie. **[ZAAKCEPTOWANE]**
- Zakup to **jedna operacja serwera**: sprawdzenie salda → pobranie monet → losowanie → zapis kart
  → aktualizacja statystyk, zadań, osiągnięć, odznak. Albo wszystko, albo nic.

**Kryteria akceptacji**
- Nie da się kupić paczki bez wystarczających środków ani podać własnej ceny lub kart.
- Przerwanie animacji / zamknięcie karty przeglądarki po zakupie nie powoduje utraty kart.
- Rozkład rzadkości w 100 000 symulowanych paczek zgadza się z tabelą wag (test automatyczny).

### F5. Otwieranie paczki (UX) — **do całkowitej przebudowy** [USTALONE]

Inspiracja: odczucie otwierania fizycznej paczki. Własna oprawa graficzna (bez kopiowania wyglądu
innych aplikacji).

1. Ekran paczki: grafika paczki danego setu (logo setu na „foliowej” paczce).
2. **Rozcięcie paczki** gestem (przeciągnięcie palcem/myszą wzdłuż krawędzi) lub kliknięciem.
3. **Odkrywanie kart po kolei** — tap / swipe / klawisz pokazuje następną; rzadkie karty mają
   wyróżniający efekt (błysk, poświata zależna od rzadkości).
4. **Podsumowanie**: wszystkie 5 kart naraz, oznaczenie „NOWA” dla kart wcześniej nieposiadanych.
5. **Podgląd**: kliknięcie karty → duży obraz, nazwa, rzadkość, set, dochód/h, liczba posiadanych egzemplarzy.
6. Przycisk „Pomiń” — od razu do podsumowania. Akcje końcowe: „Otwórz kolejną”, „Zamknij”.

**Kryteria akceptacji**
- Działa od szerokości 360 px do desktopu, dotykiem, myszą i klawiaturą.
- Respektuje `prefers-reduced-motion` (animacje skrócone).
- Wynik jest znany z serwera przed rozpoczęciem animacji.

### F6. Limit duplikatów [USTALONE]

- Gracz może mieć maksymalnie **9 egzemplarzy** tej samej karty; brak sprzedaży nadwyżek.
- Losowanie paczki **nie uwzględnia** limitu. Egzemplarz ponad limit jest pokazany w animacji
  i podsumowaniu z małym napisem **„LIMIT”** i nie trafia do kolekcji. **[USTALONE]**
- Wymiana, po której odbiorca miałby 10. egzemplarz, **może zostać zaakceptowana**; okno wymiany
  wyraźnie ostrzega, że karta przepadnie i nie trafi na konto. **[USTALONE]**
- Egzemplarze w escrow liczą się do limitu nadawcy do czasu zakończenia oferty.

### F7. Sloty dochodu i skarbonka

- 2 sloty; w slocie egzemplarz posiadanej karty; dochód/h zależy od rzadkości karty.
- Dochód nalicza się do **skarbonki** o pojemności **[LICZBY]** (np. 12 h dochodu); gracz odbiera ją
  przyciskiem. Pełna skarbonka przestaje rosnąć. Saldo portfela nie ma limitu. **[ZAAKCEPTOWANE]**
- Zmiana karty w slocie najpierw rozlicza dochód naliczony dotąd.
- Egzemplarz w slocie nie może trafić do wymiany. **[USTALONE]**

### F8. Nagroda dzienna (streak) [USTALONE kierunek]

- Raz na dobę przycisk „Odbierz”. Seria 7-dniowa: nagroda rośnie dzień 1→7, potem zostaje na
  poziomie dnia 7. Opuszczona doba = powrót do dnia 1. Kwoty **[LICZBY]**.

### F9. Zadania dzienne [USTALONE kierunek]

- 3 zadania dziennie, losowane z puli, **wykonalne samodzielnie** (bez wymian).
- Pula **[ZAAKCEPTOWANE]**: otwórz N paczek; otwórz paczkę dnia; zdobądź kartę rzadkości ≥ X;
  zdobądź nową kartę do kolekcji; ukończ minigrę dnia; odbierz skarbonkę.
- Postęp liczony na serwerze przy odpowiednich akcjach; nagroda po ręcznym odebraniu.

### F10. Minigra dnia [USTALONE]

- Rotacja: 3 gry × 3 poziomy trudności; codziennie losowany 1 z 9 wariantów, ten sam dla wszystkich.

  | Gra | Łatwy | Średni | Trudny |
  |---|---|---|---|
  | „Kto to Pokémon?” | rozmyta karta, 4 odpowiedzi | sylwetka, 4 odpowiedzi | mały kadr, wpisanie nazwy |
  | Memory z kartami | 6 par | 8 par | 12 par, limit pomyłek |
  | Puzzle przesuwne z obrazu karty | 3×3 | 4×4 | 5×5 |

- Jedna nagradzana próba dziennie; nagroda rośnie z trudnością **[ZAAKCEPTOWANE, LICZBY w rozdz. 4]**.
- Stan gry zapisany na serwerze — odświeżenie strony nie resetuje ani nie cofa postępu.
- Wynik weryfikuje serwer (odpowiedzi / odsłanianie kart / odtworzenie ruchów).

### F11. Kolekcja

- Lista setów z postępem (posiadane unikatowe / wszystkie).
- Widok setu: wszystkie karty (nieposiadane jako zakryte), wyszukiwanie, filtry rzadkości,
  „tylko posiadane”, sortowanie; liczba egzemplarzy; podgląd karty jak w F5.

### F12. Osiągnięcia [USTALONE]

- Ocenianie na serwerze po każdej akcji, która może je odblokować.
- Nagroda po ręcznym odebraniu: **monety lub darmowe paczki** (danego poziomu). Każde osiągnięcie
  można odebrać dokładnie raz.
- Czerwony znacznik w nawigacji, gdy są nieodebrane nagrody.

### F13. Odznaki [USTALONE]

- Czysto wizualne, przyznawane automatycznie, widoczne w profilu gracza (pop-up) i we własnych statystykach.
- Jedno źródło definicji (baza), bez duplikatu w kodzie (DB-07).

### F14. Statystyki własne

- Obecny zakres: liczniki kart/paczek/osiągnięć/odznak, rozkład rzadkości, ulubiony set,
  najlepsza karta, ostatnia aktywność. Dane liczone z faktycznych tabel (bez rozjazdów, DB-04).

### F15. Znajomi [USTALONE]

- Zaproszenie po nicku → odbiorca akceptuje / odrzuca (z inboxa).
- Lista znajomych z linkami do profili; możliwość usunięcia znajomego. **[ZAAKCEPTOWANE]**
- Usunięcie znajomego anuluje otwarte oferty między nimi (escrow wraca). **[ZAAKCEPTOWANE]**

### F16. Wymiany kart [USTALONE]

- Tylko między znajomymi, **1 egzemplarz za 1 egzemplarz**, bez monet.
- Nadawca wybiera swoją kartę i kartę znajomego → oferta w inboxie odbiorcy → akceptuj / odrzuć.
- Nadawca może anulować. Oferty nie wygasają.
- **Maks. 1 otwarta oferta na kierunek pary** (A→B; B→A niezależnie; A→C niezależnie).
- **Escrow:** egzemplarz nadawcy jest zablokowany na czas oferty (niewidoczny jako dostępny,
  nie do slotu, nie do innej oferty); anulowanie/odrzucenie go zwraca.
- Dostępne do wymiany = posiadane − w slotach − w escrow. Karta w slocie nie może być wymieniona.
- Akceptacja: serwer sprawdza, czy odbiorca nadal ma wolny egzemplarz; jeśli nie — komunikat, oferta zostaje.
- Zamiana jest atomowa. Gablota: karta znika z niej tylko, gdy gracz nie ma już żadnego egzemplarza.
- Wymiany nie liczą się do „otwartych paczek”; liczą się do statystyki „liczba wymian”. **[ZAAKCEPTOWANE]**

### F17. Profil gracza [USTALONE]

- **Okno pop-up** (nie osobna strona), otwierane z listy znajomych, inboxa, wyników wyszukiwania
  po nicku i z ofert wymian. Dostępne dla zalogowanych graczy.
- Nick, awatar, odznaki, **do 3 statystyk** wybranych przez gracza z listy: unikatowe karty / %
  kolekcji, otwarte paczki, osiągnięcia, odznaki, ukończone sety, najrzadsza karta, ulubiony set,
  liczba wymian, dochód/h, dni w grze.
- **Gablota: maks. 5 kart** wybranych z posiadanych; nie blokuje kart.
- Na cudzym profilu przyciski: „Zaproś do znajomych” / „Zaproponuj wymianę” (gdy znajomy).
- Na własnym profilu tryb edycji gabloty i statystyk.

### F18. Inbox [USTALONE]

- Ikona dostępna z każdej podstrony; **czerwona kropka** przy nieprzeczytanych.
- Otwarcie inboxa oznacza widoczne powiadomienia jako przeczytane.
- Zawiera: zaproszenia (z akcjami), oferty wymian (z akcjami), wyniki ofert
  (zaakceptowana / odrzucona / anulowana), usunięcie ze znajomych **[ZAAKCEPTOWANE]**.
- Odświeżanie: przy wejściu na stronę i co ~30 s (bez websocketów). **[ZAAKCEPTOWANE]**

### F19. Changelog [USTALONE]

- Bez zmian: treść wpisana w kod, okno „Informacje o aplikacji”.

### F20. Feedback [USTALONE]

- Bez zmian funkcjonalnych; zapis do tabeli; sukces pokazywany tylko po faktycznym zapisie (BUG-01).

## 4. Ekonomia

**Cel [USTALONE]:** aktywny gracz otwiera dziennie 2–3 najlepsze **lub** 3–5 średnich **lub** 6–8 najsłabszych
paczek (albo mix), nigdy więcej niż ~10; środek ciężkości ~5 paczek. Oznacza to budżet dzienny
**ok. 1000 monet** dla gracza „w połowie gry”, max ok. 1200.

**Liczby [ZAAKCEPTOWANE 2026-11-03]:**

| Pozycja | Wartość |
|---|---|
| Cena paczki: klasa 1 / 2 / 3 | **150 / 250 / 400** |
| Paczka dnia | −30% ceny |
| Kapitał startowy | **500** (3 słabe paczki) |
| Nagroda dzienna, dni 1→7 | 100, 120, 140, 160, 180, 200, **250** (od dnia 7 stale 250) |
| Zadania dzienne | 3 × **75** |
| Minigra: łatwa / średnia / trudna | **100 / 175 / 250** |
| Dochód kart (bez zmian) | 4–25 monet/h wg rzadkości |
| Skarbonka | pojemność **300 monet** (niezależnie od kart — lepsze karty tylko szybciej ją zapełniają) |
| Osiągnięcia | jednorazowe; drobne = monety, duże = darmowe paczki |

**Bilans dzienny (szacunek):**

| Gracz | Stałe (streak + zadania + minigra) | Skarbonka | Razem | ≈ paczek średnich |
|---|---|---|---|---|
| Początkujący (2× common, 8/h) | ~500 | ~190 | **~690** | 2–3 |
| Środek gry (~17/h) | ~600 | ~400 | **~1000** | 4 |
| Max (50/h, odbiór 2×/dzień) | ~650 | 600 | **~1250** | 5 (3 najlepsze) |

Powrót po długiej przerwie = jedna pełna skarbonka (300). Wartości zweryfikuję symulacją w testach
(rozkład kart z paczek × ceny × czas do ukończenia setów).

## 5. Wymagania niefunkcjonalne

- **Bezpieczeństwo:** uwierzytelnianie każdego żądania, walidacja wejścia, rate limit logowania,
  RLS włączony, brak sekretów w kodzie, aktualne zależności, nagłówki bezpieczeństwa.
- **Spójność danych:** operacje na monetach i kartach atomowe; ograniczenia w bazie (saldo ≥ 0,
  1–9 egzemplarzy, unikalności).
- **Responsywność:** 360 px – desktop; elementy dotykowe min. 44 px.
- **Dostępność:** obsługa klawiaturą, poprawne tytuły okien dialogowych, kontrast w obu motywach.
- **Jakość:** testy jednostkowe logiki gry, testy funkcji bazy, testy E2E kluczowych ścieżek, CI z lint/typecheck/test/build.
- **Odtwarzalność:** cały schemat, funkcje, polityki i crony w migracjach w repo; seed kart i setów.

## 6. Otwarte pytania

Brak — liczby ekonomii i rezygnacja z wariantu „Premium” zaakceptowane 2026-11-03.

Pozostałe pozycje oznaczone wcześniej jako propozycje zostały zaakceptowane 2026-11-03 (właściciel
poprawił tylko: nick, hasło, profil jako pop-up, limit przy wymianie, doba o 10:00).

## Załącznik: dane obecne (odczyt z bazy 2026-11-03, tylko do odczytu)

- 15 setów Scarlet & Violet, po 5 w klasach 1/2/3; 3169 kart; 34 osiągnięcia, 9 odznak; 4 konta, 678 paczek.
- Dochód wg rzadkości (monet/h): common 4, uncommon 5, rare 7, double rare 9, ultra rare 10,
  ace spec 11, illustration 12, special illustration 14, hyper 17, secret 25.
- Obecna cena paczki = klasa × 100; wszystkie sety mają te same wagi rzadkości; nagrody osiągnięć 50–2000 monet.
