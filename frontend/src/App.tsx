import "./App.css";
import { useEffect } from "react";
import healthCheck from "./api/health";

function App() {
  useEffect(() => {
    const health = healthCheck();
    console.log(health);
  }, []);
  return (
    <>
      <h1>Hello From React</h1>
    </>
  );
}

export default App;
