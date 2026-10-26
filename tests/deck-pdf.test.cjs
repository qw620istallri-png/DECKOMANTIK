const test=require('node:test'),assert=require('node:assert/strict');
const PDF=require('../js/deck-pdf.js');
const card={id:'example_en',name:'Example',collectionNumber:1,collectorCode:'BETA-001'};
const deck={name:'Épreuve',groups:[{name:'Main',cardIds:[card.id]}]};
function file(source){return new Blob([source],{type:'application/pdf'})}
function modern(data){const hex=Buffer.from(JSON.stringify(data),'utf8').toString('hex');return file(`%PDF-1.4\n<< /Type /DeckomantikData /Length ${hex.length} >>\nstream\n${hex}\nendstream`)}
test('shared PDF reader preserves Unicode and multiple decks from embedded DK data',async()=>{const data={app:'DeckomantiK',type:'deck-bundle',formatVersion:1,decks:[deck,{...deck,name:'Secondo'}]};assert.deepEqual(await PDF.read(modern(data),{cards:[card]}),data)});
test('legacy PDF reader resolves collector codes, sideboard and multilingual will subsections',async()=>{
  const source='%PDF-1.4\nBT /F2 23 Tf 46 740 Td (Legacy) Tj ET\nBT /F2 13 Tf 58 700 Td (Volontes - Volontes ephemeres \\(1\\)) Tj ET\nBT /F1 9 Tf 64 680 Td (BETA-001 Example) Tj ET\nBT /F2 13 Tf 58 650 Td (Sideboard \\(0\\)) Tj ET';
  const read=await PDF.read(file(source),{cards:[card]});assert.equal(read.decks[0].groups[0].kind,'volontes');assert.deepEqual(read.decks[0].groups[0].cardIds,[card.id]);assert.equal(read.decks[0].groups[1].kind,'sideboard');
});
test('shared PDF reader rejects malformed, incomplete and incompatible documents',async()=>{
  await assert.rejects(()=>PDF.read(file('hello')));
  await assert.rejects(()=>PDF.read(file('%PDF-1.4\n/Type /DeckomantikData /Length 1 >>\nstream\nf\nendstream')));
  await assert.rejects(()=>PDF.read(modern({app:'Other',type:'deck-bundle',formatVersion:1,decks:[deck]})));
  await assert.rejects(()=>PDF.read(file('%PDF-1.4\nBT /F2 23 Tf 46 740 Td (Incomplete) Tj ET\nBT /F2 13 Tf 58 700 Td (Main \\(1\\)) Tj ET')));
  await assert.rejects(()=>PDF.read({size:21*1024*1024}));
});
