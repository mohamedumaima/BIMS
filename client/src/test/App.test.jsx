import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { store } from '../app/store';
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
});
