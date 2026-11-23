import handler from '../server/coffee/handler.js';
import { withProgram } from '../server/coffee/program.js';

export default (req, res) => withProgram('letscoffee', () => handler(req, res));
