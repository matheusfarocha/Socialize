interface ToggleProps {
  enabled: boolean;
}

export function Toggle({ enabled }: ToggleProps) {
  return (
    <div
      className={`w-10 h-6 rounded-full relative cursor-pointer ${
        enabled ? "bg-primary" : "bg-surface-container-highest border border-outline-variant/30"
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full absolute shadow-sm ${
          enabled
            ? "bg-white top-1 right-1"
            : "bg-outline top-[3px] left-[3px]"
        }`}
      />
    </div>
  );
}
