export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="space-y-3 text-sm leading-relaxed text-gray-300 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-100 [&_h2]:mt-5 [&_a]:text-blue-400 [&_a]:underline">
        {children}
      </div>
    </article>
  );
}
