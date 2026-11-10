// Circle – Family Locator · große, moderne Version (Expo SDK 54)
// Echte Apple-Karte + GPS, Icons, Farbverläufe, Aktivitäts-Feed, Chat,
// Premium-Karte, Circle-Wechsler, Haptik, pulsierender SOS.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, Platform, StatusBar, Switch, Modal, Animated, KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const C = {
  brand: '#6C5CE7', brand2: '#9B8CFF', ink: '#15151E', sub: '#8A8A99',
  bg: '#F4F4FA', card: '#FFFFFF', line: '#ECECF3',
  green: '#00C896', blue: '#3B82F6', pink: '#EC4899', orange: '#F97316',
  red: '#EF4444', amber: '#F59E0B', purple: '#9B59B6',
};
const GRAD = ['#6C5CE7', '#9B8CFF'];
const DEFAULT_CENTER = { latitude: 51.1805, longitude: 6.4428 };
const INVITE = 'FAM-7K2Q';
const tap = (s = 'Light') => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle[s]); } catch (e) {} };

const MEMBERS = [
  { id: 'm1', name: 'Mama', emoji: '👩', color: C.pink,   battery: 82, status: 'Zuhause',       speed: 0,  dist: '0,2 km', seen: 2,  dx:  0.0006, dy:  0.0004 },
  { id: 'm2', name: 'Papa', emoji: '👨', color: C.blue,   battery: 47, status: 'Fährt Auto',    speed: 48, dist: '3,4 km', seen: 1,  dx: -0.0030, dy:  0.0022 },
  { id: 'm3', name: 'Lena', emoji: '🧒', color: C.green,  battery: 64, status: 'In der Schule',  speed: 0,  dist: '1,1 km', seen: 6,  dx:  0.0026, dy: -0.0017 },
  { id: 'm4', name: 'Opa',  emoji: '👴', color: C.orange, battery: 91, status: 'Spaziergang',    speed: 4,  dist: '2,0 km', seen: 12, dx: -0.0019, dy: -0.0024 },
  { id: 'm5', name: 'Emma', emoji: '👧', color: C.purple, battery: 18, status: 'Bei Freundin',   speed: 0,  dist: '4,2 km', seen: 9,  dx:  0.0014, dy: -0.0026 },
];
const PLACES = [
  { id: 'p1', name: 'Zuhause', icon: 'home',     color: C.brand, dx:  0.0006, dy:  0.0004, radius: 150, who: ['Mama'] },
  { id: 'p2', name: 'Schule',  icon: 'school',   color: C.green, dx:  0.0026, dy: -0.0017, radius: 170, who: ['Lena'] },
  { id: 'p3', name: 'Arbeit',  icon: 'business', color: C.blue,  dx: -0.0030, dy:  0.0022, radius: 160, who: [] },
];
const ACT0 = [
  { id: 'a1', icon: 'home',    color: C.brand,  text: 'Mama ist Zuhause angekommen', time: 'vor 4 Min.' },
  { id: 'a2', icon: 'car',     color: C.blue,   text: 'Papa fährt jetzt Auto · 48 km/h', time: 'vor 6 Min.' },
  { id: 'a3', icon: 'school',  color: C.green,  text: 'Lena ist in der Schule angekommen', time: 'vor 22 Min.' },
  { id: 'a4', icon: 'battery-dead', color: C.red, text: 'Emmas Akku ist niedrig (18%)', time: 'vor 31 Min.' },
];
const ACT_T = [
  { icon: 'home',     color: C.brand,  t: (n) => n + ' ist Zuhause angekommen' },
  { icon: 'car',      color: C.blue,   t: (n) => n + ' fährt jetzt Auto' },
  { icon: 'walk',     color: C.orange, t: (n) => n + ' macht einen Spaziergang' },
  { icon: 'school',   color: C.green,  t: (n) => n + ' hat die Schule verlassen' },
  { icon: 'location', color: C.purple, t: (n) => n + ' hat einen neuen Ort erreicht' },
  { icon: 'shield-checkmark', color: C.green, t: (n) => n + ' hat sich eingecheckt' },
];
const CHAT0 = [
  { id: 'c1', from: 'Mama', me: false, text: 'Wer ist heute zum Abendessen da?', time: '17:02' },
  { id: 'c2', from: 'Papa', me: false, text: 'Bin in 20 Min zuhause 🚗', time: '17:05' },
];
const REPLIES = ['Ok 👍', 'Bin gleich da!', 'Alles klar 😊', 'Bis später!', 'Super, danke!'];

function initPositions(center) {
  const o = {};
  MEMBERS.forEach((m) => { o[m.id] = { latitude: center.latitude + m.dx, longitude: center.longitude + m.dy, heading: Math.random() * 6.28 }; });
  return o;
}

/* --------------------------------- UI-Bausteine --------------------------------- */
function Pulse({ color, size = 60 }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1700, useNativeDriver: true }));
    loop.start(); return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
      opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    }} />
  );
}
function Battery({ v }) {
  const color = v > 50 ? C.green : v > 20 ? C.amber : C.red;
  return (
    <View style={{ alignItems: 'flex-end', width: 56 }}>
      <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{v}%</Text>
      <View style={st.batt}><View style={{ width: v + '%', height: '100%', backgroundColor: color, borderRadius: 3 }} /></View>
    </View>
  );
}

/* ----------------------------------- Login ----------------------------------- */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const submit = () => {
    if (!email.trim() || !pw.trim() || (mode === 'register' && !name.trim())) { Alert.alert('Ups', 'Bitte alle Felder ausfüllen.'); return; }
    tap('Medium'); onAuth({ name: name.trim() || email.split('@')[0], email: email.trim() });
  };
  return (
    <LinearGradient colors={GRAD} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={st.authHeader}>
          <View style={st.logoCircle}><Ionicons name="navigate" size={40} color="#fff" /></View>
          <Text style={st.authTitle}>Circle</Text>
          <Text style={st.authSub}>Sieh, wo deine Familie ist – in Echtzeit.</Text>
        </View>
        <View style={st.authCard}>
          <View style={st.tabs}>
            {['login', 'register'].map((m) => (
              <TouchableOpacity key={m} style={[st.segm, mode === m && st.segmA]} onPress={() => setMode(m)}>
                <Text style={[st.segmTxt, mode === m && st.segmTxtA]}>{m === 'login' ? 'Anmelden' : 'Registrieren'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {mode === 'register' && <Field icon="person-outline" ph="Dein Name" v={name} set={setName} cap="words" />}
          <Field icon="mail-outline" ph="E-Mail" v={email} set={setEmail} kb="email-address" />
          <Field icon="lock-closed-outline" ph="Passwort" v={pw} set={setPw} secure />
          <TouchableOpacity activeOpacity={0.85} onPress={submit}>
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.primaryBtn}>
              <Text style={st.primaryBtnTxt}>{mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={st.hint}>Demo-Login – einfach ausfüllen und los.</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
function Field({ icon, ph, v, set, secure, kb, cap }) {
  return (
    <View style={st.field}>
      <Ionicons name={icon} size={19} color={C.sub} style={{ marginRight: 10 }} />
      <TextInput style={{ flex: 1, fontSize: 16, color: C.ink }} placeholder={ph} value={v} onChangeText={set}
        secureTextEntry={secure} keyboardType={kb || 'default'} autoCapitalize={cap || 'none'} placeholderTextColor="#9aa0b0" />
    </View>
  );
}

/* ------------------------------------ Karte ------------------------------------ */
function MapTab({ me, perm, positions, trail, center, onSelect }) {
  const mapRef = useRef(null);
  const centered = useRef(false);
  const [mapType, setMapType] = useState('standard');
  useEffect(() => { if (me && !centered.current && mapRef.current) { centered.current = true; mapRef.current.animateToRegion({ ...me, latitudeDelta: 0.014, longitudeDelta: 0.014 }, 800); } }, [me]);
  const focus = (c) => c && mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 600);
  const coord = (m) => positions[m.id];
  const placeCoord = (p) => ({ latitude: center.latitude + p.dx, longitude: center.longitude + p.dy });
  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mapRef} provider={PROVIDER_DEFAULT} style={{ flex: 1 }} mapType={mapType}
        showsUserLocation={perm === 'granted'} showsMyLocationButton={false}
        initialRegion={{ ...(me || DEFAULT_CENTER), latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        {trail.length > 1 && <Polyline coordinates={trail} strokeColor={C.blue} strokeWidth={4} lineCap="round" />}
        {PLACES.map((p) => {
          const c = placeCoord(p);
          return (
            <React.Fragment key={p.id}>
              <Circle center={c} radius={p.radius} strokeColor={p.color + 'AA'} fillColor={p.color + '22'} strokeWidth={2} />
              <Marker coordinate={c} tracksViewChanges={false}>
                <View style={[st.placeDot, { borderColor: p.color }]}><Ionicons name={p.icon} size={15} color={p.color} /></View>
              </Marker>
            </React.Fragment>
          );
        })}
        {MEMBERS.map((m) => coord(m) && (
          <Marker key={m.id} coordinate={coord(m)} tracksViewChanges={false} onPress={() => { tap(); onSelect(m); }} anchor={{ x: 0.5, y: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={[st.markerAv, { borderColor: m.color }]}><Text style={{ fontSize: 20 }}>{m.emoji}</Text></View>
              <View style={[st.markerTip, { backgroundColor: m.color }]} />
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={st.chipsBar} pointerEvents="box-none">
        <View style={st.circlePill}><Ionicons name="people" size={15} color={C.brand} /><Text style={st.circlePillTxt}>Familie</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10 }}>
          {MEMBERS.map((m) => (
            <TouchableOpacity key={m.id} style={st.chip} onPress={() => { tap(); focus(coord(m)); }}>
              <View style={[st.chipAv, { backgroundColor: m.color }]}><Text style={{ fontSize: 14 }}>{m.emoji}</Text></View>
              <Text style={st.chipTxt}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={st.fabCol}>
        <TouchableOpacity style={st.fab} onPress={() => { tap(); setMapType(mapType === 'standard' ? 'satellite' : 'standard'); }}>
          <Ionicons name="layers" size={20} color={C.ink} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.fab, { marginTop: 12 }]} onPress={() => { tap(); focus(me); }}>
          <Ionicons name="locate" size={20} color={C.brand} />
        </TouchableOpacity>
        <View style={{ marginTop: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Pulse color={C.red} size={56} />
          <TouchableOpacity style={[st.fab, { backgroundColor: C.red }]} onPress={() => { tap('Heavy'); Alert.alert('🚨 SOS gesendet', 'Deine Familie wurde benachrichtigt und sieht deinen Standort. (Demo)'); }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>SOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ---------------------------------- Aktivität ---------------------------------- */
function ActivityTab({ items }) {
  return (
    <ScrollView style={st.page} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={st.h1}>Aktivität</Text>
      <Text style={st.pSub}>Was in deinem Circle passiert</Text>
      {items.map((a) => (
        <View key={a.id} style={st.actRow}>
          <View style={[st.actIcon, { backgroundColor: a.color + '1A' }]}><Ionicons name={a.icon} size={20} color={a.color} /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.actText}>{a.text}</Text>
            <Text style={st.actTime}>{a.time}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ----------------------------------- Familie ----------------------------------- */
function MembersTab({ onSelect }) {
  return (
    <ScrollView style={st.page} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={st.h1}>Familie</Text>
      <Text style={st.pSub}>{MEMBERS.length + 1} Mitglieder im Kreis</Text>
      {MEMBERS.map((m) => (
        <TouchableOpacity key={m.id} style={st.card} onPress={() => { tap(); onSelect(m); }} activeOpacity={0.7}>
          <View style={[st.cardAv, { backgroundColor: m.color }]}><Text style={{ fontSize: 24 }}>{m.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={st.cardName}>{m.name}</Text>
            <Text style={st.cardSub}>{m.status} · {m.dist} · vor {m.seen} Min.</Text>
            {m.speed > 0 && <View style={st.badge}><Ionicons name="car" size={11} color={C.blue} /><Text style={st.badgeTxt}>{m.speed} km/h</Text></View>}
          </View>
          <Battery v={m.battery} />
        </TouchableOpacity>
      ))}
      <GradBtn icon="person-add" label="Mitglied einladen" onPress={() => Alert.alert('Mitglied einladen', 'Teile deinen Code: ' + INVITE)} />
    </ScrollView>
  );
}

/* ------------------------------------ Chat ------------------------------------ */
function ChatTab({ messages, onSend }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  const send = () => { if (!text.trim()) return; tap(); onSend(text.trim()); setText(''); };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={st.chatHead}><Text style={st.h1}>Familien-Chat</Text></View>
      <ScrollView ref={ref} style={{ flex: 1, paddingHorizontal: 14 }} onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}>
        {messages.map((msg) => (
          <View key={msg.id} style={[st.bubbleWrap, msg.me ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
            {!msg.me && <Text style={st.bubbleName}>{msg.from}</Text>}
            {msg.me
              ? <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.bubble, st.bubbleMe]}><Text style={{ color: '#fff', fontSize: 15 }}>{msg.text}</Text></LinearGradient>
              : <View style={[st.bubble, st.bubbleThem]}><Text style={{ color: C.ink, fontSize: 15 }}>{msg.text}</Text></View>}
            <Text style={[st.bubbleTime, msg.me && { textAlign: 'right' }]}>{msg.time}</Text>
          </View>
        ))}
        <View style={{ height: 10 }} />
      </ScrollView>
      <View style={st.chatBar}>
        <TextInput style={st.chatInput} placeholder="Nachricht…" value={text} onChangeText={setText} placeholderTextColor="#9aa0b0" />
        <TouchableOpacity onPress={send}>
          <LinearGradient colors={GRAD} style={st.sendBtn}><Ionicons name="send" size={18} color="#fff" /></LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------ Profil ------------------------------------ */
function ProfileTab({ user, perm, onLogout }) {
  const [s1, setS1] = useState(true), [s2, setS2] = useState(true), [s3, setS3] = useState(true);
  return (
    <ScrollView style={st.page} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={st.h1}>Profil</Text>
      <LinearGradient colors={GRAD} style={st.profHead}>
        <View style={st.profAv}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 26 }}>{(user?.name || 'D')[0].toUpperCase()}</Text></View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{user?.name || 'Du'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{user?.email || ''}</Text>
          <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>{perm === 'granted' ? '📍 Standort aktiv' : '⚠️ Standort aus'}</Text>
        </View>
      </LinearGradient>

      <View style={st.premium}>
        <Ionicons name="star" size={26} color="#fff" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Circle Gold</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12.5 }}>Unbegrenzte Orte, Verlauf & Crash-Erkennung</Text>
        </View>
        <TouchableOpacity style={st.goldBtn} onPress={() => Alert.alert('Circle Gold', 'Upgrade auf Gold – 4,99 €/Monat. (Demo)')}><Text style={{ color: '#B8860B', fontWeight: '800' }}>Holen</Text></TouchableOpacity>
      </View>

      <View style={st.inviteBox}>
        <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 4 }}>Dein Einladungs-Code</Text>
        <Text style={st.inviteCode}>{INVITE}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Teilen', 'Code ' + INVITE + ' geteilt. (Demo)')}><Text style={{ color: '#fff', textDecorationLine: 'underline', marginTop: 6 }}>Code teilen</Text></TouchableOpacity>
      </View>

      <Text style={st.section}>Einstellungen</Text>
      <Toggle icon="navigate" label="Meinen Standort teilen" v={s1} set={setS1} />
      <Toggle icon="car" label="Fahrberichte" v={s2} set={setS2} />
      <Toggle icon="notifications" label="Benachrichtigungen" v={s3} set={setS3} />

      <TouchableOpacity style={st.logoutBtn} onPress={() => { tap(); onLogout(); }}>
        <Ionicons name="log-out-outline" size={19} color={C.red} />
        <Text style={st.logoutTxt}>Abmelden</Text>
      </TouchableOpacity>
      <Text style={{ textAlign: 'center', color: '#bbb', marginTop: 14, fontSize: 12 }}>Circle Demo · v2.0</Text>
    </ScrollView>
  );
}
function Toggle({ icon, label, v, set }) {
  return (
    <View style={st.toggleRow}>
      <Ionicons name={icon} size={19} color={C.brand} style={{ marginRight: 12 }} />
      <Text style={st.toggleLabel}>{label}</Text>
      <Switch value={v} onValueChange={(x) => { tap(); set(x); }} trackColor={{ true: C.brand }} thumbColor="#fff" />
    </View>
  );
}
function GradBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => { tap(); onPress(); }}>
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.gradBtn}>
        <Ionicons name={icon} size={18} color="#fff" /><Text style={st.gradBtnTxt}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/* -------------------------------- Mitglied-Detail -------------------------------- */
function MemberModal({ member, onClose, onChat }) {
  if (!member) return null;
  return (
    <Modal transparent animationType="slide" visible={!!member} onRequestClose={onClose}>
      <TouchableOpacity style={st.modalBg} activeOpacity={1} onPress={onClose}>
        <View style={st.modalCard} onStartShouldSetResponder={() => true}>
          <View style={st.handle} />
          <LinearGradient colors={[member.color, member.color + 'CC']} style={st.modalHead}>
            <View style={st.modalAv}><Text style={{ fontSize: 32 }}>{member.emoji}</Text></View>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{member.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)' }}>{member.status} · vor {member.seen} Min.</Text>
          </LinearGradient>
          <View style={st.statsRow}>
            <Stat icon="battery-half" label="Akku" value={member.battery + '%'} />
            <Stat icon="speedometer" label="Tempo" value={member.speed + ' km/h'} />
            <Stat icon="walk" label="Entfernung" value={member.dist} />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <TouchableOpacity style={[st.mBtn, { backgroundColor: C.brand, marginRight: 8 }]} onPress={() => { tap(); Alert.alert('Route', 'Navigation zu ' + member.name + '. (Demo)'); }}><Ionicons name="navigate" size={16} color="#fff" /><Text style={st.mBtnTxt}>Route</Text></TouchableOpacity>
            <TouchableOpacity style={[st.mBtn, { backgroundColor: C.green, marginRight: 8 }]} onPress={() => { tap(); onClose(); onChat(); }}><Ionicons name="chatbubble" size={16} color="#fff" /><Text style={st.mBtnTxt}>Chat</Text></TouchableOpacity>
            <TouchableOpacity style={[st.mBtn, { backgroundColor: C.amber }]} onPress={() => { tap(); Alert.alert('Check-in', member.name + ' wurde um Check-in gebeten. (Demo)'); }}><Ionicons name="hand-left" size={16} color="#fff" /><Text style={st.mBtnTxt}>Ping</Text></TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
function Stat({ icon, label, value }) {
  return (
    <View style={st.stat}>
      <Ionicons name={icon} size={18} color={C.brand} />
      <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15, marginTop: 4 }}>{value}</Text>
      <Text style={{ color: C.sub, fontSize: 11, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

/* ------------------------------------ Shell ------------------------------------ */
function Home({ user, onLogout }) {
  const [tab, setTab] = useState('map');
  const [me, setMe] = useState(null);
  const [perm, setPerm] = useState(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [positions, setPositions] = useState(() => initPositions(DEFAULT_CENTER));
  const [trail, setTrail] = useState([]);
  const [sel, setSel] = useState(null);
  const [activity, setActivity] = useState(ACT0);
  const [messages, setMessages] = useState(CHAT0);
  const posRef = useRef(positions); posRef.current = positions;
  const rebased = useRef(false);

  useEffect(() => {
    let sub;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setPerm(status);
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const p = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setMe(p);
          if (!rebased.current) { rebased.current = true; setCenter(p); setPositions(initPositions(p)); setTrail([]); }
          sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 8 }, (l) => setMe({ latitude: l.coords.latitude, longitude: l.coords.longitude }));
        }
      } catch (e) {}
    })();
    return () => { if (sub) sub.remove(); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const prev = posRef.current; const next = {}; let drive = null;
      MEMBERS.forEach((m) => {
        const cur = prev[m.id]; if (!cur) return;
        const step = m.speed > 20 ? 0.00016 : m.speed > 0 ? 0.00004 : 0.000012;
        const heading = cur.heading + (Math.random() - 0.5) * 0.6;
        const np = { latitude: cur.latitude + Math.cos(heading) * step, longitude: cur.longitude + Math.sin(heading) * step, heading };
        next[m.id] = np; if (m.id === 'm2') drive = np;
      });
      setPositions(next);
      if (drive) setTrail((t) => [...t, { latitude: drive.latitude, longitude: drive.longitude }].slice(-30));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Live-Aktivität
  useEffect(() => {
    const id = setInterval(() => {
      const m = MEMBERS[Math.floor(Math.random() * MEMBERS.length)];
      const tpl = ACT_T[Math.floor(Math.random() * ACT_T.length)];
      setActivity((a) => [{ id: 'a' + Date.now(), icon: tpl.icon, color: tpl.color, text: tpl.t(m.name), time: 'gerade eben' }, ...a].slice(0, 30));
    }, 9000);
    return () => clearInterval(id);
  }, []);

  const sendMsg = (text) => {
    const now = new Date(); const hh = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    setMessages((ms) => [...ms, { id: 'c' + Date.now(), from: user?.name || 'Du', me: true, text, time: hh }]);
    setTimeout(() => {
      const m = MEMBERS[Math.floor(Math.random() * MEMBERS.length)];
      setMessages((ms) => [...ms, { id: 'r' + Date.now(), from: m.name, me: false, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], time: hh }]);
    }, 1600);
  };

  const TABS = [
    { id: 'map', label: 'Karte', icon: 'map' },
    { id: 'activity', label: 'Aktivität', icon: 'pulse' },
    { id: 'members', label: 'Familie', icon: 'people' },
    { id: 'chat', label: 'Chat', icon: 'chatbubbles' },
    { id: 'profile', label: 'Profil', icon: 'person' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {tab === 'map' && <MapTab me={me} perm={perm} positions={positions} trail={trail} center={center} onSelect={setSel} />}
        {tab === 'activity' && <SafeAreaView style={{ flex: 1 }}><ActivityTab items={activity} /></SafeAreaView>}
        {tab === 'members' && <SafeAreaView style={{ flex: 1 }}><MembersTab onSelect={setSel} /></SafeAreaView>}
        {tab === 'chat' && <SafeAreaView style={{ flex: 1 }}><ChatTab messages={messages} onSend={sendMsg} /></SafeAreaView>}
        {tab === 'profile' && <SafeAreaView style={{ flex: 1 }}><ProfileTab user={user} perm={perm} onLogout={onLogout} /></SafeAreaView>}
      </View>

      <View style={st.tabBar}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <TouchableOpacity key={t.id} style={st.tabItem} onPress={() => { tap(); setTab(t.id); }}>
              <Ionicons name={on ? t.icon : (t.icon + '-outline')} size={23} color={on ? C.brand : '#A0A0AE'} />
              <Text style={[st.tabLabel, { color: on ? C.brand : '#A0A0AE' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <MemberModal member={sel} onClose={() => setSel(null)} onChat={() => setTab('chat')} />
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  return user ? <Home user={user} onLogout={() => setUser(null)} /> : <AuthScreen onAuth={setUser} />;
}

/* ------------------------------------ Styles ------------------------------------ */
const st = StyleSheet.create({
  authHeader: { alignItems: 'center', paddingTop: 40, paddingBottom: 26 },
  logoCircle: { width: 86, height: 86, borderRadius: 43, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  authTitle: { color: '#fff', fontSize: 34, fontWeight: '800' },
  authSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 6, textAlign: 'center', paddingHorizontal: 34 },
  authCard: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 22 },
  tabs: { flexDirection: 'row', backgroundColor: '#f1f1f6', borderRadius: 14, padding: 4, marginBottom: 20 },
  segm: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  segmA: { backgroundColor: '#fff' },
  segmTxt: { color: '#888', fontWeight: '700' },
  segmTxtA: { color: C.brand },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f6f6fa', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 13, borderWidth: 1, borderColor: '#ececf2' },
  primaryBtn: { borderRadius: 13, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint: { textAlign: 'center', color: '#aaa', marginTop: 14, fontSize: 13 },

  markerAv: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  markerTip: { width: 9, height: 9, borderRadius: 5, marginTop: -2 },
  placeDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },

  chipsBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: Platform.OS === 'android' ? 36 : 4 },
  circlePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: 14, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  circlePillTxt: { fontWeight: '800', color: '#333', marginLeft: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 22, marginRight: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  chipAv: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  chipTxt: { fontWeight: '700', color: '#333', fontSize: 13, marginRight: 4 },

  fabCol: { position: 'absolute', right: 16, bottom: 24, alignItems: 'center' },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },

  page: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },
  h1: { fontSize: 28, fontWeight: '800', color: C.ink, marginTop: 6 },
  pSub: { color: C.sub, marginBottom: 16, marginTop: 2 },

  actRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 13, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  actIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  actText: { color: C.ink, fontWeight: '600', fontSize: 14.5 },
  actTime: { color: C.sub, fontSize: 12, marginTop: 2 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  cardAv: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardName: { fontWeight: '800', color: C.ink, fontSize: 16 },
  cardSub: { color: C.sub, fontSize: 13, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.blue + '1A', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 },
  badgeTxt: { color: C.blue, fontWeight: '700', fontSize: 11, marginLeft: 3 },

  gradBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 15, marginTop: 4 },
  gradBtnTxt: { color: '#fff', fontWeight: '800', marginLeft: 8 },

  chatHead: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 },
  bubbleWrap: { maxWidth: '78%', marginVertical: 5 },
  bubbleName: { fontSize: 11, color: C.sub, marginBottom: 2, marginLeft: 8 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { borderBottomRightRadius: 5 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 5 },
  bubbleTime: { fontSize: 10, color: '#b3b3bf', marginTop: 2, marginHorizontal: 6 },
  chatBar: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line },
  chatInput: { flex: 1, backgroundColor: '#f1f1f6', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, marginRight: 8, color: C.ink },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  profHead: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 18, marginBottom: 14 },
  profAv: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  premium: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 18, padding: 16, marginBottom: 14 },
  goldBtn: { backgroundColor: '#FFD700', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  inviteBox: { backgroundColor: C.brand, borderRadius: 18, padding: 18, marginBottom: 16 },
  inviteCode: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 2 },
  section: { fontWeight: '800', color: '#444', marginBottom: 8, marginTop: 4, fontSize: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  toggleLabel: { color: '#333', fontWeight: '600', fontSize: 15, flex: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 15, marginTop: 14, borderWidth: 1, borderColor: '#ffd5d5' },
  logoutTxt: { color: C.red, fontWeight: '800', marginLeft: 8 },

  batt: { width: 46, height: 6, borderRadius: 3, backgroundColor: '#eee', marginTop: 4, overflow: 'hidden' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 14 },
  modalHead: { alignItems: 'center', borderRadius: 20, paddingVertical: 20, marginBottom: 16 },
  modalAv: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, backgroundColor: '#f6f6fa', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4 },
  mBtn: { flex: 1, flexDirection: 'row', borderRadius: 13, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  mBtnTxt: { color: '#fff', fontWeight: '800', marginLeft: 6 },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 1, borderTopColor: C.line },
  tabItem: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 10.5, fontWeight: '700', marginTop: 3 },
});
