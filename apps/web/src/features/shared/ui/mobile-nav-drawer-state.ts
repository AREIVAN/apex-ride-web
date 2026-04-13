export function toggleMobileNavDrawer(previousOpen: boolean): boolean {
  return !previousOpen;
}

export function closeMobileNavDrawer(): boolean {
  return false;
}

export function isMobileNavViewport(widthPx: number): boolean {
  return widthPx < 1024;
}
