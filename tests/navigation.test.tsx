import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../src/components/layout/Sidebar';
import { useAuthStore } from '../src/stores/authStore';

vi.mock('../src/context/AuthContext', () => ({ useAuth: () => useAuthStore() }));
afterEach(() => { cleanup(); useAuthStore.getState().clearSession(); });

function login(permissions: string[], admin = false) {
  useAuthStore.getState().saveSession({
    access_token: 'access', refresh_token: 'refresh', expires_in: 3600, expires_at: null,
    user: { id: 'user-1', email: 'user@example.com', is_first_login: false, is_super_admin: admin, permissions },
  });
}
function mount() {
  render(<MemoryRouter><Sidebar isOpen onClose={() => {}} /></MemoryRouter>);
}
const menuPaths = () => screen.getAllByRole('link').map((link) => link.getAttribute('href'));

it('shows only the dashboard and USER_VIEW menu from login permissions', () => {
  login(['USER_VIEW']);
  mount();
  expect(menuPaths()).toEqual(['/', '/users']);
});

it('reacts to permission changes and distinguishes view from update permissions', () => {
  login(['USER_UPDATE']);
  mount();
  expect(menuPaths()).toEqual(['/']);
  act(() => login(['HR_VIEW', 'DOC_VIEW', 'settings.audit']));
  expect(menuPaths()).toEqual(['/', '/hr', '/documents', '/audit-logs']);
  act(() => login([]));
  expect(menuPaths()).toEqual(['/']);
});

it('uses the same settings and reports permissions as the page guards', () => {
  login(['PERM_VIEW', 'REPORT_VIEW', 'settings.view']);
  mount();
  expect(menuPaths()).toEqual(['/', '/permissions', '/reports', '/settings']);
});

it('preserves full menu access for super admins', () => {
  login([], true);
  mount();
  expect(menuPaths()).toEqual(['/', '/permissions', '/users', '/hr', '/reports', '/documents', '/settings', '/audit-logs']);
});
