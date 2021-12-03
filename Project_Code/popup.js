console.log('popup.js has begun running');

function popupQuerySender() {
    chrome.tabs.query(
        {currentWindow: true, active: true}, 
        function (tabs){
            // get string input by user
            let queryInput = document.getElementById('userInput').value;
            // send string to active tab (i.e. tabs[0])
            let msg = {
                "action": "search",
                "query": queryInput
            };
            chrome.tabs.sendMessage(tabs[0].id, msg);
        }
    );
}

function popupNextSender() {
    chrome.tabs.query(
        {currentWindow: true, active: true}, 
        function (tabs){
            // get string input by user
            //let nextInput = "string_to,ensure-no search*with_next_button"
            // send string to active tab (i.e. tabs[0])
            let msg = {"action": "next"};
            chrome.tabs.sendMessage(tabs[0].id, msg);
        }
    );
}

function popupPrevSender() {
    chrome.tabs.query(
        {currentWindow: true, active: true}, 
        function (tabs){
            // get string input by user
            //let prevInput = "string_to,ensure-no search*with_prev_button"
            // send string to active tab (i.e. tabs[0])
            let msg = {"action": "prev"};
            chrome.tabs.sendMessage(tabs[0].id, msg);
        }
    );
}

/**
 * Sends value of a BM25 parameter to the content script.
 * @param  {} name BM25 parameter name
 */
function settingsSender(name){
    chrome.tabs.query(
        {currentWindow: true, active: true}, 
        function (tabs){
            let msg = {
                "action": "set parameter",
                "parameter": name,
                "value": document.getElementById(name + "Range").value
            }
            chrome.tabs.sendMessage(tabs[0].id, msg);
        }
    );
}

/**
 * Looks for keypress event. If [Enter] key is pressed, update the range element that corresponds
 * to the given input element and send the value to the content script.
 * @param  {} event event listener or event listener object
 * @param  {} elem a BM25 settings text input element
 */
function updateSettingsInput(event, elem){
    if (event.key == "Enter") {
        document.getElementById(elem.name + "Range").value = elem.value;
        settingsSender(elem.name);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    
    // Query input and viewing results
    // when the search button is pressed, run the "popupQuerySender" function
    document.getElementById("searchButton").addEventListener("click", popupQuerySender);
    document.getElementById("nextButton").addEventListener("click", popupNextSender);
    document.getElementById("prevButton").addEventListener("click", popupPrevSender);
    
    // Parameter Settings
    // ==================
    // Range (slider) elements
    let rangeElements = document.getElementsByClassName("range");
    for (let i = 0; i < rangeElements.length; i++){
        let e = rangeElements[i];
        // On mouse-up of slider, send value to content script and update text input
        e.addEventListener("click", () => { settingsSender(e.name); });
        e.oninput = () => { document.getElementById(e.name + "Input").value = e.value; }
    }
    // (Text) input elements
    let inputElements = document.getElementsByClassName("input");
    for (let i = 0; i < inputElements.length; i++){
        let e = inputElements[i];
        e.addEventListener("keyup", event => { updateSettingsInput(event, e); })
    }
});

console.log('popup.js has finished running');