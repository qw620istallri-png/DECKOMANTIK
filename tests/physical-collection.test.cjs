const test=require('node:test');
const assert=require('node:assert/strict');
const Physical=require('../js/physical-collection.js');

const cards=[
  {id:'beta-1',setId:'beta',collectionNumber:1},
  {id:'beta-2',setId:'beta',collectionNumber:2},
  {id:'desert-1',setId:'inner-deserts',collectionNumber:301}
];
const sets=[{id:'beta',cardCount:2},{id:'inner-deserts',cardCount:1}];
const deck=(id,main=['beta-1'],sideboard=[])=>({id,name:id,groups:[{id:'manifestations',cardIds:main},{id:'sideboard',kind:'sideboard',cardIds:sideboard},{id:'maybeboard',kind:'maybeboard',cardIds:['desert-1']}]});

test('normalization keeps complete-set counts and deck preferences bounded',()=>{
  assert.deepEqual(Physical.normalize({sets:{beta:2,bad:-3},assemblies:{'deck:a':{assembled:true,includeSideboard:false,withdrawn:{'beta-1':1,bad:-2}}}}),{version:2,sets:{beta:2},assemblies:{'deck:a':{assembled:true,copies:1,includeSideboard:false,withdrawn:{'beta-1':1}}}});
});

test('one set copy provides one copy of every card in that set',()=>{
  const result=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:2,'inner-deserts':1}},decks:[]});
  assert.equal(result.owned['beta-1'],2);assert.equal(result.owned['beta-2'],2);assert.equal(result.owned['desert-1'],1);
  assert.deepEqual(result.summary,{setCopies:3,physicalCards:5,assembled:0,ready:0});
});

test('assembled decks reserve main cards and optionally their sideboard',()=>{
  const first=deck('a',['beta-1'],['beta-2']),second=deck('b',['beta-2']);
  const withSide=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'deck:a':{assembled:true,includeSideboard:true}}},decks:[first,second]});
  assert.equal(withSide.results['deck:b'].status,'missing');
  assert.deepEqual(withSide.reservations['beta-2'],[{key:'deck:a',kind:'deck',id:'a',name:'a',names:{},amount:1}]);
  const withoutSide=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'deck:a':{assembled:true,includeSideboard:false}}},decks:[first,second]});
  assert.equal(withoutSide.results['deck:b'].status,'ready');
  assert.equal(withoutSide.reservations['beta-2'],undefined);
});

test('official starter decks reserve cards without becoming personal decks',()=>{
  const starters=[{essence:'green',names:{fr:'Vert'},numbers:[1,2]}],candidate=deck('custom',['beta-2']);
  const result=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'starter:green':{assembled:true}}},decks:[candidate],starters});
  assert.equal(result.definitions.filter(item=>item.kind==='starter').length,1);
  assert.equal(result.results['starter:green'].status,'assembled');
  assert.equal(result.results['deck:custom'].status,'missing');
  assert.equal(result.reservations['beta-2'][0].names.fr,'Vert');
});

test('multiple copies of a starter reserve every card once per crafted copy',()=>{
  const starters=[{essence:'green',names:{fr:'Vert'},numbers:[1,2]}];
  const result=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:2},assemblies:{'starter:green':{copies:2}}},starters});
  assert.equal(result.results['starter:green'].copies,2);
  assert.equal(result.results['starter:green'].status,'assembled');
  assert.equal(result.reserved['beta-1'],2);
  assert.equal(result.reservations['beta-2'][0].amount,2);
  const conflict=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'starter:green':{copies:2}}},starters});
  assert.equal(conflict.results['starter:green'].status,'conflict');
  assert.deepEqual(conflict.results['starter:green'].missing,[{cardId:'beta-1',amount:1},{cardId:'beta-2',amount:1}]);
});

test('an edited assembled deck stays assembled and reports a conflict',()=>{
  const result=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'deck:a':{assembled:true},'deck:b':{assembled:true}}},decks:[deck('a'),deck('b')]});
  assert.equal(result.results['deck:a'].status,'conflict');
  assert.equal(result.results['deck:b'].status,'conflict');
  assert.deepEqual(result.results['deck:a'].missing,[{cardId:'beta-1',amount:1}]);
});

test('ready means each candidate is buildable from the same remaining pool',()=>{
  const result=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1}},decks:[deck('a'),deck('b')]});
  assert.equal(result.results['deck:a'].status,'ready');
  assert.equal(result.results['deck:b'].status,'ready');
  assert.equal(result.summary.ready,2);
});

test('buildability scores prefer owned-set shortages before missing sets',()=>{
  const holder=deck('holder',['beta-1']),ownedShortage=deck('owned-shortage',['beta-1']),missingSet=deck('missing-set',['desert-1']),mixed=deck('mixed',['beta-1','desert-1']);
  const result=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'deck:holder':{assembled:true}}},decks:[holder,ownedShortage,missingSet,mixed]});
  assert.deepEqual([result.results['deck:owned-shortage'].missingOwned,result.results['deck:owned-shortage'].missingUnowned,result.results['deck:owned-shortage'].missingTotal],[1,0,1]);
  assert.deepEqual([result.results['deck:missing-set'].missingOwned,result.results['deck:missing-set'].missingUnowned,result.results['deck:missing-set'].missingTotal],[0,1,1]);
  assert.deepEqual([result.results['deck:mixed'].missingOwned,result.results['deck:mixed'].missingUnowned,result.results['deck:mixed'].missingTotal],[1,1,2]);
  assert.deepEqual(Physical.buildabilityScore(result.results['deck:owned-shortage']),[1,1,1]);
  assert.deepEqual(Physical.buildabilityScore(result.results['deck:missing-set']),[2,1,1]);
  assert.deepEqual(Physical.buildabilityScore(result.results['deck:mixed']),[2,2,1]);
});

test('a physical card can move atomically from one assembled deck to another',()=>{
  const donor=deck('donor',['beta-1']),target=deck('target',['beta-1']),before=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'deck:donor':{assembled:true}}},decks:[donor,target]});
  const plan=Physical.assemblyPlan(before,'deck:target',{copies:1});
  assert.equal(plan.blocked,false);
  assert.deepEqual(plan.items,[{cardId:'beta-1',amount:1,options:[{key:'deck:donor',amount:1,kind:'deck',id:'donor',name:'donor',names:{}}]}]);
  const physical=Physical.applyAssemblyPlan(before.physical,plan,[{cardId:'beta-1',key:'deck:donor'}]),after=Physical.analyze({cards,cardSets:sets,physical,decks:[donor,target]});
  assert.equal(after.results['deck:target'].status,'assembled');
  assert.equal(after.results['deck:donor'].status,'incomplete');
  assert.deepEqual(after.results['deck:donor'].missing,[{cardId:'beta-1',amount:1}]);
  assert.equal(after.reservations['beta-1'][0].key,'deck:target');
});

test('forced assembly stays blocked when no physical copy exists',()=>{
  const target=deck('target',['desert-1']),analysis=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1}},decks:[target]}),plan=Physical.assemblyPlan(analysis,'deck:target',{copies:1});
  assert.equal(plan.blocked,true);
  assert.deepEqual(plan.items,[{cardId:'desert-1',amount:1,options:[]}]);
  assert.throws(()=>Physical.applyAssemblyPlan(analysis.physical,plan,[]),/assemblyBlocked/);
});

test('every missing copy must select a donor with enough capacity',()=>{
  const first=deck('first',['beta-1']),second=deck('second',['beta-1']),target=deck('target',['beta-1','beta-1']),analysis=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:2},assemblies:{'deck:first':{assembled:true},'deck:second':{assembled:true}}},decks:[first,second,target]}),plan=Physical.assemblyPlan(analysis,'deck:target',{copies:1});
  assert.equal(plan.items[0].amount,2);
  assert.throws(()=>Physical.applyAssemblyPlan(analysis.physical,plan,[{cardId:'beta-1',key:'deck:first'},{cardId:'beta-1',key:'deck:first'}]),/transferCapacity/);
  const moved=Physical.applyAssemblyPlan(analysis.physical,plan,[{cardId:'beta-1',key:'deck:first'},{cardId:'beta-1',key:'deck:second'}]);
  const after=Physical.analyze({cards,cardSets:sets,physical:moved,decks:[first,second,target]});
  assert.equal(after.results['deck:target'].status,'assembled');
  assert.equal(after.results['deck:first'].status,'incomplete');
  assert.equal(after.results['deck:second'].status,'incomplete');
});
