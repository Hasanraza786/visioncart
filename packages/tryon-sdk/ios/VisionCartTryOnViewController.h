#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^VisionCartTryOnCompletedBlock)(NSString *_Nullable captureUri);
typedef void (^VisionCartTryOnFailedBlock)(NSString *errorCode);

@interface VisionCartTryOnViewController : UIViewController

@property(nonatomic, copy) NSString *sessionId;
@property(nonatomic, copy) NSString *productId;
@property(nonatomic, copy) NSString *category;
@property(nonatomic, copy, nullable) NSString *platformAssetUri;
@property(nonatomic, assign) BOOL captureEnabled;
@property(nonatomic, assign) double widthMm;
@property(nonatomic, assign) double heightMm;
@property(nonatomic, assign) double depthMm;
@property(nonatomic, assign) double minScale;
@property(nonatomic, assign) double maxScale;
@property(nonatomic, assign) double defaultScale;

@property(nonatomic, copy, nullable) dispatch_block_t onClose;
@property(nonatomic, copy, nullable) VisionCartTryOnCompletedBlock onCompleted;
@property(nonatomic, copy, nullable) VisionCartTryOnFailedBlock onFailed;

- (void)closeWithoutCallback;

@end

NS_ASSUME_NONNULL_END
