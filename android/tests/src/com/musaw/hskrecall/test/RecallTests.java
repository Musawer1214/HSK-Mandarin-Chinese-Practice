package com.musaw.hskrecall.test;
import android.app.*;
import android.content.*;
import android.os.*;
import android.webkit.WebView;
import android.graphics.Bitmap;
import java.io.*;
import java.util.concurrent.*;
import org.json.*;

public class RecallTests extends Instrumentation {
 private Activity activity;private WebView web;private Bundle args;private StringBuilder report=new StringBuilder();private int passed;
 @Override public void onCreate(Bundle arguments){args=arguments;start();}
 private Object js(String code)throws Exception{
  CountDownLatch latch=new CountDownLatch(1);String[] value={null};
  runOnMainSync(()->web.evaluateJavascript("(function(){"+code+"})()",r->{value[0]=r;latch.countDown();}));
  if(!latch.await(8,TimeUnit.SECONDS))throw new Exception("JS timeout: "+code);
  return value[0]==null?null:new JSONTokener(value[0]).nextValue();
 }
 private void check(String name,String expression)throws Exception{if(!Boolean.TRUE.equals(js("return ("+expression+");")))throw new Exception(name+" failed");passed++;report.append("PASS ").append(name).append('\n');}
 private void waitFor(String expression)throws Exception{for(int i=0;i<80;i++){if(Boolean.TRUE.equals(js("return ("+expression+");")))return;Thread.sleep(100);}throw new Exception("Timeout "+expression);}
 private void click(String selector)throws Exception{js("document.querySelector("+JSONObject.quote(selector)+").click();");}
 private void screenshot(String name)throws Exception{Bitmap b=getUiAutomation().takeScreenshot();try(FileOutputStream out=new FileOutputStream(new File(activity.getExternalFilesDir(null),name))){b.compress(Bitmap.CompressFormat.PNG,100,out);}}
 @Override public void onStart(){
  Bundle result=new Bundle();
  try{
   Intent intent=new Intent(Intent.ACTION_MAIN);intent.setClassName("com.musaw.hskrecall","com.musaw.hskrecall.MainActivity");intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
   activity=startActivitySync(intent);web=(WebView)activity.findViewById(12345);waitFor("typeof ready!=='undefined'&&ready");
   if("listening".equals(args.getString("phase"))){
     runOnMainSync(()->web.getSettings().setMediaPlaybackRequiresUserGesture(false));
     js("window.recallBefore=JSON.stringify(state.words);");click("#listeningTab");click("#quizNew");waitFor("state.listening.round.questions[0].played");
     check("offline quiz audio plays","HSKAudio.player.currentTime>0&&!HSKAudio.player.error");
     check("four Chinese and four English options","document.querySelectorAll('[data-choice=chinese]').length===4&&document.querySelectorAll('[data-choice=english]').length===4");
     js("var q=state.listening.round.questions[0];document.querySelector('[data-choice=chinese][data-id='+q.id+']').click();document.querySelector('[data-choice=english][data-id='+q.id+']').click();");click("#quizCheck");
     check("both correct earns one point","state.listening.words[state.listening.round.questions[0].id].correct===1");
     check("recall ratings untouched","JSON.stringify(state.words)===recallBefore");
     check("quiz saved natively","JSON.parse(AndroidBridge.load(STORAGE_KEY)).listening.round.questions[0].submitted");
     check("minimal header and collapsed details","!document.querySelector('.intro')&&!document.querySelector('#mobileProgress').open");
     check("mobile width fits","document.documentElement.scrollWidth<=innerWidth");
     Thread.sleep(600);screenshot("android16-listening.png");
    }else if("listeningResume".equals(args.getString("phase"))){
     check("quiz survives process stop","state.listening.round.questions[0].submitted&&state.listening.words[state.listening.round.questions[0].id].correct===1");
     click("#listeningTab");check("submitted quiz cannot score twice","document.querySelector('#quizCheck').disabled");
    }else if("resume".equals(args.getString("phase"))){
    check("force-stop retains word progress","state.words[WORDS[0].id]?.status==='weak'");
    check("force-stop retains unfinished round","state.session?.queue[0].id===WORDS[0].id");
    check("native store matches restored state","JSON.parse(AndroidBridge.load(STORAGE_KEY)).words[WORDS[0].id].status==='weak'");
   }else{
    check("600 complete classic words","WORDS.length===600&&[1,2,3].map(l=>WORDS.filter(w=>w.level===l).length).join(',')==='150,150,300'");
    check("fresh app has independent empty progress","Object.keys(state.words).length===0");
    check("offline app has no server","disk===null&&!window.HSK_SERVER");
    click("#begin");check("round starts with 20 words","state.session.queue.length===20");
    check("HSK3 emphasis","state.session.queue.filter(q=>byId.get(q.id).level===3).length===14");
    for(String l:new String[]{"1","2","3"}){js("$('#level').value='"+l+"';$('#level').dispatchEvent(new Event('change'));");check("immediate HSK"+l+" filter","state.session.queue.every(q=>byId.get(q.id).level==="+l+")");}
    check("answers hidden until reveal","document.querySelector('.answer')===null");
    click("#reveal");check("answer has pinyin","document.querySelector('.pinyin').textContent.length>0");
    // JS click drives the same event handler; gesture requirement is temporarily relaxed only by the test harness.
    runOnMainSync(()->web.getSettings().setMediaPlaybackRequiresUserGesture(false));
    click("#listen");waitFor("HSKAudio.player&&HSKAudio.player.currentTime>0");check("bundled Mandarin audio plays offline","HSKAudio.player.error===null");
    js("window.testWord=state.session.queue[0].id;");click("[data-rate=again]");
    check("miss saved as weak","state.words[testWord].status==='weak'");
    check("native save committed immediately","JSON.parse(AndroidBridge.load(STORAGE_KEY)).words[testWord].status==='weak'");
    check("miss requeued","state.session.queue.some(q=>q.id===testWord&&q.kind==='repeat')");
    js("state.session.queue=[{id:testWord,kind:'repeat'}];revealed=true;rate('good');");
    check("immediate retry does not falsely complete","state.words[testWord].streak===0&&state.words[testWord].status==='weak'");
    for(int i=1;i<=3;i++){
     js("createRound(false,testWord);revealed=true;rate('good');");
     check("confident-round step "+i,"state.words[testWord].streak==="+i);
     check("bar includes partial progress "+i,"completionByLevel().find(l=>l.level===3).recallSteps==="+i);
    }
    check("three rounds become secure","state.words[testWord].status==='secure'");
    js("$('#level').value='all';createRound();");check("completed word skipped","state.session.queue.every(q=>q.id!==testWord)");
    js("createRound(false,testWord);revealed=true;rate('hard');");check("hesitation returns to weak collection","state.words[testWord].status==='weak'");
    js("view='weak';render();");check("persistent weak library","$('#wordList').textContent.includes(byId.get(testWord).hanzi)");
    check("portrait has no horizontal overflow","document.documentElement.scrollWidth<=innerWidth");screenshot("android16-weak-words.png");
    runOnMainSync(()->activity.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));Thread.sleep(600);
    check("rotation preserves state","state.words[testWord].status==='weak'");check("landscape fits","document.documentElement.scrollWidth<=innerWidth");screenshot("android16-landscape.png");
    runOnMainSync(()->activity.setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));Thread.sleep(400);
    // Native backup import uses the exact same merge function as the document-picker callback.
    js("receiveAndroidImport(JSON.stringify({version:4,words:{[WORDS[1].id]:{status:'weak',streak:0,lastSeen:Date.now(),reviews:2,lapses:1}}}));");
    check("backup import merges","state.words[WORDS[1].id].status==='weak'&&state.words[testWord].status==='weak'");
    js("window.importBefore=JSON.stringify(state.words);receiveAndroidImport('invalid');");check("invalid import preserves data","JSON.stringify(state.words)===importBefore");
    // Prepare a known active word for a separate process-restart test.
    js("$('#level').value='1';createRound(false,WORDS[0].id);revealed=true;rate('again');");
    check("active round saved for restart","JSON.parse(AndroidBridge.load(STORAGE_KEY)).session.queue[0].id===WORDS[0].id");
    runOnMainSync(()->web.reload());waitFor("typeof ready!=='undefined'&&ready&&typeof window.testWord==='undefined'");check("WebView reload restores weak progress","state.words[WORDS[0].id].status==='weak'");check("reload restores same card","state.session.queue[0].id===WORDS[0].id");
    screenshot("android16-recall.png");
    // Export launches Android's save picker; Back cancels without changing ratings.
    click("#export");Thread.sleep(600);getUiAutomation().performGlobalAction(1);Thread.sleep(300);
    File exported=new File(activity.getExternalFilesDir(null),"test-export.json");
    // Exercise the actual Android save-result path with a test-owned document URI.
    js("AndroidBridge.exportJSON(JSON.stringify(state));");Thread.sleep(500);
    runOnMainSync(()->{try{java.lang.reflect.Method method=activity.getClass().getDeclaredMethod("onActivityResult",int.class,int.class,Intent.class);method.setAccessible(true);method.invoke(activity,100,Activity.RESULT_OK,new Intent().setData(android.net.Uri.fromFile(exported)));}catch(Exception e){throw new RuntimeException(e);}});
    if(!exported.exists()||exported.length()<100)throw new Exception("Native backup export failed");passed++;report.append("PASS native backup file written\n");
    getUiAutomation().performGlobalAction(1);
   }
   result.putString("stream",report+"PASS TOTAL: "+passed+"\n");finish(Activity.RESULT_OK,result);
  }catch(Throwable e){result.putString("stream",report+"FAIL: "+e.toString()+"\n");finish(Activity.RESULT_CANCELED,result);}
 }
}
