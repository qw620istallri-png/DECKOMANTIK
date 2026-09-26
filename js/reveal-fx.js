/* DeckomantiK — révélations : une seule toile de particules, un décor par rareté.
   Les particules sont dessinées sur une toile commune (sprites pré-rendus, fusion additive), jamais en DOM ; les lumières
   posées sur la carte (balayages, anneaux, soleil, bord doré, horizon du Néant) sont dans styles/reveal-fx.css et
   n'animent que l'opacité et la transformation. Budget par rareté, divisé par deux au doigt, réduit si les images ralentissent.
   API : RevealFx.play(carte, rareté, {impact, lite}) au retournement, RevealFx.charge(carte, rareté) pendant l'appui,
   RevealFx.clear() ; RevealFx.impactOf(rareté) donne l'instant de l'impact (500 ms, Galaxie 2080, Néant 2280). */
(function(){
'use strict';
const TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a),pick=list=>list[Math.random()*list.length|0];
const matches=query=>Boolean(window.matchMedia?.(query).matches);
const IMPACT={galaxy:2080,void:2280};
const impactOf=rarity=>IMPACT[rarity]||500;
const reduced=()=>matches('(prefers-reduced-motion: reduce)');
const coarse=()=>matches('(pointer: coarse)');
let canvas=null,ctx=null,host=null,dpr=1,vw=0,vh=0,raf=0,last=0,slow=0,quality=1;
const effects=[],parts=[],sprites=new Map();

// ---------- sprites : dessinés une fois par couleur, puis simplement copiés ----------
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function sprite(kind,color){
  const key=kind+color;let made=sprites.get(key);if(made)return made;
  const size=kind==='flare'?160:64,c=document.createElement('canvas');c.width=size;c.height=kind==='streak'?16:size;const g=c.getContext('2d'),h=size/2;
  if(kind==='glow'||kind==='flare'){const r=g.createRadialGradient(h,h,0,h,h,h);r.addColorStop(0,'#fff');r.addColorStop(kind==='flare'?.06:.16,rgba(color,1));r.addColorStop(.42,rgba(color,.32));r.addColorStop(1,rgba(color,0));g.fillStyle=r;g.fillRect(0,0,size,size)}
  else if(kind==='star'){const r=g.createRadialGradient(h,h,0,h,h,h*.5);r.addColorStop(0,rgba(color,.55));r.addColorStop(1,rgba(color,0));g.fillStyle=r;g.fillRect(0,0,size,size);g.fillStyle=rgba(color,1);g.beginPath();g.moveTo(h,2);g.quadraticCurveTo(h+5,h-5,size-2,h);g.quadraticCurveTo(h+5,h+5,h,size-2);g.quadraticCurveTo(h-5,h+5,2,h);g.quadraticCurveTo(h-5,h-5,h,2);g.fill();const core=g.createRadialGradient(h,h,0,h,h,10);core.addColorStop(0,'#fff');core.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=core;g.fillRect(h-11,h-11,22,22)}
  else if(kind==='shard'){const lg=g.createLinearGradient(0,0,size,size);lg.addColorStop(0,'#fff');lg.addColorStop(.45,rgba(color,1));lg.addColorStop(1,rgba(color,.25));g.fillStyle=lg;g.beginPath();g.moveTo(h,4);g.lineTo(h+11,h+6);g.lineTo(h-2,size-4);g.lineTo(h-12,h-4);g.closePath();g.fill()}
  else if(kind==='flake'){const lg=g.createLinearGradient(h-14,0,h+14,0);lg.addColorStop(0,rgba(color,.5));lg.addColorStop(.5,'#fff');lg.addColorStop(1,rgba(color,.8));g.fillStyle=lg;g.beginPath();g.moveTo(h,3);g.lineTo(h+15,h);g.lineTo(h,size-3);g.lineTo(h-15,h);g.closePath();g.fill()}
  else if(kind==='streak'){const lg=g.createLinearGradient(0,0,size,0);lg.addColorStop(0,rgba(color,0));lg.addColorStop(.6,rgba(color,.7));lg.addColorStop(.9,'#fff');lg.addColorStop(1,rgba(color,0));g.fillStyle=lg;g.beginPath();g.ellipse(h,8,h,4.5,0,0,TAU);g.fill()}
  else if(kind==='dot'){g.fillStyle=rgba(color,1);g.beginPath();g.arc(h,h,h-2,0,TAU);g.fill()}
  else if(kind==='grain'){const r=g.createRadialGradient(h,h,0,h,h,h);r.addColorStop(0,rgba(color,1));r.addColorStop(.55,rgba(color,.9));r.addColorStop(1,rgba(color,0));g.fillStyle=r;g.fillRect(0,0,size,size)}
  made={img:c,w:c.width,h:c.height};sprites.set(key,made);return made;
}

// ---------- toile ----------
function mount(target){
  if(!canvas){canvas=document.createElement('canvas');canvas.className='rfx-canvas';canvas.setAttribute('aria-hidden','true');ctx=canvas.getContext('2d')}
  if(host!==target){parts.length=0;host=target;target.append(canvas)}else if(canvas.parentNode!==target)target.append(canvas);
  canvas.hidden=false;resize();
}
function resize(){if(!canvas)return;dpr=Math.min(window.devicePixelRatio||1,coarse()?1.5:2);vw=innerWidth;vh=innerHeight;const w=Math.round(vw*dpr),h=Math.round(vh*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}}
window.addEventListener('resize',()=>{if(raf)resize()});
function budget(count){return Math.max(1,Math.round(count*quality*(coarse()?.5:1)))}
function hostFor(el){return el.closest('.soul-craft-overlay')||el.closest('dialog')||document.body}
function alive(fx){const dialog=fx.el.closest('dialog');return fx.el.isConnected&&(!dialog||dialog.open)}

// ---------- effets ----------
function makeEffect(el,rarity,options={}){
  const r=el.getBoundingClientRect(),fx={el,rarity,t:-(options.delay||0),end:0,tasks:[],emitters:[],cx:r.left+r.width/2,cy:r.top+r.height/2,w:r.width,h:r.height,u:Math.max(.3,r.width/400),seen:0,dead:false,charge:false,layers:[]};
  fx.at=(ms,fn)=>{fx.tasks.push({at:ms,fn});fx.end=Math.max(fx.end,ms)};
  fx.emit=(from,to,rate,fn)=>{fx.emitters.push({from,to,rate,fn,acc:0});fx.end=Math.max(fx.end,to)};
  fx.add=p=>{if(parts.length>=(coarse()?320:700))return;p.fx=fx;p.age=-(p.delay||0);p.x??=fx.cx;p.y??=fx.cy;p.vx??=0;p.vy??=0;p.g??=0;p.drag??=1;p.rot??=0;p.vr??=0;p.fin??=.1;p.fout??=.45;p.s1??=p.s0;p.a??=1;p.sx??=1;parts.push(p)};
  fx.refresh=()=>{if(!el.isConnected)return;const b=el.getBoundingClientRect();if(!b.width)return;fx.cx=b.left+b.width/2;fx.cy=b.top+b.height/2;fx.w=b.width;fx.h=b.height;fx.u=Math.max(.3,b.width/400)};
  return fx;
}
// a point on the card's outline, and the outward direction there
function edgePoint(fx,spread=1){const side=Math.random()*(fx.w+fx.h)*2;let x,y;if(side<fx.w){x=side-fx.w/2;y=-fx.h/2}else if(side<fx.w+fx.h){x=fx.w/2;y=side-fx.w-fx.h/2}else if(side<fx.w*2+fx.h){x=side-fx.w-fx.h-fx.w/2;y=fx.h/2}else{x=-fx.w/2;y=side-fx.w*2-fx.h-fx.h/2}return{x:fx.cx+x*spread,y:fx.cy+y*spread,a:Math.atan2(y/fx.h,x/fx.w)}}
function radial(fx,{count,kind,colors,speed,size,life,drag=.9,g=0,spin=0,spread=.3,add=true,align=false,stretch=0,tw=0,fin=.08,fout=.5,from='center',delay=0,misreg=false,behind=false}){
  for(let i=0;i<count;i++){
    const angle=Math.random()*TAU,sp=rand(...speed)*fx.u,start=from==='edge'?edgePoint(fx,1):{x:fx.cx+Math.cos(angle)*fx.w*spread*Math.random(),y:fx.cy+Math.sin(angle)*fx.h*spread*Math.random(),a:angle},dir=from==='edge'?start.a+rand(-.5,.5):angle;
    fx.add({kind,color:pick(colors),x:start.x,y:start.y,vx:Math.cos(dir)*sp,vy:Math.sin(dir)*sp,drag,g:g*fx.u,life:rand(...life),s0:rand(...size)*fx.u,s1:rand(.2,.5)*rand(...size)*fx.u,rot:dir,vr:spin?rand(-spin,spin):0,add,align,stretch,tw,ph:Math.random()*TAU,fin,fout,delay:typeof delay==='number'?delay*Math.random():rand(...delay),misreg,behind})
  }
}
// From behind the card, a spray from its centre outwards, hidden by the card until it clears the edges; the rarer, the denser (as in the first version)
const BACK_SPRAY={common:[8,['#E8E4DA','#B9BCC4']],foil:[16,['#55DDFF','#FF72DD','#FFE36B','#7DFFB2']],silver:[22,['#FFFFFF','#D9ECFF','#B8C7D9']],gold:[30,['#FFF3B0','#FFD25C','#FFB13B']],desert:[36,['#F5BD63','#FFF0B4','#FF9E4A']],galaxy:[44,['#AA73FF','#48E8FF','#FFFFFF','#FF8FE0']],void:[50,['#72EFFF','#A871FF','#FFFFFF']]};
function backSpray(fx,I,base,glitter){
  const [count,colors]=BACK_SPRAY[base]||BACK_SPRAY.common,n=budget(count+(glitter?12:0)),far=base==='galaxy'||base==='void'?1.35:1;
  fx.at(I,()=>{
    radial(fx,{count:Math.ceil(n*.55),kind:'streak',colors,speed:[950*far,1750*far],size:[34,52],life:[900,1400],drag:.955,spread:.08,align:true,stretch:.0011,fin:.02,fout:.45,delay:[0,140],behind:true});
    radial(fx,{count:Math.floor(n*.45),kind:'glow',colors,speed:[820*far,1500*far],size:[12,22],life:[1100,1700],drag:.96,spread:.08,fin:.02,fout:.55,tw:base==='common'?0:5,delay:[0,220],behind:true});
  });
}
// drawn in from far around the card, spiralling, faster as they arrive
function suck(fx,{kind='streak',colors,reach=[1,1.6],size=[16,26],life=[800,1100],twist=1.4,add=true,misreg=false}){
  const a0=Math.random()*TAU,r0=rand(...reach)*Math.max(fx.w,fx.h)*.75;
  fx.add({mode:'suck',kind,color:pick(colors),cx:fx.cx,cy:fx.cy,a0,r0,twist:(Math.random()<.5?-1:1)*twist*rand(.6,1),life:rand(...life),s0:rand(...size)*fx.u,s1:rand(...size)*fx.u*.5,add,align:kind==='streak',fin:.2,fout:.18,misreg})
}
function orbit(fx,{count,rx,ry,tilt,spin,colors,size,life,delay=0,eject=0}){
  for(let i=0;i<count;i++)fx.add({mode:'orbit',kind:'star',color:pick(colors),cx:fx.cx,cy:fx.cy,ang:i/count*TAU+rand(-.12,.12),rx:rx*fx.w,ry:ry*fx.w,tilt,spin:spin*rand(.9,1.1),life:life+eject,eject:eject?life-60+rand(-90,90):0,s0:rand(...size)*fx.u,s1:rand(...size)*fx.u*.8,add:true,tw:rand(5,9),ph:Math.random()*TAU,fin:.14,fout:eject?.07:.3,delay:delay+i*18})
}
// an orbiting star let go: flung along its path to the edge of the screen, stretched by its speed
function fling(p){
  const depth=.5+.5*(p.depth+1)/2,dx=p.x-p.cx,dy=p.y-p.cy,a=Math.atan2(dy,dx)+Math.sign(p.spin)*.45,ux=Math.cos(a),uy=Math.sin(a);
  const toEdge=Math.min(ux>0?(vw-p.x)/ux:ux<0?-p.x/ux:1e9,uy>0?(vh-p.y)/uy:uy<0?-p.y/uy:1e9),sp=Math.max(900,(toEdge+60)/.42)*rand(1,1.12);
  p.mode=null;p.a*=depth;p.s0*=.8+.25*(depth+1)/2;p.s1=p.s0*.9;p.vx=ux*sp;p.vy=uy*sp;p.drag=1;p.g=0;p.align=true;p.stretch=.00055;p.tw=0;
}

// ---------- décors par rareté (ms depuis le retournement ; I = impact) ----------
const PRESETS={
  common(fx,I){
    fx.at(I-40,()=>radial(fx,{count:budget(12),kind:'dot',colors:['#E8E4DA','#B9BCC4','#8F939C'],speed:[50,130],size:[5,11],life:[650,950],drag:.92,from:'edge',add:false,fin:.12,fout:.6}));
  },
  foil(fx,I){
    fx.at(I,()=>{
      radial(fx,{count:budget(26),kind:'shard',colors:['#55DDFF','#FF72DD','#FFE36B','#7DFFB2','#9D8BFF'],speed:[380,780],size:[12,22],life:[900,1400],drag:.9,g:260,spin:9,spread:.35});
      radial(fx,{count:budget(10),kind:'glow',colors:['#9BE8FF','#FFB3EE'],speed:[60,160],size:[14,24],life:[900,1300],drag:.95,spread:.5,fin:.2});
    });
  },
  silver(fx,I){
    fx.at(I,()=>{
      radial(fx,{count:budget(14),kind:'star',colors:['#FFFFFF','#E4F4FF'],speed:[520,900],size:[22,34],life:[560,820],drag:.86,spread:.1,fout:.6});
      for(let i=0,n=budget(44);i<n;i++){const angle=Math.random()*TAU,sp=rand(180,480)*fx.u;fx.add({kind:'flake',color:pick(['#FFFFFF','#D9ECFF','#B8C7D9']),x:fx.cx+Math.cos(angle)*fx.w*.3*Math.random(),y:fx.cy+Math.sin(angle)*fx.h*.3*Math.random(),vx:Math.cos(angle)*sp,vy:Math.sin(angle)*sp-70*fx.u,drag:.93,g:240*fx.u,life:rand(1500,2300),s0:rand(12,19)*fx.u,s1:rand(7,11)*fx.u,rot:Math.random()*TAU,vr:rand(-3,3),flip:rand(6,13),add:true,fin:.06,fout:.4})}
    });
    // cold glints catching on the card after the chrome sweep
    fx.at(I+260,()=>{for(let i=0,n=budget(12);i<n;i++)fx.add({kind:'star',color:pick(['#FFFFFF','#E4F4FF','#CFE6FF']),x:fx.cx+rand(-.46,.46)*fx.w,y:fx.cy+rand(-.46,.46)*fx.h,life:rand(520,820),s0:rand(20,30)*fx.u,s1:4*fx.u,rot:rand(-.3,.3),add:true,fin:.22,fout:.6,delay:rand(0,900)})});
  },
  gold(fx,I){
    fx.at(I,()=>{
      radial(fx,{count:budget(36),kind:'streak',colors:['#FFF3B0','#FFD25C','#FFB13B'],speed:[440,980],size:[30,46],life:[900,1500],drag:.92,g:980,spread:.25,align:true,stretch:.0016,fout:.55});
      radial(fx,{count:budget(16),kind:'glow',colors:['#FFE59A','#FFC45A'],speed:[20,70],size:[14,24],life:[1600,2400],drag:.98,g:-40,spread:.5,tw:7,fin:.2});
    });
    // the glitter of gold: big four-point glints popping over and around the card for a good second
    fx.at(I+160,()=>{for(let i=0,n=budget(22);i<n;i++)fx.add({kind:'star',color:pick(['#FFFFFF','#FFF3B0','#FFE08A']),x:fx.cx+rand(-.56,.56)*fx.w,y:fx.cy+rand(-.54,.54)*fx.h,life:rand(560,900),s0:rand(24,38)*fx.u,s1:5*fx.u,rot:rand(-.25,.25),add:true,fin:.2,fout:.62,delay:rand(0,1300)})});
  },
  desert(fx,I){
    fx.at(I,()=>{
      for(let i=0,n=budget(64);i<n;i++)fx.add({mode:'swirl',kind:'grain',color:pick(['#F5BD63','#E9A843','#FFF0B4','#C9783A']),cx:fx.cx,cy:fx.cy+fx.h*.08,ang:Math.random()*TAU,r:rand(.2,.5)*fx.w,vr:rand(170,300)*fx.u,spin:rand(2.4,4),fall:0,fallV:0,g:rand(50,120)*fx.u,life:rand(2200,3100),s0:rand(6,11)*fx.u,s1:rand(3,5)*fx.u,add:Math.random()<.45,fin:.06,fout:.35,delay:rand(0,160)});
      radial(fx,{count:budget(18),kind:'streak',colors:['#FFD27A','#FFF0B4'],speed:[380,760],size:[24,36],life:[700,1100],drag:.9,g:300,spread:.2,align:true});
      radial(fx,{count:budget(12),kind:'glow',colors:['#FFC87A','#FF9E4A'],speed:[10,40],size:[12,22],life:[2200,3000],drag:.98,g:-55,spread:.6,tw:4,fin:.25,delay:[0,600]});
    });
  },
  galaxy(fx,I,lite){
    const colors=['#AA73FF','#48E8FF','#FFFFFF','#FF8FE0'];
    if(!lite)fx.emit(900,I-60,34,()=>suck(fx,{kind:'star',colors,size:[12,20],life:[900,1150],reach:[1,1.5],twist:1.2}));
    fx.at(I,()=>{
      fx.add({kind:'flare',color:'#C9A4FF',life:950,s0:.7*fx.w,s1:3.4*fx.w,add:true,fin:.04,fout:.9});
      radial(fx,{count:budget(26),kind:'glow',colors,speed:[520,1150],size:[10,20],life:[1200,1900],drag:.9,spread:.2});
      radial(fx,{count:budget(20),kind:'star',colors,speed:[380,900],size:[14,24],life:[1300,2000],drag:.91,spread:.2,tw:6});
    });
    fx.at(I+140,()=>{orbit(fx,{count:budget(18),rx:.8,ry:.22,tilt:-.32,spin:1.6,colors,size:[12,18],life:3400,eject:520});orbit(fx,{count:budget(14),rx:.66,ry:.3,tilt:.42,spin:-1.15,colors:['#48E8FF','#FFFFFF'],size:[10,16],life:3200,delay:220,eject:520})});
  },
  void(fx,I,lite){
    const colors=['#72EFFF','#A871FF','#FFFFFF'];
    if(!lite){
      fx.emit(260,I-230,30,()=>suck(fx,{colors,reach:[1.1,1.9],size:[22,34],life:[1000,1400],twist:1.9,misreg:true}));
      fx.at(0,()=>veil(fx,I));
    }
    fx.at(I,()=>{
      fx.add({kind:'flare',color:'#DFFCFF',life:720,s0:.8*fx.w,s1:3.8*fx.w,add:true,fin:.03,fout:.92});
      radial(fx,{count:budget(56),kind:'glow',colors,speed:[620,1450],size:[9,18],life:[1000,1700],drag:.88,spread:.15,misreg:true});
    });
  }
};
// the scintillating variant: the same four-point shards, spacing and timing as before (2.8 s from the impact), on top of the base rarity
function glitter(fx,I){
  fx.at(I,()=>{const n=budget(72);for(let i=0;i<n;i++){const angle=(i*137.5)%360*Math.PI/180,dist=(260+(i%11)*44)*fx.u;fx.add({mode:'radial',kind:'star',color:i%5===0?'#FF82DF':i%3===0?'#78E9FF':i%2===0?'#FFF3A1':'#FFFFFF',cx:fx.cx,cy:fx.cy,a0:angle,dist,swirl:.73,life:2800,s0:(8+(i%4)*3)*fx.u,s1:3*fx.u,add:true,tw:rand(6,11),ph:Math.random()*TAU,fin:.08,fout:.55,delay:(i%14)*25})}});
}
// Void: the screen falls into darkness around the card, then lets go at the impact
function veil(fx,I){
  const layer=document.createElement('div');layer.className='rfx-veil';layer.setAttribute('aria-hidden','true');
  layer.style.setProperty('--x',`${fx.cx.toFixed(0)}px`);layer.style.setProperty('--y',`${fx.cy.toFixed(0)}px`);layer.style.setProperty('--r',`${Math.hypot(fx.w,fx.h).toFixed(0)}px`);
  (fx.el.closest('dialog')||document.body).append(layer);fx.layers.push(layer);
  const total=I+520;layer.animate([{opacity:0},{opacity:1,offset:.4},{opacity:1,offset:(I-20)/total},{opacity:0}],{duration:total,easing:'ease-in-out',fill:'forwards'}).onfinish=()=>layer.remove();
}

// ---------- boucle ----------
function stepPart(p,dt){
  p.age+=dt;if(p.age<0)return true;const t=p.age/p.life;if(t>=1)return false;dt=Math.min(64,dt);const s=dt/1000;
  if(p.mode==='suck'){const e=t*t*(3-2*t)*.35+t*t*.65,r=p.r0*(1-e),a=p.a0+p.twist*e;p.px=p.x;p.py=p.y;p.x=p.cx+Math.cos(a)*r;p.y=p.cy+Math.sin(a)*r*.8;p.rot=Math.atan2(p.y-p.py,p.x-p.px)}
  else if(p.mode==='orbit'){p.ang+=p.spin*s;const grow=Math.min(1,t/.18),k=.45+.55*(1-(1-grow)**3),ex=Math.cos(p.ang)*p.rx*k,ey=Math.sin(p.ang)*p.ry*k,ct=Math.cos(p.tilt),st=Math.sin(p.tilt);p.x=p.cx+ex*ct-ey*st;p.y=p.cy+ex*st+ey*ct;p.depth=Math.sin(p.ang);if(p.eject&&p.age>=p.eject)fling(p)}
  else if(p.mode==='swirl'){p.ang+=p.spin*s*(1-t*.75);p.r+=p.vr*s;p.vr*=Math.pow(.955,dt/16.7);if(t>.35){p.fallV+=p.g*s;p.fall+=p.fallV*s}p.x=p.cx+Math.cos(p.ang)*p.r;p.y=p.cy+Math.sin(p.ang)*p.r*.5+p.fall}
  else if(p.mode==='radial'){const e=1-(1-t)**3.4,a=p.a0+p.swirl*e,d=12*p.fx.u+p.dist*e;p.x=p.cx+Math.sin(a)*d;p.y=p.cy-Math.cos(a)*d}
  else{const k=Math.pow(p.drag,dt/16.7);p.vx*=k;p.vy=p.vy*k+p.g*s;p.x+=p.vx*s;p.y+=p.vy*s;p.rot+=p.vr*s;if(p.align){p.rot=Math.atan2(p.vy,p.vx);p.sx=1+Math.hypot(p.vx,p.vy)*(p.stretch||0)}}
  return true;
}
// sizes are tuned per kind at draw time: the bright specks read much larger than the soft glows; what is drawn in towards the card a little larger still
const KIND_SCALE={star:2,shard:1.7,flake:1.9,streak:1.6,grain:1.4,dot:1.25},SUCK_SCALE=1.45;
function drawPart(p){
  if(p.age<0)return;const t=p.age/p.life;let alpha=p.a*Math.min(1,t/p.fin)*(t>1-p.fout?(1-t)/p.fout:1),size=(p.s0+(p.s1-p.s0)*t)*(KIND_SCALE[p.kind]||1)*(p.mode==='suck'?SUCK_SCALE:1);
  if(p.tw)alpha*=.55+.45*Math.sin(p.age*p.tw/1000*TAU+p.ph);
  if(p.mode==='orbit'){alpha*=.5+.5*(p.depth+1)/2;size*=.8+.25*(p.depth+1)/2}
  if(alpha<=.01||size<.4)return;
  const spr=sprite(p.kind,p.color),scale=size/spr.w;let sx=scale*p.sx,sy=scale;if(p.flip)sx*=Math.abs(Math.cos(p.age/1000*p.flip))*.85+.15;
  const c=Math.cos(p.rot),s=Math.sin(p.rot);ctx.globalAlpha=Math.min(1,alpha);
  const put=(img,ox,oy)=>{ctx.setTransform(dpr*sx*c,dpr*sx*s,-dpr*sy*s,dpr*sy*c,dpr*(p.x+ox),dpr*(p.y+oy));ctx.drawImage(img.img,-img.w/2,-img.h/2)};
  // Void: printed twice, cyan and violet a little off register, like a riso pass that slipped
  if(p.misreg){const o=1.8*p.fx.u;put(sprite(p.kind,'#48E8FF'),-o,-o*.6);put(sprite(p.kind,'#A871FF'),o,o*.6);ctx.globalAlpha=Math.min(1,alpha)*.8;put(sprite(p.kind,'#FFFFFF'),0,0)}else put(spr,0,0);
}
function frame(now){
  raf=0;const real=Math.min(250,last?now-last:16.7),dt=Math.min(64,real);last=now;
  // adaptive: after a run of slow frames, the next bursts spawn fewer particles
  if(real>26){if(++slow>12){quality=Math.max(.35,quality*.8);slow=0}}else{slow=Math.max(0,slow-1);if(quality<1)quality=Math.min(1,quality+.0015)}
  for(let i=effects.length-1;i>=0;i--){
    const fx=effects[i];if(!alive(fx)){fx.dead=true;fx.layers.forEach(layer=>layer.remove());effects.splice(i,1);continue}
    if(fx.el.classList.contains('is-hitstop'))continue;
    // the timeline follows the wall clock so the bursts stay on the sound and the CSS lights even when frames drop; only the motion step is clamped
    fx.t+=real;fx.seen+=real;if(fx.seen>120){fx.seen=0;fx.refresh()}
    for(const task of fx.tasks)if(!task.done&&fx.t>=task.at){task.done=true;task.fn()}
    for(const em of fx.emitters){if(fx.t<em.from||fx.t>em.to)continue;em.acc+=real*em.rate*quality*(coarse()?.5:1)/1000;while(em.acc>=1){em.acc--;em.fn()}}
    if(fx.charge){if(!fx.el.classList.contains('is-charging')||fx.el.classList.contains('revealed')){effects.splice(i,1);continue}}
    else if(fx.t>fx.end+100)effects.splice(i,1);
  }
  let n=0;for(let i=0;i<parts.length;i++){const p=parts[i];if(p.fx.dead)continue;if(p.fx.el.classList.contains('is-hitstop')||stepPart(p,real))parts[n++]=p}parts.length=n;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  // the spray from behind the card: drawn with the card's own outline cut out, so it seems to come from under it
  const behind=new Set();for(const p of parts)if(p.behind&&p.age>=0)behind.add(p.fx);
  for(const fx of behind){
    ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.beginPath();ctx.rect(0,0,vw,vh);const x=fx.cx-fx.w/2,y=fx.cy-fx.h/2;if(ctx.roundRect)ctx.roundRect(x,y,fx.w,fx.h,14*fx.u);else ctx.rect(x,y,fx.w,fx.h);ctx.clip('evenodd');
    ctx.globalCompositeOperation='lighter';for(const p of parts)if(p.behind&&p.fx===fx)drawPart(p);ctx.restore();
  }
  ctx.globalCompositeOperation='source-over';for(const p of parts)if(!p.add&&!p.behind)drawPart(p);
  ctx.globalCompositeOperation='lighter';for(const p of parts)if(p.add&&!p.behind)drawPart(p);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  if(parts.length||effects.length)raf=requestAnimationFrame(frame);else{last=0;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);canvas.hidden=true}
}
function run(){if(!raf){last=0;raf=requestAnimationFrame(frame)}}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0}else if(!document.hidden&&(parts.length||effects.length))run()});

function play(el,rarityId,options={}){
  if(!el||reduced()||!el.getBoundingClientRect().width)return;const base=String(rarityId||'common').replace(/-glitter$/,''),preset=PRESETS[base]||PRESETS.common,I=options.impact??impactOf(base);
  mount(hostFor(el));const fx=makeEffect(el,base,options),glit=String(rarityId).endsWith('-glitter');if(!options.lite)backSpray(fx,I,base,glit);preset(fx,I,options.lite);if(glit)glitter(fx,I);effects.push(fx);run();return fx;
}
// holding a face-down card: from Gold up, specks are drawn into it for as long as the finger stays down
function charge(el,rarityId){
  const base=String(rarityId||'').replace(/-glitter$/,'');if(!el||reduced()||!['gold','desert','galaxy','void'].includes(base))return;
  if(effects.some(fx=>fx.charge&&fx.el===el))return;mount(hostFor(el));const fx=makeEffect(el,base);fx.charge=true;
  const colors={gold:['#FFE59A','#FFB13B'],desert:['#F5BD63','#FFF0B4'],galaxy:['#AA73FF','#48E8FF'],void:['#72EFFF','#A871FF']}[base];
  fx.emit(0,1e9,base==='gold'||base==='desert'?22:30,()=>suck(fx,{colors,reach:[.95,1.35],size:[16,24],life:[650,850],twist:.8,misreg:base==='void'}));effects.push(fx);run();
}
function clear(){effects.forEach(fx=>{fx.dead=true;fx.layers.forEach(layer=>layer.remove())});effects.length=0;parts.length=0}
window.RevealFx={play,charge,clear,impactOf,stats:()=>({effects:effects.length,particles:parts.length,quality:+quality.toFixed(2),canvas:!!canvas&&!canvas.hidden&&canvas.isConnected})};
})();
