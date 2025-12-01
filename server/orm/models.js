const { DataTypes } = require('sequelize');
const { sequelize } = require('./sequelize');

const Tenant = sequelize.define('tenants', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
});

const User = sequelize.define('users', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.STRING(8), unique: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
});

const Product = sequelize.define('products', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  category: { type: DataTypes.STRING },
  stock: { type: DataTypes.INTEGER },
});

const Order = sequelize.define('orders', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  status: { type: DataTypes.STRING },
});

const OrderItem = sequelize.define('order_items', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
});

const Cart = sequelize.define('cart', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
});

// Google Maps scraping job and leads
const GmapsJob = sequelize.define('gmaps_jobs', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  jobId: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  query: { type: DataTypes.STRING(255), allowNull: false },
  city: { type: DataTypes.STRING(128), allowNull: false },
  status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'queued' }, // queued|running|completed|failed|blocked
  total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  processed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  error: { type: DataTypes.TEXT },
});

const GmapsLead = sequelize.define('gmaps_leads', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  jobId: { type: DataTypes.STRING(64), allowNull: false },
  query: { type: DataTypes.STRING(255), allowNull: false },
  city: { type: DataTypes.STRING(128), allowNull: false },
  name: { type: DataTypes.STRING(255) },
  address: { type: DataTypes.STRING(512) },
  phone: { type: DataTypes.STRING(64) },
  website: { type: DataTypes.STRING(512) },
  locationUrl: { type: DataTypes.STRING(1024) },
  lat: { type: DataTypes.DECIMAL(10,6) },
  lng: { type: DataTypes.DECIMAL(10,6) },
});

// Chat Session Model
const ChatSession = sequelize.define('chat_sessions', {
  id: { 
    type: DataTypes.UUID, 
    primaryKey: true, 
    defaultValue: DataTypes.UUIDV4 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  messageCount: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0 
  },
  createdAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  updatedAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
});

// Chat Message Model
const ChatMessage = sequelize.define('chat_messages', {
  id: { 
    type: DataTypes.UUID, 
    primaryKey: true, 
    defaultValue: DataTypes.UUIDV4 
  },
  sessionId: { 
    type: DataTypes.UUID, 
    allowNull: false,
    references: {
      model: ChatSession,
      key: 'id'
    }
  },
  role: { 
    type: DataTypes.ENUM('user', 'assistant'), 
    allowNull: false 
  },
  content: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  timestamp: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  createdAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
});

// Associations minimal
User.belongsTo(Tenant, { foreignKey: 'tenantId' });
Order.belongsTo(User, { foreignKey: 'userId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });
Cart.belongsTo(User, { foreignKey: 'userId' });
Cart.belongsTo(Product, { foreignKey: 'productId' });

// Chat associations
ChatSession.hasMany(ChatMessage, { 
  foreignKey: 'sessionId', 
  as: 'messages' 
});
ChatMessage.belongsTo(ChatSession, { 
  foreignKey: 'sessionId', 
  as: 'session' 
});

module.exports = { 
  sequelize, 
  Tenant, 
  User, 
  Product, 
  Order, 
  OrderItem, 
  Cart, 
  GmapsJob, 
  GmapsLead,
  ChatSession,
  ChatMessage
};


