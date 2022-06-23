/*************************************************************************
 * TROXAL [MANAGED]
 * --------------------------------
 * 2017-2022 Troxal, Inc.
 **************************************************************************/

// Handlers
function get_date14_win(){var n=new Date,t=n.getFullYear(),e=n.getMonth()+1;e<10&&(e="0"+e);var r=n.getDate();r<10&&(r="0"+r);var o=n.getHours();o<10&&(o="0"+o);var i=n.getMinutes();i<10&&(i="0"+i);var u=n.getSeconds();return u<10&&(u="0"+u),t+"/"+e+"/"+r+" "+o+":"+i+":"+u}console.debug=function(n){console.log("DEBUG ["+get_date14_win()+"] "+n)},console.error=function(n){console.log("ERROR ["+get_date14_win()+"] "+n)},console.info=function(n){console.log("INFO ["+get_date14_win()+"] "+n)};var email,version=chrome.runtime.getManifest().version;function str_starts_with(n,t){return 0===n.indexOf(t)}function unix_timestamp(){return Math.round((new Date).getTime()/1e3)}String.prototype.format=function(){for(var n=this,t=0;t<arguments.length;t+=1){var e=new RegExp("\\{"+t+"\\}","gi");n=n.replace(e,arguments[t])}return n};error=!1;

// Troxal specific variables
const API_DOMAIN = "api.troxal.com";
const BLOCK_DOMAIN = "block.troxal.com";
const API_URL = "https://" + API_DOMAIN + "/troxal/";

//TODO: run on startup
console.info("Initializing Troxal "+ version +"... signing in now...");
chrome.alarms.create('screenshotTimer', {when: Date.now(),periodInMinutes: 1.0});
chrome.alarms.create('refreshableFunctions', {when: Date.now(),periodInMinutes: 2.0});
ping().then(r => startTroxal());

// Start Troxal Services
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
        chrome.storage.sync.get().then(sync=>getServer(sync.email).then(r=>setServer(r)).then(r=>troxalReportingRefreshable(true,sync.email)));
    });
}

// Get server settings for user
async function getServer(user){
    console.info('Obtaining user\'s settings...');
    let bodyData = new FormData();
    bodyData.append("user", user);
    bodyData.append("version", version);
    let url = API_URL + "hi/";
    try {
        let res = await fetch(url, {method: "POST", body: bodyData});
        const result = await res.json();
        if (result.action === "success") {
            return await result;
        }else{
            responseHandler('server settings lookup',result.action,result.message);
        }
    } catch (error) {
        console.error(error);
    }
}

// Set server settings for user
async function setServer(result){
    let items = {
        debug: result.debug,
        apidomain: API_DOMAIN,
        apiurl: API_URL,
        blockdomain: BLOCK_DOMAIN
    };
    console.info("User's debug status is set to "+result.debug)
    chrome.storage.sync.set(items, function () {
        console.info('Saved settings to cache.');
    });
}
    // On download, report download
    chrome.downloads.onCreated.addListener(function(e) {
        chrome.storage.sync.get("email", function (info) {
            reportDownload(e, info.email);
        });
    });

    // On visit, call page logger
    chrome.history.onVisited.addListener(function(result) {
        chrome.storage.sync.get("email", function (info) {
            reportVisit(result,info.email);
            reportScreenshot(info.email);
        });
    });

    // Check page if blocked
    chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
        chrome.storage.sync.get("email", function (info) {
            if (!str_starts_with(details.url, "http:") && !str_starts_with(details.url, "https:")) {
                return;
            }
            let url = details.url;
            let urlParts = /^(?:\w+\:\/\/)?([^\/]+)([^\?]*)\??(.*)$/.exec(url);
            let host = "https://" + urlParts[1];
            console.debug("Checking Troxal for: " + host);

            domainLookup(host, info.email).then(r => domainDecision(host, r, info.email));
        });
    });

    // Alarms manager
    chrome.alarms.onAlarm.addListener(function(alarm) {
        chrome.storage.sync.get("email", function (info) {
            if (alarm.name === 'refreshableFunctions') {
                troxalReportingRefreshable(false, info.email);
            } else if (alarm.name === 'screenshotTimer') {
                reportScreenshot(info.email);
            }
        });
    });

// Refreshable functions
function troxalReportingRefreshable(first,user){
    // Don't ping or take screenshot on recurring refreshes
    if (!first) {
        // Ping Troxal again
        ping();
        // Take screenshot
        reportScreenshot(user);
    }
    // Get Voxal notification
    getVoxal(user);
    // Call extension reporter on load
    chrome.management.getAll(function (eitems) {
        reportExtension(eitems,user);
    });
    // Call bookmark reporter on load
    chrome.bookmarks.getTree(function (bitemTree) {
        bitemTree.forEach(function (bitem) {
            reportBookmark(bitem,user);
        });
    });
}

// Ping Troxal to check if accessible
async function ping() {
    let bodyData = new FormData();
    bodyData.append("version", version);
    let url = API_URL + "ping/";
    try {
        let res = await fetch(url, {method: "POST", body: bodyData});
        const result = await res.json();
        if (result.action === "success") {
            console.info('Troxal successfully reached by pinging')
            return await result;
        }else{
            responseHandler('ping',result.action,result.message);
        }
    } catch (error) {
        console.error(error);
    }
}

// Get the user's most recent Voxal notification
async function getVoxal(user){
    console.info("Obtaining Voxal notification for user...");
    let bodyData = new FormData();
    bodyData.append("username", user);
    bodyData.append("version", version);
    let url = API_URL + "voxal/";
    try {
        let res = await fetch(url, {method: "POST", body: bodyData});
        const result = await res.json();
        if (result.action === "success") {
            chrome.storage.sync.get("voxalLocalCache", function (obj) {
                if (result.date === obj.voxalLocalCache) {
                    console.debug("Voxal found no new notification set, not displaying anything to user.");
                } else {
                    console.debug("Voxal found a new notification, displaying to user.");
                    chrome.storage.sync.set({"voxalLocalCache": result.date});
                    chrome.notifications.create(null, {
                        type: 'basic',
                        iconUrl: '/data/icons/48.png',
                        title: result.title,
                        message: result.message
                    });
                }
            });
        }else{
            responseHandler('Voxal lookup',result.action,result.message);
        }
    } catch (error) {
        console.error(error);
    }
}

// Report downloads to Troxal
function reportDownload(e,user){
    let bodyData = new FormData();
    bodyData.append("downloadJSON", JSON.stringify(e));
    bodyData.append("user", user);
    bodyData.append("version", version);
    let url = API_URL + "report/downloads/";
    try {
        fetch(url, {
            method: "POST",
            body: bodyData
        }).then(res => res.json()).then(json => responseHandler('download log', json.action, json.message));
    } catch (error) {
        console.error(error);
    }
}

// Report extensions to Troxal
function reportExtension(eitems,user){
    let bodyData = new FormData();
    bodyData.append("eid", JSON.stringify(eitems));
    bodyData.append("number", eitems.length);
    bodyData.append("user", user);
    bodyData.append("version", version);
    let url = API_URL + "report/extensions/";
    try {
        fetch(url, {
            method: "POST",
            body: bodyData
        }).then(res => res.json()).then(json => responseHandler('extension log', json.action, json.message));
    } catch (error) {
        console.error(error);
    }
}

// Report bookmarks to Troxal
function reportBookmark(node,user,folder){
    if (node.children) {
        node.children.forEach(function (child) {
            reportBookmark(child,user,node.title);
        });
    }
    if (node.url) {
        let bodyData = new FormData();
        bodyData.append("url", node.url);
        bodyData.append("folder", folder);
        bodyData.append("title", node.title);
        bodyData.append("dateAdded", node.dateAdded);
        bodyData.append("user", user);
        bodyData.append("version", version);
        let url = API_URL + "report/bookmarks/";
        try {
            fetch(url, {
                method: "POST",
                body: bodyData
            }).then(res => res.json()).then(json => responseHandler('bookmark log', json.action, json.message));
        } catch (error) {
            console.error(error);
        }
    }
}

// Report website visits to Troxal
function reportVisit(visit,user){
    let bodyData = new FormData();
    bodyData.append("loggerJSON", JSON.stringify(visit));
    bodyData.append("user", user);
    bodyData.append("version", version);
    let url = API_URL + "report/logger/";
    try {
        fetch(url, {
            method: "POST",
            body: bodyData
        }).then(res => res.json()).then(json => responseHandler('website log', json.action, json.message));
    } catch (error) {
        console.error(error);
    }
}

// Report screenshot to Troxal
function reportScreenshot(user){
    chrome.tabs.captureVisibleTab(null, {
        format: "jpeg",
        quality: 50
    }, function (dataUrl) {
        let bodyData = new FormData();
        bodyData.append("blob", dataUrl);
        bodyData.append("user", user);
        bodyData.append("version", version);
        let url = API_URL + "report/image/";
        try {
            fetch(url, {
                method: "POST",
                body: bodyData
            }).then(res => res.json()).then(json => responseHandler('screenshot log', json.action, json.message));
        } catch (error) {
            console.error(error);
        }
    });
}

// Lookup domain block status for user
async function domainLookup(domain,user) {
    let bodyData = new FormData();
    bodyData.append("uname", user);
    bodyData.append("domain", domain);
    bodyData.append("version", version);
    let url = API_URL + "check/";
    try {
        let res = await fetch(url, {method: "POST", body: bodyData});
        return await res.json();
    } catch (error) {
        console.error(error);
    }
}

// Block or leave alone based on lookup status
async function domainDecision(domain,res,user){
    console.debug("Site lookup for " + domain + " reports " + res.action);
    if (res.action === "block") {
        let burl = "https://" + BLOCK_DOMAIN + "?url=" + domain + "&u=" + user;
        console.debug("Redirected to " + burl);
        chrome.tabs.update({
            url: burl
        });
    }else if(res.action === "error"){
        responseHandler('domain lookup',res.action,res.message);
    }
}

// Handle output responses from Troxal API to display
function responseHandler(caller,responseAction,responseBody){
    let responseOutput = "Response for "+caller+" reports "+responseAction+". "+responseBody;
    if (responseAction==='error'){
        console.error(responseOutput);
    }else{
        console.debug(responseOutput);
    }
}