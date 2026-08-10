package com.nocontacttracker.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.inappmessaging.FirebaseInAppMessaging;
import com.google.firebase.installations.FirebaseInstallations;

/**
 * Thin bridge over the Firebase In-App Messaging display SDK. The SDK renders
 * campaigns on its own once the dependency is present; these methods only give
 * JavaScript the few controls the app needs.
 */
@CapacitorPlugin(name = "FirebaseInAppMessaging")
public class FirebaseInAppMessagingPlugin extends Plugin {

    @PluginMethod
    public void triggerEvent(PluginCall call) {
        String eventId = call.getString("eventId");
        if (eventId == null || eventId.isEmpty()) {
            call.reject("eventId is required");
            return;
        }
        FirebaseInAppMessaging.getInstance().triggerEvent(eventId);
        call.resolve();
    }

    @PluginMethod
    public void setMessagesSuppressed(PluginCall call) {
        boolean suppressed = Boolean.TRUE.equals(call.getBoolean("suppressed", false));
        FirebaseInAppMessaging.getInstance().setMessagesSuppressed(suppressed);
        call.resolve();
    }

    @PluginMethod
    public void setAutomaticDataCollectionEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", true));
        FirebaseInAppMessaging.getInstance().setAutomaticDataCollectionEnabled(enabled);
        call.resolve();
    }

    /** Firebase installation ID — needed to target a test campaign at a device. */
    @PluginMethod
    public void getInstallationId(final PluginCall call) {
        FirebaseInstallations.getInstance()
            .getId()
            .addOnSuccessListener(id -> {
                com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
                result.put("installationId", id);
                call.resolve(result);
            })
            .addOnFailureListener(e -> call.reject(e.getMessage(), e));
    }
}
