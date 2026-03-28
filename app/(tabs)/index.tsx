import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const cameraRef = useRef<any>(null);

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setShowCamera(true);
  };

  // Just captures and stores — does NOT analyze yet
  const handleCapture = async () => {
    try {
      if (!cameraRef.current) return;
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      setPhotoUri(photo.uri);
      setPhotoBase64(photo.base64 ?? null);
      setShowCamera(false);
    } catch (error) {
      console.log('CAPTURE ERROR:', error);
    }
  };

  // Just selects and stores — does NOT analyze yet
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoBase64(asset.base64 ?? null);
      }
    } catch (error) {
      console.log('PICKER ERROR:', error);
    }
  };

  // Called only when user taps "Analyze Meal"
  const handleAnalyze = async () => {
    if (!photoBase64) {
      setAiResult('No image data found. Please try again.');
      setShowResults(true);
      return;
    }

    if (!OPENAI_KEY) {
      setAiResult('Missing OpenAI API key.');
      setShowResults(true);
      return;
    }

    setIsAnalyzing(true);
    setShowResults(true);
    setAiResult(null);

    try {
      const imageDataUrl = `data:image/jpeg;base64,${photoBase64}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 600,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are SmartBite, a nutrition analysis AI. Analyze this meal photo and return:

Foods Detected:
- list each food item you can see

Estimated Calories:
- total estimated calories for the meal

Macronutrients:
- rough estimates for protein, carbs, and fat

Cuisine Type:
- recognize the cuisine (e.g. Italian, Mexican) if possible

Health Tip:
- at least one brief tip for someone managing blood sugar

Be concise and friendly.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageDataUrl,
                    detail: 'low',
                  },
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      console.log('OPENAI RESPONSE:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        setAiResult(
          data?.error?.message ||
          `OpenAI request failed with status ${response.status}.`
        );
        return;
      }

      const text = data.choices?.[0]?.message?.content ?? null;
      setAiResult(text || 'No AI response received.');
    } catch (error: any) {
      console.log('AI ERROR:', error);
      setAiResult(error?.message || 'Error analyzing image.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setPhotoUri(null);
    setPhotoBase64(null);
    setShowCamera(false);
    setShowResults(false);
    setAiResult(null);
    setIsAnalyzing(false);
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

        <ScrollView
          contentContainerStyle={styles.center}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title" style={{ color: Colors.brown }}>
            Meal Analysis
          </ThemedText>

          {photoUri ? (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <Image source={{ uri: photoUri }} style={styles.resultImage} />
            </View>
          ) : null}

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>AI Analysis</ThemedText>

            {isAnalyzing ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.brown} />
                <ThemedText style={{ marginTop: 10 }}>
                  Analyzing your meal...
                </ThemedText>
              </View>
            ) : (
              <ThemedText>
                {aiResult ? aiResult : 'No AI response received.'}
              </ThemedText>
            )}
          </View>

          {!isAnalyzing && (
            <Pressable
              style={[
                styles.primaryButton,
                { marginTop: 20, alignSelf: 'center', paddingHorizontal: 40 },
              ]}
              onPress={reset}
            >
              <ThemedText style={styles.buttonText}>Done</ThemedText>
            </Pressable>
          )}
        </ScrollView>
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

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingRow}>
          <View>
            <ThemedText style={styles.greetingText}>Welcome!</ThemedText>
            <ThemedText style={styles.greetingSubtext}>
              What did you eat today?
            </ThemedText>
          </View>
        </View>

        <View style={styles.searchBar}>
          <TextInput
            style={[styles.searchInput, { outline: 'none' } as any]}
            placeholder="Search foods, meals..."
            placeholderTextColor="#aaa"
            value={searchQuery}
            onChangeText={setSearchQuery}
            underlineColorAndroid="transparent"
          />
        </View>

        <View style={styles.infoCard}>
          <ThemedText style={styles.infoCardTitle}>
            Analyze your meal
          </ThemedText>
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
                <ThemedText style={styles.previewLabel}>
                  Tap to select image
                </ThemedText>
              </View>
            )}
          </Pressable>

          <View style={styles.buttonColumn}>
            <Pressable style={styles.primaryButton} onPress={handleTakePhoto}>
              <ThemedText style={styles.buttonText}>Take Photo</ThemedText>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={pickImage}>
              <ThemedText style={styles.secondaryButtonText}>
                Upload Photo
              </ThemedText>
            </Pressable>

            {/* Analyze button — only shows once a photo is selected */}
            {photoUri && (
              <Pressable style={styles.submitButton} onPress={handleAnalyze}>
                <ThemedText style={styles.buttonText}>
                  Analyze Meal →
                </ThemedText>
              </Pressable>
            )}
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
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
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
  resultImage: {
    width: '100%',
    height: 260,
    borderRadius: 12,
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
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});