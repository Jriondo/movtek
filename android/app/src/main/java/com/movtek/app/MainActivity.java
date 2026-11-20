package com.movtek.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        // Marca para que la web sepa que corre dentro del APK (oculta el boton de instalar).
        s.setUserAgentString(s.getUserAgentString() + " MovtekApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String u = request.getUrl().toString();
                if (u.contains("movtek.vercel.app") || u.contains("supabase.co")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); } catch (Exception e) { return false; }
                return true;
            }
        });

        if (savedInstanceState == null) web.loadUrl(getString(R.string.start_url));
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web.canGoBack()) { web.goBack(); return true; }
        return super.onKeyDown(keyCode, event);
    }

    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override protected void onRestoreInstanceState(Bundle i) { super.onRestoreInstanceState(i); web.restoreState(i); }
}
