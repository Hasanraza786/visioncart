package com.visioncart.tryon;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import java.util.HashMap;
import java.util.Map;

public final class VisionCartTryOnPackage extends BaseReactPackage {
  @Override
  public @Nullable NativeModule getModule(
      @NonNull String name, @NonNull ReactApplicationContext reactContext) {
    if (VisionCartTryOnModule.NAME.equals(name)) {
      return new VisionCartTryOnModule(reactContext);
    }
    return null;
  }

  @Override
  public @NonNull ReactModuleInfoProvider getReactModuleInfoProvider() {
    return () -> {
      Map<String, ReactModuleInfo> modules = new HashMap<>();
      modules.put(
          VisionCartTryOnModule.NAME,
          new ReactModuleInfo(
              VisionCartTryOnModule.NAME,
              VisionCartTryOnModule.class.getName(),
              false,
              false,
              false,
              true));
      return modules;
    };
  }
}
