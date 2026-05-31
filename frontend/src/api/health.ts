import { baseAddress } from "./client";
export default async function healthCheck() {
  const route = "/api/health";
  const response = await fetch(baseAddress + route);
  const data = await response.json();
  return data;
}
