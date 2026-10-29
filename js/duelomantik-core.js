/* Physical game counters only: no deck or tournament scores are changed. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DKDuel=api})(globalThis,()=>{
  'use strict';
  const essences=['phlegmatic','vitreous','melancholic','capricious','choleric','transcendent','hollow'];
  const fresh=()=>({version:1,game:1,journal:[],turn:1,players:[0,1].map(()=>({name:'',bonus:0,essences:Object.fromEntries(essences.map(id=>[id,0]))})),die:null,clock:{minutes:50,elapsed:0,startedAt:null}});
  function validate(value){
    if(!value||value.version!==1||!Array.isArray(value.players)||value.players.length!==2)throw Error('badSave');
    for(const p of value.players){if(typeof p.name!=='string'||p.name.length>60||!Number.isInteger(p.bonus)||Math.abs(p.bonus)>100000||!p.essences||essences.some(id=>!Number.isInteger(p.essences[id])||p.essences[id]<0||p.essences[id]>99))throw Error('badSave')}
    const c=value.clock;if(!c||!Number.isInteger(c.minutes)||c.minutes<1||c.minutes>600||!Number.isFinite(c.elapsed)||c.elapsed<0||c.startedAt!==null&&(!Number.isFinite(c.startedAt)||c.startedAt<0)||value.die!==null&&(!Number.isInteger(value.die)||value.die<1||value.die>6))throw Error('badSave');
    const result=JSON.parse(JSON.stringify(value));if(result.turn===undefined)result.turn=1;
    if(!Number.isInteger(result.turn)||result.turn<1||result.turn>9999)throw Error('badSave');
    if(result.game===undefined)result.game=1;if(result.journal===undefined)result.journal=[];
    const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
    if(!integer(result.game,1,1e9)||!Array.isArray(result.journal)||result.journal.length>5000)throw Error('badSave');
    for(const entry of result.journal){
      if(!entry||typeof entry.at!=='string'||entry.at.length>40||!Number.isFinite(Date.parse(entry.at))||!integer(entry.game,1,1e9)||!integer(entry.turn,1,9999)||!Number.isFinite(entry.elapsedMs)||entry.elapsedMs<0||!integer(entry.minutes,1,600)||!['running','paused','not-started'].includes(entry.clockState)||!['change','undo','new','clock','clockReset','clockSettings'].includes(entry.action)||!Array.isArray(entry.changes)||!entry.changes.length||entry.changes.length>5)throw Error('badSave');
      for(const change of entry.changes){
        if(!change||!['bonus','turn','clock','newGame'].includes(change.type))throw Error('badSave');
        if(change.type==='bonus'&&(!integer(change.player,0,1)||typeof change.name!=='string'||change.name.length>60||!integer(change.from,-100000,100000)||!integer(change.to,-100000,100000)))throw Error('badSave');
        if(change.type==='turn'&&(!integer(change.from,1,9999)||!integer(change.to,1,9999)))throw Error('badSave');
        if(change.type==='newGame'&&!integer(change.game,1,1e9))throw Error('badSave');
        if(change.type==='clock'&&(!['running','paused','not-started'].includes(change.from)||!['running','paused','not-started'].includes(change.to)||!integer(change.minutesFrom,1,600)||!integer(change.minutesTo,1,600)))throw Error('badSave');
      }
    }
    return result;
  }
  function elapsed(clock,now=Date.now()){return clock.elapsed+(clock.startedAt===null?0:Math.max(0,now-clock.startedAt))}
  const clockState=clock=>clock.startedAt!==null?'running':clock.elapsed>0?'paused':'not-started';
  function record(before,after,action='change',now=Date.now()){
    const changes=[];
    before.players.forEach((p,i)=>{if(p.bonus!==after.players[i].bonus)changes.push({type:'bonus',player:i,name:p.name,from:p.bonus,to:after.players[i].bonus})});
    if(before.turn!==after.turn)changes.push({type:'turn',from:before.turn,to:after.turn});
    if(['clock','clockReset','clockSettings'].includes(action))changes.push({type:'clock',from:clockState(before.clock),to:clockState(after.clock),minutesFrom:before.clock.minutes,minutesTo:after.clock.minutes});
    after.game=action==='new'?(before.game||1)+1:before.game||1;
    after.journal=[...(before.journal||[])];
    if(action==='new')changes.push({type:'newGame',game:after.game});
    if(changes.length)after.journal.push({at:new Date(now).toISOString(),game:before.game||1,turn:before.turn,elapsedMs:elapsed(before.clock,now),minutes:before.clock.minutes,clockState:clockState(before.clock),action,changes});
    after.journal=after.journal.slice(-5000);
  }
  function journalGroups(entries){
    const groups=[];
    for(const entry of entries){
      const group=groups.at(-1),first=group?.entries[0],last=group?.entries.at(-1),change=entry.changes[0],previous=last?.changes[0];
      const span=first?Date.parse(entry.at)-Date.parse(first.at):0;
      const combine=first&&entry.action==='change'&&last.action==='change'&&entry.changes.length===1&&last.changes.length===1&&change.type==='bonus'&&previous.type==='bonus'&&entry.game===first.game&&entry.turn===first.turn&&entry.clockState===first.clockState&&entry.minutes===first.minutes&&(entry.elapsedMs>=entry.minutes*60000)===(first.elapsedMs>=first.minutes*60000)&&change.player===previous.player&&change.name===previous.name&&change.from===previous.to&&span>=0&&span<20000;
      if(combine)group.entries.push(entry);else groups.push({entries:[entry]});
    }
    return groups;
  }
  function toggle(clock,now=Date.now()){if(clock.startedAt===null)clock.startedAt=now;else{clock.elapsed=elapsed(clock,now);clock.startedAt=null}}
  function change(state,player,kind,key,delta){
    const p=state.players[player];if(!p)throw Error('badSave');
    if(kind==='bonus')p.bonus=Math.max(-100000,Math.min(100000,p.bonus+delta));
    else if(kind==='essence'&&essences.includes(key))p.essences[key]=Math.max(0,Math.min(99,p.essences[key]+delta));
    else throw Error('badSave');
  }
  function roll(random=()=>crypto.getRandomValues(new Uint32Array(1))[0]){let n;do{n=random()}while(n>=4294967292);return n%6+1}
  return {essences,fresh,validate,elapsed,record,journalGroups,toggle,change,roll};
});
