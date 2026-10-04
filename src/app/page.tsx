import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-card">
        <p className="brand">Shtiebel-SignaturesMorahMikdush</p>
        <h1>חתימות למכתב חזרה למר״ש</h1>
        <p className="lead">
          לכל חותם יש קישור אישי. אם קיבלת קישור — פתח אותו כדי לחתום.
        </p>
        <p className="muted">
          מנהלים:{" "}
          <Link href="/admin" style={{ color: "var(--accent)" }}>
            כניסה לניהול
          </Link>
        </p>
      </div>
    </main>
  );
}
