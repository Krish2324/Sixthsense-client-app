import { Stack } from 'expo-router';

export default function PsychicPortalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="apply" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="questions" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
