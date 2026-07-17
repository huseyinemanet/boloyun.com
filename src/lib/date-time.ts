const relativeFormatter = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });
const fullFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export function formatRelativeDateTime(value: string, now = new Date()) {
  const date = new Date(value);
  const differenceSeconds = (date.getTime() - now.getTime()) / 1000;
  const absoluteSeconds = Math.abs(differenceSeconds);

  if (absoluteSeconds < 60) return relativeFormatter.format(Math.round(differenceSeconds), "second");
  if (absoluteSeconds < 60 * 60) return relativeFormatter.format(Math.round(differenceSeconds / 60), "minute");
  if (absoluteSeconds < 24 * 60 * 60) return relativeFormatter.format(Math.round(differenceSeconds / (60 * 60)), "hour");
  if (absoluteSeconds < 30 * 24 * 60 * 60) return relativeFormatter.format(Math.round(differenceSeconds / (24 * 60 * 60)), "day");
  if (absoluteSeconds < 365 * 24 * 60 * 60) return relativeFormatter.format(Math.round(differenceSeconds / (30 * 24 * 60 * 60)), "month");
  return relativeFormatter.format(Math.round(differenceSeconds / (365 * 24 * 60 * 60)), "year");
}

export function formatFullDateTime(value: string) {
  return fullFormatter.format(new Date(value));
}
