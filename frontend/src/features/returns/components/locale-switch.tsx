type Locale = "en" | "es";
type LocaleSwitchVariant = "customer" | "operations";

const containerStyles: Record<LocaleSwitchVariant, string> = {
  customer:
    "flex items-center gap-0.5 rounded-[9px] border border-border bg-surface/75 p-[3px] shadow-[0_8px_24px_rgb(7_31_28_/_6%)] backdrop-blur-[10px]",
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
  customer: "bg-primary text-on-primary",
  operations:
    "bg-primary text-on-primary max-[760px]:bg-on-primary max-[760px]:text-[#06201d]",
};

const inactiveButtonStyles: Record<LocaleSwitchVariant, string> = {
  customer: "bg-transparent text-text-secondary",
  operations:
    "bg-transparent text-text-secondary max-[760px]:text-[rgb(255_255_255_/_92%)]",
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
  const label = locale === "es" ? "Idioma" : "Language";

  return (
    <div aria-label={label} className={containerStyles[variant]} role="group">
      {(["en", "es"] as const).map((option) => (
        <button
          aria-pressed={locale === option}
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
