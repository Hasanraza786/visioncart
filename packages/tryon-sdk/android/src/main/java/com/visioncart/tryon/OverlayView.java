package com.visioncart.tryon;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PointF;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import androidx.annotation.Nullable;
import java.util.ArrayList;
import java.util.List;

/**
 * Development-mode overlay: face landmark markers for ML Kit categories, or a
 * movable/scalable hand/wrist proxy for watch and ring.
 */
public final class OverlayView extends View {
  static final class LandmarkMarker {
    final PointF point;
    final float radius;
    final int color;

    LandmarkMarker(PointF point, float radius, int color) {
      this.point = point;
      this.radius = radius;
      this.color = color;
    }
  }

  private final Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint rectPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final List<LandmarkMarker> markers = new ArrayList<>();
  private final List<RectF> rectangles = new ArrayList<>();

  private String category = "glasses";
  private boolean handMode;
  private float overlayScale = 1f;
  private float imageWidth = 1f;
  private float imageHeight = 1f;
  private boolean mirrored = true;

  private float handCenterX = -1f;
  private float handCenterY = -1f;
  private float handBaseSize = 120f;
  private float dragOffsetX;
  private float dragOffsetY;
  private boolean dragging;

  public OverlayView(Context context) {
    super(context);
    init();
  }

  public OverlayView(Context context, @Nullable AttributeSet attrs) {
    super(context, attrs);
    init();
  }

  private void init() {
    fillPaint.setStyle(Paint.Style.FILL);
    strokePaint.setStyle(Paint.Style.STROKE);
    strokePaint.setStrokeWidth(4f);
    strokePaint.setColor(Color.WHITE);
    rectPaint.setStyle(Paint.Style.STROKE);
    rectPaint.setStrokeWidth(5f);
    rectPaint.setColor(0xFFE8C547);
    setWillNotDraw(false);
  }

  void configure(String category, boolean handMode) {
    this.category = category == null ? "glasses" : category;
    this.handMode = handMode;
    invalidate();
  }

  void setOverlayScale(float scale) {
    overlayScale = Math.max(0.5f, Math.min(2.5f, scale));
    invalidate();
  }

  float getOverlayScale() {
    return overlayScale;
  }

  void setImageSourceInfo(int width, int height, boolean mirrored) {
    imageWidth = Math.max(1, width);
    imageHeight = Math.max(1, height);
    this.mirrored = mirrored;
  }

  void setFaceOverlay(
      @Nullable List<LandmarkMarker> nextMarkers, @Nullable List<RectF> nextRects) {
    markers.clear();
    rectangles.clear();
    if (nextMarkers != null) {
      markers.addAll(nextMarkers);
    }
    if (nextRects != null) {
      rectangles.addAll(nextRects);
    }
    postInvalidateOnAnimation();
  }

  void clearFaceOverlay() {
    markers.clear();
    rectangles.clear();
    postInvalidateOnAnimation();
  }

  @Override
  protected void onSizeChanged(int w, int h, int oldw, int oldh) {
    super.onSizeChanged(w, h, oldw, oldh);
    if (handCenterX < 0 || handCenterY < 0) {
      handCenterX = w * 0.5f;
      handCenterY = h * 0.72f;
    }
  }

  @Override
  protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);
    if (handMode) {
      drawHandProxy(canvas);
      return;
    }
    drawFaceOverlay(canvas);
  }

  private void drawHandProxy(Canvas canvas) {
    if (handCenterX < 0 || handCenterY < 0) {
      handCenterX = getWidth() * 0.5f;
      handCenterY = getHeight() * 0.72f;
    }
    float size = handBaseSize * overlayScale;
    RectF oval =
        new RectF(
            handCenterX - size * 0.7f,
            handCenterY - size * 0.45f,
            handCenterX + size * 0.7f,
            handCenterY + size * 0.45f);
    fillPaint.setColor(0x66E8C547);
    canvas.drawOval(oval, fillPaint);
    strokePaint.setColor(0xFFE8C547);
    canvas.drawOval(oval, strokePaint);

    // Watch face / ring accent
    float accent = size * ("ring".equals(category) ? 0.22f : 0.35f);
    fillPaint.setColor(0xCCFFFFFF);
    canvas.drawCircle(handCenterX, handCenterY, accent, fillPaint);
    strokePaint.setColor(Color.WHITE);
    canvas.drawCircle(handCenterX, handCenterY, accent, strokePaint);
  }

  private void drawFaceOverlay(Canvas canvas) {
    float[] transform = viewTransform();
    float scaleX = transform[0];
    float scaleY = transform[1];
    float offsetX = transform[2];
    float offsetY = transform[3];

    for (RectF rect : rectangles) {
      RectF mapped =
          new RectF(
              mapX(rect.left, scaleX, offsetX),
              mapY(rect.top, scaleY, offsetY),
              mapX(rect.right, scaleX, offsetX),
              mapY(rect.bottom, scaleY, offsetY));
      expandAroundCenter(mapped, overlayScale);
      canvas.drawRect(mapped, rectPaint);
    }

    for (LandmarkMarker marker : markers) {
      float cx = mapX(marker.point.x, scaleX, offsetX);
      float cy = mapY(marker.point.y, scaleY, offsetY);
      float radius = marker.radius * overlayScale * Math.min(scaleX, scaleY);
      fillPaint.setColor(marker.color);
      canvas.drawCircle(cx, cy, radius, fillPaint);
      strokePaint.setColor(Color.WHITE);
      canvas.drawCircle(cx, cy, radius, strokePaint);
    }
  }

  private float[] viewTransform() {
    float viewW = getWidth();
    float viewH = getHeight();
    float scale =
        Math.max(viewW / imageWidth, viewH / imageHeight); // FILL_CENTER
    float scaledW = imageWidth * scale;
    float scaledH = imageHeight * scale;
    float offsetX = (viewW - scaledW) * 0.5f;
    float offsetY = (viewH - scaledH) * 0.5f;
    return new float[] {scale, scale, offsetX, offsetY};
  }

  private float mapX(float imageX, float scale, float offsetX) {
    float x = imageX * scale + offsetX;
    if (mirrored) {
      return getWidth() - x;
    }
    return x;
  }

  private float mapY(float imageY, float scale, float offsetY) {
    return imageY * scale + offsetY;
  }

  private static void expandAroundCenter(RectF rect, float scale) {
    float cx = rect.centerX();
    float cy = rect.centerY();
    float halfW = rect.width() * 0.5f * scale;
    float halfH = rect.height() * 0.5f * scale;
    rect.set(cx - halfW, cy - halfH, cx + halfW, cy + halfH);
  }

  @Override
  public boolean onTouchEvent(MotionEvent event) {
    if (!handMode) {
      return super.onTouchEvent(event);
    }
    switch (event.getActionMasked()) {
      case MotionEvent.ACTION_DOWN:
        dragOffsetX = event.getX() - handCenterX;
        dragOffsetY = event.getY() - handCenterY;
        dragging = true;
        return true;
      case MotionEvent.ACTION_MOVE:
        if (dragging) {
          handCenterX = clamp(event.getX() - dragOffsetX, 40f, getWidth() - 40f);
          handCenterY = clamp(event.getY() - dragOffsetY, 40f, getHeight() - 40f);
          invalidate();
        }
        return true;
      case MotionEvent.ACTION_UP:
      case MotionEvent.ACTION_CANCEL:
        dragging = false;
        return true;
      default:
        return super.onTouchEvent(event);
    }
  }

  private static float clamp(float value, float min, float max) {
    return Math.max(min, Math.min(max, value));
  }
}
