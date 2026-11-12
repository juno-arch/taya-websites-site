/* Web Faery draft: drag the loose board shapes (.dec) anywhere on a page. Their wires follow and re-settle on drop. Needs wf-wires.js. */
(function () {
  var board = document.getElementById('board'); if (!board || !window.WFWires) return;
  var drag = null;
  board.addEventListener('pointerdown', function (e) {
    var el = e.target.closest && e.target.closest('.dec[data-wire]'); if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var r = el.getBoundingClientRect(), b = board.getBoundingClientRect();
    el.style.left = (r.left - b.left) + 'px'; el.style.top = (r.top - b.top) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
    el.style.zIndex = '1'; el.style.touchAction = 'none';
    drag = { el: el, dx: e.clientX - r.left, dy: e.clientY - r.top, l0: el.style.left, t0: el.style.top };
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    e.preventDefault();
  });
  board.addEventListener('pointermove', function (e) {
    if (!drag) return; var b = board.getBoundingClientRect(), el = drag.el;
    var x = Math.max(2, Math.min(b.width - el.offsetWidth - 2, e.clientX - b.left - drag.dx)), y = Math.max(2, Math.min(b.height - el.offsetHeight - 2, e.clientY - b.top - drag.dy));
    el.style.left = x + 'px'; el.style.top = y + 'px'; WFWires.update(board);
  });
  function up() { if (drag) { var el = drag.el, l0 = drag.l0, t0 = drag.t0, l1 = el.style.left, t1 = el.style.top; drag = null; WFWires.settle(board); if ((l0 !== l1 || t0 !== t1) && window.WFHistory) WFHistory.push({ undo: function () { el.style.left = l0; el.style.top = t0; }, redo: function () { el.style.left = l1; el.style.top = t1; } }); } }
  board.addEventListener('pointerup', up); board.addEventListener('pointercancel', up);
  var st = document.createElement('style'); st.textContent = '.dec[data-wire]{pointer-events:auto!important;cursor:grab;touch-action:none}.dec[data-wire]:active{cursor:grabbing}'; document.head.appendChild(st);
})();
