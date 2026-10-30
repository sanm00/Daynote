import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAppStore } from '@/store';
import { AppearanceSettings } from './AppearanceSettings';

beforeEach(() => {
  useAppStore.setState({ settings: { theme: 'light', palette: 'morandi', defaultTag: '工作' } });
  useAppStore.getState().applyTheme();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('switches palettes and modes independently with accessible selected states', () => {
  render(<AppearanceSettings />);
  fireEvent.click(screen.getByRole('button', { name: /暖色/ }));
  fireEvent.click(screen.getByRole('button', { name: /深色/ }));
  expect(useAppStore.getState().settings).toEqual({ palette: 'warm', theme: 'dark', defaultTag: '工作' });
  expect(document.documentElement.dataset).toMatchObject({ palette: 'warm', theme: 'dark' });
  fireEvent.click(screen.getByRole('button', { name: /磨玻璃/ }));
  expect(document.documentElement.dataset).toMatchObject({ palette: 'morandi', theme: 'dark' });
  expect(screen.getByRole('button', { name: /磨玻璃/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /暖色/ })).toHaveAttribute('aria-pressed', 'false');
});

it('resolves system mode without changing the chosen palette', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  render(<AppearanceSettings />);
  fireEvent.click(screen.getByRole('button', { name: /跟随系统/ }));
  expect(useAppStore.getState().settings.theme).toBe('system');
  expect(document.documentElement.dataset).toMatchObject({ palette: 'morandi', theme: 'dark' });
});
