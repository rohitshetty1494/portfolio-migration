(function () {
  // window.__ptRevealed / window.__ptRevealedQueue / window.onPageTransitionRevealed
  // are set up by a tiny synchronous inline script right after <body> - before
  // this file (loaded with defer) runs, and before any other inline script
  // later in the page, so every script can safely call
  // onPageTransitionRevealed(fn) regardless of load order. This file just
  // flushes that queue once the curtain has actually cleared. Defensive
  // fallback here only in case that stub is somehow missing.
  if (typeof window.onPageTransitionRevealed !== 'function') {
    window.__ptRevealed = false;
    window.__ptRevealedQueue = [];
    window.onPageTransitionRevealed = function (fn) {
      if (window.__ptRevealed) fn();
      else window.__ptRevealedQueue.push(fn);
    };
  }
  function markRevealed() {
    window.__ptRevealed = true;
    var queue = window.__ptRevealedQueue || [];
    window.__ptRevealedQueue = [];
    queue.forEach(function (fn) {
      fn();
    });
    document.dispatchEvent(new CustomEvent('ptrevealed'));
  }

  var ENTER_MS = 550;
  // Pause after the curtain fully covers the screen, before actually leaving
  // the current page - this page is already loaded, so there's nothing to
  // wait on here; it's just a short beat so the cover doesn't feel abrupt.
  var LEAVE_HOLD_MS = 300;
  // On arrival, the curtain is a real loading screen, not a fixed-length
  // decoration: it waits for the new page's eager resources (window 'load' -
  // scripts, stylesheets, non-lazy images) to finish, bounded by a minimum
  // (so the mark always gets to wipe in, even on an instant cache hit) and a
  // maximum (so one slow or broken asset can't hold the page hostage).
  var MIN_HOLD_MS = 700;
  var MAX_HOLD_MS = 4000;
  var GIF_SRC = 'assets/custom/logo-wipe.gif';

  // GIFs don't expose a JS "restart playback" API - the standard trick is to
  // reassign src (cache-busted) so the browser treats it as a fresh resource
  // and starts decoding from frame 1 again.
  function restartGif(img) {
    if (!img) return;
    img.src = GIF_SRC + '?r=' + Date.now();
  }

  // ---- Nav logo hover: plays the actual source GIF (inverted to black via
  // CSS filter) instead of a hand-recreated animation ----
  Array.prototype.forEach.call(document.querySelectorAll('.nav-logo-flower-a'), function (a) {
    var gifImg = a.querySelector('.nav-logo-gif');
    if (!gifImg) return;
    a.addEventListener('mouseenter', function () {
      a.classList.add('is-sketching');
      restartGif(gifImg);
    });
    a.addEventListener('mouseleave', function () {
      a.classList.remove('is-sketching');
    });
    a.addEventListener('focus', function () {
      a.classList.add('is-sketching');
      restartGif(gifImg);
    });
    a.addEventListener('blur', function () {
      a.classList.remove('is-sketching');
    });
  });

  // ---- Page transition overlay ----
  var overlay = document.getElementById('page-transition-overlay');
  if (!overlay) {
    markRevealed();
    return;
  }

  var overlayGif = overlay.querySelector('.pt-flower-gif');
  var transitioning = false;

  var pendingTimers = [];
  function setTimer(fn, ms) {
    var id = window.setTimeout(fn, ms);
    pendingTimers.push(id);
    return id;
  }
  function clearPendingTimers() {
    pendingTimers.forEach(window.clearTimeout);
    pendingTimers.length = 0;
  }

  function reveal() {
    overlay.classList.remove('pt-cover-instant');
    overlay.classList.add('pt-exiting', 'pt-start');
    void overlay.offsetHeight;
    requestAnimationFrame(function () {
      overlay.classList.remove('pt-start');
    });
    setTimer(function () {
      overlay.classList.add('pt-done');
      markRevealed();
    }, 420);
  }

  // The initial pt-cover-instant state is already covering (baked into the
  // markup), so there is no flash of the raw page while the gif plays and
  // the page loads behind it.
  restartGif(overlayGif);

  var pageLoaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(function (resolve) {
        window.addEventListener('load', resolve, { once: true });
      });
  var minHold = new Promise(function (resolve) {
    setTimer(resolve, MIN_HOLD_MS);
  });
  var maxHold = new Promise(function (resolve) {
    setTimer(resolve, MAX_HOLD_MS);
  });

  Promise.race([Promise.all([pageLoaded, minHold]), maxHold]).then(reveal);

  function isInternalTransitionLink(link) {
    if (!link || !link.href) return false;
    if (link.target && link.target !== '' && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    var href = link.getAttribute('href') || '';
    if (href.indexOf('#') === 0) return false;
    if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('javascript:') === 0) return false;
    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (e) {
      return false;
    }
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
    return true;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!isInternalTransitionLink(link)) return;
    if (transitioning) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    transitioning = true;
    var dest = link.href;

    clearPendingTimers();
    overlay.classList.remove('pt-done', 'pt-exiting', 'pt-cover-instant');
    overlay.classList.add('pt-entering', 'pt-start');
    void overlay.offsetHeight;
    requestAnimationFrame(function () {
      overlay.classList.remove('pt-start');
    });

    setTimer(function () {
      restartGif(overlayGif);
    }, ENTER_MS);

    setTimer(function () {
      window.location.href = dest;
    }, ENTER_MS + LEAVE_HOLD_MS);
  });
})();
