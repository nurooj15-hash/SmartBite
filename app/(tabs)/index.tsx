import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const cameraRef = useRef<any>(null);

  // =========================
  // HANDLERS
  // =========================

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      await requestPermission();
    } else {
      setShowCamera(true);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhotoUri(photo.uri);
      setShowCamera(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const reset = () => {
    setPhotoUri(null);
    setShowCamera(false);
    setShowResults(false);
  };

  // =========================
  // RESULTS SCREEN
  // =========================
  if (showResults) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="title">Meal Analysis</ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText style={styles.sectionTitle}>
            Foods detected:
          </ThemedText>
          <ThemedText>• roti</ThemedText>
          <ThemedText>• dal</ThemedText>
          <ThemedText>• sabzi</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText style={styles.sectionTitle}>
            Calories
          </ThemedText>
          <ThemedText>~480 kcal</ThemedText>
        </ThemedView>

        <Pressable style={styles.primaryButton} onPress={reset}>
          <ThemedText style={styles.buttonText}>Done</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // =========================
  // PHOTO PREVIEW
  // =========================
  if (photoUri) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="title">Preview</ThemedText>

        <ThemedView style={styles.placeholderBox}>
          <ThemedText>Photo captured successfully</ThemedText>
        </ThemedView>

        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={reset}>
            <ThemedText style={styles.buttonText}>Retake</ThemedText>
          </Pressable>

          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setShowResults(true);
              setPhotoUri(null);
            }}
          >
            <ThemedText style={styles.buttonText}>
              Analyze
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // =========================
  // CAMERA SCREEN
  // =========================
  if (showCamera) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

        <Pressable style={styles.captureButton} onPress={handleCapture}>
          <ThemedText style={styles.buttonText}>Capture</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // =========================
  // HOME SCREEN
  // =========================
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">SmartBite</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedText style={styles.subtitle}>
        Take or upload a photo to analyze your meal
      </ThemedText>

      <View style={styles.row}>
        <Pressable style={styles.primaryButton} onPress={handleTakePhoto}>
          <ThemedText style={styles.buttonText}>Take Photo</ThemedText>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={pickImage}>
          <ThemedText style={styles.buttonText}>Upload</ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  card: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    marginTop: 12,
  },

  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },

  placeholderBox: {
    width: 300,
    height: 200,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 20,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 40,
  },

  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});