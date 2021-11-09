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


document.addEventListener("DOMContentLoaded", function() {
    // when the search button is pressed, run the "popupQuerySender" function
    document.getElementById("searchButton").addEventListener("click", popupQuerySender);
});

console.log('popup.js has finished running');
