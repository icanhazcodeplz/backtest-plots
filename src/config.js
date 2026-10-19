// Where the app loads its payload from. Override at dev/build time with
//   VITE_API_URL=http://host:port/api/data npm run dev
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5001/api/data'
