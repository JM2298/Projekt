Serwer jest dostępny pod adresem `http://localhost`.

React jest dostępny pod adresem `http://localhost:3000`.

Panel admina jesli masz utworzonego super user `http://localhost/admin`



Migrowanie bazy
make makemigrations i make magrate

Tworzenie superuser
make createsuperuser

Urochamianie dockera
make run

## Dokumentacja API

### Uwierzytelnianie
Backend korzysta z JWT (Simple JWT). Po uzyskaniu tokenu dostępowego należy dołączać go w nagłówku `Authorization: Bearer <token>` do zapytań wymagających autoryzacji.

### Endpointy HTTP

| Ścieżka | Metoda | Opis | Wymagane dane wejściowe | Odpowiedź |
| --- | --- | --- | --- | --- |
| `http://localhost/joker-login-api/login/` | POST | Zwraca parę tokenów JWT dla istniejącego użytkownika. | JSON: `{ "email": "uzytkownik@example.com", "password": "haslo" }` | `200 OK` z polami `access` i `refresh`. |
| `http://localhost/joker-login-api/register/` | POST | Rejestruje nowego użytkownika. | JSON: `{ "email": "uzytkownik@example.com", "password": "haslo", "password_confirm": "haslo" }` | `201 Created` z danymi utworzonego użytkownika. |
| `http://localhost/joker-login-api/me/` | GET/PATCH | Zwraca dane aktualnie zalogowanego użytkownika lub aktualizuje wybrane pola (np. `display_name`, `opis`, współrzędne). Wymaga nagłówka `Authorization: Bearer <token>`. | Dla `PATCH`: JSON z polami użytkownika, które mają zostać zmienione. | `200 OK` z bieżącymi danymi użytkownika. |
| `http://localhost/joker-login-api/available-users/` | GET | Zwraca listę użytkowników, którzy mają status `dostępny`. Wymaga nagłówka `Authorization: Bearer <token>`. | — | `200 OK` z listą użytkowników wraz z polami profilu (m.in. `username`, `display_name`, `status`, `character`). |
| `http://localhost/joker-chat-api/joker-chat/messages/` | GET/POST | Standardowy ViewSet wiadomości czatu. `GET` zwraca listę, `POST` tworzy wiadomość (pola `message`, `nadawca`, `odbiorca`; `room_name` można przekazać w ścieżce akcji pokoju poniżej). | Dla `POST`: JSON z wymaganymi polami serializera. | `200 OK` dla listy, `201 Created` po dodaniu. |
| `http://localhost/joker-chat-api/joker-chat/messages/conversation/<odbiorca_id>/<ileWiadomosciWstecz>/` | GET | Zwraca wskazaną liczbę ostatnich wiadomości w rozmowie z użytkownikiem `odbiorca_id` (maks. 100) w kolejności od najstarszej do najnowszej; opcjonalnie filtruje od podanego znacznika czasu. | Parametry ścieżki: identyfikator odbiorcy i liczba wiadomości do cofnięcia; opcjonalny parametr zapytania `from` w formacie ISO 8601, aby pobrać wiadomości od wskazanego czasu. | `200 OK` z listą wiadomości lub błąd `400/404` przy niepoprawnych danych. |
| `http://localhost/joker-chat-api/joker-chat/messages/<nadawca_id>/last_hour/` | GET | Pobiera ostatnią godzinę rozmowy (minimum 10 wiadomości, uzupełniane starszymi gdy jest ich mniej). | Parametr ścieżki `nadawca_id`. | `200 OK` z listą wiadomości chronologicznie. |
| `http://localhost/joker-chat-api/joker-chat/messages/room/<room_name>/` | GET/POST | Obsługa pokoju czatu. `GET` zwraca wiadomości pokoju (cache na 60 s), `POST` zapisuje nową wiadomość w pokoju. | `room_name` w ścieżce; dla `POST` payload wiadomości zgodny z `MessageSerializer`. | `200 OK` dla odczytu, `200 OK` dla zapisu z potwierdzeniem. |
| `http://localhost/joker-chat-api/joker-chat/friendships/` | GET/POST | Zarządzanie zaproszeniami do znajomych. `POST` wymaga `friend_username` oraz opcjonalnej wiadomości `friend_message`. | JSON: `{ "friend_username": "nazwa", "friend_message": "treść" }` | `201 Created` z danymi relacji; `GET` zwraca listę własnych relacji. |
| `http://localhost/joker-chat-api/joker-chat/friendships/<id>/` | PATCH | Akceptuje zaproszenie do znajomych, które wskazuje aktualnie zalogowanego użytkownika jako odbiorcę. | JSON np. `{ "accepted": true }`. | `200 OK` z uaktualnioną relacją. |
| `http://localhost/joker-chat-api/joker-chat/friendships/invitations/` | GET | Lista oczekujących zaproszeń dla zalogowanego użytkownika. | — | `200 OK` z listą zaproszeń. |
| `http://localhost/joker-chat-api/joker-chat/friendships/friends/` | GET | Lista zaakceptowanych znajomych zalogowanego użytkownika. | — | `200 OK` z listą relacji. |
| `http://localhost/joker-chat-api/joker-chat/friendships/last-view-contact/` | PATCH | Ustawia znacznik `last_view_contact` dla relacji ze znajomym. | JSON: `{ "friend-id": <id_znajomego> }` | `200 OK` z uaktualnioną relacją. |
| `http://localhost/joker-chat-api/joker-chat/friendships/<id>/` | DELETE | Usuwa relację znajomości, gdy zalogowany użytkownik jest jej autorem. | — | `204 No Content` lub `403` przy braku uprawnień. |
| `http://localhost/joker-chat-api/joker-chat/wiadomosci/` | GET/POST | Standardowy ViewSet wiadomości (lista, tworzenie, aktualizacja, usuwanie). Dodatkowa akcja `last` zwraca ostatnią wiadomość od nadawcy (`?nadawca=<id>`). | Dla `POST`: JSON zgodny z `MessageSerializer`. | `200 OK`/`201 Created` lub `404` gdy brak wiadomości w akcji `last`. |
| `http://localhost/joker-chat-api/joker-chat/users/` | GET | Read-only lista użytkowników z polami `id`, `username`, `email`, `character` (zarejestrowane przez router, jeśli włączone). | — | `200 OK` z listą użytkowników. |

### WebSocket

| Ścieżka | Opis | Format wiadomości |
| --- | --- | --- |
| `ws://localhost/ws/chat/<user_id>/` | Połączenie WebSocket przypisane do `user_id`. Wiadomości przychodzące z pola `odbiorca` są wysyłane do grupy `user_<odbiorca>`, więc każdy podłączony klient o tym identyfikatorze otrzyma komunikat. | JSON wysyłany przez klienta: `{ "message": "treść", "nadawca": <id_nadawcy>, "odbiorca": <id_odbiorcy> }`. Odpowiedzi mają ten sam schemat i są nadawane do kanału odbiorcy. |

> Wszystkie endpointy Django REST Framework korzystają z ustawionego uwierzytelniania JWT (`DEFAULT_AUTHENTICATION_CLASSES`), więc wymagają nagłówka `Authorization` z tokenem dostępowym, chyba że zaznaczono inaczej.

