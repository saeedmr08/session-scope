import { SessionPanel } from "@/components/SessionPanel";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <p className="brand">SessionScope</p>
        <h1 className="tagline">See every device. Kill a stolen refresh.</h1>
        <p className="lede">
          List active devices, revoke one or all, and watch refresh-token
          rotation store only hashes — reuse of an old token ends the session
          family.
        </p>
        <div className="cta-row">
          <a className="cta" href="#sessions">
            Open session list
          </a>
          <span className="byline">Saeed Rumaneh · portfolio lab</span>
        </div>
      </header>
      <SessionPanel />
    </main>
  );
}
