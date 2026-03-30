import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import HireDiary from "./pages/HireDiary";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hirediary" element={<HireDiary />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
