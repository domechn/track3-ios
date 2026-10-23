import { documentDir } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { exists, remove } from "@tauri-apps/plugin-fs";
import { isIOS } from "@/utils/platform";

export async function exportFile(
  filename: string,
  extensions: string[],
  write: (path: string) => Promise<void>,
): Promise<boolean> {
  const options = {
    defaultPath: filename,
    filters: [{ name: filename.replace(/\.[^.]+$/, ""), extensions }],
  };
  if (!isIOS()) {
    const path = await save(options);
    if (!path) return false;
    await write(path);
    return true;
  }

  // iOS exports the existing Documents file while the picker is open.
  const source = `${(await documentDir()).replace(/\/+$/, "")}/${filename}`;
  let selected: string | null = null;
  try {
    await write(source);
    selected = await save(options);
    return !!selected;
  } finally {
    const selectedPath = selected?.startsWith("file://")
      ? decodeURIComponent(new URL(selected).pathname)
      : selected;
    if (selectedPath !== source && await exists(source)) {
      await remove(source);
    }
  }
}
