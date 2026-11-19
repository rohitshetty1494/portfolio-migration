(function () {
  var overlay = document.getElementById('page-transition-overlay');
  if (!overlay) return;

  var ENTER_MS = 550;
  var HOLD_MS = 450;
  var transitioning = false;

  function reveal() {
    overlay.classList.remove('pt-cover-instant');
    overlay.classList.add('pt-exiting', 'pt-start');
    // force reflow so the browser registers the start state before we animate away from it
    void overlay.offsetHeight;
    requestAnimationFrame(function () {
      overlay.classList.remove('pt-start');
    });
    window.setTimeout(function () {
      overlay.classList.add('pt-done');
    }, 420);
  }

  // Let the page settle a beat before clearing, so the overlay never flash-reveals
  // on an instant cache load.
  window.setTimeout(reveal, 120);

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

    overlay.classList.remove('pt-done', 'pt-exiting', 'pt-cover-instant');
    overlay.classList.add('pt-entering', 'pt-start');
    void overlay.offsetHeight;
    requestAnimationFrame(function () {
      overlay.classList.remove('pt-start');
    });

    window.setTimeout(function () {
      window.location.href = dest;
    }, ENTER_MS + HOLD_MS);
  });
})();
