#import "VisionCartTryOnModule.h"

#import "VisionCartTryOnViewController.h"
#import <QuartzCore/QuartzCore.h>
#import <React/RCTUtils.h>

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

- (void)isSupported:(NSString *)category
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  static NSSet<NSString *> *supportedCategories;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    supportedCategories =
        [NSSet setWithArray:@[ @"glasses", @"watch", @"ring", @"earring", @"nose_pin" ]];
  });

  BOOL supported = [supportedCategories containsObject:category];
  NSMutableDictionary *result = [@{
    @"supported" : @(supported),
    @"category" : category,
  } mutableCopy];
  if (supported) {
    result[@"engine"] = @"placeholder";
  } else {
    result[@"reason"] = @"Unknown try-on category";
  }
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
    __weak VisionCartTryOnModule *weakSelf = self;
    viewController.onClose = ^{
      [weakSelf resolveCancellationWithToken:token];
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
                                           inDomains:NSUserDomainMask].firstObject;
  NSURL *sdkCacheURL = [cachesURL URLByAppendingPathComponent:@"VisionCartTryOn"
                                                  isDirectory:YES];
  NSError *error;
  if ([NSFileManager.defaultManager fileExistsAtPath:sdkCacheURL.path] &&
      ![NSFileManager.defaultManager removeItemAtURL:sdkCacheURL error:&error]) {
    reject(@"E_CACHE_CLEAR_FAILED", @"Unable to clear the try-on cache", error);
    return;
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

- (void)resolveCancellationWithToken:(NSString *)token
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

  if (resolve != nil && sessionId != nil) {
    resolve(@{
      @"sessionId" : sessionId,
      @"outcome" : @"cancelled",
      @"durationMs" : @((CACurrentMediaTime() - startedAt) * 1000.0),
    });
  }
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
