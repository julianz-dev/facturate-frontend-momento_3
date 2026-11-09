import { gco_verificarSesion } from "./auth.js";

import {
    gco_consultarAPI,
    gco_actualizarAPI,
    gco_crearAPI,
    gco_apiProductos,
} from "./api.js";

// ========================================
// VARIABLES DEL MÓDULO DE PRODUCTOS
// ========================================

// Colección completa de productos recibidos desde MockAPI.
let gco_productos = [];

// Identificador del producto que se encuentra en edición.
let gco_productoEnEdicion = null;

// Evita operaciones simultáneas de guardado.
let gco_guardadoEnCurso = false;

// Evita operaciones simultáneas de cambio de estado.
let gco_actualizacionEstadoEnCurso = false;

// Indica si la primera consulta de productos terminó correctamente.
let gco_productosCargados = false;

// ========================================
// VERIFICAR AUTORIZACIÓN DE ACCESO
// ========================================

const gco_accesoAutorizado = gco_verificarSesion();

if (gco_accesoAutorizado) {
    gco_inicializarModuloProductos();
}

// ========================================
// INICIALIZAR MÓDULO DE PRODUCTOS
// ========================================

function gco_inicializarModuloProductos() {
    // Seleccionar los elementos de la página.
    const gco_elementos = {
        btnCerrarSesion: document.querySelector("#btnCerrarSesion"),
        btnNuevoProducto: document.querySelector("#btnNuevoProducto"),
        formulario: document.querySelector("#formularioProducto"),
        tituloModal: document.querySelector("#tituloModalProducto"),
        productoId: document.querySelector("#productoId"),
        codigo: document.querySelector("#codigoProducto"),
        nombre: document.querySelector("#nombreProducto"),
        categoria: document.querySelector("#categoriaProducto"),
        precioVenta: document.querySelector("#precioVentaProducto"),
        descripcion: document.querySelector("#descripcionProducto"),
        manejaInventario: document.querySelector("#manejaInventarioProducto"),
        activo: document.querySelector("#activoProducto"),
        negocio: document.querySelector("#negocioProducto"),
        tipoItem: document.querySelector("#tipoItemProducto"),
        btnGuardar: document.querySelector("#btnGuardarProducto"),
        tabla: document.querySelector("#tablaProductos"),
        buscar: document.querySelector("#buscarProductoAdmin"),
        filtroEstado: document.querySelector("#filtroEstadoProducto"),
        modal: document.querySelector("#modalProducto"),
        indicadorTotal: document.querySelector("#totalProductosAdmin"),
        indicadorActivos: document.querySelector("#productosActivosAdmin"),
        indicadorInactivos: document.querySelector("#productosInactivosAdmin"),
        btnAlternarTabla: document.querySelector("#btnAlternarTabla"),
        contenedorTabla: document.querySelector("#contenedorTablaProductos"),
        mensajeEstado: document.querySelector("#mensajeEstadoProductos"),
        mensajeFormulario: document.querySelector("#mensajeFormularioProducto"),
    };

    // Comprobar que el HTML contiene los elementos requeridos.
    const gco_elementosFaltantes = Object.entries(gco_elementos)
        .filter(([, gco_elemento]) => !gco_elemento)
        .map(([gco_nombre]) => gco_nombre);

    if (gco_elementosFaltantes.length > 0) {
        console.error(
            "No se pudo inicializar el módulo de productos. Faltan elementos HTML:",
            gco_elementosFaltantes,
        );
        return;
    }

    // Comprobar que Bootstrap esté disponible para controlar el modal.
    if (!window.bootstrap?.Modal) {
        console.error(
            "Bootstrap Modal no está disponible. Verifica la carga de bootstrap.bundle.min.js.",
        );
        return;
    }

    const gco_modalProducto = window.bootstrap.Modal.getOrCreateInstance(
        gco_elementos.modal,
    );

    // No permitir crear productos hasta consultar los registros existentes.
    gco_elementos.btnNuevoProducto.disabled = true;
    gco_elementos.btnNuevoProducto.title =
        "Espera a que se cargue el catálogo de productos.";

    // Evitar cerrar el modal mientras una solicitud de guardado está pendiente.
    gco_elementos.modal.addEventListener("hide.bs.modal", (gco_evento) => {
        if (gco_guardadoEnCurso) {
            gco_evento.preventDefault();
        }
    });

    // ========================================
    // CERRAR SESIÓN
    // ========================================

    if (gco_elementos.btnCerrarSesion) {
        gco_elementos.btnCerrarSesion.addEventListener("click", () => {
            sessionStorage.removeItem("gco_sesionActiva");
            window.location.replace("login.html");
        });
    }

    // ========================================
    // MENSAJES DEL MÓDULO
    // ========================================

    function gco_mostrarMensajeEstado(gco_texto, gco_tipo = "info") {
        gco_elementos.mensajeEstado.textContent = gco_texto;
        gco_elementos.mensajeEstado.className = "products-feedback";

        if (gco_tipo === "success") {
            gco_elementos.mensajeEstado.classList.add("is-success");
        } else if (gco_tipo === "error") {
            gco_elementos.mensajeEstado.classList.add("is-error");
        }

        gco_elementos.mensajeEstado.hidden = false;
    }

    function gco_limpiarMensajeEstado() {
        gco_elementos.mensajeEstado.textContent = "";
        gco_elementos.mensajeEstado.className = "products-feedback";
        gco_elementos.mensajeEstado.hidden = true;
    }

    function gco_mostrarMensajeFormulario(gco_texto) {
        gco_elementos.mensajeFormulario.textContent = gco_texto;
        gco_elementos.mensajeFormulario.hidden = false;
    }

    function gco_limpiarMensajeFormulario() {
        gco_elementos.mensajeFormulario.textContent = "";
        gco_elementos.mensajeFormulario.hidden = true;
    }

    // ========================================
    // ESTADOS DE CARGA Y ERROR
    // ========================================

    function gco_mostrarEstadoCarga() {
        const gco_fila = document.createElement("tr");
        const gco_celda = document.createElement("td");

        gco_celda.colSpan = 8;
        gco_celda.className = "empty-table";
        gco_celda.textContent = "Cargando productos...";

        gco_fila.appendChild(gco_celda);
        gco_elementos.tabla.replaceChildren(gco_fila);

        gco_elementos.indicadorTotal.textContent = "—";
        gco_elementos.indicadorActivos.textContent = "—";
        gco_elementos.indicadorInactivos.textContent = "—";
    }

    function gco_mostrarErrorTabla(gco_texto) {
        const gco_fila = document.createElement("tr");
        const gco_celda = document.createElement("td");

        gco_celda.colSpan = 8;
        gco_celda.className = "empty-table";
        gco_celda.textContent = gco_texto;

        gco_fila.appendChild(gco_celda);
        gco_elementos.tabla.replaceChildren(gco_fila);
    }

    // ========================================
    // FORMATEAR Y CREAR ELEMENTOS DE LA TABLA
    // ========================================

    const gco_formatoMoneda = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    });

    function gco_obtenerIdProducto(gco_producto) {
        return gco_producto.producto_id ?? gco_producto.id ?? "";
    }

    function gco_crearCelda(gco_texto, gco_clase = "") {
        const gco_celda = document.createElement("td");
        gco_celda.textContent = gco_texto;

        if (gco_clase) {
            gco_celda.className = gco_clase;
        }

        return gco_celda;
    }

    function gco_crearEtiqueta(gco_texto, gco_clase) {
        const gco_etiqueta = document.createElement("span");
        gco_etiqueta.className = gco_clase;
        gco_etiqueta.textContent = gco_texto;
        return gco_etiqueta;
    }

    function gco_crearBotonAccion(
        gco_texto,
        gco_accion,
        gco_productoId,
        gco_clases,
        gco_etiquetaAccesible,
    ) {
        const gco_boton = document.createElement("button");

        gco_boton.type = "button";
        gco_boton.className = gco_clases;
        gco_boton.textContent = gco_texto;
        gco_boton.dataset.accion = gco_accion;
        gco_boton.dataset.productoId = String(gco_productoId);
        gco_boton.setAttribute("aria-label", gco_etiquetaAccesible);

        return gco_boton;
    }

    // ========================================
    // MOSTRAR PRODUCTOS EN LA TABLA
    // ========================================

    function gco_mostrarTablaProductos(gco_listaProductos) {
        if (gco_listaProductos.length === 0) {
            const gco_fila = document.createElement("tr");
            const gco_celda = document.createElement("td");

            gco_celda.colSpan = 8;
            gco_celda.className = "empty-table";
            gco_celda.textContent = gco_productos.length === 0
                ? "Todavía no hay productos registrados."
                : "No se encontraron productos con los criterios seleccionados.";

            gco_fila.appendChild(gco_celda);
            gco_elementos.tabla.replaceChildren(gco_fila);
            return;
        }

        const gco_fragmento = document.createDocumentFragment();

        gco_listaProductos.forEach((gco_producto) => {
            const gco_fila = document.createElement("tr");
            const gco_productoId = gco_obtenerIdProducto(gco_producto);
            const gco_productoActivo = gco_producto.activo === true;
            const gco_manejaInventario = gco_producto.maneja_inventario === true;
            const gco_precio = Number(gco_producto.precio_venta);

            gco_fila.appendChild(
                gco_crearCelda(String(gco_productoId)),
            );

            gco_fila.appendChild(
                gco_crearCelda(
                    String(gco_producto.codigo_producto ?? "—"),
                    "product-code-cell",
                ),
            );

            gco_fila.appendChild(
                gco_crearCelda(
                    String(gco_producto.nombre_producto ?? "—"),
                    "product-name-cell",
                ),
            );

            gco_fila.appendChild(
                gco_crearCelda(String(gco_producto.categoria_id ?? "—")),
            );

            gco_fila.appendChild(
                gco_crearCelda(
                    Number.isFinite(gco_precio)
                        ? gco_formatoMoneda.format(gco_precio)
                        : "—",
                ),
            );

            const gco_celdaInventario = document.createElement("td");
            gco_celdaInventario.appendChild(
                gco_crearEtiqueta(
                    gco_manejaInventario ? "Sí" : "No",
                    `product-inventory-badge ${gco_manejaInventario ? "is-enabled" : "is-disabled"}`,
                ),
            );
            gco_fila.appendChild(gco_celdaInventario);

            const gco_celdaEstado = document.createElement("td");
            gco_celdaEstado.appendChild(
                gco_crearEtiqueta(
                    gco_productoActivo ? "Activo" : "Inactivo",
                    gco_productoActivo
                        ? "badge text-bg-success"
                        : "badge text-bg-secondary",
                ),
            );
            gco_fila.appendChild(gco_celdaEstado);

            // Mantener las acciones con el mismo diseño de la tabla Clientes.
            const gco_celdaAcciones = document.createElement("td");
            gco_celdaAcciones.className = "text-nowrap";

            const gco_botonEditar = gco_crearBotonAccion(
                "Editar",
                "editar-producto",
                gco_productoId,
                "btn btn-sm btn-outline-primary me-1",
                `Editar producto ${String(gco_producto.nombre_producto ?? gco_productoId)}`,
            );

            const gco_botonEstado = gco_crearBotonAccion(
                gco_productoActivo ? "Inactivar" : "Activar",
                "cambiar-estado-producto",
                gco_productoId,
                gco_productoActivo
                    ? "btn btn-sm btn-outline-danger"
                    : "btn btn-sm btn-outline-success",
                `${gco_productoActivo ? "Inactivar" : "Activar"} producto ${String(gco_producto.nombre_producto ?? gco_productoId)}`,
            );

            gco_celdaAcciones.append(
                gco_botonEditar,
                gco_botonEstado,
            );
            gco_fila.appendChild(gco_celdaAcciones);

            gco_fragmento.appendChild(gco_fila);
        });

        gco_elementos.tabla.replaceChildren(gco_fragmento);
    }

    // ========================================
    // ACTUALIZAR INDICADORES Y TABLA
    // ========================================

    function gco_actualizarIndicadoresProductos() {
        const gco_totalProductos = gco_productos.length;
        const gco_totalActivos = gco_productos.filter(
            (gco_producto) => gco_producto.activo === true,
        ).length;
        const gco_totalInactivos = gco_productos.filter(
            (gco_producto) => gco_producto.activo === false,
        ).length;

        gco_elementos.indicadorTotal.textContent = String(gco_totalProductos);
        gco_elementos.indicadorActivos.textContent = String(gco_totalActivos);
        gco_elementos.indicadorInactivos.textContent = String(gco_totalInactivos);
    }

    // ========================================
    // BÚSQUEDA Y FILTRO DE PRODUCTOS
    // ========================================

    function gco_aplicarFiltrosProductos() {
        const gco_terminoBusqueda = gco_elementos.buscar.value
            .trim()
            .toLocaleLowerCase("es-CO");

        const gco_estadoSeleccionado = gco_elementos.filtroEstado.value;

        // Aplicar los filtros sobre la colección original sin modificarla.
        const gco_productosFiltrados = gco_productos.filter((gco_producto) => {
            const gco_nombre = String(
                gco_producto.nombre_producto ?? "",
            ).toLocaleLowerCase("es-CO");

            const gco_codigo = String(
                gco_producto.codigo_producto ?? "",
            ).toLocaleLowerCase("es-CO");

            const gco_id = String(
                gco_obtenerIdProducto(gco_producto),
            ).toLocaleLowerCase("es-CO");

            const gco_coincideBusqueda =
                gco_nombre.includes(gco_terminoBusqueda) ||
                gco_codigo.includes(gco_terminoBusqueda) ||
                gco_id.includes(gco_terminoBusqueda);

            let gco_coincideEstado = true;

            if (gco_estadoSeleccionado === "ACTIVOS") {
                gco_coincideEstado = gco_producto.activo === true;
            } else if (gco_estadoSeleccionado === "INACTIVOS") {
                gco_coincideEstado = gco_producto.activo === false;
            }

            return gco_coincideBusqueda && gco_coincideEstado;
        });

        gco_mostrarTablaProductos(gco_productosFiltrados);
    }

    function gco_actualizarInterfazProductos() {
        gco_aplicarFiltrosProductos();
        gco_actualizarIndicadoresProductos();
    }

    gco_elementos.buscar.addEventListener(
        "input",
        gco_aplicarFiltrosProductos,
    );

    gco_elementos.filtroEstado.addEventListener(
        "change",
        gco_aplicarFiltrosProductos,
    );

    // ========================================
    // MOSTRAR Y OCULTAR LA TABLA
    // ========================================

    gco_elementos.btnAlternarTabla.addEventListener("click", () => {
        const gco_tablaVisible = !gco_elementos.contenedorTabla.hidden;

        gco_elementos.contenedorTabla.hidden = gco_tablaVisible;
        gco_elementos.btnAlternarTabla.textContent = gco_tablaVisible
            ? "Mostrar tabla de productos"
            : "Ocultar tabla de productos";

        gco_elementos.btnAlternarTabla.setAttribute(
            "aria-expanded",
            String(!gco_tablaVisible),
        );
    });

    // ========================================
    // VALIDAR CÓDIGO DE PRODUCTO DUPLICADO
    // ========================================

    function gco_existeCodigoDuplicado(gco_codigoProducto) {
        const gco_codigoNormalizado = gco_codigoProducto
            .trim()
            .toLocaleLowerCase("es-CO");

        return gco_productos.some((gco_producto) => {
            const gco_idRegistrado = gco_obtenerIdProducto(gco_producto);
            const gco_codigoRegistrado = String(
                gco_producto.codigo_producto ?? "",
            )
                .trim()
                .toLocaleLowerCase("es-CO");

            const gco_esOtroProducto =
                String(gco_idRegistrado) !== String(gco_productoEnEdicion);

            return (
                gco_esOtroProducto &&
                gco_codigoRegistrado === gco_codigoNormalizado
            );
        });
    }

    // ========================================
    // RESTABLECER EL FORMULARIO
    // ========================================

    function gco_restaurarFormularioProducto() {
        gco_elementos.formulario.reset();

        gco_productoEnEdicion = null;
        gco_guardadoEnCurso = false;

        gco_elementos.productoId.value = "";
        gco_elementos.tituloModal.textContent = "Nuevo producto";
        gco_elementos.btnGuardar.textContent = "Guardar producto";
        gco_elementos.btnGuardar.disabled = !gco_productosCargados;

        gco_limpiarMensajeFormulario();
    }

    // Preparar el modal para crear un producto nuevo.
    gco_elementos.btnNuevoProducto.addEventListener("click", () => {
        gco_restaurarFormularioProducto();
    });

    // Limpiar el estado al cerrar el modal mediante Cancelar, X o Escape.
    gco_elementos.modal.addEventListener(
        "hidden.bs.modal",
        gco_restaurarFormularioProducto,
    );

    // ========================================
    // CREAR O ACTUALIZAR PRODUCTOS
    // ========================================

    gco_elementos.formulario.addEventListener(
        "submit",
        async (gco_evento) => {
            gco_evento.preventDefault();

            if (gco_guardadoEnCurso) {
                return;
            }

            if (!gco_productosCargados) {
                gco_mostrarMensajeFormulario(
                    "No es posible guardar productos hasta que se cargue correctamente el catálogo.",
                );
                return;
            }

            const gco_esEdicion = gco_productoEnEdicion !== null;
            const gco_idEnEdicion = gco_productoEnEdicion;

            // Validar los campos obligatorios del formulario.
            if (!gco_elementos.formulario.checkValidity()) {
                gco_elementos.formulario.reportValidity();
                return;
            }

            const gco_codigoValidado = gco_elementos.codigo.value.trim();
            const gco_nombreValidado = gco_elementos.nombre.value.trim();
            const gco_descripcionValidada = gco_elementos.descripcion.value.trim();
            const gco_categoriaValidada = Number(gco_elementos.categoria.value);
            const gco_precioValidado = Number(gco_elementos.precioVenta.value);

            if (!gco_codigoValidado) {
                gco_mostrarMensajeFormulario("Ingresa un código de producto válido.");
                gco_elementos.codigo.focus();
                return;
            }

            if (!gco_nombreValidado) {
                gco_mostrarMensajeFormulario("Ingresa el nombre del producto.");
                gco_elementos.nombre.focus();
                return;
            }

            if (
                !Number.isSafeInteger(gco_categoriaValidada) ||
                gco_categoriaValidada < 1
            ) {
                gco_mostrarMensajeFormulario(
                    "El ID de categoría debe ser un número entero mayor que cero.",
                );
                gco_elementos.categoria.focus();
                return;
            }

            if (
                !Number.isSafeInteger(gco_precioValidado) ||
                gco_precioValidado < 0
            ) {
                gco_mostrarMensajeFormulario(
                    "El precio de venta debe ser un número entero igual o mayor que cero.",
                );
                gco_elementos.precioVenta.focus();
                return;
            }

            if (!gco_descripcionValidada) {
                gco_mostrarMensajeFormulario("Ingresa una descripción para el producto.");
                gco_elementos.descripcion.focus();
                return;
            }

            // Evitar códigos duplicados, incluidos los productos inactivos.
            if (gco_existeCodigoDuplicado(gco_codigoValidado)) {
                gco_mostrarMensajeFormulario(
                    "Ya existe un producto registrado con este código, incluso si está inactivo.",
                );
                gco_elementos.codigo.focus();
                return;
            }

            // Recuperar el registro original cuando se está editando.
            let gco_productoOriginal = null;
            let gco_indiceProducto = -1;

            if (gco_esEdicion) {
                gco_indiceProducto = gco_productos.findIndex((gco_producto) => {
                    const gco_idRegistrado = gco_obtenerIdProducto(gco_producto);
                    return String(gco_idRegistrado) === String(gco_idEnEdicion);
                });

                if (gco_indiceProducto === -1) {
                    gco_mostrarMensajeFormulario(
                        "No se encontró el producto que deseas actualizar. Recarga la página e inténtalo nuevamente.",
                    );
                    return;
                }

                gco_productoOriginal = gco_productos[gco_indiceProducto];
            }

            // Conservar los valores de negocio y tipo de ítem existentes al editar.
            // Para registros nuevos se toman los valores configurados en el HTML.
            const gco_negocioId = gco_productoOriginal?.negocio_id ??
                Number(gco_elementos.negocio.value || 1);
            const gco_tipoItemId = gco_productoOriginal?.tipo_item_id ??
                Number(gco_elementos.tipoItem.value || 1);

            const gco_datosProducto = {
                negocio_id: gco_negocioId,
                categoria_id: gco_categoriaValidada,
                codigo_producto: gco_codigoValidado,
                nombre_producto: gco_nombreValidado,
                descripcion: gco_descripcionValidada,
                precio_venta: gco_precioValidado,
                tipo_item_id: gco_tipoItemId,
                maneja_inventario: gco_elementos.manejaInventario.checked,
                activo: gco_elementos.activo.checked,
            };

            gco_guardadoEnCurso = true;
            gco_elementos.btnGuardar.disabled = true;
            gco_elementos.btnGuardar.textContent = gco_esEdicion
                ? "Guardando cambios..."
                : "Guardando...";
            gco_limpiarMensajeFormulario();

            try {
                let gco_productoGuardado;

                if (gco_esEdicion) {
                    // PUT: actualizar el registro existente.
                    const gco_urlProducto =
                        `${gco_apiProductos}/${encodeURIComponent(gco_idEnEdicion)}`;

                    gco_productoGuardado = await gco_actualizarAPI(
                        gco_urlProducto,
                        gco_datosProducto,
                    );

                    // Conservar atributos originales y aplicar la respuesta de la API.
                    gco_productos[gco_indiceProducto] = {
                        ...gco_productoOriginal,
                        ...gco_datosProducto,
                        ...gco_productoGuardado,
                    };
                } else {
                    // POST: crear un registro nuevo. MockAPI asigna el identificador.
                    gco_productoGuardado = await gco_crearAPI(
                        gco_apiProductos,
                        gco_datosProducto,
                    );

                    gco_productos.push({
                        ...gco_datosProducto,
                        ...gco_productoGuardado,
                    });
                }

                gco_actualizarInterfazProductos();
                gco_limpiarMensajeEstado();

                console.log(
                    gco_esEdicion
                        ? "Producto actualizado correctamente:"
                        : "Producto registrado correctamente:",
                    gco_productoGuardado,
                );

                // Liberar la operación y limpiar el estado antes de cerrar el modal.
                gco_guardadoEnCurso = false;
                gco_productoEnEdicion = null;
                gco_modalProducto.hide();

                gco_mostrarMensajeEstado(
                    gco_esEdicion
                        ? "Producto actualizado correctamente."
                        : "Producto registrado correctamente.",
                    "success",
                );
            } catch (gco_error) {
                console.error(
                    gco_esEdicion
                        ? "No fue posible actualizar el producto:"
                        : "No fue posible registrar el producto:",
                    gco_error,
                );

                gco_mostrarMensajeFormulario(
                    gco_esEdicion
                        ? "No fue posible actualizar el producto. Verifica la conexión e inténtalo nuevamente."
                        : "No fue posible registrar el producto. Verifica la conexión e inténtalo nuevamente.",
                );
            } finally {
                gco_guardadoEnCurso = false;
                gco_elementos.btnGuardar.disabled = false;
                gco_elementos.btnGuardar.textContent =
                    gco_productoEnEdicion !== null
                        ? "Guardar cambios"
                        : "Guardar producto";
            }
        },
    );

    // ========================================
    // EDITAR Y CAMBIAR ESTADO DE PRODUCTOS
    // ========================================

    gco_elementos.tabla.addEventListener("click", async (gco_evento) => {
        const gco_objetivo = gco_evento.target;

        if (!(gco_objetivo instanceof Element)) {
            return;
        }

        const gco_botonAccion = gco_objetivo.closest("[data-accion]");

        if (
            !gco_botonAccion ||
            !gco_elementos.tabla.contains(gco_botonAccion) ||
            gco_actualizacionEstadoEnCurso
        ) {
            return;
        }

        const gco_accion = gco_botonAccion.dataset.accion;
        const gco_productoId = gco_botonAccion.dataset.productoId;

        const gco_productoSeleccionado = gco_productos.find((gco_producto) => {
            const gco_idRegistrado = gco_obtenerIdProducto(gco_producto);
            return String(gco_idRegistrado) === String(gco_productoId);
        });

        if (!gco_productoSeleccionado) {
            console.error("No se encontró el producto seleccionado.");
            return;
        }

        // ----------------------------------------
        // EDITAR PRODUCTO
        // ----------------------------------------

        if (gco_accion === "editar-producto") {
            gco_productoEnEdicion = gco_productoId;
            gco_elementos.formulario.reset();
            gco_limpiarMensajeFormulario();

            gco_elementos.productoId.value = String(gco_productoId);
            gco_elementos.codigo.value = gco_productoSeleccionado.codigo_producto ?? "";
            gco_elementos.nombre.value = gco_productoSeleccionado.nombre_producto ?? "";
            gco_elementos.categoria.value = gco_productoSeleccionado.categoria_id ?? "";
            gco_elementos.precioVenta.value = gco_productoSeleccionado.precio_venta ?? "";
            gco_elementos.descripcion.value = gco_productoSeleccionado.descripcion ?? "";
            gco_elementos.manejaInventario.checked =
                gco_productoSeleccionado.maneja_inventario === true;
            gco_elementos.activo.checked = gco_productoSeleccionado.activo === true;
            gco_elementos.negocio.value = String(
                gco_productoSeleccionado.negocio_id ?? 1,
            );
            gco_elementos.tipoItem.value = String(
                gco_productoSeleccionado.tipo_item_id ?? 1,
            );

            gco_elementos.tituloModal.textContent = "Editar producto";
            gco_elementos.btnGuardar.textContent = "Guardar cambios";
            gco_elementos.btnGuardar.disabled = false;

            gco_modalProducto.show();
            return;
        }

        // ----------------------------------------
        // ACTIVAR O INACTIVAR PRODUCTO
        // ----------------------------------------

        if (gco_accion === "cambiar-estado-producto") {
            const gco_nuevoEstado = gco_productoSeleccionado.activo !== true;
            const gco_accionEstado = gco_nuevoEstado ? "activar" : "inactivar";
            const gco_nombreProducto = String(
                gco_productoSeleccionado.nombre_producto ?? gco_productoId,
            );

            const gco_confirmacion = window.confirm(
                `¿Confirmas que deseas ${gco_accionEstado} el producto "${gco_nombreProducto}"?`,
            );

            if (!gco_confirmacion) {
                return;
            }

            gco_actualizacionEstadoEnCurso = true;
            gco_botonAccion.disabled = true;
            gco_botonAccion.textContent = "Actualizando...";

            try {
                const gco_urlProducto =
                    `${gco_apiProductos}/${encodeURIComponent(gco_productoId)}`;

                // PUT: cambiar únicamente el estado lógico del producto.
                const gco_productoActualizado = await gco_actualizarAPI(
                    gco_urlProducto,
                    { activo: gco_nuevoEstado },
                );

                const gco_indiceProducto = gco_productos.findIndex((gco_producto) => {
                    const gco_idRegistrado = gco_obtenerIdProducto(gco_producto);
                    return String(gco_idRegistrado) === String(gco_productoId);
                });

                if (gco_indiceProducto === -1) {
                    throw new Error(
                        "El producto actualizado no se encontró en la colección local.",
                    );
                }

                gco_productos[gco_indiceProducto] = {
                    ...gco_productos[gco_indiceProducto],
                    ...gco_productoActualizado,
                    activo: gco_nuevoEstado,
                };

                gco_actualizarInterfazProductos();
                gco_limpiarMensajeEstado();

                console.log(
                    `Producto ${gco_accionEstado} correctamente:`,
                    gco_productos[gco_indiceProducto],
                );

                gco_mostrarMensajeEstado(
                    `Producto ${gco_accionEstado} correctamente.`,
                    "success",
                );
            } catch (gco_error) {
                console.error(
                    "No fue posible actualizar el estado del producto:",
                    gco_error,
                );

                gco_mostrarMensajeEstado(
                    "No fue posible actualizar el producto. Verifica la conexión e inténtalo nuevamente.",
                    "error",
                );

                // Volver a dibujar la tabla para restaurar el botón y su estado.
                gco_aplicarFiltrosProductos();
            } finally {
                gco_actualizacionEstadoEnCurso = false;
            }
        }
    });

    // ========================================
    // CONSULTAR PRODUCTOS DESDE MOCKAPI
    // ========================================

    async function gco_cargarProductos() {
        try {
            const gco_respuesta = await gco_consultarAPI(gco_apiProductos);

            // Validación adicional del contrato de respuesta.
            if (!Array.isArray(gco_respuesta)) {
                throw new Error("La API no devolvió una lista de productos válida.");
            }

            gco_productos = gco_respuesta;
            gco_productosCargados = true;

            gco_elementos.btnNuevoProducto.disabled = false;
            gco_elementos.btnNuevoProducto.removeAttribute("title");
            gco_elementos.btnGuardar.disabled = false;

            gco_actualizarInterfazProductos();
            gco_limpiarMensajeEstado();

            console.log(
                "Productos consultados correctamente:",
                gco_productos.length,
            );
        } catch (gco_error) {
            console.error("No se pudieron cargar los productos:", gco_error);

            gco_productosCargados = false;
            gco_elementos.btnNuevoProducto.disabled = true;
            gco_elementos.btnNuevoProducto.title =
                "No es posible registrar productos hasta cargar la información existente.";

            gco_elementos.indicadorTotal.textContent = "—";
            gco_elementos.indicadorActivos.textContent = "—";
            gco_elementos.indicadorInactivos.textContent = "—";

            gco_mostrarErrorTabla(
                "No fue posible cargar los productos. Verifica tu conexión e inténtalo nuevamente.",
            );

            gco_mostrarMensajeEstado(
                "Ocurrió un problema al consultar el catálogo de productos.",
                "error",
            );
        }
    }

    // ========================================
    // MOSTRAR ESTADO INICIAL E INICIAR CARGA
    // ========================================

    gco_mostrarEstadoCarga();
    gco_restaurarFormularioProducto();
    gco_cargarProductos();

    // Si el navegador restaura esta página desde BFCache, actualizar el catálogo
    // para reflejar los cambios realizados en otras páginas.
    window.addEventListener("pageshow", (gco_evento) => {
        if (gco_evento.persisted) {
            gco_cargarProductos();
        }
    });
}
