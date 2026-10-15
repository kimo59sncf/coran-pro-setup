package com.coranprofree.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Keep WebView audio playing when the screen turns off or the app goes
    // to background: BridgeActivity.onPause() pauses the WebView (which cuts
    // audio), so we resume it right after. Playback controls stay available
    // via the Media Session notification / lock screen.
    @Override
    public void onPause() {
        super.onPause();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().onResume();
        }
    }
}
