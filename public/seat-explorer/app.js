(() => {
'use strict';

const { venue, categories, sections, defaultOrbit, clamp, orbitPose, sectionPose, seatPose, spring, resizeCanvas, drawArena, hitSection, hitSeat } = globalThis.BTArenaModel;

const byId = id => document.getElementById(id);
const canvas = byId('arena');
const picker = byId('picker');
const dialog = byId('dialog');
const dialogContent = byId('dialog-content');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const money = value => new Intl.NumberFormat('ro-RO').format(value) + ' lei';
const seatLabel = seat => 'Row ' + seat.row + ' · Seat ' + seat.number;
const sectionLabel = section => section.code + ' · ' + section.label;
const announce = message => { byId('announcement').textContent = message; };

let activeSection = null;
let selected = null;
let pickerRow = 1;
let mode = 'arena';
let orbit = { ...defaultOrbit };
let look = { yaw: 0, pitch: 0 };
let zoom = 1;
let pan = [0,0];
let sectionCamera;
let hits = [];
let hover = null;
let drag = null;
const cart = new Map();
const comparisons = new Map();
let size = resizeCanvas(canvas);
let pose = orbitPose(orbit);
let target = pose.slice();
let velocity = [0,0,0,0,0];
let frame = 0;
let lastTime = 0;

function render(timestamp) {
  frame = 0;
  const dt = lastTime ? Math.min(.064,(timestamp-lastTime)/1000) : .016;
  lastTime = timestamp;
  let moving = false;
  for (let i=0; i<pose.length; i++) {
    if (Math.abs(pose[i]-target[i]) + Math.abs(velocity[i]) < .002) {
      pose[i] = target[i];
      velocity[i] = 0;
      continue;
    }
    [pose[i],velocity[i]] = spring(pose[i],velocity[i],target[i],dt);
    moving = true;
  }
  const atSection = mode==='section' && pose.every((value,i) => Math.abs(value-target[i])<.02);
  hits = drawArena(canvas,pose,size,{ zoom, pan, markers:mode==='arena', seatKey:selected?.key,
    sectionCode:activeSection?.code, hoverCode:hover?.code, section:mode==='section'?activeSection:null,
    sectionSeats:atSection, hoverSeatKey:hover?.key, ticketKeys:cart });
  if (moving) refresh();
  else lastTime = 0;
}
function refresh() {
  if (!frame) frame = requestAnimationFrame(render);
}
function aim(immediate = false) {
  const camera = mode==='arena' ? orbitPose(orbit) : mode==='section' ? sectionCamera : seatPose(selected,look.yaw,look.pitch);
  target = camera.slice();
  target[3] = pose[3] + Math.atan2(Math.sin(target[3]-pose[3]),Math.cos(target[3]-pose[3]));
  if (immediate || motion.matches) {
    pose = target.slice();
    velocity.fill(0);
  }
  refresh();
}
function setMode(next, focus = '') {
  if ((next==='seat' && !selected) || (next==='section' && !activeSection)) return;
  mode = next;
  hits = [];
  clearHover();
  look = { yaw: 0, pitch: 0 };
  zoom = 1;
  pan = [0,0];
  byId('overview').setAttribute('aria-pressed', String(mode==='arena'));
  byId('section-view').setAttribute('aria-pressed', String(mode==='section'));
  byId('seat-view').setAttribute('aria-pressed', String(mode==='seat'));
  byId('section-view').disabled = !activeSection;
  byId('seat-view').disabled = !selected;
  byId('camera-hint').textContent = {
    arena: 'Drag to rotate · Click a section',
    section: 'Select a seat · Drag to pan',
    seat: 'Drag to look around',
  }[mode];
  byId('camera-label').textContent = mode==='arena' ? venue.name+' overview'
    : mode==='section' ? 'Section '+activeSection.code : selected.section.code+' · '+seatLabel(selected);
  aim();
  renderPicker(focus);
}
function stepZoom(direction) {
  if (mode==='arena') orbit.radius = clamp(orbit.radius * Math.exp(-direction*.13),...venue.zoomBounds);
  else zoom = clamp(zoom * Math.exp(direction*.17),.65,mode==='section'?3:2.2);
  aim();
}
function moveCamera(dx,dy) {
  if (mode==='section') {
    pan = [clamp(pan[0]+dx,-size.width*zoom*.4,size.width*zoom*.4),
      clamp(pan[1]+dy,-size.height*zoom*.35,size.height*zoom*.35)];
    refresh();
    return;
  }
  if (mode==='arena') {
    orbit.yaw -= dx*.009;
    orbit.pitch = clamp(orbit.pitch+dy*.007,.34,1.26);
  } else {
    look.yaw -= dx*.009;
    look.pitch = clamp(look.pitch+dy*.007,-1.15,1.15);
  }
  aim(true);
}
function resetCamera() {
  orbit = { ...defaultOrbit };
  setMode(mode);
}
const pointInCanvas = event => {
  const rect = canvas.getBoundingClientRect();
  return [event.clientX-rect.left,event.clientY-rect.top];
};
function clearHover() {
  hover = null;
  byId('arena-tooltip').hidden = true;
  canvas.dataset.target = 'false';
}
function startDrag() {
  if (mode==='arena') {
    orbit.yaw = pose[3]-Math.PI;
    orbit.pitch = clamp(-pose[4],.34,1.26);
    orbit.radius = clamp(Math.hypot(pose[0],pose[1]-venue.orbitCenter,pose[2]),...venue.zoomBounds);
  } else if (mode==='seat') {
    const base = seatPose(selected);
    look.yaw = pose[3]-base[3];
    look.pitch = pose[4]-base[4];
  }
  clearHover();
}
canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button!==0) return;
  canvas.setPointerCapture(event.pointerId);
  drag = { x:event.clientX, y:event.clientY, moved:false };
});
canvas.addEventListener('pointermove', event => {
  if (!event.isPrimary) return;
  const [x,y] = pointInCanvas(event);
  const tooltip = byId('arena-tooltip');
  if (drag) {
    const dx = event.clientX-drag.x, dy = event.clientY-drag.y;
    if (!drag.moved && Math.hypot(dx,dy)<6) return;
    if (!drag.moved) startDrag();
    drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    moveCamera(dx,dy);
    return;
  }
  if (mode==='seat') return;
  const next = mode==='arena' ? hitSection(hits,x,y) : hitSeat(hits,x,y);
  if (next!==hover) {
    hover = next;
    refresh();
  }
  tooltip.hidden = !next;
  canvas.dataset.target = String(!!next && (mode==='arena' || next.available));
  if (!next) return;
  tooltip.textContent = mode==='arena' ? next.code+' · '+categories[next.zone].name
    : seatLabel(next)+' · '+(next.available?money(next.price):'Taken');
  const tooltipWidth = tooltip.offsetWidth;
  tooltip.style.left = Math.max(4,Math.min(x+12,size.width-tooltipWidth-4))+'px';
  tooltip.style.top = Math.max(5,y-35)+'px';
});
canvas.addEventListener('pointerup', event => {
  if (!event.isPrimary || !drag) return;
  if (!drag.moved) {
    const point = pointInCanvas(event);
    if (mode==='arena') {
      const section = hitSection(hits,...point);
      if (section) chooseSection(section);
    } else if (mode==='section') {
      const seat = hitSeat(hits,...point);
      if (seat?.available) selectSeat(seat);
      else if (seat) announce(seatLabel(seat)+' is taken.');
    }
  }
  drag = null;
});
canvas.addEventListener('pointercancel', () => { drag=null; });
canvas.addEventListener('pointerleave', () => {
  clearHover();
  refresh();
});
canvas.addEventListener('wheel', event => {
  if (document.activeElement!==canvas && !event.ctrlKey) return;
  event.preventDefault();
  stepZoom(-Math.sign(event.deltaY));
},{passive:false});
canvas.addEventListener('keydown', event => {
  const keys = {
    ArrowLeft: () => moveCamera(-16,0), ArrowRight: () => moveCamera(16,0),
    ArrowUp: () => moveCamera(0,-15), ArrowDown: () => moveCamera(0,15),
    '+': () => stepZoom(1), '=': () => stepZoom(1), '-': () => stepZoom(-1),
    Home: resetCamera,
  };
  if (!keys[event.key]) return;
  event.preventDefault();
  keys[event.key]();
});
byId('overview').onclick = () => setMode('arena');
byId('section-view').onclick = () => setMode('section');
byId('seat-view').onclick = () => setMode('seat');
byId('zoom-in').onclick = () => stepZoom(1);
byId('zoom-out').onclick = () => stepZoom(-1);
byId('reset-camera').onclick = resetCamera;
new ResizeObserver(() => {
  size = resizeCanvas(canvas);
  if (activeSection) sectionCamera = sectionPose(activeSection,size);
  if (mode==='section') aim();
  else refresh();
}).observe(byId('viewer'));

function chooseSection(section, focus = false) {
  activeSection = section;
  sectionCamera = sectionPose(section,size);
  selected = null;
  pickerRow = 1;
  setMode('section',focus?'section-select':'');
  announce(sectionLabel(section)+' selected. Choose a seat.');
}
function showCategories() {
  setMode('arena','category-1');
}
function selectSeat(seat, focus = '') {
  if (!seat?.available) return;
  selected = seat;
  pickerRow = seat.row;
  setMode('seat',focus);
  announce(seatLabel(seat)+' '+venue.surface+' view.');
}
function showViewerOnMobile() {
  if (matchMedia('(max-width: 710px)').matches) {
    byId('viewer').scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});
  }
}
function renderPicker(focus = '') {
  const inArena = mode==='arena';
  const zone = activeSection?.zone;
  byId('panel-title').textContent = inArena ? 'Find your view.' : mode==='section' ? 'Section '+activeSection.code : seatLabel(selected);
  byId('panel-description').textContent = inArena ? 'Click a section on the map or choose a ticket category to see its seats.'
    : mode==='section' ? categories[zone].name+' · Select a seat in the map or use the controls below.'
    : 'Section '+activeSection.code+' · '+categories[zone].name+' · '+money(selected.price);
  if (inArena) {
    picker.innerHTML = '<div class="categories">'+Object.entries(categories).map(([id,category]) =>
      '<button class="category" id="category-'+id+'" data-zone="'+id+'"><span class="category-dot" style="--chip:'+category.color+
      '"></span><span><strong>'+category.name+'</strong><small>'+category.description+'</small></span><span class="category-price">'+
      (id==='4' && !venue.demoPrices?'From ':'')+money(category.price)+'</span></button>').join('')+'</div>';
    picker.querySelectorAll('[data-zone]').forEach(button => {
      button.onclick = () => {
        const options = sections.filter(section => section.zone===Number(button.dataset.zone));
        const center = Number(button.dataset.zone)===4 ? 'A02' : 'A03';
        chooseSection(options.find(section=>section.featured) ?? options.find(section=>section.code.endsWith(center)) ?? options[0],true);
        showViewerOnMobile();
      };
    });
  } else {
    const rowSelected = selected?.row===pickerRow;
    const options = sections.filter(section => section.zone===zone);
    picker.innerHTML = '<button class="back-button" id="back-categories">All ticket categories</button>'+
      '<div class="fields"><label>Section<select id="section-select">'+options.map(section =>
        '<option value="'+section.code+'" '+(section===activeSection?'selected':'')+'>'+sectionLabel(section)+'</option>').join('')+
      '</select></label><label>Row<select id="row-select">'+activeSection.rows.map((_,i) =>
        '<option '+(i+1===pickerRow?'selected':'')+'>'+(i+1)+'</option>').join('')+
      '</select></label><label>Seat<select id="number-select"><option value="" disabled '+(!rowSelected?'selected':'')+'>Choose seat</option>'+
      activeSection.rows[pickerRow-1].map(seat =>
        '<option value="'+seat.number+'" '+(seat===selected?'selected':'')+' '+(!seat.available?'disabled':'')+'>'+
        seat.number+(!seat.available?' · Taken':'')+'</option>').join('')+'</select></label></div>';
    byId('back-categories').onclick = showCategories;
    byId('section-select').onchange = event => chooseSection(options.find(section => section.code===event.target.value),true);
    byId('row-select').onchange = event => {
      pickerRow = Number(event.target.value);
      if (mode==='seat') setMode('section','row-select');
      else {
        renderPicker('row-select');
        refresh();
      }
    };
    byId('number-select').onchange = event => {
      selectSeat(activeSection.rows[pickerRow-1][Number(event.target.value)-1],'number-select');
      showViewerOnMobile();
    };
    if (mode==='section') {
      picker.insertAdjacentHTML('beforeend','<div class="seat-legend" aria-label="Map legend">'+
        '<span><i style="--seat-color:#82cdf6"></i>Available</span>'+
        '<span><i style="--seat-color:#455569"></i>Taken</span>'+
        '<span><i style="--seat-color:#d5ff52"></i>Selected</span></div>');
    } else {
      picker.insertAdjacentHTML('beforeend','<div class="seat-actions"><button class="secondary" id="back-to-section">Back to section</button>'+
        '<button class="primary" id="add-seat">'+(cart.has(selected.key)?'Remove ticket':'Add demo ticket')+'</button></div>'+
        '<button class="back-button" id="save-view" style="margin-top:.48rem">'+
        (comparisons.has(selected.key)?'Remove from comparison':'Save to compare')+'</button>');
      byId('back-to-section').onclick = () => {
        setMode('section','number-select');
        showViewerOnMobile();
      };
      byId('add-seat').onclick = () => toggleTicket(selected);
      byId('save-view').onclick = () => toggleComparison(selected);
    }
  }
  const focusTarget = focus && byId(focus);
  if (focusTarget) focusTarget.focus({preventScroll:true});
}
const total = () => [...cart.values()].reduce((sum,seat) => sum+seat.price,0);
function updateCart() {
  byId('cart-label').textContent = cart.size ? cart.size+' demo ticket'+(cart.size===1?'':'s') : 'Your selection';
  byId('cart-price').textContent = money(total());
  byId('checkout').disabled = cart.size===0;
  refresh();
}
function toggleTicket(seat) {
  if (cart.delete(seat.key)) {
    announce('Ticket removed.');
  } else if (cart.size<4) {
    cart.set(seat.key,seat);
    announce('Ticket added.');
  } else {
    openDialog('Ticket limit','<p>The demo allows up to four tickets per order.</p>');
    return;
  }
  renderPicker('add-seat');
  updateCart();
}
function toggleComparison(seat, focusId = 'save-view') {
  if (comparisons.delete(seat.key)) {
    announce('Seat removed from comparison.');
  } else if (comparisons.size<3) {
    comparisons.set(seat.key,seat);
    announce('Seat saved to compare.');
  } else {
    openDialog('Comparison limit','<p>You can compare up to three seats. Remove a saved seat to add another.</p>');
    return;
  }
  renderPicker(focusId);
  renderComparisons();
}
const comparisonGrid=byId('compare-grid');
function drawComparisons() {
  comparisonGrid.querySelectorAll('canvas').forEach(view => {
    const seat = comparisons.get(view.dataset.key);
    drawArena(view,seatPose(seat),resizeCanvas(view),{seatKey:seat.key});
  });
}
new ResizeObserver(drawComparisons).observe(comparisonGrid);
function renderComparisons() {
  byId('compare-panel').hidden = comparisons.size===0;
  comparisonGrid.innerHTML = [...comparisons.values()].map(seat =>
    '<article class="compare-card"><canvas data-key="'+seat.key+'" aria-label="Simulated '+venue.surface+' view from '+seat.section.code+', '+seatLabel(seat)+
    '"></canvas><div><strong>'+seat.section.code+' · '+seatLabel(seat)+'</strong><p>'+categories[seat.section.zone].name+' · '+money(seat.price)+
    '</p><div class="compare-actions"><button class="secondary" data-open="'+seat.key+'">Open view</button>'+
    '<button class="secondary" data-remove="'+seat.key+'">Remove</button></div></div></article>').join('');
  comparisonGrid.querySelectorAll('[data-open]').forEach(button => {
    button.onclick = () => {
      const seat = comparisons.get(button.dataset.open);
      activeSection = seat.section;
      sectionCamera = sectionPose(activeSection,size);
      selectSeat(seat);
      canvas.focus({preventScroll:true});
      byId('viewer').scrollIntoView({block:'nearest',behavior:motion.matches?'instant':'smooth'});
    };
  });
  comparisonGrid.querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = () => {
      toggleComparison(comparisons.get(button.dataset.remove),'');
      (comparisonGrid.querySelector('button') ?? byId('save-view') ?? canvas).focus({preventScroll:true});
    };
  });
  drawComparisons();
}

function openDialog(title,html) {
  byId('dialog-title').textContent = title;
  dialogContent.innerHTML = html;
  if (!dialog.open) dialog.showModal();
}
function reviewTickets() {
  const lines = [...cart.values()].map(seat =>
    '<div class="review-line"><div><strong>'+seat.section.code+' · '+seatLabel(seat)+'</strong><small>'+
    categories[seat.section.zone].name+'</small></div><div>'+money(seat.price)+
    ' <button class="secondary" data-remove="'+seat.key+'" aria-label="Remove '+seat.section.code+' '+seatLabel(seat)+'">Remove</button></div></div>').join('');
  const amount = total();
  openDialog('Review demo tickets','<p>'+venue.event+' · '+venue.date+'</p>'+lines+
    '<div class="review-total">Total <strong>'+money(amount)+'</strong></div>'+
    '<p>This is a simulated checkout. No reservation or payment is made.</p><button class="primary" id="confirm-demo">Complete demo checkout</button>');
  dialogContent.querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = () => {
      cart.delete(button.dataset.remove);
      updateCart();
      renderPicker();
      if (cart.size) {
        reviewTickets();
        dialogContent.querySelector('[data-remove]').focus();
      } else {
        dialog.close();
        (byId('add-seat') ?? byId('number-select') ?? byId('category-1') ?? canvas).focus();
      }
    };
  });
  byId('confirm-demo').onclick = () => {
    const count = cart.size;
    cart.clear();
    renderPicker();
    updateCart();
    openDialog('Demo checkout complete','<p>You selected '+count+' '+(count===1?'seat':'seats')+' for '+money(amount)+
      ' in the simulation.</p><button class="primary" id="done">Back to seat explorer</button>');
    byId('done').onclick = () => dialog.close();
    byId('done').focus();
  };
}
byId('checkout').onclick = reviewTickets;
byId('close-dialog').onclick = () => dialog.close();
dialog.addEventListener('click', event => {
  if (event.target!==dialog) return;
  const bounds=dialog.getBoundingClientRect();
  if (event.clientX<bounds.left || event.clientX>bounds.right ||
      event.clientY<bounds.top || event.clientY>bounds.bottom) dialog.close();
});
byId('references').onclick = () => {
  if (venue.references) {
    openDialog('Venue references','<p>The stadium model uses the published venue layout and photographs as references. Section codes, seat numbers, availability and prices are illustrative.</p><ul>'+
      venue.references.map(([label,url])=>'<li><a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a></li>').join('')+'</ul>');
    return;
  }
  openDialog('Venue references','<p>The arena is modeled from published plans and game photos. Section geometry, numbered seats and availability are representative.</p>'+
    '<ul><li><a href="https://dicositiganas.ro/ro/portofolio/sport-si-relaxare/bt-arena-cluj-napoca/" target="_blank" rel="noopener noreferrer">BTarena architectural plans and gallery</a></li>'+
    '<li><a href="https://ubt.s3.eu-west-3.amazonaws.com/articles/August2025/Season%20tickets%20-%20Zones_4x5.jpg" target="_blank" rel="noopener noreferrer">U-BT seating zones</a></li>'+
    '<li><a href="https://commons.wikimedia.org/wiki/File:BT_Arena_Cluj.jpg" target="_blank" rel="noopener noreferrer">BTarena game photograph</a>, Motofily, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></li></ul>'+
    '<img class="ref-photo" src="https://upload.wikimedia.org/wikipedia/commons/7/79/BT_Arena_Cluj.jpg" alt="Basketball game at BTarena with spectators filling the tiers" width="1989" height="1122" style="height:auto">');
};
renderPicker();
updateCart();
refresh();
})();
