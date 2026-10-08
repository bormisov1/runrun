import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Modal, Platform, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { clock, cropRun, km, kph, originalRun, routePath, Run, stats } from './src/run';
import { addLocations, getActive, getHistory, saveRun, setActive, startTracking, stopTracking, updateRun } from './src/tracking';
import { brandPhoto, brandVideo, focusCamera, setCameraExposure } from './src/videoBrand';
import { c, st } from './src/styles';
import { Trends } from './src/Trends';
import { exportGpx } from './src/export';
import { StopDialog } from './src/StopDialog';
import { Awards } from './src/Awards';
import { RunMap } from './src/RunMap';

type Tab = 'RUN' | 'HISTORY' | 'AWARDS';
const Icon = ({ name, size = 20, color = c.white }: { name: keyof typeof Ionicons.glyphMap; size?: number; color?: string }) => <Ionicons name={name} size={size} color={color}/>;
const Brand = ({ size = 33 }: { size?: number }) => <Text style={{ fontSize: size, lineHeight: size + 4, fontWeight: '900', fontStyle: 'italic', letterSpacing: -2.6, color: c.white, transform: [{ skewX: '-7deg' }] }}>RUNRUN<Text style={{ color: c.lime }}>.</Text></Text>;
const Watermark = () => <Image source={require('./assets/watermark.png')} resizeMode="contain" style={{ width: 155, height: 43 }} />;
const Label = ({ children }: { children: React.ReactNode }) => <Text style={st.label}>{children}</Text>;

function Route({ run, height = 226, transparent = false }: { run: Run | null; height?: number; transparent?: boolean }) {
  const path = run ? (run.points.length ? routePath(run.points, 320, height, 25) : '') : 'M 55 175 C 89 155 102 108 133 126 S 171 43 210 78 S 242 143 271 55';
  return <View style={[st.route, { height, backgroundColor: transparent ? 'transparent' : c.panel }]}>
    <Svg width="100%" height={height} viewBox={'0 0 320 ' + height}>
      {!transparent && <>{Array.from({ length: 9 }, (_, i) => <Line key={'v' + i} x1={i * 40} x2={i * 40} y1="0" y2={height} stroke={c.grid} strokeWidth="0.6"/>)}{Array.from({ length: 7 }, (_, i) => <Line key={'h' + i} x1="0" x2="320" y1={i * 40} y2={i * 40} stroke={c.grid} strokeWidth="0.6"/>)}</>}
      <Path d={path} stroke={c.lime} strokeWidth="14" opacity="0.08" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d={path} stroke={c.lime} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {!run?.points.length && <Circle cx="55" cy="175" r="6" fill={c.cyan}/>}
    </Svg>
    {!transparent && <><View style={st.routeTop}><View style={st.dot}/><Text style={st.routeTag}>{run ? run.points.length + ' GPS POINTS' : 'YOUR NEXT ROUTE'}</Text></View><Text style={st.routeBottom}>ROUTE VISUALIZATION  /  GPS TRACE</Text></>}
  </View>;
}

function Tile({ label, value, unit, icon, accent = false }: { label: string; value: string; unit: string; icon: keyof typeof Ionicons.glyphMap; accent?: boolean }) {
  return <View style={[st.tile, accent && st.tileAccent]}><View style={st.tileHead}><Text style={[st.label, accent && { color: '#42500B' }]}>{label}</Text><Icon name={icon} size={17} color={accent ? c.bg : c.muted}/></View><View style={st.tileValue}><Text style={[st.bigNum, accent && { color: c.bg }]}>{value}</Text><Text style={[st.unit, accent && { color: '#42500B' }]}>{unit}</Text></View></View>;
}

function Section({ kicker, title, right }: { kicker: string; title: string; right?: React.ReactNode }) { return <View style={st.section}><View><Text style={st.kicker}>{kicker}</Text><Text style={st.sectionTitle}>{title}</Text></View>{right}</View>; }

function Camera({ visible, onClose, onError }: { visible: boolean; onClose: () => void; onError: (x: string) => void }) {
  const [cameraPermission, askCamera] = useCameraPermissions();
  const [micPermission, askMic] = useMicrophonePermissions();
  const [mode, setMode] = useState<'picture' | 'video'>('picture');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [cameraReady, setCameraReady] = useState(false);
  const [lenses, setLenses] = useState<string[]>([]);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);
  const [focus, setFocus] = useState<{ x: number; y: number; bias: number } | null>(null);
  const frameSize = useRef({ width: 1, height: 1 });
  const focusStart = useRef({ pageY: 0, bias: 0 });
  const camera = useRef<CameraView>(null);
  const photoRef = useRef<View>(null);
  const recordingRef = useRef(false);
  const interruptedRef = useRef(false);
  const nextModeRef = useRef<'picture' | 'video' | null>(null);
  const sessionRef = useRef(0);
  const visibleRef = useRef(visible);
  const appActiveRef = useRef(appActive);
  const cameraGenerationRef = useRef(0);
  useEffect(() => {
    visibleRef.current = visible;
    if (visible) { askCamera(); askMic(); }
    else {
      sessionRef.current += 1;
      cameraGenerationRef.current += 1;
      interruptedRef.current = true;
      camera.current?.stopRecording();
      recordingRef.current = false;
      nextModeRef.current = null;
      setPhoto(null);
      setRecording(false);
      setCameraReady(false);
      setBusy(false);
      setFocus(null);
    }
  }, [visible]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      const active = state === 'active';
      appActiveRef.current = active;
      if (!active && recordingRef.current) {
        interruptedRef.current = true;
        camera.current?.stopRecording();
      }
      if (!active) {
        cameraGenerationRef.current += 1;
        setCameraReady(false);
      }
      setAppActive(active);
    });
    return () => subscription.remove();
  }, []);
  function changeMode(next: 'picture' | 'video') {
    if (next === mode || busy) return;
    if (recordingRef.current) {
      nextModeRef.current = next;
      camera.current?.stopRecording();
      return;
    }
    cameraGenerationRef.current += 1;
    setCameraReady(false);
    setFocus(null);
    setMode(next);
  }
  function closeCamera() {
    sessionRef.current += 1;
    cameraGenerationRef.current += 1;
    visibleRef.current = false;
    interruptedRef.current = true;
    camera.current?.stopRecording();
    onClose();
  }
  async function saveMedia(uri: string) {
    if (Platform.OS === 'android') {
      let permission = await MediaLibrary.getPermissionsAsync(true);
      if (!permission.granted) permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) throw new Error('Allow media access to save this capture.');
    }
    await MediaLibrary.saveToLibraryAsync(uri);
  }
  async function shoot() {
    if (!camera.current || !appActive || busy) return;
    const session = sessionRef.current;
    try {
      if (mode === 'picture') {
        if (!cameraReady) return;
        setBusy(true);
        const result = await camera.current.takePictureAsync({ quality: 1 });
        if (result && session === sessionRef.current) setPhoto(result.uri);
        if (session === sessionRef.current) setBusy(false);
      }
      else if (recordingRef.current) camera.current.stopRecording();
      else {
        if (!cameraReady) return;
        recordingRef.current = true;
        interruptedRef.current = false;
        setRecording(true);
        let result: Awaited<ReturnType<CameraView['recordAsync']>>;
        try { result = await camera.current.recordAsync(); }
        catch (e) {
          if (!interruptedRef.current && !nextModeRef.current && session === sessionRef.current) onError(e instanceof Error ? e.message : 'Camera failed');
          return;
        }
        finally {
          recordingRef.current = false;
          if (session === sessionRef.current) setRecording(false);
          if (nextModeRef.current && session === sessionRef.current) {
            cameraGenerationRef.current += 1;
            setCameraReady(false);
            setMode(nextModeRef.current);
            nextModeRef.current = null;
          }
        }
        if (result?.uri && !interruptedRef.current && session === sessionRef.current) {
          setBusy(true);
          try {
            const uri = await brandVideo(result.uri);
            await saveMedia(uri);
            if (session === sessionRef.current) Alert.alert('Saved', 'Branded video is in Photos.');
          } catch (e) { if (session === sessionRef.current) Alert.alert('Could not save video', e instanceof Error ? e.message : 'Could not save video.'); }
          finally { if (session === sessionRef.current) setBusy(false); }
        }
        else if (!interruptedRef.current && !nextModeRef.current && session === sessionRef.current) onError('The camera did not produce a video. Try recording again.');
      }
    } catch (e) { if (session === sessionRef.current) { setBusy(false); if (appActiveRef.current && visibleRef.current) onError(e instanceof Error ? e.message : 'Camera failed'); } }
  }
  async function outputPhoto(share: boolean) {
    if (!photo || (Platform.OS !== 'ios' && !photoRef.current)) return;
    const session = sessionRef.current;
    setBusy(true);
    try {
      const uri = Platform.OS === 'ios'
        ? await brandPhoto(photo, frameSize.current.width / frameSize.current.height)
        : await captureRef(photoRef.current!, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1440 });
      if (share) await Sharing.shareAsync(uri, { mimeType: Platform.OS === 'ios' ? 'image/jpeg' : 'image/png', UTI: Platform.OS === 'ios' ? 'public.jpeg' : 'public.png' });
      else { await saveMedia(uri); if (session === sessionRef.current) Alert.alert('Saved', 'Branded photo is in Photos.'); }
      if (session === sessionRef.current) setPhoto(null);
    } catch (e) { if (session === sessionRef.current) onError(e instanceof Error ? e.message : 'Could not save photo'); }
    finally { if (session === sessionRef.current) setBusy(false); }
  }
  function focusAt(x: number, y: number, pageY: number) {
    if (!cameraReady || busy || photo) return;
    const px = Math.max(0, Math.min(frameSize.current.width, x));
    const py = Math.max(0, Math.min(frameSize.current.height, y));
    focusStart.current = { pageY, bias: 0 };
    setFocus({ x: px, y: py, bias: 0 });
    if (Platform.OS === 'ios') focusCamera(px / frameSize.current.width, py / frameSize.current.height).catch(() => {});
  }
  function adjustExposure(pageY: number) {
    if (!focus) return;
    const bias = Math.max(-2, Math.min(2, focusStart.current.bias + (focusStart.current.pageY - pageY) / 90));
    setFocus({ ...focus, bias });
    if (Platform.OS === 'ios') setCameraExposure(bias).catch(() => {});
  }
  function lensLabel(lens: string, index: number) {
    const name = lens.toLowerCase();
    if (name.includes('ultra wide')) return '0.5×';
    if (name.includes('telephoto')) return 'TELE';
    if (name.includes('wide')) return '1×';
    return `${index + 1}`;
  }
  const cameraGeneration = cameraGenerationRef.current;
  const physicalLenses = lenses.filter(lens => !/dual|triple|lidar|depth/i.test(lens));
  const shownLenses = physicalLenses.length ? physicalLenses : lenses;
  return <Modal visible={visible} animationType="slide" onRequestClose={closeCamera}>
    <SafeAreaProvider><SafeAreaView style={st.cameraScreen}>
      <View style={st.cameraFrame} onLayout={event => { frameSize.current = event.nativeEvent.layout; }}>
        {!cameraPermission?.granted ? <View style={st.cameraEmpty}><Icon name="camera-outline" size={42} color={c.lime}/><Text style={st.emptyTitle}>ALLOW CAMERA ACCESS</Text></View>
          : photo ? <View ref={photoRef} collapsable={false} style={{ flex: 1 }}><Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover"/><View style={st.watermark}><Watermark/></View></View>
          : appActive && visible ? <>
            <CameraView key={`${mode}-${facing}-${cameraGeneration}`} ref={camera} style={{ flex: 1 }} mode={mode} facing={facing} selectedLens={Platform.OS === 'ios' && facing === 'back' ? selectedLens : undefined} mirror={facing === 'front'} mute={!micPermission?.granted}
              onAvailableLensesChanged={event => { if (cameraGeneration !== cameraGenerationRef.current || facing !== 'back') return; setLenses(event.lenses); setSelectedLens(current => event.lenses.includes(current ?? '') ? current : event.lenses.find(lens => /wide/i.test(lens) && !/ultra|dual|triple/i.test(lens)) ?? event.lenses[0]); }}
              onCameraReady={() => { if (cameraGeneration === cameraGenerationRef.current && appActiveRef.current && visibleRef.current) setCameraReady(true); }}
              onMountError={event => { if (cameraGeneration === cameraGenerationRef.current && appActiveRef.current && visibleRef.current) onError(event.message); }}/>
            <View style={st.focusSurface} onStartShouldSetResponder={() => true}
              onResponderGrant={event => focusAt(event.nativeEvent.locationX, event.nativeEvent.locationY, event.nativeEvent.pageY)}
              onResponderMove={event => adjustExposure(event.nativeEvent.pageY)}/>
            {focus && <View pointerEvents="none" style={[st.focusRing, { left: focus.x - 27, top: focus.y - 27 }]}><View style={[st.exposureMeter, { height: Math.max(2, 20 + focus.bias * 9) }]}/></View>}
            <View pointerEvents="none" style={st.watermark}><Watermark/></View>
            {facing === 'back' && shownLenses.length > 1 && <View style={st.lensRow}>{shownLenses.map((lens, index) => <Pressable key={lens} accessibilityRole="button" accessibilityLabel={`Select ${lens}`} disabled={busy || recording || !cameraReady} onPress={() => { setSelectedLens(lens); setFocus(null); }} style={[st.lensButton, lens === selectedLens && st.lensButtonActive]}><Text style={[st.lensText, lens === selectedLens && { color: c.bg }]}>{lensLabel(lens, index)}</Text></Pressable>)}</View>}
          </> : <View style={st.cameraEmpty}/>}
        <Pressable accessibilityRole="button" accessibilityLabel="Close camera" hitSlop={8} onPress={closeCamera} style={st.cameraClose}><Icon name="close" size={26}/></Pressable>
      </View>
      <Text style={st.cameraNote}>{mode === 'video' ? `${micPermission?.granted ? 'Microphone audio is recorded.' : 'Enable microphone access to record audio.'} Saved videos include the RUNRUN logo.` : 'Saved photos include the RUNRUN logo.'}</Text>
      {photo ? <View style={st.cameraActions}><Pressable onPress={() => setPhoto(null)}><Text style={st.cameraAction}>RETAKE</Text></Pressable><Pressable onPress={() => outputPhoto(false)}><Text style={st.cameraAction}>SAVE</Text></Pressable><Pressable onPress={() => outputPhoto(true)}><Text style={st.cameraAction}>SHARE</Text></Pressable></View>
        : <><View style={st.modeRow}><Pressable onPress={() => changeMode('picture')}><Text style={[st.modeText, mode === 'picture' && { color: c.lime }]}>PHOTO</Text></Pressable><Pressable onPress={() => changeMode('video')}><Text style={[st.modeText, mode === 'video' && { color: c.lime }]}>VIDEO</Text></Pressable></View>
          <View style={st.cameraControls}><Pressable disabled={busy || (!recording && !cameraReady)} onPress={shoot} style={[st.shutter, recording && { borderColor: c.red }]}><View style={[st.shutterInner, recording && { backgroundColor: c.red, borderRadius: 6, width: 27, height: 27 }]}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Switch camera" disabled={busy || recording || !cameraPermission?.granted} onPress={() => { cameraGenerationRef.current += 1; setCameraReady(false); setLenses([]); setSelectedLens(undefined); setFocus(null); setFacing(current => current === 'back' ? 'front' : 'back'); }} style={[st.flipCamera, (busy || recording) && { opacity: 0.45 }]}><Icon name="camera-reverse-outline" size={25}/></Pressable></View></>}
      {busy && <ActivityIndicator color={c.lime}/>}
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}

function Main() {
  const [tab, setTab] = useState<Tab>('RUN');
  const [active, setActiveRun] = useState<Run | null>(null);
  const [history, setHistory] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [cropStart, setCropStart] = useState(0);
  const [cropEnd, setCropEnd] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);
  const [shareRun, setShareRun] = useState<Run | null>(null);
  const [stopDialog, setStopDialog] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trackingMode, setTrackingMode] = useState<'background' | 'foreground' | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const watch = useRef<Location.LocationSubscription | null>(null);
  const shareRef = useRef<View>(null);
  useEffect(() => { (async () => { const run = await getActive(); setActiveRun(run); setHistory(await getHistory()); if (run) { const background = await Location.hasStartedLocationUpdatesAsync('runrun.location.v1').catch(() => false); setTrackingMode(background ? 'background' : 'foreground'); if (!background) { const permission = await Location.getForegroundPermissionsAsync(); if (permission.granted) watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3 }, async loc => addLocations([loc])); } } })(); }, []);
  useEffect(() => { const id = setInterval(async () => { setNow(Date.now()); setActiveRun(await getActive()); }, 1000); return () => clearInterval(id); }, []);
  const current = active ? stats(active, now) : null;
  const original = selected ? originalRun(selected) : null;
  const draft = selected ? cropRun(selected, cropStart, cropEnd) : null;
  const draftStats = draft ? stats(draft) : null;
  function openRun(run: Run) {
    setSelected(run);
    setCropStart(run.startedAt);
    setCropEnd(run.endedAt ?? Date.now());
    setScrubTime(run.startedAt);
  }
  async function saveCrop() {
    if (!draft) return;
    try {
      await updateRun(draft);
      setHistory(await getHistory());
      setSelected(draft);
      Alert.alert('Crop saved', 'Run stats and exports now use this segment.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save crop'); }
  }
  async function start() {
    setBusy(true); setError('');
    try {
      const run: Run = { id: String(Date.now()), startedAt: Date.now(), points: [] };
      await setActive(run);
      const mode = await startTracking(); setTrackingMode(mode);
      if (mode === 'foreground') watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3 }, async loc => addLocations([loc]));
      setActiveRun(run);
    } catch (e) { await setActive(null); setError(e instanceof Error ? e.message : 'Could not start GPS'); } finally { setBusy(false); }
  }
  async function finish(discard = false) {
    setBusy(true);
    try {
      watch.current?.remove(); watch.current = null; await stopTracking();
      const run = await getActive();
      if (run && !discard) { const done = { ...run, endedAt: Date.now() }; await saveRun(done); setHistory(await getHistory()); }
      await setActive(null); setActiveRun(null); setStopDialog(false); setTrackingMode(null);
      if (!discard && run) setTab('HISTORY');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not finish run'); } finally { setBusy(false); }
  }
  async function share(run: Run, save = false) {
    setShareRun(run);
    setTimeout(async () => { try { if (shareRef.current) { const uri = await captureRef(shareRef.current, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1440 }); if (save) { await MediaLibrary.saveToLibraryAsync(uri); Alert.alert('Saved', 'Transparent route PNG is in Photos.'); } else await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' }); } } catch (e) { Alert.alert('Could not export route', e instanceof Error ? e.message : 'Could not export route'); } finally { setShareRun(null); } }, 200);
  }
  return <SafeAreaView style={st.safe} edges={['top', 'bottom']}><StatusBar barStyle="light-content" backgroundColor={c.bg}/><View style={st.topbar}><Brand/><Pressable style={st.cameraButton} onPress={() => setCameraOpen(true)}><Icon name="camera-outline"/></Pressable></View>
    <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      {tab === 'RUN' && <><View style={st.hero}><Text style={st.kicker}>THE ROAD IS YOURS  /  001</Text><Text style={st.heroTitle}>CHASE THE<Text style={{ color: c.lime }}> NEXT</Text>{'\n'}VERSION OF YOU.</Text><Text style={st.heroSub}>Record every stride. Own every mile.</Text></View>{active && active.points.length ? <RunMap original={active} selected={active} time={active.points.at(-1)!.timestamp} height={226}/> : <Route run={active}/>}<View style={{ height: 24 }}/><Section kicker={active ? 'SESSION IN PROGRESS' : 'READY WHEN YOU ARE'} title={active ? 'Live activity' : 'Your dashboard'} right={<View style={st.gpsBadge}><View style={st.dot}/><Text style={st.gpsText}>{active ? trackingMode === 'background' ? 'GPS ON' : 'GPS · OPEN APP' : 'GPS READY'}</Text></View>}/>{active && current ? <><View style={st.tiles}><Tile label="DISTANCE" value={km(current.distance)} unit="KM" icon="navigate-outline" accent/><Tile label="DURATION" value={clock(current.seconds)} unit="" icon="time-outline"/><Tile label="CURRENT SPEED" value={kph(current.currentSpeed)} unit="KM/H" icon="speedometer-outline"/><Tile label="ELEVATION GAIN" value={String(Math.round(current.ascent))} unit="M" icon="trending-up-outline"/></View><View style={st.strip}><View><Label>AVG SPEED</Label><Text style={st.stripNum}>{kph(current.avgSpeed)} <Text style={st.stripUnit}>KM/H</Text></Text></View><View><Label>MAX SPEED</Label><Text style={st.stripNum}>{kph(current.maxSpeed)} <Text style={st.stripUnit}>KM/H</Text></Text></View><View><Label>DESCENT</Label><Text style={st.stripNum}>{Math.round(current.descent)} <Text style={st.stripUnit}>M</Text></Text></View></View></> : <View style={st.summary}><View><Label>TOTAL DISTANCE</Label><Text style={st.summaryNum}>{km(history.reduce((n, r) => n + stats(r).distance, 0))}<Text style={st.summaryUnit}> KM</Text></Text></View><View style={st.summaryDivider}/><View><Label>RUNS DONE</Label><Text style={st.summaryNum}>{String(history.length).padStart(2, '0')}</Text></View></View>}{!!error && <Text style={st.error}>{error}</Text>}<View style={{ height: 100 }}/></>}
      {tab === 'HISTORY' && <><Section kicker="THE WORK YOU PUT IN" title="Run history"/>{history.length ? history.map((r, i) => { const x = stats(r); return <Pressable key={r.id} style={st.historyCard} onPress={() => openRun(r)}><View style={st.historyIndex}><Text style={st.historyIndexText}>{String(history.length - i).padStart(2, '0')}</Text></View><View style={{ flex: 1 }}><Text style={st.historyTitle}>{new Date(r.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} RUN</Text><Text style={st.historyMeta}>{km(x.distance)} KM  ·  {clock(x.seconds)}  ·  +{Math.round(x.ascent)} M</Text></View><Icon name="chevron-forward" color={c.muted}/></Pressable>; }) : <View style={st.empty}><Icon name="footsteps-outline" size={44} color={c.lime}/><Text style={st.emptyTitle}>NO RUNS YET</Text><Text style={st.emptyDetail}>Start your first activity to see it here.</Text></View>}<View style={{ height: 90 }}/></>}
      {tab === 'AWARDS' && <Awards runs={history}/>}
    </ScrollView>
    {tab === 'RUN' && <View style={st.actionWrap}><Pressable disabled={busy} style={[st.startButton, active && { backgroundColor: c.red }]} onPress={() => active ? setStopDialog(true) : start()}>{busy ? <ActivityIndicator color={c.bg}/> : <><Icon name={active ? 'stop' : 'play'} color={c.bg} size={25}/><Text style={st.startText}>{active ? 'STOP RUN' : 'START RUN'}</Text><Icon name="arrow-forward" color={c.bg}/></>}</Pressable></View>}
    <View style={st.tabbar}>{(['RUN', 'HISTORY', 'AWARDS'] as Tab[]).map(t => <Pressable key={t} style={st.tab} onPress={() => setTab(t)}><Icon name={t === 'RUN' ? 'pulse-outline' : t === 'HISTORY' ? 'albums-outline' : 'trophy-outline'} color={t === tab ? c.lime : c.muted}/><Text style={[st.tabText, t === tab && { color: c.lime }]}>{t}</Text></Pressable>)}</View>
    <StopDialog visible={stopDialog} busy={busy} onClose={() => setStopDialog(false)} onFinish={() => finish()} onDiscard={() => finish(true)}/>
    <Modal visible={!!selected} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelected(null)}>
      <SafeAreaProvider><SafeAreaView style={st.safe} edges={['top', 'bottom']}>
        <View style={st.detailTop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to run history" style={st.detailHeaderButton} onPress={() => setSelected(null)}><Icon name="arrow-back" size={24}/></Pressable>
          <Brand size={24}/>
          <Pressable accessibilityRole="button" accessibilityLabel="Share run" style={st.detailHeaderButton} onPress={() => draft && share(draft)}><Icon name="share-outline" size={24}/></Pressable>
        </View>
        {selected && original && draft && draftStats && <ScrollView contentContainerStyle={st.detailContent}>
          <Text style={st.kicker}>ACTIVITY RECAP</Text><Text style={st.detailTitle}>THE RUN{'\n'}IS YOURS.</Text>
          {original.points.length ? <RunMap original={original} selected={draft} time={scrubTime} height={280}/> : <Route run={draft} height={260}/>}
          <View style={st.cropCard}>
            <View style={st.cropRow}><Text style={st.cropTitle}>CROP YOUR RUN</Text><Text style={st.cropTime}>{clock((scrubTime - original.startedAt) / 1000)} / {clock(((original.endedAt ?? original.startedAt) - original.startedAt) / 1000)}</Text></View>
            <Text style={st.cropHint}>Drag to inspect your position, then set the start and finish.</Text>
            <Slider accessibilityLabel="Run timeline" minimumValue={original.startedAt} maximumValue={original.endedAt ?? original.startedAt + 1} value={scrubTime}
              onValueChange={setScrubTime} minimumTrackTintColor={c.lime} maximumTrackTintColor={c.line} thumbTintColor={c.lime}/>
            <View style={st.cropRangeTrack}><View style={[st.cropRangeFill, {
              left: `${100 * (cropStart - original.startedAt) / Math.max(1, (original.endedAt ?? original.startedAt) - original.startedAt)}%`,
              width: `${100 * (cropEnd - cropStart) / Math.max(1, (original.endedAt ?? original.startedAt) - original.startedAt)}%`,
            }]}/></View>
            <View style={st.cropRow}><Text style={st.cropBoundary}>START  {clock((cropStart - original.startedAt) / 1000)}</Text><Text style={st.cropBoundary}>FINISH  {clock((cropEnd - original.startedAt) / 1000)}</Text></View>
            <View style={st.cropActions}>
              <Pressable style={st.cropAction} onPress={() => setCropStart(Math.max(original.startedAt, Math.min(scrubTime, cropEnd - Math.min(1000, (original.endedAt ?? original.startedAt) - original.startedAt))))}><Text style={st.cropActionText}>SET START HERE</Text></Pressable>
              <Pressable style={st.cropAction} onPress={() => setCropEnd(Math.min(original.endedAt ?? original.startedAt, Math.max(scrubTime, cropStart + Math.min(1000, (original.endedAt ?? original.startedAt) - original.startedAt))))}><Text style={st.cropActionText}>SET FINISH HERE</Text></Pressable>
            </View>
            <View style={st.cropRow}>
              <Pressable onPress={() => { setCropStart(original.startedAt); setCropEnd(original.endedAt ?? original.startedAt); setScrubTime(original.startedAt); }}><Text style={st.cropReset}>RESET TO FULL RUN</Text></Pressable>
              <Pressable disabled={cropStart === selected.startedAt && cropEnd === selected.endedAt} onPress={saveCrop}><Text style={[st.cropSave, cropStart === selected.startedAt && cropEnd === selected.endedAt && { opacity: 0.4 }]}>SAVE CROP</Text></Pressable>
            </View>
          </View>
          <View style={st.tiles}>
            <Tile label="DISTANCE" value={km(draftStats.distance)} unit="KM" icon="navigate-outline" accent/>
            <Tile label="DURATION" value={clock(draftStats.seconds)} unit="" icon="time-outline"/>
            <Tile label="AVG SPEED" value={kph(draftStats.avgSpeed)} unit="KM/H" icon="speedometer-outline"/>
            <Tile label="ELEVATION GAIN" value={String(Math.round(draftStats.ascent))} unit="M" icon="trending-up-outline"/>
          </View>
          <Trends run={draft}/>
          <Pressable style={st.shareButton} onPress={() => share(draft, true)}><Icon name="download-outline" color={c.bg}/><Text style={st.shareText}>SAVE TRANSPARENT ROUTE PNG</Text></Pressable>
          <Pressable style={st.gpxButton} onPress={() => share(draft)}><Icon name="share-social-outline" color={c.white}/><Text style={st.gpxText}>SHARE ROUTE PNG</Text></Pressable>
          <Pressable style={st.gpxButton} onPress={() => exportGpx(draft).catch(e => setError(e instanceof Error ? e.message : 'Could not export GPX'))}><Icon name="download-outline" color={c.white}/><Text style={st.gpxText}>EXPORT GPX DATA</Text></Pressable>
        </ScrollView>}
      </SafeAreaView></SafeAreaProvider>
    </Modal>
    <Camera visible={cameraOpen} onClose={() => setCameraOpen(false)} onError={setError}/>
    {shareRun && <View pointerEvents="none" style={st.offscreen}><View ref={shareRef} collapsable={false} style={st.shareCanvas}><Brand size={43}/><Text style={st.shareKicker}>RUN DATA / {new Date(shareRun.startedAt).toLocaleDateString()}</Text><Route run={shareRun} height={260} transparent/><View style={st.shareGrid}>{[['DURATION', clock(stats(shareRun).seconds)], ['DISTANCE', km(stats(shareRun).distance) + ' KM'], ['AVG SPEED', kph(stats(shareRun).avgSpeed) + ' KM/H'], ['ELEVATION GAIN', '+' + Math.round(stats(shareRun).ascent) + ' M']].map(([key, value]) => <View key={key} style={st.shareItem}><Text style={st.shareLabel}>{key}</Text><Text style={st.shareValue}>{value}</Text></View>)}</View><Text style={st.shareFoot}>MOVE DIFFERENT.  /  RUNRUN</Text></View></View>}
  </SafeAreaView>;
}

export default function App() { return <SafeAreaProvider><Main/></SafeAreaProvider>; }
