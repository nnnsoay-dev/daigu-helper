import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, Package, DollarSign, Trash2, Settings, Download, Upload, 
  AlertCircle, ShoppingBag, Truck, CheckCircle, Clock, Calculator, 
  Store, Calendar, Tag, Users, Plane, ClipboardList, Send, CreditCard,
  Check, Circle, Edit, X, Filter, TrendingUp, AlertTriangle, ArrowRight
} from 'lucide-react';

const DaigouApp = () => {
  // --- 狀態管理 ---
  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const fileInputRef = useRef(null);
  
  // 篩選狀態：false = 只看未完成 (待辦), true = 顯示全部
  const [showAllOrders, setShowAllOrders] = useState(false);

  // 編輯模式狀態
  const [editingOrder, setEditingOrder] = useState(null);

  // 新訂單表單狀態
  const [newOrder, setNewOrder] = useState({
    date: new Date().toISOString().split('T')[0],
    clientCode: '',
    store: '',
    productName: '',
    spec: '',
    quantity: 1,
    costKRW: '',      
    exchangeRate: '',
    price: '',        
    status: 'checking',
    isPaid: false,          // 商品款項
    isShippingPaid: false,  // 國際運費款項
    note: ''
  });

  // --- 初始化與本地存儲 ---
  useEffect(() => {
    const savedOrders = localStorage.getItem('daigou_orders');
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
      } catch (e) {
        console.error("讀取資料失敗", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('daigou_orders', JSON.stringify(orders));
  }, [orders]);

  // --- 輔助計算 ---
  const calculateCostTWD = (krw, rate) => {
    if (!krw || !rate) return 0;
    // 假設匯率輸入如果是 > 1 (如 40)，則用除法；如果 < 1 (如 0.025)，則用乘法
    const k = parseFloat(krw);
    const r = parseFloat(rate);
    return r > 1 ? Math.round(k / r) : Math.round(k * r);
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num);
  };
  
  const formatKRW = (num) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', minimumFractionDigits: 0 }).format(num);
  };

  // --- 資料備份與匯入 ---
  const handleExport = () => {
    const dataStr = JSON.stringify(orders, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daigou_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedOrders = JSON.parse(e.target.result);
        if (Array.isArray(importedOrders)) {
          if (window.confirm(`系統偵測到 ${importedOrders.length} 筆資料。\n\n警告：匯入將會「覆蓋」目前所有的訂單資料。\n\n確定要繼續嗎？`)) {
            setOrders(importedOrders);
            alert('資料匯入成功！');
          }
        } else {
          alert('檔案格式錯誤！');
        }
      } catch (error) {
        alert('讀取檔案失敗，請重試。');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // --- 狀態設定 ---
  const statusConfig = {
    checking:      { label: '確認中',       color: 'bg-stone-100 text-stone-600', icon: <Clock size={14} /> },
    paid:          { label: '已匯款',       color: 'bg-blue-50 text-blue-600',    icon: <CreditCard size={14} /> },
    verified:      { label: '對帳完成',     color: 'bg-indigo-50 text-indigo-600', icon: <CheckCircle size={14} /> },
    ordered_kr:    { label: '韓國端下單',   color: 'bg-orange-50 text-orange-600', icon: <ShoppingBag size={14} /> },
    shipped_kr:    { label: '韓國端出貨',   color: 'bg-amber-50 text-amber-600',   icon: <Truck size={14} /> },
    consolidation: { label: '待集運回台',   color: 'bg-purple-50 text-purple-600', icon: <Package size={14} /> },
    arrived_tw:    { label: '已抵台',       color: 'bg-pink-50 text-pink-600',     icon: <Plane size={14} /> },
    sorting:       { label: '抵台整理中',   color: 'bg-yellow-50 text-yellow-600', icon: <ClipboardList size={14} /> },
    pickup:        { label: '待面交',       color: 'bg-teal-50 text-teal-600',     icon: <Users size={14} /> },
    shipped_tw:    { label: '已寄出',       color: 'bg-sky-50 text-sky-600',       icon: <Send size={14} /> },
    completed:     { label: '訂單完成',     color: 'bg-green-50 text-green-600',   icon: <CheckCircle size={14} /> },
  };

  // --- 事件處理 ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOrder({ ...newOrder, [name]: value });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingOrder({ ...editingOrder, [name]: value });
  };

  const addOrder = (e) => {
    e.preventDefault();
    if (!newOrder.clientCode || !newOrder.productName || !newOrder.price) return;

    let finalTotalCostTWD = 0;
    if (newOrder.costKRW && newOrder.exchangeRate) {
      finalTotalCostTWD = calculateCostTWD(newOrder.costKRW, newOrder.exchangeRate);
    }
    
    const inputQuantity = Number(newOrder.quantity) || 1;
    const inputTotalPrice = Number(newOrder.price) || 0;

    const order = {
      id: Date.now(),
      ...newOrder,
      costTWD: finalTotalCostTWD,
      costKRW: Number(newOrder.costKRW) || 0,
      exchangeRate: Number(newOrder.exchangeRate) || 0,
      quantity: inputQuantity,
      totalPrice: inputTotalPrice,
      price: inputTotalPrice / inputQuantity,
      status: 'checking',
      isTotalCost: true,
      isPaid: newOrder.isPaid,
      isShippingPaid: newOrder.isShippingPaid
    };

    setOrders([order, ...orders]);
    setNewOrder({ 
      date: new Date().toISOString().split('T')[0],
      clientCode: '', 
      store: '',
      productName: '', 
      spec: '',
      quantity: 1,
      costKRW: '', 
      exchangeRate: newOrder.exchangeRate, 
      price: '', 
      status: 'checking', 
      isPaid: false,
      isShippingPaid: false,
      note: '' 
    });
    alert('訂單已成立！');
  };

  // 更新訂單 (編輯模式用)
  const updateOrder = (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    // 重新計算成本
    let finalTotalCostTWD = editingOrder.costTWD;
    if (editingOrder.costKRW && editingOrder.exchangeRate) {
      finalTotalCostTWD = calculateCostTWD(editingOrder.costKRW, editingOrder.exchangeRate);
    }

    const inputQuantity = Number(editingOrder.quantity) || 1;
    const inputTotalPrice = Number(editingOrder.price) || 0; 

    const updatedOrder = {
      ...editingOrder,
      costTWD: finalTotalCostTWD,
      costKRW: Number(editingOrder.costKRW) || 0,
      exchangeRate: Number(editingOrder.exchangeRate) || 0,
      quantity: inputQuantity,
      totalPrice: inputTotalPrice,
      price: inputTotalPrice / inputQuantity,
    };

    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setEditingOrder(null); 
  };

  const updateStatus = (id, newStatus) => {
    setOrders(orders.map(order => order.id === id ? { ...order, status: newStatus } : order));
  };

  const togglePaid = (id) => {
    setOrders(orders.map(order => order.id === id ? { ...order, isPaid: !order.isPaid } : order));
  };

  const toggleShippingPaid = (id) => {
    setOrders(orders.map(order => order.id === id ? { ...order, isShippingPaid: !order.isShippingPaid } : order));
  };

  const deleteOrder = (id) => {
    if (window.confirm('確定要刪除這筆訂單嗎？')) {
      setOrders(orders.filter(order => order.id !== id));
    }
  };

  // --- 統計計算 ---
  const calculateStats = () => {
    const totalRevenue = orders.reduce((sum, order) => {
      const revenue = order.totalPrice !== undefined ? order.totalPrice : (order.price * (order.quantity || 1));
      return sum + revenue;
    }, 0);
    
    const totalCost = orders.reduce((sum, order) => {
      if (order.isTotalCost) {
        return sum + (order.costTWD || 0);
      } else {
        const unitCost = order.costTWD !== undefined ? order.costTWD : (order.cost || 0);
        return sum + (unitCost * (order.quantity || 1));
      }
    }, 0);

    // 新增：未收金額計算 (只算商品款項 isPaid 為 false 的)
    const totalUnpaid = orders.reduce((sum, order) => {
      if (!order.isPaid) {
        const revenue = order.totalPrice !== undefined ? order.totalPrice : (order.price * (order.quantity || 1));
        return sum + revenue;
      }
      return sum;
    }, 0);

    const netProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    
    const statusCounts = orders.reduce((acc, order) => {
      const currentStatus = statusConfig[order.status] ? order.status : 'checking';
      acc[currentStatus] = (acc[currentStatus] || 0) + 1;
      return acc;
    }, {});

    return { totalRevenue, totalCost, netProfit, profitMargin, statusCounts, totalUnpaid };
  };

  const stats = calculateStats();

  // --- 即時計算變數 ---
  const currentTotalCostTWD = calculateCostTWD(newOrder.costKRW, newOrder.exchangeRate);
  const currentTotalRevenue = Number(newOrder.price) || 0;
  const currentProfit = currentTotalRevenue - currentTotalCostTWD;

  // --- 篩選訂單邏輯 (更新) ---
  // 修改：如果是 "顯示全部"，顯示所有訂單。
  // 否則，顯示所有非 'completed' 的訂單 (不限制筆數)。
  const visibleOrders = showAllOrders 
    ? orders 
    : orders.filter(o => o.status !== 'completed');

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-700 font-sans selection:bg-stone-200 relative">
      {/* 字體設定：英文 MS Gothic, 中文 Zen Maru Gothic (粉圓體風格) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap');
        .font-sans {
          font-family: 'MS Gothic', 'Zen Maru Gothic', sans-serif;
        }
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 隱藏的檔案輸入框 */}
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        onChange={handleImport} 
        className="hidden" 
      />

      {/* 頂部標題 */}
      <header className="fixed top-0 left-0 right-0 bg-[#FDFBF7]/90 backdrop-blur-md z-10 px-6 py-4 border-b border-stone-100">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">代購利潤計算表</h1>
          <div className="flex items-center gap-3">
             <div className="text-xs text-stone-400 font-medium px-3 py-1 bg-stone-100 rounded-full">
              {orders.length} 筆
            </div>
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="pt-24 pb-28 px-4 max-w-2xl mx-auto z-0 relative">
        
        {/* 1. 成立訂單頁面 */}
        {activeTab === 'orders' && (
          <div className="max-w-md mx-auto fade-in">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-stone-100">
              <h2 className="text-xl font-bold text-stone-700 mb-6 flex items-center gap-2">
                <PlusCircle className="text-stone-400" />
                建立新訂單
              </h2>
              <form onSubmit={addOrder} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1 ml-1 flex items-center gap-1"><Calendar size={12}/> 日期</label>
                    <input
                      type="date"
                      name="date"
                      value={newOrder.date}
                      onChange={handleInputChange}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1 ml-1 flex items-center gap-1"><Users size={12}/> 代號</label>
                    <input
                      type="text"
                      name="clientCode"
                      value={newOrder.clientCode}
                      onChange={handleInputChange}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700"
                      placeholder="例如：C01"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                   <div className="col-span-1">
                    <label className="block text-xs font-medium text-stone-500 mb-1 ml-1 flex items-center gap-1"><Store size={12}/> 店家</label>
                    <input
                      type="text"
                      name="store"
                      value={newOrder.store}
                      onChange={handleInputChange}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700"
                      placeholder="店名"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-stone-500 mb-1 ml-1 flex items-center gap-1"><Tag size={12}/> 商品名稱</label>
                    <input
                      type="text"
                      name="productName"
                      value={newOrder.productName}
                      onChange={handleInputChange}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700"
                      placeholder="商品名稱"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">規格/顏色</label>
                    <input
                      type="text"
                      name="spec"
                      value={newOrder.spec}
                      onChange={handleInputChange}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700"
                      placeholder="例如：米白 / M"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">數量</label>
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      value={newOrder.quantity}
                      onChange={handleInputChange}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700 text-center"
                      required
                    />
                  </div>
                </div>

                <div className="h-px bg-stone-100 my-2"></div>

                <div className="grid grid-cols-2 gap-4 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">總成本 (KRW)</label>
                    <input
                      type="number"
                      name="costKRW"
                      value={newOrder.costKRW}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700"
                      placeholder="₩"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">匯率</label>
                    <input
                      type="number"
                      step="0.0001"
                      name="exchangeRate"
                      value={newOrder.exchangeRate}
                      onChange={handleInputChange}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700"
                      placeholder="42.5"
                    />
                  </div>
                  <div className="col-span-2 text-right text-xs text-stone-400">
                    折合台幣總成本：<span className="font-medium text-stone-600">{formatCurrency(currentTotalCostTWD)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">總售價 (TWD)</label>
                  <input
                    type="number"
                    name="price"
                    value={newOrder.price}
                    onChange={handleInputChange}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700"
                    placeholder="NT$ 訂單總金額"
                    required
                  />
                </div>
                
                {/* 收款狀態勾選框 */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => setNewOrder({...newOrder, isPaid: !newOrder.isPaid})}
                  >
                     <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${newOrder.isPaid ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-stone-300 text-transparent'}`}>
                       <Check size={14} strokeWidth={3} />
                     </div>
                     <span className={`text-sm font-medium ${newOrder.isPaid ? 'text-green-600' : 'text-stone-500'}`}>
                       商品已收款
                     </span>
                  </div>

                  <div 
                    className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => setNewOrder({...newOrder, isShippingPaid: !newOrder.isShippingPaid})}
                  >
                     <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${newOrder.isShippingPaid ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-stone-300 text-transparent'}`}>
                       <Check size={14} strokeWidth={3} />
                     </div>
                     <span className={`text-sm font-medium ${newOrder.isShippingPaid ? 'text-blue-600' : 'text-stone-500'}`}>
                       運費已匯款
                     </span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-stone-800 text-stone-100 px-4 py-3 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <Calculator size={16} className="text-stone-400" />
                    <span className="text-sm">預估總利潤</span>
                  </div>
                  <div className={`text-lg font-bold ${currentProfit < 0 ? 'text-red-300' : 'text-green-300'}`}>
                    {formatCurrency(currentProfit)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">備註 (選填)</label>
                  <textarea
                    name="note"
                    value={newOrder.note}
                    onChange={handleInputChange}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 transition-all text-stone-700"
                    rows="2"
                    placeholder="其他紀錄..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-stone-700 hover:bg-stone-800 text-white font-medium py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all transform active:scale-95 mt-4"
                >
                  成立訂單
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. 貨況追蹤頁面 */}
        {activeTab === 'tracking' && (
          <div className="space-y-4 pb-20 fade-in">
             {/* 篩選與空狀態控制 */}
             <div className="flex justify-between items-center mb-2 px-1">
                <h3 className="text-sm font-bold text-stone-500">
                  {showAllOrders ? '所有訂單' : '待辦事項 (未完成)'}
                </h3>
                <button 
                  onClick={() => setShowAllOrders(!showAllOrders)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showAllOrders ? 'bg-stone-700 text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200'}`}
                >
                  <Filter size={12} />
                  {showAllOrders ? '顯示全部' : '只看未完成'}
                </button>
             </div>

             {orders.length === 0 ? (
               <div className="text-center py-20 text-stone-400">
                 <Package size={48} className="mx-auto mb-4 opacity-50" />
                 <p>目前沒有訂單，去新增一筆吧！</p>
               </div>
             ) : visibleOrders.length === 0 ? (
                <div className="text-center py-20 text-stone-400">
                  <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-green-300" />
                  <p>太棒了！所有訂單都已完成。<br/>點擊「顯示全部」查看歷史紀錄。</p>
                </div>
             ) : (
               visibleOrders.map((order) => {
                  const clientName = order.clientCode || order.clientName; 
                  const qty = order.quantity || 1;
                  const revenue = order.totalPrice !== undefined ? order.totalPrice : (order.price * qty);
                  
                  let totalOrderCost = 0;
                  if (order.isTotalCost) {
                     totalOrderCost = order.costTWD || 0;
                  } else {
                     const unitCost = order.costTWD !== undefined ? order.costTWD : (order.cost || 0);
                     totalOrderCost = unitCost * qty;
                  }

                  const profit = revenue - totalOrderCost;
                  const currentStatusKey = statusConfig[order.status] ? order.status : 'checking';
                  const currentStatusConfig = statusConfig[currentStatusKey];

                  return (
                    <div key={order.id} className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 relative group transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-2 w-[85%]">
                           <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <Calendar size={10} className="text-stone-400"/>
                                {order.date}
                              </span>
                              <span className="text-[10px] font-bold text-white bg-stone-400 px-2 py-1 rounded-full flex items-center gap-1">
                                 <Users size={10} />
                                 {clientName}
                              </span>
                              {order.store && (
                                   <span className="text-[10px] text-stone-400 border border-stone-200 px-2 py-1 rounded-full flex items-center gap-1">
                                      <Store size={10} />
                                      {order.store}
                                   </span>
                              )}
                              
                              <div className="flex gap-1">
                                <button
                                  onClick={() => togglePaid(order.id)}
                                  className={`text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1 transition-colors border ${
                                    order.isPaid 
                                      ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' 
                                      : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100 hover:text-stone-500'
                                  }`}
                                  title="商品款項"
                                >
                                  {order.isPaid ? <CheckCircle size={10} /> : <Circle size={10} />}
                                  {order.isPaid ? '已收' : '未收'}
                                </button>
                                <button
                                  onClick={() => toggleShippingPaid(order.id)}
                                  className={`text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1 transition-colors border ${
                                    order.isShippingPaid 
                                      ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                                      : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100 hover:text-stone-500'
                                  }`}
                                  title="國際運費"
                                >
                                  <Plane size={10} />
                                  {order.isShippingPaid ? '運費OK' : '運費未付'}
                                </button>
                              </div>
                           </div>
                           
                           {order.note && (
                              <div className="text-xs text-stone-500 pl-1 leading-relaxed">
                                 <span className="font-medium text-stone-400 mr-1">註:</span>{order.note}
                              </div>
                           )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <button 
                            onClick={() => setEditingOrder(order)}
                            className="text-stone-300 hover:text-blue-400 p-1 transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => deleteOrder(order.id)}
                            className="text-stone-300 hover:text-red-400 p-1 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-2">
                          <h3 className="font-bold text-stone-800 text-lg leading-tight break-words">
                              {order.productName}
                              {order.spec && <span className="ml-2 inline-block text-sm font-normal text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100 align-middle">{order.spec}</span>}
                          </h3>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold text-stone-700">x{qty}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 bg-stone-50 p-3 rounded-2xl">
                         <div>
                           <div className="text-xs text-stone-400">總金額</div>
                           <div className="text-stone-700 font-bold flex items-center gap-1.5 flex-wrap">
                              {formatCurrency(revenue)}
                              <span className={`text-xs font-normal ${profit >= 0 ? 'text-stone-400' : 'text-red-400'}`}>
                                 ({profit >= 0 ? '+' : ''}{formatCurrency(profit)})
                              </span>
                           </div>
                           {order.costKRW > 0 && (
                              <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                                 {formatKRW(order.costKRW)} 
                                 <span className="text-stone-300">|</span> 
                                 匯率 {order.exchangeRate}
                              </div>
                           )}
                         </div>
                         
                         <div className="relative flex-shrink-0 ml-2">
                           <select 
                              value={currentStatusKey}
                              onChange={(e) => updateStatus(order.id, e.target.value)}
                              className={`appearance-none pl-8 pr-6 py-2 rounded-full text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-stone-200 outline-none transition-colors max-w-[130px] truncate ${currentStatusConfig.color}`}
                           >
                             {Object.keys(statusConfig).map(key => (
                               <option key={key} value={key}>{statusConfig[key].label}</option>
                             ))}
                           </select>
                           <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-current opacity-70">
                             {currentStatusConfig.icon}
                           </div>
                         </div>
                      </div>
                    </div>
                  );
               })
             )}
          </div>
        )}

        {/* 3. 利潤計算頁面 */}
        {activeTab === 'profit' && (
          <div className="space-y-6 fade-in">
            <div className="bg-stone-800 text-stone-50 rounded-3xl p-6 shadow-lg">
              <h3 className="text-stone-400 text-sm font-medium mb-1 flex items-center gap-1"><TrendingUp size={16}/> 淨利潤 (Net Profit)</h3>
              <div className="text-4xl font-bold mb-4">{formatCurrency(stats.netProfit)}</div>
              
              {/* 新增：未收金額欄位 */}
              <div className="grid grid-cols-3 gap-2 border-t border-stone-600 pt-4 text-center">
                <div>
                  <div className="text-stone-400 text-xs mb-1">總營收</div>
                  <div className="font-semibold text-sm">{formatCurrency(stats.totalRevenue)}</div>
                </div>
                <div>
                  <div className="text-stone-400 text-xs mb-1">總成本</div>
                  <div className="font-semibold text-sm">{formatCurrency(stats.totalCost)}</div>
                </div>
                <div>
                  <div className="text-red-300 text-xs mb-1 flex items-center justify-center gap-1"><AlertTriangle size={10}/> 未收金額</div>
                  <div className="font-semibold text-sm text-red-300">{formatCurrency(stats.totalUnpaid)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 text-center">
                <div className="text-stone-400 text-sm mb-1">利潤率</div>
                <div className={`text-2xl font-bold ${Number(stats.profitMargin) > 20 ? 'text-green-600' : 'text-stone-700'}`}>
                  {stats.profitMargin}%
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 text-center">
                <div className="text-stone-400 text-sm mb-1">訂單總數</div>
                <div className="text-2xl font-bold text-stone-700">{orders.length}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-stone-700 font-bold mb-4">訂單狀態分佈</h3>
              <div className="space-y-3">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const count = stats.statusCounts[key] || 0;
                  const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
                  if (count === 0 && orders.length > 0) return null;
                  
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-stone-600 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${config.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
                          {config.label}
                        </span>
                        <span className="text-stone-400">{count} 筆</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${config.color.split(' ')[0]}`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {orders.length === 0 && <div className="text-center text-sm text-stone-400 py-2">尚無數據</div>}
              </div>
            </div>
          </div>
        )}

        {/* 4. 設定頁面 */}
        {activeTab === 'settings' && (
          <div className="max-w-md mx-auto fade-in">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
               <h3 className="text-xl font-bold text-stone-700 mb-6 flex items-center gap-2">
                  <Settings className="text-stone-400" />
                  資料管理
               </h3>
               
               <div className="space-y-4">
                 <button 
                  onClick={handleExport}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left bg-stone-50 hover:bg-blue-50 rounded-2xl transition-colors group"
                 >
                   <div className="bg-white text-blue-500 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                     <Download size={24} />
                   </div>
                   <div>
                     <span className="block font-bold text-stone-700 text-lg">備份資料</span>
                     <span className="text-xs text-stone-400">下載 .json 檔案至裝置</span>
                   </div>
                 </button>

                 <button 
                  onClick={() => fileInputRef.current.click()}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left bg-stone-50 hover:bg-orange-50 rounded-2xl transition-colors group"
                 >
                   <div className="bg-white text-orange-500 p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                     <Upload size={24} />
                   </div>
                   <div>
                     <span className="block font-bold text-stone-700 text-lg">匯入資料</span>
                     <span className="text-xs text-stone-400">從 .json 檔案恢復紀錄</span>
                   </div>
                 </button>
               </div>
               
               <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-stone-400 flex items-start gap-2 bg-stone-50 p-3 rounded-xl">
                 <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-stone-500" />
                 <span>注意：匯入功能將會「完全覆蓋」您目前APP內所有的訂單資料，請在操作前確認您已備份當前的重要資料。</span>
               </div>
             </div>
          </div>
        )}

      </main>

      {/* 編輯視窗 Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm fade-in">
           <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-stone-700 flex items-center gap-2">
                    <Edit className="text-blue-400" />
                    編輯訂單
                  </h3>
                  <button onClick={() => setEditingOrder(null)} className="text-stone-400 hover:text-stone-600 p-1">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={updateOrder} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">日期</label>
                        <input type="date" name="date" value={editingOrder.date} onChange={handleEditChange} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">代號</label>
                        <input type="text" name="clientCode" value={editingOrder.clientCode} onChange={handleEditChange} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" required />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">店家</label>
                        <input type="text" name="store" value={editingOrder.store} onChange={handleEditChange} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">商品名稱</label>
                        <input type="text" name="productName" value={editingOrder.productName} onChange={handleEditChange} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">規格</label>
                        <input type="text" name="spec" value={editingOrder.spec} onChange={handleEditChange} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">數量</label>
                        <input type="number" name="quantity" value={editingOrder.quantity} onChange={handleEditChange} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700 text-center" required />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">總成本 (KRW)</label>
                        <input type="number" name="costKRW" value={editingOrder.costKRW} onChange={handleEditChange} className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">匯率</label>
                        <input type="number" step="0.0001" name="exchangeRate" value={editingOrder.exchangeRate} onChange={handleEditChange} className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">總售價 (TWD)</label>
                      <input type="number" name="price" value={editingOrder.price || editingOrder.totalPrice} onChange={handleEditChange} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div 
                        className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl cursor-pointer"
                        onClick={() => setEditingOrder({...editingOrder, isPaid: !editingOrder.isPaid})}
                       >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${editingOrder.isPaid ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-stone-300'}`}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                          <span className="text-sm font-medium text-stone-600">商品收款</span>
                       </div>
                       <div 
                        className="flex items-center gap-2 bg-stone-50 p-3 rounded-xl cursor-pointer"
                        onClick={() => setEditingOrder({...editingOrder, isShippingPaid: !editingOrder.isShippingPaid})}
                       >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${editingOrder.isShippingPaid ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-stone-300'}`}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                          <span className="text-sm font-medium text-stone-600">運費匯款</span>
                       </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">備註</label>
                      <textarea name="note" value={editingOrder.note} onChange={handleEditChange} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 text-stone-700" rows="2" />
                    </div>

                    <button type="submit" className="w-full bg-stone-700 hover:bg-stone-800 text-white font-medium py-3.5 rounded-2xl shadow-md mt-2">
                      儲存變更
                    </button>
                </form>
              </div>
           </div>
        </div>
      )}

      {/* 底部導航欄 */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[95%] max-w-md bg-stone-800 text-stone-400 rounded-full shadow-xl shadow-stone-300/50 p-2 z-20 flex justify-between items-center">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all duration-300 ${activeTab === 'orders' ? 'bg-stone-700 text-stone-50 shadow-md' : 'hover:text-stone-200'}`}
        >
          <PlusCircle size={20} className={activeTab === 'orders' ? 'mb-1' : ''} />
          {activeTab === 'orders' && <span className="text-[10px] font-medium fade-in">新增</span>}
        </button>
        
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all duration-300 ${activeTab === 'tracking' ? 'bg-stone-700 text-stone-50 shadow-md' : 'hover:text-stone-200'}`}
        >
          <Package size={20} className={activeTab === 'tracking' ? 'mb-1' : ''} />
          {activeTab === 'tracking' && <span className="text-[10px] font-medium fade-in">貨況</span>}
        </button>

        <button
          onClick={() => setActiveTab('profit')}
          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all duration-300 ${activeTab === 'profit' ? 'bg-stone-700 text-stone-50 shadow-md' : 'hover:text-stone-200'}`}
        >
          <DollarSign size={20} className={activeTab === 'profit' ? 'mb-1' : ''} />
          {activeTab === 'profit' && <span className="text-[10px] font-medium fade-in">利潤</span>}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all duration-300 ${activeTab === 'settings' ? 'bg-stone-700 text-stone-50 shadow-md' : 'hover:text-stone-200'}`}
        >
          <Settings size={20} className={activeTab === 'settings' ? 'mb-1' : ''} />
          {activeTab === 'settings' && <span className="text-[10px] font-medium fade-in">設定</span>}
        </button>
      </nav>

      <style>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DaigouApp;
