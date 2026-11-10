import type { Guide } from "../dentvideo";

// Poradnik o filmach edukacyjnych dla pacjentów, pisany dla polskich gabinetów
// (nie tłumaczenie): forma „Państwo”, bez cen, liczb i opinii pacjentów.

const UDL = {
  label: "Ustawa z 15 kwietnia 2011 r. o działalności leczniczej, tekst jednolity Dz.U. 2026 poz. 156 (art. 14) — eli.gov.pl",
  url: "https://eli.gov.pl/eli/DU/2026/156",
};
const KEL = {
  label: "Naczelna Izba Lekarska — Kodeks Etyki Lekarskiej (obowiązuje od 1 stycznia 2025 r.)",
  url: "https://nil.org.pl/uploaded_images/1716532642_kel.pdf",
};
const KEL_ART71 = {
  label: "Naczelna Izba Lekarska — komentarz do art. 71 Kodeksu Etyki Lekarskiej (styczeń 2025)",
  url: "https://nil.org.pl/uploaded_files/art_1736325594_komentarz-art71.pdf",
};

export const EDUCATION_PL: Guide = {
  locale: "pl",
  slug: "filmy-edukacyjne-dla-pacjentow-gabinet-stomatologiczny",
  topic: "patient-education",
  category: "video",
  published: "2026-11-10",
  updated: "2026-11-10",
  reviewed: "2026-11-10",
  title: "Filmy edukacyjne dla pacjentów gabinetu stomatologicznego: tematy, budowa i gdzie je pokazywać",
  seoTitle: "Filmy edukacyjne dla pacjentów: stomatologia",
  seoDescription: "Lista tematów filmów edukacyjnych dla pacjentów gabinetu stomatologicznego, budowa krótkiego filmu, poczekalnia i social media oraz granica z reklamą.",
  description: "Filmy edukacyjne o zębach dla pacjentów: gdzie je pokazywać, ile mają trwać, lista tematów według kategorii, budowa filmu w czterech krokach i czego unikać w świetle art. 14 ustawy.",
  h1: "Filmy edukacyjne dla pacjentów gabinetu stomatologicznego",
  intro:
    "Film edukacyjny dla pacjentów to krótkie nagranie, które prostym językiem wyjaśnia przebieg leczenia, zasady profilaktyki albo zalecenia po zabiegu, tak by pacjent mógł do niego wrócić w domu. Inaczej przygotowuje się film do poczekalni, a inaczej do Instagrama czy TikToka. Poniżej znajdą Państwo listę tematów, budowę filmu i wskazówki, jak nie przekroczyć granicy między informacją a reklamą.",
  sections: [
    {
      heading: "Do czego gabinetowi film edukacyjny?",
      paragraphs: [
        "Lekarz dentysta wiele razy dziennie powtarza te same wyjaśnienia: jak szczotkować zęby, ile wizyt zajmie leczenie kanałowe, co robić po ekstrakcji. Gdy takie wyjaśnienie zamieni się w krótki film, pacjent może obejrzeć je ponownie w domu, a zespół ma więcej czasu na pytania dotyczące konkretnej osoby.",
        "Jest też drugi pożytek: pacjent, który wcześniej rozumie etapy leczenia, przychodzi na wizytę z konkretniejszymi pytaniami, wie, czego się spodziewać na kolejnych wizytach, i łatwiej stosuje się do zaleceń po zabiegu, bo może je obejrzeć ponownie. Ten sam film mogą obejrzeć rodzice dziecka albo dorosłe dzieci starszego pacjenta, którzy pomagają w domowej pielęgnacji.",
        "Film nie zastępuje badania. Rozpoznanie i plan leczenia są indywidualne, dlatego film opisuje ogólny przebieg i zawsze kończy się zdaniem w rodzaju: „O tym, co jest właściwe w Państwa przypadku, zdecyduje lekarz dentysta po badaniu”.",
      ],
    },
    {
      heading: "Gdzie pokazywać filmy edukacyjne i jak długie mają być?",
      paragraphs: ["Ten sam temat wymaga innej długości i formy w zależności od miejsca:"],
      table: {
        caption: "Miejsce, długość i na co uważać",
        columns: ["Miejsce", "Długość", "Wskazówka", "Na co uważać"],
        rows: [
          ["Ekran w poczekalni", "30–60 sekund na film, kilka w pętli", "Duże napisy, bo dźwięk jest zwykle wyłączony", "Poprawność merytoryczna przede wszystkim"],
          ["Wiadomość po wizycie (e-mail, SMS z linkiem)", "1–3 minuty", "Zalecenia krok po kroku", "Tylko dla pacjentów, którzy zgodzili się na kontakt; RODO"],
          ["Instagram, Facebook, TikTok, YouTube Shorts", "20–60 sekund", "Pytanie w pierwszej sekundzie, jeden temat na film", "Publiczny post gabinetu nie może mieć cech reklamy (art. 14 ustawy o działalności leczniczej)"],
          ["Strona gabinetu", "1–3 minuty", "Film w podstronie zabiegu, uzupełniony tekstem", "Rzetelna informacja o zakresie świadczeń, bez obietnic"],
        ],
        note: "To ogólne wskazówki, nie porada prawna. W razie wątpliwości warto zapytać okręgową izbę lekarską.",
      },
    },
    {
      heading: "Lista tematów filmów edukacyjnych",
      paragraphs: ["O te sprawy pacjenci pytają najczęściej. Proszę wybrać tematy związane z usługami, które gabinet rzeczywiście oferuje:"],
      list: [
        "Profilaktyka: jak prawidłowo szczotkować zęby, nić czy szczoteczki międzyzębowe, rola fluoru, kiedy wymienić szczoteczkę, co dzieje się podczas przeglądu",
        "Dzieci: kiedy pierwsza wizyta u dentysty, jak doczyszczać zęby dziecka, przekąski i napoje, lakowanie bruzd, ssanie kciuka a zgryz",
        "Dziąsła: dlaczego dziąsła krwawią, jak rozwija się choroba przyzębia, usuwanie kamienia nazębnego, cukrzyca a dziąsła, palenie a dziąsła",
        "Próchnica i leczenie kanałowe: jak postępuje próchnica, wypełnienie czy korona, przebieg leczenia kanałowego, opatrunek tymczasowy",
        "Uzupełnianie braków: implant, most czy proteza, etapy leczenia implantologicznego, pielęgnacja protezy",
        "Ortodoncja: jak działają nakładki przezroczyste, mycie zębów z aparatem stałym, pierwsza konsultacja ortodontyczna",
        "Po zabiegu: zalecenia po ekstrakcji, na co uważać do czasu ustąpienia znieczulenia, po usunięciu ósemki",
        "Styl życia: zgrzytanie zębami i szyna relaksacyjna, kwaśne napoje a szkliwo, suchość w ustach, ciąża a zdrowie jamy ustnej",
        "Gabinet: przebieg pierwszej wizyty, jak sterylizujemy narzędzia, przedstawienie zespołu",
      ],
    },
    {
      heading: "Jak zbudować krótki film edukacyjny?",
      paragraphs: ["Film do mediów społecznościowych zmieści się w 20–60 sekundach, jeśli ma cztery części:"],
      ordered: true,
      list: [
        "Pytanie na początku: „Czy przy krwawiących dziąsłach przestać myć zęby?”",
        "Odpowiedź w dwóch, trzech zdaniach: „Zwykle krwawienie oznacza stan zapalny dziąseł. Delikatne, regularne szczotkowanie jest wtedy ważne”.",
        "Zastrzeżenie: „Jeśli krwawienie się utrzymuje albo towarzyszy mu ból, warto umówić się na badanie”.",
        "Zaproszenie do pytań: „Jeśli mają Państwo pytania, proszę je zadać podczas najbliższej wizyty”.",
      ],
      after: [
        "Napisy są konieczne: wiele osób ogląda bez dźwięku, a napisy pomagają też przy trudniejszych słowach. Więcej pomysłów na posty w poradniku [co publikować w social mediach gabinetu](guide:co-publikowac-gabinet-stomatologiczny).",
      ],
    },
    {
      heading: "Gdzie kończy się edukacja, a zaczyna reklama?",
      paragraphs: [
        "Art. 14 ustawy o działalności leczniczej stanowi, że informacje podawane przez podmiot leczniczy nie mogą mieć cech reklamy, a od 1 stycznia 2025 r. art. 71 Kodeksu Etyki Lekarskiej pozwala lekarzowi dentyście posługiwać się informacją o usługach zgodną z zasadami etyki. Film edukacyjny mieści się w tych granicach, jeśli przede wszystkim wyjaśnia, a nie zachęca do zakupu. W praktyce oznacza to:",
      ],
      list: [
        "bez cen podawanych jako zachęta, promocji, rabatów i konkursów",
        "bez opinii i podziękowań pacjentów",
        "bez zdjęć „przed i po” sugerujących pewny efekt",
        "bez słów „bezbolesny”, „gwarancja”, „na całe życie” i porównań z innymi gabinetami",
        "bez rozpoznawalnych pacjentów, jeśli nie ma ich wyraźnej, pisemnej zgody",
      ],
      after: [
        "Szczegóły i źródła w poradniku [reklama gabinetu stomatologicznego a Kodeks Etyki Lekarskiej](guide:reklama-gabinetu-stomatologicznego-kodeks-etyki). Proste sformułowania „zwykle”, „u większości pacjentów”, „efekt zależy od indywidualnej sytuacji” robią dużą różnicę.",
      ],
    },
    {
      heading: "Jak pomaga DentVideo",
      paragraphs: [
        "[DentVideo](landing:) to aplikacja internetowa, która co tydzień przygotowuje dla gabinetu pięć krótkich filmów edukacyjnych z lektorem i napisami, w kolorach i z logo gabinetu, na podstawie oferowanych usług i prawdziwych pytań pacjentów. Każdy scenariusz jest sprawdzany dwa razy: pod kątem sformułowań, które w reklamie medycznej są zwykle ograniczone, oraz poprawności klinicznej. Nic nie zostaje opublikowane bez Państwa akceptacji; to staranna kontrola, a nie porada prawna.",
        "Wszystkie poradniki są na [liście poradników](guides:). [Podgląd filmów z logo i kolorami gabinetu](start:) zobaczą Państwo przed płatnością.",
      ],
    },
  ],
  faq: [
    { q: "Ile powinien trwać film edukacyjny dla pacjentów?", a: "W mediach społecznościowych 20–60 sekund, w poczekalni 30–60 sekund na film, w wiadomości po wizycie i na stronie gabinetu 1–3 minuty. Jeden temat na film ułatwia zrozumienie." },
    { q: "Czy film edukacyjny na Instagramie to reklama?", a: "Granica zależy od treści. Film, który rzetelnie wyjaśnia i nie zachęca do zakupu usług, łatwiej uznać za informację. Ceny, promocje, opinie pacjentów i obietnice efektu nadają mu cechy reklamy." },
    { q: "Czy w filmie może wystąpić pacjent?", a: "Tylko z jego wyraźną, pisemną zgodą na konkretne wykorzystanie wizerunku, i bez opinii o leczeniu. Bezpieczniej nagrać lekarza dentystę, model lub animację." },
    { q: "Czy filmy z poczekalni można publikować w social mediach?", a: "Tak, ale przed publikacją warto je ponownie sprawdzić: publiczny post gabinetu oceniany jest surowiej niż materiał pokazywany pacjentom w gabinecie." },
  ],
  sources: [UDL, KEL, KEL_ART71],
};
