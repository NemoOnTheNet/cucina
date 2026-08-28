import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';

/**
 * Coquille de l'application : en-tête discret, contenu, barre d'onglets basse.
 *
 * L'ordre des onglets reflète la fréquence d'usage réelle (docs/04-architecture.md) :
 * Courses d'abord, parce que c'est l'écran qu'on ouvre en magasin.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly session = inject(SessionStore);
}
