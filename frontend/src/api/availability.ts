import { baseAddress } from "./client";

export default async function getAvailability(
  id: number,
  date: string,
): Promise<string[]> {
  const route = `/api/availability/?id=${id}&date=${date}`;
  const response = await fetch(baseAddress + route);
  const data = await response.json();
  return data;
}
