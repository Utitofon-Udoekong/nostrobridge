import Link from "next/link";

const ACTIONS = [
  {
    href: "/link",
    title: "Bind",
    body: "Connect a Bitcoin Cash address and a Nostr key. Both sign the same statement.",
  },
  {
    href: "/verify",
    title: "Verify",
    body: "Check a record in this browser. A relay can deliver it. It cannot make it valid.",
  },
  {
    href: "/pay",
    title: "Pay",
    body: "Send to the address a verified npub names. Nothing is sent until you open a wallet.",
  },
  {
    href: "/authenticate",
    title: "Authenticate",
    body: "A binding is not a login. Sign a short challenge for this site.",
  },
] as const;

export default function HomePage() {
  return (
    <div>
      <h1 className="max-w-xl">Bind a Bitcoin Cash address to a Nostr key.</h1>
      <p className="lede">
        One person, two keys. Nostrobridge builds the statement, takes the two signatures, and lets anyone check them.
      </p>
      <ol className="mt-12 border-t border-ink">
        {ACTIONS.map((action, index) => (
          <li key={action.href} className="border-b border-ink">
            <Link href={action.href} className="-mx-3 flex items-baseline gap-6 px-3 py-5 no-underline hover:bg-ink hover:text-paper">
              <span className="w-8 shrink-0 font-mono text-sm tabular-nums opacity-60">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="text-base font-medium">{action.title}</span>
                <span className="mt-1 block text-sm leading-relaxed opacity-70">{action.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
