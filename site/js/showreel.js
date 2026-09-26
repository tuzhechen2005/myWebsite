/* Showreel (projects.html #showreel): a poster with a big play button over a native <video>. The video is
   preload="none", so nothing downloads until someone presses play. Chapter chips seek the reel to each project. */
(function () {
  var root = document.querySelector('[data-showreel]');
  if (!root) return;
  var video = root.querySelector('video');
  var play = root.querySelector('.showreel__play');
  var chips = document.querySelectorAll('[data-showreel-seek]');

  function start(at) {
    root.classList.add('is-playing');
    video.setAttribute('controls', '');
    if (typeof at === 'number') {
      var seek = function () { try { video.currentTime = at; } catch (e) {} };
      if (video.readyState >= 1) seek(); else video.addEventListener('loadedmetadata', seek, { once: true });
    }
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  if (play) play.addEventListener('click', function () { start(); });
  video.addEventListener('play', function () { root.classList.add('is-playing'); video.setAttribute('controls', ''); });

  // highlight the chapter that is playing
  function mark() {
    var t = video.currentTime, active = null;
    chips.forEach(function (c) { if (t + 0.05 >= parseFloat(c.getAttribute('data-showreel-seek'))) active = c; });
    chips.forEach(function (c) { c.classList.toggle('is-active', c === active && root.classList.contains('is-playing')); });
  }
  video.addEventListener('timeupdate', mark);

  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      start(parseFloat(c.getAttribute('data-showreel-seek')));
      var r = root.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        var y = window.scrollY + r.top - Math.max(16, (window.innerHeight - r.height) / 2);
        if (window.__lenis) window.__lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
})();
