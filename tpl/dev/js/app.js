const onListener = function (element, type, selector, handler) {
    element.addEventListener(type, function (event) {
        if (event.target.closest(selector)) {
            handler(event);
        }
    });
};

function removeParam(param) {
    const params = new URLSearchParams(window.location.search);
    params.delete(param);
    window.history.replaceState({}, document.title, window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
}

document.addEventListener("DOMContentLoaded", function () {
    // --------------
    // Tancar pàgina
    // --------------
    var close = document.getElementById("close-page");
    if (close) {
        close.addEventListener("click", function () {
            window.close();
        });
    }

    // ----------
    // scroll top
    // ----------
    const scrollTopElement = document.querySelector(".scrolltop");
    const footer = document.querySelector("footer");

    if (scrollTopElement) {
        window.addEventListener("scroll", function () {
            if (window.scrollY > 300) {
                scrollTopElement.classList.add("visible");

                // Adjust position to not overlap footer
                if (footer) {
                    const footerRect = footer.getBoundingClientRect();
                    const scrollTopHeight = scrollTopElement.offsetHeight;
                    const windowHeight = window.innerHeight;

                    // If footer is visible in viewport, move scrolltop above it
                    if (footerRect.top < windowHeight) {
                        const offset = windowHeight - footerRect.top;
                        scrollTopElement.style.bottom = (offset + 20) + "px";
                    } else {
                        scrollTopElement.style.bottom = "20px";
                    }
                }
            } else {
                scrollTopElement.classList.remove("visible");
            }
        });
    }

    // ------------------
    // Cercador capçalera
    // ------------------
    const searchButton = document.querySelector(".header-search button");
    const searchInput = document.querySelector(
        '.header-search input[type="search"]'
    );

    if (searchButton && searchInput) {
        searchButton.addEventListener("click", function () {
            searchInput.focus();
        });
    }

    // ---------------
    // Cerca / Idiomes
    // ---------------

    const searchExpandButton = document.querySelector(
        ".header-search .js-expandmore-button"
    );
    const searchExpandContent = document.querySelector(
        ".header-search .js-to_expand"
    );
    const langExpandButton = document.querySelector(
        ".lang .js-expandmore-button"
    );
    const langExpandContent = document.querySelector(".lang .js-to_expand");

    if (
        searchExpandButton &&
        searchExpandContent &&
        langExpandButton &&
        langExpandContent
    ) {
        searchExpandButton.addEventListener("click", function () {
            const isMenuOpen = menu.getAttribute("hidden") !== "true";
            if (isMenuOpen) {
                menu.setAttribute("hidden", "true");
                toggleMenu.setAttribute("aria-expanded", "false");
                hamburger.classList.remove("is-active");
            }
            const isOpen =
                searchExpandContent.getAttribute("data-hidden") !== "true";
            if (isOpen) {
                langExpandContent.setAttribute("data-hidden", "true");
                langExpandButton.setAttribute("aria-expanded", "false");
            }
        });

        langExpandButton.addEventListener("click", function () {
            const isMenuOpen = menu.getAttribute("hidden") !== "true";
            if (isMenuOpen) {
                menu.setAttribute("hidden", "true");
                toggleMenu.setAttribute("aria-expanded", "false");
                hamburger.classList.remove("is-active");
            }
            const isOpen =
                langExpandContent.getAttribute("data-hidden") !== "true";
            if (isOpen) {
                searchExpandContent.setAttribute("data-hidden", "true");
                searchExpandButton.setAttribute("aria-expanded", "false");
            }
        });
    }

    // ----------------
    // Hamburger button
    // ----------------

    var button = document.createElement("button");
    button.className = "hamburger hamburger--spring";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "menu");
    button.innerHTML =
        '<span class="hamburger-box"><span class="hamburger-inner"></span></span><span class="is-sr-only">Menú</span>';

    var menu = document.getElementById("menu");

    menu.parentNode.insertBefore(button, menu);

    menu.setAttribute("hidden", "true");

    var toggleMenu = document.querySelector(".navigation button");

    if (toggleMenu) {
        toggleMenu.addEventListener("click", function () {
            var open = JSON.parse(toggleMenu.getAttribute("aria-expanded"));
            toggleMenu.setAttribute("aria-expanded", !open);
            menu.hidden = !menu.hidden;
        });
    }

    // Select the hamburger element
    var hamburger = document.querySelector(".hamburger");

    // Add a click event listener to the hamburger element
    hamburger.addEventListener("click", function () {
        // Toggle the 'is-active' class on the hamburger element
        this.classList.toggle("is-active");
        // Toggle the 'js-menu-open' class on the body element
        // document.body.classList.toggle("js-menu-open");

        // Close the lang menu if it is open
        if (langExpandContent.getAttribute("data-hidden") !== "true") {
            langExpandContent.setAttribute("data-hidden", "true");
            langExpandButton.setAttribute("aria-expanded", "false");
        }

        // Close the search form if it is open
        if (searchExpandContent.getAttribute("data-hidden") !== "true") {
            searchExpandContent.setAttribute("data-hidden", "true");
            searchExpandButton.setAttribute("aria-expanded", "false");
        }
    });

    // -------------------------------
    // Menú principal amb desplegables (https://www.w3.org/WAI/tutorials/menus/flyout/#use-button-as-toggle)
    // -------------------------------

    function hasClass(el, className) {
        return el.classList
            ? el.classList.contains(className)
            : new RegExp("(^| )" + className + "( |$)", "gi").test(
                  el.className
              );
    }

    var menuItems1 = document.querySelectorAll("li.has-submenu");
    var timer1, timer2;

    var parseHTML = function (str) {
        var tmp = document.implementation.createHTMLDocument();
        tmp.body.innerHTML = str;
        return tmp.body.children;
    };

    Array.prototype.forEach.call(menuItems1, function (el, i) {
        var activatingA = el.querySelector("a");
        var btn =
            '<button type="button"><span class="is-sr-only">Mostra el submenú de “' +
            activatingA.text +
            "”</span></button>";
        activatingA.insertAdjacentHTML("afterend", btn);

        // Handle hover event for non-touch devices
        el.addEventListener("mouseover", function (event) {
            this.classList.add("open");
            this.querySelector("a").setAttribute("aria-expanded", "true");
            this.querySelector("button").setAttribute("aria-expanded", "true");
            clearTimeout(timer1);
        });

        el.addEventListener("mouseout", function (event) {
            timer1 = setTimeout(function () {
                var openMenu = document.querySelector(".has-submenu.open");
                if (openMenu) {
                    openMenu
                        .querySelector("a")
                        .setAttribute("aria-expanded", "false");
                    openMenu
                        .querySelector("button")
                        .setAttribute("aria-expanded", "false");
                    openMenu.classList.remove("open");
                }
            }, 5);
        });

        // Handle click and touchstart events for touch devices
        el.querySelector("button").addEventListener("click", function (event) {
            event.preventDefault();
            toggleSubmenu(el);
        });

        el.querySelector("button").addEventListener(
            "touchstart",
            function (event) {
                event.preventDefault();
                toggleSubmenu(el);
            }
        );

        var links = el.querySelectorAll("a");
        Array.prototype.forEach.call(links, function (link, i) {
            link.addEventListener("focus", function () {
                if (timer2) {
                    clearTimeout(timer2);
                    timer2 = null;
                }
            });
            link.addEventListener("blur", function (event) {
                timer2 = setTimeout(function () {
                    var openNav = document.querySelector(".has-submenu.open");
                    if (openNav) {
                        openNav.className = "has-submenu";
                        openNav
                            .querySelector("a")
                            .setAttribute("aria-expanded", "false");
                        openNav
                            .querySelector("button")
                            .setAttribute("aria-expanded", "false");
                    }
                }, 10);
            });
        });
    });

    function toggleSubmenu(el) {
        var isOpen = hasClass(el, "open");

        // Close any other open submenus
        var allMenus = document.querySelectorAll("li.has-submenu");
        Array.prototype.forEach.call(allMenus, function (item) {
            item.classList.remove("open");
            item.querySelector("a").setAttribute("aria-expanded", "false");
            item.querySelector("button").setAttribute("aria-expanded", "false");
        });

        // Open the clicked/touched submenu if it was not already open
        if (!isOpen) {
            el.classList.add("open");
            el.querySelector("a").setAttribute("aria-expanded", "true");
            el.querySelector("button").setAttribute("aria-expanded", "true");
        }
    }

    var menuItems = document.querySelectorAll("li.has-submenu");
    Array.prototype.forEach.call(menuItems, function (el, i) {});

    // --------
    // timeline
    // --------
    var elements = document.querySelectorAll(".timeline");
    elements.forEach(function (element) {
        timelify(element, {
            animLeft: "fadeInLeft",
            animRight: "fadeInRight",
            animCenter: "fadeInUp",
            animSpeed: 600,
            offset: 150,
        });
    });
    // -----------------------------
    // Estils per input[type="date"]
    // -----------------------------
    const dateInput = document.querySelector('.search-form input[type="date"]');
    if (dateInput) {
        dateInput.addEventListener("input", function () {
            if (this.value) {
                this.classList.add("filled");
            } else {
                this.classList.remove("filled");
            }
        });
    }

    onListener(document, "click", "[data-copy-url]", function (event) {
        // Obtenim la URL del data attribute 'data-copy-url'
        const element = event.target;
        const urlToCopy = element.getAttribute("data-copy-url");

        // Creem un element de tipus input per poder copiar la URL
        const tempInput = document.createElement("input");
        tempInput.value = urlToCopy;
        document.body.appendChild(tempInput);

        // Seleccionem el text dins l'input i el copiem al portapapers
        tempInput.select();
        document.execCommand("copy");

        // Eliminen l'element temporal
        document.body.removeChild(tempInput);

        // Trobar el contenedor del missatge de confirmació
        const messageContainer = element.nextElementSibling;

        // Mostrar un missatge de confirmació sota el botó
        if (
            messageContainer &&
            messageContainer.classList.contains("copy-message")
        ) {
            messageContainer.textContent = tstring.share_copy_ok;
            messageContainer.style.color = "green"; // Opcional: estilitzar el missatge

            // Opcional: amaga el missatge després de 3 segons
            setTimeout(function () {
                messageContainer.textContent = "";
            }, 3000);
        }
    });
});

// ----------------
// Date-slider-setup
// ----------------

async function dateSliderSetup(form_dates_range) {
    api.getRangeDates().then(function(results) {
        const [MIN_DATE, MAX_DATE] = results;

        const leftSlider = document.getElementById("date-slider-left");
        const rightSlider = document.getElementById("date-slider-right");
        const sliderRange = document.getElementById("date-slider-range");
        const minLabel = document.getElementById("date-slider-min");
        const maxLabel = document.getElementById("date-slider-max");

        leftSlider.min = MIN_DATE;
        leftSlider.max = MAX_DATE;
        leftSlider.value = MIN_DATE;

        rightSlider.min = MIN_DATE;
        rightSlider.max = MAX_DATE;
        rightSlider.value = MAX_DATE;

        minLabel.textContent = MIN_DATE;
        maxLabel.textContent = MAX_DATE;

        function clamp(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }

        function updateDateSlider(e) {
            let minVal = parseInt(leftSlider.value);
            let maxVal = parseInt(rightSlider.value);

            if (e && e.target === leftSlider && minVal > maxVal) {
                leftSlider.value = maxVal;
                minVal = maxVal;
            }
            if (e && e.target === rightSlider && maxVal < minVal) {
                rightSlider.value = minVal;
                maxVal = minVal;
            }

            // Update the range fill
            const rangeWidth = leftSlider.max - leftSlider.min;
            const left = ((minVal - leftSlider.min) / rangeWidth) * 100;
            const right = ((maxVal - leftSlider.min) / rangeWidth) * 100;
            sliderRange.style.left = left + "%";
            sliderRange.style.width = right - left + "%";

            // Update displayed values
            minLabel.value = minVal;
            maxLabel.value = maxVal;

            form_dates_range.min = minVal;
            form_dates_range.max = maxVal;
        }

        leftSlider.addEventListener("input", updateDateSlider);
        rightSlider.addEventListener("input", updateDateSlider);

        // Add listeners for label inputs
        function handleMinLabelInput() {
            let val = clamp(parseInt(minLabel.value) || MIN_DATE, MIN_DATE, MAX_DATE);
            let maxVal = parseInt(rightSlider.value);
            if (val > maxVal) val = maxVal;
            leftSlider.value = val;
            updateDateSlider();
        }

        function handleMaxLabelInput() {
            let val = clamp(parseInt(maxLabel.value) || MAX_DATE, MIN_DATE, MAX_DATE);
            let minVal = parseInt(leftSlider.value);
            if (val < minVal) val = minVal;
            rightSlider.value = val;
            updateDateSlider();
        }

        minLabel.addEventListener("change", handleMinLabelInput);
            minLabel.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                handleMinLabelInput();
                minLabel.blur(); // Optionally remove focus
            }
        });

        maxLabel.addEventListener("change", handleMaxLabelInput);
            maxLabel.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                handleMaxLabelInput();
                maxLabel.blur(); // Optionally remove focus
            }
        });

        // Initialize slider
        updateDateSlider();
    })
}

// -----------
// Swiper home
// -----------
function swiperHome() {
    const swiperHome = new Swiper(".swiper--home", {
        cssMode: true,
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
        pagination: {
            el: ".swiper-pagination",
        },
        mousewheel: true,
        keyboard: true,
    });
};

function swiperPublicaciones() {
    // ---------------------------------
    // Swiper Ultimas publicaciones
    // ---------------------------------
    var swiperPublicacions = new Swiper(".swiper--publicacions", {
        // spaceBetween: 10,
        slideActiveClass: 'active',
        navigation: {
            nextEl: ".swiper--publicacions__btns .swiper-button-next",
            prevEl: ".swiper--publicacions__btns .swiper-button-prev",
        },
        slidesPerView: 1,
        spaceBetween: 24,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: {
            600: {
                slidesPerView: 2,
            },
            850: {
                slidesPerView: 3,
            },
            1100: {
                slidesPerView: 4,
            },
            1400: {
                slidesPerView: 5,
            },
            1700: {
                slidesPerView: 6,
            },
        },
    });
}

function swiperPublications(str) {
    new Swiper(`.swiper--publications-${str}`, {
        slideActiveClass: 'active',
        navigation: {
            nextEl: `.swiper--publications-${str}__btns .swiper-button-next`,
            prevEl: `.swiper--publications-${str}__btns .swiper-button-prev`,
        },
        slidesPerView: 1,
        spaceBetween: 24,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: {
            600:  { slidesPerView: 2 },
            850:  { slidesPerView: 3 },
            1100: { slidesPerView: 4 },
            1400: { slidesPerView: 5 },
            1700: { slidesPerView: 6 },
        },
    });
}

function swiperActividades() {
    // ---------------------------------
    // Swiper Proximas Actividades
    // ---------------------------------
    var swiperActivitats = new Swiper(".swiper--activitats", {
        // spaceBetween: 10,
        slideActiveClass: 'active',
        navigation: {
            nextEl: ".swiper--activitats__btns .swiper-button-next",
            prevEl: ".swiper--activitats__btns .swiper-button-prev",
        },
        slidesPerView: 1,
        spaceBetween: 24,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: {
            600: {
                slidesPerView: 2,
            },
            850: {
                slidesPerView: 3,
            },
            1100: {
                slidesPerView: 4,
            },
            1400: {
                slidesPerView: 5,
            },
            1700: {
                slidesPerView: 6,
            },
        },
    });
}

function swiperActividadesActuales() {
    // ----------------------------
    // Swiper Exposiciones Actuales
    // ----------------------------
    var swiperActividadesActuales = new Swiper(".swiper--actividades-actuales", {
        // spaceBetween: 10,
        slideActiveClass: 'active',
        navigation: {
            nextEl: ".swiper--actividades-actuales__btns .swiper-button-next",
            prevEl: ".swiper--actividades-actuales__btns .swiper-button-prev",
        },
        slidesPerView: 1,
        spaceBetween: 24,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: {
            600: {
                slidesPerView: 2,
            },
            850: {
                slidesPerView: 3,
            },
            1100: {
                slidesPerView: 4,
            },
            1400: {
                slidesPerView: 5,
            },
            1700: {
                slidesPerView: 6,
            },
        },
    });
}

function swiperExposicionesActuales() {
    // ----------------------------
    // Swiper Exposiciones Actuales
    // ----------------------------
    var swiperExposicionesActuales = new Swiper(".swiper--exposiciones-actuales", {
        // spaceBetween: 10,
        slideActiveClass: 'active',
        navigation: {
            nextEl: ".swiper--exposiciones-actuales__btns .swiper-button-next",
            prevEl: ".swiper--exposiciones-actuales__btns .swiper-button-prev",
        },
        slidesPerView: 1,
        spaceBetween: 24,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: {
            600: {
                slidesPerView: 2,
            },
            850: {
                slidesPerView: 3,
            },
            1100: {
                slidesPerView: 4,
            },
            1400: {
                slidesPerView: 5,
            },
            1700: {
                slidesPerView: 6,
            },
        },
    });
}

function swiperExposicionesDestacadas() {
    // ---------------------------------
    // Swiper Exposiciones destacadas
    // ---------------------------------
    var swiperExposicionesDestacadas = new Swiper(".swiper--exposiciones-destacadas", {
        // spaceBetween: 10,
        slideActiveClass: 'active',
        navigation: {
            nextEl: ".swiper--exposiciones-destacadas__btns .swiper-button-next",
            prevEl: ".swiper--exposiciones-destacadas__btns .swiper-button-prev",
        },
        slidesPerView: 1,
        spaceBetween: 24,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: {
            600: {
                slidesPerView: 2,
            },
            850: {
                slidesPerView: 3,
            },
            1100: {
                slidesPerView: 4,
            },
            1400: {
                slidesPerView: 5,
            },
            1700: {
                slidesPerView: 6,
            },
        },
    });
}

function swiperActividadesAnual(year) {
    // ---------------------------------
    // Swiper Exposiciones por año
    // ---------------------------------
    var swiperExposicionesDestacadas = new Swiper(`.swiper--activitats-${year}`, {
        // spaceBetween: 10,
        slideActiveClass: 'active',
        navigation: {
            prevEl: `.swiper--activitats-${year}__btns .swiper-button-prev`,
            nextEl: `.swiper--activitats-${year}__btns .swiper-button-next`,
        },
        slidesPerView: 1,
        spaceBetween: 33,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: {
            600: {
                slidesPerView: 2,
            },
            850: {
                slidesPerView: 3,
            },
            1100: {
                slidesPerView: 4,
            },
            1400: {
                slidesPerView: 5,
            },
            1700: {
                slidesPerView: 6,
            },
        },
    });
}

function swiperExposAnual(year) {
    // ---------------------------------
    // Swiper Exposiciones por año
    // ---------------------------------
    var swiperExposicionesDestacadas = new Swiper(`.swiper--expos-${year}`, {
        // spaceBetween: 10,
        slideActiveClass: 'active',
        navigation: {
            prevEl: `.swiper--expos-${year}__btns .swiper-button-prev`,
            nextEl: `.swiper--expos-${year}__btns .swiper-button-next`,
        },
        slidesPerView: 1,
        spaceBetween: 33,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: {
            700: {
                slidesPerView: 2,
            },
            1000: {
                slidesPerView: 3,
            },
        },
    });
}

function massonryEnable() {
    // -------
    // Masonry
    // -------
    var grid = document.querySelector(".masonry-grid");

    var msnry = new Masonry(grid, {
        itemSelector: ".masonry-grid-item",
        columnWidth: ".masonry-grid-sizer",
        percentPosition: true,
        gutter: 10,
    });

    imagesLoaded(grid).on("progress", function () {
        msnry.layout();
    });
}

function viewInit() {
    // enable A11y Dialogs
    enableDialogs(document.getElementById("main"));

    document.querySelectorAll('.images-group').forEach(function(gallery){

        // thumbs
        const thumbsEl = gallery.querySelector('.swiper--thumbs');

        const swiperThumbs = new Swiper(thumbsEl, {
            slidesPerView: 4,
            spaceBetween: 6,
            freeMode: true,
            watchSlidesProgress: true,
            breakpoints: {
                600: {
                    spaceBetween: 10,
                    slidesPerView: 5,
                },
                768: {
                    slidesPerView: 4,
                },
                1400: {
                    slidesPerView: 5,
                },
                1500: {
                    spaceBetween: 15,
                },
            },
        });

        // slider principal
        const mainEl = gallery.querySelector('.swiper--fitxa');

        const swiperMain = new Swiper(mainEl, {
            slideActiveClass: "active",

            navigation: {
                nextEl: gallery.querySelector('.swiper-button-next'),
                prevEl: gallery.querySelector('.swiper-button-prev'),
            },

            thumbs: {
                swiper: swiperThumbs,
            }
        });

    });

    // ---------
    // Accordion (https://github.com/10up/component-library/tree/develop/packages/accordion)
    // ---------
    let accordionInstance = new TenUp.Accordion('.accordion', {open: true});
    // let accordionInstance = new TenUp.accordion(".accordion", {
    //     // onCreate: function() {
    //     //   console.log( 'onCreate callback' );
    //     // },
    //     // onOpen: function( { link, content, heading } ) {
    //     //   console.log( 'onOpen callback' );
    //     // },
    //     // onClose: function( { link, content, heading } ) {
    //     //   console.log( 'onClose callback' );
    //     // },
    //     // onToggle: function( { link, content, heading } ) {
    //     //   console.log( 'onToggle callback' );
    //     // }
    // });

    // ----
    // Tabs (https://github.com/10up/component-library/tree/develop/packages/tabs)
    // ----
    let myTabs = new TenUp.tabs(".tabs", {
        // onCreate: function() {
        //   console.log( 'onCreate callback' );
        // },
        // onTabChange: function() {
        //   console.log( 'onTabChange callback' );
        // }
    });
    let myTabs2 = new TenUp.tabs('.tabs-2', {
        // onCreate: function() {
        //   console.log( 'onCreate callback' );
        // },
        // onTabChange: function() {
        //   console.log( 'onTabChange callback' );
        // }
    });

    // ----------------
    // Div com a button (quan no podem posar un element figure dins un button (ja que no valida) posem el div com si fos un button)
    // ----------------
    const divButtons = document.querySelectorAll(".button-like");

    divButtons.forEach((divButton) => {
        divButton.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                divButton.click();
            }
        });
    });

    /*
    images-group
    image-action-zoom
    image-action-download
    image-action-fullscreen
    */
    const images = document.getElementsByClassName("images-group");
    if (images.length > 0) {
        images.forEach(function (group) {
            const zoomBase = group.querySelectorAll(".image-zoom");
            if (zoomBase) {
                zoomBase.forEach(function (elem) {
                    elem.addEventListener("click", function (event) {
                        event.preventDefault();
                        const activeImage = this;
                        const urlImg = activeImage.dataset.original;
                        const caption = activeImage.dataset.caption || null;
                        common.get_best_image_url(urlImg).then(function (result) {
                            hiresViewer(result.url, caption);
                        });
                    });
                });
            }

            const zoom = group.querySelector(".image-action-zoom");
            if (zoom) {
                zoom.addEventListener("click", function (event) {
                    event.preventDefault();
                    const activeImage = group.querySelector(
                        "img.active, div.active img"
                    );
                    const urlImg = activeImage.dataset.original;
                    const caption = activeImage.dataset.caption || null;
                    common.get_best_image_url(urlImg).then(function (result) {
                        hiresViewer(result.url, caption);
                    });
                });
            }
            const download = group.querySelector(".image-action-download");
            if (download) {
                download.addEventListener("click", function (event) {
                    event.preventDefault();
                    const activeImage = group.querySelector(
                        "img.active, div.active img"
                    );
                    const urlImg = activeImage.dataset.original;
                    const caption = activeImage.dataset.caption || null;
                    showDownloadModal(urlImg, caption);
                });
            }
            const fullscreen = group.querySelector(".image-action-fullscreen");
            if (fullscreen) {
                fullscreen.addEventListener("click", function (event) {
                    event.preventDefault();
                    document.body.classList.toggle("fullscreen");
                    window.scrollTo({
                        top: 0,
                    });
                    const img = this.querySelector("img");

                    // Canvia icona del botó
                    if (document.body.classList.contains("fullscreen")) {
                        img.src = "/assets/img/ico-tancar.svg";
                        img.alt = tstring.close;
                        img.width = 20;
                        img.height = 20;
                    } else {
                        img.src = "/assets/img/ico-pantalla-completa.svg";
                        img.alt = tstring.item_image_fullscreen;
                        img.width = 30;
                        img.height = 30;
                    }

                    // Quan és versió amb dues imatges, oculta una de les imatges a l'ampliar
                    if (group.classList.contains("fullscreen__content--2")) {
                        const columns = document.querySelectorAll(
                            ".fullscreen__content--2"
                        );
                        if (document.body.classList.contains("fullscreen")) {
                            console.log("full");
                            columns.forEach(function (elem) {
                                console.log(elem);
                                console.log(group.isEqualNode(elem));
                                if (!group.isEqualNode(elem)) {
                                    elem.style.display = "none";
                                }
                            });
                        } else {
                            columns.forEach(function (elem) {
                                elem.style.display = "";
                            });
                        }
                    }
                });
            }
        });
    }
}

/**
 * Mostrar modal de confirmació de descàrrega amb text de llicència
 * @param {string} urlImg
 */
function showDownloadModal(urlImg, fileName) {
    const overlay = common.create_dom_element({
        element_type: 'div',
        class_name: 'download-modal-overlay'
    });
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = common.create_dom_element({
        element_type: 'div',
        class_name: 'download-modal'
    });

    const content = common.create_dom_element({
        element_type: 'div',
        id: 'download_license_text',
        class_name: 'download-modal__content',
        inner_html: '<p>Loading...</p>'
    });

    const footer = common.create_dom_element({
        element_type: 'div',
        class_name: 'download-modal__footer'
    });

    const btnCancel = common.create_dom_element({
        element_type: 'button',
        class_name: 'button button--alt download-modal__btn-cancel',
        text_content: tstring.cancel,
        type: 'button'
    });

    const btnDownload = common.create_dom_element({
        element_type: 'button',
        class_name: 'button download-modal__btn-download',
        text_content: tstring.download,
        type: 'button'
    });

    modal.appendChild(content);
    footer.appendChild(btnCancel);
    footer.appendChild(btnDownload);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);

    function closeModal() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    btnCancel.addEventListener('click', closeModal);
    btnDownload.addEventListener('click', function () {
        common.download_item(urlImg, fileName);
        closeModal();
    });
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
    });

    try {
        api.getDownloadLicenseText().then(function (rows) {
            if (rows && rows[0] && rows[0].body) {
                content.innerHTML = rows[0].body;
            }
        }).catch(function () {
            content.innerHTML = tstring.download_terms;
        });
    } catch (err) {
        content.innerHTML = tstring.download_terms;
    }
}

function hiresViewer(hires_url, caption) {
    const new_image = new Image();
    new_image.src = hires_url;

    const viewer = new Viewer(new_image, {
        title() {
            return caption ? caption : "";
        },
        // inline: true,
        viewed() {
            // viewer.zoomTo(1);
        },
        hidden: function () {
            viewer.destroy();
        },
        navbar: false,
        toolbar: {
            zoomIn: {
                show: 2,
                size: "large",
            },
            zoomOut: {
                show: 2,
                size: "large",
            },
            oneToOne: {
                show: 2,
                size: "large",
            },
            reset: {
                show: 2,
                size: "large",
            },
            prev: {
                show: 0,
                size: "large",
            },
            play: {
                show: 0,
                size: "large",
            },
            next: {
                show: 0,
                size: "large",
            },
            rotateLeft: {
                show: 2,
                size: "large",
            },
            rotateRight: {
                show: 2,
                size: "large",
            },
            flipHorizontal: {
                show: 2,
                size: "large",
            },
            flipVertical: {
                show: 2,
                size: "large",
            },
        },
    });
    // new_image.click();
    viewer.show();

    return viewer;
}

// ----------------------
// Taula amb desplegables
// ----------------------
function toggle(btnID, eID) {
    var theRow = document.getElementById(eID);
    var theButton = document.getElementById(btnID);
    if (theRow.style.display == "none") {
        theRow.style.display = "table-row";
        theButton.setAttribute("aria-expanded", "true");
    } else {
        theRow.style.display = "none";
        theButton.setAttribute("aria-expanded", "false");
    }
}

function enableDialogs(elem) {
    var dialogs = $(elem).find('.dialog-container');
    dialogs.each(function(){
        var dialog = new A11yDialog(this);
        dialog.on("show", function (event) {
            const container = event.target;

            const target = event.detail.target;
            const opener = target.closest("[data-a11y-dialog-show]");

            console.log(container, target, opener);
        });
    });
}

// -----------
// A11y Dialog (https://github.com/KittyGiraudel/a11y-dialog)
// -----------
var dialogEl = document.getElementById("dialog-01");

if (dialogEl) {
    var dialog = new A11yDialog(dialogEl);

    dialog.on("show", function (event) {
        const container = event.target;

        // And if the event is the result of a UI interaction (i.e. was not triggered
        // programmatically via `.show(..)`), the `detail` prop contains the original
        // event
        const target = event.detail.target;
        const opener = target.closest("[data-a11y-dialog-show]");

        console.log(container, target, opener);
    });

    // To manually control the dialog:
    // dialog.show()
    // dialog.hide()
    // dialog.destroy()
}

// ------------------------------------------------------------------------------
// Comprova si la primera opció del select està seleccionada (per ajustar colors)
// ------------------------------------------------------------------------------
// Function to check the selected option for a given select element
function checkSelectOption(selectElement) {
    if (selectElement.selectedIndex !== 0) {
        selectElement.classList.add("not-first-selected");
    } else {
        selectElement.classList.remove("not-first-selected");
    }
}

// Function to initialize the checks on page load and set event listeners
function initializeSelectChecks() {
    // Get all select elements on the page
    const selectElements = document.querySelectorAll("select");

    // Loop through each select element and check its initial state
    selectElements.forEach((selectElement) => {
        checkSelectOption(selectElement);

        // Add an event listener to check the option on change
        selectElement.addEventListener("change", () => {
            checkSelectOption(selectElement);
        });
    });
}

// Run the initialize function when the page loads
window.onload = initializeSelectChecks;
