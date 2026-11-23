globalThis.BTArenaModel = (() => {
'use strict';

const stadium = globalThis.ClujArenaData;
const venue = stadium ?? {
  name:'BTarena', surface:'court', event:'U-BT Cluj-Napoca vs. Partizan', date:'26 December 2026',
  defaultOrbit:{yaw:.55,pitch:.65,radius:88}, orbitCenter:2.7, zoomBounds:[38,145],
};
const categories = stadium?.categories ?? {
  1: { name: 'Zone 1', description: 'Lower bowl', price: 60, color: '#85d4ff' },
  2: { name: 'Zone 2', description: 'Middle bowl', price: 55, color: '#a7a0ff' },
  3: { name: 'Zone 3', description: 'Upper bowl & ends', price: 40, color: '#e8b977' },
  4: { name: 'Courtside', description: 'Three rows by the hardwood', price: 600, color: '#d5ff52' },
};

const sectionGeometry = [
  { a: [-15.5, 11], b: [15.5, 11], normal: [0, 1], side: 'A' },
  { a: [15.5, 11], b: [19.5, 7], normal: [.707, .707], side: 'B' },
  { a: [19.5, 7], b: [19.5, -7], normal: [1, 0], side: 'B' },
  { a: [19.5, -7], b: [15.5, -11], normal: [.707, -.707], side: 'B' },
  { a: [15.5, -11], b: [-15.5, -11], normal: [0, -1], side: 'C' },
  { a: [-15.5, -11], b: [-19.5, -7], normal: [-.707, -.707], side: 'D' },
  { a: [-19.5, -7], b: [-19.5, 7], normal: [-1, 0], side: 'D' },
  { a: [-19.5, 7], b: [-15.5, 11], normal: [-.707, .707], side: 'D' },
];
const tiers = [
  { rows: 7, offset: 0, lift: .24, step: .76, rise: .32, id: 1 },
  { rows: 7, offset: 6.35, lift: 3.20, step: .76, rise: .43, id: 2 },
  { rows: 8, offset: 12.75, lift: 7.15, step: .77, rise: .48, id: 3 },
];
const lerp = (a, b, t) => a + (b - a) * t;
const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const mesh = [];
const chairs = [];
const sections = [];
const roof = [];

function face(points, color, stroke) {
  mesh.push({ points, color, stroke });
}
function flat(x1, z1, x2, z2, y, color) {
  face([[x1,y,z1],[x2,y,z1],[x2,y,z2],[x1,y,z2]], color);
}
function line(points, color, width = 1) {
  mesh.push({ points, stroke: color, width, line: true });
}
function outline(x1, z1, x2, z2, y, color) {
  line([[x1,y,z1],[x2,y,z1],[x2,y,z2],[x1,y,z2],[x1,y,z1]], color);
}
function box(x1, y1, z1, x2, y2, z2, colors) {
  flat(x1,z1,x2,z2,y2,colors[0]);
  flat(x1,z1,x2,z2,y1,colors[0]);
  face([[x1,y1,z1],[x2,y1,z1],[x2,y2,z1],[x1,y2,z1]], colors[1]);
  face([[x1,y1,z2],[x2,y1,z2],[x2,y2,z2],[x1,y2,z2]], colors[1]);
  face([[x1,y1,z1],[x1,y1,z2],[x1,y2,z2],[x1,y2,z1]], colors[2]);
  face([[x2,y1,z1],[x2,y1,z2],[x2,y2,z2],[x2,y2,z1]], colors[2]);
}
function curve(x, z, radius, start, end, y, color) {
  line(Array.from({ length: 33 }, (_, i) => {
    const angle = lerp(start, end, i / 32);
    return [x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius];
  }), color, 1.1);
}

// Court markings use basketball proportions. Seating is derived from the public zone diagrams.
if (stadium) {
  stadium.build({face,flat,line,outline,curve,box,sections,chairs,roof});
} else {
flat(-19,-11.5,19,11.5,-.06,'#202b3b');
flat(-15.3,-8.8,15.3,8.8,-.03,'#b98958');
for (let i = 0; i < 31; i++) {
  const x = -15.3 + i * .987;
  flat(x,-8.8,x+.987,8.8,0,['#c89864','#d2a36e','#cfa16c','#c49765','#d5a875'][i % 5]);
}
const paint = '#fff0cc';
outline(-14,-7.5,14,7.5,.013,paint);
line([[0,.014,-7.5],[0,.014,7.5]],paint);
curve(0,0,1.82,0,Math.PI*2,.016,paint);
for (const side of [-1, 1]) {
  const boundary = side * 14;
  const freeThrow = side * 8.2;
  flat(Math.min(boundary,freeThrow),-2.45,Math.max(boundary,freeThrow),2.45,.012,'#425570');
  outline(boundary,-2.45,freeThrow,2.45,.019,paint);
  curve(freeThrow,0,1.8,0,Math.PI*2,.02,paint);
  const hoopX = side * 12.42;
  const breakAngle = Math.asin(6.6 / 6.75);
  const arcCenter = side === 1 ? Math.PI : 0;
  curve(hoopX,0,6.75,arcCenter-breakAngle,arcCenter+breakAngle,.019,paint);
  const breakX = hoopX - side * 6.75 * Math.cos(breakAngle);
  for (const z of [-6.6, 6.6]) line([[breakX,.02,z],[boundary,.02,z]],paint);
  box(side * 15.7 - .32, 0,-.35,side * 15.7 + .32,1.05,.35,['#526581','#33415a','#405471']);
  line([[side * 15.7,1,0],[side * 15.45,2.6,0],[side * 13,3.55,0]],'#7586a0',3);
  face([[side*13,2.91,-.92],[side*13,2.91,.92],[side*13,3.96,.92],[side*13,3.96,-.92]],'#9fb4c9','#eaf3ff');
  curve(hoopX,0,.23,0,Math.PI*2,3.05,'#fb8e61');
  for (const angle of [0,1,2,3,4,5]) {
    line([[hoopX+Math.cos(angle)*.23,3.05,Math.sin(angle)*.23],
      [hoopX+Math.cos(angle)*.13,2.72,Math.sin(angle)*.13]],'#d9dee9');
  }
}

const boardColors = ['#8baacb','#576f91','#7194b0','#577099'];
for (let x = -13; x < 13; x += 2.6) {
  for (const z of [-9.45,9.45]) {
    box(x,0,z-.1,x+2.5,.66,z+.1,[ '#374b67',boardColors[Math.round((x+13)/2.6)%4],'#455976']);
  }
}
}
const courtFloor = mesh.filter(model => model.points.every(point => point[1] < .05));
for (const piece of courtFloor) {
  piece.floor = true;
  mesh.splice(mesh.indexOf(piece),1);
}

function miter(normal, adjacent) {
  const divisor = 1+normal[0]*adjacent[0]+normal[1]*adjacent[1];
  return normal.map((value,i)=>(value+adjacent[i])/divisor);
}

function addSection({ a,b,normal,side, from=normal, to=normal }, tier, start, end, index) {
  const span = distance(a,b) * (end-start);
  const zone = tier.id === 4 ? 4 : Math.abs(normal[0]) === 1 ? 3 : tier.id;
  const code = (tier.id === 4 ? 'CS-' : tier.id) + side + String(index).padStart(2,'0');
  const label = { A: 'Sideline A', B: 'East end', C: 'Sideline C', D: 'West end' }[side];
  const section = { code, label, zone, normal, rows: [] };
  const coord = (p, d, y) => [lerp(a[0]+d*from[0],b[0]+d*to[0],p),y,
    lerp(a[1]+d*from[1],b[1]+d*to[1],p)];
  const count = Math.max(3, Math.floor((span - .52) / .57));
  sections.push(section);
  for (let r = 0; r < tier.rows; r++) {
    const front = tier.offset + r * tier.step;
    const h = tier.lift + r * tier.rise;
    const rear = front + tier.step;
    const left = start+.005;
    const right = end-.005;
    if (tier.id !== 4) {
      face([coord(left,front,h),coord(right,front,h),coord(right,rear,h),coord(left,rear,h)],r%2 ? '#344153' : '#39485c');
      face([coord(left,front,h-tier.rise),coord(right,front,h-tier.rise),coord(right,front,h),coord(left,front,h)],'#202a39');
      if (r === 0 && tier.id !== 1) {
        face([coord(left,front-.04,h-.3),coord(right,front-.04,h-.3),coord(right,front-.04,h-.065),coord(left,front-.04,h-.065)],'#6a9dcb');
      }
    }
    const row = [];
    for (let s = 0; s < count; s++) {
      const p = lerp(start,end,(s+1)/(count+1));
      const position = coord(p,front+tier.step*.62,h+.34);
      const seat = {
        number: s+1, row: r+1, section, position,
        price: zone === 4 ? [1000,800,600][r] : categories[zone].price,
        key: code+'-'+(r+1)+'-'+(s+1),
        available: (r*23+s*17+index*11+tier.id*3+side.charCodeAt(0))%19 > 2,
      };
      row.push(seat);
      chairs.push(seat);
    }
    section.rows.push(row);
  }
  const center = (start+end)*.5;
  section.anchor = coord(center,tier.offset+tier.step*tier.rows*.6,tier.lift+(tier.rows-1)*tier.rise*.6+.8);
  section.hit = [coord(start,tier.offset,tier.lift),coord(end,tier.offset,tier.lift),
    coord(end,tier.offset+tier.rows*tier.step,tier.lift+tier.rows*tier.rise),
    coord(start,tier.offset+tier.rows*tier.step,tier.lift+tier.rows*tier.rise)];
}

if (!stadium) {
for (const tier of tiers) {
  const indices = {};
  for (const [index,geometry] of sectionGeometry.entries()) {
    const { normal,side } = geometry;
    const count = sectionGeometry.length;
    const from = miter(normal,sectionGeometry[(index+count-1)%count].normal);
    const to = miter(normal,sectionGeometry[(index+1)%count].normal);
    const n = Math.abs(normal[1]) === 1 ? 5 : Math.abs(normal[0]) === 1 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      indices[side] = (indices[side] ?? 0)+1;
      addSection({ ...geometry,from,to },tier,i/n+.007,(i+1)/n-.007,indices[side]);
    }
  }
}
const courtsideTier = {rows:3,offset:0,lift:-.06,step:.46,rise:0,id:4};
for (const side of [
  {a:[-11,-9.9],b:[11,-9.9],normal:[0,-1],side:'C'},
  {a:[11,9.9],b:[-11,9.9],normal:[0,1],side:'A'},
]) {
  for (let i=0;i<3;i++) addSection(side,courtsideTier,i/3+.008,(i+1)/3-.008,i+1);
}

function overhead(points, stroke, width = 1) {
  roof.push({points, stroke, width, line:true});
}
for (let x=-36; x<=36; x+=9) {
  overhead([[x,16,-34],[x,18,-17],[x,19,0],[x,18,17],[x,16,34]],'#42516b',2);
}
for (let z=-28; z<=28; z+=7) overhead([[-38,17,z],[38,17,z]],'#33415a');
for (const z of [-12,12]) {
  for (let x=-29; x<=29;x+=4.5) overhead([[x,15.75,z],[x+.65,15.75,z]],'#e4ecff',3);
}
}
const scoreboard = [];
if (!stadium) {
for (const [x1,z1,x2,z2] of [[-2.2,-1.75,2.2,-1.75],[2.2,-1.75,2.2,1.75],
  [2.2,1.75,-2.2,1.75],[-2.2,1.75,-2.2,-1.75]]) {
  scoreboard.push({ points:[[x1,10,z1],[x2,10,z2],[x2,12.75,z2],[x1,12.75,z1]], color:'#27384c', stroke:'#647d9b' });
  scoreboard.push({ points:[[lerp(x1,x2,.16),10.4,lerp(z1,z2,.16)],[lerp(x1,x2,.84),10.4,lerp(z1,z2,.84)],
    [lerp(x1,x2,.84),12.22,lerp(z1,z2,.84)],[lerp(x1,x2,.16),12.22,lerp(z1,z2,.16)]], color:'#557da7' });
}
}

const defaultOrbit = venue.defaultOrbit;
const clamp = (value, min, max) => Math.min(max,Math.max(min,value));
const dot = (a,b) => a.reduce((sum,x,i) => sum+x*b[i],0);
const cross = ([a,b,c],[d,e,f]) => [b*f-c*e,c*d-a*f,a*e-b*d];
const unit = a => {
  const length = Math.hypot(...a) || 1;
  return a.map(x => x/length);
};

const chairMaterials = stadium ? {
  shell: ['#747f89','#a4aeb6','#c6cfd5','#606a73'],
  cushion: ['#747f89','#a4aeb6','#c6cfd5','#606a73'],
  stand: ['#56616b','#717d85','#8d99a2','#4a555e'],
} : {
  shell: ['#454d58','#626b77','#818c97','#303844'],
  cushion: ['#303945','#4d5764','#687380','#252e39'],
  stand: ['#282f39','#3a4450','#56606b','#222833'],
};

// Chair coordinates are relative to the seat marker. Positive depth faces away from the court.
function chairDesign(courtside) {
  const width = courtside ? .205 : .228;
  const front = courtside ? -.196 : -.239;
  const rear = courtside ? .136 : .162;
  const backDepth = courtside ? .105 : .14;
  const pan = [
    [-width+.044,front],[width-.044,front],[width,front+.04],[width,rear-.042],
    [width-.04,rear],[-width+.04,rear],[-width,rear-.042],[-width,front+.04],
  ].map(([x,z])=>[x,.083-z*.09,z]);
  const back = [
    [-width+.032,.045],[width-.032,.045],[width,.14],[width-.004,.432],
    [width-.043,.518],[width-.089,.548],[-width+.089,.548],[-width+.043,.518],
    [-width+.004,.432],[-width,.14],
  ].map(([x,y])=>[x,y,backDepth+y*.175]);
  const material = courtside ? 'cushion' : 'shell';
  const frame = [];
  if (courtside) {
    for (const x of [-.145,.145]) {
      for (const z of [front+.05,rear-.03]) {
        frame.push(chairSupport(x,z,.026,.023,.037,-.34));
      }
    }
  } else {
    frame.push(chairSupport(0,.025,.06,.064,.038,-.34));
    frame.push(chairSupport(0,.025,.146,.103,-.315,-.34));
  }
  return {
    distant: [
      {points:pan,material,tone:2},
      {points:back,material,tone:1},
    ],
    near: [
      ...frame.flat(),
      ...chairPrism(pan,[0,-.05,0],material,2,3,1),
      ...chairPrism(back,[0,0,.036],material,1,0,2),
    ],
  };
}

function chairSupport(x,z,halfWidth,halfDepth,top,bottom) {
  const profile = [[x-halfWidth,top,z-halfDepth],[x+halfWidth,top,z-halfDepth],
    [x+halfWidth,top,z+halfDepth],[x-halfWidth,top,z+halfDepth]];
  return chairPrism(profile,[0,bottom-top,0],'stand',2,3,0);
}

function chairPrism(profile,offset,material,frontTone,backTone,edgeTone) {
  const opposite = profile.map(point=>point.map((value,i)=>value+offset[i]));
  const center = offset.map((value,i)=>profile.reduce((sum,point)=>sum+point[i],0)/profile.length+value*.5);
  const surfaces = [
    {points:profile,tone:frontTone},
    {points:opposite,tone:backTone},
    ...profile.map((point,i)=>{
      const j=(i+1)%profile.length;
      return {points:[point,profile[j],opposite[j],opposite[i]],tone:edgeTone};
    }),
  ];
  return surfaces.map(({points,tone})=>{
    const origin = points[0];
    const normal = unit(cross(points[1].map((value,i)=>value-origin[i]),points[2].map((value,i)=>value-origin[i])));
    const inward = dot(normal,center.map((value,i)=>value-origin[i]))>0;
    return {points,material,tone,normal:inward ? normal.map(value=>-value) : normal};
  });
}

function orientChair(design,[nx,nz]) {
  const orient = ([x,y,z])=>[nz*x+nx*z,y,-nx*x+nz*z];
  return design.map(piece=>({
    ...piece,
    points:piece.points.map(orient),
    normal:piece.normal && orient(piece.normal),
  }));
}

const standDesign = chairDesign(false);
const courtsideDesign = chairDesign(true);
const chairModels = new Map();
for (const seat of chairs) {
  const isCourtside = !stadium && seat.section.zone===4;
  const normal = seat.normal ?? seat.section.normal;
  const key = (isCourtside?'c':'s')+normal.map(n=>n.toFixed(3)).join('/');
  if (!chairModels.has(key)) {
    const design = isCourtside ? courtsideDesign : standDesign;
    chairModels.set(key,{
      distant:orientChair(design.distant,normal),
      near:orientChair(design.near,normal),
    });
  }
  seat.chair = chairModels.get(key);
}

function orbitPose({ yaw,pitch,radius }) {
  const direction = [-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
  return [...direction.map((d,i) => -d*radius + (i===1 ? venue.orbitCenter : 0)),yaw+Math.PI,-pitch];
}
function seatPose(seat, yawOffset=0, pitchOffset=0) {
  const [x,y,z] = seat.position;
  const n = seat.normal ?? seat.section.normal;
  return [x-n[0]*.14,y+.85,z-n[1]*.14,Math.atan2(-x,-z)+yawOffset,
    Math.atan2(-y-.78,Math.hypot(x,z))+pitchOffset];
}

function sectionPose(section, {width,height}) {
  const [nx,nz] = section.normal;
  const yaw = Math.atan2(nx,nz);
  const pitch = -.99;
  const backward = [-nx*Math.cos(pitch),-Math.sin(pitch),-nz*Math.cos(pitch)];
  const seats = section.rows.flat();
  const center = seats.reduce((sum,seat) => sum.map((x,i) => x+seat.position[i]/seats.length),[0,0,0]);
  const poseAt = radius => [...center.map((x,i) => x+backward[i]*radius),yaw,pitch];
  const fits = radius => {
    const {toCamera,toScreen} = projection(poseAt(radius),width,height,1);
    return seats.every(seat => {
      const point = toCamera(seat.position);
      if (point[2]<1) return false;
      const [x,y] = toScreen(point);
      return Math.abs(x-width*.5)<width*.38 && Math.abs(y-height*.51)<height*.30;
    });
  };
  let near=2, far=100;
  for (let i=0; i<14; i++) {
    const middle = (near+far)*.5;
    if (fits(middle)) far=middle;
    else near=middle;
  }
  return poseAt(far);
}

function spring(value, velocity, target, seconds, frequency = 9) {
  const displacement = value-target;
  const transient = velocity+frequency*displacement;
  const decay = Math.exp(-frequency*seconds);
  return [
    target+(displacement+transient*seconds)*decay,
    (velocity-frequency*transient*seconds)*decay,
  ];
}

function projection(pose,w,h,zoom,pan = [0,0]) {
  const origin = pose.slice(0,3);
  const [yaw,pitch] = pose.slice(3);
  const forward = unit([Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)]);
  const right = unit(cross(forward,[0,1,0]));
  const up = cross(right,forward);
  const focal = Math.min(h*.93,w*1.03)*zoom;
  const toCamera = point => {
    const x=point[0]-origin[0], y=point[1]-origin[1], z=point[2]-origin[2];
    return [x*right[0]+y*right[1]+z*right[2], x*up[0]+y*up[1]+z*up[2], x*forward[0]+y*forward[1]+z*forward[2]];
  };
  const toScreen = ([x,y,z]) => [w*.5+pan[0]+x*focal/z,h*.51+pan[1]-y*focal/z,focal/z];
  return { toCamera,toScreen };
}

function clippedPolygon(points, near) {
  const result=[];
  for (let i=0;i<points.length;i++) {
    const previous=points[(i+points.length-1)%points.length];
    const current=points[i];
    if ((current[2]>=near)!==(previous[2]>=near)) {
      const t=(near-previous[2])/(current[2]-previous[2]);
      result.push([lerp(previous[0],current[0],t),lerp(previous[1],current[1],t),near]);
    }
    if(current[2]>=near) result.push(current);
  }
  return result;
}
function contains(points,x,y) {
  let inside = false;
  for (let i=0,j=points.length-1; i<points.length; j=i++) {
    const [ax,ay]=points[i], [bx,by]=points[j];
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
  }
  return inside;
}

function resizeCanvas(canvas) {
  const width=Math.max(1,canvas.clientWidth), height=Math.max(1,canvas.clientHeight);
  const ratio=Math.min(1.65,globalThis.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);
  canvas.height=Math.round(height*ratio);
  return {width,height};
}

function projectChairs({pose,options,isInside,toCamera,toScreen,w,h,push}) {
  for (const seat of chairs) {
    if (isInside && options.seatKey===seat.key) continue;
    const point = toCamera(seat.position);
    if (point[2]<-.35) continue;
    const [x,y,scale] = toScreen([point[0],point[1],Math.max(point[2],.35)]);
    const margin = scale*.7+6;
    if (x < -margin || x > w+margin || y < -margin || y > h+margin) continue;
    const highlighted = options.markers &&
      (seat.section.code===options.sectionCode || seat.section.code===options.hoverCode);
    const selected = (options.markers || options.section) && seat.key===options.seatKey;
    const detail = scale*.46>14 ? 'near' : 'distant';
    const [sx,sy,sz] = seat.position;
    const pieces = seat.chair[detail];
    const first = stadium && detail==='distant' && scale<13 ? 1 : 0;
    for (let i=first;i<pieces.length;i++) {
      const piece = pieces[i];
      if (piece.normal) {
        const [px,py,pz] = piece.points[0];
        const [nx,ny,nz] = piece.normal;
        if (nx*(pose[0]-sx-px)+ny*(pose[1]-sy-py)+nz*(pose[2]-sz-pz)<=0) continue;
      }
      const color = selected ? '#d5ff52' : highlighted ? categories[seat.section.zone].color
        : chairMaterials[piece.material][piece.tone];
      const points = piece.points.map(([px,py,pz])=>toCamera([sx+px,sy+py,sz+pz]));
      push(points,{color});
    }
  }
}

function drawArena(canvas, pose, {width:w,height:h}, options = {}) {
  const ctx=canvas.getContext('2d');
  ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
  const isInside = !options.section && (stadium
    ? pose[1]<19 && Math.abs(pose[0])<120 && Math.abs(pose[2])<78
    : pose[1]<15.5 && Math.hypot(pose[0],pose[2])<38);
  const background=stadium && isInside ? ctx.createLinearGradient(0,0,0,h) :
    ctx.createRadialGradient(w*.53,h*.44,0,w*.53,h*.44,Math.max(w,h)*.68);
  background.addColorStop(0,stadium && isInside?'#496c88':'#24364e');
  background.addColorStop(1,stadium && isInside?'#b3cbcb':'#0c121d');
  ctx.fillStyle=background;
  ctx.fillRect(0,0,w,h);
  if (!isInside) {
    ctx.strokeStyle='#8caad012';
    ctx.beginPath();
    for(let x=w%32/2;x<w;x+=32){ctx.moveTo(x,0);ctx.lineTo(x,h);}
    for(let y=h%32/2;y<h;y+=32){ctx.moveTo(0,y);ctx.lineTo(w,y);}
    ctx.stroke();
  }
  const {toCamera,toScreen}=projection(pose,w,h,options.zoom||1,options.pan);
  const objects=[];
  const near=.35;
  const push = (points,model) => {
    if (model.line) {
      if(points.some(point=>point[2]<near)) return;
    } else if(points.some(point=>point[2]<near)) {
      points=clippedPolygon(points,near);
      if(points.length<3) return;
    }
    const projected = points.map(toScreen);
    if(projected.every(p=>p[0]<0)||projected.every(p=>p[0]>w)||
      projected.every(p=>p[1]<0)||projected.every(p=>p[1]>h)) return;
    const depth = model.floor ? 1000-model.points[0][1]*100 :
      points.reduce((sum,p)=>sum+p[2],0)/points.length;
    objects.push({depth,projected,model});
  };
  const models = isInside ? [...courtFloor,...mesh,...roof,...scoreboard] : [...courtFloor,...mesh];
  for (const model of models) push(model.points.map(toCamera),model);
  projectChairs({pose,options,isInside,toCamera,toScreen,w,h,push});
  objects.sort((a,b)=>b.depth-a.depth);
  for(const {model,projected} of objects){
    ctx.beginPath();
    ctx.moveTo(...projected[0].slice(0,2));
    for(let i=1;i<projected.length;i++) ctx.lineTo(...projected[i].slice(0,2));
    if(!model.line) ctx.closePath();
    if(model.color){ctx.fillStyle=model.color;ctx.fill();}
    if(model.stroke){ctx.strokeStyle=model.stroke;ctx.lineWidth=model.width||.75;ctx.stroke();}
  }
  const hits=[];
  if (options.sectionSeats) {
    ctx.fillStyle='#0b1222ad';
    ctx.fillRect(0,0,w,h);
    return sectionSeatMarkers(ctx, options, toCamera, toScreen, w, h);
  }
  if (!options.markers || isInside) return hits;
  ctx.font='650 11px system-ui';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  for (const section of sections) {
    const region=section.hit.map(toCamera);
    if(region.some(point=>point[2]<near)) continue;
    const [x,y]=toScreen(toCamera(section.anchor));
    const hit = {section,points:region.map(toScreen),x,y};
    hits.push(hit);
    const prominent = section.code===options.hoverCode || section.code===options.sectionCode;
    const labeled = stadium ? section.marker : section.zone===4 ? section.code.endsWith('02') && w>570 : /[ABCD]03$/.test(section.code);
    if (!prominent && (!labeled || w<460)) continue;
    const label=stadium && !prominent ? categories[section.zone].name : section.code;
    const chipWidth=ctx.measureText(label).width+10;
    hit.labelWidth=chipWidth;
    ctx.fillStyle=prominent?categories[section.zone].color:'#111a28e8';
    ctx.beginPath();
    ctx.roundRect(x-chipWidth/2,y-8,chipWidth,16,4);
    ctx.fill();
    ctx.fillStyle=prominent?'#152033':'#e6edf7';
    ctx.fillText(label,x,y+.2);
  }
  return hits;
}

function sectionSeatMarkers(ctx, options, toCamera, toScreen, width, height) {
  const { section } = options;
  const bounds = section.hit.map(toCamera);
  if (bounds.every(point=>point[2]>.35)) {
    const [first,...rest] = bounds.map(toScreen);
    ctx.beginPath();
    ctx.moveTo(first[0],first[1]);
    for (const [x,y] of rest) ctx.lineTo(x,y);
    ctx.closePath();
    ctx.fillStyle='#588abb2b';
    ctx.fill();
    ctx.strokeStyle='#8ab7dc66';
    ctx.lineWidth=1;
    ctx.stroke();
  }
  const rows = section.rows.map(row => row.map(seat => {
    const point = toCamera(seat.position);
    const [x,y,scale] = toScreen(point);
    return {seat,x,y,depth:point[2],r:clamp(scale*.22,1.6,13)};
  }));
  const hits = rows.flat().filter(marker => marker.depth>.35 && marker.x>=0 && marker.x<=width &&
    marker.y>=0 && marker.y<=height);
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  for (const marker of hits) {
    const {seat,x,y} = marker;
    const r = marker.r = [
      rows[seat.row-2]?.[seat.number-1], rows[seat.row]?.[seat.number-1],
      rows[seat.row-1][seat.number-2], rows[seat.row-1][seat.number],
    ].reduce((radius,neighbor) => neighbor
      ? Math.min(radius,Math.hypot(neighbor.x-x,neighbor.y-y)*.43) : radius,marker.r);
    const selected = seat.key===options.seatKey;
    const hovered = seat.key===options.hoverSeatKey;
    const saved = options.ticketKeys?.has(seat.key);
    ctx.fillStyle = selected||saved ? '#d5ff52' : seat.available ? '#82cdf6' : '#455569';
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
    if (hovered) {
      ctx.strokeStyle='#fff';
      ctx.lineWidth=1.5;
      ctx.stroke();
    }
    if (r>=7.5) {
      ctx.font='700 '+Math.min(10,r+1)+'px system-ui';
      ctx.fillStyle=seat.available?'#102033':'#d1d9e5';
      ctx.fillText(seat.available?seat.number:'×',x,y+.2);
    }
  }
  ctx.font='650 11px system-ui';
  ctx.fillStyle='#e3ebf6';
  for (const row of rows) {
    const edge = row.reduce((left,marker) => marker.x<left.x?marker:left);
    const x = edge.x-edge.r-14;
    if (edge.depth>.35 && x>11 && x<width && edge.y>0 && edge.y<height) {
      ctx.fillText('R'+edge.seat.row,x,edge.y+.2);
    }
  }
  return hits;
}

function hitSeat(hits,x,y) {
  let nearest, closest=Infinity;
  for (const marker of hits) {
    const distance=Math.hypot(marker.x-x,marker.y-y);
    if (distance<closest && distance<=Math.max(marker.r+3,8)) {
      nearest=marker.seat;
      closest=distance;
    }
  }
  return nearest;
}

function hitSection(hits,x,y) {
  const labels=hits.filter(hit=>hit.labelWidth && Math.abs(hit.x-x)<=hit.labelWidth/2 && Math.abs(hit.y-y)<=8);
  const candidates=labels.length ? labels : hits.filter(hit=>contains(hit.points,x,y));
  candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
  return candidates[0]?.section;
}

return { venue, categories, sections, defaultOrbit, clamp, orbitPose, sectionPose, seatPose, spring, resizeCanvas, drawArena, hitSection, hitSeat };
})();
