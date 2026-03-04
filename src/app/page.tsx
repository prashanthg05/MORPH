"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Script from 'next/script';
import { 
  ShoppingBag, Maximize, X, Truck, Trash2, Star, ChevronRight, ChevronLeft,
  LayoutDashboard, PackageSearch, IndianRupee, ShoppingCart, Filter, Lock, Upload,
  CheckCircle2, Clock, Package
} from 'lucide-react';

// --- TYPES ---
interface Review { user: string; rating: number; comment: string; }
interface Product {
  id: number; name: string; price: string; tag: string; imgs: string[];
  dimensions: string; stock: 'AVAILABLE' | 'OUT OF STOCK'; description: string; reviews: Review[];
  category: string;
}

interface Order {
    id: string; 
    customer: string; 
    items: string[]; 
    amount: number;
    date: string; 
    status: 'Pending' | 'Packed' | 'Shipped'; 
    pincode: string;
    phone: string;
    email: string;
    address: string;
    paymentId: string;
}
interface CategoryData {
    name: string;
    banner: string;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function Home() {
  // --- 1. PERSISTENT STATE ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'landing' | 'store' | 'admin'>('landing');
  const [activeCategory, setActiveCategory] = useState('Stranger Things');
  const [showLogin, setShowLogin] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ user: '', pass: '' });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([
    { name: 'Stranger Things', banner: '/Strangerthings1.jpeg' },
    { name: 'Breaking Bad', banner: '/BrBa3.jpeg' },
    { name: 'The Office', banner: '/Theoffice2.jpeg' }
  ]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Architect State
  const [newProd, setNewProd] = useState({ name: '', desc: '', size: '', price: '', category: 'Stranger Things' });
  const [localImgs, setLocalImgs] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBanner, setNewCatBanner] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('All');
  const [adminOrderFilter, setAdminOrderFilter] = useState<'Pending' | 'Completed'>('Pending');

  // UI States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [currentRevIdx, setCurrentRevIdx] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [pincode, setPincode] = useState('');
  const [deliveryEst, setDeliveryEst] = useState('');
  
  // Buyer Details State
  const [formData, setFormData] = useState({ name: '', number: '', mail: '', address: '', city: '', state: '' });
  
  const [toast, setToast] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // --- 2. GLOBAL LOGIC ---
  const triggerToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const addToCart = (product: Product) => {
    if (product.stock === 'OUT OF STOCK') return triggerToast("Sold Out");
    setCartItems(prev => [...prev, product]);
    setSelectedProduct(null);
    setTimeout(() => setIsCartOpen(true), 400);
  };

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePincodeChange = (val: string) => {
    setPincode(val);
    if (val.length === 6) {
      const region = val.substring(0, 2);
      if (['56', '57', '58', '59'].includes(region)) setDeliveryEst("3-4 Days (Karnataka)");
      else setDeliveryEst("5-6 Days (National)");
    } else setDeliveryEst('');
  };

  const totalPrice = cartItems.reduce((acc, item) => acc + (parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0), 0);

  const handleCheckout = async () => {
    if (!formData.name || !formData.number || !formData.address || !formData.city || !formData.state || cartItems.length === 0) {
        return triggerToast("Details missing");
    }

    setIsProcessingPayment(true);

    try {
        const response = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalPrice })
        });
        
        const orderData = await response.json();
        if (!response.ok) throw new Error(orderData.error || "Network error");

        // [BULLETPROOF FIX] Pulls the key from 3 possible places to guarantee the window opens
        const razorpayKey = orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        
        if (!razorpayKey) throw new Error("API Key Missing in Cloudflare");

        const options = {
            key: razorpayKey, 
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Morph Store",
            description: "Artifact Acquisition",
            order_id: orderData.id,
            handler: async function (response: any) {
                try {
                    const verifyRes = await fetch('/api/razorpay/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderDetails: {
                                id: orderData.id,
                                customer: formData.name.toUpperCase(),
                                phone: formData.number,
                                email: formData.mail,
                                address: `${formData.address}, ${formData.city}, ${formData.state}`,
                                items: cartItems.map(i => i.name),
                                amount: totalPrice,
                                date: new Date().toLocaleDateString(),
                                status: 'Pending',
                                pincode: pincode
                            }
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyData.verified) {
                        const ordersRes = await fetch('/api/orders');
                        if (ordersRes.ok) {
                            const freshOrders = await ordersRes.json();
                            setOrders(freshOrders);
                        }
                        
                        setCartItems([]);
                        setIsCartOpen(false);
                        triggerToast("SECURE PAYMENT VERIFIED. ORDER PLACED.");
                    } else {
                        triggerToast("SECURITY ALERT: Payment Signature Invalid.");
                    }
                } catch (err) {
                    triggerToast("Verification Failed");
                } finally {
                    setIsProcessingPayment(false);
                }
            },
            prefill: {
                name: formData.name,
                email: formData.mail,
                contact: formData.number
            },
            theme: { color: "#6f01ff" },
            modal: {
                ondismiss: function() {
                    setIsProcessingPayment(false);
                    triggerToast("Payment Cancelled");
                }
            }
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.open();

    } catch (error: any) {
        console.error("Checkout Error:", error);
        triggerToast(`Gateway Error: ${error.message}`);
        setIsProcessingPayment(false);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: Order['status']) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      triggerToast(`Order -> ${newStatus}`);
      try {
          await fetch('/api/orders', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, status: newStatus })
          });
      } catch (error) {
          triggerToast("Failed to sync with Database");
      }
  };

  const deleteOrder = async (id: string) => {
      setOrders(prev => prev.filter(o => o.id !== id));
      triggerToast("Order Purged");
      try {
          await fetch('/api/orders', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id })
          });
      } catch (error) {
          triggerToast("Failed to delete from Database");
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'category') => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (target === 'product') setLocalImgs(prev => [...prev, reader.result as string].slice(0, 4));
          else setNewCatBanner(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUploadProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrice = parseFloat(newProd.price);
    if (isNaN(cleanPrice)) return triggerToast("Invalid Price");
    const createdProduct: Product = {
        id: Date.now(),
        name: newProd.name.toUpperCase(),
        description: newProd.desc,
        dimensions: newProd.size,
        price: `INR ${cleanPrice.toFixed(2)}`,
        category: newProd.category,
        tag: 'NEW DROP',
        imgs: localImgs.length > 0 ? localImgs : ['/Strangerthings1.jpeg'],
        stock: 'AVAILABLE',
        reviews: []
    };
    setProducts(prev => [createdProduct, ...prev]);
    setNewProd({ ...newProd, name: '', desc: '', size: '', price: '' });
    setLocalImgs([]);
    triggerToast("Artifact Deployed");
  };

  const handleAddCategory = () => {
    if (!newCatName || !newCatBanner) return triggerToast("Need Banner & Name");
    setCategories(prev => [...prev, { name: newCatName, banner: newCatBanner }]);
    setNewCatName(''); setNewCatBanner(''); triggerToast("Series Created");
  };

  const deleteCategory = (catName: string) => {
    if (categories.length <= 1) return triggerToast("Must keep 1 category");
    setCategories(prev => prev.filter(c => c.name !== catName));
    setProducts(prev => prev.filter(p => p.category !== catName));
    triggerToast(`${catName} Purged`);
  };

  const toggleStock = (id: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: p.stock === 'AVAILABLE' ? 'OUT OF STOCK' : 'AVAILABLE' } : p));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginCreds.user === "Team@morph" && loginCreds.pass === "Nknle@28") {
        setView('admin'); setShowLogin(false); setLoginCreds({ user: '', pass: '' });
    } else triggerToast("Invalid Credentials");
  };

  const nextImg = (e: React.MouseEvent) => { e.stopPropagation(); if (selectedProduct) setCurrentImgIdx((prev) => (prev + 1) % selectedProduct.imgs.length); };
  const prevImg = (e: React.MouseEvent) => { e.stopPropagation(); if (selectedProduct) setCurrentImgIdx((prev) => (prev - 1 + selectedProduct.imgs.length) % selectedProduct.imgs.length); };

  // --- 3. PERSISTENCE & COMPUTATION ---
  useEffect(() => {
    const savedProds = localStorage.getItem('morph_prods');
    const savedCats = localStorage.getItem('morph_cats');
    const savedCart = localStorage.getItem('morph_cart');
    
    // [ADDON] Retrieve saved buyer address/details
    const savedBuyer = localStorage.getItem('morph_buyer_info'); 
    
    if (savedProds) setProducts(JSON.parse(savedProds));
    else setProducts([{ id: 1, name: 'VECNA BUST', price: 'INR 449.00', tag: 'TOP SELLING', category: 'Stranger Things', imgs: ['/Strangerthings1.jpeg'], dimensions: '14.2cm H', stock: 'AVAILABLE', description: 'Terrifying detail.', reviews: [] }]);
    if (savedCats) setCategories(JSON.parse(savedCats));
    if (savedCart) setCartItems(JSON.parse(savedCart));

    // [ADDON] Automatically load and fill form data if it exists
    if (savedBuyer) {
        try {
            const parsed = JSON.parse(savedBuyer);
            if (parsed.formData) setFormData(parsed.formData);
            if (parsed.pincode) {
                setPincode(parsed.pincode);
                const val = parsed.pincode;
                if (val.length === 6) {
                    const region = val.substring(0, 2);
                    if (['56', '57', '58', '59'].includes(region)) setDeliveryEst("3-4 Days (Karnataka)");
                    else setDeliveryEst("5-6 Days (National)");
                }
            }
        } catch (e) { console.error("Error loading autofill data"); }
    }

    fetch('/api/orders')
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setOrders(data); })
        .catch(err => console.error("Error loading orders from DB:", err));

    setIsLoaded(true);

    const handleKeyDown = (e: KeyboardEvent) => { if (e.shiftKey && e.key === 'A') setShowLogin(true); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => { 
    if (isLoaded) { 
        localStorage.setItem('morph_prods', JSON.stringify(products)); 
        localStorage.setItem('morph_cats', JSON.stringify(categories)); 
        localStorage.setItem('morph_cart', JSON.stringify(cartItems));
        
        // [ADDON] Continuously save the form inputs to local web storage
        localStorage.setItem('morph_buyer_info', JSON.stringify({ formData, pincode }));
    } 
  }, [products, categories, cartItems, formData, pincode, isLoaded]);

  const storeProducts = useMemo(() => products.filter(p => p.category === activeCategory), [products, activeCategory]);
  
  const filteredInventory = useMemo(() => {
    return inventoryFilter === 'All' ? products : products.filter(p => p.category === inventoryFilter);
  }, [products, inventoryFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
        if (adminOrderFilter === 'Pending') return o.status === 'Pending' || o.status === 'Packed';
        if (adminOrderFilter === 'Completed') return o.status === 'Shipped';
        return true;
    });
  }, [orders, adminOrderFilter]);

  if (!isLoaded) return null;
  // --- 4. ADMIN VIEW ---
  if (view === 'admin') {
    return (
      <div className="bg-[#050505] min-h-screen text-white p-6 md:p-12 font-sans animate-fade">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-12 border-b border-white/5 pb-6">
            <h1 className="text-3xl font-black italic uppercase text-[#6f01ff] flex items-center gap-3"><LayoutDashboard /> Admin Hub</h1>
            <button onClick={() => setView('landing')} className="bg-white/10 px-8 py-3 rounded-full text-xs font-black uppercase hover:bg-white hover:text-black transition-all shadow-xl">Exit</button>
          </header>

          {/* DASHBOARD STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-zinc-900 border border-[#6f01ff]/20 p-8 rounded-[3rem] shadow-2xl">
                <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-[#6f01ff]/10 rounded-2xl text-[#6f01ff]"><IndianRupee size={24}/></div><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Revenue</p></div>
                <h3 className="text-4xl font-black italic">₹{orders.reduce((a,b)=>a+b.amount, 0).toFixed(2)}</h3>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><ShoppingCart size={24}/></div><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Active Orders</p></div>
                <h3 className="text-4xl font-black italic">{orders.length}</h3>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500"><PackageSearch size={24}/></div><p className="text-[10px] font-black uppercase tracking-widest opacity-40">Products</p></div>
                <h3 className="text-4xl font-black italic">{products.length}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
                {/* UPLOAD FORM */}
                <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                    <h2 className="text-sm font-black uppercase italic mb-6 text-[#6f01ff]">Deploy Artifact</h2>
                    <form onSubmit={handleUploadProduct} className="space-y-4">
                        <input type="text" placeholder="NAME" required className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none" value={newProd.name} onChange={(e)=>setNewProd({...newProd, name: e.target.value})}/>
                        <textarea placeholder="DESCRIPTION" required rows={2} className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none" value={newProd.desc} onChange={(e)=>setNewProd({...newProd, desc: e.target.value})}/>
                        <select className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none" value={newProd.category} onChange={(e)=>setNewProd({...newProd, category: e.target.value})}>
                            {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="SIZE" className="bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold" value={newProd.size} onChange={(e)=>setNewProd({...newProd, size: e.target.value})}/>
                            <input type="number" step="0.01" placeholder="PRICE" required className="bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold" value={newProd.price} onChange={(e)=>setNewProd({...newProd, price: e.target.value})}/>
                        </div>
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-white/5 border-dashed rounded-2xl cursor-pointer">
                            <p className="text-[9px] font-bold opacity-30 uppercase">Images ({localImgs.length}/4)</p>
                            <input type="file" multiple className="hidden" onChange={(e)=>handleFileChange(e, 'product')}/>
                        </label>
                        <button type="submit" className="w-full bg-[#6f01ff] text-white py-4 rounded-2xl font-black uppercase italic text-xs shadow-lg">Transmit</button>
                    </form>
                </div>

                {/* CATEGORY CONTROL */}
                <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                    <h2 className="text-sm font-black uppercase italic mb-6 text-blue-400">Add Collection</h2>
                    <div className="space-y-4">
                        <input type="text" placeholder="SERIES NAME" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none" value={newCatName} onChange={(e)=>setNewCatName(e.target.value)}/>
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-white/5 border-dashed rounded-2xl cursor-pointer overflow-hidden">
                            {newCatBanner ? <img src={newCatBanner} className="h-full w-full object-cover"/> : <Upload size={20} className="opacity-20"/>}
                            <input type="file" className="hidden" onChange={(e)=>handleFileChange(e, 'category')}/>
                        </label>
                        <button onClick={handleAddCategory} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase italic text-xs shadow-lg">Deploy Series</button>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                    <h2 className="text-sm font-black uppercase italic mb-6 text-red-500">Active Collections</h2>
                    <div className="space-y-3">
                        {categories.map(cat => (
                            <div key={cat.name} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                                <button onClick={()=>deleteCategory(cat.name)} className="text-red-500/30 hover:text-red-500 transition-colors p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* PIPELINES */}
            <div className="lg:col-span-8 space-y-8">
                {/* ORDER PIPELINE */}
                <div className="bg-zinc-900 border border-[#6f01ff]/20 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                        <h2 className="text-sm font-black uppercase italic tracking-widest">Order Pipeline</h2>
                        <div className="flex bg-black rounded-full p-1 border border-white/10">
                            <button 
                                onClick={() => setAdminOrderFilter('Pending')}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${adminOrderFilter === 'Pending' ? 'bg-[#6f01ff] text-white' : 'text-white/30 hover:text-white'}`}
                            >
                                Pending / Packed
                            </button>
                            <button 
                                onClick={() => setAdminOrderFilter('Completed')}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${adminOrderFilter === 'Completed' ? 'bg-green-600 text-white' : 'text-white/30 hover:text-white'}`}
                            >
                                Shipped (Completed)
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-black/50 sticky top-0 uppercase text-[9px] font-black opacity-40">
                                <tr className="border-b border-white/5">
                                    <th className="p-6">Customer Details</th>
                                    <th className="p-6">Products</th>
                                    <th className="p-6">Total</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredOrders.map(o => (
                                    <tr key={o.id} className="hover:bg-white/[0.01]">
                                        <td className="p-6 align-top">
                                            <div className="space-y-1">
                                                <p className="uppercase font-black italic text-sm text-white">{o.customer}</p>
                                                <p className="font-bold text-[#6f01ff]">{o.phone}</p>
                                                <p className="opacity-50 text-[10px]">{o.email}</p>
                                                <p className="opacity-40 text-[10px] max-w-[180px] leading-tight mt-2">{o.address} ({o.pincode})</p>
                                            </div>
                                        </td>
                                        <td className="p-6 align-top">
                                            <div className="flex flex-col gap-1">
                                                {o.items.map((item, i) => (
                                                    <span key={i} className="bg-white/5 px-2 py-1 rounded-md text-[10px] font-bold uppercase border border-white/5">{item}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-6 font-black align-top text-lg">₹{o.amount.toFixed(2)}</td>
                                        <td className="p-6 align-top">
                                            <select 
                                                value={o.status} 
                                                onChange={(e) => updateOrderStatus(o.id, e.target.value as Order['status'])}
                                                className={`bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer border border-white/10 rounded-xl px-3 py-2 ${
                                                    o.status === 'Shipped' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 
                                                    o.status === 'Packed' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 
                                                    'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                                                }`}
                                            >
                                                <option className="bg-black text-yellow-500" value="Pending">Pending</option>
                                                <option className="bg-black text-blue-500" value="Packed">Packed</option>
                                                <option className="bg-black text-green-500" value="Shipped">Shipped</option>
                                            </select>
                                        </td>
                                        <td className="p-6 text-right align-top"><button onClick={() => deleteOrder(o.id)} className="text-red-500/30 hover:text-red-500"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                                {filteredOrders.length === 0 && (<tr><td colSpan={5} className="p-12 text-center opacity-10 font-black italic uppercase tracking-widest">No {adminOrderFilter} Orders</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FILTERED INVENTORY */}
                <div className="bg-zinc-900 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-sm font-black uppercase italic tracking-widest">Inventory Management</h2>
                        <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                            <Filter size={14} className="text-[#6f01ff] ml-2"/>
                            <select 
                              className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer pr-4"
                              value={inventoryFilter}
                              onChange={(e) => setInventoryFilter(e.target.value)}
                            >
                                <option value="All">All Series</option>
                                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left text-xs">
                            <tbody className="divide-y divide-white/5">
                                {filteredInventory.map(p => (
                                    <tr key={p.id} className="hover:bg-white/[0.01]">
                                        <td className="p-6"><div className="flex items-center gap-4"><img src={p.imgs[0]} className="w-10 h-10 rounded-lg object-cover" /><p className="font-black uppercase italic">{p.name}</p></div></td>
                                        <td className="p-6 font-bold">{p.price}</td>
                                        <td className="p-6"><button onClick={()=>toggleStock(p.id)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${p.stock==='AVAILABLE'?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{p.stock}</button></td>
                                        <td className="p-6"><button onClick={()=>setProducts(products.filter(pr=>pr.id!==p.id))} className="text-red-500/30 hover:text-red-500"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                                {filteredInventory.length === 0 && (<tr><td colSpan={4} className="p-12 text-center opacity-10 font-black italic uppercase">No Artifacts in this series</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 5. LANDING VIEW ---
  if (view === 'landing') {
    return (
      <div className="bg-black min-h-screen font-sans text-white overflow-x-hidden animate-fade">
        <div className="p-12 flex justify-center sticky top-0 z-[100]"><img src="/pruple_png_main.png" alt="Logo" className="h-24 md:h-40 w-auto object-contain animate-pulse drop-shadow-[0_0_35px_rgba(111,1,255,0.7)]" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {categories.map((cat, idx) => (
            <div key={cat.name} onClick={() => { setActiveCategory(cat.name); setView('store'); }} className={`relative cursor-pointer group overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/5 transition-all duration-700 ${idx === 0 ? 'h-[55vh] md:h-[65vh] md:col-span-2' : 'h-[45vh] md:h-[50vh]'}`}>
              <img src={cat.banner} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-[2s] opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-20" />
              <div className="absolute bottom-12 left-12 z-30"><h2 className={`font-black italic uppercase tracking-tighter leading-none drop-shadow-2xl text-white ${idx === 0 ? 'text-5xl md:text-8xl' : 'text-3xl md:text-4xl'}`}>{cat.name}</h2><p className="text-[#6f01ff] font-black tracking-[0.5em] uppercase mt-6 text-[10px] flex items-center gap-3"><span className="w-2 h-2 bg-[#6f01ff] rounded-full animate-ping" /> ENTER VOID</p></div>
            </div>
          ))}
        </div>
        <footer className="mt-40 p-24 text-center relative z-[200]"><div onClick={() => setShowLogin(true)} className="inline-block cursor-pointer group"><p className="text-[11px] font-black tracking-[1.5em] uppercase text-white/10 group-hover:text-[#6f01ff] transition-colors">Morph Studio × 2026</p></div></footer>
        {showLogin && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm animate-fade">
                <div className="relative w-full max-w-sm bg-zinc-900 border border-[#6f01ff]/40 p-12 rounded-[3rem] shadow-2xl">
                    <button onClick={()=>setShowLogin(false)} className="absolute top-8 right-8 text-white/20 hover:text-white"><X size={20}/></button>
                    <div className="flex flex-col items-center mb-8"><Lock className="text-[#6f01ff] mb-4" size={32}/><h2 className="text-xl font-black italic uppercase text-white">ACCESS HUB</h2></div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" placeholder="IDENTITY" className="w-full bg-black border border-white/10 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-[#6f01ff] uppercase" onChange={(e)=>setLoginCreds({...loginCreds, user: e.target.value})} />
                        <input type="password" placeholder="VOID PASS" className="w-full bg-black border border-white/10 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-[#6f01ff] uppercase" onChange={(e)=>setLoginCreds({...loginCreds, pass: e.target.value})} />
                        <button type="submit" className="w-full bg-[#6f01ff] text-white py-5 rounded-2xl font-black uppercase italic tracking-widest shadow-lg hover:scale-[1.02] transition-all">Verify</button>
                    </form>
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- 6. STORE VIEW ---
  return (
    <main className="relative bg-[#050505] min-h-screen text-[#fff1f1] p-4 md:p-8 font-sans overflow-x-hidden animate-fade">
      {/* Load Razorpay Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <div className="fixed top-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#6f01ff]/20 blur-[180px] animate-pulse pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto">
        <nav className="grid grid-cols-3 items-center mb-16 border-b border-[#6f01ff]/20 pb-10 backdrop-blur-xl sticky top-0 z-[100] pt-6">
          <div onClick={() => setView('landing')} className="flex justify-start text-[10px] font-black italic uppercase text-[#6f01ff] cursor-pointer hover:opacity-50 tracking-widest transition-all">← Back</div>
          <div className="flex justify-center drop-shadow-[0_0_20px_rgba(111,1,255,0.4)]"><img src="/pruple_png_main.png" alt="Logo" className="h-24 md:h-40 w-auto object-contain animate-pulse" /></div>
          <div className="flex justify-end"><button onClick={() => setIsCartOpen(true)} className="flex items-center space-x-4 bg-[#6f01ff] px-8 py-3 rounded-full text-white font-black hover:scale-105 transition-all shadow-[0_0_30px_rgba(111,1,255,0.5)]"><ShoppingBag size={20}/><span className="text-sm">{cartItems.length}</span></button></div>
        </nav>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-32">
          {storeProducts.map((item) => (
            <div key={item.id} onClick={() => {setSelectedProduct(item); setCurrentImgIdx(0); setCurrentRevIdx(0);}} className={`group relative bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-7 rounded-[3.5rem] transition-all duration-700 cursor-pointer shadow-2xl overflow-hidden ${item.stock === 'OUT OF STOCK' ? 'opacity-50 grayscale' : 'hover:border-[#6f01ff]/60'}`}>
              <span className={`absolute top-10 left-10 z-10 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase italic shadow-xl ${item.stock === 'OUT OF STOCK' ? 'bg-red-600' : 'bg-[#6f01ff]'}`}>{item.stock === 'OUT OF STOCK' ? 'SOLD OUT' : item.tag}</span>
              <div className="h-72 mb-8 rounded-[2.5rem] overflow-hidden bg-[#121212] border border-white/10 relative shadow-inner"><img src={item.imgs[0]} className="object-cover w-full h-full opacity-90 group-hover:scale-110 transition-all duration-1000" /></div>
              <h3 className="text-2xl font-black uppercase italic text-white group-hover:text-[#6f01ff] transition-colors leading-none mb-3">{item.name}</h3>
              <div className="flex items-center space-x-3 text-white/30 font-bold uppercase text-[10px] tracking-widest leading-none"><Maximize size={12} /><span>{item.dimensions}</span></div>
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10"><p className="font-black text-white text-xl tracking-tighter">{item.price}</p><button className="text-[10px] font-black uppercase bg-white text-black px-6 py-2.5 rounded-full shadow-lg">View +</button></div>
            </div>
          ))}
        </section>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[400] flex justify-end">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border-l border-[#6f01ff]/40 h-full p-8 md:p-14 overflow-y-auto animate-drawer shadow-2xl">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-10 right-10 z-20 p-4 bg-white/5 rounded-full hover:bg-red-600 transition-all hover:rotate-90 shadow-xl"><X size={24}/></button>
            <div className="relative mb-12 overflow-hidden rounded-[3rem] border border-white/10 aspect-square bg-[#121212]">
                <img src={selectedProduct.imgs[currentImgIdx]} className="w-full h-full object-cover animate-fade" key={`img-${currentImgIdx}`} />
                {selectedProduct.imgs.length > 1 && (<div className="absolute inset-0 flex items-center justify-between px-6"><button onClick={prevImg} className="p-3 bg-black/60 rounded-full hover:bg-[#6f01ff] transition-all"><ChevronLeft size={24} /></button><button onClick={nextImg} className="p-3 bg-black/60 rounded-full hover:bg-[#6f01ff] transition-all"><ChevronRight size={24} /></button></div>)}
            </div>
            <div className="space-y-8">
              <h2 className="text-5xl md:text-6xl font-black italic uppercase text-white leading-tight">{selectedProduct.name}</h2>
              <p className="text-4xl font-black text-[#6f01ff] underline underline-offset-[12px] decoration-white/10">{selectedProduct.price}</p>
              <div className="bg-[#6f01ff]/5 p-8 rounded-[3rem] border border-[#6f01ff]/20 text-[#e5c7f4] text-md leading-relaxed shadow-inner min-h-[120px]">{selectedProduct.description}</div>
              <div className="flex items-center space-x-4 bg-white/5 p-6 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest"><Maximize size={20} className="text-[#6f01ff]" />Dimension: {selectedProduct.dimensions}</div>
              
              <div className="border-t border-white/10 pt-10">
                <p className="text-[11px] font-black text-[#6f01ff] uppercase tracking-[0.4em] mb-6">Verified Reports</p>
                {selectedProduct.reviews.length > 0 ? (
                  <div className="relative bg-white/5 p-8 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl min-h-[140px]">
                    <div className="animate-fade" key={`rev-${currentRevIdx}`}><div className="flex justify-between items-center mb-3"><span className="text-xs font-bold text-white italic">{selectedProduct.reviews[currentRevIdx].user}</span><div className="flex text-yellow-500 space-x-1"><Star size={14} fill="currentColor" /></div></div><p className="text-sm italic text-white/70 leading-relaxed">"{selectedProduct.reviews[currentRevIdx].comment}"</p></div>
                  </div>
                ) : <p className="text-[10px] uppercase tracking-widest text-white/10 text-center italic">Scanning the void feedback...</p>}
              </div>

              <button disabled={selectedProduct.stock === 'OUT OF STOCK'} onClick={() => addToCart(selectedProduct)} className={`w-full text-white py-8 rounded-full font-black text-2xl transition-all transform active:scale-95 italic shadow-xl mt-10 hover:scale-[1.02] ${selectedProduct.stock === 'OUT OF STOCK' ? 'bg-zinc-800 cursor-not-allowed' : 'bg-[#6f01ff]'}`}>ADD TO VOID +</button>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[500] flex justify-end">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#0d0d0d] border-l border-[#6f01ff]/40 h-full p-8 md:p-14 overflow-y-auto animate-drawer shadow-2xl">
            <button onClick={() => setIsCartOpen(false)} className="absolute top-10 right-10 p-4 bg-white/5 rounded-full hover:bg-red-600 transition-all shadow-xl"><X size={24}/></button>
            <h2 className="text-4xl font-black italic uppercase text-[#6f01ff] mb-12 tracking-tighter text-center">The Haul</h2>
            <div className="space-y-4 mb-12">{cartItems.map((item, idx) => (
                <div key={`cart-${idx}`} className="flex justify-between items-center bg-white/5 p-7 rounded-[2rem] border border-white/5 shadow-xl transition-all hover:border-[#6f01ff]/30"><div><span className="font-black italic text-md uppercase block text-white">{item.name}</span><span className="text-[10px] text-[#6f01ff] font-bold uppercase">{item.dimensions}</span></div><div className="flex items-center space-x-6"><span className="text-white font-black text-md">{item.price}</span><button onClick={() => removeFromCart(idx)} className="p-2 text-white/20 hover:text-red-500 transition-colors"><Trash2 size={20} /></button></div></div>
            ))}</div>
            <div className="space-y-5">
              <input type="text" placeholder="NAME" value={formData.name} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, name: e.target.value})}/>
              <input type="text" placeholder="PHONE" value={formData.number} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, number: e.target.value})}/>
              <input type="email" placeholder="EMAIL" value={formData.mail} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, mail: e.target.value})}/>
              <textarea placeholder="ADDRESS" rows={3} value={formData.address} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all font-bold" onChange={(e)=>setFormData({...formData, address: e.target.value})}></textarea>
              
              <div className="flex gap-4">
                  <input type="text" placeholder="CITY" value={formData.city} className="w-1/2 bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, city: e.target.value})}/>
                  <input type="text" placeholder="STATE" value={formData.state} className="w-1/2 bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, state: e.target.value})}/>
              </div>

              <div className="bg-[#6f01ff]/5 border border-[#6f01ff]/20 p-8 rounded-[3rem] shadow-inner text-center">
                <input type="text" placeholder="6-DIGIT PIN" maxLength={6} value={pincode} className="bg-black border border-white/10 rounded-2xl px-6 py-4 text-md w-full outline-none font-black text-[#6f01ff] tracking-[0.6em] text-center" onChange={(e) => handlePincodeChange(e.target.value)} />
                {deliveryEst && <div className="mt-4 flex items-center justify-center space-x-4 text-green-400 font-black text-xs uppercase italic animate-bounce"><Truck size={22} /><span>{deliveryEst}</span></div>}
              </div>
              <div className="pt-10 border-t border-white/10 text-center">
                <div className="flex justify-between text-2xl font-black mb-10 italic uppercase tracking-tighter"><span>GRAND TOTAL</span><span className="text-[#6f01ff]">INR {totalPrice.toFixed(2)}</span></div>
                
                <button 
                  onClick={handleCheckout} 
                  disabled={cartItems.length === 0 || isProcessingPayment} 
                  className={`w-full text-black py-8 rounded-full font-black text-2xl transition-all shadow-xl uppercase italic flex items-center justify-center gap-4 ${isProcessingPayment ? 'bg-zinc-600 text-white cursor-wait' : 'bg-white hover:bg-[#6f01ff] hover:text-white'}`}
                >
                  {isProcessingPayment ? 'Initiating Gateway...' : 'Pay & Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[1000] bg-white text-black px-12 py-5 rounded-full font-black uppercase italic text-xs shadow-2xl">{toast}</div>}
      <style jsx global>{`
        @keyframes drawer { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-drawer { animation: drawer 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade { animation: fade 0.6s ease-in-out; }
      `}</style>
    </main>
  );
}
