require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name = "VisionCartTryOnSdk"
  s.version = package["version"]
  s.summary = "VisionCart native virtual try-on module"
  s.homepage = "https://visioncart.invalid"
  s.license = { :type => "UNLICENSED" }
  s.author = "VisionCart"
  s.platforms = { :ios => "16.0" }
  s.source = { :git => "https://visioncart.invalid/tryon-sdk.git", :tag => s.version.to_s }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.requires_arc = true
  s.frameworks = "ARKit", "SceneKit", "AVFoundation", "Vision", "UIKit", "Photos"

  install_modules_dependencies(s)
end
