import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <>
      <div>Home Page</div>
      <Link to="/rooms">Rooms Page</Link>
    </>
  );
}
