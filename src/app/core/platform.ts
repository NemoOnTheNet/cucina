import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Style, StatusBar } from '@capacitor/status-bar';

/**
 * Réglages qui n'existent que dans l'application native.
 *
 * Le même code tourne dans un navigateur et dans une WebView Capacitor : tout ce
 * qui est spécifique au natif est isolé ici, et sans effet sur le web.
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  readonly isNative = Capacitor.isNativePlatform();

  /** Aligne la barre système sur le thème clair/sombre du système. */
  async applyNativeChrome(): Promise<void> {
    if (!this.isNative) return;
    try {
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      await StatusBar.setBackgroundColor({ color: dark ? '#2b2320' : '#fbf8f5' });
    } catch {
      // Certains appareils refusent la personnalisation : l'app reste utilisable.
    }
  }
}
