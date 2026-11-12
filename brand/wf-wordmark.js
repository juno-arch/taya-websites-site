/* Web Faery wordmark (draft): the letters' own wires form one circuit-snake underline with round nodes.
   The script draws each letter offscreen, finds where its ink touches the baseline, and runs a wire from exactly there. */
(function(){
  var INK='#1a1420';
  var st=document.createElement('style');
  st.textContent='.lt{display:inline-block}nav .brand span::after,.center h1::after,.lg::after{display:none!important}nav .brand .lt{margin-right:5px}nav .brand span{white-space:nowrap}.wmw{position:relative;display:inline-block;isolation:isolate}.wmsvg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:-1}';
  document.head.appendChild(st);
  function wrap(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(n){
      if(n.nodeType===3){var f=document.createDocumentFragment();n.textContent.split('').forEach(function(ch){if(ch===' '){f.appendChild(document.createTextNode(' '))}else{var s=document.createElement('span');s.className='lt';s.setAttribute('data-c',ch);s.textContent=ch;var p=document.createElement('i');p.className='pb';p.style.cssText='display:inline-block;width:0;height:0';s.appendChild(p);f.appendChild(s)}});n.parentNode.replaceChild(f,n)}
      else if(n.nodeType===1&&!n.classList.contains('lt'))wrap(n)})}
  var cv=document.createElement('canvas'),cx=cv.getContext('2d');
  function feet(letter){
    var cs=getComputedStyle(letter),ch=letter.getAttribute('data-c'),pad=8;
    cx.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    var m=cx.measureText(ch),w=Math.ceil(m.width)+pad*2,asc=Math.ceil(m.actualBoundingBoxAscent),desc=Math.ceil(m.actualBoundingBoxDescent),h=asc+desc+pad*2;
    cv.width=w;cv.height=h;cx.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;cx.fillStyle='#000';cx.textBaseline='alphabetic';cx.fillText(ch,pad-Math.min(0,m.actualBoundingBoxLeft)*0,pad+asc);
    var d=cx.getImageData(0,0,w,h).data,bottom=-1,y,x;
    for(y=h-1;y>=0&&bottom<0;y--)for(x=0;x<w;x++)if(d[(y*w+x)*4+3]>140){bottom=y;break}
    if(bottom<0)return null;
    var cols=[];for(x=0;x<w;x++){var on=false;for(y=bottom-2;y<=bottom;y++)if(d[(y*w+x)*4+3]>140)on=true;cols.push(on)}
    var runs=[],s=-1;for(x=0;x<=w;x++){if(cols[x]&&s<0)s=x;if(!cols[x]&&s>=0){runs.push([s,x-1]);s=-1}}
    var gl=1e9,gr=-1;for(x=0;x<w;x++)if(cols[x]){gl=Math.min(gl,x);gr=Math.max(gr,x)}
    var out=[];runs.forEach(function(r){var rw=r[1]-r[0]+1;if(rw<(gr-gl+1)*0.3)out.push((r[0]+r[1])/2);else{out.push(r[0]+rw*0.14);out.push(r[1]-rw*0.14)}});
    return {xs:out.map(function(v){return v-pad}),dy:bottom-(pad+asc)};   /* x from the glyph origin, y below the baseline */
  }
  function drawNav(el){
    var svg=el.querySelector('svg.wmsvg');if(svg)svg.remove();el.style.paddingBottom='0';
    var er=el.getBoundingClientRect(),L=Array.prototype.slice.call(el.querySelectorAll('.lt')),col='#c7b3f2',s='',sp=2.6,lw=1.2,r=1.5,k;
    for(k=0;k<L.length-1;k++){var a=L[k].getBoundingClientRect(),b=L[k+1].getBoundingClientRect(),x1=a.right-er.left-2,x2=b.left-er.left+2,ym=(a.top+a.bottom)/2-er.top,jog=(k%2?-1:1)*3,xm=(x1+x2)/2;
      [-1,0,1].forEach(function(o){var y1=ym+o*sp,pts=[[x1,y1],[xm-jog*0.5,y1],[xm+jog*0.5,y1+jog],[x2,y1+jog]];
        s+='<path d="M'+pts.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1)}).join(' L')+'" fill="none" stroke="'+col+'" stroke-width="'+lw+'" stroke-linejoin="round" stroke-linecap="round"/><circle cx="'+x1.toFixed(1)+'" cy="'+y1.toFixed(1)+'" r="'+r+'" fill="'+col+'"/><circle cx="'+x2.toFixed(1)+'" cy="'+(y1+jog).toFixed(1)+'" r="'+r+'" fill="'+col+'"/>'})}
    var ns='http://www.w3.org/2000/svg',sv=document.createElementNS(ns,'svg');sv.setAttribute('class','wmsvg');sv.setAttribute('width',er.width);sv.setAttribute('height',er.height);sv.setAttribute('aria-hidden','true');sv.innerHTML=s;el.appendChild(sv);
  }
  function draw(el){
    if(el.closest('nav')){drawNav(el);return}
    var svg=el.querySelector('svg.wmsvg');if(svg)svg.remove();el.style.paddingBottom='0';
    var er=el.getBoundingClientRect(),cs=getComputedStyle(el),fs=parseFloat(cs.fontSize),lw=Math.max(1.6,fs*0.05),gap=Math.max(3,fs*0.085),r=Math.max(1.8,fs*0.045);
    var col=el.closest('nav')?'#c7b3f2':INK;
    var pts=[],base=-1e9,moved=!!el.querySelector('.lt[data-tx]');
    Array.prototype.slice.call(el.querySelectorAll('.lt')).forEach(function(L){var f=feet(L);if(!f)return;var pr=L.querySelector('.pb').getBoundingClientRect(),lr=L.getBoundingClientRect(),by=pr.bottom+f.dy-er.top;base=Math.max(base,by);f.xs.forEach(function(v){pts.push({x:lr.left+v-er.left,by:by})})});
    if(!pts.length)return;
    if(moved&&el._base!==undefined)base=el._base;else el._base=base;
    pts.sort(function(a,b){return a.x-b.x});
    var sp=Math.max(3.2,fs*0.07),lw2=2.2,rr=sp*0.45,gap=sp*3.4,uy=base+fs*0.24+sp,NL=4,s='',offs=[-sp,0,sp];
    function chamfer(q,d0){var o=[q[0]],i;for(i=1;i<q.length-1;i++){var p=q[i],a1=q[i-1],n1=q[i+1],l1=Math.hypot(p[0]-a1[0],p[1]-a1[1]),l2=Math.hypot(n1[0]-p[0],n1[1]-p[1]),d=Math.min(d0,l1/2,l2/2);if(d<1.5){o.push(p);continue}o.push([p[0]-(p[0]-a1[0])/l1*d,p[1]-(p[1]-a1[1])/l1*d],[p[0]+(n1[0]-p[0])/l2*d,p[1]+(n1[1]-p[1])/l2*d])}o.push(q[q.length-1]);return o}
    function un(a,b){var dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [dx/l,dy/l]}
    function offs2(q,off){var sg=[],i,r=[];for(i=0;i<q.length-1;i++)sg.push(un(q[i],q[i+1]));
      q.forEach(function(P,i){if(i===0){var d=sg[0];r.push([P[0]-d[1]*off,P[1]+d[0]*off])}else if(i===q.length-1){var e=sg[sg.length-1];r.push([P[0]-e[1]*off,P[1]+e[0]*off])}else{var d1=sg[i-1],d2=sg[i],n1=[-d1[1],d1[0]],n2=[-d2[1],d2[0]],den=1+n1[0]*n2[0]+n1[1]*n2[1]||1;r.push([P[0]+off*(n1[0]+n2[0])/den,P[1]+off*(n1[1]+n2[1])/den])}});return r}
    function path(q){return '<path d="M'+q.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1)}).join(' L')+'" fill="none" stroke="'+col+'" stroke-width="'+lw2+'" stroke-linejoin="round" stroke-linecap="round"/>'}
    function C(x,y,r){s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+col+'"/>'}
    var xe=pts[pts.length-1].x+fs*0.34,n=pts.length,Lg=Math.min(NL,n);
    pts.forEach(function(p,i){var g=Math.min(Lg-1,Math.floor(i*Lg/n)),y=uy+(Lg-1-g)*gap,ch=chamfer([[p.x,p.by-fs*0.14],[p.x,y],[xe,y]],sp*2.6);offs.forEach(function(o){s+=path(offs2(ch,o))})});
    for(var g=0;g<Lg;g++){var y=uy+(Lg-1-g)*gap;offs.forEach(function(o){C(xe-o*0,y+o,rr)})}
    var ns='http://www.w3.org/2000/svg',sv=document.createElementNS(ns,'svg');sv.setAttribute('class','wmsvg');sv.setAttribute('width',er.width);sv.setAttribute('height',er.height);sv.setAttribute('aria-hidden','true');sv.innerHTML=s;el.appendChild(sv);
    el.style.paddingBottom=(uy+(Math.min(4,pts.length)-1)*gap+sp*2-er.height+fs*0.06)+'px';
  }
  function enableDrag(el){
    Array.prototype.slice.call(el.querySelectorAll('.lt')).forEach(function(L){
      L.style.touchAction='none';L.style.cursor='grab';
      L.addEventListener('pointerdown',function(e){
        e.stopPropagation();e.preventDefault();L.setPointerCapture(e.pointerId);L.style.cursor='grabbing';L.style.position='relative';L.style.zIndex=5;
        var sx=e.clientX,sy=e.clientY,ox=parseFloat(L.dataset.tx||0),oy=parseFloat(L.dataset.ty||0),raf=0;
        function mv(ev){L.dataset.tx=ox+ev.clientX-sx;L.dataset.ty=oy+ev.clientY-sy;L.style.transform='translate('+L.dataset.tx+'px,'+L.dataset.ty+'px)';if(!raf)raf=requestAnimationFrame(function(){raf=0;draw(el)})}
        function up(){L.removeEventListener('pointermove',mv);L.removeEventListener('pointerup',up);L.removeEventListener('pointercancel',up);L.style.cursor='grab'}
        L.addEventListener('pointermove',mv);L.addEventListener('pointerup',up);L.addEventListener('pointercancel',up)});
    });
    el.addEventListener('dblclick',function(){Array.prototype.slice.call(el.querySelectorAll('.lt')).forEach(function(L){delete L.dataset.tx;delete L.dataset.ty;L.style.transform=''});draw(el)});
  }
  function go(){
    var els=Array.prototype.slice.call(document.querySelectorAll('nav .brand span,.center h1,.lg:not(.s)'));
    els.forEach(function(el){if(!el.dataset.wrapped){el.dataset.wrapped='1';el.classList.add('wmw');wrap(el)}});
    var run=function(){els.forEach(draw)};els.forEach(function(el){if(el.matches('.center h1')&&!el.dataset.drag){el.dataset.drag='1';enableDrag(el)}});
    (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){run();setTimeout(run,300)});
    if(window.ResizeObserver)els.forEach(function(el){new ResizeObserver(function(){draw(el)}).observe(el.parentNode)});
    window.addEventListener('resize',run);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
