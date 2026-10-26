/* One timeline for the visible clocks and their sound cues. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DKTournamentClock=api})(globalThis,()=>{
  function state(round,now=Date.now()){
    const study=round.studyMinutes*60000,total=study+round.playMinutes*60000;
    const end=round.pausedAt?Date.parse(round.pausedAt):round.endedAt?Date.parse(round.endedAt):now;
    const elapsed=round.startedAt?Math.max(0,end-Date.parse(round.startedAt)-(round.pauseMs||0)):0;
    const phase=elapsed>=total?'timeUp':elapsed<study?'study':'play';
    return {elapsed,phase,remaining:round.startedAt?Math.max(0,(phase==='study'?study:total)-elapsed):total,started:Boolean(round.startedAt),paused:Boolean(round.pausedAt&&!round.endedAt),ended:Boolean(round.endedAt)};
  }
  function appearance(round,now=Date.now()){
    const clock=state(round,now);if(clock.ended)return {stage:'closed',hue:0,bucket:0};if(!clock.started)return {stage:'not-started',hue:0,bucket:0};if(clock.phase==='timeUp')return {stage:'time-up',hue:0,bucket:0};if(clock.phase==='study')return {stage:'study',hue:215,bucket:0};
    if(clock.remaining<=120000)return {stage:'last-two',hue:5,bucket:0};if(clock.remaining<=300000)return {stage:'last-five',hue:38,bucket:0};const bucket=Math.floor((clock.elapsed-round.studyMinutes*60000)/600000);return {stage:'play',hue:(155+43*bucket)%360,bucket};
  }
  function cues(round){
    const study=round.studyMinutes*60000,play=round.playMinutes*60000,items=[{id:'start',at:0}];
    if(study>60000)items.push({id:'studyOneMinute',at:study-60000});
    for(let min=10;min<round.playMinutes;min+=10)items.push({id:'play'+min,at:study+min*60000});
    if(play>=300000&&study+play-300000>0)items.push({id:'fiveMinutes',at:study+play-300000});
    items.push({id:'end',at:study+play});
    // A five-minute warning replaces a ten-minute cue when both occur together.
    const byTime=new Map();for(const item of items)byTime.set(item.at,item);
    return [...byTime.values()].sort((a,b)=>a.at-b.at);
  }
  function crossed(round,previous,current){if(previous===null||previous===undefined||current<previous)return [];return cues(round).filter(c=>c.id!=='start'&&c.at>previous&&c.at<=current)}
  return {state,appearance,cues,crossed};
});
