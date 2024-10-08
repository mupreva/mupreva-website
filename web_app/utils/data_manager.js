/*global get_label, page_globals, SHOW_DEBUG */
/*eslint no-undef: "error"*/



/**
* DATA_LOADER
*/
export const data_manager = function () {

}//end data_manager



/**
* REQUEST
* Make a fetch request to server api
* @param object options
* @return promise api_response
*/
data_manager.prototype.request = async function (options) {

    // console.log("++++ request options:",options);

    const url = options.url || page_globals.JSON_TRIGGER_URL
    const method = options.method || 'POST' // *GET, POST, PUT, DELETE, etc.
    const mode = options.mode || 'cors' // no-cors, cors, *same-origin
    const cache = options.cache || 'no-cache' // *default, no-cache, reload, force-cache, only-if-cached
    const credentials = options.credentials || 'same-origin' // include, *same-origin, omit
    const headers = options.headers || { 'Content-Type': 'application/json' }// 'Content-Type': 'application/x-www-form-urlencoded'
    const redirect = options.redirect || 'follow' // manual, *follow, error
    const referrer = options.referrer || 'no-referrer' // no-referrer, *client
    const body = options.body // body data type must match "Content-Type" header

    // code defaults
    if (!body.code) {
        body.code = page_globals.API_WEB_USER_CODE
    }
    // lang defaults
    if (!body.lang) {
        body.lang = page_globals.WEB_CURRENT_LANG_CODE
    }

    const handle_errors = function (response) {
        if (!response.ok) {
            console.warn("-> handle_errors response:", response);
            throw Error(response.statusText);
        }
        return response;
    }

    const api_response = fetch(
        url,
        {
            method: method,
            mode: mode,
            cache: cache,
            credentials: credentials,
            headers: headers,
            redirect: redirect,
            referrer: referrer,
            body: JSON.stringify(body)
        })
        .then(handle_errors)
        .then(response => {
            // console.log("-> json response 1 ok:",response.body);
            const json_parsed = response.json().then((result) => {
                //console.log("-> json result 2:",result);
                return result
            })
            return json_parsed
        })// parses JSON response into native JavaScript objects
        .catch(error => {
            console.error("!!!!! [page data_manager.request] ERROR:", error)
            return {
                result: false,
                msg: error.message,
                error: error
            }
        });

    return api_response
}//end request



/**
* DOWNLOAD_URL
* @param string url
* @param string filename
* Download url blob data and create a temporal auto-fired link
*/
export function download_url(url, filename) {

    fetch(url)
        .then(function (t) {
            return t.blob().then((b) => {
                var a = document.createElement("a");
                a.href = URL.createObjectURL(b);
                a.setAttribute("download", filename);
                a.click();
                a.remove();
            });
        });
}//end download_url
