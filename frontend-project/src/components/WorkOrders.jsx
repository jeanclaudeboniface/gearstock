import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import Modal from './Modal';
import Toast from './Toast';

export default function WorkOrders() {
  const { authAxios, userRole, activeTenantId } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });
  
  const [form, setForm] = useState({
    customerName: '',
    vehiclePlate: '',
    title: '',
    description: '',
    parts: [] // { sparePartId, quantity, unitPrice }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orderRes, partRes] = await Promise.all([
        authAxios.get('/workorders'),
        authAxios.get('/spareparts')
      ]);
      setOrders(orderRes.data);
      setSpareParts(partRes.data.filter(p => p.status === 'ACTIVE'));
    } catch (err) {
      showToast('Failed to sync data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) fetchData();
  }, [activeTenantId]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, visible: true });
  };

  const addPartToOrder = () => {
    setForm({ ...form, parts: [...form.parts, { sparePartId: '', quantity: 1, unitPrice: 0 }] });
  };

  const updatePartItem = (index, field, value) => {
    const newParts = [...form.parts];
    newParts[index][field] = value;
    
    if (field === 'sparePartId') {
      const part = spareParts.find(p => (p.id || p._id) === value);
      if (part) newParts[index].unitPrice = part.unit_price;
    }
    
    setForm({ ...form, parts: newParts });
  };

  const removePartItem = (index) => {
    setForm({ ...form, parts: form.parts.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authAxios.post('/workorders', form);
      showToast('Work order created successfully', 'success');
      setIsModalOpen(false);
      setForm({ customerName: '', vehiclePlate: '', title: '', description: '', parts: [] });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create work order', 'error');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await authAxios.patch(`/workorders/${id}/status`, { status });
      showToast(`Work order marked as ${status}`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Work Orders</h2>
          <p className="text-slate-500 mt-1">Track garage jobs and part consumption.</p>
        </div>
        {['OWNER', 'MANAGER'].includes(userRole) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            New Job Card
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map(order => (
          <div key={order.id || order._id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">{order.orderNumber}</span>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{order.title}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{order.description || 'No description provided.'}</p>
            
            <div className="space-y-3 pt-4 border-t border-slate-50">
              <div className="flex items-center text-sm">
                <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-semibold text-slate-700">{order.customerName}</span>
              </div>
              <div className="flex items-center text-sm">
                <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-mono text-slate-600">{order.vehiclePlate || 'N/A'}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {order.status === 'PENDING' && ['OWNER', 'MANAGER', 'MECHANIC'].includes(userRole) && (
                <button onClick={() => updateStatus(order.id || order._id, 'IN_PROGRESS')} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100">Start Job</button>
              )}
              {order.status === 'IN_PROGRESS' && ['OWNER', 'MANAGER', 'MECHANIC'].includes(userRole) && (
                <button onClick={() => updateStatus(order.id || order._id, 'COMPLETED')} className="text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100">Complete & Deduct Stock</button>
              )}
              {order.status === 'COMPLETED' && ['OWNER', 'MANAGER'].includes(userRole) && (
                <button onClick={() => updateStatus(order.id || order._id, 'CLOSED')} className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-lg hover:bg-slate-200">Archive/Close</button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-400 font-medium">No active work orders. Ready for next job?</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Open New Work Order">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Customer Name</label>
              <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none" placeholder="Joe Doe" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Vehicle Plate</label>
              <input value={form.vehiclePlate} onChange={e => setForm({...form, vehiclePlate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-mono" placeholder="ABC-1234" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Job Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-bold" placeholder="e.g. Brake Replacement" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase">Parts to Consume</label>
              <button type="button" onClick={addPartToOrder} className="text-xs font-bold text-blue-600 hover:text-blue-700">+ Add Part</button>
            </div>
            
            {form.parts.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                   <select 
                    value={p.sparePartId} 
                    onChange={e => updatePartItem(idx, 'sparePartId', e.target.value)} 
                    required 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none bg-white text-sm"
                   >
                     <option value="">-- Select Part --</option>
                     {spareParts.map(sp => <option key={sp.id || sp._id} value={sp.id || sp._id}>{sp.name} (${sp.unit_price})</option>)}
                   </select>
                </div>
                <div className="w-24">
                  <input 
                    type="number" 
                    value={p.quantity} 
                    onChange={e => updatePartItem(idx, 'quantity', parseInt(e.target.value))} 
                    required 
                    min="1" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none text-sm font-mono"
                    placeholder="Qty"
                  />
                </div>
                <button type="button" onClick={() => removePartItem(idx)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-100">
              Create Work Order
            </button>
          </div>
        </form>
      </Modal>

      {toast.visible && <Toast message={toast.message} type={toast.type} onClose={() => setToast(prev => ({...prev, visible: false}))} />}
    </div>
  );
}
