import type { Guide } from "../dentvideo";

// Poradniki po polsku dla gabinetów stomatologicznych. Zasady: forma „Państwo”,
// bez wymyślonych liczb, cen i opinii pacjentów; przepisy opisujemy ostrożnie,
// ze źródłami urzędowymi, a numery artykułów podajemy tylko sprawdzone.

const KEL = {
  label: "Naczelna Izba Lekarska — Kodeks Etyki Lekarskiej (uchwała Nadzwyczajnego XVI Krajowego Zjazdu Lekarzy z 18 maja 2024 r., obowiązuje od 1 stycznia 2025 r.)",
  url: "https://nil.org.pl/uploaded_images/1716532642_kel.pdf",
};
const KEL_ART71 = {
  label: "Naczelna Izba Lekarska — komentarz do art. 71 Kodeksu Etyki Lekarskiej (styczeń 2025)",
  url: "https://nil.org.pl/uploaded_files/art_1736325594_komentarz-art71.pdf",
};
const UDL = {
  label: "Ustawa z 15 kwietnia 2011 r. o działalności leczniczej, tekst jednolity Dz.U. 2026 poz. 156 (art. 14) — eli.gov.pl",
  url: "https://eli.gov.pl/eli/DU/2026/156",
};
const OIL_LODZ = {
  label: "Okręgowa Izba Lekarska w Łodzi — Reklama w działalności leczniczej lekarza",
  url: "https://oil.lodz.pl/prawo/najnowsze-informacje-prawne/reklama-w-dzialalnosci-leczniczej-lekarza.html",
};

export const GUIDES_PL: Guide[] = [
  {
    locale: "pl",
    slug: "reklama-gabinetu-stomatologicznego-kodeks-etyki",
    category: "rules",
    published: "2026-11-09",
    updated: "2026-11-09",
    title: "Reklama gabinetu stomatologicznego po 1 stycznia 2025: co pozwala Kodeks Etyki Lekarskiej",
    seoTitle: "Reklama dentysty a Kodeks Etyki Lekarskiej 2025",
    seoDescription:
      "Co zmienił art. 71 Kodeksu Etyki Lekarskiej, co nadal mówi ustawa o działalności leczniczej i jak publikować w social mediach gabinetu. Z listą kontrolną.",
    description:
      "Kodeks Etyki Lekarskiej od 2025 r., art. 14 ustawy o działalności leczniczej, opinie pacjentów, zdjęcia przed i po, ceny i promocje w social mediach gabinetu. Nie porada prawna.",
    h1: "Reklama gabinetu stomatologicznego a Kodeks Etyki Lekarskiej",
    intro:
      "Od 1 stycznia 2025 r. Kodeks Etyki Lekarskiej nie zawiera już ogólnego zakazu reklamy: zgodnie z nowym art. 71 lekarz i lekarz dentysta mogą posługiwać się informacją o oferowanych usługach, jeśli jest ona zgodna z zasadami etyki. Nadal obowiązuje jednak art. 14 ustawy o działalności leczniczej, według którego informacje podmiotu leczniczego nie mogą mieć cech reklamy. Najbezpieczniejsze są więc rzeczowe, edukacyjne treści bez obietnic, porównań, promocji i opinii pacjentów.",
    sections: [
      {
        heading: "Co zmieniło się 1 stycznia 2025 r.",
        paragraphs: [
          "Nowy Kodeks Etyki Lekarskiej uchwalił Nadzwyczajny XVI Krajowy Zjazd Lekarzy 18 maja 2024 r., a obowiązuje on lekarzy i lekarzy dentystów od 1 stycznia 2025 r. Zniknął dawny przepis zakazujący lekarzom reklamy. W jego miejsce art. 71 stanowi, że lekarz może posługiwać się informacją o oferowanych usługach, pod warunkiem że jest ona zgodna z zasadami etyki lekarskiej.",
          "Zmiana wpisuje się w orzecznictwo Trybunału Sprawiedliwości UE, według którego całkowity zakaz reklamy usług zdrowotnych jest sprzeczny z prawem Unii. Nie oznacza to jednak dowolności: kodeks nadal wymaga rzetelności, a granica między informowaniem a nachalną promocją dopiero kształtuje się w praktyce izb i sądów lekarskich.",
        ],
      },
      {
        heading: "Co mówi art. 71 Kodeksu Etyki Lekarskiej",
        paragraphs: [
          "Według komentarza Naczelnej Izby Lekarskiej art. 71 obejmuje w praktyce każdą formę komunikacji, której celem jest promowanie wizerunku lekarza lub jego usług związanych z wykonywaniem zawodu. Z punktu widzenia gabinetu najważniejsze są trzy elementy:",
        ],
        list: [
          "informacja o usługach jest dozwolona, jeśli jest zgodna z zasadami etyki: rzetelna, nie wprowadza w błąd i nie wywiera presji na pacjenta",
          "lekarz odpowiada także za informacje o swoich usługach rozpowszechniane w jego imieniu lub na jego rzecz przez osoby trzecie, np. agencję marketingową, freelancera czy pracownika prowadzącego profil",
          "nie wolno wykorzystywać autorytetu zawodu lekarza do promowania produktów i usług w sposób sprzeczny z etyką",
        ],
        after: [
          "Dokładne brzmienie przepisu warto sprawdzić w tekście kodeksu opublikowanym przez Naczelną Izbę Lekarską. Nowy kodeks po raz pierwszy odnosi się także do aktywności lekarzy w mediach społecznościowych, więc profil gabinetu i prywatny profil lekarza podlegają tym samym zasadom etyki, gdy dotyczą wykonywania zawodu.",
        ],
      },
      {
        heading: "Ustawa o działalności leczniczej nadal obowiązuje",
        paragraphs: [
          "Kodeks etyki to jedno, a ustawa to drugie. Art. 14 ust. 1 ustawy o działalności leczniczej (tekst jednolity Dz.U. 2026 poz. 156) stanowi, że podmiot wykonujący działalność leczniczą podaje do publicznej wiadomości informacje o zakresie i rodzajach udzielanych świadczeń zdrowotnych, a ich treść i forma nie mogą mieć cech reklamy. Dotyczy to także gabinetów i praktyk zawodowych.",
          "Komentatorzy zwracają uwagę na napięcie między tym przepisem a nowym kodeksem i prawem UE, a środowisko postuluje zmianę ustawy. Dopóki jednak przepis obowiązuje, rozsądnie jest traktować go jako wiążący: profil gabinetu powinien przede wszystkim informować i edukować, a nie zachęcać do zakupu usług.",
          "Poza tym obowiązują przepisy ogólne: o zwalczaniu nieuczciwej konkurencji i o przeciwdziałaniu nieuczciwym praktykom rynkowym (treści wprowadzające w błąd), przepisy o reklamie leków i wyrobów medycznych, które ograniczają udział w niej osób wykonujących zawody medyczne, a także RODO i tajemnica lekarska w przypadku wizerunku i danych pacjentów.",
        ],
      },
      {
        heading: "Czego unikać w mediach społecznościowych",
        paragraphs: ["Na Instagramie, Facebooku, TikToku czy YouTube szczególnie ryzykowne są:"],
        list: [
          "słowa „najlepszy”, „nr 1”, „lider” i porównania z innymi gabinetami",
          "obietnice i gwarancje: „gwarantowany efekt”, „bezbolesne leczenie”, „na całe życie”",
          "ceny przedstawiane jako zachęta: promocje, rabaty, „tylko w tym miesiącu”, konkursy z zabiegiem w nagrodzie",
          "opinie i podziękowania pacjentów publikowane przez gabinet",
          "zdjęcia „przed i po”, które sugerują pewny efekt",
          "rozpoznawalni pacjenci bez wyraźnej, udokumentowanej zgody",
          "polecanie konkretnych marek past, szczoteczek czy nakładek ortodontycznych",
          "treści straszące chorobą, by skłonić do wizyty",
        ],
        after: [
          "Bezpieczniejsze są ostrożne sformułowania: „zwykle”, „u większości pacjentów”, „efekt zależy od indywidualnej sytuacji”, „lekarz dentysta dobierze leczenie po badaniu”.",
        ],
      },
      {
        heading: "Agencja, freelancer, pracownik: kto odpowiada",
        paragraphs: [
          "Ponieważ lekarz odpowiada za informacje rozpowszechniane w jego imieniu, przekazanie profilu agencji nie przenosi na nią odpowiedzialności zawodowej. Warto zapisać w umowie, że żaden post nie zostanie opublikowany bez akceptacji lekarza dentysty, i przechowywać zatwierdzone wersje.",
          "Ta sama zasada dotyczy pracownika rejestracji, który prowadzi profil gabinetu „przy okazji”. Prosty, stały schemat akceptacji opisaliśmy w poradniku [co może publikować gabinet stomatologiczny](guide:co-publikowac-gabinet-stomatologiczny).",
        ],
      },
      {
        heading: "Lista kontrolna przed publikacją",
        paragraphs: ["Przed publikacją każdego posta warto odpowiedzieć na te pytania:"],
        ordered: true,
        list: [
          "Czy post przede wszystkim informuje lub edukuje, a nie namawia do zakupu?",
          "Czy nie ma w nim superlatywów, porównań z innymi gabinetami ani obietnic efektu?",
          "Czy nie ma cen przedstawionych jako zachęta, rabatów, promocji ani konkursów?",
          "Czy nie zawiera opinii pacjentów ani zdjęć „przed i po”?",
          "Czy nie widać pacjentów ani danych, które pozwalają ich rozpoznać?",
          "Czy nie poleca konkretnych marek leków, wyrobów medycznych lub kosmetyków?",
          "Czy lekarz dentysta sprawdził treść merytorycznie i ją zaakceptował?",
          "Czy zatwierdzona wersja została zapisana wraz z datą i nazwiskiem osoby akceptującej?",
        ],
        after: [
          "W razie wątpliwości warto zapytać okręgową izbę lekarską. Część izb publikuje własne opracowania na temat reklamy w działalności leczniczej.",
        ],
      },
      {
        heading: "Jak pomaga DentVideo",
        paragraphs: [
          "[DentVideo](landing:) co tydzień przygotowuje pięć krótkich filmów edukacyjnych na podstawie usług gabinetu i pytań, które pacjenci w Polsce faktycznie wpisują w wyszukiwarkę. Każdy scenariusz przechodzi kontrolę zgodności z zasadami reklamy medycznej (Kodeks Etyki Lekarskiej 2025) i poprawności klinicznej, a potem czeka na Państwa akceptację. DentVideo nie zastępuje porady prawnej ani stanowiska izby; decyzja o publikacji zawsze należy do gabinetu.",
          "Więcej w poradniku [co publikować w social mediach gabinetu](guide:co-publikowac-gabinet-stomatologiczny) i na liście [wszystkich poradników](guides:). [Podgląd z logo i kolorami gabinetu](start:) zobaczą Państwo przed płatnością.",
        ],
      },
    ],
    faq: [
      {
        q: "Czy od 2025 r. dentysta może się reklamować?",
        a: "Kodeks Etyki Lekarskiej nie zawiera już ogólnego zakazu: art. 71 pozwala posługiwać się informacją o usługach zgodną z zasadami etyki. Nadal obowiązuje jednak art. 14 ustawy o działalności leczniczej, więc najbezpieczniejsze są rzeczowe treści informacyjne i edukacyjne.",
      },
      {
        q: "Czy gabinet może publikować ceny?",
        a: "Informacja o cenniku na stronie gabinetu to co innego niż post z promocją. W mediach społecznościowych lepiej unikać cen podawanych jako zachęta, rabatów i ofert ograniczonych w czasie.",
      },
      {
        q: "Czy można pokazać zdjęcia „przed i po”, jeśli pacjent się zgodził?",
        a: "Zgoda pacjenta jest konieczna, ale nie rozwiązuje problemu sugerowania pewnego efektu. Zdjęcia „przed i po” w postach publicznych są ryzykowne; jeśli już, to tylko z rzetelnym opisem i zastrzeżeniem, że efekty są indywidualne. Bezpieczniej z nich zrezygnować.",
      },
      {
        q: "Kto odpowiada za posty przygotowane przez agencję?",
        a: "Zgodnie z art. 71 Kodeksu Etyki Lekarskiej lekarz odpowiada również za informacje o swoich usługach rozpowszechniane przez osoby trzecie w jego imieniu. Dlatego każdy post powinien przejść akceptację lekarza dentysty.",
      },
      {
        q: "Czy prywatny profil lekarza dentysty też podlega tym zasadom?",
        a: "Jeżeli dotyczy wykonywania zawodu lub usług gabinetu, tak. Nowy kodeks odnosi się również do aktywności lekarzy w mediach społecznościowych.",
      },
    ],
    sources: [KEL, KEL_ART71, UDL, OIL_LODZ],
  },
  {
    locale: "pl",
    slug: "co-publikowac-gabinet-stomatologiczny",
    category: "ideas",
    published: "2026-11-09",
    updated: "2026-11-09",
    title: "Co może publikować gabinet stomatologiczny w social mediach: tematy, formaty, akceptacja i lista kontrolna",
    seoTitle: "Co publikować w social mediach gabinetu dentysty",
    seoDescription:
      "Tematy postów i rolek dla gabinetu stomatologicznego, formaty wideo, prosty schemat akceptacji i lista kontrolna zgodna z duchem Kodeksu Etyki Lekarskiej.",
    description:
      "Praktyczny poradnik dla gabinetów stomatologicznych: bezpieczne tematy, czego unikać, formaty Reels i TikTok, schemat akceptacji postów i lista kontrolna przed publikacją.",
    h1: "Co może publikować gabinet stomatologiczny w social mediach",
    intro:
      "Gabinet stomatologiczny najbezpieczniej publikuje krótkie, pionowe filmy z napisami, które odpowiadają na jedno pytanie zadawane przez pacjentów: o profilaktykę, przebieg leczenia, pierwszą wizytę czy zęby dzieci. Takie treści informują i edukują, więc dobrze mieszczą się w granicach Kodeksu Etyki Lekarskiej i ustawy o działalności leczniczej. Promocje, ceny jako zachęta, opinie pacjentów i zdjęcia „przed i po” lepiej pominąć, a każdy post powinien zaakceptować lekarz dentysta.",
    sections: [
      {
        heading: "Na początek: pytania pacjentów",
        paragraphs: [
          "Najlepsza lista tematów już istnieje: to pytania, które Państwa zespół słyszy codziennie w rejestracji i na fotelu. Wystarczy przez tydzień zapisywać je na kartce, by mieć tematy na kilka miesięcy.",
          "Jeden post powinien odpowiadać na jedno pytanie. Warto też mówić wyłącznie o usługach, które gabinet rzeczywiście wykonuje. Pacjent, który zobaczy film o leczeniu niedostępnym w Państwa gabinecie, trafi pod niewłaściwy adres.",
        ],
      },
      {
        heading: "Tematy, które dobrze się sprawdzają",
        paragraphs: ["Poniższe tematy mają charakter ogólnej informacji i pasują do większości gabinetów przez cały rok:"],
        list: [
          "jak prawidłowo szczotkować zęby i używać nici lub szczoteczek międzyzębowych",
          "kiedy krwawienie dziąseł jest sygnałem, by zgłosić się na kontrolę",
          "co dzieje się podczas przeglądu i higienizacji",
          "jak wygląda pierwsza wizyta i co warto ze sobą zabrać",
          "kiedy pierwsza wizyta dziecka u dentysty i jak ją przygotować",
          "higiena jamy ustnej w ciąży",
          "na co uważać po leczeniu kanałowym",
          "jak wygląda konsultacja w sprawie ósemek",
          "jak dbać o protezę lub szyny ortodontyczne",
          "jak gabinet dba o sterylizację i bezpieczeństwo",
          "zmiany godzin pracy, dni wolne i dyżury świąteczne",
        ],
        after: [
          "Kalendarz podsuwa kolejne tematy: powrót do szkoły, wakacje, święta. Dzięki temu łatwo zaplanować publikacje na cały rok.",
        ],
      },
      {
        heading: "Czego unikać",
        paragraphs: [
          "Nawet chwytliwy post nie jest wart ryzyka. Szczegóły prawne wyjaśniamy w poradniku [reklama gabinetu a Kodeks Etyki Lekarskiej](guide:reklama-gabinetu-stomatologicznego-kodeks-etyki); w skrócie warto pominąć:",
        ],
        list: [
          "promocje, rabaty, konkursy i ceny przedstawiane jako zachęta",
          "opinie, recenzje i podziękowania pacjentów",
          "zdjęcia i filmy „przed i po”",
          "słowa „najlepszy”, „nr 1”, „gwarancja”, „bezbolesny”",
          "pacjentów w kadrze, także w tle",
          "polecanie konkretnych marek past, szczoteczek i nakładek",
          "treści, które straszą, by skłonić do wizyty",
        ],
      },
      {
        heading: "Format: pionowo, krótko, z napisami",
        paragraphs: [
          "Rolki na Instagramie i Facebooku, TikTok i YouTube Shorts to pionowe wideo w formacie 9:16. Pytanie pada w pierwszej sekundzie, odpowiedź mieści się w dwóch, trzech zdaniach, a zakończenie jest spokojne, np. „Jeśli mają Państwo wątpliwości, porozmawiajmy na najbliższej kontroli”. Zwykle wystarczy od 15 do 60 sekund.",
          "Napisy są obowiązkowe: wiele osób ogląda bez dźwięku. Najlepiej umieścić je w dolnej części kadru, ale nad przyciskami aplikacji. Karuzele ze zdjęciami dobrze sprawdzają się przy instrukcjach krok po kroku, a relacje przy bieżących komunikatach, np. o zmianie godzin pracy.",
          "Facebook wciąż jest w Polsce ważnym kanałem, zwłaszcza wśród starszych pacjentów, dlatego warto publikować te same filmy także tam. Profil w serwisach z opiniami o lekarzach to osobny temat: gabinet nie powinien zachęcać do opinii nagrodami ani przenosić ich do własnych postów.",
        ],
      },
      {
        heading: "Schemat akceptacji w gabinecie",
        paragraphs: [
          "Regularność wymaga jasnego podziału ról. Ponieważ lekarz odpowiada także za treści publikowane w jego imieniu, akceptacja lekarza dentysty jest obowiązkowym krokiem. Przykładowy schemat:",
        ],
        ordered: true,
        list: [
          "Wybór tematu: jedno pytanie z listy pytań pacjentów",
          "Tekst lub scenariusz: krótka odpowiedź prostym językiem",
          "Sprawdzenie sformułowań: brak superlatywów, obietnic, cen, promocji i opinii pacjentów",
          "Akceptacja lekarza dentysty: poprawność merytoryczna i zgodność z zasadami etyki",
          "Publikacja w stałym dniu z profilu gabinetu",
          "Archiwum: data, treść, plik źródłowy i nazwisko osoby akceptującej",
        ],
        after: [
          "Do nagrań w gabinecie warto wybrać porę bez pacjentów. Od pracowników, którzy pojawiają się w kadrze, warto mieć pisemną zgodę na wykorzystanie wizerunku, z ustaleniem, co dzieje się z nagraniami po zakończeniu współpracy.",
        ],
      },
      {
        heading: "Lista kontrolna przed publikacją",
        paragraphs: ["Przed kliknięciem „Opublikuj”:"],
        list: [
          "post odpowiada na jedno pytanie i ma charakter informacyjny",
          "nie ma superlatywów, porównań ani obietnic efektu",
          "nie ma cen jako zachęty, rabatów, promocji ani konkursów",
          "nie ma opinii pacjentów ani zdjęć „przed i po”",
          "w kadrze nie ma pacjentów ani ich danych",
          "nie pada nazwa konkretnej marki leku, wyrobu czy kosmetyku",
          "film ma napisy i jest zrozumiały bez dźwięku",
          "lekarz dentysta zaakceptował treść, a wersja jest zarchiwizowana",
        ],
      },
      {
        heading: "Regularność ważniejsza niż liczba postów",
        paragraphs: [
          "Od jednego do trzech krótkich filmów tygodniowo, publikowanych w stałe dni, to dla większości gabinetów realny plan. Z jednego pięciominutowego nagrania, w którym lekarz odpowiada na kilka pytań, można wyciąć klipy na cały tydzień.",
          "Oceniając efekty, warto patrzeć nie tylko na polubienia, ale też na to, jak długo filmy są oglądane, ile razy są zapisywane i udostępniane oraz czy pacjenci wspominają o nich podczas wizyty. Tematy, które wzbudziły zainteresowanie, warto rozwijać.",
        ],
      },
      {
        heading: "Jak pomaga DentVideo",
        paragraphs: [
          "[DentVideo](landing:) co tydzień planuje pięć tematów na podstawie usług gabinetu i pytań, które pacjenci w Polsce wpisują w wyszukiwarkę, a następnie pisze scenariusze, nagrywa je z lektorem i dodaje napisy w kolorach i z logo gabinetu. Każdy scenariusz jest sprawdzany pod kątem zasad reklamy medycznej i poprawności klinicznej, a potem czeka na Państwa akceptację. W schemacie powyżej DentVideo przejmuje więc pisanie i sprawdzanie sformułowań; decyzja o publikacji zostaje w gabinecie.",
          "Zasady prawne opisuje poradnik [reklama gabinetu stomatologicznego a Kodeks Etyki Lekarskiej](guide:reklama-gabinetu-stomatologicznego-kodeks-etyki). Zapraszamy też do [wszystkich poradników](guides:) i do [podglądu z logo gabinetu](start:) przed płatnością.",
        ],
      },
    ],
    faq: [
      {
        q: "Jak często publikować?",
        a: "Regularność jest ważniejsza niż liczba postów. Od jednego do trzech krótkich filmów tygodniowo w stałe dni to realny cel dla większości gabinetów.",
      },
      {
        q: "Czy lekarz dentysta musi występować w filmach?",
        a: "Nie musi, ale pacjenci często chętniej wybierają osobę, którą już „znają” z nagrań. W tygodniach bez nagrań dobrze sprawdzają się filmy edukacyjne z lektorem.",
      },
      {
        q: "Czy można pokazywać zespół i wnętrze gabinetu?",
        a: "Tak, za zgodą pracowników i bez pacjentów w kadrze. Warto unikać porównań w rodzaju „najnowocześniejszy gabinet w mieście”.",
      },
      {
        q: "Czy wolno pisać o wybielaniu, implantach i ortodoncji?",
        a: "Tak, jako rzetelną informację: na czym polega leczenie, jak przebiega, jakie są ograniczenia i ryzyka. Bez obietnic efektu, cen jako zachęty i zdjęć „przed i po”.",
      },
    ],
    sources: [KEL, KEL_ART71, UDL],
  },
];
