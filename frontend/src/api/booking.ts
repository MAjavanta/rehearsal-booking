import { baseAddress } from "./client";

export interface bookingRequest {
  roomId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  bookingDate: string;
}

export default async function postBooking(
  booking: bookingRequest,
): Promise<bookingRequest> {
  const route = "/api/bookings/";
  const response = await fetch(baseAddress + route, {
    method: "POST",
    body: JSON.stringify(booking),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data;
}
