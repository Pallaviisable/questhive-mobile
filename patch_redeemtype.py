path = "app/(tabs)/rewards.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "type RedeemHist = { id: string; optionTitle?: string; coinsSpent: number; redeemedAt: string };"
new = "type RedeemHist = { id: string; optionTitle?: string; description?: string; coinsSpent?: number; coinsEarned?: number; redeemedAt: string };"

if old not in content:
    print("ANCHOR NOT FOUND")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("PATCHED OK")
