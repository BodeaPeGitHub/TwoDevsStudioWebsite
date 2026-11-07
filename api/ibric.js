import { createHash } from 'node:crypto';
const UUID='[a-f0-9-]{36}';
const PUBLIC=new Set(['config','me','enroll']);
const ADMIN=new Set(['admin/session','admin/login','admin/logout','admin/password','admin/members','admin/settings']);
function allowed(route){return PUBLIC.has(route)||ADMIN.has(route)||new RegExp(`^admin/members/${UUID}(?:/actions)?$`,'i').test(route)||new RegExp(`^admin/operations/${UUID}/retry$`,'i').test(route);}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
 const fail=(status,error)=>res.status(status).json({error});
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return fail(405,'Metodă indisponibilă.');}
 const incoming=new URL(req.url,'https://ibric.invalid');const raw=req.query?.route??incoming.searchParams.get('route')??incoming.pathname.replace(/^\/api\/ibric\/?/,'');
 const route=Array.isArray(raw)?raw.join('/'):raw;
 if(typeof route!=='string'||!allowed(route))return fail(404,'Pagina solicitată nu există.');
 const host=req.headers.host;
 if(typeof host!=='string'||!/^([a-z0-9-]+\.)*[a-z0-9-]+(?::\d{1,5})?$/i.test(host))return fail(400,'Adresă invalidă.');
 const origin=`${host.startsWith('localhost:')||host.startsWith('127.0.0.1:')?'http':'https'}://${host}`;
 if(req.method==='POST'&&req.headers.origin!==origin)return fail(403,'Deschide pagina IBRIC pentru această acțiune.');
 const {IBRIC_BACKEND_URL,IBRIC_BACKEND_SERVICE_TOKEN,IBRIC_BRIDGE_TOKEN}=process.env;
 if(!IBRIC_BACKEND_URL||!IBRIC_BACKEND_SERVICE_TOKEN||!IBRIC_BRIDGE_TOKEN)return fail(503,'Serviciul IBRIC nu este disponibil momentan.');
 let body;
 try {
  if(req.method==='POST'){
   if(!req.headers['content-type']?.startsWith('application/json'))return fail(415,'Trimite datele ca JSON.');
   if(Number(req.headers['content-length'])>20000)return fail(413,'Datele introduse sunt prea lungi.');
   body=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString('utf8'):JSON.stringify(req.body??{});
   if(Buffer.byteLength(body)>20000)return fail(413,'Datele introduse sunt prea lungi.');
  }
  const target=new URL(`/api/ibric/${route}`,IBRIC_BACKEND_URL);
  for(const key of ['q','offset']){const value=incoming.searchParams.get(key)??req.query?.[key];if(typeof value==='string')target.searchParams.set(key,value.slice(0,200));}
  const cookies=String(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>/^(ibric_staff_session|ibric_member)=/.test(x)).join('; ');
  const ip=String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const response=await fetch(target,{method:req.method,redirect:'error',headers:{'OAI-Sites-Authorization':`Bearer ${IBRIC_BACKEND_SERVICE_TOKEN}`,'x-ibric-bridge':IBRIC_BRIDGE_TOKEN,'x-ibric-public-origin':origin,'x-ibric-client-key':createHash('sha256').update(`${IBRIC_BRIDGE_TOKEN}:${ip}`).digest('hex'),'Origin':origin,'Content-Type':'application/json',...(cookies?{Cookie:cookies}:{})},...(body?{body}:{}),signal:AbortSignal.timeout(85000)});
  if(!response.headers.get('content-type')?.includes('application/json'))return fail(502,'Serviciul IBRIC nu a răspuns. Reîncearcă în câteva momente.');
  for(const cookie of response.headers.getSetCookie())res.appendHeader('Set-Cookie',cookie);
  res.setHeader('Content-Type','application/json; charset=utf-8');return res.status(response.status).send(await response.text());
 }catch{return fail(502,'Conexiunea cu IBRIC a fost întreruptă. Reîncearcă aceeași acțiune; cafelele nu se adaugă de două ori.');}
}
