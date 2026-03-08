"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Maximize, Zap, X, Truck, User, Mail, 
  MapPin, Phone, Calendar, Trash2, Star, ChevronRight, ChevronLeft,
  LayoutDashboard, PackageCheck, PackageSearch, IndianRupee, TrendingUp, Filter, Lock, Plus, PlusCircle, Database, Image as ImageIcon, Upload, CheckCircle2, AlertCircle, ShoppingCart, BarChart3
} from 'lucide-react';

// --- TYPES ---
interface Review { user: string; rating: number; comment: string; }
interface Product {
  id: number; name: string; price: string; tag: string; imgs: string[];
  dimensions: string; stock: 'AVAILABLE' | 'OUT OF STOCK'; description: string; reviews: Review[];
  category: string;
}
interface Order {
    id: string; customer: string; items: string[]; amount: number;
    date: string; status: 'Pending' | 'Packed' | 'Shipped' | 'Fulfilled' | 'Awaiting Payment'; pincode: string;
    phone?: string; email?: string; address?: string; city?: string; state?: string;
    fullItems?: Product[];
}
interface CategoryData {
    name: string;
    banner: string;
}

export default function Home() {
  // --- 1. PERSISTENT STATE ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'landing' | 'store' | 'admin'>('landing');
  const [activeCategory, setActiveCategory] = useState('Stranger Things');
  const [showLogin, setShowLogin] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ user: '', pass: '' });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Architect State
  const [newProd, setNewProd] = useState({ name: '', desc: '', size: '', price: '', category: 'Stranger Things' });
  const [localImgs, setLocalImgs] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBanner, setNewCatBanner] = useState('');

  // UI States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [currentRevIdx, setCurrentRevIdx] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [pincode, setPincode] = useState('');
  const [deliveryEst, setDeliveryEst] = useState('');
  
  const [formData, setFormData] = useState({ name: '', number: '', mail: '', address: '', city: '', state: '', age: '' });
  const [toast, setToast] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'Pending' | 'Completed'>('Pending');

  // --- DATABASE HELPER ---
  const syncAdmin = async (action: string, payload: any = {}) => {
    try { 
      const res = await fetch('/api/admin', { 
        method: 'POST', 
        // 🚨 THE FIX: This tells Cloudflare/Next.js to actually read the data!
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }) 
      }); 
      if (!res.ok) {
          const errorMsg = await res.text();
          console.error(`Database Sync Failed for ${action}:`, errorMsg);
      }
    } 
    catch (e) { console.error("Database sync completely failed", e); }
  };

  // --- 2. LOADING LOGIC ---
  useEffect(() => {
    const loadData = async () => {
      const savedCart = localStorage.getItem('morph_cart');
      const savedUser = localStorage.getItem('morph_user');
      if (savedCart) setCartItems(JSON.parse(savedCart));
      if (savedUser) setFormData(JSON.parse(savedUser));

      try {
        const res = await fetch('/api/admin');
        const dbData = await res.json();
        
        // If Turso has data, use it. Otherwise, load defaults so the page isn't blank.
        if (dbData.products && dbData.products.length > 0) setProducts(dbData.products);
        else setProducts([{ id: 1, name: 'VECNA BUST', price: 'INR 449.00', tag: 'TOP SELLING', category: 'Stranger Things', imgs: ['/Strangerthings1.jpeg'], dimensions: '14.2cm H', stock: 'AVAILABLE', description: 'Terrifyingly detailed bust of the Curse of Hawkins.', reviews: [{user: "Arjun_X", rating: 5, comment: "Insane detail on the tentacles!"}] }]);
        
        if (dbData.categories && dbData.categories.length > 0) setCategories(dbData.categories);
        else setCategories([{ name: 'Stranger Things', banner: '/Strangerthings1.jpeg' }, { name: 'Breaking Bad', banner: '/BrBa3.jpeg' }, { name: 'The Office', banner: '/Theoffice2.jpeg' }]);
        
        if (dbData.orders) setOrders(dbData.orders);
      } catch (e) {
        console.error("Failed to fetch initial database state");
      }
      setIsLoaded(true);
    };

    loadData();

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.shiftKey && e.key === 'A') setShowLogin(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isLoaded) {
        localStorage.setItem('morph_cart', JSON.stringify(cartItems));
        localStorage.setItem('morph_user', JSON.stringify(formData));
    }
  }, [cartItems, formData, isLoaded]);

  // --- 3. LOGIC ---
  const triggerToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handlePincodeChange = (val: string) => {
    setPincode(val);
    if (val.length === 6) {
      const region = val.substring(0, 2);
      if (['56', '57', '58', '59'].includes(region)) setDeliveryEst("3-4 Days (Karnataka Express)");
      else setDeliveryEst("5-6 Days (National Shipping)");
    } else setDeliveryEst('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'category') => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        if (target === 'product') {
            setLocalImgs(prev => {
                const updated = [...prev, resultString];
                return updated.slice(0, 4);
            });
        } else {
            setNewCatBanner(resultString);
        }
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = ''; 
  };

  const handleUploadProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const createdProduct: Product = {
        id: Date.now(),
        name: newProd.name.toUpperCase(),
        description: newProd.desc,
        dimensions: newProd.size,
        price: `INR ${parseFloat(newProd.price).toFixed(2)}`,
        category: newProd.category,
        tag: 'NEW DROP',
        imgs: localImgs.length > 0 ? localImgs : ['/Strangerthings1.jpeg'],
        stock: 'AVAILABLE',
        reviews: []
    };
    setProducts([createdProduct, ...products]);
    // Fix: Make sure to reset the dropdown state properly
    setNewProd({ ...newProd, name: '', desc: '', size: '', price: '' });
    setLocalImgs([]);
    await syncAdmin('ADD_PRODUCT', createdProduct);
    triggerToast("Artifact Deployed");
  };

  const handleAddCategory = async () => {
    if (!newCatName || !newCatBanner) return triggerToast("Need Name & Banner");
    const newCat = { name: newCatName, banner: newCatBanner };
    setCategories([...categories, newCat]);
    setNewCatName(''); setNewCatBanner(''); 
    await syncAdmin('ADD_CATEGORY', newCat);
    triggerToast("Series Created");
  };

  const deleteCategory = async (catName: string) => {
    if (categories.length <= 1) return triggerToast("Must have 1 category");
    setCategories(categories.filter(c => c.name !== catName));
    setProducts(products.filter(p => p.category !== catName));
    await syncAdmin('DELETE_CATEGORY', { name: catName });
    triggerToast(`${catName} Purged`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginCreds.user === "A" && loginCreds.pass === "1") {
        setView('admin'); setShowLogin(false); setLoginCreds({ user: '', pass: '' });
    } else triggerToast("Invalid Credentials");
  };

  const handleCheckoutNow = async () => {
    try {
        const res = await fetch('/api/order', {
            method: 'POST',
            body: JSON.stringify({ 
              amount: totalPrice,
              customer: formData.name, phone: formData.number, email: formData.mail,
              address: formData.address, city: formData.city, state: formData.state, pincode: pincode,
              items: cartItems.map(i => i.name), fullItems: cartItems
            })
        });
        const orderData = await res.json();

        if (orderData.error) throw new Error("Order init failed");

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: orderData.amount,
            currency: "INR",
            name: "Morph Studio",
            description: "Artifact Haul",
            order_id: orderData.id,
            handler: async function (response: any) {
                const newOrder: Order = {
                    id: response.razorpay_order_id, customer: formData.name, phone: formData.number,
                    email: formData.mail, address: formData.address, city: formData.city, state: formData.state,
                    items: cartItems.map(i => i.name), fullItems: cartItems, amount: totalPrice,
                    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    status: 'Pending', pincode: pincode
                };
                
                setOrders(prev => [newOrder, ...prev.filter(o => o.id !== orderData.id)]); 
                setCartItems([]);
                setIsCartOpen(false);
                await syncAdmin('UPDATE_ORDER_STATUS', { id: response.razorpay_order_id, status: 'Pending' });
                triggerToast("Payment Successful!");
            },
            theme: { color: "#6f01ff" }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();

    } catch (error) {
        triggerToast("Payment initialization failed. Check console.");
        console.error(error);
    }
  };

  const updateOrderStatus = async (id: string, newStatus: Order['status']) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    await syncAdmin('UPDATE_ORDER_STATUS', { id, status: newStatus });
    triggerToast(`Status changed to ${newStatus}`);
  };

  const toggleStock = async (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newStock = product.stock === 'AVAILABLE' ? 'OUT OF STOCK' : 'AVAILABLE';
    setProducts(products.map(p => p.id === id ? { ...p, stock: newStock } : p));
    await syncAdmin('TOGGLE_STOCK', { id, stock: newStock });
  };

  const deleteProduct = async (id: number) => {
    setProducts(products.filter(p => p.id !== id));
    await syncAdmin('DELETE_PRODUCT', { id });
    triggerToast("Artifact Deleted");
  };
  
  const clearAllOrders = async () => {
    setOrders([]);
    await syncAdmin('CLEAR_ORDERS');
  };

  const deleteOrder = async (id: string) => {
    setOrders(orders.filter(ord => ord.id !== id));
    await syncAdmin('DELETE_ORDER', { id });
  };

  const addToCart = (product: Product) => {
    if (product.stock === 'OUT OF STOCK') return triggerToast("Currently Unavailable");
    setCartItems([...cartItems, product]);
    setSelectedProduct(null);
    setTimeout(() => setIsCartOpen(true), 400);
  };

  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const nextImg = (e: React.MouseEvent) => { e.stopPropagation(); if (selectedProduct) setCurrentImgIdx((prev) => (prev + 1) % selectedProduct.imgs.length); };
  const prevImg = (e: React.MouseEvent) => { e.stopPropagation(); if (selectedProduct) setCurrentImgIdx((prev) => (prev - 1 + selectedProduct.imgs.length) % selectedProduct.imgs.length); };
  const nextRev = () => { if (selectedProduct) setCurrentRevIdx((prev) => (prev + 1) % (selectedProduct.reviews.length || 1)); };
  const prevRev = () => { if (selectedProduct) setCurrentRevIdx((prev) => (prev - 1 + (selectedProduct.reviews.length || 1)) % (selectedProduct.reviews.length || 1)); };

  const storeProducts = useMemo(() => products.filter(p => p.category === activeCategory), [products, activeCategory]);
  
  const totalPrice = cartItems.reduce((acc, item) => {
    const val = item.price.replace(/[^0-9.]/g, '');
    return acc + parseFloat(val || '0');
  }, 0);

  const totalRevenue = orders.reduce((acc, order) => acc + order.amount, 0);

  const displayOrders = useMemo(() => {
    return orders.filter(o => orderFilter === 'Pending' ? ['Pending', 'Packed', 'Awaiting Payment'].includes(o.status) : ['Shipped', 'Fulfilled'].includes(o.status));
  }, [orders, orderFilter]);

  const allFieldsFilled = Boolean(
    formData.name.trim() && 
    formData.number.trim() && 
    formData.mail.trim() && 
    formData.address.trim() && 
    formData.city.trim() && 
    formData.state.trim() && 
    pincode.length === 6 && 
    cartItems.length > 0
  );

  if (!isLoaded) return <div className="bg-black min-h-screen flex items-center justify-center text-[#6f01ff] font-black uppercase tracking-[2em]">Morphing...</div>;
  
  // --- 4. ADMIN VIEW (With Dashboard) ---
  if (view === 'admin') {
    return (
      <div className="bg-[#050505] min-h-screen text-white p-6 md:p-12 font-sans animate-fade">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-12 border-b border-white/5 pb-6">
            <h1 className="text-3xl font-black italic uppercase text-[#6f01ff] flex items-center gap-3"><LayoutDashboard /> Admin Hub</h1>
            <button onClick={() => setView('landing')} className="bg-white/10 px-8 py-3 rounded-full text-xs font-black uppercase hover:bg-white hover:text-black transition-all shadow-xl">Exit</button>
          </header>

          {/* DASHBOARD STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5">
                <IndianRupee className="text-[#6f01ff] mb-2" size={20} />
                <p className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Revenue</p>
                <h3 className="text-3xl font-black">₹{totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5">
                <ShoppingCart className="text-blue-400 mb-2" size={20} />
                <p className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Orders</p>
                <h3 className="text-3xl font-black">{orders.length}</h3>
            </div>
            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5">
                <PackageSearch className="text-yellow-500 mb-2" size={20} />
                <p className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Pending</p>
                <h3 className="text-3xl font-black">{orders.filter(o => ['Pending', 'Packed', 'Awaiting Payment'].includes(o.status)).length}</h3>
            </div>
            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5">
                <BarChart3 className="text-green-500 mb-2" size={20} />
                <p className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Products</p>
                <h3 className="text-3xl font-black">{products.length}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* UPLOAD PANEL */}
            <div className="lg:col-span-4 space-y-8">
                <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                    <h2 className="text-sm font-black uppercase italic mb-6 text-[#6f01ff]">New Artifact</h2>
                    <form onSubmit={handleUploadProduct} className="space-y-4">
                        <input type="text" placeholder="PRODUCT NAME" required className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none" value={newProd.name} onChange={(e)=>setNewProd({...newProd, name: e.target.value})}/>
                        <textarea placeholder="DESCRIPTION" required rows={2} className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none" value={newProd.desc} onChange={(e)=>setNewProd({...newProd, desc: e.target.value})}/>
                        <select className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold" value={newProd.category} onChange={(e)=>setNewProd({...newProd, category: e.target.value})}>
                            {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="SIZE" className="bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold" value={newProd.size} onChange={(e)=>setNewProd({...newProd, size: e.target.value})}/>
                            <input type="number" placeholder="PRICE" className="bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold" value={newProd.price} onChange={(e)=>setNewProd({...newProd, price: e.target.value})}/>
                        </div>
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-white/5 border-dashed rounded-2xl cursor-pointer hover:bg-white/5 transition-all">
                            <ImageIcon size={20} className="opacity-20 mb-1"/>
                            <p className="text-[9px] font-bold opacity-30 uppercase">Images ({localImgs.length}/4)</p>
                            {/* FIXED: Added accept="image/*" so devices open the image gallery directly */}
                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e)=>handleFileChange(e, 'product')}/>
                        </label>
                        <button type="submit" className="w-full bg-[#6f01ff] text-white py-4 rounded-2xl font-black uppercase italic text-xs tracking-widest shadow-lg">Deploy</button>
                    </form>
                </div>

                {/* SERIES CONTROL */}
                <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-xl">
                    <h2 className="text-sm font-black uppercase italic mb-6 text-red-500">Active Collections</h2>
                    
                    {/* FIXED: The missing input form has been securely added to match the existing variables */}
                    <div className="mb-6 space-y-3 bg-black/20 p-4 rounded-2xl border border-white/5">
                        <input type="text" placeholder="NEW SERIES NAME" className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-[#6f01ff] transition-all" value={newCatName} onChange={(e)=>setNewCatName(e.target.value)}/>
                        <label className="flex items-center justify-center w-full h-10 border border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                            <span className="text-[9px] font-bold opacity-50 uppercase">{newCatBanner ? 'Banner Uploaded ✓' : 'Upload Banner Image'}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e)=>handleFileChange(e, 'category')}/>
                        </label>
                        <button onClick={handleAddCategory} className="w-full bg-[#6f01ff] text-white py-3 rounded-xl font-black uppercase italic text-[10px] tracking-widest hover:scale-[1.02] transition-all">Create Series</button>
                    </div>

                    <div className="space-y-3">
                        {categories.map(cat => (
                            <div key={cat.name} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                                <button onClick={()=>deleteCategory(cat.name)} className="text-red-500/30 hover:text-red-500 transition-colors p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        {categories.length === 0 && <p className="text-[10px] uppercase opacity-30 text-center py-4 font-bold">No collections found</p>}
                    </div>
                </div>
            </div>

            {/* ORDER PIPELINE TABLE */}
            <div className="lg:col-span-8 space-y-8">
                <div className="bg-zinc-900 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                        <h2 className="text-sm font-black uppercase italic tracking-widest">Order Pipeline</h2>
                        <div className="flex gap-2">
                           <button onClick={clearAllOrders} className="text-[9px] font-bold opacity-20 hover:opacity-100 uppercase">Clear All</button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="px-8 pt-6 flex gap-4">
                        <button onClick={() => setOrderFilter('Pending')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${orderFilter === 'Pending' ? 'bg-[#6f01ff] text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Pending / Packed</button>
                        <button onClick={() => setOrderFilter('Completed')} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${orderFilter === 'Completed' ? 'bg-green-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Shipped</button>
                    </div>

                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white/5 uppercase text-[9px] font-black opacity-40">
                                <tr className="border-b border-white/5">
                                    <th className="p-6">ID & Status</th>
                                    <th className="p-6">Customer Info</th>
                                    <th className="p-6">Items Purchased</th>
                                    <th className="p-6">Amount</th>
                                    <th className="p-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {displayOrders.map(o => (
                                    <tr key={o.id} className="hover:bg-white/[0.01]">
                                        <td className="p-6">
                                            <p className="font-mono text-[#6f01ff] font-bold mb-2">{o.id}</p>
                                            <select 
                                                value={o.status} 
                                                onChange={(e) => updateOrderStatus(o.id, e.target.value as Order['status'])}
                                                className={`bg-black border border-white/10 rounded-lg p-2 text-[10px] font-black uppercase outline-none cursor-pointer ${o.status === 'Shipped' ? 'text-green-400' : o.status === 'Packed' ? 'text-yellow-400' : o.status === 'Awaiting Payment' ? 'text-red-400' : 'text-white'}`}
                                            >
                                                <option value="Awaiting Payment">Awaiting Payment</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Packed">Packed</option>
                                                <option value="Shipped">Shipped</option>
                                            </select>
                                        </td>
                                        <td className="p-6">
                                            <p className="font-black uppercase italic mb-1">{o.customer}</p>
                                            <p className="text-[10px] text-[#6f01ff] font-bold mb-1">{o.email} • {o.phone}</p>
                                            <p className="text-[9px] opacity-50 max-w-[200px] leading-relaxed">{o.address}, {o.city}, {o.state} - {o.pincode}</p>
                                            <p className="text-[8px] opacity-30 mt-2">{o.date}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[10px] font-black uppercase opacity-60 mb-2 block">{o.items.length} items</span>
                                            <div className="space-y-1">
                                                {o.fullItems ? o.fullItems.map((item, i) => (
                                                    <div key={i} className="text-[9px] text-white/60 flex items-center gap-2">
                                                        <span className="w-1 h-1 bg-[#6f01ff] rounded-full"></span>
                                                        <span className="truncate max-w-[150px]">{item.name}</span>
                                                        <span className="opacity-50">({item.dimensions})</span>
                                                    </div>
                                                )) : (
                                                    o.items.map((item, i) => (
                                                        <div key={i} className="text-[9px] text-white/60 flex items-center gap-2">
                                                            <span className="w-1 h-1 bg-[#6f01ff] rounded-full"></span>{item}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 font-black">₹{o.amount.toFixed(2)}</td>
                                        <td className="p-6 text-right">
                                            <button onClick={()=>deleteOrder(o.id)} className="text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {displayOrders.length === 0 && (
                                    <tr><td colSpan={5} className="p-20 text-center opacity-20 font-black uppercase italic tracking-widest">Pipeline Empty</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* INVENTORY TABLE */}
                <div className="bg-zinc-900 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center"><h2 className="text-sm font-black uppercase italic tracking-widest">Inventory Management</h2></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white/5 uppercase text-[9px] font-black opacity-40"><tr className="border-b border-white/5"><th className="p-6">Product</th><th className="p-6">Status</th><th className="p-6">Action</th></tr></thead>
                            <tbody className="divide-y divide-white/5">
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-white/[0.01]">
                                        <td className="p-6"><div className="flex items-center gap-4"><img src={p.imgs[0]} className="w-10 h-10 rounded-lg object-cover" /><div><p className="font-black uppercase italic">{p.name}</p><p className="text-[9px] opacity-40 uppercase">{p.category}</p></div></div></td>
                                        <td className="p-6"><button onClick={()=>toggleStock(p.id)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${p.stock==='AVAILABLE'?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{p.stock}</button></td>
                                        <td className="p-6"><button onClick={()=>deleteProduct(p.id)} className="text-red-500/30 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
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
        <div className="p-12 flex justify-center sticky top-0 z-[100]">
           <img src="/pruple_png_main.png" alt="Logo" className="h-24 md:h-40 w-auto object-contain animate-pulse drop-shadow-[0_0_35px_rgba(111,1,255,0.7)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {categories.map((cat, idx) => {
            const hasStock = products.some(p => p.category === cat.name);
            return (
              <div key={cat.name} onClick={() => { setActiveCategory(cat.name); setView('store'); }} className={`relative cursor-pointer group overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/5 transition-all duration-700 ${idx === 0 ? 'h-[55vh] md:h-[65vh] md:col-span-2' : 'h-[45vh] md:h-[50vh]'}`}>
                <img src={cat.banner} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-all duration-[2s] opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-20" />
                <div className="absolute bottom-12 left-12 z-30">
                  <h2 className={`font-black italic uppercase tracking-tighter leading-none drop-shadow-2xl text-white ${idx === 0 ? 'text-5xl md:text-8xl' : 'text-3xl md:text-4xl'}`}>{cat.name}</h2>
                  <p className={`${idx === 0 ? 'text-[#6f01ff]' : 'text-white/40'} font-black tracking-[0.5em] uppercase mt-6 text-[10px] flex items-center gap-3`}>
                    {hasStock ? <><span className="w-2 h-2 bg-[#6f01ff] rounded-full animate-ping" /> ENTER VOID</> : "DROPPING SOON"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <footer className="mt-40 p-24 text-center relative z-[200]">
            <div className="inline-block group">
                <p className="text-[11px] font-black tracking-[1.5em] uppercase text-white/10 group-hover:text-[#6f01ff] transition-colors">Morph Studio × 2026</p>
                <div className="h-px w-0 group-hover:w-full bg-[#6f01ff] transition-all duration-700 mx-auto mt-4 shadow-[0_0_10px_#6f01ff]" />
            </div>
        </footer>
        
        {showLogin && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm animate-fade">
                <div className="relative w-full max-w-sm bg-zinc-900 border border-[#6f01ff]/40 p-12 rounded-[3rem] shadow-2xl">
                    <button onClick={()=>setShowLogin(false)} className="absolute top-8 right-8 text-white/20 hover:text-white"><X size={20}/></button>
                    <div className="flex flex-col items-center mb-8"><Lock className="text-[#6f01ff] mb-4" size={32}/><h2 className="text-xl font-black italic uppercase tracking-widest text-white">ACCESS HUB</h2></div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" placeholder="IDENTITY" className="w-full bg-black border border-white/10 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-[#6f01ff] uppercase" onChange={(e)=>setLoginCreds({...loginCreds, user: e.target.value})} />
                        <input type="password" placeholder="VOID PASS" className="w-full bg-black border border-white/10 rounded-2xl py-5 px-6 text-xs font-bold outline-none focus:border-[#6f01ff] uppercase" onChange={(e)=>setLoginCreds({...loginCreds, pass: e.target.value})} />
                        <button type="submit" className="w-full bg-[#6f01ff] text-white py-5 rounded-2xl font-black uppercase italic tracking-widest shadow-lg hover:scale-[1.02] transition-all">Verify</button>
                    </form>
                </div>
            </div>
        )}
        {toast && <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[1000] bg-white text-black px-12 py-5 rounded-full font-black uppercase italic text-xs shadow-2xl">{toast}</div>}
      </div>
    );
  }

  // --- 6. STORE VIEW ---
  return (
    <main className="relative bg-[#050505] min-h-screen text-[#fff1f1] p-4 md:p-8 font-sans overflow-x-hidden animate-fade">
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
              
              <div className="bg-[#6f01ff]/5 p-8 rounded-[3rem] border border-[#6f01ff]/20 text-[#e5c7f4] text-md leading-relaxed shadow-inner min-h-[120px]">
                {selectedProduct.description}
              </div>

              <div className="flex items-center space-x-4 bg-white/5 p-6 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest"><Maximize size={20} className="text-[#6f01ff]" />Dimension: {selectedProduct.dimensions}</div>
              
              <div className="border-t border-white/10 pt-10">
                <p className="text-[11px] font-black text-[#6f01ff] uppercase tracking-[0.4em] mb-6">Verified Reports</p>
                {selectedProduct.reviews.length > 0 ? (
                  <div className="relative bg-white/5 p-8 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl min-h-[140px]">
                    <div className="animate-fade" key={`rev-${currentRevIdx}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-white italic">{selectedProduct.reviews[currentRevIdx].user}</span>
                        <div className="flex text-yellow-500 space-x-1"><Star size={14} fill="currentColor" /></div>
                      </div>
                      <p className="text-sm italic text-white/70 leading-relaxed">"{selectedProduct.reviews[currentRevIdx].comment}"</p>
                    </div>
                    {selectedProduct.reviews.length > 1 && (
                      <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/5">
                        <button onClick={prevRev} className="text-white/20 hover:text-white transition-all"><ChevronLeft size={18}/></button>
                        <span className="text-[10px] font-black text-white/30">{currentRevIdx + 1} / {selectedProduct.reviews.length}</span>
                        <button onClick={nextRev} className="text-white/20 hover:text-white transition-all"><ChevronRight size={18}/></button>
                      </div>
                    )}
                  </div>
                ) : <p className="text-[10px] uppercase tracking-widest text-white/10 text-center italic">Scanning the void for feedback...</p>}
              </div>

              <button disabled={selectedProduct.stock === 'OUT OF STOCK'} onClick={() => addToCart(selectedProduct)} className={`w-full text-white py-8 rounded-full font-black text-2xl transition-all transform active:scale-95 italic shadow-xl mt-10 ${selectedProduct.stock === 'OUT OF STOCK' ? 'bg-zinc-800 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-[#6f01ff] to-[#9e4ffe] hover:scale-[1.02]'}`}>
                {selectedProduct.stock === 'OUT OF STOCK' ? 'SOLD OUT' : 'ADD TO VOID +'}
              </button>
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
                <div key={idx} className="flex justify-between items-center bg-white/5 p-7 rounded-[2rem] border border-white/5 shadow-xl transition-all hover:border-[#6f01ff]/30"><div><span className="font-black italic text-md uppercase block text-white">{item.name}</span><span className="text-[10px] text-[#6f01ff] font-bold uppercase">{item.dimensions}</span></div><div className="flex items-center space-x-6"><span className="text-white font-black text-md">{item.price}</span><button onClick={() => removeFromCart(idx)} className="p-2 text-white/20 hover:text-red-500 transition-colors"><Trash2 size={20} /></button></div></div>
            ))}</div>
            <div className="space-y-5">
              <input type="text" placeholder="NAME" value={formData.name} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, name: e.target.value})}/>
              <input type="text" placeholder="PHONE" value={formData.number} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff]" onChange={(e)=>setFormData({...formData, number: e.target.value})}/>
              <input type="email" placeholder="EMAIL" value={formData.mail} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, mail: e.target.value})}/>
              
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="CITY" value={formData.city} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, city: e.target.value})}/>
                <input type="text" placeholder="STATE" value={formData.state} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all" onChange={(e)=>setFormData({...formData, state: e.target.value})}/>
              </div>

              <textarea placeholder="ADDRESS" rows={3} value={formData.address} className="w-full bg-black border border-white/10 rounded-3xl py-5 px-6 text-sm font-bold outline-none focus:border-[#6f01ff] transition-all font-bold" onChange={(e)=>setFormData({...formData, address: e.target.value})}></textarea>
              
              <div className="bg-[#6f01ff]/5 border border-[#6f01ff]/20 p-8 rounded-[3rem] shadow-inner text-center">
                <label className="text-[10px] font-black uppercase text-[#6f01ff] mb-4 block tracking-[0.3em]">Pincode Verification</label>
                <input type="text" placeholder="6-DIGIT" maxLength={6} className="bg-black border border-white/10 rounded-2xl px-6 py-4 text-md w-full outline-none font-black text-[#6f01ff] tracking-[0.6em] text-center" onChange={(e) => handlePincodeChange(e.target.value)} />
                {deliveryEst && <div className="mt-6 flex items-center justify-center space-x-4 text-green-400 font-black text-xs uppercase italic animate-bounce"><Truck size={22} /><span>{deliveryEst}</span></div>}
              </div>
              <div className="pt-10 border-t border-white/10 text-center">
                <div className="flex justify-between text-2xl font-black mb-10 italic uppercase tracking-tighter"><span>GRAND TOTAL</span><span className="text-[#6f01ff] font-black italic underline underline-offset-8 decoration-white/10">INR {totalPrice.toFixed(2)}</span></div>
                
                {allFieldsFilled ? (
                    <button onClick={handleCheckoutNow} className="w-full bg-white text-black py-8 rounded-full font-black text-2xl hover:bg-[#6f01ff] hover:text-white transition-all shadow-xl uppercase italic flex items-center justify-center gap-4">Checkout Now</button>
                ) : (
                    <div className="w-full bg-white/5 border border-white/10 text-white/40 py-8 rounded-full font-black text-sm uppercase italic tracking-widest cursor-not-allowed">Complete Form To Proceed</div>
                )}
                
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
