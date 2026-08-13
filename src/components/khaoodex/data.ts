export type RestaurantStatus = "visited" | "unvisited"

export type PlaceholderRestaurant = {
  id: string
  name: string
  cuisine: string
  rating: string
  coordinates: [number, number]
  status: RestaurantStatus
}

export const placeholderRestaurants: PlaceholderRestaurant[] = [
  {
    id: "campus-canteen",
    name: "Campus Canteen",
    cuisine: "North Indian · Quick bites",
    rating: "4.6",
    coordinates: [26.2509, 78.1746],
    status: "visited",
  },
  {
    id: "sarafa-street",
    name: "Sarafa Street Kitchen",
    cuisine: "Street food · Chaat",
    rating: "4.8",
    coordinates: [26.2079, 78.1817],
    status: "visited",
  },
  {
    id: "terrace-table",
    name: "Terrace Table",
    cuisine: "Café · Desserts",
    rating: "4.3",
    coordinates: [26.2187, 78.1878],
    status: "unvisited",
  },
  {
    id: "fort-view",
    name: "Fort View Thali",
    cuisine: "Madhya Indian · Thali",
    rating: "4.5",
    coordinates: [26.2292, 78.1692],
    status: "unvisited",
  },
]

export const dexStats = {
  discovered: 24,
  visited: 9,
  categories: [
    { name: "Street food", count: 5, total: 8, color: "#f59e0b" },
    { name: "Cafés", count: 2, total: 6, color: "#fb7185" },
    { name: "North Indian", count: 4, total: 7, color: "#34d399" },
    { name: "Desserts", count: 3, total: 5, color: "#a78bfa" },
  ],
}

export const landmarkAssets = [
  "/khaoodex/landmarks-iiitm.geojson",
  "/khaoodex/landmarks-campus.geojson",
  "/khaoodex/landmarks-malls.geojson",
  "/khaoodex/landmarks-towers.geojson",
]

