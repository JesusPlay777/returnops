type Locale = "en" | "es";
type LocaleSwitchVariant = "customer" | "operations";

const containerStyles: Record<LocaleSwitchVariant, string> = {
  customer:
    "flex items-center gap-0.5 rounded-[9px] border border-border bg-[rgb(255_255_255_/_72%)] p-[3px]",
  operations:
    "flex gap-0.5 border-border border-l pl-[22px] max-[760px]:border-l-0 max-[760px]:pl-0",
};

const buttonStyles: Record<LocaleSwitchVariant, string> = {
  customer:
    "min-w-9 cursor-pointer rounded-[6px] border-0 px-2 py-1.5 text-[11px] font-[750]",
  operations:
    "min-h-8 min-w-[34px] cursor-pointer rounded-[6px] border-0 text-[11px] font-[750] max-[760px]:min-w-[29px]",
};

const activeButtonStyles: Record<LocaleSwitchVariant, string> = {
  customer: "bg-ink text-surface",
  operations:
    "bg-ink text-surface max-[760px]:bg-surface max-[760px]:text-primary-dark",
};

const inactiveButtonStyles: Record<LocaleSwitchVariant, string> = {
  customer: "bg-transparent text-text-secondary",
  operations:
    "bg-transparent text-text-secondary max-[760px]:text-[rgb(255_255_255_/_72%)]",
};

export function LocaleSwitch({
  locale,
  onLocaleChange,
  variant,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  variant: LocaleSwitchVariant;
}) {
  return (
    <div aria-label="Language" className={containerStyles[variant]}>
      {(["en", "es"] as const).map((option) => (
        <button
          className={`${buttonStyles[variant]} ${
            locale === option
              ? activeButtonStyles[variant]
              : inactiveButtonStyles[variant]
          }`.trim()}
          key={option}
          onClick={() => onLocaleChange(option)}
          type="button"
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
