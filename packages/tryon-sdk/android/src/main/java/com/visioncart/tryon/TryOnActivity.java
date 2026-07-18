package com.visioncart.tryon;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;
import java.lang.ref.WeakReference;

public final class TryOnActivity extends Activity {
  interface SessionListener {
    void onClosed(String token);
  }

  static final String EXTRA_TOKEN = "com.visioncart.tryon.SESSION_TOKEN";

  private static final Object SESSION_LOCK = new Object();
  private static SessionListener sessionListener;
  private static String sessionToken;
  private static WeakReference<TryOnActivity> currentActivity = new WeakReference<>(null);

  private boolean reported;
  private String token;

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

    FrameLayout root = new FrameLayout(this);
    root.setBackgroundColor(0xFF111111);

    TextView label = new TextView(this);
    label.setText("Virtual try-on");
    label.setTextColor(0xFFFFFFFF);
    label.setTextSize(24);
    label.setGravity(Gravity.CENTER);
    root.addView(
        label,
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    Button close = new Button(this);
    close.setText("Close");
    close.setOnClickListener(ignored -> finish());
    FrameLayout.LayoutParams closeParams =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    closeParams.gravity = Gravity.TOP | Gravity.END;
    closeParams.setMargins(24, 24, 24, 24);
    root.addView(close, closeParams);

    setContentView(root);
  }

  @Override
  protected void onDestroy() {
    reportClosedOnce();
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
    SessionListener listener = null;
    synchronized (SESSION_LOCK) {
      if (token.equals(sessionToken)) {
        listener = sessionListener;
        sessionListener = null;
        sessionToken = null;
      }
    }
    if (listener != null) {
      listener.onClosed(token);
    }
  }
}
