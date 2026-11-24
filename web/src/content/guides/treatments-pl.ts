import type { Guide } from "../dentvideo";

// Filmy edukacyjne według zabiegu, pisane dla gabinetów w Polsce (nie tłumaczenie):
// o co pytają pacjenci, jakie krótkie filmy na to odpowiadają i jakich sformułowań
// unikać w świetle art. 71 KEL i art. 14 ustawy o działalności leczniczej.
// Forma „Państwo”; bez cen, statystyk i opinii pacjentów.

const KEL_ART71 = {
  label: "Naczelna Izba Lekarska: komentarz do art. 71 Kodeksu Etyki Lekarskiej (styczeń 2025)",
  url: "https://nil.org.pl/uploaded_files/art_1736325594_komentarz-art71.pdf",
};
const KEL = {
  label: "Naczelna Izba Lekarska: Kodeks Etyki Lekarskiej (obowiązuje od 1 stycznia 2025 r.)",
  url: "https://nil.org.pl/uploaded_images/1716532642_kel.pdf",
};
const UDL = {
  label: "Ustawa z 15 kwietnia 2011 r. o działalności leczniczej, tekst jednolity Dz.U. 2026 poz. 156 (art. 14), eli.gov.pl",
  url: "https://eli.gov.pl/eli/DU/2026/156",
};
const DIR_WHITENING = {
  label: "Dyrektywa Rady 2011/84/UE w sprawie produktów kosmetycznych (środki do wybielania zębów z nadtlenkiem wodoru), EUR-Lex",
  url: "https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32011L0084",
};

const DATES = { published: "2026-11-16", updated: "2026-11-16", reviewed: "2026-11-16" } as const;

export const TREATMENTS_PL: Guide[] = [
  {
    locale: "pl",
    slug: "wybielanie-zebow-filmy-edukacyjne-dla-pacjentow",
    topic: "treatment-whitening",
    category: "treatments",
    ...DATES,
    sample: "wybielanie-przed-slubem",
    title: "Wybielanie zębów w filmach edukacyjnych: pytania pacjentów, tematy i sformułowania, których unikać",
    seoTitle: "Wybielanie zębów: filmy edukacyjne dla gabinetu",
    seoDescription:
      "Krótkie filmy o wybielaniu zębów dla gabinetu: szkliwo, nadwrażliwość, korony, termin przed ważnym dniem i obietnice, których lepiej nie składać.",
    description:
      "O co pacjenci pytają przed wybielaniem, sześć krótkich filmów, które na to odpowiadają, budowa filmu w pięciu krokach i sformułowania ryzykowne w świetle zasad etyki i reklamy.",
    h1: "Wybielanie zębów w filmach edukacyjnych: co nagrać, a czego unikać",
    intro:
      "Film edukacyjny o wybielaniu zębów to krótkie nagranie z napisami, które odpowiada na jedno pytanie: czy wybielanie niszczy szkliwo, skąd nadwrażliwość, czy zmieni kolor koron i wypełnień, kiedy zacząć przed ważnym dniem. Wybielanie jest zabiegiem estetycznym, więc to temat, przy którym post gabinetu najłatwiej zamienia się w reklamę. Najbardziej użyteczne filmy rzeczowo wyjaśniają fakty, a decyzję zostawiają na konsultację.",
    sections: [
      {
        heading: "O co pacjenci pytają przed wybielaniem?",
        paragraphs: [
          "Pytania o wybielanie dotyczą głównie bezpieczeństwa i oczekiwań. Zespół rejestracji i lekarze słyszą je tak często, że każde nadaje się na osobny krótki film. Warto zacząć od pytań, które padają w Państwa gabinecie najczęściej; poniższa lista to punkt wyjścia.",
        ],
        list: [
          "Czy wybielanie osłabia albo ściera szkliwo?",
          "Dlaczego zęby są nadwrażliwe po wybielaniu i jak długo to trwa?",
          "Czy wybielanie zmieni kolor koron, licówek albo wypełnień?",
          "Czym różni się wybielanie w gabinecie, nakładkowe w domu i preparaty z drogerii?",
          "Ile wcześniej zacząć przed ślubem albo innym ważnym dniem?",
          "Czy po wybielaniu można pić kawę, herbatę albo czerwone wino?",
          "Czy wybielanie jest dla nastolatków i kobiet w ciąży?",
          "Dlaczego lekarz chce najpierw zbadać zęby?",
        ],
        after: [
          "Pytanie „ile to kosztuje?” też jest ważne, ale cena pokazana w poście łatwo staje się zachętą, a informacje podmiotu leczniczego nie mogą mieć cech reklamy. Jej miejsce jest w cenniku na stronie gabinetu i podczas konsultacji.",
        ],
      },
      {
        heading: "Jakie filmy o wybielaniu nagrać?",
        paragraphs: ["Sześć filmów odpowiada na większość tych pytań, nie obiecując odcienia ani efektu."],
        table: {
          caption: "Sześć filmów o wybielaniu zębów i gdzie każdy się przydaje",
          columns: ["Film", "Na co odpowiada", "Gdzie pomaga najbardziej"],
          rows: [
            ["Wybielanie a szkliwo", "Co wybielanie pod kontrolą lekarza robi ze szkliwem, a czego nie", "Social media"],
            ["Nadwrażliwość po wybielaniu", "Skąd się bierze, że zwykle mija, co pomaga", "Wiadomość po zabiegu, social media"],
            ["Korony i wypełnienia się nie wybielają", "Dlaczego istniejące uzupełnienia trzeba uwzględnić w planie", "Przed konsultacją"],
            ["Gabinet czy drogeria?", "Czym różnią się preparaty i kto może je stosować", "Social media, strona gabinetu"],
            ["Termin przed ważnym dniem", "Dlaczego warto zacząć z wyprzedzeniem i najpierw zrobić przegląd", "Social media, strona gabinetu"],
            ["Pierwsze dni po wybielaniu", "Barwiące napoje i jedzenie, palenie, kiedy dzwonić do gabinetu", "Wiadomość po zabiegu"],
          ],
        },
        after: [
          "Do filmu „gabinet czy drogeria?” przydaje się rzeczowy fakt z prawa UE: preparaty do wybielania zębów zawierające lub uwalniające powyżej 0,1 do 6 procent nadtlenku wodoru mogą być sprzedawane wyłącznie lekarzom dentystom, pierwsze zastosowanie w każdym cyklu wykonuje lekarz dentysta lub odbywa się ono pod jego bezpośrednim nadzorem, a takich preparatów nie stosuje się u osób poniżej 18. roku życia (dyrektywa 2011/84/UE, zob. źródła). Warto mówić o tym spokojnie, bez straszenia i bez krytykowania konkretnych produktów.",
        ],
      },
      {
        heading: "Jakich sformułowań unikać w filmach o wybielaniu?",
        paragraphs: [
          "Zabiegi estetyczne najczęściej kuszą obietnicą efektu i zdjęciami „przed i po”. Art. 71 Kodeksu Etyki Lekarskiej pozwala informować o usługach zgodnie z zasadami etyki, a art. 14 ustawy o działalności leczniczej wymaga, by informacje podmiotu leczniczego nie miały cech reklamy. Szczegóły w poradniku [reklama gabinetu stomatologicznego a Kodeks Etyki Lekarskiej](guide:reklama-gabinetu-stomatologicznego-kodeks-etyki).",
        ],
        table: {
          caption: "Wybielanie: sformułowania ryzykowne i bezpieczniejsze",
          columns: ["Ryzykowne sformułowanie", "Dlaczego to problem", "Bezpieczniejsza wersja"],
          rows: [
            ["„Osiem odcieni jaśniej”", "Obietnica efektu, który zależy od wyjściowego koloru zębów", "„To, o ile zęby się rozjaśnią, zależy od ich wyjściowego koloru”"],
            ["„Efekt od razu po jednej wizycie”", "Wprowadza w błąd, gdy zwykle potrzeba kilku wizyt albo dni", "„Na konsultacji wyjaśnimy, ile wizyt lub dni zwykle trwa wybielanie”"],
            ["„Bez nadwrażliwości”", "Przejściowa nadwrażliwość to częsty, zwykle mijający objaw", "„U części osób pojawia się przejściowa nadwrażliwość; podpowiemy, co pomaga”"],
            ["Zdjęcia „przed i po” pacjentki", "Sugerują pewny efekt i wymagają wyraźnej, udokumentowanej zgody", "Wyjaśnienie na kolorniku albo ilustracji"],
            ["„Wiosenna promocja na wybielanie”", "Cena i rabat jako zachęta nadają informacji cechy reklamy", "Bez promocji i cen w filmach"],
            ["„Hollywoodzki uśmiech na ślub”", "Obietnica efektu i presja terminu", "„Przed ważnym dniem warto zacząć od przeglądu i zaplanować wybielanie z wyprzedzeniem”"],
          ],
          note: "To ogólne wskazówki, a nie porada prawna. W razie wątpliwości warto zapytać okręgową izbę lekarską.",
        },
        after: [
          "Przed publikacją warto wkleić opis do naszego [sprawdzacza „Czy mój post jest dozwolony?”](checker:). To szybkie pierwsze sito na obietnice i superlatywy, nie ocena prawna.",
        ],
      },
      {
        heading: "Jak zbudować 30-sekundowy film o wybielaniu?",
        ordered: true,
        paragraphs: ["Te same pięć kroków sprawdza się przy każdym temacie:"],
        list: [
          "Pytanie albo mit w pierwszej sekundzie: „Biały uśmiech na ślub? Termin ma znaczenie.”",
          "Odpowiedź w jednym–dwóch prostych zdaniach, bez liczby odcieni.",
          "Praktyczna wskazówka: najpierw przegląd i ewentualne leczenie, potem wybielanie.",
          "Uczciwe ograniczenie: korony i wypełnienia nie zmieniają koloru, efekt jest indywidualny.",
          "Zaproszenie zamiast sprzedaży: „Proszę zapytać na najbliższej wizycie, czy wybielanie jest dla Państwa.”",
        ],
        after: [
          "Film na górze tej strony to prawdziwy przykład DentVideo zbudowany według tego schematu. Napisy są konieczne, bo wiele osób ogląda bez dźwięku. Więcej o długości i miejscach wyświetlania w poradniku [filmy edukacyjne dla pacjentów](guide:filmy-edukacyjne-dla-pacjentow-gabinet-stomatologiczny).",
        ],
      },
      {
        heading: "Kiedy publikować filmy o wybielaniu?",
        paragraphs: [
          "Zainteresowanie wybielaniem zwykle rośnie przed sezonem ślubnym, wakacjami i świętami, a wtedy kusi, by profil wypełnić treściami estetycznymi. Warto zachować proporcje: profil, na którym jest tylko wybielanie, wygląda jak ulotka. Jeden film o wybielaniu w miesiącu obok tematów profilaktycznych to rozsądny rytm; poradnik [jak często publikować](guide:jak-czesto-publikowac-gabinet-stomatologiczny) pokazuje, jak ułożyć cały tydzień.",
          "Film o pierwszych dniach po zabiegu przydaje się też poza social mediami: wysłany SMS-em lub e-mailem w dniu wizyty daje pacjentowi zalecenia w domu. Gabinet, który tłumaczy, dlaczego najpierw sprawdza próchnicę i dziąsła, i mówi wprost, że efekt jest indywidualny, buduje więcej zaufania niż obietnica idealnego odcienia.",
        ],
      },
      {
        heading: "Jak DentVideo przygotowuje filmy o wybielaniu?",
        paragraphs: [
          "Jeśli wybielanie jest w ofercie gabinetu, [DentVideo](landing:) dodaje do pięciu cotygodniowych filmów tematy o mitach i zaleceniach po zabiegu, z lektorem i napisami w kolorach gabinetu. Każdy scenariusz jest sprawdzany pod kątem obiecywanych odcieni, „natychmiastowych efektów”, cen i poprawności klinicznej, zanim do Państwa trafi, a nic nie zostaje opublikowane bez akceptacji lekarza. Wszystkie poradniki są w [spisie poradników](guides:), a [podgląd z logo gabinetu](start:) można zobaczyć przed wyborem planu.",
        ],
      },
    ],
    faq: [
      {
        q: "Czy gabinet może publikować zdjęcia „przed i po” wybielania?",
        a: "Takie zdjęcia sugerują pewny efekt i wymagają wyraźnej, udokumentowanej zgody pacjenta, a informacje gabinetu nie mogą mieć cech reklamy. Bezpieczniej jest wyjaśniać na kolorniku albo ilustracji, bez zdjęć pacjentów.",
      },
      {
        q: "Czy w filmie można mówić o preparatach z drogerii?",
        a: "Tak, rzeczowo: czym różni się wybielanie pod kontrolą lekarza od preparatów kupionych bez badania i jakie zasady UE dotyczą mocniejszych preparatów. Lepiej nie wymieniać i nie krytykować konkretnych marek.",
      },
      {
        q: "Czy wybielanie można pokazać jako temat dla nastolatków?",
        a: "Nie. Preparaty z wyższym stężeniem nadtlenku wodoru nie są przeznaczone dla osób poniżej 18 lat, a filmy o estetyce skierowane do młodych odbiorców łatwo wywierają presję. Dla młodszych lepsze są tematy o higienie i profilaktyce.",
      },
    ],
    sources: [DIR_WHITENING, KEL_ART71, UDL],
  },
  {
    locale: "pl",
    slug: "implanty-zebow-filmy-edukacyjne-dla-pacjentow",
    topic: "treatment-implants",
    category: "treatments",
    ...DATES,
    title: "Implanty zębów w filmach edukacyjnych: pytania pacjentów, tematy i sformułowania, których unikać",
    seoTitle: "Implanty zębów: filmy edukacyjne dla gabinetu",
    seoDescription:
      "Jakie krótkie filmy o implantach przygotować dla pacjentów, na jakie pytania odpowiadają i jakich obietnic unikać: zęby na całe życie, przed i po, opinie.",
    description:
      "O co pacjenci pytają przed leczeniem implantologicznym, sześć krótkich filmów, które na to odpowiadają, budowa filmu w pięciu krokach i sformułowania ryzykowne etycznie.",
    h1: "Implanty zębów w filmach edukacyjnych: co nagrać, a czego unikać",
    intro:
      "Film edukacyjny o implantach to krótkie nagranie, które w prostych słowach tłumaczy jeden etap leczenia: kwalifikację, zabieg, gojenie, koronę albo higienę, tak aby pacjent przyszedł na konsultację z realistycznymi oczekiwaniami. Najbardziej użyteczne filmy odpowiadają na jedno pytanie w niecałą minutę, opisują typowy przebieg bez obietnicy efektu i kończą się zaproszeniem do rozmowy o tym, czy implant jest dla danej osoby.",
    sections: [
      {
        heading: "O co pacjenci pytają przed wszczepieniem implantu?",
        paragraphs: [
          "Pacjenci zainteresowani implantem zwykle długo czytają w internecie, zanim zapiszą się na konsultację, a mimo to pytania na pierwszej wizycie powtarzają się niemal zawsze. Każde z nich to temat na film. Najlepiej zacząć od pytań, które najczęściej słyszy Państwa zespół:",
        ],
        list: [
          "Ile wizyt trwa leczenie implantologiczne i dlaczego nie da się wszystkiego zrobić od razu?",
          "Dlaczego trzeba czekać między wszczepieniem implantu a koroną?",
          "Czy w czasie gojenia będę bez zęba?",
          "Czy nadaję się do implantu przy zaniku kości, paleniu albo cukrzycy?",
          "Jak wygląda dzień zabiegu i co będę czuć?",
          "Jak czyścić okolice implantu i czy trzeba przychodzić na kontrole?",
          "Czym różni się implant od mostu i protezy?",
          "Co jeść, a czego unikać w pierwszych dniach po zabiegu?",
        ],
        after: [
          "Pytanie o koszt jest realne, ale cena w poście łatwo staje się zachętą. Jej miejsce jest w cenniku i na konsultacji, a nie w filmie w social mediach.",
        ],
      },
      {
        heading: "Jakie filmy o implantach przygotować?",
        paragraphs: [
          "Sześć krótkich filmów obejmuje większość drogi pacjenta: od pierwszego wyszukiwania po higienę po leczeniu. Każdy można opublikować, podlinkować na stronie gabinetu albo wysłać pacjentowi przed konsultacją.",
        ],
        table: {
          caption: "Sześć filmów o implantach i gdzie każdy się przydaje",
          columns: ["Film", "Na co odpowiada", "Gdzie pomaga najbardziej"],
          rows: [
            ["Etapy leczenia implantologicznego", "Dlaczego to kilka wizyt, a nie jedna", "Social media, podstrona o implantach"],
            ["Czy implant jest dla mnie?", "Badanie, zdjęcia lub tomografia, stan dziąseł i kości", "Przed pierwszą konsultacją"],
            ["Implant, most czy proteza?", "Możliwości opisane neutralnie, wybór po badaniu", "Strona gabinetu, wiadomość po konsultacji"],
            ["Dzień zabiegu", "Co dzieje się na fotelu, znieczulenie miejscowe, ile to trwa", "Wiadomość do pacjenta przed zabiegiem"],
            ["Pierwszy tydzień po zabiegu", "Obrzęk, miękkie jedzenie, higiena, kiedy dzwonić do gabinetu", "Zalecenia po zabiegu, poczekalnia"],
            ["Implant na lata: higiena i kontrole", "Czyszczenie, wizyty kontrolne, dlaczego dziąsło wokół implantu też wymaga opieki", "Social media, przypomnienia o kontroli"],
          ],
        },
      },
      {
        heading: "Jakich sformułowań unikać w filmach o implantach?",
        paragraphs: [
          "Implanty to leczenie, przy którym pokusa „sprzedawania” jest największa. Art. 71 Kodeksu Etyki Lekarskiej pozwala informować o usługach zgodnie z zasadami etyki, ale art. 14 ustawy o działalności leczniczej nadal wymaga, by informacje podmiotu leczniczego nie miały cech reklamy. Ostrożności wymaga też eksponowanie marek implantów: implanty są wyrobami medycznymi, a przepisy o reklamie wyrobów medycznych ograniczają udział osób wykonujących zawody medyczne w ich promocji. Szczegóły w poradniku [reklama gabinetu stomatologicznego a Kodeks Etyki Lekarskiej](guide:reklama-gabinetu-stomatologicznego-kodeks-etyki).",
        ],
        table: {
          caption: "Implanty: sformułowania ryzykowne i bezpieczniejsze",
          columns: ["Ryzykowne sformułowanie", "Dlaczego to problem", "Bezpieczniejsza wersja"],
          rows: [
            ["„Zęby na całe życie”", "Implant wymaga higieny i kontroli, a leczenie może się nie powieść; to obietnica efektu", "„Implant może służyć długo przy dobrej higienie i regularnych kontrolach”"],
            ["„Bezbolesne wszczepienie implantu”", "Bezwzględna obietnica, której nie da się dać każdemu pacjentowi", "„Zabieg wykonujemy w znieczuleniu miejscowym; wyjaśnimy, czego można się spodziewać po nim”"],
            ["„Nowe zęby w jeden dzień” jako hasło", "Wprowadza w błąd, jeśli dotyczy tylko niektórych przypadków i pomija gojenie", "„W niektórych przypadkach tymczasowy ząb można założyć tego samego dnia; sprawdzimy, czy dotyczy to Państwa”"],
            ["Zdjęcia „przed i po” pacjenta", "Sugerują pewny efekt i wymagają wyraźnej, udokumentowanej zgody", "Ilustracja albo model pokazujący etapy"],
            ["„Implanty marki X w promocji”", "Cena jako zachęta i promocja konkretnego wyrobu medycznego", "„Na konsultacji omówimy rodzaje rozwiązań odpowiednie w Państwa sytuacji”"],
          ],
          note: "To ogólne wskazówki, a nie porada prawna. W razie wątpliwości warto zapytać okręgową izbę lekarską.",
        },
        after: [
          "Przed publikacją warto sprawdzić opis w naszym [sprawdzaczu „Czy mój post jest dozwolony?”](checker:). Wyłapie obietnice i superlatywy, ale nie zastąpi oceny lekarza ani prawnika.",
        ],
      },
      {
        heading: "Jak wytłumaczyć implant w 30 sekund?",
        ordered: true,
        paragraphs: ["Ten sam pięciokrokowy schemat sprawdza się w każdym filmie o implantach i sprawia, że seria wygląda spójnie."],
        list: [
          "Pytanie pacjenta w pierwszej sekundzie, na ekranie i w lektorze: „Dlaczego nie mogę dostać korony od razu?”",
          "Odpowiedź w jednym–dwóch prostych zdaniach: implant potrzebuje czasu, by zrosnąć się z kością, zanim przeniesie obciążenie.",
          "Praktyczny szczegół: w czasie gojenia wielu pacjentów nosi ząb tymczasowy lub protezę.",
          "Uczciwe ograniczenie: czas gojenia i możliwości zależą od indywidualnej sytuacji.",
          "Zaproszenie zamiast obietnicy: „Proszę zapytać na wizycie kontrolnej, czy implant jest dla Państwa.”",
        ],
        after: [
          "Napisy są tu szczególnie ważne: filmy o implantach często oglądają osoby starsze, wiele z nich bez dźwięku. Więcej o długości filmów i wyświetlaniu w poczekalni w poradniku [filmy edukacyjne dla pacjentów](guide:filmy-edukacyjne-dla-pacjentow-gabinet-stomatologiczny).",
        ],
      },
      {
        heading: "Gdzie filmy o implantach pasują w planie publikacji?",
        paragraphs: [
          "Filmy o implantach działają lepiej jako krótka seria niż jako pojedynczy post. Najpierw etapy leczenia, w kolejnych tygodniach kwalifikacja i higiena, tak by ktoś, kto trafi na jeden film, mógł obejrzeć resztę. Warto przeplatać je profilaktyką i codziennymi tematami: profil złożony z samych implantów wygląda jak reklama. Pomysły na pozostałe posty są w poradniku [co publikować w social mediach gabinetu](guide:co-publikowac-gabinet-stomatologiczny), a rytm publikacji opisuje poradnik [jak często publikować](guide:jak-czesto-publikowac-gabinet-stomatologiczny).",
          "Te same filmy przydają się poza social mediami. Link do filmu o etapach leczenia w wiadomości potwierdzającej konsultację odpowiada na pierwsze pytania, zanim pacjent usiądzie na fotelu, a film o higienie w poczekalni przypomina obecnym pacjentom, po co są kontrole.",
        ],
      },
      {
        heading: "Jak DentVideo przygotowuje filmy o implantach?",
        paragraphs: [
          "[DentVideo](landing:) planuje filmy wyłącznie z zabiegów, które gabinet wskaże. Jeśli wykonują Państwo implanty, tematy takie jak etapy leczenia, kwalifikacja i higiena pojawiają się w cotygodniowym zestawie obok profilaktyki, z lektorem i napisami w kolorach gabinetu. Każdy scenariusz jest sprawdzany pod kątem obietnic „na całe życie”, „bez bólu”, cen, nazw marek i poprawności klinicznej, a nic nie zostaje opublikowane bez akceptacji lekarza. Wszystkie poradniki są w [spisie poradników](guides:), a [podgląd z logo gabinetu](start:) można zobaczyć przed wyborem planu.",
        ],
      },
    ],
    faq: [
      {
        q: "Czy w filmie mówić, jak długo wytrzymuje implant?",
        a: "Lepiej opisać, od czego zależy trwałość: higiena, kontrole, stan dziąseł, palenie, niż podawać liczbę lat. Konkretna liczba brzmi jak obietnica, której nie da się zagwarantować każdemu pacjentowi.",
      },
      {
        q: "Czy można pokazać zdjęcie RTG implantu pacjenta?",
        a: "Tylko za wyraźną, pisemną zgodą pacjenta na takie wykorzystanie i bez danych pozwalających go rozpoznać. Ilustracja albo model zwykle lepiej tłumaczy etapy i omija kwestię zgody.",
      },
      {
        q: "Czy można używać animacji producenta implantów?",
        a: "Często tak, jeśli pozwala na to licencja. Trzeba jednak uważać, by film nie stał się promocją konkretnego wyrobu medycznego, bo jego reklama ma własne zasady.",
      },
      {
        q: "Jak długi powinien być film o implantach?",
        a: "Do social mediów około 20–60 sekund i jedno pytanie na film. Na stronę gabinetu albo do wiadomości przed zabiegiem sprawdza się film od jednej do trzech minut, opisujący cały przebieg.",
      },
    ],
    sources: [KEL, KEL_ART71, UDL],
  },
];
