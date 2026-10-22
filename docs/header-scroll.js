/* Hide header on scroll down (slide up), reveal on any scroll up. */
(function () {
  var CANDIDATES = ['header.header-main', '#nav', '.navigation', '.nav-wrapper'];
  var CLASS = 'nav-scroll-hidden';
  var THRESHOLD = 6;      // ignore tiny scroll jitter (px)
  var TOP_ZONE = 10;      // always show when this close to top (px)

  var style = document.createElement('style');
  style.textContent =
    '.' + CLASS + '{transform:translate3d(0,-110%,0) !important;}' +
    'header.header-main,#nav,.navigation,.nav-wrapper{transition:transform .35s ease !important;will-change:transform;}' +
    '@media (prefers-reduced-motion:reduce){header.header-main,#nav,.navigation,.nav-wrapper{transition:none !important;}}';
  document.head.appendChild(style);

  var target = null;
  function findTarget() {
    for (var i = 0; i < CANDIDATES.length; i++) {
      var el = document.querySelector(CANDIDATES[i]);
      if (!el) continue;
      var pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'sticky' || pos === 'absolute') return el;
    }
    return document.querySelector('header.header-main');
  }

  var lastY = window.pageYOffset || 0;
  var ticking = false;

  function update() {
    ticking = false;
    if (!target) target = findTarget();
    if (!target) return;
    var y = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);
    var delta = y - lastY;
    if (y <= TOP_ZONE) {
      target.classList.remove(CLASS);
    } else if (Math.abs(delta) >= THRESHOLD) {
      if (delta > 0 && y > target.offsetHeight) target.classList.add(CLASS);
      else if (delta < 0) target.classList.remove(CLASS);
    } else {
      return; // keep lastY so small moves accumulate
    }
    lastY = y;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  // Keep header visible if keyboard focus lands inside it
  document.addEventListener('focusin', function (e) {
    if (target && target.contains(e.target)) target.classList.remove(CLASS);
  });
})();
