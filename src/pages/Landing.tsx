import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Utensils, ShieldAlert } from "lucide-react";
import { io } from "socket.io-client";

export default function Landing() {
  const [tables, setTables] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io();
    socket.on("tables_updated", (data) => setTables(data));

    fetch("/api/tables")
      .then((res) => res.json())
      .then((data) => setTables(data));

    return () => {
      socket.disconnect();
    };
  }, []);

  const availableTables = tables.filter((t) => t.status === "Available");

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Utensils className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-stone-900 mb-2 font-serif">
          Golden Cafe & Resto
        </h1>
        <p className="text-stone-500">
          Scan QR to order or select your table below
        </p>
      </div>

      <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-12">
        {availableTables.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-stone-500">
            No tables currently available. Please wait.
          </div>
        ) : (
          availableTables.map((table) => (
            <button
              key={table.id}
              onClick={() => navigate(`/table/${table.id}`)}
              className={`p-4 bg-white rounded-xl shadow-sm border border-stone-200 hover:border-amber-500 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2`}
            >
              <span className="text-xl font-semibold text-stone-800">
                {table.name}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  table.status === "Available"
                    ? "bg-emerald-100 text-emerald-700"
                    : table.status === "Occupied"
                      ? "bg-rose-100 text-rose-700"
                      : table.status === "Cleaning"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-stone-100 text-stone-700"
                }`}
              >
                {table.status}
              </span>
            </button>
          ))
        )}
      </div>

      <button
        onClick={() => navigate("/admin")}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ShieldAlert className="w-4 h-4" />
        <span>Admin Login</span>
      </button>
    </div>
  );
}
