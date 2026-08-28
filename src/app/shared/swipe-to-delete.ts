import { Directive, ElementRef, HostListener, inject, output, signal } from '@angular/core';

const THRESHOLD_PX = 96;
const DIRECTION_LOCK_PX = 12;

/**
 * Balayage latéral pour supprimer une ligne (histoire L1.7).
 *
 * Suit le doigt, ne se déclenche qu'au-delà d'un seuil franc, et laisse la ligne
 * revenir en place sinon. Le geste vertical (défilement) reste prioritaire.
 */
@Directive({
  selector: '[appSwipeToDelete]',
  host: {
    '[style.transform]': 'offset() ? "translateX(" + offset() + "px)" : ""',
    '[style.transition]': 'dragging() ? "none" : "transform 180ms ease"',
    '[class.swiping]': 'dragging()',
  },
})
export class SwipeToDelete {
  readonly swiped = output<void>();

  protected readonly offset = signal(0);
  protected readonly dragging = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private startX = 0;
  private startY = 0;
  private locked: 'none' | 'horizontal' | 'vertical' = 'none';
  private pointerId: number | null = null;

  @HostListener('pointerdown', ['$event'])
  protected onDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.locked = 'none';
    this.dragging.set(true);
  }

  @HostListener('pointermove', ['$event'])
  protected onMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId || !this.dragging()) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;

    if (this.locked === 'none') {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return;
      this.locked = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (this.locked === 'horizontal') {
        (this.host.nativeElement as HTMLElement).setPointerCapture(event.pointerId);
      }
    }
    if (this.locked !== 'horizontal') return;

    // On ne glisse que vers la gauche : la droite n'a aucune action associée.
    this.offset.set(Math.min(0, dx));
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  protected onUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    this.dragging.set(false);

    if (this.offset() <= -THRESHOLD_PX) {
      this.swiped.emit();
    }
    this.offset.set(0);
    this.locked = 'none';
  }
}
