import { createSlice } from '@reduxjs/toolkit';

const THEME_KEY = 'bims_theme';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'dark';
}

export function applyThemeToDom(mode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

const initialMode = getInitialTheme();
applyThemeToDom(initialMode);

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: initialMode,
  },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, state.mode);
      } catch {
        // ignore
      }
      applyThemeToDom(state.mode);
    },
    setTheme(state, action) {
      state.mode = action.payload === 'light' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, state.mode);
      } catch {
        // ignore
      }
      applyThemeToDom(state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
