import React, { useState, useEffect, useRef } from 'react'
import {
  PlusCircle,
  Package,
  DollarSign,
  Trash2,
  Settings,
  Download,
  Upload,
  AlertCircle,
  ShoppingBag,
  Truck,
  CheckCircle,
  Clock,
  Calculator,
  Store,
  Calendar,
  Tag,
  Users,
  Plane,
  ClipboardList,
  Send,
  CreditCard,
} from 'lucide-react'

const DaigouApp = () => {
  // --- 狀態管理 ---
  const [activeTab, setActiveTab] = useState('orders') // orders, tracking, profit
  const [orders, setOrders] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const fileInputRef = useRef(null)

  // 新訂單表單狀態 (欄位擴充)
  const [newOrder, setNewOrder] = useState({
    date: new Date().toISOString().split('T')[0], // 預設今天
    clientCode: '', // 代號
    store: '', // 店家
    productName: '',
    spec: '', // 規格/顏色
    quantity: 1, // 數量
    costKRW: '', // 韓幣成本
    exchangeRate: '', // 匯率
    price: '', // 改為：總售價
    status: 'checking', // 修改預設狀態
    note: '',
  })

  // --- 初始化與本地存儲 ---
  useEffect(() => {
    const savedOrders = localStorage.getItem('daigou_orders')
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders))
      } catch (e) {
        console.error('讀取資料失敗', e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('daigou_orders', JSON.stringify(orders))
  }, [orders])

  // --- 輔助計算 ---
  // 計算單個商品的台幣成本
  const calculateCostTWD = (krw, rate) => {
    if (!krw || !rate) return 0
    return Math.round(parseFloat(krw) / parseFloat(rate))
  }

  // 格式化金額
  const formatCurrency = num => {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num)
  }

  const formatKRW = num => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', minimumFractionDigits: 0 }).format(num)
  }

  // --- 資料備份與匯入功能 ---
  const handleExport = () => {
    const dataStr = JSON.stringify(orders, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `daigou_backup_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowSettings(false)
  }

  const handleImport = event => {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const importedOrders = JSON.parse(e.target.result)
        if (Array.isArray(importedOrders)) {
          if (
            window.confirm(
              `系統偵測到 ${importedOrders.length} 筆資料。\n\n警告：匯入將會「覆蓋」目前所有的訂單資料。\n\n確定要繼續嗎？`
            )
          ) {
            setOrders(importedOrders)
            alert('資料匯入成功！')
            setShowSettings(false)
          }
        } else {
          alert('檔案格式錯誤！')
        }
      } catch (error) {
        alert('讀取檔案失敗，請重試。')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  // --- 狀態設定 (更新為詳細流程) ---
  const statusConfig = {
    checking: { label: '確認中', color: 'bg-stone-100 text-stone-600', icon: <Clock size={14} /> },
    paid: { label: '已匯款', color: 'bg-blue-50 text-blue-600', icon: <CreditCard size={14} /> },
    verified: { label: '對帳完成', color: 'bg-indigo-50 text-indigo-600', icon: <CheckCircle size={14} /> },
    ordered_kr: { label: '韓國端下單', color: 'bg-orange-50 text-orange-600', icon: <ShoppingBag size={14} /> },
    shipped_kr: { label: '韓國端出貨', color: 'bg-amber-50 text-amber-600', icon: <Truck size={14} /> },
    consolidation: { label: '待集運回台', color: 'bg-purple-50 text-purple-600', icon: <Package size={14} /> },
    arrived_tw: { label: '已抵台', color: 'bg-pink-50 text-pink-600', icon: <Plane size={14} /> },
    sorting: { label: '抵台整理中', color: 'bg-yellow-50 text-yellow-600', icon: <ClipboardList size={14} /> },
    pickup: { label: '待面交', color: 'bg-teal-50 text-teal-600', icon: <Users size={14} /> },
    shipped_tw: { label: '已寄出', color: 'bg-sky-50 text-sky-600', icon: <Send size={14} /> },
    completed: { label: '訂單完成', color: 'bg-green-50 text-green-600', icon: <CheckCircle size={14} /> },
  }

  // 處理舊資料的狀態映射 (Fallback)
  const getStatus = status => {
    return statusConfig[status] ? status : 'checking'
  }

  // --- 事件處理 ---
  const handleInputChange = e => {
    const { name, value } = e.target
    setNewOrder({ ...newOrder, [name]: value })
  }

  const addOrder = e => {
    e.preventDefault()
    if (!newOrder.clientCode || !newOrder.productName || !newOrder.price) return

    // 計算台幣成本
    let finalCostTWD = 0
    if (newOrder.costKRW && newOrder.exchangeRate) {
      finalCostTWD = calculateCostTWD(newOrder.costKRW, newOrder.exchangeRate)
    } else {
      finalCostTWD = 0
    }

    const inputQuantity = Number(newOrder.quantity) || 1
    const inputTotalPrice = Number(newOrder.price) || 0

    const order = {
      id: Date.now(),
      ...newOrder,
      costTWD: finalCostTWD,
      costKRW: Number(newOrder.costKRW) || 0,
      exchangeRate: Number(newOrder.exchangeRate) || 0,
      quantity: inputQuantity,
      totalPrice: inputTotalPrice, // 新增：直接儲存總金額
      price: inputTotalPrice / inputQuantity, // 為了相容性，單價 = 總價 / 數量
      status: 'checking',
    }

    setOrders([order, ...orders])
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
      note: '',
    })
    alert('訂單已成立！')
  }

  const updateStatus = (id, newStatus) => {
    setOrders(orders.map(order => (order.id === id ? { ...order, status: newStatus } : order)))
  }

  const deleteOrder = id => {
    if (window.confirm('確定要刪除這筆訂單嗎？')) {
      setOrders(orders.filter(order => order.id !== id))
    }
  }

  // --- 統計計算 ---
  const calculateStats = () => {
    const totalRevenue = orders.reduce((sum, order) => {
      // 優先使用 totalPrice (新資料)，若無則回退到 單價*數量 (舊資料)
      const revenue = order.totalPrice !== undefined ? order.totalPrice : order.price * (order.quantity || 1)
      return sum + revenue
    }, 0)

    const totalCost = orders.reduce((sum, order) => {
      const cost = order.costTWD !== undefined ? order.costTWD : order.cost || 0
      return sum + cost * (order.quantity || 1)
    }, 0)

    const netProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0

    const statusCounts = orders.reduce((acc, order) => {
      const currentStatus = statusConfig[order.status] ? order.status : 'checking'
      acc[currentStatus] = (acc[currentStatus] || 0) + 1
      return acc
    }, {})

    return { totalRevenue, totalCost, netProfit, profitMargin, statusCounts }
  }

  const stats = calculateStats()

  // --- 頁面組件 ---

  // 1. 成立訂單頁面
  const OrderFormView = () => {
    const currentCostTWD = calculateCostTWD(newOrder.costKRW, newOrder.exchangeRate)
    const quantity = Number(newOrder.quantity) || 1
    // 這裡直接使用輸入的 price 作為總金額
    const currentTotalRevenue = Number(newOrder.price) || 0
    const currentTotalCost = currentCostTWD * quantity
    const currentProfit = currentTotalRevenue - currentTotalCost

    return (
      <div className="max-w-md mx-auto fade-in">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-sm border border-stone-100">
          <h2 className="text-xl font-bold text-stone-700 mb-6 flex items-center gap-2">
            <PlusCircle className="text-stone-400" />
            建立新訂單
          </h2>
          <form onSubmit={addOrder} className="space-y-4">
            {/* Row 1: 日期 & 代號 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1 ml-1 flex items-center gap-1">
                  <Calendar size={12} /> 日期
                </label>
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
                <label className="block text-xs font-medium text-stone-500 mb-1 ml-1 flex items-center gap-1">
                  <Users size={12} /> 代號
                </label>
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

            {/* Row 2: 店家 & 品名 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-stone-500 mb-1 ml-1 flex items-center gap-1">
                  <Store size={12} /> 店家
                </label>
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
                <label className="block text-xs font-medium text-stone-500 mb-1 ml-1 flex items-center gap-1">
                  <Tag size={12} /> 商品名稱
                </label>
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

            {/* Row 3: 規格 & 數量 */}
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

            {/* Row 4: 韓幣成本 & 匯率 */}
            <div className="grid grid-cols-2 gap-4 bg-stone-50 p-3 rounded-2xl border border-stone-100">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">成本 (KRW)</label>
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
                <label className="block text-xs font-medium text-stone-500 mb-1 ml-1">匯率 (TWD 1 : KRW ?)</label>
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
                折合台幣成本：<span className="font-medium text-stone-600">{formatCurrency(currentCostTWD)}</span> / 個
              </div>
            </div>

            {/* Row 5: 總售價 (修改處) */}
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

            {/* 利潤預覽 */}
            <div className="flex justify-between items-center bg-stone-800 text-stone-100 px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-stone-400" />
                <span className="text-sm">預估總利潤</span>
              </div>
              <div className={`text-lg font-bold ${currentProfit < 0 ? 'text-red-300' : 'text-green-300'}`}>
                {formatCurrency(currentProfit)}
              </div>
            </div>

            {/* Row 6: 備註 */}
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
    )
  }

  // 2. 貨況追蹤頁面
  const TrackingView = () => (
    <div className="space-y-4 pb-20 fade-in">
      {orders.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <Package size={48} className="mx-auto mb-4 opacity-50" />
          <p>目前沒有訂單，去新增一筆吧！</p>
        </div>
      ) : (
        orders.map(order => {
          const clientName = order.clientCode || order.clientName
          const qty = order.quantity || 1
          const cost = order.costTWD !== undefined ? order.costTWD : order.cost || 0

          // 計算營收：優先使用 totalPrice，否則用 單價*數量
          const revenue = order.totalPrice !== undefined ? order.totalPrice : order.price * qty
          const profit = revenue - cost * qty

          const currentStatusKey = statusConfig[order.status] ? order.status : 'checking'
          const currentStatusConfig = statusConfig[currentStatusKey]

          return (
            <div key={order.id} className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 relative group">
              {/* Header: 日期, 代號, 店家 & 備註 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-2 w-[85%]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 日期 */}
                    <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-full flex items-center gap-1">
                      <Calendar size={10} className="text-stone-400" />
                      {order.date}
                    </span>
                    {/* 代號 */}
                    <span className="text-[10px] font-bold text-white bg-stone-400 px-2 py-1 rounded-full flex items-center gap-1">
                      <Users size={10} />
                      {clientName}
                    </span>
                    {/* 店家 */}
                    {order.store && (
                      <span className="text-[10px] text-stone-400 border border-stone-200 px-2 py-1 rounded-full flex items-center gap-1">
                        <Store size={10} />
                        {order.store}
                      </span>
                    )}
                  </div>
                  {/* 備註 */}
                  {order.note && (
                    <div className="text-xs text-stone-500 pl-1 leading-relaxed">
                      <span className="font-medium text-stone-400 mr-1">註:</span>
                      {order.note}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteOrder(order.id)}
                  className="text-stone-300 hover:text-red-400 p-1 transition-colors flex-shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Main: 品名 & 規格 (放在一起) */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 pr-2">
                  <h3 className="font-bold text-stone-800 text-lg leading-tight break-words">
                    {order.productName}
                    {order.spec && (
                      <span className="ml-2 inline-block text-sm font-normal text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100 align-middle">
                        {order.spec}
                      </span>
                    )}
                  </h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-stone-700">x{qty}</div>
                </div>
              </div>

              {/* Footer: 金額資訊 & 狀態選擇 */}
              <div className="flex items-center justify-between mt-4 bg-stone-50 p-3 rounded-2xl">
                <div>
                  <div className="text-xs text-stone-400">總金額</div>
                  {/* 總金額與利潤放在同一行 */}
                  <div className="text-stone-700 font-bold flex items-center gap-1.5 flex-wrap">
                    {formatCurrency(revenue)}
                    <span className={`text-xs font-normal ${profit >= 0 ? 'text-stone-400' : 'text-red-400'}`}>
                      ({profit >= 0 ? '+' : ''}
                      {formatCurrency(profit)})
                    </span>
                  </div>

                  {/* 韓幣資訊移到這裡 */}
                  {order.costKRW > 0 && (
                    <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                      {formatKRW(order.costKRW)}
                      <span className="text-stone-300">|</span>
                      匯率 {order.exchangeRate}
                    </div>
                  )}
                </div>

                {/* 狀態下拉選單 */}
                <div className="relative flex-shrink-0 ml-2">
                  <select
                    value={currentStatusKey}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    className={`appearance-none pl-8 pr-6 py-2 rounded-full text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-stone-200 outline-none transition-colors max-w-[130px] truncate ${currentStatusConfig.color}`}
                  >
                    {Object.keys(statusConfig).map(key => (
                      <option key={key} value={key}>
                        {statusConfig[key].label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none text-current opacity-70">
                    {currentStatusConfig.icon}
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  // 3. 利潤計算頁面
  const ProfitView = () => (
    <div className="space-y-6 fade-in">
      {/* 總覽卡片 */}
      <div className="bg-stone-800 text-stone-50 rounded-3xl p-6 shadow-lg">
        <h3 className="text-stone-400 text-sm font-medium mb-1">淨利潤 (Net Profit)</h3>
        <div className="text-4xl font-bold mb-4">{formatCurrency(stats.netProfit)}</div>
        <div className="grid grid-cols-2 gap-4 border-t border-stone-600 pt-4">
          <div>
            <div className="text-stone-400 text-xs mb-1">總營收</div>
            <div className="font-semibold">{formatCurrency(stats.totalRevenue)}</div>
          </div>
          <div>
            <div className="text-stone-400 text-xs mb-1">總成本</div>
            <div className="font-semibold">{formatCurrency(stats.totalCost)}</div>
          </div>
        </div>
      </div>

      {/* 詳細數據 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 text-center">
          <div className="text-stone-400 text-sm mb-1">利潤率</div>
          <div
            className={`text-2xl font-bold ${Number(stats.profitMargin) > 20 ? 'text-green-600' : 'text-stone-700'}`}
          >
            {stats.profitMargin}%
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 text-center">
          <div className="text-stone-400 text-sm mb-1">訂單總數</div>
          <div className="text-2xl font-bold text-stone-700">{orders.length}</div>
        </div>
      </div>

      {/* 狀態分布 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <h3 className="text-stone-700 font-bold mb-4">訂單狀態分佈</h3>
        <div className="space-y-3">
          {Object.entries(statusConfig).map(([key, config]) => {
            const count = stats.statusCounts[key] || 0
            const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0
            if (count === 0 && orders.length > 0) return null // 隱藏數量為 0 的狀態

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
            )
          })}
          {orders.length === 0 && <div className="text-center text-sm text-stone-400 py-2">尚無數據</div>}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-700 font-sans selection:bg-stone-200">
      {/* 隱藏的檔案輸入框，用於匯入 */}
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />

      {/* 頂部標題 */}
      <header className="fixed top-0 left-0 right-0 bg-[#FDFBF7]/90 backdrop-blur-md z-10 px-6 py-4 border-b border-stone-100">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-stone-800">
            代購<span className="text-stone-400">利潤計算表</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-xs text-stone-400 font-medium px-3 py-1 bg-stone-100 rounded-full">
              {orders.length} 筆
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full transition-colors ${
                showSettings ? 'bg-stone-200 text-stone-800' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* 設定選單 (下拉式) */}
        {showSettings && (
          <div className="max-w-2xl mx-auto relative">
            <div className="absolute right-0 top-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-100 p-4 z-50 fade-in">
              <h3 className="text-sm font-bold text-stone-600 mb-3 px-2">資料管理</h3>
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-stone-600 hover:bg-stone-50 rounded-xl transition-colors mb-2 text-left"
              >
                <div className="bg-blue-50 text-blue-500 p-2 rounded-lg">
                  <Download size={18} />
                </div>
                <div>
                  <span className="block font-medium">備份資料</span>
                  <span className="text-xs text-stone-400">下載 .json 檔案</span>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current.click()}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-stone-600 hover:bg-stone-50 rounded-xl transition-colors text-left"
              >
                <div className="bg-orange-50 text-orange-500 p-2 rounded-lg">
                  <Upload size={18} />
                </div>
                <div>
                  <span className="block font-medium">匯入資料</span>
                  <span className="text-xs text-stone-400">上傳 .json 恢復</span>
                </div>
              </button>

              <div className="mt-3 pt-3 border-t border-stone-100 text-[10px] text-stone-400 flex items-start gap-1">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                匯入將會覆蓋目前所有訂單，請謹慎操作。
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 遮罩 (當設定選單開啟時，點擊其他地方關閉) */}
      {showSettings && <div className="fixed inset-0 z-0" onClick={() => setShowSettings(false)}></div>}

      {/* 主要內容區 */}
      <main className="pt-24 pb-28 px-4 max-w-2xl mx-auto z-0 relative">
        {activeTab === 'orders' && <OrderFormView />}
        {activeTab === 'tracking' && <TrackingView />}
        {activeTab === 'profit' && <ProfitView />}
      </main>

      {/* 底部導航欄 */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md bg-stone-800 text-stone-400 rounded-full shadow-xl shadow-stone-300/50 p-2 z-20 flex justify-between items-center">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all duration-300 ${
            activeTab === 'orders' ? 'bg-stone-700 text-stone-50 shadow-md' : 'hover:text-stone-200'
          }`}
        >
          <PlusCircle size={20} className={activeTab === 'orders' ? 'mb-1' : ''} />
          {activeTab === 'orders' && <span className="text-[10px] font-medium fade-in">新增</span>}
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all duration-300 ${
            activeTab === 'tracking' ? 'bg-stone-700 text-stone-50 shadow-md' : 'hover:text-stone-200'
          }`}
        >
          <Package size={20} className={activeTab === 'tracking' ? 'mb-1' : ''} />
          {activeTab === 'tracking' && <span className="text-[10px] font-medium fade-in">貨況</span>}
        </button>

        <button
          onClick={() => setActiveTab('profit')}
          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all duration-300 ${
            activeTab === 'profit' ? 'bg-stone-700 text-stone-50 shadow-md' : 'hover:text-stone-200'
          }`}
        >
          <DollarSign size={20} className={activeTab === 'profit' ? 'mb-1' : ''} />
          {activeTab === 'profit' && <span className="text-[10px] font-medium fade-in">利潤</span>}
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
  )
}

export default DaigouApp
