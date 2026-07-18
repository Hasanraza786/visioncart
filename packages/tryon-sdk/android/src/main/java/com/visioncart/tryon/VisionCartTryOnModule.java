package com.visioncart.tryon;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.os.SystemClock;
import androidx.annotation.Nullable;
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

  private static final Set<String> FACE_CATEGORIES =
      new HashSet<>(Arrays.asList("glasses", "earring", "nose_pin"));
  private static final Set<String> HAND_CATEGORIES =
      new HashSet<>(Arrays.asList("watch", "ring"));
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
    result.putString("category", category);

    if (!SUPPORTED_CATEGORIES.contains(category)) {
      result.putBoolean("supported", false);
      result.putString("reason", "Unknown try-on category");
      promise.resolve(result);
      return;
    }

    if (!hasCameraHardware()) {
      result.putBoolean("supported", false);
      result.putString("reason", "No camera available on this device");
      promise.resolve(result);
      return;
    }

    if (!hasFrontCamera()) {
      result.putBoolean("supported", false);
      result.putString("reason", "No front camera available for try-on");
      promise.resolve(result);
      return;
    }

    result.putBoolean("supported", true);
    if (FACE_CATEGORIES.contains(category)) {
      result.putString("engine", "mlkit-face");
    } else if (HAND_CATEGORIES.contains(category)) {
      result.putString("engine", "camera-hand-overlay");
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

    final String category = optionalString(config, "category");
    final String productId = optionalString(config, "productId");
    final String assetUri = optionalString(config, "platformAssetUri");
    final boolean captureEnabled =
        config.hasKey("captureEnabled") && config.getBoolean("captureEnabled");

    double widthMm = 0;
    double heightMm = 0;
    double depthMm = 0;
    if (config.hasKey("dimensions") && !config.isNull("dimensions")) {
      ReadableMap dimensions = config.getMap("dimensions");
      if (dimensions != null) {
        widthMm = optionalDouble(dimensions, "widthMm");
        heightMm = optionalDouble(dimensions, "heightMm");
        depthMm = optionalDouble(dimensions, "depthMm");
      }
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
      if (!TryOnActivity.installSession(session.token, new SessionBridge())) {
        promise.reject("E_SESSION_ACTIVE", "A try-on session is already active");
        return;
      }
      activeSession = session;
    }

    final double widthExtra = widthMm;
    final double heightExtra = heightMm;
    final double depthExtra = depthMm;

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
            intent.putExtra(TryOnActivity.EXTRA_CATEGORY, category);
            intent.putExtra(TryOnActivity.EXTRA_ASSET_URI, assetUri);
            intent.putExtra(TryOnActivity.EXTRA_SESSION_ID, sessionId);
            intent.putExtra(TryOnActivity.EXTRA_PRODUCT_ID, productId);
            intent.putExtra(TryOnActivity.EXTRA_CAPTURE_ENABLED, captureEnabled);
            intent.putExtra(TryOnActivity.EXTRA_WIDTH_MM, widthExtra);
            intent.putExtra(TryOnActivity.EXTRA_HEIGHT_MM, heightExtra);
            intent.putExtra(TryOnActivity.EXTRA_DEPTH_MM, depthExtra);
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

  private void resolveSession(
      String token,
      String outcome,
      @Nullable String captureUri,
      @Nullable String errorCode) {
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
    result.putString("outcome", outcome);
    result.putDouble("durationMs", SystemClock.elapsedRealtime() - session.startedAtMs);
    if (captureUri != null && !captureUri.isEmpty()) {
      result.putString("captureUri", captureUri);
    }
    if (errorCode != null && !errorCode.isEmpty()) {
      result.putString("errorCode", errorCode);
    }
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

  private boolean hasCameraHardware() {
    PackageManager packageManager = getReactApplicationContext().getPackageManager();
    return packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)
        || packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA)
        || packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT);
  }

  private boolean hasFrontCamera() {
    try {
      CameraManager cameraManager =
          (CameraManager) getReactApplicationContext().getSystemService(Context.CAMERA_SERVICE);
      if (cameraManager == null) {
        return false;
      }
      for (String cameraId : cameraManager.getCameraIdList()) {
        CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);
        Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
        if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) {
          return true;
        }
      }
    } catch (Exception ignored) {
      return false;
    }
    return false;
  }

  private static String optionalString(ReadableMap map, String key) {
    if (!map.hasKey(key) || map.isNull(key)) {
      return "";
    }
    try {
      String value = map.getString(key);
      return value == null ? "" : value;
    } catch (RuntimeException ignored) {
      return "";
    }
  }

  private static double optionalDouble(ReadableMap map, String key) {
    if (!map.hasKey(key) || map.isNull(key)) {
      return 0;
    }
    try {
      return map.getDouble(key);
    } catch (RuntimeException ignored) {
      return 0;
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

  private final class SessionBridge implements TryOnActivity.SessionListener {
    @Override
    public void onClosed(String sessionToken) {
      resolveSession(sessionToken, "cancelled", null, null);
    }

    @Override
    public void onCompleted(String sessionToken, @Nullable String captureUri) {
      resolveSession(sessionToken, "completed", captureUri, null);
    }

    @Override
    public void onFailed(String sessionToken, String errorCode, String message) {
      resolveSession(sessionToken, "failed", null, errorCode);
    }
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
