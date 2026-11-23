globalThis.ClujArenaData = (() => {
'use strict';

const categories = {
  1: { name: 'Tribuna 1', description: 'Main stand', price: 70, color: '#b8f780' },
  2: { name: 'Tribuna 2', description: 'Opposite stand', price: 50, color: '#85d9ff' },
  3: { name: 'Peluza Sud', description: 'Behind the south goal', price: 30, color: '#f1b871' },
  4: { name: 'Peluza Nord', description: 'Behind the north goal', price: 30, color: '#c4b0ff' },
};
const sides = [
  {name:'Tribuna 1', zone:1, code:'T1', count:7, point:(t,r,y)=>[-43+86*t,y,r]},
  {name:'Peluza Nord', zone:4, code:'PN', count:9, point:(t,r,y)=>[43+r*Math.sin(t*Math.PI),y,r*Math.cos(t*Math.PI)]},
  {name:'Tribuna 2', zone:2, code:'T2', count:7, point:(t,r,y)=>[43-86*t,y,-r]},
  {name:'Peluza Sud', zone:3, code:'PS', count:9, point:(t,r,y)=>[-43-r*Math.sin(t*Math.PI),y,-r*Math.cos(t*Math.PI)]},
];

function build({face,flat,line,outline,curve,box,sections,chairs,roof}) {
  const paint = '#f2f6df';
  function ringSegment(side,start,end,inner,outer,y,color) {
    face([side.point(start,inner,y),side.point(end,inner,y),side.point(end,outer,y),side.point(start,outer,y)],color);
  }
  function ring(inner,outer,y,color) {
    for (const side of sides) {
      const slices = side.count===7 ? 1 : 30;
      for(let i=0;i<slices;i++) ringSegment(side,i/slices,(i+1)/slices,inner,outer,y,color);
    }
  }
  function boundary(radius,height,color) {
    for(const side of sides) {
      const steps = side.count===7 ? 1 : 36;
      line(Array.from({length:steps+1},(_,i)=>side.point(i/steps,radius,height)),color,.85);
    }
  }

  // The football pitch sits inside a red eight-lane athletics track.
  flat(-43,-37,43,37,-.045,'#3b6b3d');
  for (const side of sides.filter(side=>side.count===9)) {
    const center=side.point(.5,0,-.045);
    for(let i=0;i<30;i++) face([center,side.point(i/30,37,-.045),side.point((i+1)/30,37,-.045)],'#3b6b3d');
  }
  ring(36,37,-.029,'#426e3d');
  ring(37,47.24,-.021,'#a3584b');
  for(let lane=0;lane<9;lane++) boundary(37+lane*1.28,-.016,'#deb5a5');
  ring(47.24,50.5,-.025,'#484e4f');
  for (let i=0;i<14;i++) {
    const x=-53.6+i*(107.2/14);
    flat(x,-35,x+107.2/14,35,0,i%2?'#4b8046':'#52894a');
  }
  outline(-52.5,-34,52.5,34,.012,paint);
  line([[0,.014,-34],[0,.014,34]],paint);
  curve(0,0,9.15,0,2*Math.PI,.015,paint);
  curve(0,0,.23,0,2*Math.PI,.02,paint);
  for(const sign of [-1,1]) {
    const goalLine=sign*52.5;
    outline(goalLine,-20.16,sign*36,20.16,.015,paint);
    outline(goalLine,-9.16,sign*47,9.16,.016,paint);
    curve(sign*41.5,0,.21,0,2*Math.PI,.018,paint);
    const angle=Math.acos(5.5/9.15), mid=sign>0?Math.PI:0;
    curve(sign*41.5,0,9.15,mid-angle,mid+angle,.016,paint);
    const post = sign*52.55, net = sign*54.8;
    line([[post,0,-3.66],[post,2.44,-3.66],[post,2.44,3.66],[post,0,3.66]],'#f7faf8',2.4);
    line([[net,.05,-3.66],[net,1.55,-3.66],[net,1.55,3.66],[net,.05,3.66]],'#b1c1c5');
    for(let z=-3.66;z<=3.67;z+=.61) line([[post,2.44,z],[net,1.55,z],[net,.03,z]],'#b8c8c766',.65);
    for(const z of [-3.66,3.66]) line([[post,.05,z],[net,.05,z],[net,1.55,z],[post,2.44,z]],'#b8c8c7',.8);
    for(const z of [-34,34]) {
      line([[goalLine,0,z],[goalLine,1.5,z]],'#f7e8ba');
      face([[goalLine,1.5,z],[goalLine,1.25,z+Math.sign(-z)*.45],[goalLine,1.17,z]],'#ff6549');
    }
  }
  for(const z of [-35.5,35.5]) {
    for(let x=-42;x<42;x+=5.25) box(x,0,z-.12,x+5.08,.53,z+.12,['#334b4a','#6c9d87','#465a52']);
  }

  const tiers = [
    {number:1,rows:10,start:50.4,lift:1.15,rise:.35,depth:.81},
    {number:2,rows:13,start:60.2,lift:5.9,rise:.53,depth:.85},
  ];
  for (const side of sides) {
    for(const tier of tiers) {
      for(let index=0;index<side.count;index++) {
        const a=(index+.038)/side.count, b=(index+.962)/side.count;
        const mid=(a+b)*.5;
        const p0=side.point(mid,50,0), p1=side.point(mid,51,0);
        const normal=[p1[0]-p0[0],p1[2]-p0[2]];
        const featured = index===Math.floor(side.count/2);
        const label=side.name+' · Ring '+tier.number;
        const code=side.code+'-'+tier.number+String(index+1).padStart(2,'0');
        const section={code,label,zone:side.zone,normal,rows:[],featured,marker:featured && tier.number===1};
        const count=side.count===7?17:19;
        for(let r=0;r<tier.rows;r++) {
          const radius=tier.start+r*tier.depth;
          const next=radius+tier.depth;
          const y=tier.lift+r*tier.rise;
          ringSegment(side,a,b,radius,next,y,(index+r)%2?'#6f7780':'#767f87');
          face([side.point(a,radius,y-tier.rise),side.point(b,radius,y-tier.rise),
            side.point(b,radius,y),side.point(a,radius,y)],'#505b64');
          const row=[];
          for(let s=0;s<count;s++) {
            const t=a+(b-a)*(s+.5)/count;
            const position=side.point(t,radius+tier.depth*.61,y+.34);
            const outward=side.point(t,radius+tier.depth*.61+1,y+.34);
            const seat={section,position,normal:[outward[0]-position[0],outward[2]-position[2]],row:r+1,number:s+1,
              price:categories[side.zone].price,key:code+'-'+(r+1)+'-'+(s+1),
              available:(r*11+s*13+index*7+side.zone+tier.number)%23>3};
            row.push(seat);
            chairs.push(seat);
          }
          section.rows.push(row);
        }
        const edge=tier.start+tier.rows*tier.depth;
        section.anchor=side.point(mid,tier.start+(edge-tier.start)*.5,tier.lift+tier.rise*tier.rows*.5+1.2);
        section.hit=[side.point(a,tier.start,tier.lift),side.point(b,tier.start,tier.lift),
          side.point(b,edge,tier.lift+tier.rows*tier.rise),side.point(a,edge,tier.lift+tier.rows*tier.rise)];
        sections.push(section);
      }
    }
    // Covered upper ring, with the full canopy visible from the seats.
    const slices=side.count===7?24:32;
    const roofHeight=t=>20+(side.count===7?4:2)*Math.sin(Math.PI*t);
    for(let i=0;i<slices;i++){
      const start=i/slices,end=(i+1)/slices;
      const point=(t,r,drop=0)=>side.point(t,r,roofHeight(t)+drop);
      const a=point(start,58), b=point(end,58), c=point(end,76,-4), d=point(start,76,-4);
      roof.push({points:[a,b,c,d],color:i%2?'#aeb9c4':'#a5b1bd'});
      roof.push({points:[a,d],stroke:'#e0e8ef',width:1.4,line:true});
      roof.push({points:[a,b],stroke:'#eff3ef',width:1.7,line:true});
      const outerA=point(start,77,-4), outerB=point(end,77,-4);
      face([d,c,outerB,outerA],i%2?'#e0e8ef':'#ccd7df');
      face([outerA,outerB,side.point(end,77,11.8),side.point(start,77,11.8)],i%2?'#8a9ca7':'#9aabb5');
    }
  }
}

return {
  categories, build, name:'Cluj Arena', surface:'pitch',
  event:'Universitatea Cluj vs. CFR Cluj', date:'12 December 2026', demoPrices:true,
  defaultOrbit:{yaw:.38,pitch:.72,radius:216}, orbitCenter:6, zoomBounds:[125,360],
  references:[
    ['Cluj Arena architecture and photographs','https://dicositiganas.ro/portofolio/sport-leisure/cluj-arena/'],
    ['FC Universitatea Cluj stadium and sector guide','https://www.fcucluj.ro/stadion'],
    ['CFR Cluj fixture calendar','https://cfr1907.ro/rezultate/'],
  ],
};
})();
