import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { store } from '../app/store';
import { loginUser } from '../features/auth/authSlice';
import DocumentsVaultPage from '../pages/DocumentsVaultPage';
import InventoryPage from '../pages/InventoryPage';

describe('Landing Homepage & Theme Toggle', () => {
  test('renders Ceylon Spices BIMS Landing Homepage and toggles light/dark theme', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    expect(
      screen.getByText(/Unified Sri Lankan Spice Trade, Inventory & Customs Automation/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/USD \(\$\) International Ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/LKR \(Rs\.\) Domestic Ledger/i)).toBeInTheDocument();

    const themeBtn = screen.getByRole('button', { name: /toggle light\/dark theme/i });
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('Inventory SKU modal uses device file upload instead of URL text field', () => {
    render(
      <Provider store={store}>
        <InventoryPage />
      </Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: /\+ Add SKU/i }));
    const fileInput = screen.getByLabelText(/Upload Product Image from Device/i);
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');
    expect(screen.queryByPlaceholderText(/https:\/\//i)).not.toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/Ask AI about stock levels or export PDF/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
  });

  test('Documents Vault enforces role-based upload & finance restrictions for STAFF vs ADMIN', () => {
    store.dispatch(
      loginUser.fulfilled({
        token: 'staff-test-token',
        user: { userId: 3, name: 'John Doe', role: 'STAFF' },
      })
    );

    const { unmount } = render(
      <Provider store={store}>
        <DocumentsVaultPage />
      </Provider>
    );

    expect(screen.getByText(/Staff · Operational Only/i)).toBeInTheDocument();
    expect(screen.getByText(/Restricted/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /↑ Upload Document/i }));
    expect(screen.getByText(/Staff Role Notice:/i)).toBeInTheDocument();
    const categorySelect = screen.getByLabelText(/Vault Category/i);
    expect(categorySelect.innerHTML).not.toContain('value="FINANCIAL"');
    expect(categorySelect.innerHTML).not.toContain('value="MANAGEMENT"');
    const accessSelect = screen.getByLabelText(/Role Access Level/i);
    expect(accessSelect.innerHTML).not.toContain('value="ADMIN_ONLY"');
    unmount();

    store.dispatch(
      loginUser.fulfilled({
        token: 'admin-test-token',
        user: { userId: 1, name: 'M. L. Umaima', role: 'ADMIN' },
      })
    );

    render(
      <Provider store={store}>
        <DocumentsVaultPage />
      </Provider>
    );

    expect(screen.getByText(/Administrator · Full Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/Unlocked/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /↑ Upload Document/i }));
    expect(screen.getByLabelText(/Vault Category/i).innerHTML).toContain('value="FINANCIAL"');
    expect(screen.getByLabelText(/Role Access Level/i).innerHTML).toContain('value="ADMIN_ONLY"');
    expect(screen.getByLabelText(/Upload Document File from Device/i)).toHaveAttribute('type', 'file');
  });
});
