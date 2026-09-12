package com.musaw.hskrecall;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.view.View;
import android.widget.Toast;
import android.widget.FrameLayout;
import android.view.WindowInsets;
import java.io.*;
import java.util.*;
import org.json.JSONObject;

/** Offline-only application: no Internet, microphone, account, or storage permission. */
public class MainActivity extends Activity {
    public static final int WEB_ID = 12345;
    private static final String ORIGIN = "https://appassets.androidplatform.net/";
    private WebView web;
    private String pendingExport;
    private SharedPreferences state;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        state = getSharedPreferences("recall", MODE_PRIVATE);
        pendingExport = saved == null ? null : saved.getString("pendingExport");
        getWindow().setStatusBarColor(0xfff5f5ef);
        getWindow().setNavigationBarColor(0xfff5f5ef);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        web = new WebView(this);
        web.setId(WEB_ID);
        web.setBackgroundColor(0xfff5f5ef);
        FrameLayout container=new FrameLayout(this);
        container.setBackgroundColor(0xfff5f5ef);
        container.addView(web,new FrameLayout.LayoutParams(-1,-1));
        container.setOnApplyWindowInsetsListener((v,insets)->{
            if(android.os.Build.VERSION.SDK_INT>=30){
                android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());
                v.setPadding(bars.left,bars.top,bars.right,bars.bottom);
                return WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith(ORIGIN);
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return localAsset(request);
            }
        });
        setContentView(container);
        web.loadUrl(ORIGIN + "index.html");
    }

    private WebResourceResponse localAsset(WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost())) return error(403, "Forbidden");
        String path = uri.getPath();
        if (path == null || path.contains("..") || path.contains("\\")) return error(403, "Forbidden");
        path = path.replaceFirst("^/", "");
        if (path.isEmpty()) path = "index.html";
        String mime = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "application/javascript" : path.endsWith(".css") ? "text/css" : path.endsWith(".mp3") ? "audio/mpeg" : "application/octet-stream";
        try {
            if (path.endsWith(".mp3")) {
                AssetFileDescriptor fd = getAssets().openFd(path);
                long total = fd.getLength(), start = 0, end = total - 1;
                String range = request.getRequestHeaders().get("Range");
                if (range == null) range = request.getRequestHeaders().get("range");
                if (range != null && range.matches("bytes=\\d+-\\d*")) {
                    String[] parts = range.substring(6).split("-", -1);
                    start = Long.parseLong(parts[0]);
                    if (!parts[1].isEmpty()) end = Math.min(end, Long.parseLong(parts[1]));
                }
                if (start > end || start >= total) {fd.close(); return error(416, "Range Not Satisfiable");}
                InputStream stream = fd.createInputStream();
                long left = start;
                while (left > 0) {long skipped = stream.skip(left);if(skipped<=0) {stream.close();return error(416,"Range Not Satisfiable");}left-=skipped;}
                final long length = end - start + 1;
                InputStream limited = new FilterInputStream(stream) {
                    long remaining = length;
                    @Override public int read() throws IOException {if(remaining<=0)return -1;int result=super.read();if(result>=0)remaining--;return result;}
                    @Override public int read(byte[] b,int off,int len) throws IOException {if(remaining<=0)return -1;int result=in.read(b,off,(int)Math.min(len,remaining));if(result>0)remaining-=result;return result;}
                };
                Map<String,String> headers = new HashMap<>();
                headers.put("Accept-Ranges","bytes");headers.put("Content-Length",Long.toString(length));
                if(range!=null)headers.put("Content-Range","bytes "+start+"-"+end+"/"+total);
                return new WebResourceResponse(mime,null,range==null?200:206,range==null?"OK":"Partial Content",headers,limited);
            }
            return new WebResourceResponse(mime,"UTF-8",getAssets().open(path));
        } catch(Exception e) {return error(404,"Not Found");}
    }
    private WebResourceResponse error(int status,String reason) {
        return new WebResourceResponse("text/plain","UTF-8",status,reason,Collections.emptyMap(),new ByteArrayInputStream(reason.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
    private class Bridge {
        @JavascriptInterface public void openUpdates(String url) {
            Uri uri=Uri.parse(url==null?"":url);
            if(!"https".equals(uri.getScheme())||!"github.com".equals(uri.getHost())||uri.getUserInfo()!=null)return;
            runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){Toast.makeText(MainActivity.this,"No browser available to open GitHub",Toast.LENGTH_LONG).show();}});
        }
        private boolean allowed(String key) {return "hsk-recall-words-v4".equals(key);}
        @JavascriptInterface public String load(String key) {
            if(!allowed(key))return "";
            String value=state.getString(key,"");
            if(validProgress(value))return value;
            String previous=state.getString(key+".previous","");
            return validProgress(previous)?previous:"";
        }
        private boolean validProgress(String json) {
            try {JSONObject data=new JSONObject(json);return data.optInt("version")==4&&data.optJSONObject("words")!=null;}catch(Exception e){return false;}
        }
        @JavascriptInterface public boolean save(String key,String json) {
            if(!allowed(key)||json==null||json.length()>2000000||!validProgress(json))return false;
            String previous=state.getString(key, "");
            SharedPreferences.Editor editor=state.edit();
            if(validProgress(previous)&&!previous.equals(json))editor.putString(key+".previous",previous);
            return editor.putString(key,json).commit();
        }
        @JavascriptInterface public void importJSON() {
            runOnUiThread(()->{Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");startActivityForResult(intent,101);});
        }
        @JavascriptInterface public void exportJSON(String json) {
            if(json==null||json.length()>3000000)return;
            runOnUiThread(()->{pendingExport=json;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"hsk-recall-progress.json");startActivityForResult(intent,100);});
        }
    }
    @Override protected void onSaveInstanceState(Bundle out) {super.onSaveInstanceState(out);out.putString("pendingExport",pendingExport);}
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==100&&result==RESULT_OK&&data!=null&&data.getData()!=null&&pendingExport!=null){
            try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(pendingExport.getBytes(java.nio.charset.StandardCharsets.UTF_8));Toast.makeText(this,"Progress exported",Toast.LENGTH_SHORT).show();}
            catch(Exception e){Toast.makeText(this,"Could not save export",Toast.LENGTH_LONG).show();}
        }
        if(request==100)pendingExport=null;
        if(request==101&&result==RESULT_OK&&data!=null&&data.getData()!=null) {
            try(InputStream input=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream buffer=new ByteArrayOutputStream()) {
                byte[] bytes=new byte[8192];int count;
                while((count=input.read(bytes))!=-1){buffer.write(bytes,0,count);if(buffer.size()>5000000)throw new IOException("Backup too large");}
                String json=buffer.toString("UTF-8");
                web.evaluateJavascript("window.receiveAndroidImport("+JSONObject.quote(json)+")",null);
            }catch(Exception e){Toast.makeText(this,"Could not import this backup",Toast.LENGTH_LONG).show();}
        }
    }
    @Override protected void onPause(){if(web!=null){web.evaluateJavascript("if(window.speechSynthesis)speechSynthesis.cancel();if(document.querySelector('#examAudio'))document.querySelector('#examAudio').pause();",null);web.onPause();}super.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("AndroidBridge");web.destroy();}super.onDestroy();}
}
