// Offline Android adapter: local app storage and bundled audio, never the laptop server.
(function(){
 const key='hsk-recall-words-v4',native=window.AndroidBridge;
 const originalSet=Storage.prototype.setItem;
 if(native){
  const saved=native.load(key);
  if(saved){try{JSON.parse(saved);originalSet.call(localStorage,key,saved);}catch{}}
  Storage.prototype.setItem=function(k,v){
   if(this===localStorage&&k===key&&!native.save(k,String(v)))throw Error('Phone storage save failed');
   return originalSet.call(this,k,v);
  };
 }
 let active=null;
 window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;this.rate=1;}};
 const speech={getVoices:()=>[{lang:'zh-CN',name:'Bundled Mandarin voice'}],cancel(){if(active){active.pause();active.src='';active=null;}},speak(u){
  this.cancel();
  if(!/^hsk[1234]-word-\d+$/.test(u.cardId||'')){u.onerror?.();return;}
  const audio=new Audio('audio/'+u.cardId+'.mp3');active=audio;audio.playbackRate=u.rate||1;
  audio.onended=()=>{u.onend?.();};audio.onerror=()=>u.onerror?.();audio.onplaying=()=>u.onstart?.();
  audio.play().catch(()=>u.onerror?.());
 }};
 Object.defineProperty(window,'speechSynthesis',{value:speech,configurable:true});
 window.HSKAudio={get player(){return active;}};
})();
