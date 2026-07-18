package com.visioncart.tryon;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.PointF;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Bundle;
import android.util.Size;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.face.Face;
import com.google.mlkit.vision.face.FaceDetection;
import com.google.mlkit.vision.face.FaceDetector;
import com.google.mlkit.vision.face.FaceDetectorOptions;
import com.google.mlkit.vision.face.FaceLandmark;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class TryOnActivity extends AppCompatActivity {
  interface SessionListener {
    void onClosed(String token);

    void onCompleted(String token, @Nullable String captureUri);

    void onFailed(String token, String errorCode, String message);
  }

  static final String EXTRA_TOKEN = "com.visioncart.tryon.SESSION_TOKEN";
  static final String EXTRA_CATEGORY = "com.visioncart.tryon.CATEGORY";
  static final String EXTRA_ASSET_URI = "com.visioncart.tryon.ASSET_URI";
  static final String EXTRA_SESSION_ID = "com.visioncart.tryon.SESSION_ID";
  static final String EXTRA_PRODUCT_ID = "com.visioncart.tryon.PRODUCT_ID";
  static final String EXTRA_CAPTURE_ENABLED = "com.visioncart.tryon.CAPTURE_ENABLED";
  static final String EXTRA_WIDTH_MM = "com.visioncart.tryon.WIDTH_MM";
  static final String EXTRA_HEIGHT_MM = "com.visioncart.tryon.HEIGHT_MM";
  static final String EXTRA_DEPTH_MM = "com.visioncart.tryon.DEPTH_MM";

  private static final int REQUEST_CAMERA = 7101;
  private static final Set<String> FACE_CATEGORIES =
      new HashSet<>(Arrays.asList("glasses", "earring", "nose_pin"));
  private static final Set<String> HAND_CATEGORIES =
      new HashSet<>(Arrays.asList("watch", "ring"));

  private static final Object SESSION_LOCK = new Object();
  private static SessionListener sessionListener;
  private static String sessionToken;
  private static WeakReference<TryOnActivity> currentActivity = new WeakReference<>(null);

  private boolean reported;
  private String token;
  private String category = "glasses";
  private boolean captureEnabled;
  private boolean handMode;

  private PreviewView previewView;
  private OverlayView overlayView;
  private FrameLayout cameraContainer;
  private FaceDetector faceDetector;
  private ExecutorService analysisExecutor;
  private final AtomicBoolean analyzing = new AtomicBoolean(false);
  @Nullable private ProcessCameraProvider cameraProvider;

  static boolean installSession(String token, SessionListener listener) {
    synchronized (SESSION_LOCK) {
      if (sessionListener != null) {
        return false;
      }
      sessionToken = token;
      sessionListener = listener;
      return true;
    }
  }

  static void abandonSession(String token) {
    TryOnActivity activity = null;
    synchronized (SESSION_LOCK) {
      if (!token.equals(sessionToken)) {
        return;
      }
      sessionListener = null;
      sessionToken = null;
      activity = currentActivity.get();
    }
    if (activity != null) {
      activity.runOnUiThread(activity::finishWithoutReporting);
    }
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    token = getIntent().getStringExtra(EXTRA_TOKEN);
    if (token == null) {
      finish();
      return;
    }
    synchronized (SESSION_LOCK) {
      if (!token.equals(sessionToken) || sessionListener == null) {
        finish();
        return;
      }
      currentActivity = new WeakReference<>(this);
    }

    category = safeString(getIntent().getStringExtra(EXTRA_CATEGORY), "glasses");
    captureEnabled = getIntent().getBooleanExtra(EXTRA_CAPTURE_ENABLED, false);
    handMode = HAND_CATEGORIES.contains(category);
    if (!FACE_CATEGORIES.contains(category) && !handMode) {
      handMode = false;
    }

    analysisExecutor = Executors.newSingleThreadExecutor();
    buildUi();

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
        == PackageManager.PERMISSION_GRANTED) {
      startCamera();
    } else {
      ActivityCompat.requestPermissions(
          this, new String[] {Manifest.permission.CAMERA}, REQUEST_CAMERA);
    }
  }

  private void buildUi() {
    FrameLayout root = new FrameLayout(this);
    root.setBackgroundColor(0xFF000000);

    cameraContainer = new FrameLayout(this);
    previewView = new PreviewView(this);
    previewView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
    previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
    cameraContainer.addView(
        previewView,
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    overlayView = new OverlayView(this);
    overlayView.configure(category, handMode);
    cameraContainer.addView(
        overlayView,
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    root.addView(
        cameraContainer,
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    TextView banner = new TextView(this);
    banner.setText("Development preview — not sizing");
    banner.setTextColor(0xFF1A1A1A);
    banner.setTextSize(13);
    banner.setTypeface(Typeface.DEFAULT_BOLD);
    banner.setBackgroundColor(0xE8E8C547);
    banner.setPadding(28, 18, 28, 18);
    banner.setGravity(Gravity.CENTER);
    FrameLayout.LayoutParams bannerParams =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    bannerParams.gravity = Gravity.TOP;
    root.addView(banner, bannerParams);

    TextView guidance = new TextView(this);
    guidance.setText(guidanceForCategory(category));
    guidance.setTextColor(Color.WHITE);
    guidance.setTextSize(16);
    guidance.setShadowLayer(6f, 0f, 1f, 0x88000000);
    guidance.setGravity(Gravity.CENTER);
    guidance.setPadding(32, 16, 32, 16);
    FrameLayout.LayoutParams guidanceParams =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    guidanceParams.gravity = Gravity.TOP;
    guidanceParams.topMargin = 96;
    root.addView(guidance, guidanceParams);

    Button close = styledButton("Close");
    close.setOnClickListener(ignored -> finishWithClosed());
    FrameLayout.LayoutParams closeParams =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    closeParams.gravity = Gravity.TOP | Gravity.END;
    closeParams.setMargins(24, 160, 24, 24);
    root.addView(close, closeParams);

    LinearLayout controls = new LinearLayout(this);
    controls.setOrientation(LinearLayout.HORIZONTAL);
    controls.setGravity(Gravity.CENTER);
    controls.setPadding(16, 16, 16, 32);

    Button scaleDown = styledButton("Scale −");
    scaleDown.setOnClickListener(
        ignored -> overlayView.setOverlayScale(overlayView.getOverlayScale() - 0.1f));
    controls.addView(scaleDown, controlParams());

    Button scaleUp = styledButton("Scale +");
    scaleUp.setOnClickListener(
        ignored -> overlayView.setOverlayScale(overlayView.getOverlayScale() + 0.1f));
    controls.addView(scaleUp, controlParams());

    if (captureEnabled) {
      Button capture = styledButton("Capture");
      capture.setOnClickListener(ignored -> captureAndComplete());
      controls.addView(capture, controlParams());
    }

    FrameLayout.LayoutParams controlsParams =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    controlsParams.gravity = Gravity.BOTTOM;
    root.addView(controls, controlsParams);

    setContentView(root);
  }

  private Button styledButton(String label) {
    Button button = new Button(this);
    button.setText(label);
    button.setAllCaps(false);
    button.setTextColor(Color.WHITE);
    button.setBackgroundColor(0xCC222222);
    return button;
  }

  private static LinearLayout.LayoutParams controlParams() {
    LinearLayout.LayoutParams params =
        new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    params.setMargins(10, 0, 10, 0);
    return params;
  }

  private static String guidanceForCategory(String category) {
    switch (category) {
      case "glasses":
        return "Look at the camera — align glasses with your eyes";
      case "earring":
        return "Face the camera — markers track your ears";
      case "nose_pin":
        return "Face the camera — marker tracks your nose";
      case "watch":
        return "Show your hand/wrist — drag the proxy, use Scale +/−";
      case "ring":
        return "Show your hand — drag the proxy onto a finger, use Scale +/−";
      default:
        return "Development try-on preview";
    }
  }

  @Override
  public void onRequestPermissionsResult(
      int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode != REQUEST_CAMERA) {
      return;
    }
    if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
      startCamera();
    } else {
      reportFailed("PERMISSION_DENIED", "Camera permission was denied");
      finish();
    }
  }

  private void startCamera() {
    if (!handMode) {
      FaceDetectorOptions options =
          new FaceDetectorOptions.Builder()
              .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
              .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
              .setMinFaceSize(0.15f)
              .build();
      faceDetector = FaceDetection.getClient(options);
    }

    ListenableFuture<ProcessCameraProvider> future =
        ProcessCameraProvider.getInstance(this);
    future.addListener(
        () -> {
          try {
            cameraProvider = future.get();
            bindCameraUseCases(cameraProvider);
          } catch (Exception exception) {
            reportFailed("CAMERA_UNAVAILABLE", "Unable to start the camera");
            finish();
          }
        },
        ContextCompat.getMainExecutor(this));
  }

  private void bindCameraUseCases(@NonNull ProcessCameraProvider provider) {
    provider.unbindAll();

    Preview preview = new Preview.Builder().build();
    preview.setSurfaceProvider(previewView.getSurfaceProvider());

    CameraSelector selector = CameraSelector.DEFAULT_FRONT_CAMERA;
    ImageAnalysis analysis = null;

    if (!handMode && faceDetector != null) {
      analysis =
          new ImageAnalysis.Builder()
              .setTargetResolution(new Size(480, 640))
              .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
              .build();
      analysis.setAnalyzer(analysisExecutor, this::analyzeFrame);
    }

    try {
      if (analysis != null) {
        provider.bindToLifecycle(this, selector, preview, analysis);
      } else {
        provider.bindToLifecycle(this, selector, preview);
      }
    } catch (RuntimeException exception) {
      // Fall back to back camera if front is unavailable after capability check race.
      try {
        if (analysis != null) {
          provider.bindToLifecycle(
              this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);
        } else {
          provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview);
        }
        overlayView.setImageSourceInfo(480, 640, false);
      } catch (RuntimeException nested) {
        reportFailed("CAMERA_UNAVAILABLE", "Unable to bind the camera");
        finish();
      }
    }
  }

  private void analyzeFrame(@NonNull ImageProxy imageProxy) {
    if (handMode || faceDetector == null || reported) {
      imageProxy.close();
      return;
    }
    if (!analyzing.compareAndSet(false, true)) {
      imageProxy.close();
      return;
    }

    try {
      if (imageProxy.getImage() == null) {
        analyzing.set(false);
        imageProxy.close();
        return;
      }
      int rotation = imageProxy.getImageInfo().getRotationDegrees();
      InputImage image =
          InputImage.fromMediaImage(imageProxy.getImage(), rotation);
      final int width =
          rotation == 90 || rotation == 270 ? imageProxy.getHeight() : imageProxy.getWidth();
      final int height =
          rotation == 90 || rotation == 270 ? imageProxy.getWidth() : imageProxy.getHeight();

      faceDetector
          .process(image)
          .addOnSuccessListener(
              faces -> {
                overlayView.setImageSourceInfo(width, height, true);
                updateFaceOverlay(faces, width, height);
              })
          .addOnFailureListener(ignored -> overlayView.clearFaceOverlay())
          .addOnCompleteListener(
              ignored -> {
                analyzing.set(false);
                imageProxy.close();
              });
    } catch (RuntimeException exception) {
      analyzing.set(false);
      imageProxy.close();
    }
  }

  private void updateFaceOverlay(List<Face> faces, int imageWidth, int imageHeight) {
    if (faces == null || faces.isEmpty()) {
      overlayView.clearFaceOverlay();
      return;
    }

    Face face = faces.get(0);
    List<OverlayView.LandmarkMarker> markers = new ArrayList<>();
    List<RectF> rectangles = new ArrayList<>();

    switch (category) {
      case "glasses":
        {
          FaceLandmark leftEye = face.getLandmark(FaceLandmark.LEFT_EYE);
          FaceLandmark rightEye = face.getLandmark(FaceLandmark.RIGHT_EYE);
          if (leftEye != null && rightEye != null) {
            PointF left = leftEye.getPosition();
            PointF right = rightEye.getPosition();
            float eyeDist = distance(left, right);
            float boxH = eyeDist * 0.55f;
            float padX = eyeDist * 0.35f;
            rectangles.add(
                new RectF(
                    Math.min(left.x, right.x) - padX,
                    ((left.y + right.y) * 0.5f) - boxH * 0.5f,
                    Math.max(left.x, right.x) + padX,
                    ((left.y + right.y) * 0.5f) + boxH * 0.5f));
            markers.add(new OverlayView.LandmarkMarker(left, 10f, 0xAA4FC3F7));
            markers.add(new OverlayView.LandmarkMarker(right, 10f, 0xAA4FC3F7));
          } else {
            Rect bounds = face.getBoundingBox();
            rectangles.add(new RectF(bounds));
          }
          break;
        }
      case "earring":
        {
          FaceLandmark leftEar = face.getLandmark(FaceLandmark.LEFT_EAR);
          FaceLandmark rightEar = face.getLandmark(FaceLandmark.RIGHT_EAR);
          if (leftEar != null) {
            markers.add(
                new OverlayView.LandmarkMarker(leftEar.getPosition(), 14f, 0xAAE8C547));
          }
          if (rightEar != null) {
            markers.add(
                new OverlayView.LandmarkMarker(rightEar.getPosition(), 14f, 0xAAE8C547));
          }
          if (markers.isEmpty()) {
            Rect bounds = face.getBoundingBox();
            markers.add(
                new OverlayView.LandmarkMarker(
                    new PointF(bounds.left, bounds.centerY()), 12f, 0xAAE8C547));
            markers.add(
                new OverlayView.LandmarkMarker(
                    new PointF(bounds.right, bounds.centerY()), 12f, 0xAAE8C547));
          }
          break;
        }
      case "nose_pin":
        {
          FaceLandmark nose = face.getLandmark(FaceLandmark.NOSE_BASE);
          if (nose != null) {
            PointF tip = nose.getPosition();
            // Slight offset toward one nostril for a nose-pin look
            markers.add(
                new OverlayView.LandmarkMarker(
                    new PointF(tip.x + 12f, tip.y - 6f), 11f, 0xAAFF8A65));
          } else {
            Rect bounds = face.getBoundingBox();
            markers.add(
                new OverlayView.LandmarkMarker(
                    new PointF(bounds.centerX(), bounds.centerY()), 11f, 0xAAFF8A65));
          }
          break;
        }
      default:
        break;
    }

    // Keep image size in sync for mapping even if landmarks partially missing.
    if (imageWidth > 0 && imageHeight > 0) {
      overlayView.setImageSourceInfo(imageWidth, imageHeight, true);
    }
    overlayView.setFaceOverlay(markers, rectangles);
  }

  private static float distance(PointF a, PointF b) {
    float dx = a.x - b.x;
    float dy = a.y - b.y;
    return (float) Math.hypot(dx, dy);
  }

  private void captureAndComplete() {
    if (reported) {
      return;
    }
    View target = cameraContainer != null ? cameraContainer : previewView;
    if (target.getWidth() <= 0 || target.getHeight() <= 0) {
      reportFailed("CAPTURE_FAILED", "Camera preview is not ready to capture");
      finish();
      return;
    }

    Bitmap bitmap =
        Bitmap.createBitmap(target.getWidth(), target.getHeight(), Bitmap.Config.ARGB_8888);
    Canvas canvas = new Canvas(bitmap);
    target.draw(canvas);

    File dir = new File(getCacheDir(), "visioncart-tryon");
    if (!dir.exists() && !dir.mkdirs()) {
      reportFailed("CAPTURE_FAILED", "Unable to create capture cache");
      finish();
      return;
    }

    File out = new File(dir, "capture-" + UUID.randomUUID() + ".jpg");
    try (FileOutputStream stream = new FileOutputStream(out)) {
      if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 92, stream)) {
        reportFailed("CAPTURE_FAILED", "Unable to encode capture");
        finish();
        return;
      }
      stream.flush();
    } catch (IOException exception) {
      reportFailed("CAPTURE_FAILED", "Unable to save capture");
      finish();
      return;
    } finally {
      bitmap.recycle();
    }

    reportCompleted(out.toURI().toString());
    finish();
  }

  private void finishWithClosed() {
    reportClosedOnce();
    finish();
  }

  @Override
  public void onBackPressed() {
    finishWithClosed();
  }

  @Override
  protected void onDestroy() {
    reportClosedOnce();
    if (cameraProvider != null) {
      cameraProvider.unbindAll();
    }
    if (faceDetector != null) {
      faceDetector.close();
      faceDetector = null;
    }
    if (analysisExecutor != null) {
      analysisExecutor.shutdown();
      analysisExecutor = null;
    }
    synchronized (SESSION_LOCK) {
      if (currentActivity.get() == this) {
        currentActivity.clear();
      }
    }
    super.onDestroy();
  }

  private void finishWithoutReporting() {
    reported = true;
    finish();
  }

  private void reportClosedOnce() {
    if (reported || token == null) {
      return;
    }
    reported = true;
    SessionListener listener = takeListener();
    if (listener != null) {
      listener.onClosed(token);
    }
  }

  private void reportCompleted(@Nullable String captureUri) {
    if (reported || token == null) {
      return;
    }
    reported = true;
    SessionListener listener = takeListener();
    if (listener != null) {
      listener.onCompleted(token, captureUri);
    }
  }

  private void reportFailed(String errorCode, String message) {
    if (reported || token == null) {
      return;
    }
    reported = true;
    SessionListener listener = takeListener();
    if (listener != null) {
      listener.onFailed(token, errorCode, message);
    }
  }

  @Nullable
  private SessionListener takeListener() {
    synchronized (SESSION_LOCK) {
      if (token != null && token.equals(sessionToken)) {
        SessionListener listener = sessionListener;
        sessionListener = null;
        sessionToken = null;
        return listener;
      }
    }
    return null;
  }

  private static String safeString(@Nullable String value, String fallback) {
    return value == null || value.isEmpty() ? fallback : value;
  }
}
