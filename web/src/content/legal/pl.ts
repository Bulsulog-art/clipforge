import type { LegalText } from "./types";

/** Polski. Tłumaczenie; rozstrzyga wersja angielska. */
export const PL: LegalText = {
  ui: {
    updated: "Ostatnia aktualizacja",
    prevails: "To jest tłumaczenie. Wiążąca jest {english}; w razie rozbieżności ona rozstrzyga.",
    englishVersion: "wersja angielska",
    country: "Czarnogóra",
    operator: {
      company: "Spółka",
      legalForm: "Forma prawna",
      legalFormValue: "Spółka z ograniczoną odpowiedzialnością prawa czarnogórskiego",
      office: "Siedziba",
      register: "Rejestr",
      registerValue: "Centralny Rejestr Podmiotów Gospodarczych (CRPS), Czarnogóra",
      registrationNumber: "Numer rejestrowy",
      taxId: "Numer identyfikacji podatkowej (PIB)",
      director: "Dyrektor zarządzający",
      contact: "E-mail",
      brand: "Marka",
      brandValue: "{brand} — produkt: DentVideo",
    },
    table: { provider: "Dostawca", purpose: "Cel", data: "Dane", location: "Lokalizacja" },
  },

  subprocessors: {
    hostinger: {
      purpose: "Wirtualny serwer prywatny, na którym działają dentvideo.com, przetwarzanie wideo, nasza baza danych, logowanie i przechowywanie plików (nasza własna instalacja oprogramowania open source Supabase).",
      data: "Wszystkie dane usługi: konto, profil gabinetu, przesłane pliki, filmy, referencje rozliczeniowe, logi.",
      location: "Lokalizacja centrum danych do potwierdzenia; lista zostanie zaktualizowana.",
    },
    openai: {
      purpose: "Pisze i sprawdza scenariusze, tworzy syntetyczną narrację i transkrybuje przesłane nagrania, gdy nasza własna usługa transkrypcji jest niedostępna.",
      data: "Dane profilu gabinetu użyte w scenariuszach, tekst scenariuszy, dźwięk nagrań (do transkrypcji).",
      location: "Stany Zjednoczone",
    },
    resend: {
      purpose: "Wysyła e-maile usługi (kody weryfikacyjne, „Państwa filmy są gotowe”, powiadomienia o płatnościach).",
      data: "Adres e-mail, nazwa gabinetu, treść wiadomości.",
      location: "Stany Zjednoczone",
    },
    dodo: {
      purpose: "Płatności, subskrypcje, faktury, podatki i zwroty jako sprzedawca (merchant of record). W zakresie danych płatniczych Dodo Payments jest odrębnym administratorem.",
      data: "Adres e-mail, imię i nazwisko oraz dane rozliczeniowe, dane płatnicze, status subskrypcji.",
      location: "Zob. politykę prywatności Dodo Payments",
    },
  },

  docs: {
    terms: {
      title: "Regulamin",
      description: "Warunki korzystania z DentVideo, usługi filmów edukacyjnych dla pacjentów gabinetów stomatologicznych, prowadzonej przez BLS AI Automation DOO (Bulsu Labs), Podgorica, Czarnogóra.",
      intro: [
        "Niniejszy regulamin jest umową między {legalName} („my”), która prowadzi DentVideo pod marką {brand}, a gabinetem lub lekarzem, który zakłada konto DentVideo („Państwo”). Zakładając konto lub opłacając plan, akceptują Państwo regulamin. Akceptując go w imieniu gabinetu, potwierdzają Państwo umocowanie do jego reprezentowania.",
        "Napisaliśmy go prostym językiem. Jeśli coś jest niejasne, prosimy o wiadomość na {email} przed wykupieniem subskrypcji.",
      ],
      sections: [
        { heading: "1. Kim jesteśmy", blocks: [{ operator: true }] },
        {
          heading: "2. Tylko dla firm",
          blocks: [
            "DentVideo to narzędzie dla gabinetów stomatologicznych i lekarzy dentystów. Jest oferowane wyłącznie firmom i profesjonalistom działającym na rzecz swojej praktyki, a nie konsumentom ani pacjentom. Korzystając z niego, potwierdzają Państwo, że działają w ramach swojej działalności gospodarczej lub zawodowej.",
          ],
        },
        {
          heading: "3. Usługa",
          blocks: [
            "DentVideo tworzy krótkie filmy edukacyjne dla pacjentów, z narracją i napisami, dla gabinetów stomatologicznych. Co tydzień planuje tematy na podstawie oferowanych przez Państwa usług, pisze scenariusze, nagrywa je syntetycznym głosem, generuje filmy z nazwą, kolorami i logo gabinetu oraz automatycznie sprawdza sformułowania pod kątem przepisów o reklamie usług zdrowotnych i wiarygodności klinicznej. W planach, które to obejmują, zamienia też przesłane nagrania w krótkie klipy z napisami.",
            "DentVideo nie jest wyrobem medycznym i nie udziela porad medycznych, prawnych ani regulacyjnych.",
          ],
        },
        {
          heading: "4. Wszystko zatwierdzają Państwo przed publikacją",
          blocks: [
            "Nic, co tworzy DentVideo, nie jest publikowane automatycznie, a DentVideo nie publikuje w mediach społecznościowych. To Państwo decydują, czy zatwierdzić, pobrać i udostępnić każdy film, i to Państwo są wydawcą tego, co udostępniają.",
            "Nasze kontrole są pomocą, a nie gwarancją. Scenariusze piszą i sprawdzają modele AI, które mogą się mylić. Przed publikacją odpowiadają Państwo za to, by każdy film był prawidłowy dla Państwa gabinetu i zgodny z obowiązującymi Państwa zasadami: kodeksem etyki zawodowej, przepisami o reklamie usług zdrowotnych i regulaminami platform.",
          ],
        },
        {
          heading: "5. Konto",
          blocks: [
            "Prosimy podawać prawdziwe dane gabinetu i chronić dane logowania. Odpowiadają Państwo za to, co dzieje się na koncie. Jeśli podejrzewają Państwo, że ktoś inny z niego korzystał, prosimy o wiadomość na {email}.",
          ],
        },
        {
          heading: "6. Plany, ceny i płatności",
          blocks: [
            "DentVideo jest płatne z góry; nie ma darmowego okresu próbnego. Przed płatnością widzą Państwo podgląd na żywo filmów z nazwą, kolorami i logo gabinetu. Aktualne plany, w dolarach amerykańskich:",
            {
              list: [
                "Starter: {starter} miesięcznie.",
                "Practice: {practice} miesięcznie lub {practiceYear} rocznie.",
                "Group (grupy i gabinety z wieloma lokalizacjami): indywidualne warunki po uzgodnieniu — kontakt {email}. Planu Group nie można kupić na stronie.",
                "Oferta założycielska: Practice miesięcznie za {foundingPrice} przez pierwsze {foundingMonths} miesięcy, tylko dla pierwszych {foundingClinics} gabinetów. Po tych {foundingMonths} miesiącach subskrypcja trwa dalej w zwykłej cenie Practice, {practice} miesięcznie, chyba że ją Państwo anulują. Oferta kończy się, gdy skorzysta z niej {foundingClinics} gabinetów.",
              ],
            },
            "Płatności obsługuje Dodo Payments, które działa jako sprzedawca (merchant of record) i autoryzowany odsprzedawca: sprzedaje Państwu subskrypcję, obciąża środek płatności, widnieje na wyciągu z karty, nalicza i pobiera należne podatki oraz wystawia fakturę. Do zakupu stosuje się także warunki dla kupujących Dodo Payments. Nigdy nie widzimy pełnych danych karty.",
            "Subskrypcje odnawiają się automatycznie na koniec każdego okresu rozliczeniowego (miesięcznego lub rocznego) aż do anulowania. Jeśli płatność się nie powiedzie, możemy wstrzymać nowe filmy do czasu jej uregulowania.",
            "Możemy zmieniać ceny cennikowe. Poinformujemy o tym e-mailem co najmniej 30 dni wcześniej, a nowa cena obowiązuje dopiero od najbliższego odnowienia po tym powiadomieniu.",
          ],
        },
        {
          heading: "7. Anulowanie i zwroty",
          blocks: [
            "Mogą Państwo anulować w każdej chwili; anulowanie działa na koniec opłaconego okresu, a do tego czasu dostęp pozostaje. Płatności za rozpoczęty okres nie są zwracane częściowo, chyba że wymaga tego prawo lub usługa zawiodła. Szczegóły zawiera nasza [Polityka zwrotów](refunds), która jest częścią regulaminu.",
          ],
        },
        {
          heading: "8. Państwa treści i dane pacjentów",
          blocks: [
            "Wszystkie prawa do przesłanych treści (logo, danych gabinetu i nagrań) pozostają przy Państwu. Udzielają nam Państwo zgody na ich przechowywanie i przetwarzanie wyłącznie w celu świadczenia DentVideo, w tym przekazywanie ich dostawcom wymienionym w [Polityce prywatności](privacy).",
            "Potwierdzają Państwo, że mają prawo do korzystania z przesyłanych treści i że każda osoba widoczna lub słyszalna na nagraniu wyraziła zgodę.",
            "DentVideo jest zaprojektowane tak, by działać bez danych pacjentów. Prosimy nie przesyłać dokumentacji medycznej. Jeśli nagranie pokazuje lub wymienia pacjenta, potrzebna jest jego wyraźna, udokumentowana zgoda. W odniesieniu do danych osobowych w przesłanych treściach są Państwo administratorem, a my działamy jako podmiot przetwarzający na podstawie naszej [Umowy powierzenia przetwarzania danych](dpa), która jest częścią regulaminu.",
            "DentVideo nie jest zaprojektowane do działania jako „business associate” w rozumieniu HIPAA i nie może być używane do przechowywania ani przetwarzania chronionych informacji zdrowotnych w rozumieniu prawa USA.",
          ],
        },
        {
          heading: "9. Co Państwo otrzymują",
          blocks: [
            "Filmy, scenariusze i napisy przygotowane dla gabinetu mogą Państwo wykorzystywać w komunikacji gabinetu, także po anulowaniu — w odniesieniu do wszystkiego, co zostało pobrane.",
            "Niektóre filmy zawierają materiały stockowe z Pexels, używane na licencji Pexels, oraz syntetyczny głos. Można ich używać jako części filmów, ale nie osobno (np. wycinając i odsprzedając materiały).",
            "Nie używamy Państwa treści ani filmów do trenowania modeli AI i nie pokazujemy filmów gabinetu innym klientom.",
            "Samo DentVideo (oprogramowanie, projekt, szablony i marka) pozostaje naszą własnością.",
          ],
        },
        {
          heading: "10. Dozwolone korzystanie",
          blocks: [
            "Prosimy nie używać DentVideo do tworzenia treści wprowadzających w błąd, niezgodnych z prawem lub obiecujących efekty leczenia oraz nie próbować zakłócać, przeciążać, kopiować ani odsprzedawać usługi ani uzyskiwać dostępu do danych innych gabinetów.",
            "Możemy zawiesić lub zamknąć konto naruszające regulamin. W miarę możliwości uprzedzimy o tym i damy szansę na naprawę.",
          ],
        },
        {
          heading: "11. Dostępność i zmiany",
          blocks: [
            "Staramy się dostarczać filmy co tydzień, ale nie możemy zagwarantować, że usługa będzie zawsze dostępna lub wolna od błędów. Cotygodniowa dostawa może się opóźnić, np. z powodu awarii u jednego z naszych dostawców.",
            "Stale rozwijamy DentVideo i możemy zmieniać sposób jego działania. Jeśli usuniemy coś istotnego z Państwa planu, uprzedzimy o tym, a Państwo będą mogli anulować.",
          ],
        },
        {
          heading: "12. Odpowiedzialność",
          blocks: [
            "Nic w regulaminie nie ogranicza odpowiedzialności, której nie można ograniczyć z mocy prawa, np. za winę umyślną lub rażące niedbalstwo.",
            "Poza tym nie odpowiadamy za szkody pośrednie lub następcze (np. utracone zyski, utraconych pacjentów lub szkody wizerunkowe), a nasza łączna odpowiedzialność za wszystkie roszczenia jest ograniczona do kwoty zapłaconej nam w ciągu 12 miesięcy przed powstaniem roszczenia.",
            "Ponieważ to Państwo zatwierdzają i publikują każdy film, odpowiadają Państwo za roszczenia wynikające z opublikowanych treści, w tym za skargi na gruncie przepisów o reklamie usług zdrowotnych.",
          ],
        },
        {
          heading: "13. Zakończenie umowy",
          blocks: [
            "Mogą Państwo zakończyć umowę, anulując plan i usuwając konto w Ustawieniach. Możemy ją zakończyć z 30-dniowym wyprzedzeniem lub natychmiast na podstawie punktu 10. Po usunięciu konta usuwamy jego dane zgodnie z [Polityką prywatności](privacy).",
          ],
        },
        {
          heading: "14. Zmiany regulaminu",
          blocks: [
            "Możemy aktualizować regulamin. O istotnych zmianach poinformujemy e-mailem co najmniej 30 dni przed ich wejściem w życie. Dalsze korzystanie z DentVideo oznacza obowiązywanie nowego regulaminu; jeśli go Państwo nie akceptują, mogą Państwo anulować przed jego wejściem w życie.",
          ],
        },
        {
          heading: "15. Prawo właściwe i sądy",
          blocks: [
            "Regulamin podlega prawu Czarnogóry, a właściwe są sądy w Podgoricy. Nie pozbawia to Państwa ochrony przyznanej przez bezwzględnie obowiązujące przepisy kraju siedziby, której nie można wyłączyć umową.",
            "Wiążący jest angielski tekst regulaminu. Tłumaczenia służą wygodzie; w razie rozbieżności rozstrzyga wersja angielska.",
          ],
        },
        { heading: "16. Kontakt", blocks: ["Pytania dotyczące DentVideo: {email}. Sprawy spółki: {companyEmail}."] },
      ],
    },

    privacy: {
      title: "Polityka prywatności",
      description: "Jakie dane osobowe przetwarza DentVideo, dlaczego, którzy dostawcy je otrzymują, jak długo są przechowywane i jakie mają Państwo prawa.",
      intro: [
        "Ta polityka wyjaśnia, jakie dane osobowe przetwarza {legalName} („my”), gdy gabinet korzysta z DentVideo lub ktoś odwiedza dentvideo.com, dlaczego, kto jeszcze je otrzymuje i jak długo je przechowujemy.",
        "DentVideo działa bez danych pacjentów. Pacjenci nie korzystają z DentVideo, a gabinety prosimy, by nie przesyłały niczego, co pozwala zidentyfikować pacjenta bez jego zgody.",
      ],
      sections: [
        {
          heading: "1. Administrator",
          blocks: [
            "Administratorem danych konta, rozliczeń i strony jest:",
            { operator: true },
            "W przypadku nagrań i innych materiałów przesyłanych przez gabinet to gabinet decyduje, co i w jakim celu przesyła: jest administratorem, a my przetwarzamy te dane w jego imieniu na podstawie [Umowy powierzenia przetwarzania danych](dpa).",
            "Pytania i wnioski dotyczące prywatności: {email}.",
          ],
        },
        {
          heading: "2. Jakie dane zbieramy",
          blocks: [
            {
              list: [
                "Konto: adres e-mail i dane logowania (przechowujemy skrót hasła, nigdy samo hasło) oraz informacja, czy adres został potwierdzony.",
                "Profil gabinetu: nazwa, miasto i kraj, język, oferowane zabiegi, ton, nazwa w mediach społecznościowych, link do rezerwacji, kolory marki i logo.",
                "Przesłane nagrania (w planach, które je obejmują): obraz i dźwięk z głosem i wizerunkiem nagranych osób oraz transkrypcja.",
                "To, co dla Państwa tworzymy: tematy, scenariusze, napisy, narracja, wygenerowane filmy, wyniki kontroli i Państwa zatwierdzenia.",
                "Rozliczenia: plan, status subskrypcji, data odnowienia oraz identyfikatory subskrypcji, klienta i płatności w Dodo Payments. Dane karty obsługuje Dodo Payments; nigdy do nas nie trafiają.",
                "E-maile: jakie wiadomości usługi wysłaliśmy do gabinetu i czy wypisali się Państwo z przypomnień.",
                "Zdarzenia użycia: niewielki własny zapis kroków, takich jak „wyświetlono stronę” czy „wybrano plan”, z językiem strony, tagami kampanii (utm) i domeną strony odsyłającej. Nie zawierają identyfikatora cookie, adresu IP, danych przeglądarki, imienia ani e-maila.",
                "Dane techniczne: adres IP i dane żądania są przetwarzane, aby wyświetlać strony, chronić usługę i ograniczać nadużycia (krótkotrwałe liczniki limitów zapytań).",
              ],
            },
          ],
        },
        {
          heading: "3. Pliki cookie i pamięć przeglądarki",
          blocks: [
            "Używamy tylko tego, czego usługa potrzebuje: sesyjnych plików cookie do logowania, pliku cookie zapamiętującego język, pliku cookie zapamiętującego postęp rejestracji i krótkotrwałej pamięci przeglądarki podczas rejestracji. Nie używamy reklamowych ani analitycznych plików cookie podmiotów trzecich.",
          ],
        },
        {
          heading: "4. Cele i podstawy prawne",
          blocks: [
            {
              list: [
                "Świadczenie DentVideo na podstawie umowy: tworzenie filmów, przetwarzanie nagrań, wyświetlanie ich w bibliotece i informowanie e-mailem (umowa).",
                "Pobieranie płatności i zarządzanie subskrypcją (umowa).",
                "Bezpieczeństwo usługi, zapobieganie nadużyciom i usuwanie błędów (prawnie uzasadniony interes).",
                "Zrozumienie, które strony i kanały przyciągają gabinety, na podstawie anonimowych zdarzeń użycia opisanych wyżej (prawnie uzasadniony interes).",
                "Przypomnienia o niedokończonej rejestracji, które można wyłączyć linkiem rezygnacji (prawnie uzasadniony interes).",
                "Wypełnianie obowiązków prawnych, np. prowadzenie ksiąg i dokumentacji podatkowej (obowiązek prawny).",
              ],
            },
            "Nie sprzedajemy danych osobowych, nie wykorzystujemy ich do reklamy i nie trenujemy modeli AI na Państwa treściach ani filmach.",
          ],
        },
        {
          heading: "5. Odbiorcy",
          blocks: [
            "Współpracujemy z niewielką liczbą dostawców. Każdy otrzymuje tylko to, czego potrzebuje do swojego zadania:",
            { subprocessors: true },
            "Wyszukujemy też ogólne hasła (np. nazwę zabiegu i język) w publicznych podpowiedziach wyszukiwania Google i w bibliotece materiałów wideo Pexels. Te zapytania nie zawierają danych osobowych. Baza danych, logowanie i przechowywanie plików działają na naszej własnej instalacji oprogramowania open source Supabase na naszym serwerze; Supabase Inc. nie otrzymuje danych.",
          ],
        },
        {
          heading: "6. Przekazywanie danych za granicę",
          blocks: [
            "Mamy siedzibę w Czarnogórze, poza UE/EOG. Niektórzy dostawcy przetwarzają dane w innych krajach, w tym w Stanach Zjednoczonych. Gdy prawo właściwe dla danych wymaga zabezpieczenia takiego przekazania, opieramy się na decyzji stwierdzającej odpowiedni stopień ochrony, jeśli istnieje, lub na standardowych klauzulach umownych (dla Wielkiej Brytanii z brytyjskim aneksem) w umowach z tymi dostawcami.",
          ],
        },
        {
          heading: "7. Okres przechowywania",
          blocks: [
            {
              list: [
                "Konto, profil gabinetu, przesłane pliki i filmy: dopóki istnieje konto. Gdy usuną Państwo konto w Ustawieniach, natychmiast usuwamy z systemów produkcyjnych pliki, filmy, profil gabinetu i referencje rozliczeniowe, a także login, chyba że używają go Państwo również w innej aplikacji {brand}. Kopie w kopiach zapasowych serwera są nadpisywane w miarę ich rotacji; najpóźniej 30 dni po usunięciu nie przechowujemy żadnych danych DentVideo dotyczących konta, poza wymienionymi niżej. Nie przywracamy usuniętych kont z kopii zapasowych.",
                "Zdarzenia użycia: pozostają jako anonimowa statystyka; usunięcie konta usuwa ich powiązanie z gabinetem.",
                "Faktury i dokumenty płatności: przechowuje je Dodo Payments jako sprzedawca zgodnie z własnymi obowiązkami prawnymi, a my w zakresie wymaganym przez przepisy rachunkowe i podatkowe.",
                "Liczniki limitów zapytań: od minut do godzin.",
              ],
            },
          ],
        },
        {
          heading: "8. Prawa",
          blocks: [
            "Zależnie od prawa, które Państwa dotyczy, mogą Państwo żądać dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania i kopii w formacie umożliwiającym przeniesienie, a także sprzeciwić się przetwarzaniu opartemu na prawnie uzasadnionym interesie. Konto mogą Państwo usunąć samodzielnie w Ustawieniach. Prosimy pisać na {email}; odpowiadamy w ciągu miesiąca.",
            "Mogą Państwo także złożyć skargę do organu ochrony danych: w Czarnogórze do Agencji Ochrony Danych Osobowych i Swobodnego Dostępu do Informacji; w UE/EOG do organu w swoim kraju (w Polsce do Prezesa UODO); w Wielkiej Brytanii do Information Commissioner's Office; w Turcji do Urzędu Ochrony Danych Osobowych (KVKK).",
            "Stosujemy czarnogórskie przepisy o ochronie danych osobowych oraz, w zakresie, w jakim mają zastosowanie do naszego przetwarzania, ogólne rozporządzenie UE o ochronie danych (RODO), UK GDPR i turecką ustawę nr 6698 o ochronie danych osobowych (KVKK).",
          ],
        },
        {
          heading: "9. Bezpieczeństwo",
          blocks: [
            "Połączenia są szyfrowane (HTTPS). Dane każdego gabinetu są w bazie odseparowane regułami dostępu, pliki są udostępniane wyłącznie przez krótkotrwałe podpisane linki, a dostęp do serwerów mają tylko osoby prowadzące DentVideo. Żaden system nie jest w pełni bezpieczny; jeśli naruszenie dotknie Państwa danych, poinformujemy o tym bez zbędnej zwłoki.",
          ],
        },
        { heading: "10. Dzieci", blocks: ["DentVideo jest usługą dla firm i nie jest przeznaczone dla osób poniżej 18 roku życia."] },
        {
          heading: "11. Zmiany",
          blocks: [
            "Aktualizujemy tę politykę, gdy zmienia się to, co robimy, i zmieniamy datę na górze strony. O istotnych zmianach informujemy posiadaczy kont e-mailem.",
          ],
        },
      ],
    },

    refunds: {
      title: "Polityka zwrotów",
      description: "Jak działa anulowanie i zwroty w subskrypcjach DentVideo, w tym w ofercie założycielskiej.",
      intro: ["Ta polityka jest częścią naszego [Regulaminu](terms). W skrócie: można anulować w każdej chwili, dostęp trwa do końca opłaconego okresu, a jeśli usługa zawiodła, naprawimy to."],
      sections: [
        {
          heading: "1. Anulowanie",
          blocks: [
            "Mogą Państwo anulować w każdej chwili w Ustawieniach (Zarządzaj płatnościami) lub pisząc na {email}. Anulowanie zatrzymuje kolejne odnowienie; działa na koniec już opłaconego okresu miesięcznego lub rocznego, a do tego czasu dostęp pozostaje pełny. Pobrane filmy pozostają Państwa. Usunięcie konta również anuluje subskrypcję, ze skutkiem natychmiastowym.",
          ],
        },
        {
          heading: "2. Brak zwrotów za część okresu",
          blocks: [
            "Nie zwracamy niewykorzystanej części rozpoczętego okresu, miesięcznego lub rocznego, chyba że wymaga tego prawo albo usługa zawiodła w sposób opisany niżej. Przy zmianie planu różnica za resztę bieżącego okresu jest od razu pobierana lub zaliczana na Państwa korzyść.",
          ],
        },
        {
          heading: "3. Gdy usługa zawiodła",
          blocks: [
            "Jeśli z naszej winy filmy z danego tygodnia nie zostały dostarczone lub nie nadawały się do użytku, prosimy o informację na {email} w ciągu 14 dni. Według naszego wyboru przygotujemy filmy z tego tygodnia ponownie albo zwrócimy część płatności za ten okres. Kilkudniowe opóźnienia spowodowane awarią u jednego z dostawców ani filmy odrzucone ze względów gustu nie są uznawane za błąd usługi.",
          ],
        },
        {
          heading: "4. Oferta założycielska",
          blocks: [
            "Oferta założycielska daje pierwszym {foundingClinics} gabinetom plan Practice za {foundingPrice} miesięcznie przez {foundingMonths} miesięcy, płatny co miesiąc. Po tych {foundingMonths} miesiącach ta sama subskrypcja trwa dalej w zwykłej cenie Practice, {practice} miesięcznie, chyba że ją Państwo anulują. Cena założycielska jest związana z tą subskrypcją: po anulowaniu wygasa i może nie być ponownie dostępna.",
          ],
        },
        {
          heading: "5. Jak wypłacane są zwroty",
          blocks: [
            "Sprzedawcą (merchant of record) przy każdym zakupie DentVideo jest Dodo Payments, dlatego zwroty wypłaca Dodo Payments na pierwotny środek płatności, łącznie z podatkiem pobranym od zwracanej kwoty. Prosimy najpierw napisać do nas na {email}; można też zwrócić się do Dodo Payments na podstawie jego warunków dla kupujących. Bank może potrzebować kilku dni, by pokazać zwrot.",
          ],
        },
        {
          heading: "6. Prawa ustawowe",
          blocks: [
            "DentVideo jest sprzedawane firmom i profesjonalistom. Jeśli mimo to bezwzględnie obowiązujące przepisy przyznają Państwu prawo odstąpienia lub zwrotu, przysługuje ono niezależnie od tej polityki.",
          ],
        },
      ],
    },

    dpa: {
      title: "Umowa powierzenia przetwarzania danych",
      description: "Umowa powierzenia przetwarzania danych DentVideo zgodnie z art. 28 RODO: co przetwarzamy dla gabinetów, w jaki sposób i lista podprocesorów.",
      intro: [
        "Niniejsza Umowa powierzenia przetwarzania danych („DPA”) jest częścią [Regulaminu](terms) zawartego między gabinetem („administrator”) a {legalName} („podmiot przetwarzający”). Ma zastosowanie, gdy materiały wprowadzane przez gabinet do DentVideo zawierają dane osobowe, których administratorem jest gabinet. Zostaje zawarta z chwilą akceptacji Regulaminu; podpis nie jest potrzebny. Na życzenie udostępniamy ją również w formie podpisanej.",
      ],
      sections: [
        { heading: "1. Podmiot przetwarzający", blocks: [{ operator: true }] },
        {
          heading: "2. Przedmiot, charakter i cel",
          blocks: [
            "Przetwarzamy dane osobowe gabinetu wyłącznie w celu świadczenia DentVideo: przechowywania przesłanych plików, transkrypcji nagrań, pisania, nagrywania narracji i generowania filmów, przeprowadzania kontroli, wyświetlania wyników w bibliotece gabinetu i wysyłania e-maili usługi. Przetwarzanie trwa, dopóki gabinet korzysta z DentVideo, oraz przez okres usuwania z punktu 9.",
            {
              list: [
                "Osoby, których dane dotyczą: lekarze i personel gabinetu; osoby widoczne lub słyszalne na nagraniach przesłanych przez gabinet; pacjenci tylko wtedy, gdy gabinet prześle materiały pozwalające ich zidentyfikować.",
                "Kategorie danych: imiona i nazwiska, adresy e-mail, wizerunek i głos, transkrypcje, dane profilu gabinetu. DentVideo nie potrzebuje danych o zdrowiu; są przetwarzane tylko, jeśli gabinet je prześle — wtedy gabinet odpowiada za podstawę prawną i wyraźną zgodę pacjenta.",
              ],
            },
          ],
        },
        {
          heading: "3. Polecenia",
          blocks: [
            "Przetwarzamy dane wyłącznie na udokumentowane polecenie gabinetu — Regulamin, niniejszą DPA i korzystanie z ustawień usługi — chyba że prawo wymaga inaczej; wtedy informujemy o tym gabinet z wyprzedzeniem, o ile prawo tego nie zabrania. Jeśli uznamy, że polecenie narusza przepisy o ochronie danych, poinformujemy gabinet.",
          ],
        },
        { heading: "4. Poufność", blocks: ["Wszystkie osoby w {shortName} mające dostęp do danych są zobowiązane do zachowania poufności."] },
        {
          heading: "5. Środki bezpieczeństwa",
          blocks: [
            {
              list: [
                "Szyfrowanie w transmisji (HTTPS) dla każdego połączenia ze stroną, aplikacją i naszą bazą danych.",
                "Separacja danych każdego gabinetu regułami dostępu w bazie danych; gabinet może odczytać tylko własne wiersze i pliki.",
                "Pliki udostępniane wyłącznie przez krótkotrwałe podpisane linki; przesyłanie ograniczone typem i rozmiarem.",
                "Dostęp do serwerów i kont dostawców tylko dla osób prowadzących DentVideo.",
                "Limity zapytań i wydatków dla każdego płatnego etapu przetwarzania.",
                "Samodzielne usuwanie konta, które usuwa dane gabinetu zgodnie z punktem 9.",
              ],
            },
          ],
        },
        {
          heading: "6. Podprocesorzy",
          blocks: [
            "Gabinet udziela ogólnej zgody na korzystanie z podprocesorów wymienionych niżej. Nakładamy na każdego z nich obowiązki ochrony danych nie mniej ochronne niż niniejsza DPA, w zakresie, w jakim pozwalają na to ich standardowe warunki, i pozostajemy za nich odpowiedzialni.",
            { subprocessors: true },
            "Informujemy gabinet e-mailem co najmniej 30 dni przed dodaniem lub zmianą podprocesora. Jeśli gabinet sprzeciwi się z uzasadnionych przyczyn związanych z ochroną danych, a nie znajdziemy rozwiązania, może anulować subskrypcję, a my zwrócimy opłaty wniesione z góry za okres po zmianie.",
            "Nie są podprocesorami: Supabase to oprogramowanie open source, które sami uruchamiamy na wskazanym serwerze (Supabase Inc. nie otrzymuje danych). Podpowiedzi wyszukiwania Google i biblioteka wideo Pexels otrzymują tylko ogólne hasła wyszukiwania, nigdy dane osobowe. Dodo Payments działa w zakresie danych płatniczych jako odrębny administrator na podstawie własnych warunków.",
          ],
        },
        {
          heading: "7. Przekazywanie danych za granicę",
          blocks: [
            "Mamy siedzibę w Czarnogórze, poza UE/EOG, a niektórzy podprocesorzy przetwarzają dane w Stanach Zjednoczonych. Gdy RODO, UK GDPR lub inne właściwe prawo wymaga mechanizmu przekazania dla danych przesyłanych do nas lub do podprocesora, strony opierają się na decyzji stwierdzającej odpowiedni stopień ochrony, jeśli istnieje, a w przeciwnym razie na standardowych klauzulach umownych Komisji Europejskiej (moduł administrator–podmiot przetwarzający lub podmiot przetwarzający–podmiot przetwarzający, w razie potrzeby z brytyjskim aneksem), które podpisujemy na życzenie.",
          ],
        },
        {
          heading: "8. Pomoc, naruszenia i audyty",
          blocks: [
            {
              list: [
                "Pomagamy gabinetowi odpowiadać na żądania osób, których dane dotyczą, np. odnajdując lub usuwając materiały, w zakresie, na jaki pozwala usługa.",
                "Pomagamy gabinetowi w zakresie bezpieczeństwa, ocen skutków dla ochrony danych i konsultacji z organami, gdy dotyczą naszego przetwarzania.",
                "Zgłaszamy gabinetowi naruszenie ochrony danych osobowych dotyczące jego danych bez zbędnej zwłoki po jego stwierdzeniu, wraz z posiadanymi informacjami.",
                "Udostępniamy informacje niezbędne do wykazania zgodności z niniejszą DPA i umożliwiamy audyty po rozsądnym uprzedzeniu, nie częściej niż raz w roku, chyba że organ wymaga więcej, na koszt gabinetu.",
              ],
            },
          ],
        },
        {
          heading: "9. Usunięcie po zakończeniu",
          blocks: [
            "Gabinet może w każdej chwili pobrać swoje filmy. Gdy gabinet usunie konto, natychmiast usuwamy jego dane z systemów produkcyjnych; kopie w kopiach zapasowych są nadpisywane w miarę rotacji i najpóźniej po 30 dniach nie przechowujemy żadnych danych gabinetu, chyba że prawo wymaga ich zachowania.",
          ],
        },
        {
          heading: "10. Prawo i pierwszeństwo",
          blocks: [
            "Niniejsza DPA podlega prawu i jurysdykcji Regulaminu, bez ograniczania praw osób, których dane dotyczą, ani organów na podstawie RODO lub innych właściwych przepisów o ochronie danych. W razie sprzeczności z Regulaminem w sprawach ochrony danych pierwszeństwo ma niniejsza DPA. Wiążący jest tekst angielski.",
          ],
        },
      ],
    },

    imprint: {
      title: "Nota prawna",
      description: "Nota prawna dentvideo.com: BLS AI Automation DOO, Podgorica, Czarnogóra — rejestr, numer podatkowy, dyrektor zarządzający i kontakt.",
      intro: ["Informacje o usługodawcy dentvideo.com (zgodnie z § 5 niemieckiej ustawy o usługach cyfrowych, DDG, i art. 5 unijnej dyrektywy o handlu elektronicznym)."],
      sections: [
        { heading: "Usługodawca", blocks: [{ operator: true }] },
        { heading: "Odpowiedzialny za treść", blocks: ["{director}, {address}."] },
        {
          heading: "Rozstrzyganie sporów",
          blocks: [
            "DentVideo jest oferowane firmom i profesjonalistom. Nie mamy obowiązku ani zamiaru uczestniczyć w postępowaniach w sprawie rozstrzygania sporów przed konsumenckim sądem polubownym.",
          ],
        },
      ],
    },
  },
};
