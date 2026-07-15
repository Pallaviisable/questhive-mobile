import { Stack } from 'expo-router';

export default function GroupsLayout() {
  return (
    <Stack>
      <Stack.Screen name="create" options={{ title: 'Create Group' }} />
      <Stack.Screen name="[groupId]/index" options={{ title: 'Group' }} />
      <Stack.Screen name="[groupId]/tasks" options={{ title: 'Group Tasks' }} />
      <Stack.Screen name="[groupId]/chat" options={{ title: 'Group Chat' }} />
      <Stack.Screen name="[groupId]/leaderboard" options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="[groupId]/fairness" options={{ title: 'Fairness Report' }} />
    </Stack>
  );
}
