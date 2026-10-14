"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { nameToSignaturePng } from "@/lib/typed-signature";

type Mode = "draw" | "type";

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
  const [mode, setMode] = useState<Mode>("draw");
  const [typedName, setTypedName] = useState(name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (open && !alreadySigned && !thanks) {
      setTypedName(name);
    }
  }, [open, name, alreadySigned, thanks]);

  useEffect(() => {
    if (!open || alreadySigned || thanks || mode !== "draw") return;
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
  }, [open, alreadySigned, thanks, mode]);

  if (!open) return null;

  async function postSignature(signatureDataUrl: string) {
    const res = await fetch("/api/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, signatureDataUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "שגיאה בשמירה");
      return false;
    }
    setThanks(true);
    onSigned();
    return true;
  }

  async function submitDraw() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("נא לחתום בשדה החתימה");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await postSignature(padRef.current.toDataURL("image/png"));
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTyped() {
    const text = typedName.trim();
    if (!text) {
      setError("נא להזין שם");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await document.fonts?.ready;
      const signatureDataUrl = await nameToSignaturePng(text, 520, 140);
      if (!signatureDataUrl.startsWith("data:image/png")) {
        setError("שגיאה ביצירת החתימה");
        return;
      }
      await postSignature(signatureDataUrl);
    } catch (err) {
      console.error("typed signature failed", err);
      setError("שגיאה ביצירת החתימה — נסה שוב או חתום ביד");
    } finally {
      setSubmitting(false);
    }
  }

  function submit() {
    if (mode === "draw") void submitDraw();
    else void submitTyped();
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
                שלום <strong>{name}</strong>, בחר חתימה ביד או הדפסת שם כחתימה
              </p>
            </div>

            <div className="sig-mode-tabs">
              <button
                type="button"
                className={mode === "draw" ? "chip active" : "chip"}
                onClick={() => {
                  setMode("draw");
                  setError("");
                }}
              >
                חתום ביד
              </button>
              <button
                type="button"
                className={mode === "type" ? "chip active" : "chip"}
                onClick={() => {
                  setMode("type");
                  setError("");
                }}
              >
                הדפס שם כחתימה
              </button>
            </div>

            {mode === "draw" ? (
              <div className="pad-wrap">
                <canvas ref={canvasRef} className="sig-canvas" />
              </div>
            ) : (
              <div className="type-sig-wrap">
                <label className="type-sig-label" htmlFor="typed-signature-name">
                  השם שיופיע כחתימה
                </label>
                <input
                  id="typed-signature-name"
                  className="text-input type-sig-input"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  dir="rtl"
                  autoComplete="name"
                />
                <div className="type-sig-preview" aria-hidden>
                  <span className="type-sig-preview-text">
                    {typedName.trim() || name}
                  </span>
                </div>
              </div>
            )}

            {error ? <p className="error-text">{error}</p> : null}
            <div className="modal-actions">
              {mode === "draw" ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => padRef.current?.clear()}
                  disabled={submitting}
                >
                  נקה
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setTypedName(name)}
                  disabled={submitting}
                >
                  אפס לשם שלי
                </button>
              )}
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
