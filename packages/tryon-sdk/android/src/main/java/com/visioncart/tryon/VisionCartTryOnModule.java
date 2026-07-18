package com.visioncart.tryon;

import android.app.Activity;
import android.content.Intent;
import android.os.SystemClock;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.module.annotations.ReactModule;
import java.io.File;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@ReactModule(name = VisionCartTryOnModule.NAME)
public final class VisionCartTryOnModule extends NativeVisionCartTryOnSpec {
  public static final String NAME = "VisionCartTryOn";

  private static final Set<String> SUPPORTED_CATEGORIES =
      new HashSet<>(Arrays.asList("glasses", "watch", "ring", "earring", "nose_pin"));

  private final Object sessionLock = new Object();
  private ActiveSession activeSession;
  private boolean invalidated;

  VisionCartTryOnModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @Override
  public void isSupported(String category, Promise promise) {
    WritableMap result = new WritableNativeMap();
    boolean supported = SUPPORTED_CATEGORIES.contains(category);
    result.putBoolean("supported", supported);
    result.putString("category", category);
    if (supported) {
      result.putString("engine", "placeholder");
    } else {
      result.putString("reason", "Unknown try-on category");
    }
    promise.resolve(result);
  }

  @Override
  public void open(ReadableMap config, Promise promise) {
    final String sessionId;
    try {
      sessionId = config.getString("sessionId");
      if (sessionId == null || sessionId.isEmpty()) {
        promise.reject("E_INVALID_CONFIG", "sessionId must not be empty");
        return;
      }
    } catch (RuntimeException exception) {
      promise.reject("E_INVALID_CONFIG", "A valid sessionId is required", exception);
      return;
    }

    final ActiveSession session =
        new ActiveSession(
            UUID.randomUUID().toString(), sessionId, SystemClock.elapsedRealtime(), promise);
    synchronized (sessionLock) {
      if (invalidated) {
        promise.reject("E_INVALIDATED", "The try-on module has been invalidated");
        return;
      }
      if (activeSession != null) {
        promise.reject("E_SESSION_ACTIVE", "A try-on session is already active");
        return;
      }
      if (!TryOnActivity.installSession(session.token, this::onActivityClosed)) {
        promise.reject("E_SESSION_ACTIVE", "A try-on session is already active");
        return;
      }
      activeSession = session;
    }

    UiThreadUtil.runOnUiThread(
        () -> {
          synchronized (sessionLock) {
            if (activeSession != session || invalidated) {
              return;
            }
          }
          Activity activity = getCurrentActivity();
          if (activity == null || activity.isFinishing()) {
            failToOpen(session, "No foreground Activity is available", null);
            return;
          }
          try {
            Intent intent = new Intent(activity, TryOnActivity.class);
            intent.putExtra(TryOnActivity.EXTRA_TOKEN, session.token);
            activity.startActivity(intent);
          } catch (RuntimeException exception) {
            failToOpen(session, "Unable to open try-on", exception);
          }
        });
  }

  @Override
  public void clearCache(Promise promise) {
    File sdkCache = new File(getReactApplicationContext().getCacheDir(), "visioncart-tryon");
    if (!sdkCache.exists() || deleteRecursively(sdkCache)) {
      promise.resolve(null);
    } else {
      promise.reject("E_CACHE_CLEAR_FAILED", "Unable to clear the try-on cache");
    }
  }

  @Override
  public void invalidate() {
    ActiveSession session;
    synchronized (sessionLock) {
      invalidated = true;
      session = activeSession;
      activeSession = null;
    }
    if (session != null) {
      TryOnActivity.abandonSession(session.token);
      session.promise.reject("E_INVALIDATED", "The try-on module was invalidated");
    }
    super.invalidate();
  }

  private void onActivityClosed(String token) {
    ActiveSession session;
    synchronized (sessionLock) {
      session = activeSession;
      if (session == null || !session.token.equals(token)) {
        return;
      }
      activeSession = null;
    }

    WritableMap result = new WritableNativeMap();
    result.putString("sessionId", session.sessionId);
    result.putString("outcome", "cancelled");
    result.putDouble("durationMs", SystemClock.elapsedRealtime() - session.startedAtMs);
    session.promise.resolve(result);
  }

  private void failToOpen(ActiveSession session, String message, RuntimeException exception) {
    synchronized (sessionLock) {
      if (activeSession != session) {
        return;
      }
      activeSession = null;
    }
    TryOnActivity.abandonSession(session.token);
    if (exception == null) {
      session.promise.reject("E_OPEN_FAILED", message);
    } else {
      session.promise.reject("E_OPEN_FAILED", message, exception);
    }
  }

  private static boolean deleteRecursively(File file) {
    File[] children = file.listFiles();
    if (children != null) {
      for (File child : children) {
        if (!deleteRecursively(child)) {
          return false;
        }
      }
    }
    return file.delete();
  }

  private static final class ActiveSession {
    final String token;
    final String sessionId;
    final long startedAtMs;
    final Promise promise;

    ActiveSession(String token, String sessionId, long startedAtMs, Promise promise) {
      this.token = token;
      this.sessionId = sessionId;
      this.startedAtMs = startedAtMs;
      this.promise = promise;
    }
  }
}
