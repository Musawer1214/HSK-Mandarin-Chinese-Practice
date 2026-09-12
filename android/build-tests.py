from pathlib import Path
import json,os,subprocess,zipfile
root=Path(__file__).resolve().parent;paths=json.loads((root/'toolchain/paths.json').read_text());java=Path(paths['java']);jdk=Path(paths['javaRoot']);bt=Path(paths['buildtools']);jar=Path(paths['androidJar']);build=root/'test-build';build.mkdir(exist_ok=True);classes=build/'classes';classes.mkdir(exist_ok=True);dex=build/'dex';dex.mkdir(exist_ok=True)
env=os.environ.copy();env['HSK_KEY_PASSWORD']=(root/'signing/store-password.txt').read_text().strip()
def run(args):subprocess.run([str(a) for a in args],check=True,env=env)
run([bt/'aapt2.exe','link','-o',build/'resources.apk','--manifest',root/'tests/AndroidManifest.xml','-I',jar])
run([jdk/'bin/javac.exe','-encoding','UTF-8','-source','8','-target','8','-classpath',jar,'-d',classes,*list((root/'tests/src').rglob('*.java'))])
run([java,'-cp',bt/'lib/d8.jar','com.android.tools.r8.D8','--lib',jar,'--min-api','28','--output',dex,*list(classes.rglob('*.class'))])
with zipfile.ZipFile(build/'resources.apk') as zin,zipfile.ZipFile(build/'unsigned.apk','w') as zout:
 for i in zin.infolist():zout.writestr(i.filename,zin.read(i.filename),compress_type=i.compress_type)
 for f in dex.glob('*.dex'):zout.write(f,f.name)
run([bt/'zipalign.exe','-f','4',build/'unsigned.apk',build/'aligned.apk'])
run([java,'-jar',bt/'lib/apksigner.jar','sign','--ks',root/'signing/hsk-recall.jks','--ks-key-alias','hsk-recall','--ks-pass','env:HSK_KEY_PASSWORD','--out',build/'HSK-Recall-tests.apk',build/'aligned.apk'])
print('Android instrumentation test APK ready')
