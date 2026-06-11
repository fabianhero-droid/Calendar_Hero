export const EVENT_COLORS = [
  { id: "blue", bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  { id: "violet", bg: "bg-violet-500", light: "bg-violet-100", text: "text-violet-700", border: "border-violet-300" },
  { id: "emerald", bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  { id: "rose", bg: "bg-rose-500", light: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
  { id: "amber", bg: "bg-amber-500", light: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  { id: "sky", bg: "bg-sky-500", light: "bg-sky-100", text: "text-sky-700", border: "border-sky-300" },
];

export function getColorById(id?: string) {
  return EVENT_COLORS.find((c) => c.id === id) ?? EVENT_COLORS[0];
}
