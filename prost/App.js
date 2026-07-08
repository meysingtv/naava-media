// PROST – Trinkspiel · v2 (Expo SDK 54, React Native)
// Cleanes, modernes Design (dunkel & ruhig, ein Akzent pro Screen, große Typo).
// 7 Modi inkl. Song-Quiz. Spieler-Setup, Intensität, Statistik, Haptik.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Platform, Modal, KeyboardAvoidingView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const T = {
  bg: '#0E0E12', surface: '#17171D', surface2: '#20202A', border: 'rgba(255,255,255,0.08)',
  text: '#F5F5F7', dim: '#9A9AA6', dim2: '#63636F', brand: '#FF6A5A',
};
const tap = (s = 'Light') => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle[s]); } catch (e) {} };
const AVATARS = ['🦊', '🐼', '🐙', '🦉', '🐧', '🐳', '🦁', '🐨', '🦖', '🐝', '🦄', '🐢'];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

const INTENSITY = [
  { lvl: 0, label: 'Harmlos', emoji: '😇' },
  { lvl: 1, label: 'Frech', emoji: '😏' },
  { lvl: 2, label: 'Spicy', emoji: '🌶️' },
  { lvl: 3, label: 'Extrem', emoji: '🔞' },
];

const MODES = [
  { id: 'tod',    name: 'Wahrheit oder Pflicht', short: 'Der Klassiker',        icon: 'flame',         color: '#FF6A5A', featured: true },
  { id: 'never',  name: 'Ich hab noch nie',      short: 'Wer schon, trinkt',    icon: 'remove-circle', color: '#3FB8A0' },
  { id: 'likely', name: 'Most Likely To',        short: 'Wer würde am ehesten…', icon: 'people',        color: '#E0A63C' },
  { id: 'either', name: 'Entweder / Oder',       short: 'Entscheide dich',      icon: 'git-compare',   color: '#6C8AE4' },
  { id: 'cats',   name: 'Kategorien',            short: 'Reihum aufzählen',     icon: 'list',          color: '#C77DBB' },
  { id: 'song',   name: 'Song-Quiz',             short: 'Welches Jahr?',        icon: 'musical-notes', color: '#8E7CC3' },
  { id: 'bomb',   name: 'Die Bombe',             short: 'Nicht bei 0 halten',   icon: 'alarm',         color: '#E4694E' },
];

/* --------------------------------- Inhalte --------------------------------- */
const TRUTHS = [
  { l: 0, t: 'Was war dein peinlichster Moment in der Schule?' },
  { l: 0, t: 'Was ist deine seltsamste Angewohnheit?' },
  { l: 0, t: 'Welchen Promi findest du heimlich total nervig?' },
  { l: 0, t: 'Was ist das Kindischste, das du immer noch machst?' },
  { l: 1, t: 'Wen hier findest du am lustigsten – und wen am nervigsten?' },
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
  { l: 3, t: '{p}, lass {o} eine Minute durch dein geöffnetes Handy scrollen.' },
  { l: 3, t: '{p}, lies deine letzte DM laut vor.' },
  { l: 3, t: '{p}, tausche für 2 Runden ein Kleidungsstück mit {o}.' },
];
const NEVER = [
  { l: 0, t: '…einen Wecker verschlafen und was Wichtiges verpasst.' },
  { l: 0, t: '…mich in der Öffentlichkeit lang gemacht.' },
  { l: 0, t: '…heimlich Essen von jemandem geklaut.' },
  { l: 1, t: '…eine Nachricht an die komplett falsche Person geschickt.' },
  { l: 1, t: '…so getan, als hätte ich einen Anruf, um zu entkommen.' },
  { l: 1, t: '…jemanden auf Social Media gestalkt.' },
  { l: 2, t: '…auf einer Party jemanden geküsst, den ich kaum kannte.' },
  { l: 2, t: '…jemandem eine peinliche Sprachnachricht geschickt.' },
  { l: 3, t: '…jemanden in diesem Raum attraktiv gefunden.' },
  { l: 3, t: '…meinem Ex hinterhergestalkt.' },
  { l: 3, t: '…auf einem Date geflunkert.' },
];
const LIKELY = [
  { l: 0, t: 'zu spät zur eigenen Hochzeit kommen?' },
  { l: 0, t: 'berühmt werden?' },
  { l: 0, t: 'den ganzen Kühlschrank leer essen?' },
  { l: 1, t: 'aus Versehen dem Ex schreiben?' },
  { l: 1, t: 'als Erste:r betrunken sein?' },
  { l: 1, t: 'das Handy in der Toilette fallen lassen?' },
  { l: 2, t: 'auf einer Party mit einer fremden Person knutschen?' },
  { l: 2, t: 'zwei Personen gleichzeitig daten?' },
  { l: 3, t: 'in dieser Runde heimlich verknallt sein?' },
  { l: 3, t: 'ein peinliches Foto an die falsche Person schicken?' },
];
const EITHER = [
  { l: 0, a: 'Nie wieder Pizza', b: 'nie wieder Pommes' },
  { l: 0, a: 'Fliegen können', b: 'unsichtbar sein' },
  { l: 0, a: 'Immer 10 Min zu früh', b: 'immer 10 Min zu spät' },
  { l: 1, a: 'Handy 1 Woche weg', b: '1 Monat kein Süßes' },
  { l: 1, a: 'Gedanken lesen können', b: 'in die Zukunft sehen' },
  { l: 1, a: 'Peinliches Video geht viral', b: 'alle lesen deine DMs' },
  { l: 2, a: 'Mit dem Ex nochmal ausgehen', b: 'für immer Single' },
  { l: 2, a: 'Deinen Crush blamieren', b: 'dich selbst blamieren' },
  { l: 3, a: 'Suchverlauf wird öffentlich', b: 'letzte 10 Nachrichten werden vorgelesen' },
  { l: 3, a: 'Mit jedem hier mal daten', b: 'nie wieder daten' },
];
const CATS = ['Automarken', 'Länder', 'Fußballvereine', 'Tiere', 'Süßigkeiten', 'Serien', 'Städte in Deutschland', 'Cocktails', 'YouTuber', 'Pizzabeläge', 'Filme', 'Rapper'];
const SONGS = [
  { t: 'Bohemian Rhapsody', a: 'Queen', y: 1975 }, { t: 'Dancing Queen', a: 'ABBA', y: 1976 },
  { t: 'Billie Jean', a: 'Michael Jackson', y: 1983 }, { t: '99 Luftballons', a: 'Nena', y: 1983 },
  { t: 'Take On Me', a: 'a-ha', y: 1985 }, { t: 'Smells Like Teen Spirit', a: 'Nirvana', y: 1991 },
  { t: "Gangsta's Paradise", a: 'Coolio', y: 1995 }, { t: '…Baby One More Time', a: 'Britney Spears', y: 1998 },
  { t: 'I Want It That Way', a: 'Backstreet Boys', y: 1999 }, { t: 'Lose Yourself', a: 'Eminem', y: 2002 },
  { t: 'In Da Club', a: '50 Cent', y: 2003 }, { t: 'Hey Ya!', a: 'Outkast', y: 2003 },
  { t: 'Umbrella', a: 'Rihanna', y: 2007 }, { t: 'Haus am See', a: 'Peter Fox', y: 2008 },
  { t: 'I Gotta Feeling', a: 'Black Eyed Peas', y: 2009 }, { t: 'Rolling in the Deep', a: 'Adele', y: 2010 },
  { t: 'Somebody That I Used to Know', a: 'Gotye', y: 2011 }, { t: 'Gangnam Style', a: 'PSY', y: 2012 },
  { t: 'Easy', a: 'Cro', y: 2012 }, { t: 'Get Lucky', a: 'Daft Punk', y: 2013 },
  { t: 'Wake Me Up', a: 'Avicii', y: 2013 }, { t: 'Uptown Funk', a: 'Mark Ronson', y: 2014 },
  { t: 'Chöre', a: 'Mark Forster', y: 2016 }, { t: 'Shape of You', a: 'Ed Sheeran', y: 2017 },
  { t: 'Despacito', a: 'Luis Fonsi', y: 2017 }, { t: 'Someone You Loved', a: 'Lewis Capaldi', y: 2018 },
  { t: 'Old Town Road', a: 'Lil Nas X', y: 2019 }, { t: 'Roller', a: 'Apache 207', y: 2019 },
  { t: 'Blinding Lights', a: 'The Weeknd', y: 2019 }, { t: 'Levitating', a: 'Dua Lipa', y: 2020 },
  { t: 'As It Was', a: 'Harry Styles', y: 2022 }, { t: 'Flowers', a: 'Miley Cyrus', y: 2023 },
];

const pool = (arr, lvl) => arr.filter((c) => c.l <= lvl);
const fill = (t, players, idx) => {
  const p = players[idx]?.name || 'Du';
  const others = players.filter((_, i) => i !== idx);
  const o = others.length ? rnd(others).name : p;
  return t.replace(/{p}/g, p).replace(/{o}/g, o);
};

/* ------------------------------ UI-Bausteine ------------------------------ */
function Btn({ label, icon, onPress, variant = 'light', color = T.brand, style }) {
  const map = {
    light: { bg: T.text, fg: '#141414' },
    accent: { bg: color, fg: '#141414' },
    ghost: { bg: 'transparent', fg: T.text, border: T.border },
    danger: { bg: 'rgba(228,105,78,0.14)', fg: '#FF9077' },
  };
  const v = map[variant];
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => { tap(); onPress && onPress(); }}
      style={[s.btn, { backgroundColor: v.bg, borderWidth: v.border ? 1 : 0, borderColor: v.border }, style]}>
      {icon && <Ionicons name={icon} size={18} color={v.fg} style={{ marginRight: 8 }} />}
      <Text style={[s.btnTxt, { color: v.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const chip = (bg) => ({ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: bg });

/* --------------------------------- Setup --------------------------------- */
function Setup({ players, setPlayers, intensity, setIntensity, onStart }) {
  const [name, setName] = useState('');
  const add = () => {
    if (!name.trim()) return; tap();
    setPlayers((p) => [...p, { id: 'p' + Date.now(), name: name.trim(), av: AVATARS[p.length % AVATARS.length] }]);
    setName('');
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          <Text style={s.brandMark}>prost.</Text>
          <Text style={s.h1}>Wer ist dabei?</Text>

          <View style={s.inputRow}>
            <TextInput style={s.input} placeholder="Name eingeben" placeholderTextColor={T.dim2}
              value={name} onChangeText={setName} onSubmitEditing={add} returnKeyType="done" />
            <TouchableOpacity onPress={add} style={s.addBtn}><Ionicons name="add" size={24} color="#141414" /></TouchableOpacity>
          </View>

          <View style={{ marginTop: 16 }}>
            {players.map((p) => (
              <View key={p.id} style={s.playerRow}>
                <View style={s.playerAv}><Text style={{ fontSize: 20 }}>{p.av}</Text></View>
                <Text style={s.playerName}>{p.name}</Text>
                <TouchableOpacity onPress={() => { tap(); setPlayers((ps) => ps.filter((x) => x.id !== p.id)); }} hitSlop={10}>
                  <Ionicons name="close" size={20} color={T.dim} />
                </TouchableOpacity>
              </View>
            ))}
            {players.length === 0 && <Text style={{ color: T.dim2, marginTop: 4 }}>Mindestens 2 Spieler hinzufügen</Text>}
          </View>

          <Text style={s.label}>Intensität</Text>
          <View style={s.intGrid}>
            {INTENSITY.map((it) => {
              const on = intensity === it.lvl;
              return (
                <TouchableOpacity key={it.lvl} activeOpacity={0.8} onPress={() => { tap(); setIntensity(it.lvl); }}
                  style={[s.intCard, on && { borderColor: T.brand, backgroundColor: T.surface2 }]}>
                  <Text style={{ fontSize: 22 }}>{it.emoji}</Text>
                  <Text style={[s.intLabel, on && { color: T.text }]}>{it.label}</Text>
                  {on && <View style={s.intDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Btn label="Los geht’s" icon="arrow-forward" variant="accent"
            onPress={() => players.length >= 2 && onStart()}
            style={{ marginTop: 26, opacity: players.length < 2 ? 0.4 : 1 }} />
          <Text style={s.fine}>Ab 18 · Bitte verantwortungsvoll trinken</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------------------------- Home ---------------------------------- */
function Home({ players, intensity, drinks, onPick, onEdit }) {
  const [stats, setStats] = useState(false);
  const it = INTENSITY[intensity];
  const hero = MODES.find((m) => m.featured);
  const rest = MODES.filter((m) => !m.featured);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 30 }}>
        <View style={s.homeTop}>
          <View>
            <Text style={s.brandMark}>prost.</Text>
            <View style={s.metaRow}>
              <View style={s.metaPill}><Ionicons name="people" size={13} color={T.dim} /><Text style={s.metaTxt}>{players.length}</Text></View>
              <View style={s.metaPill}><Text style={{ fontSize: 12 }}>{it.emoji}</Text><Text style={s.metaTxt}>{it.label}</Text></View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={s.roundBtn} onPress={() => { tap(); setStats(true); }}><Ionicons name="trophy-outline" size={19} color={T.text} /></TouchableOpacity>
            <TouchableOpacity style={s.roundBtn} onPress={() => { tap(); onEdit(); }}><Ionicons name="settings-outline" size={19} color={T.text} /></TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.9} style={[s.hero, { backgroundColor: hero.color }]} onPress={() => { tap('Medium'); onPick(hero.id); }}>
          <View style={s.heroIcon}><Ionicons name={hero.icon} size={22} color="#141414" /></View>
          <Text style={s.heroTitle}>{hero.name}</Text>
          <View style={s.heroFoot}><Text style={s.heroShort}>{hero.short}</Text><Ionicons name="arrow-forward" size={20} color="#141414" /></View>
        </TouchableOpacity>

        <Text style={s.label}>Alle Spiele</Text>
        <View style={s.grid}>
          {rest.map((m) => (
            <TouchableOpacity key={m.id} activeOpacity={0.8} style={s.mCard} onPress={() => { tap('Medium'); onPick(m.id); }}>
              <View style={chip(m.color + '22')}><Ionicons name={m.icon} size={22} color={m.color} /></View>
              <Text style={s.mName}>{m.name}</Text>
              <Text style={s.mShort}>{m.short}</Text>
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
      <TouchableOpacity style={s.sheetBg} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>Verlierer des Abends</Text>
          {ranked.map((p, i) => (
            <View key={p.id} style={s.rankRow}>
              <Text style={{ width: 28, fontSize: 15, color: T.dim }}>{i === 0 ? '👑' : i + 1}</Text>
              <Text style={{ fontSize: 20, marginRight: 10 }}>{p.av}</Text>
              <Text style={{ color: T.text, fontWeight: '600', fontSize: 16, flex: 1 }}>{p.name}</Text>
              <Text style={{ color: T.brand, fontWeight: '800', fontSize: 16 }}>{drinks[p.id] || 0}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/* ------------------------------- Modus-Screens ------------------------------- */
function TruthOrDare({ players, intensity, color, addDrink }) {
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState('choose');
  const [type, setType] = useState('');
  const [card, setCard] = useState('');
  const cur = players[turn % players.length];
  const choose = (kind) => {
    tap('Medium'); setType(kind);
    setCard(fill(rnd(pool(kind === 'truth' ? TRUTHS : DARES, intensity)).t, players, turn % players.length));
    setPhase('card');
  };
  const done = () => { setTurn((t) => t + 1); setPhase('choose'); };
  const refuse = () => { tap('Heavy'); addDrink(cur.id, 2); setTurn((t) => t + 1); setPhase('choose'); };
  return (
    <View style={s.stage}>
      <View style={s.turnBadge}><Text style={{ fontSize: 20, marginRight: 8 }}>{cur.av}</Text><Text style={s.turnTxt}>{cur.name} ist dran</Text></View>
      {phase === 'choose' ? (
        <View style={{ gap: 14, marginTop: 22 }}>
          <TouchableOpacity activeOpacity={0.85} style={s.choice} onPress={() => choose('truth')}>
            <Ionicons name="chatbox-ellipses" size={24} color="#5FD0E0" /><Text style={s.choiceTxt}>Wahrheit</Text><Ionicons name="chevron-forward" size={20} color={T.dim} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={s.choice} onPress={() => choose('dare')}>
            <Ionicons name="flame" size={24} color="#FF8A6E" /><Text style={s.choiceTxt}>Pflicht</Text><Ionicons name="chevron-forward" size={20} color={T.dim} />
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={[s.playCard, { backgroundColor: type === 'truth' ? '#2A3540' : '#3A2A2E' }]}>
            <Text style={[s.playKicker, { color: type === 'truth' ? '#5FD0E0' : '#FF8A6E' }]}>{type === 'truth' ? 'WAHRHEIT' : 'PFLICHT'}</Text>
            <Text style={s.playText}>{card}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
            <Btn label="Erledigt" icon="checkmark" variant="light" onPress={done} style={{ flex: 1 }} />
            <Btn label="Trink 2" icon="beer" variant="danger" onPress={refuse} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  );
}

function CardMode({ intensity, data, head, tail, hint, color }) {
  const draw = () => { const c = rnd(pool(data, intensity)); return head ? head + ' ' + c.t : c.t; };
  const [txt, setTxt] = useState(draw);
  return (
    <View style={s.stage}>
      <View style={[s.playCard, { backgroundColor: T.surface }]}>
        <Text style={s.playText}>{txt}{tail}</Text>
      </View>
      <Text style={s.hint}>{hint}</Text>
      <Btn label="Nächste Karte" icon="arrow-forward" variant="accent" color={color} onPress={() => { tap(); setTxt(draw()); }} style={{ marginTop: 18 }} />
    </View>
  );
}

function EitherMode({ intensity, color }) {
  const draw = () => rnd(pool(EITHER, intensity));
  const [c, setC] = useState(draw);
  return (
    <View style={s.stage}>
      <View style={[s.playCard, { backgroundColor: T.surface, paddingVertical: 30 }]}>
        <Text style={s.eitherTxt}>{c.a}</Text>
        <Text style={s.eitherOr}>oder</Text>
        <Text style={s.eitherTxt}>{c.b}?</Text>
      </View>
      <Text style={s.hint}>Auf 3 zeigen alle. Wer in der Minderheit ist, trinkt.</Text>
      <Btn label="Nächste Frage" icon="arrow-forward" variant="accent" color={color} onPress={() => { tap(); setC(draw()); }} style={{ marginTop: 18 }} />
    </View>
  );
}

function SongMode({ color }) {
  const [song, setSong] = useState(() => rnd(SONGS));
  const [shown, setShown] = useState(false);
  const next = () => { tap(); setShown(false); setSong(rnd(SONGS)); };
  return (
    <View style={s.stage}>
      <View style={[s.playCard, { backgroundColor: T.surface }]}>
        <Ionicons name="musical-notes" size={30} color={color} style={{ marginBottom: 14 }} />
        <Text style={s.songTitle}>{song.t}</Text>
        <Text style={s.songArtist}>{song.a}</Text>
        {shown
          ? <Text style={[s.songYear, { color }]}>{song.y}</Text>
          : <Text style={s.songQ}>In welchem Jahr?</Text>}
      </View>
      <Text style={s.hint}>Alle tippen aufs Jahr. Wer mehr als 3 Jahre daneben liegt, trinkt.</Text>
      {shown
        ? <Btn label="Nächster Song" icon="arrow-forward" variant="accent" color={color} onPress={next} style={{ marginTop: 18 }} />
        : <Btn label="Auflösen" icon="eye" variant="light" onPress={() => { tap(); setShown(true); }} style={{ marginTop: 18 }} />}
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
  const start = () => { tap('Medium'); setCat(rnd(CATS)); setState('run'); timer.current = setTimeout(() => { tap('Heavy'); setState('boom'); }, 5000 + Math.random() * 16000); };
  return (
    <View style={[s.stage, { alignItems: 'center', justifyContent: 'center' }]}>
      {state === 'idle' && <>
        <Text style={{ fontSize: 76 }}>💣</Text>
        <Text style={s.bombInfo}>Gebt das Handy reihum weiter und nennt abwechselnd Begriffe. Wer die Bombe hält, wenn sie hochgeht, trinkt.</Text>
        <Btn label="Bombe zünden" icon="flame" variant="accent" color="#E4694E" onPress={start} style={{ marginTop: 22, alignSelf: 'stretch' }} />
      </>}
      {state === 'run' && <>
        <Animated.Text style={{ fontSize: 92, transform: [{ scale }] }}>💣</Animated.Text>
        <Text style={s.bombCat}>{cat}</Text>
        <Text style={s.bombInfo}>Abwechselnd nennen und schnell weitergeben!</Text>
      </>}
      {state === 'boom' && <>
        <Text style={{ fontSize: 92 }}>💥</Text>
        <Text style={s.boom}>Bumm!</Text>
        <Text style={s.bombInfo}>Wer das Handy hält, trinkt 3 Schlücke.</Text>
        <Btn label="Nochmal" icon="refresh" variant="light" onPress={() => setState('idle')} style={{ marginTop: 22, alignSelf: 'stretch' }} />
      </>}
    </View>
  );
}

function Game({ mode, players, intensity, addDrink, onBack }) {
  const m = MODES.find((x) => x.id === mode);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={s.gameHead}>
        <TouchableOpacity style={s.roundBtn} onPress={() => { tap(); onBack(); }}><Ionicons name="chevron-back" size={20} color={T.text} /></TouchableOpacity>
        <Text style={s.gameTitle}>{m.name}</Text>
        <View style={{ width: 40 }} />
      </View>
      {mode === 'tod' && <TruthOrDare players={players} intensity={intensity} color={m.color} addDrink={addDrink} />}
      {mode === 'never' && <CardMode intensity={intensity} data={NEVER} head="Ich hab noch nie" hint="Wer schon → trinkt." color={m.color} />}
      {mode === 'likely' && <CardMode intensity={intensity} data={LIKELY} head="Wer würde am ehesten" tail="" hint="Auf 3 zeigen alle. Die Mehrheit entscheidet – wer’s ist, trinkt." color={m.color} />}
      {mode === 'either' && <EitherMode intensity={intensity} color={m.color} />}
      {mode === 'cats' && <CardMode intensity={3} data={CATS.map((c) => ({ l: 0, t: c }))} head="Reihum nennen:" hint="Wer stockt oder sich wiederholt, trinkt." color={m.color} />}
      {mode === 'song' && <SongMode color={m.color} />}
      {mode === 'bomb' && <Bomb />}
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
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" />
      {screen === 'setup' && <Setup players={players} setPlayers={setPlayers} intensity={intensity} setIntensity={setIntensity} onStart={() => setScreen('home')} />}
      {screen === 'home' && <Home players={players} intensity={intensity} drinks={drinks} onEdit={() => setScreen('setup')} onPick={(id) => { setMode(id); setScreen('game'); }} />}
      {screen === 'game' && <Game mode={mode} players={players} intensity={intensity} addDrink={addDrink} onBack={() => setScreen('home')} />}
    </View>
  );
}

/* --------------------------------- Styles --------------------------------- */
const s = StyleSheet.create({
  brandMark: { color: T.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  h1: { color: T.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 18, marginBottom: 18 },
  label: { color: T.dim, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 28, marginBottom: 14 },
  fine: { color: T.dim2, fontSize: 12, textAlign: 'center', marginTop: 18 },

  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: T.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, color: T.text, fontSize: 16, borderWidth: 1, borderColor: T.border },
  addBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: T.text, alignItems: 'center', justifyContent: 'center' },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  playerAv: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  playerName: { color: T.text, fontWeight: '600', fontSize: 16, flex: 1 },

  intGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  intCard: { width: '48.5%', backgroundColor: T.surface, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: T.border },
  intLabel: { color: T.dim, fontWeight: '700', marginTop: 8 },
  intDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: T.brand },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 15, paddingVertical: 16 },
  btnTxt: { fontWeight: '700', fontSize: 16 },

  homeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.surface, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: T.border },
  metaTxt: { color: T.dim, fontWeight: '600', fontSize: 12.5 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },

  hero: { borderRadius: 24, padding: 22, height: 168, justifyContent: 'space-between' },
  heroIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.14)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#141414', fontSize: 27, fontWeight: '800', letterSpacing: -0.5, marginTop: 6, width: '75%' },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroShort: { color: 'rgba(20,20,20,0.7)', fontWeight: '600', fontSize: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mCard: { width: '48.5%', backgroundColor: T.surface, borderRadius: 20, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: T.border, minHeight: 132, justifyContent: 'space-between' },
  mName: { color: T.text, fontSize: 16, fontWeight: '700', marginTop: 14, letterSpacing: -0.3 },
  mShort: { color: T.dim, fontSize: 12.5, marginTop: 3 },

  stage: { flex: 1, padding: 22, justifyContent: 'center' },
  turnBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: T.surface, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: T.border },
  turnTxt: { color: T.text, fontWeight: '700', fontSize: 16 },
  choice: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 22, borderWidth: 1, borderColor: T.border, gap: 14 },
  choiceTxt: { color: T.text, fontSize: 20, fontWeight: '700', flex: 1 },
  playCard: { borderRadius: 22, padding: 26, minHeight: 210, alignItems: 'center', justifyContent: 'center' },
  playKicker: { fontWeight: '800', letterSpacing: 2, fontSize: 12, marginBottom: 14 },
  playText: { color: T.text, fontSize: 23, fontWeight: '700', textAlign: 'center', lineHeight: 31, letterSpacing: -0.3 },
  hint: { color: T.dim, textAlign: 'center', marginTop: 16, fontSize: 13.5, lineHeight: 19 },

  eitherTxt: { color: T.text, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  eitherOr: { color: T.dim2, fontSize: 14, fontWeight: '600', marginVertical: 12 },

  songTitle: { color: T.text, fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  songArtist: { color: T.dim, fontSize: 16, marginTop: 4 },
  songQ: { color: T.dim2, fontSize: 15, marginTop: 20, fontWeight: '600' },
  songYear: { fontSize: 46, fontWeight: '800', marginTop: 14, letterSpacing: -1 },

  bombInfo: { color: T.dim, textAlign: 'center', fontSize: 14.5, marginTop: 16, lineHeight: 21, paddingHorizontal: 6 },
  bombCat: { color: T.text, fontSize: 26, fontWeight: '800', marginTop: 16 },
  boom: { color: '#FF8A6E', fontSize: 40, fontWeight: '800', marginTop: 6 },

  gameHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  gameTitle: { color: T.text, fontSize: 17, fontWeight: '700' },

  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36, borderWidth: 1, borderColor: T.border },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: T.surface2, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { color: T.text, fontSize: 20, fontWeight: '800', marginBottom: 12, letterSpacing: -0.3 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.border },
});
