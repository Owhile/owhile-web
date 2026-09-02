/* owhile — minimal behaviour.
   §10: motion is unhurried, physical, anticipatory. The only job here is to mark the
   moment the approaching light ARRIVES, so the station can settle. Everything else is
   CSS, because a page an agent fetches should be complete without running anything. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var station = document.querySelector(".station");
  if (!station) return;

  if (reduce) { station.dataset.arrived = "true"; return; }

  // Matches --dur-approach (2600ms) + its 900ms delay. Kept in JS only as a state
  // flag; nothing visual depends on this firing.
  window.setTimeout(function () {
    station.dataset.arrived = "true";
  }, 3500);
})();
