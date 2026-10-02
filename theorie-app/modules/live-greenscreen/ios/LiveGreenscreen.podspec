Pod::Spec.new do |s|
  s.name           = 'LiveGreenscreen'
  s.version        = '1.0.0'
  s.summary        = 'Greenscreen fuer das Live von Fahrschul Pro'
  s.description    = 'Stellt im gesendeten Kamerabild die Person frei (Vision) und legt ein Bild oder Video dahinter.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # WebRTC von LiveKit (kommt ueber @livekit/react-native-webrtc) - fuer die Videobilder.
  s.dependency 'LiveKitWebRTC'

  s.frameworks = 'Vision', 'CoreImage', 'CoreVideo', 'AVFoundation', 'QuartzCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
