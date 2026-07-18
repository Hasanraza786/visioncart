#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface VisionCartTryOnViewController : UIViewController

@property(nonatomic, copy, nullable) dispatch_block_t onClose;

- (void)closeWithoutCallback;

@end

NS_ASSUME_NONNULL_END
