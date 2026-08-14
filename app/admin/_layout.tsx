import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="psychics" />
      <Stack.Screen name="applications" />
      <Stack.Screen name="refunds" />
      <Stack.Screen name="withdrawals" />
    </Stack>
  );
}
