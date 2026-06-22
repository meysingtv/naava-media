// Circle – Family Locator (Life360-Style) – ZERO-Dependency Version
// Läuft in Expo Go / Snack OHNE Zusatzpakete (nur react + react-native).
// Karte = echtes Kartenbild (OpenStreetMap-Static), Familie als Pins,
// Login/Registrierung, Mitglieder-Liste.
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, Image, Platform, StatusBar,
} from 'react-native';

const BRAND = '#6C5CE7';
const MAP_URL = 'https://staticmap.openstreetmap.de/staticmap.php?center=51.1805,6.4428&zoom=14&size=512x900&maptype=mapnik';

const MEMBERS = [
  { id: 'm1', name: 'Mama', emoji: '👩', color: '#E84393', battery: 82, status: 'Zuhause',  top: '28%', left: '60%' },
  { id: 'm2', name: 'Papa', emoji: '👨', color: '#0984E3', battery: 47, status: 'Unterwegs', top: '50%', left: '26%' },
  { id: 'm3', name: 'Lena', emoji: '🧒', color: '#00B894', battery: 64, status: 'Schule',    top: '20%', left: '36%' },
  { id: 'm4', name: 'Opa',  emoji: '👴', color: '#E17055', battery: 91, status: 'Im Park',   top: '44%', left: '72%' },
];

/* ----------------------------- Login / Register ----------------------------- */
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
          <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
            <Text style={[styles.tabTxt, mode === 'login' && styles.tabTxtActive]}>Anmelden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => setMode('register')}>
            <Text style={[styles.tabTxt, mode === 'register' && styles.tabTxtActive]}>Registrieren</Text>
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

/* ---------------------------------- Karte ---------------------------------- */
function MapScreen({ user, onLogout }) {
  const [jitter, setJitter] = useState({});
  const [mapOk, setMapOk] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      const j = {};
      MEMBERS.forEach((m) => { j[m.id] = { x: (Math.random() - 0.5) * 16, y: (Math.random() - 0.5) * 16 }; });
      setJitter(j);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const openProfile = () => Alert.alert(user?.name || 'Profil', user?.email || '', [
    { text: 'Abmelden', style: 'destructive', onPress: onLogout },
    { text: 'Schließen', style: 'cancel' },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: '#dfe7ee' }}>
      {/* Kartenbild */}
      {mapOk
        ? <Image source={{ uri: MAP_URL }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setMapOk(false)} />
        : <View style={[StyleSheet.absoluteFill, styles.mapFallback]}><Text style={{ color: '#9bb0c4', fontWeight: '700' }}>🗺️ Karte</Text></View>}

      {/* Du-Pin (Mitte) */}
      <View style={[styles.pin, { top: '40%', left: '48%' }]}>
        <View style={styles.meDot} />
        <View style={styles.pinLabel}><Text style={styles.pinLabelTxt}>{user?.name || 'Du'}</Text></View>
      </View>

      {/* Familien-Pins */}
      {MEMBERS.map((m) => (
        <View key={m.id} style={[styles.pin, { top: m.top, left: m.left,
          transform: [{ translateX: jitter[m.id]?.x || 0 }, { translateY: jitter[m.id]?.y || 0 }] }]}>
          <View style={[styles.pinAvatar, { borderColor: m.color }]}><Text style={{ fontSize: 20 }}>{m.emoji}</Text></View>
          <View style={[styles.pinTip, { backgroundColor: m.color }]} />
          <View style={styles.pinLabel}><Text style={styles.pinLabelTxt}>{m.name}</Text></View>
        </View>
      ))}

      {/* obere Leiste */}
      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <View style={styles.topInner}>
          <View style={styles.circlePill}><Text style={styles.circlePillTxt}>👨‍👩‍👧 Familie</Text></View>
          <TouchableOpacity style={styles.profileBtn} onPress={openProfile}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{(user?.name || 'D')[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* SOS */}
      <View style={styles.fabCol}>
        <TouchableOpacity style={[styles.fab, { backgroundColor: '#E74C3C' }]}
          onPress={() => Alert.alert('SOS gesendet', 'Deine Familie wurde benachrichtigt. (Demo)')}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* untere Liste */}
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Familie · {MEMBERS.length + 1} Mitglieder</Text>
        <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <View style={[styles.rowAvatar, { backgroundColor: BRAND }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{(user?.name || 'Du')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{user?.name || 'Du'} · Du</Text>
              <Text style={styles.rowSub}>📍 Standort aktiv</Text>
            </View>
            <Battery v={100} />
          </View>
          {MEMBERS.map((m) => (
            <View key={m.id} style={styles.row}>
              <View style={[styles.rowAvatar, { backgroundColor: m.color }]}><Text style={{ fontSize: 20 }}>{m.emoji}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{m.name}</Text>
                <Text style={styles.rowSub}>{m.status} · vor {Math.floor(Math.random() * 9) + 1} Min.</Text>
              </View>
              <Battery v={m.battery} />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function Battery({ v }) {
  const color = v > 50 ? '#00B894' : v > 20 ? '#F39C12' : '#E74C3C';
  return (
    <View style={{ alignItems: 'flex-end', width: 52 }}>
      <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{v}%</Text>
      <View style={styles.batt}><View style={{ width: v + '%', height: '100%', backgroundColor: color, borderRadius: 3 }} /></View>
    </View>
  );
}

/* ----------------------------------- App ----------------------------------- */
export default function App() {
  const [user, setUser] = useState(null);
  return user ? <MapScreen user={user} onLogout={() => setUser(null)} /> : <AuthScreen onAuth={setUser} />;
}

/* ---------------------------------- Styles --------------------------------- */
const styles = StyleSheet.create({
  authWrap: { flex: 1, backgroundColor: BRAND },
  authHeader: { alignItems: 'center', paddingTop: 50, paddingBottom: 28 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  authTitle: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: 0.5 },
  authSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 6, textAlign: 'center', paddingHorizontal: 34 },
  authCard: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 22 },
  tabs: { flexDirection: 'row', backgroundColor: '#f1f1f6', borderRadius: 14, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: '#fff', elevation: 2 },
  tabTxt: { color: '#888', fontWeight: '700' },
  tabTxtActive: { color: BRAND },
  input: { backgroundColor: '#f6f6fa', borderRadius: 13, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 13, color: '#222', borderWidth: 1, borderColor: '#ececf2' },
  primaryBtn: { backgroundColor: BRAND, borderRadius: 13, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint: { textAlign: 'center', color: '#aaa', marginTop: 14, fontSize: 13 },

  mapFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#dfe7ee' },

  pin: { position: 'absolute', alignItems: 'center', marginLeft: -22, marginTop: -22 },
  pinAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
  pinTip: { width: 9, height: 9, borderRadius: 5, marginTop: -2 },
  meDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2d6cff', borderWidth: 3, borderColor: '#fff', shadowColor: '#2d6cff', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  pinLabel: { backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  pinLabelTxt: { fontSize: 11, fontWeight: '700', color: '#333' },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 38 : 6 },
  circlePill: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, elevation: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  circlePillTxt: { fontWeight: '800', color: '#333' },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', elevation: 4 },

  fabCol: { position: 'absolute', right: 16, bottom: 320 },
  fab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },

  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 26, elevation: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontWeight: '800', fontSize: 16, color: '#222', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f2f2f5' },
  rowAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  rowName: { fontWeight: '700', color: '#222', fontSize: 15.5 },
  rowSub: { color: '#999', fontSize: 13, marginTop: 2 },
  batt: { width: 46, height: 6, borderRadius: 3, backgroundColor: '#eee', marginTop: 4, overflow: 'hidden' },
});
