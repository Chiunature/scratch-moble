require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'react-native-pika'
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = { :type => 'MIT' }
  s.author       = { 'PikaMobile' => 'pika-mobile@example.com' }
  s.homepage     = 'https://github.com/pikastech/pikapython'
  s.platforms    = { :ios => '13.0' }
  s.source       = { :path => '.' }
  s.static_framework = true

  s.source_files = [
    'ios/**/*.{h,m,mm}',
    '../mobile/*.{c,h}',
    '../pikascript/pikascript-core/*.{c,h}',
    '../pikascript/pikascript-lib/PikaStdLib/*.{c,h}',
    '../pikascript/pikascript-api/*.{c,h}',
    '../pika_config.h'
  ]

  s.header_mappings_dir = '..'
  s.preserve_paths = [
    '../mobile/*.{c,h}',
    '../pikascript/**/*.{c,h}',
    '../pika_config.h'
  ]

  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => [
      '$(PODS_TARGET_SRCROOT)/..',
      '$(PODS_TARGET_SRCROOT)/../mobile',
      '$(PODS_TARGET_SRCROOT)/../pikascript/pikascript-core',
      '$(PODS_TARGET_SRCROOT)/../pikascript/pikascript-api',
      '$(PODS_TARGET_SRCROOT)/../pikascript/pikascript-lib/PikaStdLib'
    ].join(' '),
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) PIKA_CONFIG_ENABLE=1 CROSS_BUILD=1 PIKA_LINUX_COMPATIBLE=1'
  }

  s.dependency 'React-Core'
end
