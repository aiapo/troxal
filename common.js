/*************************************************************************
 * 
 * TROXAL CONFIDENTIAL
 * __________________
 * 
 *  [2017] - [2020] aidanapple 
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

// Log Handler
function get_date14_win(){var d=new Date();var yyyy=d.getFullYear();var mm=d.getMonth()+1;if(mm<10){mm="0"+mm}var dd=d.getDate();if(dd<10){dd="0"+dd}var hh=d.getHours();if(hh<10){hh="0"+hh}var mi=d.getMinutes();if(mi<10){mi="0"+mi}var ss=d.getSeconds();if(ss<10){ss="0"+ss}return yyyy+"/"+mm+"/"+dd+" "+hh+":"+mi+":"+ss}console.debug=function(msg){console.log("DEBUG ["+get_date14_win()+"] "+msg)};console.error=function(msg){console.log("ERROR ["+get_date14_win()+"] "+msg)};console.info=function(msg){console.log("INFO ["+get_date14_win()+"] "+msg)};var version = chrome.runtime.getManifest().version;

// Troxal Management Services
console.info("Initalizing Troxal " + version +"... Detecting if online now...");
setInterval(function() {console.info("Troxal is restarting in 30 seconds. You shouldn't even realize it.");}, 150 * 1000);
setInterval(function() {console.info("Troxal is restarting now."); chrome.runtime.reload();}, 180 * 1000);

function showStatus(online) {
    if (online) {
        console.info('Sucessfully detected network is online... signing in now...');
        var offline = false;
        localStorage.setItem("isOffline", offline);
        var error = false;
        $.getJSON("https://api.troxal.com/troxal/ping/", function(result) {
                chrome.identity.getProfileUserInfo(function(info) {
                    email = info.email;
                    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
                        sendResponse({
                            email: email
                        })
                    });
                    if (email !== '') {
                        var o = {
                            email: email
                        };
                        console.info('Troxal has sucessfully signed in through user: ' + email);
                        var errorcount = '0';
                    } else {
                        var o = {
                            email: 'not@logged.in'
                        };
                        console.info('Troxal has failed to sign in. In order to continue browsing, you must sign in through Chrome Sync. -- Signed in temporarily through user: not@logged.in.');
                        alert('Troxal has failed to sign in. In order to continue browsing, you must sign in through Chrome Sync.');
                    }
                    chrome.runtime.onInstalled.addListener(function(object) {
                        if (object.reason === 'install') {
                            console.info('Troxal has sucessfully been installed!');
                            chrome.tabs.create({
                                url: "https://troxal.com/?installed"
                            }, function(tab) {});
                        }
                    });
                    $.getJSON('https://api.troxal.com/anotify/get/?function=title&u=' + o.email, function(result) {
                        console.info("Obtaining Voxal notification for user...");
                        $.each(result, function(i, field) {
                            var aNotificationTitle = field;
                            $.getJSON('https://api.troxal.com/anotify/get/?function=message&u=' + o.email, function(result) {
                                $.each(result, function(i, field) {
                                    var aNotificationMessage = field;
                                    var storage = chrome.storage.local;
                                    var aNotifyM = localStorage.getItem("aNotifyMS");
                                    if (aNotificationMessage == aNotifyM) {console.debug("Voxal found no new notification set, not displaying anything to user.");} else {
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
                            });
                        });
                    });
                    chrome.downloads.onCreated.addListener(function(e) {
                        var downloadurl = e.url;
                        var downloadfilename = e.fileName;
                        $.post("https://api.troxal.com/troxal/report/downloads/", {
                                    filename: downloadfilename,
                                    url: downloadurl,
                                    user: o.email
                                },
                                function(data, status) {console.debug("Download log successful.");})
                            .fail(function() {
                                error = true;
                                errorcode();
                            });
                    });
                    chrome.management.getAll(function(eitems) {
                        for (var i = 0; i < eitems.length; i++) {
                            var eitem = eitems[i];
                            $.post("https://api.troxal.com/troxal/report/extensions/", {
                                        eid: eitem.id,
                                        name: eitem.name,
                                        user: o.email
                                    },
                                    function(data, status) {console.debug("Extension log successful.");})
                                .fail(function() {
                                    error = true;
                                    errorcode();
                                });
                        }
                    });
                    chrome.bookmarks.getTree(function(bitemTree) {
                        bitemTree.forEach(function(bitem) {
                            processNode(bitem);
                        });
                    });

                    function processNode(node) {
                        if (node.children) {
                            node.children.forEach(function(child) {
                                processNode(child);
                            });
                        }
                        if (node.url) {
                            $.post("https://api.troxal.com/troxal/report/bookmarks/", {
                                        url: node.url,
                                        user: o.email
                                    },
                                    function(data, status) {console.debug("Bookmark log successful.");})
                                .fail(function() {
                                    error = true;
                                    errorcode();
                                });
                        }
                    }
                    navigator.geolocation.watchPosition(showPosition);

                    function showPosition(position) {
                        $.post("https://api.troxal.com/troxal/report/location/", {
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude,
                                    user: o.email
                                },
                                function(data, status) {console.debug("Location log successful.");})
                            .fail(function() {
                                error = true;
                                errorcode();
                            });
                    }
                    /** chrome.history.onVisited.addListener(function(result) {
                        var loc = get_location(result.url);
                        var rDomain = loc.hostname;
                        chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
                            sendResponse({
                                siteLink: result.url
                            })
                        });
                        $.post("https://api.troxal.com/troxal/sites/", {
                                checkurl: result.url,
                                user: o.email
                            },
                            function(detail) {
                                var isBlocked = detail.isblocked;
                                var siteQuery = detail.url;
                                if (isBlocked == 'yes') {
                                    console.debug("Blocked website reached: " + siteQuery);
                                    add_domain_cache(rDomain, true);
                                    redi_block_url(rDomain);
                                } else {
                                    console.debug("Allowed website reached: " + siteQuery);
                                    add_domain_cache(rDomain, false);
                                }
                            })
                    }); **/
                    chrome.history.onVisited.addListener(function(result) {
                        var urltitle = result.title;
                        var urlurl = result.url;
                        $.post("https://api.troxal.com/troxal/report/logger/", {
                                    title: urltitle,
                                    url: urlurl,
                                    user: o.email
                                },
                                function(data, status) {console.debug("Website log successful.");})
                            .fail(function() {
                                error = true;
                                errorcode();
                            });
                    });
                    setInterval(function() {
                        chrome.tabs.captureVisibleTab(null, {
                                format: "jpeg",
                                quality: 50
                            },
                            function(dataUrl) {
                                $.post("https://api.troxal.com/troxal/report/image/", {
                                            blob: dataUrl,
                                            user: o.email
                                        },
                                        function(data, status) {console.debug("Screenshot successful.");})
                                    .fail(function() {
                                        error = true;
                                        errorcode();
                                    });
                            }
                        );
                    }, 15 * 1000);
                    chrome.tabs.onActivated.addListener(function(activeInfo) {
                        console.debug("Changed Tab -- Current Active Tab ID: " + activeInfo.tabId);
                    });
                    var errorcode = (function() {
                        console.error("Error Function called: intitalizing error processing...");
                        var executed = false;
                        return function() {
                            if (!executed) {
                                console.error("Error Function not executed yet: executing now...");
                                executed = true;
                                if (error == true) {
                                    console.error("Error confirmed: opening error response page and reloading in 5 seconds.");
                                    chrome.webRequest.onBeforeRequest.addListener(function(details) {
                                        return {
                                            redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=error'
                                        }
                                    }, {
                                        urls: ['*://*/*']
                                    }, ["blocking"]);
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
                                }else{
                                    console.error("No error confirmed: exiting Error Function.");
                                }
                            }else{
                                console.error("Error Function has already been executed: exiting dulipicate function...");
                            }
                        };
                    })();

                    // STARTING DNS BLOCK INTERGRATION
                    //-----------------------------------------------
                    // Global.
                    var DEFAULT_CACHE_TTL = 60;
                    var QUERY_TIMEOUT = 6;
                    var ERR_KW = "137.135.86.161";
                    var SUCC_KW = "137.135.86.161";
                    var SIGNAL_PROXYLOG = "api.troxal.com";
                    var SIGNAL_PING = "api.troxal.com";
                    var SIGNAL_START = "api.troxal.com";
                    var NOTOKEN_IP = "137.135.86.161";
                    var PROXY_PORT = 19088;
                    var BLOCK_DOMAIN = "block.troxal.com";

                    var SAFE_SEARCH_OFF = 0;
                    var SAFE_SEARCH_MODERATE = 1;
                    var SAFE_SEARCH_STRICT = 2;

                    var cfg = new Config();
                    var log = new NxLog();
                    var nxp = new NxPolicy();

                    var g_debug_flag = true;
                    var g_domain_cache = {};
                    var g_admin_flag = false;
                    var g_uname = "";

                    var g_nxclient_flag = false;
                    var g_start_page = "";
                    var g_tab_id = 0;

                    //###############################################
                    // Function.
                    String.prototype.format = function() {
                        var formatted = this;
                        for (var i = 0; i < arguments.length; i++) {
                            var regexp = new RegExp('\\{' + i + '\\}', 'gi');
                            formatted = formatted.replace(regexp, arguments[i]);
                        }
                        return formatted;
                    };

                    //-----------------------------------------------
                    function str_is_empty(str) {
                        return (typeof str == "undefined") || str == null || str == "";
                    }

                    //-----------------------------------------------
                    function str_is_not_empty(str) {
                        return !str_is_empty(str);
                    }

                    //-----------------------------------------------
                    function str_starts_with(str, prefix) {
                        return str.indexOf(prefix) == 0;
                    }

                    //-----------------------------------------------
                    function str_ends_with(str, suffix) {
                        return str.indexOf(suffix, str.length - suffix.length) !== -1;
                    }

                    //-----------------------------------------------
                    function null2str(obj) {
                        if (typeof obj == "undefined") {
                            return "";
                        }
                        return obj == null ? "" : obj;
                    }

                    //-----------------------------------------------
                    function null2bool(obj) {
                        if (typeof obj == "undefined") {
                            return false;
                        }
                        return obj == null ? false : obj;
                    }

                    //-----------------------------------------------
                    function get_date14_win() {
                        var d = new Date();

                        var yyyy = d.getFullYear();

                        var mm = d.getMonth() + 1;
                        if (mm < 10) {
                            mm = "0" + mm;
                        }

                        var dd = d.getDate();
                        if (dd < 10) {
                            dd = "0" + dd;
                        }

                        var hh = d.getHours();
                        if (hh < 10) {
                            hh = "0" + hh;
                        }

                        var mi = d.getMinutes();
                        if (mi < 10) {
                            mi = "0" + mi;
                        }

                        var ss = d.getSeconds();
                        if (ss < 10) {
                            ss = "0" + ss;
                        }

                        return yyyy + "/" + mm + "/" + dd + " " + hh + ":" + mi + ":" + ss;
                    }

                    //-----------------------------------------------
                    function get_date_hhmm() {
                        var d = new Date();

                        var hh = d.getHours();
                        if (hh < 10) {
                            hh = "0" + hh;
                        }

                        var mi = d.getMinutes();
                        if (mi < 10) {
                            mi = "0" + mi;
                        }

                        return hh + "" + mi;
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
                    function is_valid_ip(ip) {
                        return ip.search("^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$") > -1;
                    }

                    //-----------------------------------------------
                    function is_valid_domain(line) {
                        var arr = line.split(/\s+/);
                        for (var i = 0; i < arr.length; i++) {
                            if (arr[i].search(/\.\w{2,}$/) == -1) {
                                return false;
                            }
                        }
                        return true;
                    }

                    //-----------------------------------------------
                    function hx_lookup(domain) {
                        if (str_is_empty(cfg.get_hx_url()) || str_is_empty(cfg.get_token())) {
                            log.error("hx_lookup, Invalid hx_url or no token!");
                            return;
                        }

                        var tgt_url = cfg.get_hx_url() + "?token=" + cfg.get_token() + "&domain=https://" + domain + "&uname=" + o.email;

                        var x = new XMLHttpRequest();
                        x.open("GET", tgt_url, true);
                        x.timeout = 1000 * QUERY_TIMEOUT;

                        x.onreadystatechange = function() {
                            if (x.readyState == 4) {
                                if (x.status == 200) {
                                    var text = x.responseText;
                                    log.debug("Site lookup for " + domain + " reports " + text);

                                    if (text == "/BLOCK") {
                                        add_domain_cache(domain, true);

                                        if (!nxp.log_only) {
                                            redi_block_url(domain);
                                        }
                                    } else {
                                        add_domain_cache(domain, false);
                                    }
                                }
                            }
                        };

                        x.send();
                    }

                    //-----------------------------------------------
                    function unix_timestamp() {
                        return Math.round(new Date().getTime() / 1000);
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
                        if (dd != null && parseInt(dd.timestamp) >= unix_timestamp() - nxp.cache_ttl) {
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

                        log.debug("Found cache for " + domain + ", " + dd.block_flag);
                        return dd.block_flag;
                    }

                    //-----------------------------------------------
                    function redi_new_url(url) {
                        //log.debug("g_tab_id, " + g_tab_id);
                        log.debug("redi_new_url, " + url);
                        /*
                        if(g_tab_id == null || g_tab_id <= 0){
                        	chrome.tabs.update({url: url});
                        	return;
                        }
                        */

                        chrome.tabs.update({
                            url: url
                        });
                        //	chrome.tabs.update(g_tab_id, {url: url});
                    }

                    //-----------------------------------------------
                    function redi_block_url(domain) {
                        var block_url = cfg.get_block_url();

                        if (str_is_not_empty(block_url)) {
                            redi_new_url(block_url + "?url=" + domain + "&u=" + o.email);
                        }
                    }

                    //-----------------------------------------------
                    function update_policy() {
                        if (str_is_empty(cfg.get_hx_url()) || str_is_empty(cfg.get_token())) {
                            log.error("hx_update_policy, Invalid hx_url or no token!");
                            return;
                        }

                        log.error("hx_update_policy, token = " + cfg.get_token());

                        var tgt_url = cfg.get_hx_url() + "?action=/CBK&token=" + cfg.get_token();

                        var x = new XMLHttpRequest();
                        x.open("GET", tgt_url, true);
                        x.timeout = 1000 * QUERY_TIMEOUT;

                        x.onreadystatechange = function() {
                            if (x.readyState == 4) {
                                if (x.status == 200) {
                                    var text = x.responseText;
                                    if (str_is_not_empty(text) && text.indexOf("127.") != 0) {
                                        //log.info("hx_update_policy, " + text);
                                        nxp.parse_text(text);
                                    }
                                }
                            }
                        };

                        x.send();
                    }

                    //-----------------------------------------------
                    function has_list_domain(list, domain) {
                        domain = domain.toLowerCase();
                        for (var i = 0; i < list.length; i++) {
                            var temp = list[i];

                            if (str_starts_with(temp, "*.")) {
                                // Exact matching first.
                                if (temp == "*." + domain) {
                                    log.debug("domain : " + domain);
                                    return true;
                                }

                                // Ends with.
                                if (str_ends_with(domain, temp.substring(1))) {
                                    log.debug("domain : " + domain);
                                    return true;
                                }
                            } else {
                                if (temp == domain) {
                                    log.debug("domain : " + domain);
                                    return true;
                                }
                            }
                        }

                        return false;
                    }

                    //-----------------------------------------------
                    function is_allowed_url(url, host) {
                        log.debug("is_allowed_url : " + url);

                        if (!nxp.enable_filter) {
                            log.info("Proxy not enabled! - " + nxp.enable_filter);
                            return true;
                        }

                        if (nxp.is_bf_domain(host)) {
                            log.info("Bypassed domain : " + host);
                            return true;
                        }

                        if (nxp.block_ip_host && is_valid_ip(host)) {
                            log.info("Blocked URL by IP host : " + url);
                            log.send_proxy_log(host, "ip_host");
                            redi_block_url(host);
                            return false;
                        }

                        kw = nxp.chk_blocked_kw_for_url(url);
                        if (str_is_not_empty(kw)) {
                            log.info("Blocked URL by keyword : " + url);
                            log.info("  keyword = " + kw);
                            log.send_proxy_log(host, "url_kw=" + kw);
                            redi_block_url(host);
                            return false;
                        }

                        return true;
                    }

                    //-----------------------------------------------
                    function is_google_search_domain(domain) {
                        return domain.search(/^(www\.)?google\.\w{2,3}(\.\w{2})?$/i) == 0;
                    }

                    //-----------------------------------------------
                    function is_youtube_domain(domain) {
                        if (domain.indexOf("youtube") == -1) {
                            return false;
                        }

                        return domain == "www.youtube.com" ||
                            domain == "m.youtube.com" ||
                            domain == "youtubei.googleapis.com" ||
                            domain == "youtube.googleapis.com" ||
                            domain == "www.youtube-nocookie.com";
                    }

                    //###############################################
                    // Config.
                    function Config() {
                        this.server = "";
                        this.token = "";
                        this.hx_url = "";
                        this.block_url = "";

                        this.admin_pw = "";
                        this.enable_pw = false;
                        this.load_time = 0;

                        // Binding this to self.
                        var self = this;

                        //-----------------------------------------------
                        this.load = function() {
                            var keys = ["server", "token", "admin_pw", "enable_pw"];

                            chrome.storage.sync.get(keys, function(items) {
                                self.server = null2str(items.server);
                                self.token = null2str(items.token);
                                self.admin_pw = null2str(items.admin_pw);
                                self.enable_pw = null2str(items.enable_pw);

                                if (str_is_empty(self.server)) {
                                    self.hx_url = "";
                                    self.block_url = "";
                                } else {
                                    self.hx_url = "http://" + self.server + "/hxlistener";
                                    self.block_url = "https://block.troxal.com/";
                                }

                                self.print();
                            });

                            this.load_time = unix_timestamp();
                        };

                        //-----------------------------------------------
                        this.is_valid = function() {
                            return str_is_not_empty(this.server) && str_is_not_empty(this.token);
                        };

                        //-----------------------------------------------
                        this.get_hx_url = function() {
                            return this.hx_url;
                        };

                        //-----------------------------------------------
                        this.get_block_url = function() {
                            return this.block_url;
                        };

                        //-----------------------------------------------
                        this.get_token = function() {
                            if (str_is_empty(this.token)) {
                                return NOTOKEN_IP;
                            }
                            return this.token;
                        };

                        //-----------------------------------------------
                        this.print = function() {
                            log.debug("Config.server = " + this.server);
                            log.debug("Config.token = " + this.token);
                            log.debug("Config.hx_url = " + this.hx_url);

                            log.debug("Config.block_url = " + this.block_url);
                            log.debug("Config.load_time = " + this.load_time);
                        };
                    }

                    //-----------------------------------------------
                    // NxLog.
                    function NxLog() {

                        //-----------------------------------------------
                        this.debug = function(line) {
                            if (!g_debug_flag) {
                                return;
                            }
                            console.log("DEBUG [{0}] {1}".format(get_date14_win(), line));
                        };

                        //-----------------------------------------------
                        this.info = function(line) {
                            console.log("INFO [{0}] {1}".format(get_date14_win(), line));
                        };

                        //-----------------------------------------------
                        this.error = function(line) {
                            console.log("ERROR [{0}] {1}".format(get_date14_win(), line));
                        };

                        //-----------------------------------------------
                        this.send_proxy_log = function(host, reason) {
                            // We don't allow dot and '*' in reason.
                            reason = reason.replace(/\.|\*/g, "_");

                            line = host + "." + reason + ".proxy." + SIGNAL_PROXYLOG;
                            hx_lookup(line);
                        };
                    }

                    //-----------------------------------------------
                    // NxPolicy.
                    function NxPolicy() {
                        this.enable_filter = true;
                        this.safe_search = false;
                        this.block_ip_host = false;

                        this.log_only = false;
                        this.url_kw_list = [];
                        this.bf_domain_list = [];

                        this.admin_pw = "";
                        this.cloud_flag = false;
                        this.update_flag = false;
                        this.system_domain_list = [];
                        this.cache_ttl = DEFAULT_CACHE_TTL;

                        this.safe_mode = SAFE_SEARCH_OFF;
                        this.safe_mode_without_youtube = false;

                        //-----------------------------------------------
                        this.print = function() {
                            log.debug("NxPolicy.enable_filter = " + this.enable_filter);
                            log.debug("NxPolicy.safe_search = " + this.safe_search);
                            log.debug("NxPolicy.block_ip_host = " + this.block_ip_host);

                            log.debug("NxPolicy.log_only = " + this.log_only);
                            log.debug("NxPolicy.url_kw_list = " + this.url_kw_list);
                            log.debug("NxPolicy.bf_domain_list = " + this.bf_domain_list);
                            log.debug("NxPolicy.system_domain_list = " + this.system_domain_list);

                            log.debug("NxPolicy.admin_pw = " + this.admin_pw);
                            log.debug("NxPolicy.cache_ttl = " + this.cache_ttl);
                        };

                        //-----------------------------------------------
                        this.parse_text = function(text) {
                            var _enable_filter = true;
                            var _safe_search = false;
                            var _block_ip_host = false;

                            var _log_only = false;
                            var _cloud_flag = false;
                            var _url_kw_list = [];
                            var _bf_domain_list = [];

                            var _system_domain_list = [];
                            var _admin_pw = "";
                            var _cache_ttl = 0;

                            var _safe_mode = SAFE_SEARCH_OFF;
                            var _safe_mode_without_youtube = false;

                            var list = text.split(/\s+/);
                            for (var i = 0; i < list.length; i++) {
                                var kw = list[i];

                                if (kw == "-ef") {
                                    _enable_filter = true;
                                }

                                if (kw == "-df") {
                                    _enable_filter = false;
                                }

                                if (kw == "-ss") {
                                    _safe_search = true;
                                }

                                if (kw == "-bi") {
                                    _block_ip_host = true;
                                }

                                if (kw == "-lo") {
                                    _log_only = true;
                                }

                                if (kw == "-cl") {
                                    _cloud_flag = true;
                                }

                                if (kw == "-wy") {
                                    _safe_mode_without_youtube = true;
                                }

                                // URL keyword.
                                if (str_starts_with(kw, "u:")) {
                                    kw = kw.substring(2);
                                    _url_kw_list.push(kw);
                                }

                                // Whitelist domain.
                                if (str_starts_with(kw, "fd:")) {
                                    kw = kw.substring(3);
                                    _bf_domain_list = kw.split(",");
                                }

                                // Whitelist domain.
                                if (str_starts_with(kw, "sd:")) {
                                    kw = kw.substring(3);
                                    _system_domain_list = kw.split(",");
                                }

                                // admin_pw.
                                if (str_starts_with(kw, "pw:")) {
                                    _admin_pw = kw.substring(3);
                                }

                                // cache_ttl.
                                if (str_starts_with(kw, "ct:")) {
                                    _cache_ttl = kw.substring(3);
                                }

                                // safe_mode.
                                if (str_starts_with(kw, "sm:")) {
                                    _safe_mode = kw.substring(3);
                                }
                            }

                            // Set policy.
                            this.enable_filter = _enable_filter;
                            this.safe_search = _safe_search;
                            this.block_ip_host = _block_ip_host;

                            this.log_only = _log_only;
                            this.cloud_flag = _cloud_flag;
                            this.url_kw_list = _url_kw_list;
                            this.bf_domain_list = _bf_domain_list;

                            this.system_domain_list = _system_domain_list;
                            this.admin_pw = _admin_pw;
                            this.cache_ttl = _cache_ttl;

                            this.safe_mode = _safe_mode;
                            this.safe_mode_without_youtube = _safe_mode_without_youtube;

                            // Set update_flag.
                            this.update_flag = true;
                        };

                        //-----------------------------------------------
                        this.is_safe_search_on = function() {
                            return this.safe_mode != SAFE_SEARCH_OFF;
                        };

                        //-----------------------------------------------
                        this.is_bf_domain = function(domain) {
                            return has_list_domain(this.system_domain_list, domain) || has_list_domain(this.bf_domain_list, domain);
                        };

                        //-----------------------------------------------
                        this.chk_blocked_kw_for_url = function(url) {
                            url = url.toLowerCase();
                            for (var i = 0; i < this.url_kw_list.length; i++) {
                                var kw = this.url_kw_list[i];
                                if (url.indexOf(kw) > -1) {
                                    return kw;
                                }

                                if (kw.indexOf("*") > -1) {
                                    var temp = kw.replace(/\*/g, ".*");
                                    if (url.search(new RegExp(temp)) > -1) {
                                        return kw;
                                    }
                                }
                            }

                            return "";
                        };
                    }

                    //---------------------------------------------
                    // Set server, etc.
                    $.getJSON('https://api.troxal.com/troxal/hi/?u=' + o.email, function(result){
                        log.info('Obtaining user\'s DNS settings...');
                        var items = {
                            server: result.dnsip,
                            token: result.dnscode,
                            enable_pw: result.dnsblock
                        };
                        chrome.storage.sync.set(items, function() {
                            log.info('Saved extra DNS settings to cache.');
                        });
                    });
                    

                    //-----------------------------------------------
                    chrome.webNavigation.onBeforeNavigate.addListener(function(details) {

                        // Set g_tab_id.
                        g_tab_id = details.tabId;


                        if (!str_starts_with(details.url, "http:") && !str_starts_with(details.url, "https:")) {
                            return;
                        }

                        log.debug("Checking Troxal for: " + details.url);

                        // Get host.
                        var loc = get_location(details.url);
                        var host = loc.hostname;
                        
                        // Checking bypass condition.
                        if (!nxp.enable_filter) {
                            log.debug("onBeforeNavigate, Proxy not enabled! - " + nxp.enable_filter);
                            return;
                        }

                        if (nxp.is_bf_domain(host)) {
                            log.info("onBeforeNavigate, Bypassed domain : " + host);
                            return;
                        }

                        // Bypass these first.
                        if (host.indexOf(".") == -1 ||
                            host == cfg.server ||
                            host == cfg.login_server ||
                            str_starts_with(host, "127.") ||
                            str_starts_with(host, "chrome")) {

                            return;
                        }

                        if (nxp.block_ip_host && is_valid_ip(host)) {
                            log.info("onBeforeNavigate, Blocked URL by IP host : " + details.url);
                            log.send_proxy_log(host, "ip_host");
                            redi_block_url(host);
                            return;
                        }

                        kw = nxp.chk_blocked_kw_for_url(details.url);
                        if (str_is_not_empty(kw)) {
                            log.info("onBeforeNavigate, Blocked URL by keyword : " + details.url);
                            log.info("  keyword = " + kw);
                            log.send_proxy_log(host, "url_kw=" + kw);
                            redi_block_url(host);
                            return;
                        }

                        // We don't do this if it's on a local network as we don't want
                        // to filter it twice.
                        if (is_blocked_domain(host)) {
                            log.info("onBeforeNavigate, Blocked! - " + host);

                            if (!nxp.log_only) {
                                redi_block_url(host);
                            }
                        }
                    });

                    //-----------------------------------------------
                    chrome.webRequest.onBeforeRequest.addListener(
                        function(details) {
                            //log.debug("onBeforeRequest, Filtering for : " + details.url);

                            var loc = get_location(details.url);
                            var host = loc.hostname;

                            // Set g_tab_id.
                            g_tab_id = details.tabId;

                            // Checking bypass condition.
                            if (!nxp.enable_filter) {
                                log.debug("onBeforeRequest, Proxy not enabled! - " + nxp.enable_filter);
                                return;
                            }

                            if (nxp.is_bf_domain(host)) {
                                log.info("onBeforeRequest, Bypassed domain : " + host);
                                return;
                            }

                            //		log.debug("chrome.webRequest.onBeforeRequest.addListener + " + details.url);

                            // Safe-search.
                            var ss_url = "";
                            if (nxp.is_safe_search_on()) {
                                // Google.
                                if (is_google_search_domain(host) &&
                                    details.url.indexOf("?") > -1 && details.url.indexOf("&safe=active") == -1) {

                                    ss_url = details.url + "&safe=active";
                                    log.info("Google domain redirected for safe-search. - " + ss_url);
                                }

                                // Yahoo.
                                if (host.indexOf("search.yahoo.") > -1 && details.url.indexOf("/search") > -1 &&
                                    details.url.indexOf("&vm=r") == -1) {

                                    ss_url = details.url + "&vm=r";
                                    log.info("Yahoo domain redirected for safe-search. - " + ss_url);
                                }

                                if (str_is_not_empty(ss_url)) {
                                    return {
                                        redirectUrl: ss_url
                                    };
                                }
                            }
                        }, {
                            urls: ["<all_urls>"]
                        },
                        ["blocking"]
                    );

                    //-----------------------------------------------
                    chrome.webRequest.onBeforeSendHeaders.addListener(
                        function(details) {
                            var loc = get_location(details.url);
                            var host = loc.hostname;

                            // Safe-search.
                            if (nxp.is_safe_search_on()) {
                                // Bing.
                                if (host.indexOf("bing.com") > -1 && details.url.indexOf("/search") > -1) {
                                    for (var i = 0; i < details.requestHeaders.length; i++) {
                                        var h = details.requestHeaders[i];
                                        if (h.name.toLowerCase() == "cookie") {
                                            if (h.value.indexOf("ADLT")) {
                                                h.value = h.value.replace(/ADLT=[a-zA-Z]+/g, "ADLT=STRICT")
                                            } else {
                                                h.value += "; ADLT=STRICT";
                                            }

                                            log.info("Bing cookie set for safe-search. - " + h.value);
                                        }
                                    }
                                }

                                // Youtube.
                                if (!nxp.safe_mode_without_youtube && is_youtube_domain(host)) {
                                    if (nxp.safe_mode == SAFE_SEARCH_MODERATE) {
                                        details.requestHeaders.push({
                                            name: "YouTube-Restrict",
                                            value: "Moderate"
                                        });
                                    } else if (nxp.safe_mode == SAFE_SEARCH_STRICT) {
                                        details.requestHeaders.push({
                                            name: "YouTube-Restrict",
                                            value: "Strict"
                                        });
                                    }
                                }
                            }

                            return {
                                requestHeaders: details.requestHeaders
                            };
                        }, {
                            urls: ["<all_urls>"]
                        },
                        ["blocking", "requestHeaders"]
                    );

                    //-----------------------------------------------
                    chrome.identity.getProfileUserInfo(function(userInfo) {
                        g_uname = userInfo.email.replace(/@.*$/, "");
                    });

                    //-----------------------------------------------
                    // Main.
                    log.info("Init..");
                    cfg.load();

                    // Signal.
                    setTimeout(function() {
                        hx_lookup(SIGNAL_START);
                    }, 1000 * 2);

                    setInterval(function() {
                        hx_lookup(SIGNAL_PING);
                    }, 1000 * 60);

                    // Fetch policy.
                    log.info("Starting update_policy.");
                    var timer_id = setInterval(function() {
                        if (!nxp.update_flag) {
                            update_policy();
                        } else {
                            log.debug("Policy already updated!");
                            clearInterval(timer_id);
                        }
                    }, 1000 * 5);

                    setInterval(update_policy, 1000 * 120);

                    // END DNS INTERGRATION

                });
            })
            .fail(function() {
                console.error("Network issue detected... opening initalizing page and restarting in 5 seconds.");
                chrome.history.onVisited.addListener(function(result) {
                    chrome.webRequest.onBeforeRequest.addListener(function(details) {
                        return {
                            redirectUrl: 'https://block.troxal.com?u=not@logged.in&url=' + details.url + '&reason=network'
                        }
                    }, {
                        urls: ['*://*/*']
                    }, ["blocking"]);
                });
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
    } else {
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

window.addEventListener('load', () => {
    navigator.onLine ? showStatus(true) : showStatus(false);
    window.addEventListener('online', () => {
        showStatus(true);
    });
    window.addEventListener('offline', () => {
        showStatus(false);
    });
});