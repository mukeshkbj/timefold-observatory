import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SetupScreen() {
  const metaAppId: unknown = Constants.expoConfig?.extra?.metaAppId;
  const questConfigured = typeof metaAppId === 'string' && /^\d+$/.test(metaAppId);
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.link}>Back</Text></Pressable>
        <Text style={styles.title}>Setup</Text>
        <Text style={styles.body}>Meta Quest: App ID {questConfigured ? 'configured' : 'not set'}. Quest installs also need Developer Mode and USB debugging enabled in the Meta Horizon app.</Text>
        <Text style={styles.body}>Phones: an ARKit-capable iPhone or an ARCore-capable Android device, plus a clear horizontal surface in a well-lit room. Devices without AR support can play the full puzzle in the logic lab.</Text>
        <Text style={styles.body}>The keeper answers from authored hints on-device — the puzzle is complete and playable offline.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141817' },
  content: { padding: 28, gap: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  back: { paddingVertical: 12 },
  link: { color: '#d7b47b', fontSize: 16 },
  title: { color: '#eee9df', fontSize: 30, fontWeight: '600' },
  body: { color: '#ccc9c0', fontSize: 16, lineHeight: 26 },
  note: { color: '#aaa79e', fontSize: 13, lineHeight: 21 },
});
