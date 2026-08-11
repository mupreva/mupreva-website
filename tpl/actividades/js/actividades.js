/*global tstring, page_globals, SHOW_DEBUG, row_fields, common, page, forms, document, DocumentFragment, tstring, console, _form */
/*eslint no-undef: "error"*/
/*jshint esversion: 6 */
"use strict";

var actividades = {
    /**
     * VARS
     */
    // row
    row: null,

    // rows_list_container
    rows_list_container: null,

    // export_data_container
    export_data_container: null,

    // search_options
    search_options: {},

    // view_mode. rows view mode. default is 'list'. Others could be 'timeline' ..
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

    // timeline. instance of form_timeline
    timeline: null,

    // search limit
    limit: null,

    // pagination
    pagination: null,

    // prev_filter. Stores search filter to compare with the new one
    prev_filter: false,

    // form_submit_state
    form_submit_state: null,

    // catalog_config. Object stored in browser local storage
    activity_config: null,

    // ar_rows. fix db response in each call
    ar_rows: null,

    // full_data_cache
    full_data_cache: null,

    // fields
    ar_fields: [
        "section_id",
        "identifying_image_data",
        "title",
        "time_frame",
        "type",
        "date_start_year",
    ],

    activity_table: "activities",

    /**
     * SET_UP
     */
    set_up: function (options) {
        const self = this;

        // options
        const row = options.row;
        const rows_list_container = options.rows_list_container;
        const export_data_container = options.export_data_container;
        const area_name = options.area_name; // catalog
        const q = options.q;

        // fix vars
        self.row = row;
        self.rows_list_container = rows_list_container;
        self.export_data_container = export_data_container;
        self.area_name = area_name;
        self.q = q;

        // set config
        self.set_config();

        // fix mode
        self.view_mode = self.activity_config.view_mode
            ? self.activity_config.view_mode
            : "list";

        // limit (read cookie '' for possible previous values)
        const limit = self.view_mode === "timeline" ? 0 : 24;

        // q case
        if (q && q.length > 0) {
            self.view_mode = "list";
        }

        self.didSearchSomething = null

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

        // order
        const order = (function () {
            switch (self.view_mode) {
                case "timeline":
                    return "time_frame desc";
                default:
                    return "time_frame desc";
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
            if (self.view_mode === "timeline") {
                self.form_submit({
                    order: order,
                    limit: limit,
                });
            } else {
                self.default_submit = true;
                self.form_submit({
                    filter: "(time_frame is not null and NOW() BETWEEN STR_TO_DATE(SUBSTRING_INDEX(time_frame, ',', 1), '%Y-%m-%d %H:%i:%s') AND STR_TO_DATE(SUBSTRING_INDEX(time_frame, ',', -1), '%Y-%m-%d %H:%i:%s'))",
                    order: "time_frame desc",
                    limit: limit,
                });
            }
        }

        // subscribe events
        // event paginate is triggered by list_factory.pagination nodes << < > >>
        event_manager.subscribe("paginate", paginating);
        function paginating(offset) {
            // update pagination vars
            self.pagination.offset = offset;
            // force search again
            self.form_submit();
        }
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
        const activity_config = localStorage.getItem("activity_config");
        if (activity_config) {
            // use existing one
            self.activity_config = JSON.parse(activity_config);
        } else {
            // create a new one
            const activity_config = {
                view_mode: self.view_mode, // list, timeline
                pagination: self.pagination,
            };
            localStorage.setItem(
                "activity_config",
                JSON.stringify(activity_config)
            );
            self.activity_config = activity_config;
        }

        if (options) {
            for (const key in options) {
                self.activity_config[key] = options[key];
            }
            localStorage.setItem(
                "activity_config",
                JSON.stringify(self.activity_config)
            );
        }

        return self.activity_config;
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

        const previous_view_mode = JSON.parse(JSON.stringify(self.view_mode));

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
                self.pagination.limit = 24;
                // launch a new random search
                return self.form_submit();
                break;
            case "timeline":
                self.pagination.limit = 0;
                return self.form_submit({
                    order: "time_frame desc",
                });
                break;
        }

        return true;
    }, //end switch_view

    form_template: function () {
        return htmlTemplate(`
<form action="#" class="search-form">
    <fieldset>
        <div class="mb-5">
            <div class="columns is-multiline">

                <div class="column is-half-tablet is-one-fifth-widescreen is-4-fullhd">
                    <div class="field">
                        <label class="label is-sr-only" for="cercaPub">${tstring.activitis_seach_label}</label>
                        <div class="control">
                            <input type="search" name="cercaPub" id="global_search" placeholder="${tstring.activitis_seach_label}" value="" class="input">
                        </div>
                    </div>
                </div>
                <div class="column is-half-tablet is-one-quarter-desktop is-one-fifth-widescreen is-2-fullhd">
                    <div class="field">
                        <label class="label is-sr-only" for="cercaType">${tstring.activitis_category_label}</label>
                        <div class="control">
                            <input type="search" name="cercaType" id="type" placeholder="${tstring.activitis_category_label}" value="" class="input">
                        </div>
                    </div>
                </div>
                <div class="column is-half-tablet is-one-quarter-desktop is-one-fifth-widescreen is-2-fullhd">
                    <div class="field">
                        <label class="label is-sr-only" for="cercaData">${tstring.activitis_date_label}</label>
                        <div class="control">
                            <input type="number" name="cercaData" id="time_frame" value="" class="input" min="1000" max="9999" step="1" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="${tstring.activitis_date_label}">
                        </div>
                    </div>
                </div>
                <div class="column is-half-tablet is-one-quarter-desktop is-one-fifth-widescreen is-2-fullhd">
                    <div class="field">
                        <label class="label is-sr-only" for="cercaUbicacio">${tstring.activitis_site_label}</label>
                        <div class="control">
                            <input type="search" name="cercaLloc" id="place" placeholder="${tstring.activitis_site_label}" value="" class="input">
                        </div>
                    </div>
                </div>


                <div class="column is-half-tablet is-one-quarter-desktop is-one-fifth-widescreen is-2-fullhd">
                    <button type="submit" class="button is-fullwidth">${tstring.search_button}</button>
                </div>
            </div>
        </div>

        <div class="is-flex is-justify-content-space-between is-align-items-center is-flex-wrap-wrap gap-3 mt-7">
            <h2 id="subtitle"></h2>


            <ul class="is-flex gap-5" id="mode_group">
                <li>
                    <button type="button" id="button_list" class="button button--icon">
                        <img src="/assets/img/galeria-inactiu.svg" data-src-on="/assets/img/galeria-actiu.svg" data-src-off="/assets/img/galeria-inactiu.svg" title="${tstring.show_list}" width="34" height="34">
                    </button>
                </li>
                <li>
                    <button type="button" id="button_timeline" class="button button--icon">
                        <img src="/assets/img/linia-temps-inactiu.svg" data-src-on="/assets/img/linia-temps-actiu.svg" data-src-off="/assets/img/linia-temps-inactiu.svg" title="${tstring.show_timeline}" width="34" height="34">
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

            var customFilter = api.categoryToSqlDiscard(api.actividadesBlacklistCategorias());
            // object
            self.form.item_factory({
                id: "type",
                name: "type",
                q_column: "type",
                eq: "LIKE",
                eq_in: "%",
                eq_out: "%",
                node_input: currentForm.querySelector("#type"),
                callback: function (form_item) {
                    self.form.activate_autocomplete({
                        form_item: form_item,
                        table: self.activity_table,
                        limit: 60,
                        custom_filter: customFilter,
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

            // title
            self.form.item_factory({
                id: "place",
                name: "place",
                q_column: "place",
                eq: "LIKE",
                eq_in: "%",
                eq_out: "%",
                node_input: currentForm.querySelector("#place"),
                callback: function (form_item) {
                    self.form.activate_autocomplete({
                        form_item: form_item,
                        table: self.activity_table,
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

            // materia
            self.form.item_factory({
                id: "time_frame",
                name: "time_frame",
                q_column: "time_frame",
                //sql_filter: "BETWEEN STR_TO_DATE(SUBSTRING_INDEX(time_frame, ',', 1), '%Y-%m-%d %H:%i:%s') AND STR_TO_DATE(SUBSTRING_INDEX(time_frame, ',', -1), '%Y-%m-%d %H:%i:%s')",
                //eq: "LIKE",
                //eq_in: "%",
                //eq_out: "%",
                node_input: currentForm.querySelector("#time_frame"),
                callback: function (form_item) {
                    const node_input = form_item.node_input;
                    function dateHandler() {
                        const year = form_item.q;
                        if (year !== "" && /^\d{4}$/.test(year)) {
                            form_item.sql_filter =
                                "(STR_TO_DATE(SUBSTRING_INDEX(time_frame, ',', 1), '%Y-%m-%d %H:%i:%s') <= '" +
                                year +
                                "-12-31 23:59:59' AND STR_TO_DATE(SUBSTRING_INDEX(time_frame, ',', -1), '%Y-%m-%d %H:%i:%s') >= '" +
                                year +
                                "-01-01 00:00:00')";
                        } else {
                            form_item.sql_filter = null;
                        }
                    }
                    dateHandler();
                    node_input.addEventListener("change", function (event) {
                        event.preventDefault();
                        dateHandler();
                    });
                },
            });

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
            });
            // button_view_timeline_mode
            const button_view_timeline_mode =
                currentForm.querySelector("#button_timeline");
            if (self.view_mode === "timeline") {
                button_view_timeline_mode.classList.add("active");
                const imgElement =
                    button_view_timeline_mode.querySelector("img");
                imgElement.src = imgElement.dataset.srcOn;
            }
            button_view_timeline_mode.addEventListener("click", function (e) {
                e.preventDefault();
                self.switch_view("timeline", list_mode_group, this);
            });

            // add node
            self.form.node = currentForm;

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

        const form_inputs = document.querySelectorAll('input, select, textarea, button');
        form_inputs.forEach(function (input) {
            input.disabled = true;
        });

        self.didSearchSomething = !!(self.form && typeof self.form.has_active_filters === 'function' && self.form.has_active_filters());

        return new Promise(function (resolve) {
            // options
            options = typeof options !== "undefined" ? options : {};

            const order = options.order || "time_frame desc";
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
            //const filter = self.form.build_filter()
            const filter =
                typeof options.filter !== "undefined"
                    ? options.filter
                    : self.form.build_filter();

            // search rows exec against API
            self.search_rows({
                filter: filter,
                limit: limit,
                offset: offset,
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
                    form_inputs.forEach(function (input) {
                        input.disabled = false;
                    });
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

        // parse_sql_filter
        const group = [];

        // const parsed_filter	= page.parse_sql_filter(filter, group)
        var parsed_filter = filter;
        if (typeof filter !== "string") {
            parsed_filter = self.form.parse_sql_filter(filter, group);
        }
        //const parsed_filter = filter
        let sql_filter = parsed_filter ? "(" + parsed_filter + ")" : null;

        // prev_filter fix
        self.prev_filter = sql_filter;

        // count
        let count = true;

        // timeline case
        if (self.view_mode === "timeline") {
            sql_filter = sql_filter
                ? sql_filter + " AND time_frame is not null"
                : "time_frame is not null";
            limit = 0;
            offset = 0;
            count = false;
        }

        var customFilter = api.categoryToSqlDiscard(api.actividadesBlacklistCategorias());
        sql_filter = sql_filter
            ? sql_filter + " AND " + customFilter
            : customFilter;

        // request
        const request_body = {
            dedalo_get: "records",
            db_name: page_globals.WEB_DB,
            lang: page_globals.WEB_CURRENT_LANG_CODE,
            // table		: 'objects',
            table: this.activity_table,
            ar_fields: ar_fields,
            sql_filter: sql_filter,
            limit: limit,
            group: group.length > 0 ? group.join(",") : null,
            count: count,
            offset: offset,
            order: order,
            process_result: process_result,
        };
        request_body.resolve_portals_custom = {
            identifying_image_data: "image",
        };
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
     * RENDER_DATA
     * Render received DB data based on 'view_mode' (list, timeline)
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
                            order: "time_frame desc",
                            limit: self.limit,
                        });
                        resolve();
                        return;
                    }

                    if (self.default_submit || self.didSearchSomething === false) {
                        var content =
                            templateModules.bloque_actividades_actuales();
                        appendTemplate(self.rows_list_container, content);
                        let actualesFound = false;
                        let subtitleText = "";
                        if (content && content[0]) {
                            actualesFound = true;
                            subtitleText = tstring.activitis_title_current;
                        }
                        var subtitle = document.getElementById("subtitle");
                        subtitle.innerHTML = subtitleText;
                        templateModules.bloque_actividades_anuales(self.rows_list_container, actualesFound);
                        self.default_submit = false;
                        resolve();
                        return;
                    } else {
                        const pagination =
                            self.default_submit === true ? false : self.pagination;
                        const container_class =
                            self.default_submit === true
                                ? "galeria galeria--242x342 activitats-list link-dn"
                                : "galeria galeria--170x240 link-dn activitats-list";
                        const list_data = page.parse_list_data(ar_rows); // prepares data to use in list
                        self.list = self.list || new list_factory(); // creates / get existing instance of list
                        self.list.init({
                            data: list_data,
                            fn_row_builder: self.list_row_builder,
                            container_class: container_class,
                            pagination: pagination,
                            caller: self,
                        });
                        self.list.render_list().then(function (list_node) {
                            var subtitle = document.getElementById("subtitle");
                            if (self.default_submit === true) {
                                subtitle.innerHTML =
                                    tstring.activitis_title_current;
                            } else {
                                subtitle.innerHTML = tstring.activitis_results;
                            }

                            // reset default_submit state
                            self.default_submit = false;

                            resolve(list_node);
                        });
                    }

                    break;

                case "timeline":
                    var subtitle = document.getElementById("subtitle");
                    subtitle.innerHTML = "";
                    const timeline_data =
                        page.parse_timeline_data_activity(ar_rows); // prepares data to use in timeline
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
                                    data: [...timeline_data].reverse(),
                                })
                                .then(function (timeline_node) {
                                    resolve(timeline_node);
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
        if (row.identifying_image_data.length > 0) {
            image_url =
                __WEB_MEDIA_ENGINE_URL__ + row.identifying_image_data[0].image;
        }
        var date = null;
        if (row.time_frame) {
            var date = formatDateRange(
                row.time_frame,
                page_globals.WEB_CURRENT_LANG_CODE
            );
        }
        return htmlTemplate(`
        <li class="${row.tpl}">
            <div class="is-flex is-flex-direction-column gap-3 full-link">
                <h3 class="is-size-6 has-text-weight-semibold">
                    <a href="${url}" target="_blank">${row.title}</a>
                </h3>
                ${
                    row.type
                        ? `<p class="has-text-weight-medium is-size-6">
                    <a href="/activitats/?type=${row.type}" class="link-dn is-relative">${row.type}</a>
                </p>`
                        : ""
                }
                <img loading="lazy" src="${image_url}" alt="">
                ${
                    date
                        ? `<p class="has-text-primary has-text-weight-semibold is-size-6">
                    ${date}
                </p>`
                        : ""
                }
                ${
                    row.time_start
                        ? `<p class="has-text-primary has-text-weight-semibold is-size-6">
                    ${row.time_start}
                </p>`
                        : ""
                }
            </div>
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
                const title = item.data_group[i].title; //|| "Undefined title"
                const summary = item.data_group[i].description; //|| "Undefined description"
                const image_src = item.data_group[i].image_src;
                const date = item.data_group[i].date;

                const url =
                    page_globals.__WEB_ROOT_WEB__ + "/act/" + section_id;
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
            //block_content_list.appendChild(fragment)
            block_content.appendChild(fragment2);
        }

        // first, iterate elements from zero to limit
        const to = limit < data_group_length ? limit : data_group_length;
        iterate(0, to);

        return block;
    }, //end timelime_block_builder
}; //end catalog
