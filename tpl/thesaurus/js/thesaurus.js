/*global $, tstring, page_globals, SHOW_DEBUG, page, Promise, common, document, DocumentFragment, tstring, console, form_factory, data_manager, tree_factory */
/*eslint no-undef: "error"*/
/*jshint esversion: 6 */
"use strict";



var thesaurus = {


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
        // const spinner = common.create_dom_element({
        //     element_type: "div",
        //     class_name: "spinner"
        // })
        const spinner = common.spinner(rows_list);

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

                const render = self.render_data({
                    target: rows_list,
                    ar_rows: ar_rows,
                    set_hilite: (self.term_id && self.term_id.length > 0)
                })
                    .then(function () {
                        spinner.remove()
                    })
            })

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
            'code',
            'descriptor',
            //'illustration',
            //'indexation',
            'model',
            'norder',
            'parent',
            //'related',
            //'scope_note',
            'public_info',
            'space',
            //'time',
            'tld',
            //'relations',
            //'dd_relations'
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
        //sql_filter = sql_filter + " and (children is not null or relations is not null)";

        return new Promise(function (resolve) {
            //fer una consulta convinada per agrupar els que tenen relacions dels que no
            // request
            const calls = [
                {
                    id: "with_relations",
                    options: {
                        dedalo_get: 'records',
                        db_name: page_globals.WEB_DB,
                        table: table,
                        ar_fields: ar_fields,
                        lang: lang,
                        sql_filter: sql_filter + " and (relations is not null)",
                        limit: 0,
                        count: false,
                        order: order
                    }
                },
                {
                    id: "without_relations",
                    options: {
                        dedalo_get: 'records',
                        db_name: page_globals.WEB_DB,
                        table: table,
                        ar_fields: ar_fields,
                        lang: lang,
                        sql_filter: sql_filter + " and (relations is null)",
                        limit: 0,
                        count: false,
                        order: order
                    }
                }
            ]

            data_manager.request({
                body: {
                    dedalo_get: 'combi',
                    db_name: page_globals.WEB_DB,
                    lang: lang,
                    ar_calls: JSON.stringify(calls)
                },
                cache: 'force-cache'
            })
                .then(function (response) {
                    if (response.result) {
                        // merge with_relations and without_relations results
                        const with_relations = response.result[0].result.map(el => {
                            el.with_relations = true
                            return el
                        })
                        const without_relations = response.result[1].result.map(el => {
                            el.with_relations = false
                            return el
                        })
                        const raw_tree_data = [...with_relations, ...without_relations];

                        //const raw_tree_data = JSON.parse(JSON.stringify(response.result))

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

        function prune_tree(data) {
            const pruned = prune_tree_childrens(data);
            const next = pruned.filter(item =>
                (item.with_relations) ||
                (item.children && item.children.length > 0)
            );

            if (next.length === data.length) return next;

            return prune_tree(next);
        }

        function prune_tree_childrens(data) {
            const activeParents = new Set(
                data.map(item => item.term_id)
            );

            return data.map(item => {
                if (item.children && item.children.length > 0) {
                    item.children = item.children.filter(child => {
                        return child.section_tipo == item.tld &&
                            activeParents.has(`${child.section_tipo}_${child.section_id}`);
                    });
                }
                return item;
            });
        }
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

            self.data_clean = prune_tree(self.data_clean);

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
                    public_info: item.public_info,
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

                            const ar_rows = response.map(function (row) {
                                if (to_hilite.indexOf(row.term_id) !== -1) {
                                    row.hilite = true
                                    row.status = "closed"
                                }
                                return row
                            })

                            // render_data
                            self.render_data({
                                target: rows_list_node,
                                ar_rows: ar_rows,
                                set_hilite: true
                            })
                                .then(function () {
                                    spinner.remove()
                                })
                        })

                    resolve(true)
                })
        })
    }//end form_submit



}//end thesaurus
