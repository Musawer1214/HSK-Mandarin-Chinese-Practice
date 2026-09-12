'use strict';
const STORAGE_KEY='hsk-recall-words-v4';
const WORDS=window.VOCABULARY;
const byId=new Map(WORDS.map(w=>[w.id,w]));
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const emptyState=()=>({version:4,updatedAt:0,words:{},session:null,summary:null});
let state=emptyState(),view='practice',revealed=false,started=performance.now(),clock=null,ready=false,pageSize=40;
let disk=null,diskRevision=0,diskConflict=false,saveChain=Promise.resolve(),browserOK=true;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const isWeak=id=>state.words[id]?.status==='weak';
let recallFeedback='';
const weakCount=()=>WORDS.filter(w=>isWeak(w.id)).length;
function normalize(input){
 if(!input||input.version!==4||!input.words||typeof input.words!=='object'||Array.isArray(input.words))throw Error('This is not an HSK Recall backup.');
 const output=emptyState();output.updatedAt=Number(input.updatedAt)||0;
 for(const [id,v] of Object.entries(input.words)){
  if(!byId.has(id)||!v||typeof v!=='object')continue;
  const status=['weak','steady','secure'].includes(v.status)?v.status:'steady';
  output.words[id]={status,streak:Math.max(0,Math.min(3,Number(v.streak)||0)),reviews:Math.max(0,Number(v.reviews)||0),lapses:Math.max(0,Number(v.lapses)||0),lastSeen:Number(v.lastSeen)||0,lastRating:['good','hard','again'].includes(v.lastRating)?v.lastRating:'good',lastSuccessRound:String(v.lastSuccessRound||''),lastResponseMs:Math.max(0,Number(v.lastResponseMs)||0)};
 }
 const s=input.session;
 if(s&&typeof s.id==='string'&&Array.isArray(s.queue)&&s.queue.length<=100&&Number(s.attempts)<40){
  const cleanMap=obj=>Object.fromEntries(Object.entries(obj||{}).filter(([k,v])=>byId.has(k)&&Number.isFinite(Number(v))).map(([k,v])=>[k,Number(v)]));
  output.session={id:s.id,queue:s.queue.filter(q=>q&&byId.has(q.id)).map(q=>({id:q.id,kind:['warmup','focus','repeat'].includes(q.kind)?q.kind:'focus'})),attempts:Math.max(0,Number(s.attempts)||0),counts:{good:Math.max(0,Number(s.counts?.good)||0),hard:Math.max(0,Number(s.counts?.hard)||0),again:Math.max(0,Number(s.counts?.again)||0)},retryCounts:cleanMap(s.retryCounts),failures:cleanMap(s.failures),level:['1','2','3','all'].includes(s.level)?s.level:'all'};
  if(!output.session.queue.length)output.session=null;
 }
 if(input.summary&&typeof input.summary==='object')output.summary={good:Number(input.summary.good)||0,hard:Number(input.summary.hard)||0,again:Number(input.summary.again)||0};
 return output;
}
function migrate(old){
 const output=emptyState(),history=old?.history||old||{};
 for(const w of WORDS){const h=history[w.id];if(h&&['again','hard','good'].includes(h.rating))output.words[w.id]={status:h.rating==='good'?'steady':'weak',streak:0,reviews:Number(h.reviews)||1,lapses:h.rating==='good'?0:1,lastSeen:Number(h.lastReviewed)||0,lastRating:h.rating,lastSuccessRound:'',lastResponseMs:0};}
 return output;
}
function localRead(){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw)return normalize(JSON.parse(raw));return migrate(JSON.parse(localStorage.getItem('hsk-recall-v1')||'{}'));}catch{return emptyState();}}
async function api(path,options={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4000);
 try{return await fetch(disk.base+path,{...options,headers:{'Content-Type':'application/json','X-HSK-Token':disk.token,...options.headers},signal:controller.signal});}finally{clearTimeout(timeout);}
}
function save(){
 state.updatedAt=Date.now();const snapshot=JSON.parse(JSON.stringify(state));
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot));browserOK=true;}catch{browserOK=false;}
 $('#saveStatus').textContent=disk&&!diskConflict?'Saving to disk…':browserOK?'Saved in this browser.':'Storage unavailable — export a backup before closing.';
 if(disk&&!diskConflict){saveChain=saveChain.then(async()=>{
  if(diskConflict)return;
  try{const response=await api('/api/state',{method:'PUT',body:JSON.stringify({revision:diskRevision,state:snapshot})});
   if(response.status===409){diskConflict=true;$('#saveStatus').textContent='Another tab saved newer progress. Export this tab as a backup, then reload before continuing.';return;}
   if(!response.ok)throw Error('Save failed');const result=await response.json();diskRevision=result.revision;$('#saveStatus').textContent='Saved to disk + browser. Your weak list and round are kept.';
  }catch{$('#saveStatus').textContent=browserOK?'Saved in this browser; disk unavailable. Reopen the launcher or export a backup.':'Saving failed — export a backup before closing.';}
 });}
}
function choose(pool,level,weakPreferred=false){
 let subset=pool.filter(w=>(level==='all'||w.level===Number(level))&&(!weakPreferred||isWeak(w.id)));
 if(!subset.length&&weakPreferred)subset=pool.filter(w=>isWeak(w.id));
 if(!subset.length)subset=pool.filter(w=>level==='all'||w.level===Number(level));
 if(!subset.length)subset=pool;
 subset=shuffle(subset).sort((a,b)=>{
  const x=state.words[a.id],y=state.words[b.id];
  if(weakPreferred){const score=v=>(v?.lastRating==='again'?3:1)+Math.min(5,v?.lapses||0)-(v?.streak||0);return score(y)-score(x)||(x?.lastSeen||0)-(y?.lastSeen||0);}
  return (x?.reviews||0)-(y?.reviews||0);
 });return subset[0];
}
function createRound(onlyWeak=false,oneId=null){
 if(!ready)return;
 const level=$('#level').value;
 let pool=WORDS.filter(w=>(level==='all'||w.level===Number(level))&&(!onlyWeak||isWeak(w.id))&&($('#includeSecure').checked||state.words[w.id]?.status!=='secure'));
 if(oneId)pool=byId.has(oneId)?[byId.get(oneId)]:[];
 const queue=[];
 // Cold start: 14 HSK3 + 3 HSK1 + 3 HSK2. Weakness takes priority when a desired pool is empty.
 const plan=[1,2,3,3,3,3,3,1,3,3,3,2,3,3,3,1,3,3,3,2];
 for(let i=0;i<20&&pool.length;i++){
  const desired=level==='all'?String(plan[i]):level;
  const warm=i<4&&!onlyWeak&&!oneId;
  const familiar=pool.filter(w=>state.words[w.id]&&!isWeak(w.id));
  const source=warm&&familiar.length?familiar:warm&&pool.some(w=>!isWeak(w.id))?pool.filter(w=>!isWeak(w.id)):pool;
  const word=choose(source,desired,onlyWeak||(!warm&&i<14));
  queue.push({id:word.id,kind:warm?'warmup':'focus'});pool=pool.filter(w=>w.id!==word.id);
 }
 state.session=queue.length?{id:Date.now()+'-'+Math.random().toString(36).slice(2),queue,attempts:0,counts:{good:0,hard:0,again:0},retryCounts:{},failures:{},level}:null;
 state.summary=null;recallFeedback='';revealed=false;started=performance.now();view='practice';save();render();
}
function rate(rating){
 const s=state.session;if(!s||!revealed||!['good','hard','again'].includes(rating))return;
 const {id}=s.queue.shift();const old=state.words[id]||{status:'steady',streak:0,reviews:0,lapses:0,lastSuccessRound:''};
 const next={...old,reviews:old.reviews+1,lastRating:rating,lastSeen:Date.now(),lastResponseMs:Math.round(performance.now()-started)};
 if(rating==='good'){
  if(!s.failures[id]&&old.lastSuccessRound!==s.id){next.streak=Math.min(3,(old.streak||0)+1);next.lastSuccessRound=s.id;}
  next.status=next.streak>=3?'secure':old.status==='weak'?'weak':'steady';
 }else{
  next.status='weak';next.streak=0;next.lapses=old.lapses+1;s.failures[id]=1;
  if((s.retryCounts[id]||0)<2&&s.attempts<39){s.queue.splice(Math.min(rating==='again'?3:5,s.queue.length),0,{id,kind:'repeat'});s.retryCounts[id]=(s.retryCounts[id]||0)+1;}
 }
 const gained=next.streak-(old.streak||0);
 recallFeedback=rating==='good'?(gained>0?`Saved: HSK ${byId.get(id).level} recall progress +1. This word is now ${next.streak}/3${next.status==='secure'?' — Secure.':'.'}`:next.status==='secure'?'Saved: this word is already Secure.':'Saved as practice. A retry after a miss in this round does not add a confident-round step; try it in a new round.'):'Saved to your weak list. This word’s confident-round steps restart at 0.';
 state.words[id]=next;s.attempts++;s.counts[rating]++;
 if(!s.queue.length||s.attempts>=40){state.summary={...s.counts};state.session=null;}
 revealed=false;started=performance.now();save();render();
}
function completionByLevel(){return [1,2,3].map(level=>{
 const words=WORDS.filter(w=>w.level===level),completed=words.filter(w=>state.words[w.id]?.status==='secure').length;
 const recallSteps=words.reduce((sum,w)=>sum+Math.min(3,Math.max(0,state.words[w.id]?.streak||0)),0);
 return {level,recallSteps,totalSteps:words.length*3,total:words.length,completed,remaining:words.length-completed,checked:words.filter(w=>state.words[w.id]).length};
});}
function render(){
 clearInterval(clock);if('speechSynthesis' in window)speechSynthesis.cancel();
 const reviewed=Object.keys(state.words).length,weak=weakCount(),secure=WORDS.filter(w=>state.words[w.id]?.status==='secure').length;
 $('#stats').innerHTML=`<div class="stat"><strong>${reviewed}<small> / 600</small></strong><span>Words checked</span></div><div class="stat"><strong>${weak}</strong><span>In your weak list</span></div><div class="stat"><strong>${secure}</strong><span>Secure recall</span></div>`;$('#weakCount').textContent=weak;
 $('#levelProgress').innerHTML=completionByLevel().map(l=>`<div class="level-card"><strong>HSK ${l.level} ${l.remaining===0?'✓ Complete':''}</strong><span>Practised: ${l.checked} / ${l.total}</span><progress value="${l.checked}" max="${l.total}" aria-label="HSK ${l.level} practised"></progress><span>Recall progress: ${l.recallSteps} / ${l.totalSteps} steps</span><progress value="${l.recallSteps}" max="${l.totalSteps}" aria-label="HSK ${l.level} recall progress"></progress><small>${l.completed} Secure · ${l.remaining} not yet Secure<br>${l.total-l.checked} not checked</small></div>`).join('');
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view));});
 $('#recallFeedback').textContent=recallFeedback;$('#recallFeedback').hidden=!recallFeedback;
 $('#practice').hidden=view!=='practice';$('#library').hidden=view==='practice';
 if(view!=='practice'){renderLibrary();return;}
 const s=state.session;
 if(!s){const summary=state.summary;$('#card').innerHTML=`<div class="empty"><div class="eyebrow">${summary?'ROUND COMPLETE':'YOUR RECALL PRACTICE'}</div><h2>${summary?'Progress kept. Weak words saved.':(completionByLevel().filter(l=>$('#level').value==='all'||l.level===Number($('#level').value)).every(l=>l.remaining===0)?'Selected deck complete.':'Start familiar. Work on what slips.')}</h2>${summary?`<div class="round-summary"><div><strong>${summary.good}</strong><span>Knew it</span></div><div><strong>${summary.hard}</strong><span>Hesitated</span></div><div><strong>${summary.again}</strong><span>Missed</span></div></div>`:'<p class="muted">20 starting cards · extra HSK 3 focus · saved across sessions</p>'}<button id="begin" class="primary">${summary?'Start another round':'Start recall'}</button>${weak?'<p><button id="beginWeak">Practise only weak words ('+weak+')</button></p>':''}</div>`;$('#begin').onclick=()=>createRound();if($('#beginWeak'))$('#beginWeak').onclick=()=>createRound(true);return;}
 const entry=s.queue[0],w=byId.get(entry.id),h=state.words[w.id];
 $('#card').innerHTML=`<div class="card-top"><span>${entry.kind==='warmup'?'WARM-UP':entry.kind==='repeat'?'TRY IT AGAIN':'FOCUS'} · HSK ${w.level}</span><span>${s.attempts} answered · ${s.queue.length} queued</span></div><div class="hanzi" lang="zh-CN">${esc(w.hanzi)}</div><div id="pace" class="recall-time">Recall the sound and meaning before checking.</div>${revealed?`<div class="answer"><p class="pinyin">${esc(w.pinyin)}</p><p>${esc(w.english)}</p></div><button id="listen" class="small">Listen to pronunciation</button><p id="audioStatus" class="muted" role="status"></p><p class="muted">How was your recall before checking?</p><div class="rating"><button data-rate="again">Missed</button><button data-rate="hard">Hesitated</button><button data-rate="good" class="primary">Knew it</button></div>`:'<button id="reveal" class="primary wide">Check pinyin & meaning</button>'}<p class="muted">${h?.status==='weak'?`Saved weak word · ${h.streak}/3 confident rounds toward Secure.`:h?.status==='secure'?'Completed — you chose to review this word.':'Hesitated or missed? It will stay in your weak list until recall is secure.'}</p>`;
 if($('#reveal'))$('#reveal').onclick=()=>{revealed=true;render();};
 document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>rate(b.dataset.rate));
 if($('#listen'))$('#listen').onclick=()=>{
  if(!('speechSynthesis' in window)){$('#audioStatus').textContent='Pronunciation is not available in this browser.';return;}
  const voice=speechSynthesis.getVoices().find(v=>/^zh[-_]CN/i.test(v.lang));
  if(!voice){$('#audioStatus').textContent='No Mandarin voice is loaded on this device. Pinyin is shown above.';return;}
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(w.hanzi.replace(/（[^）]*）/g,''));utterance.voice=voice;utterance.lang='zh-CN';utterance.rate=.85;utterance.onerror=()=>{if($('#audioStatus'))$('#audioStatus').textContent='Pronunciation could not play.';};speechSynthesis.speak(utterance);
 };
 if(!revealed)clock=setInterval(()=>{if($('#pace'))$('#pace').textContent=performance.now()-started<3000?'Aim for about 3 seconds — no need to rush.':'If recall was slow, mark Hesitated. This is a cue, not an automatic score.';},250);
}
function renderLibrary(){
 const weak=view==='weak';$('#libraryTitle').textContent=weak?'Your saved weak words':'The complete classic deck';$('#libraryHelp').textContent=weak?'This list survives round endings and restarts. Hardest words appear first.':'HSK 1: 150 · HSK 2: 150 · HSK 3: 300. Every original entry is here.';$('#practiseWeak').hidden=!weak;
 const search=$('#search').value.trim().toLowerCase(),fold=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const level=$('#libraryLevel').value;
 const list=WORDS.filter(w=>(!weak||isWeak(w.id))&&(level==='all'||w.level===Number(level))&&(!search||fold(w.hanzi+' '+w.pinyin+' '+w.english).toLowerCase().includes(fold(search))));
 if(weak)list.sort((a,b)=>(state.words[b.id]?.lapses||0)-(state.words[a.id]?.lapses||0)||b.level-a.level);
 $('#listCount').textContent=`${list.length} words${weak?' in this weak-word selection':''}`;
 $('#wordList').innerHTML=list.length?list.slice(0,pageSize).map(w=>{const h=state.words[w.id],status=h?.status==='weak'?'Weak':h?.status==='secure'?'Secure':h?'Steady':'Not checked';return `<div class="word-row"><div><span class="word" lang="zh-CN">${esc(w.hanzi)}</span><span class="badge ${h?.status==='weak'?'tag-weak':h?.status==='secure'?'tag-secure':''}">${status} · HSK ${w.level}</span><p class="definition">${esc(w.pinyin)} · ${esc(w.english)}</p><span class="detail">${h?`${h.reviews} checks · ${h.lapses} hesitant/missed · ${h.streak}/3 confident rounds`:'Ready for recall practice'}</span></div><button data-practise="${w.id}">Practise</button></div>`;}).join(''):'<p class="muted">'+(weak?'No weak words match this selection. Rate a card Hesitated or Missed to save it here.':'No words match your search.')+'</p>';
 $('#showMore').hidden=list.length<=pageSize;
 document.querySelectorAll('[data-practise]').forEach(b=>b.onclick=()=>createRound(false,b.dataset.practise));
}
async function boot(){
 const local=localRead();state=local;
 if(window.HSK_SERVER){disk=window.HSK_SERVER;try{const response=await api('/api/state');if(!response.ok)throw Error();const result=await response.json();diskRevision=result.revision;
  if(result.state){const remote=normalize(result.state);state=remote;for(const [id,h] of Object.entries(local.words))if(!state.words[id])state.words[id]=h;}
 }catch{disk=null;}}
 ready=true;if(state.session)$('#level').value=state.session.level;
 $('#storageNote').textContent=disk?'Automatic disk saving is active. Export a backup to keep a separate copy or move devices.':'Browser-only saving. Double-click Start_HSK_Recall.bat for automatic disk backups. Export before clearing browser data.';
 save();render();
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(!ready)return;view=b.dataset.view;pageSize=40;render();});
$('#start').onclick=()=>createRound();$('#includeSecure').onchange=()=>{$('#saveStatus').textContent='Completed-word preference applies to your next round.';};$('#level').onchange=()=>createRound();
$('#practiseWeak').onclick=()=>{$('#level').value=$('#libraryLevel').value;createRound(true);};
$('#search').oninput=()=>{pageSize=40;renderLibrary();};$('#libraryLevel').onchange=()=>{pageSize=40;renderLibrary();};$('#showMore').onclick=()=>{pageSize+=40;renderLibrary();};
$('#export').onclick=()=>{if(!ready)return;const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='hsk-recall-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onclick=()=>$('#importFile').click();$('#importFile').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{if(file.size>5000000)throw Error('Backup is too large.');const data=JSON.parse(await file.text());const imported=data.version===4?normalize(data):migrate(data);
 if(!Object.keys(imported.words).length)throw Error('No saved vocabulary ratings found in this backup.');
 // Merge by last review time: importing an older backup does not erase more recent practice.
 for(const [id,h] of Object.entries(imported.words)){const existing=state.words[id];if(!existing||h.lastSeen>existing.lastSeen)state.words[id]=h;}
 save();render();$('#saveStatus').textContent='Backup merged. Existing newer ratings were kept.';
 }catch(e){$('#saveStatus').textContent='Import failed: '+e.message;}finally{event.target.value='';}
};
$('#card').innerHTML='<p class="muted">Loading your saved words…</p>';
boot();
