export function DvMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <rect width="24" height="24" rx="7" fill="#0f5c5c" />
        <path d="M8 7.5c0-.8.9-1.3 1.6-.9l6.2 3.9c.6.4.6 1.3 0 1.7l-6.2 3.9c-.7.4-1.6-.1-1.6-.9V7.5z" fill="#f5efe6" />
      </svg>
      DentVideo
    </span>
  );
}
