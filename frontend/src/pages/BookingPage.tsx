import { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function BookingPage() {
  const { roomId } = useParams();
  useEffect(() => {
    console.log(roomId);
  }, [roomId]);
  return (
    <>
      <div>BookingPage</div>
      <p>Booking ID: {roomId}</p>
    </>
  );
}
