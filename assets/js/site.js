/* Minimal, dependency-free. One behaviour:
   number displays with [data-count] count up when scrolled into view.
   Respects reduced-motion. No tracking, no frameworks. */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  function animateCount(el){
    var to = parseFloat(el.dataset.count);
    if(isNaN(to)) return;
    var from = parseFloat(el.dataset.from || 0);
    var suffix = el.dataset.suffix || '';
    var decimals = (String(to).split('.')[1] || '').length;
    if(reduce){ el.textContent = to + suffix; return; }
    var t0 = performance.now(), dur = 1100;
    (function step(t){
      var p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3);
      var v = from + (to-from)*e;
      el.textContent = (decimals ? v.toFixed(decimals) : Math.round(v)) + suffix;
      if(p<1) requestAnimationFrame(step);
    })(performance.now());
  }

  if(!('IntersectionObserver' in window)){
    document.querySelectorAll('[data-count]').forEach(animateCount);
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      animateCount(en.target);
      io.unobserve(en.target);
    });
  },{threshold:.4});

  document.querySelectorAll('[data-count]').forEach(function(el){ io.observe(el); });
})();

/* Floating-point non-associativity demo (Rust article only).
   Each line is the code AND its result: the value is really evaluated here, not
   typed as a string, so the panel is a genuine run in the reader's browser.
   No-op on any page without the demo. */
(function(){
  var demo = document.querySelector('[data-fp-demo]');
  if(!demo) return;

  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var btn = demo.querySelector('.fp-run');

  // [expression, live value, what it does] — the value is evaluated right here.
  var cases = [
    { out:'1', rows:[
      ['(0.1 + 0.2) + 0.3', (0.1 + 0.2) + 0.3, 'add the first pair, then the third'],
      ['0.1 + (0.2 + 0.3)', 0.1 + (0.2 + 0.3), 'add the last pair, then the first']
    ]},
    { out:'2', rows:[
      ['(1e20 + -1e20) + 1', (1e20 + -1e20) + 1, 'the huge pair cancels to 0, then + 1'],
      ['1e20 + (-1e20 + 1)', 1e20 + (-1e20 + 1), 'the + 1 vanishes into 1e20, then cancels']
    ]},
    { out:'3', verdict:'&rarr; the 32-bit type lost the <b>+ 1</b>; the 64-bit type kept it &middot; the extra mantissa bits are exactly the room it needed', rows:[
      ['Math.fround(16777216 + 1)', Math.fround(16777216 + 1), 'a 32-bit float: 24-bit mantissa, already full'],
      ['16777216 + 1', 16777216 + 1, 'a 64-bit float: 53-bit mantissa, room to spare']
    ]}
  ];

  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function spaces(n){ return n > 0 ? new Array(n + 1).join(' ') : ''; }
  function padEnd(s, w){ return s + spaces(w - s.length); }

  // Format `self`, marking the run of digits where it starts to diverge from `other`.
  function fmtVal(self, other){
    var k = 0, n = Math.min(self.length, other.length);
    while(k < n && self[k] === other[k]) k++;
    var head = esc(self.slice(0,k)), tail = self.slice(k);
    return head + (tail ? '<mark>' + esc(tail) + '</mark>' : '');
  }

  // Renders each case as an aligned monospace trace, the way a REPL prints it:
  // equal-width expressions line the `=` up; values are left-aligned so the
  // shared leading digits sit directly above one another.
  function render(c, live){
    var a = c.rows[0][1], b = c.rows[1][1], sA = String(a), sB = String(b);
    var selves = [sA, sB], others = [sB, sA];
    var exprW = Math.max(c.rows[0][0].length, c.rows[1][0].length);
    var valW = Math.max(sA.length, sB.length);
    var trace = '';
    c.rows.forEach(function(r, i){
      var rawLen = live ? selves[i].length : 1;
      var valInner = live ? fmtVal(selves[i], others[i]) : '<span class="pending">·</span>';
      trace += '<span class="expr">' + esc(padEnd(r[0], exprW)) + '</span>' +
               '<span class="eq">  =  </span>' +
               '<span class="val">' + valInner + '</span>' + spaces(valW - rawLen) +
               '  <span class="cmt">// ' + esc(r[2]) + '</span>' +
               (i === 0 ? '\n' : '');
    });
    var verdict;
    if(!live){
      verdict = '<div class="verdict pending">&rarr; press Run to compute</div>';
    } else if(c.verdict){
      verdict = '<div class="verdict">' + c.verdict + '</div>';
    } else if(a === b){
      verdict = '<div class="verdict">&rarr; identical, to the last bit</div>';
    } else {
      var d = a - b;
      var diff = Number.isInteger(d) ? String(Math.abs(d)) : Math.abs(d).toExponential(1);
      verdict = '<div class="verdict">&rarr; <b>not equal</b> &middot; reordering the same additions shifts the answer by ' + diff + '</div>';
    }
    return '<div class="trace">' + trace + '</div>' + verdict;
  }

  var built = false;
  function run(){
    if(window.console){
      console.log('%cFloating-point addition isn\'t associative, computed live:', 'color:#4FD6BC;font-weight:bold');
      cases.forEach(function(c){ c.rows.forEach(function(r){ console.log('  ' + r[0] + ' =', r[1]); }); });
    }
    // The values are deterministic, so build the live DOM once. Re-runs ("Run
    // again") only re-flash and re-log — no DOM swap, so the page can't jump.
    if(!built){
      cases.forEach(function(c){
        demo.querySelector('[data-fp-out="' + c.out + '"]').innerHTML = render(c, true);
      });
      btn.textContent = 'Run again ↻';
      built = true;
    }
    // Flash via the Web Animations API — no classList toggle and no forced
    // layout read, so clicking can't flush a pending font-swap reflow and
    // trigger a scroll-anchoring jump.
    if(!reduce && demo.querySelector('.fp-out .val').animate){
      demo.querySelectorAll('.fp-out .val').forEach(function(v){
        v.animate([{background:'rgba(79,214,188,.28)'},{background:'transparent'}],
                  {duration:650, easing:'ease-out'});
      });
    }
  }

  // Show the code immediately (values pending); fill them in on run.
  cases.forEach(function(c){
    demo.querySelector('[data-fp-out="' + c.out + '"]').innerHTML = render(c, false);
  });

  btn.addEventListener('click', run);

  // Auto-run once on scroll-in; the button re-runs on demand.
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ run(); io.disconnect(); } });
    },{threshold:.35});
    io.observe(demo);
  } else {
    run();
  }
})();
