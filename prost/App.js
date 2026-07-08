// PROST – das Trinkspiel · MVP (Expo SDK 54)
// Modi: Wahrheit oder Pflicht (voll), Ich hab noch nie, Most Likely, Bombe.
// Spieler-Setup, Intensitäts-Slider, Strafsystem, Statistik, Neon-Design, Haptik.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Platform, Modal, KeyboardAvoidingView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const C = {
  bg: '#0C0A18', bg2: '#151129', card: '#1D1836', line: '#2A2350',
  ink: '#FFFFFF', sub: '#A79FC9',
  purple: '#8B5CF6', pink: '#EC4899', cyan: '#22D3EE', blue: '#3B82F6',
  green: '#34D399', amber: '#FBBF24', red: '#FB7185',
};
const tap = (s = 'Light') => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle[s]); } catch (e) {} };
const EMOJIS = ['😎', '🥳', '🤪', '😈', '👑', '🔥', '🦊', '🐼', '🦄', '🍺', '💀', '🤠', '👽', '🐸', '🌟', '🐙'];

const INTENSITY = [
  { lvl: 0, label: 'Harmlos', emoji: '😇', grad: ['#34D399', '#22D3EE'] },
  { lvl: 1, label: 'Frech', emoji: '😏', grad: ['#22D3EE', '#8B5CF6'] },
  { lvl: 2, label: 'Spicy', emoji: '🌶️', grad: ['#FBBF24', '#EC4899'] },
  { lvl: 3, label: 'Extrem', emoji: '🔞', grad: ['#EC4899', '#EF4444'] },
];

const MODES = [
  { id: 'tod', name: 'Wahrheit\noder Pflicht', icon: 'flame', grad: ['#EC4899', '#8B5CF6'], desc: 'Der Klassiker – voll ausgebaut' },
  { id: 'never', name: 'Ich hab\nnoch nie', icon: 'hand-left', grad: ['#22D3EE', '#3B82F6'], desc: 'Wer schon, trinkt' },
  { id: 'likely', name: 'Most\nLikely To', icon: 'people', grad: ['#FBBF24', '#F97316'], desc: 'Wer würde am ehesten…?' },
  { id: 'bomb', name: 'Die\nBombe', icon: 'alarm', grad: ['#8B5CF6', '#EF4444'], desc: 'Halt sie nicht bei der Explosion!' },
];

/* -------------------------------- Inhalte -------------------------------- */
const TRUTHS = [
  { l: 0, t: 'Was war dein peinlichster Moment in der Schule?' },
  { l: 0, t: 'Was ist deine seltsamste Angewohnheit?' },
  { l: 0, t: 'Welchen Promi findest du heimlich total nervig?' },
  { l: 0, t: 'Was ist das Kindischste, das du immer noch machst?' },
  { l: 1, t: 'Wen in diesem Raum findest du am lustigsten – und wen am nervigsten?' },
  { l: 1, t: 'Was ist die größte Lüge, die du deinen Eltern erzählt hast?' },
  { l: 1, t: 'Was war dein peinlichster Chat-Verlauf?' },
  { l: 1, t: 'Was ist dein größter Ick bei anderen?' },
  { l: 2, t: 'Wen in der Runde würdest du daten, wenn du müsstest?' },
  { l: 2, t: 'Was war dein peinlichstes Date?' },
  { l: 2, t: 'Auf wen aus deinem Freundeskreis standest du mal heimlich?' },
  { l: 3, t: 'Wen in dieser Runde findest du am attraktivsten?' },
  { l: 3, t: 'Was war das Verrückteste, das du je aus Verknalltheit getan hast?' },
  { l: 3, t: 'Erzähl von deinem peinlichsten Ex.' },
];
const DARES = [
  { l: 0, t: '{p}, mach 10 Liegestütze.' },
  { l: 0, t: '{p}, sprich bis zu deiner nächsten Runde nur im Flüsterton.' },
  { l: 0, t: '{p}, mach dein bestes Tier-Geräusch.' },
  { l: 0, t: '{p}, imitiere {o} für 30 Sekunden.' },
  { l: 1, t: '{p}, sag jedem in der Runde ein ehrliches Kompliment.' },
  { l: 1, t: '{p}, tanze 20 Sekunden ohne Musik.' },
  { l: 1, t: '{p}, rede eine Runde lang nur in Reimen.' },
  { l: 1, t: '{p}, lass {o} deine letzte gesendete Nachricht vorlesen.' },
  { l: 2, t: '{p}, mach {o} ein ernst gemeintes Kompliment über dein Aussehen.' },
  { l: 2, t: '{p}, zeig der Gruppe deine letzten 3 Suchanfragen.' },
  { l: 2, t: '{p}, ruf die 3. Person in deiner Anrufliste an und sing „Happy Birthday".' },
  { l: 3, t: '{p}, lass {o} eine Minute lang durch dein geöffnetes Handy scrollen.' },
  { l: 3, t: '{p}, lies deine letzte DM laut vor.' },
  { l: 3, t: '{p}, tausche für 2 Runden ein Kleidungsstück mit {o}.' },
];
const NEVER = [
  { l: 0, t: '…einen Wecker verschlafen und was Wichtiges verpasst.' },
  { l: 0, t: '…mich in der Öffentlichkeit lang gemacht.' },
  { l: 0, t: '…heimlich Essen von jemandem geklaut.' },
  { l: 1, t: '…eine Nachricht an die komplett falsche Person geschickt.' },
  { l: 1, t: '…so getan, als hätte ich einen Anruf, um jemandem zu entkommen.' },
  { l: 1, t: '…jemanden auf Social Media gestalkt.' },
  { l: 2, t: '…auf einer Party jemanden geküsst, den ich kaum kannte.' },
  { l: 2, t: '…jemandem eine peinliche Sprachnachricht geschickt.' },
  { l: 3, t: '…jemanden in diesem Raum attraktiv gefunden.' },
  { l: 3, t: '…meinem Ex/meiner Ex hinterhergestalkt.' },
  { l: 3, t: '…auf einem Date geflunkert.' },
];
const LIKELY = [
  { l: 0, t: '…zu spät zur eigenen Hochzeit kommen?' },
  { l: 0, t: '…berühmt werden?' },
  { l: 0, t: '…den ganzen Kühlschrank leer essen?' },
  { l: 1, t: '…aus Versehen dem Ex schreiben?' },
  { l: 1, t: '…als Erste:r betrunken sein?' },
  { l: 1, t: '…das Handy in der Toilette fallen lassen?' },
  { l: 2, t: '…auf einer Party mit einer fremden Person knutschen?' },
  { l: 2, t: '…zwei Personen gleichzeitig daten?' },
  { l: 3, t: '…in dieser Runde heimlich verknallt sein?' },
  { l: 3, t: '…ein sehr peinliches Foto an die falsche Person schicken?' },
];
const CATS = ['Automarken', 'Länder', 'Fußballvereine', 'Tiere', 'Süßigkeiten', 'Serien', 'Städte in Deutschland', 'Cocktails', 'Youtuber', 'Pizzabeläge', 'Filme', 'Farben'];
const PENALTY = ['Verweigert? 2 Schlücke! 🍺', 'Nö? Dann trink 2! 🍺', 'Kneifer! 1 Shot 🥃'];

const pool = (arr, lvl) => arr.filter((c) => c.l <= lvl);
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const fill = (t, players, idx) => {
  const p = players[idx]?.name || 'Du';
  const others = players.filter((_, i) => i !== idx);
  const o = others.length ? rnd(others).name : p;
  return t.replace(/{p}/g, p).replace(/{o}/g, o);
};

/* ------------------------------ UI-Bausteine ------------------------------ */
function NeonBtn({ grad = ['#8B5CF6', '#EC4899'], label, icon, onPress, style }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => { tap(); onPress && onPress(); }} style={style}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.neonBtn}>
        {icon && <Ionicons name={icon} size={20} color="#fff" style={{ marginRight: 8 }} />}
        <Text style={s.neonBtnTxt}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/* --------------------------------- Setup --------------------------------- */
function Setup({ players, setPlayers, intensity, setIntensity, onStart }) {
  const [name, setName] = useState('');
  const add = () => {
    if (!name.trim()) return;
    tap();
    setPlayers((p) => [...p, { id: 'p' + Date.now(), name: name.trim(), emoji: EMOJIS[p.length % EMOJIS.length] }]);
    setName('');
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 40 }}>
          <Text style={s.logo}>PROST 🍻</Text>
          <Text style={s.logoSub}>Das Trinkspiel für jede Runde</Text>

          <Text style={s.section}>Wer spielt mit?</Text>
          <View style={s.addRow}>
            <TextInput style={s.addInput} placeholder="Name eingeben…" placeholderTextColor="#7d76a0"
              value={name} onChangeText={setName} onSubmitEditing={add} returnKeyType="done" />
            <TouchableOpacity onPress={add}>
              <LinearGradient colors={['#8B5CF6', '#EC4899']} style={s.addBtn}><Ionicons name="add" size={26} color="#fff" /></LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={s.chips}>
            {players.map((p) => (
              <TouchableOpacity key={p.id} style={s.pchip} onPress={() => { tap(); setPlayers((ps) => ps.filter((x) => x.id !== p.id)); }}>
                <Text style={{ fontSize: 18, marginRight: 6 }}>{p.emoji}</Text>
                <Text style={s.pchipTxt}>{p.name}</Text>
                <Ionicons name="close" size={15} color={C.sub} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            ))}
            {players.length === 0 && <Text style={{ color: C.sub }}>Mind. 2 Spieler hinzufügen…</Text>}
          </View>

          <Text style={s.section}>Wie hart wird's? 🔥</Text>
          <View style={{ gap: 10 }}>
            {INTENSITY.map((it) => {
              const on = intensity === it.lvl;
              return (
                <TouchableOpacity key={it.lvl} activeOpacity={0.85} onPress={() => { tap(); setIntensity(it.lvl); }}>
                  {on
                    ? <LinearGradient colors={it.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.intRow}>
                        <Text style={{ fontSize: 22 }}>{it.emoji}</Text><Text style={s.intTxtOn}>{it.label}</Text>
                        <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginLeft: 'auto' }} />
                      </LinearGradient>
                    : <View style={[s.intRow, s.intRowOff]}>
                        <Text style={{ fontSize: 22 }}>{it.emoji}</Text><Text style={s.intTxt}>{it.label}</Text>
                      </View>}
                </TouchableOpacity>
              );
            })}
          </View>

          <NeonBtn label={players.length < 2 ? 'Mind. 2 Spieler' : 'Los geht’s! 🎉'} icon="play"
            onPress={() => players.length >= 2 && onStart()} style={{ marginTop: 26, opacity: players.length < 2 ? 0.5 : 1 }} />
          <Text style={s.disclaimer}>Nur für Erwachsene · Trinkt verantwortungsvoll 🚫🚗</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------------------------- Home ---------------------------------- */
function Home({ players, intensity, drinks, onPick, onEdit }) {
  const [stats, setStats] = useState(false);
  const it = INTENSITY[intensity];
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={s.homeHead}>
        <View>
          <Text style={s.logoSm}>PROST 🍻</Text>
          <Text style={{ color: C.sub, fontSize: 13 }}>{players.length} Spieler · {it.emoji} {it.label}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={s.iconBtn} onPress={() => { tap(); setStats(true); }}><Ionicons name="trophy" size={20} color={C.amber} /></TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => { tap(); onEdit(); }}><Ionicons name="people" size={20} color={C.cyan} /></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={s.pick}>Wähl ein Spiel 👇</Text>
        <View style={s.grid}>
          {MODES.map((m) => (
            <TouchableOpacity key={m.id} activeOpacity={0.85} style={s.modeWrap} onPress={() => { tap('Medium'); onPick(m.id); }}>
              <LinearGradient colors={m.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modeCard}>
                <Ionicons name={m.icon} size={34} color="#fff" />
                <Text style={s.modeName}>{m.name}</Text>
                <Text style={s.modeDesc}>{m.desc}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <StatsModal visible={stats} onClose={() => setStats(false)} players={players} drinks={drinks} />
    </SafeAreaView>
  );
}

function StatsModal({ visible, onClose, players, drinks }) {
  const ranked = [...players].sort((a, b) => (drinks[b.id] || 0) - (drinks[a.id] || 0));
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={onClose}>
        <View style={s.modalCard} onStartShouldSetResponder={() => true}>
          <View style={s.handle} />
          <Text style={s.statTitle}>🏆 Verlierer des Abends</Text>
          {ranked.map((p, i) => (
            <View key={p.id} style={s.statRow}>
              <Text style={{ fontSize: 20, width: 30 }}>{i === 0 ? '👑' : i + 1}</Text>
              <Text style={{ fontSize: 22, marginRight: 8 }}>{p.emoji}</Text>
              <Text style={s.statName}>{p.name}</Text>
              <Text style={s.statCount}>{drinks[p.id] || 0} 🍺</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/* ------------------------- Modus: Wahrheit/Pflicht ------------------------- */
function TruthOrDare({ players, intensity, addDrink }) {
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState('choose');
  const [type, setType] = useState('');
  const [card, setCard] = useState('');
  const cur = players[turn % players.length];

  const choose = (kind) => {
    tap('Medium'); setType(kind);
    const c = rnd(pool(kind === 'truth' ? TRUTHS : DARES, intensity));
    setCard(fill(c.t, players, turn % players.length)); setPhase('card');
  };
  const done = () => { tap(); setTurn((t) => t + 1); setPhase('choose'); };
  const refuse = () => { tap('Heavy'); addDrink(cur.id, 2); setTurn((t) => t + 1); setPhase('choose'); };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <View style={s.turnBadge}><Text style={{ fontSize: 22 }}>{cur.emoji}</Text><Text style={s.turnName}>{cur.name} ist dran</Text></View>

      {phase === 'choose' ? (
        <View style={{ gap: 16, marginTop: 24 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => choose('truth')}>
            <LinearGradient colors={['#22D3EE', '#3B82F6']} style={s.bigChoice}><Text style={s.bigChoiceEmoji}>🫣</Text><Text style={s.bigChoiceTxt}>Wahrheit</Text></LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => choose('dare')}>
            <LinearGradient colors={['#EC4899', '#EF4444']} style={s.bigChoice}><Text style={s.bigChoiceEmoji}>🔥</Text><Text style={s.bigChoiceTxt}>Pflicht</Text></LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <LinearGradient colors={type === 'truth' ? ['#22D3EE', '#3B82F6'] : ['#EC4899', '#8B5CF6']} style={s.playCard}>
            <Text style={s.playType}>{type === 'truth' ? '🫣 WAHRHEIT' : '🔥 PFLICHT'}</Text>
            <Text style={s.playText}>{card}</Text>
          </LinearGradient>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <NeonBtn grad={['#34D399', '#22D3EE']} icon="checkmark" label="Erledigt" onPress={done} style={{ flex: 1 }} />
            <NeonBtn grad={['#FB7185', '#EF4444']} icon="beer" label="Trink 2" onPress={refuse} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  );
}

/* --------------------------- Modus: Ich hab noch nie --------------------------- */
function CardMode({ intensity, data, head, hint, grad }) {
  const [txt, setTxt] = useState(() => fillHead(head, rnd(pool(data, intensity)).t));
  const next = () => { tap(); setTxt(fillHead(head, rnd(pool(data, intensity)).t)); };
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <LinearGradient colors={grad} style={s.playCard}>
        <Text style={s.playText}>{txt}</Text>
      </LinearGradient>
      <Text style={s.hint}>{hint}</Text>
      <NeonBtn grad={grad} icon="arrow-forward" label="Nächste Karte" onPress={next} style={{ marginTop: 20 }} />
    </View>
  );
}
const fillHead = (head, t) => head + ' ' + t;

/* ------------------------------- Modus: Bombe ------------------------------- */
function Bomb({ addDrink }) {
  const [state, setState] = useState('idle');
  const [cat, setCat] = useState('');
  const timer = useRef(null);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (state === 'run') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]));
      loop.start(); return () => loop.stop();
    }
  }, [state]);
  const start = () => {
    tap('Medium'); setCat(rnd(CATS)); setState('run');
    timer.current = setTimeout(() => { tap('Heavy'); setState('boom'); }, 5000 + Math.random() * 16000);
  };
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
      {state === 'idle' && (
        <>
          <Text style={{ fontSize: 90 }}>💣</Text>
          <Text style={s.bombInfo}>Gebt das Handy reihum weiter und nennt abwechselnd Begriffe. Wer die Bombe hält, wenn sie explodiert, trinkt!</Text>
          <NeonBtn grad={['#8B5CF6', '#EF4444']} icon="flame" label="Bombe zünden" onPress={start} style={{ marginTop: 24, alignSelf: 'stretch' }} />
        </>
      )}
      {state === 'run' && (
        <>
          <Animated.Text style={{ fontSize: 100, transform: [{ scale }] }}>💣</Animated.Text>
          <Text style={s.bombCat}>{cat}</Text>
          <Text style={s.bombInfo}>Nennt abwechselnd einen Begriff und gebt schnell weiter! 🔥</Text>
        </>
      )}
      {state === 'boom' && (
        <>
          <Text style={{ fontSize: 100 }}>💥</Text>
          <Text style={s.boom}>BOOM!</Text>
          <Text style={s.bombInfo}>Wer das Handy hält, trinkt 3 Schlücke! 🍺</Text>
          <NeonBtn grad={['#8B5CF6', '#EF4444']} icon="refresh" label="Nochmal" onPress={() => setState('idle')} style={{ marginTop: 24, alignSelf: 'stretch' }} />
        </>
      )}
    </View>
  );
}

/* --------------------------------- Spiel --------------------------------- */
function Game({ mode, players, intensity, addDrink, onBack }) {
  const m = MODES.find((x) => x.id === mode);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={s.gameHead}>
        <TouchableOpacity style={s.iconBtn} onPress={() => { tap(); onBack(); }}><Ionicons name="chevron-back" size={22} color="#fff" /></TouchableOpacity>
        <Text style={s.gameTitle}>{m.name.replace('\n', ' ')}</Text>
        <View style={{ width: 40 }} />
      </View>
      {mode === 'tod' && <TruthOrDare players={players} intensity={intensity} addDrink={addDrink} />}
      {mode === 'never' && <CardMode intensity={intensity} data={NEVER} head="Ich hab noch nie" hint="Wer schon → trinkt! 🍺" grad={['#22D3EE', '#3B82F6']} />}
      {mode === 'likely' && <CardMode intensity={intensity} data={LIKELY} head="Wer würde am ehesten" hint="Auf 3 zeigen alle! Wer die meisten Finger hat, trinkt." grad={['#FBBF24', '#F97316']} />}
      {mode === 'bomb' && <Bomb addDrink={addDrink} />}
    </SafeAreaView>
  );
}

/* ---------------------------------- App ---------------------------------- */
export default function App() {
  const [screen, setScreen] = useState('setup');
  const [players, setPlayers] = useState([]);
  const [intensity, setIntensity] = useState(1);
  const [mode, setMode] = useState(null);
  const [drinks, setDrinks] = useState({});
  const addDrink = (id, n) => setDrinks((d) => ({ ...d, [id]: (d[id] || 0) + n }));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" />
      {screen === 'setup' && <Setup players={players} setPlayers={setPlayers} intensity={intensity} setIntensity={setIntensity} onStart={() => setScreen('home')} />}
      {screen === 'home' && <Home players={players} intensity={intensity} drinks={drinks} onEdit={() => setScreen('setup')} onPick={(id) => { setMode(id); setScreen('game'); }} />}
      {screen === 'game' && <Game mode={mode} players={players} intensity={intensity} addDrink={addDrink} onBack={() => setScreen('home')} />}
    </View>
  );
}

/* --------------------------------- Styles --------------------------------- */
const s = StyleSheet.create({
  logo: { color: '#fff', fontSize: 44, fontWeight: '900', letterSpacing: 1 },
  logoSub: { color: C.sub, fontSize: 15, marginTop: 2, marginBottom: 10 },
  logoSm: { color: '#fff', fontSize: 24, fontWeight: '900' },
  section: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 22, marginBottom: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addInput: { flex: 1, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: C.line },
  addBtn: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  pchip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: C.line },
  pchipTxt: { color: '#fff', fontWeight: '700' },
  intRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15 },
  intRowOff: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  intTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  intTxtOn: { color: '#fff', fontWeight: '900', fontSize: 16 },
  disclaimer: { color: '#6b6591', fontSize: 12, textAlign: 'center', marginTop: 18 },
  neonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 17 },
  neonBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 17 },

  homeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  pick: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 14, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  modeWrap: { width: '48.5%', marginBottom: 14 },
  modeCard: { borderRadius: 22, padding: 18, height: 170, justifyContent: 'space-between' },
  modeName: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 24, marginTop: 8 },
  modeDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },

  turnBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 10, backgroundColor: C.card, borderRadius: 30, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: C.line },
  turnName: { color: '#fff', fontWeight: '800', fontSize: 18 },
  bigChoice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 20, paddingVertical: 26, gap: 12 },
  bigChoiceEmoji: { fontSize: 34 },
  bigChoiceTxt: { color: '#fff', fontSize: 26, fontWeight: '900' },
  playCard: { borderRadius: 24, padding: 28, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  playType: { color: 'rgba(255,255,255,0.9)', fontWeight: '900', letterSpacing: 2, marginBottom: 14, fontSize: 13 },
  playText: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', lineHeight: 32 },
  hint: { color: C.sub, textAlign: 'center', marginTop: 16, fontSize: 14 },

  bombInfo: { color: C.sub, textAlign: 'center', fontSize: 15, marginTop: 16, lineHeight: 21, paddingHorizontal: 10 },
  bombCat: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 16, textAlign: 'center' },
  boom: { color: C.red, fontSize: 46, fontWeight: '900', marginTop: 4 },

  gameHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  gameTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 36, borderWidth: 1, borderColor: C.line },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#3a3363', alignSelf: 'center', marginBottom: 16 },
  statTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 14 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  statName: { color: '#fff', fontWeight: '700', fontSize: 16, flex: 1 },
  statCount: { color: C.amber, fontWeight: '900', fontSize: 16 },
});
