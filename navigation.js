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
 let sectionTargets = [];
 let anchorSelection = null;
 let scrollSaveTimer = 0;
 let lastSaveTime = -Infinity;
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
  clearTimeout(scrollSaveTimer);
  scrollSaveTimer = 0;
  if (restoring || history.state?.y === scrollY) return;
  lastSaveTime = performance.now();
  try {
   history.replaceState({...history.state, y:scrollY}, '', location.href);
  } catch (error) {
   // Safari can reject frequent history writes. Scroll tracking must still work.
   if (error.name !== 'SecurityError' && error.name !== 'QuotaExceededError') throw error;
  }
 }
 function scheduleScrollSave() {
  clearTimeout(scrollSaveTimer);
  // Save after scrolling settles, at most once a second for scroll-driven writes.
  scrollSaveTimer = setTimeout(saveScroll, Math.max(300, 1000 - (performance.now() - lastSaveTime)));
 }
 function updateActiveSection() {
  if (restoring || !sectionTargets.length) return;
  const headerBottom = header.getBoundingClientRect().bottom;
  const viewport = window.visualViewport;
  const viewportBottom = viewport ? viewport.offsetTop + viewport.height : innerHeight;
  // Switch in the upper reading area, before the next heading reaches the bar.
  const threshold = headerBottom + Math.max(24, Math.min(160, (viewportBottom - headerBottom) / 4));
  let active = sectionTargets[0];
  for (const entry of sectionTargets) {
   if (entry.target.getBoundingClientRect().top <= threshold) active = entry;
  }
  // A short last section may never reach the top of the viewport.
  const atBottom = scrollY > 0 && Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2;
  if (atBottom) active = sectionTargets[sectionTargets.length - 1];
  // Keep an explicitly chosen section selected when scrolling is clamped
  // at the page end. Resume scroll tracking as soon as the position changes.
  if (anchorSelection && Math.abs(scrollY - anchorSelection.y) < 2) active = anchorSelection.entry;
  else anchorSelection = null;
  for (const {link} of sectionTargets) {
   if (link === active.link) {
    if (link.getAttribute('aria-current') === 'location') continue;
    link.setAttribute('aria-current', 'location');
    // Keep the selected item visible in the horizontal menu on mobile.
    const nav = link.parentElement;
    const bounds = nav.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.left < bounds.left || item.right > bounds.right) {
     nav.scrollTo({left:nav.scrollLeft + item.left - bounds.left - (bounds.width - item.width) / 2, behavior:'instant'});
    }
   } else link.removeAttribute('aria-current');
  }
 }
 function scheduleScrollUpdate() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
   scrollFrame = 0;
   updateActiveSection();
   scheduleScrollSave();
  });
 }
 function render({restore = false, initial = false} = {}) {
  clearTimeout(scrollSaveTimer);
  scrollSaveTimer = 0;
  cancelAnimationFrame(frame);
  const {route, anchor} = resolve(location.hash);
  anchorSelection = null;
  const changed = current !== route;
  const previous = cache.get(current);
  if (!cache.has(route)) cache.set(route, templates.get(route).content.firstElementChild.cloneNode(true));
  const main = cache.get(route);
  if (changed) {
   previous.remove();
   footer.before(main);
   current = route;
  }
  contentObserver.disconnect();
  contentObserver.observe(main);
  sections.innerHTML = config[route].nav;
  document.querySelector('.skip-link').href = `#${route}/main-content`;
  document.title = config[route].title;
  document.querySelectorAll('[data-page]').forEach(link => {
   if (link.dataset.page === config[route].page) link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
  });
  const tabBar = document.querySelector('.tab-bar');
  if (tabBar) {
   const tabIndex = [...tabBar.querySelectorAll('[data-page]')].findIndex(link => link.dataset.page === config[route].page);
   tabBar.style.setProperty('--active-tab', Math.max(0, tabIndex));
   tabBar.style.setProperty('--tab-indicator-opacity', tabIndex < 0 ? 0 : 1);
  }
  sectionTargets = [...sections.querySelectorAll('.section-nav a')].map(link => {
   const id = resolve(link.hash).anchor;
   return {link, target:[...main.querySelectorAll('[id]')].find(el => el.id === id)};
  }).filter(entry => entry.target);
  updateHeaderHeight();
  restoring = true;
  frame = requestAnimationFrame(() => {
   const target = main.id === anchor ? main : anchor ? [...main.querySelectorAll('[id]')].find(el => el.id === anchor) : null;
   const anchorY = target ? Math.max(0, target.getBoundingClientRect().top + scrollY - header.offsetHeight - 16) : 0;
   const y = restore && Number.isFinite(history.state?.y) ? history.state.y : anchorY;
   window.scrollTo({top:Math.max(0,y),behavior:'instant'});
   const entry = sectionTargets.find(entry => entry.target === target);
   const clampedAnchorY = Math.min(anchorY, Math.max(0, document.documentElement.scrollHeight - innerHeight));
   if (entry && Math.abs(scrollY - clampedAnchorY) < 2) anchorSelection = {entry, y:scrollY};
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
   updateActiveSection();
  });
 }
 function updateHeaderHeight() {
  document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
 }
 new ResizeObserver(() => {updateHeaderHeight(); scheduleScrollUpdate();}).observe(header);
 // Images and responsive layout can move section boundaries without scrolling.
 const contentObserver = new ResizeObserver(scheduleScrollUpdate);
 for (const main of cache.values()) contentObserver.observe(main);
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
 window.addEventListener('scroll', scheduleScrollUpdate, {passive:true});
 window.addEventListener('resize', scheduleScrollUpdate, {passive:true});
 // Safari's browser bars can resize the visible area without a layout resize.
 window.visualViewport?.addEventListener('resize', scheduleScrollUpdate, {passive:true});
 // pushState navigations render explicitly; browser Back/Forward fires hashchange.
 window.addEventListener('hashchange', () => render({restore:true}));
 window.addEventListener('pagehide',saveScroll);
 render({initial:true,restore:history.state?.y !== undefined});
})();
