from pathlib import Path
import os,subprocess,zipfile,secrets,hashlib,json
root=Path(__file__).resolve().parent
java_root=next((root/'toolchain/jdk').glob('jdk-*'));java=java_root/'bin/java.exe';javac=java_root/'bin/javac.exe'
buildtools=root/'toolchain/packages/build-tools_35.0.0/android-15';android_jar=next((root/'toolchain/packages/platforms_android-36').rglob('android.jar'))
build=root/'build';build.mkdir(exist_ok=True);classes=build/'classes';classes.mkdir(exist_ok=True);dex=build/'dex';dex.mkdir(exist_ok=True)
env=os.environ.copy();env['JAVA_HOME']=str(java_root);env['PATH']=str(java_root/'bin')+os.pathsep+env['PATH']
def run(args):subprocess.run([str(a) for a in args],env=env,check=True,cwd=root)
run(['node',root/'prepare-assets.cjs'])
run([buildtools/'aapt2.exe','compile','--dir',root/'app/src/main/res','-o',build/'resources.zip'])
unsigned=build/'unsigned.apk'
run([buildtools/'aapt2.exe','link','-o',unsigned,'--manifest',root/'app/src/main/AndroidManifest.xml','-I',android_jar,build/'resources.zip'])
sources=list((root/'app/src/main/java').rglob('*.java'))
run([javac,'-encoding','UTF-8','-source','8','-target','8','-classpath',android_jar,'-d',classes,*sources])
run([java,'-cp',buildtools/'lib/d8.jar','com.android.tools.r8.D8','--lib',android_jar,'--min-api','28','--output',dex,*classes.rglob('*.class')])
with zipfile.ZipFile(unsigned,'a',zipfile.ZIP_DEFLATED) as z:
 for file in dex.glob('*.dex'):z.write(file,file.name)
 for file in (root/'build-assets').rglob('*'):
  if file.is_file():z.write(file,'assets/'+file.relative_to(root/'build-assets').as_posix(),compress_type=zipfile.ZIP_STORED if file.suffix=='.mp3' else zipfile.ZIP_DEFLATED)
signing=root/'signing';signing.mkdir(exist_ok=True);password_file=signing/'store-password.txt';keystore=signing/'hsk-recall.jks'
if not password_file.exists():password_file.write_text(secrets.token_hex(24))
env['HSK_KEY_PASSWORD']=password_file.read_text().strip()
if not keystore.exists():run([java_root/'bin/keytool.exe','-genkeypair','-keystore',keystore,'-alias','hsk-recall','-keyalg','RSA','-keysize','3072','-validity','10000','-storepass:env','HSK_KEY_PASSWORD','-keypass:env','HSK_KEY_PASSWORD','-dname','CN=HSK Recall Personal App'])
output=root/'release';output.mkdir(exist_ok=True)
normalized=build/'normalized.apk'
with zipfile.ZipFile(unsigned) as zin,zipfile.ZipFile(normalized,'w') as zout:
 for info in zin.infolist():zout.writestr(info.filename,zin.read(info.filename),compress_type=info.compress_type)
aligned=build/'aligned.apk';run([buildtools/'zipalign.exe','-f','4',normalized,aligned])
apk=output/'HSK-Recall-1.2.0.apk'
run([java,'-jar',buildtools/'lib/apksigner.jar','sign','--ks',keystore,'--ks-key-alias','hsk-recall','--ks-pass','env:HSK_KEY_PASSWORD','--key-pass','env:HSK_KEY_PASSWORD','--out',apk,aligned])
run([java,'-jar',buildtools/'lib/apksigner.jar','verify','--verbose',apk])
sha=hashlib.sha256(apk.read_bytes()).hexdigest();(output/'SHA256.txt').write_text(sha+'  '+apk.name+'\n');print('Built',apk,'bytes',apk.stat().st_size,flush=True)
(root/'toolchain/paths.json').write_text(json.dumps({'java':str(java),'javaRoot':str(java_root),'buildtools':str(buildtools),'androidJar':str(android_jar)}))
