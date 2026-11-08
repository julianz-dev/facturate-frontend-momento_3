// ========================================
// CONFIGURACIÓN DE LAS API DE FACTURATE
// ========================================

// Base URL de la API de Julián
const gco_baseUrlJulian = "https://6adcddc5fa5e73d4ab2dc4c9.mockapi.io/api/v1";

// Base URL de la API de Cristian
const gco_baseUrlCristian = "https://6adcddc0fa5e73d4ab2dc4b1.mockapi.io/Facturate/api";

// Endpoints de clientes y productos
export const gco_apiClientes = `${gco_baseUrlJulian}/clientes`;
export const gco_apiProductos = `${gco_baseUrlJulian}/productos`;

// Endpoints de ventas y detalles de venta
export const gco_apiVentas = `${gco_baseUrlCristian}/Ventas`;
export const gco_apiDetallesVenta = `${gco_baseUrlCristian}/Detalles_Venta`;


// ========================================
// FUNCIÓN GENERAL PARA CONSULTAR LAS API
// ========================================

export async function gco_consultarAPI(gco_url) {

    try {

        // Realizar petición HTTP
        const gco_respuesta = await fetch(gco_url);

        // Comprobar respuesta HTTP
        if (!gco_respuesta.ok) {
            throw new Error(`Error HTTP: ${gco_respuesta.status}`);
        }

        // Convertir respuesta a formato JSON
        const gco_datos = await gco_respuesta.json();

        // Verificar que la respuesta sea un arreglo
        if (!Array.isArray(gco_datos)) {
            throw new Error("La respuesta de la API no contiene un arreglo.");
        }

        return gco_datos;

    } catch (gco_error) {

        console.error("Error al consultar la API:", gco_error.message);

        throw gco_error;

    }

}