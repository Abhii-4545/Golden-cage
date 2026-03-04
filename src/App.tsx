import { BrowserRouter, Routes, Route } from "react-router";
import Landing from "./pages/Landing";
import CustomerMenu from "./pages/CustomerMenu";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/table/:tableId" element={<CustomerMenu />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
