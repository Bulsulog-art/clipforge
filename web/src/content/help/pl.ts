import type { HelpContent } from "./types";

export const pl: HelpContent = {
  meta: {
    title: "Centrum pomocy DentVideo: odpowiedzi dla gabinetów",
    description: "Odpowiedzi krok po kroku dla gabinetów korzystających z DentVideo: pierwsze filmy, akceptacja, publikacja, ustawienia, nagrania, płatności, faktury i dane.",
  },
  nav: "Pomoc",
  h1: "W czym możemy pomóc?",
  lead: "Krótkie odpowiedzi dla gabinetów korzystających z DentVideo: od pierwszego tygodnia filmów po faktury i Państwa dane. Można wyszukać odpowiedź albo wybrać temat.",
  search: {
    label: "Szukaj w centrum pomocy",
    placeholder: "Na przykład: rezygnacja, faktura, akceptacja",
    none: "Żadna odpowiedź nie pasuje do tego wyszukiwania. Prosimy spróbować innego słowa albo do nas napisać.",
    count: { one: "1 odpowiedź", other: "Odpowiedzi: {n}" },
  },
  topics: "Tematy",
  categories: {
    start: "Pierwsze kroki",
    review: "Przegląd i akceptacja",
    posting: "Publikowanie filmów",
    settings: "Filmy Państwa gabinetu",
    recording: "Własne nagrania",
    billing: "Plan, płatności i faktury",
    account: "Dane, prywatność i konto",
  },
  readMore: "Więcej informacji:",
  shots: {
    setup: "Ustawienia: dane gabinetu, logo i kolor.",
    week: "Filmy: filmy z tego tygodnia czekają na akceptację.",
    card: "Film oznaczony „Do przejrzenia” z informacją, co sprawdzić przed publikacją.",
  },
  stuck: {
    title: "Nadal coś nie działa?",
    body: "Prosimy napisać na {email}. Każdą wiadomość czyta człowiek. Wiadomość wysłana z aplikacji (Ustawienia → Pomoc i kontakt) ma już wpisany identyfikator gabinetu, więc od razu znajdziemy konto.",
  },
  articles: {
    "first-videos": {
      q: "Kiedy dostanę pierwsze filmy?",
      a: "Filmy na pierwszy tydzień powstają zaraz po płatności i zwykle trwa to około 15 minut. Strona Filmy odświeża się sama, a gdy filmy będą gotowe do przejrzenia, wyślemy e-mail.\n\nPotem w każdy poniedziałek przychodzi pięć nowych filmów, za każdym razem z e-mailem.",
    },
    "no-videos-this-week": {
      q: "Filmów na ten tydzień jeszcze nie ma. Co zrobić?",
      a: "Nowe filmy powstają w każdy poniedziałek. Jeśli filmów na ten tydzień nie ma jeszcze w bibliotece, wystarczy na stronie Filmy dotknąć „Przygotuj filmy na ten tydzień”. Trwa to około 15 minut.\n\nJeśli strona informuje o opóźnieniu, już ponawiamy próbę i napiszemy, gdy filmy będą gotowe. Można też dotknąć „Ponów próbę teraz”.\n\nFilm oznaczony „Nie udało się przygotować” nie wymaga żadnego działania. Jeśli sytuacja się powtórzy, prosimy o wiadomość.",
    },
    topics: {
      q: "Jak wybierane są tematy i czy mogę jakiś zaproponować?",
      a: "Co tydzień wybieramy pięć tematów na podstawie zabiegów wpisanych w ustawieniach i pytań, które pacjenci o nie zadają. Filmy dotyczą wyłącznie zabiegów wykonywanych w gabinecie, dlatego najważniejsza jest pełna i aktualna lista zabiegów.\n\nAby zaproponować temat, wystarczy skorzystać z pola „Zaproponuj temat na przyszły tydzień” na stronie Filmy lub w Ustawieniach: pytanie pacjenta albo temat, do 140 znaków. Oczekujące propozycje wykorzystujemy w pierwszej kolejności, do trzech tygodniowo, jeśli pasują do zabiegów gabinetu i przechodzą te same kontrole kliniczne i reklamowe co każdy film. W sekcji „Państwa propozycje” widać, co stało się z każdą z nich; przy nieprzygotowanej podajemy powód. W sekcji „Tematy, których nie przygotowaliśmy” widać pozostałe pominięte tematy.",

    },
    "sign-in": {
      q: "Nie mogę się zalogować albo nie dochodzi kod z e-maila.",
      a: "Prosimy sprawdzić folder spam lub oferty i poszukać wiadomości od {email}, a potem oznaczyć ją jako „to nie spam”, aby kolejne trafiały do skrzynki odbiorczej. Kod jest ważny 15 minut; nowy można zamówić na ekranie logowania.\n\nNie pamiętają Państwo hasła? Wystarczy dotknąć „Nie pamiętają Państwo hasła?” na ekranie logowania. Jeśli nie dochodzi żaden e-mail, prosimy napisać do nas z adresu użytego przy rejestracji.",
    },
    approve: {
      q: "Jak zatwierdzić film?",
      a: "Nic nie zostanie opublikowane bez akceptacji, a zatwierdzenie oznacza film jedynie jako gotowy do publikacji. Nigdy nie publikujemy w Państwa imieniu.",
      steps: [
        "Otworzyć Filmy i dotknąć „Obejrzyj i zatwierdź”.",
        "Obejrzeć każdy film i dotknąć „Zatwierdź” albo „Odrzuć”, jeśli coś się nie zgadza.",
        "Gdy gotowych jest kilka filmów, przycisk „Zatwierdź wszystkie …” zatwierdza je za jednym razem. Filmy „Do przejrzenia” nigdy nie są w to wliczane.",
      ],
    },
    "needs-a-look": {
      q: "Co oznacza „Do przejrzenia”?",
      a: "Nasza kontrola programowa oznaczyła w tym filmie coś, co warto przeczytać jeszcze raz, na przykład sformułowanie, które przepisy o reklamie usług medycznych w Państwa kraju mogą oceniać surowo. Powód widać na karcie, w części „Co sprawdzić przed publikacją”.\n\nProsimy obejrzeć film z tym powodem w pamięci. Jeśli pasuje do gabinetu, można go zatwierdzić; jeśli nie, odrzucić z krótką notatką. Oznaczony film nigdy nie zostanie zatwierdzony bez Państwa.",
    },
    "software-check": {
      q: "Co sprawdza kontrola programowa, a czego nie?",
      a: "Zanim zobaczą Państwo scenariusz, program sprawdza go dwa razy: raz pod kątem stwierdzeń, które przepisy o reklamie usług medycznych często ograniczają (obietnice efektów, „bezbolesny”, „na zawsze”, superlatywy, ceny, promocje, obietnice „przed i po”, opinie pacjentów), i raz pod kątem powszechnie przyjętej wiedzy klinicznej. To, co nie przejdzie kontroli, jest przepisywane albo w ogóle nie powstaje, a wszystko, co warto obejrzeć jeszcze raz, zostaje oznaczone wraz z powodem.\n\nTo kontrola automatyczna. Nie jest poradą prawną ani oceną prawnika czy izby lekarskiej. Przepisy różnią się w zależności od kraju i zmieniają się, dlatego ostatnie słowo należy do Państwa.",
    },
    responsibility: {
      q: "Kto odpowiada za to, co publikujemy?",
      a: "Państwa gabinet. To Państwo zatwierdzają każdy film i publikują go z własnych kont, więc odpowiedzialność za publikacje pozostaje po Państwa stronie, także w świetle przepisów o reklamie usług medycznych w Państwa kraju.\n\nKontrola programowa pomaga wychwycić typowe problemy, ale nie zastępuje własnej oceny ani porady prawnej. W razie wątpliwości co do tematu lub sformułowania warto odrzucić film albo przed publikacją zapytać izbę lekarską.",
    },
    "wrong-video": {
      q: "Film zawiera błąd. Co mogę zrobić?",
      a: "Nie zatwierdzać go: niezatwierdzony film nigdzie nie trafia. Wystarczy dotknąć „Odrzuć”, wybrać, co jest nie tak, i w razie potrzeby dodać notatkę. Notatka trafia do naszego zespołu razem z filmem.\n\nAby zmienić jeden konkretny film, należy dotknąć „Poproś o zmianę” na jego karcie i opisać, co powinno wyglądać inaczej. Ponownie powstaje tylko ten film, z tymi samymi kontrolami, i przed publikacją trzeba go znów zatwierdzić. Można poprosić o maksymalnie 3 zmiany tygodniowo. Jeśli zmieniona wersja nie przejdzie kontroli, obecny film zostaje bez zmian, a karta o tym informuje. Zmiany dla wszystkich kolejnych filmów (logo, kolor, zabiegi, język, głos) wprowadza się w Ustawieniach.",

    },
    "background-photos": {
      q: "Czy mogę zmienić zdjęcia w tle filmu?",
      a: "Tak. Na karcie filmu należy otworzyć „Opis i hashtagi · Zdjęcia w tle”, wybrać od jednego do czterech zdjęć i dotknąć „Zastosuj”. Film zostanie przygotowany ponownie z tymi zdjęciami. Do czasu, aż nowa wersja będzie gotowa, karta pokazuje „Aktualizacja zdjęć”.",
    },
    share: {
      q: "Jak opublikować film?",
      a: "Jeśli udostępnianie nie działa na danym urządzeniu, wystarczy dotknąć „Pobierz” i opublikować film jak zwykle. DentVideo nigdy nie publikuje w Państwa imieniu i nigdy nie prosi o hasła do mediów społecznościowych; jeśli kontami zarządza agencja lub współpracownik, wystarczy przekazać im zatwierdzone filmy.",
      steps: [
        "Otworzyć zatwierdzony film i dotknąć „Opublikuj”.",
        "Na telefonie dotknąć „Zapisz wideo + skopiuj opis”: film zostanie zapisany, a opis z hashtagami skopiowany. Na komputerze film zostanie pobrany.",
        "Otworzyć Instagram, TikTok, Facebook lub WhatsApp, wybrać film z galerii i wkleić opis.",
        "Po powrocie do DentVideo dotknąć „Oznacz jako opublikowany”, aby widzieć, co zostało do opublikowania.",
      ],
    },
    instagram: {
      q: "Jak opublikować rolkę na Instagramie?",
      a: "Prosimy publikować z konta gabinetu. Opis zawiera już hashtagi; przed udostępnieniem można go skrócić lub zmienić.",
      steps: ["W DentVideo dotknąć „Opublikuj” i zapisać film z opisem.", "Na Instagramie dotknąć + i wybrać Rolkę.", "Wybrać film z galerii, wkleić opis i udostępnić."],
    },
    "tiktok-shorts": {
      q: "Jak opublikować film na TikToku lub w YouTube Shorts?",
      a: "W „Opublikuj” warto użyć krótszego tekstu „TikTok · Shorts”.\n\nTikTok: dotknąć +, wybrać film z galerii, wkleić tekst i opublikować.\n\nYouTube: w aplikacji YouTube dotknąć + i przesłać film z galerii. Krótkie pionowe filmy YouTube pokazuje jako Shorts. Tekst można wkleić jako tytuł lub opis.",
    },
    facebook: {
      q: "Jak opublikować film na Facebooku?",
      a: "Filmy to pionowe pliki MP4, czyli format rolek na Facebooku.",
      steps: ["Przełączyć się na stronę gabinetu, a nie na prywatny profil.", "Utworzyć rolkę i wybrać film.", "Wkleić opis i udostępnić."],
    },
    "google-business": {
      q: "Czy mogę dodać filmy do Profilu Firmy w Google?",
      a: "DentVideo nie ma bezpośredniego połączenia z Google, ale zapisany film można przesłać samodzielnie: otworzyć Profil Firmy w wyszukiwarce Google lub w Mapach, dodać zdjęcie lub film i wybrać plik.\n\nGoogle sprawdza filmy przed ich pokazaniem i przyjmuje tylko krótkie klipy, dlatego aktualne limity warto sprawdzić w pomocy Google. Jeśli film zostanie odrzucony, można go udostępnić w innych kanałach. Hashtagi nic tam nie dają, więc lepiej je pominąć.",
    },
    "posting-times": {
      q: "Kiedy warto publikować?",
      a: "Każdy zatwierdzony film ma proponowany dzień i godzinę. Rozkładamy filmy tygodnia od poniedziałku do piątku i na zmianę proponujemy porę lunchu i wieczór w kraju gabinetu, kiedy wiele osób zagląda do telefonu.\n\nTo propozycje, nie zasady: regularność jest ważniejsza niż dokładna minuta. Statystyki Instagrama lub TikToka pokazują, kiedy Państwa obserwujący są online.",
    },
    captions: {
      q: "Czy filmy mają napisy? Czy są dostępne?",
      a: "Każdy film pokazuje najważniejsze informacje jako tekst w obrazie, więc można go śledzić bez dźwięku. Ten tekst to skrót tego, co mówi lektor, a nie dosłowna transkrypcja.\n\nPełny tekst lektora można pobrać przyciskiem „Pobierz napisy (.srt)” w kroku „Opublikuj”, obok pobierania filmu. Plik zawiera dokładne słowa lektora. Czasy są wyliczane z pauz w nagraniu lektora, więc są bliskie, ale nie co do słowa: warto raz obejrzeć je z filmem przed przesłaniem. Filmy przygotowane, zanim pojawiły się pliki z napisami, oraz klipy z Państwa nagrań nie mają pliku .srt (klipy i tak pokazują Państwa słowa na ekranie).\n\nYouTube i Facebook pozwalają przesłać plik .srt razem z filmem, tam gdzie oferują napisy. Instagram i TikTok nie przyjmują plików z napisami: najważniejsze informacje są już w filmie, a przy publikacji można też włączyć automatyczne napisy aplikacji i poprawić je tekstem z pliku .srt. Warto sprawdzić, czy żaden tekst nie pojawia się dwa razy.",

    },
    "other-uses": {
      q: "Czy możemy używać filmów na stronie internetowej lub w poczekalni?",
      a: "Tak. Filmy przygotowane dla gabinetu można wykorzystywać w komunikacji gabinetu, na przykład na stronie internetowej, w newsletterze lub na ekranie w poczekalni. Pobrane filmy można wykorzystywać także po rezygnacji.\n\nNiektóre filmy zawierają licencjonowane materiały stockowe, których wolno używać tylko jako części filmu, a nie osobno.",
    },
    "logo-colors": {
      q: "Jak zmienić logo lub kolor marki?",
      a: "Kolejne filmy będą miały nowe logo i kolor. Filmy już przygotowane zachowują poprzednie.",
      steps: [
        "Otworzyć Ustawienia.",
        "W sekcji „Logo i kolor” przesłać nowe logo (idealnie PNG z przezroczystym tłem, do 5 MB) albo wybrać kolor.",
        "Dotknąć „Zapisz zmiany”.",
      ],
    },
    language: {
      q: "Czy możemy zmienić język filmów lub formę zwracania się do pacjentów?",
      a: "Tak, w Ustawieniach: „Język filmów” i „Forma zwracania się do pacjentów” (forma grzecznościowa lub bezpośrednia). Filmy powstają po angielsku, niemiecku, hiszpańsku, francusku, włosku, portugalsku, turecku, japońsku, arabsku i polsku.\n\nZmiana dotyczy kolejnych filmów. Aplikacja również przełącza się na ten język, jeśli jest w nim dostępna.",
    },
    services: {
      q: "Dlaczego zabiegi w Ustawieniach są tak ważne?",
      a: "Filmy powstają wyłącznie o zabiegach z listy „Wykonywane zabiegi”: zabieg, którego brakuje, nigdy nie dostanie filmu, a taki, którego gabinet nie wykonuje, nigdy się nie pojawi. Zabiegi należy oddzielać przecinkami albo dodawać przyciskami szybkiego wyboru.\n\n„Ton” (ciepły, ekspercki, spokojny lub swobodny) decyduje o sposobie pisania scenariuszy. Zmiany dotyczą kolejnych filmów.",
    },
    "narrator-voice": {
      q: "Czy możemy wybrać głos lektora?",
      a: "Tak. W Ustawieniach, w polu „Głos lektora”, można wybrać głos kobiecy lub męski. Lektor to syntetyczny głos w języku filmów i mówimy o tym otwarcie.\n\nWybór dotyczy nowych filmów; filmy już przygotowane zachowują swój głos. Kto chce mówić własnym głosem, może w planie Practice zamieniać swoje nagrania w klipy.",
    },
    "closing-line": {
      q: "Czym jest zdanie na koniec i dlaczego moje nie zostało przyjęte?",
      a: "To jedno opcjonalne, spokojne zdanie dodawane pod opisem każdego posta, na przykład „Pytania o dziąsła? Prosimy zadać je podczas najbliższej wizyty kontrolnej.” Jeśli pole zostanie puste, posty otrzymają nasze własne zdania na koniec.\n\nPrzed zapisaniem zdanie jest sprawdzane według tych samych zasad reklamy co filmy. Nie może obiecywać efektów, ponaglać, zawierać wykrzyknika, być ogólnym „zapraszamy do kontaktu” ani zachęcać do rezerwacji wizyty tam, gdzie przepisy kraju to ograniczają. Komunikat pod polem podpowiada, co zmienić.",
    },
    record: {
      q: "Jak nagrać samego siebie? (plan Practice)",
      a: "Dzielimy nagranie na krótkie klipy z napisami i logo, sprawdzamy każdy z nich i wysyłamy e-mail, gdy są gotowe, zwykle w ciągu 10 minut. Państwa słowa nigdy nie są zmieniane; wszystko, co warto obejrzeć jeszcze raz, zostaje oznaczone.\n\nPliki: MP4, MOV lub WebM, do 500 MB. Nagrania są częścią planu Practice; w planie Starter strona Nagranie pokazuje, jak zmienić plan. Jeśli na nagraniu widać lub słychać pacjenta, potrzebna jest najpierw jego udokumentowana zgoda.",
      steps: [
        "Otworzyć Nagranie i wybrać jedną z kart do nagrań na ten tydzień.",
        "Ustawić telefon na wysokości oczu, blisko okna, i mówić według karty przez od jednej do dziesięciu minut.",
        "Wybrać film, dotknąć „Prześlij i przygotuj klipy” i nie zamykać strony do końca przesyłania.",
      ],
    },
    plans: {
      q: "Czym różnią się Starter i Practice i jak zmienić plan?",
      a: "Oba plany obejmują pięć filmów z lektorem i napisami w każdy poniedziałek, kontrolę programową oraz Państwa logo i kolory. Practice dodaje klipy z własnych nagrań oraz karty, które podpowiadają, co nagrać. Aktualne ceny są na ekranie planów w aplikacji.\n\nAby zmienić plan, należy otworzyć Ustawienia → Plan i płatności → „Zmiana planu”. Różnica za resztę okresu rozliczeniowego jest pobierana lub zwracana tego samego dnia. Jeśli widać tam tylko kartę „Napisz do nas”, prosimy o wiadomość, a zmienimy plan za Państwa.",
    },
    invoices: {
      q: "Gdzie znajdę faktury i potwierdzenia płatności?",
      a: "Płatności obsługuje Dodo Payments jako sprzedawca (merchant of record): Dodo sprzedaje subskrypcję, obciąża kartę, pobiera należne podatki i wystawia fakturę. Ta nazwa widnieje też na wyciągu z karty.\n\nPo każdej płatności przychodzi potwierdzenie e-mailem, a faktury można pobrać w Ustawienia → Plan i płatności → „Zarządzaj płatnościami”. Ponieważ fakturę wystawia Dodo, DentVideo nie wysyła drugiej.",
    },
    "update-card": {
      q: "Jak zmienić kartę, którą płacimy?",
      a: "Należy otworzyć Ustawienia → Plan i płatności i dotknąć „Zarządzaj płatnościami”. Kartę zmienia się w bezpiecznym portalu naszego operatora płatności; nigdy nie widzimy pełnych danych karty.\n\nJeśli przycisku nie ma, prosimy o wiadomość, a wyślemy bezpieczny link. Prosimy nigdy nie wysyłać danych karty e-mailem.",
    },
    "payment-failed": {
      q: "Płatność się nie udała i filmy są wstrzymane. Co teraz?",
      a: "Filmy zostają w bibliotece i nadal można je udostępniać. Do czasu udanej płatności wstrzymane są tylko nowe filmy tygodniowe.\n\nNa stronie Filmy lub w Ustawieniach wystarczy dotknąć „Zaktualizuj dane płatności” albo „Poproś o bezpieczny link e-mailem”. Prosimy nie kupować nowego planu, bo opłata zostałaby pobrana dwa razy. Gdy karta zadziała, filmy tygodniowe wrócą.",
    },
    cancel: {
      q: "Jak zrezygnować?",
      a: "Plany są miesięczne, bez minimalnego okresu. Należy otworzyć Ustawienia → Plan i płatności → „Zarządzaj płatnościami” i zrezygnować w portalu płatności albo napisać do nas, a zrobimy to za Państwa.\n\nRezygnacja zatrzymuje kolejną płatność, a dostęp pozostaje do końca opłaconego okresu. Za rozpoczęty okres nie zwracamy części opłaty, chyba że wymaga tego prawo lub usługa zawiodła; szczegóły są w Zasadach zwrotów.",
    },
    "after-cancel": {
      q: "Co dzieje się z naszymi filmami po rezygnacji?",
      a: "Po zakończeniu opłaconego okresu nowe filmy nie powstają. Biblioteka zostaje jeszcze przez 90 dni: można dalej oglądać, pobierać i udostępniać filmy, a strona Filmy pokazuje datę. Piszemy do Państwa 14 dni i 1 dzień wcześniej. Po 90 dniach filmy, nagrania i pliki z napisami są usuwane; ustawienia i logo zostają.\n\nPobrane filmy można wykorzystywać także po rezygnacji, dlatego warto pobrać te, które chcą Państwo zachować, albo wszystko naraz w Ustawienia → Państwa dane → „Pobierz moje dane”. Jeśli przed tą datą ponownie wybiorą Państwo plan na stronie Filmy, wszystko zostaje. Po usunięciu konta wszystko zostaje skasowane od razu.",

    },
    group: {
      q: "Mamy drugą placówkę. Jak ją dodać?",
      a: "Grupy gabinetów i placówki z kilkoma lokalizacjami konfigurujemy razem z Państwem, a nie w aplikacji. Wystarczy napisać do nas, jakie to lokalizacje, a przygotujemy je wspólnie. Cena jest naliczana za każdą lokalizację.",
    },
    "patient-data": {
      q: "Czy możemy przesyłać dane pacjentów lub filmy z pacjentami?",
      a: "DentVideo działa bez danych pacjentów, dlatego prosimy nie przesyłać dokumentacji medycznej ani nie wysyłać nam informacji o pacjentach e-mailem.\n\nJeśli nagranie pokazuje pacjenta lub podaje jego nazwisko, przed przesłaniem potrzebna jest jego wyraźna, udokumentowana zgoda. DentVideo nie jest przeznaczone do chronionych informacji zdrowotnych w rozumieniu amerykańskiej ustawy HIPAA.",
    },
    "privacy-dpa": {
      q: "Jak chronione są nasze dane? Czy jest umowa powierzenia przetwarzania?",
      a: "Polityka prywatności opisuje, co przetwarzamy, którzy dostawcy to otrzymują i jak długo dane są przechowywane. W odniesieniu do danych osobowych w przesyłanych plikach administratorem jest gabinet, a my jesteśmy podmiotem przetwarzającym na podstawie umowy powierzenia przetwarzania danych, która jest częścią naszego regulaminu.\n\nNie używamy przesłanych plików ani filmów do trenowania modeli AI i nie pokazujemy filmów gabinetu innym klientom.",
    },
    "export-data": {
      q: "Jak pobrać wszystkie nasze dane?",
      a: "Należy otworzyć Ustawienia → Państwa dane → „Pobierz moje dane”. Powstaje jeden plik z danymi gabinetu, scenariuszem, opisem i oceną każdego filmu oraz linkami do pobrania filmów, nagrań i logo. Linki działają 24 godziny, więc warto szybko pobrać to, co potrzebne.",
    },
    "delete-account": {
      q: "Jak usunąć nasze konto?",
      a: "Należy otworzyć Ustawienia → Państwa dane → „Usuń moje konto…” i dla potwierdzenia wpisać nazwę gabinetu. Dane gabinetu, filmy, nagrania, logo i dane logowania są usuwane od razu i nie da się ich przywrócić, dlatego wcześniej warto pobrać dane.\n\nJeśli plan jest nadal aktywny, okno informuje, czy zostanie anulowany jednocześnie, czy najpierw trzeba z niego zrezygnować. Operator płatności przechowuje faktury tak długo, jak wymagają tego przepisy podatkowe, a kopie zapasowe są nadpisywane w ciągu 30 dni.",
    },
    "reminder-emails": {
      q: "Czy możemy wyłączyć e-maile z przypomnieniami?",
      a: "Tak. Na dole każdego przypomnienia i podsumowania miesiąca jest link „Wypisz się”. E-maile o koncie, płatnościach i gotowych filmach nadal przychodzą, bo są częścią usługi.",
    },
  },
};
