/*global tstring, page_globals, SHOW_DEBUG, item_list_row, common, forms, document, DocumentFragment, tstring, console */
/*eslint no-undef: "error"*/
/*jshint esversion: 6, node: true */
"use strict";



/**
* PAGE
* Global site page functions
* Here are defined config used around all site like map config, colors, etc.
*/
var page = {


    /**
    *  VARS
    */
    // maps common config
    maps_config: {
        // source maps. Used on catalog and item maps
        source_maps: [
            {
                name: "OSM lab",
                url: 'https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
                options: {
                    maxZoom: 18,
                    id: "e-osmlab-osm-mapnik-black_and_white",
                    type: "tms",
                },
                default: false
            },
            {
                name: "OSM",
                url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                options: {
                    maxZoom: 19,
                },
                default: false
            },
            {
                name: 'Map Tiles',
                url: 'https://api.maptiler.com/maps/basic/256/{z}/{x}/{y}@2x.png?key=udlBrEEE2SPm1In5dCNb', // 256 ok
                options: {
                    maxZoom: 22,
                },
                default: true
            },
            {
                name: "ARCGIS",
                url: '//server.arcgisonline.com/ArcGIS/' + 'rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                options: {}
            }
        ],
        // popup otions
        popup_options: {
            maxWidth: 420,
            closeButton: false,
            className: 'map_popup'
        },
        // markers
        markers: {
            hallazgo: {
                iconUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/img/map/point_orange.png",
                shadowUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/img/map/marker-shadow.png",
                iconSize: [47, 43], // size of the icon
                shadowSize: [41, 41], // size of the shadow
                iconAnchor: [10, 19], // point of the icon which will correspond to marker's location
                shadowAnchor: [0, 20],  // the same for the shadow
                popupAnchor: [12, -20] // point from which the popup should open relative to the iconAnchor
            },
            produccion: {
                iconUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/img/map/point_blue.png",
                shadowUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/img/map/marker-shadow.png",
                iconSize: [47, 43], // size of the icon
                shadowSize: [41, 41], // size of the shadow
                iconAnchor: [10, 19], // point of the icon which will correspond to marker's location
                shadowAnchor: [0, 20],  // the same for the shadow
                popupAnchor: [12, -20] // point from which the popup should open relative to the iconAnchor
            },
            objects: {
                iconUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/images/map/point_purple.png",
                shadowUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/images/map/marker-shadow.png",
                iconSize: [47, 43], // size of the icon
                shadowSize: [41, 41], // size of the shadow
                iconAnchor: [10, 19], // point of the icon which will correspond to marker's location
                shadowAnchor: [0, 20],  // the same for the shadow
                popupAnchor: [12, -20] // point from which the popup should open relative to the iconAnchor
            },
            pictures: {
                iconUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/images/map/point_blue.png",
                shadowUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/images/map/marker-shadow.png",
                iconSize: [47, 43], // size of the icon
                shadowSize: [41, 41], // size of the shadow
                iconAnchor: [10, 19], // point of the icon which will correspond to marker's location
                shadowAnchor: [0, 20],  // the same for the shadow
                popupAnchor: [12, -20] // point from which the popup should open relative to the iconAnchor
            },
            immovable: {
                iconUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/images/map/point_green.png",
                shadowUrl: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/images/map/marker-shadow.png",
                iconSize: [47, 43], // size of the icon
                shadowSize: [41, 41], // size of the shadow
                iconAnchor: [10, 19], // point of the icon which will correspond to marker's location
                shadowAnchor: [0, 20],  // the same for the shadow
                popupAnchor: [12, -20] // point from which the popup should open relative to the iconAnchor
            }
        }
    },


    // colors
    colors: [
        'qdp_purple',
        'qdp_blue',
        'qdp_green',
        'qdp_yellow'
    ],


    // thesaurus tables
    ts_tables: [
        'ts_material',
        'ts_technique',
        'ts_thematic',
        'ts_onomastic',
        'ts_chronological'
    ],


    default_image: page_globals.__WEB_TEMPLATE_WEB__ + '/assets/images/default.jpg',


    // breadcrumb. Store ordered path objects of current page
    breadcrumb: [],



    /**
    * SET_UP
    */
    set_up: function (options) {

        const self = this

        // options
        self.breadcrumb = options.breadcrumb

        // ready
        window.ready(function () {
            // init lang selector
            self.init_lang_selector()

            // show footer (from opacity zero)
            const footer = document.getElementById('footer')
            if (footer) {
                setTimeout(function () {
                    footer.classList.remove('hidded')
                }, 500)
            }
        })

        self.activate_small_header()



        // subscribe events
        // rendered event
        event_manager.subscribe('rendered', rendered)
        function rendered(options) {

            // options
            const rows_list_container = options.rows_list_container
            const view_mode = options.view_mode
            const rows_container = options.rows_container || rows_list_container.querySelector('.rows_container')

            // init Masonry
            if (view_mode === 'list_images') {

                const grid = rows_container
                if (!grid) {
                    console.log("Error en get grid from rows_list_container:", rows_list_container);
                    return false;
                }

                // masonry
                function onLayout(items) {

                    event_manager.publish('masonry_layout', items)

                    // load hi res images
                    const items_length = items.length
                    for (let i = items_length - 1; i >= 0; i--) {

                        const item = items[i]
                        const image = item.element.firstChild
                        if (image.src !== image.image_url) {
                            image.src = image.image_url
                        }
                    }
                }

                imagesLoaded(grid, function () {
                    const msnry = new Masonry(grid, {
                        itemSelector: '.grid-item',
                        columnWidth: '.grid-sizer',
                        percentPosition: true,
                        visibleStyle: { transform: 'translateY(0)', opacity: 1 },
                        hiddenStyle: { transform: 'translateY(100px)', opacity: 0 }
                    })
                    grid.classList.remove('are-images-unloaded');
                    msnry.once('layoutComplete', onLayout);
                    msnry.layout();
                });
            }
        }
        event_manager.subscribe('template_render_end', template_render_end)
        function template_render_end(options) {
            // breadcrumb
            if (options.breadcrumb) {
                for (let i = 0; i < options.breadcrumb.length; i++) {
                    self.breadcrumb.push(options.breadcrumb[i])
                }
            }
            self.render_breadcrumb()

            // button_scroll_to_top
            self.render_button_scroll_to_top()
        }

        return true
    },//end set_up



    /**
    * INIT_LANG_SELECTOR
    * @return bool true
    */
    init_lang_selector: function () {

        const self = this

        const page_lang_selector = document.getElementById('page_lang_selector')
        if (page_lang_selector) {
            const lang_globe_icon = page_lang_selector.querySelector('.lang_globe_icon')
            if (lang_globe_icon) {
                lang_globe_icon.addEventListener('click', function () {

                    const langs_list = page_lang_selector.querySelector('.langs_list')
                    langs_list.classList.toggle('hide')

                    page_lang_selector.classList.toggle("active")
                })
            }

            self.hilite_lang(page_globals.WEB_CURRENT_LANG_CODE)
        }

        return true
    },//end init_lang_selector



    /**
    * HILITE_LANG
    */
    hilite_lang: function (lang) {

        // Lang selected
        const page_lang_selector = document.getElementById("page_lang_selector")
        if (page_lang_selector) {
            const nodes = page_lang_selector.querySelectorAll("a")
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].href.indexOf(lang) !== -1) {
                    nodes[i].classList.add("selected")
                }
            }
        }

        return true
    },//end hilite_lang



    /**
    * SELECTED
    * @return bool true
    */
    selected: function (element, grouper) {

        const current_selected = grouper.querySelectorAll('.selected')
        for (let i = current_selected.length - 1; i >= 0; i--) {
            current_selected[i].classList.remove("selected")
        }

        element.classList.add("selected")

        return true
    },//end selected(this, info_wrapper)



    /**
    * ACTIVATE_SMALL_HEADER
    * small_header
    * @param object row
    * @return bool true
    */
    activate_small_header: function (row) {

        const self = this

        const header_node = document.getElementById("header")
        const small_header = document.getElementById("small_header") || (function () {
            if (!header_node) {
                return false
            }
            const small_header = header_node.cloneNode(true)
            small_header.id = 'small_header'
            small_header.classList.add("small")
            // removes page_lang_selector
            const page_lang_selector = small_header.querySelector('#page_lang_selector')
            page_lang_selector.remove()
            // nav. Add samll class and attach events again
            const nav = small_header.querySelector('#nav')
            nav.classList.add('small')
            const ul = nav.querySelector(':scope >ul')
            $(ul).dropotron({
                mode: 'fade',
                speed: 350,
                noOpenerFade: true,
                alignment: 'center'
            });

            document.body.appendChild(small_header)

            return small_header
        })()
        if (small_header) {

            function check_menu(scrollY) {
                if (scrollY > 115) {
                    small_header.classList.add('show')
                } else {
                    small_header.classList.remove('show')
                }
            }

            let lastScrollPosition = window.scrollY || 0
            let tick = false; // Track whether call is currently in process

            window.addEventListener('scroll', function (e) {
                lastScrollPosition = window.scrollY;
                if (!tick) {
                    window.requestAnimationFrame(function () {
                        check_menu(lastScrollPosition);
                        tick = false;
                    });
                    tick = true;
                }
            });

            // first check on page load
            check_menu(lastScrollPosition)
        } else {
            console.warn("Unable to activate small_header:", small_header);
        }

        return true
    },//end activate_small_header



    /**
    * RENDER_BUTTON_SCROLL_TO_TOP
    * @return DOM element wrapper_scroll_to_top
    */
    render_button_scroll_to_top: function () {

        const button_scroll_to_top = common.create_dom_element({
            element_type: 'div',
            id: 'button_scroll_to_top',
            class_name: 'button_scroll_to_top',
            parent: document.body
        })

        const img = common.create_dom_element({
            element_type: "img",
            src: page_globals.__WEB_TEMPLATE_WEB__ + "/assets/images/icon_arrow_down.svg",
            parent: button_scroll_to_top
        })

        const btn = $(button_scroll_to_top);
        $(window).scroll(function () {

            const value = $(window).scrollTop()
            if (value > 300) {
                btn.addClass('show');
                event_manager.publish('hide_button_scroll_to_top', {
                    result: true,
                    value: value
                })
            } else {
                btn.removeClass('show');
                event_manager.publish('hide_button_scroll_to_top', {
                    result: false,
                    value: value
                })
            }
        });

        btn.on('click', function (e) {
            e.preventDefault();
            $('html, body').animate({ scrollTop: 0 }, '300');
        });

        return button_scroll_to_top
    },//end render_button_scroll_to_top



    /**
    * ADJUST_IMAGE_SIZE
    * Verticalize properties of vertical images (default is horizontal)
    */
    adjust_image_size: function (image_obj) {

        image_obj.style.opacity = 0;
        var actual_image = document.createElement("img")
        actual_image.src = image_obj.style.backgroundImage.replace(/"/g, "").replace(/url\(|\)$/ig, "")
        actual_image.addEventListener("load", function (e) {

            var width = this.width;
            var height = this.height;

            // Vertical case
            if (height > width) {
                image_obj.classList.add("vertical")
                // Adjust title and body text ?
            }
            image_obj.style.opacity = 1;
        }, false)

        return true
    },//end adjust_image_size



    /**
    * ADJUST_FOOTER_POSITION
    */
    adjust_footer_position: function () {

        // scrollbar
        let scrollbar = false
        const top_container = document.getElementById("wrapper")
        if (top_container) {

            const top_container_height = top_container.offsetHeight
            const window_height = window.innerHeight

            if (top_container_height > window_height) {
                scrollbar = true
            }
        } else {
            console.log("top_container not found !");
            return false
        }

        // debug
        if (SHOW_DEBUG === true) {
            console.log("scrollbar:", scrollbar);
        }

        // footer
        const footer = document.getElementById("footer")
        if (scrollbar === false) {
            footer.classList.add("fixed")
        } else {
            footer.classList.remove("fixed")
        }

        return scrollbar
    },//end adjust_footer_position



    /**
    * ACTIVATE_TOOLTIPS
    */
    activate_tooltips: function (elements) {

        $(elements).each(function () {
            new Tooltip($(this), {
                placement: 'top',
            });
        });
    },//end activate_tooltips



    /**
    * BUILD_PAGINATOR_HTML
    * Builds html of paginator from page_nodes
    */
    build_paginator_html: function (page_nodes_data, container, goto_url) {

        const self = this

        // wrapper ul
        const wrapper_ul = container
        wrapper_ul.dataset.total = page_nodes_data.total

        // iterate nodes
        const ar_nodes = page_nodes_data.ar_nodes
        const ar_nodes_length = ar_nodes.length
        for (let i = 0; i < ar_nodes_length; i++) {

            const node = ar_nodes[i]
            let label = node.label
            let class_name = "page " + node.type + " " + node.id
            if (node.active === false) {
                class_name += " unactive"
            }

            // label blank cases
            if (node.id === "previous" || node.id === "next" || node.id === "last" || node.id === "first") {
                label = ""
            }

            // selected
            if (node.selected === true) {
                class_name += " selected"
            }

            // create_dom_element based on node type
            if (node.type === "extra") {
                // extra (span)
                class_name = node.type

                const span = common.create_dom_element({
                    element_type: "span",
                    class_name: class_name,
                    text_content: label,
                    parent: wrapper_ul
                })
            } else {
                // normal (link)
                const a = common.create_dom_element({
                    element_type: "a",
                    class_name: class_name,
                    text_content: label,
                    dataset: {
                        offset: node.offset_value,
                        active: node.active
                    },
                    parent: wrapper_ul
                })

                // link
                if (node.active === true) {
                    // Nothing to do at now
                }
            }
        }//end for loop


        // event delegation
        wrapper_ul.addEventListener('click', self.paginator_click_event);


        return wrapper_ul
    },//end build_paginator_html



    /**
    * PAGINATOR_CLICK_EVENT
    * Add and manages click events of paginator links (event is delegated on wrap)
    */
    paginator_click_event: function (e) {

        const self = this

        const element = e.target
        const active = element.dataset.active

        if (active !== "true") {
            return false;
        }

        const total = parseInt(element.parentNode.dataset.total)
        const offset = element.dataset.offset


        const search_form = document.getElementById("search_form")
        const js_promise = main_home.search(search_form, null, offset, total)

        js_promise.then(function (response) {

            // scroll window to top	of 	catalogo_rows_list
            const catalogo_rows_list = self.result_container
        })


        return js_promise
    },//end paginator_click_event



    /**
    * BUILD_IMAGE_WITH_BACKGROUND_COLOR
    * @return object
    */
    build_image_with_background_color: function (thumb_url, container, backgroundColorThief, quality) {

        const self = this

        return new Promise(function (resolve, reject) {

            // img
            const img = common.create_dom_element({
                element_type: "img",
                src: thumb_url
            })
            img.setAttribute('crossOrigin', 'Anonymous');

            // image activate. Get background color (from thumb), set and show hided image
            function activate_image(e) {

                const img = e.target
                img.loading = 'lazy'
                const format = (img.height > img.width) ? 'vertical' : 'horizontal'
                let bg_color_rgb = null
                let bg_type = null

                if (typeof img === "undefined") {
                    resolve(null)
                    return
                }

                // already solved background color from thumb
                if (!img.classList.contains("loaded")) {

                    // backgroundColorThief way
                    // // get dominant color of current image
                    // // const rgb = self.colorThief.getColor(img);
                    // // get dominant background Color of current image
                    // // quality : is an optional argument. It needs to be an integer. 0 is the highest quality settings.
                    // // 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
                    // // faster the palette generation but the greater the likelihood that colors will be missed.
                    // if (typeof quality==='undefined') {
                    // 	quality = 10;
                    // }
                    // const rgb = backgroundColorThief.getBackGroundColor(img, quality);

                    // direct way (get pixel x=1, y=1 color)
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
                    const rgb = canvas.getContext('2d').getImageData(0, 0, 1, 1).data;
                    canvas.remove()

                    // round rgb values
                    function correction(value) {
                        return value
                        // const factor = 1.016
                        // const result = (value>127)
                        // 	? Math.floor(value * factor)
                        // 	: Math.floor(value / factor)
                        // return result
                    }

                    const r = correction(rgb[0])
                    const g = correction(rgb[1])
                    const b = correction(rgb[2])

                    // build backgroundColor style string
                    bg_color_rgb = 'rgb(' + r + ',' + g + ',' + b + ')';

                    // set background color style (both container and image)
                    if (container) {
                        container.style.backgroundColor = bg_color_rgb
                    }

                    // style background color black / white detection
                    bg_type = (r < 127 || g < 127 || b < 127) // (r>127 && g>127 & b>127) || (r+g+b)>382
                        ? 'black'
                        : 'white'
                    img.classList.add(bg_type)

                    // show image (hided until now)
                    // const time = getRandomInt(50, 250)
                    img.classList.add("loaded")
                }

                resolve({
                    img: img,
                    format: format,
                    bg_color_rgb: bg_color_rgb,
                    bg_type: bg_type
                })

                return img
            }//end activate_image

            img.addEventListener('load', activate_image);
        })
    },//end build_image_with_background_color



    /**
    * ADD_TOOLTIP
    * Creates dynamically a div node with given content
    * @return bool true
    */
    add_tooltip: function (options) {

        const element = options.element
        const content = options.content

        let tooltip

        element.addEventListener('mouseover', function (event) {

            // create node every time
            tooltip = common.create_dom_element({
                element_type: "div",
                class_name: "tooltip hide_tooltip",
                inner_html: content,
                parent: document.body
            })

            const y = event.clientY - event.offsetY + this.offsetHeight // + event.offsetY //
            const x = event.pageX - event.offsetX

            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
            tooltip.classList.remove('hide_tooltip')

        })
        element.addEventListener('mouseout', function () {
            tooltip.remove()
        })

        return true
    },//end add_tooltip



    /**
    * MAP_POPUP_BUILDER
    * Build DOM nodes to insert into map pop-up
    */
    map_popup_builder: function (item) {

        const self = this

        const popup_wrapper = common.create_dom_element({
            element_type: "div",
            class_name: "popup_wrapper"
        })

        const group = item.group

        // order group
        const collator = new Intl.Collator('es', { sensitivity: 'base', ignorePunctuation: true });
        group.sort((a, b) => { return collator.compare(a.title, b.title) });

        const build_pop_item = function (group_data) {

            const section_id = group_data.section_id
            const tpl = group_data.tpl
            const title = group_data.title || group_data.name || (tpl + " - " + section_id)
            const image_url = group_data.identifying_images

            const description = group_data.description

            // popup_item
            const popup_item = common.create_dom_element({
                element_type: "div",
                class_name: "popup_item",
                parent: popup_wrapper
            })

            // // image
            // const image_wrapper = common.create_dom_element({
            //     element_type: "div",
            //     class_name: "image_wrapper",
            //     parent: popup_item
            // })
            // image_wrapper.addEventListener("click", function (e) {
            //     // event publish map_selected_marker
            //     event_manager.publish('map_popup_selected_item', {
            //         item: image_wrapper,
            //         section_id: section_id,
            //         tpl: tpl,
            //         title: title
            //     })
            // })
            // const item_image = common.create_dom_element({
            //     element_type: "img",
            //     parent: image_wrapper
            // })
            // const image_in_dom = function () {
            //     // calculate bg color and load hi res image
            //     page.build_image_with_background_color(image_url, image_wrapper)
            //         .then(function (response) {

            //             const img = response.img // dom node
            //             const format = response.format // vertical | horinzontal
            //             const bg_color_rgb = response.bg_color_rgb

            //             // set image node style to loaded (activate opacity transition)
            //             item_image.classList.add('loaded')

            //             // load image
            //             item_image.src = image_url
            //         })
            // }
            // item_image.image_in_dom = image_in_dom

            // text_title
            const text_title = common.create_dom_element({
                element_type: "div",
                class_name: "text_title",
                inner_html: title,
                parent: popup_item
            })
        }

        const group_length = group.length
        let limit = 5

        function iterate(from, to) {
            for (let i = from; i < to; i++) {
                build_pop_item(group[i])
            }
            // Load more button
            if (to < (group_length - 1)) {
                const more_node = common.create_dom_element({
                    element_type: "input",
                    type: 'button',
                    value: tstring['load_more'] || "Load more..",
                    class_name: "more_node btn btn-light btn-block primary",
                    parent: popup_wrapper
                })
                more_node.addEventListener("click", function () {

                    const _from = parseInt(this.offset)
                    const _to = ((_from + limit) < group_length) ? (_from + limit) : group_length
                    iterate(_from, _to)

                    this.remove()
                })
                more_node.offset = to
            }
        }

        // first elements from zero to limit
        const to = limit < group_length ? limit : group_length
        iterate(0, to)


        return popup_wrapper
    },//end map_popup_builder



    /**
    * SECTION_TIPO_TO_TEMPLATE
    */
    section_tipo_to_template: function (section_tipo) {
        let template
        switch (section_tipo) {
            case 'tch100':
                template = 'img';
                break;
            case 'tch1':
                template = 'cat';
                break;
            case 'tchi1':
                template = 'imm';
                break;
            case 'tch300':
                template = 'doc';
                break;
            case 'rsc205':
                template = 'pub';
                break;
            case 'exhibition1':
                template = 'exp';
                break;
            case 'activity1':
                template = 'act';
                break;
        }
        return template
    },//end section_tipo_to_template

    /**
    * TLD_TO_TEMPLATE
    */
    tld_to_template: function (tld) {
        let template
        switch (tld) {
            case 'technique1':
                template = 'tec';
                break;
            case 'ts1':
                template = 'tem';
                break;
            case 'dc1':
                template = 'cro';
                break;
            case 'material1':
                template = 'mat';
                break;
            case 'object1':
                template = 'obj';
                break;
            case 'ubication1':
                template = 'top';
                break;
            case 'htoponymy1':
                template = 'htop';
                break;
        }
        return template
    },//end tld_to_table

    /**
    * TLD_TO_TABLE
    */
    tld_to_table: function (tld) {
        let template
        switch (tld) {
            case 'technique1':
                template = 'ts_technique';
                break;
            case 'ts1':
                template = 'ts_thematic';
                break;
            case 'dc1':
                template = 'ts_chronological';
                break;
            case 'material1':
                template = 'ts_material';
                break;
            case 'object1':
                template = 'ts_object';
                break;
            case 'ubication1':
                template = 'ts_ubication';
                break;
        }
        return template
    },//end tld_to_table

    get_translated_table: function (type) {
        const typesDictionary = {
            tch100: tstring.images,
            tch1: tstring.objetos,
            tchi1: tstring.immovables_title,
            tch300: tstring.documents,
        }

        return typesDictionary[type] || type;
    },


    /**
    * OPEN_PLAYER_WITH_OVERLAY
    * Create and open video player for given url
    * @return promise
    */
    open_player_with_overlay: function (container, element_player) {

        const js_promise = new Promise(function (resolve) {

            const wrapper = container.querySelector(".player_wrapper") || common.create_dom_element({
                element_type: "div",
                class_name: "player_wrapper",
                parent: container
            })

            // clean wrapper
            while (wrapper.hasChildNodes()) {
                wrapper.removeChild(wrapper.firstChild);
            }

            const overlay = common.create_dom_element({
                element_type: "div",
                class_name: "overlay",
                parent: wrapper
            })
            overlay.addEventListener("click", function () {
                wrapper.remove()
            })

            // player
            wrapper.appendChild(element_player)

            resolve(wrapper)
        })
    },//end open_player_with_overlay



    on_idle: function (fn) {

        const handle = window.requestIdleCallback(function () {
            console.log("on_idle fn:", fn);
            fn()
        })
        // window.cancelIdleCallback(handle)
    },//end on_idle



    /**
    * RENDER_BREADCRUMB
    * page.php set current row as default breadcrumb data if not is defined by the template
    * This function is called by templates by 'template_render_end' event
    * page property 'breadcrumb' is modified (added optional elements) by the templates before is called
    * @return bool true
    */
    render_breadcrumb: function () {

        function create_item(el) {

            const node = common.create_dom_element({
                element_type: "a",
                class_name: "breadcrumb_item",
                href: el.path,
                inner_html: el.label || 'Unknow'
            })

            return node
        }

        const container = document.getElementById('breadcrumb')
        if (container) {

            const fragment = new DocumentFragment();
            const items = page.breadcrumb
            for (let i = 0; i < items.length; i++) {
                const item = items[i]

                const node = create_item(item)
                fragment.appendChild(node)
            }

            container.appendChild(fragment)
        }


        return true;
    },//end render_breadcrumb



    /**
    * CLOSE_WINDOW
    * @return
    */
    close_window: function (item) {

        window.close();
    },//end close_window



    /**
    * BUILD_HAS_CODE
    * Build a hash code from the string value given
    * @see didactic 'get_didactic_data' cache key
    * @return string hash
    */
    build_has_code: function (value) {

        var hash = 0, i, chr;
        if (value.length === 0) return hash;
        for (i = 0; i < value.length; i++) {
            chr = value.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }

        return hash;
    }//end build_has_code



}//end page
