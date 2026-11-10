const { withPodfile } = require("expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

// Einige Bibliotheken (SDWebImage, RNSVG, AsyncStorage …) bringen noch iOS 9–13
// als Mindestversion mit. Neue Xcode-Versionen bauen das nicht mehr – daher
// heben wir nur diese Pods auf 15.1. Die App selbst und die Widget-Erweiterung
// behalten ihre eigenen Mindestversionen.
const MINDEST = "15.1";

module.exports = function iosPodZiel(config) {
  return withPodfile(config, (cfg) => {
    cfg.modResults.contents = mergeContents({
      tag: "ios-pod-ziel",
      src: cfg.modResults.contents,
      newSrc: [
        "    installer.pods_project.targets.each do |t|",
        "      t.build_configurations.each do |c|",
        `        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MINDEST}`,
        `          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MINDEST}'`,
        "        end",
        "      end",
        "    end",
      ].join("\n"),
      anchor: /post_install do \|installer\|/,
      offset: 1,
      comment: "#",
    }).contents;
    return cfg;
  });
};
