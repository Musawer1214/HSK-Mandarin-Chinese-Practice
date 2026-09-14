const fs=require('fs'),path=require('path');

const root=__dirname,source=path.resolve(root,'../web'),dest=path.join(root,'build-assets');fs.mkdirSync(path.join(dest,'audio'),{recursive:true});

const hsk4=require('./hsk4.cjs');
global.window=global;require(path.join(source,'vocabulary.js'));

for(const file of ['style.css','vocabulary.js'])fs.copyFileSync(path.join(source,file),path.join(dest,file));

VOCABULARY.push(...hsk4.words);
fs.writeFileSync(path.join(dest,'vocabulary.js'),'window.VOCABULARY='+JSON.stringify(VOCABULARY)+';');
fs.copyFileSync(path.join(root,'vocabulary/LICENSE-source.txt'),path.join(dest,'HSK4-LICENSE.txt'));
let html=fs.readFileSync(path.join(source,'index.html'),'utf8').replace('<script src="server-config.js"></script>','<script src="android-init.js"></script>').replace('<script src="app.js"></script>','<script src="app.js"></script><script src="listening.js"></script><script src="android-after.js"></script><script src="mobile.js"></script><script>boot();</script>');

html=hsk4.html(html);
html=html.replace('</head>','<link rel="stylesheet" href="listening.css"></head>');

html=html.replace('CLASSIC HSK 1â€“3','CLASSIC HSK 1â€“3 Â· OFFLINE');fs.writeFileSync(path.join(dest,'index.html'),html);

let js=fs.readFileSync(path.join(source,'app.js'),'utf8').replace('utterance.voice=voice;','utterance.cardId=w.id;utterance.voice=voice;').replaceAll('Saved in this browser.','Saved on this phone.').replaceAll('Storage unavailable â€” export a backup before closing.','Phone storage unavailable â€” export a backup before closing.').replace('Browser-only saving. Double-click Start_HSK_Recall.bat for automatic disk backups. Export before clearing browser data.','Progress is saved on this phone, separately from your laptop. Export a backup before uninstalling or clearing app data.');

js=js.replace('\nboot();','\n').replace(/return output;\r?\n}/, 'output.listening=cleanListening(input.listening);return output;\n}');

js=js.replaceAll('Start familiar. Work on what slips.','Ready to practise?').replaceAll('20 starting cards · extra HSK 3 focus · saved across sessions','20 words · saved automatically').replaceAll('Recall the sound and meaning before checking.','Recall, then check.').replaceAll('If recall was slow, mark Hesitated. This is a cue, not an automatic score.','Slow recall? Choose Hesitated.').replaceAll('Hesitated or missed? It will stay in your weak list until recall is secure.','Misses stay in your weak list.');

fs.writeFileSync(path.join(dest,'app.js'),hsk4.app(js));

for(const file of ['android-init.js','android-after.js','listening.js','listening.css','mobile.js'])fs.copyFileSync(path.join(root,file),path.join(dest,file));

let bytes=0;for(const w of VOCABULARY){const src=path.join(root,'app/src/main/assets/audio',w.id+'.mp3');fs.copyFileSync(src,path.join(dest,'audio',w.id+'.mp3'));bytes+=fs.statSync(src).size;}

console.log('Packaged '+VOCABULARY.length+' words, current recall app, and '+bytes+' bytes of word audio. No server config or user progress included.');

