export function LoadingSpinner() {
  return (
    <span
      aria-hidden="true"
      className="size-[18px] animate-spin rounded-full border-2 border-border border-t-primary [animation-duration:700ms] motion-reduce:[animation-duration:1.5s]"
    />
  );
}
