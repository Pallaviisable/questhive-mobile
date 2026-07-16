path = "app/groups/_layout.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    <Stack>
      <Stack.Screen name="create" options={{ title: 'Create Group' }} />
      <Stack.Screen name="[groupId]/index" options={{ title: 'Group' }} />
      <Stack.Screen name="[groupId]/tasks" options={{ title: 'Group Tasks' }} />
      <Stack.Screen name="[groupId]/chat" options={{ title: 'Group Chat' }} />
      <Stack.Screen name="[groupId]/leaderboard" options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="[groupId]/fairness" options={{ title: 'Fairness Report' }} />
    </Stack>"""

new = """    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[groupId]/index" />
      <Stack.Screen name="[groupId]/tasks" />
      <Stack.Screen name="[groupId]/chat" />
      <Stack.Screen name="[groupId]/leaderboard" />
      <Stack.Screen name="[groupId]/fairness" />
    </Stack>"""

if old not in content:
    print("ANCHOR NOT FOUND")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("PATCHED OK")
