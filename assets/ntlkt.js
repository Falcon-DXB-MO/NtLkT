(function(){
var chip=document.getElementById('pipInstall');
if(chip){var COPY='<rect x="9" y="9" width="11" height="11"></rect><path d="M5 15V5a1 1 0 0 1 1-1h10"></path>';
chip.addEventListener('click',function(){var txt=chip.querySelector('.txt').textContent;navigator.clipboard&&navigator.clipboard.writeText(txt).catch(function(){});chip.classList.add('copied');chip.querySelector('svg').innerHTML='<path d="M4 12l5 5L20 6"></path>';setTimeout(function(){chip.classList.remove('copied');chip.querySelector('svg').innerHTML=COPY;},1200);});}
function svgPt(svg,e){var r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;return{x:(e.clientX-r.left)/r.width*vb.width,y:(e.clientY-r.top)/r.height*vb.height};}
function dragOn(svg,target,fn){var on=false;function mv(e){fn(svgPt(svg,e));}
(target||svg).addEventListener('pointerdown',function(e){on=true;mv(e);e.preventDefault();});
svg.addEventListener('pointermove',function(e){if(on){mv(e);e.preventDefault();}});
window.addEventListener('pointerup',function(){on=false;});}

/* VME */
(function(){
var svg=document.getElementById('vmeSvg');if(!svg)return;
var pt=document.getElementById('vmePoint'),radial=document.getElementById('vmeRadial');
var sfNum=document.getElementById('sfNum'),axVal=document.getElementById('axVal'),dpVal=document.getElementById('dpVal'),badge=document.getElementById('sfBadge');
var CX=350,CY=220,SX=230/900,SY=140/16,RX=750,RY=14,ANGLE=-28;
function rot(x,y,a){var r=a*Math.PI/180,c=Math.cos(r),s=Math.sin(r),dx=x-CX,dy=y-CY;return{x:CX+dx*c-dy*s,y:CY+dx*s+dy*c};}
function upd(ax,dp){var sf=1/Math.sqrt(Math.pow(ax/RX,2)+Math.pow(dp/RY,2)),x=CX+ax*SX,y=CY-dp*SY;
pt.setAttribute('cx',x);pt.setAttribute('cy',y);radial.setAttribute('x2',x);radial.setAttribute('y2',y);
sfNum.textContent=sf.toFixed(2);axVal.textContent=Math.round(ax)+' kips';dpVal.textContent=dp.toFixed(1)+' ksi';
var ok=sf>=1.25;badge.classList.toggle('fail',!ok);badge.innerHTML='<span class="dot"></span>'+(ok?'PASS':'FAIL')+' · DF≥1.25 (SF '+sf.toFixed(2)+')';}
dragOn(svg,null,function(p){var l=rot(p.x,p.y,-ANGLE);var ax=Math.max(-882,Math.min(882,(l.x-CX)/SX)),dp=Math.max(-15.7,Math.min(15.7,(CY-l.y)/SY));upd(ax,dp);});
upd(320,6.2);
})();

/* Trajectory & anti-collision */
(function(){
var plan=document.getElementById('planSvg');if(!plan)return;
var vs=document.getElementById('vsSvg'),lad=document.getElementById('sfSvg');
var S={kop:2500,bur:2.5,inc:45,az:0},TD=11000,STEP=50;
var OFF={kop:1800,bur:2,inc:35,az:30,e0:25,n0:0,td:10000};
function traj(kop,bur,inc,az,e0,n0,td){var p=[],n=n0,e=e0,t=0,I=0,md=0,A=az*Math.PI/180;p.push({md:0,n:n,e:e,t:0});
while(md<td){var I2=I;if(md+STEP>kop){I2=Math.min(inc,I+bur/100*(md+STEP-Math.max(md,kop)));}var Ia=(I+I2)/2*Math.PI/180;
n+=STEP*Math.sin(Ia)*Math.cos(A);e+=STEP*Math.sin(Ia)*Math.sin(A);t+=STEP*Math.cos(Ia);I=I2;md+=STEP;p.push({md:md,n:n,e:e,t:t});}return p;}
function rad(md){return 1.5+0.0035*md;}
var off=traj(OFF.kop,OFF.bur,OFF.inc,OFF.az,OFF.e0,OFF.n0,OFF.td);
var PC=220,PS=180/8000;
function px(e){return PC+e*PS;}function py(n){return PC-n*PS;}
var VX0=60,VSC=340/10000,VY0=30,TSC=360/11000;
function vx(v){return VX0+(v+2000)*VSC;}function vy(t){return VY0+t*TSC;}
var LX0=70,LXS=550/TD,LY0=210,LYS=190/4;
function lx(md){return LX0+md*LXS;}function ly(sf){return LY0-Math.min(4,sf)*LYS;}
function path(pts,fx,fy){return pts.map(function(p,i){return(i?'L':'M')+fx(p).toFixed(1)+','+fy(p).toFixed(1);}).join('');}
var $=function(id){return document.getElementById(id);};
function fmt(n){return Math.round(n).toLocaleString();}
function draw(){
var s=traj(S.kop,S.bur,S.inc,S.az,0,0,TD),A=S.az*Math.PI/180,ca=Math.cos(A),sa=Math.sin(A);
$('planSubj').setAttribute('d',path(s,function(p){return px(p.e);},function(p){return py(p.n);}));
var end=s[s.length-1];$('planHandle').setAttribute('cx',px(end.e));$('planHandle').setAttribute('cy',py(end.n));
function V(p){return p.n*ca+p.e*sa;}
$('vsSubj').setAttribute('d',path(s,function(p){return vx(V(p));},function(p){return vy(p.t);}));
$('vsOff').setAttribute('d',path(off,function(p){return vx(V(p));},function(p){return vy(p.t);}));
$('vsHandle').setAttribute('cy',vy(S.kop));$('vsKopLbl').setAttribute('y',vy(S.kop)+4);$('vsKopLbl').textContent='KOP '+fmt(S.kop)+' ft';
var sfs=[],best={sf:1e9,md:0,d:0};
for(var i=0;i<s.length;i++){var p=s[i],dm=1e9,om=0;for(var j=0;j<off.length;j++){var q=off[j],d=Math.hypot(p.n-q.n,p.e-q.e,p.t-q.t);if(d<dm){dm=d;om=q.md;}}
var sf=dm/(rad(p.md)+rad(om));if(p.md>=300){sfs.push({md:p.md,sf:sf});if(sf<best.sf)best={sf:sf,md:p.md,d:dm};}}
$('sfLine').setAttribute('d',path(sfs,function(p){return lx(p.md);},function(p){return ly(p.sf);}));
$('sfMin').setAttribute('cx',lx(best.md));$('sfMin').setAttribute('cy',ly(best.sf));
$('tSf').textContent=best.sf.toFixed(2);$('tMd').textContent=fmt(best.md)+' ft';$('tCtc').textContent=fmt(best.d)+' ft';
$('tDisp').textContent=fmt(Math.hypot(end.n,end.e))+' ft';
var b=$('tBadge');b.classList.remove('fail','warn');
if(best.sf>=1.5)b.innerHTML='<span class="dot"></span>CLEAR · SF ≥ 1.50';
else if(best.sf>=1.0){b.classList.add('warn');b.innerHTML='<span class="dot"></span>MINOR RISK · 1.00 ≤ SF &lt; 1.50';}
else{b.classList.add('fail');b.innerHTML='<span class="dot"></span>MAJOR RISK · SF &lt; 1.00';}
$('kopR').value=S.kop;$('kopO').textContent=fmt(S.kop)+' ft';
$('azR').value=Math.round(S.az);$('azO').textContent=String(Math.round(S.az)).padStart(3,'0')+'°';
$('burR').value=S.bur;$('burO').textContent=S.bur.toFixed(1)+'°/100 ft';
$('incR').value=S.inc;$('incO').textContent=S.inc+'°';
}
$('planOff').setAttribute('d',path(off,function(p){return px(p.e);},function(p){return py(p.n);}));
dragOn(plan,null,function(p){var e=(p.x-PC)/PS,n=(PC-p.y)/PS;if(Math.hypot(e,n)<200)return;S.az=(Math.atan2(e,n)*180/Math.PI+360)%360;draw();});
dragOn(vs,$('vsHandle'),function(p){S.kop=Math.max(500,Math.min(5500,Math.round(((p.y-VY0)/TSC)/50)*50));draw();});
$('kopR').addEventListener('input',function(){S.kop=+this.value;draw();});
$('azR').addEventListener('input',function(){S.az=+this.value;draw();});
$('burR').addEventListener('input',function(){S.bur=+this.value;draw();});
$('incR').addEventListener('input',function(){S.inc=+this.value;draw();});
draw();
})();
})();
