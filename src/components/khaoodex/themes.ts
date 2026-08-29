export type KhaaoDexTheme = "light" | "dark" | "dusk"

// Drawn from the KhaaoDex palette: pale-oak (warm neutral), muted-teal (cool
// neutral), light-blue (water / accents), dusty-lavender (dusk), wine-plum (the
// "you've been here" accent).
export const mapThemes = {
  light: {
    label: "Light",
    page: "#f6f2ee",
    map: "#ede5de",
    road: "#c9b29c",
    roadMajor: "#90a29c",
    landmark: "#dbcbbd",
    landmarkBorder: "#b8987a",
    water: "#bdd6db",
    railway: "#acb9b5",
    markerVisited: "#b34d66",
    markerUnvisited: "#46534f",
    markerHalo: "#f6f2ee",
    text: "#243d42",
  },
  dark: {
    label: "Dark",
    page: "#101312",
    map: "#171c1a",
    road: "#46534f",
    roadMajor: "#365b63",
    landmark: "#2e3835",
    landmarkBorder: "#46534f",
    water: "#121e21",
    railway: "#5d6f69",
    markerVisited: "#c27085",
    markerUnvisited: "#9cc1c9",
    markerHalo: "#171c1a",
    text: "#ede5de",
  },
  dusk: {
    label: "Dusk",
    page: "#131014",
    map: "#1c161d",
    road: "#534356",
    roadMajor: "#8a6f90",
    landmark: "#372c3a",
    landmarkBorder: "#6e5973",
    water: "#243d42",
    railway: "#6e5973",
    markerVisited: "#d194a3",
    markerUnvisited: "#b9a9bc",
    markerHalo: "#1c161d",
    text: "#e8e2e9",
  },
} as const
