console.log('popup.js has begun running');

function popupQuerySender() {
    chrome.tabs.query(
        {currentWindow: true, active: true}, 
        function (tabs){
            // get string input by user
            let queryInput = document.getElementById('userInput').value
            // send string to active tab (i.e. tabs[0])
            chrome.tabs.sendMessage(tabs[0].id, {"message": queryInput});
        }
    );
}

function popupNextSender() {
    chrome.tabs.query(
        {currentWindow: true, active: true}, 
        function (tabs){
            // get string input by user
            let nextInput = "string_to,ensure-no search*with_next_button"
            // send string to active tab (i.e. tabs[0])
            chrome.tabs.sendMessage(tabs[0].id, {"message": nextInput});
        }
    );
}

function popupPrevSender() {
    chrome.tabs.query(
        {currentWindow: true, active: true}, 
        function (tabs){
            // get string input by user
            let prevInput = "string_to,ensure-no search*with_prev_button"
            // send string to active tab (i.e. tabs[0])
            chrome.tabs.sendMessage(tabs[0].id, {"message": prevInput});
        }
    );
}


document.addEventListener("DOMContentLoaded", function() {
    // when the search button is pressed, run the "popupQuerySender" function
    document.getElementById("searchButton").addEventListener("click", popupQuerySender);
    document.getElementById("nextButton").addEventListener("click", popupNextSender);
    document.getElementById("prevButton").addEventListener("click", popupPrevSender);
});

console.log('popup.js has finished running');
