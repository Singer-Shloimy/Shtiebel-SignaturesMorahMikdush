"use client";

import { useState } from "react";
import { SignatureModal } from "@/components/SignatureModal";

type Props = {
  name: string;
  slug: string;
  initialStatus: "pending" | "esigned" | "in_person";
};

export function SignPageClient({ name, slug, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(initialStatus === "pending");

  const alreadySigned = status !== "pending";

  return (
    <main className="sign-page">
      <header className="brand-bar">
        <p className="brand">Shtiebel-SignaturesMorahMikdush</p>
      </header>

      <section className="letter-panel">
        <p className="eyebrow">מכתב חזרה למר״ש</p>
        <h1>{name}</h1>
        <p className="lead">
          קיבלת קישור אישי לחתימה על הקבלה שלא לדבר בשעת התפילה, לזכות ידידנו
          היקר וזוגתו.
        </p>

        {status === "pending" ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setOpen(true)}
          >
            לחתום עכשיו
          </button>
        ) : status === "esigned" ? (
          <p className="status-pill done">נחתם דיגיטלית — תודה</p>
        ) : (
          <p className="status-pill done">סומן כחתימה פנים אל פנים</p>
        )}
      </section>

      <SignatureModal
        open={open}
        name={name}
        slug={slug}
        alreadySigned={alreadySigned}
        onClose={() => setOpen(false)}
        onSigned={() => setStatus("esigned")}
      />
    </main>
  );
}
