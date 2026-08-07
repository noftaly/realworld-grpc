import Link from 'next/link';

export function Pager({
  nextPageToken,
  basePath,
  currentParams,
  tokenParam,
}: {
  nextPageToken?: string;
  basePath: string;
  currentParams?: Record<string, string | undefined>;
  tokenParam: string;
}) {
  if (!nextPageToken) return null;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams ?? {})) {
    if (value) sp.set(key, value);
  }
  sp.set(tokenParam, nextPageToken);
  return (
    <div className="pager">
      <Link href={`${basePath}?${sp.toString()}`}>Next →</Link>
    </div>
  );
}
