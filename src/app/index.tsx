import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>TIMEFOLD</Text>
        <Text style={styles.title}>The Last Observatory</Text>
        <Text style={styles.subtitle}>Evidence from the future. Repairs in the past.</Text>
        <View style={styles.section}>
          <Text style={styles.heading}>The observatory</Text>
          <Text style={styles.body}>One room, three eras: 1986, 2026, 2086. Each case hides its answers downstream — read the evidence in 2026 and 2086, then repair the 1986 workbench and watch the consequences follow.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/play', params: { view: 'observatory' } })} style={styles.button}>
            <Text style={styles.buttonText}>Enter the observatory</Text>
          </Pressable>
          <Text style={styles.note}>Built for AR-capable phones and Meta Quest.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>How a case works</Text>
          <Text style={styles.body}>2026 shows which socket was wired. 2086&apos;s open sky shows the star. A plaque in the ruin records the band. Repair 1986 to match — and watch each era answer.</Text>
          <Text style={styles.note}>Three clues, seven repairs, seventy-two cases. Undo anything — and the debrief remembers how you got there.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>No headset?</Text>
          <Text style={styles.body}>The logic lab runs the same rules in 2D: chapters, undo, checkpoints and the keeper&apos;s hints.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/lab')} style={styles.button}>
            <Text style={styles.buttonText}>Open logic lab</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141817' },
  content: { padding: 28, gap: 20, maxWidth: 720, width: '100%', alignSelf: 'center' },
  brand: { color: '#d7b47b', letterSpacing: 4, fontSize: 14 },
  title: { color: '#eee9df', fontSize: 38, fontWeight: '600', marginTop: 24 },
  subtitle: { color: '#aaa79e', fontSize: 18, lineHeight: 28 },
  section: { borderTopWidth: 1, borderTopColor: '#363c36', paddingTop: 24, gap: 14, marginTop: 12 },
  heading: { color: '#eee9df', fontSize: 20, fontWeight: '600' },
  body: { color: '#ccc9c0', fontSize: 16, lineHeight: 26 },
  note: { color: '#aaa79e', fontSize: 13, lineHeight: 21 },
  button: { backgroundColor: '#d7b47b', padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#141817', fontSize: 16, fontWeight: '600' },
  link: { paddingVertical: 16 },
  linkText: { color: '#d7b47b', fontSize: 16 },
});
