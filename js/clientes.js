import { verificarSesion } from "./auth.js";

import {
    consultarAPI,
    actualizarAPI,
    crearAPI,
    apiClientes,
} from "./api.js";

import {
    mostrarTablaClientes,
    actualizarIndicadoresClientes,
    mostrarErrorTablaClientes,
} from "./ui.js";

//* ========================================
//* VARIABLES DEL MÓDULO DE CLIENTES
//* ========================================

// Colección completa de clientes recibidos desde MockAPI.
let clientes = [];

// Identificador del cliente que se encuentra en edición.
let clienteEnEdicion = null;

// Indica si el registro que se intenta editar es el cliente genérico.
let clienteGenericoEnEdicion = false;

// Evita que se envíen dos operaciones de guardado simultáneamente.
let guardadoEnCurso = false;

//* ========================================
//* VERIFICAR AUTORIZACIÓN DE ACCESO
//* ========================================

const accesoAutorizado = verificarSesion();

if (accesoAutorizado) {
    inicializarModuloClientes();
}

//* ========================================
//* INICIALIZAR MÓDULO DE CLIENTES
//* ========================================

function inicializarModuloClientes() {

    // Seleccionar los elementos de la página.
    const elementos = {
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

    //* ========================================
    //* VALIDAR ELEMENTOS DEL HTML
    //* ========================================

    // Comprobar que el HTML contiene los elementos requeridos.
    const elementosFaltantes = Object.entries(elementos)
        .filter(([, elemento]) => !elemento)
        .map(([nombre]) => nombre);

    if (elementosFaltantes.length > 0) {

        console.error(
            "No se pudo inicializar el módulo de clientes. Faltan elementos HTML:",
            elementosFaltantes,
        );

        return;
    }

    //* ========================================
    //* VALIDAR DISPONIBILIDAD DE BOOTSTRAP
    //* ========================================

    // Comprobar que Bootstrap esté disponible para controlar el modal.
    if (!window.bootstrap?.Modal) {

        console.error(
            "Bootstrap Modal no está disponible. Verifica la carga de bootstrap.bundle.min.js.",
        );

        return;
    }

    const modalCliente = window.bootstrap.Modal.getOrCreateInstance(
        elementos.modal,
    );

    //* ========================================
    //* CONFIGURACIÓN INICIAL DEL FORMULARIO
    //* ========================================

    // No permitir abrir el formulario hasta haber consultado los registros
    // existentes. Así las validaciones de duplicados trabajan con datos cargados.
    elementos.btnNuevoCliente.disabled = true;

    // Evitar cerrar el modal mientras una solicitud de guardado está pendiente.
    elementos.modal.addEventListener("hide.bs.modal", (evento) => {

        if (guardadoEnCurso) {
            evento.preventDefault();
        }

    });

    //* ========================================
    //* CERRAR SESIÓN
    //* ========================================

    elementos.btnCerrarSesion.addEventListener("click", () => {

        sessionStorage.removeItem("sesionActiva");

        window.location.replace("login.html");

    });

    //* ========================================
    //* ESTADOS DE LA TABLA E INDICADORES
    //* ========================================

    // Mostrar un mensaje mientras se consulta la API.
    function mostrarEstadoCarga() {

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.className = "empty-table";
        celda.textContent = "Cargando clientes...";

        fila.appendChild(celda);
        elementos.tabla.replaceChildren(fila);

        elementos.indicadorTotal.textContent = "—";
        elementos.indicadorActivos.textContent = "—";
        elementos.indicadorInactivos.textContent = "—";

    }

    // Actualizar la tabla y los tres indicadores de administración.
    function actualizarInterfazClientes() {

        aplicarFiltrosClientes();

        actualizarIndicadoresClientes(clientes);

    }

    //* ========================================
    //* BÚSQUEDA Y FILTRO DE CLIENTES
    //* ========================================

    function aplicarFiltrosClientes() {

        const terminoBusqueda = elementos.buscar.value
            .trim()
            .toLocaleLowerCase("es-CO");

        const estadoSeleccionado = elementos.filtroEstado.value;

        // Aplicar los filtros sobre la colección original sin modificarla.
        const clientesFiltrados = clientes.filter((cliente) => {

            const nombre = String(
                cliente.nombre_razon_social ?? "",
            ).toLocaleLowerCase("es-CO");

            const tipoDocumento = String(
                cliente.tipo_documento ?? "",
            ).toLocaleLowerCase("es-CO");

            const numeroDocumento = String(
                cliente.numero_documento ?? "",
            ).toLocaleLowerCase("es-CO");

            const idCliente = String(
                cliente.cliente_id ?? cliente.id ?? "",
            ).toLocaleLowerCase("es-CO");

            const coincideBusqueda =
                nombre.includes(terminoBusqueda) ||
                tipoDocumento.includes(terminoBusqueda) ||
                numeroDocumento.includes(terminoBusqueda) ||
                idCliente.includes(terminoBusqueda);

            let coincideEstado = true;

            if (estadoSeleccionado === "ACTIVOS") {

                coincideEstado = cliente.activo === true;

            } else if (estadoSeleccionado === "INACTIVOS") {

                coincideEstado = cliente.activo === false;

            }

            return coincideBusqueda && coincideEstado;

        });

        mostrarTablaClientes(clientesFiltrados);

    }


    elementos.buscar.addEventListener(
        "input",
        aplicarFiltrosClientes,
    );

    elementos.filtroEstado.addEventListener(
        "change",
        aplicarFiltrosClientes,
    );

    //* ========================================
    //* MOSTRAR Y OCULTAR TABLA DE CLIENTES
    //* ========================================

    elementos.btnAlternarTabla.addEventListener("click", () => {

        const tablaVisible = !elementos.contenedorTabla.hidden;

        // Cambiar la visibilidad del contenedor sin detener los filtros.
        elementos.contenedorTabla.hidden = tablaVisible;

        // Actualizar el texto del botón.
        elementos.btnAlternarTabla.textContent = tablaVisible
            ? "Mostrar tabla de clientes"
            : "Ocultar tabla de clientes";

        // Mantener sincronizado el estado de accesibilidad.
        elementos.btnAlternarTabla.setAttribute(
            "aria-expanded",
            String(!tablaVisible),
        );

    });

    //* ========================================
    //* CONTROLAR LOS CAMPOS DEL CLIENTE GENÉRICO
    //* ========================================

    function actualizarCamposDocumentoCliente() {

        const esGenerico = elementos.esGenerico.checked;

        // No permitir un segundo cliente genérico.
        const existeOtroGenerico = clientes.some((cliente) => {

            const idRegistrado =
                cliente.cliente_id ?? cliente.id;

            return (
                cliente.es_generico === true &&
                String(idRegistrado) !== String(clienteEnEdicion)
            );

        });

        elementos.esGenerico.disabled =
            clienteGenericoEnEdicion || existeOtroGenerico;

        // El cliente genérico tiene nombre fijo y no utiliza documento.
        elementos.nombre.readOnly = esGenerico;

        elementos.tipoDocumento.disabled = esGenerico;

        elementos.numeroDocumento.disabled = esGenerico;

        elementos.tipoDocumento.required = !esGenerico;

        elementos.numeroDocumento.required = !esGenerico;

        if (esGenerico) {

            elementos.nombre.value = "Consumidor final";

            elementos.tipoDocumento.value = "";

            elementos.numeroDocumento.value = "";

            elementos.activo.checked = true;

            elementos.activo.disabled = true;

        } else {

            elementos.activo.disabled = false;

        }

    }

    elementos.esGenerico.addEventListener("change", () => {

        // Si se desmarca la opción genérica durante un registro nuevo,
        // dejar los campos listos para ingresar los datos de identificación.
        if (
            !elementos.esGenerico.checked &&
            clienteEnEdicion === null &&
            elementos.nombre.value === "Consumidor final"
        ) {

            elementos.nombre.value = "";

        }

        actualizarCamposDocumentoCliente();

    });

    //* ========================================
    //* RESTABLECER EL FORMULARIO
    //* ========================================

    function restaurarFormularioCliente() {

        elementos.formulario.reset();

        clienteEnEdicion = null;

        clienteGenericoEnEdicion = false;

        guardadoEnCurso = false;

        elementos.tituloModal.textContent = "Nuevo cliente";

        elementos.btnGuardar.textContent = "Guardar cliente";

        elementos.btnGuardar.disabled = false;

        actualizarCamposDocumentoCliente();

    }

    // Preparar el modal para crear un cliente nuevo.
    elementos.btnNuevoCliente.addEventListener("click", () => {

        restaurarFormularioCliente();

    });


    // Limpiar el estado al cerrar el modal mediante Cancelar, X o Escape.
    elementos.modal.addEventListener(
        "hidden.bs.modal",
        restaurarFormularioCliente,
    );

    //* ========================================
    //* VALIDAR DOCUMENTO DUPLICADO
    //* ========================================

    function existeDocumentoDuplicado(
        tipoDocumento,
        numeroDocumento,
    ) {

        return clientes.some((cliente) => {

            const idRegistrado =
                cliente.cliente_id ?? cliente.id;

            const mismoTipo =
                String(cliente.tipo_documento ?? "")
                    .trim()
                    .toUpperCase() === tipoDocumento;

            const mismoNumero =
                String(cliente.numero_documento ?? "").trim() ===
                numeroDocumento;

            const esOtroCliente =
                String(idRegistrado) !== String(clienteEnEdicion);

            return (
                cliente.es_generico !== true &&
                mismoTipo &&
                mismoNumero &&
                esOtroCliente
            );

        });

    }

    //* ========================================
    //* REGISTRAR O ACTUALIZAR CLIENTES
    //* ========================================

    elementos.formulario.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            if (guardadoEnCurso) {
                return;
            }

            const esEdicion = clienteEnEdicion !== null;

            const idEnEdicion = clienteEnEdicion;


            // Protección adicional del cliente genérico.
            if (esEdicion && clienteGenericoEnEdicion) {

                window.alert("El cliente genérico está protegido.");

                return;

            }

            // Validar los campos habilitados del formulario.
            if (!elementos.formulario.checkValidity()) {

                elementos.formulario.reportValidity();

                return;

            }


            const esGenerico = elementos.esGenerico.checked;

            const nombreValidado = elementos.nombre.value.trim();

            const tipoDocumentoValidado = elementos.tipoDocumento.value
                .trim()
                .toUpperCase();

            const documentoValidado =
                elementos.numeroDocumento.value.trim();


            // Validar nombre y documento de clientes identificados.
            if (!esGenerico && !nombreValidado) {

                window.alert("Ingresa un nombre o razón social válido.");

                elementos.nombre.focus();

                return;

            }

            if (!esGenerico && !documentoValidado) {

                window.alert("Ingresa un número de documento válido.");

                elementos.numeroDocumento.focus();

                return;

            }


            // Impedir la creación de más de un cliente genérico.
            const genericoDuplicado =
                esGenerico &&
                clientes.some((cliente) => {

                    const idRegistrado =
                        cliente.cliente_id ?? cliente.id;

                    return (
                        cliente.es_generico === true &&
                        String(idRegistrado) !== String(idEnEdicion)
                    );

                });

            if (genericoDuplicado) {

                window.alert("Ya existe un cliente genérico registrado.");

                return;

            }

            // Evitar documentos duplicados, incluidos los de clientes inactivos.
            if (
                !esGenerico &&
                existeDocumentoDuplicado(
                    tipoDocumentoValidado,
                    documentoValidado,
                )
            ) {

                window.alert(
                    "Ya existe un cliente registrado con este tipo y número de documento.",
                );

                elementos.numeroDocumento.focus();

                return;

            }

            // Recuperar el registro original cuando se está editando.
            let clienteOriginal = null;

            let indiceCliente = -1;


            if (esEdicion) {

                indiceCliente = clientes.findIndex((cliente) => {

                    const idRegistrado =
                        cliente.cliente_id ?? cliente.id;

                    return String(idRegistrado) === String(idEnEdicion);

                });

                if (indiceCliente === -1) {

                    window.alert(
                        "No se encontró el cliente que deseas actualizar. Recarga la página e inténtalo nuevamente.",
                    );

                    return;

                }


                clienteOriginal = clientes[indiceCliente];


                // Verificar nuevamente que el registro original no sea genérico.
                if (clienteOriginal.es_generico === true) {

                    window.alert("El cliente genérico está protegido.");

                    return;

                }

            }

            // Construir el objeto con los campos del modelo de clientes.
            const datosCliente = {

                negocio_id: clienteOriginal?.negocio_id ?? 1,

                tipo_documento: esGenerico
                    ? null
                    : tipoDocumentoValidado,

                numero_documento: esGenerico
                    ? null
                    : documentoValidado,

                nombre_razon_social: esGenerico
                    ? "Consumidor final"
                    : nombreValidado,

                activo: esGenerico
                    ? true
                    : elementos.activo.checked,

                es_generico: esGenerico,

            };

            guardadoEnCurso = true;

            elementos.btnGuardar.disabled = true;

            elementos.btnGuardar.textContent = esEdicion
                ? "Guardando cambios..."
                : "Guardando...";

            try {

                let clienteGuardado;


                if (esEdicion) {

                    // PUT: actualizar el registro existente.
                    const urlCliente =
                        `${apiClientes}/${encodeURIComponent(idEnEdicion)}`;

                    clienteGuardado = await actualizarAPI(
                        urlCliente,
                        datosCliente,
                    );

                    // Conservar atributos originales y aplicar los datos devueltos.
                    clientes[indiceCliente] = {

                        ...clienteOriginal,

                        ...datosCliente,

                        ...clienteGuardado,

                    };


                } else {

                    // POST: crear un registro nuevo.
                    clienteGuardado = await crearAPI(
                        apiClientes,
                        datosCliente,
                    );

                    clientes.push({

                        ...datosCliente,

                        ...clienteGuardado,

                    });

                }

                // Actualizar únicamente la tabla y los indicadores de Clientes.
                actualizarInterfazClientes();


                console.log(
                    esEdicion
                        ? "Cliente actualizado correctamente:"
                        : "Cliente registrado correctamente:",
                    clienteGuardado,
                );

                // Liberar la operación y limpiar el estado antes de cerrar el modal.
                guardadoEnCurso = false;

                clienteEnEdicion = null;

                clienteGenericoEnEdicion = false;

                modalCliente.hide();


                window.alert(
                    esEdicion
                        ? "Cliente actualizado correctamente."
                        : "Cliente registrado correctamente.",
                );

            } catch (error) {

                console.error(
                    esEdicion
                        ? "No fue posible actualizar el cliente:"
                        : "No fue posible registrar el cliente:",
                    error,
                );

                window.alert(
                    esEdicion
                        ? "No fue posible actualizar el cliente. Verifica la conexión e inténtalo nuevamente."
                        : "No fue posible registrar el cliente. Verifica la conexión e inténtalo nuevamente.",
                );

            } finally {

                guardadoEnCurso = false;

                elementos.btnGuardar.disabled = false;

                elementos.btnGuardar.textContent =
                    clienteEnEdicion !== null
                        ? "Guardar cambios"
                        : "Guardar cliente";

            }

        },
    );

    //* ========================================
    //* EDITAR Y CAMBIAR ESTADO DE CLIENTES
    //* ========================================

    elementos.tabla.addEventListener("click", async (evento) => {

        const objetivo = evento.target;

        if (!(objetivo instanceof Element)) {
            return;
        }

        const botonAccion = objetivo.closest("[data-accion]");

        if (
            !botonAccion ||
            !elementos.tabla.contains(botonAccion)
        ) {
            return;
        }

        const accion = botonAccion.dataset.accion;

        const clienteId = botonAccion.dataset.clienteId;


        const clienteSeleccionado = clientes.find((cliente) => {

            const idRegistrado =
                cliente.cliente_id ?? cliente.id;

            return String(idRegistrado) === String(clienteId);

        });

        if (!clienteSeleccionado) {

            console.error("No se encontró el cliente seleccionado.");

            return;

        }

        //* ----------------------------------------
        //* EDITAR CLIENTE
        //* ----------------------------------------

        if (accion === "editar-cliente") {

            // Protección del registro genérico.
            if (clienteSeleccionado.es_generico === true) {

                window.alert("El cliente genérico está protegido.");

                return;

            }

            clienteEnEdicion =
                clienteSeleccionado.cliente_id ??
                clienteSeleccionado.id;

            clienteGenericoEnEdicion = false;

            elementos.formulario.reset();

            elementos.nombre.value =
                clienteSeleccionado.nombre_razon_social ?? "";

            elementos.tipoDocumento.value =
                clienteSeleccionado.tipo_documento ?? "";

            elementos.numeroDocumento.value =
                clienteSeleccionado.numero_documento ?? "";

            elementos.esGenerico.checked = false;

            elementos.activo.checked =
                clienteSeleccionado.activo === true;


            elementos.tituloModal.textContent = "Editar cliente";

            elementos.btnGuardar.textContent = "Guardar cambios";

            elementos.btnGuardar.disabled = false;


            actualizarCamposDocumentoCliente();

            modalCliente.show();

            return;

        }

        //* ----------------------------------------
        //* ACTIVAR O INACTIVAR CLIENTE
        //* ----------------------------------------

        if (accion === "cambiar-estado-cliente") {

            // El cliente genérico nunca puede cambiar de estado.
            if (clienteSeleccionado.es_generico === true) {

                console.warn("El cliente genérico está protegido.");

                return;

            }

            const nuevoEstado =
                clienteSeleccionado.activo !== true;

            const accionEstado = nuevoEstado
                ? "activar"
                : "inactivar";


            const confirmacion = window.confirm(
                `¿Confirmas que deseas ${accionEstado} al cliente "${clienteSeleccionado.nombre_razon_social}"?`,
            );

            if (!confirmacion) {
                return;
            }

            // Evitar solicitudes simultáneas sobre el mismo botón.
            botonAccion.disabled = true;

            botonAccion.textContent = "Actualizando...";

            try {

                const urlCliente =
                    `${apiClientes}/${encodeURIComponent(clienteId)}`;


                // PUT: actualizar solamente el estado lógico del cliente.
                const clienteActualizado = await actualizarAPI(
                    urlCliente,
                    { activo: nuevoEstado },
                );

                const indiceCliente = clientes.findIndex(
                    (cliente) => {

                        const idRegistrado =
                            cliente.cliente_id ?? cliente.id;

                        return String(idRegistrado) === String(clienteId);

                    },
                );

                if (indiceCliente === -1) {

                    throw new Error(
                        "El cliente actualizado no se encontró en la colección local.",
                    );

                }

                clientes[indiceCliente] = {

                    ...clientes[indiceCliente],

                    ...clienteActualizado,

                    activo: nuevoEstado,

                };

                actualizarInterfazClientes();

                console.log(
                    `Cliente ${accionEstado} correctamente:`,
                    clientes[indiceCliente],
                );

            } catch (error) {

                console.error(
                    "No fue posible actualizar el estado del cliente:",
                    error,
                );

                window.alert(
                    "No fue posible actualizar el cliente. Verifica la conexión e inténtalo nuevamente.",
                );

                // Volver a dibujar la tabla para restaurar el botón y su estado.
                aplicarFiltrosClientes();

            }

        }

    });

    //* ========================================
    //* CONSULTAR CLIENTES DESDE MOCKAPI
    //* ========================================

    async function cargarClientes() {

        try {

            const respuesta = await consultarAPI(apiClientes);

            // Validación adicional del contrato de respuesta.
            if (!Array.isArray(respuesta)) {

                throw new Error(
                    "La API no devolvió una lista de clientes válida.",
                );

            }

            clientes = respuesta;

            elementos.btnNuevoCliente.disabled = false;

            elementos.btnNuevoCliente.removeAttribute("title");

            actualizarInterfazClientes();

            console.log(
                "Clientes consultados correctamente:",
                clientes.length,
            );

        } catch (error) {

            console.error(
                "No se pudieron cargar los clientes:",
                error,
            );

            mostrarErrorTablaClientes();

            elementos.btnNuevoCliente.disabled = true;

            elementos.btnNuevoCliente.title =
                "No es posible registrar clientes hasta cargar la información existente.";

            elementos.indicadorTotal.textContent = "—";

            elementos.indicadorActivos.textContent = "—";

            elementos.indicadorInactivos.textContent = "—";

        }

    }

    //* ========================================
    //* INICIAR EL MÓDULO DE CLIENTES
    //* ========================================

    // Mostrar el estado inicial e iniciar la consulta.
    mostrarEstadoCarga();

    restaurarFormularioCliente();

    cargarClientes();

}