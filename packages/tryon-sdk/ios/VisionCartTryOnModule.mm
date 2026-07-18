#import "VisionCartTryOnModule.h"

#import "VisionCartTryOnViewController.h"

#import <ARKit/ARKit.h>
#import <AVFoundation/AVFoundation.h>
#import <QuartzCore/QuartzCore.h>
#import <React/RCTUtils.h>
#import <Vision/Vision.h>

@interface VisionCartTryOnModule ()
@property(nonatomic, copy, nullable) RCTPromiseResolveBlock activeResolve;
@property(nonatomic, copy, nullable) RCTPromiseRejectBlock activeReject;
@property(nonatomic, copy, nullable) NSString *activeSessionId;
@property(nonatomic, copy, nullable) NSString *activeToken;
@property(nonatomic, assign) CFTimeInterval activeStartedAt;
@property(nonatomic, weak, nullable) VisionCartTryOnViewController *activeViewController;
@property(nonatomic, assign) BOOL invalidated;
@end

@implementation VisionCartTryOnModule

RCT_EXPORT_MODULE(VisionCartTryOn)

#pragma mark - Spec

- (void)isSupported:(NSString *)category
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  static NSSet<NSString *> *faceCategories;
  static NSSet<NSString *> *handCategories;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    faceCategories = [NSSet setWithArray:@[ @"glasses", @"earring", @"nose_pin" ]];
    handCategories = [NSSet setWithArray:@[ @"watch", @"ring" ]];
  });

  NSMutableDictionary *result = [@{
    @"supported" : @NO,
    @"category" : category ?: @"",
  } mutableCopy];

  if ([faceCategories containsObject:category]) {
    if ([ARFaceTrackingConfiguration isSupported]) {
      result[@"supported"] = @YES;
      result[@"engine"] = @"arkit-face";
    } else if ([self hasCameraAtPosition:AVCaptureDevicePositionFront]) {
      result[@"supported"] = @YES;
      result[@"engine"] = @"avfoundation-face-fallback";
    } else {
      result[@"reason"] = @"Face try-on requires a front camera or ARKit face tracking";
    }
    resolve(result);
    return;
  }

  if ([handCategories containsObject:category]) {
    BOOL visionHandAvailable = NSClassFromString(@"VNDetectHumanHandPoseRequest") != Nil;
    BOOL hasCamera = [self hasCameraAtPosition:AVCaptureDevicePositionFront] ||
                     [self hasCameraAtPosition:AVCaptureDevicePositionBack];
    if (visionHandAvailable && hasCamera) {
      result[@"supported"] = @YES;
      result[@"engine"] = @"vision-hand";
    } else if (!visionHandAvailable) {
      result[@"reason"] = @"Vision hand pose detection is unavailable";
    } else {
      result[@"reason"] = @"Hand try-on requires a camera";
    }
    resolve(result);
    return;
  }

  result[@"reason"] = @"Unknown try-on category";
  resolve(result);
}

- (void)open:(JS::NativeVisionCartTryOn::TryOnConfig &)config
     resolve:(RCTPromiseResolveBlock)resolve
      reject:(RCTPromiseRejectBlock)reject
{
  NSString *sessionId = config.sessionId();
  if (sessionId.length == 0) {
    reject(@"E_INVALID_CONFIG", @"sessionId must not be empty", nil);
    return;
  }

  NSString *category = config.category() ?: @"";
  NSString *productId = config.productId() ?: @"";
  NSString *platformAssetUri = config.platformAssetUri() ?: @"";
  BOOL captureEnabled = config.captureEnabled();

  JS::NativeVisionCartTryOn::ProductDimensions dimensions = config.dimensions();
  double widthMm = dimensions.widthMm();
  double heightMm = dimensions.heightMm();
  double depthMm = dimensions.depthMm();

  JS::NativeVisionCartTryOn::AnchorProfile anchorProfile = config.anchorProfile();
  double defaultScale = anchorProfile.defaultScale();
  JS::NativeVisionCartTryOn::AdjustmentLimits limits = anchorProfile.adjustmentLimits();
  double minScale = limits.minScale();
  double maxScale = limits.maxScale();

  NSString *token = NSUUID.UUID.UUIDString;
  @synchronized(self) {
    if (self.invalidated) {
      reject(@"E_INVALIDATED", @"The try-on module has been invalidated", nil);
      return;
    }
    if (self.activeResolve != nil) {
      reject(@"E_SESSION_ACTIVE", @"A try-on session is already active", nil);
      return;
    }
    self.activeResolve = resolve;
    self.activeReject = reject;
    self.activeSessionId = sessionId;
    self.activeToken = token;
    self.activeStartedAt = CACurrentMediaTime();
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    @synchronized(self) {
      if (![self.activeToken isEqualToString:token]) {
        return;
      }
    }

    UIViewController *presenter = RCTPresentedViewController();
    if (presenter == nil || presenter.isBeingDismissed) {
      [self rejectSessionWithToken:token
                              code:@"E_OPEN_FAILED"
                           message:@"No foreground view controller is available"];
      return;
    }

    VisionCartTryOnViewController *viewController =
        [[VisionCartTryOnViewController alloc] init];
    viewController.modalPresentationStyle = UIModalPresentationFullScreen;
    viewController.sessionId = sessionId;
    viewController.productId = productId;
    viewController.category = category;
    viewController.platformAssetUri = platformAssetUri;
    viewController.captureEnabled = captureEnabled;
    viewController.widthMm = widthMm;
    viewController.heightMm = heightMm;
    viewController.depthMm = depthMm;
    viewController.minScale = minScale > 0 ? minScale : 0.5;
    viewController.maxScale = maxScale > viewController.minScale ? maxScale : 2.0;
    viewController.defaultScale = defaultScale > 0 ? defaultScale : 1.0;

    __weak VisionCartTryOnModule *weakSelf = self;
    viewController.onClose = ^{
      [weakSelf resolveOutcomeWithToken:token
                                outcome:@"cancelled"
                             captureUri:nil
                              errorCode:nil];
    };
    viewController.onCompleted = ^(NSString *_Nullable captureUri) {
      [weakSelf resolveOutcomeWithToken:token
                                outcome:@"completed"
                             captureUri:captureUri
                              errorCode:nil];
    };
    viewController.onFailed = ^(NSString *errorCode) {
      [weakSelf resolveOutcomeWithToken:token
                                outcome:@"failed"
                             captureUri:nil
                              errorCode:errorCode];
    };

    @synchronized(self) {
      if (![self.activeToken isEqualToString:token]) {
        return;
      }
      self.activeViewController = viewController;
    }
    [presenter presentViewController:viewController animated:YES completion:nil];
  });
}

- (void)clearCache:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  NSURL *cachesURL =
      [NSFileManager.defaultManager URLsForDirectory:NSCachesDirectory
                                           inDomains:NSUserDomainMask]
          .firstObject;
  NSURL *sdkCacheURL = [cachesURL URLByAppendingPathComponent:@"VisionCartTryOn"
                                                  isDirectory:YES];
  NSError *error;
  if ([NSFileManager.defaultManager fileExistsAtPath:sdkCacheURL.path] &&
      ![NSFileManager.defaultManager removeItemAtURL:sdkCacheURL error:&error]) {
    reject(@"E_CACHE_CLEAR_FAILED", @"Unable to clear the try-on cache", error);
    return;
  }

  // Also clear temporary capture files from this SDK.
  NSString *tmp = NSTemporaryDirectory();
  NSArray<NSString *> *tmpFiles =
      [NSFileManager.defaultManager contentsOfDirectoryAtPath:tmp error:nil];
  for (NSString *name in tmpFiles) {
    if ([name hasPrefix:@"visioncart-tryon-"]) {
      NSString *path = [tmp stringByAppendingPathComponent:name];
      [NSFileManager.defaultManager removeItemAtPath:path error:nil];
    }
  }

  resolve(nil);
}

- (void)invalidate
{
  RCTPromiseRejectBlock reject;
  VisionCartTryOnViewController *viewController;
  @synchronized(self) {
    if (self.invalidated) {
      return;
    }
    self.invalidated = YES;
    reject = self.activeReject;
    viewController = self.activeViewController;
    [self clearActiveSession];
  }

  if (reject != nil) {
    reject(@"E_INVALIDATED", @"The try-on module was invalidated", nil);
  }
  if (viewController != nil) {
    dispatch_async(dispatch_get_main_queue(), ^{
      [viewController closeWithoutCallback];
    });
  }
}

#pragma mark - Session helpers

- (BOOL)hasCameraAtPosition:(AVCaptureDevicePosition)position
{
  AVCaptureDeviceDiscoverySession *session = [AVCaptureDeviceDiscoverySession
      discoverySessionWithDeviceTypes:@[ AVCaptureDeviceTypeBuiltInWideAngleCamera ]
                            mediaType:AVMediaTypeVideo
                             position:position];
  return session.devices.count > 0;
}

- (void)resolveOutcomeWithToken:(NSString *)token
                        outcome:(NSString *)outcome
                     captureUri:(NSString *_Nullable)captureUri
                      errorCode:(NSString *_Nullable)errorCode
{
  RCTPromiseResolveBlock resolve;
  NSString *sessionId;
  CFTimeInterval startedAt;
  @synchronized(self) {
    if (![self.activeToken isEqualToString:token]) {
      return;
    }
    resolve = self.activeResolve;
    sessionId = self.activeSessionId;
    startedAt = self.activeStartedAt;
    [self clearActiveSession];
  }

  if (resolve == nil || sessionId == nil) {
    return;
  }

  NSMutableDictionary *result = [@{
    @"sessionId" : sessionId,
    @"outcome" : outcome,
    @"durationMs" : @((CACurrentMediaTime() - startedAt) * 1000.0),
  } mutableCopy];
  if (captureUri.length > 0) {
    result[@"captureUri"] = captureUri;
  }
  if (errorCode.length > 0) {
    result[@"errorCode"] = errorCode;
  }
  resolve(result);
}

- (void)rejectSessionWithToken:(NSString *)token
                          code:(NSString *)code
                       message:(NSString *)message
{
  RCTPromiseRejectBlock reject;
  @synchronized(self) {
    if (![self.activeToken isEqualToString:token]) {
      return;
    }
    reject = self.activeReject;
    [self clearActiveSession];
  }
  if (reject != nil) {
    reject(code, message, nil);
  }
}

- (void)clearActiveSession
{
  self.activeResolve = nil;
  self.activeReject = nil;
  self.activeSessionId = nil;
  self.activeToken = nil;
  self.activeStartedAt = 0;
  self.activeViewController = nil;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeVisionCartTryOnSpecJSI>(params);
}

@end
