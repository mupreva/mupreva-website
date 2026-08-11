<?php

// item


// css
page::$css_ar_url[] = __WEB_TEMPLATE_WEB__ . '/assets/lib/leaflet/leaflet.css';
page::$css_ar_url[] = __WEB_TEMPLATE_WEB__ . '/assets/lib/leaflet/markercluster/MarkerCluster.css';


// js
page::$js_ar_url[]    = __WEB_TEMPLATE_WEB__ . '/assets/lib/leaflet/leaflet.js';
page::$js_ar_url[]    = __WEB_TEMPLATE_WEB__ . '/assets/lib/leaflet/markercluster/leaflet.markercluster.js';
page::$js_ar_url[]    = __WEB_TEMPLATE_WEB__ . '/assets/lib/browser-report/browser-report-min.js';
page::$js_ar_url[]    = __WEB_TEMPLATE_WEB__ . '/' . $cwd . '/js/biblio_row_fields' . JS_SUFFIX . '.js';
page::$js_ar_url[]    = __WEB_TEMPLATE_WEB__ . '/' . $cwd . '/js/item_row' . JS_SUFFIX . '.js';


// viewerjs
page::$css_ar_url[] = __WEB_TEMPLATE_WEB__ . '/assets/lib/viewerjs/dist/viewer.css';
page::$js_ar_url[]    = __WEB_TEMPLATE_WEB__ . '/assets/lib/viewerjs/dist/viewer.js';


// area name
$area_name     = $_GET['area_name'];
$ar_parts     = explode('/', $area_name);

// section_id (is inside get var 'area_name' as '/min/36')
$section_id = isset($ar_parts[1])
    ? (int)$ar_parts[1]
    : null;

// table (from url path)
switch ($ar_parts[0]) {
    case 'tec':
        $table = 'ts_technique';
        break;
    case 'tem':
        $table = 'ts_thematic';
        break;
    case 'cro':
        $table = 'ts_chronological';
        break;
    case 'mat':
        $table = 'ts_material';
        break;
    case 'obj':
        $table = 'ts_object';
        break;
    case 'top':
        $table = 'ts_ubication';
        break;
    case 'htop':
        $table = 'ts_htoponymy';
        break;
}

// page basic vars
$title        = $this->get_element_from_template_map('title', $template_map->{$mode});
$abstract    = $this->get_element_from_template_map('abstract', $template_map->{$mode});
$body        = $this->get_element_from_template_map('body', $template_map->{$mode});
$ar_image    = $this->get_element_from_template_map('image', $template_map->{$mode});

$this->closeButton = true;
// page_title fix
$this->page_title = $this->row->term;
//$this->page_description = $this->row->descripcion_relevante;


// visitor_comment
$menu_data = $this->data_combi[1]->result;
