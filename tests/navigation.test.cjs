// Run the production controller with deterministic scrolling and Safari-like
// History API failures. Browser layout and touch behavior are checked separately.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'navigation.js'), 'utf8');

function page() {
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
 const main = {id:'main-content',querySelectorAll:()=>targets,getAnimations:()=>[]};
 const sections = {innerHTML:'',querySelectorAll:()=>links};
 const document = {
  documentElement:{scrollHeight:2600,style:{setProperty(){}}},
  querySelector(selector){return ({'.site-header':header,footer:{},'.header-sections':sections,main,'.skip-link':{}})[selector];},
  querySelectorAll:()=>[],
  getElementById:()=>({textContent:JSON.stringify({trip:{nav:'',title:'Trip',page:'trip'}})}),
  addEventListener(name,fn){events[name]=fn;}
 };
 const history = {state:null,scrollRestoration:'auto',replaceState(state){
  writes++;
  if (rejectHistory) throw Object.assign(new Error('History write rejected'), {name:rejectHistory});
  this.state=state;
 }};
 Object.assign(context, {document,history,location:{hash:'#trip',href:'https://example.test/index.html#trip'},
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
  history,events,viewportEvents,flush,advance,
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
console.log('Navigation: continuous scroll, brief pauses, History API failures and viewport resize passed.');
