// Android vocabulary extension; the shared laptop deck stays independent.
const source=require('./vocabulary/hsk4-source.json');
const seen=new Set();
const words=source.filter(w=>{if(seen.has(w.hanzi))return false;seen.add(w.hanzi);return true;}).map(w=>({
 id:`hsk4-word-${w.id+1}`,hanzi:w.hanzi,pinyin:w.pinyin,
 english:w.translations.filter(t=>!t.startsWith('CL:')).join('; '),level:4
}));
// Reconcile the third-party data with official classic HSK 4 entries 601–1200.
const corrections={
 '弹':{hanzi:'弹钢琴',pinyin:'tán gāngqín',english:'to play the piano'},
 '等':{english:'and so on; etcetera (particle)'},
 '对':{english:'correct; right (adjective)'},
 '过':{english:'to pass; to cross; to spend (time); to celebrate (verb)'}
};
for(const w of words)Object.assign(w,corrections[w.hanzi]||{});
words.push({id:'hsk4-word-1202',hanzi:'只',pinyin:'zhī',english:'measure word for certain animals, one of a pair, and some objects',level:4},
 {id:'hsk4-word-1203',hanzi:'得',pinyin:'děi',english:'must; have to',level:4});
if(words.length!==600||words.some(w=>!w.hanzi||!w.pinyin||!w.english))throw Error('Invalid HSK 4 vocabulary');
function replace(text,from,to){if(!text.includes(from))throw Error('Shared frontend changed: '+from);return text.replaceAll(from,to);}
exports.words=words;
exports.html=function(html){
 for(const [from,to] of [
 ['HSK 1–3','HSK 1–4'],['All 600 words','All 1200 words'],
 ['600 cumulative vocabulary entries, not 600 individual characters.','1200 vocabulary entries, including 600 distinct HSK 4 entries.'],
 ['<option value="3">Full HSK 3 · 300 words</option>','<option value="3">Full HSK 3 · 300 words</option><option value="4">Full HSK 4 · 600 words</option>'],
 ['<option value="3">HSK 3 only · 300</option>','<option value="4">HSK 4 only · 600</option><option value="3">HSK 3 only · 300</option>'],
 ['<option value="3">HSK 3</option>','<option value="4">HSK 4</option><option value="3">HSK 3</option>'],
 ['HSK 3 focus','HSK 4 focus']])html=replace(html,from,to);
 return html;
};
exports.app=function(js){
 for(const [from,to] of [
 ["['1','2','3'","['1','2','3','4'"],['[1,2,3].map','[1,2,3,4].map'],
 ["s.mode==='full'?300:","s.mode==='full'?WORDS.filter(w=>w.level===Number(s.level)).length:"],
 [' / 600',' / ${WORDS.length}'],
 ['HSK 3: 300. Every original entry is here.','HSK 3: 300 · HSK 4: 600.'],
 ['[1,2,3,3,3,3,3,1,3,3,3,2,3,3,3,1,3,3,3,2]','[1,2,3,4,4,4,3,4,4,4,2,4,3,4,4,1,4,3,4,4]'],
 ['// Cold start: 14 HSK3 + 3 HSK1 + 3 HSK2.','// Cold start: HSK 4 focus with lower-level warm-up.']])js=replace(js,from,to);
 return js;
};
