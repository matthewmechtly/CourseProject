// runs when you launch chrome, allowing you to add
// functionality to your extension not requiring a website
// (e.g. a pushable button as a pseudo-bookmark)

console.log('background.js running')

// run this code when button associated with browser
// action is clicked:
chrome.browserAction.onClicked.addListener(buttonClicked);

function buttonClicked(tab) {
    let msg = {
        txt: "button has been clicked"
    }
    chrome.tabs.sendMessage(tab.id, msg);
}