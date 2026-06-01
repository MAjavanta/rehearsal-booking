import { useEffect } from "react";
import { Link } from "react-router-dom";
import GetRooms from "../api/rooms";

export default function RoomsPage() {
  useEffect(() => {
    const rooms = GetRooms();
    console.log(rooms);
  }, []);
  return (
    <>
      <div>Rooms Page</div>
      <Link to="/">Home</Link>
    </>
  );
}
