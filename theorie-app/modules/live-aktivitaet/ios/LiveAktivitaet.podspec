Pod::Spec.new do |s|
  s.name           = 'LiveAktivitaet'
  s.version        = '1.0.0'
  s.summary        = 'Live-Aktivitaeten (Sperrbildschirm und Dynamic Island) fuer Fahrschul Pro'
  s.description    = 'Startet, aktualisiert und beendet die Live-Aktivitaeten der Pruefungssimulation und des Pruefungstags.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # ActivityKit gibt es erst ab iOS 16.1 - schwach linken, damit die App auf aelteren Geraeten startet.
  s.weak_frameworks = 'ActivityKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
