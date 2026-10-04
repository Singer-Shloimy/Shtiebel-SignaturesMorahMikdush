"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SignerRow = {
  slug: string;
  name: string;
  status: "pending" | "esigned" | "in_person";
  signedAt?: string;
};

type StatusPayload = {
  signers: SignerRow[];
  inPersonFiles: string[];
  counts: {
    total: number;
    pending: number;
    esigned: number;
    in_person: number;
  };
};

export function AdminClient() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState<StatusPayload | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "esigned" | "in_person">(
    "all",
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/status");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const json = (await res.json()) as StatusPayload;
    setData(json);
    setAuthed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.signers;
    return data.signers.filter((s) => s.status === filter);
  }, [data, filter]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("סיסמה שגויה");
      return;
    }
    setAuthed(true);
    await load();
  }

  async function markStatus(
    slug: string,
    status: "pending" | "esigned" | "in_person",
  ) {
    await fetch("/api/admin/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, status }),
    });
    await load();
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const markSlugs = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(",");
      if (markSlugs) form.append("markSlugs", markSlugs);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || "שגיאה בהעלאה");
      } else {
        setMessage("הקובץ הועלה בהצלחה");
        setSelected({});
        await load();
      }
    } finally {
      setUploading(false);
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/${encodeURIComponent(slug)}`;
    void navigator.clipboard.writeText(url);
    setMessage(`הקישור הועתק: ${slug}`);
  }

  if (!authed) {
    return (
      <main className="admin-page">
        <form className="login-card" onSubmit={login}>
          <p className="brand">Shtiebel-SignaturesMorahMikdush</p>
          <h1>כניסת מנהל</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            className="text-input"
          />
          {loginError ? <p className="error-text">{loginError}</p> : null}
          <button type="submit" className="btn-primary">
            כניסה
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page wide">
      <header className="admin-header">
        <div>
          <p className="brand">Shtiebel-SignaturesMorahMikdush</p>
          <h1>ניהול חתימות</h1>
        </div>
        <div className="admin-header-actions">
          <a className="btn-ghost" href="/api/admin/letter" target="_blank" rel="noreferrer">
            צפייה במכתב
          </a>
          <a className="btn-primary" href="/api/admin/download">
            הורד PDF ממוזג
          </a>
        </div>
      </header>

      {data ? (
        <div className="stats">
          <div>
            <strong>{data.counts.total}</strong>
            <span>סה״כ</span>
          </div>
          <div>
            <strong>{data.counts.pending}</strong>
            <span>ממתינים</span>
          </div>
          <div>
            <strong>{data.counts.esigned}</strong>
            <span>דיגיטלי</span>
          </div>
          <div>
            <strong>{data.counts.in_person}</strong>
            <span>פנים אל פנים</span>
          </div>
        </div>
      ) : null}

      <section className="admin-section">
        <h2>העלאת דף חתום פנים אל פנים</h2>
        <p className="muted">
          העלה את הסריקה של המכתב שנחתם ביד. בהורדה יחזור קובץ אחד בלבד: הדף
          הסרוק + החתימות הדיגיטליות עליו.
        </p>
        <label className="file-btn">
          {uploading ? "מעלה..." : "בחר קובץ להעלאה"}
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg"
            hidden
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
              e.target.value = "";
            }}
          />
        </label>
        {data?.inPersonFiles?.length ? (
          <ul className="file-list">
            {data.inPersonFiles.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">עדיין לא הועלו קבצים</p>
        )}
      </section>

      <section className="admin-section">
        <div className="filters">
          {(
            [
              ["all", "הכל"],
              ["pending", "ממתינים"],
              ["esigned", "דיגיטלי"],
              ["in_person", "פנים אל פנים"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "chip active" : "chip"}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>סמן</th>
                <th>שם</th>
                <th>סטטוס</th>
                <th>קישור</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.slug}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[s.slug]}
                      disabled={s.status !== "pending"}
                      onChange={(e) =>
                        setSelected((prev) => ({
                          ...prev,
                          [s.slug]: e.target.checked,
                        }))
                      }
                    />
                  </td>
                  <td>{s.name}</td>
                  <td>
                    <span className={`status-pill ${s.status}`}>
                      {s.status === "pending"
                        ? "ממתין"
                        : s.status === "esigned"
                          ? "דיגיטלי"
                          : "פנים אל פנים"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost small"
                      onClick={() => copyLink(s.slug)}
                    >
                      העתק קישור
                    </button>
                  </td>
                  <td className="row-actions">
                    {s.status === "pending" ? (
                      <button
                        type="button"
                        className="btn-ghost small"
                        onClick={() => markStatus(s.slug, "in_person")}
                      >
                        סמן פנים אל פנים
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost small"
                        onClick={() => markStatus(s.slug, "pending")}
                      >
                        אפס
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message ? <p className="toast">{message}</p> : null}
    </main>
  );
}
