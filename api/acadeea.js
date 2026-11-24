import handler from '../server/coffee/handler.js';
import pushHandler from '../server/coffee/push-handler.js';
import { withProgram } from '../server/coffee/program.js';

// Both entry paths have a fixed Acadeea scope. The worker retains its own
// bearer-secret authorization and shares no staff/member session with other shops.
export default (req, res) => withProgram('acadeea', () => {
  const url = new URL(req.url, 'https://www.twodevsstudio.com');
  const route = req.query?.route ?? url.searchParams.get('route');
  return route === 'worker' || url.pathname === '/api/acadeea-push'
    ? pushHandler(req, res)
    : handler(req, res);
});
