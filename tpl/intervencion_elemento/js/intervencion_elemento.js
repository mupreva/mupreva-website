/*global tstring, page_globals, SHOW_DEBUG, row_fields, common, page, forms, document, DocumentFragment, console, _form */
/*eslint no-undef: "error"*/
/*jshint esversion: 6 */
"use strict";

var item = {
    // section id
    section_id: null,

    // table (objects | pictures)
    table: null,

    // target DOM node
    target: null,

    // footer_info (default hidden)
    footer_info: null,

    /**
     * INIT
     * @return bool true
     */
    init: function (options) {
        const self = this;

        // options
        self.table = options.table; // string (objects / pictures)
        self.section_id = options.section_id; // int
        self.target = options.target; // DOM node

        // export_data_buttons (define before load_data to prepare the event subscribe)
        const export_data_buttons = page.render_export_data_buttons();

        // load and render
        self.load_data({}).then(function (response) {
            if (!response.result || response.result.length < 1) {
                self.target.innerHTML = `<div class="not_found">Sorry, record not available (${self.section_id})</div>`;
                console.warn("self.target:", self.target);
                return;
            }

            const data = page.parse_list_data(response.result);
            const row = data[0] || null;
            self.render({
                row: row,
                target: self.target,
            });
            // append export data buttons
            document
                .getElementById("export_data_container")
                .appendChild(export_data_buttons);

            viewInit();
        });


        return true;
    }, //end init

    /**
     * LOAD_DATA
     * @return promise
     */
    load_data: function (options) {
        const self = this;

        const default_fields = ["*"];

        // options
        const table = options.table || self.table;
        const section_id = options.section_id || self.section_id;
        const ar_fields = options.ar_fields || default_fields || ["*"];
        const lang = options.lang || page_globals.WEB_CURRENT_LANG_CODE;
        const sql_filter =
            options.filter || "section_id=" + parseInt(section_id);

        return new Promise(function (resolve) {
            // request
            const request_body = {
                dedalo_get: "records",
                db_name: page_globals.WEB_DB,
                table: table,
                ar_fields: ar_fields,
                lang: lang,
                sql_filter: sql_filter,
                limit: 1,
                count: false,
                // resolve_portals_custom : {
                // 	audiovisual :"audiovisual"
                // }
            };
            //if (table === 'sets') {
            request_body.resolve_portals_custom = {
                imagen_inicial: "image",
                imagen_final: "image",
                images: "image",
            };
            //}
            data_manager
                .request({
                    body: request_body,
                })
                .then((response) => {
                    //correccions de dades
                    const result = response.result.map(function (item) {
                        return item;
                    });
                    event_manager.publish("data_request_done", {
                        request_body: request_body,
                        result: result,
                    });

                    resolve(response);
                });
        });
    }, //end load_data

    absUrl: function (row) {
        return (
            page_globals.__WEB_MEDIA_BASE_URL__ +
            "/" +
            row.tpl +
            "/" +
            row.section_id
        );
    },

    templateShare: function (row) {
        const url = this.absUrl(row);
        const title = row.titulo;
        return htmlTemplate(`
<div class="has-text-right-tablet mb-3">
    <span class="simple-tooltip-container"><button type="button" class="js-tooltip button button--icon button--compartir" data-tooltip-prefix-class="simple-tooltip" data-tooltip-content-id="compartir" data-tooltip-title="Compartir URL" data-tooltip-close-text="${
        tstring.close
    }" id="label_tooltipnk434h0i7m">${tstring.share_title}</button></span>
    <div id="compartir" class="is-hidden">
        <div class="my-7 flow">
            <p>${tstring.share_copy_desc}</p>
            <button type="button" class="button button--copiar" data-copy-url="${url}">${
            tstring.share_copy_link
        }</button>
            <p class="copy-message"></p>
        </div>
        <div class="flow">
            <p>${tstring.share_other_desc}</p>
            <ul class="is-flex is-flex-wrap-wrap gap-3">
                <li>
                    <a href="https://twitter.com/intent/tweet?url=${encodeURI(
                        url
                    )}&text=${encodeURI(title)}" target="_blank">
                        <img src="/assets/img/ico-twitter.svg" alt="X" width="40" height="40">
                    </a>
                </li>
                <!-- li>
                    <a href="#" target="_blank">
                        <img src="/assets/img/ico-instagram.svg" alt="Instagram" width="44" height="44">
                    </a>
                </li -->
                <!-- li>
                    <a href="#" target="_blank">
                        <img src="/assets/img/ico-youtube.svg" alt="YouTube" width="44" height="44">
                    </a>
                </li -->
                <li>
                    <a href="https://www.facebook.com/sharer.php?u=${encodeURI(
                        url
                    )}" target="_blank">
                        <img src="/assets/img/ico-facebook.svg" alt="Facebook" width="40" height="40">
                    </a>
                </li>
            </ul>
        </div>
    </div>
</div>
        `);
    },

    datacion(row) {
        const datacion = [];
        if (row.datacion_ini) {
            datacion.push(row.datacion_ini);
        }
        if (row.datacion_fin) {
            datacion.push(row.datacion_fin);
        }
        return datacion;
    },

    templateFields: function (row) {
        var date = formatDateRange(
            row.time_frame,
            page_globals.WEB_CURRENT_LANG_CODE
        );

        return `
            ${
                row.intervention_type
                    ? `
            <dt><dt>${tstring.item_intervention_type}</dt></dt>
            <dd>${row.intervention_type}</dd>
            `
                    : ""
            }
            ${
                row.fecha_inicio && row.fecha_fin
                    ? `
            <dt>${tstring.item_restoration_date}</dt>
            <dd>${
                    row.fecha_inicio
                        ? `<time datetime="${
                                row.fecha_inicio
                            }">${formatDate(
                                row.fecha_inicio
                            )}</time>`
                        : ""
                }
                ${
                    row.fecha_fin
                        ? ` - <time datetime="${
                                row.fecha_fin
                            }">${formatDate(
                                row.fecha_fin
                            )}</time>`
                        : ""
            }</dd>
            `
                    : ""
            }
        `;
    },

    template: function (row) {
        const url = this.absUrl(row);
        const safeDesc = common.sanitizeTextBr(row.description) || row.description;

        return htmlTemplate(`
<div class="fitxa-intro columns is-variable is-8">
    <div class="column flow--l">
        ${
            row.titulo
                ? `
        <h1>${row.titulo}</h1>
        `
                : ""
        }
        <dl>
            ${this.templateFields(row)}
        </dl>

        <p> ${tstring.item_url_perm} <br>
            <a href="${url}">${url}</a>
        </p>

        <div class="mt-8">
            ${safeDesc}
        </div>
    </div>
    <div class="column is-1 is-hidden-touch is-hidden-desktop-only"></div>
    ${this.renderImages(row)}
</div>
        `);
    },

    renderExport: function () {
        return `
        <div class="column fullscreen__fullheight">
            <div id="export_data_container" class="is-flex is-justify-content-flex-end gap-4 mt-4">
            </div>
        </div>
        `;
    },

    renderImageButtons: function () {
        return `
            <button type="button" class="button button--icon image-action-zoom">
                <img src="/assets/img/ico-lupa-ampliar.svg" title="${tstring.item_image_zoom}" width="30" height="30">
            </button>
            <button type="button" class="button button--icon image-action-download">
                <img src="/assets/img/ico-descarregar.svg" title="${tstring.item_image_download}" width="30" height="30">
            </button>
            <button type="button" class="button button--icon is-hidden-mobile image-action-fullscreen">
                <img src="/assets/img/ico-pantalla-completa.svg" title="${tstring.item_image_fullscreen}" width="30" height="30">
            </button>
        `;
    },

    renderImages: function (row) {
        var images = [];
        if (row.imagen_inicial && row.imagen_inicial.length > 0) {
            images = images.concat(row.imagen_inicial);
        }
        if (row.imagen_final && row.imagen_final.length > 0) {
            images = images.concat(row.imagen_final);
        }
        if (row.images && row.images.length > 0) {
            images = images.concat(row.images);
        }
        if (images.length === 1) {
            const image = images[0];
            const imageFileName = image.image.split("/").pop();
            // una imatge
            return `
            <div class="images-group fullscreen__fullheight column is-7-tablet is-half-desktop">
                <figure class="fullscreen__content fullscreen__content--3 has-text-left">
                    <img loading="lazy" class="active image-zoom" src="${
                        __WEB_MEDIA_ENGINE_URL__ + image.image
                    }" data-original="${
                __WEB_MEDIA_ENGINE_URL__ + imgOriginal(image.image)
            }" alt="${image.title}" data-caption="${image.photographer ? image.photographer : imageFileName}">
                    <div class="btns is-flex is-justify-content-flex-end gap-5 mt-1">
                        ${this.renderImageButtons()}
                    </div>
                </figure>
                ${this.renderExport()}
            </div>
            `;
        } else if (images.length > 1) {
            //multiples imatges
            return `
            <div class="images-group fullscreen__fullheight column is-7-tablet is-half-desktop">
                <!-- Slider -->
                <div class="fullscreen__content fullscreen__content--1 swiper swiper--fitxa">
                    <div class="swiper-wrapper">
                        ${images
                            .map(function (image) {
                                const imageFileName = image.image.split("/").pop();
                                return `
                                <div class="swiper-slide">
                                    <img src="${
                                        __WEB_MEDIA_ENGINE_URL__ + image.image
                                    }" data-original="${__WEB_MEDIA_ENGINE_URL__ + imgOriginal(image.image)}" class="image-zoom" alt="${image.title ? image.title : ""}" data-caption="${image.photographer ? image.photographer : imageFileName}">
                                </div>
                            `;
                            })
                            .join("")}
                    </div>
                </div>
                <!-- Eines -->
                <div class="is-flex is-justify-content-center gap-7 is-relative py-4" style="height: 60px;">
                    <!-- fletxes -->
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-button-next"></div>
                    <!-- /fletxes -->
                    <div class="btns is-flex gap-5">
                        ${this.renderImageButtons()}
                    </div>
                </div>
                <!-- /Eines -->
                <div class="swiper swiper--thumbs">
                    <div class="swiper-wrapper">
                        ${images
                            .map(function (image) {
                                return `
                                <div class="swiper-slide">
                                    <img src="${
                                        __WEB_MEDIA_ENGINE_URL__ + image.image
                                    }" alt="${image.title ? image.title : ""}">
                                </div>
                            `;
                            })
                            .join("")}
                    </div>
                </div>
                <!-- /Slider -->
                ${this.renderExport()}
            </div>
            `;
        } else {
            //no imatge
            return this.renderExport(row);
        }
    },

    templateInfo: function (row) {
        if (!row.description || row.description == "") {
            return null;
        }
        const safeDesc = common.sanitizeTextBr(row.description) || row.description;
        return htmlTemplate(`
            <h2 class="accordion-header">
                <button type="button">${tstring.item_general_info}</button>
            </h2>
            <div class="accordion-content block-dedalo">
                <div class="accordion accordion--secondary">
                ${safeDesc}
                </div>
            </div>
        `);
    },


    /**
     * RENDER
     * @return promise
     */
    render: function (options) {
        const self = this;

        const target = options.target;
        const row = options.row;

        const dedalo_logged = typeof document!=='undefined' && document.cookie.indexOf('dedalo_logged')!==-1 ? true : false;

        if (dedalo_logged === true) {
            const dedalo_link = common.create_dom_element({
                element_type : "a",
                class_name : "section_id dedalo-link",
                text_content : `${row.section_id} (exhibition1)`,
                href : `https://pre-dedalo.mupreva.org/dedalo6-pre/core/page/?tipo=exhibition1&id=${row.section_id}`,
                parent : target
            })

            dedalo_link.setAttribute('target', '_blank');
            // target.appendChild(dedalo_link);
        }

        appendTemplate(target, this.templateShare(row));
        appendTemplate(target, this.template(row));

        const acordion = common.create_dom_element({
            element_type: "div",
            class_name: "accordion accordion--primary mt-6",
        });
        target.appendChild(acordion);

        //info
        // comentat perquè s'ha afegit la descripció a la fitxa principal
        // appendTemplate(acordion, this.templateInfo(row));


    }, //end render

}; //end thesaurus
