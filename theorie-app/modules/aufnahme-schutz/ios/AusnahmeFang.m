#import <Foundation/Foundation.h>
#import <objc/runtime.h>

// Schutz gegen den Absturz beim Start auf iOS 26/27 (React Native 0.81):
// Wirft eine Methode eines nativen React-Native-Moduls eine NSException,
// macht React Native daraus einen sofortigen Absturz (siehe
// facebook/react-native#54859). Hier wird -[NSInvocation invokeWithTarget:]
// umgeleitet: Ist das Ziel ein React-Native-Modul (RCTBridgeModule), wird die
// Ausnahme abgefangen, protokolliert und gemerkt – die App läuft weiter.
// Alle anderen Aufrufe laufen unverändert durch.

static IMP fahrschulOriginalInvoke = NULL;
static NSString *const FahrschulAusnahmeSchluessel = @"fahrschulpro.letzteAusnahme";

static BOOL FahrschulIstRNModul(id ziel)
{
  if (ziel == nil) {
    return NO;
  }
  static Protocol *protokoll = NULL;
  if (protokoll == NULL) {
    protokoll = objc_getProtocol("RCTBridgeModule");
  }
  return protokoll != NULL && [ziel conformsToProtocol:protokoll];
}

static void FahrschulInvokeWithTarget(id selbst, SEL befehl, id ziel)
{
  void (*original)(id, SEL, id) = (void (*)(id, SEL, id))fahrschulOriginalInvoke;
  if (!FahrschulIstRNModul(ziel)) {
    original(selbst, befehl, ziel);
    return;
  }
  @try {
    original(selbst, befehl, ziel);
  } @catch (NSException *ausnahme) {
    NSInvocation *aufruf = (NSInvocation *)selbst;
    NSString *text = [NSString stringWithFormat:@"%@ %@ – %@: %@",
                                                NSStringFromClass([ziel class]),
                                                NSStringFromSelector(aufruf.selector),
                                                ausnahme.name,
                                                ausnahme.reason ?: @""];
    NSLog(@"[AusnahmeFang] abgefangen: %@", text);
    [[NSUserDefaults standardUserDefaults] setObject:text forKey:FahrschulAusnahmeSchluessel];
  }
}

@interface AusnahmeFang : NSObject
@end

@implementation AusnahmeFang

+ (void)load
{
  static dispatch_once_t einmal;
  dispatch_once(&einmal, ^{
    Method methode = class_getInstanceMethod([NSInvocation class], @selector(invokeWithTarget:));
    if (methode != NULL) {
      fahrschulOriginalInvoke = method_setImplementation(methode, (IMP)FahrschulInvokeWithTarget);
    }
  });
}

@end
