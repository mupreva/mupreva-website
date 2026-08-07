// data



/**
* PARSE_MAP_DATA
* Parse rows data to use in map_factory
* column map : {"alt":16,"lat":42.72744993,"lon":-2.02195793,"zoom":14}
*/
page.parse_map_data = function (rows) {
    const self = this

    const data = []
    const rows_length = rows.length
    for (let i = 0; i < rows_length; i++) {

        // not resolved portals case
        if (typeof rows[i] !== 'object' || rows[i] === null) {
            console.warn("! parse_map_data: ignored invalid row:", rows, i);
            continue;
        }

        // clone row object to preserve it as immutable
        const row = Object.assign({}, rows[i]);

        let geolocation_data_geojson
        if (row.geolocalizacion !== null) {
            geolocation_data_geojson = (typeof row.geolocalizacion === 'string' || row.geolocalizacion instanceof String)
            ? JSON.parse(row.geolocalizacion)
            : row.geolocalizacion
        }
        if (typeof row.geolocalizacion_produccion !== 'undefined' && row.geolocalizacion_produccion !== null) {
            geolocation_data_geojson = (typeof row.geolocalizacion_produccion === 'string' || row.geolocalizacion_produccion instanceof String)
            ? JSON.parse(row.geolocalizacion_produccion)
            : row.geolocalizacion_produccion
        }
        if (geolocation_data_geojson && geolocation_data_geojson.length > 0) {

            const tpl = page.section_tipo_to_template(row.section_tipo)

            // lightweight marker data only. Images/description are fetched on
            // demand when a marker is clicked - see catalog.load_marker_details
            const item_data = {
                section_id: row.section_id,
                tpl: tpl,
                title: row.titulo
            }

            const marker_icon = (function (section_tipo) {
                let name
                // switch (section_tipo) {
                //     case 'tch1': name = 'objects'; break;
                //     case 'tch100': name = 'pictures'; break;
                //     case 'tchi1': name = 'immovable'; break;
                //     case 'tch300': name = 'document'; break;
                // }
                if (row.geolocalizacion !== null) name = 'hallazgo'
                if (row.geolocalizacion_produccion !== null) name = 'produccion'
                return page.maps_config.markers[name]
            })(row.section_tipo);

            const item = {
                lat: null,
                lon: null,
                geojson: geolocation_data_geojson,
                marker_icon: marker_icon,
                data: item_data
            }

            data.push(item)
        }
    }


    return data
}// end parse_map_data



/**
* PARSE_TREE_DATA
* Parse rows data to use in tree_factory (thesaurus tables)
* Table ts_thematic, ts_technique, ts_onomastic, ts_material
*/
page.parse_tree_data = function (rows, hilite_terms) {

    // sample
    // children: "[{"type":"dd48","section_id":"2","section_tipo":"technique1","from_component_tipo":"hierarchy49"},{"type":"dd48","section_id":"3","section_tipo":"technique1","from_component_tipo":"hierarchy49"}]"
    // code: "1191026"
    // dd_relations: null
    // descriptor: "yes"
    // illustration: null
    // indexation: null
    // model: null
    // norder: "0"
    // parent: "["hierarchy1_273"]"
    // related: ""
    // scope_note: "En el presente Tesauro el empleo del término es más restrictivo, ya que se aplica a los procedimientos técnicos empleados en la elaboración de bienes culturales."
    // section_id: "1"
    // space: "{"alt":16,"lat":"39.462571","lon":"-0.376295","zoom":12}"
    // table: "ts_technique,ts_material"
    // term: "Técnica"
    // term_id: "technique1_1"
    // time: null
    // tld: "technique1"

    if (!rows) {
        return null;
    }

    const ar_parse = ['parent', 'children', 'space', 'indexation', 'relations', 'dd_relations']
    function decode_field(field) {
        if (field) {
            return JSON.parse(field)
        }
        return null;
    }
    function parse_item(item) {
        for (let i = ar_parse.length - 1; i >= 0; i--) {
            const name = ar_parse[i]
            item[name] = decode_field(item[name])
        }

        return item
    }

    const data = []
    const rows_length = rows.length
    for (let i = 0; i < rows_length; i++) {

        // clone row object to preserve it as immutable
        const row = Object.assign({}, rows[i]);

        // parse JSON encoded strings
        const item = parse_item(row)

        // removes the annoying interrogative signs in root terms (only in thesaurus page)
        if (typeof thesaurus !== 'undefined' && thesaurus.root_term.indexOf(item.term_id) !== -1) {
            item.term = item.term.replace(/[\?\¿]/g, "")
        }

        // resolve relations images url
        if (item.relations && item.relations.length > 0) {
            for (let j = item.relations.length - 1; j >= 0; j--) {

                item.relations[j].image_url = item.relations[j].image
                    ? common.get_media_engine_url(item.relations[j].image, 'image')
                    : __WEB_TEMPLATE_WEB__ + '/assets/images/default.jpg'

                item.relations[j].thumb_url = item.relations[j].image
                    ? common.get_media_engine_url(item.relations[j].image, 'image', 'thumb')
                    : __WEB_TEMPLATE_WEB__ + '/assets/images/default.jpg'

                item.relations[j].path = page.section_tipo_to_template(item.relations[j].section_tipo)
            }
        }

        data.push(item)
    }

    const term_id_to_remove = []

    // update_children_data recursive
    function update_children_data(data, row) {

        if (((!row.children || row.children.length === 0) && (!row.relations || row.relations.length === 0))
            || row.descriptor !== 'yes') {

            if (!row.parent) {
                console.warn("parent not found for row:", row);
                return true
            }

            const parent_term_id = row.parent[0]
            const parent_row = data.find(item => item.term_id === parent_term_id)
            if (parent_row && parent_row.children) {

                const child_key = parent_row.children.findIndex(el => el.section_tipo === row.tld && el.section_id == row.section_id)
                if (child_key !== -1) {

                    const term = row.term

                    // ND cases. Before remove, add ND term to parent
                    if (row.descriptor === 'no') {
                        if (parent_row.nd) {
                            parent_row.nd.push(term)
                            parent_row.nd_term_id.push(row.term_id) // useful for search
                        } else {
                            parent_row.nd = [term]
                            parent_row.nd_term_id = [row.term_id]
                        }
                    }

                    // remove me as child
                    //parent_row.children.splice(child_key, 1)

                    // recursion with parent
                    update_children_data(data, parent_row)
                }
            }
            // set to remove
            // term_id_to_remove.push(row.term_id)
        }

        return true
    }

    // remove unused terms
    const data_length = rows_length
    for (let i = data_length - 1; i >= 0; i--) {

        const row = data[i]

        const parent_term_id = (row.parent && row.parent[0]) ? row.parent[0] : false
        const isRoot = ['object1_1', 'dc1_83', 'ts1_1', 'material1_89', 'technique1_1'].includes(row.term_id);

        if (!parent_term_id && !isRoot) {
            console.warn("Ignored undefined parent_term_id:", row);
            // set to remove
            term_id_to_remove.push(row.term_id)
            continue
        }

        // update children data
        update_children_data(data, row)
    }


    // remove unused terms
    const data_clean = data.filter(el => term_id_to_remove.indexOf(el.term_id) === -1);


    // open hilite parent terms (recursive)
    for (let i = 0; i < data_clean.length; i++) {
        const row = data_clean[i]

        // hilite_terms (usually one term from user request url like /thesaurus/technique1_1)
        if (hilite_terms && (hilite_terms.indexOf(row.term_id) !== -1 || (row.nd_term_id && hilite_terms.indexOf(row.nd_term_id) !== -1))) {
            row.hilite = true
        }
        if (hilite_terms) {
            if (hilite_terms.indexOf(row.term_id) !== -1) {
                // direct
                row.hilite = true
            } else if (row.nd_term_id) {
                // using nd
                for (let i = 0; i < row.nd_term_id.length; i++) {
                    if (hilite_terms.indexOf(row.nd_term_id[i]) !== -1) {
                        row.hilite = true
                        break;
                    }
                }
            }
        }

        if (row.hilite === true) {
            set_status_as_opened(data_clean, row, false)
        }
    }
    function set_status_as_opened(data_clean, row, recursion) {
        const parent_term_id = row.parent?.[0] || ""
        const parent_row = data_clean.find(item => item.term_id === parent_term_id)
        if (parent_row) {
            parent_row.status = "opened"
            set_status_as_opened(data_clean, parent_row, true)
        }
    }


    return data_clean
}//end parse_tree_data



/**
* PARSE_LIST_DATA
* Parse rows data to use in list_factory (catalog tables)
* Table pictures, objects
*/
page.parse_list_data = function (rows) {

    const self = this

    // first parse using generic parse_catalog_data
    const data = page.parse_catalog_data(rows)

    const final_data = []
    const data_length = data.length
    for (let i = 0; i < data_length; i++) {

        // not resolved portals case
        if (typeof data[i] !== 'object' || data[i] === null) {
            continue;
        }

        // const row = data[i]
        // clone row object to preserve it as immutable
        const row = Object.assign({}, data[i]);

        // parsed case
        if (row.parsed_list_data === true) {
            final_data.push(row)
            continue;
        }

        // already in parse_catalog_data
        // row.collection					= common.remove_gaps(row.collection, " | ")
        // row.material					= common.split_data(row.material, " - ")
        // row.technique					= common.split_data(row.technique, " - ")
        // row.indexation					= common.split_data(row.indexation, " - ")
        // row.name						= common.split_data(row.name, " - ")
        // row.typology					= common.split_data(row.typology, " - ")
        // row.identifying_images			= common.split_data(row.identifying_images, " | ") // only one is expected but it is tranformed to array
        // row.collection_data				= JSON.parse(row.collection_data)
        // row.fund_data					= JSON.parse(row.fund_data)
        // row.geolocation_data			= JSON.parse(row.geolocation_data)
        // row.geolocation_data_geojson	= JSON.parse(row.geolocation_data_geojson)
        // row.map							= JSON.parse(row.map)
        // row.material_data				= JSON.parse(row.material_data)
        // row.technique_data				= JSON.parse(row.technique_data)
        // row.typology_data				= JSON.parse(row.typology_data)
        // row.images_data					= JSON.parse(row.images_data)
        // row.indexation_data				= JSON.parse(row.indexation_data)
        // row.name_data					= JSON.parse(row.name_data)
        // row.identifying_images_data		= JSON.parse(row.identifying_images_data)
        // row.images						= JSON.parse(row.images)
        // row.images_typology				= JSON.parse(row.images_typology)
        // row.documents					= JSON.parse(row.documents) || []
        // row.audiovisuals				= JSON.parse(row.audiovisuals) || []
        // row.relations					= JSON.parse(row.relations)


        //TODO: arreglar bé

        // add combis for easy access
        /*
        row.technique_combi = self.combine_columns(row.technique, row.technique_data, 'technique')
        row.material_combi = self.combine_columns(row.material, row.material_data, 'material')
        row.indexation_combi = self.combine_columns(row.indexation, row.indexation_data, 'indexation')
        row.name_combi = self.combine_columns(row.name, row.name_data, 'name')
        row.typology_combi = self.combine_columns(row.typology, row.typology_data, 'typology')

        // dates
        row.dating_start = row.dating_start ? parseInt(row.dating_start) : null
        row.dating_end = row.dating_end ? parseInt(row.dating_end) : null
*/

        // tpl
        row.tpl = page.section_tipo_to_template(row.section_tipo)
        if (row.table == 'activities') {
            row.tpl = 'act';
        }
        if (row.table == 'exhibitions') {
            row.tpl = 'exp';
        }

        /*
        // unify media elements (to easy manage on filmstrip)
        // identifying_images
        row.identifying_images_combi = self.combine_columns(row.identifying_images, row.identifying_images_data, 'image')
        // append properties to images_combi
        for (let j = 0; j < row.identifying_images_combi.length; j++) {
            // footer
            row.identifying_images_combi[j].footer = (row.identifying_images_footer && typeof row.identifying_images_footer[j] !== "undefined")
                ? row.identifying_images_footer[j]
                : null
            // url
            row.identifying_images_combi[j].url = common.get_media_engine_url(row.identifying_images_combi[j].label, 'image')
            row.identifying_images_combi[j].url_thumb = common.get_media_engine_url(row.identifying_images_combi[j].label, 'image', 'thumb')
        }
        row.thumb_url = row.identifying_images_combi && row.identifying_images_combi[0]
            ? row.identifying_images_combi[0].url_thumb
            : __WEB_TEMPLATE_WEB__ + '/assets/images/default.jpg'
        row.image_url = row.identifying_images_combi && row.identifying_images_combi[0]
            ? row.identifying_images_combi[0].url
            : __WEB_TEMPLATE_WEB__ + '/assets/images/default.jpg'

        // images
        row.images_combi = (row.images && row.images_data) ? self.combine_columns(row.images, row.images_data, 'image') : []
        // append properties to images_combi
        for (let j = 0; j < row.images_combi.length; j++) {
            // typology
            row.images_combi[j].typology = (row.images_typology && typeof row.images_typology[j] !== "undefined")
                ? row.images_typology[j]
                : null
            // footer
            row.images_combi[j].footer = (row.images_footer && typeof row.images_footer[j] !== "undefined")
                ? row.images_footer[j]
                : null
            // url
            row.images_combi[j].url = common.get_media_engine_url(row.images_combi[j].label, 'image')
            row.images_combi[j].url_thumb = common.get_media_engine_url(row.images_combi[j].label, 'image', 'thumb')
        }
        // audiovisuals_combi
        row.audiovisuals_combi = row.audiovisuals.map(function (file_name) {
            return {
                label: file_name,
                value: file_name,
                url: common.get_media_engine_url(file_name, 'posterframe'),
                url_thumb: common.get_media_engine_url(file_name, 'posterframe', 'thumb'),
                url_av: common.get_media_engine_url(file_name, 'av', null, true),
                type: 'audiovisual'
            }
        })

        // row_documents
        // row.documents = row.documents.map(function(file_name){
        // 	return {
        // 		label		: file_name,
        // 		value		: file_name,
        // 		url			: common.get_media_engine_url(file_name, 'pdf'),
        // 		url_thumb	: null,
        // 		type		: 'document',
        // 		title : row.documen
        // 	}
        // })
        const group_documents = []
        for (let j = 0; j < row.documents.length; j++) {
            const file_name = row.documents[j]
            group_documents.push({
                label: file_name,
                value: file_name,
                url: common.get_media_engine_url(file_name, 'pdf'),
                url_thumb: null,
                type: 'document',
                title: (typeof row.documents_titles[j] !== 'undefined')
                    ? row.documents_titles[j]
                    : null
            })
        }
        row.documents = group_documents // replace

        // remove properties
        delete row.global_search
        // delete row.technique
        // delete row.technique_data

        // add resolved tpl (section_tipo_to_template)
        row.tpl = page.section_tipo_to_template(row.section_tipo)

        // items (sets)
        if (row.items && row.items.length > 0) {
            row.items = self.parse_list_data(row.items)
        }

        // sets
        row.sets = (row.relations && row.relations.length > 0)
            ? (function () {
                const set_relations = row.relations.filter(function (el) {
                    return el.table === 'sets'
                })
                set_relations.map(function (el) {
                    el.image_url = common.get_media_engine_url(el.image, 'image')
                    el.thumb_url = common.get_media_engine_url(el.image, 'image', 'thumb')
                })
                return set_relations
            })()
            : null

        // author
        if (row.author && row.author.length > 0) {
            const ar_name = []
            const ar_surname = []
            const ar_row_autor = row.author.split(" | ")
            for (let j = 0; j < ar_row_autor.length; j++) {
                if ((j % 2) === 0) {
                    ar_surname.push(ar_row_autor[j])
                } else {
                    ar_name.push(ar_row_autor[j])
                }
            }
            row.author = ar_name.map(function (el, key) {
                return el + " " + ar_surname[key]
            })
        }
        */

        row.parsed_list_data = true

        // add clean row
        final_data.push(row)
    }


    return final_data
}//end parse_list_data



/**
* PARSE_TIMELINE_DATA
* Parse rows data to use in timeline_factory grouping rows by date
*/
page.parse_timeline_data = function (rows) {

    const self = this

    const data = []
    const rows_length = rows.length
    for (let i = 0; i < rows_length; i++) {

        // not resolved portals case
        if ((
            typeof rows[i] !== 'object' &&
            typeof rows[i] !== 'pictures' &&
            typeof rows[i] !== 'documents_catalog'
        ) || rows[i] === null) {
            continue;
        }
        // clone row object to preserve it as immutable
        const row = Object.assign({}, rows[i]);

        const group_date = row.dating_start
            ? parseInt(row.dating_start)
            : null
        const complete_date = common.clean_date(row.dating, ',').join(' - ')

        if (group_date) {

            row.identifying_images = common.split_data(row.identifying_images, " | ") // only one is expected but it is transformed to array

            // unify media elements (to easy manage on filmstrip)
            // identifying_images
            row.identifying_images_combi = page.combine_columns(row.identifying_images, row.identifying_images_data, 'image')
            // append properties to images_combi
            for (let j = 0; j < row.identifying_images_combi.length; j++) {
                // url
                row.identifying_images_combi[j].url_thumb = common.get_media_engine_url(row.identifying_images_combi[j].label, 'image', 'thumb')
            }

            const thumb_url = row.identifying_images_combi && row.identifying_images_combi[0]
                ? row.identifying_images_combi[0].url_thumb
                : __WEB_TEMPLATE_WEB__ + '/assets/images/default.jpg'


            const item_data = {
                section_id: row.section_id,
                tpl: page.section_tipo_to_template(row.section_tipo),
                date: complete_date,
                title: row.name,
                description: row.description,
                image_src: thumb_url // image_url
            }

            const found = data.find(el => el.date === group_date)
            if (!found) {
                // first item
                const item = {
                    date: group_date,
                    data_group: [item_data]
                }

                data.push(item)
            } else {
                // already existing item
                found.data_group.push(item_data)
            }
        }
    }

    // sort by property date asc
    data.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));


    return data
}//end parse_timeline_data


/**
* PARSE_TIMELINE_DATA
* Parse rows data to use in timeline_factory grouping rows by date
*/
page.parse_timeline_data_catalog = function (rows) {

    const self = this

    const data = []
    const rows_length = rows.length
    for (let i = 0; i < rows_length; i++) {

        // not resolved portals case
        if (typeof rows[i] !== 'object' || rows[i] === null) {
            continue;
        }
        // clone row object to preserve it as immutable
        const row = Object.assign({}, rows[i]);

        if (row.periodo_data) {
            var periodos = JSON.parse(row.periodo_data);
            for (var group_date of periodos) {
                if (group_date) {
                    var image_url = '/assets/img/placeholder.png';
                    if (row.imagenes_identificativas.length > 0) {
                        image_url = __WEB_MEDIA_ENGINE_URL__+row.imagenes_identificativas[0].image;
                    }

                    const item_data = {
                        section_id: row.section_id,
                        tpl: page.section_tipo_to_template(row.section_tipo),
                        title: row.titulo,
                        image_src: image_url // image_url
                    }

                    const found = data.find(el => el.date === group_date)
                    if (!found) {
                        // first item
                        const item = {
                            date: group_date,
                            data_group: [item_data]
                        }

                        data.push(item)
                    } else {
                        // already existing item
                        found.data_group.push(item_data)
                    }
                }
            }
        }
    }

    // sort by property date asc
    // data.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));


    return data
}//end parse_timeline_data


/**
* PARSE_TIMELINE_DATA
* Parse rows data to use in timeline_factory grouping rows by date
*/
page.parse_timeline_data_activity = function (rows) {

    const self = this
    const data = []
    const rows_length = rows.length
    for (let i = 0; i < rows_length; i++) {

        // not resolved portals case
        if (typeof rows[i] !== 'object' || rows[i] === null) {
            continue;
        }
        // clone row object to preserve it as immutable
        const row = Object.assign({}, rows[i]);
        if (row.date_start_year) {
            var group_date = row.date_start_year;

            if (group_date) {
                var image_url = '/assets/img/placeholder.png';
                if (row.identifying_image_data.length > 0) {
                    image_url = __WEB_MEDIA_ENGINE_URL__+row.identifying_image_data[0].image;
                }

                const item_data = {
                    section_id: row.section_id,
                    tpl: page.section_tipo_to_template(row.section_tipo),
                    title: row.title,
                    image_src: image_url // image_url
                }

                const found = data.find(el => el.date === group_date)
                if (!found) {
                    // first item
                    const item = {
                        date: group_date,
                        data_group: [item_data]
                    }

                    data.push(item)
                } else {
                    // already existing item
                    found.data_group.push(item_data)
                }
            }
        }
    }

    // sort by property date asc
    data.sort((a, b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0));


    return data
}//end parse_timeline_data



/**
* PARSE_EXHIBITIONS_DATA
* Parse rows data of exhibitions
* Table exhibitions
*/
page.parse_exhibitions_data = function (data) {

    const self = this

    const final_data = []
    const data_length = data.length
    for (let i = 0; i < data_length; i++) {

        // not resolved portals case
        if (typeof data[i] !== 'object' || data[i] === null) {
            continue;
        }

        // clone row object to preserve it as immutable
        const row = Object.assign({}, data[i]);

        // parsed case
        if (row.parsed === true) {
            final_data.push(row)
            continue;
        }

        // sample
        // body: ""
        // children: "[{"type":"dd48","section_id":"4","section_tipo":"qdp280","from_component_tipo":"qdp276"},{"type":"dd48","section_id":"5","section_tipo":"qdp280","from_component_tipo":"qdp276"},{"type":"dd48","section_id":"2","section_tipo":"qdp280","from_component_tipo":"qdp276"}]"
        // father: "[{"section_tipo":"hierarchy1","section_id":"274","type":"dd48","from_component_tipo":"hierarchy45"}]"
        // identifying_image: null
        // identifying_object: null
        // images: null
        // immovable: null
        // lang: "lg-spa"
        // objects: "["1594"]"
        // panel_typology: "Presentación"
        // project: null
        // section_id: "1"
        // summary: ""
        // table: "exhibitions"
        // title: "La industrialización"
        // typology_id: "["1"]"

        // fix link paths to absolute paths
        row.body = row.body
            ? row.body.replaceAll('../../../media', page_globals.__WEB_MEDIA_BASE_URL__ + '/dedalo/media')
            : null

        row.abstract = row.abstract
            ? row.abstract.replaceAll('../../../media', page_globals.__WEB_MEDIA_BASE_URL__ + '/dedalo/media')
            : null


        function create_identify_element(name, el, type, container) {

            const type_image = type === 'audiovisual' ? 'posterframe' : 'image'

            const items = []

            const ar = common.split_data(el, " | ")
            for (let i = 0; i < ar.length; i++) {

                const current = ar[i]

                const src = type === 'audiovisual'
                    ? common.get_media_engine_url(current, 'av', null, true)
                    : common.get_media_engine_url(current, 'image')

                const object = {
                    src: src,
                    image: common.get_media_engine_url(current, type_image),
                    thumb: common.get_media_engine_url(current, type_image, 'thumb'),
                    type: type,
                    source: current
                }
                container.push(object)

                items.push(object)
            }

            row[name] = items.map(function (item) { return item.image })
            row[name + '_thumb'] = items.map(function (item) { return item.thumb })

            return items
        }

        row.main_images_all = []

        create_identify_element('identifying_object', row.identifying_object, 'object', row.main_images_all)
        create_identify_element('identifying_image', row.identifying_image, 'image', row.main_images_all)
        create_identify_element('identifying_immovable', row.identifying_immovable, 'immovable', row.main_images_all)
        create_identify_element('identifying_other_images', row.identifying_other_images, 'other_images', row.main_images_all)
        create_identify_element('identifying_audiovisual', row.identifying_audiovisual, 'audiovisual', row.main_images_all)

        row.image_url = row.main_images_all[0]
            ? row.main_images_all[0].image
            : null

        row.image_url_thumb = row.main_images_all[0]
            ? row.main_images_all[0].thumb
            : null

        row.children = row.children ? JSON.parse(row.children) : null
        row.father = row.father ? JSON.parse(row.father) : null

        // row.typology_id	= JSON.parse(row.typology_id)[0]
        const typology_id = row.typology_id
            ? JSON.parse(row.typology_id)
            : null
        row.typology_id = (typology_id && typeof typology_id[0] !== 'undefined')
            ? typology_id[0]
            : null

        // catalog data
        row.objects = (typeof row.objects === 'string' || row.objects instanceof String)
            ? JSON.parse(row.objects)
            : row.objects
        row.images = (typeof row.images === 'string' || row.images instanceof String)
            ? JSON.parse(row.images)
            : row.images
        row.immovable = (typeof row.immovable === 'string' || row.immovable instanceof String)
            ? JSON.parse(row.immovable)
            : row.immovable
        row.other_images = (typeof row.other_images === 'string' || row.other_images instanceof String)
            ? JSON.parse(row.other_images)
            : row.other_images
        row.documents_pdf = (typeof row.documents_pdf === 'string' || row.documents_pdf instanceof String)
            ? JSON.parse(row.documents_pdf)
            : row.documents_pdf
        row.audiovisuals = (typeof row.audiovisuals === 'string' || row.audiovisuals instanceof String)
            ? JSON.parse(row.audiovisuals)
            : row.audiovisuals

        // resolve portals cases
        // row.objects		= page.parse_catalog_data(row.objects)
        // row.images		= page.parse_catalog_data(row.images)
        // row.immovable	= page.parse_catalog_data(row.immovable)

        // views data parse
        const ar_objects = row.objects || []
        const ar_images = row.images || []
        const ar_immovable = row.immovable || []
        const ar_items = [].concat(ar_objects, ar_images, ar_immovable)
        // parse cloned to avoid re-parse properties
        row.list_data = page.parse_list_data(JSON.parse(JSON.stringify(ar_items)))
        row.map_data = page.parse_map_data(JSON.parse(JSON.stringify(ar_items)))
        row.timeline_data = page.parse_timeline_data(JSON.parse(JSON.stringify(ar_items)))

        // identifying_items
        row.identifying_items = []
        const all_identifying_items = [].concat(row.identifying_object, row.identifying_image)
        const all_identifying_items_thumb = [].concat(row.identifying_object_thumb, row.identifying_image_thumb)
        for (let j = 0; j < all_identifying_items.length; j++) {
            row.identifying_items.push({
                image_url: all_identifying_items[j],
                image_url_thumb: all_identifying_items_thumb[j],
                title: '',
                section_id: null,
                tpl: null
            })
        }

        // catalog items
        row.catalog_items = []

        // portals parse
        if (row.objects) {
            row.objects = self.parse_catalog_data(row.objects)
            // append to catalog_items list
            for (let g = 0; g < row.objects.length; g++) {
                row.catalog_items.push({
                    image_url: row.objects[g].image_url,
                    image_url_thumb: row.objects[g].image_url_thumb,
                    title: row.objects[g].name,
                    section_id: row.objects[g].section_id,
                    tpl: self.section_tipo_to_template(row.objects[g].section_tipo),
                    type: 'catalog'
                })
            }
        }
        if (row.images) {
            row.images = self.parse_catalog_data(row.images)
            // append to catalog_items list
            for (let g = 0; g < row.images.length; g++) {
                row.catalog_items.push({
                    image_url: row.images[g].image_url,
                    image_url_thumb: row.images[g].image_url_thumb,
                    title: row.images[g].title,
                    section_id: row.images[g].section_id,
                    tpl: self.section_tipo_to_template(row.images[g].section_tipo),
                    type: 'catalog'
                })
            }
        }
        if (row.immovable) {
            row.immovable = self.parse_catalog_data(row.immovable)
            // append to catalog_items list
            for (let g = 0; g < row.immovable.length; g++) {
                row.catalog_items.push({
                    image_url: row.immovable[g].image_url,
                    image_url_thumb: row.immovable[g].image_url_thumb,
                    title: row.immovable[g].title,
                    section_id: row.immovable[g].section_id,
                    tpl: self.section_tipo_to_template(row.immovable[g].section_tipo),
                    type: 'catalog'
                })
            }
        }


        // other items
        row.other_items = []

        // portals parse
        if (row.other_images) {
            // append to other_items list
            for (let g = 0; g < row.other_images.length; g++) {
                const el = row.other_images[g];
                if (!common.is_object(el)) continue // portal unresolved case
                row.other_items.push({
                    image_url: common.get_media_engine_url(el.image, 'image'),
                    image_url_thumb: common.get_media_engine_url(el.image, 'image', 'thumb'),
                    title: el.title,
                    source: el.image,
                    type: 'image'
                })
            }
        }
        if (row.documents_pdf) {
            // append to other_items list
            for (let g = 0; g < row.documents_pdf.length; g++) {
                const el = row.documents_pdf[g]
                if (!common.is_object(el)) continue // portal unresolved case
                const icon_pdf = __WEB_TEMPLATE_WEB__ + "/assets/images/icon_pdf.svg"
                row.other_items.push({
                    pdf_url: common.get_media_engine_url(el.document, 'pdf'),
                    image_url: icon_pdf,
                    image_url_thumb: icon_pdf,
                    title: el.title,
                    source: el.document,
                    type: 'document'
                })
            }
        }
        if (row.audiovisuals) {
            // append to other_items list
            for (let g = 0; g < row.audiovisuals.length; g++) {
                const el = row.audiovisuals[g]
                if (!common.is_object(el)) continue // portal unresolved case
                row.other_items.push({
                    video_url: common.get_media_engine_url(el.video, 'av', null, true),
                    image_url: common.get_media_engine_url(el.video, 'posterframe',),
                    image_url_thumb: common.get_media_engine_url(el.video, 'posterframe', 'thumb'),
                    title: null,
                    source: el.video,
                    type: 'audiovisual'
                })
            }
        }

        // date
        row.date_start = (row.date_start)
            ? common.clean_date(row.date_start, ',')[0]
            : null

        row.date_end = (row.date_end)
            ? common.clean_date(row.date_end, ',')[0]
            : null

        row.date = (row.date_start || row.date_end)
            ? (function () {
                const date = []
                if (row.date_start) date.push(row.date_start)
                if (row.date_end) date.push(row.date_end)
                return date
            })()
            : null


        row.parsed = true

        // add clean row
        final_data.push(row)
    }


    return final_data
}//end parse_exhibitions_data



/**
* PARSE_NEWS_DATA
* Parse rows data of news
* Table news
*/
page.parse_news_data = function (rows) {

    return this.parse_exhibitions_data(rows)
}//end parse_news_data



/**
* PARSE_DIDACTIC_DATA
* Parse rows data of didactic
* Table didactic
*/
page.parse_didactic_data = function (rows) {

    return this.parse_exhibitions_data(rows)
}//end parse_didactic_data



/**
* PARSE_CATALOG_DATA
*/
page.parse_catalog_data = function (rows) {

    rows = !common.is_array(rows)
        ? [rows]
        : rows

    const parsed_rows = []
    for (let i = 0; i < rows.length; i++) {

        // not resolved portals case
        if (typeof rows[i] !== 'object' || rows[i] === null) {
            continue;
        }

        // clone row object to preserve it as immutable
        const row = Object.assign({}, rows[i]);

        // parsed case
        if (row.parsed === true) {
            parsed_rows.push(row)
            continue
        }

        // collection

        //TODO: posar els camps que toca
        /*
        row.collection = (row.section_tipo === 'qdp178' && row.items && row.items.length > 0)
            ? common.remove_gaps(row.items[0].collection, " | ")
            : common.remove_gaps(row.collection, " | ")

        row.collection_array = (row.section_tipo === 'qdp178' && row.items && row.items.length > 0)
            ? common.split_data(row.items[0].collection, " | ")
            : common.split_data(row.collection, " | ")


        row.material = common.split_data(row.material, " - ")
        row.technique = common.split_data(row.technique, " - ")
        row.indexation = common.split_data(row.indexation, " - ")
        row.name = common.split_data(row.name, " - ")
        row.typology = common.split_data(row.typology, " - ")
        row.identifying_images = common.split_data(row.identifying_images, " | ") // only one is expected but it is transformed to array
        row.collection_data = JSON.parse(row.collection_data)
        row.fund_data = JSON.parse(row.fund_data)
        row.geolocation_data = JSON.parse(row.geolocation_data)
        row.geolocation_data_geojson = JSON.parse(row.geolocation_data_geojson)
        row.map = (!row.map || row.map === '{"alt":16,"lat":"39.462571","lon":"-0.376295","zoom":12}' || row.map === '{"alt":16,"lat":39.462571,"lon":-0.376295,"zoom":12}')
            ? null
            : JSON.parse(row.map)
        row.material_data = JSON.parse(row.material_data)
        row.technique_data = JSON.parse(row.technique_data)
        row.typology_data = JSON.parse(row.typology_data)
        row.images_data = JSON.parse(row.images_data)
        row.indexation_data = JSON.parse(row.indexation_data)
        row.name_data = JSON.parse(row.name_data)
        row.identifying_images_data = JSON.parse(row.identifying_images_data)
        row.images = JSON.parse(row.images)
        row.images_typology = JSON.parse(row.images_typology)
        row.documents = row.documents
            ? JSON.parse(row.documents)
            : []
        row.documents_titles = row.documents_titles
            ? JSON.parse(row.documents_titles)
            : []
        row.audiovisuals = row.audiovisuals
            ? JSON.parse(row.audiovisuals)
            : []
        row.relations = row.relations
            ? JSON.parse(row.relations)
            : null

        row.identifying_images_footer = row.identifying_images_footer
            ? JSON.parse(row.identifying_images_footer)
            : null
        row.images_footer = row.images_footer
            ? JSON.parse(row.images_footer)
            : null

        // dates
        row.dating = common.clean_date(row.dating, ",")

        // measures
        row.measures = page.combine_measures(row)

        // manufacturer
        row.manufacturer = row.manufacturer ? row.manufacturer.split(" | ") : null

        // image
        row.image_url_thumb = row.identifying_images.map(function (el) {
            return common.get_media_engine_url(el, 'image', 'thumb')
        })[0]
        row.image_url = row.identifying_images.map(function (el) {
            return common.get_media_engine_url(el, 'image')
        })[0]
        row.image_url_hires = row.identifying_images.map(function (el) {
            return common.get_media_engine_url(el, 'image', 'original')
        })[0]

        // additional parses
        row.source = row.source
            ? common.remove_gaps(row.source, " | ")
            : null
        row.source_name = row.source_name
            ? JSON.parse(row.source_name)
            : null
        row.source_surname = row.source_surname
            ? JSON.parse(row.source_surname)
            : null
        row.source_combi = []
        if (row.source_name) {
            for (let j = 0; j < row.source_name.length; j++) {
                const full_name = row.source_surname[j]
                    ? row.source_name[j] + " " + row.source_surname[j]
                    : row.source_name[j]
                row.source_combi.push(full_name)
            }
        }

        // outstanding
        row.outstanding = (row.outstanding && (row.outstanding === 'si' || row.outstanding === true))
            ? true
            : false

        // marks
        row.marks = page.combine_marks(row)
        */

        row.parsed = true

        parsed_rows.push(row)
    }


    return parsed_rows
}//end parse_catalog_data



/**
* PARSE_MUSEUM_PUBLICATIONS_DATA
* Parse rows data of publications to mimic exhibitions format and allow use
* didactic render panels
* Table publications
*/
page.parse_museum_publications_data = function (data) {

    const self = this

    const final_data = []
    const data_length = data.length
    for (let i = 0; i < data_length; i++) {

        // not resolved portals case
        if (typeof data[i] !== 'object' || data[i] === null) {
            continue;
        }

        // clone row object to preserve it as immutable
        const row = Object.assign({}, data[i]);

        // parsed case
        if (row.parsed === true) {
            final_data.push(row)
            continue;
        }

        // body. for convenience, value of abstract is moved to body
        row.body = row.abstract
            ? row.abstract
            : null

        // remove abstract to prevent duplicates
        row.abstract = null


        function create_identify_element(name, el_value, type, container) {

            const type_image = type === 'audiovisual' ? 'posterframe' : 'image'

            const items = []

            const current = el_value

            const regex = /^.{3,}_.{3,}_(\d{1,})\.[\S]{3,4}$/;
            const full_name = (current)
                ? regex.exec(current)[1] + '-rsc228'
                : null

            const src = common.get_media_engine_url(current, 'image', null, full_name)
            const thumb = common.get_media_engine_url(current, type_image, 'thumb', full_name)

            const object = {
                src: src,
                image: src,
                thumb: thumb,
                type: type,
                source: current
            }
            container.push(object)
            items.push(object)

            row[name] = items.map(function (item) { return item.image })
            row[name + '_thumb'] = items.map(function (item) { return item.thumb })

            return items
        }

        row.main_images_all = []

        create_identify_element('identifying_image', row.image, 'image', row.main_images_all)
        // create_identify_element('identifying_object',		row.identifying_object,			'object',		row.main_images_all)
        // create_identify_element('identifying_immovable',		row.identifying_immovable,		'immovable',	row.main_images_all)
        // create_identify_element('identifying_other_images',	row.identifying_other_images,	'other_images',	row.main_images_all)
        // create_identify_element('identifying_audiovisual',	row.identifying_audiovisual,	'audiovisual',	row.main_images_all)

        row.image_url = row.main_images_all[0]
            ? row.main_images_all[0].image
            : null

        row.image_url_thumb = row.main_images_all[0]
            ? row.main_images_all[0].thumb
            : null

        const typology_id = row.typology
            ? JSON.parse(row.typology)
            : null
        row.typology_id = (typology_id && typeof typology_id[0] !== 'undefined')
            ? typology_id[0]
            : null

        row.authors = row.authors
            ? common.split_data(row.authors, " | ")
            : null

        // catalog data
        // row.objects		= (typeof row.objects==='string' || row.objects instanceof String)
        // 	? JSON.parse(row.objects)
        // 	: row.objects
        // row.images		= (typeof row.images==='string' || row.images instanceof String)
        // 	? JSON.parse(row.images)
        // 	: row.images
        // row.immovable	= (typeof row.immovable==='string' || row.immovable instanceof String)
        // 	? JSON.parse(row.immovable)
        // 	: row.immovable
        // row.other_images	= (typeof row.other_images==='string' || row.other_images instanceof String)
        // 	? JSON.parse(row.other_images)
        // 	: row.other_images
        // row.documents_pdf	= (typeof row.documents_pdf==='string' || row.documents_pdf instanceof String)
        // 	? JSON.parse(row.documents_pdf)
        // 	: row.documents_pdf
        // row.audiovisuals	= (typeof row.audiovisuals==='string' || row.audiovisuals instanceof String)
        // 	? JSON.parse(row.audiovisuals)
        // 	: row.audiovisuals

        // resolve portals cases
        // row.objects		= page.parse_catalog_data(row.objects)
        // row.images		= page.parse_catalog_data(row.images)
        // row.immovable	= page.parse_catalog_data(row.immovable)

        // views data parse
        // const ar_images		= row.images || []
        // const ar_objects	= row.objects || []
        // const ar_immovable	= row.immovable || []
        // const ar_items		= [].concat(ar_objects, ar_images, ar_immovable)
        // // parse cloned to avoid reparse properties
        // row.list_data		= page.parse_list_data( JSON.parse(JSON.stringify(ar_items)) )
        // row.map_data		= page.parse_map_data( JSON.parse(JSON.stringify(ar_items)) )
        // row.timeline_data	= page.parse_timeline_data( JSON.parse(JSON.stringify(ar_items)) )

        // identifying_items
        // row.identifying_items				= []
        // const all_identifying_items			= [].concat(row.identifying_object, row.identifying_image)
        // const all_identifying_items_thumb	= [].concat(row.identifying_object_thumb, row.identifying_image_thumb)
        // for (let j = 0; j < all_identifying_items.length; j++) {
        // 	row.identifying_items.push({
        // 		image_url		: all_identifying_items[j],
        // 		image_url_thumb	: all_identifying_items_thumb[j],
        // 		title			: '',
        // 		section_id		: null,
        // 		tpl				: null
        // 	})
        // }

        // catalog items
        // row.catalog_items = []

        // // portals parse
        // if (row.objects) {
        // 	row.objects = self.parse_catalog_data(row.objects)
        // 	// append to catalog_items list
        // 	for (let g = 0; g < row.objects.length; g++) {
        // 		row.catalog_items.push({
        // 			image_url		: row.objects[g].image_url,
        // 			image_url_thumb	: row.objects[g].image_url_thumb,
        // 			title			: row.objects[g].name,
        // 			section_id		: row.objects[g].section_id,
        // 			tpl				: self.section_tipo_to_template(row.objects[g].section_tipo),
        // 			type			: 'catalog'
        // 		})
        // 	}
        // }
        // if (row.images) {
        // 	row.images = self.parse_catalog_data(row.images)
        // 	// append to catalog_items list
        // 	for (let g = 0; g < row.images.length; g++) {
        // 		row.catalog_items.push({
        // 			image_url		: row.images[g].image_url,
        // 			image_url_thumb	: row.images[g].image_url_thumb,
        // 			title			: row.images[g].title,
        // 			section_id		: row.images[g].section_id,
        // 			tpl				: self.section_tipo_to_template(row.images[g].section_tipo),
        // 			type			: 'catalog'
        // 		})
        // 	}
        // }
        // if (row.immovable) {
        // 	row.immovable = self.parse_catalog_data(row.immovable)
        // 	// append to catalog_items list
        // 	for (let g = 0; g < row.immovable.length; g++) {
        // 		row.catalog_items.push({
        // 			image_url		: row.immovable[g].image_url,
        // 			image_url_thumb	: row.immovable[g].image_url_thumb,
        // 			title			: row.immovable[g].title,
        // 			section_id		: row.immovable[g].section_id,
        // 			tpl				: self.section_tipo_to_template(row.immovable[g].section_tipo),
        // 			type			: 'catalog'
        // 		})
        // 	}
        // }

        // other items
        row.other_items = []

        // row.pdf
        if (row.pdf && row.pdf.length > 0) {
            // append to other_items list
            const icon_pdf = __WEB_TEMPLATE_WEB__ + "/assets/images/icon_pdf.svg"
            const regex = /^.{3,}_.{3,}_(\d{1,})\.[\S]{3,4}$/;
            const full_name = row.pdf
                ? regex.exec(row.pdf)[1] + '-rsc209'
                : null
            const pdf_url = common.get_media_engine_url(row.pdf, 'pdf', null, full_name)
            row.other_items.push({
                pdf_url: pdf_url,
                image_url: icon_pdf,
                image_url_thumb: icon_pdf,
                title: '',
                source: row.pdf,
                type: 'document'
            })
        }

        // date
        // row.date_start = (row.date_start)
        // 	? common.clean_date(row.date_start, ',')[0]
        // 	: null

        // row.date_end = (row.date_end)
        // 	? common.clean_date(row.date_end, ',')[0]
        // 	: null

        row.date = (row.publication_date)
            ? (function () {
                const date = []
                date.push(common.clean_date(row.publication_date, ','))
                return date
            })()
            : null

        row.parsed = true

        // add clean row to final array
        final_data.push(row)

    }//end for (let i = 0; i < data_length; i++)


    return final_data
}//end parse_museum_publications_data



/**
* COMBINE_COLUMNS
* @return promise
*/
page.combine_columns = function (data_label, data_value, type) {

    const ar_value = []
    if (data_label && data_label.length > 0) {
        for (let i = 0; i < data_label.length; i++) {

            const label = data_label[i]
            const value = data_value ? data_value[i] : null

            ar_value.push({
                label: label,
                value: value,
                type: type
            })
        }
    }

    return ar_value
}//end combine_columns



/**
* COMBINE_MEASURES
* @param object row
* @return array measurements
*/
page.combine_measures = function (row) {

    const base_measures = {
        element: common.split_data(row.measure_element, " | "),
        type: common.split_data(row.measure_type, " | "),
        value: common.split_data(row.measure_value, " | "),
        unit: common.split_data(row.measure_unit, " | ")
    }
    const measures = []
    for (let j = 0; j < base_measures.value.length; j++) {
        measures.push({
            element: base_measures.element[j],
            type: base_measures.type[j],
            value: base_measures.value[j],
            unit: base_measures.unit[j]
        })
    }

    return measures
}//end combine_measures



/**
* COMBINE_MARKS
* @param object row
* @return array marks
*/
page.combine_marks = function (row) {

    const mark_data = row.mark_data
        ? JSON.parse(row.mark_data)
        : null
    const mark_inscription = row.mark_inscription
        ? JSON.parse(row.mark_inscription)
        : null
    const mark_images = row.mark_images
        ? common.split_data(row.mark_images, " | ").map(function (el) {
            return el ? JSON.parse(el) : null
        })
        : null
    const mark_position = row.mark_position
        ? common.split_data(row.mark_position, " | ").map(function (el) {
            return el ? JSON.parse(el) : null
        })
        : null


    if (mark_data && mark_data.length > 0) {

        const marks = []
        for (let i = 0; i < mark_data.length; i++) {

            // mark_images[i].push(mark_images[i][0])

            const images = mark_images && mark_images[i]
                ? mark_images[i].map(function (el) {
                    return common.get_media_engine_url(el, 'image', 'thumb')
                })
                : null

            const images_hires = mark_images && mark_images[i]
                ? mark_images[i].map(function (el) {
                    return common.get_media_engine_url(el, 'image', 'original')
                })
                : null

            const inscription = mark_inscription && mark_inscription[i]
                ? mark_inscription[i]
                : null

            const position = mark_position && mark_position[i]
                ? mark_position[i]
                : null

            marks.push({
                inscription: inscription,
                position: position,
                images: images,
                images_hires: images_hires
            })
        }
        return marks
    }

    return null
}//end combine_marks



/**
* PARSE_TS_WEB
* @param object | array rows
* @return array rows
*/
page.parse_ts_web = function (rows) {
    rows = !common.is_array(rows)
        ? [rows]
        : rows

    const parsed_rows = []
    const rows_length = rows.length
    for (let i = 0; i < rows_length; i++) {

        // not resolved portals case
        if (typeof rows[i] !== 'object' || rows[i] === null) {
            console.warn("! parse_map_data: ignored invalid row:", rows, i);
            continue;
        }

        // clone row object to preserve it as immutable
        const row = Object.assign({}, rows[i]);
        // const row = rows[i]

        // parsed case
        if (row.parsed === true) {
            parsed_rows.push(row)
            continue
        }

        // fix link paths to absolute paths
        row.body = row.body
            ? common.convertText(row.body)
            : null

        row.abstract = row.abstract
            ? common.convertText(row.abstract)
            : null

        // row.identify_image_big = row.identify_image
        // 	? JSON.parse(row.identify_image).map((el)=>{
        // 		return common.get_media_engine_url(el, 'image','original')
        // 	  })
        // 	: null;

        row.uri = row.uri
            ? JSON.parse(row.uri)
            : [];

        row.identify_image = row.identify_image
            ? JSON.parse(row.identify_image).map((el) => {
                return common.get_media_engine_url(el, 'image')
            })
            : null;

        /*row.image = row.image
            ? JSON.parse(row.image)
            : null*/
        if (row.image) {
            if ((Array.isArray(row.image))) {
                row.image_icon = row.image.filter(function(elem){
                    return elem.title === 'icon';
                }).map(function(elem){
                    elem.image = common.get_media_engine_url(elem.image, 'image')
                    return elem;
                });

                row.image = row.image.filter(function(elem){
                    return elem.title !== 'icon';
                }).map(function(elem){
                    elem.image = common.get_media_engine_url(elem.image, 'image')
                    return elem;
                });
            }
        } else {
            row.image_icon = [];
            row.image = [];
        }

        row.other_images_resolved = row.other_images_resolved
            ? JSON.parse(row.other_images_resolved)
            : null
        // resolve full absolute url
        if (row.other_images_resolved) {
            for (let i = 0; i < row.other_images_resolved.length; i++) {
                row.other_images_resolved[i] = {
                    source: row.other_images_resolved[i],
                    url: common.get_media_engine_url(row.other_images_resolved[i], 'image')
                }
            }
        }

        row.audiovisual_resolved = row.audiovisual_resolved
            ? JSON.parse(row.audiovisual_resolved)
            : null
        // resolve full absolute url
        if (row.audiovisual_resolved) {
            for (let i = 0; i < row.audiovisual_resolved.length; i++) {
                row.audiovisual_resolved[i] = {
                    source: row.audiovisual_resolved[i],
                    url: common.get_media_engine_url(row.audiovisual_resolved[i], 'av', null, true),
                    posterframe: common.get_media_engine_url(row.audiovisual_resolved[i], 'posterframe'),
                }
            }
        }

        row.pdf_resolved = row.pdf_resolved
            ? JSON.parse(row.pdf_resolved)
            : []
        // resolve full absolute url
        if (row.pdf_resolved) {
            for (let i = 0; i < row.pdf_resolved.length; i++) {
                row.pdf_resolved[i] = {
                    source: row.pdf_resolved[i],
                    url: common.get_media_engine_url(row.pdf_resolved[i], 'pdf')
                }
            }
        }

        row.pdf_title = row.pdf_title
            ? JSON.parse(row.pdf_title)
            : null

        row.parsed = true

        parsed_rows.push(row)
    }


    return parsed_rows
}//end parse_ts_web



/**
* GET_RECORDS
* Generic get_records function
*/
page.get_records = function (options) {

    const self = this

    // options
    const table = options.table || 'ts_web_mupreva'
    const sql_filter = options.sql_filter || null
    const limit = options.limit || 0
    const count = options.count || false
    const offset = options.offset || 0
    const order = options.order || 'section_id ASC'
    const ar_fields = options.ar_fields || '*'
    const parse = options.parse || page.parse_ts_web
    const resolve_portals_custom = options.resolve_portals_custom || ''
    const group = options.group || null
    const section_id = options.section_id || null

    return new Promise(function (resolve) {

        data_manager.request({
            body: {
                dedalo_get: 'records',
                db_name: page_globals.WEB_DB,
                lang: page_globals.WEB_CURRENT_LANG_CODE,
                table: table,
                ar_fields: ar_fields,
                section_id: section_id,
                sql_filter: sql_filter,
                limit: limit,
                count: count,
                offset: offset,
                order: order,
                group: group,
                resolve_portals_custom: resolve_portals_custom
            }
        })
            .then(function (response) {
                //console.log("page.get_records API response:", response);
                const data = (typeof parse === "function")
                    ? parse(response.result)
                    : response.result

                if(options.get_count) {
                    resolve({data, total: response.total})
                } else {
                    resolve(data)
                }
            })
    })
}//end get_records



/**
* ADD_TEST_ROWS
* Fill rows until min cloning last row
* @return array
*/
page.add_test_rows = function (rows, min) {

    return true // inactive. Use only for local test (!)

    // min = 100

    // const len		= rows.length
    // const last_item	= Object.assign({}, rows[len-1])
    // for (let i = 0; i < min; i++) {

    // 	if (typeof rows[i]!=='undefined') {
    // 		rows[i].title = i + " - " + rows[i].title
    // 	}else{
    // 		// last item clone
    // 		const row = Object.assign({}, last_item)
    // 		row.title = i + " - " + row.title
    // 		rows.push(row)
    // 	}
    // }

    // return rows
};//end add_test_rows
