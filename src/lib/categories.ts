export const CATEGORIES = [
  { value: "umum", label: "Umum", emoji: "💙" },
  { value: "bencana", label: "Bencana Alam", emoji: "🌪️" },
  { value: "pendidikan", label: "Pendidikan", emoji: "🎓" },
  { value: "kesehatan", label: "Kesehatan", emoji: "🏥" },
  { value: "sosial", label: "Sosial", emoji: "🤝" },
  { value: "lingkungan", label: "Lingkungan", emoji: "🌱" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const getCategory = (v: string) =>
  CATEGORIES.find((c) => c.value === v) ?? CATEGORIES[0];