import { appCacheDir } from "@tauri-apps/api/path";
import { remove } from "@tauri-apps/plugin-fs";
import { shareIOSFile } from "./ios-native";

export async function shareExport(write: (path: string) => Promise<void>): Promise<void> {
  const path = `${(await appCacheDir()).replace(/\/+$/, "")}/track3-export-data-${crypto.randomUUID()}.json`;
  try {
    await write(path);
    await shareIOSFile(path);
  } finally {
    await remove(path).catch(() => {});
  }
}
