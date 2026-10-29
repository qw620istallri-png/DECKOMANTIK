/* Physical game counters only: no deck or tournament scores are changed. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DKDuel=api})(globalThis,()=>{
  'use strict';
  const essences=['phlegmatic','vitreous','melancholic','capricious','choleric','transcendent','hollow'];
  const fresh=()=>({version:1,turn:1,players:[0,1].map(()=>({name:'',bonus:0,essences:Object.fromEntries(essences.map(id=>[id,0]))})),die:null,clock:{minutes:50,elapsed:0,startedAt:null}});
  function validate(value){
    if(!value||value.version!==1||!Array.isArray(value.players)||value.players.length!==2)throw Error('badSave');
    for(const p of value.players){if(typeof p.name!=='string'||p.name.length>60||!Number.isInteger(p.bonus)||Math.abs(p.bonus)>100000||!p.essences||essences.some(id=>!Number.isInteger(p.essences[id])||p.essences[id]<0||p.essences[id]>99))throw Error('badSave')}
    const c=value.clock;if(!c||!Number.isInteger(c.minutes)||c.minutes<1||c.minutes>600||!Number.isFinite(c.elapsed)||c.elapsed<0||c.startedAt!==null&&(!Number.isFinite(c.startedAt)||c.startedAt<0)||value.die!==null&&(!Number.isInteger(value.die)||value.die<1||value.die>6))throw Error('badSave');
    const result=JSON.parse(JSON.stringify(value));if(result.turn===undefined)result.turn=1;
    if(!Number.isInteger(result.turn)||result.turn<1||result.turn>9999)throw Error('badSave');
    return result;
  }
  function elapsed(clock,now=Date.now()){return clock.elapsed+(clock.startedAt===null?0:Math.max(0,now-clock.startedAt))}
  function toggle(clock,now=Date.now()){if(clock.startedAt===null)clock.startedAt=now;else{clock.elapsed=elapsed(clock,now);clock.startedAt=null}}
  function change(state,player,kind,key,delta){
    const p=state.players[player];if(!p)throw Error('badSave');
    if(kind==='bonus')p.bonus=Math.max(-100000,Math.min(100000,p.bonus+delta));
    else if(kind==='essence'&&essences.includes(key))p.essences[key]=Math.max(0,Math.min(99,p.essences[key]+delta));
    else throw Error('badSave');
  }
  function roll(random=()=>crypto.getRandomValues(new Uint32Array(1))[0]){let n;do{n=random()}while(n>=4294967292);return n%6+1}
  return {essences,fresh,validate,elapsed,toggle,change,roll};
});
