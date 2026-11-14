import type { Locale } from "../dentvideo";

/**
 * The caption above a sample video embedded in a guide (a real DentVideo
 * video on the guide's topic, in its language). Kept out of guides/ui.ts,
 * which the header and footer ship to the browser: only the server-rendered
 * guide page and the JSON-LD need these words.
 */
export const GUIDE_SAMPLE_UI: Record<Locale, { heading: string; note: string }> = {
  en: { heading: "A DentVideo sample on this topic", note: "Real DentVideo output for a demo clinic, unedited. Your videos are made in your language, colours and tone." },
  de: { heading: "Ein DentVideo-Beispiel zu diesem Thema", note: "Echtes DentVideo-Video für eine Demo-Praxis, unbearbeitet. Ihre Videos entstehen in Ihrer Sprache, Ihren Farben und Ihrem Ton." },
  es: { heading: "Un vídeo de DentVideo sobre este tema", note: "Vídeo real de DentVideo para una clínica de demostración, sin editar. Los tuyos se hacen en tu idioma, colores y tono." },
  tr: { heading: "Bu konuda bir DentVideo örneği", note: "Demo klinik için gerçek DentVideo videosu, düzenlenmeden. Sizinkiler kendi dilinizde, renklerinizde ve üslubunuzda hazırlanır." },
  fr: { heading: "Un exemple DentVideo sur ce sujet", note: "Vidéo DentVideo réelle pour un cabinet de démonstration, non retouchée. Les vôtres sont faites dans votre langue, vos couleurs et votre ton." },
  ja: { heading: "このテーマのDentVideoサンプル", note: "デモ歯科医院向けに作成した実際のDentVideo動画（無編集）。貴院の動画は貴院の言語・色・トーンで作成されます。" },
  ar: { heading: "مثال من DentVideo عن هذا الموضوع", note: "فيديو حقيقي من DentVideo لعيادة تجريبية، دون تعديل. فيديوهات عيادتكم تُصنع بلغتكم وألوانكم وأسلوبكم." },
  pl: { heading: "Przykład DentVideo na ten temat", note: "Prawdziwy film DentVideo dla gabinetu demonstracyjnego, bez edycji. Filmy Państwa gabinetu powstają w Państwa języku, kolorach i tonie." },
};
