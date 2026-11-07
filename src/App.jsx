import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import Home from "./pages/Home";
import HireDiary from "./pages/HireDiary";
import Demo from "./pages/Demo";
import Efti from "./pages/Efti";

const IbricCustomer = lazy(() => import('./ibric/IbricCustomer'));
const IbricAdmin = lazy(() => import('./ibric/IbricAdmin'));

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
      <Suspense fallback={<div style={{minHeight:"100vh",background:"#faf8f1"}} />}><Routes>
        <Route path="/ibric" element={<IbricCustomer />} />
        <Route path="/ibric/admin" element={<IbricAdmin />} />
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/efti" element={<Efti />} />
        <Route path="/hirediary" element={<HireDiary />} />
        <Route path="/smart-vending" element={<Navigate to="/" replace />} />
        <Route path="/automat-smart" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}

export default App;
