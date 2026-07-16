import re

path = "app/(tabs)/rewards.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """                redeemHistory.map((r) => (
                  <View key={r.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.historyIconCircle, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                      <Ionicons name="gift-outline" size={14} color={colors.danger} />
                    </View>
                    <ThemedText style={styles.reason}>{r.optionTitle || 'Redeemed reward'}</ThemedText>
                    <ThemedText style={[{ color: colors.danger }, styles.amountText]}>-{r.coinsSpent}</ThemedText>
                  </View>
                ))"""

new = """                redeemHistory.map((r, i) => (
                  <View key={r.id ?? `redeem-${i}`} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.historyIconCircle, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                      <Ionicons name="gift-outline" size={14} color={colors.danger} />
                    </View>
                    <ThemedText style={styles.reason}>{r.optionTitle || r.description || 'Redeemed reward'}</ThemedText>
                    <ThemedText style={[{ color: colors.danger }, styles.amountText]}>-{r.coinsSpent ?? r.coinsEarned ?? 0}</ThemedText>
                  </View>
                ))"""

if old not in content:
    print("ANCHOR NOT FOUND")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("PATCHED OK")
