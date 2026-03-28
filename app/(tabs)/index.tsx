import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY;

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResult, setAiResult] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      setPhotoUri(photo.uri);
      setShowCamera(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setPhotoUri(asset.uri);
      analyzeImage(asset.base64);
    }
  };

  const analyzeImage = async (base64: string | undefined) => {
    if (!base64) {
      setAiResult("No image data found.");
      setShowResults(true);
      return;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `
You are SmartBite AI with multi-agent orchestration.

Vision Agent:
- Identify all foods in the image.

Nutrition Agent:
- Estimate calories and macronutrients.

Cultural Intelligence Agent:
- Recognize cuisine type if possible.

Health Coaching Agent:
- Suggest one improvement for someone managing blood sugar.

Return results clearly formatted.
`
                },
                {
                  type: "input_image",
                  image_base64: base64,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();

      if (data.output && data.output[0]?.content) {
        const textBlock = data.output[0].content.find(
          (item: any) => item.type === "output_text"
        );
        setAiResult(textBlock?.text || "No AI response received.");
      } else {
        setAiResult("No AI response received.");
      }

      setShowResults(true);

    } catch (error) {
      console.log("AI ERROR:", error);
      setAiResult("Error analyzing image.");
      setShowResults(true);
    }
  };

  const reset = () => {
    setPhotoUri(null);
    setShowCamera(false);
    setShowResults(false);
    setAiResult(null);
  };

  // =========================
  // RESULTS SCREEN
  // =========================
  if (showResults) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>SmartBite</ThemedText>
        </View>
        <View style={styles.center}>
          <ThemedText type="title" style={{ color: Colors.brown }}>
            Meal Analysis
          </ThemedText>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>
              AI Analysis
            </ThemedText>

            <ThemedText>
              {aiResult ? aiResult : "Analyzing..."}
            </ThemedText>
          </View>

          <Pressable
            style={[styles.primaryButton, { marginTop: 20, alignSelf: 'center', paddingHorizontal: 40 }]}
            onPress={reset}
          >
            <ThemedText style={styles.buttonText}>Done</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // =========================
  // CAMERA SCREEN
  // =========================
  if (showCamera) {
    return (
      <View style={styles.screen}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <Pressable style={styles.captureButton} onPress={handleCapture}>
          <ThemedText style={styles.buttonText}>Capture</ThemedText>
        </Pressable>
      </View>
    );
  }

  // =========================
  // HOME SCREEN
  // =========================
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>SmartBite</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingRow}>
          <View>
            <ThemedText style={styles.greetingText}>Welcome!</ThemedText>
            <ThemedText style={styles.greetingSubtext}>What did you eat today?</ThemedText>
          </View>
        </View>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search foods, meals..."
            placeholderTextColor="#aaa"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.infoCard}>
          <ThemedText style={styles.infoCardTitle}>Analyze your meal</ThemedText>
          <ThemedText style={styles.infoCardSubtext}>
            Take or upload a photo to get instant nutritional info
          </ThemedText>
        </View>

        <View style={styles.uploadCard}>
          <Pressable style={styles.previewPlaceholder} onPress={pickImage}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewInner}>
                <ThemedText style={styles.previewLabel}>Tap to select image</ThemedText>
              </View>
            )}
          </Pressable>

          <View style={styles.buttonColumn}>
            <Pressable style={styles.primaryButton} onPress={handleTakePhoto}>
              <ThemedText style={styles.buttonText}>Take Photo</ThemedText>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={pickImage}>
              <ThemedText style={styles.secondaryButtonText}>Upload Photo</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    padding: 20,
  },
  header: {
    width: '100%',
    paddingTop: 55,
    paddingBottom: 18,
    paddingHorizontal: 24,
    backgroundColor: Colors.brown,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  greetingRow: {
    marginTop: 24,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.brown,
  },
  greetingSubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  infoCard: {
    backgroundColor: Colors.brown,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.brown,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  infoCardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoCardSubtext: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  uploadCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  previewPlaceholder: {
    width: '50%',
    aspectRatio: 1,
    backgroundColor: '#f0ede8',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewInner: {
    alignItems: 'center',
    gap: 8,
  },
  previewLabel: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  buttonColumn: {
    flex: 1,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: Colors.red,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.red,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: Colors.blue,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: Colors.brown,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: Colors.brown,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: Colors.brown,
  },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: Colors.red,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 40,
    zIndex: 10,
    shadowColor: Colors.red,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
});