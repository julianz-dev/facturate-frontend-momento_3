import { verificarSesion } from "./auth.js";

import {
    consultarAPI,
    actualizarAPI,
    crearAPI,
    apiProductos,
} from "./api.js";

//* ========================================
//* VARIABLES DEL MÓDULO DE PRODUCTOS
//* ========================================

// Colección completa de productos recibidos desde MockAPI.
let productos = [];

// Identificador del producto que se encuentra en edición.
let productoEnEdicion = null;

// Evita operaciones simultáneas de guardado.
let guardadoEnCurso = false;

// Evita operaciones simultáneas de cambio de estado.
let actualizacionEstadoEnCurso = false;

// Indica si la primera consulta de productos terminó correctamente.
let productosCargados = false;

//* ========================================
//* VERIFICAR AUTORIZACIÓN DE ACCESO
//* ========================================

const accesoAutorizado = verificarSesion();

if (accesoAutorizado) {
    inicializarModuloProductos();
}

//* ========================================
//* INICIALIZAR MÓDULO DE PRODUCTOS
//* ========================================

function inicializarModuloProductos() {
    // Seleccionar los elementos de la página.
    const elementos = {
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
    const elementosFaltantes = Object.entries(elementos)
        .filter(([, elemento]) => !elemento)
        .map(([nombre]) => nombre);

    if (elementosFaltantes.length > 0) {
        console.error(
            "No se pudo inicializar el módulo de productos. Faltan elementos HTML:",
            elementosFaltantes,
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

    const modalProducto = window.bootstrap.Modal.getOrCreateInstance(
        elementos.modal,
    );

    // No permitir crear productos hasta consultar los registros existentes.
    elementos.btnNuevoProducto.disabled = true;
    elementos.btnNuevoProducto.title =
        "Espera a que se cargue el catálogo de productos.";

    // Evitar cerrar el modal mientras una solicitud de guardado está pendiente.
    elementos.modal.addEventListener("hide.bs.modal", (evento) => {
        if (guardadoEnCurso) {
            evento.preventDefault();
        }
    });

    //* ========================================
    //* CERRAR SESIÓN
    //* ========================================

    if (elementos.btnCerrarSesion) {
        elementos.btnCerrarSesion.addEventListener("click", () => {
            sessionStorage.removeItem("sesionActiva");
            window.location.replace("login.html");
        });
    }

    //* ========================================
    //* MENSAJES DEL MÓDULO
    //* ========================================

    function mostrarMensajeEstado(texto, tipo = "info") {
        elementos.mensajeEstado.textContent = texto;
        elementos.mensajeEstado.className = "products-feedback";

        if (tipo === "success") {
            elementos.mensajeEstado.classList.add("is-success");
        } else if (tipo === "error") {
            elementos.mensajeEstado.classList.add("is-error");
        }

        elementos.mensajeEstado.hidden = false;
    }

    function limpiarMensajeEstado() {
        elementos.mensajeEstado.textContent = "";
        elementos.mensajeEstado.className = "products-feedback";
        elementos.mensajeEstado.hidden = true;
    }

    function mostrarMensajeFormulario(texto) {
        elementos.mensajeFormulario.textContent = texto;
        elementos.mensajeFormulario.hidden = false;
    }

    function limpiarMensajeFormulario() {
        elementos.mensajeFormulario.textContent = "";
        elementos.mensajeFormulario.hidden = true;
    }

    //* ========================================
    //* ESTADOS DE CARGA Y ERROR
    //* ========================================

    function mostrarEstadoCarga() {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 8;
        celda.className = "empty-table";
        celda.textContent = "Cargando productos...";

        fila.appendChild(celda);
        elementos.tabla.replaceChildren(fila);

        elementos.indicadorTotal.textContent = "—";
        elementos.indicadorActivos.textContent = "—";
        elementos.indicadorInactivos.textContent = "—";
    }

    function mostrarErrorTabla(texto) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 8;
        celda.className = "empty-table";
        celda.textContent = texto;

        fila.appendChild(celda);
        elementos.tabla.replaceChildren(fila);
    }

    //* ========================================
    //* FORMATEAR Y CREAR ELEMENTOS DE LA TABLA
    //* ========================================

    const formatoMoneda = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    });

    function obtenerIdProducto(producto) {
        return producto.producto_id ?? producto.id ?? "";
    }

    function crearCelda(texto, clase = "") {
        const celda = document.createElement("td");
        celda.textContent = texto;

        if (clase) {
            celda.className = clase;
        }

        return celda;
    }

    function crearEtiqueta(texto, clase) {
        const etiqueta = document.createElement("span");
        etiqueta.className = clase;
        etiqueta.textContent = texto;
        return etiqueta;
    }

    function crearBotonAccion(
        texto,
        accion,
        productoId,
        clases,
        etiquetaAccesible,
    ) {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = clases;
        boton.textContent = texto;
        boton.dataset.accion = accion;
        boton.dataset.productoId = String(productoId);
        boton.setAttribute("aria-label", etiquetaAccesible);

        return boton;
    }

    //* ========================================
    //* MOSTRAR PRODUCTOS EN LA TABLA
    //* ========================================

    function mostrarTablaProductos(listaProductos) {
        if (listaProductos.length === 0) {
            const fila = document.createElement("tr");
            const celda = document.createElement("td");

            celda.colSpan = 8;
            celda.className = "empty-table";
            celda.textContent = productos.length === 0
                ? "Todavía no hay productos registrados."
                : "No se encontraron productos con los criterios seleccionados.";

            fila.appendChild(celda);
            elementos.tabla.replaceChildren(fila);
            return;
        }

        const fragmento = document.createDocumentFragment();

        listaProductos.forEach((producto) => {
            const fila = document.createElement("tr");
            const productoId = obtenerIdProducto(producto);
            const productoActivo = producto.activo === true;
            const manejaInventario = producto.maneja_inventario === true;
            const precio = Number(producto.precio_venta);

            fila.appendChild(
                crearCelda(String(productoId)),
            );

            fila.appendChild(
                crearCelda(
                    String(producto.codigo_producto ?? "—"),
                    "product-code-cell",
                ),
            );

            fila.appendChild(
                crearCelda(
                    String(producto.nombre_producto ?? "—"),
                    "product-name-cell",
                ),
            );

            fila.appendChild(
                crearCelda(String(producto.categoria_id ?? "—")),
            );

            fila.appendChild(
                crearCelda(
                    Number.isFinite(precio)
                        ? formatoMoneda.format(precio)
                        : "—",
                ),
            );

            const celdaInventario = document.createElement("td");
            celdaInventario.appendChild(
                crearEtiqueta(
                    manejaInventario ? "Sí" : "No",
                    `product-inventory-badge ${manejaInventario ? "is-enabled" : "is-disabled"}`,
                ),
            );
            fila.appendChild(celdaInventario);

            const celdaEstado = document.createElement("td");
            celdaEstado.appendChild(
                crearEtiqueta(
                    productoActivo ? "Activo" : "Inactivo",
                    productoActivo
                        ? "badge text-bg-success"
                        : "badge text-bg-secondary",
                ),
            );
            fila.appendChild(celdaEstado);

            // Mantener las acciones con el mismo diseño de la tabla Clientes.
            const celdaAcciones = document.createElement("td");
            celdaAcciones.className = "text-nowrap";

            const botonEditar = crearBotonAccion(
                "Editar",
                "editar-producto",
                productoId,
                "btn btn-sm btn-outline-primary me-1",
                `Editar producto ${String(producto.nombre_producto ?? productoId)}`,
            );

            const botonEstado = crearBotonAccion(
                productoActivo ? "Inactivar" : "Activar",
                "cambiar-estado-producto",
                productoId,
                productoActivo
                    ? "btn btn-sm btn-outline-danger"
                    : "btn btn-sm btn-outline-success",
                `${productoActivo ? "Inactivar" : "Activar"} producto ${String(producto.nombre_producto ?? productoId)}`,
            );

            celdaAcciones.append(
                botonEditar,
                botonEstado,
            );
            fila.appendChild(celdaAcciones);

            fragmento.appendChild(fila);
        });

        elementos.tabla.replaceChildren(fragmento);
    }

    //* ========================================
    //* ACTUALIZAR INDICADORES Y TABLA
    //* ========================================

    function actualizarIndicadoresProductos() {
        const totalProductos = productos.length;
        const totalActivos = productos.filter(
            (producto) => producto.activo === true,
        ).length;
        const totalInactivos = productos.filter(
            (producto) => producto.activo === false,
        ).length;

        elementos.indicadorTotal.textContent = String(totalProductos);
        elementos.indicadorActivos.textContent = String(totalActivos);
        elementos.indicadorInactivos.textContent = String(totalInactivos);
    }

    //* ========================================
    //* BÚSQUEDA Y FILTRO DE PRODUCTOS
    //* ========================================

    function aplicarFiltrosProductos() {
        const terminoBusqueda = elementos.buscar.value
            .trim()
            .toLocaleLowerCase("es-CO");

        const estadoSeleccionado = elementos.filtroEstado.value;

        // Aplicar los filtros sobre la colección original sin modificarla.
        const productosFiltrados = productos.filter((producto) => {
            const nombre = String(
                producto.nombre_producto ?? "",
            ).toLocaleLowerCase("es-CO");

            const codigo = String(
                producto.codigo_producto ?? "",
            ).toLocaleLowerCase("es-CO");

            const id = String(
                obtenerIdProducto(producto),
            ).toLocaleLowerCase("es-CO");

            const coincideBusqueda =
                nombre.includes(terminoBusqueda) ||
                codigo.includes(terminoBusqueda) ||
                id.includes(terminoBusqueda);

            let coincideEstado = true;

            if (estadoSeleccionado === "ACTIVOS") {
                coincideEstado = producto.activo === true;
            } else if (estadoSeleccionado === "INACTIVOS") {
                coincideEstado = producto.activo === false;
            }

            return coincideBusqueda && coincideEstado;
        });

        mostrarTablaProductos(productosFiltrados);
    }

    function actualizarInterfazProductos() {
        aplicarFiltrosProductos();
        actualizarIndicadoresProductos();
    }

    elementos.buscar.addEventListener(
        "input",
        aplicarFiltrosProductos,
    );

    elementos.filtroEstado.addEventListener(
        "change",
        aplicarFiltrosProductos,
    );

    //* ========================================
    //* MOSTRAR Y OCULTAR LA TABLA
    //* ========================================

    elementos.btnAlternarTabla.addEventListener("click", () => {
        const tablaVisible = !elementos.contenedorTabla.hidden;

        elementos.contenedorTabla.hidden = tablaVisible;
        elementos.btnAlternarTabla.textContent = tablaVisible
            ? "Mostrar tabla de productos"
            : "Ocultar tabla de productos";

        elementos.btnAlternarTabla.setAttribute(
            "aria-expanded",
            String(!tablaVisible),
        );
    });

    //* ========================================
    //* VALIDAR CÓDIGO DE PRODUCTO DUPLICADO
    //* ========================================

    function existeCodigoDuplicado(codigoProducto) {
        const codigoNormalizado = codigoProducto
            .trim()
            .toLocaleLowerCase("es-CO");

        return productos.some((producto) => {
            const idRegistrado = obtenerIdProducto(producto);
            const codigoRegistrado = String(
                producto.codigo_producto ?? "",
            )
                .trim()
                .toLocaleLowerCase("es-CO");

            const esOtroProducto =
                String(idRegistrado) !== String(productoEnEdicion);

            return (
                esOtroProducto &&
                codigoRegistrado === codigoNormalizado
            );
        });
    }

    //* ========================================
    //* RESTABLECER EL FORMULARIO
    //* ========================================

    function restaurarFormularioProducto() {
        elementos.formulario.reset();

        productoEnEdicion = null;
        guardadoEnCurso = false;

        elementos.productoId.value = "";
        elementos.tituloModal.textContent = "Nuevo producto";
        elementos.btnGuardar.textContent = "Guardar producto";
        elementos.btnGuardar.disabled = !productosCargados;

        limpiarMensajeFormulario();
    }

    // Preparar el modal para crear un producto nuevo.
    elementos.btnNuevoProducto.addEventListener("click", () => {
        restaurarFormularioProducto();
    });

    // Limpiar el estado al cerrar el modal mediante Cancelar, X o Escape.
    elementos.modal.addEventListener(
        "hidden.bs.modal",
        restaurarFormularioProducto,
    );

    //* ========================================
    //* CREAR O ACTUALIZAR PRODUCTOS
    //* ========================================

    elementos.formulario.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            if (guardadoEnCurso) {
                return;
            }

            if (!productosCargados) {
                mostrarMensajeFormulario(
                    "No es posible guardar productos hasta que se cargue correctamente el catálogo.",
                );
                return;
            }

            const esEdicion = productoEnEdicion !== null;
            const idEnEdicion = productoEnEdicion;

            // Validar los campos obligatorios del formulario.
            if (!elementos.formulario.checkValidity()) {
                elementos.formulario.reportValidity();
                return;
            }

            const codigoValidado = elementos.codigo.value.trim();
            const nombreValidado = elementos.nombre.value.trim();
            const descripcionValidada = elementos.descripcion.value.trim();
            const categoriaValidada = Number(elementos.categoria.value);
            const precioValidado = Number(elementos.precioVenta.value);

            if (!codigoValidado) {
                mostrarMensajeFormulario("Ingresa un código de producto válido.");
                elementos.codigo.focus();
                return;
            }

            if (!nombreValidado) {
                mostrarMensajeFormulario("Ingresa el nombre del producto.");
                elementos.nombre.focus();
                return;
            }

            if (
                !Number.isSafeInteger(categoriaValidada) ||
                categoriaValidada < 1
            ) {
                mostrarMensajeFormulario(
                    "El ID de categoría debe ser un número entero mayor que cero.",
                );
                elementos.categoria.focus();
                return;
            }

            if (
                !Number.isSafeInteger(precioValidado) ||
                precioValidado < 0
            ) {
                mostrarMensajeFormulario(
                    "El precio de venta debe ser un número entero igual o mayor que cero.",
                );
                elementos.precioVenta.focus();
                return;
            }

            if (!descripcionValidada) {
                mostrarMensajeFormulario("Ingresa una descripción para el producto.");
                elementos.descripcion.focus();
                return;
            }

            // Evitar códigos duplicados, incluidos los productos inactivos.
            if (existeCodigoDuplicado(codigoValidado)) {
                mostrarMensajeFormulario(
                    "Ya existe un producto registrado con este código, incluso si está inactivo.",
                );
                elementos.codigo.focus();
                return;
            }

            // Recuperar el registro original cuando se está editando.
            let productoOriginal = null;
            let indiceProducto = -1;

            if (esEdicion) {
                indiceProducto = productos.findIndex((producto) => {
                    const idRegistrado = obtenerIdProducto(producto);
                    return String(idRegistrado) === String(idEnEdicion);
                });

                if (indiceProducto === -1) {
                    mostrarMensajeFormulario(
                        "No se encontró el producto que deseas actualizar. Recarga la página e inténtalo nuevamente.",
                    );
                    return;
                }

                productoOriginal = productos[indiceProducto];
            }

            // Conservar los valores de negocio y tipo de ítem existentes al editar.
            // Para registros nuevos se toman los valores configurados en el HTML.
            const negocioId = productoOriginal?.negocio_id ??
                Number(elementos.negocio.value || 1);
            const tipoItemId = productoOriginal?.tipo_item_id ??
                Number(elementos.tipoItem.value || 1);

            const datosProducto = {
                negocio_id: negocioId,
                categoria_id: categoriaValidada,
                codigo_producto: codigoValidado,
                nombre_producto: nombreValidado,
                descripcion: descripcionValidada,
                precio_venta: precioValidado,
                tipo_item_id: tipoItemId,
                maneja_inventario: elementos.manejaInventario.checked,
                activo: elementos.activo.checked,
            };

            guardadoEnCurso = true;
            elementos.btnGuardar.disabled = true;
            elementos.btnGuardar.textContent = esEdicion
                ? "Guardando cambios..."
                : "Guardando...";
            limpiarMensajeFormulario();

            try {
                let productoGuardado;

                if (esEdicion) {
                    // PUT: actualizar el registro existente.
                    const urlProducto =
                        `${apiProductos}/${encodeURIComponent(idEnEdicion)}`;

                    productoGuardado = await actualizarAPI(
                        urlProducto,
                        datosProducto,
                    );

                    // Conservar atributos originales y aplicar la respuesta de la API.
                    productos[indiceProducto] = {
                        ...productoOriginal,
                        ...datosProducto,
                        ...productoGuardado,
                    };
                } else {
                    // POST: crear un registro nuevo. MockAPI asigna el identificador.
                    productoGuardado = await crearAPI(
                        apiProductos,
                        datosProducto,
                    );

                    productos.push({
                        ...datosProducto,
                        ...productoGuardado,
                    });
                }

                actualizarInterfazProductos();
                limpiarMensajeEstado();

                console.log(
                    esEdicion
                        ? "Producto actualizado correctamente:"
                        : "Producto registrado correctamente:",
                    productoGuardado,
                );

                // Liberar la operación y limpiar el estado antes de cerrar el modal.
                guardadoEnCurso = false;
                productoEnEdicion = null;
                modalProducto.hide();

                mostrarMensajeEstado(
                    esEdicion
                        ? "Producto actualizado correctamente."
                        : "Producto registrado correctamente.",
                    "success",
                );
            } catch (error) {
                console.error(
                    esEdicion
                        ? "No fue posible actualizar el producto:"
                        : "No fue posible registrar el producto:",
                    error,
                );

                mostrarMensajeFormulario(
                    esEdicion
                        ? "No fue posible actualizar el producto. Verifica la conexión e inténtalo nuevamente."
                        : "No fue posible registrar el producto. Verifica la conexión e inténtalo nuevamente.",
                );
            } finally {
                guardadoEnCurso = false;
                elementos.btnGuardar.disabled = false;
                elementos.btnGuardar.textContent =
                    productoEnEdicion !== null
                        ? "Guardar cambios"
                        : "Guardar producto";
            }
        },
    );

    //* ========================================
    //* EDITAR Y CAMBIAR ESTADO DE PRODUCTOS
    //* ========================================

    elementos.tabla.addEventListener("click", async (evento) => {
        const objetivo = evento.target;

        if (!(objetivo instanceof Element)) {
            return;
        }

        const botonAccion = objetivo.closest("[data-accion]");

        if (
            !botonAccion ||
            !elementos.tabla.contains(botonAccion) ||
            actualizacionEstadoEnCurso
        ) {
            return;
        }

        const accion = botonAccion.dataset.accion;
        const productoId = botonAccion.dataset.productoId;

        const productoSeleccionado = productos.find((producto) => {
            const idRegistrado = obtenerIdProducto(producto);
            return String(idRegistrado) === String(productoId);
        });

        if (!productoSeleccionado) {
            console.error("No se encontró el producto seleccionado.");
            return;
        }

        //* ========================================
        //* EDITAR PRODUCTO
        //* ========================================

        if (accion === "editar-producto") {
            productoEnEdicion = productoId;
            elementos.formulario.reset();
            limpiarMensajeFormulario();

            elementos.productoId.value = String(productoId);
            elementos.codigo.value = productoSeleccionado.codigo_producto ?? "";
            elementos.nombre.value = productoSeleccionado.nombre_producto ?? "";
            elementos.categoria.value = productoSeleccionado.categoria_id ?? "";
            elementos.precioVenta.value = productoSeleccionado.precio_venta ?? "";
            elementos.descripcion.value = productoSeleccionado.descripcion ?? "";
            elementos.manejaInventario.checked =
                productoSeleccionado.maneja_inventario === true;
            elementos.activo.checked = productoSeleccionado.activo === true;
            elementos.negocio.value = String(
                productoSeleccionado.negocio_id ?? 1,
            );
            elementos.tipoItem.value = String(
                productoSeleccionado.tipo_item_id ?? 1,
            );

            elementos.tituloModal.textContent = "Editar producto";
            elementos.btnGuardar.textContent = "Guardar cambios";
            elementos.btnGuardar.disabled = false;

            modalProducto.show();
            return;
        }

        //* ========================================
        //* ACTIVAR O INACTIVAR PRODUCTO
        //* ========================================

        if (accion === "cambiar-estado-producto") {
            const nuevoEstado = productoSeleccionado.activo !== true;
            const accionEstado = nuevoEstado ? "activar" : "inactivar";
            const nombreProducto = String(
                productoSeleccionado.nombre_producto ?? productoId,
            );

            const confirmacion = window.confirm(
                `¿Confirmas que deseas ${accionEstado} el producto "${nombreProducto}"?`,
            );

            if (!confirmacion) {
                return;
            }

            actualizacionEstadoEnCurso = true;
            botonAccion.disabled = true;
            botonAccion.textContent = "Actualizando...";

            try {
                const urlProducto =
                    `${apiProductos}/${encodeURIComponent(productoId)}`;

                // PUT: cambiar únicamente el estado lógico del producto.
                const productoActualizado = await actualizarAPI(
                    urlProducto,
                    { activo: nuevoEstado },
                );

                const indiceProducto = productos.findIndex((producto) => {
                    const idRegistrado = obtenerIdProducto(producto);
                    return String(idRegistrado) === String(productoId);
                });

                if (indiceProducto === -1) {
                    throw new Error(
                        "El producto actualizado no se encontró en la colección local.",
                    );
                }

                productos[indiceProducto] = {
                    ...productos[indiceProducto],
                    ...productoActualizado,
                    activo: nuevoEstado,
                };

                actualizarInterfazProductos();
                limpiarMensajeEstado();

                console.log(
                    `Producto ${accionEstado} correctamente:`,
                    productos[indiceProducto],
                );

                mostrarMensajeEstado(
                    `Producto ${accionEstado} correctamente.`,
                    "success",
                );
            } catch (error) {
                console.error(
                    "No fue posible actualizar el estado del producto:",
                    error,
                );

                mostrarMensajeEstado(
                    "No fue posible actualizar el producto. Verifica la conexión e inténtalo nuevamente.",
                    "error",
                );

                // Volver a dibujar la tabla para restaurar el botón y su estado.
                aplicarFiltrosProductos();
            } finally {
                actualizacionEstadoEnCurso = false;
            }
        }
    });

    //* ========================================
    //* CONSULTAR PRODUCTOS DESDE MOCKAPI
    //* ========================================

    async function cargarProductos() {
        try {
            const respuesta = await consultarAPI(apiProductos);

            // Validación adicional del contrato de respuesta.
            if (!Array.isArray(respuesta)) {
                throw new Error("La API no devolvió una lista de productos válida.");
            }

            productos = respuesta;
            productosCargados = true;

            elementos.btnNuevoProducto.disabled = false;
            elementos.btnNuevoProducto.removeAttribute("title");
            elementos.btnGuardar.disabled = false;

            actualizarInterfazProductos();
            limpiarMensajeEstado();

            console.log(
                "Productos consultados correctamente:",
                productos.length,
            );
        } catch (error) {
            console.error("No se pudieron cargar los productos:", error);

            productosCargados = false;
            elementos.btnNuevoProducto.disabled = true;
            elementos.btnNuevoProducto.title =
                "No es posible registrar productos hasta cargar la información existente.";

            elementos.indicadorTotal.textContent = "—";
            elementos.indicadorActivos.textContent = "—";
            elementos.indicadorInactivos.textContent = "—";

            mostrarErrorTabla(
                "No fue posible cargar los productos. Verifica tu conexión e inténtalo nuevamente.",
            );

            mostrarMensajeEstado(
                "Ocurrió un problema al consultar el catálogo de productos.",
                "error",
            );
        }
    }

    //* ========================================
    //* MOSTRAR ESTADO INICIAL E INICIAR CARGA
    //* ========================================

    mostrarEstadoCarga();
    restaurarFormularioProducto();
    cargarProductos();

    // Si el navegador restaura esta página desde BFCache, actualizar el catálogo
    // para reflejar los cambios realizados en otras páginas.
    window.addEventListener("pageshow", (evento) => {
        if (evento.persisted) {
            cargarProductos();
        }
    });
}