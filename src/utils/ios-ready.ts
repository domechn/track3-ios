import { invoke } from "@tauri-apps/api/core";
import { isIOS } from "@/utils/platform";

export function isAppContentRendered(): boolean {
  const main = document.getElementById("app-main-content");
  return !!main?.querySelector("h1") && !main.querySelector('[aria-busy="true"]');
}

export async function markIOSReady(): Promise<void> {
  if (!isIOS()) return;
  for (let frame = 0; frame < 600; frame++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (isAppContentRendered()) {
      await invoke("mark_frontend_ready");
      return;
    }
  }
}
