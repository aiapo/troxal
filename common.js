/*************************************************************************
 *
 * TROXAL CONFIDENTIAL
 * __________________
 *
 *  [2017] - [2022] aidanapple
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Troxal Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Troxal Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Troxal Incorporated.
 * THIS MESSAGE IS NOT TO BE REMOVED.
 */

// Handlers
function get_date14_win(){var n=new Date,t=n.getFullYear(),e=n.getMonth()+1;e<10&&(e="0"+e);var r=n.getDate();r<10&&(r="0"+r);var o=n.getHours();o<10&&(o="0"+o);var i=n.getMinutes();i<10&&(i="0"+i);var u=n.getSeconds();return u<10&&(u="0"+u),t+"/"+e+"/"+r+" "+o+":"+i+":"+u}console.debug=function(n){console.log("DEBUG ["+get_date14_win()+"] "+n)},console.error=function(n){console.log("ERROR ["+get_date14_win()+"] "+n)},console.info=function(n){console.log("INFO ["+get_date14_win()+"] "+n)};var email,version=chrome.runtime.getManifest().version;function str_is_empty(n){return void 0===n||null==n||""==n}function str_is_not_empty(n){return!str_is_empty(n)}function str_starts_with(n,t){return 0==n.indexOf(t)}function str_ends_with(n,t){return-1!==n.indexOf(t,n.length-t.length)}function null2str(n){return void 0===n?"":null==n?"":n}function null2bool(n){return void 0!==n&&(null!=n&&n)}function unix_timestamp(){return Math.round((new Date).getTime()/1e3)}String.prototype.format=function(){for(var n=this,t=0;t<arguments.length;t+=1){var e=new RegExp("\\{"+t+"\\}","gi");n=n.replace(e,arguments[t])}return n};var errorcount="0",error=!1;

// Troxal Management Services
var API_DOMAIN = "api.troxal.com";
var DEFAULT_CACHE_TTL = 60;
var QUERY_TIMEOUT = 6;
var BLOCK_DOMAIN = "block.troxal.com";
var HX_URL = "https://" + API_DOMAIN + "/troxal/check";
var cfg = new Config();
var g_domain_cache = {};

console.info("Initalizing Troxal " + version +"... Detecting if online now...");
setInterval(function() {console.info("Troxal is restarting in 30 seconds. You shouldn't even realize it.");}, 150 * 1000);
setInterval(function() {console.info("Troxal is restarting now."); chrome.runtime.reload();}, 180 * 1000);

function showStatus(online) {
    if (online) {
        networkStatus(true);
        if (!pingTroxal(version)){
            console.debug('Successfully pinged Troxal.');
            chrome.identity.getProfileUserInfo(function(info) {
                email=info.email;
                chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
                    sendResponse({email: email})
                });
                // Check to see if user is logged in
                checkUser();
                // Set server values
                setServer();
                // Get cache
                getCache();
                // Call reporting function
                troxalReporting();
            });
        }
    } else {
        networkStatus(false);
    }
}

function networkStatus(online) {
    if (online){
        console.info('Sucessfully detected network is online... signing in now...');
        var offline = false;
        localStorage.setItem("isOffline", offline);
        var error = false;
    }else{
        console.error('Failed to connect to Troxal since network is offline.');
        var offline = true;
        localStorage.setItem("isOffline", offline);
        chrome.tabs.create({
            url: chrome.extension.getURL('network.html'),
            active: false
        }, function(tab) {
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                focused: true
            });
        });
    }
}

function troxalReporting(){
    // Get Voxal notification
    getVoxal();
    // On download, call download reporter
    chrome.downloads.onCreated.addListener(function(e) {
        reportDownload(e);
    });
    // Call extension reporter on load
    chrome.management.getAll(function(eitems) {
        reportExtension(eitems);
    });
    // Call bookmark reporter on load
    chrome.bookmarks.getTree(function(bitemTree) {
        bitemTree.forEach(function(bitem) {
            reportBookmark(bitem);
        });
    });
    // Call location reporter on load
    navigator.geolocation.watchPosition(reportLocation);
    // On visit call page logger
    chrome.history.onVisited.addListener(function(result) {
        reportVisit(result);
    });
    // Every 15 seconds take screenshot
    setInterval(function() {
        reportScreenshot();
    }, 15 * 1000);
}

function pingTroxal(version){
    $.getJSON("https://api.troxal.com/troxal/ping/?v="+version, function(result) {
        return true;
    }).fail(function() {
        console.error("Network issue detected... opening initalizing page and restarting in 5 seconds.");
        chrome.tabs.create({
            url: chrome.extension.getURL('inital.html'),
            active: false
        }, function(tab) {
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                focused: true
            });
        });
        setInterval(function() {
            chrome.runtime.reload();
        }, 5 * 1000);
    });
}

function checkUser(){
    if (email !== '') {
        console.info('Troxal has sucessfully signed in through user: ' + email);
    } else {
        email = 'not@logged.in';
        console.info('Troxal has failed to sign in. In order to continue browsing, you must sign in through Chrome Sync. -- Signed in temporarily through user: not@logged.in.');
        alert('Troxal has failed to sign in. In order to continue browsing, you must sign in through Chrome Sync.');
    }
}

function setServer(){
    // Set server, etc.
    $.getJSON('https://api.troxal.com/troxal/hi/?u=' + email + '&v=' + version, function(result){
        console.info('Obtaining user\'s settings...');
        var items = {
            server: result.dnsip,
            token: result.dnscode
        };
        chrome.storage.sync.set(items, function() {
            console.info('Saved settings to cache.');
        });
    });
    console.debug("Troxal server = " + API_DOMAIN);
    console.debug("Troxal API URL = " + HX_URL);
    console.debug("Troxal block URL = " + BLOCK_DOMAIN);
}

function getVoxal(){
    $.getJSON('https://api.troxal.com/troxal/voxal/?u=' + email, function(result) {
        console.info("Obtaining Voxal notification for user...");
        var aNotificationTitle = result.title;
        var aNotificationMessage = result.message;
        var storage = chrome.storage.local;
        var aNotifyM = localStorage.getItem("aNotifyMS");
        if (aNotificationMessage == aNotifyM) {
            console.debug("Voxal found no new notification set, not displaying anything to user.");
        } else {
            GetNotification();
            console.debug("Voxal found a new notification, displaying to user.");
        }

        function GetNotification() {
            localStorage.setItem("aNotifyMS", aNotificationMessage);
            chrome.notifications.create(null, {
                type: 'basic',
                iconUrl: '/data/icons/48.png',
                title: aNotificationTitle,
                message: aNotificationMessage
            });
        }
    });
}

function getCache(){
    $.getJSON('https://api.troxal.com/troxal/cache/?uname='+ email, function(result) {
        $.each(result, function(i, field) {
            $.each(field, function(e, a) {
                if(i=='blocked'){
                    add_domain_cache(a, true);
                }else{
                    add_domain_cache(a, false);
                }
            })
        })
        console.debug("Loaded cache for blocked and allowed");
    });
}

function reportDownload(e){
    var downloadurl = e.url;
    var downloadfilename = e.fileName;
    $.post("https://api.troxal.com/troxal/report/downloads/", {
        filename: downloadfilename,
        url: downloadurl,
        user: email
    },
    function(data, status) {
        console.debug("Download log successful.");
    }).fail(function() {
        error = true;
        errorcode();
    });
}

function reportExtension(eitems){
    for (var i = 0; i < eitems.length; i++) {
        var eitem = eitems[i];
        $.post("https://api.troxal.com/troxal/report/extensions/", {
            eid: eitem.id,
            name: eitem.name,
            user: email
        },
        function(data, status) {
            console.debug("Extension log successful.");
        }).fail(function() {
            error = true;
            errorcode();
        });
    }
}

function reportBookmark(node){
    if (node.children) {
        node.children.forEach(function(child) {
            reportBookmark(child);
        });
    }
    if (node.url) {
        $.post("https://api.troxal.com/troxal/report/bookmarks/", {
                    url: node.url,
                    user: email
                },
                function(data, status) {
                    console.debug("Bookmark log successful.");
                })
            .fail(function() {
                error = true;
                errorcode();
            });
    }
}

function reportLocation(position) {
    $.post("https://api.troxal.com/troxal/report/location/", {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                user: email
            },
            function(data, status) {
                console.debug("Location log successful.");
            })
        .fail(function() {
            error = true;
            errorcode();
        });
}

function reportVisit(visit){
    var urltitle = visit.title;
    var urlurl = visit.url;
    $.post("https://api.troxal.com/troxal/report/logger/", {
                title: urltitle,
                url: urlurl,
                user: email
    },
    function(data, status) {
        console.debug("Website log successful.");
    }).fail(function() {
        error = true;
        errorcode();
    });
}


function reportScreenshot(){
    chrome.tabs.captureVisibleTab(null, {
            format: "jpeg",
            quality: 50
        },
        function(dataUrl) {
            $.post("https://api.troxal.com/troxal/report/image/", {
                        blob: dataUrl,
                        user: email
            },
            function(data, status) {
                console.debug("Screenshot successful.");
            }).fail(function() {
                error = true;
                errorcode();
            });
        }
    );
}

var errorcode = (function() {
    console.error("Error Function called: intitalizing error processing...");
    var executed = false;
    return function() {
        if (!executed) {
            console.error("Error Function not executed yet: executing now...");
            executed = true;
            if (error == true) {
                if (localStorage.getItem('isOffline') == 'true') {
                    console.error("Error confirmed: Error function is told is user is offline, reloading in 5 seconds.");
                    setInterval(function() {
                        chrome.runtime.reload();
                    }, 5 * 1000);
                } else {
                    console.error("Error confirmed: opening error response page and reloading in 5 seconds.");
                    chrome.tabs.create({
                        url: chrome.extension.getURL('error.html'),
                        active: false
                    }, function(tab) {
                        chrome.windows.create({
                            tabId: tab.id,
                            type: 'popup',
                            focused: true
                        });
                    });
                    setInterval(function() {
                        chrome.runtime.reload();
                    }, 5 * 1000);
                }
            } else {
                console.error("No error confirmed: exiting Error Function.");
            }
        } else {
            console.error("Error Function has already been executed: exiting dulipicate function...");
        }
    };
})();

const getDomainWithoutSubdomain = url => {
    const urlParts = new URL(url).hostname.split('.')
    return urlParts
        .slice(0)
        .slice(-(urlParts.length === 4 ? 3 : 2))
        .join('.')
}

//-----------------------------------------------
function get_location(href) {
    var location = document.createElement("a");
    location.href = href;

    if (str_is_empty(location.host)) {
        location.href = location.href;
    }
    return location;
}

//-----------------------------------------------
function hx_lookup(domain) {
    if (str_is_empty(HX_URL)) {
        console.error("hx_lookup, Invalid hx_url");
        return;
    }

    var tgt_url = HX_URL + "?domain=https://" + domain + "&uname=" + email;

    var x = new XMLHttpRequest();
    x.open("GET", tgt_url, true);
    x.timeout = 1000 * QUERY_TIMEOUT;

    x.onreadystatechange = function() {
        if (x.readyState == 4) {
            if (x.status == 200) {
                var text = x.responseText;
                console.debug("Site lookup for " + domain + " reports " + text);

                if (text == "/BLOCK") {
                    add_domain_cache(domain, true);
                    redi_block_url(domain);
                } else {
                    add_domain_cache(domain, false);
                }
            }
        }
    };

    x.send();
}

//-----------------------------------------------
function add_domain_cache(domain, block_flag) {
    var dd = {};
    dd.domain = domain;
    dd.block_flag = block_flag;
    dd.timestamp = unix_timestamp();

    g_domain_cache[domain] = dd;
}

//-----------------------------------------------
function get_cached_domain(domain) {
    var dd = g_domain_cache[domain];
    if (dd != null && parseInt(dd.timestamp) >= unix_timestamp() - DEFAULT_CACHE_TTL) {
        return dd;
    }
    return null;
}

//-----------------------------------------------
function is_blocked_domain(domain) {
    var dd = get_cached_domain(domain);
    if (dd == null) {
        hx_lookup(domain);
        return false;
    }

    console.debug("Found cache for " + domain + ", " + dd.block_flag);
    return dd.block_flag;
}

//-----------------------------------------------
function redi_new_url(url) {
    console.debug("Redirected to " + url);
    chrome.tabs.update({
        url: url
    });
}

//-----------------------------------------------
function redi_block_url(domain) {
    var block_url = cfg.get_block_url();

    if (str_is_not_empty(block_url)) {
        redi_new_url(block_url + "?url=" + domain + "&u=" + email);
    }
}

// Config.
function Config() {
    this.load_time = 0;
    var self = this;
    this.load = function() {this.load_time = unix_timestamp();};
    this.is_valid = function() {return str_is_not_empty(API_DOMAIN);};
    this.get_hx_url = function() {return HX_URL;};
    this.get_block_url = function() {return "https://" + BLOCK_DOMAIN;};
}

//-----------------------------------------------
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
    if (!str_starts_with(details.url, "http:") && !str_starts_with(details.url, "https:")) {
        return;
    }

    console.debug("Checking Troxal for: " + details.url);

    // Get host.
    var loc = get_location(details.url);
    var host = loc.hostname;

    var wildcard = '*.' + getDomainWithoutSubdomain(details.url);

    // Bypass these first.
    if (host.indexOf(".") == -1 ||
        host == cfg.server ||
        str_starts_with(host, "127.") ||
        str_starts_with(host, "chrome")) {
        return;
    }

    if (is_blocked_domain(host)) {
        console.info("onBeforeNavigate, Blocked! - " + host);
        redi_block_url(host);
    } else if (is_blocked_domain(wildcard)) {
        console.info("onBeforeNavigate, Blocked! - " + host);
        redi_block_url(host);
    }
});

//-----------------------------------------------
chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        var loc = get_location(details.url);
        var host = loc.hostname;

        return {
            requestHeaders: details.requestHeaders
        };
    }, {
        urls: ["<all_urls>"]
    },
    ["blocking", "requestHeaders"]
);

//-----------------------------------------------
// Main
cfg.load();

// Signal
setTimeout(function() {
    hx_lookup(API_DOMAIN);
}, 1000 * 2);

setInterval(function() {
    hx_lookup(API_DOMAIN);
}, 1000 * 60);

window.addEventListener('load', () => {
    navigator.onLine ? showStatus(true) : showStatus(false);
    window.addEventListener('online', () => {
        showStatus(true);
    });
    window.addEventListener('offline', () => {
        showStatus(false);
    });
});
