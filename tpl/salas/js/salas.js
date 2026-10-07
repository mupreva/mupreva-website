/*global $, tstring, page_globals, SHOW_DEBUG, page, Promise, common, document, DocumentFragment, tstring, console, form_factory, data_manager, tree_factory */
/*eslint no-undef: "error"*/
/*jshint esversion: 6 */
"use strict";



var salas = {


    /**
    * VARS
    */
    // search_options
    search_options: {},

    // view_mode. rows view mode. default is 'list'. Others could be 'map', 'timeline' ..
    view_mode: null,

    // global filters
    filters: {},
    filter_op: "AND",
    draw_delay: 200, // ms

    // form. instance of form_factory
    form: null,

    // list. instance of form_list
    list: null,

    // map. instance of form_map
    map: null,

    // timeline. instance of form_timeline
    timeline: null,

    // table (array)
    table: [],

    // root_term (array)
    root_term: [],

    // term_id (from url get request)
    term_id: null,

    // tree_data. raw data from request load tree data
    tree_data: null,



    /**
    * SET_UP
    */
    set_up: function (options) {

        const self = this

        // options
        self.table = options.table; // self table (array)
        self.root_term = options.root_term; // self root_term (array)
        self.term_id = options.term_id
        const rows_list = options.rows_list

        // set view_mode default
        self.view_mode = 'tree'

        // spinner
        const spinner = common.create_dom_element({
            element_type: "div",
            class_name: "spinner"
        })

        // abstract
        const abstract_icon = document.getElementById("abstract_icon")
        if (abstract_icon) {

            const abstract = document.getElementById("abstract")

            // initial status
            const ts_info_readed = localStorage.getItem('ts_info_readed') || '0';
            if (ts_info_readed == '0') {
                // show
                abstract.classList.remove("hide")
                // set as readed (this show only once the info)
                localStorage.setItem('ts_info_readed', '1');
            }

            // click event
            abstract_icon.addEventListener("click", function (e) {

                if (!abstract.classList.contains("hide")) {
                    // is open now
                    // close
                    abstract.classList.add("hide")
                    // set as read
                    localStorage.setItem('ts_info_readed', '1');
                } else {
                    // is close now
                    // open
                    abstract.classList.remove("hide")
                }
            })
        }


        // form. Created DOM form
        self.render_form({
            container: document.getElementById("items_container")
        })
            .then(function () {
                rows_list.appendChild(spinner)
            })

        // tree. load tree data and render tree nodes
        self.load_tree_data({})
            .then(function (ar_rows) {

                const organized_data = self.organize_data(ar_rows, self.root_term);

                return self.render_tree(rows_list, organized_data);

                // const render = self.render_data({
                //     target: rows_list,
                //     ar_rows: ar_rows,
                //     set_hilite: (self.term_id && self.term_id.length > 0)
                // })

            }).then(() => spinner.remove());

        // event publish template_render_end
        event_manager.publish('template_render_end', {})

        return true
    },//end set_up



    /**
    * LOAD_TREE_DATA
    * Call to API and load JSON data results of search
    */
    load_tree_data: function (options) {

        const self = this

        // fields / columns
        const default_fields = [
            'section_id',
            'term_id',
            'term',
            'children',
            //'code',
            'descriptor',
            'illustration',
            'definition',
            //'indexation',
            'model',
            'norder',
            'parent',
            //'related',
            'scope_note',
            'space',
            //'time',
            'tld',
            'relations',
            'imagenes',
            'imagenes_identificativas'
        ]

        // options
        const filter = options.filter || null
        const ar_fields = options.ar_fields || default_fields || ["*"]
        const order = options.order || "norder ASC"
        const table = options.table || self.table.join(',')
        const force_load = options.force_load || false

        // already loaded
        if (!force_load && self.tree_data && self.tree_data.length > 0) {
            return new Promise(function (resolve) {
                // clone always to preserve original data untouched
                const tree_data = JSON.parse(JSON.stringify(self.tree_data))
                // fake wait
                setTimeout(function () {
                    resolve(tree_data)
                }, 75)
            })
        }

        // sort vars
        const lang = page_globals.WEB_CURRENT_LANG_CODE

        // parse_sql_filter
        const group = []
        const parse_sql_filter = function (filter) {

            if (filter) {

                const op = Object.keys(filter)[0]
                const ar_query = filter[op]

                const ar_filter = []
                const ar_query_length = ar_query.length
                for (let i = 0; i < ar_query_length; i++) {

                    const item = ar_query[i]

                    const item_op = Object.keys(item)[0]
                    if (item_op === "AND" || item_op === "OR") {

                        const current_filter_line = "(" + parse_sql_filter(item) + ")"
                        ar_filter.push(current_filter_line)
                        continue;
                    }

                    const filter_line = (item.field.indexOf("AS") !== -1)
                        ? "" + item.field + "" + " " + item.op + " " + item.value
                        : "`" + item.field + "`" + " " + item.op + " " + item.value

                    ar_filter.push(filter_line)

                    // group
                    if (item.group) {
                        group.push(item.group)
                    }
                }
                return ar_filter.join(" " + op + " ")
            }

            return null
        }

        var filterAux = this.root_term.map(function(elem){
            return 'term_id = "'+elem+'" or parents like "%\\"'+elem+'\\"%"';
        }).join(' or ');

        // parsed_filters
        var sql_filter = parse_sql_filter(filter)

        if (sql_filter) {
            sql_filter = '('+filterAux+')'+' and '+filter;
        } else {
            sql_filter = '('+filterAux+')'
        }

        return new Promise(function (resolve) {
            // request
            const body = {
                dedalo_get: 'records',
                db_name: page_globals.WEB_DB,
                table: table,
                ar_fields: ar_fields,
                lang: lang,
                sql_filter: sql_filter,
                limit: 0,
                count: false,
                order: order,
            }
            data_manager.request({
                body: body,
                cache: 'force-cache'
            })
                .then(function (response) {

                    if (response.result) {

                        const raw_tree_data = JSON.parse(JSON.stringify(response.result))

                        // group parents
                        self.tree_data = self.group_parents(raw_tree_data)
                        resolve(self.tree_data)
                    }
                })
        })
    },//end load_tree_data



    /**
    * GROUP_PARENTS
    * Modifies api received tree_data to inject custom parent groupers like XXX for material/technique
    * new root added: how1_1
    * @return array final_raw_tree_data
    */
    group_parents: function (raw_tree_data) {

        const self = this

        // 'material1_1','technique1_1'
        //const material1_1 = raw_tree_data.find(el => el.term_id === 'material1_1')
        //const technique1_1 = raw_tree_data.find(el => el.term_id === 'technique1_1')
        /*if (material1_1 && technique1_1) {

            // how1_1. Build virtual term
            const how1_1 = JSON.parse(JSON.stringify(material1_1))
            // edit cloned
            how1_1.term = tstring.como || 'How'
            how1_1.term_id = 'how1_1'
            how1_1.tld = 'how1'
            how1_1.scope_note = tstring.scope_note || ''
            how1_1.space = null
            how1_1.parent = '["how1_2"]'
            how1_1.children = '[{"type":"dd48","section_id":"1","section_tipo":"material1","from_component_tipo":"hierarchy49"},{"type":"dd48","section_id":"1","section_tipo":"technique1","from_component_tipo":"hierarchy49"}]';

            // material1_1. Replace parent
            material1_1.parent = '["how1_1"]'

            // technique1_1. Replace parent
            technique1_1.parent = '["how1_1"]'

            // final_raw_tree_data. Mix all terms in order
            const final_raw_tree_data = [...raw_tree_data, how1_1]

            // update root terms
            const final_root_term = []
            // add as first
            final_root_term.push('how1_1')
            for (let i = 0; i < self.root_term.length; i++) {

                const term_id = self.root_term[i]
                if (term_id === 'material1_1' || term_id === 'technique1_1') {
                    continue;
                }
                final_root_term.push(term_id)
            }
            // replace
            self.root_term = final_root_term

            return final_raw_tree_data
        }*/

        return raw_tree_data
    },//end group_parents



    /**
    * RENDER_DATA
    * Render received DB data based on 'view_mode' (list, map, timeline)
    * @return bool
    */
    render_data: function (options) {

        const self = this

        // options
        const ar_rows = options.ar_rows
        const target = common.is_node(options.target)
            ? options.target
            : document.getElementById(options.target)
        const set_hilite = options.set_hilite || false

        return new Promise(function (resolve) {

            const root_term = self.root_term
            const hilite_terms = self.term_id
                ? [self.term_id]
                : null

            self.data_clean = page.parse_tree_data(ar_rows, hilite_terms) // prepares data to use in list

            self.tree = self.tree || new tree_factory() // creates / get existing instance of tree
            self.tree.init({
                target: target,
                data: self.data_clean,
                root_term: root_term,
                set_hilite: set_hilite
            })
            self.tree.render()
                .then(function (node_fragment) {

                    resolve(node_fragment)
                })
        })
    },//end render_data



    /**
    * RENDER_FORM
    * Create logic and view of search
    */
    render_form: function (options) {

        const self = this

        return new Promise(function (resolve) {

            const fragment = new DocumentFragment()

            // form_factory instance
            self.form = self.form || new form_factory()

            // inputs

            // global_search
            const global_search_container = common.create_dom_element({
                element_type: "div",
                class_name: "global_search_container form-row fields",
                parent: fragment
            })
            // input global search
            self.form.item_factory({
                id: "term",
                name: "term",
                class_name: 'global_search',
                label: tstring.term || "Term",
                q_column: "term",
                eq: "LIKE",
                eq_in: "%",
                eq_out: "%",
                // q_table	: "catalog",
                parent: global_search_container,
                callback: function (form_item) {
                    const node_input = form_item.node_input
                    self.activate_autocomplete(node_input) // node_input is the form_item.node_input
                }
            })

            // submit button
            const submit_group = common.create_dom_element({
                element_type: "div",
                class_name: "form-group submit field",
                parent: fragment
            })
            const submit_button = common.create_dom_element({
                element_type: "input",
                type: "submit",
                id: "submit",
                value: tstring["buscar"] || "Search",
                class_name: "button",
                parent: submit_group
            })
            submit_button.addEventListener("click", function (e) {
                e.preventDefault()
                self.form_submit()
            })

            // form_node
            self.form.node = common.create_dom_element({
                element_type: "form",
                id: "search_form",
                class_name: "form-inline form_factory py-5 px-6 mb-5 has-background-grey-light"
            })
            self.form.node.appendChild(fragment)


            // add node
            options.container.appendChild(self.form.node)

            resolve(self.form.node)
        })
    },//end render_form



    /**
    * ACTIVATE_AUTOCOMPLETE
    */
    activate_autocomplete: function (element) {

        const self = this

        // (!) define current_form_item in this scope to allow set and access from different places
        let current_form_item

        const cache = {}
        $(element).autocomplete({
            delay: 150,
            minLength: 1,
            source: function (request, response) {

                const term = request.term

                // (!) fix selected form_item (needed to access from select)
                current_form_item = self.form.form_items[element.id]
                const q_column = current_form_item.q_column // Like 'term'

                // search
                self.search_rows({
                    q: term,
                    q_column: q_column,
                    limit: 25
                })
                    .then((api_response) => {

                        const ar_result = []
                        const len = api_response.result.length
                        for (let i = 0; i < len; i++) {

                            const item = api_response.result[i]

                            ar_result.push({
                                label: item.label,
                                value: item.value
                            })
                        }

                        // debug
                        if (SHOW_DEBUG === true) {
                            console.log("--- autocomplete api_response:", api_response);
                            console.log("autocomplete ar_result:", ar_result);
                        }

                        response(ar_result)
                    })
            },
            // When a option is selected in list
            select: function (event, ui) {
                // prevent set selected value to autocomplete input
                event.preventDefault();

                // add_selected_value . Create input and button nodes and add it to current_form_item
                self.form.add_selected_value(current_form_item, ui.item.label, ui.item.value)

                // reset input value
                this.value = ''

                return false;
            },
            // When a option is focus in list
            focus: function () {
                // prevent value inserted on focus
                return false;
            },
            close: function (event, ui) {

            },
            change: function (event, ui) {

            },
            response: function (event, ui) {

            }
        })
            .on("keydown", function (event) {
                if (event.keyCode === $.ui.keyCode.ENTER) {
                    // prevent set selected value to autocomplete input
                    $(this).autocomplete('close')
                }
            })// bind
            .focus(function () {
                $(this).autocomplete('search', null)
            })
            .blur(function () {

            })


        return true
    },//end activate_autocomplete



    /**
    * SEARCH_ROWS
    * @return promise
    *	resolve array of objects
    */
    search_rows: function (options) {

        const self = this

        return new Promise(function (resolve) {
            const t0 = performance.now()

            const q = options.q
            const q_column = options.q_column
            const q_selected = options.q_selected || null
            const limit = options.limit

            // data . Simplifies data format (always on data_clean)
            const data = self.data_clean.map(item => {
                const element = {
                    term: item.term,
                    scope_note: item.scope_note,
                    parent: item.parent,
                    term_id: item.term_id,
                    nd: item.nd
                }
                return element
            })

            // find_text
            let counter = 1
            function find_text(row) {

                if (limit > 0 && counter > limit) {
                    return false
                }

                let find = false

                // q try
                if (q && q.length > 0) {

                    // remove accents from text
                    const text_normalized = row[q_column].normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    const q_normalized = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

                    const regex = RegExp(q_normalized, 'i')
                    find = regex.test(text_normalized)

                    // try with nd
                    if (!find && row.nd && row.nd.length > 0) {
                        for (let k = 0; k < row.nd.length; k++) {

                            const text_normalized = row.nd[k].normalize("NFD").replace(/[\u0300-\u036f]/g, "")

                            find = regex.test(text_normalized)

                            if (find === true) {
                                break;
                            }
                        }
                    }
                }

                // q_selected try. Check user selections from autocomplete
                if (!find && q_selected) {
                    for (let i = 0; i < q_selected.length; i++) {
                        if (row.term_id === q_selected[i]) {
                            find = true
                            break;
                        }
                    }
                }

                if (find === true) {
                    counter++;
                }

                return find
            }

            // found filter
            const found = data.filter(find_text)

            // result . Format result array to allow autocomplete to manage it
            const result = found.map(item => {

                // parent info (for disambiguation)
                const parent_term_id = item.parent[0]
                const parent_row = self.data_clean.find(el => el.term_id === parent_term_id)
                const parent_label = parent_row ? (" (" + parent_row.term + ")") : ''
                const nd_text = item.nd ? (' [' + item.nd.join(', ') + ']') : ''

                const label = item.term + nd_text + parent_label

                const element = {
                    label: label,
                    value: item.term_id
                }
                return element
            })

            // response. Format like a regular database result from API
            const response = {
                result: result,
                debug: {
                    time: performance.now() - t0
                }
            }

            resolve(response)
        })
    },//end search_rows



    /**
    * FORM_SUBMIT
    * Form submit launch search
    */
    form_submit: function () {

        const self = this

        // filter. Is built looking at form input values
        const form_items = self.form.form_items
        const form_item = form_items.term


        return new Promise(function (resolve) {

            // search rows exec against API
            self.search_rows({
                q: form_item.q,
                q_column: form_item.q_column,
                q_selected: form_item.q_selected,
                limit: 0
            })
                .then((response) => {

                    const to_hilite = response.result.map(el => el.value)

                    // remove self.term_id to avoid hilite again
                    self.term_id = null

                    // rows_list_node
                    const rows_list_node = document.getElementById('rows_list')
                    while (rows_list_node.hasChildNodes()) {
                        rows_list_node.removeChild(rows_list_node.lastChild);
                    }
                    // add spinner
                    const spinner = common.create_dom_element({
                        element_type: "div",
                        id: "spinner",
                        class_name: "spinner",
                        parent: rows_list_node
                    })

                    // load_tree_data
                    self.load_tree_data({})
                        .then(function (response) {

                            const organized_data = self.organize_data(ar_rows, self.root_term);

                            return self.render_tree(rows_list_node, organized_data);

                            // const ar_rows = response.map(function (row) {
                            //     if (to_hilite.indexOf(row.term_id) !== -1) {
                            //         row.hilite = true
                            //         row.status = "closed"
                            //     }
                            //     return row
                            // })

                            // // render_data
                            // self.render_data({
                            //     target: rows_list_node,
                            //     ar_rows: ar_rows,
                            //     set_hilite: true
                            // })

                        }).then(function () {
                                    spinner.remove()
                                })

                    resolve(true)
                })
        })
    },//end form_submit

    /**
     * ORGANIZE_DATA
     * Transform raw tree data into a clean, renderable structure
     * @param {Array} raw_data - Raw data from API
     * @param {Array} root_terms - Root term IDs
     * @return {Object} organized data structure
     */
    organize_data: function(raw_data, root_terms) {
        const self = this

        // Create lookup map for quick access
        const data_map = new Map()
        raw_data.forEach(item => {
            let relationsArray = item.relations ? JSON.parse(item.relations) : [];
            relationsArray = relationsArray.filter(el => (el.image && el.image != null));

            if (relationsArray.length > 0) {
                relationsArray = relationsArray.map(rel => {
                    rel.thumb_url = __WEB_MEDIA_ENGINE_URL__ + rel.image.replace('1.5MB', 'thumb');
                    rel.path = 'cat';
                    return rel;
                })
            }

            // Parse image IDs from imagenes_identificativas and imagenes
            let image_ids = []
            if (item.imagenes_identificativas) {
                try {
                    const ids = JSON.parse(item.imagenes_identificativas)
                    image_ids = image_ids.concat(ids)
                } catch (e) {
                    console.warn('Error parsing imagenes_identificativas:', item.imagenes_identificativas)
                }
            }
            if (item.imagenes) {
                try {
                    const ids = JSON.parse(item.imagenes)
                    image_ids = image_ids.concat(ids)
                } catch (e) {
                    console.warn('Error parsing imagenes:', item.imagenes)
                }
            }

            data_map.set(item.term_id, {
                ...item,
                relations_data: relationsArray,
                image_ids: image_ids,
                children_data: [],
                level: 0
            })
        })

        // Build parent-child relationships
        const tree = []
        data_map.forEach(item => {
            // Check if this item IS a root term
            if (root_terms.includes(item.term_id)) {
                tree.push(item)
            } else {
                // This is not a root, so add it to its parent's children
                const parent_ids = item.parent ? JSON.parse(item.parent) : []

                parent_ids.forEach(parent_id => {
                    const parent = data_map.get(parent_id)
                    if (parent) {
                        parent.children_data.push(item)
                    }
                })
            }
        })

        // Sort children by norder if available
        const sort_children = (nodes) => {
            nodes.forEach(node => {
                if (node.children_data.length > 0) {
                    node.children_data.sort((a, b) => {
                        const a_order = parseInt(a.norder) || 0
                        const b_order = parseInt(b.norder) || 0
                        return a_order - b_order
                    })
                    sort_children(node.children_data)
                }
            })
        }

        // Sort root level by norder
        tree.sort((a, b) => {
            const a_order = parseInt(a.norder) || 0
            const b_order = parseInt(b.norder) || 0
            return a_order - b_order
        })
        sort_children(tree)

        // Calculate levels recursively
        const calculate_levels = (nodes, level = 0) => {
            nodes.forEach(node => {
                node.level = level
                if (node.children_data.length > 0) {
                    calculate_levels(node.children_data, level + 1)
                }
            })
        }
        calculate_levels(tree)

        return {
            tree: tree,
            flat: Array.from(data_map.values()),
            map: data_map
        }
    },

    /**
     * RENDER_SWIPER
     * Render swiper gallery for images
     * @param {HTMLElement} container - Target container
     * @param {Array} images - Array of image objects with 'image' property
     * @param {String} unique_id - Unique identifier for this swiper instance
     * @param {Number} slides_per_view - Number of slides to show per view (default: 1)
     */
    render_swiper: function(container, images, unique_id, slides_per_view = 1) {
        if (!images || images.length === 0) return

        const content = htmlTemplate(`
            <div class="images-group">
                <div class="swiper swiper--sala-${unique_id}">
                    <div class="swiper-wrapper">
                        ${images.map(image =>
                            `<div class="swiper-slide">
                                <img src="${__WEB_MEDIA_ENGINE_URL__ + image.image}" alt="${image.title || ''}">
                            </div>`
                        ).join('')}
                    </div>
                </div>
                <div class="is-flex is-justify-content-center is-align-items-center gap-7 is-relative py-4">
                    <div class="swiper-button-prev swiper-button-prev-${unique_id}"></div>
                    <div class="swiper-pagination-${unique_id} is-flex is-flex-wrap-wrap is-justify-content-center"></div>
                    <div class="swiper-button-next swiper-button-next-${unique_id}"></div>
                </div>
            </div>
            `)
        appendTemplate(container, content)

        // Initialize swiper
        const mainSwiper = new Swiper(`.swiper--sala-${unique_id}`, {
            slidesPerView: slides_per_view,
            loop: true,
            spaceBetween: 6,
            freeMode: true,
            navigation: {
                nextEl: `.swiper-button-next.swiper-button-next-${unique_id}`,
                prevEl: `.swiper-button-prev.swiper-button-prev-${unique_id}`
            },
            pagination: {
                el: `.swiper-pagination-${unique_id}`,
                type: 'bullets',
            },
        })

    },

    /**
     * RENDER_TREE
     * Accordion-style tree renderer
     * @param {HTMLElement} container - Target container
     * @param {Object} organized_data - Data from organize_data()
     * @return {Promise}
     */
    render_tree: function(container, organized_data) {
        const self = this

        return new Promise(function(resolve) {
            const fragment = document.createDocumentFragment()

            const render_node = (item, parent_element, level) => {
                const salaUrl = page_globals.__WEB_ROOT_WEB__ + '/top/' + item.section_id
                // Level 0: Render as title without accordion
                if (level === 0) {
                    const salas_title = htmlTemplate(`
                        <h2 class="mb-8 has-text-black">
                            ${item.term}
                        </h2>

                    `)
                    appendTemplate(parent_element, salas_title)

                    // Create container for children
                    if (item.children_data.length > 0) {
                        const accordion_container = common.create_dom_element({
                            element_type: 'div',
                            class_name: 'salas flow--2xl',
                            parent: parent_element
                        })

                        item.children_data.forEach(child => {
                            render_node(child, accordion_container, level + 1)
                        })
                    }
                    return
                }

                // Create accordion wrapper
                const sala_wrapper = common.create_dom_element({
                    element_type: 'div',
                    class_name: `sala nivel-${level}`,
                    parent: parent_element
                })

                // Level 1+: Render as accordion
                const accordion_class = level <= 2
                    ? 'accordion accordion--primary'
                    : 'accordion accordion--secondary'

                // Generate unique IDs for this node
                const tab_id = `tab-${item.term_id}`
                const panel_id = `panel-${item.term_id}`

                // Determine if this node should be initially expanded
                const is_expanded = item.hilite
                const is_active_class = is_expanded ? ' is-active' : ''

                // Create accordion wrapper (not yet appended - position depends on level)
                const accordion_wrapper = common.create_dom_element({
                    element_type: 'div',
                    class_name: accordion_class
                })

                // Accordion header
                const header = common.create_dom_element({
                    element_type: 'h4',
                    class_name: 'accordion-header',
                    parent: accordion_wrapper
                })
                header.id = tab_id

                // Level 1: Add definition, illustration and button in header
                if (level === 1) {

                    const title_level1 = htmlTemplate(`
                        <h3 class="term-title is-size-3">
                            ${item.term}
                        </h3>
                    `)
                    appendTemplate(sala_wrapper, title_level1)

                    const sala_info = htmlTemplate(`
                        <div class="sala-info columns is-variable is-8 mt-4">
                            <div class="column flow">
                                ${item.definition ?
                                    `<div class="definition is-size-6">
                                        ${item.definition}
                                    </div>` : ''
                                }
                                <div><a href="${salaUrl}" target="_blank">
                                    ${tstring.collection_see_more}
                                </a></div>
                            </div>
                            ${item.illustration && item.illustration.length > 0 ?
                                `<div class="column">
                                    <img class="illustration" src="${__WEB_MEDIA_ENGINE_URL__ + item.illustration}" alt="${item.term || ''}">
                                </div>` : ''
                            }
                        </div>
                    `)

                    // Fetch and render images for level 1 (immediate)
                    if (item.image_ids && item.image_ids.length > 0) {
                        const images_column = common.create_dom_element({
                            element_type: 'div',
                            class_name: 'column is-one-third',
                            parent: sala_info[0]
                        })

                        // Fetch images immediately for level 1
                        api.getImagesFromArray(item.image_ids).then(images => {
                            if (images && images.length > 0) {
                                self.render_swiper(images_column, images, item.term_id+'-images')
                            }
                        })
                    }

                    appendTemplate(sala_wrapper, sala_info)

                    // Append accordion after title and sala-info
                    sala_wrapper.appendChild(accordion_wrapper)

                    const button_template = htmlTemplate(`
                        <button type="button" class="button ${is_expanded ? 'is-active' : ''} ${item.hilite ? 'hilite' : ''}" aria-controls="${panel_id}" aria-expanded="${is_expanded ? 'true' : 'false'}">
                            <span class="term-title is-size-7">${tstring.zones}</span>
                        </button>
                    `)
                    appendTemplate(header, button_template)

                } else {
                    // For level 2+: append accordion directly
                    sala_wrapper.appendChild(accordion_wrapper)

                    // Simple button with just the term
                    const level2_button_template = htmlTemplate(`
                        <button type="button" class="is-size-6 ${is_expanded ? 'is-active' : ''} ${item.hilite ? 'hilite' : ''}" aria-controls="${panel_id}" aria-expanded="${is_expanded ? 'true' : 'false'}">
                            ${item.term}
                        </button>
                    `)
                    appendTemplate(header, level2_button_template)
                }

                // Accordion content
                const content = common.create_dom_element({
                    element_type: 'div',
                    class_name: 'pb-5 accordion-content' + is_active_class,
                    parent: accordion_wrapper
                })
                content.id = panel_id
                content.setAttribute('aria-labelledby', tab_id)
                content.setAttribute('aria-hidden', is_expanded ? 'false' : 'true')

                // Definition, illustration and images slider - only for level 2+
                if (level > 1) {
                    const info_template = htmlTemplate(`
                        <div class="info-container block-dedalo columns is-variable is-8">
                            <div class="column flow">
                                ${item.definition ?
                                    `<div class="definition is-size-6">
                                        ${item.definition}
                                    </div>` : ''
                                }
                                <div><a href="${salaUrl}" target="_blank" class="has-text-weight-normal">
                                    ${tstring.collection_see_more}
                                </a></div>
                            </div>
                            ${level < 3 && item.illustration && item.illustration.length > 0 ?
                                `<div class="column is-one-third">
                                    <img class="illustration" src="${__WEB_MEDIA_ENGINE_URL__ + item.illustration}" alt="${item.term || ''}">
                                </div>` : ''
                            }
                            ${item.image_ids && item.image_ids.length > 0 ?
                                `<div class="${level < 3 ? 'column is-one-third images-container' : 'column is-half-tablet is-one-third-widescreen images-container'}" data-image-ids='${JSON.stringify(item.image_ids)}' data-term-id='${item.term_id}' data-loaded='false'></div>` : ''
                            }
                        </div>
                    `)
                    appendTemplate(content, info_template)

                    if (level === 2 && item.children_data.length > 0) {
                        const relations_title = common.create_dom_element({
                            element_type: 'h5',
                            class_name: 'relations-title mt-0 mb-3 has-text-weight-bold is-size-6',
                            parent: content
                        })
                        relations_title.textContent = tstring.showcases;
                    }

                }

                // Add event listener for lazy loading images on level 2+
                if (level > 1 && item.image_ids && item.image_ids.length > 0) {
                    const button_element = header.querySelector('button')
                    if (button_element) {
                        button_element.addEventListener('click', function() {
                            const images_container = content.querySelector('.images-container')
                            if (images_container && images_container.getAttribute('data-loaded') === 'false') {
                                const image_ids = JSON.parse(images_container.getAttribute('data-image-ids'))
                                const term_id = images_container.getAttribute('data-term-id')

                                api.getImagesFromArray(image_ids).then(images => {
                                    if (images && images.length > 0) {
                                        self.render_swiper(images_container, images, term_id+'-images')
                                        images_container.setAttribute('data-loaded', 'true')
                                    }
                                })
                            }
                        })
                    }
                }

                if (level >= 3 && item.relations_data && item.relations_data.length > 0) {
                    const relations_title = common.create_dom_element({
                        element_type: 'h5',
                        class_name: 'relations-title mt-0 mb-3 has-text-weight-bold is-size-6',
                        parent: content
                    })
                    relations_title.textContent = tstring.pieces;

                    const page_size = 25
                    let offset = 0
                    const all_relations = item.relations_data

                    const galeria_div = common.create_dom_element({
                        element_type: 'div',
                        class_name: 'relations_container galeria galeria--92x92',
                        parent: content
                    })

                    const load_more_wrapper = common.create_dom_element({
                        element_type: 'div',
                        class_name: 'has-text-centered mt-6',
                        parent: content
                    })
                    const load_more_btn = common.create_dom_element({
                        element_type: 'button',
                        type: 'button',
                        class_name: 'button button--icon button--carrega',
                        id: 'button_load_more_' + item.term_id,
                        parent: load_more_wrapper
                    })
                    const total = all_relations.length
                    const update_btn_text = () => {
                        load_more_btn.textContent = tstring.load_more + ' (' + offset + ' ' + tstring.of + ' ' + total + ')'
                    }

                    const render_batch = () => {
                        const batch = all_relations.slice(offset, offset + page_size)
                        batch.forEach(image => {
                            const relationUrl = page_globals.__WEB_ROOT_WEB__ + '/' + image.path + '/' + image.section_id
                            const imageUrl = __WEB_MEDIA_ENGINE_URL__ + image.image
                            const link = common.create_dom_element({
                                element_type: 'a',
                                class_name: 'relation_item',
                                parent: galeria_div
                            })
                            link.href = relationUrl
                            link.target = '_blank'
                            const img = common.create_dom_element({
                                element_type: 'img',
                                parent: link
                            })
                            img.src = imageUrl
                            img.alt = image.title || ''
                            img.loading = 'lazy'
                        })
                        offset += batch.length
                        if (offset >= all_relations.length) {
                            content.querySelector('#button_load_more_' + item.term_id).remove()
                        } else {
                            update_btn_text()
                        }
                    }

                    render_batch()
                    update_btn_text()
                    load_more_btn.addEventListener('click', render_batch)
                }

                // Children (recursive)
                if (item.children_data.length > 0) {
                    const children_container = common.create_dom_element({
                        element_type: 'div',
                        class_name: 'children-container mt-0',
                        parent: content
                    })

                    item.children_data.forEach(child => {
                        render_node(child, children_container, level + 1)
                    })
                }
            }

            // Render root nodes (each will create its own structure)
            organized_data.tree.forEach(root_item => {
                render_node(root_item, fragment, 0)
            })

            // Clear and append
            container.innerHTML = ''
            container.appendChild(fragment)

            // Initialize accordion functionality
            const accordionInstance = new TenUp.Accordion('.accordion', {
                onOpen: function() {
                    // Optional: Add custom logic when accordion opens
                },
                onClose: function() {
                    // Optional: Add custom logic when accordion closes
                }
            })

            resolve(fragment)
        })
    },



}//end thesaurus
