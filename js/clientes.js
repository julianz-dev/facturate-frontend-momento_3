import { gco_verificarSesion } from "./auth.js";

import {
    gco_consultarAPI,
    gco_actualizarAPI,
    gco_crearAPI,
    gco_apiClientes,
} from "./api.js";

import {
    gco_mostrarTablaClientes,
    gco_actualizarIndicadoresClientes,
    gco_mostrarErrorTablaClientes,
} from "./ui.js";

// ========================================
// VARIABLES DEL MÓDULO DE CLIENTES
// ========================================

// Colección completa de clientes recibidos desde MockAPI.
let gco_clientes = [];

// Identificador del cliente que se encuentra en edición.
let gco_clienteEnEdicion = null;

// Indica si el registro que se intenta editar es el cliente genérico.
let gco_clienteGenericoEnEdicion = false;

// Evita que se envíen dos operaciones de guardado simultáneamente.
let gco_guardadoEnCurso = false;

// ========================================
// VERIFICAR AUTORIZACIÓN DE ACCESO
// ========================================

const gco_accesoAutorizado = gco_verificarSesion();

if (gco_accesoAutorizado) {
    gco_inicializarModuloClientes();
}

// ========================================
// INICIALIZAR MÓDULO DE CLIENTES
// ========================================

function gco_inicializarModuloClientes() {
    // Seleccionar los elementos de la página.
    const gco_elementos = {
        btnCerrarSesion: document.querySelector("#btnCerrarSesion"),
        btnNuevoCliente: document.querySelector("#btnNuevoCliente"),
        formulario: document.querySelector("#formularioCliente"),
        tituloModal: document.querySelector("#tituloModalCliente"),
        nombre: document.querySelector("#nombreRazonSocialCliente"),
        tipoDocumento: document.querySelector("#tipoDocumentoCliente"),
        numeroDocumento: document.querySelector("#numeroDocumentoCliente"),
        esGenerico: document.querySelector("#esGenericoCliente"),
        activo: document.querySelector("#activoCliente"),
        btnGuardar: document.querySelector("#btnGuardarCliente"),
        tabla: document.querySelector("#tablaClientes"),
        buscar: document.querySelector("#buscarCliente"),
        filtroEstado: document.querySelector("#filtroEstadoCliente"),
        btnAlternarTabla: document.querySelector("#btnAlternarTabla"),
        contenedorTabla: document.querySelector("#contenedorTablaClientes"),
        modal: document.querySelector("#modalCliente"),
        indicadorTotal: document.querySelector("#totalClientesAdmin"),
        indicadorActivos: document.querySelector("#clientesActivosAdmin"),
        indicadorInactivos: document.querySelector("#clientesInactivosAdmin"),
    };

    // Comprobar que el HTML contiene los elementos requeridos.
    const gco_elementosFaltantes = Object.entries(gco_elementos)
        .filter(([, gco_elemento]) => !gco_elemento)
        .map(([gco_nombre]) => gco_nombre);

    if (gco_elementosFaltantes.length > 0) {
        console.error(
            "No se pudo inicializar el módulo de clientes. Faltan elementos HTML:",
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

    const gco_modalCliente = window.bootstrap.Modal.getOrCreateInstance(
        gco_elementos.modal,
    );

    // No permitir abrir el formulario hasta haber consultado los registros
    // existentes. Así las validaciones de duplicados trabajan con datos cargados.
    gco_elementos.btnNuevoCliente.disabled = true;

    // Evitar cerrar el modal mientras una solicitud de guardado está pendiente.
    gco_elementos.modal.addEventListener("hide.bs.modal", (gco_evento) => {
        if (gco_guardadoEnCurso) {
            gco_evento.preventDefault();
        }
    });

    // ========================================
    // CERRAR SESIÓN
    // ========================================

    gco_elementos.btnCerrarSesion.addEventListener("click", () => {
        sessionStorage.removeItem("gco_sesionActiva");
        window.location.replace("login.html");
    });

    // ========================================
    // ESTADOS DE LA TABLA E INDICADORES
    // ========================================

    // Mostrar un mensaje mientras se consulta la API.
    function gco_mostrarEstadoCarga() {
        const gco_fila = document.createElement("tr");
        const gco_celda = document.createElement("td");

        gco_celda.colSpan = 6;
        gco_celda.className = "empty-table";
        gco_celda.textContent = "Cargando clientes...";

        gco_fila.appendChild(gco_celda);
        gco_elementos.tabla.replaceChildren(gco_fila);

        gco_elementos.indicadorTotal.textContent = "—";
        gco_elementos.indicadorActivos.textContent = "—";
        gco_elementos.indicadorInactivos.textContent = "—";
    }

    // Actualizar la tabla y los tres indicadores de administración.
    function gco_actualizarInterfazClientes() {
        gco_aplicarFiltrosClientes();
        gco_actualizarIndicadoresClientes(gco_clientes);
    }

    // ========================================
    // BÚSQUEDA Y FILTRO DE CLIENTES
    // ========================================

    function gco_aplicarFiltrosClientes() {
        const gco_terminoBusqueda = gco_elementos.buscar.value
            .trim()
            .toLocaleLowerCase("es-CO");

        const gco_estadoSeleccionado = gco_elementos.filtroEstado.value;

        // Aplicar los filtros sobre la colección original sin modificarla.
        const gco_clientesFiltrados = gco_clientes.filter((gco_cliente) => {
            const gco_nombre = String(
                gco_cliente.nombre_razon_social ?? "",
            ).toLocaleLowerCase("es-CO");

            const gco_tipoDocumento = String(
                gco_cliente.tipo_documento ?? "",
            ).toLocaleLowerCase("es-CO");

            const gco_numeroDocumento = String(
                gco_cliente.numero_documento ?? "",
            ).toLocaleLowerCase("es-CO");

            const gco_idCliente = String(
                gco_cliente.cliente_id ?? gco_cliente.id ?? "",
            ).toLocaleLowerCase("es-CO");

            const gco_coincideBusqueda =
                gco_nombre.includes(gco_terminoBusqueda) ||
                gco_tipoDocumento.includes(gco_terminoBusqueda) ||
                gco_numeroDocumento.includes(gco_terminoBusqueda) ||
                gco_idCliente.includes(gco_terminoBusqueda);

            let gco_coincideEstado = true;

            if (gco_estadoSeleccionado === "ACTIVOS") {
                gco_coincideEstado = gco_cliente.activo === true;
            } else if (gco_estadoSeleccionado === "INACTIVOS") {
                gco_coincideEstado = gco_cliente.activo === false;
            }

            return gco_coincideBusqueda && gco_coincideEstado;
        });

        gco_mostrarTablaClientes(gco_clientesFiltrados);
    }

    gco_elementos.buscar.addEventListener(
        "input",
        gco_aplicarFiltrosClientes,
    );

    gco_elementos.filtroEstado.addEventListener(
        "change",
        gco_aplicarFiltrosClientes,
    );

    // ========================================
    // MOSTRAR Y OCULTAR TABLA DE CLIENTES
    // ========================================

    gco_elementos.btnAlternarTabla.addEventListener("click", () => {
        const gco_tablaVisible = !gco_elementos.contenedorTabla.hidden;

        // Cambiar la visibilidad del contenedor sin detener los filtros.
        gco_elementos.contenedorTabla.hidden = gco_tablaVisible;

        // Actualizar el texto del botón.
        gco_elementos.btnAlternarTabla.textContent = gco_tablaVisible
            ? "Mostrar tabla de clientes"
            : "Ocultar tabla de clientes";

        // Mantener sincronizado el estado de accesibilidad.
        gco_elementos.btnAlternarTabla.setAttribute(
            "aria-expanded",
            String(!gco_tablaVisible),
        );
    });

    // ========================================
    // CONTROLAR LOS CAMPOS DEL CLIENTE GENÉRICO
    // ========================================

    function gco_actualizarCamposDocumentoCliente() {
        const gco_esGenerico = gco_elementos.esGenerico.checked;

        // No permitir un segundo cliente genérico.
        const gco_existeOtroGenerico = gco_clientes.some((gco_cliente) => {
            const gco_idRegistrado =
                gco_cliente.cliente_id ?? gco_cliente.id;

            return (
                gco_cliente.es_generico === true &&
                String(gco_idRegistrado) !== String(gco_clienteEnEdicion)
            );
        });

        gco_elementos.esGenerico.disabled =
            gco_clienteGenericoEnEdicion || gco_existeOtroGenerico;

        // El cliente genérico tiene nombre fijo y no utiliza documento.
        gco_elementos.nombre.readOnly = gco_esGenerico;
        gco_elementos.tipoDocumento.disabled = gco_esGenerico;
        gco_elementos.numeroDocumento.disabled = gco_esGenerico;

        gco_elementos.tipoDocumento.required = !gco_esGenerico;
        gco_elementos.numeroDocumento.required = !gco_esGenerico;

        if (gco_esGenerico) {
            gco_elementos.nombre.value = "Consumidor final";
            gco_elementos.tipoDocumento.value = "";
            gco_elementos.numeroDocumento.value = "";
            gco_elementos.activo.checked = true;
            gco_elementos.activo.disabled = true;
        } else {
            gco_elementos.activo.disabled = false;
        }
    }

    gco_elementos.esGenerico.addEventListener("change", () => {
        // Si se desmarca la opción genérica durante un registro nuevo,
        // dejar los campos listos para ingresar los datos de identificación.
        if (
            !gco_elementos.esGenerico.checked &&
            gco_clienteEnEdicion === null &&
            gco_elementos.nombre.value === "Consumidor final"
        ) {
            gco_elementos.nombre.value = "";
        }

        gco_actualizarCamposDocumentoCliente();
    });

    // ========================================
    // RESTABLECER EL FORMULARIO
    // ========================================

    function gco_restaurarFormularioCliente() {
        gco_elementos.formulario.reset();

        gco_clienteEnEdicion = null;
        gco_clienteGenericoEnEdicion = false;
        gco_guardadoEnCurso = false;

        gco_elementos.tituloModal.textContent = "Nuevo cliente";
        gco_elementos.btnGuardar.textContent = "Guardar cliente";
        gco_elementos.btnGuardar.disabled = false;

        gco_actualizarCamposDocumentoCliente();
    }

    // Preparar el modal para crear un cliente nuevo.
    gco_elementos.btnNuevoCliente.addEventListener("click", () => {
        gco_restaurarFormularioCliente();
    });

    // Limpiar el estado al cerrar el modal mediante Cancelar, X o Escape.
    gco_elementos.modal.addEventListener(
        "hidden.bs.modal",
        gco_restaurarFormularioCliente,
    );

    // ========================================
    // VALIDAR DOCUMENTO DUPLICADO
    // ========================================

    function gco_existeDocumentoDuplicado(
        gco_tipoDocumento,
        gco_numeroDocumento,
    ) {
        return gco_clientes.some((gco_cliente) => {
            const gco_idRegistrado =
                gco_cliente.cliente_id ?? gco_cliente.id;

            const gco_mismoTipo =
                String(gco_cliente.tipo_documento ?? "")
                    .trim()
                    .toUpperCase() === gco_tipoDocumento;

            const gco_mismoNumero =
                String(gco_cliente.numero_documento ?? "").trim() ===
                gco_numeroDocumento;

            const gco_esOtroCliente =
                String(gco_idRegistrado) !== String(gco_clienteEnEdicion);

            return (
                gco_cliente.es_generico !== true &&
                gco_mismoTipo &&
                gco_mismoNumero &&
                gco_esOtroCliente
            );
        });
    }

    // ========================================
    // REGISTRAR O ACTUALIZAR CLIENTES
    // ========================================

    gco_elementos.formulario.addEventListener(
        "submit",
        async (gco_evento) => {
            gco_evento.preventDefault();

            if (gco_guardadoEnCurso) {
                return;
            }

            const gco_esEdicion = gco_clienteEnEdicion !== null;
            const gco_idEnEdicion = gco_clienteEnEdicion;

            // Protección adicional del cliente genérico.
            if (gco_esEdicion && gco_clienteGenericoEnEdicion) {
                window.alert("El cliente genérico está protegido.");
                return;
            }

            // Validar los campos habilitados del formulario.
            if (!gco_elementos.formulario.checkValidity()) {
                gco_elementos.formulario.reportValidity();
                return;
            }

            const gco_esGenerico = gco_elementos.esGenerico.checked;

            const gco_nombreValidado = gco_elementos.nombre.value.trim();
            const gco_tipoDocumentoValidado = gco_elementos.tipoDocumento.value
                .trim()
                .toUpperCase();
            const gco_documentoValidado =
                gco_elementos.numeroDocumento.value.trim();

            // Validar nombre y documento de clientes identificados.
            if (!gco_esGenerico && !gco_nombreValidado) {
                window.alert("Ingresa un nombre o razón social válido.");
                gco_elementos.nombre.focus();
                return;
            }

            if (!gco_esGenerico && !gco_documentoValidado) {
                window.alert("Ingresa un número de documento válido.");
                gco_elementos.numeroDocumento.focus();
                return;
            }

            // Impedir la creación de más de un cliente genérico.
            const gco_genericoDuplicado =
                gco_esGenerico &&
                gco_clientes.some((gco_cliente) => {
                    const gco_idRegistrado =
                        gco_cliente.cliente_id ?? gco_cliente.id;

                    return (
                        gco_cliente.es_generico === true &&
                        String(gco_idRegistrado) !== String(gco_idEnEdicion)
                    );
                });

            if (gco_genericoDuplicado) {
                window.alert("Ya existe un cliente genérico registrado.");
                return;
            }

            // Evitar documentos duplicados, incluidos los de clientes inactivos.
            if (
                !gco_esGenerico &&
                gco_existeDocumentoDuplicado(
                    gco_tipoDocumentoValidado,
                    gco_documentoValidado,
                )
            ) {
                window.alert(
                    "Ya existe un cliente registrado con este tipo y número de documento.",
                );
                gco_elementos.numeroDocumento.focus();
                return;
            }

            // Recuperar el registro original cuando se está editando.
            let gco_clienteOriginal = null;
            let gco_indiceCliente = -1;

            if (gco_esEdicion) {
                gco_indiceCliente = gco_clientes.findIndex((gco_cliente) => {
                    const gco_idRegistrado =
                        gco_cliente.cliente_id ?? gco_cliente.id;

                    return String(gco_idRegistrado) === String(gco_idEnEdicion);
                });

                if (gco_indiceCliente === -1) {
                    window.alert(
                        "No se encontró el cliente que deseas actualizar. Recarga la página e inténtalo nuevamente.",
                    );
                    return;
                }

                gco_clienteOriginal = gco_clientes[gco_indiceCliente];

                // Verificar nuevamente que el registro original no sea genérico.
                if (gco_clienteOriginal.es_generico === true) {
                    window.alert("El cliente genérico está protegido.");
                    return;
                }
            }

            // Construir el objeto con los campos del modelo de clientes.
            const gco_datosCliente = {
                negocio_id: gco_clienteOriginal?.negocio_id ?? 1,
                tipo_documento: gco_esGenerico
                    ? null
                    : gco_tipoDocumentoValidado,
                numero_documento: gco_esGenerico
                    ? null
                    : gco_documentoValidado,
                nombre_razon_social: gco_esGenerico
                    ? "Consumidor final"
                    : gco_nombreValidado,
                activo: gco_esGenerico ? true : gco_elementos.activo.checked,
                es_generico: gco_esGenerico,
            };

            gco_guardadoEnCurso = true;
            gco_elementos.btnGuardar.disabled = true;
            gco_elementos.btnGuardar.textContent = gco_esEdicion
                ? "Guardando cambios..."
                : "Guardando...";

            try {
                let gco_clienteGuardado;

                if (gco_esEdicion) {
                    // PUT: actualizar el registro existente.
                    const gco_urlCliente =
                        `${gco_apiClientes}/${encodeURIComponent(gco_idEnEdicion)}`;

                    gco_clienteGuardado = await gco_actualizarAPI(
                        gco_urlCliente,
                        gco_datosCliente,
                    );

                    // Conservar atributos originales y aplicar los datos devueltos.
                    gco_clientes[gco_indiceCliente] = {
                        ...gco_clienteOriginal,
                        ...gco_datosCliente,
                        ...gco_clienteGuardado,
                    };
                } else {
                    // POST: crear un registro nuevo.
                    gco_clienteGuardado = await gco_crearAPI(
                        gco_apiClientes,
                        gco_datosCliente,
                    );

                    gco_clientes.push({
                        ...gco_datosCliente,
                        ...gco_clienteGuardado,
                    });
                }

                // Actualizar únicamente la tabla y los indicadores de Clientes.
                gco_actualizarInterfazClientes();

                console.log(
                    gco_esEdicion
                        ? "Cliente actualizado correctamente:"
                        : "Cliente registrado correctamente:",
                    gco_clienteGuardado,
                );

                // Liberar la operación y limpiar el estado antes de cerrar el modal.
                gco_guardadoEnCurso = false;
                gco_clienteEnEdicion = null;
                gco_clienteGenericoEnEdicion = false;

                gco_modalCliente.hide();

                window.alert(
                    gco_esEdicion
                        ? "Cliente actualizado correctamente."
                        : "Cliente registrado correctamente.",
                );
            } catch (gco_error) {
                console.error(
                    gco_esEdicion
                        ? "No fue posible actualizar el cliente:"
                        : "No fue posible registrar el cliente:",
                    gco_error,
                );

                window.alert(
                    gco_esEdicion
                        ? "No fue posible actualizar el cliente. Verifica la conexión e inténtalo nuevamente."
                        : "No fue posible registrar el cliente. Verifica la conexión e inténtalo nuevamente.",
                );
            } finally {
                gco_guardadoEnCurso = false;
                gco_elementos.btnGuardar.disabled = false;
                gco_elementos.btnGuardar.textContent =
                    gco_clienteEnEdicion !== null
                        ? "Guardar cambios"
                        : "Guardar cliente";
            }
        },
    );

    // ========================================
    // EDITAR Y CAMBIAR ESTADO DE CLIENTES
    // ========================================

    gco_elementos.tabla.addEventListener("click", async (gco_evento) => {
        const gco_objetivo = gco_evento.target;

        if (!(gco_objetivo instanceof Element)) {
            return;
        }

        const gco_botonAccion = gco_objetivo.closest("[data-accion]");

        if (
            !gco_botonAccion ||
            !gco_elementos.tabla.contains(gco_botonAccion)
        ) {
            return;
        }

        const gco_accion = gco_botonAccion.dataset.accion;
        const gco_clienteId = gco_botonAccion.dataset.clienteId;

        const gco_clienteSeleccionado = gco_clientes.find((gco_cliente) => {
            const gco_idRegistrado =
                gco_cliente.cliente_id ?? gco_cliente.id;

            return String(gco_idRegistrado) === String(gco_clienteId);
        });

        if (!gco_clienteSeleccionado) {
            console.error("No se encontró el cliente seleccionado.");
            return;
        }

        // ----------------------------------------
        // EDITAR CLIENTE
        // ----------------------------------------

        if (gco_accion === "editar-cliente") {
            // Protección del registro genérico.
            if (gco_clienteSeleccionado.es_generico === true) {
                window.alert("El cliente genérico está protegido.");
                return;
            }

            gco_clienteEnEdicion =
                gco_clienteSeleccionado.cliente_id ??
                gco_clienteSeleccionado.id;

            gco_clienteGenericoEnEdicion = false;

            gco_elementos.formulario.reset();

            gco_elementos.nombre.value =
                gco_clienteSeleccionado.nombre_razon_social ?? "";
            gco_elementos.tipoDocumento.value =
                gco_clienteSeleccionado.tipo_documento ?? "";
            gco_elementos.numeroDocumento.value =
                gco_clienteSeleccionado.numero_documento ?? "";
            gco_elementos.esGenerico.checked = false;
            gco_elementos.activo.checked =
                gco_clienteSeleccionado.activo === true;

            gco_elementos.tituloModal.textContent = "Editar cliente";
            gco_elementos.btnGuardar.textContent = "Guardar cambios";
            gco_elementos.btnGuardar.disabled = false;

            gco_actualizarCamposDocumentoCliente();
            gco_modalCliente.show();

            return;
        }

        // ----------------------------------------
        // ACTIVAR O INACTIVAR CLIENTE
        // ----------------------------------------

        if (gco_accion === "cambiar-estado-cliente") {
            // El cliente genérico nunca puede cambiar de estado.
            if (gco_clienteSeleccionado.es_generico === true) {
                console.warn("El cliente genérico está protegido.");
                return;
            }

            const gco_nuevoEstado =
                gco_clienteSeleccionado.activo !== true;

            const gco_accionEstado = gco_nuevoEstado
                ? "activar"
                : "inactivar";

            const gco_confirmacion = window.confirm(
                `¿Confirmas que deseas ${gco_accionEstado} al cliente "${gco_clienteSeleccionado.nombre_razon_social}"?`,
            );

            if (!gco_confirmacion) {
                return;
            }

            // Evitar solicitudes simultáneas sobre el mismo botón.
            gco_botonAccion.disabled = true;
            gco_botonAccion.textContent = "Actualizando...";

            try {
                const gco_urlCliente =
                    `${gco_apiClientes}/${encodeURIComponent(gco_clienteId)}`;

                // PUT: actualizar solamente el estado lógico del cliente.
                const gco_clienteActualizado = await gco_actualizarAPI(
                    gco_urlCliente,
                    { activo: gco_nuevoEstado },
                );

                const gco_indiceCliente = gco_clientes.findIndex(
                    (gco_cliente) => {
                        const gco_idRegistrado =
                            gco_cliente.cliente_id ?? gco_cliente.id;

                        return String(gco_idRegistrado) === String(gco_clienteId);
                    },
                );

                if (gco_indiceCliente === -1) {
                    throw new Error(
                        "El cliente actualizado no se encontró en la colección local.",
                    );
                }

                gco_clientes[gco_indiceCliente] = {
                    ...gco_clientes[gco_indiceCliente],
                    ...gco_clienteActualizado,
                    activo: gco_nuevoEstado,
                };

                gco_actualizarInterfazClientes();

                console.log(
                    `Cliente ${gco_accionEstado} correctamente:`,
                    gco_clientes[gco_indiceCliente],
                );
            } catch (gco_error) {
                console.error(
                    "No fue posible actualizar el estado del cliente:",
                    gco_error,
                );

                window.alert(
                    "No fue posible actualizar el cliente. Verifica la conexión e inténtalo nuevamente.",
                );

                // Volver a dibujar la tabla para restaurar el botón y su estado.
                gco_aplicarFiltrosClientes();
            }
        }
    });

    // ========================================
    // CONSULTAR CLIENTES DESDE MOCKAPI
    // ========================================

    async function gco_cargarClientes() {
        try {
            const gco_respuesta = await gco_consultarAPI(gco_apiClientes);

            // Validación adicional del contrato de respuesta.
            if (!Array.isArray(gco_respuesta)) {
                throw new Error("La API no devolvió una lista de clientes válida.");
            }

            gco_clientes = gco_respuesta;
            gco_elementos.btnNuevoCliente.disabled = false;
            gco_elementos.btnNuevoCliente.removeAttribute("title");

            gco_actualizarInterfazClientes();

            console.log(
                "Clientes consultados correctamente:",
                gco_clientes.length,
            );
        } catch (gco_error) {
            console.error(
                "No se pudieron cargar los clientes:",
                gco_error,
            );

            gco_mostrarErrorTablaClientes();
            gco_elementos.btnNuevoCliente.disabled = true;
            gco_elementos.btnNuevoCliente.title =
                "No es posible registrar clientes hasta cargar la información existente.";

            gco_elementos.indicadorTotal.textContent = "—";
            gco_elementos.indicadorActivos.textContent = "—";
            gco_elementos.indicadorInactivos.textContent = "—";
        }
    }

    // Mostrar el estado inicial e iniciar la consulta.
    gco_mostrarEstadoCarga();
    gco_restaurarFormularioCliente();
    gco_cargarClientes();
}
