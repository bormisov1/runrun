import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Linking, Modal, Platform, Pressable, ScrollView, StatusBar, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { clock, cropRun, km, pace, originalRun, Point, routePath, Run, stats } from './src/run';
import { getRecentPoints, isRecentEnabled, setRecentEnabled, addLocations, getActive, getHistory, getArchivedHistory, saveRun, setActive, setRunArchived, startTracking, stopTracking, updateRun } from './src/tracking';
import { recentActivity, RECENT_WINDOW_MS, retainRecentPoints } from './src/recent';
import { brandPhoto, brandVideo, focusCamera, setCameraExposure } from './src/videoBrand';
import { c, st } from './src/styles';
import { Trends } from './src/Trends';
import { exportGpx } from './src/export';
import { StopDialog } from './src/StopDialog';
import { Awards } from './src/Awards';
import { RunMap } from './src/RunMap';
import { RunTrimmer } from './src/RunTrimmer';
import { RunPlayhead } from './src/RunPlayhead';
import { ActivityRow } from './src/ActivityRow';
import { DEFAULT_EXPORT_STYLE, EXPORT_STYLES, ExportArtwork, findExportStyle, loadDefaultExportStyle, saveDefaultExportStyle } from './src/exportStyles';

type Tab = 'RUN' | 'HISTORY' | 'AWARDS';
const PRIVACY_URL = 'https://bormisov.com/runrun/privacy.html';
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

function StyleChoices({ title, selected, run, onChoose, onClose }: { title: string; selected: string; run: Run; onChoose: (id: string) => void; onClose: () => void }) {
  return <><View style={st.detailTop}><Text style={st.sectionTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close style choices" onPress={onClose}><Icon name="close" size={28}/></Pressable></View>
    <ScrollView contentContainerStyle={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 40 }}>
      {EXPORT_STYLES.map(style => <Pressable key={style.id} accessibilityRole="button" accessibilityLabel={`Select ${style.name}`} accessibilityState={{ selected: style.id === selected }} onPress={() => onChoose(style.id)} style={{ width: '48%', marginBottom: 14, backgroundColor: c.panel, borderWidth: 2, borderColor: style.id === selected ? c.lime : c.line, borderRadius: 14, overflow: 'hidden' }}>
        <View style={{ backgroundColor: '#374148', alignItems: 'center', overflow: 'hidden' }}><ExportArtwork run={run} styleId={style.id} width={145} height={193}/></View>
        <View style={{ padding: 10 }}><Text style={{ color: c.lime, fontSize: 10, fontWeight: '900' }}>{style.id} / {style.family}</Text><Text style={{ color: c.white, fontSize: 13, fontWeight: '900', marginTop: 3 }}>{style.name}</Text></View>
      </Pressable>)}
    </ScrollView></>;
}

function Camera({ visible, onClose, onError }: { visible: boolean; onClose: () => void; onError: (x: string) => void }) {
  const [cameraPermission, askCamera] = useCameraPermissions();
  const [micPermission, askMic] = useMicrophonePermissions();
  const [mode, setMode] = useState<'picture' | 'video'>('picture');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
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
      // Control Center temporarily reports "inactive" while the camera can keep recording.
      const active = state !== 'background';
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
            const uri = Platform.OS === 'ios' ? await brandVideo(result.uri) : result.uri;
            await saveMedia(uri);
            if (session === sessionRef.current) Alert.alert('Saved', Platform.OS === 'ios' ? 'Branded video is in Photos.' : 'Video is in Photos.');
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
        ? await brandPhoto(photo)
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
      <Text style={st.cameraNote}>{mode === 'video' ? `${micPermission?.granted ? 'Microphone audio is recorded.' : 'Enable microphone access to record audio.'}${Platform.OS === 'ios' ? ' Saved videos include the RUNRUN logo.' : ''}` : 'Saved photos include the RUNRUN logo.'}</Text>
      {photo ? <View style={st.cameraActions}><Pressable disabled={busy} onPress={() => setPhoto(null)}><Text style={st.cameraAction}>RETAKE</Text></Pressable><Pressable disabled={busy} onPress={() => outputPhoto(false)}><Text style={st.cameraAction}>SAVE</Text></Pressable><Pressable disabled={busy} onPress={() => outputPhoto(true)}><Text style={st.cameraAction}>SHARE</Text></Pressable></View>
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
  const [archivedHistory, setArchivedHistory] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [cropStart, setCropStart] = useState(0);
  const [cropEnd, setCropEnd] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);
  const [shareRun, setShareRun] = useState<Run | null>(null);
  const [exportStyle, setExportStyle] = useState(DEFAULT_EXPORT_STYLE);
  const [defaultExportStyle, setDefaultExportStyle] = useState(DEFAULT_EXPORT_STYLE);
  const [stylePicker, setStylePicker] = useState<'export' | 'default' | null>(null);
  const [stopDialog, setStopDialog] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [trackingMode, setTrackingMode] = useState<'background' | 'foreground' | null>(null);
  const [recentEnabled, setRecentEnabledState] = useState(true);
  const [recentPoints, setRecentPoints] = useState<Point[]>([]);
  const [recentMode, setRecentMode] = useState<'background' | 'foreground' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [recentStart, setRecentStart] = useState(0);
  const [recentEnd, setRecentEnd] = useState(0);
  const [recentPreview, setRecentPreview] = useState(0);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const watch = useRef<Location.LocationSubscription | null>(null);
  const shareRef = useRef<View>(null);
  useEffect(() => { loadDefaultExportStyle().then(id => { setDefaultExportStyle(id); setExportStyle(id); }).catch(e => setError(String(e))); }, []);
  async function ensureForegroundWatch() {
    if (!watch.current) watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10 }, loc => { addLocations([loc]).catch(e => setError(String(e))); });
  }
  async function beginLocation(allowBackground = true) {
    const mode = await startTracking(allowBackground);
    if (mode === 'foreground') await ensureForegroundWatch();
    else { watch.current?.remove(); watch.current = null; }
    return mode;
  }
  useEffect(() => { (async () => {
    const run = await getActive();
    const enabled = await isRecentEnabled();
    setActiveRun(run); await refreshHistory(); setRecentEnabledState(enabled);
    setRecentPoints(await getRecentPoints());
    if (!run && !enabled) return;
    try {
      let allowBackground = true;
      if (enabled && Platform.OS === 'android') {
        const permission = await Location.getBackgroundPermissionsAsync();
        if (!permission.granted) {
          const agreed = await new Promise<boolean>(resolve => Alert.alert('24-hour location history',
            'RUNRUN saves your location in the background, even when the app is closed, so you can create an activity from any part of the last 24 hours. Old points are deleted automatically. Turn this off in Settings at any time.',
            [{ text: 'Turn off', onPress: () => resolve(false) }, { text: 'Continue', onPress: () => resolve(true) }], { cancelable: false }));
          if (!agreed) { await setRecentEnabled(false); setRecentEnabledState(false); if (!run) return; allowBackground = false; }
        }
      }
      const mode = await beginLocation(allowBackground);
      if (run) setTrackingMode(mode);
      if (enabled && allowBackground) setRecentMode(mode);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start location history'); }
  })(); }, []);
  useEffect(() => { const id = setInterval(async () => { setNow(Date.now()); setActiveRun(await getActive()); }, 1000); return () => clearInterval(id); }, []);
  useEffect(() => { const refresh = () => getRecentPoints().then(setRecentPoints).catch(e => setError(String(e)));
    const id = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(id); subscription.remove(); watch.current?.remove(); };
  }, []);
  const current = active ? stats(active, now) : null;
  const original = useMemo(() => selected ? originalRun(selected) : null, [selected]);
  const draft = useMemo(() => selected ? cropRun(selected, cropStart, cropEnd) : null, [selected, cropStart, cropEnd]);
  const draftStats = useMemo(() => draft ? stats(draft) : null, [draft]);
  const previewTime = Math.max(cropStart, Math.min(scrubTime, cropEnd));
  const availableRecent = useMemo(() => retainRecentPoints(recentPoints, now), [recentPoints, now]);
  const recentSource: Run | null = availableRecent.length >= 2 ? { id: 'recent-preview', startedAt: availableRecent[0].timestamp, endedAt: availableRecent.at(-1)!.timestamp, points: availableRecent } : null;
  const recentDraft = recentSource ? recentActivity(availableRecent, recentStart, recentEnd, now) : null;
  async function refreshHistory() {
    setHistory(await getHistory());
    setArchivedHistory(await getArchivedHistory());
  }
  async function changeArchiveState(id: string, archived: boolean) {
    try {
      await setRunArchived(id, archived);
      await refreshHistory();
    } catch (e) { Alert.alert(archived ? 'Could not archive activity' : 'Could not unarchive activity', e instanceof Error ? e.message : String(e)); }
  }
  function closeSettings() { setArchiveOpen(false); setSettingsOpen(false); }
  async function toggleRecent(enabled: boolean) {
    setBusy(true); setError('');
    try {
      if (enabled) {
        await setRecentEnabled(true);
        let mode: 'background' | 'foreground';
        try { mode = await beginLocation(); }
        catch (e) { await setRecentEnabled(false); throw e; }
        setRecentMode(mode); setRecentEnabledState(true);
      } else {
        await setRecentEnabled(false);
        setRecentEnabledState(false); setRecentPoints([]); setRecentOpen(false); setRecentMode(null);
        if (!active) { watch.current?.remove(); watch.current = null; await stopTracking(); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not change location setting'); }
    finally { setBusy(false); }
  }
  async function openRecent() {
    try {
      const points = await getRecentPoints();
      setRecentPoints(points);
      if (points.length < 2) return;
      setRecentStart(points[0].timestamp); setRecentEnd(points.at(-1)!.timestamp);
      setRecentPreview(points[0].timestamp); setRecentOpen(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open recent locations'); }
  }
  async function createRecent() {
    setBusy(true);
    try {
      const points = await getRecentPoints();
      const run = recentActivity(points, recentStart, recentEnd);
      if (!run) throw new Error('This fragment is no longer within the last 24 hours. Select a newer fragment.');
      await saveRun(run);
      await refreshHistory(); setRecentOpen(false); setTab('HISTORY'); openRun(run);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create activity'); }
    finally { setBusy(false); }
  }
  function openRun(run: Run) {
    setSelected(run);
    setExportStyle(defaultExportStyle);
    setCropStart(run.startedAt);
    setCropEnd(run.endedAt ?? Date.now());
    setScrubTime(run.startedAt);
  }
  async function saveCrop() {
    if (!draft) return;
    try {
      await updateRun(draft);
      await refreshHistory();
      setSelected(draft);
      Alert.alert('Crop saved', 'Run stats and exports now use this segment.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save crop'); }
  }
  async function start() {
    const allowBackground = Platform.OS === 'android' && !recentEnabled ? await new Promise<boolean | null>(resolve => {
      Alert.alert(
        'Location during a run',
        'RUNRUN collects location data to record your route, distance and speed during an active run, even when the app is closed or not in use. Your routes stay on this device. Choose "Keep recording" for background tracking, or "While open" to record only while RUNRUN is open.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'While open', onPress: () => resolve(false) },
          { text: 'Keep recording', onPress: () => resolve(true) },
        ],
        { cancelable: false },
      );
    }) : true;
    if (allowBackground === null) return;
    setBusy(true); setError('');
    try {
      const run: Run = { id: String(Date.now()), startedAt: Date.now(), points: [] };
      await setActive(run);
      const mode = await beginLocation(allowBackground); setTrackingMode(mode);
      setActiveRun(run);
    } catch (e) { await setActive(null); setError(e instanceof Error ? e.message : 'Could not start GPS'); } finally { setBusy(false); }
  }
  async function finish(discard = false) {
    setBusy(true);
    try {
      if (!recentEnabled) { watch.current?.remove(); watch.current = null; }
      await stopTracking();
      const run = await getActive();
      if (run && !discard) { const done = { ...run, endedAt: Date.now() }; await saveRun(done); await refreshHistory(); }
      await setActive(null); setActiveRun(null); setStopDialog(false); setTrackingMode(null);
      if (!discard && run) setTab('HISTORY');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not finish run'); } finally { setBusy(false); }
  }
  async function share(run: Run, save = false) {
    setShareRun(run);
    setTimeout(async () => { try { if (shareRef.current) { const uri = await captureRef(shareRef.current, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1440 }); if (save) { await MediaLibrary.saveToLibraryAsync(uri); Alert.alert('Saved', 'Transparent route PNG is in Photos.'); } else await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' }); } } catch (e) { Alert.alert('Could not export route', e instanceof Error ? e.message : 'Could not export route'); } finally { setShareRun(null); } }, 200);
  }
  function chooseExportStyle(id: string) {
    setExportStyle(id);
    if (stylePicker === 'default') {
      setDefaultExportStyle(id);
      saveDefaultExportStyle(id).catch(e => setError(String(e)));
    }
    setStylePicker(null);
  }
  return <SafeAreaView style={st.safe} edges={['top', 'bottom']}><StatusBar barStyle="light-content" backgroundColor={c.bg}/><View style={st.topbar}><Brand/><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => setSettingsOpen(true)}><Icon name="settings-outline"/></Pressable><Pressable accessibilityRole="link" accessibilityLabel="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL).catch(() => Alert.alert('Could not open privacy policy', PRIVACY_URL))}><Text style={{ color: c.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>PRIVACY</Text></Pressable><Pressable style={st.cameraButton} onPress={() => setCameraOpen(true)}><Icon name="camera-outline"/></Pressable></View></View>
    <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
      {tab === 'RUN' && <><View style={st.hero}><Text style={st.kicker}>THE ROAD IS YOURS  /  001</Text><Text style={st.heroTitle}>CHASE THE<Text style={{ color: c.lime }}> NEXT</Text>{'\n'}VERSION OF YOU.</Text><Text style={st.heroSub}>Record every stride. Own every mile.</Text></View>{(active?.points.length || (!active && history[0]?.points.length)) ? (() => { const shown = active?.points.length ? active : history[0]; return <RunMap original={shown} selected={shown} time={shown.points.at(-1)!.timestamp} height={226}/>; })() : <Route run={active}/> }<View style={{ height: 24 }}/><Section kicker={active ? 'SESSION IN PROGRESS' : 'READY WHEN YOU ARE'} title={active ? 'Live activity' : 'Your dashboard'} right={<View style={st.gpsBadge}><View style={st.dot}/><Text style={st.gpsText}>{active ? trackingMode === 'background' ? 'GPS ON' : 'GPS · OPEN APP' : 'GPS READY'}</Text></View>}/>{active && current ? <><View style={st.tiles}><Tile label="DISTANCE" value={km(current.distance)} unit="KM" icon="navigate-outline" accent/><Tile label="DURATION" value={clock(current.seconds)} unit="" icon="time-outline"/><Tile label="CURRENT PACE" value={pace(current.currentSpeed)} unit="MIN/KM" icon="speedometer-outline"/><Tile label="ELEVATION GAIN" value={String(Math.round(current.ascent))} unit="M" icon="trending-up-outline"/></View><View style={st.strip}><View><Label>AVG PACE</Label><Text style={st.stripNum}>{pace(current.avgSpeed)} <Text style={st.stripUnit}>MIN/KM</Text></Text></View><View><Label>BEST PACE</Label><Text style={st.stripNum}>{pace(current.maxSpeed)} <Text style={st.stripUnit}>MIN/KM</Text></Text></View><View><Label>DESCENT</Label><Text style={st.stripNum}>{Math.round(current.descent)} <Text style={st.stripUnit}>M</Text></Text></View></View></> : <View style={st.summary}><View><Label>TOTAL DISTANCE</Label><Text style={st.summaryNum}>{km(history.reduce((n, r) => n + stats(r).distance, 0))}<Text style={st.summaryUnit}> KM</Text></Text></View><View style={st.summaryDivider}/><View><Label>RUNS DONE</Label><Text style={st.summaryNum}>{String(history.length).padStart(2, '0')}</Text></View></View>}{recentEnabled && <View style={st.cropCard}><View style={st.cropRow}><Text style={st.cropTitle}>LAST 24 HOURS</Text><Text style={st.cropTime}>{availableRecent.length} POINTS</Text></View><Text style={st.cropHint}>{recentMode === 'background' ? 'Location is recording in the background.' : recentMode === 'foreground' ? 'Recording while RUNRUN is open. Enable background location in device settings for continuous capture.' : 'Allow location access to start recording.'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Create activity from last 24 hours" disabled={availableRecent.length < 2} style={[st.gpxButton, availableRecent.length < 2 && { opacity: 0.45 }]} onPress={openRecent}><Text style={st.gpxText}>CREATE FROM LAST 24 HOURS</Text></Pressable></View>}{!!error && <Text style={st.error}>{error}</Text>}<View style={{ height: 100 }}/></>}
      {tab === 'HISTORY' && <><Section kicker="THE WORK YOU PUT IN" title="Run history"/>{history.length ? history.map((r, i) => <ActivityRow key={r.id} run={r} index={history.length - i} onOpen={() => openRun(r)} onArchive={() => changeArchiveState(r.id, true)}/>) : <View style={st.empty}><Icon name="footsteps-outline" size={44} color={c.lime}/><Text style={st.emptyTitle}>NO RUNS YET</Text><Text style={st.emptyDetail}>Start your first activity to see it here.</Text></View>}<View style={{ height: 90 }}/></>}
      {tab === 'AWARDS' && <Awards runs={history}/>}
    </ScrollView>
    {tab === 'RUN' && <View style={st.actionWrap}><Pressable disabled={busy} style={[st.startButton, active && { backgroundColor: c.red }]} onPress={() => active ? setStopDialog(true) : start()}>{busy ? <ActivityIndicator color={c.bg}/> : <><Icon name={active ? 'stop' : 'play'} color={c.bg} size={25}/><Text style={st.startText}>{active ? 'STOP RUN' : 'START RUN'}</Text><Icon name="arrow-forward" color={c.bg}/></>}</Pressable></View>}
    <View style={st.tabbar}>{(['RUN', 'HISTORY', 'AWARDS'] as Tab[]).map(t => <Pressable key={t} style={st.tab} onPress={() => setTab(t)}><Icon name={t === 'RUN' ? 'pulse-outline' : t === 'HISTORY' ? 'albums-outline' : 'trophy-outline'} color={t === tab ? c.lime : c.muted}/><Text style={[st.tabText, t === tab && { color: c.lime }]}>{t}</Text></Pressable>)}</View>
    <StopDialog visible={stopDialog} busy={busy} onClose={() => setStopDialog(false)} onFinish={() => finish()} onDiscard={() => finish(true)}/>
    <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => stylePicker === 'default' ? setStylePicker(null) : archiveOpen ? setArchiveOpen(false) : closeSettings()}>
      <SafeAreaProvider><SafeAreaView style={[st.safe, stylePicker !== 'default' && { padding: 24 }]} edges={['top', 'bottom']}>
        {stylePicker === 'default' ? <StyleChoices title="DEFAULT STYLE" selected={defaultExportStyle} run={draft ?? selected ?? history[0] ?? { id: 'sample', startedAt: 0, endedAt: 3754000, points: [] }} onChoose={chooseExportStyle} onClose={() => setStylePicker(null)}/> : <>
        {archiveOpen ? <>
          <View style={st.cropRow}><Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={() => setArchiveOpen(false)}><Icon name="arrow-back" size={26}/></Pressable><Text style={st.sectionTitle}>ARCHIVED ACTIVITIES</Text><View style={{ width: 26 }}/></View>
          <ScrollView style={{ marginTop: 20 }} contentContainerStyle={{ paddingBottom: 30 }}>
            {archivedHistory.length ? archivedHistory.map(run => { const data = stats(run); return <View key={run.id} style={[st.historyCard, { marginBottom: 10 }]}><View style={{ flex: 1 }}><Text style={st.historyTitle}>{new Date(run.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} RUN</Text><Text style={st.historyMeta}>{km(data.distance)} KM  ·  {clock(data.seconds)}  ·  +{Math.round(data.ascent)} M</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Unarchive activity from ${new Date(run.startedAt).toLocaleDateString()}`} onPress={() => changeArchiveState(run.id, false)} style={{ padding: 10, borderRadius: 10, backgroundColor: c.panel2 }}><Text style={{ color: c.lime, fontSize: 11, fontWeight: '900' }}>UNARCHIVE</Text></Pressable></View>; }) : <View style={st.empty}><Icon name="archive-outline" size={40} color={c.muted}/><Text style={st.emptyTitle}>NO ARCHIVED ACTIVITIES</Text></View>}
          </ScrollView>
        </> : <>
        <View style={st.cropRow}><Text style={st.sectionTitle}>SETTINGS</Text><Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={closeSettings}><Icon name="close" size={28}/></Pressable></View>
        <View style={[st.cropCard, { marginTop: 30 }]}><View style={st.cropRow}><View style={{ flex: 1, paddingRight: 12 }}><Text style={st.cropTitle}>24-HOUR LOCATION HISTORY</Text><Text style={st.cropHint}>Save your route continuously and create an activity from the last 24 hours. Old points are deleted automatically.</Text></View><Switch accessibilityLabel="24-hour location history" value={recentEnabled} disabled={busy} onValueChange={toggleRecent} trackColor={{ true: c.lime }} thumbColor={c.white}/></View><Text style={st.cropHint}>{recentEnabled ? recentMode === 'background' ? 'Recording in the background' : recentMode === 'foreground' ? 'Recording while RUNRUN is open. Allow background location in device settings for continuous recording.' : 'Waiting for location permission' : 'Off. Recent location data is cleared.'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose default export style" onPress={() => setStylePicker('default')} style={st.cropCard}><View style={st.cropRow}><View><Text style={st.cropTitle}>DEFAULT EXPORT STYLE</Text><Text style={st.cropHint}>{findExportStyle(defaultExportStyle).id} / {findExportStyle(defaultExportStyle).name}</Text></View><Icon name="chevron-forward" color={c.lime}/></View></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Archived activities" onPress={() => setArchiveOpen(true)} style={[st.cropCard, { marginTop: 0, marginBottom: 0, paddingVertical: 14 }]}><View style={st.cropRow}><Text style={st.cropTitle}>ARCHIVED ACTIVITIES</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={st.cropHint}>{archivedHistory.length}</Text><Icon name="chevron-forward" color={c.muted}/></View></View></Pressable>
        {!!error && <Text style={st.error}>{error}</Text>}
        </>}
        </>}
      </SafeAreaView></SafeAreaProvider>
    </Modal>
    <Modal visible={recentOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setRecentOpen(false)}>
      <SafeAreaProvider><SafeAreaView style={st.safe} edges={['top', 'bottom']}><View style={st.detailTop}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => setRecentOpen(false)}><Icon name="arrow-back" size={24}/></Pressable><Brand size={24}/><View style={{ width: 24 }}/></View>
        <ScrollView contentContainerStyle={st.detailContent}><Text style={st.kicker}>LAST 24 HOURS</Text><Text style={st.detailTitle}>MAKE AN{'\n'}ACTIVITY.</Text>
          {recentSource && <RunMap original={recentSource} selected={recentDraft ?? recentSource} time={Math.max(recentStart, Math.min(recentPreview, recentEnd))} height={280}/>}
          {recentSource && <View style={st.cropCard}><View style={st.cropRow}><Text style={st.cropTitle}>CHOOSE A FRAGMENT</Text><Text style={st.cropTime}>{clock(Math.max(0, (recentEnd - recentStart) / 1000))}</Text></View>
            <Text style={st.cropHint}>Drag the handles to choose any fragment still available in the last 24 hours. The playhead previews your path.</Text>
            <RunTrimmer minimum={Math.max(recentSource.startedAt, now - RECENT_WINDOW_MS)} maximum={recentSource.endedAt ?? now} start={recentStart} end={recentEnd} onStartChange={setRecentStart} onEndChange={setRecentEnd} onPreview={setRecentPreview}/>
            <View style={st.cropRow}><Text style={st.cropBoundary}>START  {new Date(recentStart).toLocaleString()}</Text><Text style={st.cropBoundary}>FINISH  {new Date(recentEnd).toLocaleString()}</Text></View>
            <RunPlayhead start={recentStart} end={recentEnd} value={Math.max(recentStart, Math.min(recentPreview, recentEnd))} onChange={setRecentPreview}/>
            <Pressable disabled={busy || !recentDraft} style={[st.shareButton, (!recentDraft || busy) && { opacity: 0.4 }]} onPress={createRecent}><Icon name="add-circle-outline" color={c.bg}/><Text style={st.shareText}>CREATE ACTIVITY</Text></Pressable>
          </View>}
          {!!error && <Text style={st.error}>{error}</Text>}
        </ScrollView>
      </SafeAreaView></SafeAreaProvider>
    </Modal>
    <Modal visible={!!selected} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => stylePicker === 'export' ? setStylePicker(null) : setSelected(null)}>
      <SafeAreaProvider><SafeAreaView style={st.safe} edges={['top', 'bottom']}>
        {stylePicker === 'export' ? <StyleChoices title="EXPORT STYLE" selected={exportStyle} run={draft ?? selected ?? { id: 'sample', startedAt: 0, endedAt: 3754000, points: [] }} onChoose={chooseExportStyle} onClose={() => setStylePicker(null)}/> : <>
        <View style={st.detailTop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to run history" style={st.detailHeaderButton} onPress={() => setSelected(null)}><Icon name="arrow-back" size={24}/></Pressable>
          <Brand size={24}/>
          <Pressable accessibilityRole="button" accessibilityLabel="Share run" style={st.detailHeaderButton} onPress={() => draft && share(draft)}><Icon name="share-outline" size={24}/></Pressable>
        </View>
        {selected && original && draft && draftStats && <ScrollView contentContainerStyle={st.detailContent}>
          <Text style={st.kicker}>ACTIVITY RECAP</Text><Text style={st.detailTitle}>THE RUN{'\n'}IS YOURS.</Text>
          {original.points.length ? <RunMap original={original} selected={draft} time={previewTime} height={280}/> : <Route run={draft} height={260}/>}
          <View style={st.cropCard}>
            <View style={st.cropRow}><Text style={st.cropTitle}>CROP YOUR RUN</Text><Text style={st.cropTime}>{clock((previewTime - cropStart) / 1000)} / {clock((cropEnd - cropStart) / 1000)}</Text></View>
            <Text style={st.cropHint}>Drag the trim handles to choose a fragment. Hold a handle for precise movement.</Text>
            <RunTrimmer minimum={original.startedAt} maximum={original.endedAt ?? original.startedAt}
              start={cropStart} end={cropEnd} onStartChange={setCropStart} onEndChange={setCropEnd} onPreview={setScrubTime}/>
            <View style={st.cropRow}><Text style={st.cropBoundary}>START  {clock((cropStart - original.startedAt) / 1000)}</Text><Text style={st.cropBoundary}>FINISH  {clock((cropEnd - original.startedAt) / 1000)}</Text></View>
            <Text style={st.cropHint}>Drag the playhead to see the route fill as the run progresses.</Text>
            <RunPlayhead start={cropStart} end={cropEnd} value={previewTime} onChange={setScrubTime}/>
            <View style={st.cropRow}>
              <Pressable onPress={() => { setCropStart(original.startedAt); setCropEnd(original.endedAt ?? original.startedAt); setScrubTime(original.startedAt); }}><Text style={st.cropReset}>RESET TO FULL RUN</Text></Pressable>
              <Pressable disabled={cropStart === selected.startedAt && cropEnd === selected.endedAt} onPress={saveCrop}><Text style={[st.cropSave, cropStart === selected.startedAt && cropEnd === selected.endedAt && { opacity: 0.4 }]}>SAVE CROP</Text></Pressable>
            </View>
          </View>
          <View style={st.tiles}>
            <Tile label="DISTANCE" value={km(draftStats.distance)} unit="KM" icon="navigate-outline" accent/>
            <Tile label="DURATION" value={clock(draftStats.seconds)} unit="" icon="time-outline"/>
            <Tile label="AVG PACE" value={pace(draftStats.avgSpeed)} unit="MIN/KM" icon="speedometer-outline"/>
            <Tile label="ELEVATION GAIN" value={String(Math.round(draftStats.ascent))} unit="M" icon="trending-up-outline"/>
          </View>
          <Trends run={draft}/>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose export style" style={st.cropCard} onPress={() => setStylePicker('export')}><View style={st.cropRow}><View><Text style={st.cropTitle}>EXPORT STYLE</Text><Text style={st.cropHint}>{findExportStyle(exportStyle).id} / {findExportStyle(exportStyle).name}</Text></View><Icon name="chevron-forward" color={c.lime}/></View></Pressable>
          <Pressable style={st.shareButton} onPress={() => share(draft, true)}><Icon name="download-outline" color={c.bg}/><Text style={st.shareText}>SAVE TRANSPARENT ROUTE PNG</Text></Pressable>
          <Pressable style={st.gpxButton} onPress={() => share(draft)}><Icon name="share-social-outline" color={c.white}/><Text style={st.gpxText}>SHARE ROUTE PNG</Text></Pressable>
          <Pressable style={st.gpxButton} onPress={() => exportGpx(draft).catch(e => setError(e instanceof Error ? e.message : 'Could not export GPX'))}><Icon name="download-outline" color={c.white}/><Text style={st.gpxText}>EXPORT GPX DATA</Text></Pressable>
        </ScrollView>}
        </>}
      </SafeAreaView></SafeAreaProvider>
    </Modal>
    <Camera visible={cameraOpen} onClose={() => setCameraOpen(false)} onError={setError}/>
    {shareRun && <View pointerEvents="none" style={st.offscreen}><View ref={shareRef} collapsable={false} style={st.shareCanvas}><ExportArtwork run={shareRun} styleId={exportStyle}/></View></View>}
  </SafeAreaView>;
}

export default function App() { return <SafeAreaProvider><Main/></SafeAreaProvider>; }
