import Link from "next/link";
import { Scissors } from "lucide-react";

export function LegalShell({
  title,
  effective,
  children,
}: {
  title: string;
  effective: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen gradient-bg">
      <nav className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Scissors className="h-5 w-5 text-brand" />
          ClipForge
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/#pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">Log in</Link>
        </div>
      </nav>

      <article className="container max-w-3xl pb-20 pt-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {effective}</p>
        <div className="prose prose-invert mt-10 max-w-none text-foreground/90 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-foreground/80 [&_a]:text-brand [&_a]:underline [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1">
          {children}
        </div>
      </article>

      <footer className="container border-t border-border/50 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <span>© {new Date().getFullYear()} Bulsu Labs · ClipForge</span>
          <div className="flex gap-4">
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <a href="mailto:hello@clipforge.bulsulabs.xyz">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
