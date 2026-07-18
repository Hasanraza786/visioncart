#import "VisionCartTryOnViewController.h"

#import <ARKit/ARKit.h>
#import <AVFoundation/AVFoundation.h>
#import <SceneKit/SceneKit.h>
#import <Vision/Vision.h>
#import <simd/simd.h>

typedef NS_ENUM(NSInteger, VisionCartTryOnMode) {
  VisionCartTryOnModeARFace,
  VisionCartTryOnModeAVFaceFallback,
  VisionCartTryOnModeVisionHand,
};

@interface VisionCartTryOnViewController () <ARSCNViewDelegate, AVCaptureVideoDataOutputSampleBufferDelegate>
@end

@implementation VisionCartTryOnViewController {
  BOOL _didFinish;
  BOOL _sessionStarted;
  VisionCartTryOnMode _mode;
  CGFloat _userScale;

  ARSCNView *_arView;
  SCNNode *_overlayNode;
  UIView *_faceFallbackOverlay;

  AVCaptureSession *_captureSession;
  AVCaptureVideoPreviewLayer *_previewLayer;
  AVCaptureVideoDataOutput *_videoOutput;
  dispatch_queue_t _visionQueue;
  UIView *_handOverlay;
  VNDetectHumanHandPoseRequest *_handPoseRequest;

  UILabel *_guidanceLabel;
  UILabel *_scaleLabel;
  UIButton *_closeButton;
  UIButton *_minusButton;
  UIButton *_plusButton;
  UIButton *_captureButton;
}

#pragma mark - Lifecycle

- (instancetype)init
{
  self = [super init];
  if (self) {
    _sessionId = @"";
    _productId = @"";
    _category = @"";
    _minScale = 0.5;
    _maxScale = 2.0;
    _defaultScale = 1.0;
    _userScale = 1.0;
  }
  return self;
}

- (void)viewDidLoad
{
  [super viewDidLoad];
  self.view.backgroundColor = UIColor.blackColor;
  _userScale = [self clampedScale:self.defaultScale > 0 ? self.defaultScale : 1.0];
  _mode = [self resolveMode];

  [self buildChrome];
  [self requestCameraAccessAndStart];
}

- (void)viewDidLayoutSubviews
{
  [super viewDidLayoutSubviews];
  if (_previewLayer != nil) {
    _previewLayer.frame = self.view.bounds;
  }
  if (_arView != nil) {
    _arView.frame = self.view.bounds;
  }
}

- (void)viewDidDisappear:(BOOL)animated
{
  [super viewDidDisappear:animated];
  if (self.isBeingDismissed || self.presentingViewController == nil) {
    [self tearDownSessions];
    [self reportCloseOnce];
  }
}

- (void)dealloc
{
  [self tearDownSessions];
}

#pragma mark - Mode

- (BOOL)isFaceCategory
{
  return [self.category isEqualToString:@"glasses"] ||
         [self.category isEqualToString:@"earring"] ||
         [self.category isEqualToString:@"nose_pin"];
}

- (BOOL)isHandCategory
{
  return [self.category isEqualToString:@"watch"] ||
         [self.category isEqualToString:@"ring"];
}

- (VisionCartTryOnMode)resolveMode
{
  if ([self isHandCategory]) {
    return VisionCartTryOnModeVisionHand;
  }
  if ([ARFaceTrackingConfiguration isSupported]) {
    return VisionCartTryOnModeARFace;
  }
  return VisionCartTryOnModeAVFaceFallback;
}

#pragma mark - Camera permission

- (void)requestCameraAccessAndStart
{
  AVAuthorizationStatus status =
      [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (status == AVAuthorizationStatusAuthorized) {
    [self startSessionForMode];
    return;
  }
  if (status == AVAuthorizationStatusRestricted) {
    [self failWithErrorCode:@"PERMISSION_RESTRICTED"];
    return;
  }
  if (status == AVAuthorizationStatusDenied) {
    [self failWithErrorCode:@"PERMISSION_DENIED"];
    return;
  }

  [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo
                           completionHandler:^(BOOL granted) {
                             dispatch_async(dispatch_get_main_queue(), ^{
                               if (!granted) {
                                 [self failWithErrorCode:@"PERMISSION_DENIED"];
                                 return;
                               }
                               [self startSessionForMode];
                             });
                           }];
}

- (void)startSessionForMode
{
  if (_sessionStarted || _didFinish) {
    return;
  }
  _sessionStarted = YES;

  switch (_mode) {
    case VisionCartTryOnModeARFace:
      [self startARFaceSession];
      _guidanceLabel.text = @"Look at the camera";
      break;
    case VisionCartTryOnModeAVFaceFallback:
      [self startAVFaceFallbackSession];
      _guidanceLabel.text = @"Look at the camera";
      break;
    case VisionCartTryOnModeVisionHand:
      [self startVisionHandSession];
      _guidanceLabel.text = @"Show your hand";
      break;
  }
  [self updateScaleLabel];
}

#pragma mark - Chrome UI

- (void)buildChrome
{
  _guidanceLabel = [[UILabel alloc] initWithFrame:CGRectZero];
  _guidanceLabel.translatesAutoresizingMaskIntoConstraints = NO;
  _guidanceLabel.textColor = UIColor.whiteColor;
  _guidanceLabel.font = [UIFont systemFontOfSize:16 weight:UIFontWeightSemibold];
  _guidanceLabel.textAlignment = NSTextAlignmentCenter;
  _guidanceLabel.numberOfLines = 2;
  _guidanceLabel.layer.shadowColor = UIColor.blackColor.CGColor;
  _guidanceLabel.layer.shadowOpacity = 0.7;
  _guidanceLabel.layer.shadowRadius = 2;
  _guidanceLabel.layer.shadowOffset = CGSizeMake(0, 1);
  [self.view addSubview:_guidanceLabel];

  _closeButton = [UIButton buttonWithType:UIButtonTypeSystem];
  _closeButton.translatesAutoresizingMaskIntoConstraints = NO;
  [_closeButton setTitle:@"Close" forState:UIControlStateNormal];
  [_closeButton setTitleColor:UIColor.whiteColor forState:UIControlStateNormal];
  _closeButton.titleLabel.font = [UIFont systemFontOfSize:17 weight:UIFontWeightSemibold];
  [_closeButton addTarget:self
                   action:@selector(closePressed)
         forControlEvents:UIControlEventTouchUpInside];
  [self.view addSubview:_closeButton];

  _minusButton = [self makeChromeButtonWithTitle:@"−" action:@selector(decreaseScale)];
  _plusButton = [self makeChromeButtonWithTitle:@"+" action:@selector(increaseScale)];
  [self.view addSubview:_minusButton];
  [self.view addSubview:_plusButton];

  _scaleLabel = [[UILabel alloc] initWithFrame:CGRectZero];
  _scaleLabel.translatesAutoresizingMaskIntoConstraints = NO;
  _scaleLabel.textColor = UIColor.whiteColor;
  _scaleLabel.font = [UIFont monospacedDigitSystemFontOfSize:14 weight:UIFontWeightMedium];
  _scaleLabel.textAlignment = NSTextAlignmentCenter;
  [self.view addSubview:_scaleLabel];

  NSMutableArray<NSLayoutConstraint *> *constraints = [NSMutableArray arrayWithArray:@[
    [_closeButton.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor
                                           constant:12],
    [_closeButton.trailingAnchor
        constraintEqualToAnchor:self.view.safeAreaLayoutGuide.trailingAnchor
                       constant:-20],
    [_guidanceLabel.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor
                                             constant:16],
    [_guidanceLabel.leadingAnchor
        constraintEqualToAnchor:self.view.safeAreaLayoutGuide.leadingAnchor
                       constant:20],
    [_guidanceLabel.trailingAnchor constraintEqualToAnchor:_closeButton.leadingAnchor
                                                  constant:-12],
    [_minusButton.leadingAnchor
        constraintEqualToAnchor:self.view.safeAreaLayoutGuide.leadingAnchor
                       constant:20],
    [_minusButton.bottomAnchor
        constraintEqualToAnchor:self.view.safeAreaLayoutGuide.bottomAnchor
                       constant:-20],
    [_minusButton.widthAnchor constraintEqualToConstant:44],
    [_minusButton.heightAnchor constraintEqualToConstant:44],
    [_scaleLabel.centerYAnchor constraintEqualToAnchor:_minusButton.centerYAnchor],
    [_scaleLabel.leadingAnchor constraintEqualToAnchor:_minusButton.trailingAnchor constant:8],
    [_scaleLabel.widthAnchor constraintEqualToConstant:64],
    [_plusButton.centerYAnchor constraintEqualToAnchor:_minusButton.centerYAnchor],
    [_plusButton.leadingAnchor constraintEqualToAnchor:_scaleLabel.trailingAnchor constant:8],
    [_plusButton.widthAnchor constraintEqualToConstant:44],
    [_plusButton.heightAnchor constraintEqualToConstant:44],
  ]];

  if (self.captureEnabled) {
    _captureButton = [self makeChromeButtonWithTitle:@"Capture" action:@selector(capturePressed)];
    _captureButton.contentEdgeInsets = UIEdgeInsetsMake(10, 18, 10, 18);
    [self.view addSubview:_captureButton];
    [constraints addObjectsFromArray:@[
      [_captureButton.centerYAnchor constraintEqualToAnchor:_minusButton.centerYAnchor],
      [_captureButton.trailingAnchor
          constraintEqualToAnchor:self.view.safeAreaLayoutGuide.trailingAnchor
                         constant:-20],
    ]];
  }

  [NSLayoutConstraint activateConstraints:constraints];
}

- (UIButton *)makeChromeButtonWithTitle:(NSString *)title action:(SEL)action
{
  UIButton *button = [UIButton buttonWithType:UIButtonTypeSystem];
  button.translatesAutoresizingMaskIntoConstraints = NO;
  [button setTitle:title forState:UIControlStateNormal];
  [button setTitleColor:UIColor.whiteColor forState:UIControlStateNormal];
  button.titleLabel.font = [UIFont systemFontOfSize:20 weight:UIFontWeightBold];
  button.backgroundColor = [UIColor colorWithWhite:0.15 alpha:0.75];
  button.layer.cornerRadius = 10;
  [button addTarget:self action:action forControlEvents:UIControlEventTouchUpInside];
  return button;
}

- (void)updateScaleLabel
{
  _scaleLabel.text = [NSString stringWithFormat:@"%.2fx", (double)_userScale];
}

- (CGFloat)clampedScale:(CGFloat)scale
{
  CGFloat minScale = self.minScale > 0 ? (CGFloat)self.minScale : 0.5f;
  CGFloat maxScale = self.maxScale > minScale ? (CGFloat)self.maxScale : 2.0f;
  return MAX(minScale, MIN(maxScale, scale));
}

- (void)increaseScale
{
  _userScale = [self clampedScale:_userScale + 0.05f];
  [self updateScaleLabel];
  [self applyUserScale];
}

- (void)decreaseScale
{
  _userScale = [self clampedScale:_userScale - 0.05f];
  [self updateScaleLabel];
  [self applyUserScale];
}

- (void)applyUserScale
{
  if (_overlayNode != nil) {
    CGFloat base = [self baseNodeScale];
    _overlayNode.scale = SCNVector3Make(base * _userScale, base * _userScale, base * _userScale);
  }
  if (_faceFallbackOverlay != nil) {
    CGFloat side = 72.0f * _userScale;
    _faceFallbackOverlay.bounds = CGRectMake(0, 0, side * [self fallbackAspect], side);
  }
  if (_handOverlay != nil) {
    CGFloat side = [self handOverlayBaseSize] * _userScale;
    CGPoint center = _handOverlay.center;
    _handOverlay.bounds = CGRectMake(0, 0, side, side);
    _handOverlay.center = center;
    _handOverlay.layer.cornerRadius = side * 0.2f;
  }
}

- (CGFloat)baseNodeScale
{
  double widthMm = self.widthMm > 0 ? self.widthMm : 40.0;
  return (CGFloat)(widthMm / 1000.0); // meters for SceneKit face space
}

- (CGFloat)fallbackAspect
{
  if ([self.category isEqualToString:@"glasses"]) {
    return 2.4f;
  }
  if ([self.category isEqualToString:@"earring"]) {
    return 0.6f;
  }
  return 1.0f;
}

- (CGFloat)handOverlayBaseSize
{
  return [self.category isEqualToString:@"watch"] ? 56.0f : 28.0f;
}

#pragma mark - AR Face

- (void)startARFaceSession
{
  if (![ARFaceTrackingConfiguration isSupported]) {
    [self startAVFaceFallbackSession];
    return;
  }

  _arView = [[ARSCNView alloc] initWithFrame:self.view.bounds];
  _arView.delegate = self;
  _arView.automaticallyUpdatesLighting = YES;
  _arView.session.delegate = nil;
  [self.view insertSubview:_arView atIndex:0];

  ARFaceTrackingConfiguration *configuration = [ARFaceTrackingConfiguration new];
  configuration.lightEstimationEnabled = YES;
  [_arView.session runWithConfiguration:configuration
                                options:ARSessionRunOptionResetTracking |
                                        ARSessionRunOptionRemoveExistingAnchors];
  [self bringChromeToFront];
}

- (void)bringChromeToFront
{
  if (_handOverlay != nil) {
    [self.view bringSubviewToFront:_handOverlay];
  }
  if (_faceFallbackOverlay != nil) {
    [self.view bringSubviewToFront:_faceFallbackOverlay];
  }
  if (_guidanceLabel != nil) {
    [self.view bringSubviewToFront:_guidanceLabel];
  }
  if (_closeButton != nil) {
    [self.view bringSubviewToFront:_closeButton];
  }
  if (_minusButton != nil) {
    [self.view bringSubviewToFront:_minusButton];
  }
  if (_plusButton != nil) {
    [self.view bringSubviewToFront:_plusButton];
  }
  if (_scaleLabel != nil) {
    [self.view bringSubviewToFront:_scaleLabel];
  }
  if (_captureButton != nil) {
    [self.view bringSubviewToFront:_captureButton];
  }
}

- (void)renderer:(id<SCNSceneRenderer>)renderer
      didAddNode:(SCNNode *)node
       forAnchor:(ARAnchor *)anchor
{
  if (![anchor isKindOfClass:[ARFaceAnchor class]]) {
    return;
  }
  [_overlayNode removeFromParentNode];
  _overlayNode = [self makeCategoryOverlayNode];
  [self applyUserScale];
  [node addChildNode:_overlayNode];
  [self positionOverlayForFaceAnchor:(ARFaceAnchor *)anchor];
}

- (void)renderer:(id<SCNSceneRenderer>)renderer
   didUpdateNode:(SCNNode *)node
       forAnchor:(ARAnchor *)anchor
{
  if (![anchor isKindOfClass:[ARFaceAnchor class]] || _overlayNode == nil) {
    return;
  }
  [self positionOverlayForFaceAnchor:(ARFaceAnchor *)anchor];
}

- (void)positionOverlayForFaceAnchor:(ARFaceAnchor *)faceAnchor
{
  simd_float4x4 local = matrix_identity_float4x4;
  float x = 0.0f;
  float y = 0.0f;
  float z = 0.0f;

  if ([self.category isEqualToString:@"glasses"]) {
    simd_float3 left = [self translationFromMatrix:faceAnchor.leftEyeTransform];
    simd_float3 right = [self translationFromMatrix:faceAnchor.rightEyeTransform];
    x = (left.x + right.x) * 0.5f;
    y = (left.y + right.y) * 0.5f;
    z = (left.z + right.z) * 0.5f - 0.01f;
  } else if ([self.category isEqualToString:@"nose_pin"]) {
    // Slightly below and forward of face origin (approximate nasal tip).
    x = 0.0f;
    y = -0.02f;
    z = 0.06f;
  } else if ([self.category isEqualToString:@"earring"]) {
    // Approximate left ear relative to face origin.
    x = -0.08f;
    y = -0.02f;
    z = -0.02f;
  }

  local.columns[3].x = x;
  local.columns[3].y = y;
  local.columns[3].z = z;
  _overlayNode.simdTransform = local;
  [self applyUserScale];
}

- (simd_float3)translationFromMatrix:(simd_float4x4)matrix
{
  return simd_make_float3(matrix.columns[3].x, matrix.columns[3].y, matrix.columns[3].z);
}

- (SCNNode *)makeCategoryOverlayNode
{
  SCNGeometry *geometry = nil;
  UIColor *color = [UIColor colorWithRed:0.2 green:0.75 blue:0.95 alpha:0.85];

  if ([self.category isEqualToString:@"glasses"]) {
    geometry = [SCNBox boxWithWidth:1.0 height:0.28 length:0.08 chamferRadius:0.02];
  } else if ([self.category isEqualToString:@"earring"]) {
    geometry = [SCNSphere sphereWithRadius:0.35];
    color = [UIColor colorWithRed:0.95 green:0.75 blue:0.2 alpha:0.9];
  } else {
    geometry = [SCNBox boxWithWidth:0.35 height:0.35 length:0.2 chamferRadius:0.05];
    color = [UIColor colorWithRed:0.9 green:0.35 blue:0.55 alpha:0.9];
  }

  SCNMaterial *material = [SCNMaterial material];
  material.diffuse.contents = color;
  material.lightingModelName = SCNLightingModelPhysicallyBased;
  geometry.materials = @[ material ];

  SCNNode *node = [SCNNode nodeWithGeometry:geometry];

  SCNText *text = [SCNText textWithString:self.category extrusionDepth:0.01];
  text.font = [UIFont systemFontOfSize:0.18 weight:UIFontWeightBold];
  text.firstMaterial.diffuse.contents = UIColor.whiteColor;
  SCNNode *label = [SCNNode nodeWithGeometry:text];
  label.scale = SCNVector3Make(0.4, 0.4, 0.4);
  SCNVector3 minBound = SCNVector3Zero;
  SCNVector3 maxBound = SCNVector3Zero;
  [label getBoundingBoxMin:&minBound max:&maxBound];
  label.position = SCNVector3Make(-(maxBound.x - minBound.x) * 0.2f, 0.4f, 0.05f);
  [node addChildNode:label];

  return node;
}

#pragma mark - AV Face fallback

- (void)startAVFaceFallbackSession
{
  if (![self configureCaptureSessionPreferFront:YES]) {
    [self failWithErrorCode:@"CAMERA_UNAVAILABLE"];
    return;
  }

  _previewLayer = [AVCaptureVideoPreviewLayer layerWithSession:_captureSession];
  _previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
  _previewLayer.frame = self.view.bounds;
  [self.view.layer insertSublayer:_previewLayer atIndex:0];

  _faceFallbackOverlay = [[UIView alloc] initWithFrame:CGRectZero];
  _faceFallbackOverlay.backgroundColor = [UIColor colorWithRed:0.2 green:0.75 blue:0.95 alpha:0.55];
  _faceFallbackOverlay.layer.borderColor = UIColor.whiteColor.CGColor;
  _faceFallbackOverlay.layer.borderWidth = 2.0;
  _faceFallbackOverlay.layer.cornerRadius = 8.0;
  [self.view insertSubview:_faceFallbackOverlay atIndex:1];

  UILabel *tag = [[UILabel alloc] initWithFrame:CGRectZero];
  tag.translatesAutoresizingMaskIntoConstraints = NO;
  tag.text = self.category;
  tag.textColor = UIColor.whiteColor;
  tag.font = [UIFont systemFontOfSize:11 weight:UIFontWeightBold];
  tag.textAlignment = NSTextAlignmentCenter;
  [_faceFallbackOverlay addSubview:tag];
  [NSLayoutConstraint activateConstraints:@[
    [tag.centerXAnchor constraintEqualToAnchor:_faceFallbackOverlay.centerXAnchor],
    [tag.centerYAnchor constraintEqualToAnchor:_faceFallbackOverlay.centerYAnchor],
  ]];

  [self applyUserScale];
  _faceFallbackOverlay.center = CGPointMake(CGRectGetMidX(self.view.bounds),
                                            CGRectGetMidY(self.view.bounds) * 0.85);
  [self bringChromeToFront];

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    [self->_captureSession startRunning];
  });
}

#pragma mark - Vision Hand

- (void)startVisionHandSession
{
  if (![self configureCaptureSessionPreferFront:YES]) {
    [self failWithErrorCode:@"CAMERA_UNAVAILABLE"];
    return;
  }

  _visionQueue = dispatch_queue_create("com.visioncart.tryon.vision", DISPATCH_QUEUE_SERIAL);
  _handPoseRequest = [[VNDetectHumanHandPoseRequest alloc] init];
  _handPoseRequest.maximumHandCount = 1;

  _videoOutput = [[AVCaptureVideoDataOutput alloc] init];
  _videoOutput.alwaysDiscardsLateVideoFrames = YES;
  _videoOutput.videoSettings =
      @{ (NSString *)kCVPixelBufferPixelFormatTypeKey : @(kCVPixelFormatType_32BGRA) };
  [_videoOutput setSampleBufferDelegate:self queue:_visionQueue];
  if ([_captureSession canAddOutput:_videoOutput]) {
    [_captureSession addOutput:_videoOutput];
  }

  _previewLayer = [AVCaptureVideoPreviewLayer layerWithSession:_captureSession];
  _previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
  _previewLayer.frame = self.view.bounds;
  [self.view.layer insertSublayer:_previewLayer atIndex:0];

  CGFloat side = [self handOverlayBaseSize] * _userScale;
  _handOverlay = [[UIView alloc] initWithFrame:CGRectMake(0, 0, side, side)];
  _handOverlay.backgroundColor = [self.category isEqualToString:@"watch"]
                                     ? [UIColor colorWithRed:0.15 green:0.55 blue:0.9 alpha:0.7]
                                     : [UIColor colorWithRed:0.95 green:0.7 blue:0.15 alpha:0.8];
  _handOverlay.layer.cornerRadius = side * 0.2f;
  _handOverlay.layer.borderWidth = 2.0;
  _handOverlay.layer.borderColor = UIColor.whiteColor.CGColor;
  _handOverlay.hidden = YES;
  [self.view addSubview:_handOverlay];

  UILabel *tag = [[UILabel alloc] initWithFrame:_handOverlay.bounds];
  tag.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  tag.text = self.category;
  tag.textColor = UIColor.whiteColor;
  tag.font = [UIFont systemFontOfSize:10 weight:UIFontWeightBold];
  tag.textAlignment = NSTextAlignmentCenter;
  [_handOverlay addSubview:tag];

  [self bringChromeToFront];

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    [self->_captureSession startRunning];
  });
}

- (void)captureOutput:(AVCaptureOutput *)output
    didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer
           fromConnection:(AVCaptureConnection *)connection
{
  if (_handPoseRequest == nil || _didFinish) {
    return;
  }

  CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
  if (pixelBuffer == NULL) {
    return;
  }

  VNImageRequestHandler *handler =
      [[VNImageRequestHandler alloc] initWithCVPixelBuffer:pixelBuffer
                                                   options:@{}];
  NSError *error = nil;
  BOOL ok = [handler performRequests:@[ _handPoseRequest ] error:&error];
  if (!ok) {
    return;
  }

  VNHumanHandPoseObservation *observation =
      (VNHumanHandPoseObservation *)_handPoseRequest.results.firstObject;
  if (observation == nil) {
    dispatch_async(dispatch_get_main_queue(), ^{
      self->_handOverlay.hidden = YES;
    });
    return;
  }

  NSError *pointError = nil;
  VNRecognizedPoint *point = nil;
  if ([self.category isEqualToString:@"watch"]) {
    point = [observation recognizedPointForJointName:VNHumanHandPoseObservationJointNameWrist
                                               error:&pointError];
  } else {
    point = [observation recognizedPointForJointName:VNHumanHandPoseObservationJointNameRingTIP
                                               error:&pointError];
  }

  if (point == nil || point.confidence < 0.3) {
    dispatch_async(dispatch_get_main_queue(), ^{
      self->_handOverlay.hidden = YES;
    });
    return;
  }

  CGPoint normalized = CGPointMake(point.location.x, point.location.y);
  dispatch_async(dispatch_get_main_queue(), ^{
    [self updateHandOverlayAtNormalizedPoint:normalized];
  });
}

- (void)updateHandOverlayAtNormalizedPoint:(CGPoint)normalized
{
  if (_previewLayer == nil || _handOverlay == nil) {
    return;
  }

  // Vision coordinates: origin bottom-left. Preview layer expects top-left normalized.
  CGPoint visionPoint = CGPointMake(normalized.x, 1.0 - normalized.y);
  CGPoint layerPoint = [_previewLayer pointForCaptureDevicePointOfInterest:visionPoint];

  // Front camera preview is typically mirrored for the user.
  CGFloat mirroredX = CGRectGetWidth(self.view.bounds) - layerPoint.x;
  _handOverlay.hidden = NO;
  _handOverlay.center = CGPointMake(mirroredX, layerPoint.y);
  [self bringChromeToFront];
}

#pragma mark - Capture session helpers

- (BOOL)configureCaptureSessionPreferFront:(BOOL)preferFront
{
  AVCaptureDevice *device = [self cameraDevicePreferFront:preferFront];
  if (device == nil) {
    return NO;
  }

  NSError *error = nil;
  AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&error];
  if (input == nil) {
    return NO;
  }

  _captureSession = [[AVCaptureSession alloc] init];
  _captureSession.sessionPreset = AVCaptureSessionPresetHigh;
  if ([_captureSession canAddInput:input]) {
    [_captureSession addInput:input];
    return YES;
  }
  return NO;
}

- (AVCaptureDevice *_Nullable)cameraDevicePreferFront:(BOOL)preferFront
{
  AVCaptureDevicePosition preferred =
      preferFront ? AVCaptureDevicePositionFront : AVCaptureDevicePositionBack;
  AVCaptureDeviceDiscoverySession *session = [AVCaptureDeviceDiscoverySession
      discoverySessionWithDeviceTypes:@[
        AVCaptureDeviceTypeBuiltInWideAngleCamera,
        AVCaptureDeviceTypeBuiltInDualCamera,
        AVCaptureDeviceTypeBuiltInTripleCamera,
      ]
                            mediaType:AVMediaTypeVideo
                             position:AVCaptureDevicePositionUnspecified];
  AVCaptureDevice *fallback = nil;
  for (AVCaptureDevice *device in session.devices) {
    if (device.position == preferred) {
      return device;
    }
    if (fallback == nil) {
      fallback = device;
    }
  }
  return fallback;
}

#pragma mark - Capture / finish

- (void)capturePressed
{
  if (_didFinish) {
    return;
  }

  UIImage *snapshot = [self snapshotImage];
  if (snapshot == nil) {
    [self failWithErrorCode:@"CAPTURE_FAILED"];
    return;
  }

  NSString *filename =
      [NSString stringWithFormat:@"visioncart-tryon-%@.jpg", NSUUID.UUID.UUIDString];
  NSString *path =
      [NSTemporaryDirectory() stringByAppendingPathComponent:filename];
  NSData *data = UIImageJPEGRepresentation(snapshot, 0.9);
  if (data == nil || ![data writeToFile:path atomically:YES]) {
    [self failWithErrorCode:@"CAPTURE_FAILED"];
    return;
  }

  NSURL *fileURL = [NSURL fileURLWithPath:path];
  [self completeWithCaptureUri:fileURL.absoluteString];
}

- (UIImage *_Nullable)snapshotImage
{
  if (_arView != nil) {
    return [_arView snapshot];
  }

  UIGraphicsBeginImageContextWithOptions(self.view.bounds.size, YES, UIScreen.mainScreen.scale);
  [self.view drawViewHierarchyInRect:self.view.bounds afterScreenUpdates:YES];
  UIImage *image = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
  return image;
}

- (void)closePressed
{
  [self dismissViewControllerAnimated:YES completion:nil];
}

- (void)closeWithoutCallback
{
  _didFinish = YES;
  self.onClose = nil;
  self.onCompleted = nil;
  self.onFailed = nil;
  [self tearDownSessions];
  [self dismissViewControllerAnimated:NO completion:nil];
}

- (void)completeWithCaptureUri:(NSString *_Nullable)captureUri
{
  if (_didFinish) {
    return;
  }
  _didFinish = YES;
  VisionCartTryOnCompletedBlock callback = self.onCompleted;
  self.onCompleted = nil;
  self.onClose = nil;
  self.onFailed = nil;
  [self tearDownSessions];
  [self dismissViewControllerAnimated:YES completion:^{
    if (callback != nil) {
      callback(captureUri);
    }
  }];
}

- (void)failWithErrorCode:(NSString *)errorCode
{
  if (_didFinish) {
    return;
  }
  _didFinish = YES;
  VisionCartTryOnFailedBlock callback = self.onFailed;
  self.onFailed = nil;
  self.onClose = nil;
  self.onCompleted = nil;
  [self tearDownSessions];
  [self dismissViewControllerAnimated:YES completion:^{
    if (callback != nil) {
      callback(errorCode);
    }
  }];
}

- (void)reportCloseOnce
{
  if (_didFinish) {
    return;
  }
  _didFinish = YES;
  dispatch_block_t callback = self.onClose;
  self.onClose = nil;
  self.onCompleted = nil;
  self.onFailed = nil;
  if (callback != nil) {
    callback();
  }
}

- (void)tearDownSessions
{
  if (_arView != nil) {
    [_arView.session pause];
    [_arView removeFromSuperview];
    _arView.delegate = nil;
    _arView = nil;
  }
  _overlayNode = nil;

  if (_videoOutput != nil) {
    [_videoOutput setSampleBufferDelegate:nil queue:nil];
    if (_captureSession != nil) {
      [_captureSession removeOutput:_videoOutput];
    }
    _videoOutput = nil;
  }

  if (_captureSession != nil) {
    AVCaptureSession *session = _captureSession;
    _captureSession = nil;
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
      if (session.isRunning) {
        [session stopRunning];
      }
    });
  }

  [_previewLayer removeFromSuperlayer];
  _previewLayer = nil;
  _handPoseRequest = nil;
}

@end
