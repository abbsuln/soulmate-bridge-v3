type VibratePattern = number | number[];

export function vibrate(pattern: VibratePattern): void {
  if (window.navigator.vibrate) {
    window.navigator.vibrate(pattern);
  }
}
