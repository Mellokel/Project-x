'use strict';
const siteHeader = document.querySelector('.site-header');
if (siteHeader) {
 const updateHeaderHeight = () => document.documentElement.style.setProperty('--header-height', `${siteHeader.getBoundingClientRect().height}px`);
 updateHeaderHeight();
 new ResizeObserver(updateHeaderHeight).observe(siteHeader);
 const markSection = () => {
  document.querySelectorAll('.section-nav a').forEach(link => {
   if (link.hash === window.location.hash) link.setAttribute('aria-current', 'location');
   else link.removeAttribute('aria-current');
  });
 };
 window.addEventListener('hashchange', markSection);
 markSection();
}
