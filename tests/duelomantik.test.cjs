const test=require('node:test'),assert=require('node:assert/strict'),C=require('../js/duelomantik-core.js');
test('journal records the wall time, turn and paused-adjusted game clock alongside point deltas',()=>{
  const now=Date.parse('2026-10-29T16:50:00Z'),before=C.fresh();before.players[1].name='Player 2';before.players[1].bonus=10;before.turn=2;before.clock.elapsed=120000;before.clock.startedAt=now-787000;
  const next=C.validate(before);C.change(next,1,'bonus',null,5);C.record(before,next,'change',now);
  const entry=next.journal[0];assert.equal(entry.at,'2026-10-29T16:50:00.000Z');assert.equal(entry.elapsedMs,907000);assert.equal(entry.turn,2);assert.equal(entry.minutes,50);assert.equal(entry.clockState,'running');assert.deepEqual(entry.changes,[{type:'bonus',player:1,name:'Player 2',from:10,to:15}]);assert.equal(before.journal.length,0);assert.deepEqual(C.validate(next),next);
});
test('turn edits and undo append history, unrelated counters do not, and new games retain prior operations',()=>{
  const before=C.fresh(),next=C.validate(before),now=Date.now();next.turn=3;C.record(before,next,'change',now);
  const undo=C.validate(next);undo.turn=1;C.record(next,undo,'undo',now+1000);assert.equal(undo.journal.length,2);assert.equal(undo.journal[1].turn,3);assert.equal(undo.journal[1].action,'undo');assert.deepEqual(undo.journal[1].changes,[{type:'turn',from:3,to:1}]);
  const essence=C.validate(undo);essence.players[0].essences.hollow=5;C.record(undo,essence,'change',now+2000);assert.equal(essence.journal.length,2);
  const fresh=C.fresh();C.record(essence,fresh,'new',now+3000);assert.equal(fresh.game,2);assert.equal(fresh.journal.length,3);assert.deepEqual(fresh.journal[2].changes,[{type:'newGame',game:2}]);assert.equal(fresh.journal[2].game,1);
});
test('clock resets retain their former reference and legacy saves start with an empty journal',()=>{
  const legacy=C.fresh();delete legacy.game;delete legacy.journal;legacy.players[0].bonus=20;const before=C.validate(legacy);assert.equal(before.game,1);assert.deepEqual(before.journal,[]);assert.equal(before.players[0].bonus,20);
  before.clock.elapsed=907000;const after=C.validate(before);after.clock.elapsed=0;C.record(before,after,'clockReset');assert.equal(after.journal[0].elapsedMs,907000);assert.equal(after.journal[0].clockState,'paused');assert.deepEqual(after.journal[0].changes,[{type:'clock',from:'paused',to:'not-started',minutesFrom:50,minutesTo:50}]);
  const broken=C.validate(after);broken.journal[0].changes[0].type='unknown';assert.throws(()=>C.validate(broken),/badSave/);
});
test('turns start at one and older saves gain the counter without losing the game',()=>{
  const s=C.fresh();assert.equal(s.turn,1);s.players[0].bonus=35;s.players[0].essences.hollow=9;delete s.turn;
  const restored=C.validate(s);assert.equal(restored.turn,1);assert.equal(restored.players[0].bonus,35);assert.equal(restored.players[0].essences.hollow,9);assert.equal(s.turn,undefined);
  restored.turn=23;assert.equal(C.validate(restored).turn,23);for(const turn of [0,-1,1.5,10000,'2'])assert.throws(()=>C.validate({...restored,turn}),/badSave/);
});
test('bonus points start at zero, allow losses and never alter the other player',()=>{
  const s=C.fresh();C.change(s,0,'bonus',null,-5);C.change(s,1,'bonus',null,10);assert.equal(s.players[0].bonus,-5);assert.equal(s.players[1].bonus,10);assert.deepEqual(C.validate(JSON.parse(JSON.stringify(s))),s);
});
test('each essence pool is independent and cannot spend below zero',()=>{
  const s=C.fresh();C.change(s,0,'essence','hollow',2);C.change(s,0,'essence','hollow',-1);assert.equal(s.players[0].essences.hollow,1);assert.equal(s.players[1].essences.hollow,0);C.change(s,0,'essence','vitreous',-1);assert.equal(s.players[0].essences.vitreous,0);assert.throws(()=>C.change(s,0,'essence','unknown',1));
});
test('companion timer uses timestamps, catches up after backgrounding and freezes while paused',()=>{
  const c=C.fresh().clock;C.toggle(c,1000);assert.equal(C.elapsed(c,601000),600000);C.toggle(c,601000);assert.equal(C.elapsed(c,900000),600000);C.toggle(c,1000000);assert.equal(C.elapsed(c,1300000),900000);
});
test('save validation rejects broken counters, timers and die values',()=>{
  for(const edit of [s=>s.players[0].bonus=Infinity,s=>s.players[0].essences.hollow=-1,s=>s.die=7,s=>s.clock.minutes=0,s=>s.clock.elapsed=-1,s=>s.clock.startedAt='yesterday']){const s=C.fresh();edit(s);assert.throws(()=>C.validate(s),/badSave/)}
});
test('six-sided die rejects the biased remainder at the end of the random range',()=>{
  for(let n=0;n<6;n++)assert.equal(C.roll(()=>n),n+1);const draws=[4294967295,4294967292,11];assert.equal(C.roll(()=>draws.shift()),6);assert.equal(draws.length,0);
});
