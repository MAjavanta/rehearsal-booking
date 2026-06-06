import { useParams } from "react-router-dom";
import getAvailability from "../api/availability";
import { useEffect, useState } from "react";
import postBooking, { type bookingRequest } from "../api/booking";

export default function BookingPage() {
  const { roomId } = useParams();

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  useEffect(() => {
    async function loadAvailability(roomId: number) {
      // TODO: Define function to format date correctly
      const data = await getAvailability(roomId, "2025-05-12");
      setTimeSlots(data);
    }
    loadAvailability(Number(roomId));
  }, [roomId]);

  async function bookTime(slot: string) {
    const data = await postBooking({
      roomId: Number(roomId),
      customerName: "Name",
      customerEmail: "Email",
      customerPhone: "Phone",
      startTime: slot,
      endTime: "23:00",
      bookingDate: "2026-06-28",
    });
    console.log(data);
  }

  const timeSlotList = timeSlots.map((slot) => (
    <li key={slot}>
      {slot} <button onClick={() => bookTime(slot)}>Book</button>
    </li>
  ));
  return (
    <>
      <div>BookingPage</div>
      <p>Room ID: {roomId}</p>
      <ul>{timeSlotList}</ul>
    </>
  );
}
