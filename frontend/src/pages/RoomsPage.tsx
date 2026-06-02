import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GetRooms, { type Room } from "../api/rooms";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>();
  useEffect(() => {
    async function loadRooms() {
      const roomsData = await GetRooms();
      setRooms(roomsData);
    }

    loadRooms();
  }, []);

  return (
    <>
      <div>Rooms Page</div>
      <Link to="/">Home</Link>
      <ul>
        {rooms?.map((room) => (
          <li key={room.id}>
            {room.name} <Link to={`/book/${room.id}`}>Book</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
