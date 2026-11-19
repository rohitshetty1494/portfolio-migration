(function () {
  var ENTER_MS = 550;
  var HOLD_MS = 1500;
  var SKETCH_DRAW_MS = 700;
  // Petal markup order is [top-right, bottom-right, top-left, bottom-left].
  // Matched against the reference GIF frame by frame: top-right and
  // bottom-left wipe in together first, top-left starts partway through,
  // bottom-right starts last.
  var SKETCH_DELAYS = [0, 750, 450, 0];

  // Shared "wipe in" player: each <path class="pt-reveal"> sits inside an SVG
  // <mask> and is stroked thick/solid, tracing that petal's own outline; the
  // matching <path class="pt-sketch"> it masks is the actual solid white fill
  // (styled once in CSS, never touched here). Animating the reveal path's
  // stroke-dashoffset from its own length to 0 grows the mask along the path;
  // because the reveal stroke is thick enough to span the petal's interior,
  // the solid fill appears to flood in behind the traced outline.
  function createSketchPlayer(root) {
    var reveals = Array.prototype.slice.call(root.querySelectorAll('.pt-reveal'));
    var timers = [];

    function clearTimers() {
      timers.forEach(window.clearTimeout);
      timers.length = 0;
    }

    function play() {
      clearTimers();
      reveals.forEach(function (path, i) {
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
        var delay = SKETCH_DELAYS[i] || 0;
        var id = window.setTimeout(function () {
          path.style.transition = 'stroke-dashoffset ' + SKETCH_DRAW_MS + 'ms cubic-bezier(0.45,0,0.2,1)';
          path.style.strokeDashoffset = '0';
        }, delay);
        timers.push(id);
      });
    }

    function reset() {
      clearTimers();
      reveals.forEach(function (path) {
        path.style.transition = 'none';
        path.style.strokeDasharray = '';
        path.style.strokeDashoffset = '';
      });
    }

    return { play: play, reset: reset };
  }

  // ---- Nav logo hover: plays the identical sketch animation on hover ----
  Array.prototype.forEach.call(document.querySelectorAll('.nav-logo-flower-a'), function (a) {
    var sketchRoot = a.querySelector('.nav-logo-sketch');
    if (!sketchRoot) return;
    var player = createSketchPlayer(sketchRoot);
    a.addEventListener('mouseenter', function () {
      a.classList.add('is-sketching');
      player.play();
    });
    a.addEventListener('mouseleave', function () {
      a.classList.remove('is-sketching');
      player.reset();
    });
    a.addEventListener('focus', function () {
      a.classList.add('is-sketching');
      player.play();
    });
    a.addEventListener('blur', function () {
      a.classList.remove('is-sketching');
      player.reset();
    });
  });

  // ---- Page transition overlay ----
  var overlay = document.getElementById('page-transition-overlay');
  if (!overlay) return;

  var overlaySketch = createSketchPlayer(overlay);
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
      overlaySketch.reset();
    }, 420);
  }

  // The initial pt-cover-instant state is already covering (baked into the
  // markup), so there is no flash of the raw page while the sketch draws in.
  overlaySketch.play();
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
    overlaySketch.reset();
    overlay.classList.remove('pt-done', 'pt-exiting', 'pt-cover-instant');
    overlay.classList.add('pt-entering', 'pt-start');
    void overlay.offsetHeight;
    requestAnimationFrame(function () {
      overlay.classList.remove('pt-start');
    });

    setTimer(overlaySketch.play, ENTER_MS);

    setTimer(function () {
      window.location.href = dest;
    }, ENTER_MS + HOLD_MS);
  });
})();
