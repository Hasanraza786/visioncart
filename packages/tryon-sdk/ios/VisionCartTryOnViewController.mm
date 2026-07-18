#import "VisionCartTryOnViewController.h"

@implementation VisionCartTryOnViewController {
  BOOL _reportedClose;
}

- (void)viewDidLoad
{
  [super viewDidLoad];
  self.view.backgroundColor = [UIColor colorWithWhite:0.07 alpha:1.0];

  UILabel *label = [[UILabel alloc] initWithFrame:CGRectZero];
  label.translatesAutoresizingMaskIntoConstraints = NO;
  label.text = @"Virtual try-on";
  label.textColor = UIColor.whiteColor;
  label.font = [UIFont systemFontOfSize:24 weight:UIFontWeightSemibold];
  [self.view addSubview:label];

  UIButton *closeButton = [UIButton buttonWithType:UIButtonTypeSystem];
  closeButton.translatesAutoresizingMaskIntoConstraints = NO;
  [closeButton setTitle:@"Close" forState:UIControlStateNormal];
  closeButton.titleLabel.font = [UIFont systemFontOfSize:18 weight:UIFontWeightSemibold];
  [closeButton addTarget:self action:@selector(closePressed) forControlEvents:UIControlEventTouchUpInside];
  [self.view addSubview:closeButton];

  [NSLayoutConstraint activateConstraints:@[
    [label.centerXAnchor constraintEqualToAnchor:self.view.centerXAnchor],
    [label.centerYAnchor constraintEqualToAnchor:self.view.centerYAnchor],
    [closeButton.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor constant:12],
    [closeButton.trailingAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.trailingAnchor constant:-20],
  ]];
}

- (void)viewDidDisappear:(BOOL)animated
{
  [super viewDidDisappear:animated];
  if (self.isBeingDismissed || self.presentingViewController == nil) {
    [self reportCloseOnce];
  }
}

- (void)closePressed
{
  [self dismissViewControllerAnimated:YES completion:nil];
}

- (void)closeWithoutCallback
{
  _reportedClose = YES;
  self.onClose = nil;
  [self dismissViewControllerAnimated:NO completion:nil];
}

- (void)reportCloseOnce
{
  if (_reportedClose) {
    return;
  }
  _reportedClose = YES;
  dispatch_block_t callback = self.onClose;
  self.onClose = nil;
  if (callback != nil) {
    callback();
  }
}

@end
