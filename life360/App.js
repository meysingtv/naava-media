// Circle – Family Locator (Life360-Style) · Mac/Xcode-Simulator-Version
// Echte Apple-Karte (react-native-maps) + echtes GPS (expo-location).
// Flüssig bewegende Familie + Routen-Spur, 4 Tabs, Mitglieder-Details, Zonen, Einstellungen.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, Platform, StatusBar, Switch, Modal,
} from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

const BRAND = '#6C5CE7';
const DEFAULT_CENTER = { latitude: 51.1805, longitude: 6.4428 };
const INVITE = 'FAM-7K2Q';

const MEMBERS = [
  { id: 'm1', name: 'Mama', emoji: '👩', color: '#E84393', battery: 82, status: 'Zuhause',       speed: 0,  seen: 2,  dx:  0.0006, dy:  0.0004 },
  { id: 'm2', name: 'Papa', emoji: '👨', color: '#0984E3', battery: 47, status: 'Fährt Auto',    speed: 48, seen: 1,  dx: -0.0030, dy:  0.0022 },
  { id: 'm3', name: 'Lena', emoji: '🧒', color: '#00B894', battery: 64, status: 'In der Schule',  speed: 0,  seen: 6,  dx:  0.0026, dy: -0.0017 },
  { id: 'm4', name: 'Opa',  emoji: '👴', color: '#E17055', battery: 91, status: 'Spaziergang',    speed: 4,  seen: 12, dx: -0.0019, dy: -0.0024 },
  { id: 'm5', name: 'Emma', emoji: '👧', color: '#9B59B6', battery: 73, status: 'Bei Freundin',   speed: 0,  seen: 9,  dx:  0.0014, dy: -0.0026 },
];

const PLACES = [
  { id: 'p1', name: 'Zuhause', emoji: '🏠', color: '#6C5CE7', dx:  0.0006, dy:  0.0004, radius: 150, who: ['Mama'] },
  { id: 'p2', name: 'Schule',  emoji: '🏫', color: '#00B894', dx:  0.0026, dy: -0.0017, radius: 170, who: ['Lena'] },
  { id: 'p3', name: 'Arbeit',  emoji: '🏢', color: '#0984E3', dx: -0.0030, dy:  0.0022, radius: 160, who: [] },
];

function initPositions(center) {
  const o = {};
  MEMBERS.forEach((m) => { o[m.id] = { latitude: center.latitude + m.dx, longitude: center.longitude + m.dy, heading: Math.random() * Math.PI * 2 }; });
  return o;
}

/* ================================ Login ================================ */
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const submit = () => {
    if (!email.trim() || !pw.trim() || (mode === 'register' && !name.trim())) {
      Alert.alert('Ups', 'Bitte alle Felder ausfüllen.'); return;
    }
    onAuth({ name: name.trim() || email.split('@')[0], email: email.trim() });
  };
  return (
    <SafeAreaView style={styles.authWrap}>
      <StatusBar barStyle="light-content" />
      <View style={styles.authHeader}>
        <View style={styles.logoCircle}><Text style={{ fontSize: 36 }}>🛰️</Text></View>
        <Text style={styles.authTitle}>Circle</Text>
        <Text style={styles.authSub}>Sieh, wo deine Familie ist – in Echtzeit.</Text>
      </View>
      <View style={styles.authCard}>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.segm, mode === 'login' && styles.segmA]} onPress={() => setMode('login')}>
            <Text style={[styles.segmTxt, mode === 'login' && styles.segmTxtA]}>Anmelden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segm, mode === 'register' && styles.segmA]} onPress={() => setMode('register')}>
            <Text style={[styles.segmTxt, mode === 'register' && styles.segmTxtA]}>Registrieren</Text>
          </TouchableOpacity>
        </View>
        {mode === 'register' && (
          <TextInput style={styles.input} placeholder="Dein Name" value={name} onChangeText={setName}
            autoCapitalize="words" placeholderTextColor="#9aa0b0" />
        )}
        <TextInput style={styles.input} placeholder="E-Mail" value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#9aa0b0" />
        <TextInput style={styles.input} placeholder="Passwort" value={pw} onChangeText={setPw}
          secureTextEntry placeholderTextColor="#9aa0b0" />
        <TouchableOpacity style={styles.primaryBtn} onPress={submit} activeOpacity={0.85}>
          <Text style={styles.primaryBtnTxt}>{mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Demo-Login – einfach ausfüllen und los.</Text>
      </View>
    </SafeAreaView>
  );
}

/* ============================== Karten-Tab ============================== */
function MapTab({ me, perm, positions, trail, center, onSelect }) {
  const mapRef = useRef(null);
  const centered = useRef(false);
  const [mapType, setMapType] = useState('standard');

  useEffect(() => {
    if (me && !centered.current && mapRef.current) {
      centered.current = true;
      mapRef.current.animateToRegion({ ...me, latitudeDelta: 0.014, longitudeDelta: 0.014 }, 800);
    }
  }, [me]);

  const focus = (c) => c && mapRef.current?.animateToRegion({ ...c, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 600);
  const coord = (m) => positions[m.id];
  const placeCoord = (p) => ({ latitude: center.latitude + p.dx, longitude: center.longitude + p.dy });

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        mapType={mapType}
        showsUserLocation={perm === 'granted'}
        showsMyLocationButton={false}
        initialRegion={{ ...(me || DEFAULT_CENTER), latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {trail.length > 1 && <Polyline coordinates={trail} strokeColor="#0984E3" strokeWidth={4} lineCap="round" />}
        {PLACES.map((p) => {
          const c = placeCoord(p);
          return (
            <React.Fragment key={p.id}>
              <Circle center={c} radius={p.radius} strokeColor={p.color + '99'} fillColor={p.color + '22'} strokeWidth={2} />
              <Marker coordinate={c} tracksViewChanges={false}>
                <View style={styles.placeDot}><Text style={{ fontSize: 14 }}>{p.emoji}</Text></View>
              </Marker>
            </React.Fragment>
          );
        })}
        {MEMBERS.map((m) => coord(m) && (
          <Marker key={m.id} coordinate={coord(m)} tracksViewChanges={false} onPress={() => onSelect(m)} anchor={{ x: 0.5, y: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={[styles.markerAv, { borderColor: m.color }]}><Text style={{ fontSize: 20 }}>{m.emoji}</Text></View>
              <View style={[styles.markerTip, { backgroundColor: m.color }]} />
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={styles.chipsBar} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14 }}>
          {MEMBERS.map((m) => (
            <TouchableOpacity key={m.id} style={styles.chip} onPress={() => focus(coord(m))}>
              <Text style={{ fontSize: 16 }}>{m.emoji}</Text>
              <Text style={styles.chipTxt}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={styles.fabCol}>
        <TouchableOpacity style={styles.fab} onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}>
          <Text style={{ fontSize: 18 }}>{mapType === 'standard' ? '🛰️' : '🗺️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, { marginTop: 12 }]} onPress={() => focus(me)}>
          <Text style={{ fontSize: 20 }}>🎯</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, { marginTop: 12, backgroundColor: '#E74C3C' }]}
          onPress={() => Alert.alert('SOS gesendet', 'Deine Familie wurde benachrichtigt und sieht deinen Standort. (Demo)')}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ============================== Familie-Tab ============================== */
function MembersTab({ onSelect }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.h1}>Familie</Text>
      <Text style={styles.pSub}>{MEMBERS.length + 1} Mitglieder im Kreis</Text>
      {MEMBERS.map((m) => (
        <TouchableOpacity key={m.id} style={styles.card} onPress={() => onSelect(m)} activeOpacity={0.7}>
          <View style={[styles.cardAv, { backgroundColor: m.color }]}><Text style={{ fontSize: 24 }}>{m.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{m.name}</Text>
            <Text style={styles.cardSub}>{m.status} · vor {m.seen} Min.</Text>
            {m.speed > 0 && <Text style={[styles.cardSub, { color: '#0984E3' }]}>🚗 {m.speed} km/h</Text>}
          </View>
          <Battery v={m.battery} />
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.ghostBtn} onPress={() => Alert.alert('Mitglied einladen', 'Teile deinen Einladungs-Code: ' + INVITE)}>
        <Text style={styles.ghostBtnTxt}>＋ Mitglied einladen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* =============================== Orte-Tab =============================== */
function PlacesTab() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.h1}>Orte</Text>
      <Text style={styles.pSub}>Du wirst benachrichtigt, wenn jemand ankommt oder geht.</Text>
      {PLACES.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={[styles.cardAv, { backgroundColor: p.color }]}><Text style={{ fontSize: 22 }}>{p.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{p.name}</Text>
            <Text style={styles.cardSub}>{p.who.length ? 'Hier: ' + p.who.join(', ') : 'Niemand da'}</Text>
          </View>
          <Text style={{ color: '#bbb', fontSize: 20 }}>›</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.ghostBtn} onPress={() => Alert.alert('Ort hinzufügen', 'Tippe auf der Karte einen Ort an, um eine Zone zu erstellen. (Demo)')}>
        <Text style={styles.ghostBtnTxt}>＋ Ort hinzufügen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ============================== Profil-Tab ============================== */
function ProfileTab({ user, perm, onLogout }) {
  const [share, setShare] = useState(true);
  const [drive, setDrive] = useState(true);
  const [notif, setNotif] = useState(true);
  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.h1}>Profil</Text>
      <View style={[styles.card, { paddingVertical: 18 }]}>
        <View style={[styles.cardAv, { backgroundColor: BRAND }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{(user?.name || 'D')[0].toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{user?.name || 'Du'}</Text>
          <Text style={styles.cardSub}>{user?.email || ''}</Text>
          <Text style={[styles.cardSub, { color: perm === 'granted' ? '#00B894' : '#E74C3C' }]}>
            {perm === 'granted' ? '📍 Standort aktiv' : '⚠️ Standort aus'}
          </Text>
        </View>
      </View>

      <View style={styles.inviteBox}>
        <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 4 }}>Dein Einladungs-Code</Text>
        <Text style={styles.inviteCode}>{INVITE}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Teilen', 'Code ' + INVITE + ' geteilt. (Demo)')}>
          <Text style={{ color: '#fff', textDecorationLine: 'underline', marginTop: 6 }}>Code teilen</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Einstellungen</Text>
      <Toggle label="Meinen Standort teilen" v={share} set={setShare} />
      <Toggle label="Fahrberichte" v={drive} set={setDrive} />
      <Toggle label="Benachrichtigungen" v={notif} set={setNotif} />

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutTxt}>Abmelden</Text>
      </TouchableOpacity>
      <Text style={{ textAlign: 'center', color: '#bbb', marginTop: 14, fontSize: 12 }}>Circle Demo · v1.0</Text>
    </ScrollView>
  );
}

function Toggle({ label, v, set }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={v} onValueChange={set} trackColor={{ true: BRAND }} thumbColor="#fff" />
    </View>
  );
}

function Battery({ v }) {
  const color = v > 50 ? '#00B894' : v > 20 ? '#F39C12' : '#E74C3C';
  return (
    <View style={{ alignItems: 'flex-end', width: 54 }}>
      <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{v}%</Text>
      <View style={styles.batt}><View style={{ width: v + '%', height: '100%', backgroundColor: color, borderRadius: 3 }} /></View>
    </View>
  );
}

/* =========================== Mitglied-Detail =========================== */
function MemberModal({ member, onClose }) {
  if (!member) return null;
  return (
    <Modal transparent animationType="slide" visible={!!member} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard}>
          <View style={styles.handle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={[styles.cardAv, { backgroundColor: member.color, width: 56, height: 56, borderRadius: 28 }]}>
              <Text style={{ fontSize: 28 }}>{member.emoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#222' }}>{member.name}</Text>
              <Text style={{ color: '#888' }}>{member.status} · vor {member.seen} Min.</Text>
            </View>
            <Battery v={member.battery} />
          </View>
          <View style={styles.statsRow}>
            <Stat label="Akku" value={member.battery + '%'} />
            <Stat label="Tempo" value={member.speed + ' km/h'} />
            <Stat label="Status" value={member.speed > 0 ? 'Bewegt' : 'Steht'} />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: BRAND, marginRight: 10 }]} onPress={() => Alert.alert('Route', 'Navigation zu ' + member.name + ' gestartet. (Demo)')}>
              <Text style={styles.modalBtnTxt}>🧭 Route</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#00B894' }]} onPress={() => Alert.alert('Check-in', member.name + ' wurde um einen Check-in gebeten. (Demo)')}>
              <Text style={styles.modalBtnTxt}>✅ Check-in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontWeight: '800', color: '#222', fontSize: 16 }}>{value}</Text>
      <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/* ================================ Shell ================================ */
function Home({ user, onLogout }) {
  const [tab, setTab] = useState('map');
  const [me, setMe] = useState(null);
  const [perm, setPerm] = useState(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [positions, setPositions] = useState(() => initPositions(DEFAULT_CENTER));
  const [trail, setTrail] = useState([]);
  const [sel, setSel] = useState(null);
  const posRef = useRef(positions);
  const rebased = useRef(false);
  posRef.current = positions;

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
          if (!rebased.current) {
            rebased.current = true;
            setCenter(p);
            setPositions(initPositions(p));
            setTrail([]);
          }
          sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 8 },
            (l) => setMe({ latitude: l.coords.latitude, longitude: l.coords.longitude }));
        }
      } catch (e) {}
    })();
    return () => { if (sub) sub.remove(); };
  }, []);

  // flüssige Bewegung der Familie + Routen-Spur von Papa
  useEffect(() => {
    const id = setInterval(() => {
      const prev = posRef.current;
      const next = {};
      let drive = null;
      MEMBERS.forEach((m) => {
        const cur = prev[m.id];
        if (!cur) return;
        const step = m.speed > 20 ? 0.00016 : m.speed > 0 ? 0.00004 : 0.000012;
        const heading = cur.heading + (Math.random() - 0.5) * 0.6;
        const np = { latitude: cur.latitude + Math.cos(heading) * step, longitude: cur.longitude + Math.sin(heading) * step, heading };
        next[m.id] = np;
        if (m.id === 'm2') drive = np;
      });
      setPositions(next);
      if (drive) setTrail((t) => [...t, { latitude: drive.latitude, longitude: drive.longitude }].slice(-30));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const TABS = [
    { id: 'map', label: 'Karte', icon: '🗺️' },
    { id: 'members', label: 'Familie', icon: '👨‍👩‍👧' },
    { id: 'places', label: 'Orte', icon: '📍' },
    { id: 'profile', label: 'Profil', icon: '👤' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f5fa' }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        {tab === 'map' && <MapTab me={me} perm={perm} positions={positions} trail={trail} center={center} onSelect={setSel} />}
        {tab === 'members' && <SafeAreaView style={{ flex: 1 }}><MembersTab onSelect={setSel} /></SafeAreaView>}
        {tab === 'places' && <SafeAreaView style={{ flex: 1 }}><PlacesTab /></SafeAreaView>}
        {tab === 'profile' && <SafeAreaView style={{ flex: 1 }}><ProfileTab user={user} perm={perm} onLogout={onLogout} /></SafeAreaView>}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.id} style={styles.tabItem} onPress={() => setTab(t.id)}>
            <Text style={{ fontSize: 22, opacity: tab === t.id ? 1 : 0.4 }}>{t.icon}</Text>
            <Text style={[styles.tabLabel, { color: tab === t.id ? BRAND : '#9aa' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <MemberModal member={sel} onClose={() => setSel(null)} />
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  return user ? <Home user={user} onLogout={() => setUser(null)} /> : <AuthScreen onAuth={setUser} />;
}

/* ================================ Styles ================================ */
const styles = StyleSheet.create({
  authWrap: { flex: 1, backgroundColor: BRAND },
  authHeader: { alignItems: 'center', paddingTop: 50, paddingBottom: 28 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  authTitle: { color: '#fff', fontSize: 34, fontWeight: '800' },
  authSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 6, textAlign: 'center', paddingHorizontal: 34 },
  authCard: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 22 },
  tabs: { flexDirection: 'row', backgroundColor: '#f1f1f6', borderRadius: 14, padding: 4, marginBottom: 20 },
  segm: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  segmA: { backgroundColor: '#fff' },
  segmTxt: { color: '#888', fontWeight: '700' },
  segmTxtA: { color: BRAND },
  input: { backgroundColor: '#f6f6fa', borderRadius: 13, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 13, color: '#222', borderWidth: 1, borderColor: '#ececf2' },
  primaryBtn: { backgroundColor: BRAND, borderRadius: 13, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint: { textAlign: 'center', color: '#aaa', marginTop: 14, fontSize: 13 },

  markerAv: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  markerTip: { width: 9, height: 9, borderRadius: 5, marginTop: -2 },
  placeDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  chipsBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: Platform.OS === 'android' ? 36 : 4 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  chipTxt: { fontWeight: '700', color: '#333', fontSize: 13, marginLeft: 6 },

  fabCol: { position: 'absolute', right: 16, bottom: 24 },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },

  page: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },
  h1: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginTop: 6 },
  pSub: { color: '#888', marginBottom: 16, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  cardAv: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardName: { fontWeight: '800', color: '#222', fontSize: 16 },
  cardSub: { color: '#999', fontSize: 13, marginTop: 2 },
  ghostBtn: { borderWidth: 2, borderColor: BRAND, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  ghostBtnTxt: { color: BRAND, fontWeight: '800' },

  inviteBox: { backgroundColor: BRAND, borderRadius: 18, padding: 18, marginBottom: 18 },
  inviteCode: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 2 },
  section: { fontWeight: '800', color: '#444', marginBottom: 8, marginTop: 6, fontSize: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  toggleLabel: { color: '#333', fontWeight: '600', fontSize: 15 },
  logoutBtn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 14, borderWidth: 1, borderColor: '#ffd5d5' },
  logoutTxt: { color: '#E74C3C', fontWeight: '800' },

  batt: { width: 46, height: 6, borderRadius: 3, backgroundColor: '#eee', marginTop: 4, overflow: 'hidden' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16 },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, backgroundColor: '#f6f6fa', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginHorizontal: 4 },
  modalBtn: { flex: 1, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  modalBtnTxt: { color: '#fff', fontWeight: '800' },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 1, borderTopColor: '#eee' },
  tabItem: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 11, fontWeight: '700', marginTop: 3 },
});
