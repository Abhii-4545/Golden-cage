import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(':memory:'); // In-memory for prototype, use a file for persistence

// --- Database Initialization ---
db.exec(`
  CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available' -- Available, Occupied, Billing, Cleaning, Inactive
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    is_sold_out BOOLEAN NOT NULL DEFAULT 0,
    image_url TEXT,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Received', -- Received, Preparing, Served
    total INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(table_id) REFERENCES tables(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    special_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'Preparing', -- Preparing, Completed
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(item_id) REFERENCES menu_items(id)
  );
`);

// --- Seed Data ---
const insertTable = db.prepare('INSERT OR IGNORE INTO tables (id, name, status) VALUES (?, ?, ?)');
insertTable.run('T1', 'Table 1', 'Available');
insertTable.run('T2', 'Table 2', 'Available');
insertTable.run('T3', 'Table 3', 'Occupied');
insertTable.run('T4', 'Table 4', 'Cleaning');
insertTable.run('T5', 'Table 5', 'Inactive');

const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES (?, ?, ?)');
insertCategory.run('C1', 'Golden Specials', 1);
insertCategory.run('C2', 'Pasta', 2);
insertCategory.run('C3', 'Momos', 3);
insertCategory.run('C4', 'Sandwiches', 4);
insertCategory.run('C5', 'Pizza', 5);
insertCategory.run('C6', 'Fries & Nuggets', 6);
insertCategory.run('C7', 'Beverages', 7);

const insertMenuItem = db.prepare('INSERT OR IGNORE INTO menu_items (id, category_id, name, price, is_sold_out, image_url) VALUES (?, ?, ?, ?, ?, ?)');
// Golden Specials
insertMenuItem.run('M1', 'C1', 'Dal Pakwan', 91, 0, 'https://picsum.photos/seed/dalpakwan/400/300');
insertMenuItem.run('M2', 'C1', 'Chole Bhature', 156, 0, 'https://picsum.photos/seed/chole/400/300');
insertMenuItem.run('M3', 'C1', 'Pav Bhaji', 117, 0, 'https://picsum.photos/seed/pavbhaji/400/300');
insertMenuItem.run('M4', 'C1', 'Tawa Pulav', 156, 0, 'https://picsum.photos/seed/pulav/400/300');
insertMenuItem.run('M5', 'C1', 'Veg Biryani', 325, 0, 'https://picsum.photos/seed/biryani/400/300');
// Pasta
insertMenuItem.run('M6', 'C2', 'White Sauce Pasta', 338, 0, 'https://picsum.photos/seed/whitepasta/400/300');
insertMenuItem.run('M7', 'C2', 'Red Sauce Pasta', 260, 0, 'https://picsum.photos/seed/redpasta/400/300');
// Momos
insertMenuItem.run('M8', 'C3', 'Veg Momos', 104, 0, 'https://picsum.photos/seed/vegmomos/400/300');
insertMenuItem.run('M9', 'C3', 'Fried Tandoori Momos', 169, 0, 'https://picsum.photos/seed/tandoorimomos/400/300');
insertMenuItem.run('M10', 'C3', 'Paneer Momos', 117, 0, 'https://picsum.photos/seed/paneermomos/400/300');
// Sandwiches
insertMenuItem.run('M11', 'C4', 'Bombay Masala Sandwich', 143, 0, 'https://picsum.photos/seed/bombaysandwich/400/300');
insertMenuItem.run('M12', 'C4', 'Veg Club Sandwich', 104, 0, 'https://picsum.photos/seed/clubsandwich/400/300');
insertMenuItem.run('M13', 'C4', 'Tandoori Paneer Sandwich', 169, 0, 'https://picsum.photos/seed/paneersandwich/400/300');
insertMenuItem.run('M14', 'C4', 'Chocolate Sandwich', 129, 0, 'https://picsum.photos/seed/chocosandwich/400/300');
// Pizza
insertMenuItem.run('M15', 'C5', 'Pizza Margaritta', 90, 0, 'https://picsum.photos/seed/margaritta/400/300');
insertMenuItem.run('M16', 'C5', 'Veg Cheese Pizza', 180, 0, 'https://picsum.photos/seed/vegcheesepizza/400/300');
// Fries & Nuggets
insertMenuItem.run('M17', 'C6', 'Peri Peri Fries', 156, 0, 'https://picsum.photos/seed/perifries/400/300');
insertMenuItem.run('M18', 'C6', 'Cheese Fries', 182, 0, 'https://picsum.photos/seed/cheesefries/400/300');
insertMenuItem.run('M19', 'C6', 'Veg Nuggets', 182, 0, 'https://picsum.photos/seed/vegnuggets/400/300');
insertMenuItem.run('M20', 'C6', 'Corn Cheese Pops', 208, 0, 'https://picsum.photos/seed/cornpops/400/300');
// Beverages
insertMenuItem.run('M21', 'C7', 'KitKat Shake', 189, 0, 'https://picsum.photos/seed/kitkatshake/400/300');
insertMenuItem.run('M22', 'C7', 'Cappuccino', 99, 0, 'https://picsum.photos/seed/cappuccino/400/300');
insertMenuItem.run('M23', 'C7', 'Cold Coffee', 150, 0, 'https://picsum.photos/seed/coldcoffee/400/300');

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  app.get('/api/tables', (req, res) => {
    const tables = db.prepare('SELECT * FROM tables').all();
    res.json(tables);
  });

  app.get('/api/menu', (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    const items = db.prepare('SELECT * FROM menu_items').all();
    res.json({ categories, items });
  });

  app.get('/api/orders', (req, res) => {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    const orderItems = db.prepare('SELECT * FROM order_items').all();
    
    const ordersWithItems = orders.map((order: any) => {
      let createdAt = order.created_at;
      if (!createdAt.includes('T')) createdAt = createdAt.replace(' ', 'T');
      if (!createdAt.endsWith('Z')) createdAt = `${createdAt}Z`;
      
      return {
        ...order,
        created_at: createdAt,
        items: orderItems.filter((item: any) => item.order_id === order.id)
      };
    });
    res.json(ordersWithItems);
  });

  // --- WebSocket Events ---
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join_table', (tableId) => {
      socket.join(`table_${tableId}`);
    });

    socket.on('join_admin', () => {
      socket.join('admin');
    });

    socket.on('place_order', (data) => {
      const { tableId, items, total } = data;
      const orderId = `O${Date.now()}`;
      
      const insertOrder = db.prepare('INSERT INTO orders (id, table_id, total, created_at) VALUES (?, ?, ?, ?)');
      insertOrder.run(orderId, tableId, total, new Date().toISOString());

      const insertOrderItem = db.prepare('INSERT INTO order_items (id, order_id, item_id, quantity, special_instructions) VALUES (?, ?, ?, ?, ?)');
      items.forEach((item: any, index: number) => {
        insertOrderItem.run(`OI${Date.now()}_${index}`, orderId, item.id, item.quantity, item.specialInstructions || null);
      });

      // Update table status to Occupied if it was Available
      db.prepare('UPDATE tables SET status = ? WHERE id = ? AND status = ?').run('Occupied', tableId, 'Available');

      // Broadcast updates
      io.emit('new_order', { orderId, tableId });
      io.emit('tables_updated', db.prepare('SELECT * FROM tables').all());
      io.emit('orders_updated');
      io.to(`table_${tableId}`).emit('order_status_updated', { orderId, status: 'Received' });
    });

    socket.on('update_table_status', ({ tableId, status }) => {
      db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, tableId);
      if (status === 'Available' || status === 'Cleaning') {
        db.prepare("UPDATE orders SET status = 'Archived' WHERE table_id = ? AND status != 'Archived'").run(tableId);
        io.emit('orders_updated');
      }
      io.emit('tables_updated', db.prepare('SELECT * FROM tables').all());
    });

    socket.on('accept_order', (orderId) => {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Preparing', orderId);
      const tableIdObj = db.prepare('SELECT table_id FROM orders WHERE id = ?').get(orderId) as any;
      if (tableIdObj) {
        io.to(`table_${tableIdObj.table_id}`).emit('order_status_updated', { orderId, status: 'Preparing' });
      }
      io.emit('orders_updated');
    });

    socket.on('update_order_item_status', ({ orderItemId, status }) => {
      db.prepare('UPDATE order_items SET status = ? WHERE id = ?').run(status, orderItemId);
      
      // Check if all items in the order are completed
      const orderIdObj = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(orderItemId) as any;
      if (orderIdObj) {
        const orderId = orderIdObj.order_id;
        const allItems = db.prepare('SELECT status FROM order_items WHERE order_id = ?').all(orderId);
        const allCompleted = allItems.every((item: any) => item.status === 'Completed');
        
        if (allCompleted) {
          db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Served', orderId);
          const tableIdObj = db.prepare('SELECT table_id FROM orders WHERE id = ?').get(orderId) as any;
          if (tableIdObj) {
            io.to(`table_${tableIdObj.table_id}`).emit('order_status_updated', { orderId, status: 'Served' });
          }
        }
      }
      
      io.emit('orders_updated');
    });

    socket.on('add_category', ({ name }) => {
      const id = `C${Date.now()}`;
      const maxOrderObj = db.prepare('SELECT MAX(sort_order) as max FROM categories').get() as any;
      const sortOrder = (maxOrderObj?.max || 0) + 1;
      db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)').run(id, name, sortOrder);
      io.emit('menu_updated', {
        categories: db.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
        items: db.prepare('SELECT * FROM menu_items').all()
      });
    });

    socket.on('delete_category', (categoryId) => {
      db.prepare('DELETE FROM order_items WHERE item_id IN (SELECT id FROM menu_items WHERE category_id = ?)').run(categoryId);
      db.prepare('DELETE FROM menu_items WHERE category_id = ?').run(categoryId);
      db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
      io.emit('menu_updated', {
        categories: db.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
        items: db.prepare('SELECT * FROM menu_items').all()
      });
    });

    socket.on('add_menu_item', (item) => {
      const id = `M${Date.now()}`;
      db.prepare('INSERT INTO menu_items (id, category_id, name, price, is_sold_out, image_url) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, item.categoryId, item.name, item.price, 0, item.imageUrl || `https://picsum.photos/seed/${id}/400/300`);
      io.emit('menu_updated', {
        categories: db.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
        items: db.prepare('SELECT * FROM menu_items').all()
      });
    });

    socket.on('delete_menu_item', (itemId) => {
      db.prepare('DELETE FROM order_items WHERE item_id = ?').run(itemId);
      db.prepare('DELETE FROM menu_items WHERE id = ?').run(itemId);
      io.emit('menu_updated', {
        categories: db.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
        items: db.prepare('SELECT * FROM menu_items').all()
      });
    });

    socket.on('toggle_menu_item', ({ itemId, isSoldOut }) => {
      db.prepare('UPDATE menu_items SET is_sold_out = ? WHERE id = ?').run(isSoldOut ? 1 : 0, itemId);
      io.emit('menu_updated', {
        categories: db.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
        items: db.prepare('SELECT * FROM menu_items').all()
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
