const test=require('node:test'),assert=require('node:assert/strict'),C=require('../js/duelomantik-core.js');
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
