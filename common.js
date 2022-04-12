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


//TODO: run on startup
console.info("Initializing Troxal "+ version +"... signing in now...");
chrome.alarms.create('screenshotTimer', {when: Date.now(),periodInMinutes: 1.0});
chrome.alarms.create('refreshableFunctions', {when: Date.now(),periodInMinutes: 2.0});
ping().then(r => startTroxal());

function startTroxal(){
    chrome.identity.getProfileUserInfo(function(info) {
        email= info.email;
        if (info.email !== '') {
            console.info('Troxal has successfully signed in through user: ' + info.email);
        } else {
            info.email = 'not@logged.in';
            console.info('Troxal has failed to sign in. In order to continue browsing, you must sign in through Chrome Sync. -- Signed in temporarily through user: not@logged.in.');
            chrome.notifications.create(null, {
                type: 'basic',
                iconUrl: '/data/icons/48.png',
                title: "Not signed in to Troxal.",
                message: "Because you are not signed in through Chrome Sync, Troxal was unable to sign in. Sign in to continue browsing."
            });
        }
        chrome.storage.sync.set({"email": info.email});

        // Once user is set, continue on
        chrome.storage.sync.get("email", function (info) {
            email=info.email;
            getServer().then(r => setServer(r));
            // Get cache
            getCache().then(r => loadCache(r));
            // Call refreshable functions, but as first load.
            troxalReportingRefreshable(true);

        });
    });
}

async function getServer(){
    console.info('Obtaining user\'s settings...');
    let url = API_URL+'hi/?u='+email+'&v='+version;
    try {
        let res = await fetch(url);
        return await res.json();
    } catch (error) {
        console.error(error);
    }
}

async function setServer(result){
    var items = {
        debug: result.debug,
        apidomain: API_DOMAIN,
        apiurl: API_URL,
        blockdomain: BLOCK_DOMAIN,
        timeout: QUERY_TIMEOUT
    };
    chrome.storage.sync.set(items, function () {
        console.info('Saved settings to cache.');
    });
}

// On download, report download
chrome.downloads.onCreated.addListener(function(e) {
    reportDownload(e);
});


// On visit call page logger
chrome.history.onVisited.addListener(function(result) {
    reportVisit(result);
    reportScreenshot();
});

// Check page if blocked
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
    if (!str_starts_with(details.url, "http:") && !str_starts_with(details.url, "https:")) {
        return;
    }
    let host = details.url;
    console.debug("Checking Troxal for: " + host);
    let wildcard = 'https://*.' + getDomainWithoutSubdomain(host);

    if (isBlockedDomain(host)) {
        console.info("onBeforeNavigate, Blocked! - " + host);
        blockDomain(host);
    } else if (isBlockedDomain(wildcard)) {
        console.info("onBeforeNavigate, Blocked! - " + host);
        blockDomain(host);
    }
});

// Alarms manager
chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'refreshableFunctions') {
        troxalReportingRefreshable(false);
    }else if(alarm.name === 'screenshotTimer'){
        reportScreenshot();
    }
});

// Refreshable functions
function troxalReportingRefreshable(first){
    // Don't ping or refresh cache on first load
    if (!first){
        // Ping Troxal again
        ping();
        // Refresh cache
        getCache().then(r => loadCache(r));
        // Take screenshot
        reportScreenshot();
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

async function ping() {
    let url = API_URL + "ping/?v=" + version;
    try {
        let res = await fetch(url);
        const result = await res.json();
    } catch (error) {
        console.error(error);
        console.error("Network issue detected... opening initializing page and restarting in 5 seconds.");
        chrome.tabs.create({
            url:  chrome.runtime.getURL('inital.html'),
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
}

async function getVoxal(){
    console.info("Obtaining Voxal notification for user...");
    let url = API_URL+'voxal/?u='+email+'&v='+version;
    try {
        let res = await fetch(url);
        const result = await res.json();
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
    } catch (error) {
        console.error(error);
    }
}

async function getCache(){
    console.info("Obtaining cache for user...");
    let url = API_URL+'cache/?uname='+email+'&v='+version;
    try {
        let res = await fetch(url);
        return await res.json();
    } catch (error) {
        console.error(error);
    }
}

function loadCache(result){
    Object.entries(result.blocked).forEach(([key, value]) => {
        domainCache(value, true);
    })
    Object.entries(result.allowed).forEach(([key, value]) => {
        domainCache(value, false);
    })

    console.debug("Loaded cache for blocked and allowed");
    //chrome.storage.local.set({"cache": domainBlockCache});
}

function reportDownload(e){
    chrome.storage.sync.get("email", function (info) {
        var bodyData = new FormData();
        bodyData.append("filename", e.fileName);
        bodyData.append("url", e.url);
        bodyData.append("user", info.email);
        bodyData.append("version", version);
        let url = API_URL + "report/downloads/";
        try {
            let res = fetch(url, {method: "POST", body: bodyData});
            console.debug("Download log successful.");
        } catch (error) {
            console.error(error);
        }
    });
}

function reportExtension(eitems){
    for (let i = 0; i < eitems.length; i++) {
        let eitem = eitems[i];
        var bodyData = new FormData();
        bodyData.append("eid", eitem.id);
        bodyData.append("name", eitem.name);
        bodyData.append("user", email);
        bodyData.append("version", version);
        let url = API_URL + "report/extensions/";
        try {
            let res = fetch(url, {method: "POST", body: bodyData});
            console.debug("Extension log successful.");
        } catch (error) {
            console.error(error);
        }
    }
}

function reportBookmark(node){
    if (node.children) {
        node.children.forEach(function(child) {
            reportBookmark(child);
        });
    }
    if (node.url) {
        var bodyData = new FormData();
        bodyData.append("url", node.url);
        bodyData.append("user", email);
        bodyData.append("version", version);
        let url = API_URL + "report/bookmarks/";
        try {
            let res = fetch(url, {method: "POST", body: bodyData});
            console.debug("Bookmark log successful.");
        } catch (error) {
            console.error(error);
        }
    }
}


function reportVisit(visit){
    chrome.storage.sync.get("email", function (info) {
        var bodyData = new FormData();
        bodyData.append("title", visit.title);
        bodyData.append("url", visit.url);
        bodyData.append("user", info.email);
        bodyData.append("version", version);
        let url = API_URL + "report/logger/";
        try {
            let res = fetch(url, {method: "POST", body: bodyData});
            console.debug("Website log successful.");
        } catch (error) {
            console.error(error);
        }
    });
}

function reportScreenshot(){
    chrome.storage.sync.get("email", function (info) {
        chrome.tabs.captureVisibleTab(null, {
            format: "jpeg",
            quality: 50
        }, function (dataUrl) {
            var bodyData = new FormData();
            bodyData.append("blob", dataUrl);
            bodyData.append("user", info.email);
            bodyData.append("version", version);
            let url = API_URL + "report/image/";
            try {
                let res = fetch(url, {method: "POST", body: bodyData});
                console.debug("Screenshot successful.");
            } catch (error) {
                console.error(error);
            }
        });
    });
}

const getDomainWithoutSubdomain = url => {
    const urlParts = new URL(url).hostname.split('.')
    return urlParts.slice(0).slice(-(urlParts.length === 4 ? 3 : 2)).join('.')
}

async function domainLookup(domain) {
    let url = API_URL+"check/v2/?domain="+domain+"&uname="+email+"&v="+version;
    try {
        let res = await fetch(url);
        return await res.json();
    } catch (error) {
        console.error(error);
    }
}

async function domainDecision(domain,res){
    console.debug("Site lookup for " + domain + " reports " + res.action);
    if (res.action === "block") {
        domainCache(domain, true);
        blockDomain(domain);
    } else {
        domainCache(domain, false);
    }
}

function domainCache(domain, block_flag) {
    let dd = {};
    dd.domain = domain;
    dd.block_flag = block_flag;
    dd.timestamp = unix_timestamp();
    domainBlockCache[domain] = dd;
}

function isBlockedDomain(domain) {
    let dd = domainBlockCache[domain];
    if (dd == null) {
        domainLookup(domain).then(r => domainDecision(domain,r));
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
