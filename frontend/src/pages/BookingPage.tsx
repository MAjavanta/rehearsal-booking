import { useParams } from "react-router-dom";
import getAvailability from "../api/availability";
import { useEffect, useState } from "react";
import postBooking from "../api/booking";

type bookingStage = "date" | "slots" | "details";

export default function BookingPage() {
  const { roomId } = useParams();
  const [stage, setStage] = useState<bookingStage>("date");

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

  function nextStage() {
    setStage("slots");
  }

  const timeSlotList = timeSlots.map((slot) => (
    <li key={slot}>
      {slot} <button onClick={() => bookTime(slot)}>Book</button>
    </li>
  ));

  return (
    <>
      <div>BookingPage</div>
      {stage === "date" && (
        <div>
          Select Date: <button onClick={nextStage}>Select Date</button>
        </div>
      )}
      {stage === "slots" && (
        <div>
          <p>Room ID: {roomId}</p>
          <ul>{timeSlotList}</ul>
        </div>
      )}
    </>
  );
}
