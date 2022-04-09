/*************************************************************************
 *
 * TROXAL CONFIDENTIAL
 * __________________
 *
 *  [2017] - [2022] Troxal, Inc.
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
function get_date14_win(){var n=new Date,t=n.getFullYear(),e=n.getMonth()+1;e<10&&(e="0"+e);var r=n.getDate();r<10&&(r="0"+r);var o=n.getHours();o<10&&(o="0"+o);var i=n.getMinutes();i<10&&(i="0"+i);var u=n.getSeconds();return u<10&&(u="0"+u),t+"/"+e+"/"+r+" "+o+":"+i+":"+u}console.debug=function(n){console.log("DEBUG ["+get_date14_win()+"] "+n)},console.error=function(n){console.log("ERROR ["+get_date14_win()+"] "+n)},console.info=function(n){console.log("INFO ["+get_date14_win()+"] "+n)};var email,version=chrome.runtime.getManifest().version;function str_starts_with(n,t){return 0===n.indexOf(t)}function unix_timestamp(){return Math.round((new Date).getTime()/1e3)}String.prototype.format=function(){for(var n=this,t=0;t<arguments.length;t+=1){var e=new RegExp("\\{"+t+"\\}","gi");n=n.replace(e,arguments[t])}return n};error=!1;

// Troxal Management Services
const API_DOMAIN = "api.troxal.com";
const BLOCK_DOMAIN = "block.troxal.com";
const API_URL = "https://" + API_DOMAIN + "/troxal/";
const QUERY_TIMEOUT = 6;
var domainBlockCache = {};
var error = false;

console.info("Initializing Troxal "+ version +"... Detecting if online now...");

function showStatus(online) {
    if (online) {
        networkStatus(true);
        if (!pingTroxal()){
            troxalMain();
        }
    } else {
        networkStatus(false);
    }
}

function networkStatus(online) {
    if (online){
        console.info('Successfully detected network is online... signing in now...');
        localStorage.setItem("isOffline", false);
    }else{
        console.error('Failed to connect to Troxal since network is offline.');
        localStorage.setItem("isOffline", true);
        chrome.tabs.create({
            url: chrome.extension.getURL('network.html'),
            active: false
        }, function(tab) {
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                width: 550,
                focused: true
            });
        });
    }
}

function troxalMain(){
    chrome.identity.getProfileUserInfo(function(info) {
        email=info.email;
        chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
            sendResponse({email: email})
        });
        // Set server values
        setServer();
        // Get cache
        getCache();
        // Call reporting function
        troxalReporting();
        // Every 2 minutes, call refreshable functions
        setInterval(function() {troxalReportingRefreshable(false);}, 120 * 1000);
    });
}

function troxalReporting(){
    // Call refreshable functions, but as first load.
    troxalReportingRefreshable(true);
    // On download, call download reporter
    chrome.downloads.onCreated.addListener(function(e) {
        reportDownload(e);
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

function troxalReportingRefreshable(first){
    // Don't ping or refresh cache on first load
    if (!first){
        // Ping Troxal again
        pingTroxal();
        // Refresh cache
        getCache();
    }
    // Get Voxal notification
    getVoxal();
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
}

function pingTroxal(){
    $.getJSON(API_URL+"ping/?v="+version, function() {
        console.debug('Successfully pinged Troxal.');
        return true;
    }).fail(function() {
        console.error("Network issue detected... opening initializing page and restarting in 5 seconds.");
        chrome.tabs.create({
            url: chrome.extension.getURL('inital.html'),
            active: false
        }, function(tab) {
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                width: 550,
                focused: true
            });
        });
        setInterval(function() {
            chrome.runtime.reload();
        }, 5 * 1000);
    });
}

function setServer(){
    // Check if user is valid
    if (email !== '') {
        console.info('Troxal has successfully signed in through user: ' + email);
    } else {
        email = 'not@logged.in';
        console.info('Troxal has failed to sign in. In order to continue browsing, you must sign in through Chrome Sync. -- Signed in temporarily through user: not@logged.in.');
        alert('Troxal has failed to sign in. In order to continue browsing, you must sign in through Chrome Sync.');
    }
    // Set server, etc.
    $.getJSON(API_URL+'hi/?u='+email+'&v='+version, function(result){
        console.info('Obtaining user\'s settings...');
        var items = {
            user: result.email
        };
        chrome.storage.sync.set(items, function() {
            console.info('Saved settings to cache.');
        });
    });
    console.debug("Troxal server = " + API_DOMAIN);
    console.debug("Troxal API URL = " + API_URL);
    console.debug("Troxal block URL = " + BLOCK_DOMAIN);
}

function getVoxal(){
    $.getJSON(API_URL+'voxal/?u='+email+'&v='+version, function(result) {
        console.info("Obtaining Voxal notification for user...");
        chrome.storage.sync.get("voxalLocalCache", function (obj) {
            if (result.message === obj.voxalLocalCache) {
                console.debug("Voxal found no new notification set, not displaying anything to user.");
            } else {
                console.debug("Voxal found a new notification, displaying to user.");
                chrome.storage.sync.set({"voxalLocalCache": result.message});
                chrome.notifications.create(null, {
                    type: 'basic',
                    iconUrl: '/data/icons/48.png',
                    title: result.title,
                    message: result.message
                });
            }
        });
    });
}

function getCache(){
    $.getJSON(API_URL+'cache/?uname='+email+'&v='+version, function(result) {
        $.each(result, function(i, field) {
            $.each(field, function(e, a) {
                if(i==='blocked'){
                    domainCache(a, true);
                }else{
                    domainCache(a, false);
                }
            })
        })
        console.debug("Loaded cache for blocked and allowed");
    });
}

function reportDownload(e){
    $.post(API_URL+"report/downloads/", {
        filename: e.fileName,
        url: e.url,
        user: email,
        version: version
    }, function() {
        console.debug("Download log successful.");
    }).fail(function() {
        error = true;
        errorHandler();
    });
}

function reportExtension(eitems){
    for (let i = 0; i < eitems.length; i++) {
        let eitem = eitems[i];
        $.post(API_URL+"report/extensions/", {
            eid: eitem.id,
            name: eitem.name,
            user: email,
            version: version
        }, function() {
            console.debug("Extension log successful.");
        }).fail(function() {
            error = true;
            errorHandler();
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
        $.post(API_URL+"report/bookmarks/", {
            url: node.url,
            user: email,
            version: version
        }, function() {
            console.debug("Bookmark log successful.");
        }).fail(function() {
            error = true;
            errorHandler();
        });
    }
}

function reportLocation(position) {
    $.post(API_URL+"report/location/", {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        user: email,
        version: version
    }, function() {
        console.debug("Location log successful.");
    }).fail(function() {
        error = true;
        errorHandler();
    });
}

function reportVisit(visit){
    $.post(API_URL+"report/logger/", {
        title: visit.title,
        url: visit.url,
        user: email,
        version: version
    }, function() {
        console.debug("Website log successful.");
    }).fail(function() {
        error = true;
        errorHandler();
    });
}

function reportScreenshot(){
    chrome.tabs.captureVisibleTab(null, {
            format: "jpeg",
            quality: 50
    }, function(dataUrl) {
        $.post(API_URL+"report/image/", {
            blob: dataUrl,
            user: email,
            version: version
        }, function() {
            console.debug("Screenshot successful.");
        }).fail(function() {
            error = true;
            errorHandler();
        });
    });
}

const getDomainWithoutSubdomain = url => {
    const urlParts = new URL(url).hostname.split('.')
    return urlParts.slice(0).slice(-(urlParts.length === 4 ? 3 : 2)).join('.')
}

function domainLookup(domain) {
    let checkAPI = API_URL+"check/?domain=https://"+domain+"&uname="+email+"&v="+version;

    let x = new XMLHttpRequest();
    x.open("GET", checkAPI, true);
    x.timeout = 1000 * QUERY_TIMEOUT;

    x.onreadystatechange = function() {
        if (x.readyState === 4) {
            if (x.status === 200) {
                let text = x.responseText;
                console.debug("Site lookup for " + domain + " reports " + text);

                if (text === "/BLOCK") {
                    domainCache(domain, true);
                    blockDomain(domain);
                } else {
                    domainCache(domain, false);
                }
            }
        }
    };

    x.send();
}

function domainCache(domain, block_flag) {
    let dd = {};
    dd.domain = domain;
    dd.block_flag = block_flag;
    dd.timestamp = unix_timestamp();
    domainBlockCache[domain] = dd;
}

function isBlockedDomain(domain) {
    var dd = domainBlockCache[domain];
    if (dd == null) {
        domainLookup(domain);
        return false;
    }
    console.debug("Found cache for " + domain + ", " + dd.block_flag);
    return dd.block_flag;
}

function blockDomain(domain) {
    let burl = "https://" + BLOCK_DOMAIN + "?url=" + domain + "&u=" + email;
    console.debug("Redirected to " + burl);
    chrome.tabs.update({
        url: burl
    });
}

chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
    if (!str_starts_with(details.url, "http:") && !str_starts_with(details.url, "https:")) {
        return;
    }

    console.debug("Checking Troxal for: " + details.url);

    // Get host.
    let loc= document.createElement("a");
    loc.href = details.url;
    let host = loc.hostname;

    let wildcard = '*.' + getDomainWithoutSubdomain(details.url);

    // Bypass these first.
    if (host.indexOf(".") === -1 || host === API_DOMAIN || str_starts_with(host, "127.") || str_starts_with(host, "chrome")) {
        return;
    }

    if (isBlockedDomain(host)) {
        console.info("onBeforeNavigate, Blocked! - " + host);
        blockDomain(host);
    } else if (isBlockedDomain(wildcard)) {
        console.info("onBeforeNavigate, Blocked! - " + host);
        blockDomain(host);
    }
});

var errorHandler = (function() {
    console.error("Error Function called: initializing error processing...");
    var executed = false;
    return function() {
        if (!executed) {
            console.error("Error Function not executed yet: executing now...");
            executed = true;
            if (error === true) {
                if (localStorage.getItem('isOffline') === 'true') {
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
                            width: 550,
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
            console.error("Error Function has already been executed: exiting duplicate function...");
        }
    };
})();

window.addEventListener('load', () => {
    navigator.onLine ? showStatus(true) : showStatus(false);
    window.addEventListener('online', () => {
        showStatus(true);
    });
    window.addEventListener('offline', () => {
        showStatus(false);
    });
});
