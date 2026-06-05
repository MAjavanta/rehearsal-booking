import { useParams } from "react-router-dom";
import getAvailability from "../api/availability";
import { useEffect, useState } from "react";

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

  const timeSlotList = timeSlots.map((slot) => <li key={slot}>{slot}</li>);
  return (
    <>
      <div>BookingPage</div>
      <p>Room ID: {roomId}</p>
      <ul>{timeSlotList}</ul>
    </>
  );
}
