const assert=require('node:assert/strict');
const {classicWords:words,words:all}=require('./hsk4.cjs');
const official=require('./vocabulary/official-hsk4-new.json');
const normalize=s=>s.replace(/（[^）]*）/g,'');
assert.equal(words.length,600);
assert.equal(new Set(words.map(w=>w.id)).size,600);
assert.deepEqual(words.map(w=>w.hanzi).sort(),official.map(w=>normalize(w.entry)).sort());
for(const [hanzi,pinyin] of [['得','děi'],['只','zhī'],['弹钢琴','tán gāngqín']])assert.equal(words.find(w=>w.hanzi===hanzi).pinyin,pinyin);
assert(words.find(w=>w.hanzi==='等').english.includes('particle'));
assert(words.find(w=>w.hanzi==='对').english.includes('adjective'));
assert(words.find(w=>w.hanzi==='过').english.includes('verb'));
console.log('PASS: all 600 HSK 4 headwords match official entries 601–1200, with required sense/pronunciation corrections.');

global.window=global;const fs=require('fs'),path=require('path');const base=fs.existsSync(path.join(__dirname,'../web/vocabulary.js'))?'../web/vocabulary.js':'../HSK_Recall/vocabulary.js';require(base);
const known=new Set([...VOCABULARY,...all].map(w=>normalize(w.hanzi)));
const book=require('./vocabulary/hsk4-book-main.json');assert.equal(book.length,602);
for(const row of book)assert(known.has(normalize(row.hanzi)),`Missing book ${row.book} PDF ${row.pdfPage}: ${row.hanzi}`);
assert.equal(all.length,693);assert.equal(new Set(all.map(w=>w.id)).size,693);
console.log('PASS: all 602 main New Words rows (601 distinct headwords) from HSK 4A/4B have cards; 93 textbook additions, no supplementary/proper-noun decks.');
