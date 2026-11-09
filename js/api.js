//* ========================================
//* CONFIGURACIÓN DE LAS API DE FACTURATE
//* ========================================

// URL base para clientes y productos (Julian)
const baseUrlCatalogos = "https://6adcddc5fa5e73d4ab2dc4c9.mockapi.io/api/v1";

// URL base para ventas y detalles de venta (Cristian)
const baseUrlVentas = "https://6adcddc0fa5e73d4ab2dc4b1.mockapi.io/Facturate/api";

//* ========================================
//* ENDPOINTS DE CLIENTES Y PRODUCTOS
//* ========================================

export const apiClientes = `${baseUrlCatalogos}/clientes`;
export const apiProductos = `${baseUrlCatalogos}/productos`;

//* ========================================
//* ENDPOINTS DE VENTAS Y DETALLES
//* ========================================

export const apiVentas = `${baseUrlVentas}/Ventas`;
export const apiDetallesVenta = `${baseUrlVentas}/Detalles_Venta`;

//* ========================================
//* FUNCIÓN GENERAL PARA CONSULTAR LA API
//* ========================================

export async function consultarAPI(url) {

    try {

        // Realizar petición HTTP GET
        const respuesta = await fetch(url);

        // Comprobar respuesta HTTP
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        // Convertir respuesta a formato JSON
        const datos = await respuesta.json();

        // Verificar que la respuesta sea un arreglo
        if (!Array.isArray(datos)) {
            throw new Error("La respuesta de la API no contiene un arreglo.");
        }

        return datos;

    } catch (error) {

        console.error("Error al consultar la API:", error.message);

        throw error;

    }

}

//* ========================================
//* FUNCIÓN GENERAL PARA ACTUALIZAR REGISTROS
//* ========================================

export async function actualizarAPI(url, datos) {

    try {

        // Realizar petición HTTP PUT
        const respuesta = await fetch(url, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify(datos),

        });

        // Comprobar respuesta HTTP
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        // Convertir respuesta a formato JSON
        const datosActualizados = await respuesta.json();

        return datosActualizados;

    } catch (error) {

        console.error(
            "Error al actualizar el registro:",
            error.message
        );

        throw error;

    }

}

//* ========================================
//* FUNCIÓN GENERAL PARA REGISTRAR REGISTROS
//* ========================================

export async function crearAPI(url, datos) {

    try {

        // Realizar petición HTTP POST
        const respuesta = await fetch(url, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify(datos),

        });

        // Comprobar respuesta HTTP
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        // Convertir respuesta a formato JSON
        const datosCreados = await respuesta.json();

        return datosCreados;

    } catch (error) {

        console.error(
            "Error al registrar el nuevo registro:",
            error.message
        );

        throw error;

    }

}