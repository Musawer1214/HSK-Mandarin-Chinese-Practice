// Listening recognition is tracked separately from unaided word recall.
function cleanListening(raw){
 const out={words:{},round:null};
 if(!raw||typeof raw!=='object')return out;
 for(const [id,h] of Object.entries(raw.words||{}))if(byId.has(id)&&h&&typeof h==='object')out.words[id]={attempts:Math.max(0,Number(h.attempts)||0),correct:Math.max(0,Number(h.correct)||0),streak:Math.max(0,Math.min(3,Number(h.streak)||0)),lastSeen:Number(h.lastSeen)||0};
 const r=raw.round;
 if(r&&Array.isArray(r.questions)&&r.questions.length<=20&&Number.isInteger(r.index)&&r.index>=0&&r.index<=r.questions.length){
  const valid=q=>q&&byId.has(q.id)&&['chinese','english'].every(k=>Array.isArray(q[k])&&q[k].length===4&&new Set(q[k]).size===4&&q[k].includes(q.id)&&q[k].every(id=>byId.has(id)))&&[null,...q.chinese].includes(q.c??null)&&[null,...q.english].includes(q.e??null);
  if(r.questions.every(valid))out.round={level:['1','2','3','4','all'].includes(r.level)?r.level:'3',index:r.index,questions:r.questions.map(q=>({...q,c:q.c??null,e:q.e??null,submitted:!!q.submitted,played:!!q.played}))};
 }
 return out;
}
(function(){
 let active=false;
 const nav=document.querySelector('nav');
 nav.insertAdjacentHTML('beforeend','<button id="listeningTab" aria-pressed="false">Listening quiz</button>');
 document.querySelector('#library').insertAdjacentHTML('afterend',`<section id="listeningQuiz" hidden><h2>Listen, recognise, understand</h2><p>Choose the Chinese word and its English meaning. Both answers are checked together. Listening progress is saved separately from recall.</p><label>Quiz deck <select id="quizLevel"><option value="3">HSK 3</option><option value="4">HSK 4</option><option value="2">HSK 2</option><option value="1">HSK 1</option><option value="all">All levels · HSK 4 focus</option></select></label><button id="quizNew">New 20-word quiz</button><p id="quizStats"></p><div id="quizCard"></div></section>`);
 const originalRender=render;
 render=function(){originalRender();$('#listeningTab').classList.toggle('selected',active);$('#listeningTab').setAttribute('aria-pressed',String(active));$('#listeningQuiz').hidden=!active;if(active){clearInterval(clock);$('#practice').hidden=true;$('#library').hidden=true;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});paint();}};
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{active=false;render();}));
 const data=()=>state.listening||(state.listening=cleanListening(null));
 function options(w,field){const seen=new Set([w[field]]);const others=shuffle(WORDS.filter(x=>x.level===w.level&&x.id!==w.id&&x.pinyin.replace(/\s/g,'')!==w.pinyin.replace(/\s/g,''))).filter(x=>{if(seen.has(x[field]))return false;seen.add(x[field]);return true;}).slice(0,3);return shuffle([w,...others]).map(x=>x.id);}
 function start(){
  const d=data(),level=$('#quizLevel').value,pool=shuffle(WORDS.filter(w=>level==='all'||w.level===Number(level)));
  pool.sort((a,b)=>{const x=d.words[a.id],y=d.words[b.id];const priority=h=>h&&h.streak<3?0:!h?1:2;return priority(x)-priority(y)||(x?.lastSeen||0)-(y?.lastSeen||0);});
  const chosen=[];const plan=[4,4,1,4,2,4,3,4,1,4,2,4,3,4,3,4,3,4,4,4];
  for(let i=0;i<20&&pool.length;i++){let at=level==='all'?pool.findIndex(w=>w.level===plan[i]):0;if(at<0)at=0;chosen.push(pool.splice(at,1)[0]);}
  d.round={level,index:0,questions:chosen.map(w=>({id:w.id,chinese:options(w,'hanzi'),english:options(w,'english'),c:null,e:null,submitted:false,played:false}))};save();paint();play();
 }
 function play(){const r=data().round,q=r?.questions[r.index];if(!q)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance('');u.cardId=q.id;u.rate=.85;u.onstart=()=>{q.played=true;save();paint();};u.onerror=()=>{if($('#quizAudioStatus'))$('#quizAudioStatus').textContent='Audio could not play. Tap Play audio to retry.';};speechSynthesis.speak(u);}
 function paint(){
  const d=data(),r=d.round,values=Object.values(d.words);$('#quizStats').textContent=`${values.length} words tested · ${values.filter(h=>h.streak<3).length} need listening practice · ${values.reduce((n,h)=>n+h.correct,0)} fully correct / ${values.reduce((n,h)=>n+h.attempts,0)} attempts`;
  if(!r){$('#quizCard').innerHTML='<p>Start a quiz. Audio plays first; pinyin stays hidden until you check both answers.</p>';return;}
  $('#quizLevel').value=r.level;
  const q=r.questions[r.index];if(!q){const correct=r.questions.filter(x=>x.c===x.id&&x.e===x.id).length;$('#quizCard').innerHTML=`<h3>Quiz complete: ${correct} / ${r.questions.length}</h3><p>Both choices must be correct to earn a point. Your listening history is saved. Start a new quiz to focus on words that need practice.</p>`;return;}
  const w=byId.get(q.id);
  function group(key,field,label){return `<fieldset><legend>${label}</legend><div class="quiz-options">${q[key].map(id=>`<button data-choice="${key}" data-id="${id}" aria-pressed="${q[key==='chinese'?'c':'e']===id}" ${q.submitted?'disabled':''} class="${q[key==='chinese'?'c':'e']===id?'selected':''} ${q.submitted&&id===q.id?'quiz-correct':''}" ${field==='hanzi'?'lang="zh-CN"':''}>${esc(byId.get(id)[field])}${q.submitted&&id===q.id?' ✓':''}</button>`).join('')}</div></fieldset>`;}
  $('#quizCard').innerHTML=`<p>Question ${r.index+1} / ${r.questions.length} · HSK ${w.level}</p><button id="quizPlay" class="primary">▶ ${q.played?'Replay':'Play'} audio</button><p id="quizAudioStatus" role="status">${q.played?'Choose one answer in each group.':'Tap Play audio to listen.'}</p>${group('chinese','hanzi','1. Which Chinese word did you hear?')}${group('english','english','2. What does it mean?')}<button id="quizCheck" class="primary" ${q.submitted||!q.c||!q.e||!q.played?'disabled':''}>Check both answers</button>${q.submitted?`<div role="status" class="quiz-result"><strong>${q.c===q.id&&q.e===q.id?'Both correct!':'Keep practising this word.'}</strong><p>Chinese: ${q.c===q.id?'correct':'incorrect'} · Meaning: ${q.e===q.id?'correct':'incorrect'}</p><p lang="zh-CN">${esc(w.hanzi)} · ${esc(w.pinyin)}</p><p>${esc(w.english)}</p></div><button id="quizNext" class="primary">${r.index===r.questions.length-1?'Finish quiz':'Next word'}</button>`:''}`;
  $('#quizPlay').onclick=play;
  document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(q.submitted)return;q[b.dataset.choice==='chinese'?'c':'e']=b.dataset.id;save();paint();});
  $('#quizCheck').onclick=()=>{if(q.submitted||!q.c||!q.e||!q.played)return;q.submitted=true;const h=d.words[q.id]||{attempts:0,correct:0,streak:0};const good=q.c===q.id&&q.e===q.id;d.words[q.id]={attempts:h.attempts+1,correct:h.correct+Number(good),streak:good?Math.min(3,h.streak+1):0,lastSeen:Date.now()};save();paint();};
  if($('#quizNext'))$('#quizNext').onclick=()=>{r.index++;save();paint();play();};
 }
 $('#listeningTab').onclick=()=>{if(!ready)return;active=true;render();$('#listeningQuiz').scrollIntoView({block:'start'});};
 $('#quizNew').onclick=start;
 $('#quizLevel').onchange=()=>{speechSynthesis.cancel();data().round=null;save();paint();};
 window.HSKListening={clean:cleanListening};
})();
