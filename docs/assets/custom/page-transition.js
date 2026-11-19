(function () {
  var overlay = document.getElementById('page-transition-overlay');
  if (!overlay) return;

  var ENTER_MS = 550;
  var HOLD_MS = 1300;
  var SKETCH_DRAW_MS = 650;
  var SKETCH_STAGGER_MS = 120;
  var SKETCH_DASH = '2.4 5';
  var transitioning = false;

  var sketchPaths = Array.prototype.slice.call(overlay.querySelectorAll('.pt-flower path'));

  // Every pending timer from the current cover/reveal (or entering) sequence lives
  // here, so a mid-sequence navigation click can cancel it cleanly instead of racing
  // with it (e.g. a click right before the page's own initial reveal() would
  // otherwise fire both pt-entering and pt-exiting at once).
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

  function playSketch() {
    sketchPaths.forEach(function (path, i) {
      var length;
      try {
        length = path.getTotalLength();
      } catch (e) {
        return;
      }
      path.style.transition = 'none';
      path.style.strokeDasharray = length + ' ' + length;
      path.style.strokeDashoffset = String(length);
      void path.getBoundingClientRect();
      setTimer(function () {
        path.style.transition = 'stroke-dashoffset ' + SKETCH_DRAW_MS + 'ms cubic-bezier(0.65,0,0.35,1)';
        path.style.strokeDashoffset = '0';
      }, i * SKETCH_STAGGER_MS);
      setTimer(function () {
        path.style.transition = 'none';
        path.style.strokeDasharray = SKETCH_DASH;
        path.style.strokeDashoffset = '0';
      }, i * SKETCH_STAGGER_MS + SKETCH_DRAW_MS);
    });
  }

  function resetSketch() {
    sketchPaths.forEach(function (path) {
      path.style.transition = 'none';
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
    });
  }

  function reveal() {
    overlay.classList.remove('pt-cover-instant');
    overlay.classList.add('pt-exiting', 'pt-start');
    // force reflow so the browser registers the start state before we animate away from it
    void overlay.offsetHeight;
    requestAnimationFrame(function () {
      overlay.classList.remove('pt-start');
    });
    setTimer(function () {
      overlay.classList.add('pt-done');
      resetSketch();
    }, 420);
  }

  // Let the sketch draw itself in, then clear the overlay. The initial
  // pt-cover-instant state is already covering (baked into the markup), so
  // there is no flash of the raw page while this plays out.
  playSketch();
  setTimer(reveal, HOLD_MS);

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
    resetSketch();
    overlay.classList.remove('pt-done', 'pt-exiting', 'pt-cover-instant');
    overlay.classList.add('pt-entering', 'pt-start');
    void overlay.offsetHeight;
    requestAnimationFrame(function () {
      overlay.classList.remove('pt-start');
    });

    setTimer(playSketch, ENTER_MS);

    setTimer(function () {
      window.location.href = dest;
    }, ENTER_MS + HOLD_MS);
  });
})();
