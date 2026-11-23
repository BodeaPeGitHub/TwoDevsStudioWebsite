import handler from '../server/ibric/push-handler.js';
import { withProgram } from '../server/ibric/program.js';

export default (req, res) => withProgram('cuc', () => handler(req, res));
