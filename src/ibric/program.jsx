import { createContext, useContext } from 'react';
import './cuc.css';

const defaults = { slug: 'ibric', brand: 'IBRIC', name: 'IBRIC Coffee Club', threshold: 9, tagline: 'PENTRU OAMENI CU GUST' };
const ProgramContext = createContext(defaults);
export const useProgram = () => useContext(ProgramContext);

export function CucProgram({ children }) {
  return <ProgramContext.Provider value={{ slug: 'cuc', brand: 'CUC', name: 'CUC Coffee Club', threshold: 7, tagline: 'CAFEA. MUZICĂ. COMUNITATE.' }}>
    {children}
  </ProgramContext.Provider>;
}
