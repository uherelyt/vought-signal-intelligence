const PRIMARY_MATERIAL_CHANNEL = "1556062516470358126";
const LEGACY_CHANNEL_NAMES = [
  "vought-hq",
  "vought-store",
  "vought-support",
  "vought-logs",
  "vought-starboard",
  "vought-suggestions",
];

export async function consolidateVoughtChannels(guild: any) {
  const primary = guild.channels.cache.get(PRIMARY_MATERIAL_CHANNEL);
  if (!primary?.isTextBased()) throw new Error("Canonical #material channel is unavailable");

  const removed: string[] = [];
  for (const name of LEGACY_CHANNEL_NAMES) {
    const legacy = guild.channels.cache.find((channel: any) => channel.name === name);
    if (legacy && legacy.id !== PRIMARY_MATERIAL_CHANNEL) {
      const deleted = await legacy.delete("Consolidated into canonical #material Vought International channel").then(() => true).catch(() => false);
      if (deleted) removed.push(name);
    }
  }

  await guild.channels.fetch().catch(() => {});
  const category = guild.channels.cache.find(
    (channel: any) => channel.type === 4 && channel.name === "VOUGHT INTERNATIONAL",
  );
  let removedCategory = false;
  if (category && category.children?.cache?.size === 0) {
    removedCategory = await category.delete("Vought International consolidated into #material").then(() => true).catch(() => false);
  }

  console.info("[vought-material-consolidated]", JSON.stringify({guildId:guild.id,primaryChannelId:PRIMARY_MATERIAL_CHANNEL,removed,removedCategory}));
  return primary;
}
