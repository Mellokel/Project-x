'use strict';
(() => {
 const header = document.querySelector('.site-header');
 const footer = document.querySelector('footer');
 const sections = document.querySelector('.header-sections');
 const config = JSON.parse(document.getElementById('screen-config').textContent);
 const cache = new Map([['trip', document.querySelector('main')]]);
 const templates = new Map([...document.querySelectorAll('template[data-route]')].map(t => [t.dataset.route, t]));
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 let current = 'trip';
 let frame = 0;
 let restoring = false;
 let scrollFrame = 0;
 const legacy = new Set(['route','stay','travel','budget','company']);
 function resolve(hash) {
  let path;
  try { path = decodeURIComponent(hash.replace(/^#/, '')); } catch { return {route:'not-found', anchor:''}; }
  if (!path) return {route:'trip', anchor:''};
  if (legacy.has(path)) return {route:'trip', anchor:path};
  const parts = path.split('/');
  const route = parts[0] === 'person' ? parts.splice(0,2).join('/') : parts.shift();
  return {route:config[route] ? route : 'not-found', anchor:parts.join('/')};
 }
 function saveScroll() {
  if (!restoring) history.replaceState({...history.state, y:scrollY}, '', location.href);
 }
 function render({restore = false, initial = false} = {}) {
  cancelAnimationFrame(frame);
  const {route, anchor} = resolve(location.hash);
  const changed = current !== route;
  const previous = cache.get(current);
  if (!cache.has(route)) cache.set(route, templates.get(route).content.firstElementChild.cloneNode(true));
  const main = cache.get(route);
  if (changed) {
   previous.remove();
   footer.before(main);
   current = route;
  }
  sections.innerHTML = config[route].nav;
  document.title = config[route].title;
  document.querySelectorAll('[data-page]').forEach(link => {
   if (link.dataset.page === config[route].page) link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('.section-nav a').forEach(link => {
   if (resolve(link.hash).anchor === anchor && anchor) link.setAttribute('aria-current','location');
  });
  updateHeaderHeight();
  restoring = true;
  frame = requestAnimationFrame(() => {
   const target = anchor ? [...main.querySelectorAll('[id]')].find(el => el.id === anchor) : null;
   const y = restore && Number.isFinite(history.state?.y) ? history.state.y : target ? target.getBoundingClientRect().top + scrollY - header.offsetHeight - 16 : 0;
   window.scrollTo({top:Math.max(0,y),behavior:'instant'});
   if (!initial) {
    const focusTarget = target || main.querySelector('h1') || main;
    focusTarget.setAttribute('tabindex','-1');
    focusTarget.focus({preventScroll:true});
   }
   main.getAnimations().forEach(animation => animation.cancel());
   if (changed && !initial && !reducedMotion.matches) {
    main.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});
   }
   restoring = false;
   saveScroll();
  });
 }
 function updateHeaderHeight() {
  document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
 }
 new ResizeObserver(updateHeaderHeight).observe(header);
 if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
 document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash || url.search !== location.search) return;
  event.preventDefault();
  saveScroll();
  if (url.hash !== location.hash) history.pushState({y:0}, '', url.hash);
  render();
 });
 window.addEventListener('scroll', () => {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(saveScroll);
 }, {passive:true});
 // pushState navigations render explicitly; browser Back/Forward fires hashchange.
 window.addEventListener('hashchange', () => render({restore:true}));
 window.addEventListener('pagehide',saveScroll);
 render({initial:true,restore:history.state?.y !== undefined});
})();
