const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const C=require('../js/tournament-core.js');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../data/cards-data.js'),'utf8'),context);
const cards=new Map(context.DECKOMANTIK_CARDS.map(c=>[c.id,c]));
function event(n=8){const e=C.createEvent('Test event');e.players=Array.from({length:n},(_,i)=>({id:'p'+i,name:'Player '+i,active:true,deck:null,waiver:'Paper deck checked by judge'}));return e}
function finish(e){const r=e.rounds.at(-1);for(const m of r.matches.filter(m=>m.b))C.setResult(e,r.id,m.id,{a:1,b:0,minutes:30});return r}
const mockCards=new Map(Array.from({length:50},(_,i)=>['c'+i,{id:'c'+i,name:'Card '+i,points:5}]));
const deck=()=>({name:'Test',groups:[{name:'Main',cardIds:Array.from({length:30},(_,i)=>'c'+i)},{name:'Sideboard',kind:'sideboard',cardIds:['c30','c31']}]});
test('judge notes and strike history survive private backups and are excluded from every public player',()=>{
  const e=event(2);e.players[0].notes='Private accessibility information';e.players[0].penalties=[{id:'strike-1',at:new Date().toISOString(),reason:'Late arrival',voidedAt:new Date().toISOString(),voidReason:'Organizer error'}];
  const restored=C.validateEvent(e,{privateData:true});assert.deepEqual(restored.players[0].penalties,e.players[0].penalties);assert.equal(restored.players[0].notes,e.players[0].notes);
  const publicCopy=C.publicEvent(e);assert.ok(!JSON.stringify(publicCopy).includes('Private accessibility'));assert.ok(!('penalties' in publicCopy.players[0]));
  const contaminated=C.copy(publicCopy);contaminated.players[0].notes='secret';contaminated.players[0].penalties=e.players[0].penalties;assert.ok(!('notes' in C.validateEvent(contaminated).players[0]));
  e.players[0].penalties[0].voidReason='';assert.throws(()=>C.validateEvent(e,{privateData:true}),/badFile/);
});
test('extra time round-trips through player exports and invalid extensions are rejected',()=>{
  const e=event(2);C.start(e,cards);const r=e.rounds[0];r.extraMinutes=5;r.matches[0].extraMinutes=3;
  const exported=C.validateEvent(C.publicEvent(e));assert.equal(exported.rounds[0].extraMinutes,5);assert.equal(exported.rounds[0].matches[0].extraMinutes,3);
  for(const value of [-1,1.5,601,'5']){r.matches[0].extraMinutes=value;assert.throws(()=>C.validateEvent(e,{privateData:true}),/badFile/)}
});
test('official player-count recommendations and Lucca preset',()=>{
  for(const [n,rounds,cut] of [[2,1,0],[3,2,0],[4,3,0],[8,3,0],[9,4,4],[16,4,4],[17,5,8],[32,5,8],[64,6,8]])assert.deepEqual(C.recommended(n),{swissRounds:rounds,topCut:cut});
  const r=C.rules('lucca');assert.equal(r.banned.length,3);assert.equal(r.restrictionGroups[0].cardIds.length,3);assert.equal(r.studyMinutes+r.playMinutes,55);assert.ok([...r.banned,...r.restrictionGroups[0].cardIds].every(id=>cards.has(id)));
});
test('deck validity counts main, sideboard and excluded maybeboard separately',()=>{
  const d=deck();d.groups.push({name:'Maybeboard',kind:'maybeboard',cardIds:['unknown']});const v=C.validateDeck(d,C.rules(),mockCards);assert.equal(v.valid,true);assert.equal(v.count,30);assert.equal(v.sideCount,2);assert.equal(v.points,150);
});
test('ban applies to sideboard; restriction applies only to main deck',()=>{
  const d=deck(),r=C.rules();r.banned=['c31'];assert.equal(C.validateDeck(d,r,mockCards).issues[0].code,'bannedCards');r.banned=[];r.restrictionGroups=[{id:'one',name:'First group',cardIds:['c0','c30','c31'],limit:1}];assert.equal(C.validateDeck(d,r,mockCards).valid,true);r.restrictionGroups[0].cardIds.push('c1');assert.ok(C.validateDeck(d,r,mockCards).issues.some(i=>i.code==='restrictedCards'));
});
test('singleton, unknown ids, points and missing deck are rejected',()=>{
  const d=deck();d.groups[1].cardIds.push('c0','unknown');let v=C.validateDeck(d,C.rules(),mockCards);assert.ok(v.issues.some(i=>i.code==='singleton'));assert.ok(v.issues.some(i=>i.code==='unknownCards'));assert.equal(C.validateDeck(null,C.rules(),mockCards).valid,false);const r=C.rules();r.maxPoints=149;assert.ok(C.validateDeck(deck(),r,mockCards).issues.some(i=>i.code==='deckPoints'));
});
test('30 cards with different ids but same printed name break singleton',()=>{const map=new Map(mockCards);map.set('c1',{...map.get('c1'),name:'Card 0'});assert.ok(C.validateDeck(deck(),C.rules(),map).issues.some(i=>i.code==='singleton'))});
test('start requires name, active players and validated decks or reasoned waivers',()=>{
  const e=event(2);e.name=' ';assert.throws(()=>C.start(e,cards),/needName/);e.name='Test';e.players[0].waiver='';e.players[0].deck=deck();assert.throws(()=>C.start(e,cards),/invalidDecks/);e.players[0].waiver='Judge approved';C.start(e,cards);assert.equal(e.status,'running');assert.equal(e.rounds.length,1);assert.throws(()=>C.start(e,cards),/locked/);
});
test('Swiss rounds pair each player exactly once, avoid repeat opponents and respect table offset',()=>{
  const e=event(16);e.rules.swissRounds=4;e.rules.firstTable=20;C.start(e,cards);const pairs=new Set();
  for(let i=0;i<4;i++){const r=e.rounds.at(-1);assert.equal(r.matches.length,8);assert.equal(new Set(r.matches.flatMap(m=>[m.a,m.b])).size,16);assert.equal(r.matches[0].table,20);for(const m of r.matches){const key=[m.a,m.b].sort().join('|');assert.ok(!pairs.has(key));pairs.add(key)}finish(e);C.nextRound(e)}assert.equal(e.status,'complete');
});
test('odd player count rotates byes and awards exactly three points',()=>{
  const e=event(3);e.rules.swissRounds=3;C.start(e,cards);const byes=[];for(let i=0;i<3;i++){const r=e.rounds.at(-1),bye=r.matches.find(m=>!m.b);assert.equal(bye.table,null);byes.push(bye.a);finish(e);if(i<2)C.nextRound(e)}assert.equal(new Set(byes).size,3);assert.ok(C.standings(e).every(r=>r.byes===1));
});
test('cannot advance with missing results or correct an upstream round',()=>{const e=event(4);C.start(e,cards);assert.throws(()=>C.nextRound(e),/unfinishedRound/);const r=finish(e);C.nextRound(e);assert.throws(()=>C.setResult(e,r.id,r.matches[0].id,{a:0,b:1,minutes:null}),/downstreamRounds/)});
test('scores handle Bo1, Bo3, Bo5, timed wins and Swiss draws',()=>{
  const e=event(2);e.rules.bestOf=3;C.start(e,cards);const r=e.rounds[0],m=r.matches[0];for(const score of [{a:2,b:1,minutes:0},{a:1,b:1,minutes:null},{a:0,b:0,minutes:50},{a:1,b:0,minutes:55}])assert.doesNotThrow(()=>C.setResult(e,r.id,m.id,score));
  for(const score of [{a:2,b:2,minutes:null},{a:3,b:0,minutes:null},{a:1.5,b:0,minutes:null},{a:1,b:0,minutes:NaN},{a:1,b:0,minutes:-1}])assert.throws(()=>C.setResult(e,r.id,m.id,score));
  r.bestOf=5;assert.doesNotThrow(()=>C.setResult(e,r.id,m.id,{a:3,b:2,minutes:140}));
});
test('Swiss standings recompute points and Buchholz after corrections',()=>{
  const e=event(4);C.start(e,cards);const r=finish(e);const first=r.matches[0];assert.equal(C.standings(e).find(p=>p.id===first.a).points,3);C.setResult(e,r.id,first.id,{a:0,b:0,minutes:null});assert.equal(C.standings(e).find(p=>p.id===first.a).points,1);assert.equal(C.standings(e).find(p=>p.id===first.b).buchholz,1);
});
test('Top 8 follows 1v8/4v5/2v7/3v6 bracket and produces champion and bronze',()=>{
  const e=event(8);e.rules.swissRounds=1;e.rules.thirdPlace=true;e.rules.topCut=8;C.start(e,cards);finish(e);const ranked=C.standings(e);C.nextRound(e);const cut=e.rounds.at(-1);assert.equal(cut.matches[0].a,ranked[0].id);assert.equal(cut.matches[0].b,ranked[7].id);assert.equal(cut.matches[1].a,ranked[3].id);assert.throws(()=>C.setResult(e,cut.id,cut.matches[0].id,{a:0,b:0,minutes:null}),/noCutDraw/);finish(e);C.nextRound(e);finish(e);C.nextRound(e);assert.equal(e.rounds.at(-1).matches.length,2);assert.equal(e.rounds.at(-1).matches[1].bronze,true);finish(e);C.nextRound(e);assert.equal(e.status,'complete');assert.deepEqual(C.finalPlaces(e).map(p=>p.place),[1,2,3,4]);
});
test('public projection strips judge waivers, audit and non-public decks',()=>{
  const e=event(2);e.rules.publicDecks=false;e.players[0].deck=deck();e.audit=[{at:new Date().toISOString(),action:'deck',reason:'Private note'}];const p=C.publicEvent(e);assert.ok(!('audit' in p));assert.ok(!('deck' in p.players[0]));assert.ok(!('waiver' in p.players[0]));e.rules.publicDecks=true;assert.deepEqual(C.publicEvent(e).players[0].deck,e.players[0].deck);
});
test('statistics distinguish unreported duration from zero and exclude byes',()=>{const e=event(5);C.start(e,cards);const r=e.rounds[0];C.setResult(e,r.id,r.matches[0].id,{a:1,b:0,minutes:0});C.setResult(e,r.id,r.matches[1].id,{a:0,b:0,minutes:null});const s=C.statistics(e);assert.equal(s.matches,2);assert.equal(s.draws,1);assert.equal(s.timed,1);assert.equal(s.averageMinutes,0)});
test('incoming files reject duplicate players, double seating, duplicate tables and invalid scores',()=>{
  const e=event(4);C.start(e,cards);C.validateEvent(e,{privateData:true});for(const mutate of [x=>x.players.push(x.players[0]),x=>x.rounds[0].matches[1].a=x.rounds[0].matches[0].a,x=>x.rounds[0].matches[1].table=x.rounds[0].matches[0].table,x=>x.rounds[0].matches[0].result={a:99,b:0,minutes:null},x=>x.status='complete']){const x=C.copy(e);mutate(x);assert.throws(()=>C.validateEvent(x,{privateData:true}))}
});
test('dropped players retain history but are not paired in future Swiss rounds',()=>{const e=event(6);C.start(e,cards);finish(e);e.players[0].active=false;C.nextRound(e);assert.ok(e.rounds.at(-1).matches.every(m=>![m.a,m.b].includes('p0')));assert.equal(C.standings(e).length,6)});
test('all dictionaries have identical keys and translated nonempty values',()=>{const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../js/tournament-i18n.js'),'utf8'),c);const i=c.DKTournamentI18n;assert.deepEqual(Object.keys(i.fr),Object.keys(i.en));assert.deepEqual(Object.keys(i.fr),Object.keys(i.it));assert.ok(Object.values(i).every(d=>Object.values(d).every(v=>typeof v==='string'&&v.length)))});

test('missing decks may be submitted after launch without a fabricated waiver',()=>{const e=event(2);e.players.forEach(p=>p.waiver='');assert.doesNotThrow(()=>C.start(e,cards));assert.equal(e.status,'running')});
test('result choices automatically mirror wins, losses, draws and concessions',()=>{
  const round={bestOf:3,phase:'swiss'};let r=C.applyOutcome(round,{a:1,b:1,minutes:42.5,pointsA:70,pointsB:80},'a','conceded');
  assert.equal(C.matchOutcome(r,'a'),'conceded');assert.equal(C.matchOutcome(r,'b'),'won');assert.deepEqual([r.a,r.b],[1,2]);assert.equal(C.tournamentPoints(r,'a'),0);assert.equal(C.tournamentPoints(r,'b'),3);assert.equal(r.minutes,42.5);
  r=C.applyOutcome(round,r,'a','won');assert.equal(r.conceded,null);assert.equal(C.matchOutcome(r,'b'),'lost');assert.equal(C.tournamentPoints(r,'a'),3);
  r=C.applyOutcome(round,r,'b','draw');assert.equal(C.matchOutcome(r,'a'),'draw');assert.equal(C.tournamentPoints(r,'a'),1);assert.equal(C.tournamentPoints(r,'b'),1);
});
test('Bo1 vessel points determine a result, with concession taking precedence',()=>{
  const round={bestOf:1,phase:'swiss'};let r=C.resultFromPoints(round,{a:null,b:null,minutes:null,pointsA:90,pointsB:40});assert.deepEqual([r.a,r.b],[1,0]);
  r=C.applyOutcome(round,r,'a','conceded');r=C.resultFromPoints(round,r);assert.deepEqual([r.a,r.b],[0,1]);assert.equal(r.conceded,'a');
  const tie=C.resultFromPoints(round,{a:null,b:null,minutes:null,pointsA:0,pointsB:0});assert.deepEqual([tie.a,tie.b],[0,0]);
});
test('partial points, Bo3 totals and tied finals do not invent a result',()=>{
  const r={a:null,b:null,minutes:null,pointsA:30,pointsB:null};assert.deepEqual(C.resultFromPoints({bestOf:1,phase:'swiss'},r),r);
  const both={...r,pointsB:20};assert.deepEqual(C.resultFromPoints({bestOf:3,phase:'swiss'},both),both);
  const tie={...both,pointsB:30};assert.deepEqual(C.resultFromPoints({bestOf:1,phase:'cut'},tie),tie);assert.throws(()=>C.applyOutcome({bestOf:1,phase:'cut'},tie,'a','draw'),/noCutDraw/);
  const previousWin=C.resultFromPoints({bestOf:1,phase:'cut'},{...both,pointsB:20});const nowTied=C.resultFromPoints({bestOf:1,phase:'cut'},{...previousWin,pointsB:30});assert.equal(nowTied.a,null);assert.equal(nowTied.b,null);
});
test('point totals and conceded results round-trip through public files without changing Swiss scoring',()=>{
  const e=event(2);C.start(e,cards);const round=e.rounds[0],m=round.matches[0],r={...C.applyOutcome(round,{minutes:42.5,pointsA:100,pointsB:-10},'a','conceded')};C.setResult(e,round.id,m.id,r);
  const restored=C.validateEvent(C.publicEvent(e));assert.deepEqual(restored.rounds[0].matches[0].result,r);assert.equal(C.standings(e).find(p=>p.id===m.a).points,0);assert.equal(C.standings(e).find(p=>p.id===m.b).points,3);
});
test('invalid point values and concessions contradicting the winner are rejected',()=>{
  const e=event(2);C.start(e,cards);const r=e.rounds[0],m=r.matches[0];for(const changes of [{pointsA:1.5},{pointsB:NaN},{pointsA:100001},{conceded:'a'},{conceded:'both'}])assert.throws(()=>C.setResult(e,r.id,m.id,{a:1,b:0,minutes:null,...changes}));
});
test('independent and overlapping restriction groups enforce their own limits',()=>{const r=C.rules(),d=deck();r.restrictionGroups=[{id:'a',name:'A',cardIds:['c0','c1'],limit:1},{id:'b',name:'B',cardIds:['c1','c2','c30'],limit:1}];const v=C.validateDeck(d,r,mockCards);assert.deepEqual(v.issues.filter(i=>i.code==='restrictedCards').map(i=>i.group),['A','B']);r.restrictionGroups[0].limit=2;assert.deepEqual(C.validateDeck(d,r,mockCards).issues.filter(i=>i.code==='restrictedCards').map(i=>i.group),['B'])});
test('old event archives migrate restriction group and expected count without data loss',()=>{const e=event(5);delete e.rules.restrictionGroups;delete e.rules.expectedPlayers;e.rules.restricted=['c0','c1'];e.rules.restrictionLimit=1;const migrated=C.validateEvent(e,{privateData:true});assert.equal(migrated.rules.expectedPlayers,5);assert.deepEqual(migrated.rules.restrictionGroups[0].cardIds,['c0','c1']);assert.equal(migrated.rules.restrictionGroups[0].limit,1);assert.ok(!('restrictionGroups' in e.rules));const bad=C.copy(migrated);bad.rules.restrictionGroups.push(bad.rules.restrictionGroups[0]);assert.throws(()=>C.validateEvent(bad,{privateData:true}))});

test('regenerating only the current Swiss round includes late players and preserves all earlier results',()=>{
  const e=event(4);C.start(e,cards);finish(e);C.nextRound(e);const previous=C.copy(e.rounds[0]),latest=e.rounds.at(-1);C.setResult(e,latest.id,latest.matches[0].id,{a:1,b:0,minutes:15});latest.startedAt=new Date().toISOString();e.players.push({id:'late',name:'Late',active:true,deck:null});C.regenerateSwiss(e);
  assert.deepEqual(e.rounds[0],previous);assert.equal(e.rounds.at(-1).id,latest.id);assert.equal(latest.startedAt,null);assert.ok(latest.matches.some(m=>[m.a,m.b].includes('late')));assert.ok(latest.matches.filter(m=>m.b).every(m=>m.result===null));assert.equal(new Set(latest.matches.flatMap(m=>[m.a,m.b]).filter(Boolean)).size,5);C.validateEvent(e,{privateData:true});
  latest.phase='cut';assert.throws(()=>C.regenerateSwiss(e),/cannotRegenerate/);e.status='complete';assert.throws(()=>C.regenerateSwiss(e),/cannotRegenerate/);
});
test('the five starter choices reproduce the existing rulebook lists using known cards',()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../data/starter-decks.js'),'utf8'),ctx);assert.equal(ctx.DKTournamentStarters.length,5);for(const d of ctx.DKTournamentStarters){assert.equal(d.numbers.length,30);assert.equal(new Set(d.numbers).size,30);assert.ok(d.numbers.every(n=>context.DECKOMANTIK_CARDS.some(c=>Number(c.collectionNumber)===n)));for(const lang of ['fr','en','it'])assert.ok(d.names[lang])}
});

test('Swiss regeneration keeps the current round Bo snapshot for its bye after a future-format override',()=>{
  const e=event(3);C.start(e,cards);e.rules.bestOf=3;C.regenerateSwiss(e);assert.equal(e.rounds[0].bestOf,1);assert.equal(e.rounds[0].matches.find(m=>!m.b).result.a,1);C.validateEvent(e,{privateData:true});
});

test('address names are safe URL tokens and optional in older event files',()=>{
 assert.equal(C.eventSlug('Été / Lucca & Games 2026'),'ete-lucca-games-2026');assert.equal(C.eventSlug('***'),'tournament');assert.equal(C.eventSlug('x'.repeat(200)).length,80);const e=event(2);C.validateEvent(e,{privateData:true});for(const slug of ['../path','Bad Name','',false,'x'.repeat(101)])assert.throws(()=>C.validateEvent({...e,slug}),/badFile/);
});

test('placement matches are off by default and an enabled Top 8 places all eight players without changing Swiss points',()=>{
 assert.equal(C.rules().thirdPlace,false);assert.equal(C.rules().placementMatches,false);const e=event(8);e.rules.swissRounds=1;e.rules.topCut=8;e.rules.placementMatches=true;C.start(e,cards);finish(e);const swiss=C.standings(e).map(r=>[r.id,r.points]);C.nextRound(e);assert.equal(e.rounds.at(-1).matches.length,4);finish(e);C.nextRound(e);let r=e.rounds.at(-1);assert.equal(r.matches.length,4);assert.equal(r.matches.filter(C.isPlacement).length,2);assert.ok(r.matches.filter(C.isPlacement).every(m=>m.placement.start===5&&m.placement.size===4));finish(e);C.nextRound(e);r=e.rounds.at(-1);assert.equal(r.matches.length,4);assert.deepEqual(r.matches.filter(C.isPlacement).map(m=>m.placement.start).sort((a,b)=>a-b),[3,5,7]);finish(e);C.nextRound(e);assert.equal(e.status,'complete');assert.deepEqual(C.finalPlaces(e).map(p=>p.place),[1,2,3,4,5,6,7,8]);assert.equal(new Set(C.finalPlaces(e).map(p=>p.id)).size,8);assert.deepEqual(C.standings(e).map(r=>[r.id,r.points]),swiss);C.validateEvent(e,{privateData:true});
});
test('bulk result validation is atomic and cannot leave an incomplete round or write upstream',()=>{
 const e=event(4);C.start(e,cards);const r=e.rounds[0],updates=r.matches.map(m=>({matchId:m.id,result:{a:1,b:0,minutes:null,turns:12,pointsA:60,pointsB:30}})),before=C.copy(e);assert.throws(()=>C.setResults(e,r.id,[updates[0]]),/unfinishedRound/);assert.deepEqual(e,before);assert.throws(()=>C.setResults(e,r.id,[updates[0],{...updates[1],result:{a:7,b:0,minutes:null}}]),/badScore/);assert.deepEqual(e,before);C.setResults(e,r.id,updates);assert.ok(C.complete(r));C.nextRound(e);assert.throws(()=>C.setResults(e,r.id,updates),/downstreamRounds/);
});
test('optional gameplay turns and game-point averages preserve missing values and exclude byes',()=>{
 const e=event(5);C.start(e,cards);const r=e.rounds[0],m=r.matches.filter(m=>m.b);C.setResult(e,r.id,m[0].id,{a:1,b:0,minutes:null,turns:10,pointsA:80,pointsB:20});C.setResult(e,r.id,m[1].id,{a:0,b:1,minutes:20});const stats=C.statistics(e);assert.equal(stats.turned,1);assert.equal(stats.averageTurns,10);assert.equal(stats.scored,1);assert.equal(stats.averageGamePoints,50);assert.equal(C.publicEvent(e).rounds[0].matches.find(x=>x.id===m[0].id).result.turns,10);assert.throws(()=>C.setResult(e,r.id,m[0].id,{a:1,b:0,minutes:null,turns:-1}),/badTurns/);assert.throws(()=>C.setResult(e,r.id,m[0].id,{a:1,b:0,minutes:null,turns:1.5}),/badTurns/);
});
test('score groups are randomized while minimizing floats and avoiding every available rematch',()=>{
 let state=12345;const rng=()=>((state=(state*1664525+1013904223)>>>0)/4294967296);for(let fixture=0;fixture<20;fixture++){
  const e=event(8);e.rules.swissRounds=5;C.start(e,cards);for(let n=0;n<2;n++){const r=e.rounds.at(-1);for(const m of r.matches)C.setResult(e,r.id,m.id,{a:rng()>.3?1:0,b:0,minutes:null});if(n===0)C.nextRound(e)}
  const points=new Map(C.standings(e).map(r=>[r.id,r.points])),met=new Set(e.rounds.flatMap(r=>r.matches.map(m=>[m.a,m.b].sort().join('|'))));function best(pool){if(!pool.length)return 0;const [a,...rest]=pool;return Math.min(...rest.filter(b=>!met.has([a,b].sort().join('|'))).map(b=>Math.abs(points.get(a)-points.get(b))+best(rest.filter(id=>id!==b))))}const minimum=best(e.players.map(p=>p.id)),pairs=C.pairSwiss(e,rng);assert.ok(pairs.every(m=>!m.rematch));assert.equal(pairs.reduce((sum,m)=>sum+Math.abs(points.get(m.a)-points.get(m.b)),0),minimum);
 }
 const e=event(8),first=C.pairSwiss(e,()=>0).map(m=>[m.a,m.b].sort().join('|')).sort(),second=C.pairSwiss(e,()=>.99).map(m=>[m.a,m.b].sort().join('|')).sort();assert.notDeepEqual(first,second);
});
