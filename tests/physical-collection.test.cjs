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
  assert.deepEqual(Physical.normalize({sets:{beta:2,bad:-3},assemblies:{'deck:a':{assembled:true,includeSideboard:false}}}),{version:1,sets:{beta:2},assemblies:{'deck:a':{assembled:true,includeSideboard:false}}});
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
  const withoutSide=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'deck:a':{assembled:true,includeSideboard:false}}},decks:[first,second]});
  assert.equal(withoutSide.results['deck:b'].status,'ready');
});

test('official starter decks reserve cards without becoming personal decks',()=>{
  const starters=[{essence:'green',names:{fr:'Vert'},numbers:[1,2]}],candidate=deck('custom',['beta-2']);
  const result=Physical.analyze({cards,cardSets:sets,physical:{sets:{beta:1},assemblies:{'starter:green':{assembled:true}}},decks:[candidate],starters});
  assert.equal(result.definitions.filter(item=>item.kind==='starter').length,1);
  assert.equal(result.results['starter:green'].status,'assembled');
  assert.equal(result.results['deck:custom'].status,'missing');
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
