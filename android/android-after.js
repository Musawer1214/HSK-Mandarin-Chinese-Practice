// Runs after the shared app; export/import use Android's document picker.
$('#export').onclick=()=>{if(ready)AndroidBridge.exportJSON(JSON.stringify(state,null,2));};
$('#import').onclick=()=>AndroidBridge.importJSON();
window.receiveAndroidImport=function(text){
 try {
  const data=JSON.parse(text),incoming=data.version===4?normalize(data):migrate(data);
  if(!Object.keys(incoming.words).length&&!Object.keys(cleanListening(data.listening).words).length)throw Error('No saved vocabulary ratings found');
  for(const [id,h] of Object.entries(incoming.words)){const old=state.words[id];if(!old||h.lastSeen>old.lastSeen)state.words[id]=h;}
  if(data.listening){const imported=cleanListening(data.listening);state.listening=state.listening||cleanListening(null);for(const [id,h] of Object.entries(imported.words)){if(!state.listening.words[id]||h.lastSeen>state.listening.words[id].lastSeen)state.listening.words[id]=h;}}
  save();render();$('#saveStatus').textContent='Backup merged into this phone’s progress. Newer ratings were kept.';
 }catch(e){$('#saveStatus').textContent='Import failed: '+e.message;}
};
