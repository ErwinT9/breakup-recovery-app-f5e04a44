# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile


# ---- Capacitor / plugins ----
# Targeted keeps only — the broad `com.getcapacitor.**` rule is intentionally
# removed so R8 can shrink unused Capacitor internals. The plugin registry,
# annotated plugins, and the JS bridge entry points below are the only parts
# that must survive minification.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep class org.apache.cordova.** { *; }

# WebView JS bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---- Firebase / RevenueCat ----
# Library-provided consumer R8 rules (firebase-bom, firebase-crashlytics,
# firebase-perf, purchases-capacitor) keep what they need at runtime.
# Removed the broad `com.google.firebase.**` / `com.revenuecat.purchases.**`
# keep+dontwarn rules so R8 can remove unused classes.

# Keep annotations & source info for readable crash reports
-keepattributes *Annotation*, Signature, InnerClasses, SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
