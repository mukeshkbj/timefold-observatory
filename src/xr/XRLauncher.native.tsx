import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { isQuest, ViroXRSceneNavigator } from '@reactvision/react-viro';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PhoneScene from './PhoneScene';
import QuestScene from './QuestScene';
import TimeFoldPhoneScene from './TimeFoldPhoneScene';
import TimeFoldQuestScene from './TimeFoldQuestScene';

export default function XRLauncher() {
  const insets = useSafeAreaInsets();
  const { view } = useLocalSearchParams();
  const inspecting = view === 'observatory';
  const arAlive = useRef(false);
  const [arStalled, setArStalled] = useState(false);
  useEffect(() => {
    if (isQuest) return;
    const timer = setTimeout(() => { if (!arAlive.current) setArStalled(true); }, 14000);
    return () => clearTimeout(timer);
  }, []);
  const metaAppId: unknown = Constants.expoConfig?.extra?.metaAppId;
  const questConfigured = typeof metaAppId === 'string' && /^\d+$/.test(metaAppId);
  if (isQuest && !questConfigured) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.title}>Set the Meta App ID first</Text>
        <Text style={styles.body}>Configure the real numeric META_APP_ID and rebuild before launching the immersive Quest diagnostic.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.button}><Text style={styles.buttonText}>Return home</Text></Pressable>
      </SafeAreaView>
    );
  }
  return (
    <View style={styles.navigator}>
      <ViroXRSceneNavigator arInitialScene={{ scene: inspecting ? () => <TimeFoldPhoneScene onArAlive={() => { arAlive.current = true; setArStalled(false); }} /> : PhoneScene }} vrInitialScene={{ scene: inspecting ? TimeFoldQuestScene : QuestScene }}
        onExitViro={() => router.replace('/')} hdrEnabled={false} bloomEnabled={false} handTrackingEnabled={false} style={styles.navigator} />
      {!isQuest && <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={[styles.exit, { top: insets.top + 8 }]}><Text style={styles.buttonText}>Return home</Text></Pressable>}
      {arStalled && <View style={[styles.stalled, { bottom: insets.bottom + 24 }]}>
        <Text style={styles.stalledText}>No AR response — this device may not support ARCore. The logic lab runs the same puzzle in 2D.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/lab')} style={styles.stalledButton}><Text style={styles.buttonText}>Open logic lab</Text></Pressable>
      </View>}
    </View>
  );
}
const styles = StyleSheet.create({
  navigator: { flex: 1 },
  exit: { position: 'absolute', left: 16, backgroundColor: '#d7b47b', padding: 14 },
  stalled: { position: 'absolute', left: 16, right: 16, backgroundColor: '#141817ee', padding: 16, gap: 12, borderWidth: 1, borderColor: '#d7b47b' },
  stalledText: { color: '#eee9df', fontSize: 15, lineHeight: 22 },
  stalledButton: { backgroundColor: '#d7b47b', padding: 14, alignItems: 'center' },
  screen: { flex: 1, backgroundColor: '#141817', padding: 28, justifyContent: 'center', gap: 24 },
  title: { color: '#eee9df', fontSize: 28, fontWeight: '600' },
  body: { color: '#ccc9c0', fontSize: 16, lineHeight: 26 },
  button: { padding: 18, backgroundColor: '#d7b47b', alignItems: 'center' },
  buttonText: { color: '#141817', fontSize: 16, fontWeight: '600' },
});
