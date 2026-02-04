import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import Modal from './Modal';
import Toast from './Toast';

export default function StockOutForm() {
  const { authAxios, userRole, activeTenantId } = useContext(AuthContext);
  const [spareParts, setSpareParts] = useState([]);
  const [stockOuts, setStockOuts] = useState([]);
  const [form, setForm] = useState({
    id: null,
    spare_part_id: '',
    stock_out_quantity: '',
    stock_out_unit_price: '',
    stock_out_total_price: '',
    stock_out_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

  const fetchSpareParts = async () => {
    try {
      const res = await authAxios.get('/spareparts');
      setSpareParts(res.data);
    } catch (err) {
      setError('Failed to fetch spare parts');
      showToast('Failed to fetch spare parts', 'error');
    }
  };

  const fetchStockOuts = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/stockout');
      setStockOuts(res.data);
    } catch (err) {
      setError('Failed to fetch stock out records');
      showToast('Failed to fetch stock out records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      fetchSpareParts();
      fetchStockOuts();
    }
  }, [activeTenantId]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      if (name === 'stock_out_quantity' || name === 'stock_out_unit_price') {
        const quantity = parseFloat(newForm.stock_out_quantity) || 0;
        const unitPrice = parseFloat(newForm.stock_out_unit_price) || 0;
        newForm.stock_out_total_price = (quantity * unitPrice).toFixed(2);
      }
      return newForm;
    });
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type, visible: true });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        spare_part_id: form.spare_part_id,
        stock_out_quantity: parseInt(form.stock_out_quantity),
        stock_out_unit_price: parseFloat(form.stock_out_unit_price),
        stock_out_total_price: parseFloat(form.stock_out_total_price),
        stock_out_date: form.stock_out_date,
      };
      if (form.id) {
        await authAxios.put(`/stockout/${form.id}`, payload);
        showToast('Stock out record updated successfully', 'success');
      } else {
        await authAxios.post('/stockout', payload);
        showToast('Stock out record added successfully', 'success');
      }
      setForm({
        id: null,
        spare_part_id: '',
        stock_out_quantity: '',
        stock_out_unit_price: '',
        stock_out_total_price: '',
        stock_out_date: '',
      });
      setIsModalOpen(false);
      fetchStockOuts();
    } catch (err) {
      setError('Failed to save stock out record');
      showToast('Failed to save stock out record', 'error');
    }
  };

  const handleEdit = record => {
    setForm({
      id: record.id,
      spare_part_id: record.spare_part_id,
      stock_out_quantity: record.stock_out_quantity,
      stock_out_unit_price: record.stock_out_unit_price,
      stock_out_total_price: record.stock_out_total_price,
      stock_out_date: record.stock_out_date,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this stock out record?')) return;
    try {
      await authAxios.delete(`/stockout/${id}`);
      showToast('Stock out record deleted successfully', 'success');
      fetchStockOuts();
    } catch (err) {
      setError('Failed to delete stock out record');
      showToast('Failed to delete stock out record', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Stock Out</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      {userRole !== 'VIEWER' && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-6 gap-4">
        <select
          name="spare_part_id"
          value={form.spare_part_id}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select Spare Part</option>
          {spareParts.map(sp => (
            <option key={sp.id} value={sp.id}>{sp.name}</option>
          ))}
        </select>
        <input
          type="number"
          name="stock_out_quantity"
          placeholder="Quantity"
          value={form.stock_out_quantity}
          onChange={handleChange}
          min="1"
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="number"
          name="stock_out_unit_price"
          placeholder="Unit Price"
          value={form.stock_out_unit_price}
          onChange={handleChange}
          step="0.01"
          min="0"
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="number"
          name="stock_out_total_price"
          placeholder="Total Price"
          value={form.stock_out_total_price}
          readOnly
          className="border border-gray-300 rounded px-3 py-2 bg-gray-100"
        />
        <input
          type="date"
          name="stock_out_date"
          value={form.stock_out_date}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition"
        >
          {form.id ? 'Update' : 'Add'}
        </button>
      </form>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {stockOuts.map(so => (
          <div key={so.id} className="bg-white p-4 rounded shadow border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg">{so.spare_part_name}</h3>
                <span className="text-sm text-gray-500">{new Date(so.stock_out_date).toLocaleDateString()}</span>
              </div>
              {userRole !== 'VIEWER' && (
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(so)} className="text-blue-600 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(so.id)} className="text-red-600 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
              <span className="text-gray-600">Quantity Out:</span>
              <span className="font-mono font-semibold text-red-600">-{so.stock_out_quantity}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-gray-600">Total Price:</span>
              <span className="font-mono">{Number(so.stock_out_total_price).toFixed(2)}</span>
            </div>
          </div>
        ))}
         {stockOuts.length === 0 && (
          <div className="text-center text-gray-500 py-8 bg-white rounded shadow">No stock out records found.</div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white rounded shadow">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Spare Part</th>
              <th className="p-2 text-right">Quantity</th>
              <th className="p-2 text-right">Unit Price</th>
              <th className="p-2 text-right">Total Price</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stockOuts.map(so => (
              <tr key={so.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{so.spare_part_name}</td>
                <td className="p-2 text-right">{so.stock_out_quantity}</td>
                <td className="p-2 text-right">{Number(so.stock_out_unit_price).toFixed(2)}</td>
                <td className="p-2 text-right">{Number(so.stock_out_total_price).toFixed(2)}</td>
                <td className="p-2">{new Date(so.stock_out_date).toLocaleDateString()}</td>
                {userRole !== 'VIEWER' && (
                  <td className="p-2 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(so)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(so.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {stockOuts.length === 0 && (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  No stock out records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? 'Update Stock Out' : 'Add Stock Out'}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <select
            name="spare_part_id"
            value={form.spare_part_id}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Select Spare Part</option>
            {spareParts.map(sp => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>
          <input
            type="number"
            name="stock_out_quantity"
            placeholder="Quantity"
            value={form.stock_out_quantity}
            onChange={handleChange}
            min="1"
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="number"
            name="stock_out_unit_price"
            placeholder="Unit Price"
            value={form.stock_out_unit_price}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="number"
            name="stock_out_total_price"
            placeholder="Total Price"
            value={form.stock_out_total_price}
            readOnly
            className="border border-gray-300 rounded px-3 py-2 bg-gray-100"
          />
          <input
            type="date"
            name="stock_out_date"
            value={form.stock_out_date}
            onChange={handleChange}
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition"
            >
              {form.id ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}
