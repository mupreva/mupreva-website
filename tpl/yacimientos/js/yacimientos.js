/*global tstring, page_globals, SHOW_DEBUG, row_fields, common, page, forms, document, DocumentFragment, tstring, console, _form */
/*eslint no-undef: "error"*/
/*jshint esversion: 6 */
"use strict";

var catalog = {
    /**
     * VARS
     */
    // row
    row: null,

    // rows_list_container
    rows_list_container: null,

    // map_results_list_container
    map_results_list_container: null,
    map_legend: null,
    map_marker_results: null,
    reset_map_results: null,

    // export_data_container
    export_data_container: null,

    // search_options
    search_options: {},

    // view_mode. rows view mode. default is 'list'. Others could be 'map', 'timeline' ..
    view_mode: null,

    // q
    q: null,

    // selected_term_table	: null, // Like 'mints'

    // global filters
    filters: {},
    filter_op: "$and",
    draw_delay: 200, // ms

    // form. instance of form_factory
    form: null,

    // list. instance of form_list
    list: null,

    // map. instance of form_map
    map: null,

    // search limit
    limit: null,

    // pagination
    pagination: null,

    // prev_filter. Stores search filter to compare with the new one
    prev_filter: false,

    // form_submit_state
    form_submit_state: null,

    // form_dates_range
    form_dates_range: {
        min: null,
        max: null,
    },

    // catalog_config. Object stored in browser local storage
    catalog_config: null,

    // ar_rows. fix db response in each call
    ar_rows: null,

    // full_data_cache
    full_data_cache: null,

    // fields
    ar_fields: [
        "section_id",
        "imagenes_identificativas",
        "titulo",
        "section_tipo",
        "periodo_data",
        "periodo",
        "geolocalizacion",
        "relations"
    ],

    // catalog loaded items
    loaded_items: null,

    /**
     * SET_UP
     */
    set_up: function (options) {
        const self = this;

        // options
        const row = options.row;
        const rows_list_container = options.rows_list_container;
        const map_legend = options.map_legend;
        const map_results_list_container = options.map_results_list_container;
        let map_marker_results = [];
        const export_data_container = options.export_data_container;
        const area_name = options.area_name; // catalog
        const q = options.q;

        // fix vars
        self.row = row;
        self.rows_list_container = rows_list_container;
        self.map_legend = map_legend;
        self.map_results_list_container = map_results_list_container;
        self.map_marker_results = map_marker_results;
        self.export_data_container = export_data_container;
        self.area_name = area_name;
        self.q = q;

        // set config
        self.set_config();

        // fix mode
        self.view_mode = self.catalog_config.view_mode
            ? self.catalog_config.view_mode
            : "list";

        self.didSearchSomething = null;

        const params = new URLSearchParams(window.location.search);
        if (params.has('view')) {
            switch(params.get('view')) {
                case 'list':
                    self.view_mode = "list";
                    break;
                case 'map':
                    self.view_mode = "map";
                    break;
                default:
                    self.view_mode = "list";
            }
        }
        if (params.has('filter')) {
            self.catalog_config.ar_tables = params.get('filter').split(',');
        }

        // limit (read cookie 'catalog_config' for possible previous values)
        const limit =
            self.catalog_config.pagination &&
            self.catalog_config.pagination.limit
                ? self.catalog_config.pagination.limit
                : self.view_mode === "map"
                ? 0
                : 18;

        // q case
        if (q && q.length > 0) {
            self.view_mode = "list";
            self.catalog_config.ar_tables = [
                "immovables",
            ];
        }

        // offset
        const offset = 0;

        // total
        const total = null;

        // pagination (only for list mode)
        self.pagination = {
            limit: parseInt(limit),
            offset: offset,
            total: total,
            n_nodes: 5,
        };

        // form. Created DOM form
        self.render_form({
            container: document.getElementById("items_container"),
        });

        const export_data_buttons = page.render_export_data_buttons()
        self.export_data_container.appendChild(export_data_buttons)


        // order
        const order = (function () {
            switch (self.view_mode) {
                case "map":
                    return "section_id ASC";
                default:
                    return "RAND()";
            }
        })();

        // exec first search
        if (self.q && self.q.length > 0) {
            // search based on q passed by url (from main home search for example)
            const global_search_form_item = self.form.form_items.global_search;
            global_search_form_item.node_input.value = self.q;
            global_search_form_item.q = self.q;

            self.form_submit({
                order: order,
                limit: limit,
            });
        } else {
            // defaul random search
            self.default_submit = true;
            self.form_submit({
                order: order,
                limit: limit,
            });
        }
        if (self.default_submit || self.view_mode !== "list") {
            self.export_data_container.classList.add("is-hidden");
        } else {
            self.export_data_container.classList.remove("is-hidden");
        }

        // subscribe events
        // event map_selected_marker
        event_manager.subscribe("map_selected_marker", selected_marker);
        function selected_marker(data) {
            //console.log(" selected_marker data:", data);
            self.map_marker_results = data.item.group;
            self.reset_map_results();
        }
        // event map_popup_selected_item
        event_manager.subscribe(
            "map_popup_selected_item",
            map_popup_selected_item
        );
        function map_popup_selected_item(data) {
            const url =
                page_globals.__WEB_ROOT_WEB__ +
                "/" +
                data.tpl +
                "/" +
                data.section_id;
            window.open(url);
        }
        // event paginate is triggered by list_factory.pagination nodes << < > >>
        event_manager.subscribe("paginate", paginating);
        function paginating(offset) {
            // update pagination vars
            self.pagination.offset = offset;
            // force search again
            self.form_submit();
        }
        // // event data_request_done is triggered when new search is done
        // event_manager.subscribe('data_request_done', data_request_done)
        // function data_request_done(options) {

        // 	// const node = page.render_export_data(options)

        // 	// // clean container
        // 	// while (self.export_data_container.hasChildNodes()) {
        // 	// 	self.export_data_container.removeChild(self.export_data_container.lastChild);
        // 	// }

        // 	// self.export_data_container.appendChild(node)
        // }

        // proxy
        // 	const proxy_handler = {
        // 		get : function(self, prop, receiver) {
        // 			// console.log("***** get prop, receiver:",prop, receiver);
        // 		},
        // 		set: function(self, prop, value) {
        // 			console.log("proxy_handler set prop, value:", prop, value);

        // 			if (prop==='view_mode') {
        // 				// event publish show/hide pagination limit options
        // 				event_manager.publish('set_view_mode', value)
        // 			}

        // 			self[prop] = value;
        // 			return true
        // 		}
        // 	};
        // 	self.proxy = new Proxy(self, proxy_handler);

        // update proxy
        // 	self.proxy.view_mode = self.view_mode
        event_manager.publish("set_view_mode", self.view_mode);

        // event publish template_render_end
        event_manager.publish("template_render_end", {});

        return true;
    }, //end set_up

    /**
     * SET_CONFIG
     * @param options object (optional)
     * @return
     */
    set_config: function (options) {
        const self = this;

        // cookie
        const catalog_config = localStorage.getItem("catalog_config");
        if (catalog_config) {
            // use existing one
            self.catalog_config = JSON.parse(catalog_config);
        } else {
            // create a new one
            const catalog_config = {
                view_mode: self.view_mode, // list, map
                pagination: self.pagination,
            };
            localStorage.setItem(
                "catalog_config",
                JSON.stringify(catalog_config)
            );
            self.catalog_config = catalog_config;
        }

        if (options) {
            for (const key in options) {
                self.catalog_config[key] = options[key];
            }
            localStorage.setItem(
                "catalog_config",
                JSON.stringify(self.catalog_config)
            );
        }

        return self.catalog_config;
    }, //end set_config

    /**
     * SWITCH_VIEW
     * @return promise
     */
    switch_view: function (view_mode, list_mode_group, element) {
        const self = this;

        if (self.view_mode === view_mode) {
            return; // nothing to change
        }

        // fix current across proxy
        // self.proxy.view_mode = view_mode
        self.view_mode = view_mode;

        event_manager.publish("set_view_mode", view_mode);

        // set config (localstorage)
        self.set_config({
            view_mode: view_mode,
        });

        // reset active and set current
        const active = list_mode_group.querySelector(".active");
        if (active) {
            active.classList.remove("active");
            const imgActive = active.querySelector("img");
            imgActive.src = imgActive.dataset.srcOff;
        }
        element.classList.add("active");
        const imgElement = element.querySelector("img");
        imgElement.src = imgElement.dataset.srcOn;

        switch (view_mode) {
            case "list":
                // fix limit again (is removed by map and timeline modes)
                self.pagination.limit = 18;
                self.map_results_list_container.innerHTML = "";
                // launch a new random search
                return self.form_submit();
                break;
            case "map":
                self.pagination.limit = 0;
                return self.form_submit({
                    order: "section_id ASC",
                });
                break;
        }

        return true;
    }, //end switch_view

    form_template: function () {
        const params = new URLSearchParams(window.location.search);
        const self = this;

        return htmlTemplate(`
<form action="#" class="search-form search-form--col">
    <fieldset>
        <div class="py-5 mb-5">
            <div class="columns">
                <div class="column">
                    <div class="field">
                        <label class="label is-sr-only" for="cercaPub">${tstring.immovable_seach_placeholder}</label>
                        <div class="control">
                            <input type="search" name="cercaPub" id="global_search" placeholder="${tstring.immovable_seach_placeholder}" value="" class="input">
                        </div>
                    </div>
                </div>
                <div class="column is-narrow">
                    <button type="submit" class="button">${tstring.search_button}</button>
                </div>
            </div>
            <details>
                <summary>${tstring.advanced_search}</summary>
                <div class="columns is-multiline">
                    <div class="column is-half-tablet is-one-third-desktop is-one-quarter-widescreen is-one-fifth-fullhd">
                        <div class="field">
                            <label class="label is-sr-only" for="section_id">${tstring.collection_id_label}</label>
                            <div class="control">
                                <input type="search" name="cercaNum" id="section_id" placeholder="${tstring.collection_id_label}" value="" class="input is-small">
                            </div>
                        </div>
                    </div>
                    <div class="column is-half-tablet is-one-third-desktop is-one-quarter-widescreen is-one-fifth-fullhd">
                        <div class="field">
                            <label class="label is-sr-only" for="title">${tstring.collection_title_label}</label>
                            <div class="control">
                                <input type="search" name="cercaTitol" id="title" placeholder="${tstring.collection_title_label}" value="" class="input is-small">
                            </div>
                        </div>
                    </div>
                    <div class="column is-half-tablet is-one-third-desktop is-one-quarter-widescreen is-one-fifth-fullhd">
                        <div class="field">
                            <label class="label is-sr-only" for="period">${tstring.collection_period_label}</label>
                            <div class="control">
                                <input type="input" name="cercaPeriode" id="period" placeholder="${tstring.collection_period_label}" value="" class="input is-small">
                                <div class="container_values"></div>
                            </div>
                        </div>
                    </div>
                    <div class="column is-half-tablet is-one-third-desktop is-one-quarter-widescreen is-one-fifth-fullhd">
                        <div class="field">
                            <label class="label is-sr-only" for="typology">${tstring.collection_typology_label}</label>
                            <div class="control">
                                <input type="input" name="cercaTipologia" id="typology" placeholder="${tstring.collection_typology_label}" value="" class="input is-small">
                                <div class="container_values"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </details>
        </div>
        <div class="is-flex is-justify-content-space-between is-align-items-center is-flex-wrap-wrap gap-3">
            <div class="field is-flex is-align-items-center mb-0 gap-2" id="limit_container">
                <label class="label mb-0" for="input_limit">${tstring.collection_input_limit}</label>
                <div class="control">
                    <div class="select select--simple is-flex is-align-items-center">
                        <select id="input_limit" name="registres">
                            <option value="18">18</option>
                            <option value="30">30</option>
                            <option value="40">40</option>
                            <option value="80">80</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </div>
            </div>
            <ul class="is-flex gap-5" id="mode_group">
                <li>
                    <button type="button" id="button_list" class="button button--icon">
                        <img src="/assets/img/galeria-inactiu.svg" data-src-on="/assets/img/galeria-actiu.svg" data-src-off="/assets/img/galeria-inactiu.svg" title="${tstring.show_list}" width="34" height="34">
                    </button>
                </li>
                <li>
                    <button type="button" id="button_map" class="button button--icon">
                        <img src="/assets/img/mapa-inactiu.svg" data-src-on="/assets/img/mapa-actiu.svg" data-src-off="/assets/img/mapa-inactiu.svg" title="${tstring.show_map}" width="34" height="34">
                    </button>
                </li>
            </ul>
        </div>
    </fieldset>
</form>
        `);
    },

    /**
     * RENDER_FORM
     * Create logic and view of search
     */
    render_form: function (options) {
        const self = this;

        return new Promise(function (resolve) {
            const form = self.form_template();
            const currentForm = form[0];
            appendTemplate(options.container, form);

            const fragment = new DocumentFragment();

            // form_factory instance
            self.form = self.form || new form_factory();

            // input global search
            const global_search = self.form.item_factory({
                id: "global_search",
                name: "global_search",
                label: tstring.global_search || "Global search",
                q_column: "search_data",
                eq: "MATCH",
                eq_in: "",
                eq_out: "",
                // q_table	: "catalog",
                class_name: "global_search",
                node_input: currentForm.querySelector("#global_search"),
                callback: function (form_item) {
                    const node_input = form_item.node_input;
                    //no fer res
                },
            });

            const submit_button = currentForm.querySelector(
                'button[type="submit"]'
            );

            submit_button.addEventListener("click", function (e) {
                e.preventDefault();
                self.pagination.offset = 0; // reset pagination always
                self.form_submit();
            });

            // ID
            self.form.item_factory({
                id: "section_id",
                name: "section_id",
                q_column: "section_id",
                eq: "=",
                eq_in: "",
                eq_out: "",
                node_input: currentForm.querySelector("#section_id"),
            });

            // title
            self.form.item_factory({
                id: "titulo",
                name: "titulo",
                q_column: "titulo",
                eq: "MATCH",
                eq_in: "",
                eq_out: "",
                node_input: currentForm.querySelector("#title"),
                /*callback: function (form_item) {
                    self.form.activate_autocomplete({
                        form_item: form_item,
                        table: self.get_tables,
                        limit: 60,
                        parse_result: function (ar_result, term) {
                            return self.parse_autocomplete_result(
                                ar_result,
                                term,
                                false
                            );
                        },
                    });
                },*/
            });

            // periodo
            self.form.item_factory({
                id: "periodo",
                name: "periodo",
                q_column: "periodo",
                q_splittable: true,
                value_split: ', ',
                eq: "LIKE",
                q_selected_eq: "LIKE",
                eq_in: "%",
                eq_out: "%",
                node_input: currentForm.querySelector("#period"),
                node_values: currentForm.querySelector('#period').closest('.control').querySelector('.container_values'),
                callback: function (form_item) {
                    self.form.activate_autocomplete({
                        form_item: form_item,
                        table: self.get_tables,
                        limit: 60,
                        parse_result: function (ar_result, term) {
                            return self.parse_autocomplete_result(
                                ar_result,
                                term,
                                false
                            );
                        },
                    });
                },
            });

            // tipologia
            self.form.item_factory({
                id: "tipologia",
                name: "tipologia",
                q_column: "tipologia",
                q_splittable: true,
                value_split: ', ',
                eq: "LIKE",
                q_selected_eq: "LIKE",
                eq_in: "%",
                eq_out: "%",
                node_input: currentForm.querySelector("#typology"),
                node_values: currentForm.querySelector('#typology').closest('.control').querySelector('.container_values'),
                callback: function (form_item) {
                    self.form.activate_autocomplete({
                        form_item: form_item,
                        table: self.get_tables,
                        limit: 60,
                        parse_result: function (ar_result, term) {
                            return self.parse_autocomplete_result(
                                ar_result,
                                term,
                                false
                            );
                        },
                    });
                },
            });

            const limit = currentForm.querySelector("#input_limit");
            limit.addEventListener("change", function () {
                self.pagination.limit = this.value;
                self.set_config({
                    pagination: self.pagination,
                });
            });

            const table_selector_container =
                currentForm.querySelector("#table_selector");
            self.table_selector_container = table_selector_container;

            common.when_in_dom(table_selector_container, function () {
                // set_up_slider
                // event changed_table_selector
                event_manager.publish("changed_table_selector", {});
            });


            // checkbox_immovable
            if (table_selector_container) {
                const checkbox_immovable = currentForm.querySelector(
                    "#checkbox_immovable"
                );
                checkbox_immovable.setAttribute("name", "catalog_tables");
                checkbox_immovable.setAttribute("value", "immovables");
                const checked = self.catalog_config.ar_tables
                    ? self.catalog_config.ar_tables.indexOf("immovables") !== -1
                    : true;
                if (checked && self.view_mode !== 'timeline')
                    checkbox_immovable.setAttribute("checked", checked);
                checkbox_immovable.addEventListener("change", function (e) {
                    self.changed_table_selector(e);
                    removeParam('filter');
                });
            }

            const list_mode_group = currentForm.querySelector("#mode_group");

            // button_list_mode
            const button_list_mode = currentForm.querySelector("#button_list");
            if (self.view_mode === "list") {
                button_list_mode.classList.add("active");
                const imgElement = button_list_mode.querySelector("img");
                imgElement.src = imgElement.dataset.srcOn;
            }
            button_list_mode.addEventListener("click", function (e) {
                e.preventDefault();
                self.switch_view("list", list_mode_group, this);
                removeParam('view');
            });
            // button_view_map_mode
            const button_view_map_mode =
                currentForm.querySelector("#button_map");
            if (self.view_mode === "map") {
                button_view_map_mode.classList.add("active");
                const imgElement = button_view_map_mode.querySelector("img");
                imgElement.src = imgElement.dataset.srcOn;
            }
            button_view_map_mode.addEventListener("click", function (e) {
                e.preventDefault();
                self.switch_view("map", list_mode_group, this);
                removeParam('view');
            });

            // add node
            self.form.node = currentForm;

            const input_limit_container =
                currentForm.querySelector("#limit_container");

            // set_view_mode event. Triggered when catalog instance property 'view_mode' changes its value across self.proxy
            event_manager.subscribe("set_view_mode", set_view_mode);
            function set_view_mode(mode) {
                if (mode === "list") {
                    input_limit_container.classList.remove("hide");
                } else {
                    input_limit_container.classList.add("hide");
                }
            }

            resolve(self.form.node);
        });
    }, //end render_form

    /**
     * PARSE_AUTOCOMPLETE_RESULT
     * @return array
     */
    parse_autocomplete_result: function (ar_result, term, q_splittable) {
        const self = this;

        const ar_ordered_result =
            q_splittable === true
                ? self.sort_array_by_property(ar_result, "value")
                : ar_result;
        const ar_filtered_result =
            term.length != 0
                ? self.filter_drop_down_list(ar_ordered_result, term)
                : ar_ordered_result;
        const ar_drow_down_list = ar_filtered_result.slice(0, 30);

        return ar_drow_down_list;
    }, //end parse_autocomplete_result

    /**
     * CHANGED_TABLE_SELECTOR
     * @return bool
     */
    changed_table_selector: function (e) {
        const self = this;

        // tables
        let ar_tables = [];
        const catalog_tables_checked = document.querySelectorAll(
            'input[name="catalog_tables"]:checked'
        );

        if (catalog_tables_checked) {
            for (let i = 0; i < catalog_tables_checked.length; i++) {
                ar_tables.push(catalog_tables_checked[i].value);
            }
        }

        // avoid de-select all options
        if (ar_tables < 1) {
            // recheck current checkbox item and return
            e.target.checked = true;
            return false;
        } else {
            self.set_config({
                ar_tables: ar_tables,
            });

            // event changed_table_selector
            event_manager.publish("changed_table_selector", {});

            self.form_submit();
        }

        return true;
    }, //end changed_table_selector

    /**
     * FORM_SUBMIT
     * Form submit launch search
     */
    form_submit: function (options) {
        const self = this;
        self.map_legend.innerHTML = '';

        self.didSearchSomething = !!(self.form && typeof self.form.has_active_filters === 'function' && self.form.has_active_filters());

        return new Promise(function (resolve) {
            // options
            options = typeof options !== "undefined" ? options : {};

            const order = options.order || "section_id ASC";
            const limit = options.limit || self.pagination.limit;
            const offset = options.offset || self.pagination.offset;

            // state check
            const remove_nodes = true;
            if (self.form_submit_state === "searching" && remove_nodes) {
                return new Promise(function () {
                    console.warn(
                        "Rejected form_submit. One search is in progress"
                    );
                });
            }
            self.form_submit_state = "searching";

            // clean rows_list_container and add_spinner
            const rows_list_container = self.rows_list_container;
            if (remove_nodes) {
                while (rows_list_container.hasChildNodes()) {
                    rows_list_container.removeChild(
                        rows_list_container.lastChild
                    );
                }
            }
            // add spinner
            const spinner = common.spinner(rows_list_container);

            // filter. Is built looking at form input values.
            const filter = self.form.build_filter();

            // search rows exec against API
            self.search_rows({
                filter: filter,
                limit: self.view_mode === "map" ? null : limit,
                offset: self.view_mode === "map" ? null : offset,
                //order: (self.view_mode === 'map') ? null : order
                order: order,
            }).then((response) => {
                if(!self.default_submit) {
                    const total = response.total || response.result.length || 0;
                    const resultsCountNode = document.createElement('p');
                    resultsCountNode.className = 'has-text-right';
                    resultsCountNode.textContent = `${total} ${(tstring.entries_found).toLowerCase()}`;
                    rows_list_container.appendChild(resultsCountNode);
                }

                // fix response in each call
                self.ar_rows = response.result;

                // update pagination total
                if (response.total !== undefined) {
                    self.pagination.total = response.total;
                }

                // render
                spinner.remove();

                self.render_data({
                    ar_rows: response.result,
                    target: rows_list_container,
                }).then(function (response) {
                    if (common.is_node(response)) {
                        rows_list_container.appendChild(response);
                    }
                    self.form_submit_state = "done";
                    event_manager.publish("rendered", {
                        rows_list_container: rows_list_container,
                        view_mode: self.view_mode,
                    });
                    resolve(rows_list_container); // All work is done. Final resolve !
                });

                // fix mode
                // set config
                self.set_config({
                    view_mode: self.view_mode,
                });

                // scroll to head result
                // if (response.result.length>0) {
                // 	const div_result = document.querySelector(".result")
                // 	if (div_result) {
                // 		// div_result.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
                // 		div_result.scrollIntoView({behavior: "auto", block: "center", inline: "nearest"});
                // 	}
                // }
            });
        });
    }, //end form_submit

    /**
     * SEARCH_ROWS
     * Call to API and load JSON data results of search
     */
    search_rows: function (options) {
        const self = this;

        // options
        const filter = options.filter || null;
        const ar_fields = options.ar_fields || this.ar_fields;
        const order =
            typeof options.order !== "undefined"
                ? options.order
                : "titulo ASC, section_id ASC";
        let limit = options.limit;
        let offset = options.offset;
        const process_result = options.process_result || null;

        // cache
        // if (self.full_data_cache && (self.view_mode==='timeline' || self.view_mode==='map')) {
        // 	return new Promise(function(resolve){
        // 		const response = self.full_data_cache
        // 		console.warn("--> returned data from cache:", response);
        // 		resolve(response)
        // 	})
        // }

        // parse_sql_filter
        const group = [];
        // const parsed_filter	= page.parse_sql_filter(filter, group)
        const parsed_filter = self.form.parse_sql_filter(filter, group);
        const has_periodo_data = '(periodo_data IS NOT NULL)';
        const is_destacado = '(destacado = "Sí" OR section_tipo = "tchi1")';

        const filters = [
            'tipologia_data like "%\\"2\\"%"'
        ];
        if (parsed_filter) filters.push(`(${parsed_filter})`);
        let sql_filter = filters.join(' AND ');

        // prev_filter fix
        self.prev_filter = sql_filter;

        // count
        let count = true;

        // timeline case
        if (self.view_mode === "timeline") {
            sql_filter = sql_filter
                ? `${sql_filter} AND ${is_destacado} AND ${has_periodo_data}`
                : `${is_destacado} AND ${has_periodo_data}`;
            limit = 0;
            offset = 0;
            count = false;
        }

        // map case
        if (self.view_mode === "map") {
            sql_filter = sql_filter
                ? sql_filter + " AND (geolocalizacion IS NOT NULL)"
                : "geolocalizacion IS NOT NULL";
        }

        // tables
        const ar_tables = self.get_tables();

        // request
        const request_body = {
            dedalo_get: "records",
            db_name: page_globals.WEB_DB,
            lang: page_globals.WEB_CURRENT_LANG_CODE,
            // table		: 'objects',
            table: ar_tables.join(","),
            ar_fields: ar_fields,
            sql_filter: sql_filter,
            limit: limit,
            group: group.length > 0 ? group.join(",") : null,
            count: count,
            offset: offset,
            order: order,
            process_result: process_result,
        };
        //if (ar_tables.indexOf('sets') !== -1) {
        request_body.resolve_portals_custom = {
            imagenes_identificativas: "image",
        };
        //}
        const js_promise = data_manager.request({
            body: request_body,
        });
        js_promise.then((response) => {
            event_manager.publish("data_request_done", {
                request_body: request_body,
                result: response.result,
            });
        });

        return js_promise;
    }, //end search_rows

    /**
     * GET_TABLES
     * @return array ar_tables
     */
    get_tables: function () {
        let ar_tables = [];
        const catalog_tables_checked = document.querySelectorAll(
            'input[name="catalog_tables"]:checked'
        );
        if (catalog_tables_checked) {
            for (let i = 0; i < catalog_tables_checked.length; i++) {
                ar_tables.push(catalog_tables_checked[i].value);
            }
        }
        if (ar_tables.length < 1) {
            ar_tables = [
                "immovables",
            ];
        }

        return ar_tables;
    }, //end get_tables

    /**
     * RENDER_DATA
     * Render received DB data based on 'view_mode' (list, map, timeline)
     * @return bool
     */
    render_data: function (options) {
        const self = this;

        return new Promise(function (resolve) {
            const ar_rows = options.ar_rows;
            const target = options.target;

            // css target reset
            //target.className = ''; // reset target class
            //target.style = ''; // reset target style
            //target.classList.add(self.view_mode)

            switch (self.view_mode) {
                case "list":
                    // case no results
                    if (ar_rows.length < 1 && self.q && self.q.length > 0) {
                        // clean form q item value
                        const global_search_form_item =
                            self.form.form_items.global_search;
                        global_search_form_item.node_input.value = "";
                        global_search_form_item.q = "";

                        // reset submit state
                        self.form_submit_state = "done";

                        // exec default random search
                        self.default_submit = true;
                        self.form_submit({
                            order: "RAND()",
                            limit: self.limit,
                        });
                        resolve();
                        return;
                    }

                    if (self.default_submit) {
                        self.export_data_container.classList.add("is-hidden");
                    } else {
                        self.export_data_container.classList.remove("is-hidden");
                    }

                    const pagination =
                        self.default_submit === true
                            ? false
                            : self.pagination;
                    const list_data = page.parse_list_data(ar_rows); // prepares data to use in list
                    self.list = self.list || new list_factory(); // creates / get existing instance of list
                    self.list.init({
                        data: list_data,
                        fn_row_builder: self.list_row_builder,
                        container_class: "galeria galeria--242x242 link-dn",
                        pagination: pagination,
                        caller: self,
                    });
                    self.list.render_list().then(function (list_node) {
                        if (self.default_submit === true) {
                            const suggesting_text =
                                common.create_dom_element({
                                    element_type: "h2",
                                    class_name: "suggesting_text",
                                    inner_html: self.row.abstract,
                                });
                            list_node.prepend(suggesting_text);
                        }

                        // reset default_submit state
                        self.default_submit = false;

                        resolve(list_node);
                    });
                    break;
                case "map":
                    const map_data = page.parse_map_data(ar_rows); // prepares data to use in map
                    //TODO: millorar mantenint el mapa anterior si ja n'hi ha, per evitar instanciar multiples mapes sense esborrar els anteriors event listeners i evitar memory leak
                    // self.map = self.map || new map_factory(); // creates / get existing instance of map
                    self.map = new map_factory(); // creates / get existing instance of map
                    self.map
                        .init({
                            source_maps: page.maps_config.source_maps,
                            map_position: null,
                            container: target,
                            popup_builder: page.map_popup_builder,
                            popup_options: page.maps_config.popup_options,
                        })
                        .then(function (leaflet_map) {
                            // parse data points
                            self.map
                                .parse_data_to_map(map_data)
                                .then(function (map_node) {
                                    resolve(true);
                                });
                        });

                    var legendContent = htmlTemplate(`
                        <p>
                            <img src="${page_globals.__WEB_TEMPLATE_WEB__ + "/assets/img/map/point_orange.png"}" style="width: 27px; height: 23px;">
                            ${tstring.location}
                        </p>`)
                    self.map_legend.innerHTML = '';
                    appendTemplate(self.map_legend, legendContent);

                    var content = htmlTemplate(`
                        <ul class="galeria galeria--242x242 link-dn" id="map_gallery">
                        </ul>
                    `)
                    appendTemplate(self.map_results_list_container, content);

                    const map_gallery = document.getElementById('map_gallery');

                    function reset_map_results() {
                        map_gallery.innerHTML = '';
                        appendTemplate(map_gallery, loadResults())
                        setTimeout(() => {
                        const el = self.map_results_list_container;
                        if (el) {
                            const top = el.getBoundingClientRect().top + window.scrollY - 150;

                            window.scrollTo({
                            top: top,
                            behavior: 'smooth'
                            });
                        }
                        }, 0);
                    }

                    self.reset_map_results = reset_map_results;

                    function loadResults() {
                        return htmlTemplate(`
                            ${self.map_marker_results.map(function(data){
                                const url = page_globals.__WEB_ROOT_WEB__ + '/' + data.tpl + '/' + data.section_id;
                                var image_url = '/assets/img/placeholder.png';
                                if (data.identifying_images !== null && data.identifying_images !== '') {
                                    image_url = data.identifying_images;
                                }
                                return `
                                <li class="${data.tpl}">
                                    <a href="${url}" target="_blank">
                                        <figure>
                                            <img loading="lazy" src="${image_url}" alt="">
                                            ${(data.title)?`
                                            <figcaption>${data.title}</figcaption>
                                            `:''}
                                        </figure>
                                    </a>
                                </li>`;
                            }).join('')}
                        `)
                    }

                    break;

                case "timeline":
                    const unordered_timeline_data =
                        page.parse_timeline_data_catalog(ar_rows); // prepares data to use in timeline

                    const periodIds = unordered_timeline_data.map(el => Number(el.date))

                    api.getPeriodYears(periodIds).then(function (periods) {
                        const periodsObj = periods.reduce(function (acc, el) {
                            let year = null;
                            if (el.time) {
                                const firstDate = el.time.split(',')[0].trim();
                                year = firstDate.startsWith('-')
                                    ? `-${firstDate.split('-')[1]}`
                                    : firstDate.split('-')[0];
                            }
                            acc[el.section_id] = {year, term: el.term}
                            return acc;
                        }, {});

                        const timeline_data = unordered_timeline_data
                            .map(item => {
                                return {
                                    ...item,
                                    year: periodsObj[item.date] ? periodsObj[item.date].year : null,
                                    date: periodsObj[item.date] ? periodsObj[item.date].term : null
                                }
                            })
                            .sort((a, b) => {
                                if (a.year === null) return 1; // move null years to the end
                                if (b.year === null) return -1; // move null years to the end
                                return a.year - b.year; // sort by year ascending
                            })

                        self.timeline = self.timeline || new timeline_factory(); // creates / get existing instance of timeline
                        self.timeline
                            .init({
                                target: target,
                                block_builder: self.timelime_block_builder,
                                max_group_nodes: 5, // max nodes rendered by group (year)
                            })
                            .then(function () {
                                self.timeline
                                    .render_timeline({
                                        data: timeline_data,
                                    })
                                    .then(function (timeline_node) {
                                        resolve(timeline_node);
                                    });
                            });
                    });
                    break;
            }
        });
    }, //end render_data

    /**
     * LIST_ROW_BUILDER
     * Build DOM nodes to insert into list pop-up
     */
    list_row_builder: function (row, view_mode) {
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
        } else if (row.relations) {
            const relations = JSON.parse(row.relations);
            const randomImg = relations[Math.floor(Math.random() * relations.length)].image;
            if (randomImg) {
                image_url = __WEB_MEDIA_ENGINE_URL__ + randomImg;
            }
        }
        return htmlTemplate(`
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
        `)[0];
    }, //end list_row_builder

    /**
     * FORMAT_DROP_DOWN_LIST
     * Formats drop down list items to show their content depending on the data type
     */
    format_drop_down_list: function (column, value) {
        if (column === "dating") {
            return common.clean_date(value, ",").join(" - ");
        } else {
            if (column === "collection") {
                return common.clean_gaps(value);
            } else {
                return value;
            }
        }
    }, //end format_drop_down_list

    /**
     * SORT_ARRAY_BY_PROPERTY
     * Sorts an array by a given property
     */
    sort_array_by_property: function (array, property) {
        const ar_ordered = array.sort(function (a, b) {
            return a[property].localeCompare(b[property]);
        });

        return ar_ordered;
    }, //end sort_array_by_property

    /**
     * FILTER_DROP_DOWN_LIST
     * Filters drop down list items to show a filtered list depending on the filtering string
     */
    filter_drop_down_list: function (array, filter_string) {
        return array.filter(function (el) {
            const el_normalized = el.value
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            const filtered =
                el.value.toLowerCase().indexOf(filter_string.toLowerCase()) >
                    -1 ||
                el_normalized
                    .toLowerCase()
                    .indexOf(filter_string.toLowerCase()) > -1;
            return filtered;
        });
    }, //end filter_drop_down_list

    /**
     * TIMELIME_BLOCK_BUILDER
     */
    timelime_block_builder: function (item, max_group_nodes) {
        const self = this;

        const timeline_icon_src =
            __WEB_TEMPLATE_WEB__ + "/assets/images/cd-icon-picture.svg";
        const group_date = item.date;

        // NEW WAY (without limit, only group nodes are limited)
        // wrapper
        const block = common.create_dom_element({
            element_type: "div",
            class_name: "cd-timeline__block",
        });

        // icon
        const image_icon = common.create_dom_element({
            element_type: "div",
            class_name: "cd-timeline__img cd-timeline__img--picture",
            parent: block,
        });

        // content
        const block_content = common.create_dom_element({
            element_type: "div",
            class_name: "cd-timeline__content text-component",
            parent: block,
        });

        // date and link
        const below_container = common.create_dom_element({
            element_type: "div",
            class_name: "flex justify-between items-center",
            parent: block_content,
        });
        const date_span = common.create_dom_element({
            element_type: "h2",
            class_name: "cd-timeline__date",
            text_content: group_date,
            parent: below_container,
        });

        // content
        common.create_dom_element({
            element_type: "p",
            class_name: "has-text-weight-light is-size-6 has-text-grey-dark",
            inner_html:
                item.data_group.length +
                " " +
                (item.data_group.length > 1
                    ? tstring.timeline_elements
                    : tstring.timeline_element),
            parent: block_content,
        });

        // content
        const block_content_list = common.create_dom_element({
            element_type: "ul",
            class_name: "link-dn mt-0 flow--l",
            parent: block_content,
        });

        // render block items loop data_group
        const limit = max_group_nodes;
        let vieved = 0;
        const data_group_length = item.data_group.length;

        // iterate function
        function iterate(from, to) {
            const fragment2 = new DocumentFragment();

            for (let i = from; i < to; i++) {
                const section_id = item.data_group[i].section_id; //|| "Undefined title"
                const tpl = item.data_group[i].tpl; //|| "Undefined title"
                const title = item.data_group[i].title; //|| "Undefined title"
                const image_src = item.data_group[i].image_src;
                const date = item.data_group[i].date;

                const url =
                    page_globals.__WEB_ROOT_WEB__ +
                    "/" +
                    tpl +
                    "/" +
                    section_id;
                var content = htmlTemplate(`
                    <li>
                        <a href="${url}" target="_blank">
                            <figure class="is-flex-tablet gap-4">
                                <img src="${image_src}" alt="" class="flex-grow-0 mx-0">
                                <figcaption class="mt-4">${title}</figcaption>
                            </figure>
                        </a>
                    </li>
                `);

                appendTemplate(block_content_list, content);
            } //end for (let i = from; i < to; i++)

            // load more button
            if (to < data_group_length - 1) {
                vieved = vieved + (to - from);

                const block_item = common.create_dom_element({
                    element_type: "div",
                    class_name: "has-text-centered-mobile",
                    parent: fragment2,
                });

                const label =
                    (tstring["load_more"] || "Load more..") +
                    " (" +
                    vieved +
                    " " +
                    tstring.of +
                    " " +
                    data_group_length +
                    ")";
                const more_node = common.create_dom_element({
                    element_type: "button",
                    class_name:
                        "button button--icon button--carrega has-text-black",
                    type: "button",
                    inner_html: label,
                    parent: block_item,
                });

                more_node.offset = to;

                more_node.addEventListener("click", function () {
                    const _from = parseInt(this.offset);
                    const _to = data_group_length; // view all in one click
                    iterate(_from, _to);

                    this.remove();
                });
            }

            // append to parent
            block_content.appendChild(fragment2);
        }

        // first, iterate elements from zero to limit
        const to = limit < data_group_length ? limit : data_group_length;
        iterate(0, to);

        return block;
    }, //end timelime_block_builder

    /**
     * GET_RANGE_YEARS
     * @return
     */
    get_range_years: function () {
        const self = this;

        return new Promise(function (resolve) {
            const ar_tables = self.get_tables();
            const ar_fields = [
                "id",
                "section_tipo",
                "MIN(datacion_fin) AS min",
                "MAX(datacion_fin) AS max",
            ];

            const request_body = {
                dedalo_get: "records",
                db_name: page_globals.WEB_DB,
                lang: page_globals.WEB_CURRENT_LANG_CODE,
                table: ar_tables.join(","),
                ar_fields: ar_fields,
                limit: 0,
                count: false,
                offset: 0,
                order: "id ASC",
            };
            data_manager
                .request({
                    body: request_body,
                })
                .then(function (api_response) {
                    let min = 0;
                    let max = 0;
                    if (api_response.result) {
                        for (let i = 0; i < api_response.result.length; i++) {
                            const row = api_response.result[i];
                            const current_min = parseInt(row.min);
                            if (min === 0 || current_min < min) {
                                min = current_min;
                            }
                            const current_max = parseInt(row.max);
                            if (current_max > max) {
                                max = current_max;
                            }
                        }
                    }

                    const data = {
                        min: min,
                        max: max,
                    };

                    resolve(data);
                });
        });
    }, //end get_range_years
}; //end catalog
