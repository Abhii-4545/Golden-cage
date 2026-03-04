import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { formatDistanceToNow } from "date-fns";
import {
  LayoutGrid,
  ChefHat,
  Settings,
  LogOut,
  CheckCircle2,
  Clock,
  Ban,
  Plus,
  Trash2,
  X,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function AdminDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuData, setMenuData] = useState<{ categories: any[]; items: any[] }>(
    { categories: [], items: [] },
  );
  const [activeTab, setActiveTab] = useState<"tables" | "kitchen" | "menu">(
    "tables",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItem, setNewItem] = useState({ categoryId: "", name: "", price: "", imageBase64: "" });
  const [selectedTableForOrders, setSelectedTableForOrders] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit("join_admin");

    newSocket.on("tables_updated", (data) => setTables(data));
    newSocket.on("orders_updated", () => fetchOrders());
    newSocket.on("menu_updated", (data) => setMenuData(data));
    newSocket.on("new_order", () => fetchOrders());

    Promise.all([
      fetch("/api/tables").then((res) => res.json()),
      fetch("/api/orders").then((res) => res.json()),
      fetch("/api/menu").then((res) => res.json()),
    ]).then(([tablesData, ordersData, menuData]) => {
      setTables(tablesData);
      setOrders(ordersData);
      setMenuData(menuData);
    });

    const fetchOrders = async () => {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    };

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const updateTableStatus = (tableId: string, status: string) => {
    if (socket) socket.emit("update_table_status", { tableId, status });
  };

  const acceptOrder = (orderId: string) => {
    if (socket) socket.emit("accept_order", orderId);
  };

  const updateOrderItemStatus = (orderItemId: string, status: string) => {
    if (socket)
      socket.emit("update_order_item_status", { orderItemId, status });
  };

  const toggleMenuItem = (itemId: string, isSoldOut: boolean) => {
    if (socket) socket.emit("toggle_menu_item", { itemId, isSoldOut });
  };

  const addCategory = () => {
    if (socket && newCategoryName.trim()) {
      socket.emit("add_category", { name: newCategoryName.trim() });
      setNewCategoryName("");
    }
  };

  const deleteCategory = (categoryId: string) => {
    if (socket && confirm("Are you sure you want to delete this category and all its items?")) {
      socket.emit("delete_category", categoryId);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem({ ...newItem, imageBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addMenuItem = () => {
    if (socket && newItem.categoryId && newItem.name && newItem.price) {
      socket.emit("add_menu_item", {
        categoryId: newItem.categoryId,
        name: newItem.name,
        price: parseInt(newItem.price),
        imageUrl: newItem.imageBase64 || undefined,
      });
      setNewItem({ categoryId: "", name: "", price: "", imageBase64: "" });
    }
  };

  const deleteMenuItem = (itemId: string) => {
    if (socket && confirm("Are you sure you want to delete this item?")) {
      socket.emit("delete_menu_item", itemId);
    }
  };

  const getTableColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-emerald-100 border-emerald-300 text-emerald-800";
      case "Occupied":
        return "bg-rose-100 border-rose-300 text-rose-800";
      case "Billing":
        return "bg-amber-100 border-amber-300 text-amber-800";
      case "Cleaning":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "Inactive":
        return "bg-stone-200 border-stone-300 text-stone-600";
      default:
        return "bg-stone-100 border-stone-200 text-stone-800";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-center text-stone-900 mb-6 font-serif">
            Admin Login
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password === "golden123") setIsAuthenticated(true);
              else alert("Incorrect password. Try golden123");
            }}
          >
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            />
            <button
              type="submit"
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors"
            >
              Login
            </button>
          </form>
          <button
            onClick={() => navigate("/")}
            className="w-full mt-4 text-stone-500 hover:text-stone-800 text-sm font-medium"
          >
            Return to Customer View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-stone-900 text-stone-300 flex flex-col">
        <div className="p-6 border-b border-stone-800">
          <h1 className="text-2xl font-bold text-amber-500 font-serif">
            Golden Admin
          </h1>
          <p className="text-xs text-stone-500 uppercase tracking-wider mt-1">
            Management Suite
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab("tables")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "tables" ? "bg-amber-500/10 text-amber-500" : "hover:bg-stone-800 hover:text-white"}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="font-medium">Live Table Pulse</span>
          </button>

          <button
            onClick={() => setActiveTab("kitchen")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "kitchen" ? "bg-amber-500/10 text-amber-500" : "hover:bg-stone-800 hover:text-white"}`}
          >
            <ChefHat className="w-5 h-5" />
            <span className="font-medium">Kitchen Display</span>
            {orders.some((o) => o.status === "Received") && (
              <span className="ml-auto bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                New
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("menu")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === "menu" ? "bg-amber-500/10 text-amber-500" : "hover:bg-stone-800 hover:text-white"}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Menu Editor</span>
          </button>
        </nav>

        <div className="p-4 border-t border-stone-800">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-800 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Exit Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {activeTab === "tables" && (
          <div className="space-y-6">
            <header className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold text-stone-900 font-serif mb-2">
                  Live Table Pulse
                </h2>
                <p className="text-stone-500">
                  Real-time status of all tables.
                </p>
              </div>
              <div className="flex gap-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>{" "}
                  Available
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>{" "}
                  Occupied
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>{" "}
                  Billing
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>{" "}
                  Cleaning
                </div>
              </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables.map((table) => {
                const tableOrders = orders.filter(
                  (o) => o.table_id === table.id && o.status !== "Served",
                );
                const activeOrder = tableOrders[0];

                return (
                  <div
                    key={table.id}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${getTableColor(table.status)}`}
                    onClick={() => setSelectedTableForOrders(table.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-bold">{table.name}</h3>
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/50 backdrop-blur-sm">
                        {table.status}
                      </span>
                    </div>

                    {table.status === "Occupied" && activeOrder && (
                      <div className="mb-4 text-sm font-medium flex items-center gap-2 opacity-80">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(
                          new Date(activeOrder.created_at),
                        )}{" "}
                        ago
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-black/10">
                      <select
                        value={table.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          updateTableStatus(table.id, e.target.value)
                        }
                        className="w-full bg-white/50 border border-black/10 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/20"
                      >
                        <option value="Available">Set Available</option>
                        <option value="Occupied">Set Occupied</option>
                        <option value="Billing">Request Bill</option>
                        <option value="Cleaning">Needs Cleaning</option>
                        <option value="Inactive">Set Inactive</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "kitchen" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-3xl font-bold text-stone-900 font-serif mb-2">
                Kitchen Display
              </h2>
              <p className="text-stone-500">
                Manage active orders and item preparation.
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders
                .filter((o) => o.status !== "Served")
                .map((order) => {
                  const table = tables.find((t) => t.id === order.table_id);
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col"
                    >
                      <div className="bg-stone-900 text-white p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">
                            {table?.name || order.table_id}
                          </h3>
                          <p className="text-stone-400 text-sm">
                            Order #{order.id.slice(-4)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-400 font-bold">
                            {formatDistanceToNow(new Date(order.created_at))}{" "}
                            ago
                          </div>
                          <div className="text-sm text-stone-400">
                            {order.status}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 flex-1 overflow-y-auto space-y-3">
                        {order.status === "Received" && (
                          <button
                            onClick={() => acceptOrder(order.id)}
                            className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors mb-2"
                          >
                            Accept Order
                          </button>
                        )}
                        {order.items.map((item: any) => {
                          const menuItem = menuData.items.find(
                            (m) => m.id === item.item_id,
                          );
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start justify-between p-3 rounded-xl border ${item.status === "Completed" ? "bg-emerald-50 border-emerald-100" : "bg-stone-50 border-stone-200"}`}
                            >
                              <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg text-stone-800">
                                    {item.quantity}x
                                  </span>
                                  <span
                                    className={`font-medium ${item.status === "Completed" ? "text-stone-500 line-through" : "text-stone-900"}`}
                                  >
                                    {menuItem?.name || "Unknown Item"}
                                  </span>
                                </div>
                                {item.special_instructions && (
                                  <p className="text-rose-600 text-sm mt-1 font-medium bg-rose-50 px-2 py-1 rounded inline-block">
                                    Note: {item.special_instructions}
                                  </p>
                                )}
                              </div>

                              {item.status !== "Completed" ? (
                                <button
                                  onClick={() =>
                                    updateOrderItemStatus(item.id, "Completed")
                                  }
                                  className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors shrink-0"
                                >
                                  <CheckCircle2 className="w-6 h-6" />
                                </button>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-6 h-6" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              {orders.filter((o) => o.status !== "Served").length === 0 && (
                <div className="col-span-full py-20 text-center text-stone-400">
                  <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-medium">No active orders</p>
                  <p>Kitchen is clear!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "menu" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-3xl font-bold text-stone-900 font-serif mb-2">
                Dynamic Menu Editor
              </h2>
              <p className="text-stone-500">
                Manage categories, items, and availability.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 className="font-bold text-stone-800 mb-4">Add Category</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button onClick={addCategory} className="bg-stone-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 className="font-bold text-stone-800 mb-4">Add Menu Item</h3>
                <div className="space-y-3">
                  <select
                    value={newItem.categoryId}
                    onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select Category</option>
                    {menuData.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Item Name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      className="w-24 px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer bg-stone-50 border border-stone-200 border-dashed rounded-xl px-4 py-2 text-sm text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" />
                      {newItem.imageBase64 ? "Image Selected" : "Upload Image (Optional)"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <button onClick={addMenuItem} className="w-full bg-stone-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              {menuData.categories.map((category) => {
                const categoryItems = menuData.items.filter(
                  (item) => item.category_id === category.id,
                );

                return (
                  <div
                    key={category.id}
                    className="border-b border-stone-100 last:border-0"
                  >
                    <div className="bg-stone-50 px-6 py-3 border-b border-stone-100 flex justify-between items-center">
                      <h3 className="font-bold text-stone-800">
                        {category.name}
                      </h3>
                      <button onClick={() => deleteCategory(category.id)} className="text-rose-500 hover:text-rose-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {categoryItems.length === 0 && (
                        <div className="p-4 text-center text-stone-400 text-sm">No items in this category</div>
                      )}
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 px-6 hover:bg-stone-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className={`w-12 h-12 rounded-lg object-cover ${item.is_sold_out ? "grayscale opacity-50" : ""}`}
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <h4
                                className={`font-medium ${item.is_sold_out ? "text-stone-400 line-through" : "text-stone-900"}`}
                              >
                                {item.name}
                              </h4>
                              <p className="text-sm text-stone-500 font-medium">
                                ₹{item.price}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                toggleMenuItem(item.id, !item.is_sold_out)
                              }
                              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                                item.is_sold_out
                                  ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                                  : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                              }`}
                            >
                              {item.is_sold_out ? (
                                <>Available</>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4" /> Mark Sold Out
                                </>
                              )}
                            </button>
                            <button onClick={() => deleteMenuItem(item.id)} className="p-2 text-stone-400 hover:text-rose-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Table Orders Modal */}
      {selectedTableForOrders && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTableForOrders(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-2xl font-bold font-serif text-stone-900">Orders for {tables.find(t => t.id === selectedTableForOrders)?.name}</h3>
              <button onClick={() => setSelectedTableForOrders(null)} className="text-stone-400 hover:text-stone-600 bg-stone-100 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {orders.filter(o => o.table_id === selectedTableForOrders && o.status !== 'Archived').length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No active orders for this table.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.filter(o => o.table_id === selectedTableForOrders && o.status !== 'Archived').map(order => (
                    <div key={order.id} className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-stone-800">Order #{order.id.slice(-4)}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-stone-500">{formatDistanceToNow(new Date(order.created_at))} ago</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            order.status === 'Served' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'Preparing' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item: any) => {
                          const menuItem = menuData.items.find((m: any) => m.id === item.item_id);
                          return (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-stone-700"><span className="font-bold mr-2">{item.quantity}x</span>{menuItem?.name || 'Unknown Item'}</span>
                              <span className={`font-medium ${item.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>{item.status}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-stone-200 flex justify-between items-center">
                        <span className="font-bold text-stone-800">Total</span>
                        <span className="font-bold text-amber-600 text-lg">₹{order.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
