package com.nocontacttracker.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import androidx.activity.EnableEdgeToEdge;
import androidx.activity.SystemBarStyle;
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
        androidx.activity.EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        applyWindowInsets();
    }

    /**
     * Pads the Capacitor WebView host so content and interactive controls are
     * never covered by the status bar, navigation bar, display cutout or the
     * IME. Uses WindowInsetsCompat instead of hardcoded system-bar heights.
     */
    private void applyWindowInsets() {
        final android.view.View root = findViewById(android.R.id.content);
        if (root == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
                    | WindowInsetsCompat.Type.ime()
            );
            view.setPadding(bars.left, 0, bars.right, bars.bottom);
            return windowInsets;
        });
    }
}
