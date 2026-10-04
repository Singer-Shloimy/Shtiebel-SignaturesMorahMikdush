"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

type Props = {
  open: boolean;
  name: string;
  alreadySigned: boolean;
  onClose: () => void;
  onSigned: () => void;
  slug: string;
};

export function SignatureModal({
  open,
  name,
  alreadySigned,
  onClose,
  onSigned,
  slug,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!open || alreadySigned || thanks) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      ctx?.scale(ratio, ratio);
      padRef.current?.clear();
    };

    padRef.current = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "rgb(0, 0, 0)",
      minWidth: 1.6,
      maxWidth: 2.9,
    });
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      padRef.current?.off();
      padRef.current = null;
    };
  }, [open, alreadySigned, thanks]);

  if (!open) return null;

  async function submit() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("נא לחתום בשדה החתימה");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const signatureDataUrl = padRef.current.toDataURL("image/png");
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, signatureDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בשמירה");
        setSubmitting(false);
        return;
      }
      setThanks(true);
      onSigned();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        {thanks || alreadySigned ? (
          <div className="thanks-box">
            <p className="thanks-title">תודה רבה!</p>
            <p className="thanks-body">
              {alreadySigned && !thanks
                ? "החתימה שלך כבר נקלטה."
                : "החתימה שלך התקבלה בהצלחה."}
            </p>
            <button type="button" className="btn-primary" onClick={onClose}>
              סגור
            </button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>חתימה דיגיטלית</h2>
              <p>
                שלום <strong>{name}</strong>, חתום כאן כמו על הדף — חתימה קטנה
                בכתב יד
              </p>
            </div>
            <div className="pad-wrap">
              <canvas ref={canvasRef} className="sig-canvas" />
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => padRef.current?.clear()}
                disabled={submitting}
              >
                נקה
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={submitting}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "שומר..." : "אשר חתימה"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
