/* Tournament rules and pairings. No browser state: shared by the UI and node tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DKTournament=api})(globalThis,()=>{
  'use strict';
  const VERSION=1;
  const SOURCE='https://www.kartomantik.com/en/news/Official_Kartomantik_Tournament_%E2%80%94_Lucca_Comics_&_Games_2026';
  const BANNED=['e1zg2gsn0tfqo1y_en','b6ebpyb30urtas2_en','q6rha5kz42bkxle_en'];
  const RESTRICTED=['ryg8e3lgopl6z52_en','zni76s4aabicqag_en','3gqrmx5jegwz8kb_en'];
  const copy=value=>JSON.parse(JSON.stringify(value));
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const assert=(ok,code)=>{if(!ok)throw new Error(code)};
  const recommended=n=>({swissRounds:n<4?Math.max(1,Math.ceil(Math.log2(Math.max(2,n)))):n<=8?3:n<=16?4:n<=32?5:Math.ceil(Math.log2(n)),topCut:n<=8?0:n<=16?4:8});
  function rules(preset='standard'){
    const expectedPlayers=preset==='lucca'?16:8;
    return {expectedPlayers,...recommended(expectedPlayers),autoRounds:true,autoCut:true,bestOf:1,studyMinutes:5,playMinutes:50,firstTable:1,thirdPlace:false,placementMatches:false,publicDecks:true,mainSize:30,maxPoints:500,sideSize:6,banned:preset==='lucca'?[...BANNED]:[],restrictionGroups:preset==='lucca'?[{id:uid(),name:'Lucca 2026',cardIds:[...RESTRICTED],limit:1}]:[],source:preset==='lucca'?SOURCE:''};
  }
  // Accept the first tournament archive format without discarding existing event settings.
  function restrictionGroups(r){return Array.isArray(r.restrictionGroups)?r.restrictionGroups:(r.restricted?.length?[{id:'legacy-restriction',name:'',cardIds:[...r.restricted],limit:r.restrictionLimit??1}]:[])}
  const eventSlug=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80).replace(/-$/,'')||'tournament';
  function createEvent(name,preset='standard'){
    return {id:uid(),version:VERSION,revision:0,name:String(name||'').trim().slice(0,160),date:'',venue:'',archivedAt:'',status:'draft',rules:rules(preset),players:[],rounds:[],audit:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  }
  const kind=group=>{
    if(['maybeboard','sideboard'].includes(group.kind)||['maybeboard','sideboard'].includes(group.id))return group.kind||group.id;
    const name=String(group.name||'').toLowerCase();
    return /^(maybeboard|peut.être|forse)$/.test(name)?'maybeboard':/^(sideboard|réserve|reserve|riserva)$/.test(name)?'sideboard':'main';
  };
  function deckIds(deck,section='main'){
    return (deck?.groups||[]).filter(g=>section==='all'?kind(g)!=='maybeboard':kind(g)===section).flatMap(g=>g.cardIds||[]);
  }
  function validateDeck(deck,r,cardMap){
    const main=deckIds(deck),side=deckIds(deck,'sideboard'),all=[...main,...side],issues=[];
    const known=all.map(id=>cardMap.get(id)),points=main.reduce((sum,id)=>sum+(Number(cardMap.get(id)?.points)||0),0);
    if(!deck)issues.push({code:'missingDeck'});
    if(main.length!==r.mainSize)issues.push({code:'deckSize',value:main.length,limit:r.mainSize});
    if(side.length>r.sideSize)issues.push({code:'sideSize',value:side.length,limit:r.sideSize});
    if(points>r.maxPoints)issues.push({code:'deckPoints',value:points,limit:r.maxPoints});
    if(known.some(c=>!c))issues.push({code:'unknownCards'});
    const names=known.filter(Boolean).map(c=>c.name.toLowerCase());
    if(new Set(all).size!==all.length||new Set(names).size!==names.length)issues.push({code:'singleton'});
    const banned=all.filter(id=>r.banned.includes(id));
    if(banned.length)issues.push({code:'bannedCards',ids:[...new Set(banned)]});
    for(const group of restrictionGroups(r)){
      const restricted=main.filter(id=>group.cardIds.includes(id));
      if(restricted.length>group.limit)issues.push({code:'restrictedCards',ids:restricted,limit:group.limit,group:group.name});
    }
    return {valid:issues.length===0,issues,points,count:main.length,sideCount:side.length};
  }
  function standings(event){
    const rows=event.players.map((p,index)=>({id:p.id,name:p.name,seed:p.seed??index,points:0,wins:0,draws:0,losses:0,gameWins:0,gameLosses:0,opponents:[],byes:0,played:0}));
    const map=new Map(rows.map(r=>[r.id,r]));
    for(const round of event.rounds.filter(r=>r.phase==='swiss'))for(const match of round.matches){
      const a=map.get(match.a),b=map.get(match.b);if(!match.result||!a)continue;
      a.played++;if(!b){a.points+=3;a.wins++;a.byes++;continue}
      b.played++;a.opponents.push(b.id);b.opponents.push(a.id);
      const {a:sa,b:sb}=match.result;a.gameWins+=sa;a.gameLosses+=sb;b.gameWins+=sb;b.gameLosses+=sa;
      if(sa===sb){a.points++;b.points++;a.draws++;b.draws++}else{const winner=sa>sb?a:b,loser=sa>sb?b:a;winner.points+=3;winner.wins++;loser.losses++}
    }
    rows.forEach(r=>{r.buchholz=r.opponents.reduce((sum,id)=>sum+map.get(id).points,0);r.gameDiff=r.gameWins-r.gameLosses});
    rows.sort((a,b)=>b.points-a.points||b.buchholz-a.buchholz||b.gameDiff-a.gameDiff||a.seed-b.seed);
    return rows.map((r,index)=>({...r,rank:index+1}));
  }
  function pairSwiss(event,random=Math.random){
    const ranked=standings(event).filter(r=>event.players.find(p=>p.id===r.id).active!==false);assert(ranked.length>=2,'needPlayers');
    const drawn=[...ranked];for(let i=drawn.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[drawn[i],drawn[j]]=[drawn[j],drawn[i]]}drawn.sort((a,b)=>b.points-a.points);
    const drawOrder=new Map(drawn.map((r,i)=>[r.id,i])),met=new Set(event.rounds.filter(r=>r.phase==='swiss').flatMap(r=>r.matches.filter(m=>m.b).map(m=>[m.a,m.b].sort().join('|')))),seen=(a,b)=>met.has([a.id,b.id].sort().join('|'));
    const gap=(a,b)=>Math.abs(a.points-b.points),lowerBound=pool=>{const scores=pool.map(r=>r.points).sort((a,b)=>b-a);let total=0;for(let i=0;i<scores.length;i+=2)total+=scores[i]-scores[i+1];return total};
    const byes=ranked.length%2?[...ranked].sort((a,b)=>a.byes-b.byes||a.points-b.points||b.rank-a.rank):[null],minimumByes=byes[0]?.byes;
    let bye=byes[0],pairs=null,chosenPool=[];
    for(const candidate of byes){
      if(candidate&&candidate.byes!==minimumByes)break;
      const rows=drawn.filter(r=>r!==candidate);let budget=60000;const failed=new Set();
      function search(pool){
        if(!pool.length)return [];if(--budget<0)return null;
        const key=pool.map(r=>r.id).sort().join('|');if(failed.has(key))return null;
        let first=pool[0],fewest=Infinity;for(const row of pool){const n=pool.filter(other=>other!==row&&!seen(row,other)).length;if(!n)return null;if(n<fewest){first=row;fewest=n}}
        const options=pool.filter(r=>r!==first&&!seen(first,r)).sort((a,b)=>gap(first,a)-gap(first,b)||drawOrder.get(a.id)-drawOrder.get(b.id));
        for(const other of options){const rest=search(pool.filter(r=>r!==first&&r!==other));if(rest)return [[first,other],...rest]}
        if(budget>=0)failed.add(key);return null;
      }
      pairs=search(rows);if(pairs){bye=candidate;chosenPool=rows;break}
    }
    if(pairs){
      // Keep the non-repeat matching, then minimize score-group floats. Pairings never alter standings.
      let best=pairs,bestGap=pairs.reduce((sum,[a,b])=>sum+gap(a,b),0),budget=30000;const visited=new Map(),minimum=lowerBound(chosenPool);
      function improve(pool,built,cost){
        if(bestGap===minimum||--budget<0||cost+lowerBound(pool)>=bestGap)return;
        if(!pool.length){best=built;bestGap=cost;return}
        const key=pool.map(r=>r.id).sort().join('|');if((visited.get(key)??Infinity)<=cost)return;visited.set(key,cost);
        const first=pool[0],options=pool.slice(1).filter(r=>!seen(first,r)).sort((a,b)=>gap(first,a)-gap(first,b)||drawOrder.get(a.id)-drawOrder.get(b.id));
        for(const other of options)improve(pool.filter(r=>r!==first&&r!==other),[...built,[first,other]],cost+gap(first,other));
      }
      improve(chosenPool,[],0);pairs=best;
    }else{
      // Small/exhausted fields may require a rematch; it is explicitly marked for organizer review.
      const pool=drawn.filter(r=>r!==bye);pairs=[];while(pool.length){const first=pool.shift();pool.sort((a,b)=>Number(seen(first,a))-Number(seen(first,b))||gap(first,a)-gap(first,b)||drawOrder.get(a.id)-drawOrder.get(b.id));pairs.push([first,pool.shift()])}
    }
    pairs.sort((a,b)=>Math.min(a[0].rank,a[1].rank)-Math.min(b[0].rank,b[1].rank));
    const matches=pairs.map(([a,b],i)=>({id:uid(),a:a.id,b:b.id,table:event.rules.firstTable+i,result:null,rematch:seen(a,b)}));
    if(bye)matches.push({id:uid(),a:bye.id,b:null,table:null,result:{a:Math.ceil(event.rules.bestOf/2),b:0,minutes:null}});return matches;
  }
  const complete=round=>round.matches.every(m=>m.result);
  const winner=match=>!match.b||match.result.a>match.result.b?match.a:match.b;
  const loser=match=>winner(match)===match.a?match.b:match.a;
  const isPlacement=match=>Boolean(match.bronze||match.placement);
  function nextRound(event){
    assert(event.status!=='complete','eventComplete');
    const last=event.rounds.at(-1);assert(!last||complete(last),'unfinishedRound');
    if(last&&!last.endedAt)last.endedAt=new Date().toISOString();
    const swiss=event.rounds.filter(r=>r.phase==='swiss').length;
    let matches,phase='swiss',number=swiss+1;
    if(swiss<event.rules.swissRounds)matches=pairSwiss(event);
    else if(event.rules.topCut===0){event.status='complete';return null}
    else{
      phase='cut';number=event.rounds.filter(r=>r.phase==='cut').length+1;
      if(!last||last.phase==='swiss'){
        const ranked=standings(event).filter(r=>event.players.find(p=>p.id===r.id).active!==false).slice(0,event.rules.topCut);
        assert(ranked.length===event.rules.topCut,'cutTooLarge');
        const bracket=event.rules.topCut===8?[0,7,3,4,1,6,2,5]:event.rules.topCut===4?[0,3,1,2]:[0,1];
        matches=[];for(let i=0;i<bracket.length;i+=2)matches.push({a:ranked[bracket[i]].id,b:ranked[bracket[i+1]].id});
      }else{
        const main=last.matches.filter(m=>!isPlacement(m));
        if(main.length===1){event.status='complete';return null}
        matches=[];for(let i=0;i<main.length;i+=2)matches.push({a:winner(main[i]),b:winner(main[i+1])});
        if(event.rules.placementMatches){
          const addPairs=(ids,start,size)=>{for(let i=0;i<ids.length;i+=2)matches.push({a:ids[i],b:ids[i+1],placement:{start,size},...(start===3&&size===2?{bronze:true}:{})})};
          addPairs(main.map(loser),main.length+1,main.length);
          const groups=new Map();for(const m of last.matches.filter(m=>m.placement)){const key=m.placement.start+':'+m.placement.size;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m)}
          for(const group of groups.values()){const {start,size}=group[0].placement;if(size>2){addPairs(group.map(winner),start,size/2);addPairs(group.map(loser),start+size/2,size/2)}}
        }else if(main.length===2&&event.rules.thirdPlace)matches.push({a:loser(main[0]),b:loser(main[1]),bronze:true});
      }
      matches=matches.map((m,i)=>({...m,id:uid(),table:event.rules.firstTable+i,result:null}));
    }
    const round={id:uid(),phase,number,bestOf:event.rules.bestOf,studyMinutes:event.rules.studyMinutes,playMinutes:event.rules.playMinutes,startedAt:null,pausedAt:null,pauseMs:0,matches};
    event.rounds.push(round);event.status='running';return round;
  }
  function regenerateSwiss(event){
    const round=event.rounds.at(-1);assert(event.status==='running'&&round?.phase==='swiss','cannotRegenerate');
    const previous=copy(event);previous.rounds.pop();previous.rules.bestOf=round.bestOf;
    round.matches=pairSwiss(previous);round.startedAt=null;round.pausedAt=null;round.pauseMs=0;delete round.endedAt;
    return round;
  }
  function start(event,cardMap){
    assert(event.status==='draft','locked');assert(event.name.trim(),'needName');
    const active=event.players.filter(p=>p.active!==false);assert(active.length>=2,'needPlayers');
    assert(active.every(p=>!p.deck||validateDeck(p.deck,event.rules,cardMap).valid||p.waiver?.trim()),'invalidDecks');
    assert(event.rules.topCut<=active.length,'cutTooLarge');
    const shuffled=[...active];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}shuffled.forEach((p,i)=>p.seed=i);
    return nextRound(event);
  }
  function validateResult(round,match,result){
    const target=Math.ceil(round.bestOf/2);
    assert(result&&Number.isInteger(result.a)&&Number.isInteger(result.b)&&result.a>=0&&result.b>=0&&result.a<=target&&result.b<=target,'badScore');
    assert(!(result.a===target&&result.b===target),'badScore');
    assert(round.phase!=='cut'||result.a!==result.b,'noCutDraw');
    assert(result.minutes===null||typeof result.minutes==='number'&&Number.isFinite(result.minutes)&&result.minutes>=0&&result.minutes<=1440,'badTime');
    assert(result.turns===undefined||result.turns===null||Number.isInteger(result.turns)&&result.turns>=0&&result.turns<=10000,'badTurns');
    for(const points of [result.pointsA,result.pointsB])assert(points===undefined||points===null||Number.isInteger(points)&&points>=-100000&&points<=100000,'badMatchPoints');
    assert(result.conceded===undefined||result.conceded===null||['a','b'].includes(result.conceded),'badScore');
    if(result.conceded)assert(result.conceded==='a'?result.a<result.b:result.b<result.a,'badScore');
    assert(match.b,'byeLocked');
  }
  function matchOutcome(result,side){if(!result)return 'pending';if(result.conceded===side)return 'conceded';const own=result[side],other=result[side==='a'?'b':'a'];return own===other?'draw':own>other?'won':'lost'}
  function tournamentPoints(result,side){const outcome=matchOutcome(result,side);return outcome==='won'?3:outcome==='draw'?1:0}
  function applyOutcome(round,result,side,outcome){
    assert(['a','b'].includes(side)&&['won','lost','draw','conceded'].includes(outcome),'badScore');
    assert(outcome!=='draw'||round.phase==='swiss','noCutDraw');
    const next={minutes:null,...result},target=Math.ceil(round.bestOf/2),other=side==='a'?'b':'a';
    next.conceded=outcome==='conceded'?side:null;
    if(outcome==='draw'){next.a=next.b=Math.min(Number(next.a)||0,Number(next.b)||0,target-1)}
    else{const winning=outcome==='won'?side:other,losing=winning==='a'?'b':'a';next[winning]=target;next[losing]=Math.max(0,Math.min(Number(next[losing])||0,target-1))}
    return next;
  }
  function resultFromPoints(round,result){
    if(round.bestOf!==1||result.conceded||!Number.isInteger(result.pointsA)||!Number.isInteger(result.pointsB))return result;
    if(result.pointsA===result.pointsB&&round.phase==='cut')return {...result,a:null,b:null};
    return applyOutcome(round,result,'a',result.pointsA===result.pointsB?'draw':result.pointsA>result.pointsB?'won':'lost');
  }
  function setResult(event,roundId,matchId,result){
    const round=event.rounds.find(r=>r.id===roundId),match=round?.matches.find(m=>m.id===matchId);assert(match,'badFile');
    assert(event.rounds.at(-1)===round,'downstreamRounds');validateResult(round,match,result);match.result={...result};
  }
  function setResults(event,roundId,updates){
    const round=event.rounds.find(r=>r.id===roundId);assert(round&&event.rounds.at(-1)===round,'downstreamRounds');assert(Array.isArray(updates),'badFile');
    const ids=new Set();for(const update of updates){const match=round.matches.find(m=>m.id===update.matchId);assert(match&&!ids.has(match.id),'badFile');ids.add(match.id);validateResult(round,match,update.result)}
    assert(round.matches.every(m=>m.result||ids.has(m.id)),'unfinishedRound');for(const update of updates)round.matches.find(m=>m.id===update.matchId).result=copy(update.result);
  }
  function publicEvent(event){
    return {version:VERSION,id:event.id,...(event.slug?{slug:event.slug}:{}),revision:event.revision,name:event.name,date:event.date,venue:event.venue,status:event.status,rules:copy(event.rules),updatedAt:event.updatedAt,players:event.players.map(p=>({id:p.id,name:p.name,active:p.active,seed:p.seed,...(event.rules.publicDecks&&p.deck?{deck:copy(p.deck)}:{})})),rounds:copy(event.rounds)};
  }
  function finalPlaces(event){
    const cut=event.rounds.filter(r=>r.phase==='cut'),last=cut.at(-1),main=last?.matches.filter(m=>!isPlacement(m))||[];
    if(main.length!==1||!complete(last))return [];
    const final=main[0],result=[{id:winner(final),place:1},{id:loser(final),place:2}];
    for(const m of last.matches){const place=m.placement?.size===2?m.placement.start:m.bronze&&!m.placement?3:null;if(place)result.push({id:winner(m),place},{id:loser(m),place:place+1})}
    return result.sort((a,b)=>a.place-b.place);
  }
  function statistics(event){
    const matches=event.rounds.flatMap(r=>r.matches.filter(m=>m.b&&m.result)),timed=matches.filter(m=>m.result.minutes!==null),turned=matches.filter(m=>Number.isInteger(m.result.turns)),scored=matches.filter(m=>Number.isInteger(m.result.pointsA)&&Number.isInteger(m.result.pointsB)),frequency=new Map(),decks=event.players.filter(p=>p.deck);
    for(const p of decks)for(const id of new Set(deckIds(p.deck)))frequency.set(id,(frequency.get(id)||0)+1);
    return {turned:turned.length,averageTurns:turned.length?turned.reduce((n,m)=>n+m.result.turns,0)/turned.length:null,scored:scored.length,averageGamePoints:scored.length?scored.reduce((n,m)=>n+m.result.pointsA+m.result.pointsB,0)/(scored.length*2):null,matches:matches.length,draws:matches.filter(m=>m.result.a===m.result.b).length,timed:timed.length,averageMinutes:timed.length?timed.reduce((n,m)=>n+m.result.minutes,0)/timed.length:null,decks:decks.length,frequency:[...frequency].map(([id,count])=>({id,count,percent:count/decks.length*100})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)),standings:standings(event),podium:finalPlaces(event)};
  }
  function validateEvent(e,{privateData=false}={}){
    e=copy(e);
    const str=(s,n)=>typeof s==='string'&&s.length<=n,num=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
    assert(e&&e.version===VERSION&&str(e.id,100)&&e.id.length&&str(e.name,160)&&str(e.date,32)&&str(e.venue,240)&&num(e.revision,0,1e9)&&['draft','running','complete'].includes(e.status),'badFile');
    assert(e.slug===undefined||str(e.slug,100)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug),'badFile');
    assert(str(e.updatedAt,40)&&Number.isFinite(Date.parse(e.updatedAt)),'badFile');
    assert(e.archivedAt===undefined||e.archivedAt===''||str(e.archivedAt,40)&&Number.isFinite(Date.parse(e.archivedAt)),'badFile');
    const r=e.rules;
    assert(r&&num(r.swissRounds,1,20)&&[0,2,4,8].includes(r.topCut)&&[1,3,5].includes(r.bestOf)&&num(r.studyMinutes,0,120)&&num(r.playMinutes,1,600)&&num(r.firstTable,1,9999)&&num(r.mainSize,1,100)&&num(r.maxPoints,0,10000)&&num(r.sideSize,0,100),'badFile');
    if(r.placementMatches===undefined)r.placementMatches=false;assert(typeof r.placementMatches==='boolean','badFile');
    if(r.expectedPlayers===undefined)r.expectedPlayers=Math.max(2,e.players?.length||8);
    assert(num(r.expectedPlayers,2,256),'badFile');
    if(r.restrictionGroups===undefined){assert(Array.isArray(r.restricted)&&num(r.restrictionLimit,0,100),'badFile');r.restrictionGroups=restrictionGroups(r)}
    const groupIds=new Set();assert(Array.isArray(r.banned)&&r.banned.length<=2000&&r.banned.every(id=>str(id,120))&&Array.isArray(r.restrictionGroups)&&r.restrictionGroups.length<=40,'badFile');
    for(const g of r.restrictionGroups){assert(g&&str(g.id,100)&&g.id&&!groupIds.has(g.id)&&str(g.name,100)&&num(g.limit,0,100)&&Array.isArray(g.cardIds)&&g.cardIds.length<=2000&&g.cardIds.every(id=>str(id,120)),'badFile');groupIds.add(g.id)}
    assert(Array.isArray(e.players)&&e.players.length<=256&&Array.isArray(e.rounds)&&e.rounds.length<=30,'badFile');
    const ids=new Set();for(const p of e.players){assert(p&&str(p.id,100)&&p.id&&!ids.has(p.id)&&str(p.name,100)&&p.name.trim(),'badFile');ids.add(p.id);if(p.deck){assert(str(p.deck.name,200)&&Array.isArray(p.deck.groups)&&p.deck.groups.length<=64,'badFile');for(const g of p.deck.groups)assert(g&&str(g.name,200)&&(!g.kind||str(g.kind,40))&&(!g.id||str(g.id,120))&&Array.isArray(g.cardIds)&&g.cardIds.length<=500&&g.cardIds.every(id=>str(id,120)),'badFile')}if(privateData){assert(!p.waiver||str(p.waiver,1000),'badFile');assert(p.notes===undefined||str(p.notes,8000),'badFile');assert(p.penalties===undefined||Array.isArray(p.penalties)&&p.penalties.length<=200,'badFile');const penaltyIds=new Set();for(const penalty of p.penalties||[]){assert(penalty&&str(penalty.id,100)&&penalty.id&&!penaltyIds.has(penalty.id)&&str(penalty.at,40)&&Number.isFinite(Date.parse(penalty.at))&&str(penalty.reason,1000)&&penalty.reason.trim(),'badFile');penaltyIds.add(penalty.id);if(penalty.voidedAt!==undefined)assert(str(penalty.voidedAt,40)&&Number.isFinite(Date.parse(penalty.voidedAt))&&str(penalty.voidReason,1000)&&penalty.voidReason.trim(),'badFile')}}else{delete p.notes;delete p.penalties}}
    const roundIds=new Set(),matchIds=new Set();
    for(const round of e.rounds){
      assert(round&&str(round.id,100)&&!roundIds.has(round.id)&&['swiss','cut'].includes(round.phase)&&num(round.number,1,30)&&[1,3,5].includes(round.bestOf)&&num(round.studyMinutes,0,120)&&num(round.playMinutes,1,600)&&Array.isArray(round.matches)&&round.matches.length>0&&round.matches.length<=128,'badFile');roundIds.add(round.id);assert(round.extraMinutes===undefined||num(round.extraMinutes,0,600),'badFile');
      assert((round.startedAt===null||str(round.startedAt,40)&&Number.isFinite(Date.parse(round.startedAt)))&&(round.pausedAt===null||str(round.pausedAt,40)&&Number.isFinite(Date.parse(round.pausedAt)))&&Number.isFinite(round.pauseMs)&&round.pauseMs>=0,'badFile');
      assert(round.endedAt===undefined||round.endedAt===null||str(round.endedAt,40)&&Number.isFinite(Date.parse(round.endedAt)),'badFile');
      const seated=new Set(),tables=new Set();for(const m of round.matches){if(m?.placement)assert(round.phase==='cut'&&num(m.placement.start,3,7)&&[2,4].includes(m.placement.size)&&m.placement.start+m.placement.size<=9,'badFile');assert(m&&str(m.id,100)&&!matchIds.has(m.id)&&ids.has(m.a)&&!seated.has(m.a)&&(m.b===null||ids.has(m.b)&&m.b!==m.a&&!seated.has(m.b))&&(m.b===null?m.table===null:num(m.table,1,9999)&&!tables.has(m.table)),'badFile');assert(m.extraMinutes===undefined||num(m.extraMinutes,0,600),'badFile');matchIds.add(m.id);seated.add(m.a);if(m.b){seated.add(m.b);tables.add(m.table);if(m.result)validateResult(round,m,m.result)}else assert(round.phase==='swiss'&&m.result&&m.result.a===Math.ceil(round.bestOf/2)&&m.result.b===0&&m.result.minutes===null,'badFile')}
    }
    assert(e.status==='draft'?e.rounds.length===0:e.rounds.length>0,'badFile');
    assert(e.rounds.slice(0,-1).every(complete)&&(e.status!=='complete'||e.rounds.every(complete)),'badFile');
    if(privateData)assert(Array.isArray(e.audit)&&e.audit.length<=2000&&e.audit.every(a=>a&&str(a.at,40)&&str(a.action,120)&&str(a.reason,1000)),'badFile');
    return copy(e);
  }
  return {VERSION,SOURCE,BANNED,RESTRICTED,copy,uid,assert,recommended,rules,restrictionGroups,eventSlug,createEvent,kind,deckIds,validateDeck,standings,pairSwiss,regenerateSwiss,complete,winner,isPlacement,nextRound,start,setResult,setResults,matchOutcome,tournamentPoints,applyOutcome,resultFromPoints,publicEvent,finalPlaces,statistics,validateEvent};
});
