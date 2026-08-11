<?php
# config Dédalo API client (web_app)



// used to build absolute calls to elements
define('__WEB_BASE_PATH__', dirname(dirname(dirname(__FILE__))));



// dedalo 4 private conf file
$environment = 'prod'; // pre , prod



// custom development working vars (api client)
define('WEB_ENTITY', 'mupreva');
define('WEB_ENTITY_LABEL', 'Museu de Prehistòria de València');

define(
    'WEB_DB',
    ($environment ==='prod')
    ? 'web_tangible_heritage'
    : 'web_tangible_heritage'
);

// site config

// __web_base_url__ . absolute url base to target web. Used to build absolute calls to elements
define(
    '__WEB_BASE_URL__',
    ($environment === 'prod')
        ? 'https://map.museum'
        : 'https://web2024.mupreva.antaviana.net'
);

// media base url
define(
    '__WEB_MEDIA_BASE_URL__',
    ($environment === 'prod')
        ? 'https://map.museum'
        : 'https://web2024.mupreva.antaviana.net'
);

// __WEB_ROOT_WEB__
$base = ''; // (!) name of the website folder like '/web'. If files are in first level leave blank
define('__WEB_ROOT_WEB__', $base);

// web_app_dir
define('WEB_APP_DIR', 'web_app');

// web_dispatch_dir
define('WEB_DISPATCH_DIR', 'web');

// __web_template_web_
define('__WEB_TEMPLATE_PATH__',    __WEB_BASE_PATH__ . '/tpl');
define('__WEB_TEMPLATE_WEB__',    __WEB_ROOT_WEB__  . '/tpl');
define('__WEB_HOME_URL__',    __WEB_ROOT_WEB__);

define(
    '__WEB_MEDIA_ENGINE_URL__',
    ($environment === 'prod')
        ? 'https://dedalo.mupreva.org'
        : 'https://pre-dedalo.mupreva.org'
);

// version
include(__WEB_TEMPLATE_PATH__ . '/version.inc');


// api config

// json_trigger_url data source url
define('JSON_TRIGGER_URL', ($environment === 'prod') //quart
    ? 'https://dedalo.mupreva.org/dedalo6/publication/server_api/v1/json/'
    : 'https://pre-dedalo.mupreva.org/dedalo6-pre/publication/server_api/v1/json/');


// json_web_data collector. PHP version HTTP request manager (via CURL)
include(__WEB_BASE_PATH__ . '/' . WEB_APP_DIR . '/api/class.json_web_data.php');

// api_web_user_code
# Verification user code (must be identical in config of client and server)
//define('API_WEB_USER_CODE', 'lsi8wM5s$4KueñwkoPwgs'); //mupreva
define('API_WEB_USER_CODE', 'lsi8wM5s$4KueñwkoPwgs'); //quart

// common core functions
include(__WEB_BASE_PATH__ . '/' . WEB_APP_DIR . '/common/class.page.php');
include(__WEB_BASE_PATH__ . '/' . WEB_APP_DIR . '/common/class.common.php');
include(__WEB_BASE_PATH__ . '/' . WEB_APP_DIR . '/common/class.lang.php');

// web_current_lang_code. If received lang use it, else use default lg-ell (Greek)
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('web_' . WEB_ENTITY);
    session_start();
}

// lang cascade set
define('WEB_DEFAULT_LANG_CODE', 'lg-vlca');
if (isset($_GET['lang'])) {
    $lang = $_GET['lang'];
    $_SESSION['web']['lang'] = $lang;
} elseif (isset($_SESSION['web']['lang'])) {
    $lang = $_SESSION['web']['lang'];
} else {
    $lang = WEB_DEFAULT_LANG_CODE;
}
if (strpos($lang, 'lg-') === false) {
    $lang = lang2iso3($lang);
}

// web_current_lang_code
define('WEB_CURRENT_LANG_CODE', $lang);

// web_lang_base_path
define('WEB_LANG_BASE_PATH', __WEB_TEMPLATE_PATH__ . '/lang/');



// debug . Show / hide debug messages
$SHOW_DEBUG = true;
if ($SHOW_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}
define('SHOW_DEBUG', $SHOW_DEBUG);



// web config
define('WEB_MENU_TABLE', 'ts_web_mupreva');
define('WEB_MENU_SECTION_TIPO', 'www1');
define('WEB_MENU_PARENT', 'www1_106');
define('WEB_FOOT_MENU', 'www1_217');
define('WEB_FOOT_PARENT', 'www1_196');
define('WEB_FOOT_COLUMNS', 'www1_218');
define('WEB_FOOT_LOGOS', 'www1_227');

/*define('WEB_MENU_FOOTER', [
    'contact',
    'accessibility',
    'legal',
    'cookies',
    'credits'
]);*/



define('WEB_AR_LANGS', json_encode([
    "lg-spa" => ['name' => 'Castellano', 'code' => 'es'],
    "lg-vlca" => ['name' => 'Valencià', 'code' => 'va'],
    //"lg-glg" => "Galego",
    "lg-eng" => ['name' => 'English', 'code' => 'en'],
    "lg-fra" => ['name' => 'French', 'code' => 'fr']
]));


# Web template file json
define('WEB_TEMPLATE_MAP', __WEB_BASE_PATH__ . '/config/template_maps/' . WEB_ENTITY);
define('WEB_TEMPLATE_MAP_DEFAULT_SOURCE', 'db');

# web_path_map . run name map for url's path like redirect 'mon' to 'catalogo'
define('WEB_PATH_MAP', []);



// libraries
define('BUILD_BREADCRUMB', false);



// table to temple
define('TABLE_TO_TEMPLATE', json_encode([]));



// fields map
define('WEB_FIELDS_MAP', json_encode([
    'section_id'            => 'section_id',
    'term_id'                => 'term_id',
    'term'                    => 'term',
    'web_path'                => 'web_path',
    'parent'                => 'parent',
    'parents'                => 'parents',
    'children'                => 'children',
    'menu'                    => 'menu',
    'active'                => 'active',
    'template_name'            => 'template_name',
    'title'                    => 'title', // before standard (compatibility)
    'abstract'                => 'abstract',
    'body'                    => 'body',
    'norder'                => 'norder',
    'image'                    => 'image',
    // others
    'identify_image'        => 'identify_image',
    'other_images_resolved'    => 'other_images_resolved',
    'other_images'    => 'other_images',
    //'audiovisual_resolved'    => 'audiovisual_resolved',
    'pdf_resolved'            => 'pdf_resolved',
    'pdf_title'                => 'pdf_title'
]));



// suffix
define('CSS_SUFFIX', '');
define('JS_SUFFIX', ''); // -min



// IS_PRODUCTION. used like 'mib_web'
$path_suffix = substr($base, -3);
$IS_PRODUCTION = ($path_suffix === 'web') ? true : false;
define('IS_PRODUCTION', $IS_PRODUCTION);
