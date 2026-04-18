import { QrCode } from "lucide-react";

export function QrCta() {
  return (
    <div className="bg-secondary-container rounded-xl p-6 relative overflow-hidden group cursor-pointer">
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-container rounded-full opacity-20 group-hover:scale-150 transition-transform duration-700 ease-out" />
      <div className="relative z-10">
        <QrCode
          size={28}
          className="text-on-secondary-container mb-2"
        />
        <h3 className="text-lg font-headline font-bold text-on-secondary-container leading-tight">
          Print Customer QR Code
        </h3>
        <p className="text-sm text-on-secondary-container/80 mt-1 mb-4">
          Generate a unique QR code for table ordering and digital
          loyalty.
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-on-secondary-container">
          Print Now
        </span>
      </div>
    </div>
  );
}
