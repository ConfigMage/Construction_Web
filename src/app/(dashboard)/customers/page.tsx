'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAllCustomers, searchCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/actions/customers';
import { PageHeader } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input, PhoneInput } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/spinner';
import type { Customer } from '@/lib/db/schema';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  // Load customers
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (err) {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Search customers
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    startTransition(async () => {
      try {
        const data = await searchCustomers(term);
        setCustomers(data);
      } catch (err) {
        setError('Search failed');
      }
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setError(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setEditingCustomer(customer);
  };

  // Handle save
  const handleSave = async () => {
    setError(null);

    if (editingCustomer) {
      // Update
      const result = await updateCustomer(editingCustomer.id, formData);
      if (result.success) {
        setSuccess('Customer updated successfully');
        setEditingCustomer(null);
        loadCustomers();
      } else {
        setError(result.error || 'Failed to update customer');
      }
    } else {
      // Create
      const result = await createCustomer(formData);
      if (result.success) {
        setSuccess('Customer created successfully');
        setIsAddModalOpen(false);
        loadCustomers();
      } else {
        setError(result.error || 'Failed to create customer');
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingCustomer) return;

    const result = await deleteCustomer(deletingCustomer.id);
    if (result.success) {
      setSuccess('Customer deleted successfully');
      setDeletingCustomer(null);
      loadCustomers();
    } else {
      setError(result.error || 'Failed to delete customer');
      setDeletingCustomer(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading customers..." />;
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        actions={
          <Button onClick={openAddModal}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </Button>
        }
      />

      {/* Alerts */}
      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search customers by name, phone, email, or address..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableEmpty colSpan={5} message="No customers found" />
          ) : (
            customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.email || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">{customer.address || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(customer)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingCustomer(customer)}
                      className="text-danger hover:text-danger"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingCustomer}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCustomer(null);
          resetForm();
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Customer name"
          />
          <PhoneInput
            label="Phone *"
            value={formData.phone}
            onChange={(value) => setFormData({ ...formData, phone: value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
          />
          <Textarea
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Full address"
          />
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
          />

          {error && (
            <Alert variant="danger">{error}</Alert>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingCustomer(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deletingCustomer?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
