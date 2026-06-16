export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://agentic-paperwork.onrender.com";

export const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

export const defaultAuth = {
  clienteId: "",
  adminId: EMPTY_UUID,
  cajeroId: EMPTY_UUID,
  email: "prueba@papermind.test",
};

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || "",
  );
}

export function actorHeaders(role, auth) {
  const byRole = {
    cliente: auth.clienteId,
    cajero: auth.cajeroId,
    administrador: auth.adminId,
    propietario: auth.adminId,
  };
  return {
    "x-role": role,
    "x-user-id": byRole[role] || EMPTY_UUID,
  };
}

export async function apiFetch(path, options = {}) {
  const { role, auth, body, headers, ...rest } = options;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(role && auth ? actorHeaders(role, auth) : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con ${API_BASE_URL}. Revisa tu red o espera a que Render despierte.`);
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export function friendlyError(message) {
  if (!message) return "No se pudo completar la accion.";
  if (message.includes("foreign key constraint")) {
    return "El UUID no existe en la base de datos. Usa un cliente, cajero o administrador creado en Supabase.";
  }
  if (message.includes("servicio no configurado") || message.includes("not configured")) {
    return "El servicio externo de esta accion no esta configurado en el backend.";
  }
  if (message.includes("Failed to fetch") || message.includes("No se pudo conectar")) {
    return "No hay conexion con el backend o Render esta despertando. Intenta recargar en unos segundos.";
  }
  if (message.length > 140) return `${message.slice(0, 140)}...`;
  return message;
}

export function normalizeProduct(product, categories = []) {
  const categoryName =
    product.categoria ||
    categories.find((category) => category.id === product.categoria_id)?.nombre ||
    "Sin categoria";

  const palette = ["#f2d55c", "#4f8bd6", "#d95b76", "#6fc27a", "#ef8f45", "#85c7c3", "#b898d6"];
  const hash = Array.from(product.id || product.nombre || "x").reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    id: product.id,
    name: product.nombre,
    description: product.descripcion || "Producto del catalogo PaperMind",
    category: categoryName,
    categoryId: product.categoria_id,
    brand: product.codigo_barras_qr || "PaperMind",
    price: Number(product.precio_venta || 0),
    cost: Number(product.precio_costo || 0),
    stock: Number(product.stock_actual || 0),
    reorder: Number(product.punto_reorden || 0),
    supplierId: product.proveedor_principal_id,
    supplier: product.proveedor_principal_id || "Proveedor por asignar",
    rotation: product.es_temporada ? "Estacional" : Number(product.stock_actual || 0) <= Number(product.punto_reorden || 0) ? "Alta" : "Media",
    demand: Math.min(98, Math.max(35, 100 - Number(product.stock_actual || 0) + Number(product.punto_reorden || 0))),
    color: palette[hash % palette.length],
    tags: [categoryName, product.es_temporada ? "temporada" : "catalogo", product.estado || "activo"],
    raw: product,
  };
}

export function extractCartItems(cartPayload) {
  if (!cartPayload) return [];
  if (Array.isArray(cartPayload)) return cartPayload;
  return cartPayload.items || cartPayload.detalles || cartPayload.productos || [];
}
