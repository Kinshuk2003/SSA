import { OverlayToaster, Position } from '@blueprintjs/core';
import type { Toaster } from '@blueprintjs/core';


let instance: Promise<Toaster> | null = null;

function getToaster(): Promise<Toaster> {
  if (!instance) {
    instance = OverlayToaster.createAsync({ position: Position.TOP_RIGHT });
  }
  return instance!;
}

export async function showSuccess(message: string): Promise<void> {
  const t = await getToaster();
  t.show({ message, intent: 'success', icon: 'tick', timeout: 4000 });
}

export async function showError(message: string): Promise<void> {
  const t = await getToaster();
  t.show({ message, intent: 'danger', icon: 'warning-sign', timeout: 5000 });
}
