'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, CurrencyInput } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface LineItemData {
  action: string;
  amount: number;
  description: string;
}

interface LineItemEditorProps {
  items: LineItemData[];
  onChange: (items: LineItemData[]) => void;
  disabled?: boolean;
}

export function LineItemEditor({ items, onChange, disabled = false }: LineItemEditorProps) {
  const addItem = () => {
    onChange([...items, { action: '', amount: 0, description: '' }]);
  };

  const updateItem = (index: number, field: keyof LineItemData, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange(newItems);
  };

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-secondary">Line Items</h3>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-border">
          <p className="text-secondary-light mb-4">No line items yet</p>
          {!disabled && (
            <Button type="button" variant="primary" onClick={addItem}>
              Add First Item
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 rounded-lg border border-border"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-secondary-light">
                  Item #{index + 1}
                </span>
                {!disabled && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-secondary-light hover:text-secondary disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      className="p-1 text-secondary-light hover:text-secondary disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-danger hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Action"
                  placeholder="e.g., Attic, Soffit, Deck"
                  value={item.action}
                  onChange={(e) => updateItem(index, 'action', e.target.value)}
                  disabled={disabled}
                />
                <CurrencyInput
                  label="Amount"
                  value={item.amount}
                  onChange={(value) => updateItem(index, 'amount', value)}
                  disabled={disabled}
                />
                <div className="md:col-span-1">
                  <Textarea
                    label="Description"
                    placeholder="Detailed description of work..."
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    disabled={disabled}
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex justify-end pt-4 border-t border-border">
        <div className="text-right">
          <p className="text-sm text-secondary-light">Total</p>
          <p className="text-2xl font-bold text-primary">
            ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}
