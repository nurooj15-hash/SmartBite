import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ScrollView, Pressable, StyleSheet, View, Image } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

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

  // 📊 RESULTS SCREEN
  if (showResults) {
    return (
      <View style={styles.center}>
        <ThemedText type="title">Meal Analysis</ThemedText>
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Foods detected:</ThemedText>
          <ThemedText>• roti</ThemedText>
          <ThemedText>• dal</ThemedText>
          <ThemedText>• sabzi</ThemedText>
        </View>
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Calories</ThemedText>
          <ThemedText>~480 kcal</ThemedText>
        </View>
        <Pressable style={[styles.primaryButton, { marginTop: 20 }]} onPress={reset}>
          <ThemedText style={styles.buttonText}>Done</ThemedText>
        </Pressable>
      </View>
    );
  }

  // 📸 CAMERA SCREEN
  if (showCamera) {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <Pressable style={styles.captureButton} onPress={handleCapture}>
          <ThemedText style={styles.buttonText}>Capture</ThemedText>
        </Pressable>
      </View>
    );
  }

  // 🏠 HOME SCREEN
  return (
    <View style={styles.screen}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLinks}>
          <ThemedText style={styles.headerText}>Home</ThemedText>
          <ThemedText style={styles.headerText}>About Us</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>

        {/* ROW: info box + photo card side by side */}
        <View style={styles.mainRow}>

          {/* LEFT: info box */}
          <View style={styles.infoBox}>
            <ThemedText style={styles.subtitle}>
              Take or upload a photo to analyze your meal
            </ThemedText>
          </View>

          {/* RIGHT: photo card */}
          <View style={styles.photoCard}>

            {/* Left of card: preview */}
            <Pressable style={styles.previewPlaceholder} onPress={pickImage}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.previewImage} />
              ) : (
                <ThemedText style={styles.previewLabel}>IMAGE PREVIEW</ThemedText>
              )}
            </Pressable>

            {/* Right of card: buttons */}
            <View style={styles.buttonColumn}>
              <Pressable style={styles.primaryButton} onPress={handleTakePhoto}>
                <ThemedText style={styles.buttonText}>Take Photo</ThemedText>
              </Pressable>

              <Pressable style={styles.primaryButton} onPress={pickImage}>
                <ThemedText style={styles.buttonText}>Upload Photo</ThemedText>
              </Pressable>

              {photoUri && (
                <Pressable
                  style={[styles.submitButton, { marginTop: 16 }]}
                  onPress={() => setShowResults(true)}
                >
                  <ThemedText style={styles.buttonText}>Submit</ThemedText>
                </Pressable>
              )}
            </View>

          </View>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightblue,
  },

  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: Colors.lightblue,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.lightblue,
  },

  header: {
    width: '100%',
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.brown,
    alignItems: 'center',
  },

  headerLinks: {
    flexDirection: 'row',
    gap: 30,
  },

  headerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // New: outer row that holds info box + photo card
  mainRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    alignItems: 'flex-start',
  },

  infoBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.lightbrown,
    justifyContent: 'center',
  },

  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },

  photoCard: {
    flex: 2,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.blue,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  previewPlaceholder: {
    width: '60%',
    height: 300,
    backgroundColor: '#d9d9d9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  previewLabel: {
    color: '#555',
    fontWeight: '600',
    fontSize: 13,
  },

  buttonColumn: {
    flex: 1,
    gap: 12,
  },

  primaryButton: {
    backgroundColor: Colors.red,
    padding: 12,
    paddingHorizontal: 5,
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
  },

  submitButton: {
    backgroundColor: Colors.brown,
    padding: 12,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
  },

  card: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.lightbrown,
    marginTop: 12,
  },

  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },

  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: Colors.red,
    padding: 18,
    borderRadius: 40,
    zIndex: 10,
  },

  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});