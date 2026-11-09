//* ========================================
//* CARGADOR DEL FOOTER DE FACTURATE
//* ========================================

class FacturateFooter extends HTMLElement {

    constructor() {

        super();

        this.footerYaCargado = false;

    }

    //* ========================================
    //* CARGAR COMPONENTE FOOTER
    //* ========================================

    async connectedCallback() {

        // Evitar realizar la misma petición más de una vez.
        if (this.footerYaCargado) {
            return;
        }

        this.footerYaCargado = true;

        try {

            // footer.js está dentro de /js.
            // El fragmento HTML se encuentra dentro de /componentes.
            const urlFooter = new URL(
                "../componentes/footer.html",
                import.meta.url
            );

            // Realizar petición para obtener el contenido del footer.
            const respuestaFooter = await fetch(urlFooter);

            // Comprobar respuesta HTTP.
            if (!respuestaFooter.ok) {

                throw new Error(
                    `No se pudo cargar el footer. HTTP ${respuestaFooter.status}.`
                );

            }

            // Convertir respuesta a texto HTML.
            const contenidoFooter = await respuestaFooter.text();

            // Insertar contenido dentro del componente.
            this.innerHTML = contenidoFooter;

        } catch (error) {

            console.error(
                "Error al cargar el footer de Facturate:",
                error
            );

            // Mostrar un aviso sin impedir que el resto de la página funcione.
            this.innerHTML = `
                <footer class="footer">
                    <div class="footer-copy">
                        <p role="alert">
                            No fue posible cargar la información del pie de página.
                        </p>
                    </div>
                </footer>
            `;

        }

    }

}

//* ========================================
//* REGISTRAR COMPONENTE FOOTER
//* ========================================

// Evitar registrar el mismo componente más de una vez.
if (!customElements.get("facturate-footer")) {

    customElements.define(
        "facturate-footer",
        FacturateFooter
    );

}