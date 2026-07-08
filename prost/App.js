// PROST – Trinkspiel · v3 (Expo SDK 54) – blaues Karten-Design
// Onboarding (animiert), Spiele-Liste, weiße Spielkarte, Premium-Screen.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput,
  StatusBar, Platform, Animated, Dimensions, Image, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: W } = Dimensions.get('window');
const BG = ['#4C9BF2', '#2A46B4'];
const BLUE = '#2E7DF1';
const tap = (s = 'Light') => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle[s]); } catch (e) {} };
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------------------------------- Inhalte ---------------------------------- */
const PRE = [
  'Zeig das letzte Foto in deiner Galerie.', 'Mach 5 Kniebeugen.',
  'Erzähl deinen peinlichsten Moment.', 'Gib der Person rechts ein Kompliment.',
  'Wer zuletzt gelacht hat, trinkt.', 'Alle mit Handy in der Hand trinken.',
  'Mach dein bestes Tier-Geräusch.', 'Alle, die heute schon geflucht haben, trinken.',
];
const NEVER = [
  'einen Wecker verschlafen und was Wichtiges verpasst.', 'mich in der Öffentlichkeit lang gemacht.',
  'heimlich Essen von jemandem geklaut.', 'eine Nachricht an die falsche Person geschickt.',
  'so getan, als hätte ich einen Anruf, um zu entkommen.', 'jemanden auf Social Media gestalkt.',
  'in einem Call-Center gearbeitet.', 'mein Passwort vergessen und es nie wiederbekommen.',
];
const NSFW = [
  'Auf wen in der Runde standest du mal heimlich?', 'Was war dein peinlichstes Date?',
  'Zeig deine letzten 3 Suchanfragen.', 'Lies deine letzte DM laut vor.',
  'Wen hier würdest du daten, wenn du müsstest?', 'Was ist dein größtes Beziehungs-Geheimnis?',
  'Erzähl von deinem peinlichsten Ex.', 'Lass jemanden 1 Minute durch dein Handy scrollen.',
];
const TRUTHS = [
  'Was war dein peinlichster Moment in der Schule?', 'Was ist deine seltsamste Angewohnheit?',
  'Wen hier findest du am lustigsten – und wen am nervigsten?', 'Was war die größte Lüge gegenüber deinen Eltern?',
  'Was ist dein größter Ick bei anderen?', 'Was war dein peinlichster Chat-Verlauf?',
];
const DARES = [
  'Mach 10 Liegestütze.', 'Sprich bis zur nächsten Runde nur im Flüsterton.',
  'Imitiere die Person links von dir für 30 Sekunden.', 'Sag jedem ein ehrliches Kompliment.',
  'Tanze 20 Sekunden ohne Musik.', 'Rede eine Runde lang nur in Reimen.',
  'Lass die Person neben dir deine letzte Nachricht vorlesen.', 'Mach dein bestes Model-Posing.',
];
const LIKELY = [
  'zu spät zur eigenen Hochzeit kommen?', 'berühmt werden?', 'den ganzen Kühlschrank leer essen?',
  'aus Versehen dem Ex schreiben?', 'als Erste:r betrunken sein?', 'das Handy in der Toilette fallen lassen?',
  'auf einer Party mit einer fremden Person knutschen?', 'zwei Personen gleichzeitig daten?',
];
const EITHER = [
  ['Nie wieder Pizza', 'nie wieder Pommes'], ['Fliegen können', 'unsichtbar sein'],
  ['Immer 10 Min zu früh', 'immer 10 Min zu spät'], ['Handy 1 Woche weg', '1 Monat kein Süßes'],
  ['Gedanken lesen können', 'in die Zukunft sehen'], ['Peinliches Video geht viral', 'alle lesen deine DMs'],
  ['Mit dem Ex nochmal ausgehen', 'für immer Single'], ['Deinen Crush blamieren', 'dich selbst blamieren'],
];
const SONGS = [
  ['Bohemian Rhapsody', 'Queen', 1975], ['Billie Jean', 'Michael Jackson', 1983], ['99 Luftballons', 'Nena', 1983],
  ['Smells Like Teen Spirit', 'Nirvana', 1991], ["Gangsta's Paradise", 'Coolio', 1995], ['…Baby One More Time', 'Britney Spears', 1998],
  ['Lose Yourself', 'Eminem', 2002], ['Umbrella', 'Rihanna', 2007], ['Haus am See', 'Peter Fox', 2008],
  ['Rolling in the Deep', 'Adele', 2010], ['Gangnam Style', 'PSY', 2012], ['Get Lucky', 'Daft Punk', 2013],
  ['Uptown Funk', 'Mark Ronson', 2014], ['Shape of You', 'Ed Sheeran', 2017], ['Roller', 'Apache 207', 2019],
  ['Blinding Lights', 'The Weeknd', 2019], ['As It Was', 'Harry Styles', 2022], ['Flowers', 'Miley Cyrus', 2023],
];

const IMG = {
  cup: require('./assets/icons/cup.png'),
  wink: require('./assets/icons/wink.png'),
  flame: require('./assets/icons/flame.png'),
  storm: require('./assets/icons/storm.png'),
  heart: require('./assets/icons/heart.png'),
  note: require('./assets/icons/note.png'),
  plus18: require('./assets/icons/plus18.png'),
  bomb: require('./assets/icons/bomb.png'),
  tornado: require('./assets/icons/tornado.png'),
};

const AVA = [
  { id: 1, g: 'w', img: require('./assets/avatars/avatar1.png') },
  { id: 2, g: 'm', img: require('./assets/avatars/avatar2.png') },
  { id: 3, g: 'w', img: require('./assets/avatars/avatar3.png') },
  { id: 4, g: 'm', img: require('./assets/avatars/avatar4.png') },
  { id: 5, g: 'w', img: require('./assets/avatars/avatar5.png') },
  { id: 6, g: 'm', img: require('./assets/avatars/avatar6.png') },
  { id: 7, g: 'w', img: require('./assets/avatars/avatar7.png') },
  { id: 8, g: 'w', img: require('./assets/avatars/avatar8.png') },
];
const avaImg = (id) => (AVA.find((a) => a.id === id) || AVA[0]).img;

const CATS = [
  { id: 'pre',    name: 'Pre-Party',            img: IMG.cup,     type: 'cards',  data: PRE },
  { id: 'never',  name: 'Ich hab noch nie',      img: IMG.wink,    type: 'never',  data: NEVER },
  { id: 'tod',    name: 'Wahrheit / Pflicht',    img: IMG.flame,   type: 'tod' },
  { id: 'either', name: 'Entweder / Oder',       img: IMG.storm,   type: 'either', data: EITHER },
  { id: 'likely', name: 'Most Likely',           img: IMG.heart,   type: 'likely', data: LIKELY },
  { id: 'song',   name: 'Song-Quiz',             img: IMG.note,    type: 'song',   data: SONGS },
  { id: 'nsfw',   name: 'NSFW',                  img: IMG.plus18,  type: 'cards',  data: NSFW, premium: true, age: true },
  { id: 'bomb',   name: 'Die Bombe',             img: IMG.bomb,    type: 'bomb' },
  { id: 'mixed',  name: 'Gemischt',              img: IMG.tornado, type: 'mixed',  big: true, sub: 'Mische alle Kategorien und starte ein großes Spiel.' },
];
const CAT_BOMB_WORDS = ['Automarken', 'Länder', 'Tiere', 'Süßigkeiten', 'Serien', 'Cocktails', 'Filme', 'Rapper'];

/* Karte für eine Kategorie ziehen -> {kicker, kColor, text, song} */
function draw(cat) {
  const t = cat.type;
  if (t === 'never') return { kicker: 'Ich hab noch nie', text: rnd(NEVER) };
  if (t === 'likely') return { kicker: 'Wer würde am ehesten', text: rnd(LIKELY) };
  if (t === 'either') { const [a, b] = rnd(EITHER); return { kicker: 'Entweder … oder', text: a + '\n\noder\n\n' + b + '?' }; }
  if (t === 'song') { const [ti, ar, y] = rnd(SONGS); return { kicker: 'Song-Quiz', text: ti + '\n' + ar, song: y }; }
  if (t === 'tod') { const truth = Math.random() < 0.5; return truth ? { kicker: 'Wahrheit', kColor: BLUE, text: rnd(TRUTHS) } : { kicker: 'Pflicht', kColor: '#F0603A', text: rnd(DARES) }; }
  if (t === 'mixed') { const pick = rnd(CATS.filter((c) => c.type !== 'mixed' && c.type !== 'bomb')); return draw(pick); }
  return { kicker: cat.name, text: rnd(cat.data || PRE) };
}

/* ---------------------- Hintergrund mit Sonnen-Glows ---------------------- */
function Bg({ children }) {
  return (
    <LinearGradient colors={BG} style={{ flex: 1 }}>
      <View pointerEvents="none" style={gl.wrap}>
        <View style={[gl.c, { width: 460, height: 460, top: -140, right: -130, backgroundColor: '#DCEEFF' }]} />
        <View style={[gl.c, { width: 300, height: 300, top: -40, right: -30, backgroundColor: '#EAF5FF' }]} />
        <View style={[gl.c, { width: 520, height: 520, top: 300, left: -180, backgroundColor: '#A7C4FF' }]} />
        <View style={[gl.c, { width: 320, height: 320, top: 430, left: -70, backgroundColor: '#BBD3FF' }]} />
      </View>
      {children}
    </LinearGradient>
  );
}
const gl = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  c: { position: 'absolute', borderRadius: 400, opacity: 0.12 },
});

/* -------------------------------- Settings -------------------------------- */
function Settings({ profile, onClose, onPremium, onEditProfile }) {
  const row = (icon, color, label, extra) => (
    <TouchableOpacity style={se.row} activeOpacity={0.7} onPress={() => { tap(); extra === 'prem' ? onPremium() : null; }}>
      <View style={[se.ic, { backgroundColor: color }]}><Ionicons name={icon} size={17} color="#fff" /></View>
      <Text style={se.rowTxt}>{label}</Text>
      {extra === '!' ? <View style={se.warn}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>!</Text></View>
        : <Ionicons name="chevron-forward" size={18} color="#5A5A66" />}
    </TouchableOpacity>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#0E0E12' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={se.head}>
          <Text style={se.title}>Einstellungen</Text>
          <TouchableOpacity style={se.close} onPress={() => { tap(); onClose(); }}><Ionicons name="close" size={22} color="#fff" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => { tap('Medium'); onPremium(); }}>
            <LinearGradient colors={['#FF5A7A', '#E23B5A']} style={se.promo}>
              <Text style={se.promoTop}>PROST Premium</Text>
              <Text style={se.promoBig}>Komm ins Team ❤️ 🪩</Text>
              <View style={se.promoBtn}><Text style={se.promoBtnTxt}>Alle Vorteile freischalten</Text></View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={se.profile} activeOpacity={0.8} onPress={() => { tap(); onEditProfile(); }}>
            <Image source={avaImg(profile?.avatarId || 1)} style={se.profileAv} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={se.profileName}>{profile?.name || 'Dein Profil'}</Text>
              <Text style={se.profileSub}>Dein PROST-Profil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5A5A66" />
          </TouchableOpacity>

          <View style={se.group}>
            {row('globe', '#3B82F6', 'Sprache')}
            {row('notifications', '#3B82F6', 'Benachrichtigungen', '!')}
            {row('mail', '#3B82F6', 'Feedback')}
            {row('shield-checkmark', '#3B82F6', 'Datenschutz')}
            {row('document-text', '#3B82F6', 'Bedingungen')}
            {row('information-circle', '#3B82F6', 'Über')}
          </View>
          <View style={se.group}>
            {row('heart', '#34C759', 'App bewerten')}
            {row('share', '#FF9500', 'Freunde einladen')}
            {row('sparkles', '#FFCC00', 'Ideen & Wünsche')}
          </View>
          <Text style={se.version}>PROST · Demo v3</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
const se = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#26262E', alignItems: 'center', justifyContent: 'center' },
  promo: { borderRadius: 22, padding: 18, marginBottom: 18 },
  promoTop: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 14 },
  promoBig: { color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 2, marginBottom: 14, letterSpacing: -0.5 },
  promoBtn: { backgroundColor: '#FFD34E', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  promoBtnTxt: { color: '#1A1A00', fontWeight: '900', fontSize: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A22', borderRadius: 18, padding: 12, marginBottom: 18 },
  profileAv: { width: 52, height: 52, borderRadius: 26 },
  profileName: { color: '#fff', fontWeight: '800', fontSize: 17 },
  profileSub: { color: '#8A8A94', fontSize: 13, marginTop: 1 },
  group: { backgroundColor: '#1A1A22', borderRadius: 18, paddingHorizontal: 14, marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2C2C36' },
  ic: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowTxt: { color: '#fff', fontSize: 16.5, flex: 1, fontWeight: '500' },
  warn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF9500', alignItems: 'center', justifyContent: 'center' },
  version: { color: '#55555F', textAlign: 'center', marginTop: 6, marginBottom: 20, fontSize: 12 },
});

/* ------------------------------- Onboarding ------------------------------- */
const SLIDES = [
  { img: 'cup', title: 'Willkommen bei PROST', text: 'Das ultimative Trinkspiel für jede Runde.' },
  { img: 'flame', title: 'Hunderte Karten', text: 'Von harmlos bis wild – für jede Stimmung.' },
  { img: 'note', title: 'Viele Spielmodi', text: 'Wahrheit oder Pflicht, Ich hab noch nie, Song-Quiz & mehr.' },
  { img: 'tornado', title: 'Bereit?', text: 'Schnapp dir deine Crew und leg los!' },
];
function Onboarding({ onDone }) {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const go = () => { tap(); if (i < SLIDES.length - 1) { ref.current?.scrollTo({ x: (i + 1) * W, animated: true }); setI(i + 1); } else onDone(); };
  return (
    <Bg>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / W))}>
          {SLIDES.map((sl, k) => (
            <View key={k} style={{ width: W, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 }}>
              <View style={o.emojiWrap}><Image source={IMG[sl.img]} style={{ width: 116, height: 116 }} resizeMode="contain" /></View>
              <Text style={o.title}>{sl.title}</Text>
              <Text style={o.text}>{sl.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={o.foot}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SLIDES.map((_, k) => <View key={k} style={[o.dot, k === i && o.dotOn]} />)}
          </View>
          <TouchableOpacity style={o.next} onPress={go} activeOpacity={0.85}>
            <Ionicons name={i < SLIDES.length - 1 ? 'chevron-forward' : 'checkmark'} size={26} color={BLUE} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Bg>
  );
}

/* ----------------------------- Profil erstellen ----------------------------- */
function ProfileSetup({ initial, onDone }) {
  const [name, setName] = useState(initial?.name || '');
  const [age, setAge] = useState(initial?.age || '');
  const [gender, setGender] = useState(initial?.gender || '');
  const [sel, setSel] = useState(initial?.avatarId || 1);
  const list = gender ? [...AVA].sort((a, b) => (b.g === gender) - (a.g === gender)) : AVA;
  const done = () => { if (!name.trim()) return; tap('Medium'); onDone({ name: name.trim(), age: age.trim(), gender, avatarId: sel }); };
  return (
    <Bg>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            <Text style={pf.title}>Dein Profil</Text>
            <View style={pf.previewWrap}><Image source={avaImg(sel)} style={pf.preview} /></View>

            <Text style={pf.label}>Name</Text>
            <TextInput style={pf.input} placeholder="Wie heißt du?" placeholderTextColor="rgba(255,255,255,0.5)" value={name} onChangeText={setName} />

            <Text style={pf.label}>Alter</Text>
            <TextInput style={pf.input} placeholder="Dein Alter" placeholderTextColor="rgba(255,255,255,0.5)" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={2} />

            <Text style={pf.label}>Geschlecht</Text>
            <View style={pf.seg}>
              {[['m', 'Männlich'], ['w', 'Weiblich'], ['d', 'Divers']].map(([k, lb]) => (
                <TouchableOpacity key={k} style={[pf.segItem, gender === k && pf.segItemOn]} onPress={() => { tap(); setGender(k); }}>
                  <Text style={[pf.segTxt, gender === k && { color: BLUE }]}>{lb}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={pf.label}>Profilbild</Text>
            <View style={pf.avaGrid}>
              {list.map((av) => (
                <TouchableOpacity key={av.id} onPress={() => { tap(); setSel(av.id); }} style={[pf.avaWrap, sel === av.id && pf.avaOn]}>
                  <Image source={av.img} style={pf.ava} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[pf.cta, !name.trim() && { opacity: 0.45 }]} activeOpacity={0.9} onPress={done}>
              <Text style={pf.ctaTxt}>Los geht’s</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Bg>
  );
}

/* -------------------------------- Paywall -------------------------------- */
function Paywall({ onClose }) {
  const feats = [
    ['sparkles', 'Alle Kategorien freischalten'], ['flame', 'NSFW & 18+ Karten'],
    ['refresh', 'Neue Karten jeden Monat'], ['create', 'Eigene Karten erstellen'],
    ['ban', 'Keine Werbung mehr'], ['close-circle', 'Jederzeit kündbar'],
  ];
  return (
    <Bg>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity style={p.close} onPress={() => { tap(); onClose(); }}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 6 }}>
          <View style={p.badge}><Text style={p.badgeTop}>Besonderes Angebot</Text><Text style={p.badgeBig}>80% Rabatt</Text><Text style={p.badgeTop}>Erste Woche</Text></View>
          <Text style={p.title}>PROST Premium</Text>
          <View style={p.card}>
            {feats.map(([ic, t], k) => (
              <View key={k} style={p.featRow}>
                <View style={p.featIc}><Ionicons name={ic} size={18} color="#fff" /></View>
                <Text style={p.featTxt}>{t}</Text>
              </View>
            ))}
          </View>
          <Text style={p.price}>Erste Woche für <Text style={{ color: '#FFD34E' }}>1,99 €</Text> <Text style={p.strike}>9,99 €</Text></Text>
          <Text style={p.priceSub}>Danach 9,99 € / Woche · jederzeit kündbar</Text>
          <TouchableOpacity style={p.cta} activeOpacity={0.9} onPress={() => { tap('Medium'); onClose(); }}><Text style={p.ctaTxt}>Jetzt starten</Text></TouchableOpacity>
          <Text style={p.restore}>Einkäufe wiederherstellen</Text>
          <Text style={p.legal}>Nutzungsbedingungen · Datenschutz</Text>
        </ScrollView>
      </SafeAreaView>
    </Bg>
  );
}

/* ------------------------------- Spiele-Liste ------------------------------- */
function Home({ onPick, onPremium, profile, onEditProfile, onSettings }) {
  return (
    <Bg>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={h.top}>
          <TouchableOpacity onPress={() => { tap(); onEditProfile(); }}>
            <Image source={avaImg(profile?.avatarId || 1)} style={h.me} />
          </TouchableOpacity>
          <Text style={h.logo}>PROST</Text>
          <TouchableOpacity style={h.topBtn} onPress={() => { tap(); onSettings(); }}><Ionicons name="settings-sharp" size={20} color="#fff" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {CATS.map((c) => (
            <TouchableOpacity key={c.id} activeOpacity={0.85} style={[h.row, c.big && h.rowBig]} onPress={() => { tap('Medium'); onPick(c); }}>
              <View style={{ flex: 1 }}>
                <Text style={h.rowName}>{c.name}</Text>
                {c.big && <Text style={h.rowSub}>{c.sub}</Text>}
              </View>
              <View style={h.badges}>
                {c.premium && <View style={h.star}><Ionicons name="star" size={13} color="#7A5B00" /></View>}
                {c.age && <View style={h.age}><Text style={h.ageTxt}>17+</Text></View>}
              </View>
              <Image source={c.img} style={h.icon} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Bg>
  );
}

/* --------------------------------- Spiel --------------------------------- */
function Game({ cat, setCat, onHome, onPremium }) {
  return (
    <Bg>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={h.top}>
          <TouchableOpacity style={h.topBtn} onPress={() => { tap(); onHome(); }}><Ionicons name="home" size={20} color="#fff" /></TouchableOpacity>
          <Text style={h.logo}>{cat.name}</Text>
          <View style={{ width: 42, height: 42 }} />
        </View>

        <View style={{ flex: 1 }}>
          {cat.type === 'bomb' ? <Bomb /> : <CardGame cat={cat} />}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={g.switch}>
          {CATS.filter((c) => c.type !== 'mixed').map((c) => {
            const on = c.id === cat.id;
            return (
              <TouchableOpacity key={c.id} style={g.switchItem} activeOpacity={0.8}
                onPress={() => { tap(); c.premium ? onPremium() : setCat(c); }}>
                <View style={[g.switchEmoji, on && g.switchEmojiOn]}>
                  <Image source={c.img} style={{ width: 34, height: 34, opacity: on ? 1 : 0.9 }} resizeMode="contain" />
                  {c.premium && <View style={g.lock}><Ionicons name="lock-closed" size={10} color="#fff" /></View>}
                </View>
                <Text style={[g.switchTxt, { opacity: on ? 1 : 0.6 }]} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Bg>
  );
}

function CardGame({ cat }) {
  const [c, setC] = useState(() => draw(cat));
  const [reveal, setReveal] = useState(false);
  const [votes] = useState(() => ({ up: 10 + Math.floor(Math.random() * 90), down: 10 + Math.floor(Math.random() * 200) }));
  useEffect(() => { setC(draw(cat)); setReveal(false); }, [cat.id]);
  const next = () => { tap(); setReveal(false); setC(draw(cat)); };
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={g.deck2} /><View style={g.deck1} />
        <View style={g.card}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {!!c.kicker && <Text style={[g.kicker, c.kColor && { color: c.kColor }]}>{c.kicker}</Text>}
            <Text style={g.cardText}>{c.text}</Text>
            {c.song != null && (reveal
              ? <Text style={g.year}>{c.song}</Text>
              : <TouchableOpacity onPress={() => { tap(); setReveal(true); }} style={g.revealBtn}><Text style={g.revealTxt}>Jahr zeigen</Text></TouchableOpacity>)}
          </View>
          <View style={g.voteRow}>
            <View style={g.vote}><Ionicons name="thumbs-up" size={16} color="#9AA3B2" /><Text style={g.voteTxt}>{votes.up}</Text></View>
            <View style={g.vote}><Ionicons name="thumbs-down" size={16} color="#9AA3B2" /><Text style={g.voteTxt}>{votes.down}</Text></View>
          </View>
        </View>
      </View>
      <TouchableOpacity style={g.weiter} activeOpacity={0.85} onPress={next}>
        <Text style={g.weiterTxt}>Weiter</Text><Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function Bomb() {
  const [state, setState] = useState('idle');
  const [cat, setCat] = useState('');
  const timer = useRef(null);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (state !== 'run') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.1, duration: 380, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [state]);
  const start = () => { tap('Medium'); setCat(rnd(CAT_BOMB_WORDS)); setState('run'); timer.current = setTimeout(() => { tap('Heavy'); setState('boom'); }, 5000 + Math.random() * 15000); };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {state === 'idle' && <>
        <Image source={IMG.bomb} style={{ width: 110, height: 110 }} resizeMode="contain" />
        <Text style={g.bombInfo}>Handy reihum weitergeben und Begriffe nennen. Wer die Bombe hält, wenn sie hochgeht, trinkt.</Text>
        <TouchableOpacity style={g.weiter} onPress={start}><Text style={g.weiterTxt}>Bombe zünden</Text></TouchableOpacity>
      </>}
      {state === 'run' && <>
        <Animated.Image source={IMG.bomb} style={{ width: 125, height: 125, transform: [{ scale }] }} resizeMode="contain" />
        <Text style={g.bombCat}>{cat}</Text>
        <Text style={g.bombInfo}>Abwechselnd nennen und schnell weitergeben!</Text>
      </>}
      {state === 'boom' && <>
        <Text style={{ fontSize: 96 }}>💥</Text>
        <Text style={g.boom}>Bumm!</Text>
        <Text style={g.bombInfo}>Wer das Handy hält, trinkt 3 Schlücke.</Text>
        <TouchableOpacity style={g.weiter} onPress={() => setState('idle')}><Text style={g.weiterTxt}>Nochmal</Text></TouchableOpacity>
      </>}
    </View>
  );
}

/* ---------------------------------- App ---------------------------------- */
export default function App() {
  const [screen, setScreen] = useState('onboarding');
  const [cat, setCat] = useState(CATS[0]);
  const [profile, setProfile] = useState(null);
  return (
    <View style={{ flex: 1, backgroundColor: '#2A46B4' }}>
      {screen === 'onboarding' && <Onboarding onDone={() => setScreen('profile')} />}
      {screen === 'profile' && <ProfileSetup initial={profile} onDone={(p) => { setProfile(p); setScreen('home'); }} />}
      {screen === 'paywall' && <Paywall onClose={() => setScreen('home')} />}
      {screen === 'settings' && <Settings profile={profile} onClose={() => setScreen('home')} onPremium={() => setScreen('paywall')} onEditProfile={() => setScreen('profile')} />}
      {screen === 'home' && <Home profile={profile} onEditProfile={() => setScreen('profile')} onSettings={() => setScreen('settings')} onPremium={() => setScreen('paywall')} onPick={(c) => { if (c.premium) return setScreen('paywall'); setCat(c); setScreen('game'); }} />}
      {screen === 'game' && <Game cat={cat} setCat={setCat} onHome={() => setScreen('home')} onPremium={() => setScreen('paywall')} />}
    </View>
  );
}

/* --------------------------------- Styles --------------------------------- */
const o = StyleSheet.create({
  emojiWrap: { width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  text: { color: 'rgba(255,255,255,0.88)', fontSize: 17, textAlign: 'center', marginTop: 14, lineHeight: 24 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingBottom: 20 },
  dot: { width: 22, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn: { backgroundColor: '#fff', width: 30 },
  next: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});

const p = StyleSheet.create({
  close: { alignSelf: 'flex-end', margin: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'center', backgroundColor: '#FFD34E', borderRadius: 18, paddingHorizontal: 26, paddingVertical: 12, alignItems: 'center', transform: [{ rotate: '-4deg' }], marginBottom: 20 },
  badgeTop: { color: '#5A4600', fontWeight: '800', fontSize: 13 },
  badgeBig: { color: '#3A2E00', fontWeight: '900', fontSize: 30, letterSpacing: -0.5 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'center', marginBottom: 18, letterSpacing: -0.5 },
  card: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  featRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  featIc: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  featTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  price: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 22 },
  strike: { color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through', fontWeight: '700' },
  priceSub: { color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4, fontSize: 13 },
  cta: { backgroundColor: '#fff', borderRadius: 30, paddingVertical: 18, alignItems: 'center', marginTop: 20 },
  ctaTxt: { color: BLUE, fontSize: 18, fontWeight: '900' },
  restore: { color: '#fff', textAlign: 'center', textDecorationLine: 'underline', marginTop: 16, fontWeight: '600' },
  legal: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 14, fontSize: 12 },
});

const h = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 8 },
  topBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  logo: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 26, paddingHorizontal: 22, paddingVertical: 22, marginBottom: 13, minHeight: 84 },
  rowBig: { paddingVertical: 20 },
  rowName: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  rowSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13.5, marginTop: 4, lineHeight: 18 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 6 },
  star: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFD34E', alignItems: 'center', justifyContent: 'center' },
  age: { backgroundColor: '#F0453A', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  ageTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  icon: { width: 56, height: 56, marginLeft: 8 },
  me: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
});

const pf = StyleSheet.create({
  title: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 4, marginBottom: 16, letterSpacing: -0.5 },
  previewWrap: { alignSelf: 'center', width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', marginBottom: 22, backgroundColor: 'rgba(255,255,255,0.15)' },
  preview: { width: '100%', height: '100%' },
  label: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 14, marginBottom: 8, marginTop: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  seg: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 4, marginBottom: 12 },
  segItem: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 12 },
  segItemOn: { backgroundColor: '#fff' },
  segTxt: { color: '#fff', fontWeight: '800' },
  avaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  avaWrap: { width: '23%', aspectRatio: 1, borderRadius: 100, marginBottom: 12, borderWidth: 3, borderColor: 'transparent', overflow: 'hidden' },
  avaOn: { borderColor: '#fff' },
  ava: { width: '100%', height: '100%' },
  cta: { backgroundColor: '#fff', borderRadius: 30, paddingVertical: 17, alignItems: 'center', marginTop: 14 },
  ctaTxt: { color: BLUE, fontSize: 18, fontWeight: '900' },
});

const g = StyleSheet.create({
  deck1: { position: 'absolute', left: 10, right: 10, top: 18, bottom: -8, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 28 },
  deck2: { position: 'absolute', left: 20, right: 20, top: 26, bottom: -14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 28 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 26, flex: 1, maxHeight: 440 },
  kicker: { color: BLUE, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 12, letterSpacing: -0.3 },
  cardText: { color: '#101828', fontSize: 30, fontWeight: '900', textAlign: 'center', lineHeight: 38, letterSpacing: -0.6 },
  year: { color: BLUE, fontSize: 44, fontWeight: '900', marginTop: 18 },
  revealBtn: { marginTop: 20, backgroundColor: '#EEF1F6', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 11 },
  revealTxt: { color: '#4A5568', fontWeight: '800' },
  voteRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  vote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F1F3F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  voteTxt: { color: '#9AA3B2', fontWeight: '800', fontSize: 14 },
  weiter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 30, paddingVertical: 18, marginTop: 16 },
  weiterTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },
  bombInfo: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontSize: 15, marginTop: 16, lineHeight: 22, paddingHorizontal: 10 },
  bombCat: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 16 },
  boom: { color: '#FFD34E', fontSize: 44, fontWeight: '900', marginTop: 6 },
  switch: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6, gap: 16 },
  switchItem: { alignItems: 'center', width: 66 },
  switchEmoji: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  switchEmojiOn: { backgroundColor: 'rgba(255,255,255,0.24)' },
  lock: { position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  switchTxt: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 5 },
});
