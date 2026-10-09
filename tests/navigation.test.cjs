// Run the production controller with deterministic scrolling and Safari-like
// History API failures. Browser layout and touch behavior are checked separately.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'navigation.js'), 'utf8');

function page(initialHash = '#trip', routeMap = null) {
 let now = 0, nextId = 0, rejectHistory = false, writes = 0;
 const frames = new Map(), timers = new Map(), events = {}, viewportEvents = {};
 const context = {scrollY:0, innerHeight:800};
 const nav = {scrollLeft:0, getBoundingClientRect:()=>({left:0,right:390,width:390}), scrollTo({left}){this.scrollLeft=left;}};
 const targets = [0, 900, 1800].map((y,i) => ({id:`section-${i}`, getBoundingClientRect:()=>({top:y-context.scrollY})}));
 const links = targets.map((target,i) => {
  const attrs = new Map();
  return {hash:`#trip/${target.id}`,parentElement:nav,
   getAttribute:key=>attrs.get(key),setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key),
   getBoundingClientRect:()=>({left:i*140-nav.scrollLeft,right:i*140+120-nav.scrollLeft,width:120})};
 });
 const header = {offsetHeight:114,getBoundingClientRect:()=>({bottom:114,height:114})};
 const main = {id:'main-content',querySelectorAll:()=>targets,getAnimations:()=>[],remove(){},cloneNode(){return this;}};
 const sections = {innerHTML:'',querySelectorAll:()=>links};
 const pageLinks = ['trip','road','participants'].map(page=>{
  const attrs=new Map();
  return {dataset:{page},setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key),getAttribute:key=>attrs.get(key)};
 });
 const tabStyles=new Map();
 const tabBar={querySelectorAll:()=>pageLinks,style:{setProperty:(key,value)=>tabStyles.set(key,value)}};
 const config=Object.fromEntries(['trip','road','participants','person/12','not-found'].map(route=>[route,{nav:'',title:route,page:route==='person/12'?'participants':route==='not-found'?'':route}]));
 const templates=Object.keys(config).filter(route=>route!=='trip').map(route=>({dataset:{route},content:{firstElementChild:main}}));
 const document = {
  documentElement:{scrollHeight:2600,style:{setProperty(){}}},
  querySelector(selector){return ({'.site-header':header,footer:{before(){}},'.header-sections':sections,main,'.skip-link':{},'.tab-bar':tabBar,'.route-sketch-lines':routeMap})[selector];},
  querySelectorAll:selector=>selector==='[data-page]'?pageLinks:templates,
  getElementById:()=>({textContent:JSON.stringify(config)}),
  addEventListener(name,fn){events[name]=fn;}
 };
 const history = {state:null,scrollRestoration:'auto',replaceState(state){
  writes++;
  if (rejectHistory) throw Object.assign(new Error('History write rejected'), {name:rejectHistory});
  this.state=state;
 }};
 Object.assign(context, {document,history,location:{hash:initialHash,href:'https://example.test/index.html'+initialHash},
  performance:{now:()=>now},matchMedia:()=>({matches:true}),
  ResizeObserver:class {observe(){} disconnect(){}},
  requestAnimationFrame(fn){frames.set(++nextId,fn);return nextId;},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout(fn,delay){timers.set(++nextId,{fn,time:now+delay});return nextId;},clearTimeout:id=>timers.delete(id),
  addEventListener(name,fn){events[name]=fn;},
  visualViewport:{height:800,offsetTop:0,addEventListener(name,fn){viewportEvents[name]=fn;}},
  scrollTo({top}){context.scrollY=top;}
 });
 context.window=context;
 const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
 const advance=ms=>{
  const end=now+ms;
  while (true) {
   const due=[...timers].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];
   if(!due)break;
   now=due[1].time;timers.delete(due[0]);due[1].fn();
  }
  now=end;
 };
 vm.runInNewContext(source,context);
 flush();
 return {
  history,events,viewportEvents,flush,advance,pageLinks,tabStyles,
  scroll(y){context.scrollY=y;events.scroll();flush();},
  reject(name){rejectHistory=name;},
  get selected(){return links.findIndex(link=>link.getAttribute('aria-current')==='location');},
  get writes(){return writes;}
 };
}

// A long gesture previously wrote every animation frame and hit Safari quotas.
const continuous=page();
for(let i=0;i<1200;i++) {continuous.scroll(i*1.5);continuous.advance(16);}
assert.equal(continuous.selected,2);
assert.equal(continuous.writes,1,'No history writes during a continuous gesture');
continuous.advance(1000);
assert.equal(continuous.writes,2,'One trailing position save');
assert.equal(continuous.history.state.y,1798.5);
continuous.scroll(800);
assert.equal(continuous.selected,1,'Upward scrolling updates the menu');

// Brief pauses must not produce a high frequency of writes either.
const bursts=page();
for(let i=0;i<100;i++){bursts.scroll(i*10+1);bursts.advance(350);}
assert.ok(bursts.writes<=37,`Too many writes: ${bursts.writes}`);

for(const error of ['SecurityError','QuotaExceededError']) {
 const blocked=page();blocked.reject(error);
 blocked.scroll(900);blocked.advance(1100);
 blocked.scroll(1800);blocked.advance(1100);
 assert.equal(blocked.selected,2,`${error} must not freeze the menu`);
 blocked.scroll(0);
 assert.equal(blocked.selected,0);
 blocked.events.pagehide();
}

const resize=page();
resize.scroll(640);
assert.equal(resize.selected,1,'Switch when the next section enters the upper reading area');
resize.scroll(900);resize.viewportEvents.resize();resize.flush();
assert.equal(resize.selected,1);
for(const [route,index] of [['trip',0],['road',1],['participants',2],['person/12',2]]) {
 const tabs=page('#'+route);
 assert.equal(tabs.pageLinks.findIndex(link=>link.getAttribute('aria-current')==='page'),index);
 assert.equal(tabs.tabStyles.get('--active-tab'),index);
}
assert.equal(page('#missing').tabStyles.get('--tab-indicator-opacity'),0);
console.log('Navigation: continuous scroll, brief pauses, History API failures and viewport resize passed.');
console.log('Tab bar: direct page/profile links and missing-page selection passed.');

// Check real route curves at mobile, landscape, tablet and desktop proportions.
const roadSource = fs.readFileSync(path.join(__dirname, '..', 'site-source/road.html'), 'utf8');
for (const viewport of [360, 390, 430, 700, 768, 844, 1280]) {
 const width = viewport - (viewport <= 700 ? 66 : 122);
 const height = viewport <= 700 ? 340 : 360;
 const sx = width / 1000, sy = height / 400;
 const centers = {'.sketch-arkhyz i':[.32,.64],'.sketch-minvody i':[.78,.28],'.sketch-elbrus i':[.79,.74]};
 const paths = [...roadSource.matchAll(/<path[^>]*data-route-curve="([^"]+)" data-route-target="([^"]+)"([^>]*)>/g)].map(([,curve,target,attrs]) => ({
  dataset:{routeCurve:curve,routeTarget:target},
  hasAttribute:()=>attrs.includes('data-route-arrow'),
  setAttribute(key,value){this[key]=value;},
  nextElementSibling:{setAttribute(key,value){this[key]=value;}}
 }));
 assert.equal(paths.length,6,'All four routes and both pencil echoes are checked');
 const svg = {viewBox:{baseVal:{width:1000,height:400}},
  getBoundingClientRect:()=>({left:0,top:0,width,height}),querySelectorAll:()=>paths,
  parentElement:{querySelector(selector){
   const [x,y] = centers[selector];
   return {getBoundingClientRect:()=>({left:x*width-7.5,top:y*height-7.5,width:15,height:15})};
  }}};
 page('#road', svg);
 for (const path of paths) {
  const curve = path.d.match(/-?[\d.]+/g).map(Number);
  const [tx,ty] = curve.slice(-2);
  const [cx,cy] = centers[path.dataset.routeTarget];
  const gap = Math.hypot(tx*sx-cx*width,ty*sy-cy*height)-7.5;
  assert.ok(gap>=14-1e-6, `Route clears circle and halo at ${viewport}px`);
  if (!path.hasAttribute('data-route-arrow')) continue;
  const [lx,ly,ax,ay,rx,ry] = path.nextElementSibling.d.match(/-?[\d.]+/g).map(Number);
  assert.equal(ax,tx); assert.equal(ay,ty);
  const span = Math.hypot((lx-rx)*sx,(ly-ry)*sy);
  const depth = Math.hypot(((lx+rx)/2-tx)*sx,((ly+ry)/2-ty)*sy);
  assert.ok(Math.abs(span-10)<1e-8, `Arrow span at ${viewport}px`);
  assert.ok(Math.abs(depth-9)<1e-8, `Arrow depth at ${viewport}px`);
  for (const [x,y] of [[lx,ly],[rx,ry]]) {
   assert.ok(Math.hypot(x*sx-cx*width,y*sy-cy*height)>21.5, 'Arrow wings stay outside the gap');
  }
 }
 const firstRender = paths.map(p=>p.d);
 page('#road', svg);
 assert.deepEqual(paths.map(p=>p.d),firstRender,'Repeated layout does not progressively shorten curves');
}
console.log('Route arrows: constant size and circle clearance at 360, 390, 430, 700, 768, 844 and 1280px passed.');
