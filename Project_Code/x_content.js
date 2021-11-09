// code that executes after a webpage loads, allowing you
// to work with the html content itself

console.log('content.js has run');

chrome.runtime.onMessage.addListener(gotMessage);

function gotMessage(message, sender, sendResponse) {
    console.log(message.txt)

    // if message has certain value, turn paragraphs purple
    if (message.txt === "button has been clicked"){
        let paragraphs = document.getElementsByTagName('p');

        for (let i = 0; i < paragraphs.length; i++) {
            paragraphs[i].style['background-color'] = "#FF00FF"
            if (i === 1){
                console.log(paragraphs[i].textContent);
    }
}
    }
}