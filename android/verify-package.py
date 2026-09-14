from pathlib import Path
import zipfile,json,subprocess,concurrent.futures,shutil
root=Path(__file__).resolve().parent;apk=root/'release/HSK-Recall-1.4.0.apk'
assert apk.exists(),apk
if apk.exists():
 with zipfile.ZipFile(apk) as z:
  bad=z.testzip();assert bad is None,bad
  audio=[n for n in z.namelist() if n.startswith('assets/audio/')];assert len(audio)==1293
  vocabulary=json.loads(z.read('assets/vocabulary.js').decode().split('=',1)[1].rstrip(';'))
  assert len(vocabulary)==1293 and len({w['id'] for w in vocabulary})==1293
  assert {level:sum(w['level']==level for w in vocabulary) for level in range(1,5)}=={1:150,2:150,3:300,4:693}
  assert set(audio)=={'assets/audio/'+w['id']+'.mp3' for w in vocabulary}
  original=json.loads((root.parent/'web/vocabulary.js').read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
  assert vocabulary[:600]==original, 'Existing word IDs/content changed'
  assert not any('server-config' in n or 'progress.json' in n or 'signing/' in n for n in z.namelist())
  print('APK integrity, 1293 entries/clips, and unchanged HSK 1-3 IDs verified. No saved user data or signing keys included.')
files=list((root/'build-assets/audio').glob('*.mp3'));ffprobe=shutil.which('ffprobe')
def inspect(p):
 r=subprocess.run([ffprobe,'-v','error','-show_entries','format=duration','-of','json',str(p)],capture_output=True,text=True,check=True);d=float(json.loads(r.stdout)['format']['duration']);assert .1<d<20,(p,d);return d
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:durations=list(pool.map(inspect,files))
print('All',len(durations),'word audio files decode; durations',round(min(durations),2),'to',round(max(durations),2),'seconds.')
