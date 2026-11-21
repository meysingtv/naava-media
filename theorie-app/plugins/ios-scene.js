const fs = require("fs");
const path = require("path");
const { IOSConfig, withAppDelegate, withInfoPlist, withXcodeProject } = require("expo/config-plugins");

// iOS 27 beendet Apps aus dem aktuellen SDK sofort beim Start, wenn sie noch
// ohne UIScene laufen. Die Expo-Vorlage (SDK 54) baut ihr Fenster aber im
// AppDelegate. Wir melden deshalb eine Scene an und starten React Native im
// SceneDelegate. Das Fenster landet zusätzlich im AppDelegate, weil
// expo-splash-screen & Co. es dort suchen.

const SCENE_DELEGATE = `import UIKit
import Expo
import React

// Erzeugt von plugins/ios-scene.js – Fenster und React Native starten hier.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = appDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // Kaltstart über einen Link: wie früher als Start-Option mitgeben.
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)

    if let activity = connectionOptions.userActivities.first {
      _ = appDelegate.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = appDelegate?.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  // Mit Scenes ruft iOS diese Ereignisse nicht mehr am AppDelegate auf –
  // Expo-Module hören aber dort zu.
  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }
}
`;

const FENSTER_ALT = /\n[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n[ \t]*factory\.startReactNative\(\n[ \t]*withModuleName: "main",\n[ \t]*in: window,\n[ \t]*launchOptions: launchOptions\)\n/;

function mitInfoPlist(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });
}

function mitAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("ios-scene: erwartet einen AppDelegate in Swift.");
    }
    const inhalt = cfg.modResults.contents;
    if (inhalt.includes("SceneDelegate.swift")) return cfg;
    if (!FENSTER_ALT.test(inhalt)) {
      throw new Error("ios-scene: Fenster-Start im AppDelegate nicht gefunden – Expo-Vorlage hat sich geändert.");
    }
    cfg.modResults.contents = inhalt.replace(
      FENSTER_ALT,
      "\n    // Fenster und React Native startet SceneDelegate.swift (plugins/ios-scene.js).\n"
    );
    return cfg;
  });
}

function mitSceneDelegate(config) {
  return withXcodeProject(config, (cfg) => {
    const projekt = cfg.modResults;
    const name = cfg.modRequest.projectName;
    fs.writeFileSync(path.join(cfg.modRequest.platformProjectRoot, name, "SceneDelegate.swift"), SCENE_DELEGATE);
    const datei = `${name}/SceneDelegate.swift`;
    if (!projekt.hasFile(datei)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: datei, groupName: name, project: projekt });
    }
    return cfg;
  });
}

module.exports = function iosScene(config) {
  return mitSceneDelegate(mitAppDelegate(mitInfoPlist(config)));
};
