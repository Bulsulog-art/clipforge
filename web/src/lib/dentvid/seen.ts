// onSeen once, when el enters the top 65% of the screen (never without IntersectionObserver).
export function onceInView(el: Element | null, onSeen: () => void, IO = globalThis.IntersectionObserver): () => void {
  if (!el || !IO) return () => {};
  const io = new IO((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    try {
      onSeen();
    } catch {}
  }, { rootMargin: "0px 0px -35% 0px" });
  io.observe(el);
  return () => io.disconnect();
}
