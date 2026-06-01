import "./App.css";
import { useEffect } from "react";
import healthCheck from "./api/health";
import { Routes, Route } from "react-router-dom";
import RoomsPage from "./pages/RoomsPage";
import HomePage from "./pages/HomePage";

function App() {
  useEffect(() => {
    const health = healthCheck();
    console.log(health);
  }, []);
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
      </Routes>
    </>
  );
}

export default App;
