/* Hide header on scroll down (slide up), reveal on any scroll up. */
(function () {
  var CLASS = 'nav-scroll-hidden';
  var THRESHOLD = 6;   // ignore tiny scroll jitter (px)
  var TOP_ZONE = 10;   // always show when this close to the top (px)

  var style = document.createElement('style');
  style.textContent =
    '.' + CLASS + '{transform:translate3d(0,var(--nav-hide-y,-120%),0) !important;}' +
    '.nav-scroll-target{transition:transform .35s ease !important;will-change:transform;}' +
    '@media (prefers-reduced-motion:reduce){.nav-scroll-target{transition:none !important;}}';
  document.head.appendChild(style);

  var target = null;

  // Find the element that is really fixed/sticky (the wrapper may have 0 height).
  function findTarget() {
    var root = document.querySelector('header.header-main') || document.querySelector('#nav');
    if (!root) return null;
    var all = [root].concat([].slice.call(root.querySelectorAll('*'))); // outermost first
    var i, pos;
    for (i = 0; i < all.length; i++) {
      pos = getComputedStyle(all[i]).position;
      if (pos === 'fixed' || pos === 'sticky') return all[i];
    }
    for (i = 0; i < all.length; i++) {
      if (getComputedStyle(all[i]).position === 'absolute' && all[i].offsetHeight > 0) return all[i];
    }
    // Nothing positioned: make the header stick so it can slide away and come back.
    root.style.position = 'sticky';
    root.style.top = '0';
    root.style.zIndex = '1000';
    return root;
  }

  function prepare() {
    if (target) return true;
    target = findTarget();
    if (!target) return false;
    target.classList.add('nav-scroll-target');
    return true;
  }

  function setHideDistance() {
    var r = target.getBoundingClientRect();
    var h = r.height + Math.max(0, r.top) + 24;
    target.style.setProperty('--nav-hide-y', '-' + h + 'px');
  }

  var lastY = 0;
  var ticking = false;
  var scroller = null;

  function currentY() {
    if (scroller && scroller !== document && scroller !== document.documentElement && scroller !== document.body) {
      return scroller.scrollTop || 0;
    }
    return Math.max(0, window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
  }

  function update() {
    ticking = false;
    if (!prepare()) return;
    var y = currentY();
    var delta = y - lastY;
    if (y <= TOP_ZONE) {
      target.classList.remove(CLASS);
    } else if (Math.abs(delta) >= THRESHOLD) {
      if (delta > 0 && y > 40) { setHideDistance(); target.classList.add(CLASS); }
      else if (delta < 0) target.classList.remove(CLASS);
    } else {
      return; // small moves accumulate
    }
    lastY = y;
  }

  // Capture phase also catches scrolling inside inner containers (not only the window).
  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.nodeType === 1 && t !== document.documentElement && t !== document.body) {
      if (t.scrollHeight - t.clientHeight < 50) return; // ignore tiny widgets
      if (scroller !== t) { scroller = t; lastY = t.scrollTop || 0; }
    } else if (scroller) {
      scroller = null; lastY = currentY();
    }
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true, capture: true });

  document.addEventListener('focusin', function (e) {
    if (target && target.contains(e.target)) target.classList.remove(CLASS);
  });
})();
