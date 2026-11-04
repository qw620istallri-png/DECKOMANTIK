/* DeckomantiK — physical complete-set inventory and deck availability. */
((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.DeckomantikPhysical=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';

  const safeKey=value=>typeof value==='string'&&value.length<=200&&/^[a-z0-9][a-z0-9:_-]*$/i.test(value);
  const count=value=>Math.max(0,Math.min(99,Math.floor(Number(value)||0)));
  const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const deckKey=id=>`deck:${id}`;
  const starterKey=id=>`starter:${id}`;

  function normalize(value){
    const source=record(value),sets={},assemblies={};
    Object.entries(record(source.sets)).forEach(([id,amount])=>{if(safeKey(id)&&count(amount)>0)sets[id]=count(amount)});
    Object.entries(record(source.assemblies)).forEach(([key,entry])=>{
      if(!safeKey(key))return;
      const item=record(entry);
      const copies=count(item.copies||item.assembled);
      assemblies[key]={assembled:copies>0,copies,includeSideboard:item.includeSideboard!==false};
    });
    return {version:1,sets,assemblies};
  }

  const groupKind=group=>{
    const explicit=String(group?.kind||group?.id||'').toLowerCase();
    if(['sideboard','maybeboard'].includes(explicit))return explicit;
    const name=String(group?.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    if(name==='sideboard'||name==='sidedeck')return'sideboard';
    if(name==='maybeboard')return'maybeboard';
    return'main';
  };

  const cardCounts=ids=>{
    const result={};
    (ids||[]).forEach(id=>{if(typeof id==='string')result[id]=(result[id]||0)+1});
    return result;
  };

  function personalDefinition(deck){
    const main=[],sideboard=[];
    (deck?.groups||[]).forEach(group=>{
      const kind=groupKind(group),target=kind==='sideboard'?sideboard:kind==='maybeboard'?null:main;
      if(target)(group.cardIds||[]).forEach(id=>target.push(id));
    });
    return {key:deckKey(deck.id),kind:'deck',id:deck.id,name:deck.name||'',main,sideboard};
  }

  function starterDefinitions(starters,cards){
    const byNumber=new Map((cards||[]).map(card=>[Number(card.collectionNumber),card.id]));
    return (starters||[]).map((starter,index)=>({
      key:starterKey(starter.essence||index),kind:'starter',id:starter.essence||String(index),names:starter.names||{},main:(starter.numbers||[]).map(number=>byNumber.get(Number(number))).filter(Boolean),sideboard:[]
    }));
  }

  const requirement=(definition,includeSideboard=true)=>cardCounts([...definition.main,...(includeSideboard?definition.sideboard:[])]);
  const addCounts=(target,source)=>Object.entries(source).forEach(([id,amount])=>{target[id]=(target[id]||0)+amount});
  const multiplyCounts=(source,multiplier)=>Object.fromEntries(Object.entries(source).map(([id,amount])=>[id,amount*multiplier]));
  function buildabilityScore(result,status=result?.status){const owned=Math.max(0,Number(result?.missingOwned)||0),unowned=Math.max(0,Number(result?.missingUnowned)||0),total=Math.max(0,Number(result?.missingTotal)||owned+unowned);if(status==='ready')return[0,0,0];if(status==='missing')return unowned?[2,total,unowned]:[1,owned,total];if(status==='unfinished')return[3,total,unowned];if(status==='assembled')return[4,0,0];if(status==='conflict')return[5,total,unowned];return[6,total,unowned]}

  function analyze({cards=[],cardSets=[],physical={},decks=[],starters=[]}={}){
    const normalized=normalize(physical),definitions=[...decks.map(personalDefinition),...starterDefinitions(starters,cards)],byKey=new Map(definitions.map(item=>[item.key,item])),cardsById=new Map(cards.map(card=>[card.id,card])),owned={},reserved={},reservations={};
    cards.forEach(card=>{owned[card.id]=count(normalized.sets[card.setId||'beta'])});
    Object.entries(normalized.assemblies).forEach(([key,assembly])=>{
      const definition=byKey.get(key);if(!assembly.assembled||!definition)return;
      const copies=definition.kind==='starter'?assembly.copies:1,needed=multiplyCounts(requirement(definition,assembly.includeSideboard),copies);addCounts(reserved,needed);
      Object.entries(needed).forEach(([cardId,amount])=>{(reservations[cardId]||(reservations[cardId]=[])).push({key:definition.key,kind:definition.kind,id:definition.id,name:definition.name||'',names:definition.names||{},amount})});
    });
    const remaining={};Object.keys(owned).forEach(id=>{remaining[id]=Math.max(0,(owned[id]||0)-(reserved[id]||0))});
    const results={};
    definitions.forEach(definition=>{
      const assembly=normalized.assemblies[definition.key]||{assembled:false,copies:0,includeSideboard:true},copies=definition.kind==='starter'?assembly.copies:(assembly.assembled?1:0),baseNeeded=requirement(definition,assembly.includeSideboard),needed=copies?multiplyCounts(baseNeeded,copies):baseNeeded,missing=[];
      Object.entries(needed).forEach(([cardId,amount])=>{
        const short=assembly.assembled?Math.min(amount,Math.max(0,(reserved[cardId]||0)-(owned[cardId]||0))):Math.max(0,amount-(remaining[cardId]||0));
        if(short)missing.push({cardId,amount:short});
      });
      const missingOwned=missing.reduce((sum,item)=>sum+((normalized.sets[cardsById.get(item.cardId)?.setId||'beta']||0)>0?item.amount:0),0),missingTotal=missing.reduce((sum,item)=>sum+item.amount,0),missingUnowned=missingTotal-missingOwned;
      results[definition.key]={status:assembly.assembled?(missing.length?'conflict':'assembled'):(missing.length?'missing':'ready'),missing,missingOwned,missingUnowned,missingTotal,assembled:assembly.assembled,copies,includeSideboard:assembly.includeSideboard,definition};
    });
    const setCopies=Object.values(normalized.sets).reduce((sum,amount)=>sum+amount,0),physicalCards=cardSets.reduce((sum,set)=>sum+count(normalized.sets[set.id])*Number(set.cardCount||cards.filter(card=>(card.setId||'beta')===set.id).length),0),values=Object.values(results);
    return {physical:normalized,owned,reserved,reservations,remaining,results,definitions,summary:{setCopies,physicalCards,assembled:values.reduce((sum,item)=>sum+(item.copies||0),0),ready:values.filter(item=>item.status==='ready').length}};
  }

  return {normalize,deckKey,starterKey,personalDefinition,starterDefinitions,requirement,buildabilityScore,analyze};
});
