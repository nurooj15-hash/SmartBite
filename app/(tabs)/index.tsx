import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY;

type MealAnalysis = {
  foodsDetected: string[];
  nutritionEstimate: {
    calories: string;
    carbs: string;
    protein: string;
    fat: string;
    fiber: string;
  };
  cuisine: string;
  healthTip: string;
  confidenceNote: string;
};

const goals = [
  'blood sugar management',
  'general wellness',
  'high protein',
  'weight balance',
];

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(goals[0]);

  const cameraRef = useRef<any>(null);

  const prepareImageForUpload = async (uri: string) => {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      uri: manipulated.uri,
      base64: manipulated.base64 || null,
    };
  };

  const handleTakePhoto = async () => {
    try {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          setErrorMessage('Camera permission was denied.');
          setShowResults(true);
          return;
        }
      }

      setErrorMessage(null);
      setShowCamera(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to open camera.');
      setShowResults(true);
    }
  };

  const handleCapture = async () => {
    try {
      if (!cameraRef.current) {
        setErrorMessage('Camera is not ready yet.');
        setShowResults(true);
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

      const prepared = await prepareImageForUpload(photo.uri);

      if (!prepared.base64) {
        setErrorMessage('Could not prepare captured image.');
        setShowResults(true);
        return;
      }

      setPhotoUri(prepared.uri);
      setCapturedBase64(prepared.base64);
      setAnalysis(null);
      setErrorMessage(null);
      setShowCamera(false);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to capture photo.');
      setShowResults(true);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        setErrorMessage('Photo library permission was denied.');
        setShowResults(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];

        if (!asset.uri) {
          setErrorMessage('Selected image is missing a file path.');
          setShowResults(true);
          return;
        }

        const prepared = await prepareImageForUpload(asset.uri);

        if (!prepared.base64) {
          setErrorMessage(
            'Could not read image data. Try another photo from your library.'
          );
          setShowResults(true);
          return;
        }

        setPhotoUri(prepared.uri);
        setCapturedBase64(prepared.base64);
        setAnalysis(null);
        setErrorMessage(null);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to select image.');
      setShowResults(true);
    }
  };

  const analyzeImage = async () => {
    if (!capturedBase64) {
      setErrorMessage('Please take or upload a photo before analyzing.');
      setShowResults(true);
      return;
    }

    if (!OPENAI_KEY) {
      setErrorMessage('Missing EXPO_PUBLIC_OPENAI_KEY.');
      setShowResults(true);
      return;
    }

    try {
      setIsAnalyzing(true);
      setShowResults(true);
      setErrorMessage(null);
      setAnalysis(null);

      const prompt = `
You are SmartBite AI.

Analyze the meal image and return ONLY valid JSON.
Do not include markdown.
Do not include backticks.
Do not include any explanation outside the JSON.

Return this exact shape:
{
  "foodsDetected": ["string"],
  "nutritionEstimate": {
    "calories": "string",
    "carbs": "string",
    "protein": "string",
    "fat": "string",
    "fiber": "string"
  },
  "cuisine": "string",
  "healthTip": "string",
  "confidenceNote": "string"
}

Rules:
- Identify visible foods and drinks.
- Estimate calories, carbs, protein, fat, and fiber.
- Infer cuisine type if possible.
- Tailor the healthTip to this user goal: ${selectedGoal}.
- Be concise.
- If uncertain, say so in confidenceNote.
- Use ranges when appropriate.
- Return valid JSON only.
`;

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: prompt,
                },
                {
                  type: 'input_image',
                  image_url: `data:image/jpeg;base64,${capturedBase64}`,
                },
              ],
            },
          ],
        }),
      });

      const rawText = await response.text();

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        setErrorMessage(`Server returned invalid response: ${rawText}`);
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          data?.error?.message || data?.error || 'Analysis failed.'
        );
        return;
      }

      const text =
        data.output_text ||
        (data.output || [])
          .flatMap((item: any) => item.content || [])
          .find((item: any) => item.type === 'output_text')
          ?.text ||
        '';

      let parsed: MealAnalysis | null = null;

      try {
        parsed = JSON.parse(text);
      } catch {
        setErrorMessage(`Model returned invalid JSON: ${text}`);
        return;
      }

      setAnalysis(parsed);
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Network error during analysis. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
      setShowResults(true);
    }
  };

  const reset = () => {
    setPhotoUri(null);
    setCapturedBase64(null);
    setShowCamera(false);
    setShowResults(false);
    setAnalysis(null);
    setErrorMessage(null);
    setIsAnalyzing(false);
  };

  if (showResults) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>SmartBite</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.resultsContainer}>
          <ThemedText type="title" style={{ color: Colors.brown }}>
            Meal Analysis
          </ThemedText>

          {photoUri ? (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <Image source={{ uri: photoUri }} style={styles.resultImage} />
            </View>
          ) : null}

          {isAnalyzing ? (
            <View style={styles.card}>
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.brown} />
                <ThemedText style={{ marginTop: 10 }}>
                  Analyzing your meal...
                </ThemedText>
              </View>
            </View>
          ) : null}

          {!isAnalyzing && errorMessage ? (
            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>Error</ThemedText>
              <ThemedText>{errorMessage}</ThemedText>
            </View>
          ) : null}

          {!isAnalyzing && analysis ? (
            <>
              <View style={styles.card}>
                <ThemedText style={styles.sectionTitle}>Foods Detected</ThemedText>
                {analysis.foodsDetected?.length ? (
                  analysis.foodsDetected.map((food, index) => (
                    <Text key={`${food}-${index}`} style={styles.bulletItem}>
                      • {food}
                    </Text>
                  ))
                ) : (
                  <ThemedText>No foods detected.</ThemedText>
                )}
              </View>

              <View style={styles.card}>
                <ThemedText style={styles.sectionTitle}>Nutrition Estimate</ThemedText>
                <Text style={styles.metricRow}>
                  Calories: {analysis.nutritionEstimate?.calories || 'N/A'}
                </Text>
                <Text style={styles.metricRow}>
                  Carbs: {analysis.nutritionEstimate?.carbs || 'N/A'}
                </Text>
                <Text style={styles.metricRow}>
                  Protein: {analysis.nutritionEstimate?.protein || 'N/A'}
                </Text>
                <Text style={styles.metricRow}>
                  Fat: {analysis.nutritionEstimate?.fat || 'N/A'}
                </Text>
                <Text style={styles.metricRow}>
                  Fiber: {analysis.nutritionEstimate?.fiber || 'N/A'}
                </Text>
              </View>

              <View style={styles.card}>
                <ThemedText style={styles.sectionTitle}>Cuisine</ThemedText>
                <ThemedText>{analysis.cuisine || 'Unknown'}</ThemedText>
              </View>

              <View style={styles.card}>
                <ThemedText style={styles.sectionTitle}>Health Tip</ThemedText>
                <ThemedText>{analysis.healthTip || 'No tip available.'}</ThemedText>
              </View>

              <View style={styles.card}>
                <ThemedText style={styles.sectionTitle}>Confidence Note</ThemedText>
                <ThemedText>
                  {analysis.confidenceNote || 'Estimated from visible ingredients only.'}
                </ThemedText>
              </View>
            </>
          ) : null}

          <Pressable
            style={[
              styles.primaryButton,
              {
                marginTop: 20,
                alignSelf: 'center',
                paddingHorizontal: 40,
              },
            ]}
            onPress={reset}
          >
            <ThemedText style={styles.buttonText}>Done</ThemedText>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.screen}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={styles.cameraOverlay}>
          <ThemedText style={styles.cameraHint}>
            Center the meal in the frame
          </ThemedText>

          <Pressable style={styles.captureButton} onPress={handleCapture}>
            <ThemedText style={styles.buttonText}>Capture</ThemedText>
          </Pressable>

          <Pressable
            style={styles.cameraCancelButton}
            onPress={() => setShowCamera(false)}
          >
            <ThemedText style={styles.buttonText}>Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

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

        <View style={styles.infoCard}>
          <ThemedText style={styles.infoCardTitle}>
            Analyze your meal
          </ThemedText>
          <ThemedText style={styles.infoCardSubtext}>
            Take or upload a photo to get instant nutritional insight
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Choose Your Goal</ThemedText>
          <View style={styles.goalWrap}>
            {goals.map((goal) => {
              const isSelected = selectedGoal === goal;
              return (
                <Pressable
                  key={goal}
                  onPress={() => setSelectedGoal(goal)}
                  style={[styles.goalChip, isSelected && styles.goalChipSelected]}
                >
                  <Text
                    style={[
                      styles.goalChipText,
                      isSelected && styles.goalChipTextSelected,
                    ]}
                  >
                    {goal}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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

            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: capturedBase64 ? Colors.brown : '#c7c7c7',
                  marginTop: 4,
                },
              ]}
              disabled={!capturedBase64 || isAnalyzing}
              onPress={analyzeImage}
            >
              <ThemedText style={styles.buttonText}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Meal'}
              </ThemedText>
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
  resultsContainer: {
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
    marginTop: 3,
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
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  metricRow: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  bulletItem: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  goalWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#eee7df',
  },
  goalChipSelected: {
    backgroundColor: Colors.brown,
  },
  goalChipText: {
    color: Colors.brown,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  goalChipTextSelected: {
    color: 'white',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 12,
  },
  cameraHint: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  captureButton: {
    backgroundColor: Colors.red,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 40,
    shadowColor: Colors.red,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  cameraCancelButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
});