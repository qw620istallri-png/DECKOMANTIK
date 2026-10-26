/* Shared reader for current and legacy DeckomantiK PDF decklists. No PDF dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DKDeckPdf=api})(globalThis,()=>{
  function createReader(options={}){
    const list=options.cards||[],cardByNumber=new Map(list.filter(c=>!c.setId||c.setId==='beta').map(c=>[Number(c.collectionNumber),c])),cardByCollectorCode=new Map(list.map(c=>[c.collectorCode||`BETA-${String(c.collectionNumber).padStart(3,'0')}`,c]));
    const storedCardId=options.cardIdAllowed||(value=>typeof value==='string'&&value.length<=160&&/^[a-z0-9][a-z0-9_-]*$/i.test(value));
    const inferGroupKind=options.inferGroupKind||(g=>/^(sideboard|réserve|reserve|riserva)$/i.test(g.name)?'sideboard':/^maybeboard$/i.test(g.name)?'maybeboard':'');
    options.willSuffixes=options.willSuffixes||['Volontés persistantes','Volontés éphémères','Persistent Wills','Ephemeral Wills','Volontà Persistenti','Volontà Effimere'];
    const pdfAscii=value=>String(value??'').replace(/œ/g,'oe').replace(/Œ/g,'OE').replace(/æ/g,'ae').replace(/Æ/g,'AE').replace(/[‘’‚‛]/g,"'").replace(/[“”„]/g,'"').replace(/[–—−]/g,'-').replace(/…/g,'...').replace(/•/g,'-').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');
function pdfLiteralText(value){return value.replace(/\\(?:([0-7]{1,3})|\r\n|[\s\S])/g,(escape,octal)=>{if(octal)return String.fromCharCode(parseInt(octal,8));const char=escape.slice(1);return ({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','\n':'','\r':'','\r\n':''})[char]??char})}
// Older DeckomantiK exports have no data stream: read their numbered decklist rows.
function legacyPdfDecks(source){
  const decks=[];let deck=null,group=null,expected=0,seen=new Set();
  const willSuffixes=options.willSuffixes.map(pdfAscii);
  const finishGroup=()=>{if(group&&group.cardIds.length!==expected)throw new Error('Incomplete PDF section')};
  for(const match of source.matchAll(/BT \/F([12]) ([\d.]+) Tf ([\d.]+) [\d.]+ Td \(((?:\\[\s\S]|[^\\)])*)\) Tj ET/g)){
    const [,font,size,x,literal]=match,text=pdfLiteralText(literal);
    if(font==='2'&&Number(size)===23&&Number(x)===46){finishGroup();deck={version:5,name:text,groups:[]};decks.push(deck);group=null;seen=new Set();continue}
    if(!deck)continue;
    if(font==='2'&&Number(size)===13&&Number(x)===58){
      finishGroup();const title=text.match(/^(.*) \((\d+)\)$/);if(!title)throw new Error('Invalid PDF section');
      const suffix=willSuffixes.find(value=>title[1].endsWith(` - ${value}`)),name=suffix?title[1].slice(0,-suffix.length-3):title[1];
      // Will sub-sections are reunited after reading so their original category returns.
      group={name,kind:suffix?'volontes':inferGroupKind({name}),cardIds:[]};deck.groups.push(group);expected=Number(title[2]);continue
    }
    if(!group||font!=='1'||Number(size)!==9||Number(x)!==64)continue;
    const code=text.match(/^((?:BETA|ID)-\d{3}|#\d{3})\s/);if(!code)continue;
    const card=code[1][0]==='#'?cardByNumber.get(Number(code[1].slice(1))):cardByCollectorCode.get(code[1]);
    const id=card?.id||(code[1].startsWith('ID-')?`inner-deserts-${code[1].slice(3)}`:'');
    if(!storedCardId(id)||seen.has(id))throw new Error('Unknown or duplicate PDF card');
    seen.add(id);group.cardIds.push(id);
  }
  finishGroup();if(!decks.length)throw new Error('No DeckomantiK decklist');
  decks.forEach(item=>{item.groups=item.groups.reduce((groups,current)=>{const previous=groups.at(-1);if(current.kind==='volontes'&&previous?.kind==='volontes'&&previous.name===current.name)previous.cardIds.push(...current.cardIds);else groups.push(current);return groups},[])});
  return {app:'DeckomantiK',type:'deck-bundle',decks};
}
async function readDeckPdf(file){
  if(file.size>20*1024*1024)throw new Error('PDF too large');
  const source=new TextDecoder('latin1').decode(await file.arrayBuffer());if(!source.startsWith('%PDF-'))throw new Error('Invalid PDF');
  const embedded=source.match(/\/Type \/DeckomantikData \/Length \d+ >>\r?\nstream\r?\n([0-9a-f]+)\r?\nendstream/);
  if(!embedded){if(source.includes('/Type /DeckomantikData'))throw new Error('Invalid PDF data');return legacyPdfDecks(source);}
  if(embedded[1].length%2)throw new Error('Invalid PDF data');
  const bytes=Uint8Array.from(embedded[1].match(/../g),hex=>parseInt(hex,16)),data=JSON.parse(new TextDecoder().decode(bytes));
  if(data.app!=='DeckomantiK'||data.type!=='deck-bundle'||data.formatVersion!==1||!Array.isArray(data.decks)||!data.decks.length||data.decks.some(deck=>!Array.isArray(deck?.groups)||deck.groups.some(group=>!Array.isArray(group?.cardIds)||group.cardIds.some(id=>!storedCardId(id)))))throw new Error('Invalid PDF deck data');
  return data;
}
    return readDeckPdf;
  }
  return {read:(file,options)=>createReader(options)(file)};
});
