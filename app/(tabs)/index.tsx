import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const [showResults, setShowResults] = useState(false);

  //RESULTS SCREEN
  if (showResults) {
    return (
      <ThemedView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>

        <ThemedText type="title" style={{ marginBottom: 16 }}>
          estimated meal info
        </ThemedText>

        <ThemedText style={{ marginBottom: 8 }}>
          foods detected:
        </ThemedText>
        <ThemedText>• roti</ThemedText>
        <ThemedText>• dal</ThemedText>
        <ThemedText>• sabzi</ThemedText>

        <ThemedText style={{ marginTop: 16 }}>
          estimated calories: ~480 kcal
        </ThemedText>

        <Pressable
          onPress={() => {
            setShowResults(false);
            setPhotoUri(null);
          }}
          style={{
            marginTop: 24,
            backgroundColor: '#4CAF50',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <ThemedText style={{ color: 'white' }}>
            Done
          </ThemedText>
        </Pressable>

      </ThemedView>
    );
  }

  //PHOTO PREREVIEW SCREEN
  if (photoUri) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>

        {/*show captured photos*/}
        <Image
          source={{ uri: photoUri }}
          style={{ width: 300, height: 400, borderRadius: 12 }}
        />

        {/*container for action buttons*/}
        <ThemedView style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>

          {/*retake photo: clear current photo and reopen camera*/}
          <Pressable
            onPress={() => {
              setPhotoUri(null);
              setShowResults(false);
              setShowCamera(true);
            }}
            style={{
              backgroundColor: '#999',
              padding: 12,
              borderRadius: 8,
            }}
          >
            <ThemedText style={{ color: 'white' }}>
              Retake
            </ThemedText>
          </Pressable>

          {/*confirm photo: placeholder for future analysis step*/}
          <Pressable
            onPress={() => {
              setShowResults(true);
              setPhotoUri(null);
              setShowCamera(false);
            }}
            style={{
              backgroundColor: '#4CAF50',
              padding: 12,
              borderRadius: 8,
            }}
          >
            <ThemedText style={{ color: 'white' }}>
              Looks good
            </ThemedText>
          </Pressable>

        </ThemedView>
      </ThemedView>
    );
  }





  //CAMERA VIEW SCREEN
  if (showCamera) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
        />

        <Pressable
          onPress={async () => {
            if (cameraRef.current) {
              const photo = await cameraRef.current.takePictureAsync();
              setPhotoUri(photo.uri);
              setShowCamera(false);
            }
          }}
          style={{
            position: 'absolute',
            bottom: 40,
            alignSelf: 'center',
            backgroundColor: '#4CAF50',
            padding: 16,
            borderRadius: 30,
          }}
        >
          <ThemedText style={{ color: 'white', fontSize: 16 }}>
            Capture
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }



  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Calorie App!!!!!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={{ marginTop: 20 }}>
        <Pressable
          onPress={async () => {
            if (!permission?.granted) {
              await requestPermission();
            } else {
              setShowCamera(true);
            }
          }}
          style={{
            padding: 12,
            backgroundColor: '#4CAF50',
            borderRadius: 8,
          }}
        >

          <ThemedText
            style={{
              color: 'white',
              textAlign: 'center',
            }}
          >
            Take a photo
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ParallaxScrollView>
  );
}


const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
