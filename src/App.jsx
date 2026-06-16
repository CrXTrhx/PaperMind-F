import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Filter,
  Gift,
  Home,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  UserRound,
  Wand2,
  X,
} from "lucide-react";

const catalogSeed = [
  {
    id: 1,
    name: "Cuaderno profesional 100 hojas",
    category: "Escolar",
    brand: "Scribe",
    price: 56,
    stock: 18,
    reorder: 25,
    supplier: "Distribuidora Escolar MX",
    rotation: "Alta",
    demand: 92,
    color: "#f2d55c",
    tags: ["regreso a clases", "universidad"],
  },
  {
    id: 2,
    name: "Boligrafo gel azul paquete 12",
    category: "Oficina",
    brand: "PaperMate",
    price: 84,
    stock: 44,
    reorder: 30,
    supplier: "Office Norte",
    rotation: "Alta",
    demand: 86,
    color: "#4f8bd6",
    tags: ["empresa", "docente"],
  },
  {
    id: 3,
    name: "Set de acuarelas 24 colores",
    category: "Arte",
    brand: "Prismart",
    price: 219,
    stock: 9,
    reorder: 12,
    supplier: "Arte y Pigmento",
    rotation: "Media",
    demand: 61,
    color: "#d95b76",
    tags: ["artista", "regalo"],
  },
  {
    id: 4,
    name: "Hojas blancas carta 500 pzas",
    category: "Oficina",
    brand: "Copamex",
    price: 118,
    stock: 76,
    reorder: 40,
    supplier: "Office Norte",
    rotation: "Alta",
    demand: 95,
    color: "#f7f7f0",
    tags: ["impresion", "empresa"],
  },
  {
    id: 5,
    name: "Marcadores doble punta 36 colores",
    category: "Arte",
    brand: "ColorLab",
    price: 349,
    stock: 5,
    reorder: 10,
    supplier: "Arte y Pigmento",
    rotation: "Media",
    demand: 73,
    color: "#6fc27a",
    tags: ["artista", "premium"],
  },
  {
    id: 6,
    name: "Kit regreso a clases primaria",
    category: "Temporada",
    brand: "PaperMind",
    price: 499,
    stock: 31,
    reorder: 20,
    supplier: "Distribuidora Escolar MX",
    rotation: "Estacional",
    demand: 98,
    color: "#ef8f45",
    tags: ["SEP", "temporada"],
  },
  {
    id: 7,
    name: "Corrector cinta ergonomico",
    category: "Escolar",
    brand: "Bic",
    price: 32,
    stock: 0,
    reorder: 18,
    supplier: "Office Norte",
    rotation: "Alta",
    demand: 77,
    color: "#85c7c3",
    tags: ["agotado", "notificar"],
  },
  {
    id: 8,
    name: "Agenda docente semanal",
    category: "Docente",
    brand: "PaperMind",
    price: 189,
    stock: 16,
    reorder: 10,
    supplier: "Impresos Reforma",
    rotation: "Media",
    demand: 68,
    color: "#b898d6",
    tags: ["docente", "planeacion"],
  },
];

const customers = [
  { name: "Ana Reyes", profile: "Estudiante", purchases: 7, points: 1240, segment: "Frecuente" },
  { name: "Colegio Horizonte", profile: "Empresa", purchases: 14, points: 4820, segment: "Alto valor" },
  { name: "Luis Armenta", profile: "Artista", purchases: 4, points: 680, segment: "Creativo" },
];

const ordersSeed = [
  { id: "PM-1048", customer: "Ana Reyes", status: "Preparando", channel: "Web", total: 674, eta: "Hoy 17:30" },
  { id: "PM-1049", customer: "Colegio Horizonte", status: "Pago confirmado", channel: "Transferencia", total: 4280, eta: "Manana 10:00" },
  { id: "PM-1050", customer: "Luis Armenta", status: "Listo para recoger", channel: "OXXO Pay", total: 568, eta: "Hoy 15:00" },
];

const agentCards = [
  { title: "Inventario", value: "4 alertas", detail: "2 ordenes sugeridas", icon: PackageCheck },
  { title: "Conversacional", value: "97%", detail: "respuestas bajo 3 s", icon: Bot },
  { title: "Prediccion", value: "85%", detail: "precision simulada", icon: BarChart3 },
  { title: "Fidelizacion", value: "2 promos", detail: "limite semanal activo", icon: Gift },
];

const categories = ["Todas", "Escolar", "Oficina", "Arte", "Temporada", "Docente"];
const roles = ["Administrador", "Caja", "Inventario"];

function money(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function App() {
  const [activeView, setActiveView] = useState("tienda");
  const [products, setProducts] = useState(catalogSeed);
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState("carrito");
  const [payment, setPayment] = useState("Tarjeta");
  const [delivery, setDelivery] = useState("Entrega 10 km");
  const [role, setRole] = useState("Administrador");
  const [reportRange, setReportRange] = useState("Diario");
  const [orders, setOrders] = useState(ordersSeed);
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hola, soy el agente de PaperMind. Puedo revisar stock, recomendar productos y ayudarte con pedidos.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory = category === "Todas" || product.category === category;
      const needle = query.trim().toLowerCase();
      const byQuery =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.brand.toLowerCase().includes(needle) ||
        product.tags.some((tag) => tag.toLowerCase().includes(needle));
      return byCategory && byQuery;
    });
  }, [products, category, query]);

  const cartRows = cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean);

  const subtotal = cartRows.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const pointsEarned = Math.floor(subtotal / 10);
  const shipping = subtotal > 799 || subtotal === 0 ? 0 : 59;
  const total = subtotal + shipping;

  const lowStock = products.filter((product) => product.stock <= product.reorder);
  const onlineRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  function addToCart(productId) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock === 0) {
      setMessages((current) => [
        ...current,
        { from: "bot", text: "Ese producto esta agotado. Active una alerta de disponibilidad para el cliente." },
      ]);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === productId);
      if (existing) {
        return current.map((item) =>
          item.id === productId ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item,
        );
      }
      return [...current, { id: productId, quantity: 1 }];
    });
  }

  function changeQuantity(productId, direction) {
    const product = products.find((item) => item.id === productId);
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) return item;
          const nextQuantity = item.quantity + direction;
          return { ...item, quantity: Math.max(0, Math.min(nextQuantity, product?.stock ?? 0)) };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function completeCheckout() {
    if (!cartRows.length) return;
    const newOrder = {
      id: `PM-${1051 + orders.length}`,
      customer: "Cuenta verificada",
      status: "Pago confirmado",
      channel: payment,
      total,
      eta: delivery === "Recoleccion" ? "Hoy 18:00" : "Manana 12:00",
    };
    setProducts((current) =>
      current.map((product) => {
        const cartItem = cart.find((item) => item.id === product.id);
        return cartItem ? { ...product, stock: Math.max(0, product.stock - cartItem.quantity) } : product;
      }),
    );
    setOrders((current) => [newOrder, ...current]);
    setCart([]);
    setCheckoutStep("confirmacion");
  }

  function generateRestock(productId) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, stock: product.stock + product.reorder * 2 } : product,
      ),
    );
  }

  function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    let response =
      "Puedo ayudarte con catalogo, disponibilidad, recomendaciones, estado de pedido o devoluciones. Si sale de mi dominio, lo escalo a una persona.";
    if (lower.includes("stock") || lower.includes("dispon")) {
      response = `${lowStock.length} productos requieren atencion. ${lowStock[0]?.name ?? "El catalogo"} esta cerca del punto de reorden.`;
    }
    if (lower.includes("recom") || lower.includes("arte")) {
      response = "Para perfil artista recomiendo marcadores doble punta y acuarelas; ambos activan una promocion personalizada esta semana.";
    }
    if (lower.includes("pedido") || lower.includes("pm-")) {
      response = "El pedido PM-1048 esta en preparacion y puede entregarse hoy a las 17:30 dentro del radio de 10 km.";
    }
    if (lower.includes("precio") || lower.includes("descuento")) {
      response = "Los descuentos por volumen aplican a docentes o empresas verificadas desde 10 unidades, segun las reglas de negocio.";
    }
    setMessages((current) => [...current, { from: "user", text }, { from: "bot", text: response }]);
    setChatInput("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegacion principal">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={22} />
          </div>
          <div>
            <strong>PaperMind</strong>
            <span>Papeleria inteligente</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavButton icon={Store} label="Tienda" active={activeView === "tienda"} onClick={() => setActiveView("tienda")} />
          <NavButton icon={ShoppingBag} label="Carrito" active={activeView === "carrito"} onClick={() => setActiveView("carrito")} badge={cartRows.length} />
          <NavButton icon={LayoutDashboard} label="Admin" active={activeView === "admin"} onClick={() => setActiveView("admin")} />
          <NavButton icon={MessageCircle} label="Agente IA" active={activeView === "chat"} onClick={() => setActiveView("chat")} />
          <NavButton icon={UserRound} label="Clientes" active={activeView === "clientes"} onClick={() => setActiveView("clientes")} />
        </nav>

        <div className="sidebar-panel">
          <span className="eyebrow">Sesion simulada</span>
          <strong>Cuenta verificada</strong>
          <small>Perfil estudiante · 1,240 puntos</small>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <button className="icon-button mobile-menu" title="Menu">
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">Ecosistema digital hibrido</p>
            <h1>{viewTitle(activeView)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" title="Notificaciones">
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <button className="ghost-button" onClick={() => setActiveView("admin")}>
              <Wand2 size={17} />
              Agentes activos
            </button>
          </div>
        </header>

        {activeView === "tienda" && (
          <Storefront
            products={filteredProducts}
            category={category}
            setCategory={setCategory}
            query={query}
            setQuery={setQuery}
            addToCart={addToCart}
          />
        )}

        {activeView === "carrito" && (
          <CartView
            cartRows={cartRows}
            subtotal={subtotal}
            shipping={shipping}
            total={total}
            pointsEarned={pointsEarned}
            payment={payment}
            setPayment={setPayment}
            delivery={delivery}
            setDelivery={setDelivery}
            checkoutStep={checkoutStep}
            setCheckoutStep={setCheckoutStep}
            changeQuantity={changeQuantity}
            completeCheckout={completeCheckout}
          />
        )}

        {activeView === "admin" && (
          <AdminView
            products={products}
            lowStock={lowStock}
            orders={orders}
            role={role}
            setRole={setRole}
            reportRange={reportRange}
            setReportRange={setReportRange}
            onlineRevenue={onlineRevenue}
            generateRestock={generateRestock}
          />
        )}

        {activeView === "chat" && (
          <ChatView messages={messages} chatInput={chatInput} setChatInput={setChatInput} sendChat={sendChat} />
        )}

        {activeView === "clientes" && <CustomersView />}
      </main>
    </div>
  );
}

function viewTitle(view) {
  return {
    tienda: "Tienda en linea",
    carrito: "Flujo de compra",
    admin: "Panel administrativo",
    chat: "Agente conversacional",
    clientes: "Fidelizacion",
  }[view];
}

function NavButton({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={19} />
      <span>{label}</span>
      {badge > 0 && <b>{badge}</b>}
    </button>
  );
}

function Storefront({ products, category, setCategory, query, setQuery, addToCart }) {
  return (
    <section className="view-grid store-grid">
      <div className="catalog-section">
        <div className="toolbar">
          <div className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por producto, marca o etiqueta" />
          </div>
          <div className="chip-row" role="list" aria-label="Categorias">
            {categories.map((item) => (
              <button key={item} className={`chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-visual" style={{ background: product.color }}>
                <span>{product.category}</span>
              </div>
              <div className="product-copy">
                <div>
                  <p className="muted">{product.brand}</p>
                  <h2>{product.name}</h2>
                </div>
                <div className="product-meta">
                  <strong>{money(product.price)}</strong>
                  <span className={product.stock === 0 ? "danger-text" : product.stock <= product.reorder ? "warn-text" : ""}>
                    {product.stock === 0 ? "Agotado" : `${product.stock} disponibles`}
                  </span>
                </div>
                <div className="tag-row">
                  {product.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <button className="primary-button" onClick={() => addToCart(product.id)} disabled={product.stock === 0}>
                  <ShoppingBag size={18} />
                  {product.stock === 0 ? "Notificarme" : "Agregar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="insight-panel">
        <div className="panel-header">
          <Bot size={22} />
          <div>
            <p className="eyebrow">Recomendacion IA</p>
            <h2>Alta demanda escolar</h2>
          </div>
        </div>
        <p>
          El calendario escolar y la rotacion de 90 dias sugieren preparar kits, cuadernos y hojas carta para los proximos 30 dias.
        </p>
        <div className="metric-stack">
          <Metric label="Precision demanda" value="85%" />
          <Metric label="Flujo de compra" value="5 pasos" />
          <Metric label="Sincronizacion POS" value="5 s" />
        </div>
      </aside>
    </section>
  );
}

function CartView({
  cartRows,
  subtotal,
  shipping,
  total,
  pointsEarned,
  payment,
  setPayment,
  delivery,
  setDelivery,
  checkoutStep,
  setCheckoutStep,
  changeQuantity,
  completeCheckout,
}) {
  const steps = ["carrito", "pago", "confirmacion"];
  return (
    <section className="checkout-layout">
      <div className="stepper">
        {steps.map((step, index) => (
          <button key={step} className={checkoutStep === step ? "active" : ""} onClick={() => setCheckoutStep(step)}>
            <span>{index + 1}</span>
            {step}
          </button>
        ))}
      </div>

      {checkoutStep === "confirmacion" ? (
        <div className="empty-state success-state">
          <Check size={42} />
          <h2>Pedido confirmado</h2>
          <p>Se envio confirmacion por correo y WhatsApp. El historial queda vinculado al perfil verificado.</p>
          <button className="primary-button" onClick={() => setCheckoutStep("carrito")}>
            <Home size={18} />
            Nuevo pedido
          </button>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-list">
            {cartRows.length === 0 && (
              <div className="empty-state">
                <ShoppingBag size={38} />
                <h2>Tu carrito esta vacio</h2>
                <p>Agrega productos desde la tienda para simular una compra.</p>
              </div>
            )}
            {cartRows.map((item) => (
              <article className="cart-row" key={item.id}>
                <div className="mini-swatch" style={{ background: item.color }} />
                <div>
                  <strong>{item.name}</strong>
                  <span>{money(item.price)} · {item.brand}</span>
                </div>
                <div className="quantity-control">
                  <button className="icon-button" onClick={() => changeQuantity(item.id, -1)} title="Quitar">
                    <Minus size={16} />
                  </button>
                  <b>{item.quantity}</b>
                  <button className="icon-button" onClick={() => changeQuantity(item.id, 1)} title="Agregar">
                    <Plus size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="summary-panel">
            {checkoutStep === "pago" && (
              <>
                <ControlGroup label="Metodo de pago" value={payment} setValue={setPayment} options={["Tarjeta", "Transferencia", "OXXO Pay"]} />
                <ControlGroup label="Entrega" value={delivery} setValue={setDelivery} options={["Entrega 10 km", "Recoleccion"]} />
              </>
            )}
            <Metric label="Subtotal" value={money(subtotal)} />
            <Metric label="Envio" value={shipping ? money(shipping) : "Gratis"} />
            <Metric label="Puntos por acreditar" value={`${pointsEarned} pts`} />
            <div className="total-row">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            {checkoutStep === "carrito" ? (
              <button className="primary-button" disabled={!cartRows.length} onClick={() => setCheckoutStep("pago")}>
                <CreditCard size={18} />
                Continuar a pago
              </button>
            ) : (
              <button className="primary-button" disabled={!cartRows.length} onClick={completeCheckout}>
                <ReceiptText size={18} />
                Confirmar pedido
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function AdminView({ products, lowStock, orders, role, setRole, reportRange, setReportRange, onlineRevenue, generateRestock }) {
  const canAdminAgents = role === "Administrador";
  return (
    <section className="admin-view">
      <div className="admin-controls">
        <ControlGroup label="Rol activo" value={role} setValue={setRole} options={roles} />
        <ControlGroup label="Reporte" value={reportRange} setValue={setReportRange} options={["Diario", "Semanal", "Mensual"]} />
        <button className="ghost-button">
          <Download size={17} />
          Exportar {reportRange}
        </button>
      </div>

      <div className="kpi-grid">
        <Kpi icon={ShoppingBag} label="Ventas digitales" value={money(onlineRevenue)} trend="+34%" />
        <Kpi icon={Truck} label="Pedidos activos" value={orders.length} trend="3 canales" />
        <Kpi icon={AlertTriangle} label="Alertas stock" value={lowStock.length} trend="reorden dinamico" />
        <Kpi icon={Star} label="Clientes frecuentes" value="42" trend="+12 nuevos" />
      </div>

      <div className="admin-columns">
        <section className="work-panel">
          <div className="section-heading">
            <h2>Inventario inteligente</h2>
            <span>{lowStock.length} productos en punto de reorden</span>
          </div>
          <div className="table-list">
            {lowStock.map((product) => (
              <article className="inventory-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.supplier} · stock {product.stock}/{product.reorder}</span>
                </div>
                <div className="demand-bar" aria-label={`Demanda ${product.demand}%`}>
                  <i style={{ width: `${product.demand}%` }} />
                </div>
                <button className="small-button" onClick={() => generateRestock(product.id)}>
                  <PackageCheck size={16} />
                  Reponer
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="work-panel">
          <div className="section-heading">
            <h2>Plugins IA</h2>
            <span>{canAdminAgents ? "configuracion editable" : "solo lectura por rol"}</span>
          </div>
          <div className="agent-grid">
            {agentCards.map(({ title, value, detail, icon: Icon }) => (
              <article className="agent-card" key={title}>
                <Icon size={22} />
                <strong>{title}</strong>
                <b>{value}</b>
                <span>{detail}</span>
                <button className="small-button" disabled={!canAdminAgents}>
                  Ajustar
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="work-panel">
        <div className="section-heading">
          <h2>Pedidos recientes</h2>
          <span>confirmacion automatica por correo y WhatsApp</span>
        </div>
        <div className="orders-grid">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div>
                <strong>{order.id}</strong>
                <span>{order.customer}</span>
              </div>
              <b>{money(order.total)}</b>
              <span>{order.status}</span>
              <small>{order.channel} · {order.eta}</small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function ChatView({ messages, chatInput, setChatInput, sendChat }) {
  return (
    <section className="chat-layout">
      <div className="chat-window">
        <div className="chat-stream">
          {messages.map((message, index) => (
            <div className={`bubble ${message.from}`} key={`${message.from}-${index}`}>
              {message.text}
            </div>
          ))}
        </div>
        <div className="chat-composer">
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && sendChat()}
            placeholder="Pregunta por stock, pedido, precio o recomendacion"
          />
          <button className="primary-button icon-only" onClick={sendChat} title="Enviar">
            <Send size={18} />
          </button>
        </div>
      </div>
      <aside className="insight-panel">
        <div className="panel-header">
          <ClipboardList size={22} />
          <div>
            <p className="eyebrow">Dominio del agente</p>
            <h2>Atencion 24/7</h2>
          </div>
        </div>
        <ul className="feature-list">
          <li><Check size={17} /> Disponibilidad y precios en tiempo real</li>
          <li><Check size={17} /> Estado de pedidos y devoluciones</li>
          <li><Check size={17} /> Escalamiento humano con contexto</li>
          <li><Check size={17} /> Notificaciones de productos agotados</li>
        </ul>
      </aside>
    </section>
  );
}

function CustomersView() {
  return (
    <section className="customers-view">
      <div className="loyalty-banner">
        <div>
          <p className="eyebrow">Sistema de fidelizacion inteligente</p>
          <h2>1 punto por cada $10 MXN de compra</h2>
          <p>Segmentacion automatica por estudiante, empresa, docente o artista, con maximo dos comunicaciones semanales.</p>
        </div>
        <Gift size={54} />
      </div>

      <div className="customer-grid">
        {customers.map((customer) => (
          <article className="customer-card" key={customer.name}>
            <div className="avatar">{customer.name.charAt(0)}</div>
            <div>
              <strong>{customer.name}</strong>
              <span>{customer.profile} · {customer.segment}</span>
            </div>
            <Metric label="Compras 3 meses" value={customer.purchases} />
            <Metric label="Puntos" value={customer.points.toLocaleString("es-MX")} />
            <button className="small-button">
              <Send size={16} />
              Enviar promo
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Kpi({ icon: Icon, label, value, trend }) {
  return (
    <article className="kpi-card">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ControlGroup({ label, value, setValue, options }) {
  return (
    <label className="control-group">
      <span>{label}</span>
      <select value={value} onChange={(event) => setValue(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default App;
