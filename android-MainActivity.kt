package br.xr18studio
import android.os.Bundle
import android.webkit.WebView
import android.app.Activity

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.loadUrl("file:///android_asset/index.html")
        setContentView(webView)
    }
}
