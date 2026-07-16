import { Stack } from 'expo-router';

export default function GroupsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[groupId]/index" />
      <Stack.Screen name="[groupId]/tasks" />
      <Stack.Screen name="[groupId]/chat" />
      <Stack.Screen name="[groupId]/leaderboard" />
      <Stack.Screen name="[groupId]/fairness" />
    </Stack>
  );
}
