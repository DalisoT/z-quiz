import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-6 py-5">
        <Link
          href="/"
          className="text-sm font-semibold text-brand uppercase tracking-wide"
        >
          Z-Quiz
        </Link>
      </header>
      <div className="flex-1 flex items-start sm:items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
