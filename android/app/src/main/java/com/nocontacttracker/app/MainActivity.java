package com.nocontacttracker.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Must be registered before super.onCreate() so the bridge picks it up.
        registerPlugin(FirebaseInAppMessagingPlugin.class);
        // Android 15 (API 35) enforces edge-to-edge and no-ops the deprecated
        // Window#setStatusBarColor / setNavigationBarColor APIs. EdgeToEdge.enable()
        // is the AndroidX replacement: it lays the window out behind transparent
        // system bars and picks light/dark bar icons per the system theme.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        applyWindowInsets();
    }

    /**
     * The web layer already keeps content clear of the status bar, navigation
     * bar and display cutout via CSS env(safe-area-inset-*), so those insets are
     * left to the WebView. Only the IME inset is applied natively (API 35 no
     * longer resizes the window for adjustResize under edge-to-edge), keeping
     * focused inputs and buttons above the keyboard. No hardcoded bar heights.
     */
    private void applyWindowInsets() {
        final android.view.View root = findViewById(android.R.id.content);
        if (root == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            int keyboard = Math.max(ime.bottom - bars.bottom, 0);
            view.setPadding(0, 0, 0, keyboard);
            return windowInsets;
        });
    }
}
