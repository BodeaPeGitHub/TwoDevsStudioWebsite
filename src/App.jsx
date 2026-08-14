import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home";
import HireDiary from "./pages/HireDiary";
import Demo from "./pages/Demo";
import Efti from "./pages/Efti";

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/efti" element={<Efti />} />
        <Route path="/hirediary" element={<HireDiary />} />
        <Route path="/smart-vending" element={<Navigate to="/" replace />} />
        <Route path="/automat-smart" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
