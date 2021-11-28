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

function popupK1Sender(){
    chrome.tabs.query(
        {currentWindow: true, active: true}, 
        function (tabs){
            let msg = {
                "message": "k1",
                "value": document.getElementById("k1Range").value
            }
            chrome.tabs.sendMessage(tabs[0].id, msg);
        }
    );
}

document.addEventListener("DOMContentLoaded", function() {
    
    // Query input and viewing results
    // when the search button is pressed, run the "popupQuerySender" function
    document.getElementById("searchButton").addEventListener("click", popupQuerySender);
    document.getElementById("nextButton").addEventListener("click", popupNextSender);
    document.getElementById("prevButton").addEventListener("click", popupPrevSender);
    
    // Parameter Settings
    // ==================

    // k_1
    document.getElementById("k1Range").addEventListener("click", popupK1Sender);
    document.getElementById("k1Range").oninput = () => {
        document.getElementById("k1Input").value = document.getElementById("k1Range").value;
    };
    document.getElementById("k1Input").addEventListener("keyup", event => {
        if (event.key == "Enter"){
            document.getElementById("k1Range").value = document.getElementById("k1Input").value;
            popupK1Sender();
        }
    })
});

console.log('popup.js has finished running');
