import { createContext, useContext } from 'react';
import { coffeePrograms } from '../../shared/coffee-programs.mjs';
import './brands.css';

const ProgramContext = createContext(null);
export function useProgram() {
  const value = useContext(ProgramContext);
  if (!value) throw new Error('Coffee program context required');
  return value;
}
export function CoffeeProgram({ slug, children }) {
  if (!Object.hasOwn(coffeePrograms, slug)) throw new Error('Unknown coffee program');
  return <ProgramContext.Provider value={coffeePrograms[slug]}>{children}</ProgramContext.Provider>;
}
