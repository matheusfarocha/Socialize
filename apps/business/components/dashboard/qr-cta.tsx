"use client";

import { useState, useRef } from "react";
import { QrCode, X, Printer, Coffee } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface QrCtaProps {
  venueSlug?: string;
  venueName?: string;
}

export function QrCta({ venueSlug = "demo-venue", venueName = "The Modern Hearth" }: QrCtaProps) {
  const [open, setOpen] = useState(false);
  const customerUrl = typeof window !== "undefined" ? `${window.location.origin}/c/${venueSlug}` : "";
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Socialize QR Code</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: auto; margin: 0.5in; }
            body { display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; }
            .card { text-align: center; padding: 48px; border: 2px solid #e8e0d8; border-radius: 24px; max-width: 400px; }
            .logo { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 32px; }
            .logo-icon { width: 32px; height: 32px; background: #865300; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; }
            .logo-text { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #1c1b18; }
            .qr { margin: 0 auto 24px; }
            .venue { font-size: 22px; font-weight: 800; color: #1c1b18; margin-bottom: 4px; }
            .tagline { font-size: 14px; color: #4a4640; margin-bottom: 24px; }
            .url { font-size: 11px; color: #7a756f; background: #f5f0eb; padding: 8px 16px; border-radius: 999px; display: inline-block; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-secondary-container rounded-xl p-6 relative overflow-hidden group cursor-pointer"
      >
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-container rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700 ease-out" />
        <div className="relative z-10">
          <QrCode size={28} className="text-on-secondary-container mb-2" />
          <h3 className="text-lg font-headline font-bold text-on-secondary-container leading-tight">
            Print Customer QR Code
          </h3>
          <p className="text-sm text-on-secondary-container/80 mt-1 mb-4">
            Generate a unique QR code for table ordering and digital loyalty.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-on-secondary-container">
            Print Now
          </span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-8 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <X size={20} />
            </button>

            <div ref={printRef}>
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32 }}>
                  <div className="logo-icon" style={{ width: 32, height: 32, background: "#865300", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Coffee size={14} color="white" />
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: "#1c1b18" }}>Socialize</span>
                </div>
                <div className="qr" style={{ margin: "0 auto 24px", width: "fit-content" }}>
                  <QRCodeSVG value={customerUrl} size={200} level="H" />
                </div>
                <div className="venue" style={{ fontSize: 22, fontWeight: 800, color: "#1c1b18", marginBottom: 4 }}>{venueName}</div>
                <div className="tagline" style={{ fontSize: 14, color: "#4a4640", marginBottom: 24 }}>Scan to connect, order & discover</div>
                <div className="url" style={{ fontSize: 11, color: "#7a756f", background: "#f5f0eb", padding: "8px 16px", borderRadius: 999, display: "inline-block" }}>{customerUrl}</div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant font-headline font-semibold text-sm hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-headline font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
