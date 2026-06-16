import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Check,
  ClipboardList,
  CreditCard,
  Download,
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
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  UserRound,
  Wand2,
} from "lucide-react";
import {
  API_BASE_URL,
  apiFetch,
  defaultAuth,
  extractCartItems,
  friendlyError,
  isUuid,
  normalizeProduct,
} from "./api.js";

const catalogSeed = [
  {
    id: "local-1",
    name: "Cuaderno profesional 100 hojas",
    description: "Producto local de respaldo",
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
    id: "local-2",
    name: "Boligrafo gel azul paquete 12",
    description: "Producto local de respaldo",
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
    id: "local-3",
    name: "Set de acuarelas 24 colores",
    description: "Producto local de respaldo",
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
    id: "local-4",
    name: "Paquete hojas blancas carta",
    description: "Producto local de respaldo",
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

const roles = ["Administrador", "Caja", "Inventario"];
const paymentMap = { Tarjeta: "tarjeta", Transferencia: "transferencia", "OXXO Pay": "oxxo", Efectivo: "efectivo" };
const deliveryMap = { "Entrega 10 km": "domicilio", Recoleccion: "recoleccion", Mostrador: "mostrador" };

function money(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function toOrder(row) {
  return {
    id: row.id || row.pedido_id || "pedido",
    customer: row.cliente_nombre || row.cliente_id || "Cliente",
    status: row.estado || row.status || "Registrado",
    channel: row.metodo_pago || row.channel || "Web",
    total: Number(row.total || row.total_pedido || row.importe_total || 0),
    eta: row.fecha_creacion || row.created_at || "Backend",
  };
}

function normalizeAgentProduct(product) {
  const price = Number(product.precio_venta || product.price || 0);
  const stock = Number(product.stock_actual || product.stock || 0);
  return {
    id: product.id,
    name: product.nombre || product.name,
    description: product.descripcion || product.description || "Sugerido por el agente",
    category: product.categoria || product.category || "Sugerencia",
    price,
    stock,
    status: product.estado || "activo",
  };
}

function formatAgentAnswer(data) {
  const raw = data.respuesta || "Encontré estas opciones para ti.";
  const hasProducts = (data.productos_sugeridos || []).length > 0;
  if (!hasProducts) return raw;

  const compact = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("-"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (compact.length < 40) return "Encontré estas opciones en inventario. Te dejo las cards para comparar precio y disponibilidad.";
  return compact;
}

function App() {
  const [activeView, setActiveView] = useState("tienda");
  const [products, setProducts] = useState(catalogSeed);
  const [backendProducts, setBackendProducts] = useState([]);
  const [categories, setCategories] = useState(["Todas", "Escolar", "Oficina", "Arte"]);
  const [providers, setProviders] = useState([]);
  const [category, setCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [checkoutStep, setCheckoutStep] = useState("carrito");
  const [isPaying, setIsPaying] = useState(false);
  const [payment, setPayment] = useState("Tarjeta");
  const [delivery, setDelivery] = useState("Entrega 10 km");
  const [role, setRole] = useState("Administrador");
  const [reportRange, setReportRange] = useState("Diario");
  const [orders, setOrders] = useState(ordersSeed);
  const [health, setHealth] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [report, setReport] = useState(null);
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("papermind-auth");
    return saved ? { ...defaultAuth, ...JSON.parse(saved) } : defaultAuth;
  });
  const [apiStatus, setApiStatus] = useState("Conectando con Render...");
  const [busyAction, setBusyAction] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hola, soy el agente de PaperMind. Puedo revisar stock, recomendar productos y ayudarte con pedidos.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [customerTools, setCustomerTools] = useState({
    points: null,
    pedidoId: "",
    detallePedidoId: "",
    motivoId: "",
    sustitutoId: "",
  });

  useEffect(() => {
    localStorage.setItem("papermind-auth", JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    loadBackend();
  }, []);

  async function loadBackend() {
    try {
      setApiStatus("Consultando backend...");
      const [healthData, categoryData, productData, dashboardData, providerData, reportData] = await Promise.all([
        apiFetch("/health"),
        apiFetch("/api/categorias"),
        apiFetch("/api/productos"),
        apiFetch("/api/dashboard", { role: "administrador", auth }),
        apiFetch("/api/proveedores", { role: "administrador", auth }),
        apiFetch("/api/reportes/ventas", { role: "administrador", auth }),
      ]);
      const normalized = productData.map((product) => normalizeProduct(product, categoryData));
      setHealth(healthData);
      setBackendProducts(productData);
      setProducts(normalized);
      setCategories(["Todas", ...categoryData.map((item) => item.nombre)]);
      setDashboard(dashboardData);
      setProviders(providerData);
      setReport(reportData);
      setApiStatus(`Conectado a ${API_BASE_URL}`);
    } catch (error) {
      setApiStatus(`Modo respaldo: ${friendlyError(error.message)}`);
      setProducts(catalogSeed);
    }
  }

  async function loadProtectedData() {
    try {
      setBusyAction("Cargando datos protegidos");
      const requests = [];
      if (isUuid(auth.clienteId)) {
        requests.push(apiFetch("/api/carrito", { role: "cliente", auth }).then((data) => ({ key: "cart", data })));
        requests.push(apiFetch("/api/pedidos", { role: "cliente", auth }).then((data) => ({ key: "orders", data })));
        requests.push(
          apiFetch(`/api/clientes/${auth.clienteId}/puntos`, { role: "cliente", auth }).then((data) => ({ key: "points", data })),
        );
      }
      const result = await Promise.all(requests);
      result.forEach(({ key, data }) => {
        if (key === "orders") setOrders((Array.isArray(data) ? data : data?.pedidos || []).map(toOrder));
        if (key === "points") setCustomerTools((current) => ({ ...current, points: data }));
        if (key === "cart") {
          const items = extractCartItems(data);
          if (items.length) {
            setCart(
              items.map((item) => ({
                id: item.producto_id || item.id || item.product_id,
                quantity: Number(item.cantidad || item.quantity || 1),
              })),
            );
          }
        }
      });
      setApiStatus(result.length ? "Datos protegidos cargados" : "Agrega un UUID de cliente para cargar carrito, pedidos y puntos");
    } catch (error) {
      setApiStatus(`No se pudieron cargar datos protegidos: ${friendlyError(error.message)}`);
    } finally {
      setBusyAction("");
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory = category === "Todas" || product.category === category;
      const needle = query.trim().toLowerCase();
      const byQuery =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.brand.toLowerCase().includes(needle) ||
        product.description.toLowerCase().includes(needle) ||
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
  const onlineRevenue =
    Number(report?.ventas_totales || 0) || orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  async function addToCart(productId) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock === 0) {
      await subscribeAvailability(productId);
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

    if (!isUuid(auth.clienteId) || productId.startsWith("local-")) {
      setApiStatus("Producto agregado localmente. Agrega un UUID de cliente real para persistir en backend.");
      return;
    }

    try {
      await apiFetch("/api/carrito/items", {
        method: "POST",
        role: "cliente",
        auth,
        body: { producto_id: productId, cantidad: 1 },
      });
      setApiStatus("Producto agregado al carrito del backend");
    } catch (error) {
      setApiStatus(`Carrito local activo: ${friendlyError(error.message)}`);
    }
  }

  async function subscribeAvailability(productId) {
    if (!isUuid(auth.clienteId) || !productId || String(productId).startsWith("local-")) {
      setMessages((current) => [
        ...current,
        { from: "bot", text: "Ese producto esta agotado. Con un UUID de cliente puedo registrar la alerta en backend." },
      ]);
      return;
    }
    try {
      await apiFetch(`/api/productos/${productId}/suscripciones-disponibilidad`, {
        method: "POST",
        role: "cliente",
        auth,
      });
      setApiStatus("Suscripcion de disponibilidad registrada");
    } catch (error) {
      setApiStatus(`No se pudo registrar disponibilidad: ${friendlyError(error.message)}`);
    }
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

  async function completeCheckout() {
    if (!cartRows.length || isPaying) return;
    setIsPaying(true);
    setApiStatus("Procesando pedido...");
    await new Promise((resolve) => setTimeout(resolve, 850));
    let backendOrderCreated = false;
    const body = {
      metodo_pago: paymentMap[payment],
      modalidad_entrega: deliveryMap[delivery],
      direccion_entrega: delivery === "Entrega 10 km" ? "Av. Instituto Politecnico Nacional 123, CDMX" : null,
      puntos_utilizados: 0,
      email_confirmacion: auth.email || null,
    };

    if (isUuid(auth.clienteId)) {
      try {
        const created = await apiFetch("/api/pedidos/desde-carrito", {
          method: "POST",
          role: "cliente",
          auth,
          body,
        });
        setOrders((current) => [toOrder(created), ...current]);
        setApiStatus("Pedido creado desde carrito en backend");
        backendOrderCreated = true;
      } catch (error) {
        setApiStatus(`Pedido local creado; backend aviso: ${friendlyError(error.message)}`);
      }
    } else {
      setApiStatus("Pedido local creado. Agrega un UUID de cliente para guardarlo en tu cuenta.");
    }

    const newOrder = backendOrderCreated
      ? null
      : {
          id: `PM-${1051 + orders.length}`,
          customer: isUuid(auth.clienteId) ? auth.clienteId : "Cuenta simulada",
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
    if (newOrder) setOrders((current) => [newOrder, ...current]);
    setCart([]);
    setCheckoutStep("confirmacion");
    setIsPaying(false);
  }

  async function generateRestock(productId) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, stock: product.stock + product.reorder * 2 } : product,
      ),
    );
    await runBackendAction("inventario");
  }

  async function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((current) => [...current, { from: "user", text }]);
    setChatInput("");

    try {
      const data = await apiFetch("/api/agentes/conversacional/mensaje", {
        method: "POST",
        body: { cliente_id: isUuid(auth.clienteId) ? auth.clienteId : null, mensaje: text },
      });
      setMessages((current) => [
        ...current,
        {
          from: "bot",
          text: `${formatAgentAnswer(data)}${data.escalado ? " La consulta fue escalada a un agente humano." : ""}`,
          intent: data.intencion,
          sentiment: data.sentimiento,
          actions: data.acciones_sugeridas || [],
          mentioned: data.productos_mencionados || [],
          products: (data.productos_sugeridos || []).map(normalizeAgentProduct),
        },
      ]);
      setApiStatus("Agente conversacional respondio desde backend");
      return;
    } catch (error) {
      setApiStatus(`Chat en modo respaldo: ${friendlyError(error.message)}`);
    }

    const lower = text.toLowerCase();
    let response =
      "Puedo ayudarte con catalogo, disponibilidad, recomendaciones, estado de pedido o devoluciones. Si sale de mi dominio, lo escalo a una persona.";
    if (lower.includes("stock") || lower.includes("dispon")) {
      response = `${lowStock.length} productos requieren atencion. ${lowStock[0]?.name ?? "El catalogo"} esta cerca del punto de reorden.`;
    }
    if (lower.includes("recom") || lower.includes("arte")) {
      response = "Para perfil artista recomiendo marcadores, acuarelas y productos de arte con promocion personalizada.";
    }
    if (lower.includes("pedido") || lower.includes("pm-")) {
      response = "Puedo consultar pedidos reales si configuras un UUID de cliente existente.";
    }
    if (lower.includes("precio") || lower.includes("descuento")) {
      response = "Los descuentos por volumen aplican a docentes o empresas verificadas desde 10 unidades.";
    }
    setMessages((current) => [
      ...current,
      {
        from: "bot",
        text: response,
        products: lowStock.slice(0, 3).map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          stock: product.stock,
          status: product.stock > 0 ? "activo" : "agotado",
        })),
      },
    ]);
  }

  async function runBackendAction(action) {
    const roleForStaff = role === "Caja" ? "cajero" : "administrador";
    try {
      setBusyAction(action);
      if (action === "inventario") {
        await apiFetch("/api/agentes/inventario/ejecutar", { method: "POST", role: roleForStaff, auth });
        setApiStatus("Agente de inventario ejecutado");
      }
      if (action === "prediccion") {
        await apiFetch("/api/agentes/prediccion/ejecutar", { method: "POST", role: roleForStaff, auth });
        setApiStatus("Agente de prediccion ejecutado");
      }
      if (action === "configuracion") {
        await apiFetch("/api/agentes/configuracion", {
          method: "PUT",
          role: "administrador",
          auth,
          body: { agente: "inventario", parametro: "factor_seguridad_default", valor: "0.20" },
        });
        setApiStatus("Parametro de agente actualizado");
      }
      if (action === "pos") {
        if (!cartRows.length) throw new Error("Agrega productos al carrito para registrar una venta POS");
        await apiFetch("/api/pos/ventas", {
          method: "POST",
          role: roleForStaff,
          auth,
          body: {
            usuario_sistema_id: role === "Caja" ? auth.cajeroId : auth.adminId,
            cliente_id: isUuid(auth.clienteId) ? auth.clienteId : null,
            metodo_pago: "efectivo",
            email_confirmacion: auth.email || null,
            items: cartRows.map((item) => ({ producto_id: item.id, cantidad: item.quantity })),
          },
        });
        setApiStatus("Venta fisica registrada en backend");
      }
      if (action === "mail") {
        await apiFetch("/api/mail/test", {
          method: "POST",
          role: "administrador",
          auth,
          body: { email: auth.email },
        });
        setApiStatus("Correo de prueba enviado");
      }
      await loadBackend();
    } catch (error) {
      setApiStatus(`${action}: ${friendlyError(error.message)}`);
    } finally {
      setBusyAction("");
    }
  }

  async function customerAction(action) {
    try {
      setBusyAction(action);
      if (action === "puntos") {
        if (!isUuid(auth.clienteId)) throw new Error("Configura un UUID de cliente real");
        const points = await apiFetch(`/api/clientes/${auth.clienteId}/puntos`, { role: "cliente", auth });
        setCustomerTools((current) => ({ ...current, points }));
        setApiStatus("Puntos cargados desde backend");
      }
      if (action === "promo") {
        if (!isUuid(auth.clienteId)) throw new Error("Configura un UUID de cliente real");
        await apiFetch("/api/agentes/fidelizacion/promocion", {
          method: "POST",
          role: "administrador",
          auth,
          body: { cliente_id: auth.clienteId, email: auth.email },
        });
        setApiStatus("Promocion personalizada generada");
      }
      if (action === "devolucion") {
        const { pedidoId, detallePedidoId, motivoId, sustitutoId } = customerTools;
        if (!pedidoId || !detallePedidoId || !motivoId || !isUuid(auth.clienteId)) {
          throw new Error("Completa UUID de cliente, pedido, detalle y motivo");
        }
        await apiFetch("/api/devoluciones", {
          method: "POST",
          role: "cliente",
          auth,
          body: {
            pedido_id: pedidoId,
            detalle_pedido_id: detallePedidoId,
            cliente_id: auth.clienteId,
            motivo_id: motivoId,
            tipo: sustitutoId ? "cambio" : "reembolso",
            producto_sustituto_id: sustitutoId || null,
            procesado_por: isUuid(auth.cajeroId) ? auth.cajeroId : null,
            email_confirmacion: auth.email || null,
          },
        });
        setApiStatus("Devolucion enviada al backend");
      }
    } catch (error) {
      setApiStatus(`${action}: ${friendlyError(error.message)}`);
    } finally {
      setBusyAction("");
    }
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
          <span className="eyebrow">Backend</span>
          <strong>{health?.estado === "ok" ? "Render conectado" : "Modo respaldo"}</strong>
          <small>{products.length} productos cargados</small>
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
              Backend
            </button>
          </div>
        </header>

        <div className={`api-status ${apiStatus.includes("Conectado") || apiStatus.includes("respondio") ? "ok" : apiStatus.includes("error") || apiStatus.includes("No se") || apiStatus.includes("Modo respaldo") ? "warn" : ""}`}>
          <span>{apiStatus}</span>
          <button className="small-button" onClick={loadBackend} disabled={Boolean(busyAction)}>
            Recargar
          </button>
        </div>

        {activeView === "tienda" && (
          <Storefront
            products={filteredProducts}
            categories={categories}
            category={category}
            setCategory={setCategory}
            query={query}
            setQuery={setQuery}
            addToCart={addToCart}
            backendCount={backendProducts.length}
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
            auth={auth}
            isPaying={isPaying}
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
            dashboard={dashboard}
            report={report}
            providers={providers}
            health={health}
            auth={auth}
            setAuth={setAuth}
            loadProtectedData={loadProtectedData}
            runBackendAction={runBackendAction}
            busyAction={busyAction}
          />
        )}

        {activeView === "chat" && (
          <ChatView messages={messages} chatInput={chatInput} setChatInput={setChatInput} sendChat={sendChat} addToCart={addToCart} />
        )}

        {activeView === "clientes" && (
          <CustomersView
            auth={auth}
            setAuth={setAuth}
            customerTools={customerTools}
            setCustomerTools={setCustomerTools}
            customerAction={customerAction}
            busyAction={busyAction}
          />
        )}
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

function Storefront({ products, categories, category, setCategory, query, setQuery, addToCart, backendCount }) {
  const lowCount = products.filter((product) => product.stock <= product.reorder).length;
  return (
    <section className="view-grid store-grid">
      <div className="catalog-section">
        <div className="store-hero">
          <div>
            <p className="eyebrow">Catalogo vivo</p>
            <h2>Compra asistida para escuela, oficina y arte</h2>
            <p>Inventario actualizado, carrito listo y recomendaciones del agente cuando las necesitas.</p>
          </div>
          <div className="hero-metrics">
            <Metric label="Productos" value={backendCount || products.length} />
            <Metric label="Alertas" value={lowCount} />
          </div>
        </div>
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
            <p className="eyebrow">Asistente de compra</p>
            <h2>{backendCount || products.length} productos sincronizados</h2>
          </div>
        </div>
        <p>
          Encuentra productos por categoria, revisa disponibilidad y deja el carrito preparado para sincronizarse con tu cuenta.
        </p>
        <div className="metric-stack">
          <Metric label="Conexion" value={API_BASE_URL.includes("render") ? "Render" : "Local"} />
          <Metric label="Compra" value="En linea" />
          <Metric label="POS" value="Disponible" />
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
  auth,
  isPaying,
}) {
  const steps = ["carrito", "pago", "confirmacion"];
  const currentIndex = steps.indexOf(checkoutStep);
  function canOpenStep(step) {
    if (step === "carrito") return !isPaying;
    if (step === "pago") return cartRows.length > 0 && !isPaying;
    return checkoutStep === "confirmacion";
  }
  function openStep(step) {
    if (canOpenStep(step)) setCheckoutStep(step);
  }
  return (
    <section className="checkout-layout">
      <div className="stepper">
        {steps.map((step, index) => {
          const isActive = checkoutStep === step;
          const isDone = index < currentIndex;
          const locked = !canOpenStep(step);
          return (
            <button
              key={step}
              className={`${isActive ? "active" : ""} ${isDone ? "done" : ""} ${locked ? "locked" : ""}`}
              onClick={() => openStep(step)}
              disabled={locked}
            >
              <span>{isDone ? <Check size={14} /> : index + 1}</span>
              {step}
            </button>
          );
        })}
      </div>

      {checkoutStep === "confirmacion" ? (
        <div className="empty-state success-state">
          <Check size={42} />
          <h2>Pedido confirmado</h2>
          <p>El pedido quedo confirmado. Si la cuenta tiene UUID valido, tambien se guarda en el backend.</p>
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
                <p>Agrega productos desde la tienda. Con una cuenta valida se sincroniza automaticamente.</p>
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
                <ControlGroup label="Metodo de pago" value={payment} setValue={setPayment} options={["Tarjeta", "Transferencia", "OXXO Pay", "Efectivo"]} />
                <ControlGroup label="Entrega" value={delivery} setValue={setDelivery} options={["Entrega 10 km", "Recoleccion", "Mostrador"]} />
                <div className={`payment-progress ${isPaying ? "running" : ""}`}>
                  <span>Validar carrito</span>
                  <span>Procesar pago</span>
                  <span>Confirmar pedido</span>
                </div>
              </>
            )}
            <Metric label="Cliente backend" value={isUuid(auth.clienteId) ? "Configurado" : "Pendiente"} />
            <Metric label="Subtotal" value={money(subtotal)} />
            <Metric label="Envio" value={shipping ? money(shipping) : "Gratis"} />
            <Metric label="Puntos por acreditar" value={`${pointsEarned} pts`} />
            <div className="total-row">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            {checkoutStep === "carrito" ? (
              <button className="primary-button" disabled={!cartRows.length} onClick={() => openStep("pago")}>
                <CreditCard size={18} />
                Continuar a pago
              </button>
            ) : (
              <button className="primary-button" disabled={!cartRows.length || isPaying} onClick={completeCheckout}>
                {isPaying ? <span className="button-spinner" /> : <ReceiptText size={18} />}
                {isPaying ? "Procesando..." : "Confirmar pedido"}
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function AdminView({
  lowStock,
  orders,
  role,
  setRole,
  reportRange,
  setReportRange,
  onlineRevenue,
  generateRestock,
  dashboard,
  report,
  providers,
  health,
  auth,
  setAuth,
  loadProtectedData,
  runBackendAction,
  busyAction,
}) {
  const canAdminAgents = role === "Administrador";
  const agentCards = [
    { title: "Inventario", value: dashboard?.productos_alerta_stock ?? lowStock.length, detail: "Detecta reorden y prepara reposicion", icon: PackageCheck, action: "inventario" },
    { title: "Conversacional", value: health?.openrouter_configurado ? "ON" : "OFF", detail: "Atiende busquedas y dudas de clientes", icon: Bot, action: null },
    { title: "Prediccion", value: health?.openrouter_configurado ? "ON" : "OFF", detail: "Proyecta demanda por temporada", icon: BarChart3, action: "prediccion" },
    { title: "Fidelizacion", value: health?.correo_configurado ? "Mail" : "Local", detail: "Genera promociones personalizadas", icon: Gift, action: null },
  ];

  return (
    <section className="admin-view">
      <BackendSettings auth={auth} setAuth={setAuth} loadProtectedData={loadProtectedData} />

      <div className="admin-controls">
        <ControlGroup label="Rol activo" value={role} setValue={setRole} options={roles} />
        <ControlGroup label="Reporte" value={reportRange} setValue={setReportRange} options={["Diario", "Semanal", "Mensual"]} />
        <button className="ghost-button" onClick={() => runBackendAction("mail")} disabled={Boolean(busyAction)}>
          <Download size={17} />
          Probar correo
        </button>
        <button className="ghost-button" onClick={() => runBackendAction("pos")} disabled={Boolean(busyAction)}>
          <ReceiptText size={17} />
          Venta POS
        </button>
      </div>

      <div className="kpi-grid">
        <Kpi icon={ShoppingBag} label="Ventas digitales" value={money(onlineRevenue)} trend={report ? `periodo ${report.periodo}` : "reporte local"} />
        <Kpi icon={Truck} label="Pedidos pendientes" value={dashboard?.pedidos_pendientes ?? orders.length} trend="dashboard en vivo" />
        <Kpi icon={AlertTriangle} label="Alertas stock" value={dashboard?.productos_alerta_stock ?? lowStock.length} trend="reorden dinamico" />
        <Kpi icon={Star} label="Ventas hoy" value={money(dashboard?.ventas_hoy ?? report?.ventas_totales ?? 0)} trend="reporte del dia" />
      </div>

      <div className="admin-columns">
        <section className="work-panel">
          <div className="section-heading">
            <h2>Inventario inteligente</h2>
            <span>{lowStock.length} productos en punto de reorden</span>
          </div>
          <div className="table-list">
            {lowStock.slice(0, 8).map((product) => {
              const stockPercent = product.reorder > 0 ? Math.min(100, Math.max(0, (product.stock / product.reorder) * 100)) : 0;
              return (
                <article className="inventory-row" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.supplier} · stock {product.stock}/{product.reorder} minimo</span>
                  </div>
                  <div
                    className={`stock-level-bar ${product.stock === 0 ? "empty" : stockPercent < 35 ? "critical" : ""}`}
                    aria-label={`Stock al ${Math.round(stockPercent)} por ciento del minimo`}
                  >
                    <i style={{ width: `${stockPercent}%` }} />
                  </div>
                  <button className="small-button" onClick={() => generateRestock(product.id)}>
                    <PackageCheck size={16} />
                    Reponer
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="work-panel">
          <div className="section-heading">
            <h2>Plugins IA</h2>
            <span>{canAdminAgents ? "configuracion editable" : "solo lectura por rol"}</span>
          </div>
          <div className="agent-grid">
            {agentCards.map(({ title, value, detail, icon: Icon, action }) => (
              <article className="agent-card" key={title}>
                <Icon size={22} />
                <strong>{title}</strong>
                <b>{value}</b>
                <span>{detail}</span>
                <button className="small-button" disabled={!canAdminAgents || !action || Boolean(busyAction)} onClick={() => runBackendAction(action)}>
                  Ejecutar
                </button>
              </article>
            ))}
            <article className="agent-card">
              <Settings size={22} />
              <strong>Configuracion</strong>
              <b>0.20</b>
              <span>Factor de seguridad para reorden</span>
              <button className="small-button" disabled={!canAdminAgents || Boolean(busyAction)} onClick={() => runBackendAction("configuracion")}>
                Guardar
              </button>
            </article>
          </div>
        </section>
      </div>

      <section className="work-panel">
        <div className="section-heading">
          <h2>Proveedores backend</h2>
          <span>canal digital y desempeno</span>
        </div>
        <div className="orders-grid">
          {providers.map((provider) => (
            <article className="order-card" key={provider.id}>
              <div>
                <strong>{provider.nombre}</strong>
                <span>{provider.canal_digital ? "Digital" : "Manual"}</span>
              </div>
              <b>{provider.calificacion_desempeno || "S/C"}</b>
              <span>{provider.correo}</span>
              <small>prioridad {provider.prioridad} · {provider.estado}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="work-panel">
        <div className="section-heading">
          <h2>Pedidos recientes</h2>
          <span>historial sincronizable por cliente</span>
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

function BackendSettings({ auth, setAuth, loadProtectedData }) {
  return (
    <section className="work-panel settings-panel">
      <div className="section-heading">
        <h2>Credenciales temporales del backend</h2>
        <span>acceso de prueba por rol</span>
      </div>
      <div className="credential-help">
        <div>
          <strong>Como funciona</strong>
          <p>
            El backend aun no valida login con JWT. Por ahora identifica quien hace la peticion con dos headers:
            el rol (`cliente`, `cajero` o `administrador`) y el UUID de un registro existente en Supabase.
          </p>
        </div>
        <ul>
          <li><b>UUID cliente</b> activa carrito, pedidos, puntos, promociones y devoluciones del cliente.</li>
          <li><b>UUID administrador</b> permite dashboard, proveedores, reportes, agentes y correo de prueba.</li>
          <li><b>UUID cajero</b> sirve para ventas POS y operaciones de mostrador.</li>
        </ul>
      </div>
      <div className="settings-grid">
        <TextField label="UUID cliente" value={auth.clienteId} onChange={(value) => setAuth((current) => ({ ...current, clienteId: value }))} />
        <TextField label="UUID administrador" value={auth.adminId} onChange={(value) => setAuth((current) => ({ ...current, adminId: value }))} />
        <TextField label="UUID cajero" value={auth.cajeroId} onChange={(value) => setAuth((current) => ({ ...current, cajeroId: value }))} />
        <TextField label="Email prueba" value={auth.email} onChange={(value) => setAuth((current) => ({ ...current, email: value }))} />
      </div>
      <button className="primary-button" onClick={loadProtectedData}>
        <Download size={18} />
        Cargar carrito, pedidos y puntos
      </button>
    </section>
  );
}

function ChatView({ messages, chatInput, setChatInput, sendChat, addToCart }) {
  return (
    <section className="chat-layout">
      <div className="chat-window">
        <div className="chat-stream">
          {messages.map((message, index) => (
            <ChatMessage message={message} addToCart={addToCart} key={`${message.from}-${index}`} />
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
            <p className="eyebrow">Agente real</p>
            <h2>OpenRouter</h2>
          </div>
        </div>
        <ul className="feature-list">
          <li><Check size={17} /> Respuestas conectadas al inventario real</li>
          <li><Check size={17} /> Productos sugeridos por contexto</li>
          <li><Check size={17} /> Escalamiento humano con contexto</li>
          <li><Check size={17} /> Respaldo local si el servicio falla</li>
        </ul>
      </aside>
    </section>
  );
}

function ChatMessage({ message, addToCart }) {
  const visibleProducts = (message.products || []).slice(0, 4);
  const hiddenCount = Math.max(0, (message.products || []).length - visibleProducts.length);
  const mentioned = (message.mentioned || []).filter(
    (name) => !visibleProducts.some((product) => product.name === name),
  );
  return (
    <div className={`bubble ${message.from} ${visibleProducts.length ? "with-products" : ""}`}>
      <p>{message.text}</p>
      {message.from === "bot" && (message.intent || message.sentiment) && (
        <div className="agent-meta">
          {message.intent && <span>Intencion: {message.intent}</span>}
          {message.sentiment && <span>Tono: {message.sentiment}</span>}
        </div>
      )}
      {message.actions?.length > 0 && (
        <div className="agent-actions">
          {message.actions.slice(0, 3).map((action) => (
            <span key={action}>{action}</span>
          ))}
        </div>
      )}
      {mentioned.length > 0 && (
        <div className="mentioned-products">
          <span>Mencionados</span>
          {mentioned.slice(0, 5).map((name) => (
            <b key={name}>{name}</b>
          ))}
        </div>
      )}
      {visibleProducts.length > 0 && (
        <div className="chat-product-grid">
          {visibleProducts.map((product) => (
            <article className="chat-product-card" key={product.id || product.name}>
              <div>
                <span>{product.category}</span>
                <strong>{product.name}</strong>
                <small>{product.description}</small>
              </div>
              <div className="chat-product-footer">
                <b>{money(product.price)}</b>
                <span className={product.stock <= 0 ? "danger-text" : product.stock <= 10 ? "warn-text" : ""}>
                  {product.stock > 0 ? `${product.stock} disp.` : "Agotado"}
                </span>
              </div>
              <button className="small-button" disabled={!product.id || product.stock <= 0} onClick={() => addToCart(product.id)}>
                <ShoppingBag size={15} />
                Agregar
              </button>
            </article>
          ))}
          {hiddenCount > 0 && <div className="more-products">+{hiddenCount} opciones mas en la respuesta</div>}
        </div>
      )}
    </div>
  );
}

function CustomersView({ auth, setAuth, customerTools, setCustomerTools, customerAction, busyAction }) {
  return (
    <section className="customers-view">
      <div className="loyalty-banner">
        <div>
          <p className="eyebrow">Sistema de fidelizacion inteligente</p>
          <h2>1 punto por cada $10 MXN de compra</h2>
          <p>Conecta puntos, promociones personalizadas y devoluciones al backend cuando configuras UUIDs reales.</p>
        </div>
        <Gift size={54} />
      </div>

      <section className="work-panel settings-panel">
        <div className="section-heading">
          <h2>Operaciones de cliente</h2>
          <span>puntos, promocion y devoluciones</span>
        </div>
        <div className="settings-grid">
          <TextField label="UUID cliente" value={auth.clienteId} onChange={(value) => setAuth((current) => ({ ...current, clienteId: value }))} />
          <TextField label="Email" value={auth.email} onChange={(value) => setAuth((current) => ({ ...current, email: value }))} />
          <TextField label="Pedido ID" value={customerTools.pedidoId} onChange={(value) => setCustomerTools((current) => ({ ...current, pedidoId: value }))} />
          <TextField label="Detalle pedido ID" value={customerTools.detallePedidoId} onChange={(value) => setCustomerTools((current) => ({ ...current, detallePedidoId: value }))} />
          <TextField label="Motivo ID" value={customerTools.motivoId} onChange={(value) => setCustomerTools((current) => ({ ...current, motivoId: value }))} />
          <TextField label="Producto sustituto ID" value={customerTools.sustitutoId} onChange={(value) => setCustomerTools((current) => ({ ...current, sustitutoId: value }))} />
        </div>
        <div className="admin-controls">
          <button className="primary-button" onClick={() => customerAction("puntos")} disabled={Boolean(busyAction)}>
            Consultar puntos
          </button>
          <button className="ghost-button" onClick={() => customerAction("promo")} disabled={Boolean(busyAction)}>
            <Send size={17} />
            Generar promo
          </button>
          <button className="ghost-button" onClick={() => customerAction("devolucion")} disabled={Boolean(busyAction)}>
            Crear devolucion
          </button>
        </div>
        {customerTools.points && <pre className="json-box">{JSON.stringify(customerTools.points, null, 2)}</pre>}
      </section>

      <div className="customer-grid">
        {customers.map((customer) => (
          <article className="customer-card" key={customer.name}>
            <div className="avatar">{customer.name.charAt(0)}</div>
            <div>
              <strong>{customer.name}</strong>
              <span>{customer.profile} · {customer.segment}</span>
            </div>
            <Metric label="Compras 3 meses" value={customer.purchases} />
            <Metric label="Puntos simulados" value={customer.points.toLocaleString("es-MX")} />
            <button className="small-button" onClick={() => customerAction("promo")}>
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

function TextField({ label, value, onChange }) {
  return (
    <label className="control-group">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} />
    </label>
  );
}

export default App;
