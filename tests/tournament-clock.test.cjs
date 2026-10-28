const test=require('node:test'),assert=require('node:assert/strict'),Clock=require('../js/tournament-clock.js');
const start=Date.parse('2026-10-26T10:00:00Z'),round=()=>({studyMinutes:5,playMinutes:50,startedAt:new Date(start).toISOString(),pauseMs:0,pausedAt:null});
test('round and table extensions add to play time, preserve preparation and shift overtime',()=>{
  const r={...round(),extraMinutes:5},table=Clock.forMatch(r,{extraMinutes:3});
  assert.equal(Clock.state(table,start+4*60000).remaining,60000);
  assert.equal(Clock.state(r,start+55*60000).remaining,5*60000);
  assert.equal(Clock.state(table,start+60*60000).remaining,3*60000);
  assert.equal(Clock.state(table,start+64*60000).overtime,60000);
  assert.equal(Clock.cues(r).at(-1).at,60*60000);assert.equal(Clock.cues(r).find(c=>c.id==='fiveMinutes').at,55*60000);
  Clock.seek(r,'overtime',start);assert.equal(Clock.state(r,start).phase,'overtime');assert.equal(r.extraMinutes,5);
});
test('default cues follow study/play phases with the one-minute and final warnings',()=>{
  assert.deepEqual(Clock.cues(round()).map(c=>[c.id,c.at/60000]),[['start',0],['studyOneMinute',4],['play10',15],['play20',25],['play30',35],['play40',45],['fiveMinutes',50],['end',55]]);
});
test('visible clocks use wall time, stop for pauses and freeze on round closure',()=>{
  const r=round();assert.equal(Clock.state(r,start+4*60000).remaining,60000);assert.equal(Clock.state(r,start+5*60000).phase,'play');assert.equal(Clock.state(r,start+5*60000).remaining,50*60000);
  r.pausedAt=new Date(start+15*60000).toISOString();assert.equal(Clock.state(r,start+30*60000).remaining,40*60000);assert.equal(Clock.state(r,start+30*60000).paused,true);
  r.pausedAt=null;r.pauseMs=15*60000;assert.equal(Clock.state(r,start+30*60000).remaining,40*60000);r.endedAt=new Date(start+35*60000).toISOString();assert.equal(Clock.state(r,start+60*60000).remaining,35*60000);assert.equal(Clock.state(r,start+60*60000).ended,true);
});
test('cue crossings do not replay on page load, repeated ticks or backward time',()=>{
  const r=round();assert.deepEqual(Clock.crossed(r,undefined,20*60000),[]);assert.deepEqual(Clock.crossed(r,239000,240000).map(c=>c.id),['studyOneMinute']);assert.deepEqual(Clock.crossed(r,240000,240000),[]);assert.deepEqual(Clock.crossed(r,300000,240000),[]);assert.equal(Clock.crossed(r,15*60000,56*60000).at(-1).id,'end');
});
test('closing a paused round freezes at its pause time, including in saved snapshots',()=>{const r=round();r.pausedAt=new Date(start+15*60000).toISOString();r.endedAt=new Date(start+35*60000).toISOString();const saved=JSON.parse(JSON.stringify(r)),state=Clock.state(saved,start+60*60000);assert.equal(state.elapsed,15*60000);assert.equal(state.remaining,40*60000);assert.equal(state.ended,true);assert.equal(state.paused,false)});
test('zero study and short rounds do not duplicate simultaneous sound cues',()=>{
  for(const playMinutes of [1,5,10,15,50]){const cues=Clock.cues({...round(),studyMinutes:0,playMinutes});assert.equal(cues[0].id,'start');assert.equal(cues.at(-1).id,'end');assert.equal(new Set(cues.map(c=>c.at)).size,cues.length)}
  assert.equal(Clock.cues({...round(),playMinutes:15}).find(c=>c.at===15*60000).id,'fiveMinutes');
});

test('clock colors follow study, distinct ten-minute intervals, five-minute and two-minute warnings',()=>{
 const r=round();assert.equal(Clock.appearance({...r,startedAt:null},start).stage,'not-started');assert.equal(Clock.appearance(r,start+4*60000).stage,'study');const hues=[5,15,25,35,45].map(min=>Clock.appearance(r,start+min*60000).hue);assert.equal(new Set(hues).size,5);assert.equal(Clock.appearance(r,start+50*60000).stage,'last-five');assert.equal(Clock.appearance(r,start+53*60000).stage,'last-two');assert.equal(Clock.appearance(r,start+55*60000).stage,'time-up');r.pausedAt=new Date(start+53*60000).toISOString();assert.equal(Clock.appearance(r,start+70*60000).stage,'last-two');r.endedAt=new Date(start+54*60000).toISOString();assert.equal(Clock.appearance(r,start+70*60000).stage,'closed');
});


test('overtime counts up from the official end and catches up without intermediate ticks',()=>{
 const r=round(),s=Clock.state(r,start+72*60000+4500);assert.equal(s.phase,'overtime');assert.equal(s.remaining,0);assert.equal(s.overtime,17*60000+4500);
 Clock.toggle(r,start+73*60000);assert.equal(Clock.state(r,start+99*60000).overtime,18*60000);Clock.toggle(r,start+99*60000);assert.equal(Clock.state(r,start+100*60000).overtime,19*60000);
});
test('seek switches phases, clears old pause/closure and preserves results',()=>{
 const r={...round(),matches:[{result:{a:1,b:0}}]},matches=JSON.stringify(r.matches);r.endedAt=new Date(start+60000).toISOString();
 Clock.seek(r,'play',start+10*60000);assert.equal(Clock.state(r,start+10*60000).phase,'play');assert.equal(Clock.state(r,start+10*60000).remaining,50*60000);assert.equal(r.endedAt,undefined);
 Clock.seek(r,'overtime',start+20*60000);assert.equal(Clock.state(r,start+23*60000).overtime,3*60000);
 Clock.seek(r,'study',start+30*60000);assert.equal(Clock.state(r,start+31*60000).remaining,4*60000);assert.equal(JSON.stringify(r.matches),matches);
});
test('a closed round can restart and reset without changing its match results',()=>{
 const r={...round(),matches:[{result:{a:1,b:0}}],endedAt:new Date(start+60000).toISOString(),pausedAt:new Date(start+30000).toISOString(),pauseMs:1000};
 Clock.toggle(r,start+90*60000);assert.equal(Clock.state(r,start+91*60000).remaining,4*60000);assert.equal(Clock.state(r,start+91*60000).ended,false);assert.equal(r.pauseMs,0);
 Clock.reset(r);assert.equal(r.startedAt,null);assert.equal(r.pausedAt,null);assert.equal(r.matches[0].result.a,1);assert.equal(r.clockInitialized,true);
});
