import { Platform, useWindowDimensions } from 'react-native';

const DESKTOP_WEB_BREAKPOINT = 1024;

export function useIsDesktopWeb() {
  const { width } = useWindowDimensions();

  return Platform.OS === 'web' && width >= DESKTOP_WEB_BREAKPOINT;
}
