# SmartBite

SmartBite is a mobile app that analyzes meal photos and returns nutritional information and health guidance using AI. Users take or upload a photo of their meal, select a health goal, and receive a structured analysis in seconds — no manual food entry required.

---

## What It Does

1. User takes a photo with the camera or selects one from their photo library
2. User selects a health goal from four options: blood sugar management, general wellness, high protein, or weight balance
3. User taps **Analyze Meal**
4. The app sends the image to the backend, which calls the OpenAI GPT-4o API
5. The app displays a structured result with five sections:
   - Foods detected
   - Nutrition estimate (calories, carbs, protein, fat, fiber)
   - Cuisine type
   - Health tip tailored to the selected goal
   - Confidence note

---

## Tech Stack

**Frontend**
- React Native with Expo
- `expo-camera` — live camera capture
- `expo-image-picker` — photo library selection
- `expo-image-manipulator` — resizes images to 1024px wide and compresses to JPEG at 0.5 quality before sending
- TypeScript — the AI response is typed as a `MealAnalysis` object

**Backend**
- Node.js with Express
- `/analyze-meal` — receives the image and selected goal, calls the OpenAI API, returns structured JSON
- `/health` — health check endpoint

**AI**
- OpenAI GPT-4o via the Responses API
- The prompt instructs the model to return only valid JSON matching the `MealAnalysis` schema
- The selected health goal is passed into the prompt so the health tip is tailored to that goal

---

## MealAnalysis Response Shape
```typescript
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
```

---

## Image Preparation

Before sending to the backend, the app uses `expo-image-manipulator` to resize the image to 1024px wide and compress it to JPEG at 50% quality. This reduces payload size and keeps response times low.

---

## Health Goals

Users can select one of four goals before analyzing:

- Blood sugar management
- General wellness
- High protein
- Weight balance

The selected goal is included in the prompt sent to GPT-4o, so the health tip in the response reflects that specific objective.

---

## Error Handling

The app handles the following error cases:

- Camera or photo library permission denied
- No image selected before tapping Analyze
- Image preparation failure
- Network errors during analysis
- Invalid or unparseable JSON returned from the API
- Missing API key on the backend

Each case surfaces a readable message to the user on the results screen.

---

## Team

- **Jade** — Backend development and prompt engineering. Built the Express API, the `/analyze-meal` and `/health` endpoints, server-side AI integration, and the structured JSON prompt design.
- **Urooj** — AI workflow and product logic. Shaped the goal-aware analysis flow and how user intent connects to the AI response.
- **Christina** — Frontend and UI. Built the React Native screens, camera and upload flow, goal selection, results display, and overall visual design.
