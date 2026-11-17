import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-4xl leading-tight text-white">Page not found</h1>
      <p className="text-slate-300">That route is not part of the Nostrobridge demo.</p>
      <Link href="/">Back to overview</Link>
    </div>
  );
}
