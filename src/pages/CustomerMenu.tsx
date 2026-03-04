import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { io, Socket } from "socket.io-client";
import {
  ShoppingCart,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChefHat,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  price: number;
  is_sold_out: boolean;
  image_url: string;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
}

export default function CustomerMenu() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tableStatus, setTableStatus] = useState<string>("Available");
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<{
    id: string;
    status: string;
  } | null>(null);
  const [placedOrders, setPlacedOrders] = useState<any[]>([]);
  const [showTracker, setShowTracker] = useState(false);
  const [loading, setLoading] = useState(true);

  const latestOrder = useMemo(() => {
    if (placedOrders.length === 0) return null;
    return [...placedOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }, [placedOrders]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit("join_table", tableId);

    newSocket.on("order_status_updated", (data) => {
      setOrderStatus({ id: data.orderId, status: data.status });
    });

    newSocket.on("orders_updated", () => {
      fetchOrders();
    });

    newSocket.on("tables_updated", (tables) => {
      const currentTable = tables.find((t: any) => t.id === tableId);
      if (currentTable) {
        setTableStatus(currentTable.status);
      }
    });

    newSocket.on("menu_updated", (data) => {
      setCategories(data.categories);
      setMenuItems(data.items);
    });

    const fetchOrders = () => {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => {
          const myOrders = data.filter((o: any) => o.table_id === tableId && o.status !== 'Archived');
          setPlacedOrders(myOrders);
        });
    };

    Promise.all([
      fetch("/api/tables").then((res) => res.json()),
      fetch("/api/menu").then((res) => res.json()),
    ]).then(([tablesData, menuData]) => {
      const currentTable = tablesData.find((t: any) => t.id === tableId);
      if (currentTable) setTableStatus(currentTable.status);

      setCategories(menuData.categories);
      setMenuItems(menuData.items);
      if (menuData.categories.length > 0) {
        setActiveCategory(menuData.categories[0].id);
      }
      fetchOrders();
      setLoading(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [tableId]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i,
        );
      }
      return prev.filter((i) => i.id !== itemId);
    });
  };

  const updateInstructions = (itemId: string, instructions: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, specialInstructions: instructions } : i,
      ),
    );
  };

  const placeOrder = () => {
    if (!socket || cart.length === 0) return;

    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    socket.emit("place_order", {
      tableId,
      items: cart,
      total,
    });

    setCart([]);
    setIsCartOpen(false);
    setOrderStatus({ id: "pending", status: "Received" });
    setShowTracker(true);
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (tableStatus === "Cleaning" || tableStatus === "Inactive") {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Info className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900 mb-4">
          Table Being Prepared
        </h1>
        <p className="text-stone-600 mb-8 max-w-md">
          Please wait a moment while our staff prepares this table for you. The
          menu will become available shortly.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-stone-200 text-stone-800 rounded-full font-medium hover:bg-stone-300 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const activeItems = menuItems.filter(
    (item) => item.category_id === activeCategory,
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900 font-serif">
              Golden Cafe
            </h1>
            <p className="text-xs text-stone-500 font-medium tracking-wider uppercase">
              Table {tableId?.replace("T", "")}
            </p>
          </div>
        </div>
        {(latestOrder || orderStatus) && (
          <button
            onClick={() => setShowTracker(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors"
          >
            <ChefHat className="w-4 h-4" />
            <span>Track Order</span>
          </button>
        )}
      </header>

      {/* Category Scroll */}
      <div className="sticky top-[73px] z-10 bg-stone-50/90 backdrop-blur-sm py-3 px-4 overflow-x-auto no-scrollbar border-b border-stone-200">
        <div className="flex gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeCategory === category.id
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "bg-white text-stone-600 border border-stone-200 hover:border-amber-300"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <main className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {activeItems.map((item) => {
            const cartItem = cart.find((i) => i.id === item.id);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.id}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex flex-col ${item.is_sold_out ? "opacity-60 grayscale" : ""}`}
              >
                <div className="h-48 w-full relative overflow-hidden bg-stone-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {item.is_sold_out && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-rose-500 text-white px-4 py-1.5 rounded-full font-bold uppercase tracking-wider text-sm shadow-lg">
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-800 mb-1 leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-amber-600 font-bold text-lg mb-4">
                      ₹{item.price}
                    </p>
                  </div>

                  {!item.is_sold_out && (
                    <div className="flex items-center justify-between mt-auto">
                      {cartItem ? (
                        <div className="flex items-center gap-3 bg-stone-100 rounded-full p-1 border border-stone-200 w-full justify-between">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-stone-600 shadow-sm hover:text-rose-500 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-stone-800 w-4 text-center">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-sm hover:bg-amber-600 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full py-2.5 bg-stone-900 text-white rounded-xl font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Plus className="w-4 h-4" /> Add to Order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </main>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {(cartCount > 0 || placedOrders.length > 0) && !isCartOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-30"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-amber-500 text-white rounded-2xl p-4 shadow-xl shadow-amber-500/30 flex items-center justify-between hover:bg-amber-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-amber-500">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-lg">View Order</span>
              </div>
              <span className="font-bold text-xl">₹{cartTotal + placedOrders.reduce((sum, o) => sum + o.total, 0)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
                <h2 className="text-2xl font-bold text-stone-900 font-serif">
                  Your Order
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200"
                >
                  <Minus className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {placedOrders.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-amber-500" />
                      Already Ordered
                    </h3>
                    <div className="space-y-4">
                      {placedOrders.map((order) => (
                        <div key={order.id} className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-stone-500">Order #{order.id.slice(-4)}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              order.status === 'Served' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'Preparing' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {order.items.map((item: any) => {
                              const menuItem = menuItems.find(m => m.id === item.item_id);
                              return (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-stone-700"><span className="font-bold mr-2">{item.quantity}x</span>{menuItem?.name || 'Item'}</span>
                                  {item.status === 'Completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-500" />
                  New Items
                </h3>
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-stone-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-20 h-20 rounded-xl object-cover border border-stone-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-stone-800 leading-tight">
                              {item.name}
                            </h4>
                            <span className="font-bold text-amber-600">
                              ₹{item.price * item.quantity}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-3 bg-stone-100 rounded-full p-1 border border-stone-200">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-stone-600 shadow-sm"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-stone-800 w-4 text-center text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-sm"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            placeholder="Special instructions (e.g., Extra spicy)"
                            value={item.specialInstructions || ""}
                            onChange={(e) =>
                              updateInstructions(item.id, e.target.value)
                            }
                            className="mt-3 w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 ? (
                <div className="p-4 border-t border-stone-100 bg-stone-50 pb-safe">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-stone-500 font-medium">
                      Total Amount
                    </span>
                    <span className="text-2xl font-bold text-stone-900">
                      ₹{cartTotal}
                    </span>
                  </div>
                  <button
                    onClick={placeOrder}
                    className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                  >
                    Place Order Now <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <p className="text-center text-xs text-stone-400 mt-3">
                    Pay at counter after your meal.
                  </p>
                </div>
              ) : placedOrders.length > 0 ? (
                <div className="p-4 border-t border-stone-100 bg-stone-50 pb-safe">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-stone-500 font-medium">
                      Total Ordered
                    </span>
                    <span className="text-2xl font-bold text-stone-900">
                      ₹{placedOrders.reduce((sum, o) => sum + o.total, 0)}
                    </span>
                  </div>
                  <p className="text-center text-xs text-stone-400 mt-3">
                    Pay at counter after your meal.
                  </p>
                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTracker && (latestOrder || orderStatus) && (
          <OrderTracker 
            order={latestOrder || orderStatus} 
            onClose={() => setShowTracker(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderTracker({ order, onClose }: { order: any, onClose: () => void }) {
  const steps = [
    { id: 'Received', label: 'Order Received', icon: ShoppingCart },
    { id: 'Preparing', label: 'Preparing Your Order', icon: ChefHat },
    { id: 'Served', label: 'Delivered', icon: CheckCircle2 }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order?.status);
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-stone-100">
          <motion.div 
            className="h-full bg-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>

        <div className="text-center mb-10 mt-2">
          <h2 className="text-2xl font-bold font-serif text-stone-900">Track Your Order</h2>
          <p className="text-stone-500 mt-1 font-medium">Order #{order?.id?.slice(-4) || '...'}</p>
        </div>

        <div className="relative pl-4">
          <div className="absolute left-8 top-8 bottom-8 w-1 bg-stone-100 rounded-full" />
          <motion.div 
            className="absolute left-8 top-8 bottom-8 w-1 bg-amber-500 rounded-full origin-top"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: activeIndex === 0 ? 0 : activeIndex === 1 ? 0.5 : 1 }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
          />

          <div className="space-y-10 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= activeIndex;
              const isCurrent = index === activeIndex;
              
              return (
                <div key={step.id} className="flex items-start gap-6 relative z-10">
                  <motion.div 
                    initial={false}
                    animate={{ 
                      backgroundColor: isActive ? '#f59e0b' : '#f5f5f4',
                      color: isActive ? '#ffffff' : '#a8a29e',
                      scale: isCurrent ? 1.1 : 1
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 mt-1"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>
                  <div className="pt-1">
                    <motion.h3 
                      animate={{ color: isActive ? '#1c1917' : '#a8a29e' }}
                      className="text-lg font-bold"
                    >
                      {step.label}
                    </motion.h3>
                    <AnimatePresence>
                      {isActive && (
                        <motion.p 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className={`text-sm font-medium mt-1 ${isCurrent ? 'text-amber-600' : 'text-stone-400'}`}
                        >
                          {index === 0 && "We've received your order and are reviewing it."}
                          {index === 1 && "Our chefs are preparing your delicious meal!"}
                          {index === 2 && "Enjoy your meal!"}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-10 bg-stone-100 text-stone-800 py-4 rounded-2xl font-bold hover:bg-stone-200 transition-colors"
        >
          Close Tracker
        </button>
      </motion.div>
    </motion.div>
  );
}
