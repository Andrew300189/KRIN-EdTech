/** Shared site palettes. The selected colour is stored locally per browser. */
export const COLOR_THEMES = [
  { id: "violet", label: "Violet", swatch: "#5c51de" },
  { id: "ocean", label: "Ocean", swatch: "#087f8c" },
  { id: "sunset", label: "Sunset", swatch: "#d15b13" },
  { id: "rose", label: "Rose", swatch: "#bf3f70" },
  { id: "forest", label: "Forest", swatch: "#24754c" },
  { id: "cobalt", label: "Cobalt", swatch: "#2859b8" },
  { id: "amber", label: "Amber", swatch: "#a66a08" },
  { id: "coral", label: "Coral", swatch: "#bf5545" },
  { id: "mint", label: "Mint", swatch: "#187d70" },
  { id: "plum", label: "Plum", swatch: "#813f9b" },
  { id: "ruby", label: "Ruby", swatch: "#b1364b" },
  { id: "indigo", label: "Indigo", swatch: "#3f51a7" },
  { id: "teal", label: "Teal", swatch: "#197888" },
  { id: "olive", label: "Olive", swatch: "#667b28" },
  { id: "fuchsia", label: "Fuchsia", swatch: "#aa3a9c" },
  { id: "sky", label: "Sky", swatch: "#307cb6" },
  { id: "copper", label: "Copper", swatch: "#9d5d34" },
  { id: "lagoon", label: "Lagoon", swatch: "#177e8f" },
  { id: "orchid", label: "Orchid", swatch: "#865bb3" },
  { id: "pomegranate", label: "Pomegranate", swatch: "#aa385e" },
] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number]["id"];
