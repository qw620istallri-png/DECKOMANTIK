(function(root){
  'use strict';
  const C=root.DKTournament,PREFIX='deckomantik-tournament-v1:',PUBLIC='deckomantik-tournament-public-v1:';
  const keys=prefix=>Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter(k=>k?.startsWith(prefix));
  const read=(id,privateData=true)=>{const raw=localStorage.getItem((privateData?PREFIX:PUBLIC)+id);return raw?C.validateEvent(JSON.parse(raw),{privateData}):null};
  const list=()=>keys(PREFIX).map(k=>read(k.slice(PREFIX.length))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const lock=fn=>navigator.locks?.request?navigator.locks.request('deckomantik-tournament-write',fn):Promise.resolve().then(fn);
  const catalog=()=>[...list(),...keys(PUBLIC).map(k=>read(k.slice(PUBLIC.length),false))];
  function uniqueSlug(preferred,used){let candidate=preferred,n=2;while(used.has(candidate)){const suffix='-'+n++;candidate=preferred.slice(0,100-suffix.length).replace(/-$/,'')+suffix;}return candidate}
  function allocateSlug(event,entries=catalog(),preferred=event.slug||C.eventSlug(event.name)){const others=entries.filter(e=>e.id!==event.id),used=new Set(others.flatMap(e=>[e.slug,e.id]).filter(Boolean));return uniqueSlug(preferred,used)}
  function resolve(reference,privateData=true){return read(reference,privateData)||keys(privateData?PREFIX:PUBLIC).map(k=>read(k.slice((privateData?PREFIX:PUBLIC).length),privateData)).find(e=>e.slug===reference)||null}
  async function migrateSlugs(privateData=true){return lock(()=>{
    const prefix=privateData?PREFIX:PUBLIC;
    const owned=(privateData?list():keys(PUBLIC).map(k=>read(k.slice(PUBLIC.length),false))).sort((a,b)=>Number(!a.slug)-Number(!b.slug)||a.createdAt?.localeCompare(b.createdAt||'')||a.id.localeCompare(b.id)),ownedIds=new Set(owned.map(e=>e.id)),all=catalog(),used=new Set([...all.map(e=>e.id),...all.filter(e=>!ownedIds.has(e.id)).map(e=>e.slug)].filter(Boolean)),writes=[];
    for(const event of owned){const next=C.copy(event),slug=uniqueSlug((!privateData?read(event.id)?.slug:null)||event.slug||C.eventSlug(event.name),used);used.add(slug);if(slug!==event.slug){next.slug=slug;if(privateData)next.revision++;C.validateEvent(next,{privateData});writes.push(next)}}
    const previous=writes.map(e=>[prefix+e.id,localStorage.getItem(prefix+e.id)]);
    try{for(const event of writes)localStorage.setItem(prefix+event.id,JSON.stringify(event))}catch{for(const [key,value] of previous)try{localStorage.setItem(key,value)}catch{}throw new Error('storageError')}
  })}
  async function save(event,expectedRevision){
    return lock(()=>{
      const stored=read(event.id);
      C.assert(stored?stored.revision===expectedRevision:expectedRevision===null,'revisionConflict');
      const next=C.copy(event);next.slug=allocateSlug(next,catalog(),stored?.slug||next.slug||C.eventSlug(next.name));next.revision=(stored?.revision||0)+1;next.updatedAt=new Date().toISOString();C.validateEvent(next,{privateData:true});
      try{localStorage.setItem(PREFIX+next.id,JSON.stringify(next))}catch{throw new Error('storageError')}
      return next;
    });
  }
  async function remove(id,expectedRevision){return lock(()=>{const event=read(id);C.assert(event&&event.revision===expectedRevision,'revisionConflict');localStorage.removeItem(PREFIX+id);localStorage.removeItem(PUBLIC+id)})}
  function playerEvent(reference){const owned=resolve(reference);return owned?C.publicEvent(owned):resolve(reference,false)}
  function storeSnapshot(event){
    const projected=C.publicEvent(C.validateEvent(event)),old=read(projected.id,false);projected.slug=allocateSlug(projected,catalog(),old?.slug||projected.slug||C.eventSlug(projected.name));
    if(!old||projected.revision>old.revision)localStorage.setItem(PUBLIC+projected.id,JSON.stringify(projected));
    return playerEvent(projected.id);
  }
  function archive(events){return {app:'DeckomantiK',type:'tournament-archive',version:1,exportedAt:new Date().toISOString(),events:C.copy(events)}}
  function parseArchive(payload){
    C.assert(payload?.app==='DeckomantiK'&&payload.type==='tournament-archive'&&payload.version===1&&Array.isArray(payload.events)&&payload.events.length>0&&payload.events.length<=100,'badFile');
    const events=payload.events.map(e=>C.validateEvent(e,{privateData:true}));C.assert(new Set(events.map(e=>e.id)).size===events.length,'badFile');return events;
  }
  async function restore(events){
    return lock(()=>{
      const previous=new Map(events.map(e=>[PREFIX+e.id,localStorage.getItem(PREFIX+e.id)]));
      try{for(const e of events){const next=C.copy(e),old=read(e.id);next.slug=allocateSlug(next,catalog(),old?.slug||next.slug||C.eventSlug(next.name));next.revision=Math.max(old?.revision||0,e.revision)+1;next.updatedAt=new Date().toISOString();next.audit.push({at:next.updatedAt,action:'restore',reason:''});next.audit=next.audit.slice(-2000);localStorage.setItem(PREFIX+e.id,JSON.stringify(next))}}
      catch{for(const [key,raw] of previous){try{if(raw===null)localStorage.removeItem(key);else localStorage.setItem(key,raw)}catch{}}throw new Error('storageError')}
    });
  }
  async function encode(value){
    let bytes=new TextEncoder().encode(JSON.stringify(value));
    if(typeof CompressionStream!=='undefined')bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  async function decode(token,max=5000000){
    C.assert(typeof token==='string'&&token.length<=2000000&&/^[A-Za-z0-9_-]+$/.test(token),'badFile');
    let bytes=Uint8Array.from(atob(token.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    if(bytes[0]===31&&bytes[1]===139){
      C.assert(typeof DecompressionStream!=='undefined','badFile');
      const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks=[];let length=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new Error('tooLarge')}chunks.push(value)}}finally{reader.releaseLock()}
      bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    }
    C.assert(bytes.length<=max,'tooLarge');return JSON.parse(new TextDecoder().decode(bytes));
  }
  root.DKTournamentStorage={PREFIX,PUBLIC,read,resolve,list,migrateSlugs,save,remove,playerEvent,storeSnapshot,archive,parseArchive,restore,encode,decode};
})(globalThis);
