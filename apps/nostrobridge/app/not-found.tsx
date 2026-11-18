import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1>Not found</h1>
      <Link href="/">Home</Link>
    </div>
  );
}
