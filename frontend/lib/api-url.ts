/**
 * Server-side: runtime env var so server functions call the backend directly
 * via the internal Docker network (http://backend:3001) instead of going
 * through the public URL. Set API_URL in docker-compose for each environment.
 *
 * Client-side: VITE_API_URL is baked at build time (https://app.scalenza.com
 * in production). Browser requests always go through the public URL.
 */
export const SERVER_API_URL = process.env["API_URL"] ?? "http://localhost:3001";
export const CLIENT_API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";
