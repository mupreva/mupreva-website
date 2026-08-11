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

        const seed = Math.floor(Math.random() * 1e9).toString();
        self.catalog_seed = seed;

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

        // events
        /*event_manager.subscribe('image_selected', image_selected)
        function image_selected(data) {

            const item = data.item

            if (!self.footer_info) {
                console.warn("No self.footer_info is set", self.footer_info);
                return false
            }

            if (item.footer && item.footer.length > 0) {

                const footer = item.footer

                self.footer_info.innerHTML = footer
                self.footer_info.classList.remove("hide")
            } else {
                self.footer_info.innerHTML = ''
                self.footer_info.classList.add("hide")
            }
        }*/

        return true;
    }, //end init

    /**
     * ACTIVATE_ITEM_LABEL
     * @param object row
     * @return bool true
     */
    activate_item_label: function (row) {
        const self = this;

        const item_label = document.getElementById("item_label");
        const title_container = document.getElementById("title_container");
        if (row && item_label && title_container) {
            // append image
            if (row.image_url_thumb) {
                const image = common.create_dom_element({
                    element_type: "img",
                    class_name: "image_header",
                    src: row.image_url_thumb,
                    parent: item_label,
                });
            }

            // append title to header bar
            const title_node = title_container.firstChild.cloneNode(true);
            if (!title_node) {
                return false;
            }
            item_label.appendChild(title_node);

            // check title container top position to show/hide the title
            // document.addEventListener("scroll", (e) => {
            // 	const rect = title_container.getBoundingClientRect();
            // 	// console.log(rect.top, rect.right, rect.bottom, rect.left);
            // 	if(rect.top<=30){
            // 		item_label.classList.add('curtain_in')
            // 	}else{
            // 		item_label.classList.remove('curtain_in')
            // 	}
            // })

            // Throttling check title container top position
            function check_menu(top) {
                if (top <= 30) {
                    item_label.classList.add("curtain_in");
                } else {
                    item_label.classList.remove("curtain_in");
                }
            }

            let lastScrollPosition = window.scrollY || 0;
            let tick = false; // Track whether call is currently in process

            window.addEventListener("scroll", function (e) {
                lastScrollPosition = window.scrollY;
                if (!tick) {
                    window.requestAnimationFrame(function () {
                        const rect = title_container.getBoundingClientRect();
                        check_menu(rect.top);
                        tick = false;
                    });
                    tick = true;
                }
            });

            // first check on page load
            const rect = title_container.getBoundingClientRect();
            check_menu(rect.top);
        } else {
            console.warn(
                "Unable to activate item_label:",
                item_label,
                title_container,
                row.title
            );
        }

        return true;
    }, //end activate_item_label

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
                imagenes_identificativas: "image",
                imagenes: "image",
                medidas: "measures",
                bibliografia_propia: "bibliographic_references",
                bibliografia: "bibliographic_references",
                //bibliografia_relacionada: 'bibliographic_references'
                documentos: "documents",
                intervenciones: "intervention",
                "intervenciones.imagen_inicial": "image",
                "intervenciones.imagen_final": "image",
                audiovisuales: "audiovisual",
                children_id: "immovables",
                // children: "objects",
                // "children.imagenes_identificativas_data": "image",
            };
            //}
            data_manager
                .request({
                    body: request_body,
                })
                .then((response) => {
                    //correccions de dades
                    const result = response.result.map(function (item) {
                        if (
                            typeof item.bibliografia_propia === "undefined" &&
                            typeof item.bibliografia !== "undefined"
                        ) {
                            item.bibliografia_propia = item.bibliografia;
                        }
                        if (item.children) {
                            item.children_parsed = common.extractIdsFromTermsArray(item.children, 'tch1');
                        }
                        return item;
                    });

                    const childrenPromises = result.map(function (item) {
                        if (!item.children_parsed || item.children_parsed.length === 0) {
                            return Promise.resolve();
                        }
                        return api.getChildren(item.children_parsed).then(function ({data, total}) {
                            item.children_resolved = data;
                            item.children_total = total;
                            item.children_loaded = data.length;
                        });
                    });

                    Promise.all(childrenPromises).then(function () {
                        event_manager.publish("data_request_done", {
                            request_body: request_body,
                            result: result,
                        });

                        resolve(response);
                    });
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

    getTipologyUri: function(row) {
        if (typeof row.external_typological_uri == 'undefined') {
            return null;
        }
        const uri = JSON.parse(row.external_typological_uri);
        if (!uri || uri.length == 0) {
            return null;
        }
        return uri[0].iri;
    },

    templateFieldsPicture: function (row) {
        return `
            ${
                row.section_id
                    ? `
            <dt><dt>${tstring.item_id}</dt></dt>
            <dd>${row.section_id}</dd>
            `
                    : ""
            }
            ${
                row.autor
                    ? `
            <dt>${tstring.item_fotographer}</dt>
            <dd>${row.autor.split(" | ").join(" ")}</dd>
            `
                    : ""
            }
            ${
                row.nombre_bien
                    ? `
            <dt>${tstring.item_object}</dt>
            <dd>${row.nombre_bien.split(',').map((el, i) => {
                    const ids = row.nombre_bien_data ? JSON.parse(row.nombre_bien_data) : [];
                    const url = '/obj/' + ids[i];
                    return (
                        `<a href="${url}" target="_blank">${el}</a>`
                    )
                }).join(', ')}
            </dd>
            `
                    : ""
            }
            ${
                row.datacion_ini
                    ? `
            <dt>${tstring.item_data}</dt>
            <dd>${row.datacion_ini}</dd>
            `
                    : ""
            }
            ${
                row.lugar && row.lugar_data
                    ? `
            <dt>${tstring.item_immovable}</dt>
            <dd>${row.lugar.split(',').slice(0,-1).map((el, i) => {
                    const ids = row.lugar_data ? JSON.parse(row.lugar_data) : [];
                    const url = '/imm/' + ids[i].replace('tchi1_', '');
                    return (
                        `<a href="${url}" target="_blank">${el}</a>`
                    )
                }).join(', ')}
            </dd>
            `
                    : ""
            }
        `;
    },

    templateFieldsImmovable: function (row) {
        const datacion = this.datacion(row);
        return `
            ${
                row.municipio
                    ? `
            <dt>${tstring.item_ubication}</dt>
            <dd>${row.municipio}</dd>
            `
                    : ""
            }
            ${
                row.periodo
                    ? `
            <dt>${tstring.item_periodo}</dt>
            <dd>${row.periodo}</dd>
            `
                    : ""
            }
            ${
                datacion.length > 0
                    ? `
            <dt>${tstring.item_datacion}</dt>
            <dd>${datacion.join(" , ")}</dd>
            `
                    : ""
            }
        `;
    },

    templateFieldsDefault: function (row) {
        var ubicationName = null;
        var ubicationId = null;
        if (row.ubicacion && row.ubicacion_data && row.ubicacion_data.includes('ubication1_18')) {
            try {
                ubicationName = row.ubicacion.split(' - ');
                ubicationId = JSON.parse(row.ubicacion_data);
                const ubicationCut = ubicationId.indexOf('ubication1_18');
                ubicationName = ubicationName.slice(0, ubicationCut);
                ubicationId = ubicationId.slice(0, ubicationCut);
            } catch (e) {}
        }

        const datacion = this.datacion(row);
        return `
            ${
                row.section_id
                    ? `
            <dt><dt>${tstring.item_id}</dt></dt>
            <dd>${row.section_id}</dd>
            `
                    : ""
            }
            ${
                row.nombre_bien
                    ? `
            <dt>${tstring.item_object}</dt>
            <dd>${row.nombre_bien.split(',').map((el, i) => {
                    const ids = row.nombre_bien_data ? JSON.parse(row.nombre_bien_data) : [];
                    const url = '/obj/' + ids[i];
                    return (
                        `<a href="${url}" target="_blank">${el}</a>`
                    )
                }).join(', ')}
            </dd>
            `
                    : ""
            }
            ${
                datacion.length > 0
                    ? `
            <dt>${tstring.item_datacion}</dt>
            <dd>${datacion.join(" , ")}</dd>
            `
                    : ""
            }
            ${
                row.lugar && row.lugar_data
                    ? `
            <dt>${tstring.item_immovable}</dt>
            <dd>${row.lugar.split(',').slice(0,-1).map((el, i) => {
                    const ids = row.lugar_data ? JSON.parse(row.lugar_data) : [];
                    const url = '/imm/' + ids[i].replace('tchi1_', '');
                    return (
                        `<a href="${url}" target="_blank">${el}</a>`
                    )
                }).join(', ')}
            </dd>
            `
                    : ""
            }
            ${
                ubicationName
                    ? `
            <dt>${tstring.item_ubication}</dt>
            <dd>${ubicationName.map(function(value, index){
                if (typeof ubicationId[index] != 'undefined') {
                    return `<a href="/top/${ubicationId[index].replace('ubication1_', '')}">${value}</a>`
                }
                return `${value}`
                }).join(', ')}</dd>
            `
                    : ""
            }
        `;
    },

    templateFields: function (row) {
        switch (row.tpl) {
            case "img":
                return this.templateFieldsPicture(row);
            case "imm":
                return this.templateFieldsImmovable(row);
            default:
                return this.templateFieldsDefault(row);
        }
    },

    template: function (row) {
        const url = this.absUrl(row);
        return htmlTemplate(`
            <div class="fitxa-intro columns is-variable is-8">
                <div class="column flow--l">
                    ${
                        row.titulo
                            ? `
                    <h1>${row.titulo}<span id="parents-breadcrumb" class="is-size-4 has-text-weight-light link-dn"></span></h1>
                    `
                            : ""
                    }
                    <dl>
                        ${this.templateFields(row)}
                    </dl>
                    ${
                        row.descripcion_relevante
                            ? `
                    <div class="flow">
                        ${row.descripcion_relevante}
                    </div>
                    `
                            : ""
                    }

                    ${
                        row.analisis
                            ? `
                    <dl>
                        <dt>${tstring.item_analisis}</dt>
                        <dd>${row.analisis}</dd>
                    </dl>
                    `
                            : ""
                    }


                    ${
                        row.informacion_publica
                            ? `
                    <div class="flow">
                        ${row.informacion_publica}
                    </div>
                    `
                            : ""
                    }
                    <p> ${tstring.item_url_perm} <br>
                        <a href="${url}">${url}</a>
                    </p>
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

    isMoneda(row) {
        return row.nombre_bien === "Moneda";
    },

    renderImages: function (row) {
        const images = row.imagenes_identificativas.concat(row.imagenes);
        //if (this.isMoneda(row) && images.length > 1) {
        if (row.imagenes_identificativas.length > 1 && (row.imagenes || row.imagenes.length > 0)) {
            const image1 = images[0];
            const image1FileName = image1.image.split("/").pop();
            const image2 = images[1];
            const image2FileName = image2.image.split("/").pop();
            return `
            <div class="images-group fullscreen__fullheight column is-7-tablet is-half-desktop">
                <!-- Slider -->
                <div class="fullscreen__content fullscreen__content--1 swiper swiper--fitxa">
                    <div class="swiper-wrapper">
                        <div class="swiper-slide swiper-slide--double">
                            <img loading="lazy" class="image-zoom" src="${
                                __WEB_MEDIA_ENGINE_URL__ + image1.image
                            }" data-original="${
                                __WEB_MEDIA_ENGINE_URL__ + imgOriginal(image1.image)
                            }" alt="${image1.title}" data-caption="${image1.photographer ? image1.photographer : image1FileName}">
                            <img loading="lazy" class="image-zoom" src="${
                                __WEB_MEDIA_ENGINE_URL__ + image2.image
                            }" data-original="${
                                __WEB_MEDIA_ENGINE_URL__ + imgOriginal(image2.image)
                            }" alt="${image2.title}" data-caption="${image2.photographer ? image2.photographer : image2FileName}">
                        </div>
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
                        <div class="swiper-slide swiper-slide--double">
                            <img src="${
                                __WEB_MEDIA_ENGINE_URL__ + image1.image
                            }" alt="${image1.title ? image1.title : ""}">
                            <img src="${
                                __WEB_MEDIA_ENGINE_URL__ + image2.image
                            }" alt="${image2.title ? image2.title : ""}">
                        </div>
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
        } else if (row.imagenes_identificativas.length > 1 && (!row.imagenes || row.imagenes.length === 0)) {
            //imatges moneda, dos columens
            const image1 = images[0];
            const image1FileName = image1.image.split("/").pop();
            const image2 = images[1];
            const image2FileName = image2.image.split("/").pop();
            return `
            <div class="fullscreen__fullheight column is-7-tablet is-half-desktop">
                <div class="columns">
                    <div class="images-group column fullscreen__content fullscreen__content--2">
                        <img loading="lazy" class="active image-zoom" src="${
                            __WEB_MEDIA_ENGINE_URL__ + image1.image
                        }" data-original="${
                __WEB_MEDIA_ENGINE_URL__ + imgOriginal(image1.image)
            }" alt="${image1.title}" data-caption="${image1.photographer ? image1.photographer : image1FileName}">
                        <div class="btns is-flex is-justify-content-flex-end gap-5 mt-1">
                            ${this.renderImageButtons()}
                        </div>
                    </div>
                    <div class="images-group column fullscreen__content fullscreen__content--2">
                        <img loading="lazy" class="active image-zoom" src="${
                            __WEB_MEDIA_ENGINE_URL__ + image2.image
                        }" data-original="${
                __WEB_MEDIA_ENGINE_URL__ + imgOriginal(image2.image)
            }" alt="${image2.title}" data-caption="${image2.photographer ? image2.photographer : image2FileName}">
                        <div class="btns is-flex is-justify-content-flex-end gap-5 mt-1">
                            ${this.renderImageButtons()}
                        </div>
                    </div>
                </div>
                ${this.renderExport()}
            </div>
            `;
        } else if (row.tpl == "img" && images.length === 1) {
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
                    ${
                        image.footprint
                            ? `<figcaption>
                        <div class="columns">
                            <div class="column has-text-left has-text-weight-semibold is-size-4">
                                ${image.footprint}
                            </div>
                            <div class="column is-narrow is-flex gap-5">
                                ${this.renderImageButtons()}
                            </div>
                        </div>
                    </figcaption>`
                            : `<div class="btns is-flex is-justify-content-flex-end gap-5 mt-1">
                        ${this.renderImageButtons()}
                    </div>`
                    }
                </figure>
                ${this.renderExport()}
            </div>
            `;
        } else if (images.length === 1) {
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

    templateTecnicPicture: function (row) {
        const tipologyUri = this.getTipologyUri(row);
        return `
            <table class="table-collapsibles">
                ${
                    row.tipologia
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_tipology}</th>
                    <td>
                        ${(tipologyUri)?`<a target="_blank" href="${tipologyUri}">${row.tipologia}</a>`:row.tipologia}
                    </td>
                </tr>
                `
                        : ""
                }
                ${
                    row.datacion_ini
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_data}</th>
                    <td>${row.datacion_ini}</td>
                </tr>
                `
                        : ""
                }
                ${
                    row.materia
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_material}</th>
                    <td>${row.materia}</td>
                </tr>
                `
                        : ""
                }
                ${
                    row.tecnica
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_tecnica}</th>
                    <td>${row.tecnica}</td>
                </tr>
                `
                        : ""
                }
                ${
                    row.medidas && row.medidas.length > 0
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_sizes}</th>
                    <td>
                        <table>
                            ${row.medidas
                                .map(function (medida) {
                                    return `
                                <tr>
                                    <th>${medida.tipo}</th>
                                    <td>${medida.tamanyo}${medida.unidad}</td>
                                </tr>
                                `;
                                })
                                .join("")}
                        </table>
                    </td>
                </tr>
                `
                        : ""
                }
            </table>
        `;
    },

    templateTecnicDefault: function (row) {
        const datacion = this.datacion(row);
        const tipologyUri = this.getTipologyUri(row);

        let lugar_produccion_parsed = null;

        try {
            lugar_produccion_parsed = JSON.parse(row.lugar_produccion);
        } catch {}

        const lugarProduccionId = lugar_produccion_parsed ? lugar_produccion_parsed[0] : null;

        const esImmueble = lugarProduccionId && lugarProduccionId.includes('tchi1');
        const esToponimia = lugarProduccionId && lugarProduccionId.includes('htoponymy1');

        const lugar = esImmueble
            ? `<a href="/imm/${lugarProduccionId.replace('tchi1_', '')}" target="_blank">${row.lugar_produccion_literal}</a>`
            : esToponimia
                ? `<a href="/htop/${lugarProduccionId.replace('htoponymy1_', '')}" target="_blank">${row.lugar_produccion_literal}</a>`
                : row.lugar_produccion_literal

        return `
            <table class="table-collapsibles">
                ${
                    row.section_id
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_num_cat}</th>
                    <td>${row.section_id}</td>
                </tr>
                `
                        : ""
                }
                ${
                    row.titulo
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_title}</th>
                    <td>${row.titulo}</td>
                </tr>
                `
                        : ""
                }
                ${
                    datacion.length
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_datacion}</th>
                    <td>${datacion}</td>
                </tr>
                `
                        : ""
                }
                ${
                    row.medidas && row.medidas.length > 0
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_sizes}</th>
                    <td>
                        <table>
                            ${row.medidas
                                .map(function (medida) {
                                    return `
                                <tr>
                                    <th>${medida.tipo}</th>
                                    <td>${medida.tamanyo}${medida.unidad}</td>
                                </tr>
                                `;
                                })
                                .join("")}
                        </table>
                    </td>
                </tr>
                `
                        : ""
                }
                ${
                    row.fecha_ingreso && row.fuente_ingreso && row.forma_ingreso && row.tipo_recuperacion
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_adquisicion}</th>
                    <td>${common.timestamp_to_fecha(row.fecha_ingreso)} | ${row.fuente_ingreso} | ${row.forma_ingreso} | ${row.tipo_recuperacion}</td>
                </tr>
                `
                        : ""
                }
                ${
                    lugar
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_production}</th>
                    <td>${lugar}</td>
                </tr>
                `
                        : ""
                }
                ${
                    row.tipologia
                        ? `
                <tr>
                    <td></td>
                    <th>${tstring.item_tipology}</th>
                    <td>${(tipologyUri)?`<a target="_blank" href="${tipologyUri}">${row.tipologia}</a>`:row.tipologia}</td>
                </tr>
                `
                        : ""
                }
                ${
                    row.periodo
                        ? `
                <tr>
                    <td>
                        <button type="button" class="button button--icon" id="btnTableCollapse01" aria-controls="TableCollapse01More" aria-expanded="false" onclick="toggle(this.id,'TableCollapse01More');">
                            <img src="/assets/img/ico-mes.svg" width="17" height="17">
                        </button>
                    </td>
                    <th>${tstring.item_periodo}</th>
                    <td>${row.periodo}</td>
                </tr>
                <tr style="display:none;" id="TableCollapse01More">
                    <td colspan="3" class="p-0">
                        <div class="has-background-grey-light p-5 mb-5">
                            <div class="tabs-2 mb-6">
                                <div class="tab-control">
                                    <ul class="tab-list" role="tablist">
                                        ${row.periodo.split(',').map((el, i) => (
                                            `<li class="tab-item">
                                                <button role="tab" aria-controls="periodo-tab${i}">${el.trim()}</button>
                                            </li>`
                                        )).join('')}
                                    </ul>
                                </div>
                            </div>

                            <div class="tab-group">
                                ${row.periodo.split(',').map((el, i) => {
                                    const ids = row.periodo_data ? JSON.parse(row.periodo_data) : [];
                                    const url = '/cro/' + ids[i];
                                    return (
                                        `<div class="tab-content" id="periodo-tab${i}" role="tabpanel">
                                            <a href="${url}" class="is-flex mb-5 is-size-3" target="_blank">${el}</a>
                                            <div id="periodo-relations${i}"></div>
                                            <div id="periodo-load-more${i}"></div>
                                        </div>`
                                    )
                                }).join('')}
                            </div>

                        </div>
                    </td>
                </tr>
                `
                        : ""
                }
                ${
                    row.nombre_bien
                        ? `
                <tr>
                    <td>
                        <button type="button" class="button button--icon" id="btnTableCollapse03" aria-controls="TableCollapse03More" aria-expanded="false" onclick="toggle(this.id,'TableCollapse03More');">
                            <img src="/assets/img/ico-mes.svg" title="${tstring.item_show_more_info}" width="17" height="17">
                        </button>
                    </td>
                    <th>${tstring.item_object}</th>
                    <td>${row.nombre_bien}</td>
                </tr>
                <tr style="display:none;" id="TableCollapse03More">
                    <td colspan="3" class="p-0">
                        <div class="has-background-grey-light p-5 mb-5">
                            <div class="tabs-2 mb-6">
                                <div class="tab-control">
                                    <ul class="tab-list" role="tablist">
                                        ${row.nombre_bien.split(',').map((el, i) => (
                                            `<li class="tab-item">
                                                <button role="tab" aria-controls="nombre_bien-tab${i}">${el.trim()}</button>
                                            </li>`
                                        )).join('')}
                                    </ul>
                                </div>
                            </div>

                            <div class="tab-group">
                                ${row.nombre_bien.split(',').map((el, i) => {
                                    const ids = row.nombre_bien_data ? JSON.parse(row.nombre_bien_data) : [];
                                    const url = '/obj/' + ids[i];
                                    return (
                                        `<div class="tab-content" id="nombre_bien-tab${i}" role="tabpanel">
                                            <a href="${url}" class="is-flex mb-5 is-size-3" target="_blank">${el}</a>
                                            <div id="nombre_bien-relations${i}"></div>
                                            <div id="nombre_bien-load-more${i}"></div>
                                        </div>`
                                    )
                                }).join('')}
                            </div>
                        </div>
                    </td>
                </tr>
                `
                        : ""
                }
                ${
                    row.materia
                        ? `
                <tr>
                    <td>
                        <button type="button" class="button button--icon" id="btnTableCollapse04" aria-controls="TableCollapse04More" aria-expanded="false" onclick="toggle(this.id,'TableCollapse04More');">
                            <img src="/assets/img/ico-mes.svg" title="${tstring.item_show_more_info}" width="17" height="17">
                        </button>
                    </td>
                    <th>${tstring.item_material}</th>
                    <td>${row.materia}</td>
                </tr>
                <tr style="display:none;" id="TableCollapse04More">
                    <td colspan="3" class="p-0">
                        <div class="has-background-grey-light p-5 mb-5">
                            <div class="tabs-2 mb-6">
                                <div class="tab-control">
                                    <ul class="tab-list" role="tablist">
                                        ${row.materia.split(',').map((el, i) => (
                                            `<li class="tab-item">
                                                <button role="tab" aria-controls="materia-tab${i}">${el.trim()}</button>
                                            </li>`
                                        )).join('')}
                                    </ul>
                                </div>
                            </div>

                            <div class="tab-group">
                                ${row.materia.split(',').map((el, i) => {
                                    const ids = row.materia_data ? JSON.parse(row.materia_data) : [];
                                    const url = '/mat/' + ids[i];
                                    return (
                                        `<div class="tab-content" id="materia-tab${i}" role="tabpanel">
                                            <a href="${url}" class="is-flex mb-5 is-size-3" target="_blank">${el}</a>
                                            <div id="materia-relations${i}"></div>
                                            <div id="materia-load-more${i}"></div>
                                        </div>`
                                    )
                                }).join('')}
                            </div>
                        </div>
                    </td>
                </tr>
                `
                        : ""
                }
                ${
                    row.tecnica
                        ? `
                <tr>
                    <td>
                        <button type="button" class="button button--icon" id="btnTableCollapse05" aria-controls="TableCollapse05More" aria-expanded="false" onclick="toggle(this.id,'TableCollapse05More');">
                            <img src="/assets/img/ico-mes.svg" title="${tstring.item_show_more_info}" width="17" height="17">
                        </button>
                    </td>
                    <th>${tstring.item_tecnica}</th>
                    <td>${row.tecnica}</td>
                </tr>
                <tr style="display:none;" id="TableCollapse05More">
                    <td colspan="3" class="p-0">
                        <div class="has-background-grey-light p-5 mb-5">
                            <div class="tabs-2 mb-6">
                                <div class="tab-control">
                                    <ul class="tab-list" role="tablist">
                                        ${row.tecnica.split(',').map((el, i) => (
                                            `<li class="tab-item">
                                                <button role="tab" aria-controls="tecnica-tab${i}">${el.trim()}</button>
                                            </li>`
                                        )).join('')}
                                    </ul>
                                </div>
                            </div>

                            <div class="tab-group">
                                ${row.tecnica.split(',').map((el, i) => {
                                    const ids = row.tecnica_data ? JSON.parse(row.tecnica_data) : [];
                                    const url = '/tec/' + ids[i];
                                    return (
                                        `<div class="tab-content" id="tecnica-tab${i}" role="tabpanel">
                                            <a href="${url}" class="is-flex mb-5 is-size-3" target="_blank">${el}</a>
                                            <div id="tecnica-relations${i}"></div>
                                            <div id="tecnica-load-more${i}"></div>
                                        </div>`
                                    )
                                }).join('')}
                            </div>
                        </div>
                    </td>
                </tr>
                `
                        : ""
                }
            </table>
        `;
    },

    getRelations: function (row) {
        const self = this;

        self.relationsData = {}

        const elementsDic = {
            'objects': 'cat',
            'pictures': 'img',
            'immovables': 'imm',
            'documents_catalog': 'doc'
        }

        function updateCategoryRelations(category, tab) {
            const tabData = self.relationsData[category][tab];
            const offset = tabData.loaded;
            const relationId = tabData.section_id
            api.getRelatedElements({table: self.table, relation: category+'_data', relationId, offset, seed: self.catalog_seed}).then(({data, total}) => {
                tabData.result.push(...data)
                tabData.loaded = tabData.loaded + data.length;
                setCategoryRelations(category);
            })
        }

        function setCategoryRelations(category) {
            Object.keys(self.relationsData[category]).forEach(tab => {
                const tabData = self.relationsData[category][tab]

                const content = htmlTemplate(`
                    <ul class="galeria galeria--185x185 link-dn">
                        ${tabData.result.map(item => {
                            let imageUrl
                            if (item.imagenes_identificativas.length) {
                                imageUrl = __WEB_MEDIA_ENGINE_URL__ + item.imagenes_identificativas[0].image;
                            } else {
                                imageUrl = '/assets/img/placeholder.png';
                            }
                            return `
                            <li>
                                <a href="${page_globals.__WEB_ROOT_WEB__}/${elementsDic[self.table]}/${item.section_id}" target="_blank">
                                    <figure>
                                        <img src="${imageUrl}" crossorigin="Anonymous" loading="lazy">
                                        <figcaption>${item.titulo}</figcaption>
                                    </figure>
                                </a>
                            </li>
                            `
                        }).join('')}
                    </ul>`);
                const button = htmlTemplate(`
                    <button class="button button--carrega button--icon">
                        ${tstring.load_more} <small>[${tabData.loaded} / ${tabData.total}]</small>
                    </button>
                `)
                const container = tabData.container;
                const buttonContainer = tabData.buttonContainer;
                if (!container || !buttonContainer) return;
                container.innerHTML = buttonContainer.innerHTML = '';

                appendTemplate(container, content);

                if(tabData.loaded < tabData.total) {
                    appendTemplate(buttonContainer, button);
                    const boto = container.parentElement.querySelector('button')

                    boto.addEventListener("click", function (e) {
                        e.preventDefault();
                        updateCategoryRelations(category, tab)
                    })
                }
            })
        }

        function getCategoryRelations(category) {
            const promises = JSON.parse(row[category+'_data']).map((relationId, i) => {
                const tab = row[category].split(',')[i].trim();

                return api.getRelatedElements({table: self.table, relation: category+'_data', relationId, seed: self.catalog_seed}).then(({data, total}) => {
                    self.relationsData[category] = self.relationsData[category] || {};
                    self.relationsData[category][tab] = self.relationsData[category][tab] || {};
                    const tabData = self.relationsData[category][tab];
                    tabData.result = data;
                    tabData.total = total;
                    tabData.section_id = relationId;
                    tabData.loaded = tabData.loaded ? tabData.loaded + data.length : data.length;
                    tabData.container = document.getElementById(`${category}-relations${i}`);
                    tabData.buttonContainer = document.getElementById(`${category}-load-more${i}`);
                    return data;
                })
            })

            Promise.all(promises).then(() => {
                // console.log(`${category} carregada: `, {...self.relationsData});
                setCategoryRelations(category);
            })

        }

        if (row.periodo_data) {
            getCategoryRelations('periodo');
        }
        if (row.nombre_bien_data) {
            getCategoryRelations('nombre_bien')
        }
        if (row.materia_data) {
            getCategoryRelations('materia');
        }
        if (row.tecnica_data) {
            getCategoryRelations('tecnica')
        }
    },

    templateTecnic: function (row) {
        return htmlTemplate(`
        <!-- Fitxa tècnica -->
        <h2 class="accordion-header">
            <button type="button">${tstring.item_tecnic_sheet}</button>
        </h2>
        <div class="accordion-content block-dedalo">
            <div class="accordion accordion--secondary">
                <div class="table-responsive">
                ${
                    row.tpl === "img"
                        ? this.templateTecnicPicture(row)
                        : this.templateTecnicDefault(row)
                }
                </div>
            </div>
        </div>
        `);
    },

    templateJacimentVisit: function (target, row) {
        const template = htmlTemplate(`
            <h2 class="accordion-header visit-jaciment" style="display:none">
                <button type="button">${tstring.item_jaciment_visit}</button>
            </h2>
            <div class="accordion-content block-dedalo visit-jaciment-content">
            </div>
        `);
        appendTemplate(target, template);

        const self = this;
        api.getVisitaYacimientoCatalog(row.titulo).then(function(result) {
            if(result && result.length > 0 && result[0].summary) {
                const target = document.querySelector(".visit-jaciment-content");
                target.innerHTML = common.convertText(result.summary);

                const target2 = document.querySelector(".visit-jaciment");
                target2.style.display = "block";
            }
        })
    },

    templateResources: function (row) {
        if (typeof row.documentos === "undefined") {
            row.documentos = [];
        }
        if (typeof row.audiovisuales === "undefined") {
            row.audiovisuales = [];
        }

        if (row.documentos.length === 0 && row.audiovisuales.length === 0) {
            return null;
        }
        return htmlTemplate(`
            <h2 class="accordion-header">
                <button type="button">${tstring.item_resources}</button>
            </h2>
            <div class="accordion-content block-dedalo">
                <div class="accordion accordion--secondary">
                ${
                    row.audiovisuales.length > 0
                        ? `
                    <h3 class="accordion-header">
                        <button type="button">${
                            tstring.item_audiovisual
                        }</button>
                    </h3>
                    <div class="accordion-content block-dedalo">
                        <ul class="galeria galeria--180x150 link-dn">
                            ${row.audiovisuales
                                .map(function (entry) {
                                    return `
                                <li>
                                    <button
                                        type="button"
                                        class="video-button"
                                        data-video-title="${entry.title}"
                                        data-video-url="${__WEB_MEDIA_ENGINE_URL__ + entry.video}"
                                        data-subtitles-url="${__WEB_MEDIA_ENGINE_URL__ + entry.subtitles}">
                                        <figure>
                                            <img src="${getPosterframe(__WEB_MEDIA_ENGINE_URL__ + entry.video)}" alt="" onerror="this.remove()">
                                            <figcaption>${entry.title||''}</figcaption>
                                        </figure>
                                    </button>
                                </li>
                                `;
                                })
                                .join("")}
                        </ul>

                    </div>
                `
                        : ""
                }
                ${
                    row.documentos.length > 0
                        ? `
                    <h3 class="accordion-header">
                        <button type="button">${tstring.item_documents}</button>
                    </h3>
                    <div class="accordion-content block-dedalo">
                        <div class="text-base">
                            <ul>
                                ${row.documentos
                                    .map(function (entry) {
                                        return `
                                    <li><a target="_blank" href="${
                                        __WEB_MEDIA_ENGINE_URL__ +
                                        entry.document
                                    }">${entry.title||tstring.item_document}</a></li>
                                    `;
                                    })
                                    .join("")}
                            </ul>
                        </div>
                    </div>
                `
                        : ""
                }
                </div>
            </div>
        `);
    },

    templateRestoration: function (row) {
        if (!row.intervenciones || row.intervenciones.length < 1) {
            return "";
        }

        return htmlTemplate(`
            <h2 class="accordion-header">
                <button type="button">${tstring.item_restoration}</button>
            </h2>
            <div class="accordion-content block-dedalo">
                <ul class="interventions-list">
                    ${row.intervenciones.map((elem) => {
                        const { intervention_type, titulo, fecha_inicio, fecha_fin, imagen_inicial, section_id } = elem;
                        const fechaInicioString = fecha_inicio ? `<time datetime="${fecha_inicio}">${formatDate(fecha_inicio)}</time>` : "";
                        const fechaFinString = fecha_fin ? `<time datetime="${fecha_fin}">${formatDate(fecha_fin)}</time>` : "";
                        const fechaString = [fechaInicioString, fechaFinString].filter(Boolean).join(" - ");
                        const interventionString = [intervention_type, titulo, fechaString].filter(Boolean).join(" | ");

                        if (!interventionString) {
                            return "";
                        }

                        const imageEntry = imagen_inicial && imagen_inicial.length > 0 ? imagen_inicial[0] : null;
                        const image = imageEntry?.image ? `${__WEB_MEDIA_ENGINE_URL__}${imageEntry.image}` : "";
                        const description = imageEntry?.description || "";

                        return `
                            <li class="full-link">
                                <a href="/int/${section_id}" target="_blank">
                                    ${interventionString}
                                </a>
                                ${image ? `<img loading="lazy" src="${image}" alt="${description}" />` : ""}
                            </li>
                        `;
                    }).join("")}
                </ul>
            </div>
        `);
    },

    isGroup: function (row) {
        // return (
        //     typeof row.tipo_registro !== "undefined" &&
        //     row.tipo_registro === "Conjunto" &&
        //     row.children.length > 0
        // );
        return row.tipo_registro === "Conjunto";
    },

    templateGroup: function (target, row) {
        var self = this;
        if (!this.isGroup(row)) {
            return "";
        }
        const template =  htmlTemplate(`
            <h2 class="accordion-header">
                <button type="button">${tstring.item_group}</button>
            </h2>
            <div class="accordion-content block-dedalo">
                <ul class="galeria galeria--242x242 link-dn">
                </ul>
            </div>
        `);
        const ul = template[2].querySelector("ul");
        const titol = template[0];
        api.getElementsFromSet(row.section_id).then(function(results){
            if (results.length === 0) {
                titol.remove();
                return;
            }
            var content = htmlTemplate(`
                ${results.map(function(object){
                    return self.template_catalog_elem(object);
                }).join('')}`)
            appendTemplate(ul, content);
            enableDialogs(ul);
        });
        appendTemplate(target, template);
    },

    isInSet: function (row) {
        return row.tipo_registro === "Conjunto en origen";
    },

    templateIsInSets: function (target, row) {
        var self = this;
        if (!this.isInSet(row)) {
            return "";
        }
        const template =  htmlTemplate(`
            <h2 class="accordion-header">
                <button type="button">${tstring.sets}</button>
            </h2>
            <div class="accordion-content block-dedalo">
                <ul class="galeria galeria--242x242 link-dn">
                </ul>
            </div>
        `);
        const ul = template[2].querySelector("ul");
        const titol = template[0];
        const parentsArray = JSON.parse(row.parent);
        const parentsIds = (parentsArray != null) ? parentsArray.map(parent => parent.split('_')[1]) : [];
        if(parentsIds.length === 0) {
            return '';
        }
        api.getSetsFromElement(parentsIds.join(',')).then(function(results){
            if (results.length === 0) {
                titol.remove();
                return;
            }
            var content = htmlTemplate(`
                ${results.map(function(object){
                    return self.template_catalog_elem(object);
                }).join('')}`)
            appendTemplate(ul, content);
            enableDialogs(ul);
        });
        appendTemplate(target, template);
    },

    hasRelated: function (row) {
        return (
            row.children_resolved &&
            row.children_resolved.length > 0
        );
    },

    templateRelated: function (row) {
        //TODO: passar a camp patrimonio_relacionado
        var self = this;
        if (!this.hasRelated(row)) {
            return "";
        };

        const template = htmlTemplate(`
            <h2 class="accordion-header">
                <button type="button">${tstring.item_rel_content}</button>
            </h2>
            <div class="accordion-content block-dedalo">
                <ul class="galeria galeria--92x92 link-dn">
                ${row.children_resolved
                    .map(function (object) {
                        return self.template_catalog_elem(object);
                    })
                    .join("")}
                </ul>
                <div class="has-text-centered mt-6 button-load-more-children"></div>
            </div>
        `);

        const ul = template[2].querySelector("ul");
        const buttonContainer = template[2].querySelector(".button-load-more-children");

        function renderLoadMoreButton() {
            buttonContainer.innerHTML = "";
            if (row.children_loaded >= row.children_total) {
                return;
            }
            const button = htmlTemplate(`
                <button type="button" class="button button--icon button--carrega">
                    ${tstring.load_more} <small>[${row.children_loaded} / ${row.children_total}]</small>
                </button>
            `);
            appendTemplate(buttonContainer, button);
            buttonContainer.querySelector("button").addEventListener("click", function (e) {
                e.preventDefault();
                loadMoreChildren();
            });
        }

        function loadMoreChildren() {
            api.getChildren(row.children_parsed, row.children_loaded).then(function ({data, total}) {
                row.children_total = total;
                row.children_loaded += data.length;
                row.children_resolved = row.children_resolved.concat(data);

                const content = htmlTemplate(
                    data.map(function (object) {
                        return self.template_catalog_elem(object);
                    }).join("")
                );
                appendTemplate(ul, content);
                enableDialogs(ul);
                renderLoadMoreButton();
            });
        }

        renderLoadMoreButton();

        return template;
    },

    templateRelatedJaciments: function (target, row) {
        var self = this;

        const ownRelations = row.relations ? JSON.parse(row.relations) : [];

        api.getImmovablesRelatedByParent(row.section_tipo, row.section_id).then(function (results) {
            const relatedRelations = (results || []).reduce(function (acc, item) {
                if (!item.relations) {
                    return acc;
                }
                return acc.concat(JSON.parse(item.relations));
            }, []);

            const seen = new Set();
            const relations = ownRelations.concat(relatedRelations)
                .filter((relation) => ['tch1', 'tch100', 'tchi1', 'tch300'].includes(relation.section_tipo))
                .filter((relation) => {
                    const key = `${relation.section_tipo}_${relation.section_id}`;
                    if (seen.has(key)) {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });

            const relationsData = relations.reduce((acc, relation) => {
                const type = relation.section_tipo;
                acc[type] = acc[type] || {type: page.get_translated_table(type), result: []}
                acc[type].result.push(relation)
                return acc;
            }, {})

            if (Object.keys(relationsData).length === 0) {
                return;
            }

            const tabsId = `related-jaciments-${row.section_id}`;
            const accordionId = `related-jaciments-accordion-${row.section_id}`;
            const template = htmlTemplate(`
            <div id="${accordionId}" class="accordion accordion--primary mt-6">
                <h2 class="accordion-header">
                    <button type="button">${tstring.immovables_relations_title}</button>
                </h2>
                <div class="accordion-content block-dedalo">
                    <div id="${tabsId}" class="tabs-2 mb-6">
                        <div class="tab-control">
                            <ul class="tab-list" role="tablist">
                                ${Object.keys(relationsData).map((key) => {
                                    return `<li class="tab-item">
                                        <button role="tab" aria-controls="${key}-tab">${relationsData[key].type}</button>
                                    </li>`
                                }).join('')}
                            </ul>
                        </div>
                    </div>
                    <div class="tab-group">
                        ${Object.keys(relationsData).map((key) => (
                            `<div class="tab-content" id="${key}-tab" role="tabpanel">
                                <ul class="galeria galeria--185x185 link-dn" id="${tabsId}-${key}-list"></ul>
                                <div class="has-text-centered mt-6 button-load-more-${tabsId}-${key}"></div>
                            </div>`
                        )).join('')}
                    </div>
                </div>
            </div>
        `);

            appendTemplate(target, template);
            enableDialogs(target);
            new TenUp.tabs(`#${tabsId}`, {});
            // scoped to just this new block's id, so it doesn't re-initialize (and
            // double the click listeners on) the page's already-initialized accordion
            new TenUp.Accordion(`#${accordionId}`, {open: true});

            const RELATIONS_PAGE_SIZE = 50;

            function templateRelationItem(item, key) {
                const image = item.image ? __WEB_MEDIA_ENGINE_URL__ + item.image : '/assets/img/placeholder.png';
                return `
                    <li>
                        <a href="${page_globals.__WEB_ROOT_WEB__}/${page.section_tipo_to_template(key)}/${item.section_id}" target="_blank">
                            <figure>
                                <img src=${image} alt=""  crossorigin="Anonymous" loading="lazy" />
                                ${item.title
                                    ? `<figcaption>${item.title}</figcaption>`
                                : ''}
                            </figure>
                        </a>
                    </li>
                `;
            }

            Object.keys(relationsData).forEach(function (key) {
                const tabData = relationsData[key];
                tabData.loaded = 0;

                const ul = document.getElementById(`${tabsId}-${key}-list`);
                const buttonContainer = target.querySelector(`.button-load-more-${tabsId}-${key}`);

                function renderLoadMoreButton() {
                    buttonContainer.innerHTML = "";
                    if (tabData.loaded >= tabData.result.length) {
                        return;
                    }
                    const button = htmlTemplate(`
                        <button type="button" class="button button--icon button--carrega">
                            ${tstring.load_more} <small>[${tabData.loaded} / ${tabData.result.length}]</small>
                        </button>
                    `);
                    appendTemplate(buttonContainer, button);
                    buttonContainer.querySelector("button").addEventListener("click", function (e) {
                        e.preventDefault();
                        loadMoreRelations();
                    });
                }

                function loadMoreRelations() {
                    const nextItems = tabData.result.slice(tabData.loaded, tabData.loaded + RELATIONS_PAGE_SIZE);
                    const content = htmlTemplate(nextItems.map((item) => templateRelationItem(item, key)).join(''));
                    appendTemplate(ul, content);
                    tabData.loaded += nextItems.length;
                    renderLoadMoreButton();
                }

                loadMoreRelations();
            });
        });
    },

    templateBibliografyEntry: function (entry) {
        return biblio_row_fields.render_row_bibliography(entry);
    },

    templateBiblio: function (target, row) {
        const self = this;

        if (!row.bibliografia_propia || row.bibliografia_propia.length == 0) {
            return null;
        }
        const template = htmlTemplate(`
        <h2 class="accordion-header">
            <button type="button">${tstring.item_bibliografy}</button>
        </h2>
        <div class="accordion-content block-dedalo">
            <div class="text-base flow">
                <ul>
                </ul>
            </div>
        </div>
        `);
        const ul = template[2].querySelector("ul");
        row.bibliografia_propia.forEach(function (entry) {
            ul.appendChild(self.templateBibliografyEntry(entry));
        });
        appendTemplate(target, template);
    },

    templatePatrimonio: function (target, row) {
        const self = this;

        const ids = common.extractIdsFromTermsArray(row.patrimonio_relacionado);

        if(Object.keys(ids).length === 0) return;

        // Reserve the DOM position with an invisible marker: the accordion library
        // requires .accordion-header/.accordion-content to be direct children of
        // `target`, so we can't wrap them in a container div to control placement.
        const placeholder = htmlTemplate(`<div style="display:none"></div>`);
        const marker = placeholder[0];
        appendTemplate(target, placeholder);

        const template = htmlTemplate(`
        <h2 class="accordion-header">
            <button type="button">${tstring.item_related_heritage}</button>
        </h2>
        <div class="accordion-content block-dedalo">
            <div class="text-base flow">
                <ul class="galeria galeria--242x242 link-dn">
                </ul>
            </div>
        </div>
        `);
        const ul = template[2].querySelector("ul");
        const templateNodes = Array.from(template);

        const types = Object.keys(ids);
        const promises = []
        const typesTableMap = {
            'tch1': 'objects',
            'tch100': 'pictures',
            'tch300': 'documents_catalog',
        }
        const typeUrlMap = {
            'tch1': 'cat',
            'tch100': 'img',
            'tch300': 'doc',
        }
        types.forEach(function (type) {
            if (typesTableMap[type]) {
                promises.push(
                    api.getPatrimonioRelacionado(ids[type], typesTableMap[type])
                );
            }
        });

        Promise.all(promises).then(function (resultsByType) {
            if(!resultsByType || resultsByType.length === 0 || (resultsByType.flat()).length === 0) {
                templateNodes.forEach(function (node) { node.remove(); });
                return;
            }
            resultsByType.forEach(function (results) {
                results.forEach(function (entry) {
                    const {titulo, section_id, imagenes_identificativas, section_tipo} = entry;
                    const imageUrl = imagenes_identificativas && imagenes_identificativas.length > 0 ? __WEB_MEDIA_ENGINE_URL__ + imagenes_identificativas[0].image : '/assets/img/placeholder.png';
                    const content = htmlTemplate(`
                        <li class="img">
                            <a href="/${typeUrlMap[section_tipo]}/${section_id}" target="_blank">
                                <figure>
                                    <img loading="lazy" src="${imageUrl}" alt="">
                                    <figcaption>${titulo}</figcaption>
                                </figure>
                            </a>
                        </li>
                    `)
                    appendTemplate(ul, content);
                });
            });
        });
        templateNodes.forEach(function (node) {
            target.insertBefore(node, marker);
        });
        marker.remove();

    },

    templateExcavations: function (target, row) {
        const self = this;

        let parsedRelations = [];
        if (row.relations) {
            try {
                parsedRelations = JSON.parse(row.relations);
            } catch (e) {
                parsedRelations = [];
            }
        }

        const relations = (Array.isArray(parsedRelations) ? parsedRelations : []).filter(function(value){
            return value.section_tipo == 'excavation1';
        }).map(function(value){
            return value.section_id;
        });

        if (!relations || relations.length === 0) {
            return null;
        }

        const template = htmlTemplate(`
            <h2 class="accordion-header">
                <button type="button">${tstring.item_excavations}</button>
            </h2>
            <div class="accordion-content">
                <ul class="galeria galeria--185x185 link-dn">
                </ul>
            </div>
        `);
        const ul = template[2].querySelector("ul");
        api.getExcavaciones(relations).then(function(results){
            var content = htmlTemplate(`
                ${results.map(function(row, index){
                    var image_url = '/assets/img/placeholder.png';
                    if (row.identifying_image !== null) {
                        image_url = __WEB_MEDIA_ENGINE_URL__+JSON.parse(row.identifying_image)[0];
                    }

                    return `
                        <li>
                            <div class="button-like" data-a11y-dialog-show="dialog-${index}" role="button" tabindex="0">
                                <figure>
                                    <img loading="lazy" src="${image_url}" width="400" height="400" alt="">
                                    <figcaption>${row.title}</figcaption>
                                </figure>
                            </div>
        <div class="dialog-container" data-a11y-dialog="dialog-${index}" aria-hidden="true" aria-labelledby="dialog-${index}-title">
            <div class="dialog-overlay" data-a11y-dialog-hide></div>
            <div class="dialog-content" role="document">
                <button data-a11y-dialog-hide class="dialog-close" aria-label="${tstring.close}">
                    <svg width="44" height="44">
                        <g fill="none" fill-rule="evenodd">
                            <path d="M0 0h44v44H0z" />
                            <path stroke="#FFF" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" d="M33 11 11 33M11 11l22 22" />
                        </g>
                    </svg>
                </button>
                <div class="columns is-widescreen is-variable is-8">
                    <div class="column">
                        <img loading="lazy" src="${image_url}" width="600" height="600" alt="">
                    </div>
                    <div class="column text-base flow--m">
                        <h1 id="dialog-${index}-title">
                            ${row.title}
                        </h1>
                        ${row.description}
                    </div>
                </div>
            </div>
        </div>
                        </li>
                    `;
                }).join('')}
            `);
            appendTemplate(ul, content);
            enableDialogs(ul);
        })
        appendTemplate(target, template);
    },

    template_modal: function () {
        return htmlTemplate(`
            <div id="video-modal" class="modal">
                <div class="modal-content">
                    <button class="modal-close">
                        <svg width="44" height="44">
                            <g fill="none" fill-rule="evenodd">
                                <path d="M0 0h44v44H0z" />
                                <path stroke="#FFF" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" d="M33 11 11 33M11 11l22 22" />
                            </g>
                        </svg>
                    </button>
                    <video controls>
                        <source id="video-source" src="" type="video/mp4">
                        <track id="video-track" kind="subtitles" src="">
                    </video>
                    <p id="modal-title"></p>
                </div>
            </div>`);
    },

    load_modal: function () {
        const modal = document.getElementById('video-modal');
        const title = modal.querySelector('#modal-title');
        const video = modal.querySelector('video');
        const videoSource = modal.querySelector('#video-source');
        const videoTrack = modal.querySelector('#video-track');

        document.querySelectorAll('.video-button').forEach((button) => {
            button.addEventListener('click', function() {
                // afegir titol, src, subtitols
                title.textContent = this.dataset.videoTitle;
                videoSource.src = this.dataset.videoUrl;
                videoTrack.src = this.dataset.subtitlesUrl;

                video.load();

                modal.classList.add('is-active');
            });
        });

        modal.querySelectorAll('.modal-close').forEach((element) => {
            element.addEventListener('click', function(e) {
                video.pause();
                modal.classList.remove('is-active');
            });
        });

        modal.addEventListener('click', (e) => {
            if(e.target === modal) {
                video.pause();
                modal.classList.remove('is-active');
            }
        })
    },

    /**
     * LIST_ROW_BUILDER
     * Build DOM nodes to insert into list pop-up
     */
    template_catalog_elem: function (row) {
        row.tpl = page.section_tipo_to_template(row.section_tipo);
        const url =
            page_globals.__WEB_ROOT_WEB__ +
            "/" +
            row.tpl +
            "/" +
            row.section_id;
        var image_url = "/assets/img/placeholder.png";
        if (row.imagenes_identificativas.length > 0) {
            image_url =
                __WEB_MEDIA_ENGINE_URL__ +
                row.imagenes_identificativas[0].image;
        }
        return `
        <li class="${row.tpl}">
            <a href="${url}" target="_blank">
                <figure>
                    <img loading="lazy" src="${image_url}" alt="">
                    ${
                        row.titulo
                            ? `
                    <figcaption>${row.titulo}</figcaption>
                    `
                            : ""
                    }
                </figure>
            </a>
        </li>
        `;
    }, //end list_row_builder

    template_thesaurus: function (target, row) {
        const self = this;
        if (!row.children || row.children.length === 0 || row.children === "[]") {
            return null;
        }

        const template = htmlTemplate(`
            <h2 class="accordion-header">
                <button type="button">${tstring.item_thesaurus_immovable}</button>
            </h2>
            <div class="accordion-content">
                <div class="accordion accordion--secondary">
                    <div class="tree_wrapper"></div>
                </div>
            </div>
        `);

        const treeWrapper = template[2].querySelector(".tree_wrapper");

        if(row.children_id && row.children_id.length > 0) {
            const parsedData = row.children_id.map(el => ({section_id: el.section_id, titulo: el.titulo, parent: Number(JSON.parse(el.parent || "[]")[0].split('_')[1]) || null}));

            const nodeMap = {};
            const rootNode = {section_id: row.section_id, titulo: row.titulo, children: []};
            nodeMap[rootNode.section_id] = rootNode;

            parsedData.forEach(el => {
                nodeMap[el.section_id] = {section_id: el.section_id, titulo: el.titulo, children: []};
            });
            parsedData.forEach(el => {
                const parentNode = nodeMap[el.parent];
                if (parentNode) {
                    parentNode.children.push(nodeMap[el.section_id]);
                }
            });

            const thesaurusData = [rootNode];

            function renderTree(node) {
                const url = page_globals.__WEB_ROOT_WEB__ + "/imm/" + node.section_id;

                const tree_node = document.createElement('div');
                tree_node.className = 'tree_node';

                const grouped_children = document.createElement('div');
                grouped_children.className = 'grouped_children';

                const term_span = document.createElement('span');
                term_span.className = 'term';
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.textContent = node.titulo;
                term_span.appendChild(link);
                grouped_children.appendChild(term_span);
                tree_node.appendChild(grouped_children);

                if (node.children.length > 0) {
                    const arrow = document.createElement('button');
                    arrow.className = 'arrow';
                    grouped_children.appendChild(arrow);

                    const branch = document.createElement('div');
                    branch.className = 'branch hide';
                    node.children.forEach(child => branch.appendChild(renderTree(child)));
                    tree_node.appendChild(branch);

                    arrow.addEventListener('click', function () {
                        if (this.classList.contains('open')) {
                            branch.classList.add('hide');
                            this.classList.remove('open');
                        } else {
                            branch.classList.remove('hide');
                            this.classList.add('open');
                        }
                    });
                }

                return tree_node;
            }

            thesaurusData.forEach(node => treeWrapper.appendChild(renderTree(node)));
        }

        appendTemplate(target, template);
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
                text_content : `${row.section_id} (${row.section_tipo})`,
                href : `https://pre-dedalo.mupreva.org/dedalo6-pre/core/page/?tipo=${row.section_tipo}&id=${row.section_id}`,
                parent : target
            })

            dedalo_link.setAttribute('target', '_blank');
            // target.appendChild(dedalo_link);
        }

        appendTemplate(target, this.templateShare(row));
        appendTemplate(target, this.template(row));

        if (row.table === 'immovables') {
            // parents breadcrumb
            const parsedIds = common.parseJsonArray(row.parents);
            const parsedTitles = common.parseJsonArray(row.parents_text);
            const parentsCutValencia = parsedIds.indexOf('6461') !== -1 ? parsedIds.indexOf('6461') : null;
            const parentsCutJaciments = parsedIds.indexOf('2') !== -1 ? parsedIds.indexOf('2') : null;

            if (parentsCutValencia || parentsCutJaciments) {
                const parentsCut = parentsCutValencia || parentsCutJaciments;
                parsedIds.splice(parentsCut, parsedIds.length - parentsCut);
                parsedTitles.splice(parentsCut, parsedTitles.length - parentsCut);
            }

            if (parsedIds.length > 0 && parsedIds.length === parsedTitles.length) {
                const parentsTitles = parsedIds.map((id, i) => {
                    const url = page_globals.__WEB_ROOT_WEB__ + '/imm/' + id;
                    return (`<a href="${url}" target="_blank">${parsedTitles[i]}</a>`);
                }).join(' / ');
                const parentsBreadcrumb = document.getElementById('parents-breadcrumb');
                parentsBreadcrumb.innerHTML = ` / ${parentsTitles}`;
            }
        }

        const acordion = common.create_dom_element({
            element_type: "div",
            class_name: "accordion accordion--primary mt-6",
        });
        target.appendChild(acordion);

        //fitxa tecnica
        if (row.tpl !== "imm") {
            appendTemplate(acordion, this.templateTecnic(row));
            this.getRelations(row);
        }

        //bibliografia
        this.templatePatrimonio(acordion, row);

        //patrimoni relacionat
        appendTemplate(acordion, this.templateRelated(row));

        if (row.tpl === "imm") {
            //visita al jaciment
            this.templateJacimentVisit(acordion, row);
            this.templateRelatedJaciments(acordion, row);
        }

        //recursos
        appendTemplate(acordion, this.templateResources(row));
        appendTemplate(acordion, this.template_modal());
        this.load_modal();

        //restauració
        appendTemplate(acordion, this.templateRestoration(row));

        //conjunto
        // appendTemplate(acordion, this.templateGroup(row));
        this.templateGroup(acordion, row);
        this.templateIsInSets(acordion, row);

        //bibliografia
        this.templateBiblio(acordion, row);

        //excavacions
        this.templateExcavations(acordion, row);

        if (row.table === 'immovables') {
            //thesaurus
            this.template_thesaurus(acordion, row);
        }

        /*return new Promise(function (resolve) {

            page.build_image_with_background_color(thumb_url)
                .then(function (response) {

                    const format = response.format

                    const fragment = item_row.draw_item(row, format, self)

                    // append finished fragment to target DOM
                    target.appendChild(fragment)

                    resolve(fragment)
                })
        })*/
    }, //end render

    /**
     * LOAD_RELATIONS
     * Load database relations from term_id
     * @return promise
     */
    load_relations: function (term_id, table) {
        const ar_fields = ["*"];
        const lang = page_globals.WEB_CURRENT_LANG_CODE;
        const sql_filter = "term_id='" + term_id + "'";

        table = table.length > 0 ? table : page.ts_tables;

        return new Promise(function (resolve) {
            // request
            data_manager
                .request({
                    body: {
                        dedalo_get: "records",
                        db_name: page_globals.WEB_DB,
                        table: table,
                        ar_fields: ar_fields,
                        lang: lang,
                        sql_filter: sql_filter,
                        limit: 0,
                        count: false,
                    },
                })
                .then((api_response) => {
                    const relations_data =
                        api_response.result && api_response.result.length > 0
                            ? page.parse_tree_data(api_response.result, null)
                            : null;

                    resolve(relations_data);
                });
        });
    }, //load_relations render
}; //end thesaurus
