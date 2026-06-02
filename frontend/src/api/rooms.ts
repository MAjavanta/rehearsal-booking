import { baseAddress } from "./client";

export interface Room {
  id: number;
  name: string;
  hourlyRate: number;
}

export default async function GetRooms(): Promise<Room[]> {
  const route = "/api/rooms";
  const response = await fetch(baseAddress + route);
  const data = (await response.json()) as Room[];
  return data;
}
