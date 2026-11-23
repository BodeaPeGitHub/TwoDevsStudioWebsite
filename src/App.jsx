import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { CucProgram } from './ibric/program';
import { CoffeeProgram } from './coffee/program';
import Home from "./pages/Home";
import HireDiary from "./pages/HireDiary";
import Demo from "./pages/Demo";
import Efti from "./pages/Efti";

const CoffeeCustomer = lazy(() => import('./coffee/CoffeeCustomer'));
const CoffeeAdmin = lazy(() => import('./coffee/CoffeeAdmin'));

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
        {['letscoffee', 'orso', 'guau', 'brewkai'].flatMap(slug => [
          <Route key={slug} path={`/${slug}`} element={<CoffeeProgram slug={slug}><CoffeeCustomer key={slug} apiBase={`/api/${slug}`} assets={`/${slug}/assets`} /></CoffeeProgram>} />,
          <Route key={`${slug}-admin`} path={`/${slug}/admin`} element={<CoffeeProgram slug={slug}><CoffeeAdmin key={slug} apiBase={`/api/${slug}`} basePath={`/${slug}`} assets={`/${slug}/assets`} /></CoffeeProgram>} />,
        ])}
        <Route path="/lets-coffee" element={<Navigate to="/letscoffee" replace />} />
        <Route path="/lets-coffee/admin" element={<Navigate to="/letscoffee/admin" replace />} />
        <Route path="/cuc" element={<CucProgram><IbricCustomer key="cuc" apiBase="/api/cuc" assets="/cuc/assets" /></CucProgram>} />
        <Route path="/cuc/admin" element={<CucProgram><IbricAdmin key="cuc" apiBase="/api/cuc" basePath="/cuc" assets="/cuc/assets" /></CucProgram>} />
        <Route path="/ibric/*" element={<main style={{padding:48,fontFamily:'Arial,sans-serif'}}><h1>Site-ul IBRIC a fost oprit.</h1></main>} />
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
